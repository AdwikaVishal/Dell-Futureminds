import logging
from typing import Any

from core.agents.base import BaseAgent
from core.deduplicator import deduplicate

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
        except Exception as e:
            logger.error("Deduplication failed: %s — using merged list", e)
            deduped = merged

        return {"deduped_tasks": deduped}
