from __future__ import annotations

import json
import logging
import re
from difflib import SequenceMatcher
from typing import Any

from models.task import Task

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.75
JIRA_PATTERN = re.compile(r"[A-Z]+-\d+")
EMAIL_SIGNATURE_PATTERN = re.compile(r"(?:from|subject|re:|fwd?):?\s*", re.IGNORECASE)


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _extract_jira_ids(text: str) -> set[str]:
    return set(JIRA_PATTERN.findall(text.upper()))


def _keyword_overlap(a: str, b: str) -> float:
    words_a = set(_normalize(a).split())
    words_b = set(_normalize(b).split())
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def _detect_jira_email_correlation(t1: Task, t2: Task) -> tuple[float, str]:
    jira_ids_t1 = _extract_jira_ids(
        t1.title + " " + (t1.description or "") + " " + (t1.raw_text or "")
    )
    jira_ids_t2 = _extract_jira_ids(
        t2.title + " " + (t2.description or "") + " " + (t2.raw_text or "")
    )
    common = jira_ids_t1 & jira_ids_t2
    if common:
        return 0.95, f"Cross-source correlation via JIRA ID: {', '.join(common)}"

    if t1.source_type == "jira" and t2.source_type == "email":
        email_text = t2.title + " " + (t2.description or "") + " " + (t2.raw_text or "")
        jira_text = t1.title + " " + (t1.description or "") + " " + (t1.raw_text or "")
    elif t2.source_type == "jira" and t1.source_type == "email":
        email_text = t1.title + " " + (t1.description or "") + " " + (t1.raw_text or "")
        jira_text = t2.title + " " + (t2.description or "") + " " + (t2.raw_text or "")
    else:
        return 0.0, ""

    jira_ids = _extract_jira_ids(email_text)
    if jira_ids:
        return 0.90, f"Email references JIRA IDs: {', '.join(jira_ids)}"

    kw_overlap = _keyword_overlap(jira_text, email_text)
    if kw_overlap > 0.5:
        return round(kw_overlap * 0.7, 2), f"Keyword overlap: {kw_overlap:.0%}"

    return 0.0, ""


def _detect_vp_escalation_correlation(t1: Task, t2: Task) -> tuple[float, str]:
    if t1.vp_escalation and t2.vp_escalation:
        kw_overlap = _keyword_overlap(
            t1.title + " " + (t1.description or ""),
            t2.title + " " + (t2.description or ""),
        )
        if kw_overlap > 0.3:
            return round(
                0.85 * kw_overlap, 2
            ), "Both flagged as VP escalation with topic overlap"
    return 0.0, ""


def _compute_dedup_confidence(t1: Task, t2: Task) -> tuple[float, str]:
    title_sim = _title_similarity(t1.title, t2.title)

    jira_conf, jira_reason = _detect_jira_email_correlation(t1, t2)
    vp_conf, vp_reason = _detect_vp_escalation_correlation(t1, t2)

    kw_overlap = _keyword_overlap(
        t1.title + " " + (t1.description or ""), t2.title + " " + (t2.description or "")
    )

    confidence = max(title_sim, jira_conf, vp_conf, kw_overlap)

    reasons = []
    if title_sim >= SIMILARITY_THRESHOLD:
        reasons.append(f"Title similarity: {title_sim:.0%}")
    if jira_conf > 0:
        reasons.append(jira_reason)
    if vp_conf > 0:
        reasons.append(vp_reason)
    if kw_overlap > SIMILARITY_THRESHOLD:
        reasons.append(f"Keyword overlap: {kw_overlap:.0%}")

    if confidence >= SIMILARITY_THRESHOLD:
        reason = (
            "; ".join(reasons) if reasons else f"Combined confidence: {confidence:.0%}"
        )
        return confidence, reason

    return 0.0, ""


def deduplicate(tasks: list[Task]) -> list[Task]:
    if not tasks:
        return []

    deduped: list[Task] = []
    groups: dict[str, list[Task]] = {}
    dedup_explanations: dict[str, dict[str, Any]] = {}

    for task in tasks:
        matched = False
        best_confidence = 0.0
        best_reason = ""
        best_existing = None

        for existing in deduped:
            confidence, reason = _compute_dedup_confidence(task, existing)
            if confidence >= SIMILARITY_THRESHOLD and confidence > best_confidence:
                best_confidence = confidence
                best_reason = reason
                best_existing = existing
                matched = True

        if matched and best_existing:
            key = best_existing.id
            groups.setdefault(key, [best_existing])
            groups[key].append(task)
            dedup_explanations[task.id] = {
                "merged_into": key,
                "confidence": round(best_confidence, 2),
                "reasoning": best_reason,
            }
            logger.info(
                "Dedup: %s (%s) -> %s (%s) confidence=%.2f reason='%s'",
                task.id,
                task.source_type,
                best_existing.id,
                best_existing.source_type,
                best_confidence,
                best_reason,
            )
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
            task.dedup_group = f"dedup_{task.id}"

            group_explanations = []
            for gt in group:
                if gt.id != task.id:
                    info = dedup_explanations.get(gt.id, {})
                    if info:
                        group_explanations.append(
                            {
                                "task_id": gt.id,
                                "confidence": info.get("confidence", 0),
                                "reasoning": info.get("reasoning", ""),
                            }
                        )
            task.raw_text = json.dumps(
                {
                    "dedup_group_id": task.dedup_group,
                    "merged_count": len(group),
                    "match_confidence": round(
                        max(
                            _compute_dedup_confidence(task, t)[0]
                            for t in group
                            if t.id != task.id
                        ),
                        2,
                    )
                    if len(group) > 1
                    else 1.0,
                    "reasoning": " ; ".join(
                        info.get("reasoning", "") for info in group_explanations
                    ),
                    "members": group_explanations,
                }
            )
        result.append(task)

    return result
