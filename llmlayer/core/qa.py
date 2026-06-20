#conversational chat 
#user puts in natural language prompts and ai answers accordingly
"""
core/qa.py
Owner: Aditi(LLM & intelligence layer)

Conversational QA layer.
 This is what P3's POST /chat endpoint calls.
Takes the full task context + user message + chat history, returns a
grounded answer with citations.

Must handle all 5 demo queries from the problem statement + task card:
    "Why is the upload bug ranked #1?"
    "Summarize the VP email"
    "What's blocking my teammates?"
    "What should I defer?"
    "What's my #1 today?"

Grounding rule: every factual claim in the answer must cite a specific
task ID or source ID. This is checked by P5's grounding.py -- answers
that make claims not traceable to the task context will be flagged.

Public function:
    answer_question(tasks, question, history) -> QAResponse

Called by P3's agent.py:
    from core.qa import answer_question
    result = await answer_question(state["tasks"], message, state["chat_history"])
    return {"answer": result.answer, "citations": result.citations}
"""

from __future__ import annotations

import json
from typing import Any

from core.llm_clients import call_llm
from core.prompts import build_qa_prompt
from core.models import Task, QAResponse

# Maximum tasks to send in context -- beyond ~30 tasks the prompt gets very
# large. Slice to top-ranked tasks since those are what most questions are about.
MAX_CONTEXT_TASKS = 25

# Maximum chat history turns to send (each turn = user + assistant message)
MAX_HISTORY_TURNS = 6 #so that context overflow does not happen


def _build_task_context(tasks: list[Task]) -> list[dict[str, Any]]:
    """
    Build the task context payload sent to the QA prompt.
    Includes score, rationale, and source metadata so the model can answer
    "why is X ranked #1" and "summarize the VP email" correctly.
    Excludes raw_text (too large) -- source_sentence is enough for grounding.
    """
    # Sort by score desc so the model sees the most important tasks first
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
            # Include source_sentence so the model can accurately answer
            # "summarize the VP email" -- it is the grounding anchor text
            "source_sentence": t.source_sentence,
        }
        for t in context_tasks
    ]


def _trim_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """Keep only the last MAX_HISTORY_TURNS pairs to control token count."""
    # history is [{role: "user"|"assistant", content: "..."}]
    return history[-(MAX_HISTORY_TURNS * 2):]


async def answer_question(
    tasks: list[Task],
    question: str,
    chat_history: list[dict[str, str]] | None = None,
) -> QAResponse:
    """
    Answer a natural language question about the engineer's task list.

    Args:
        tasks:        full ranked task list (output of prioritizer.prioritize())
        question:     the user's question string
        chat_history: list of prior turns as [{"role": "user"|"assistant", "content": "..."}]
                      Pass None or [] for first message in a session.

    Returns:
        QAResponse with .answer (string) and .citations (list of task/source IDs).
        The answer is always grounded -- if the question can't be answered from
        context, the model says so explicitly rather than guessing.
    """
    task_context = _build_task_context(tasks)
    trimmed_history = _trim_history(chat_history or [])

    system, user_prompt = build_qa_prompt(
        full_task_context=task_context,
        user_question=question,
        chat_history=trimmed_history,
    )

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.4,   # slightly higher than extraction -- natural language answers
        max_output_tokens=1024,
    )

    # Parse JSON response: {"answer": "...", "citations": ["JIRA-1234", ...]}
    if response.parsed_json and isinstance(response.parsed_json, dict):
        return QAResponse(
            answer=str(response.parsed_json.get("answer", response.text)),
            citations=list(response.parsed_json.get("citations", [])),
        )

    # Fallback: model returned plain text instead of JSON (shouldn't happen
    # with json_mode=True, but be defensive for the live demo)
    return QAResponse(answer=response.text.strip(), citations=[])



# Smoke test: PYTHONPATH=. python core/qa.py


if __name__ == "__main__":
    import asyncio, sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


    import core.qa as qa_module
    

    from core.models import Task

    SAMPLE_TASKS = [
        Task(id="JIRA-1234", title="Payment upload fails >10MB", source="jira_board",
             source_type="jira", priority="P1", deadline="2026-06-19",
             vp_escalation=True, customer_facing=True, score=97.0,
             rationale="P1 with VP escalation, SLA today.",
             merged_sources=["INC0045231", "EML-001"],
             source_sentence="I'd like this treated as the top priority until resolved."),
        Task(id="INC0045260", title="Memory leak in report worker", source="defect_tracker",
             source_type="servicenow", priority="P1", deadline="2026-06-20",
             score=89.0, rationale="P1 SLA in <24h."),
        Task(id="JIRA-1212", title="Rate limiting on /api/v2/search", source="jira_board",
             source_type="jira", priority="P2", deadline="2026-06-24",
             blocks=["JIRA-1188", "JIRA-1240"], score=64.0,
             rationale="Blocks 2 downstream tasks."),
    ]

    DEMO_QUESTIONS = [
        ("Why is the upload bug ranked #1?", []),
        ("Summarize the VP email", [{"role": "user", "content": "Why is JIRA-1234 top?"}, {"role": "assistant", "content": "Because of VP escalation."}]),
        ("What should I defer?", []),
        ("What's blocking my teammates?", []),
        ("What's my #1 today?", []),
    ]

    async def _test():
        print("=== QA LAYER SMOKE TEST ===\n")
        for question, history in DEMO_QUESTIONS:
            result = await answer_question(SAMPLE_TASKS, question, history)
            print(f"Q: {question}")
            print(f"A: {result.answer}")
            print(f"   Citations: {result.citations}\n")

    asyncio.run(_test())