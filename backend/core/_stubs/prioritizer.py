import asyncio
from datetime import datetime, timedelta, timezone
from models.task import Task, RankedTask, DailyPlan, Alert

_FAR_FUTURE = datetime(9999, 12, 31, tzinfo=timezone.utc)


def _safe_deadline(dt):
    if dt is None:
        return _FAR_FUTURE
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def prioritize(tasks: list[Task]) -> list[RankedTask]:
    await asyncio.sleep(0.3)
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3, None: 4}
    scored: list[RankedTask] = []
    for i, t in enumerate(sorted(tasks, key=lambda x: (
        priority_order.get(x.priority, 4),
        _safe_deadline(x.deadline),
    ))):
        scored.append(RankedTask(
            **t.model_dump(),
            rank=i + 1,
            score=max(10, 95 - i * 6),
            score_breakdown={
                "deadline_urgency": 80 if t.deadline else 20,
                "severity": 90 if t.priority in ("P0", "P1") else 50,
                "business_impact": 70,
            },
            rationale=f"[STUB] Ranked #{i+1} — priority={t.priority}, deadline_urgency={'high' if t.deadline else 'none'}."
        ))
    return scored


async def generate_daily_plan(ranked_tasks: list[RankedTask]) -> DailyPlan:
    await asyncio.sleep(0.2)
    now = datetime.utcnow()
    top = sorted([t for t in ranked_tasks if t.rank <= 3], key=lambda x: x.rank)
    do_next = sorted([t for t in ranked_tasks if 4 <= t.rank <= 6], key=lambda x: x.rank)
    blocked = sorted([t for t in ranked_tasks if t.status == "blocked"], key=lambda x: x.rank)
    deferred = sorted([t for t in ranked_tasks if t.rank > 6 and t.status != "blocked"], key=lambda x: x.rank)
    return DailyPlan(
        generated_at=now,
        top_priorities=top,
        do_next=do_next,
        deferred=deferred,
        blocked=blocked,
        alerts=[
            Alert(severity="info", message=f"[STUB] Plan generated with {len(ranked_tasks)} tasks."),
        ],
    )


async def reprioritize(existing_plan: DailyPlan, new_task: Task) -> DailyPlan:
    await asyncio.sleep(0.2)
    all_tasks = existing_plan.top_priorities + existing_plan.do_next + existing_plan.deferred + existing_plan.blocked
    all_tasks_flat = [RankedTask(**t.model_dump(exclude={"rank", "score", "score_breakdown", "rationale"}), rank=0, score=0, rationale="") for t in all_tasks]
    rt = RankedTask(
        **new_task.model_dump(),
        rank=0,
        score=0,
        rationale="[STUB] Injected task — high urgency.",
    )
    all_tasks_flat.append(rt)
    # Re-prioritize: injected task always goes to rank 1 in stub
    for i, t in enumerate(sorted(all_tasks_flat, key=lambda x: (0 if x.id == rt.id else 1, x.title))):
        t.rank = i + 1
        t.score = max(10, 95 - i * 6)
        t.rationale = f"[STUB] Re-ranked #{t.rank} after injection."
    return await generate_daily_plan(all_tasks_flat)


async def answer_question(question: str, tasks: list[RankedTask], context: dict) -> str:
    await asyncio.sleep(0.3)
    summary = f"[STUB] I found {len(tasks)} tasks in your plan. "
    if "block" in question.lower():
        blocked = [t for t in tasks if t.status == "blocked"]
        summary += f"You have {len(blocked)} blocked tasks. "
    if "priority" in question.lower() or "p0" in question.lower():
        p0 = [t for t in tasks if t.priority == "P0"]
        summary += f"There are {len(p0)} P0 items requiring immediate attention. "
    if not summary:
        summary += f"Your top task is '{tasks[0].title}' with a score of {tasks[0].score:.1f}."
    return summary
