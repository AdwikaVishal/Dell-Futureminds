"""
core/models.py
Owner: Aditi (LLM & intelligence layer)

Shared data models for the TaskPilot pipeline.
Uses dataclasses for internal P2 typing, plus a unified Task dataclass that can be uniform accross the proj
that P3's agent.py, state.py, and P4's API client all consume.

Pipeline flow:
    SourceDocument -> [extractor.py] -> ExtractedTask
    ExtractedTask  -> [normalizer/dedup, P1] -> Task
    Task           -> [prioritizer.py] -> Task (with score + rationale filled)
    Task[]         -> [prioritizer.py] -> DailyPlan
    Task[] + msg   -> [qa.py]          -> QAResponse
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Raw Source Documents
# ---------------------------------------------------------------------------

@dataclass
class SourceDocument:
    """
    Raw source before extraction.
    Examples: email body, meeting transcript, Jira description, defect report.
    """
    source_id: str
    source_type: str
    raw_text: str
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Extracted Tasks (output of extractor.py)
# ---------------------------------------------------------------------------
#ExtractedTask is the output of extractor.py / build_extraction_prompt().Raw AI output pulled from the source
@dataclass
class ExtractedTask:
    """
    Output of extractor.py / build_extraction_prompt().
    Represents one action item pulled from unstructured text.
    """
    title: str
    owner: Optional[str]
    deadline: Optional[str]
    confidence: float
    source_sentence: str
    source_type: str
    source_id: str
    vp_escalation: bool = False
    customer_facing: bool = False


# ---------------------------------------------------------------------------
# Unified Task (shared across the project) (imp)
# ---------------------------------------------------------------------------

@dataclass
class Task:
    """
    Canonical task object used throughout the pipeline.
    """

    # Identity
    id: str
    title: str
    source: str
    source_type: str
    raw_text: Optional[str] = None

    # Prioritization inputs
    priority: str = "unknown"
    deadline: Optional[str] = None
    owner: Optional[str] = None
    status: str = "open"

    dependencies: list[str] = field(default_factory=list)
    blocks: list[str] = field(default_factory=list)

    # Extraction metadata
    confidence: Optional[float] = None
    source_sentence: Optional[str] = None
    vp_escalation: bool = False
    customer_facing: bool = False

    # Deduplication metadata
    dedup_group: Optional[str] = None
    merged_sources: list[str] = field(default_factory=list)

    # Prioritization outputs
    score: Optional[float] = None
    rationale: Optional[str] = None

    # Grounding outputs
    grounded: Optional[bool] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "source": self.source,
            "source_type": self.source_type,
            "priority": self.priority,
            "deadline": self.deadline,
            "owner": self.owner,
            "status": self.status,
            "dependencies": self.dependencies,
            "blocks": self.blocks,
            "vp_escalation": self.vp_escalation,
            "customer_facing": self.customer_facing,
            "merged_sources": self.merged_sources,
            "score": self.score,
            "rationale": self.rationale,
            "grounded": self.grounded,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Task":
        return cls(
            id=d["id"],
            title=d["title"],
            source=d.get("source", ""),
            source_type=d.get("source_type", "unknown"),
            raw_text=d.get("raw_text"),
            priority=d.get("priority", "unknown"),
            deadline=d.get("deadline"),
            owner=d.get("owner"),
            status=d.get("status", "open"),
            dependencies=d.get("dependencies", []),
            blocks=d.get("blocks", []),
            confidence=d.get("confidence"),
            source_sentence=d.get("source_sentence"),
            vp_escalation=d.get("vp_escalation", False),
            customer_facing=d.get("customer_facing", False),
            dedup_group=d.get("dedup_group"),
            merged_sources=d.get("merged_sources", []),
            score=d.get("score"),
            rationale=d.get("rationale"),
            grounded=d.get("grounded"),
        )


# ---------------------------------------------------------------------------
# Prioritization outputs
# ---------------------------------------------------------------------------

@dataclass
class ReprioritizationResult:
    new_rank: list[Task]
    change_summary: str


@dataclass
class DailyPlan:
    markdown: str


# ---------------------------------------------------------------------------
# QA / Chat
# ---------------------------------------------------------------------------

@dataclass
class QAResponse:
    answer: str
    citations: list[str]