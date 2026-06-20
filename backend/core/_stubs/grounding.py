from models.task import Task


def verify_grounding(task: Task, source_texts: dict[str, str]) -> dict:
    # Stub: always grounded with high confidence
    snippet = task.raw_text[:150] if task.raw_text else task.title[:150]
    return {
        "grounded": True,
        "confidence": 0.95,
        "source_snippet": snippet,
    }
