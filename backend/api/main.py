import logging
import os
import sys
from pathlib import Path

# Load .env BEFORE any module imports connectors or reads env.
# connector_registry is transitively imported by api.routes, so
# load_dotenv MUST run first.
from dotenv import load_dotenv
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)
else:
    load_dotenv()  # fallback to CWD

# Map XAI_API_KEY -> LLM_API_KEY if only XAI_API_KEY is set
if not os.environ.get("LLM_API_KEY") and os.environ.get("XAI_API_KEY"):
    os.environ["LLM_API_KEY"] = os.environ["XAI_API_KEY"]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from core.state import init_db, load_state, store
from core.sync_engine import sync_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TaskPilot AI",
    description="Real-time agentic platform backend API.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def _mask(s: str | None) -> str:
    if not s:
        return ""
    if len(s) <= 8:
        return s[:2] + "***"
    return s[:4] + "****" + s[-4:]


async def _validate_connectors():
    """Check each connector at startup and log detailed status."""
    from core.connector_registry import connector_registry

    results = {}
    for name, connector in connector_registry.items():
        try:
            ok = await connector.connect()
            results[name] = {"connected": ok, "error": connector.error}
            if ok:
                logger.info("✓ %s connector — connected", connector.name)
            else:
                logger.warning("✗ %s connector — %s", connector.name, connector.error or "unknown error")
        except Exception as e:
            results[name] = {"connected": False, "error": str(e)}
            logger.error("✗ %s connector — failed: %s", connector.name, e)

    jira_ok = results.get("jira", {}).get("connected", False)
    gh_ok = results.get("github", {}).get("connected", False)

    if jira_ok:
        logger.info("✓ Jira live — fetching assigned/open/overdue issues")
    else:
        logger.warning("! Jira unavailable — defect source will use simulated data")

    if gh_ok:
        logger.info("✓ GitHub live — fetching issues, PRs, review requests")
    else:
        logger.warning("! GitHub unavailable — no GitHub data in pipeline")

    return results


@app.on_event("startup")
async def startup():
    logger.info("TaskPilot AI starting up...")

    # --- Env summary ---
    llm_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")
    jira_url = os.environ.get("JIRA_URL", "")
    jira_email = os.environ.get("JIRA_EMAIL", "")
    jira_token = os.environ.get("JIRA_API_TOKEN", "")
    gh_token = os.environ.get("GITHUB_TOKEN", "")
    gh_owner = os.environ.get("GITHUB_REPO_OWNER", "taskpilot-ai")
    gh_repo = os.environ.get("GITHUB_REPO_NAME", "backend")

    if llm_key:
        logger.info("✓ xAI key present (key=%s, base=%s, model=%s)",
                     _mask(llm_key),
                     os.environ.get("LLM_BASE_URL", "https://api.x.ai/v1"),
                     os.environ.get("LLM_MODEL", "grok-4"))
    else:
        logger.warning("✗ xAI key MISSING — LLM features limited to heuristic fallback")

    if jira_url and jira_email and jira_token:
        logger.info("✓ Jira credentials present (url=%s, email=%s)", jira_url, jira_email)
    else:
        logger.warning("✗ Jira credentials MISSING — missing JIRA_URL, JIRA_EMAIL, or JIRA_API_TOKEN")

    if gh_token:
        logger.info("✓ GitHub token present (owner=%s, repo=%s, token=%s)", gh_owner, gh_repo, _mask(gh_token))
    else:
        logger.warning("✗ GitHub token MISSING — GITHUB_TOKEN not set")

    # --- LLM connectivity check ---
    from core.llm_client import OpenAICompatibleBackend
    llm_ok, llm_msg, llm_models = await OpenAICompatibleBackend.check_connectivity()
    if llm_ok:
        logger.info("✓ Grok connected — model=%s", os.environ.get("LLM_MODEL", "grok-4"))
        if llm_models:
            logger.info("  Available Grok models: %s", ", ".join(llm_models))
    else:
        logger.warning("✗ Grok unavailable: %s", llm_msg)
        logger.warning("  Pipeline will use heuristic fallback for extraction/prioritization")
        if llm_models:
            logger.info("  Available Grok models: %s", ", ".join(llm_models))

    # --- Database ---
    init_db()
    logger.info("✓ Database initialized at db/taskpilot.db")

    tasks, plan = load_state()
    if tasks:
        store.update(tasks, plan)
        logger.info("Restored %d tasks from previous run", len(tasks))

    # --- Connector validation ---
    conn_results = await _validate_connectors()

    # --- Initial pipeline run ---
    try:
        from core.agent import run_pipeline
        await run_pipeline()
        logger.info("Initial pipeline run complete")
    except Exception as e:
        logger.error("Initial pipeline run failed: %s — API will serve empty state until /api/refresh", e)
        logger.error("Pipeline failure does not block API — call GET /api/refresh to retry")

    # --- Periodic sync ---
    await sync_engine.start()
    logger.info("Sync engine started")

    # --- Autonomous background services ---
    from core.monitor_service import monitor_service
    await monitor_service.start()
    logger.info("Monitor service started")


@app.on_event("shutdown")
async def shutdown():
    logger.info("TaskPilot AI shutting down...")
    from core.monitor_service import monitor_service
    await monitor_service.stop()
    await sync_engine.stop()
    logger.info("Background services stopped")
