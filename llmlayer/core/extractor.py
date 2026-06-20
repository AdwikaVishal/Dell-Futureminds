"""
core/extractor.py
Owner: Aditi (LLM & intelligence layer)

Runs EXTRACTION_PROMPT on unstructured sources (emails, meeting transcript).
Returns a list of Task objects ready for deduplication.

Key design decisions:
  - Processes emails in parallel (asyncio.gather) so 12 emails don't take
    12x the latency. The full pipeline must run under 60s (problem statement
    acceptance criterion), so parallelism here is load-bearing.
  - Confidence threshold (0.65 minimum): items below CONFIDENCE_THRESHOLD are silently
    dropped (newsletters, calendar invites, informational emails produce
    low-confidence spurious extractions we don't want in the task list).
  - VP/customer-facing flags are set here by keyword scanning the extracted
    title + source_sentence, so prioritizer.py can use them without
    re-reading raw email text.
  - source_sentence is always preserved verbatim from the LLM -- this is
    what P5's grounding.py fuzzy-matches to detect hallucinations.

Called by P3's agent.py as:
    from core.extractor import extract_from_emails, extract_from_transcript
    email_tasks   = await extract_from_emails(email_inbox: list[dict])
    meeting_tasks = await extract_from_transcript(transcript_text: str, meeting_id: str)
"""

from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any


from core.llm_clients import call_llm
from core.prompts import build_extraction_prompt
from core.models import ExtractedTask, Task

CONFIDENCE_THRESHOLD = 0.65  # drop extractions below this likely noise

# Keywords that flag VP / exec escalation for business_impact scoring
VP_ESCALATION_SIGNALS = [
    r"\bvp\b", r"\bvice\s+president\b", r"\bceo\b", r"\bcto\b",
    r"\bcoo\b", r"\bexec(utive)?\b", r"\bescalat", r"\bdirector\b",
    r"\bfinance\s+is\s+now\s+involved\b", r"\barr\b",
]

# Keywords that flag customer-facing impact
CUSTOMER_FACING_SIGNALS = [
    r"\bcustomer\b", r"\bclient\b", r"\benterprise\b", r"\bcheckout\b",
    r"\bpayment\b", r"\buser(s)?\b", r"\bexternal\b", r"\bpartner\b",
]


def _detect_flags(text: str) -> tuple[bool, bool]:
    """
    Scan combined (title + source_sentence) for VP escalation and
    customer-facing signals. Returns (vp_escalation, customer_facing).
    """
    lowered = text.lower()
    vp = any(re.search(p, lowered) for p in VP_ESCALATION_SIGNALS)
    cf = any(re.search(p, lowered) for p in CUSTOMER_FACING_SIGNALS)
    return vp, cf


def _parse_extracted_items(
    raw_items: list[dict[str, Any]],
    source_id: str,
    source_type: str,
    raw_source_text: str,
) -> list[Task]:
    """
    Convert raw LLM-extracted dicts into typed Task objects.
    Filters by confidence, sets metadata flags, generates IDs.
    """
    tasks: list[Task] = []
    for i, item in enumerate(raw_items):
        confidence = float(item.get("confidence", 0.0))
        if confidence < CONFIDENCE_THRESHOLD:
            continue  # drop noise (newsletters, calendar invites, etc.)

        title = str(item.get("title", "")).strip()
        if not title:
            continue

        source_sentence = str(item.get("source_sentence", "")).strip()
        owner = item.get("owner")  # None = inbox owner; named person = someone else

        vp_flag, cf_flag = _detect_flags(f"{title} {source_sentence}")

        # ID: source_id + index, e.g. EML-001-0, EML-001-1
        task_id = f"{source_id}-{i}"

        tasks.append(Task(
            id=task_id,
            title=title,
            source=source_id,
            source_type=source_type,
            raw_text=raw_source_text,
            priority="unknown",  # unstructured sources don't have explicit priority
            deadline=item.get("deadline"),
            owner=owner,
            status="open",
            confidence=confidence,
            source_sentence=source_sentence,
            vp_escalation=vp_flag,
            customer_facing=cf_flag,
        ))

    return tasks


async def _extract_single_email(email: dict[str, Any]) -> list[Task]:
    """
    Extract action items from one email. Called in parallel by extract_from_emails.
    """
    email_id = email.get("email_id", f"EML-{uuid.uuid4().hex[:6]}")
    body = email.get("body", "")
    subject = email.get("subject", "")
    sender = email.get("from_name", email.get("from", ""))

    # Include subject + sender in source text so the model can use
    # "VP Engineering" in the subject line as escalation signal.
    full_text = f"From: {sender}\nSubject: {subject}\n\n{body}"

    system, user_prompt = build_extraction_prompt(
        source_text=full_text,
        source_type="email",
        source_id=email_id,
    )

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.1,  # low temperature for factual extraction
    )

    raw_items = response.parsed_json if isinstance(response.parsed_json, list) else []

    return _parse_extracted_items(
        raw_items=raw_items,
        source_id=email_id,
        source_type="email",
        raw_source_text=full_text,
    )


async def extract_from_emails(email_inbox: list[dict[str, Any]]) -> list[Task]:
    """
    Extract action items from all emails in parallel.
    Returns a flat list of Task objects (one email may yield 0, 1, or many tasks).

    Called by P3's agent.py:
        email_tasks = await extract_from_emails(email_data["emails"])
    """
    results = await asyncio.gather(
        *[_extract_single_email(email) for email in email_inbox],
        return_exceptions=True,  # don't let one bad email crash the whole run
    )

    tasks: list[Task] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            # Log and continue -- a failed email extraction is not fatal
            print(f"[extractor] Warning: email {i} extraction failed: {result}")
        else:
            tasks.extend(result)

    return tasks


async def extract_from_transcript(
    transcript_text: str,
    meeting_id: str = "MEETING",
) -> list[Task]:
    """
    Extract action items from a meeting transcript.

    Called by P3's agent.py:
        meeting_tasks = await extract_from_transcript(
            transcript_data["transcript"], transcript_data["meeting_id"]
        )
    """
    system, user_prompt = build_extraction_prompt(
        source_text=transcript_text,
        source_type="meeting transcript",
        source_id=meeting_id,
    )

    response = await call_llm(
        prompt=user_prompt,
        system=system,
        json_mode=True,
        temperature=0.1,
    )

    raw_items = response.parsed_json if isinstance(response.parsed_json, list) else []

    return _parse_extracted_items(
        raw_items=raw_items,
        source_id=meeting_id,
        source_type="transcript",
        raw_source_text=transcript_text,
    )


# ---------------------------------------------------------------------------
# Quick smoke test: python core/extractor.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json, sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


    
    import core.extractor as extractor_module

    async def _test():
        with open("mock_data/email_inbox.json") as f:
            inbox = json.load(f)["emails"]
        with open("mock_data/meeting_transcript.txt") as f:
            transcript_data = json.load(f)

        email_tasks = await extract_from_emails(inbox)
        meeting_tasks = await extract_from_transcript(
            transcript_data["transcript"], transcript_data["meeting_id"]
        )

        all_tasks = email_tasks + meeting_tasks
        print(f"\n=== Extracted {len(all_tasks)} tasks ===\n")
        for t in all_tasks:
            vp = " [VP ESCALATION]" if t.vp_escalation else ""
            cf = " [CUSTOMER-FACING]" if t.customer_facing else ""
            print(f"  [{t.id}] ({t.confidence:.2f}) {t.title}{vp}{cf}")
            if t.owner:
                print(f"           Owner: {t.owner}")

    asyncio.run(_test())