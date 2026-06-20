from __future__ import annotations

from datetime import datetime
from typing import Any

from models.task import Task


def _parse_date(val: Any) -> str | None:
    if val is None:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def normalize_all(jira: list[dict], defects: list[dict], emails: list[dict]) -> list[Task]:
    tasks: list[Task] = []

    for item in jira:
        tasks.append(Task(
            id=item["id"],
            title=item["title"],
            description=item.get("description", ""),
            source=item.get("source", item["id"]),
            source_type="jira",
            priority=item.get("priority"),
            deadline=_parse_date(item.get("deadline")),
            owner=item.get("owner"),
            status=item.get("status", "open"),
            dependencies=item.get("dependencies", []),
            blocks=item.get("blocks", []),
            raw_text=item.get("raw_text", ""),
        ))

    for item in defects:
        tasks.append(Task(
            id=item["id"],
            title=item["title"],
            description=item.get("description", ""),
            source=item.get("source", item["id"]),
            source_type="defect",
            priority=item.get("priority"),
            deadline=_parse_date(item.get("deadline")),
            owner=item.get("owner"),
            status=item.get("status", "open"),
            dependencies=item.get("dependencies", []),
            blocks=item.get("blocks", []),
            raw_text=item.get("raw_text", ""),
        ))

    for item in emails:
        tasks.append(Task(
            id=item["id"],
            title=f"Email: {item.get('subject', '(no subject)')}",
            description=item.get("body", "")[:200],
            source=item.get("source", item["id"]),
            source_type="email",
            priority="P2",
            deadline=None,
            owner=None,
            status="open",
            dependencies=[],
            blocks=[],
            raw_text=item.get("body", ""),
        ))

    return tasks


def normalize_connector_payload(raw: list[dict[str, Any]], source_type: str) -> list[dict[str, Any]]:
    normalized = []
    for item in raw:
        normalized.append({
            "id": item["id"],
            "title": item["title"],
            "description": item.get("description", ""),
            "source": item.get("source", item["id"]),
            "source_type": source_type,
            "priority": item.get("priority"),
            "deadline": item.get("deadline"),
            "owner": item.get("owner"),
            "status": item.get("status", "open"),
            "dependencies": item.get("dependencies", []),
            "blocks": item.get("blocks", []),
            "raw_text": item.get("raw_text", ""),
        })
    return normalized
