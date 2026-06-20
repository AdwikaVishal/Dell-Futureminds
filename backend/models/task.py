from pydantic import BaseModel
from typing import Optional, Literal, Any
from datetime import datetime


class Task(BaseModel):
    id: str
    title: str
    description: str = ""
    source: str
    source_type: Literal["jira", "defect", "email", "transcript", "injected", "servicenow", "github", "slack"]
    priority: Optional[Literal["P0", "P1", "P2", "P3"]] = None
    deadline: Optional[str] = None
    owner: Optional[str] = None
    status: Literal["open", "in_progress", "blocked", "done"] = "open"
    dependencies: list[str] = []
    blocks: list[str] = []
    raw_text: str = ""
    merged_from: list[str] = []
    merged_sources: list[str] = []
    grounded: Optional[bool] = None
    grounding_confidence: Optional[float] = None
    confidence: Optional[float] = None
    source_sentence: Optional[str] = None
    vp_escalation: bool = False
    customer_facing: bool = False
    dedup_group: Optional[str] = None


class RankedTask(Task):
    rank: int = 0
    score: float = 0.0
    score_breakdown: dict[str, float] = {}
    rationale: str = ""


class Alert(BaseModel):
    severity: Literal["info", "warning", "critical"]
    message: str
    task_id: Optional[str] = None


class DailyPlan(BaseModel):
    generated_at: str = ""
    top_priorities: list[RankedTask] = []
    do_next: list[RankedTask] = []
    deferred: list[RankedTask] = []
    blocked: list[RankedTask] = []
    alerts: list[Alert] = []


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    referenced_task_ids: list[str] = []


class InjectRequest(BaseModel):
    title: str
    description: str = ""
    source_type: Literal["jira", "defect", "email", "transcript", "injected", "servicenow", "github", "slack"] = "injected"
    priority: Optional[Literal["P0", "P1", "P2", "P3"]] = None
    deadline: Optional[str] = None
    owner: Optional[str] = None
