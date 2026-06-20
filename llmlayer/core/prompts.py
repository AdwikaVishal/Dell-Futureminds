"""
core/prompts.py
Owner: Aditi (LLM & intelligence layer)

Every prompt the system uses lives here. Each function returns a
(system_instruction, user_prompt) tuple ready to hand to llm_client.call_llm().
Keeping the prompt TEXT separate from the calling logic (extractor.py /
prioritizer.py) means Person 5 can tune wording without touching code, and judges
can be shown this file directly as proof prioritization logic is auditable
(per the problem statement's "no black-box decisions" requirement, llm is transparent).

Five prompts for the system to use:
  1. EXTRACTION_PROMPT  -- raw email/transcript text -> action items JSON
  -> This prompt is used to extract actionable tasks from raw email/transcript text.

  2. PRIORITIZATION_PROMPT -- deduplicated task list -> scored + ranked JSON
    -> This prompt is used to score and rank the deduplicated task list.

  3. DAILY_PLAN_PROMPT -- ranked list -> structured markdown daily plan
    -> This prompt is used to convert the ranked task list into a structured markdown daily plan.

  4. REPRIORITIZE_PROMPT -- existing plan + new task -> re-ranked + diff explanation
    -> This prompt is used to re-score and re-rank the task list when a new task is added.

  5. QA_PROMPT -- full task list + user question -> grounded answer + citations
    -> This prompt is used to answer questions about the task list, conversational in nature.
"""

from __future__ import annotations

import json
from typing import Any


# ---------------------------------------------------------------------------
# 1. EXTRACTION_PROMPT
# ---------------------------------------------------------------------------

def build_extraction_prompt(source_text: str, source_type: str, source_id: str) -> tuple[str, str]:
    """
    Extracts buried action items from one raw email body or meeting transcript.
    Called once per email / once per transcript by extractor.py.

    Returns JSON array of:
      {title, owner, deadline, confidence, source_sentence}

    Design notes:
      - confidence is the model's own estimate that this is a real actionable
        item (not informational content) -- extractor.py can threshold on this
        to avoid extracting noise from newsletters/automated alerts.
      - source_sentence is mandatory and must be a near-verbatim sentence
        from the input -- this is what core/grounding.py (P5) fuzzy-matches
        against the raw source to catch hallucinated items.
      - owner is null if no specific person is named (default assumption:
        the inbox owner). It is set to a name ONLY if that specific other
        person is explicitly asked to do it -- this matters because P1's
        data plants tasks owned by other people on purpose, and we must NOT
        absorb those into "my" task list.
    """
    system = (
        "You are an expert assistant that extracts actionable tasks hidden inside "
        "unstructured workplace text (emails, meeting transcripts). You are precise, "
        "conservative, and NEVER invent information that is not present in the source text. "
        "If the text contains no actionable items, return an empty JSON array. "
        "You always return ONLY a valid JSON array, with no commentary, no markdown fences, "
        "and no explanation outside the JSON."
    )#to prevent hallucination and ensure the output is always a valid JSON array

