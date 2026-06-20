from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from models.task import Task

SIMILARITY_THRESHOLD = 0.75


def _title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def deduplicate(tasks: list[Task]) -> list[Task]:
    if not tasks:
        return []

    deduped: list[Task] = []
    groups: dict[str, list[Task]] = {}

    for task in tasks:
        for existing in deduped:
            if _title_similarity(task.title, existing.title) >= SIMILARITY_THRESHOLD:
                key = existing.id
                groups.setdefault(key, [existing])
                groups[key].append(task)
                break
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
        result.append(task)

    return result
