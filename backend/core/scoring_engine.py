from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from dateutil import parser as dateparser

from models.task import Task, RankedTask

logger = logging.getLogger(__name__)


class DeterministicScoringEngine:

    WEIGHTS = {
        "severity": 0.25,
        "deadline_urgency": 0.20,
        "business_impact": 0.20,
        "dependency_impact": 0.15,
        "customer_impact": 0.10,
        "escalation_weight": 0.05,
        "team_blocking_weight": 0.05,
    }

    @classmethod
    def compute_score(cls, task: Task, all_tasks: list[Task] | None = None) -> tuple[float, dict[str, float]]:
        breakdown: dict[str, float] = {}

        breakdown["severity"] = cls._severity_score(task.priority)
        breakdown["deadline_urgency"] = cls._deadline_urgency(task.deadline)
        breakdown["business_impact"] = cls._business_impact(task.vp_escalation, task.customer_facing)
        breakdown["dependency_impact"] = cls._dependency_impact(task, all_tasks or [])
        breakdown["customer_impact"] = cls._customer_impact(task)
        breakdown["escalation_weight"] = 100.0 if task.vp_escalation else 0.0
        breakdown["team_blocking_weight"] = cls._team_blocking_weight(task, all_tasks or [])

        score = sum(
            breakdown[k] * cls.WEIGHTS[k]
            for k in cls.WEIGHTS
            if k in breakdown
        )

        return round(score, 1), breakdown

    @staticmethod
    def _severity_score(priority: str | None) -> float:
        return {"P0": 100, "P1": 75, "P2": 50, "P3": 25}.get(priority or "", 25)

    @staticmethod
    def _deadline_urgency(deadline: str | None) -> float:
        if not deadline:
            return 30.0
        try:
            dt = dateparser.parse(deadline)
            if dt is None:
                return 30.0
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            diff_hours = (dt - now).total_seconds() / 3600
            if diff_hours <= 0:
                return 100.0
            if diff_hours <= 24:
                return 100.0 - (diff_hours / 24) * 20
            diff_days = diff_hours / 24
            if diff_days >= 14:
                return 0.0
            return 100.0 * (1 - diff_days / 14)
        except (ValueError, TypeError):
            return 30.0

    @staticmethod
    def _business_impact(vp_escalation: bool, customer_facing: bool) -> float:
        if vp_escalation:
            return 100.0
        if customer_facing:
            return 70.0
        return 40.0

    @staticmethod
    def _dependency_impact(task: Task, all_tasks: list[Task]) -> float:
        if not task.blocks:
            return 0.0
        blocking_count = len(task.blocks)
        transitive_blocked = set()
        for t in all_tasks:
            if t.id != task.id:
                if any(dep in (task.blocks or []) for dep in (t.dependencies or [])):
                    transitive_blocked.add(t.id)
        total_blocked = blocking_count + len(transitive_blocked)
        if total_blocked >= 3:
            return 100.0
        if total_blocked == 2:
            return 80.0
        if total_blocked == 1:
            return 60.0
        return 0.0

    @staticmethod
    def _customer_impact(task: Task) -> float:
        if task.customer_facing:
            return 80.0
        if task.vp_escalation:
            return 60.0
        return 20.0

    @staticmethod
    def _team_blocking_weight(task: Task, all_tasks: list[Task]) -> float:
        blocked_by_this = [t for t in all_tasks if task.id in (t.dependencies or [])]
        if len(blocked_by_this) >= 3:
            return 100.0
        if len(blocked_by_this) == 2:
            return 75.0
        if len(blocked_by_this) == 1:
            return 50.0
        return 0.0
    @classmethod
    def generate_rationale(cls, task: Task, score: float, breakdown: dict[str, float]) -> str:
        labels = {
        "severity":             "severity",
        "deadline_urgency":     "deadline urgency",
        "business_impact":      "business impact",
        "dependency_impact":    "dependency impact",
        "customer_impact":      "customer impact",
        "escalation_weight":    "VP escalation",
        "team_blocking_weight": "blocking teammates",
    }
        priority_phrases = {
        "P0": "Critical priority", "P1": "High priority",
        "P2": "Medium priority",   "P3": "Low priority",
    }
        priority_text = priority_phrases.get(task.priority or "", "Task")

        top_drivers = [
            labels[k] for k, v in
            sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
            if v > 0 and k in labels
        ][:2]

        parts = []
        if task.vp_escalation:
            parts.append("VP escalation detected")
        if breakdown.get("deadline_urgency", 0) >= 80:
            parts.append("SLA expiring soon")
        elif breakdown.get("deadline_urgency", 0) >= 50:
            parts.append("deadline approaching")
        if task.customer_facing:
            parts.append("customer-facing impact")
        if not parts and top_drivers:
            parts = top_drivers

        reason = ", ".join(parts) if parts else "multi-factor score"
        return f"{priority_text} — {reason}. Score: {score:.0f}/100."

    
    @classmethod
    def score_tasks(cls, tasks: list[Task]) -> list[RankedTask]:
        if not tasks:
            return []

        ranked: list[RankedTask] = []
        for task in tasks:
            score, breakdown = cls.compute_score(task, tasks)
            ranked.append(RankedTask(
                **task.model_dump(exclude={'rank', 'score', 'rationale', 'score_breakdown'}),
                score=score,
                score_breakdown=breakdown,
                rationale=cls.generate_rationale(task, score, breakdown),
            ))

        ranked.sort(key=lambda t: t.score, reverse=True)
        for i, t in enumerate(ranked):
            t.rank = i + 1

        return ranked
