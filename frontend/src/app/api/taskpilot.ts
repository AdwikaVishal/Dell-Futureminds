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
};

export type SourcesResponse = {
  sources: Source[];
  total_tasks: number;
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
