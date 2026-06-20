from __future__ import annotations

import json
from typing import Any

from core.llm_client import call_llm
from core.prompts import build_qa_prompt
from models.task import Task, ChatResponse

MAX_CONTEXT_TASKS = 25
MAX_HISTORY_TURNS = 6


def _build_task_context(tasks: list[Task]) -> list[dict[str, Any]]:
    sorted_tasks = sorted(tasks, key=lambda t: t.score or 0, reverse=True)
    context_tasks = sorted_tasks[:MAX_CONTEXT_TASKS]
    return [
        {
            "id": t.id,
            "title": t.title,
            "source": t.source,
            "source_type": t.source_type,
            "priority": t.priority,
            "deadline": t.deadline,
            "owner": t.owner,
            "status": t.status,
            "score": t.score,
            "rationale": t.rationale,
            "dependencies": t.dependencies,
            "blocks": t.blocks,
            "vp_escalation": t.vp_escalation,
            "customer_facing": t.customer_facing,
            "merged_sources": t.merged_sources,
            "source_sentence": t.source_sentence,
        }
        for t in context_tasks
    ]


def _trim_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    return history[-(MAX_HISTORY_TURNS * 2):]


async def answer_question(
    tasks: list[Task],
    question: str,
    chat_history: list[dict[str, str]] | None = None,
) -> ChatResponse:
    task_context = _build_task_context(tasks)
    trimmed_history = _trim_history(chat_history or [])

    system, user_prompt = build_qa_prompt(
        full_task_context=task_context,
        user_question=question,
        chat_history=trimmed_history,
    )

    try:
        response = await call_llm(
            prompt=user_prompt,
            system=system,
            json_mode=True,
            temperature=0.4,
            max_output_tokens=1024,
        )

        if response.parsed_json and isinstance(response.parsed_json, dict):
            return ChatResponse(
                answer=str(response.parsed_json.get("answer", response.text)),
                referenced_task_ids=list(response.parsed_json.get("citations", [])),
            )

        return ChatResponse(answer=response.text.strip(), referenced_task_ids=[])
    except Exception:
        return ChatResponse(
            answer="I'm sorry, the AI assistant is temporarily unavailable. Please try again later.",
            referenced_task_ids=[],
        )
