import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from core.state import init_db, load_state, store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TaskPilot AI",
    description="Backend API for the TaskPilot AI hackathon project.",
    version="0.1.0",
)

# CORS: allow all origins for hackathon simplicity
# In production, restrict this to specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    logger.info("TaskPilot AI starting up...")
    init_db()

    # Load persisted state from last run
    tasks, plan = load_state()
    if tasks:
        store.update(tasks, plan)
        logger.info("Restored %d tasks from previous run", len(tasks))

    # Run pipeline automatically to have fresh data ready
    try:
        from core.agent import run_pipeline
        await run_pipeline()
        logger.info("Initial pipeline run complete")
    except Exception as e:
        logger.error("Initial pipeline run failed: %s — API will serve empty state until /api/refresh", e)
