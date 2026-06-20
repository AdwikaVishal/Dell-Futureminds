import logging
from typing import Any

from core.agents.base import BaseAgent
from core.alert_engine import check_alerts

logger = logging.getLogger(__name__)


class AlertAgent(BaseAgent):
    name = "alert"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        ranked_tasks = context.get("ranked_tasks", [])

        try:
            alerts = check_alerts(ranked_tasks)
            logger.info("Generated %d alerts", len(alerts))
        except Exception as e:
            logger.error("Alert check failed: %s", e)
            alerts = []

        return {"alerts": alerts}
