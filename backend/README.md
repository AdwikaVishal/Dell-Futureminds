# TaskPilot AI — Backend

Backend server and agent orchestration layer for the TaskPilot AI hackathon project.

## Setup

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload
```

The API will be available at `http://localhost:8000`. FastAPI auto-docs at `http://localhost:8000/docs`.

## Stub Fallback System

This backend is designed to run fully on stubs before teammates' real modules are ready. Every import from a teammate's module path follows this pattern:

```python
try:
    from core.data_loader import load_jira
except ImportError:
    from core._stubs.data_loader import load_jira
    logger.warning("[STUB] Using mock data_loader ...")
```

**To swap in a real module**, the teammate just needs to ensure their module is on the `PYTHONPATH` at the expected path (`core.data_loader`, etc.). The import will succeed and the stub will be ignored — no code changes needed in `core/agent.py`.

### Module Ownership

| Module | Owner | Stub Path |
|---|---|---|
| `core.data_loader` | Person 1 | `core/_stubs/data_loader.py` |
| `core.normalizer` | Person 1 | `core/_stubs/normalizer.py` |
| `core.deduplicator` | Person 1 | `core/_stubs/deduplicator.py` |
| `core.extractor` | Person 2 | `core/_stubs/extractor.py` |
| `core.prioritizer` | Person 2 | `core/_stubs/prioritizer.py` |
| `core.weekly_summary` | Person 2 | optional |
| `core.tracer` | Person 5 | `core/_stubs/tracer.py` |
| `core.grounding` | Person 5 | `core/_stubs/grounding.py` |

### Hot-swap during demo

If a teammate's module breaks during the hackathon, you can force the stub back by temporarily removing or renaming the real module file. No other changes needed.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check with last pipeline run timestamp |
| POST | `/api/refresh` | Re-run the full pipeline from scratch |
| GET | `/api/plan` | Get current DailyPlan (auto-runs pipeline if empty) |
| GET | `/api/tasks` | List all tasks (filters: `?source_type=`, `?priority=`) |
| GET | `/api/tasks/{task_id}` | Single task detail with grounding info |
| POST | `/api/chat` | Ask a question about your tasks |
| POST | `/api/inject` | Inject a new task and get re-ranked plan |
| GET | `/api/traces` | Recent pipeline step timings |
| GET | `/api/weekly-summary` | Weekly summary (stub until Person 2's module) |

## Demo Day Checklist

- [ ] Run `pip install -r requirements.txt` once
- [ ] Start server: `uvicorn api.main:app --reload`
- [ ] Verify `/api/health` returns `{"status": "ok", ...}`
- [ ] Wait for the initial pipeline run to complete (check terminal logs)
- [ ] Visit `/docs` to explore endpoints in Swagger UI
- [ ] Ready the `/api/inject` payload for live demo:

```json
{
  "title": "CRITICAL: Production outage — fix immediately",
  "description": "All users are unable to log in.",
  "source_type": "injected",
  "priority": "P0",
  "deadline": "2026-06-20T18:00:00Z",
  "owner": "alice"
}
```
