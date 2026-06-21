import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, MessageSquare, GitBranch, Brain, Zap, CheckCircle,
  Users, Hash, ArrowRight, GitMerge,
} from 'lucide-react';
import { PriorityBadge } from '../../components/shared/PriorityBadge';
import { SourcePill } from '../../components/shared/SourcePill';
import { SlideOver } from '../../components/shared/SlideOver';
import { tasks } from '../../data';
import type { Task, SourceSystem } from '../../types';
import { cn } from '../../lib/utils';

// ── Pipeline steps ──────────────────────────────────────────────────────────

const pipelineSteps = [
  { id: 'sources',    label: 'Source Systems',  sub: 'Jira · GitHub · Email · Slack · ServiceNow', color: 'var(--success)' },
  { id: 'extract',   label: 'Extraction',       sub: 'NLP entity recognition',                      color: '#8B5CF6' },
  { id: 'dedup',     label: 'Deduplication',    sub: 'Semantic matching 94%+',                       color: 'var(--success)' },
  { id: 'priority',  label: 'Prioritization',   sub: 'Multi-factor scoring',                         color: '#F59E0B' },
  { id: 'plan',      label: 'Daily Plan',       sub: 'Execution-ready output',                       color: '#EF4444' },
];

// ── Source evidence data for the trace ─────────────────────────────────────

const sourceCards = [
  {
    id: 'src-jira',
    system: 'jira' as SourceSystem,
    icon: GitBranch,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Jira TKT-6921',
    id2: 'TKT-6921',
    title: 'Login Service Failure',
    snippet: 'P1 incident declared at 07:15 UTC. Auth service 503 errors affecting EU-West-1. OAuth token refresh pipeline failing.',
    meta: { Severity: 'P1', Reported: '07:15 UTC', Assignee: 'Alex Chen' },
  },
  {
    id: 'src-email',
    system: 'email' as SourceSystem,
    icon: Mail,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Email · VP Engineering',
    id2: 'EML-003',
    title: 'Escalation: EU Login Failures',
    snippet: '"The login service is still down for EU customers. I need a status update by 9 AM or I\'m escalating to the board."',
    meta: { Sender: 'VP Engineering', Received: '08:32 AM', Urgency: 'Critical' },
  },
  {
    id: 'src-slack',
    system: 'slack' as SourceSystem,
    icon: MessageSquare,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Slack · #escalations',
    id2: 'SLK-001',
    title: '#escalations thread',
    snippet: '@sarah seeing latency spikes on the auth cluster, might be related to the cert rotation we did on June 17.',
    meta: { Channel: '#escalations', Posted: '08:04 UTC', Mentions: '@alex' },
  },
  {
    id: 'src-meeting',
    system: 'meeting' as SourceSystem,
    icon: Users,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    label: 'Standup · June 19',
    id2: 'MTG-June19',
    title: 'Engineering Standup Note',
    snippet: 'Action item: @alex to investigate OAuth cert rotation and provide root cause analysis before EOD.',
    meta: { Meeting: 'Eng Standup', Date: 'Jun 19', Owner: 'Alex Chen' },
  },
];

// ── Correlation result ──────────────────────────────────────────────────────

const correlationResult = {
  owner:          'Alex Chen',
  deadline:       'Today, 09:00 AM',
  severity:       'P1',
  semanticMatch:  94,
  mergeDecision:  'MERGED',
  sharedSignals:  ['Owner (Alex Chen)', 'Auth service / EU-West-1', 'SLA window', 'Cert rotation Jun-17'],
  mergeReason:    'Jira P1 ticket + VP email escalation + Slack latency mention + standup action item all reference the same EU auth service failure. Merged into one unified work item.',
};

const unifiedTask = {
  title:         'Login Service Failure — EU Auth Degradation',
  taskId:        'TKT-6921',
  priorityScore: 96,
  priority:      'P1' as const,
  whyHighRank:   'Highest compound risk score: P1 severity + active VP escalation + SLA breach in 4h + blocks 2 downstream deployments.',
  contributions: [
    { source: 'jira',    label: 'Jira',    what: 'Severity classification, SLA window, reproduction steps' },
    { source: 'email',   label: 'Email',   what: 'VP escalation urgency, status deadline, customer tier' },
    { source: 'slack',   label: 'Slack',   what: 'Real-time cert rotation root-cause signal' },
    { source: 'meeting', label: 'Meeting', what: 'Owner assignment, EOD action item' },
  ] as Array<{ source: SourceSystem; label: string; what: string }>,
};

// ── Intelligence page ────────────────────────────────────────────────────────

export const Intelligence: React.FC = () => {
  const [animated, setAnimated] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)] text-[var(--text-primary)]">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white">Task Intelligence Pipeline</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl font-mono">
          End-to-end trace from raw source evidence → AI extraction → deduplication → ranked unified work item.
          This view proves every AI decision is grounded in traceable source data.
        </p>
      </div>

      {/* ── Pipeline Flow ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] p-5 bg-[var(--surface)]">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-4">Processing Pipeline</div>
        <div className="flex items-center gap-0">
          {pipelineSteps.map((step, i) => (
            <React.Fragment key={step.id}>
              <motion.div
                className="flex-1 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <div className="rounded-xl p-4 border border-[var(--border)] mx-1 bg-[var(--bg)]">
                  <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center bg-[var(--surface)] border border-[var(--border)]">
                    <div className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                  </div>
                  <div className="text-xs font-semibold text-white mb-0.5">{step.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight font-mono">{step.sub}</div>
                </div>
              </motion.div>
              {i < pipelineSteps.length - 1 && (
                <div className="flex-shrink-0 flex items-center px-1">
                  <div className="flex items-center gap-0.5">
                    <div className="w-4 h-px bg-[var(--border)]" />
                    <div className="w-0 h-0 border-t-2 border-b-2 border-l-4 border-transparent border-l-[var(--border)]" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ══ REAL EXAMPLE TRACE ══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={13} className="text-[var(--success)]" />
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Live Trace: TKT-6921 — Login Service Failure</span>
          <div className="flex-1 h-px bg-[var(--border)] ml-2" />
          <span className="text-[10px] font-mono text-[var(--success)] bg-[var(--success)]/5 border border-[var(--success)]/15 px-2 py-0.5 rounded">
            4 sources · merged · ranked #1
          </span>
        </div>

        <div className="grid grid-cols-[1fr_220px_1fr] gap-4">

          {/* ── LEFT: Source Evidence ──────────────────────────────── */}
          <div className="space-y-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold px-1">
              Source Evidence
            </div>
            {sourceCards.map((src, i) => (
              <motion.div
                key={src.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12 }}
              >
                {/* Card header */}
                <div className={cn('px-3.5 py-2 border-b border-[var(--border)] flex items-center gap-2', src.bg)} style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <src.icon size={11} className={src.color} />
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider font-mono', src.color)}>
                    {src.label}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono ml-auto">{src.id2}</span>
                </div>
                {/* Card body */}
                <div className="px-3.5 py-3 space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{src.title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-[var(--border)] pl-2">
                    "{src.snippet}"
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {Object.entries(src.meta).map(([k, v]) => (
                      <span key={k} className="text-[9px] font-mono text-slate-600">
                        <span className="text-slate-500">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── CENTER: Extraction + Correlation ────────────────────── */}
          <motion.div
            className="flex flex-col gap-4 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold text-center">
              Correlation
            </div>

            {/* Animated arrows */}
            <div className="flex flex-col gap-3 items-center">
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="flex items-center gap-1 text-slate-700"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-8 h-px bg-[var(--border)]" />
                  <ArrowRight size={10} className="text-[var(--success)]/40" />
                </motion.div>
              ))}
            </div>

            {/* Correlation engine box */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="text-[10px] font-bold text-[var(--success)] font-mono">Correlation Engine</span>
              </div>

              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Semantic match</span>
                  <span className="text-[var(--success)] font-bold">{correlationResult.semanticMatch}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner</span>
                  <span className="text-[var(--text-primary)]">{correlationResult.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deadline</span>
                  <span className="text-amber-400">{correlationResult.deadline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Severity</span>
                  <span className="text-red-400 font-bold">{correlationResult.severity}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <div className="text-[9px] text-slate-600 mb-1.5 uppercase tracking-widest">Shared signals</div>
                <div className="space-y-1">
                  {correlationResult.sharedSignals.map(s => (
                    <div key={s} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <CheckCircle size={8} className="text-[var(--success)] flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[9px] text-slate-500">Decision</span>
                <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 px-1.5 py-0.5 rounded font-mono">
                  <GitMerge size={8} className="inline mr-1" />
                  {correlationResult.mergeDecision}
                </span>
              </div>
            </div>

            {/* Merge reason */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[10px] text-slate-500 italic leading-relaxed">
              "{correlationResult.mergeReason}"
            </div>
          </motion.div>

          {/* ── RIGHT: Unified Action Item ────────────────────────────── */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold px-1">
              Unified Action Item
            </div>

            {/* Task output card */}
            <div
              className="rounded-lg border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'rgba(132,163,147,0.22)' }}
            >
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'rgba(132,163,147,0.04)' }}>
                <Zap size={12} className="text-[var(--success)]" />
                <span className="text-[10px] font-bold text-[var(--success)] uppercase tracking-widest">Priority Output</span>
                <span className="ml-auto text-[10px] font-mono text-slate-500">{unifiedTask.taskId}</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <PriorityBadge priority={unifiedTask.priority} />
                  <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">{unifiedTask.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">Priority Score:</span>
                  <span className="text-sm font-black font-mono text-red-400">{unifiedTask.priorityScore}</span>
                  <span className="text-[10px] text-slate-600">/ 100</span>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Why ranked #1</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{unifiedTask.whyHighRank}</p>
                </div>
              </div>
            </div>

            {/* Source contribution breakdown */}
            <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
              <div className="px-4 py-2.5 border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Source Contributions</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {unifiedTask.contributions.map((c) => (
                  <div key={c.source} className="px-4 py-2.5 flex items-start gap-2.5">
                    <SourcePill source={c.source} compact />
                    <p className="text-[11px] text-slate-400 leading-snug">{c.what}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trace actions */}
            <button
              onClick={() => setSelectedTask(tasks[0])}
              className="w-full py-2.5 rounded-lg border border-[var(--success)]/20 text-xs font-semibold text-[var(--success)] hover:bg-[var(--success)]/5 hover:border-[var(--success)]/35 transition-colors flex items-center justify-center gap-2 bg-[var(--success)]/4"
            >
              <Brain size={12} />
              View Full Explainability Reasoning
            </button>
          </motion.div>

        </div>
      </div>

      {/* ── Brief task table (compact, secondary) ──────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-3">
          <span className="text-xs font-semibold text-white">All Tasks</span>
          <span className="text-[10px] text-slate-500 font-mono">{tasks.length} tasks in queue</span>
          <div className="ml-auto text-[10px] font-mono text-[var(--success)]">
            {tasks.filter(t => t.isMerged).length} deduplicated across sources
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                {['Priority', 'ID', 'Task', 'Score', 'Sources', 'Deadline'].map(col => (
                  <th key={col} className="px-4 py-2.5 text-left">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{col}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tasks.map((task, i) => (
                <motion.tr
                  key={task.id}
                  className="hover:bg-white/2 transition-colors cursor-pointer group"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedTask(task)}
                >
                  <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{task.id}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] space-y-1">
                      <p className="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">
                        {task.title}
                      </p>
                      {task.isMerged && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[var(--success)] bg-[var(--success)]/8 border border-[var(--success)]/15 px-1.5 py-0.5 rounded">
                          <GitMerge size={8} /> Merged {task.sources.length} sources
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold" style={{ color: task.score >= 90 ? '#EF4444' : task.score >= 70 ? '#F59E0B' : '#22C55E' }}>
                      {task.score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {task.sources.slice(0, 3).map(s => <SourcePill key={s} source={s} compact />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 font-mono">{task.deadline ?? '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};
