from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

from core.llm_client import call_llm
from core.prompts import build_daily_plan_prompt, build_prioritization_prompt, build_reprioritize_prompt
from core.tracer import trace
from core.state import get_user_preference_boosts
from models.task import Task, DailyPlan, RankedTask, Alert


def _task_to_scoring_dict(task: Task) -> dict[str, Any]:
    return {
        "id": task.id,
        "title": task.title,
        "source": task.source,
        "source_type": task.source_type,
        "priority": task.priority or "unknown",
        "deadline": task.deadline,
        "owner": task.owner,
        "status": task.status,
        "dependencies": task.dependencies,
        "blocks": task.blocks,
        "vp_escalation": task.vp_escalation,
        "customer_facing": task.customer_facing,
        "merged_sources": task.merged_sources,
    }


def _apply_scores(tasks: list[Task], scored_items: list[dict[str, Any]]) -> list[RankedTask]:
    score_map: dict[str, tuple[float, str, dict]] = {}
    for item in scored_items:
        task_id = str(item.get("id", ""))
        score = float(item.get("score", 0))
        rationale = str(item.get("rationale", ""))
        breakdown = item.get("score_breakdown", {})
        score_map[task_id] = (score, rationale, breakdown)

    result: list[RankedTask] = []
    for task in tasks:
        score, rationale, breakdown = score_map.get(task.id, (0.0, "Score not computed.", {}))
        result.append(RankedTask(
            **task.model_dump(exclude={'rank', 'score', 'rationale', 'score_breakdown'}),
            score=score,
            rationale=rationale,
            score_breakdown=breakdown,
        ))

    result.sort(key=lambda t: t.score, reverse=True)
    return result


def _match_preference(title: str, preference: str) -> bool:
    title_lower = title.lower()
    keyword_map = {
        "prefer_security": ["security", "audit", "token", "vulnerability", "encrypt"],
        "prefer_ui_bugs": ["ui", "dashboard", "safari", "render", "chart", "dark mode"],
        "prefer_backend": ["database", "migration", "api", "sync", "websocket", "backend"],
        "prefer_performance": ["memory", "leak", "latency", "performance", "timeout"],
        "prefer_integrations": ["github", "jira", "slack", "connector", "sync"],
        "prefer_refactors": ["refactor", "cleanup", "docs", "documentation", "test"],
    }
    keywords = keyword_map.get(preference, [])
    return any(kw in title_lower for kw in keywords)


def _apply_preference_boosts(ranked: list[RankedTask]) -> list[RankedTask]:
    boosts = get_user_preference_boosts()
    if not boosts:
        return ranked

    for rt in ranked:
        for pref, multiplier in boosts.items():
            if _match_preference(rt.title, pref):
                rt.score = round(rt.score * multiplier, 1)
    ranked.sort(key=lambda t: t.score, reverse=True)
    return ranked


@trace("prioritization")
async def prioritize(tasks: list[Task]) -> list[RankedTask]:
    if not tasks:
        return []

    task_dicts = [_task_to_scoring_dict(t) for t in tasks]
    system, user_prompt = build_prioritization_prompt(task_dicts)

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.1,
        max_output_tokens=4096,
    )

    scored_items = response.parsed_json if isinstance(response.parsed_json, list) else []

    if not scored_items:
        return [RankedTask(**t.model_dump(exclude={'rank', 'score', 'rationale'}), score=0.0, rationale="Scoring unavailable.") for t in tasks]

    ranked = _apply_scores(tasks, scored_items)
    ranked = _apply_preference_boosts(ranked)
    return ranked


async def get_daily_plan(
    ranked_tasks: list[RankedTask],
    active_alerts: Optional[list[dict[str, Any]]] = None,
) -> str:
    if not ranked_tasks:
        return "## Top 3 for Today\n\nNo tasks found.\n"

    task_dicts = [_task_to_scoring_dict(t) | {"score": t.score, "rationale": t.rationale} for t in ranked_tasks]
    system, user_prompt = build_daily_plan_prompt(task_dicts, active_alerts)

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=False,
        temperature=0.3,
        max_output_tokens=2048,
    )
    return response.text.strip()


async def reprioritize(
    current_ranked_tasks: list[RankedTask],
    new_task: Task,
) -> tuple[list[RankedTask], str]:
    current_dicts = [_task_to_scoring_dict(t) | {"score": t.score, "rationale": t.rationale} for t in current_ranked_tasks]
    new_task_dict = _task_to_scoring_dict(new_task)

    system, user_prompt = build_reprioritize_prompt(current_dicts, new_task_dict)

    try:
        response = await call_llm(
            prompt=user_prompt,
            system=system,
            json_mode=True,
            temperature=0.1,
            max_output_tokens=4096,
        )
    except Exception:
        new_task_scored = RankedTask(**new_task.model_dump(exclude={'rank', 'score', 'rationale'}), score=99.0, rationale="New high-priority task injected.")
        return [new_task_scored] + current_ranked_tasks, "New task injected at top (LLM unavailable)."

    if not response.parsed_json or not isinstance(response.parsed_json, dict):
        new_task_scored = RankedTask(**new_task.model_dump(exclude={'rank', 'score', 'rationale'}), score=99.0, rationale="New high-priority task injected.")
        return [new_task_scored] + current_ranked_tasks, "New task injected at top (scoring fallback)."

    new_rank_raw = response.parsed_json.get("new_rank", [])
    change_summary = response.parsed_json.get("change_summary", "Re-prioritization complete.")

    all_tasks_by_id = {t.id: t for t in current_ranked_tasks}
    all_tasks_by_id[new_task.id] = new_task

    updated_tasks: list[RankedTask] = []
    for item in new_rank_raw:
        task_id = item.get("id")
        original = all_tasks_by_id.get(task_id)
        if original:
            updated_tasks.append(RankedTask(**original.model_dump(exclude={'rank', 'score', 'rationale'}), score=float(item.get("score", 0)), rationale=str(item.get("rationale", ""))))

    updated_tasks.sort(key=lambda t: t.score, reverse=True)
    return updated_tasks, change_summary


def _build_ranked_list(tasks: list[RankedTask]) -> list[RankedTask]:
    return [
        RankedTask(
            **t.model_dump(exclude={'rank', 'score', 'rationale'}),
            rank=i + 1,
            score=t.score or 0.0,
            rationale=t.rationale or "",
        )
        for i, t in enumerate(tasks)
    ]


def build_daily_plan_from_tasks(
    tasks: list[RankedTask],
    alerts: list[Alert] | None = None,
) -> DailyPlan:
    if not tasks:
        return DailyPlan()

    ranked_list = _build_ranked_list(tasks)
    top3 = ranked_list[:3]
    do_next = ranked_list[3:6]
    blocked = [t for t in ranked_list if t.status == "blocked"]
    deferred = [t for t in ranked_list[6:] if t.status != "blocked"]

    return DailyPlan(
        generated_at=datetime.now(timezone.utc).isoformat(),
        top_priorities=top3,
        do_next=do_next,
        deferred=deferred,
        blocked=blocked,
        alerts=alerts or [],
        ranked_tasks=ranked_list,
    )
