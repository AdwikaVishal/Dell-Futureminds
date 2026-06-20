import asyncio
from datetime import datetime, timedelta
from models.task import Task


async def extract_action_items(text: str, source_id: str, source_type: str) -> list[Task]:
    await asyncio.sleep(0.2)
    if not text.strip():
        return []
    # Deterministic stub: create one task per sentence that looks actionable
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    tasks = []
    for i, sentence in enumerate(sentences):
        if any(kw in sentence.lower() for kw in ["need", "must", "should", "will", "please", "review", "fix", "investigate", "set up", "clean", "document", "schedule"]):
            tasks.append(Task(
                id=f"{source_id}_extracted_{i}",
                title=f"[STUB] {sentence[:80]}",
                description=sentence[:300],
                source=source_id,
                source_type=source_type,
                priority="P2",
                deadline=datetime.utcnow() + timedelta(days=3),
                owner=None,
                status="open",
                dependencies=[],
                raw_text=sentence,
            ))
    return tasks
