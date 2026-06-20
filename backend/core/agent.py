import asyncio
import logging
import time
from datetime import datetime
from typing import Optional

from models.task import Task, RankedTask, DailyPlan, InjectRequest, Alert
from core.state import store, save_state, load_state, save_trace
from core.alert_engine import check_alerts

from core.data_loader import load_jira, load_defects, load_emails, load_transcript
from core.normalizer import normalize_all
from core.deduplicator import deduplicate
from core.extractor import extract_from_emails, extract_from_transcript
from core.prioritizer import prioritize, reprioritize, build_daily_plan_from_tasks
from core.tracer import trace
from core.grounding import verify_grounding
from core.qa import answer_question as qa_answer_question

logger = logging.getLogger(__name__)

HAS_WEEKLY_SUMMARY = True


@trace("pipeline")
async def run_pipeline() -> DailyPlan:
    start_time = time.monotonic()
    logger.info("=== Pipeline run started ===")

    try:
        @trace("ingest")
        async def ingest():
            jira, defects, emails, transcript = await asyncio.gather(
                asyncio.to_thread(load_jira),
                asyncio.to_thread(load_defects),
                asyncio.to_thread(load_emails),
                asyncio.to_thread(load_transcript),
            )
            return jira, defects, emails, transcript

        jira, defects, emails, transcript = await ingest()
        logger.info("Ingested %d jira, %d defects, %d emails, %d transcript chars",
                     len(jira), len(defects), len(emails), len(transcript))
    except Exception as e:
        logger.error("Step 1 (ingest) failed: %s — aborting pipeline", e)
        raise

    try:
        @trace("normalize")
        async def normalize():
            return await asyncio.to_thread(normalize_all, jira, defects, emails)

        normalized_tasks = await normalize()
        logger.info("Normalized %d tasks", len(normalized_tasks))
    except Exception as e:
        logger.error("Step 2 (normalize) failed: %s", e)
        normalized_tasks = []

    try:
        @trace("extract")
        async def extract():
            extract_tasks = []
            email_results = await extract_from_emails(emails)
            extract_tasks.extend(email_results)
            if transcript:
                transcript_result = await extract_from_transcript(transcript, "transcript_001")
                extract_tasks.extend(transcript_result)
            return extract_tasks

        extracted_tasks = await extract()
        logger.info("Extracted %d action items", len(extracted_tasks))
    except Exception as e:
        logger.error("Step 3 (extract) failed: %s — continuing without extracted items", e)
        extracted_tasks = []

    try:
        merged_tasks = normalized_tasks + extracted_tasks
        logger.info("Merged task count: %d", len(merged_tasks))
    except Exception as e:
        logger.error("Step 4 (merge) failed: %s", e)
        merged_tasks = normalized_tasks

    try:
        @trace("deduplicate")
        async def dedup():
            return await asyncio.to_thread(deduplicate, merged_tasks)

        deduped_tasks = await dedup()
        logger.info("After dedup: %d tasks", len(deduped_tasks))
    except Exception as e:
        logger.error("Step 5 (deduplicate) failed: %s — using merged list", e)
        deduped_tasks = merged_tasks

    try:
        @trace("ground")
        async def ground():
            source_texts = {}
            for e in emails:
                source_texts[e.get("id", e.get("email_id", ""))] = e.get("body", "")
            source_texts["transcript_001"] = transcript or ""
            for t in deduped_tasks:
                result = await asyncio.to_thread(verify_grounding, t, source_texts)
                t.grounded = result.get("grounded", True)
                t.grounding_confidence = result.get("confidence", 0.95)
            return deduped_tasks

        grounded_tasks = await ground()
        grounded_count = sum(1 for t in grounded_tasks if t.grounded)
        logger.info("Grounded %d/%d tasks", grounded_count, len(grounded_tasks))
    except Exception as e:
        logger.error("Step 6 (ground) failed: %s — continuing without grounding", e)
        grounded_tasks = deduped_tasks

    try:
        @trace("prioritize")
        async def prioritize_step():
            return await prioritize(grounded_tasks)

        ranked_tasks = await prioritize_step()
        logger.info("Prioritized %d tasks", len(ranked_tasks))
    except Exception as e:
        logger.error("Step 7 (prioritize) failed: %s", e)
        ranked_tasks = [RankedTask(**t.model_dump(exclude={'rank', 'score', 'rationale'}), score=50.0, rationale="Fallback ranking.") for i, t in enumerate(grounded_tasks)]

    try:
        @trace("alerts")
        async def alerts():
            return check_alerts(ranked_tasks)

        alerts_list = await alerts()
        logger.info("Generated %d alerts", len(alerts_list))
    except Exception as e:
        logger.error("Step 9 (alerts) failed: %s — continuing", e)
        alerts_list = []

    plan = build_daily_plan_from_tasks(ranked_tasks, alerts_list)

    store.update(ranked_tasks, plan)
    save_state(ranked_tasks, plan)
    save_trace("pipeline_total", (time.monotonic() - start_time) * 1000)

    elapsed = time.monotonic() - start_time
    logger.info("=== Pipeline finished in %.2fs ===", elapsed)
    if elapsed > 60:
        logger.warning("Pipeline exceeded 60s target (%.2fs)", elapsed)

    return plan


async def reprioritize_with_injection(new_task_data: InjectRequest) -> DailyPlan:
    start_time = time.monotonic()
    logger.info("=== Reprioritize with injection started ===")

    if store.current_plan is None:
        raise RuntimeError("No existing plan to reprioritize — run refresh first")

    try:
        new_task = Task(
            id=f"injected_{int(time.time())}",
            title=new_task_data.title,
            description=new_task_data.description or "",
            source="injected",
            source_type=new_task_data.source_type or "injected",
            priority=new_task_data.priority,
            deadline=new_task_data.deadline,
            owner=new_task_data.owner,
            status="open",
            dependencies=[],
            raw_text=new_task_data.title + " " + (new_task_data.description or ""),
            grounded=True,
            grounding_confidence=1.0,
        )
        logger.info("Injected task: %s (%s)", new_task.id, new_task.title)

        result = await asyncio.to_thread(verify_grounding, new_task, {})
        new_task.grounded = result.get("grounded", True)
        new_task.grounding_confidence = result.get("confidence", 0.95)

        updated_ranked, change_summary = await reprioritize(store.current_tasks, new_task)

        alerts_list = check_alerts(updated_ranked)
        new_plan = build_daily_plan_from_tasks(updated_ranked, alerts_list)

        store.update(updated_ranked, new_plan)
        save_state(updated_ranked, new_plan)

        elapsed = time.monotonic() - start_time
        logger.info("=== Reprioritize finished in %.2fs ===", elapsed)
        if elapsed > 15:
            logger.warning("Reprioritize exceeded 15s target (%.2fs)", elapsed)

        return new_plan
    except Exception as e:
        logger.error("Reprioritize failed: %s", e)
        raise


async def answer_question(question: str, tasks: list[RankedTask], context: dict) -> str:
    result = await qa_answer_question(tasks, question, context.get("chat_history"))
    return result.answer
