import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Clock, Sparkles, Eye, Zap,
  CheckCircle, Activity, ChevronRight,
  ArrowRight, Mail, MessageSquare, Users, GitMerge,
  TrendingUp, ArrowUp,
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../../components/shared/PriorityBadge';
import { SourcePill } from '../../components/shared/SourcePill';
import { SlideOver } from '../../components/shared/SlideOver';
import { useCountdown, useCountUp } from '../../hooks';
import { cn, getGreeting } from '../../lib/utils';
import {
  alerts, sprintProgress, myTasks, delegatedTasks,
  hiddenDiscoveries, aiActions,
} from '../../data';
import type { Task, AlertSeverity, HiddenDiscovery, AIActionType } from '../../types';

// ── Config ─────────────────────────────────────────────────────────────────

const alertTypeConfig: Record<AlertSeverity, { label: string; color: string; bg: string; border: string }> = {
  incident:   { label: 'INCIDENT',   color: 'text-red-400',   bg: 'bg-red-500/8',   border: 'border-red-500/20'   },
  escalation: { label: 'ESCALATION', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
  system:     { label: 'SYSTEM',     color: 'text-blue-400',  bg: 'bg-blue-500/8',  border: 'border-blue-500/20'  },
  warning:    { label: 'WARNING',    color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
};

const discoveryStatusConfig: Record<HiddenDiscovery['status'], { label: string; color: string; bg: string; border: string }> = {
  'added-to-plan': { label: 'Added to plan',   color: 'text-[var(--success)]',  bg: 'bg-[var(--success)]/8',  border: 'border-[var(--success)]/20'  },
  'merged':        { label: 'Merged',          color: 'text-violet-400', bg: 'bg-violet-500/8', border: 'border-violet-500/20' },
  'awaiting-review':{ label: 'Awaiting review', color: 'text-amber-400',  bg: 'bg-amber-500/8',  border: 'border-amber-500/20'  },
};

const sourceIconMap: Record<string, React.ReactNode> = {
  email:   <Mail size={11} />,
  slack:   <MessageSquare size={11} />,
  meeting: <Users size={11} />,
};

const aiActionColor: Record<AIActionType, string> = {
  merge:   'text-violet-400',
  rerank:  'text-[var(--success)]',
  extract: 'text-blue-400',
  flag:    'text-amber-400',
  plan:    'text-teal-400',
};

// ── Sub-components ──────────────────────────────────────────────────────────

const DiscoveryCard: React.FC<{ d: HiddenDiscovery; idx: number; onOpen: (t: Task) => void }> = ({ d, idx }) => {
  const statusCfg = discoveryStatusConfig[d.status];
  const icon = sourceIconMap[d.source];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 + idx * 0.07 }}
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--surface)' }}
    >
      {/* Source header row */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'rgba(132,163,147,0.02)' }}>
        <SourcePill source={d.source} compact />
        <span className="text-[10px] font-mono text-[var(--text-muted)]">{d.sourceId}</span>
        <span className="text-[10px] text-[var(--text-secondary)]">{d.sourceLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono uppercase tracking-wide', statusCfg.color, statusCfg.bg, statusCfg.border)}>
            {d.status === 'merged' && d.mergedInto ? `Merged → ${d.mergedInto}` : statusCfg.label}
          </span>
          <span className="text-[10px] font-mono text-[var(--success)]">{d.confidence}% conf.</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Raw snippet */}
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic border-l-2 border-[var(--border)] pl-2">
          {d.snippet}
        </p>

        {/* Extracted action */}
        <div className="flex items-start gap-2">
          <Sparkles size={11} className="text-[var(--success)] mt-0.5 flex-shrink-0" />
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{d.actionItem}</p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {d.owner && (
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">Owner: <span className="text-[var(--text-primary)]">{d.owner}</span></span>
          )}
          {d.deadline && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-mono">
              <Clock size={9} className="text-[var(--text-muted)]" />
              {d.deadline}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SprintHealthWidget: React.FC = () => {
  const pct = Math.min(Math.round(sprintProgress.percentComplete), 100);
  const isOnTrack = sprintProgress.daysLeft > 1 && pct >= (100 - sprintProgress.daysLeft * 10);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-0.5">Sprint Progress</div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">{sprintProgress.sprintName}</div>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded font-mono border',
          isOnTrack ? 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        )}>
          {isOnTrack ? 'On Track' : 'At Risk'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-[var(--success)]" />
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Done</span>
            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{sprintProgress.completed}</span>
          </div>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Left</span>
            <span className="text-sm font-bold text-[var(--text-secondary)] font-mono">{sprintProgress.remaining}</span>
          </div>
          <div className="ml-auto text-xl font-bold font-mono text-[var(--text-primary)]">{pct}%</div>
        </div>

        {/* Segmented bar */}
        <div className="flex items-center gap-0.5 h-2">
          {Array.from({ length: sprintProgress.total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-full rounded-sm first:rounded-l last:rounded-r',
                i < sprintProgress.completed ? 'bg-[var(--success)]' : 'bg-[var(--bg)]'
              )}
            />
          ))}
        </div>

        {/* Days left */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-mono text-[10px] text-[var(--text-muted)]">
          <span>{sprintProgress.daysLeft} day{sprintProgress.daysLeft !== 1 ? 's' : ''} remaining</span>
          {sprintProgress.velocity && <span>~{sprintProgress.velocity} tasks/day</span>}
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const topTask = myTasks[0];
  const slaCountdown = useCountdown(topTask.slaDeadline!);
  const hoursSaved = useCountUp(14, 800, 400);

  const toggleChecked = (id: string) => {
    setCheckedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const agendaItems = [
    { id: 'ag-1', title: 'Investigate OAuth cert rotation root cause', source: 'jira' as const, dueTime: '09:30 AM', priority: 'P0' as const, status: 'blocked' as const },
    { id: 'ag-2', title: 'Coordinate with DevOps on EU-West-1 rollback', source: 'slack' as const, dueTime: '10:15 AM', priority: 'P1' as const, status: 'active' as const },
    { id: 'ag-3', title: 'Draft VP Engineering status update', source: 'email' as const, dueTime: '11:00 AM', priority: 'P1' as const, status: 'active' as const },
    { id: 'ag-4', title: 'Review SEC-132 security checklist', source: 'servicenow' as const, dueTime: '02:00 PM', priority: 'P1' as const, status: 'blocked' as const },
    { id: 'ag-5', title: 'Approve or request changes on PR #4092', source: 'github' as const, dueTime: '03:00 PM', priority: 'P1' as const, status: 'in-progress' as const },
  ];

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Main scroll area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[850px] mx-auto w-full">

          {/* ══ SECTION 1: GREETING & MONO STATUS STRIP ════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  {getGreeting()}, Alex
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  AI Chief of Staff has identified 3 hidden tasks today across 5 connected sources.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--success)]">
                <Clock size={11} />
                <span className="text-xs font-semibold">{hoursSaved}.5h saved today</span>
              </div>
            </div>

            {/* Mono Status Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2 px-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--success)] font-bold">[SYNCED]</span>
                <span className="text-[var(--text-secondary)]">5 connected streams — Jira · Email · Slack · ServiceNow · GitHub</span>
              </div>
              <span className="text-[var(--border)]">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--success)] font-bold">[EXTRACTED]</span>
                <span className="text-[var(--text-secondary)]">3 action items from unstructured sources</span>
              </div>
              <span className="text-[var(--border)]">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--success)] font-bold">[LATENCY]</span>
                <span className="text-[var(--text-secondary)]">last update 2 min ago</span>
              </div>
            </div>
          </motion.div>

          {/* ══ SECTION 2: HIDDEN WORK DISCOVERED TODAY ══════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Eye size={13} className="text-[var(--success)]" />
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Hidden Work Discovered Today</span>
              <div className="flex-1 h-px bg-[var(--border)] ml-1" />
              <span className="text-[9px] font-mono text-[var(--success)] bg-[var(--success)]/5 border border-[var(--success)]/15 px-1.5 py-0.5 rounded font-black">
                3 NEW
              </span>
            </div>

            <div className="space-y-2">
              {hiddenDiscoveries.map((d, i) => (
                <DiscoveryCard key={d.id} d={d} idx={i} onOpen={setSelectedTask} />
              ))}
            </div>
          </motion.div>

          {/* ══ SECTION 3: TOP 3 PRIORITIES TODAY (PRIMARY HERO) ═══════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Top Priorities Today</span>
              <div className="flex-1 h-px bg-[var(--border)] ml-3" />
            </div>

            <div className="space-y-3">
              {myTasks.slice(0, 3).map((task, i) => {
                const isFirst = i === 0;
                return (
                  <motion.div
                    layout
                    key={task.id}
                    className="rounded-xl p-5 border cursor-pointer transition-all duration-150"
                    style={{
                      background: 'var(--surface)',
                      borderColor: isFirst ? 'rgba(132, 163, 147, 0.22)' : 'var(--border)',
                      boxShadow: isFirst ? '0 4px 20px rgba(132, 163, 147, 0.05)' : 'none',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{
                      y: -2,
                      borderColor: 'rgba(132, 163, 147, 0.35)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ delay: 0.32 + i * 0.08, duration: 0.2 }}
                    onClick={() => setSelectedTask(task)}
                  >
                    {/* Rank change indicator for #1 */}
                    {isFirst && task.previousRank && task.previousRank !== task.rank && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowUp size={10} className="text-[var(--success)]" />
                        <span className="text-[9px] font-mono text-[var(--success)] bg-[var(--success)]/5 border border-[var(--success)]/15 px-1.5 py-0.5 rounded">
                          Re-ranked #{task.previousRank} → #{task.rank} after VP escalation
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug tracking-tight mb-2 flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-[var(--success)]">#{task.rank}</span>
                      {task.title}
                    </h3>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{task.id}</span>
                      {task.deadline && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] ml-2">
                          <Clock size={10} className="text-[var(--text-muted)]" />
                          <span>{task.deadline}</span>
                        </div>
                      )}
                      {isFirst && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-wide ml-2">
                          SLA Expires: {slaCountdown}
                        </div>
                      )}
                      <span className="text-[10px] text-[var(--success)] font-medium ml-auto">
                        {task.confidence}% confidence
                      </span>
                    </div>

                    {/* AI Rationale */}
                    <div
                      className="px-3 py-2 rounded border flex items-start gap-2 mb-3.5"
                      style={{
                        background: 'rgba(132, 163, 147, 0.04)',
                        borderColor: 'rgba(132, 163, 147, 0.12)',
                      }}
                    >
                      <Sparkles size={12} className="text-[var(--success)] mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-[var(--success)] leading-relaxed">
                        {task.aiRationale}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex gap-1.5">
                        {task.sources.map(s => <SourcePill key={s} source={s} compact />)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-2.5 py-1.5 rounded-md border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                          onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                        >
                          View Reasoning
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-md bg-[var(--success)]/15 hover:bg-[var(--success)]/25 text-[var(--success)] text-[11px] font-semibold transition-colors inline-flex items-center gap-1 border border-[var(--success)]/20"
                          onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                        >
                          Acknowledge & Open <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ══ SECTION 4: REST OF TODAY (COMPACT OPERATIONAL AGENDA) ════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Rest of Today</span>
                <span className="text-[9px] font-mono text-[var(--success)] bg-[var(--success)]/5 border border-[var(--success)]/15 px-1.5 py-0.5 rounded font-black">
                  AI-OPTIMIZED PLAN
                </span>
              </div>
              <div className="flex-1 h-px bg-[var(--border)] ml-3" />
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="divide-y divide-[var(--border)]">
                {agendaItems.map((item) => {
                  const isChecked = checkedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "px-4 py-3 flex items-center justify-between gap-4 transition-all duration-150",
                        isChecked ? "opacity-35" : ""
                      )}
                    >
                      {/* Checkbox + Title */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleChecked(item.id)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-all duration-100 flex-shrink-0 cursor-pointer",
                            isChecked
                              ? "bg-[var(--success)] border-[var(--success)] text-[var(--bg)]"
                              : "border-[var(--border)] hover:border-[var(--success)]/50"
                          )}
                        >
                          {isChecked && <span className="text-[9px] font-bold">✓</span>}
                        </button>
                        <span className={cn(
                          "text-xs font-medium leading-snug truncate transition-all duration-100",
                          isChecked ? "text-[var(--text-muted)] line-through font-normal" : "text-[var(--text-primary)]"
                        )}>
                          {item.title}
                        </span>
                      </div>

                      {/* Source + Due Time + Pill */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <SourcePill source={item.source} compact />
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border)] whitespace-nowrap">
                          {item.dueTime}
                        </span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* ══ SECTION 5: TASKS AFFECTING ME (INDIRECT BLOCKERS) ════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Tasks Affecting Me</span>
              <div className="flex-1 h-px bg-[var(--border)] ml-3" />
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">Indirect Blockers</span>
            </div>

            <div className="space-y-2">
              {delegatedTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  className="rounded-xl border p-4 cursor-pointer relative"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                  whileHover={{ x: 2, borderColor: 'var(--border-strong)' }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{task.id}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Owner: {task.owner.split(' ')[0]}</span>
                  </div>

                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate mb-2">
                    {task.title}
                  </h4>

                  <div className="px-2.5 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2">
                    <AlertTriangle size={11} className="text-[#D1A775] mt-0.5 flex-shrink-0" />
                    <p className="text-[10.5px] text-[var(--text-secondary)] leading-tight">
                      <span className="text-[#D1A775] font-semibold">Impact: </span>
                      {task.delegatedReason}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Right Sidebar — Sprint + Alerts + AI Actions ────────────────── */}
      <div
        className="w-[272px] flex-shrink-0 flex flex-col border-l border-[var(--border)] overflow-y-auto"
        style={{ background: 'var(--bg)' }}
      >
        <div className="p-4 space-y-5">

          {/* Sprint Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Sprint Health</span>
              <span className="text-[10px] font-mono text-[var(--success)] font-bold">80% complete</span>
            </div>
            <SprintHealthWidget />
          </div>

          {/* Urgent Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-[var(--text-muted)]" />
                <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Operational Alerts</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)] font-mono">LIVE FEED</span>
            </div>

            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => {
                const isIncident = alert.type === 'incident';
                const isEscalation = alert.type === 'escalation';
                const iconColor = isIncident ? 'text-[#E08585]' : isEscalation ? 'text-[#D1A775]' : 'text-[#85A7E0]';
                const iconBg = isIncident ? 'bg-[#E08585]/10' : isEscalation ? 'bg-[#D1A775]/10' : 'bg-[#85A7E0]/10';

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg p-3 border border-[var(--border)] bg-[var(--surface)] space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", iconBg)}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isIncident ? "bg-[#E08585]" : isEscalation ? "bg-[#D1A775]" : "bg-[#85A7E0]")} />
                      </div>
                      <span className={cn('text-[9px] font-mono uppercase font-black', iconColor)}>{alert.type}</span>
                      <span className="text-[9px] text-[var(--text-muted)] ml-auto font-mono">{alert.timeAgo}</span>
                    </div>
                    <h5 className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{alert.title}</h5>
                    <p className="text-[10.5px] text-[var(--text-secondary)] leading-snug">{alert.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Actions Taken */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <GitMerge size={11} className="text-[var(--text-muted)]" />
              <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">AI Actions Taken</span>
              <div className="flex items-center gap-1 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] block dot-pulse" />
                <span className="text-[9px] font-mono text-[var(--success)] uppercase font-black">Live</span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="divide-y divide-[var(--border)]">
                {aiActions.map((action) => (
                  <div key={action.id} className="px-3 py-2.5 flex items-start gap-2.5">
                    <span className={cn('text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] flex-shrink-0 mt-0.5', aiActionColor[action.type])}>
                      {action.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10.5px] text-[var(--text-secondary)] leading-snug">{action.detail}</p>
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">{action.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sync status */}
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2" style={{ background: 'rgba(132,163,147,0.02)' }}>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Sync Engine Status</span>
            <div className="space-y-1 text-[10.5px] font-mono text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Deduplication Agent:</span>
                <span className="text-[var(--success)]">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>Priority Scoring Engine:</span>
                <span className="text-[var(--success)]">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync Latency:</span>
                <span className="text-[var(--text-muted)]">0.12s</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Explainability Slide-over */}
      <SlideOver task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};
