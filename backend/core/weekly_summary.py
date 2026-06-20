from __future__ import annotations

import json
from typing import Any

from core.llm_client import call_llm

_SYSTEM = (
    "You are a technical writer producing a concise, standup-ready weekly "
    "summary for a software engineer. You receive daily plan records from "
    "the past week. Extract the signal: what was completed, what is still "
    "in flight, and what was blocked or deferred. "
    "Be specific — include task IDs and titles, not vague categories. "
    "No filler language. Under 300 words total. "
    "Output markdown only with exactly these three headers in order: "
    "'## Accomplished This Week', "
    "'## In Progress / Carried Over', "
    "'## Blockers & Deferred'."
)


async def generate_weekly_summary(
    daily_plans: list[dict[str, Any]]
) -> str:
    if not daily_plans:
        return (
            "## Accomplished This Week\n\n"
            "No plan history available.\n\n"
            "## In Progress / Carried Over\n\n"
            "—\n\n"
            "## Blockers & Deferred\n\n"
            "—"
        )

    user_prompt = (
        "Generate a weekly summary from these daily plan records.\n"
        "Follow your instructions exactly:\n"
        "- Use exactly three headers\n"
        "- Mention task IDs where possible\n"
        "- Stay under 300 words\n\n"
        f"DAILY PLANS:\n{json.dumps(daily_plans, indent=2)}"
    )

    try:
        response = await call_llm(
            prompt=user_prompt,
            system=_SYSTEM,
            json_mode=False,
            temperature=0.3,
            max_output_tokens=1024,
        )
        summary = response.text.strip()
        if not summary:
            return (
                "## Accomplished This Week\n\n"
                "No completed work recorded.\n\n"
                "## In Progress / Carried Over\n\n"
                "No active work recorded.\n\n"
                "## Blockers & Deferred\n\n"
                "No blockers recorded."
            )
        return summary
    except Exception:
        return (
            "## Accomplished This Week\n\n"
            "LLM summary temporarily unavailable.\n\n"
            "## In Progress / Carried Over\n\n"
            "Check your task list for current work items.\n\n"
            "## Blockers & Deferred\n\n"
            "Alerts panel shows any active blockers."
        )
