CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    tasks_json TEXT NOT NULL,
    plan_json TEXT,
    pipeline_status TEXT NOT NULL DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS chat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    referenced_task_ids TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    step_name TEXT NOT NULL,
    duration_ms REAL,
    tokens_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS llm_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    tasks_extracted INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    latency_ms REAL DEFAULT 0,
    status TEXT DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    summary_json TEXT,
    generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL UNIQUE,
    last_sync TEXT,
    status TEXT DEFAULT 'idle',
    error TEXT,
    items_fetched INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source_type TEXT,
    payload TEXT,
    processed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ok',
    duration_ms REAL,
    details TEXT
);
