import logging
from typing import Any

from core.agents.base import BaseAgent
from core.prioritizer import prioritize
from models.task import RankedTask

logger = logging.getLogger(__name__)

_SELF_TOKENS = {"you", "me", "i", "myself"}


def _is_my_task(task) -> bool:
    if task.owner is None:
        return True
    return task.owner.strip().lower() in _SELF_TOKENS


class PriorityAgent(BaseAgent):
    name = "prioritization"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        deduped_tasks = context.get("deduped_tasks", [])

        my_tasks = [t for t in deduped_tasks if _is_my_task(t)]
        delegated = [t for t in deduped_tasks if not _is_my_task(t)]

        if delegated:
            logger.info("Filtered out %d delegated tasks (owned by others)", len(delegated))

        try:
            ranked_tasks = await prioritize(my_tasks)
            logger.info("Prioritized %d tasks (%d delegated excluded)", len(ranked_tasks), len(delegated))
        except Exception as e:
            logger.error("Prioritization failed: %s", e)
            ranked_tasks = [
                RankedTask(
                    **t.model_dump(exclude={'rank', 'score', 'rationale', 'score_breakdown'}),
                    score=50.0,
                    rationale="Fallback ranking.",
                )
                for t in my_tasks
            ]

        return {"ranked_tasks": ranked_tasks, "delegated_tasks": delegated}