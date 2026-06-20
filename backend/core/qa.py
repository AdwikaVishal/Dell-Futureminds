import json
import logging
from typing import List, Dict, Any

from core.llm_client import call_llm
from core.prompts import build_qa_prompt

logger = logging.getLogger(__name__)

async def answer_question(tasks: List[Dict], question: str, chat_history: List[Dict]) -> Dict:
    """
    Answer a question using the task list and chat history.
    """
    # ---------- FIX: Robust history sanitization ----------
    if not isinstance(chat_history, list):
        chat_history = []

    clean_history = []
    for entry in chat_history:
        if not isinstance(entry, dict):
            continue
        # If entry has 'user' and 'assistant', convert to two separate messages
        if "user" in entry and "assistant" in entry:
            clean_history.append({"role": "user", "content": entry["user"]})
            clean_history.append({"role": "assistant", "content": entry["assistant"]})
        # If entry already has 'role' and 'content', keep it
        elif "role" in entry and "content" in entry:
            clean_history.append(entry)
        # Otherwise, ignore malformed entry
        # (no 'role' or missing content)
    chat_history = clean_history
    # -----------------------------------------------------

    # Build prompt using sanitized history
    prompt = build_qa_prompt(tasks, question, chat_history)

    try:
        response = await call_llm(prompt, json_mode=True)
        data = json.loads(response)
        return {
            "answer": data.get("answer", "I couldn't find an answer."),
            "referenced_task_ids": data.get("referenced_task_ids", [])
        }
    except Exception as e:
        logger.error(f"QA failed: {e}")
        # Fallback for demo
        return {
            "answer": "Heuristic mode: Unable to answer questions. Please check your task list manually.",
            "referenced_task_ids": []
        }
