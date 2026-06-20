"""End-to-end integration test for the full TaskPilot pipeline.

Tests the complete chain:
  Connector → Normalizer → Deduplicator → Grounding → Ranking → Daily Plan → API

Run with:  pytest tests/test_e2e_integration.py -v
"""

import json
import os
import time
import pytest
from datetime import datetime, timezone, timedelta

from models.task import Task, RankedTask, DailyPlan, InjectRequest

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


@pytest.fixture(autouse=True)
def ensure_data():
    assert os.path.exists(os.path.join(DATA_DIR, "jira_tasks.json")), "Missing jira_tasks.json"
    assert os.path.exists(os.path.join(DATA_DIR, "defect_tracker.json")), "Missing defect_tracker.json"
    assert os.path.exists(os.path.join(DATA_DIR, "emails.json")), "Missing emails.json"
    assert os.path.exists(os.path.join(DATA_DIR, "transcript.json")), "Missing transcript.json"


def test_connector_jira():
    from core.connectors.jira_connector import JiraConnector
    import asyncio

    connector = JiraConnector()
    connected = asyncio.run(connector.connect())
    assert connected
    assert connector.connected
    assert connector.last_sync is not None

    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "jira" for t in tasks)
    assert all("id" in t and "title" in t for t in tasks)

    normalized = connector.normalize(tasks)
    assert len(normalized) == len(tasks)
    assert all(n["source_type"] == "jira" for n in normalized)

    healthy = asyncio.run(connector.health_check())
    assert healthy

    status = connector.get_status()
    assert status["name"] == "Jira"
    assert status["connected"]


def test_connector_github():
    from core.connectors.github_connector import GitHubConnector
    import asyncio

    connector = GitHubConnector()
    asyncio.run(connector.connect())
    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "github" for t in tasks)


def test_connector_slack():
    from core.connectors.slack_connector import SlackConnector
    import asyncio

    connector = SlackConnector()
    asyncio.run(connector.connect())
    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "slack" for t in tasks)


def test_connector_outlook():
    from core.connectors.outlook_connector import OutlookConnector
    import asyncio

    connector = OutlookConnector()
    asyncio.run(connector.connect())
    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "email" for t in tasks)


def test_connector_servicenow():
    from core.connectors.servicenow_connector import ServiceNowConnector
    import asyncio

    connector = ServiceNowConnector()
    asyncio.run(connector.connect())
    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "servicenow" for t in tasks)


def test_connector_transcript():
    from core.connectors.transcript_connector import TranscriptConnector
    import asyncio

    connector = TranscriptConnector()
    asyncio.run(connector.connect())
    tasks = asyncio.run(connector.fetch_tasks())
    assert len(tasks) > 0
    assert all(t["source_type"] == "transcript" for t in tasks)


def test_normalizer_creates_tasks():
    from core.normalizer import normalize_all

    jira = [{"id": "J-1", "title": "Test jira", "priority": "P1", "status": "open"}]
    defects = [{"id": "D-1", "title": "Test defect", "priority": "P2", "status": "open"}]
    emails = [{"id": "E-1", "subject": "Test email", "body": "Body text"}]

    tasks = normalize_all(jira, defects, emails)
    assert len(tasks) == 3
    assert all(isinstance(t, Task) for t in tasks)
    assert tasks[0].source_type == "jira"
    assert tasks[1].source_type == "defect"
    assert tasks[2].source_type == "email"


def test_deduplicator_merges_duplicates():
    from core.deduplicator import deduplicate

    tasks = [
        Task(id="T1", title="Fix login bug on Safari browser", source="T1", source_type="jira", raw_text="Fix login bug on Safari"),
        Task(id="T2", title="Fix login bug on Safari", source="T2", source_type="email", raw_text="The login bug on Safari needs fixing"),
        Task(id="T3", title="Build the main dashboard", source="T3", source_type="jira"),
    ]
    result = deduplicate(tasks)
    assert len(result) <= 2, "Similar tasks should be merged"
    merged = [t for t in result if len(t.merged_sources) > 0]
    assert len(merged) > 0, "Deduplication should produce merged tasks"