#few-shot prompting
#few-shot prompting is a technique where the LLM is given a few examples of input → output before giving the actual user data.
#The model learns the pattern from those examples and tries to generate similar outputs for new inputs.
#This helps the LLM to understand the task and generate a more accurate output.
#This is helpful because it prevents the LLM from hallucinating and generating incorrect outputs.
#This is helpful because it helps the LLM to understand the task and generate a more accurate output.
    few_shot = (
        "Here are examples of correct extraction:\n\n"
        "EXAMPLE 1\n"
        "Source text: \"Thanks for the notes. Also, quick favor - can you loop in finance "
        "before Friday so the invoice doesn't get stuck again? Otherwise nothing else to add.\"\n"
        "Output:\n"
        "[\n"
        "  {\n"
        "    \"title\": \"Loop in finance before Friday to avoid invoice delay\",\n"
        "    \"owner\": null,\n"
        "    \"deadline\": \"Friday\",\n"
        "    \"confidence\": 0.9,\n"
        "    \"source_sentence\": \"can you loop in finance before Friday so the invoice doesn't get stuck again?\"\n"
        "  }\n"
        "]\n\n"
        "EXAMPLE 2 (no real action item - should return empty array)\n"
        "Source text: \"Weekly infra report: cloud spend up 3%. No action required, informational only.\"\n"
        "Output:\n"
        "[]\n\n"
        "EXAMPLE 3 (action item assigned to someone OTHER than the inbox owner - owner field must be set)\n"
        "Source text: \"Diane, can you make sure this gets done before end of sprint? Appreciate it.\"\n"
        "Output:\n"
        "[\n"
        "  {\n"
        "    \"title\": \"Ensure task is completed before end of sprint\",\n"
        "    \"owner\": \"Diane\",\n"
        "    \"deadline\": \"end of sprint\",\n"
        "    \"confidence\": 0.85,\n"
        "    \"source_sentence\": \"Diane, can you make sure this gets done before end of sprint?\"\n"
        "  }\n"
        "]\n\n"
        "EXAMPLE 4 (multiple buried items in one email - extract each separately)\n"
        "Source text: \"Recap of sync: mostly routine planning. One more thing - can you also "
        "update the API docs once the rate limit change ships? And separately, can someone "
        "double check the billing webhook before Friday?\"\n"
        "Output:\n"
        "[\n"
        "  {\n"
        "    \"title\": \"Update API docs once rate limit change ships\",\n"
        "    \"owner\": null,\n"
        "    \"deadline\": null,\n"
        "    \"confidence\": 0.82,\n"
        "    \"source_sentence\": \"can you also update the API docs once the rate limit change ships?\"\n"
        "  },\n"
        "  {\n"
        "    \"title\": \"Double check the billing webhook\",\n"
        "    \"owner\": null,\n"
        "    \"deadline\": \"Friday\",\n"
        "    \"confidence\": 0.78,\n"
        "    \"source_sentence\": \"can someone double check the billing webhook before Friday?\"\n"
        "  }\n"
        "]\n"
    )

    user_prompt = (
        f"{few_shot}\n"
        f"Now extract action items from this {source_type} (source_id: {source_id}).\n"
        "Remember: return ONLY the JSON array, nothing else. If there are no actionable "
        "items, return [].\n\n"
        "SOURCE TEXT:\n"
        "\"\"\"\n"
        f"{source_text}\n"
        "\"\"\"\n"
    )
    return system, user_prompt


# ---------------------------------------------------------------------------
# 2. PRIORITIZATION_PROMPT
# ---------------------------------------------------------------------------

#Prioritization is the process of determining the importance of tasks based on their deadline, severity, business impact, and dependency blocking.
#This is done to help the LLM to understand the task and generate a more accurate output.
#This is helpful because it prevents the LLM from hallucinating and generating incorrect outputs.
#This is helpful because it helps the LLM to understand the task and generate a more accurate output.
def build_prioritization_prompt(deduplicated_tasks: list[dict[str, Any]]) -> tuple[str, str]:
    """
    Scores and ranks the FULL deduplicated task list.
    Called once per pipeline run (or once per /inject re-run via the
    reprioritize prompt instead -- see build_reprioritize_prompt below).

    Scoring formula (must match what's printed in docs/architecture.md so
    P5's eval can verify rationale matches actual math):

      score = (deadline_urgency * 0.35)
            + (severity        * 0.30)
            + (business_impact * 0.20)
            + (dependency_blocking * 0.15)

      deadline_urgency: 100 if due/SLA within 24h, scaled down linearly to 0
                         at 14+ days out, with no deadline = 30 (mild urgency
                         floor so undated tasks don't disappear entirely)
      severity:         P0=100, P1=75, P2=50, P3=25
      business_impact:  100 if VP/customer-facing escalation flagged,
                         70 if customer-facing but no exec escalation,
                         40 otherwise
      dependency_blocking: 100 if this task blocks 2+ other tasks,
                         60 if it blocks exactly 1,
                         0 if it blocks nothing
    we are using fixed formula to prevent llm from its own improvisation which can be wrong
    The LLM is asked to APPLY this formula and explain its arithmetic in the
    rationale, rather than freely improvising a score 
    *this is what makes the ranking auditable rather than a black box.*
    """
    system = (
        "You are a prioritization engine for a software engineer's task list. "
        "You score every task using EXACTLY the formula provided, and you never "
        "deviate from it or apply intuition instead. Your rationale must show the "
        "actual component values you used, in two sentences: one stating the "
        "score breakdown, one stating the single biggest driver of the score. "
        "Return ONLY a valid JSON array sorted by score descending, no commentary."
    )

    formula_block = (
        "SCORING FORMULA (apply exactly):\n"
        "score = (deadline_urgency * 0.35) + (severity * 0.30) + (business_impact * 0.20) + (dependency_blocking * 0.15)\n\n"
        "Component rules:\n"
        "- deadline_urgency: 100 if due/SLA within 24h; linearly scale down to 0 at 14+ days out; 30 if no deadline given.\n"
        "- severity: P0=100, P1=75, P2=50, P3=25.\n"
        "- business_impact: 100 if flagged as VP/exec escalation OR explicit customer-facing financial impact; 70 if customer-facing but no exec escalation; 40 otherwise.\n"
        "- dependency_blocking: 100 if this task blocks 2+ other tasks; 60 if it blocks exactly 1 other task; 0 if it blocks nothing.\n\n"
        "Output schema per task:\n"
        "{\n"
        "  \"id\": \"<task id>\",\n"
        "  \"score\": <number, 0-100, one decimal place>,\n"
        "  \"rationale\": \"<two sentences: score breakdown by component, then the single biggest driver>\"\n"
        "}\n"
    )

    tasks_json = json.dumps(deduplicated_tasks, indent=2)

    user_prompt = (
        f"{formula_block}\n"
        "Score and rank ALL of the following tasks using the formula above. Return a "
        "JSON array sorted by score descending. Include every task -- do not omit any.\n\n"
        f"TASKS:\n{tasks_json}\n"
    )
    return system, user_prompt


