"""
core/prioritizer.py
Owner: Aditi(LLM & intelligence layer)

Scores and ranks the full deduplicated task list using PRIORITIZATION_PROMPT.
Also handles DAILY_PLAN_PROMPT and REPRIORITIZE_PROMPT (the /inject re-rank
demo moment).

Three public async functions:
  - prioritize(tasks)           -> list[Task] sorted by score desc
  - get_daily_plan(tasks, alerts) -> str (markdown)
  - reprioritize(tasks, new_task) -> tuple[list[Task], str] (new ranking + diff)

The LLM is given the explicit scoring formula and asked to apply it -- this
is what makes the rationale auditable and prevents hallucination. The score returned by the LLM is
authoritative (we trust it applied the formula); but we also do a
sanity-check re-sort by score so the ordering is guaranteed correct even if
the LLM slightly misordered its output.

Called by P3's agent.py as:
    from core.prioritizer import prioritize, get_daily_plan, reprioritize
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
from typing import Any, Optional

import dataclasses
from core.llm_clients import call_llm
from core.prompts import (
    build_daily_plan_prompt,
    build_prioritization_prompt,
    build_reprioritize_prompt,
)
from core.models import Task, DailyPlan, ReprioritizationResult


# ---------------------------------------------------------------------------
# Internal: build the task payload the LLM receives
# ---------------------------------------------------------------------------

def _task_to_scoring_dict(task: Task) -> dict[str, Any]:
    """
    Convert a Task to the minimal dict the prioritization prompt needs.
    We deliberately exclude fields the LLM doesn't need (raw_text, grounded,
    etc.) to keep the prompt token count lean -- raw_text alone can be
    hundreds of tokens per task.
    """
    return {
        "id": task.id,
        "title": task.title,
        "source": task.source,
        "source_type": task.source_type,
        "priority": task.priority,
        "deadline": task.deadline,
        "owner": task.owner,
        "status": task.status,
        "dependencies": task.dependencies,
        "blocks": task.blocks,
        "vp_escalation": task.vp_escalation,
        "customer_facing": task.customer_facing,
        "merged_sources": task.merged_sources,
    }


def _apply_scores(tasks: list[Task], scored_items: list[dict[str, Any]]) -> list[Task]:
    """
    Take the LLM's scoring output and apply score + rationale back to the
    original Task objects. We match by id, then sort by score descending.
    Tasks the LLM didn't score (shouldn't happen, but defensive) get score=0.
    """
    score_map: dict[str, tuple[float, str]] = {}
    for item in scored_items:
        task_id = str(item.get("id", ""))
        score = float(item.get("score", 0))
        rationale = str(item.get("rationale", ""))
        score_map[task_id] = (score, rationale)

    result: list[Task] = []
    for task in tasks:
        score, rationale = score_map.get(task.id, (0.0, "Score not computed."))
        result.append(dataclasses.replace(task, score=score, rationale=rationale))

    # Guarantee sort order is correct even if LLM output was slightly off
    result.sort(key=lambda t: t.score or 0, reverse=True)
    return result


# ---------------------------------------------------------------------------
# Owner filtering to ensure my tasks and delegated tasks are sep
# ---------------------------------------------------------------------------

_SELF_OWNER_TOKENS = {"you", "me", "i", "myself", "the engineer", "inbox owner"}


def _is_my_task(task: Task) -> bool:
    """
    Returns True if this task belongs to the current engineer.
    owner=None means the task was addressed to the inbox owner (always mine).
    owner set to a specific other person means it is delegated.
    """
    if task.owner is None:
        return True
    return task.owner.strip().lower() in _SELF_OWNER_TOKENS


def split_by_owner(tasks: list[Task]) -> tuple[list[Task], list[Task]]:
    """
    Split a task list into (my_tasks, delegated_tasks).

    Delegated tasks are ones the LLM extracted but assigned to someone else --
    e.g. Diane owns integration tests, Tom owns heap dump follow-up. These
    should NOT appear in the ranked list or daily plan;
     **P4 can show them
    in a separate "watching" section.**

    Usage in P3 agent.py:
        my_tasks, delegated = split_by_owner(all_extracted_tasks)
        ranked = await prioritize(my_tasks)
        state["delegated"] = [t.to_dict() for t in delegated]
    """
    mine, delegated = [], []
    for t in tasks:
        (mine if _is_my_task(t) else delegated).append(t)
    return mine, delegated


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def prioritize(tasks: list[Task]) -> list[Task]:
    """
    Score and rank all tasks using PRIORITIZATION_PROMPT.
    Only pass MY tasks here -- use split_by_owner() first.

    Args:
        tasks: my tasks only (output of split_by_owner()[0])

    Returns:
        Same tasks with .score and .rationale populated, sorted descending by score.
    """
    if not tasks:
        return []

    task_dicts = [_task_to_scoring_dict(t) for t in tasks]
    system, user_prompt = build_prioritization_prompt(task_dicts)

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.1,  # deterministic scoring
        max_output_tokens=4096,  # full list can be large
    )

    scored_items = (
        response.parsed_json
        if isinstance(response.parsed_json, list)
        else []
    )

    if not scored_items:
        print(f"[prioritizer] Warning: LLM returned no scored items. "
              f"JSON parse error: {response.json_parse_error}")
        # Fall back: return tasks with score=0 so the pipeline doesn't break
        return [dataclasses.replace(t, score=0.0, rationale="Scoring unavailable.") for t in tasks]

    return _apply_scores(tasks, scored_items)


async def get_daily_plan(
    ranked_tasks: list[Task],
    active_alerts: Optional[list[dict[str, Any]]] = None,
) -> str:
    """
    Generate a structured markdown daily plan from already-ranked tasks.
    This is a formatting step, not a re-scoring step.

    Args:
        ranked_tasks: output of prioritize() -- must already be sorted by score
        active_alerts: optional list of alert dicts from alert_engine.py (P3)

    Returns:
        Markdown string with ## Top 3 for Today, ## Do Next, etc.
    """
    if not ranked_tasks:
        return "## Top 3 for Today\n\nNo tasks found.\n"

    task_dicts = [_task_to_scoring_dict(t) | {"score": t.score, "rationale": t.rationale}
                  for t in ranked_tasks]

    system, user_prompt = build_daily_plan_prompt(task_dicts, active_alerts)

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=False,  # daily plan is markdown, not JSON
        temperature=0.3,
        max_output_tokens=2048,
    )

    return response.text.strip()


async def reprioritize(
    current_ranked_tasks: list[Task],
    new_task: Task,
) -> tuple[list[Task], str]:
    """
    Inject a new task into the existing ranking and re-score using
    REPRIORITIZE_PROMPT. Returns the updated full ranking and a diff summary.

    This is called by P3's /inject endpoint. The returned change_summary
    string is what P4 shows in the "rank change" highlight for 3 seconds.

    Args:
        current_ranked_tasks: current output of prioritize()
        new_task: the newly injected Task object

    Returns:
        (updated_ranked_tasks, change_summary)
    """
    current_dicts = [
        _task_to_scoring_dict(t) | {"score": t.score, "rationale": t.rationale}
        for t in current_ranked_tasks
    ]
    new_task_dict = _task_to_scoring_dict(new_task)

    system, user_prompt = build_reprioritize_prompt(current_dicts, new_task_dict)

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.1,
        max_output_tokens=4096,
    )

    if not response.parsed_json or not isinstance(response.parsed_json, dict):
        print(f"[prioritizer] Warning: reprioritize LLM output not parsed. "
              f"Error: {response.json_parse_error}")
        # Fallback: prepend new task at top with score 99
        new_task_scored = dataclasses.replace(new_task, score=99.0, rationale="New high-priority task injected. Manual scoring fallback.")
        return [new_task_scored] + current_ranked_tasks, "New task injected at top (scoring fallback)."

    new_rank_raw = response.parsed_json.get("new_rank", [])
    change_summary = response.parsed_json.get("change_summary", "Re-prioritization complete.")

    # Rebuild Task objects from the re-ranked list
    # Match by id back to original tasks, include the new task
    all_tasks_by_id = {t.id: t for t in current_ranked_tasks}
    all_tasks_by_id[new_task.id] = new_task

    updated_tasks: list[Task] = []
    for item in new_rank_raw:
        task_id = item.get("id")
        original = all_tasks_by_id.get(task_id)
        if original:
            updated_tasks.append(dataclasses.replace(original, score=float(item.get("score", 0)), rationale=str(item.get("rationale", ""))))

    # Safety sort
    updated_tasks.sort(key=lambda t: t.score or 0, reverse=True)
    return updated_tasks, change_summary


# ---------------------------------------------------------------------------
# Smoke test: python core/prioritizer.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json, sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    import core._mock_llm_client as mock_client
    import core.prioritizer as pmod
    pmod.call_llm = mock_client.call_llm


    async def _test():
        # Minimal test tasks
        tasks = [
            Task(id="JIRA-1234", title="Payment upload fails >10MB", source="jira_board",
                 source_type="jira", priority="P1",
                 deadline="2026-06-19", vp_escalation=True, customer_facing=True),
            Task(id="INC0045260", title="Memory leak in report worker", source="defect_tracker",
                 source_type="servicenow", priority="P1",
                 deadline="2026-06-20"),
            Task(id="JIRA-1212", title="Rate limiting on /api/v2/search", source="jira_board",
                 source_type="jira", priority="P2",
                 deadline="2026-06-24", blocks=["JIRA-1188", "JIRA-1240"]),
        ]

        print("=== prioritize() ===")
        ranked = await pmod.prioritize(tasks)
        for t in ranked:
            print(f"  #{ranked.index(t)+1} [{t.score}] {t.id}: {t.rationale}")

        print("\n=== get_daily_plan() ===")
        plan = await pmod.get_daily_plan(ranked)
        print(plan)

        print("\n=== reprioritize() (inject new P0 task) ===")
        new_task = Task(
            id="INJECT-001", title="payment_gateway_500: total checkout outage",
            source="inject", source_type="servicenow",
            priority="P0", deadline="2026-06-19T14:00:00Z",
            customer_facing=True, vp_escalation=True,
        )
        updated, summary = await pmod.reprioritize(ranked, new_task)
        print("Change summary:", summary)
        for t in updated:
            print(f"  [{t.score}] {t.id}")

    asyncio.run(_test())