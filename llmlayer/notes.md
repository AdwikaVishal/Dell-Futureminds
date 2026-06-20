# Notes


##  Goal

Build the intelligence layer for TaskPilot AI.

Responsibilities:

* Extract tasks from emails and transcripts
* Prioritize tasks
* Generate daily plans
* Answer user questions
* Explain ranking decisions

---
## LLM/Intelligence layer Workflow
# P2 Workflow – AI Intelligence Layer

## My Responsibility

Build the intelligence layer that:

1. Extracts tasks from emails/transcripts
2. Prioritizes tasks
3. Generates daily plans
4. Answers user questions
5. Supports dynamic reprioritization

---

# Current Architecture

mock_data
↓
extractor.py
↓
ExtractedTask
↓
P1 Normalizer/Deduplicator
↓
Task (Canonical Task Model)
↓
prioritizer.py
↓
Scored Tasks
↓
daily_plan.py
↓
Daily Work Plan

---

# Files and Responsibilities

## prompts.py

Purpose:
Contains all LLM prompts.

Functions:

* build_extraction_prompt()
* build_prioritization_prompt()
* build_daily_plan_prompt()
* build_reprioritize_prompt()
* build_qa_prompt()

Input:
Raw project data

Output:
System prompt + user prompt

---

## llm_client.py

Purpose:
Single gateway between project and Gemini.

Responsibilities:

* Connect to Gemini
* Send prompts
* Retry failed requests
* Parse JSON
* Track latency
* Track token usage

Input:

Prompt

Output:

LLMResponse

---

## models.py

Purpose:
Defines common data structures.

Important Models:

### SourceDocument

Raw email/transcript before extraction.

### ExtractedTask

Task extracted from unstructured text.

Example:

* title
* owner
* deadline
* confidence
* source_sentence

### Task

Canonical task object used by entire team.

Used by:

* P1
* P2
* P3
* P4
* P5

Every module agrees that a task looks exactly like this.

### DailyPlan

Generated daily work plan.

### QAResponse

Chat answer returned to frontend.

---

# Extraction Pipeline (Current Focus)

Input:

Email
Meeting Transcript

↓

build_extraction_prompt()

↓

call_llm()

↓

Gemini 3.1 Flash Lite

↓

JSON Array

↓

ExtractedTask Objects

↓

Return to Pipeline

Example:

Email:

"Please fix login bug before Friday."

↓

ExtractedTask:

{
title: "Fix login bug",
deadline: "Friday",
confidence: 0.92
}

---

# Future Normalization (Person 1)***

ExtractedTask

↓

Normalizer

↓

Task

Adds:

* task id
* source
* priority
* dependencies
* deduplication

Result:

Task(
id="JIRA-1234",
title="Fix login bug"
)

---

# Prioritization Pipeline

Task

↓

build_prioritization_prompt()

↓

Gemini

↓

Priority Score

↓

Task.score

↓

Task.rationale

Scoring Factors:

* Severity
* Deadline urgency
* Dependency blocking
* Customer impact
* VP escalation

---

# Daily Planning Pipeline

Ranked Tasks

↓

build_daily_plan_prompt()

↓

Gemini

↓

DailyPlan

Example:

Today:

1. Fix payment outage
2. Resolve authentication bug

Defer:

1. Documentation cleanup

---

# QA Pipeline

User Question

↓

build_qa_prompt()

↓

Gemini

↓

QAResponse

Example Questions:

* Why is task A ranked first?
* What should I do today?
* Which tasks are blocked?
* Summarize today's priorities

# Current LLM

Model:
Gemini 3.1 Flash Lite

Reason:

* Fast
* Reliable free-tier limits
* Good JSON generation
* Suitable for extraction and prioritization
* Easy to swap later through llm_client.py




## For my reference

### Prompt.py
library of instructions which we will provide to llm to ensure most accurate/best possible data extraction
In prompt.py, few-shot prompting means giving the LLM a few examples of input → output before giving the actual user data.

The model learns the pattern from those examples and tries to generate similar outputs for new inputs.

### llm_clients.py
 a separate file that handles all communication with the Large Language Model (LLM).
bridge between your application and Gemini.
foundation of the entire AI pipeline

### models.py 
data structures file
gemini returns
{
  "title": "Fix payment gateway timeout",
  "owner": "Marcus",
  "deadline": "2026-06-20",
  "confidence": 0.94,
  "source_sentence": "Marcus should fix the payment gateway timeout before Friday."
}{
  "title": "Fix payment gateway timeout",
  "owner": "Marcus",
  "deadline": "2026-06-20",
  "confidence": 0.94,
  "source_sentence": "Marcus should fix the payment gateway timeout before Friday."
}
with models.py the extracted data is structured in a better manner
Task(
    id="JIRA-1234",
    title="Fix login bug",
    priority="P1",
    owner="Aditi"
)

**defines how the task object looks for everyone. Unified.

## extractor.py
what its supposed to do
Receive raw text
Call build_extraction_prompt()
Call Gemini through call_llm()
Validate returned JSON
Convert JSON → ExtractedTask
Return list[ExtractedTask]

## Weekly_summary.py
takes the input as daily plan and then generates a weekly plan over it

## Data Sources

### email_inbox.json

Contains:

* subject
* body
* sender

Need to extract:

* task
* owner
* deadline

### meeting_transcript.txt

Contains:

* standup transcript
* hidden action items
* dependency information

Need to extract:

* tasks
* blockers
* dependencies

### jira_board.json

Structured source.

Need:

* priority
* assignee
* dependencies

### defect_tracker.json

Structured source.

Need:

* severity
* SLA
* affected users

---

## Important Demo Cases

* JIRA-1234 appears in multiple sources
* VP escalation email
* Hidden action items in email body
* Blocking dependency in transcript

---

## Prompt Ideas



### Prioritization

Score based on:

* deadline urgency
* severity
* business impact
* dependency blocking

---

## Questions for Team

* went ahead with gemini  3.1
* Exact task schema?
* Final API contract from P3?
* jira board is an agile board


## Expected extraction output 
 expected output for extraction from email_inbox.json
 # Extracted Task Schema

{
    "title": "",
    "owner": "",
    "deadline": "",
    "confidence": 0.0,
    "source": "",
    "source_sentence": ""
}


## DONE TILL NOW 
## DAY 1
✅ Mock Data
✅ prompts.py
✅ llm_client.py
✅ Gemini API
✅ models.py

⬜ extractor.py
⬜ prioritizer.py
⬜ weekly_summary.py






## IMP
originaly had 5 separate dataclasses but no unified Task object
this would have forced Person 3 to handle different shapes at every pipeline stage. The new version keeps all the dataclasses and adds Task with to_dict() / from_dict() so Person 3's state.py can serialize/deserialize cleanly, and Person 4's API client always gets the same JSON shape regardless of where the task came from.