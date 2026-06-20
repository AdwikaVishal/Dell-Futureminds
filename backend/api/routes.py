import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.task import ChatRequest, ChatResponse, DailyPlan, InjectRequest, RankedTask
from core.state import store, get_recent_traces, save_chat_log
from core.agent import run_pipeline, reprioritize_with_injection
from core.qa import answer_question

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health")
async def health():
    summary = store.get_state_summary()
    return {
        "status": "ok",
        "last_run": summary["last_run"],
        "task_count": summary["task_count"],
    }


@router.post("/api/refresh")
async def refresh():
    try:
        plan = await run_pipeline()
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


@router.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        if store.current_plan is None:
            await run_pipeline()
        tasks = store.current_tasks
        context = {
            "chat_history": store.chat_history[-5:],
        }
        response = await answer_question(tasks, req.message, context)
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

        result = new_plan.model_dump(mode="json")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Inject failed")
        raise HTTPException(status_code=500, detail=f"Inject failed: {e}")


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
    return {
        "sources": [
            {"name": "Jira", "color": "#2684ff", "status": "Synced"},
            {"name": "ServiceNow", "color": "#62d84e", "status": "Synced"},
            {"name": "Outlook", "color": "#0078d4", "status": "Synced"},
            {"name": "GitHub", "color": "#ffffff", "status": "Synced"},
            {"name": "Slack", "color": "#4a154b", "status": "Processing"},
            {"name": "Meeting Transcripts", "color": "#ff6b35", "status": "Processing"},
        ],
        "total_tasks": len(store.current_tasks),
    }
