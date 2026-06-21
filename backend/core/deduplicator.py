from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher
from typing import Optional

from core.llm_client import call_llm
from core.prompts import build_dedup_confirmation_prompt
from models.task import Task

logger = logging.getLogger(__name__)

# Layer 2: title string similarity. >= this -> instant merge, no LLM call needed.
SIMILARITY_MERGE_THRESHOLD = 0.75

# Layer 3: borderline band. Below the floor, titles are too different to bother
# checking with the LLM. Within [floor, ceiling), ask the LLM to confirm.
# Floor is intentionally low (0.15) so genuinely different-worded duplicates
# (e.g. a Jira bug title vs. a VP escalation email about the same issue) still
# get a real semantic check instead of relying solely on an explicit ID match.
SIMILARITY_LLM_FLOOR = 0.15
SIMILARITY_LLM_CEILING = SIMILARITY_MERGE_THRESHOLD

# Matches ticket-style references like JIRA-1234, DEF-001, PROJ-42.
# Deliberately requires an uppercase prefix + dash + digits so it doesn't
# accidentally match lowercase ids like "email_008".
ID_REFERENCE_PATTERN = re.compile(r"\b([A-Z]{2,10}-\d{1,6})\b")


def _title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _find_id_references(task: Task) -> set[str]:
    """Find ticket-style IDs (e.g. JIRA-1234) mentioned anywhere in a task's text."""
    text = f"{task.title} {task.description} {task.raw_text}"
    return {ref.upper() for ref in ID_REFERENCE_PATTERN.findall(text)}


def _task_brief(task: Task) -> dict:
    """Minimal dict for the LLM prompt -- keep it cheap and on-topic."""
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description or task.raw_text[:400],
        "source_type": task.source_type,
    }


async def _llm_confirm_duplicate(task_a: Task, task_b: Task) -> tuple[bool, str]:
    try:
        system, user_prompt = build_dedup_confirmation_prompt(_task_brief(task_a), _task_brief(task_b))
        response = await call_llm(prompt=user_prompt, system=system, json_mode=True, temperature=0.0)
        result = response.parsed_json
        if isinstance(result, dict):
            return bool(result.get("is_duplicate", False)), str(result.get("reasoning", ""))
        return False, "unparseable LLM response"
    except Exception as e:
        logger.warning("LLM dedup confirmation failed for %s/%s: %s", task_a.id, task_b.id, e)
        return False, f"error: {e}"


async def _find_match(task: Task, task_refs: set[str], deduped: list[Task]) -> tuple[Optional[Task], str]:
    """Run the 3-layer match against everything already accepted into `deduped`."""

    # Layer 1 -- explicit ID cross-reference. Cheapest and highest-confidence:
    # if task A's text literally mentions task B's id (e.g. an email says
    # "tracked as JIRA-1234"), that's a hard merge regardless of title wording.
    for existing in deduped:
        existing_refs = _find_id_references(existing)
        if existing.id.upper() in task_refs or task.id.upper() in existing_refs:
            return existing, "id_reference"

    # Layer 2 -- title string similarity. Catches near-identical titles
    # across sources cheaply, with no LLM call.
    best_sim = 0.0
    best_match: Optional[Task] = None
    for existing in deduped:
        sim = _title_similarity(task.title, existing.title)
        if sim >= SIMILARITY_MERGE_THRESHOLD:
            return existing, f"title_similarity:{sim:.2f}"
        if sim > best_sim:
            best_sim = sim
            best_match = existing

    # Layer 3 -- LLM semantic fallback, only for the single best borderline
    # candidate (avoids O(n^2) LLM calls). This is what catches cases like
    # "Upload service returning 500s" vs "VP escalation about upload bug",
    # where the titles share little surface text but describe the same issue.
    if best_match is not None and SIMILARITY_LLM_FLOOR <= best_sim < SIMILARITY_LLM_CEILING:
        is_dup, reasoning = await _llm_confirm_duplicate(task, best_match)
        if is_dup:
            logger.info("LLM confirmed duplicate: %s ~ %s (%s)", task.id, best_match.id, reasoning)
            return best_match, f"llm_confirmed(title_sim={best_sim:.2f})"

    return None, ""


async def deduplicate(tasks: list[Task]) -> list[Task]:
    if not tasks:
        return []

    deduped: list[Task] = []
    groups: dict[str, list[Task]] = {}
    merge_reasons: dict[str, str] = {}

    for task in tasks:
        task_refs = _find_id_references(task)
        match_target, reason = await _find_match(task, task_refs, deduped)

        if match_target is not None:
            key = match_target.id
            groups.setdefault(key, [match_target])
            groups[key].append(task)
            merge_reasons[task.id] = reason
            logger.info("Merged %s into %s (%s)", task.id, match_target.id, reason)
        else:
            deduped.append(task)

    result: list[Task] = []
    for task in deduped:
        if task.id in groups:
            group = groups[task.id]
            merged_sources = list(dict.fromkeys(t.source for t in group))
            merged_from = list(dict.fromkeys(t.id for t in group if t.id != task.id))
            task.merged_sources = merged_sources
            task.merged_from = merged_from
            task.dedup_group = task.id
        result.append(task)

    logger.info(
        "Deduplication: %d tasks -> %d unique (%d merge groups)",
        len(tasks), len(result), len(groups),
    )
    return result