# ---------------------------------------------------------------------------
# 3. DAILY_PLAN_PROMPT
# ---------------------------------------------------------------------------

def build_daily_plan_prompt(
    ranked_tasks: list[dict[str, Any]],
    active_alerts: list[dict[str, Any]] | None = None,
) -> tuple[str, str]:
    """
    Takes the already-ranked task list (output of prioritizer.py) and produces
    a structured markdown daily plan. This is a presentation/structuring step,
    NOT a re-scoring step -- the ranking is already final by this point.

    Output is markdown text (not JSON) because P4 renders this directly in
    the dashboard. Sections, in order:
      - "Top 3 for Today" with one-line rationale each
      - "Do Next"
      - "Blocked - needs action from others"
      - "Defer to tomorrow"
    """
    system = (
        "You are a planning assistant that converts an already-ranked task list "
        "into a clear, structured daily plan for a software engineer. You do NOT "
        "re-rank or re-score tasks -- you organize the given ranking into sections. "
        "Be concise: one line of rationale per task, no filler language. "
        "Output valid markdown only, using exactly these four headers in this order: "
        "'## Top 3 for Today', '## Do Next', '## Blocked - Needs Action From Others', "
        "'## Defer to Tomorrow'."
    )

    alerts_block = ""
    if active_alerts:
        alerts_block = (
            "\nACTIVE ALERTS (mention briefly at the top if relevant):\n"
            f"{json.dumps(active_alerts, indent=2)}\n"
        )

    tasks_json = json.dumps(ranked_tasks, indent=2)

    user_prompt = (
        "Given this already-ranked task list (highest score = highest priority), "
        "organize it into a daily plan.\n"
        f"{alerts_block}\n"
        f"RANKED TASKS:\n{tasks_json}\n\n"
        "Rules:\n"
        "- \"Top 3 for Today\" = the 3 highest-scored tasks, each with a one-sentence rationale.\n"
        "- \"Do Next\" = next 2-4 tasks worth queuing up after the top 3.\n"
        "- \"Blocked - Needs Action From Others\" = any task whose dependencies aren't resolved yet, or that explicitly needs someone else to act first.\n"
        "- \"Defer to Tomorrow\" = remaining lower-priority tasks.\n"
        "- Every task must appear in exactly one section.\n"
    )
    return system, user_prompt


# ---------------------------------------------------------------------------
# 4. REPRIORITIZE_PROMPT (when new tasks come in or are deleted we need to dynamically reassign the priority)
# ---------------------------------------------------------------------------

