import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from models.task import Task, DailyPlan


DB_DIR = Path(__file__).resolve().parent.parent / "db"
DB_PATH = str(DB_DIR / "taskpilot.db")
SCHEMA_PATH = str(DB_DIR / "schema.sql")


class StateStore:
    def __init__(self):
        self._lock = threading.Lock()
        self.current_tasks: list[Task] = []
        self.current_plan: Optional[DailyPlan] = None
        self.chat_history: list[dict] = []
        self.last_run_timestamp: Optional[str] = None

    def update(self, tasks: list[Task], plan: Optional[DailyPlan] = None):
        with self._lock:
            self.current_tasks = tasks
            self.current_plan = plan
            self.last_run_timestamp = datetime.now(timezone.utc).isoformat()

    def add_chat_entry(self, question: str, answer: str, referenced_ids: list[str]):
        with self._lock:
            entry = {
                "question": question,
                "answer": answer,
                "referenced_task_ids": referenced_ids,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.chat_history.append(entry)

    def get_state_summary(self) -> dict:
        with self._lock:
            return {
                "task_count": len(self.current_tasks),
                "has_plan": self.current_plan is not None,
                "chat_history_count": len(self.chat_history),
                "last_run": self.last_run_timestamp,
            }


store = StateStore()


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = _get_db()
    conn.executescript(open(SCHEMA_PATH).read())
    conn.commit()
    conn.close()


def _ensure_db():
    """Auto-init database if the file doesn't exist yet."""
    if not DB_DIR.exists() or not os.path.exists(DB_PATH):
        init_db()


def save_state(tasks: list[Task], plan: Optional[DailyPlan] = None, status: str = "ok"):
    _ensure_db()
    conn = _get_db()
    tasks_json = json.dumps([t.model_dump(mode="json") for t in tasks], default=str)
    plan_json = json.dumps(plan.model_dump(mode="json"), default=str) if plan else None
    conn.execute(
        "INSERT INTO runs (timestamp, tasks_json, plan_json, pipeline_status) VALUES (?, ?, ?, ?)",
        (datetime.now(timezone.utc).isoformat(), tasks_json, plan_json, status),
    )
    conn.commit()
    conn.close()


def load_state() -> tuple[list[Task], Optional[DailyPlan]]:
    _ensure_db()
    conn = _get_db()
    row = conn.execute(
        "SELECT tasks_json, plan_json FROM runs ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if row is None:
        return [], None
    tasks = [Task(**t) for t in json.loads(row["tasks_json"])]
    plan = DailyPlan(**json.loads(row["plan_json"])) if row["plan_json"] else None
    return tasks, plan


def save_chat_log(question: str, answer: str, referenced_ids: list[str]):
    _ensure_db()
    conn = _get_db()
    conn.execute(
        "INSERT INTO chat_log (timestamp, question, answer, referenced_task_ids) VALUES (?, ?, ?, ?)",
        (datetime.now(timezone.utc).isoformat(), question, answer, ",".join(referenced_ids)),
    )
    conn.commit()
    conn.close()


def save_trace(step_name: str, duration_ms: float, tokens_used: int = 0, status: str = "ok"):
    try:
        _ensure_db()
        conn = _get_db()
        conn.execute(
            "INSERT INTO traces (timestamp, step_name, duration_ms, tokens_used, status) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), step_name, duration_ms, tokens_used, status),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logging.getLogger(__name__).warning("Failed to save trace: %s", e)


def get_recent_traces(limit: int = 50) -> list[dict]:
    try:
        _ensure_db()
        conn = _get_db()
        rows = conn.execute(
            "SELECT * FROM traces ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []
