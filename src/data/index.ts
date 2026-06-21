import type { Task, Alert, AgentActivity, RankChange, HiddenTask, DailyPlanBlock, WeeklyStat, SprintProgress, TaskWithOwnership } from '../types';


export const tasks: Task[] = [
  {
    id: 'TKT-6921',
    rank: 1,
    previousRank: 7,
    title: 'Login Service Failure',
    description: 'Critical P1 incident: Authentication service returning 503 errors for 12% of users across EU-West and US-East regions. OAuth token refresh pipeline is failing.',
    priority: 'P1',
    status: 'active',
    score: 96,
    confidence: 95,
    deadline: '4h remaining',
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
    owner: 'Alex Chen',
    sources: ['jira', 'email', 'slack'],
    sourceEvidence: [
      { system: 'jira', id: 'TKT-6921', label: 'Jira TKT-6921', snippet: 'P1 incident declared at 07:15 UTC. Auth service 503 errors affecting EU-West-1.' },
      { system: 'email', id: 'email-3', label: 'Email · 3 Threads', snippet: '3 Enterprise Customer Escalations in last hour. VP of Engineering requesting immediate status update.' },
      { system: 'slack', id: 'slack-incident', label: 'Slack #incident-login', snippet: '@sarah: seeing latency spikes on the auth cluster, might be related to the cert rotation.' },
    ],
    reasoning: { severity: 40, deadline: 30, businessImpact: 20, dependencies: 6, finalScore: 96 },
    whyMatters: [
      'P1 Incident declared at 07:15 UTC',
      '3 Enterprise Customer Escalations in last hour',
      'Global SLA expires in 4 hours',
      'Blocks scheduled Release Deployment (v4.2.1)',
    ],
    aiRationale: 'Ranked #1 due to simultaneous P1 severity, active enterprise customer escalation, and SLA breach imminent within 4 hours. This task blocks 2 downstream deployments and has the highest compound risk score in the current queue.',
    dependencies: ['AUTH-992', 'DB-4041'],
    effort: '3h',
    impact: 'High',
    isNew: false,
    isMerged: true,
    dedupConfidence: 94,
    dedupReason: 'Deduplication engine unified P1 Jira incident with 3 active customer escalation email threads and real-time Slack latency alerts.',
  },
  {
    id: 'SEC-4092',
    rank: 2,
    previousRank: 4,
    title: 'Database Migration Approval Pending Security Review',
    description: 'The Q3 database schema migration is blocked on security sign-off. PR #4092 has been in review for 2 days without approval.',
    priority: 'P1',
    status: 'blocked',
    score: 84,
    confidence: 88,
    deadline: '2 days stale',
    owner: 'Jordan Lee',
    sources: ['github', 'jira'],
    sourceEvidence: [
      { system: 'github', id: 'PR-4092', label: 'GitHub PR #4092', snippet: 'Migration script for Q3 analytics schema. Waiting on security team approval.' },
      { system: 'jira', id: 'SEC-132', label: 'Jira SEC-132', snippet: 'Security review initiated 2 days ago. No response from security team.' },
    ],
    reasoning: { severity: 30, deadline: 24, businessImpact: 20, dependencies: 10, finalScore: 84 },
    whyMatters: [
      'Blocking Q3 Financial Reporting pipeline',
      'PR stale for 48 hours',
      'Security team SLA breach approaching',
      'Affects 3 downstream data consumers',
    ],
    aiRationale: 'Elevated to #2 due to extended block duration and cascading impact on Q3 reporting. Deduplication engine merged this with 2 related GitHub issues.',
    effort: '2h',
    impact: 'Medium',
    isMerged: true,
    dedupConfidence: 91,
    dedupReason: 'Correlated stale GitHub database schema PR with active Jira compliance review ticket SEC-132.',
  },
  {
    id: 'DATA-332',
    rank: 3,
    previousRank: 3,
    title: 'Q3 Financial Reporting Data Pipeline Optimization',
    description: 'Data pipeline producing Q3 financial reports is running 40% slower than SLA threshold. Due today.',
    priority: 'P2',
    status: 'sla-risk',
    score: 79,
    confidence: 92,
    deadline: 'Due Today',
    owner: 'Morgan Wu',
    sources: ['jira', 'email'],
    sourceEvidence: [
      { system: 'jira', id: 'DATA-332', label: 'Jira DATA-332', snippet: 'Pipeline performance degradation. Query optimization needed.' },
      { system: 'email', id: 'email-fin', label: 'Email · Finance Team', snippet: 'Q3 reports delayed. Finance team asking for ETA.' },
    ],
    reasoning: { severity: 20, deadline: 35, businessImpact: 18, dependencies: 6, finalScore: 79 },
    whyMatters: [
      'SLA deadline is today at 17:00 UTC',
      'Finance team has escalated via email',
      'Affects Q3 board reporting cycle',
    ],
    aiRationale: 'SLA risk score elevated after detecting Finance team email escalation this morning. Cross-referenced with Jira ticket timeline.',
    effort: '1.5h',
    impact: 'Medium',
  },
  {
    id: 'AUTH-992',
    rank: 4,
    previousRank: 2,
    title: 'OAuth Token Refresh Failing for EU Region',
    description: 'OAuth token refresh pipeline failing specifically for EU-West-1 region users. Related to Login Service incident.',
    priority: 'P0',
    status: 'blocked',
    score: 91,
    confidence: 97,
    deadline: '2h remaining',
    owner: 'Alex Chen',
    sources: ['jira', 'slack', 'servicenow'],
    sourceEvidence: [
      { system: 'jira', id: 'AUTH-992', label: 'Jira AUTH-992', snippet: 'OAuth token refresh failing. EU-West-1 affected. Related to cert rotation on 2026-06-17.' },
      { system: 'slack', id: 'slack-escalations', label: 'Slack #escalations', snippet: 'Multiple enterprise customers reporting login failures in EU region.' },
    ],
    reasoning: { severity: 40, deadline: 35, businessImpact: 12, dependencies: 4, finalScore: 91 },
    whyMatters: ['P0 blocker for Login Service resolution', 'EU enterprise customers affected', 'Certificate rotation root cause identified'],
    aiRationale: 'Classified as P0 blocker dependency of TKT-6921. Resolution required before Login Service can be restored.',
    effort: '2h',
    impact: 'High',
  },
  {
    id: 'DB-4041',
    rank: 5,
    previousRank: 5,
    title: 'Read Replica Latency Spikes > 500ms',
    description: 'Staging read replicas showing latency spikes exceeding 500ms threshold. Impacting API response times.',
    priority: 'P1',
    status: 'active',
    score: 72,
    confidence: 84,
    deadline: '8h remaining',
    owner: 'Sam Rivera',
    sources: ['slack', 'servicenow'],
    sourceEvidence: [
      { system: 'slack', id: 'slack-devops', label: 'Slack #dev-ops', snippet: '@sarah seeing latency spikes on the replica db for staging.' },
      { system: 'servicenow', id: 'SN-8821', label: 'ServiceNow SN-8821', snippet: 'Infrastructure monitoring alert: DB read latency P95 > 500ms.' },
    ],
    reasoning: { severity: 25, deadline: 20, businessImpact: 18, dependencies: 9, finalScore: 72 },
    whyMatters: ['Affecting 12 dependent API endpoints', 'Related to Login Service latency issues'],
    aiRationale: 'Correlated from Slack message and ServiceNow alert. Semantic similarity 94% with AUTH-992 root cause analysis.',
    effort: '2h',
    impact: 'Medium',
    isMerged: true,
    dedupConfidence: 94,
    dedupReason: 'Linked DevOps Slack query replica alerts with ServiceNow infrastructure latency incident SN-8821.',
  },
  {
    id: 'ARCH-201',
    rank: 6,
    title: 'Q4 Architecture Planning Document',
    description: 'Initial draft of Q4 architecture changes required for infrastructure scaling and microservices migration.',
    priority: 'P2',
    status: 'in-progress',
    score: 45,
    confidence: 76,
    deadline: 'Next Week',
    owner: 'Alex Chen',
    sources: ['email', 'meeting'],
    sourceEvidence: [
      { system: 'meeting', id: 'meeting-arch', label: 'Meeting Notes · June 17', snippet: 'Action item: Draft Q4 architecture proposal by end of week.' },
      { system: 'email', id: 'email-cto', label: 'Email · CTO', snippet: 'Please prepare Q4 infrastructure scaling proposal for board review.' },
    ],
    reasoning: { severity: 8, deadline: 12, businessImpact: 18, dependencies: 7, finalScore: 45 },
    whyMatters: ['CTO requested deliverable', 'Input for Q4 budget planning'],
    aiRationale: 'Moderate priority. Scheduled during Evening block to leverage strategic thinking time.',
    effort: '3h',
    impact: 'Medium',
  },
];

export const alerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'incident',
    title: 'New production anomaly detected in US-East-1 payment gateway.',
    description: 'Payment gateway latency elevated. P95 > 800ms for last 15 minutes.',
    timestamp: '2026-06-19T07:50:00Z',
    timeAgo: '10m ago',
  },
  {
    id: 'alert-2',
    type: 'escalation',
    title: 'VP of Engineering requested status update on #1 Login Service Failure.',
    description: 'Escalation received via email. SLA response window: 30 minutes.',
    timestamp: '2026-06-19T07:15:00Z',
    timeAgo: '45m ago',
  },
  {
    id: 'alert-3',
    type: 'system',
    title: 'SLA deadline approaching for Enterprise Ticket #99281.',
    description: 'Ticket SLA expires in 2 hours. Customer tier: Enterprise Gold.',
    timestamp: '2026-06-19T06:00:00Z',
    timeAgo: '2h ago',
  },
  {
    id: 'alert-4',
    type: 'warning',
    title: 'Deploy pipeline blocked. Awaiting security sign-off on PR #4092.',
    description: 'Release v4.2.1 cannot proceed until SEC-132 review is complete.',
    timestamp: '2026-06-19T05:30:00Z',
    timeAgo: '2.5h ago',
  },
];

export const agentActivities: AgentActivity[] = [
  {
    id: 'agent-1',
    time: '08:05',
    agent: 'planning',
    agentName: 'Planning Agent',
    action: 'Generated daily execution plan',
    details: 'Scheduled 3 focus blocks across 8h. Optimized for cognitive load.',
    status: 'completed',
  },
  {
    id: 'agent-2',
    time: '08:04',
    agent: 'priority',
    agentName: 'Priority Agent',
    action: 'Recalculated task rankings',
    details: 'Upload Bug promoted #4→#2. New customer escalation detected.',
    status: 'completed',
  },
  {
    id: 'agent-3',
    time: '08:03',
    agent: 'dedup',
    agentName: 'Deduplication Agent',
    action: 'Merged 2 duplicate issues',
    details: 'DB latency (Slack) + DB-4041 (Jira) → Unified task. Semantic match 94%.',
    status: 'completed',
  },
  {
    id: 'agent-4',
    time: '08:02',
    agent: 'meeting',
    agentName: 'Meeting Agent',
    action: 'Extracted 2 follow-up action items',
    details: 'From Architecture Review meeting notes (June 17). Added to task queue.',
    status: 'completed',
  },
  {
    id: 'agent-5',
    time: '08:01',
    agent: 'email',
    agentName: 'Email Agent',
    action: 'Detected 3 hidden action items',
    details: 'Scanned 24 emails. Found 3 undocumented tasks requiring attention.',
    status: 'completed',
  },
];

export const rankChanges: RankChange[] = [
  { id: 'rc-1', taskName: 'Upload Service Bug', oldRank: 4, newRank: 2, isNew: false, direction: 'up', reason: 'Customer escalation' },
  { id: 'rc-2', taskName: 'Security Review', oldRank: 2, newRank: 5, isNew: false, direction: 'down', reason: 'Priority override' },
  { id: 'rc-3', taskName: 'Customer Escalation', oldRank: null, newRank: 1, isNew: true, direction: 'new', reason: 'Newly discovered' },
];

export const hiddenTasks: HiddenTask[] = [
  {
    id: 'ht-1',
    title: 'Update API documentation before Thursday client demo',
    source: 'email',
    sourceLabel: 'Email from Sarah K.',
    extractedFrom: 'RE: Thursday client presentation — action items',
    timestamp: '08:01 AM',
    priority: 'P2',
    status: 'discovered',
  },
  {
    id: 'ht-2',
    title: 'Architecture review meeting notes require sign-off from CTO',
    source: 'meeting',
    sourceLabel: 'Meeting Notes · June 17',
    extractedFrom: 'Q3 Architecture Planning — Follow-ups',
    timestamp: '08:02 AM',
    priority: 'P2',
    status: 'discovered',
  },
  {
    id: 'ht-3',
    title: 'Investigate staging cluster CPU anomaly flagged by DevOps',
    source: 'slack',
    sourceLabel: 'Slack #dev-ops',
    extractedFrom: '@marcus: someone should look at the staging CPU spike from last night',
    timestamp: '08:01 AM',
    priority: 'P1',
    status: 'discovered',
  },
];

export const dailyPlan: DailyPlanBlock[] = [
  {
    id: 'dp-morning',
    period: 'morning',
    timeRange: '08:00 – 11:00',
    title: 'Morning: Deep Work',
    description: 'Resolve P1 Login Service Failure. Coordinate with DevOps & Security.',
    effort: '3h',
    impact: 'High',
    tasks: ['Investigate OAuth cert rotation root cause', 'Coordinate with DevOps on EU-West-1 rollback', 'Draft VP Engineering status update'],
    priority: 'P1',
    aiRationale: 'Slotted during cognitive peak hours. P1 resolution requires sustained focus and cross-team coordination.',
    dependencies: ['AUTH-992', 'DevOps on-call'],
  },
  {
    id: 'dp-afternoon',
    period: 'afternoon',
    timeRange: '13:00 – 15:00',
    title: 'Afternoon: Reviews',
    description: 'Unblock DB Migration. Review security audit logs and approve PR #4092.',
    effort: '2h',
    impact: 'Medium',
    tasks: ['Review SEC-132 security checklist', 'Approve or request changes on PR #4092', 'Unblock Q3 reporting pipeline'],
    priority: 'P1',
    aiRationale: 'Clustered collaborative tasks post-focus block. Minimizes context switching and utilizes post-peak review capacity.',
    dependencies: ['Security team approval', 'PR #4092'],
    attendees: 3,
  },
  {
    id: 'dp-evening',
    period: 'evening',
    timeRange: '16:00 – 17:30',
    title: 'Evening: Admin',
    description: 'Low-priority backlog grooming and weekly status report generation.',
    effort: '1.5h',
    impact: 'Low',
    tasks: ['Q4 architecture planning notes', 'Backlog grooming: defer non-critical items', 'Generate weekly summary draft'],
    priority: 'P2',
    aiRationale: 'Low-complexity tasks aligned with typical end-of-day cognitive dip. Strategic planning benefits from quieter async time.',
  },
];

export const weeklyStats: WeeklyStat[] = [
  { label: 'Tasks Completed', value: 23, change: '+4 vs last week', positive: true },
  { label: 'Critical Issues Resolved', value: 7, change: '+2 vs last week', positive: true },
  { label: 'Hidden Tasks Discovered', value: 11, change: 'From emails & meetings', positive: true },
  { label: 'Hours Saved', value: '14.5h', change: 'Via automation', positive: true },
  { label: 'Escalations Prevented', value: 3, change: 'Early detection', positive: true },
  { label: 'Duplicate Issues Merged', value: 6, change: 'Deduplication engine', positive: true },
];

export const impactMetrics = {
  hiddenDiscovered: 3,
  duplicatesMerged: 2,
  hoursSaved: 4.5,
  escalationsPrevented: 1,
};

export const changesYesterday = [
  { id: 'cy-1', icon: 'new', label: '3 new critical tasks detected', type: 'critical' },
  { id: 'cy-2', icon: 'reprioritized', label: '2 tasks reprioritized by AI', type: 'reprioritized' },
  { id: 'cy-3', icon: 'resolved', label: '1 blocker resolved (DB deadlock)', type: 'resolved' },
  { id: 'cy-4', icon: 'rank', label: 'Upload Bug promoted #4 → #2', type: 'rank' },
];

// ── Sprint progress (ProgressWidget data) ────────────────────────────────────

export const sprintProgress: SprintProgress = {
  sprintName: 'Sprint 24 — Q3 Hardening',
  completed: 16,
  remaining: 4,
  total: 20,
  percentComplete: 80,
  daysLeft: 2,
  velocity: 2.3,
};

// ── My Tasks vs Delegated/Affecting split ─────────────────────────────────────
// Backend will provide ownership field per task.
// ownership: 'mine' = directly assigned
// ownership: 'delegated' = assigned by you to someone else, still tracking
// ownership: 'affecting' = indirect blocker, related sprint item, delegated dependency

export const myTasks: TaskWithOwnership[] = [
  { ...tasks[0], ownership: 'mine' },
  { ...tasks[2], ownership: 'mine' },
  { ...tasks[5], ownership: 'mine' },
];

export const delegatedTasks: TaskWithOwnership[] = [
  {
    ...tasks[1],
    ownership: 'affecting',
    delegatedBy: 'Jordan Lee',
    delegatedReason: 'Blocking Q3 reporting pipeline that you own',
  },
  {
    ...tasks[3],
    ownership: 'affecting',
    delegatedBy: 'Platform Team',
    delegatedReason: 'Root cause dependency of your P1 Login Service task',
  },
  {
    ...tasks[4],
    ownership: 'affecting',
    delegatedBy: 'Sam Rivera',
    delegatedReason: 'DB latency directly impacting auth service you are resolving',
  },
];

// ── Hidden tasks with confidence scores ───────────────────────────────────────
// confidence: number 0-100 — will be provided by extraction agent in API response

export const hiddenTasksWithConfidence = [
  { ...hiddenTasks[0], confidence: 87 },
  { ...hiddenTasks[1], confidence: 94 },
  { ...hiddenTasks[2], confidence: 78 },
];

// ── Hidden Work Discovery cards (Phase A) ──────────────────────────────────
// Full evidence cards shown at top of dashboard

import type { HiddenDiscovery, AIAction, PlanChange } from '../types';

export const hiddenDiscoveries: HiddenDiscovery[] = [
  {
    id: 'hd-1',
    source: 'email',
    sourceId: 'EML-003',
    sourceLabel: 'Email · VP Engineering',
    snippet: '"The login service is still down for EU customers. I need a status update by 9 AM or I\'m escalating to the board."',
    actionItem: 'Draft and send VP Engineering status update on Login Service Failure',
    owner: 'Alex Chen',
    deadline: 'Today, 09:00 AM',
    status: 'merged',
    mergedInto: 'TKT-6921',
    confidence: 97,
  },
  {
    id: 'hd-2',
    source: 'meeting',
    sourceId: 'MTG-June19',
    sourceLabel: 'Standup · June 19',
    snippet: '"@alex needs to get SEC-132 security sign-off unblocked today — Q3 reporting pipeline cannot go live without it."',
    actionItem: 'Unblock SEC-132 security review and get sign-off from security team',
    owner: 'Alex Chen',
    deadline: 'Today, EOD',
    status: 'added-to-plan',
    confidence: 91,
  },
  {
    id: 'hd-3',
    source: 'slack',
    sourceId: 'SLK-#dev-ops',
    sourceLabel: 'Slack · #dev-ops',
    snippet: '"@alex staging CPU is spiking again — same pattern as last Tuesday. Someone should check the replica config before it hits prod."',
    actionItem: 'Investigate staging cluster CPU anomaly before it reaches production',
    owner: 'Alex Chen',
    deadline: 'Today',
    status: 'awaiting-review',
    confidence: 78,
  },
];

// ── AI Actions Taken timeline (Phase A — right rail) ──────────────────────

export const aiActions: AIAction[] = [
  { id: 'ai-1', type: 'merge',   label: 'MERGE',    detail: 'EML-003 merged into TKT-6921 — VP email correlated to active P1 incident',       time: '08:04 UTC' },
  { id: 'ai-2', type: 'rerank',  label: 'RERANK',   detail: 'Login Service Failure re-ranked #3 → #1 after escalation email detected',          time: '08:04 UTC' },
  { id: 'ai-3', type: 'extract', label: 'EXTRACT',  detail: '3 hidden action items extracted from inbox scan (EML-001, EML-003, EML-005)',       time: '08:01 UTC' },
  { id: 'ai-4', type: 'flag',    label: 'FLAG',     detail: 'SLA breach risk flagged for AUTH-992 — 2h window remaining before customer impact', time: '07:58 UTC' },
];

// ── Plan change events (Phase D — Daily Plan) ──────────────────────────────

export const planChanges: PlanChange[] = [
  { id: 'pc-1', description: 'OAuth outage (AUTH-992) moved from #4 → #1', time: '08:04 UTC' },
  { id: 'pc-2', description: 'Afternoon review block deferred to tomorrow — dependency on SEC-132 unresolved', time: '08:04 UTC' },
  { id: 'pc-3', description: 'VP status update moved into morning block (was: afternoon)', time: '08:04 UTC' },
];


