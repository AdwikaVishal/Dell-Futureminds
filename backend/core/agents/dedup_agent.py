import json
import logging
from typing import Any

from core.agents.base import BaseAgent
from core.deduplicator import deduplicate
from models.task import Task

logger = logging.getLogger(__name__)


class DedupAgent(BaseAgent):
    name = "deduplication"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        normalized_tasks = context.get("normalized_tasks", [])
        extracted_tasks = context.get("extracted_tasks", [])

        merged = normalized_tasks + extracted_tasks
        logger.info("Merged %d normalized + %d extracted = %d total",
                     len(normalized_tasks), len(extracted_tasks), len(merged))

        try:
            deduped = deduplicate(merged)
            logger.info("After dedup: %d tasks", len(deduped))

            deduped_with_explanation = []
            for t in deduped:
                if t.raw_text and t.dedup_group:
                    try:
                        dedup_info = json.loads(t.raw_text) if isinstance(t.raw_text, str) else {}
                        if isinstance(dedup_info, dict) and "dedup_group_id" in dedup_info:
                            t.dedup_explanation = dedup_info.get("reasoning", "")
                            t.dedup_confidence = dedup_info.get("match_confidence", 0.0)
                            t.raw_text = ""
                    except (json.JSONDecodeError, TypeError):
                        pass
                deduped_with_explanation.append(t)

        except Exception as e:
            logger.error("Deduplication failed: %s — using merged list", e)
            deduped_with_explanation = merged

        return {"deduped_tasks": deduped_with_explanation}

    async def reflect(self, context: dict[str, Any]) -> dict[str, Any]:
        reflection = await super().reflect(context)
        normalized = context.get("normalized_tasks", [])
        extracted = context.get("extracted_tasks", [])
        total = len(normalized) + len(extracted)

        reflection["observations"] = [
            f"Received {total} total tasks ({len(normalized)} normalized, {len(extracted)} extracted)"
        ]

        jira_tasks = [t for t in (normalized + extracted) if t.source_type == "jira"]
        email_tasks = [t for t in (normalized + extracted) if t.source_type == "email"]
        if jira_tasks and email_tasks:
            reflection["decisions"] = [
                "Cross-source correlation possible between Jira and email tasks"
            ]
            jira_ids_found = []
            for t in email_tasks:
                import re
                ids = re.findall(r'[A-Z]+-\d+', t.title + ' ' + (t.description or '') + ' ' + (t.raw_text or ''))
                if ids:
                    jira_ids_found.append({"email": t.id, "jira_ids": ids})
            if jira_ids_found:
                reflection["observations"].append(f"Email-to-Jira references detected: {jira_ids_found}")

        return reflection
