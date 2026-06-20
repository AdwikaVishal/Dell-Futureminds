import json
import os
from datetime import datetime, timezone
from typing import Any

from core.connectors.base import SourceConnector

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


class TranscriptConnector(SourceConnector):
    name = "Meeting Transcripts"

    async def connect(self) -> bool:
        self.connected = True
        self.last_sync = datetime.now(timezone.utc).isoformat()
        return True

    async def fetch_tasks(self) -> list[dict[str, Any]]:
        path = os.path.join(DATA_DIR, "transcript.json")
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            transcript_text = data.get("transcript", "")
            return [{
                "id": data.get("meeting_id", "MEETING-001"),
                "title": data.get("title", "Meeting Transcript"),
                "description": transcript_text[:300],
                "source": data.get("meeting_id", "MEETING-001"),
                "source_type": "transcript",
                "priority": None,
                "deadline": None,
                "owner": None,
                "status": "open",
                "dependencies": [],
                "blocks": [],
                "raw_text": transcript_text,
                "meeting_date": data.get("date", ""),
                "participants": data.get("participants", []),
            }]
        return []

    def normalize(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized = []
        for item in raw:
            normalized.append({
                "id": item["id"],
                "title": item["title"],
                "description": item.get("description", ""),
                "source": item["id"],
                "source_type": "transcript",
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
