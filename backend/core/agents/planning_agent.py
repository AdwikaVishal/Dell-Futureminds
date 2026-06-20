import logging
from typing import Any

from core.agents.base import BaseAgent
from core.alert_engine import check_alerts
from core.prioritizer import build_daily_plan_from_tasks
from models.task import DailyPlan

logger = logging.getLogger(__name__)


class PlanningAgent(BaseAgent):
    name = "planning"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        ranked_tasks = context.get("ranked_tasks", [])

        alerts = []
        try:
            alerts = check_alerts(ranked_tasks)
            logger.info("Generated %d alerts", len(alerts))
        except Exception as e:
            logger.error("Alert check failed: %s", e)

        try:
            plan = build_daily_plan_from_tasks(ranked_tasks, alerts)
            logger.info("Built daily plan with %d top priorities", len(plan.top_priorities))
        except Exception as e:
            logger.error("Plan generation failed: %s", e)
            plan = DailyPlan()

        return {"alerts": alerts, "plan": plan}
