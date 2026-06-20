#to ensure that extractor and prioritizer are smoothly working together

import asyncio
import json

from core.extractor import (
    extract_from_emails,
    extract_from_transcript
)
#getting the data from extractor
from core.prioritizer import (
    prioritize,
    get_daily_plan
)
#working on the extracted data

async def main():

    print("\n========== LOADING MOCK DATA ==========\n")

    with open("mock_data/email_inbox.json", "r", encoding="utf-8") as f:
        emails = json.load(f)["emails"]

   
    with open("mock_data/meeting_transcript.txt", "r", encoding="utf-8") as f:
        transcript = f.read()

    print(f"Emails loaded: {len(emails)}")

    print("\n========== EXTRACTION ==========\n")

    email_tasks = await extract_from_emails(emails)

    transcript_tasks = await extract_from_transcript(
        transcript,
        meeting_id="STANDUP-2026-06-17"
    )

    all_tasks = email_tasks + transcript_tasks

    print(f"Extracted {len(all_tasks)} tasks\n")

    for task in all_tasks:
        print(f"[{task.id}] {task.title}")

    print("\n========== PRIORITIZATION ==========\n")

    ranked_tasks = await prioritize(all_tasks)

    for i, task in enumerate(ranked_tasks, start=1):

        print(
            f"#{i} "
            f"[{task.score}] "
            f"{task.title}"
        )

        print(f"Reason: {task.rationale}")
        print()

    print("\n========== DAILY PLAN ==========\n")

    daily_plan = await get_daily_plan(ranked_tasks)

    print(daily_plan)


if __name__ == "__main__":
    asyncio.run(main())