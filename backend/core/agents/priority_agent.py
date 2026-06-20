import logging
from typing import Any

from core.agents.base import BaseAgent
from core.prioritizer import prioritize
from models.task import RankedTask

logger = logging.getLogger(__name__)


class PriorityAgent(BaseAgent):
    name = "prioritization"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        deduped_tasks = context.get("deduped_tasks", [])

        try:
            ranked_tasks = await prioritize(deduped_tasks)
            logger.info("Prioritized %d tasks", len(ranked_tasks))
        except Exception as e:
            logger.error("Prioritization failed: %s", e)
            ranked_tasks = [
                RankedTask(
                    **t.model_dump(exclude={'rank', 'score', 'rationale'}),
                    score=50.0,
                    rationale="Fallback ranking.",
                )
                for t in deduped_tasks
            ]

        return {"ranked_tasks": ranked_tasks}
