export type SourceType = "jira" | "defect" | "email" | "transcript" | "injected" | "servicenow" | "github" | "slack";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done";

export type Task = {
  id: string;
  title: string;
  description?: string;
  source: string;
  source_type: SourceType;
  priority?: Priority | null;
  deadline?: string | null;
  owner?: string | null;
  status?: TaskStatus;
  dependencies?: string[];
  blocks?: string[];
  raw_text?: string;
  merged_from?: string[];
  merged_sources?: string[];
  grounded?: boolean | null;
  grounding_confidence?: number | null;
  confidence?: number | null;
  source_sentence?: string | null;
  vp_escalation?: boolean;
  customer_facing?: boolean;
  dedup_group?: string | null;
};

export type RankedTask = Task & {
  rank: number;
  score: number;
  score_breakdown?: Record<string, number>;
  rationale: string;
};

export type Alert = {
  severity: "info" | "warning" | "critical";
  message: string;
  task_id?: string | null;
};

export type DailyPlan = {
  generated_at: string;
  top_priorities: RankedTask[];
  do_next: RankedTask[];
  deferred: RankedTask[];
  blocked: RankedTask[];
  alerts: Alert[];
};

export type ChatResponse = {
  answer: string;
  referenced_task_ids: string[];
};

export type ChatRequest = {
  message: string;
};

export type InjectRequest = {
  title: string;
  description?: string;
  source_type?: SourceType;
  priority?: Priority | null;
  deadline?: string | null;
  owner?: string | null;
};

export type Source = {
  name: string;
  color: string;
  status: string;
  last_sync?: string | null;
  error?: string | null;
};

export type SourcesResponse = {
  sources: Source[];
  total_tasks: number;
};

export type ConnectorStatus = {
  name: string;
  connected: boolean;
  last_sync: string | null;
  error: string | null;
};

export type MetricsSummary = {
  connectors: ConnectorStatus[];
  sync_latency: unknown[];
  ingestion_volume: { timestamp: string; count: number }[];
  llm_usage: unknown[];
  api_latency: { avg_latency_ms: number; total_calls: number };
  websocket_health: { total_connections: number; channels: Record<string, number> };
  task_count: number;
  has_plan: boolean;
};

export type WebSocketEvent = {
  event: string;
  data: unknown;
};

const API_BASE = "";

async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}

export async function refreshPlan(): Promise<DailyPlan> {
  return jsonFetch<DailyPlan>(`${API_BASE}/api/refresh`, { method: "POST" });
}

export async function getPlan(): Promise<DailyPlan> {
  return jsonFetch<DailyPlan>(`${API_BASE}/api/plan`);
}

export async function getTasks(params?: { source_type?: string; priority?: string; status?: string }): Promise<Task[]> {
  const url = new URL(`${API_BASE}/api/tasks`, window.location.origin);
  if (params?.source_type) url.searchParams.set("source_type", params.source_type);
  if (params?.priority) url.searchParams.set("priority", params.priority);
  if (params?.status) url.searchParams.set("status", params.status);
  return jsonFetch<Task[]>(url.toString());
}

export async function chat(message: string): Promise<ChatResponse> {
  return jsonFetch<ChatResponse>(`${API_BASE}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ message } satisfies ChatRequest),
  });
}

export async function injectTask(req: InjectRequest): Promise<DailyPlan> {
  return jsonFetch<DailyPlan>(`${API_BASE}/api/inject`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export type WeeklySummaryResponse = {
  summary: string;
  generated_at: string | null;
};

export async function getWeeklySummary(): Promise<WeeklySummaryResponse> {
  return jsonFetch<WeeklySummaryResponse>(`${API_BASE}/api/weekly-summary`);
}

export async function getSources(): Promise<SourcesResponse> {
  return jsonFetch<SourcesResponse>(`${API_BASE}/api/sources`);
}

export async function getMetrics(): Promise<MetricsSummary> {
  return jsonFetch<MetricsSummary>(`${API_BASE}/api/metrics`);
}

export async function syncNow(sourceType?: string): Promise<void> {
  const url = sourceType
    ? `${API_BASE}/api/sync/now?source_type=${sourceType}`
    : `${API_BASE}/api/sync/now`;
  await jsonFetch<{ status: string }>(url, { method: "POST" });
}

export function createWebSocket(
  onEvent: (event: WebSocketEvent) => void,
  onOpen?: () => void,
  onClose?: () => void,
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[WS] Connected to TaskPilot");
    onOpen?.();
  };

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as WebSocketEvent;
      onEvent(event);
    } catch {
      console.warn("[WS] Failed to parse message:", msg.data);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected from TaskPilot");
    onClose?.();
    setTimeout(() => {
      console.log("[WS] Attempting reconnect...");
      createWebSocket(onEvent, onOpen, onClose);
    }, 5000);
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
  };

  return ws;
}
