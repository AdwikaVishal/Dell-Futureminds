import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def _load_json(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


def load_jira() -> list[dict]:
    return _load_json("jira_tasks.json")


def load_defects() -> list[dict]:
    return _load_json("defect_tracker.json")


def load_emails() -> list[dict]:
    return _load_json("emails.json")


def load_transcript() -> str:
    path = os.path.join(DATA_DIR, "transcript.json")
    if not os.path.exists(path):
        return ""
    with open(path) as f:
        data = json.load(f)
    return data.get("transcript", "")
