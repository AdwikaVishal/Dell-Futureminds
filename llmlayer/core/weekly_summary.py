"""
core/weekly_summary.py
Owner: Aditi(LLM & intelligence layer)

Generates a standup-ready weekly summary from 5 days of daily plan history.
Called by P3's GET /plan endpoint (weekly mode) 
 rendered by P4's collapsible weekly summary panel (collapsed by default, one click to expand).

Public function:
    generate_weekly_summary(daily_plans: list[dict]) -> str

Input shape (each element is one day, stored in P3's state.py):
    {
        "date": "2026-06-17",
        "top_3": [
            {
                "id": "...",
                "title": "...",
                "status": "done|in_progress|deferred"
            }
        ],
        "completed": ["JIRA-1234", ...],
        "deferred": ["JIRA-1225", ...],
        "blockers": [
            {
                "id": "...",
                "title": "...",
                "blocked_by": "..."
            }
        ]
    }
"""

from __future__ import annotations

import json
from typing import Any

from core.llm_clients import call_llm

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
    """
    Generate a weekly standup summary from up to 5 daily plan snapshots.

    Args:
        daily_plans:
            List of daily plan records.
            Usually Monday-Friday (5 entries), but can work with fewer.

    Returns:
        Markdown summary suitable for standups, dashboards,
        or weekly status updates.
    """

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

    response = await call_llm(
        prompt=user_prompt,
        system=_SYSTEM,
        json_mode=False,
        temperature=0.3,
        max_output_tokens=1024,
    )

    summary = response.text.strip() #to prevent a blank output

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


#smoke test with daily plan info as i dont have real data yet

if __name__ == "__main__":
    import asyncio

    sample_daily_plans = [
        {
            "date": "2026-06-16",
            "top_3": [
                {
                    "id": "JIRA-1234",
                    "title": "Fix checkout upload issue",
                    "status": "done"
                }
            ],
            "completed": ["JIRA-1234"],
            "deferred": [],
            "blockers": []
        },
        {
            "date": "2026-06-17",
            "top_3": [
                {
                    "id": "INC0045260",
                    "title": "Fix reporting worker crash",
                    "status": "in_progress"
                }
            ],
            "completed": [],
            "deferred": ["JIRA-1198"],
            "blockers": [
                {
                    "id": "JIRA-1212",
                    "title": "Rate limiting rollout",
                    "blocked_by": "Platform Team"
                }
            ]
        }
    ]

    result = asyncio.run(
        generate_weekly_summary(sample_daily_plans)
    )

    print("\n===== WEEKLY SUMMARY =====\n")
    print(result)