def test_grounding_verification():
    from core.grounding import verify_grounding

    task = Task(id="T1", title="Fix login bug", source="T1", source_type="jira",
                raw_text="Fix login bug on Safari browser")
    source_texts = {
        "email_1": "We need to fix the login bug on Safari browser ASAP",
    }
    result = verify_grounding(task, source_texts)
    assert result["grounded"] is True
    assert result["confidence"] > 0.5
    assert len(result["source_snippet"]) > 0


def test_tracer_decorator():
    from core.tracer import trace

    call_count = 0

    @trace("test_step")
    def sync_fn():
        nonlocal call_count
        call_count += 1
        return "ok"

    result = sync_fn()
    assert result == "ok"
    assert call_count == 1


def test_alert_engine_e2e():
    from core.alert_engine import check_alerts

    now = datetime.now(timezone.utc)
    tasks = [
        Task(id="T1", title="Urgent P0 deadline", source="T1", source_type="jira",
             priority="P0", deadline=(now + timedelta(hours=2)).isoformat(),
             status="open", owner="alice"),
        Task(id="T2", title="Unassigned P1", source="T2", source_type="defect",
             priority="P1", deadline=None, status="open", owner=None),
        Task(id="T3", title="Overdue task", source="T3", source_type="email",
             priority="P2", deadline=(now - timedelta(hours=4)).isoformat(),
             status="open", owner="bob"),
    ]
    alerts = check_alerts(tasks)
    assert len(alerts) > 0
    severities = [a.severity for a in alerts]
    assert "critical" in severities
    assert any("deadline" in a.message.lower() or "past" in a.message.lower() for a in alerts)


@pytest.mark.asyncio
async def test_weekly_summary_generates():
    from core.weekly_summary import generate_weekly_summary

    plans = [{
        "date": datetime.now(timezone.utc).isoformat(),
        "top_3": [{"id": "T1", "title": "Fix auth bug", "status": "open"}],
        "completed": [],
        "deferred": [],
        "blockers": [],
    }]
    summary = await generate_weekly_summary(plans)
    assert isinstance(summary, str)
    assert len(summary) > 0
    assert "## Accomplished" in summary or "T1" in summary or "No" in summary


def test_full_pipeline_plan_shape():
    from core.alert_engine import check_alerts
    from core.prioritizer import build_daily_plan_from_tasks, _build_ranked_list
    from datetime import datetime, timezone

    tasks = [
        RankedTask(id="R1", title="Top priority task", source="R1", source_type="jira",
                   priority="P0", deadline=(datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
                   status="open", owner="alice", rank=1, score=95.0, rationale="Highest urgency"),
        RankedTask(id="R2", title="Second task", source="R2", source_type="email",
                   priority="P2", deadline=None, status="open", rank=2, score=60.0, rationale="Medium"),
        RankedTask(id="R3", title="Blocked task", source="R3", source_type="defect",
                   priority="P1", deadline=None, status="blocked", rank=3, score=50.0,
                   rationale="Blocked by external deps"),
    ]

    alerts = check_alerts(tasks)
    plan = build_daily_plan_from_tasks(tasks, alerts)

    assert isinstance(plan, DailyPlan)
    assert plan.generated_at is not None
    assert len(plan.top_priorities) > 0
    assert plan.top_priorities[0].id == "R1"
    assert plan.top_priorities[0].score == 95.0
    assert plan.top_priorities[0].rationale


def test_priority_p0_no_owner_alert():
    from core.alert_engine import check_alerts

    tasks = [
        Task(id="T1", title="P0 no owner", source="T1", source_type="jira",
             priority="P0", deadline=None, status="open", owner=None),
    ]
    alerts = check_alerts(tasks)
    assert any("unassigned" in a.message.lower() for a in alerts if a.severity == "critical")


def test_injected_task_matches_inject_request_schema():
    req = InjectRequest(
        title="New critical task",
        description="Fix production issue",
        source_type="injected",
        priority="P0",
        deadline=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        owner="alice",
    )
    assert req.title == "New critical task"
    assert req.source_type == "injected"
    assert req.priority == "P0"


def test_ranked_task_extends_task():
    task = Task(id="T1", title="Base task", source="T1", source_type="jira")
    ranked = RankedTask(**task.model_dump(), rank=1, score=85.0, rationale="Test")
    assert ranked.id == "T1"
    assert ranked.rank == 1
    assert ranked.score == 85.0
    assert ranked.rationale == "Test"
    assert isinstance(ranked, Task)