def build_reprioritize_prompt(
    current_ranked_tasks: list[dict[str, Any]],
    new_task: dict[str, Any],
) -> tuple[str, str]:
    """
    Used by the live /inject demo moment. Takes the CURRENT ranking plus one
    newly injected task, re-scores using the same formula as
    PRIORITIZATION_PROMPT, and -- critically -- explains exactly what moved
    and why. This explicit diff is the visible "rank change" P3/P4 need to
    highlight in red for 3 seconds during the demo.

    Must reuse the identical scoring formula as build_prioritization_prompt
    so the new task is scored on a level playing field, not just inserted
    at #1 by assumption.
    """
    system = (
        "You are a prioritization engine handling a live re-ranking event: a new "
        "task has just arrived and must be scored and merged into an existing "
        "ranked list using the same formula as before. You must clearly explain "
        "what changed in the ranking and why -- this explanation is shown live "
        "to the user, so it must be specific (cite the actual score and the "
        "actual component that drove it), not generic. "
        "Return ONLY valid JSON, no commentary outside the JSON."
    )

    formula_block = (
        "SCORING FORMULA (apply exactly, same as standard prioritization):\n"
        "score = (deadline_urgency * 0.35) + (severity * 0.30) + (business_impact * 0.20) + (dependency_blocking * 0.15)\n"
        "- deadline_urgency: 100 if due/SLA within 24h; linearly scale down to 0 at 14+ days; 30 if none given.\n"
        "- severity: P0=100, P1=75, P2=50, P3=25.\n"
        "- business_impact: 100 if VP/exec escalation or explicit customer financial impact; 70 if customer-facing only; 40 otherwise.\n"
        "- dependency_blocking: 100 if blocks 2+ tasks; 60 if blocks 1; 0 if blocks none.\n\n"
        "Output schema:\n"
        "{\n"
        "  \"new_rank\": [ {\"id\": \"...\", \"score\": <number>, \"rationale\": \"<two sentences>\"}, ... ],\n"
        "  \"change_summary\": \"<one or two sentences naming exactly which task moved, from what position to what position, and the specific scoring factor that caused it>\"\n"
        "}\n"
    )

    user_prompt = (
        f"{formula_block}\n"
        "CURRENT RANKED TASKS (before the new task arrived):\n"
        f"{json.dumps(current_ranked_tasks, indent=2)}\n\n"
        "NEW TASK JUST INJECTED:\n"
        f"{json.dumps(new_task, indent=2)}\n\n"
        "Score the new task using the formula, merge it into the ranking, and return the "
        "full updated ranking (all tasks, including the new one) sorted by score "
        "descending, plus a change_summary explaining the rank movement.\n"
    )
    return system, user_prompt


# ---------------------------------------------------------------------------
# 5. QA_PROMPT
# ---------------------------------------------------------------------------

def build_qa_prompt(
    full_task_context: list[dict[str, Any]],
    user_question: str,
    chat_history: list[dict[str, str]] | None = None,
) -> tuple[str, str]:
    """
    Conversational QA over the full task list. Must handle, per the task card:
      - "why is X ranked #1"
      - "summarize the VP email"
      - "what's blocking my teammates"
      - "what should I defer"

    Grounding requirement: every answer must be traceable to source data
    (task IDs, raw_text fields) -- this is what core/grounding.py checks
    downstream, so the answer should explicitly reference task IDs / source
    IDs whenever it makes a factual claim, via the "citations" field.
    """
    system = (
        "You are a conversational assistant answering questions about a software "
        "engineer's task list. You answer ONLY using the task context provided -- "
        "you NEVER invent task details, deadlines, owners, or email content that "
        "is not present in the context. If the answer isn't in the context, say so "
        "explicitly rather than guessing. Every factual claim must be backed by a "
        "citation to a specific task id or source id from the context. "
        "Return ONLY valid JSON: {\"answer\": \"<your answer>\", \"citations\": [\"<id>\", ...]}"
    )

    history_block = ""
    if chat_history:
        history_lines = "\n".join(f"{turn['role']}: {turn['content']}" for turn in chat_history[-6:])
        history_block = f"\nRECENT CONVERSATION:\n{history_lines}\n"

    context_json = json.dumps(full_task_context, indent=2)

    user_prompt = (
        "TASK CONTEXT (the only source of truth -- do not use outside knowledge):\n"
        f"{context_json}\n"
        f"{history_block}\n"
        f"USER QUESTION: \"{user_question}\"\n\n"
        "Answer the question using only the context above. Cite specific task/source IDs "
        "that support your answer. If asked to summarize an email, summarize only what's "
        "in that email's raw_text field -- do not add details that aren't there.\n"
    )
    return system, user_prompt