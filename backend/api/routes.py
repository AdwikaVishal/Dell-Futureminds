import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from models.task import ChatRequest, ChatResponse, DailyPlan, InjectRequest, RankedTask
from core.state import store, get_recent_traces, save_chat_log, save_feedback, get_user_preference_boosts
from core.agent import run_pipeline, reprioritize_with_injection
from core.qa import answer_question
from core.sync_engine import sync_engine
from core.observability import get_metrics_summary, get_connector_status
from core.websocket_manager import ws_manager
from core.connector_registry import connector_registry

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                event = msg.get("event", "")
                if event == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
                elif event == "refresh":
                    plan = await run_pipeline()
                    await ws_manager.broadcast_plan(plan.model_dump(mode="json"))
            except json.JSONDecodeError:
                pass
            except Exception as e:
                logger.error("WebSocket message error: %s", e)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        ws_manager.disconnect(websocket)


@router.get("/api/health")
async def health():
    import os
    summary = store.get_state_summary()
    connector_status = get_connector_status()

    jira_c = next((c for c in connector_status if c["name"] == "Jira"), {})
    github_c = next((c for c in connector_status if c["name"] == "GitHub"), {})

    llm_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")

    return {
        "status": "ok",
        "jira_connected": bool(jira_c.get("connected", False)),
        "github_connected": bool(github_c.get("connected", False)),
        "grok_connected": bool(llm_key),
        "task_count": summary["task_count"],
        "last_sync": summary["last_run"],
        "connectors": connector_status,
    }


@router.post("/api/refresh")
async def refresh():
    try:
        plan = await run_pipeline()
        await ws_manager.broadcast_plan(plan.model_dump(mode="json"))
        return plan
    except Exception as e:
        logger.exception("Pipeline refresh failed")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")


@router.get("/api/plan")
async def get_plan():
    if store.current_plan is None:
        try:
            return await run_pipeline()
        except Exception as e:
            logger.exception("Pipeline auto-trigger failed")
            raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")
    return store.current_plan


@router.get("/api/tasks")
async def get_tasks(
    source_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    all_tasks = store.current_tasks
    if source_type:
        all_tasks = [t for t in all_tasks if t.source_type == source_type]
    if priority:
        all_tasks = [t for t in all_tasks if t.priority == priority]
    if status:
        all_tasks = [t for t in all_tasks if t.status == status]
    return all_tasks


@router.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    for t in store.current_tasks:
        if t.id == task_id:
            return t
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@router.get("/api/team-metrics")
async def get_team_metrics():
    tasks = store.current_tasks
    if not tasks:
        return {"teams": {}}

    team_stats = {}
    for task in tasks:
        team = task.team or "unassigned"
        assignee = task.assignee or "unassigned"

        if team not in team_stats:
            team_stats[team] = {"members": {}, "total_tasks": 0, "blocked": 0}

        if assignee not in team_stats[team]["members"]:
            team_stats[team]["members"][assignee] = {"tasks": 0, "blocked": 0}

        team_stats[team]["members"][assignee]["tasks"] += 1
        team_stats[team]["total_tasks"] += 1

        if task.status == "blocked":
            team_stats[team]["members"][assignee]["blocked"] += 1
            team_stats[team]["blocked"] += 1

    return {"teams": team_stats}


@router.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        if store.current_plan is None:
            await run_pipeline()
        tasks = store.current_tasks
        response = await answer_question(tasks, req.message, store.chat_history[-5:])
        store.add_chat_entry(req.message, response.answer, response.referenced_task_ids)
        save_chat_log(req.message, response.answer, response.referenced_task_ids)
        return response
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


@router.post("/api/inject")
async def inject(req: InjectRequest):
    try:
        old_plan = store.current_plan
        if old_plan is None:
            raise HTTPException(status_code=400, detail="No plan exists — call /api/refresh first")

        new_plan = await reprioritize_with_injection(req)

        await ws_manager.broadcast_plan(new_plan.model_dump(mode="json"))

        result = new_plan.model_dump(mode="json")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Inject failed")
        raise HTTPException(status_code=500, detail=f"Inject failed: {e}")


@router.post("/api/feedback")
async def submit_feedback(feedback: dict):
    save_feedback(
        task_id=feedback.get("task_id", ""),
        action=feedback.get("action", "upvote"),
        preference=feedback.get("preference", "general"),
    )
    return {"status": "ok", "message": "Feedback recorded"}


@router.get("/api/feedback/preferences")
async def feedback_preferences():
    return {"boosts": get_user_preference_boosts()}


@router.get("/api/traces")
async def get_traces():
    try:
        return get_recent_traces(limit=50)
    except Exception:
        return []


@router.get("/api/weekly-summary")
async def weekly_summary():
    try:
        from core.weekly_summary import generate_weekly_summary
        daily_plans = []
        if store.current_plan:
            daily_plans.append({
                "date": store.current_plan.generated_at,
                "top_3": [{"id": t.id, "title": t.title, "status": t.status} for t in store.current_plan.top_priorities],
                "completed": [],
                "deferred": [{"id": t.id, "title": t.title} for t in store.current_plan.deferred],
                "blockers": [{"id": t.id, "title": t.title, "blocked_by": ""} for t in store.current_plan.blocked],
            })
        summary = await generate_weekly_summary(daily_plans)
        return {"summary": summary, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        logger.warning("Weekly summary module failed: %s", e)
        return {
            "summary": "Weekly summary module not available.",
            "generated_at": None,
        }


@router.get("/api/sources")
async def get_sources():
    connector_status = get_connector_status()
    status_colors = {
        "Jira": "#2684ff",
        "ServiceNow": "#62d84e",
        "Outlook": "#0078d4",
        "GitHub": "#ffffff",
        "Slack": "#4a154b",
        "Meeting Transcripts": "#ff6b35",
    }
    sources = []
    for c in connector_status:
        sources.append({
            "name": c["name"],
            "color": status_colors.get(c["name"], "#888888"),
            "status": "Synced" if c["connected"] else "Disconnected",
            "last_sync": c["last_sync"],
            "error": c["error"],
        })
    return {
        "sources": sources,
        "total_tasks": len(store.current_tasks),
    }


@router.get("/api/sync/status")
async def sync_status():
    return {
        "connectors": get_connector_status(),
    }


@router.post("/api/sync/now")
async def sync_now(source_type: Optional[str] = None):
    await sync_engine.sync_now(source_type)
    return {"status": "ok", "message": f"Sync triggered for {source_type or 'all'} connectors"}


@router.get("/api/metrics")
async def metrics():
    return get_metrics_summary()
