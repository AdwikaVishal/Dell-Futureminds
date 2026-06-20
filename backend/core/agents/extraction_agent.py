import logging
from typing import Any

from core.agents.base import BaseAgent
from core.extractor import extract_from_emails, extract_from_transcript

logger = logging.getLogger(__name__)


class ExtractionAgent(BaseAgent):
    name = "extraction"

    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        extracted_tasks = []

        emails = context.get("emails", [])
        if emails:
            try:
                email_tasks = await extract_from_emails(emails)
                extracted_tasks.extend(email_tasks)
                logger.info("Extracted %d tasks from emails", len(email_tasks))
            except Exception as e:
                logger.error("Email extraction failed: %s", e)

        transcript_list = context.get("transcript", [])
        if transcript_list:
            transcript_text = transcript_list[0].get("raw_text", "") if isinstance(transcript_list, list) else ""
            if transcript_text:
                try:
                    transcript_tasks = await extract_from_transcript(transcript_text, "transcript_001")
                    extracted_tasks.extend(transcript_tasks)
                    logger.info("Extracted %d tasks from transcript", len(transcript_tasks))
                except Exception as e:
                    logger.error("Transcript extraction failed: %s", e)

        return {"extracted_tasks": extracted_tasks}
