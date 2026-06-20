# Startup Guide — TaskPilot AI

This guide covers starting both the **backend (FastAPI)** and the **frontend (Vite/React)**.

---

## 0) What you should expect
- Backend will start a pipeline on startup.
- If API keys/connectors are missing, the system will fall back to limited/heuristic behavior (and may still run with stub/simulated data).

---

## 1) Backend (FastAPI)
**Directory:** `backend/`

### Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### (Optional) Configure environment variables
The backend loads a `.env` file from `backend/../.env` if it exists.

Common variables (from backend startup log expectations):
- `LLM_API_KEY` (or `XAI_API_KEY`)
- `LLM_BASE_URL` (defaults to `https://api.x.ai/v1`)
- `LLM_MODEL` (defaults to `grok-4`)
- Jira (if using real Jira): `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- GitHub (if using real GitHub): `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`

### Run server
```bash
cd backend
uvicorn api.main:app --reload
```

### Verify
- Swagger UI: `http://localhost:8000/docs`
- Health: `GET http://localhost:8000/api/health`

### Useful endpoints (for demo)
- `POST /api/refresh`
  - Reruns the full pipeline from scratch.
- `GET /api/plan`
  - Returns the current daily plan (and auto-runs pipeline if empty).
- `GET /api/tasks`
  - Query tasks; supports optional filters like `source_type`, `priority`, `status`.
- `POST /api/inject`
  - Inject a task, then reprioritize.

Example inject payload:
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

---

## 2) Frontend (Vite + React)
**Directory:** `frontend/`

### Install dependencies
```bash
cd frontend
npm i
```

### Run dev server
```bash
cd frontend
npm run dev
```

### Open
- Usually: `http://localhost:5173`

---

## 3) Recommended run order (two terminals)
### Terminal A — backend
```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Terminal B — frontend
```bash
cd frontend
npm i
npm run dev
```

---

## 4) Demo checklist
- [ ] Backend is running, and `/api/health` returns `{"status": "ok", ...}`
- [ ] Initial pipeline finished (watch backend logs)
- [ ] Frontend loads successfully
- [ ] Use `/api/inject` to demonstrate live reprioritization

