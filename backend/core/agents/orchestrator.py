import asyncio
import logging
from typing import Any

from core.agents.base import BaseAgent
from core.agents.ingestion_agent import IngestionAgent
from core.agents.extraction_agent import ExtractionAgent
from core.agents.dedup_agent import DedupAgent
from core.agents.priority_agent import PriorityAgent
from core.agents.planning_agent import PlanningAgent
from models.task import Task
from core.normalizer import _infer_team

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    def __init__(self):
        self.agents: list[BaseAgent] = [
            IngestionAgent(),
            ExtractionAgent(),
            DedupAgent(),
            PriorityAgent(),
            PlanningAgent(),
        ]

    async def run_pipeline(self, initial_context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = dict(initial_context) if initial_context else {}

        for agent in self.agents:
            try:
                if agent.name == "extraction":
                    self._normalize_inline(context)
                result = await agent.process(context)
                context.update(result)
            except Exception as e:
                logger.error("Agent %s failed: %s — continuing", agent.name, e)

        return context

    def _normalize_inline(self, context: dict[str, Any]) -> None:
        """Convert all connector data to Task objects."""
        try:
            normalized = []
            source_types = ["jira", "defects", "emails", "github", "slack", "transcript"]

            SOURCE_TYPE_MAP = {
                "defects": "defect",
                "emails": "email",
                "jira": "jira",
                "github": "github",
                "slack": "slack",
                "transcript": "transcript",
            }

            for source_type in source_types:
                items = context.get(source_type, [])
                if not items or not isinstance(items, list):
                    continue
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    item_id = item.get("id", "") or item.get("key", "")
                    if not item_id:
                        continue
                    title = item.get("title", "")
                    if source_type == "emails":
                        title = f"Email: {title}" if title else "Email: (no subject)"
                    st = SOURCE_TYPE_MAP.get(source_type, item.get("source_type", source_type))

                    normalized.append(Task(
                        id=item_id,
                        title=title,
                        description=item.get("description", ""),
                        source=item.get("source", item_id),
                        source_type=st,
                        priority=item.get("priority"),
                        deadline=item.get("deadline"),
                        owner=item.get("owner"),
                        assignee=item.get("owner"),
                        team=_infer_team(item.get("owner")),
                        status=item.get("status") or "open",
                        dependencies=item.get("dependencies", []),
                        blocks=item.get("blocks", []),
                        raw_text=str(item.get("raw_text", "") or ""),
                    ))

            context["normalized_tasks"] = normalized
            logger.info("Normalized %d tasks inline", len(normalized))
        except Exception as e:
            logger.error("Inline normalizer failed: %s", e)
            import traceback
            traceback.print_exc()
            context.setdefault("normalized_tasks", [])