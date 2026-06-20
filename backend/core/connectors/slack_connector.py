import json
import os
from datetime import datetime, timezone
from typing import Any

from core.connectors.base import SourceConnector

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


class SlackConnector(SourceConnector):
    name = "Slack"

    async def connect(self) -> bool:
        self.connected = True
        self.last_sync = datetime.now(timezone.utc).isoformat()
        return True

    async def fetch_tasks(self) -> list[dict[str, Any]]:
        path = os.path.join(DATA_DIR, "emails.json")
        if os.path.exists(path):
            with open(path) as f:
                items = json.load(f)
            slack_items = []
            for i, item in enumerate(items):
                slack_items.append({
                    "id": f"SL-{i + 1:02d}",
                    "title": f"Slack: {item.get('subject', '(no subject)')}",
                    "description": item.get("body", ""),
                    "source": f"SL-{i + 1:02d}",
                    "source_type": "slack",
                    "priority": "P2",
                    "deadline": None,
                    "owner": None,
                    "status": "open",
                    "dependencies": [],
                    "blocks": [],
                    "raw_text": item.get("body", ""),
                    "channel": "#general",
                    "message_ts": item.get("timestamp", ""),
                })
            return slack_items
        return []

    def normalize(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized = []
        for item in raw:
            normalized.append({
                "id": item["id"],
                "title": item["title"],
                "description": item.get("description", ""),
                "source": item["id"],
                "source_type": "slack",
                "priority": item.get("priority"),
                "deadline": item.get("deadline"),
                "owner": item.get("owner"),
                "status": item.get("status", "open"),
                "dependencies": item.get("dependencies", []),
                "blocks": item.get("blocks", []),
                "raw_text": item.get("raw_text", ""),
                "vp_escalation": False,
                "customer_facing": False,
            })
        return normalized

    async def health_check(self) -> bool:
        return self.connected

    def get_status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "connected": self.connected,
            "last_sync": self.last_sync,
            "error": self.error,
        }
