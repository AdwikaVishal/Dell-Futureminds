"""
core/qa.py — Direct Gemini SDK implementation.
Bypasses the ResilientLLMClient entirely to avoid fallback chain issues.
Uses google-genai SDK directly, same as the working smoke test.
"""
import json
import logging
import os
import re
from typing import Any, Sequence

from core.prompts import build_qa_prompt
from models.task import Task, ChatResponse

logger = logging.getLogger(__name__)

MAX_CONTEXT_TASKS = 10  # keep prompt small to avoid timeouts
MAX_HISTORY_TURNS = 4


def _build_task_context(tasks: Sequence[Task]) -> list[dict[str, Any]]:
    sorted_tasks = sorted(tasks, key=lambda t: getattr(t, "score", 0) or 0, reverse=True)
    result = []
    for t in sorted_tasks[:MAX_CONTEXT_TASKS]:
        result.append({
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "score": getattr(t, "score", 0),
            "rationale": getattr(t, "rationale", ""),
            "deadline": t.deadline,
            "source_type": t.source_type,
            "status": t.status,
            "vp_escalation": t.vp_escalation,
            "customer_facing": t.customer_facing,
            "source_sentence": getattr(t, "source_sentence", ""),
        })
    return result


def _trim_history(history: list[dict]) -> list[dict]:
    return history[-(MAX_HISTORY_TURNS * 2):]


def _extract_json(text: str):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass
    for open_c, close_c in (("{", "}"), ("[", "]")):
        start = text.find(open_c)
        end = text.rfind(close_c)
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
    return None


async def _call_gemini_direct(system: str, prompt: str) -> str:
    """Call Gemini directly using google-genai SDK."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.3,
                max_output_tokens=1024,
                response_mime_type="application/json",
            ),
        )
        return response.text or ""
    except ImportError:
        # Fall back to httpx if google-genai not installed
        import httpx
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 1024,
            "temperature": 0.3,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                headers=headers,
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"] or ""


async def answer_question(
    tasks: Sequence[Task],
    question: str,
    chat_history: Sequence[dict] | None = None,
) -> ChatResponse:
    if not isinstance(chat_history, list):
        chat_history = []

    clean_history: list[dict] = []
    for entry in chat_history:
        if not isinstance(entry, dict):
            continue
        if "user" in entry and "assistant" in entry:
            clean_history.append({"role": "user", "content": entry["user"]})
            clean_history.append({"role": "assistant", "content": entry["assistant"]})
        elif "role" in entry and "content" in entry:
            clean_history.append(entry)

    trimmed_history = _trim_history(clean_history)
    task_context = _build_task_context(tasks)
    system_prompt, user_prompt = build_qa_prompt(task_context, question, trimmed_history)

    try:
        raw = await _call_gemini_direct(system_prompt, user_prompt)
        parsed = _extract_json(raw)

        if parsed and isinstance(parsed, dict):
            return ChatResponse(
                answer=str(parsed.get("answer", raw)),
                referenced_task_ids=list(parsed.get("citations", [])),
            )
        if raw.strip():
            return ChatResponse(answer=raw.strip(), referenced_task_ids=[])

    except Exception as e:
        logger.error("Gemini QA call failed: %s", e)
        # Smart heuristic fallback — actually answers from task data
        return _smart_fallback(tasks, question)

    return _smart_fallback(tasks, question)


def _smart_fallback(tasks: Sequence[Task], question: str) -> ChatResponse:
    """
    Rule-based QA that gives real answers from task data.
    Much better than 'Heuristic mode: Unable to answer'.
    """
    q = question.lower().strip()
    sorted_tasks = sorted(tasks, key=lambda t: getattr(t, "score", 0) or 0, reverse=True)

    # "what's my #1 / top priority"
    if any(w in q for w in ["#1", "top priority", "number one", "most important", "first"]):
        if sorted_tasks:
            top = sorted_tasks[0]
            return ChatResponse(
                answer=f"Your #1 priority is **{top.title}** ({top.priority or 'unranked'}, score: {getattr(top, 'score', 0):.0f}/100). {getattr(top, 'rationale', '')}",
                referenced_task_ids=[top.id],
            )

    # "why is X ranked #1 / why is X top"
    if "why" in q and ("rank" in q or "#1" in q or "top" in q or "first" in q):
        if sorted_tasks:
            top = sorted_tasks[0]
            return ChatResponse(
                answer=f"{top.title} is ranked #1 because: {getattr(top, 'rationale', 'it has the highest combined score across severity, deadline urgency, and business impact.')}",
                referenced_task_ids=[top.id],
            )

    # "summarize the VP email"
    if "vp" in q or "escalat" in q or "sarah" in q:
        vp_tasks = [t for t in tasks if getattr(t, "vp_escalation", False)]
        if vp_tasks:
            t = vp_tasks[0]
            src = getattr(t, "source_sentence", "") or "a VP escalation email"
            return ChatResponse(
                answer=f"The VP escalation is about: **{t.title}**. Source: \"{src}\". This task is ranked #{sorted_tasks.index(t) + 1 if t in sorted_tasks else '?'} due to its critical business impact.",
                referenced_task_ids=[t.id],
            )

    # "what's blocking my teammates"
    if "block" in q or "teammate" in q:
        blocked = [t for t in tasks if t.status == "blocked" or getattr(t, "blocks", [])]
        if blocked:
            names = ", ".join(t.title[:40] for t in blocked[:3])
            return ChatResponse(
                answer=f"Tasks currently blocking others: {names}. Resolving these will unblock your teammates.",
                referenced_task_ids=[t.id for t in blocked[:3]],
            )
        return ChatResponse(answer="No tasks are currently blocking teammates.", referenced_task_ids=[])

    # "what should I defer"
    if "defer" in q or "postpone" in q or "later" in q or "low priority" in q:
        low = [t for t in sorted_tasks if (t.priority or "P3") in ("P3", "unknown")][-5:]
        if low:
            names = ", ".join(t.title[:40] for t in low[:3])
            return ChatResponse(
                answer=f"Tasks you can safely defer: {names}. These have the lowest priority scores.",
                referenced_task_ids=[t.id for t in low[:3]],
            )

    # "how many tasks"
    if "how many" in q:
        p0 = sum(1 for t in tasks if t.priority == "P0")
        p1 = sum(1 for t in tasks if t.priority == "P1")
        return ChatResponse(
            answer=f"You have {len(list(tasks))} total tasks: {p0} critical (P0), {p1} high (P1), and others. Your top priority is {sorted_tasks[0].title if sorted_tasks else 'none'}.",
            referenced_task_ids=[],
        )

    # "summarize my emails"
    if "email" in q or "summar" in q:
        email_tasks = [t for t in tasks if t.source_type == "email"]
        if email_tasks:
            titles = ", ".join(t.title[:40] for t in email_tasks[:4])
            return ChatResponse(
                answer=f"You have {len(email_tasks)} tasks from emails: {titles}.",
                referenced_task_ids=[t.id for t in email_tasks[:4]],
            )

    # Generic fallback — at least give them their top 3
    if sorted_tasks:
        top3 = sorted_tasks[:3]
        summary = " | ".join(f"#{i+1} {t.title[:30]}" for i, t in enumerate(top3))
        return ChatResponse(
            answer=f"Based on your task list, your top priorities are: {summary}. Ask me 'why is X ranked #1?' or 'what should I defer?' for more details.",
            referenced_task_ids=[t.id for t in top3],
        )

    return ChatResponse(
        answer="I don't have enough task data to answer that. Try refreshing the pipeline first.",
        referenced_task_ids=[],
    )