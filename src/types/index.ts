export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'active' | 'blocked' | 'sla-risk' | 'in-progress' | 'completed' | 'deferred';
export type SourceSystem = 'jira' | 'email' | 'slack' | 'github' | 'servicenow' | 'meeting';
export type AlertSeverity = 'incident' | 'escalation' | 'system' | 'warning';
export type AgentType = 'email' | 'meeting' | 'dedup' | 'priority' | 'planning' | 'security';

export interface ReasoningBreakdown {
  severity: number;
  deadline: number;
  businessImpact: number;
  dependencies: number;
  finalScore: number;
}

export interface SourceEvidence {
  system: SourceSystem;
  id: string;
  label: string;
  snippet?: string;
  url?: string;
}

export interface Task {
  id: string;
  rank: number;
  previousRank?: number;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  score: number;
  confidence: number;
  deadline?: string;
  slaDeadline?: Date;
  owner: string;
  sources: SourceSystem[];
  sourceEvidence: SourceEvidence[];
  reasoning: ReasoningBreakdown;
  whyMatters: string[];
  aiRationale: string;
  isNew?: boolean;
  dependencies?: string[];
  effort?: string;
  impact?: 'High' | 'Medium' | 'Low';
  isMerged?: boolean;
  dedupConfidence?: number;
  dedupReason?: string;
}

export interface Alert {
  id: string;
  type: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
}

export interface AgentActivity {
  id: string;
  time: string;
  agent: AgentType;
  agentName: string;
  action: string;
  details?: string;
  status: 'completed' | 'running' | 'pending';
}

export interface RankChange {
  id: string;
  taskName: string;
  oldRank: number | null;
  newRank: number;
  isNew: boolean;
  direction: 'up' | 'down' | 'new';
  reason: string;
}

export interface HiddenTask {
  id: string;
  title: string;
  source: SourceSystem;
  sourceLabel: string;
  extractedFrom: string;
  timestamp: string;
  priority: Priority;
  status: 'discovered' | 'acknowledged';
}

export interface DailyPlanBlock {
  id: string;
  period: 'morning' | 'afternoon' | 'evening';
  timeRange: string;
  title: string;
  description: string;
  effort: string;
  impact: 'High' | 'Medium' | 'Low';
  tasks: string[];
  priority: Priority;
  aiRationale: string;
  dependencies?: string[];
  attendees?: number;
}

export interface WeeklyStat {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
}

// ── Citation types (Chat API integration) ──────────────────────────────────

export type CitationSourceType = 'jira' | 'email' | 'slack' | 'github' | 'servicenow' | 'meeting';

export interface Citation {
  id: string;                     // e.g. "JIRA-1234", "EML-001"
  source: CitationSourceType;
  title: string;                  // Human-readable title
  snippet?: string;               // Excerpt from the source
  url?: string;                   // Deep link for future backend
  metadata?: Record<string, string>; // Flexible key-value for future fields
}

// ── Task ownership split (My Tasks vs Delegated) ──────────────────────────

export type TaskOwnership = 'mine' | 'delegated' | 'affecting';

export interface TaskWithOwnership extends Task {
  ownership: TaskOwnership;
  delegatedBy?: string;           // Who assigned / delegated this
  delegatedReason?: string;       // Why it affects the current user
}

// ── Sprint progress widget ─────────────────────────────────────────────────

export interface SprintProgress {
  sprintName: string;
  completed: number;
  remaining: number;
  total: number;
  percentComplete: number;
  daysLeft: number;
  velocity?: number;              // Optional story points per day
}

// ── AI Impact metrics (reusable card) ─────────────────────────────────────

export interface ImpactMetric {
  id: string;
  label: string;
  value: number | string;
  sub: string;
  icon: string;                   // Lucide icon name for future dynamic rendering
  color: string;                  // Tailwind color class
  glow: string;                   // CSS rgba value
  trend?: 'up' | 'down' | 'flat';
}

// ── Recent AI decision ────────────────────────────────────────────────────

export interface RecentDecision {
  id: string;
  taskId: string;
  taskName: string;
  oldRank: number | null;
  newRank: number;
  direction: 'up' | 'down' | 'new';
  reason: string;
  timestamp: string;
}

// ── Hidden work discovery (email / meeting / slack extraction) ─────────────

export type DiscoveryStatus = 'added-to-plan' | 'merged' | 'awaiting-review';

export interface HiddenDiscovery {
  id: string;
  source: SourceSystem;
  sourceId: string;          // e.g. "EML-003", "MTG-June17", "SLK-#devops"
  sourceLabel: string;       // e.g. "Email · VP Engineering"
  snippet: string;           // Raw source excerpt (1-2 lines)
  actionItem: string;        // Extracted action item title
  owner?: string;            // Inferred owner if available
  deadline?: string;         // Inferred deadline if available
  status: DiscoveryStatus;
  mergedInto?: string;       // Task ID if merged (e.g. "TKT-6921")
  confidence: number;        // 0-100
}

// ── AI action timeline entry ───────────────────────────────────────────────

export type AIActionType = 'merge' | 'rerank' | 'extract' | 'flag' | 'plan';

export interface AIAction {
  id: string;
  type: AIActionType;
  label: string;             // Short category label
  detail: string;            // One-line description
  time: string;              // e.g. "08:04 UTC"
}

// ── Daily plan change event ────────────────────────────────────────────────

export interface PlanChange {
  id: string;
  description: string;       // e.g. "OAuth outage moved #4 → #1"
  time: string;
}
