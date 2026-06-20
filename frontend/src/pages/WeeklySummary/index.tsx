import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Clock, AlertTriangle, Archive, TrendingUp,
  Eye, GitMerge, Timer, Zap, Copy, Check,
} from 'lucide-react';
import { PriorityBadge } from '../../components/shared/PriorityBadge';
import { SourcePill } from '../../components/shared/SourcePill';
import { useCountUp } from '../../hooks';
import { cn } from '../../lib/utils';

const standupLines = [
  { icon: CheckCircle, color: 'text-[var(--success)]', text: 'Resolved 2 critical incidents (payment gateway timeout + auth service 503 errors)' },
  { icon: Eye,         color: 'text-violet-400', text: 'Surfaced 11 hidden tasks from inboxes, Slack, and meeting notes via AI extraction' },
  { icon: GitMerge,    color: 'text-teal-400',   text: 'Merged 6 duplicate work items across Jira, GitHub, and email sources' },
  { icon: AlertTriangle, color: 'text-amber-400', text: 'Prevented 3 escalations via proactive SLA breach detection and alerting' },
  { icon: Archive,     color: 'text-slate-400',  text: 'Deferred 2 low-priority tasks due to dependency risk (DB migration blocker)' },
];

const STANDUP_TEXT = `This Week at a Glance — Jun 13–19, 2026

• Resolved 2 critical incidents (payment gateway timeout + auth service 503 errors)
• Surfaced 11 hidden tasks from inboxes, Slack, and meeting notes via AI extraction
• Merged 6 duplicate work items across Jira, GitHub, and email sources
• Prevented 3 escalations via proactive SLA breach detection and alerting
• Deferred 2 low-priority tasks due to dependency risk (DB migration blocker)`;

const sections = [
  {
    id: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-[var(--success)]',
    items: [
      { id: 'c1', title: 'Resolved payment gateway timeout (EU-West-2)',           priority: 'P0' as const, effort: '4h',   impact: 'High',   source: 'jira' as const    },
      { id: 'c2', title: 'Deployed auth service hotfix v3.1.4',                   priority: 'P1' as const, effort: '2h',   impact: 'High',   source: 'github' as const  },
      { id: 'c3', title: 'Completed Q2 retrospective documentation',               priority: 'P2' as const, effort: '1.5h', impact: 'Medium', source: 'meeting' as const },
      { id: 'c4', title: 'Reviewed and merged security dependency updates',        priority: 'P2' as const, effort: '1h',   impact: 'Medium', source: 'github' as const  },
    ],
  },
  {
    id: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-amber-500',
    items: [
      { id: 'ip1', title: 'Login Service Failure — root cause analysis',           priority: 'P1' as const, effort: '3h',  impact: 'High',   source: 'jira' as const },
      { id: 'ip2', title: 'Q3 Financial Reporting Data Pipeline optimization',     priority: 'P2' as const, effort: '2h',  impact: 'Medium', source: 'jira' as const },
    ],
  },
  {
    id: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'text-red-400',
    items: [
      { id: 'bl1', title: 'Database Migration Approval — awaiting security sign-off', priority: 'P1' as const, effort: '2d', impact: 'High', source: 'github' as const },
    ],
  },
  {
    id: 'deferred', label: 'Deferred', icon: Archive, color: 'text-slate-500',
    items: [
      { id: 'd1', title: 'Mobile app performance optimization sprint',             priority: 'P2' as const, effort: '5d', impact: 'Medium', source: 'jira' as const  },
      { id: 'd2', title: 'Internal tooling documentation refresh',                 priority: 'P3' as const, effort: '3h', impact: 'Low',    source: 'email' as const },
    ],
  },
];

export const WeeklySummary: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const completedCount  = useCountUp(23, 900, 100);
  const resolvedCount   = useCountUp(7,  900, 200);
  const discoveredCount = useCountUp(11, 900, 300);
  const hoursSaved      = useCountUp(14, 900, 400);

  const handleCopy = () => {
    navigator.clipboard.writeText(STANDUP_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const impactCards = [
    { label: 'Tasks Completed',         value: completedCount,  suffix: '',    icon: CheckCircle,  color: 'text-[var(--success)]'  },
    { label: 'Critical Issues Resolved', value: resolvedCount,   suffix: '',    icon: Zap,          color: 'text-[var(--success)]'  },
    { label: 'Hidden Tasks Discovered', value: discoveredCount, suffix: '',    icon: Eye,          color: 'text-violet-400' },
    { label: 'Hours Saved',             value: hoursSaved,      suffix: '.5h', icon: Timer,        color: 'text-amber-400'  },
    { label: 'Duplicates Merged',       value: 6,               suffix: '',    icon: GitMerge,     color: 'text-teal-400'   },
    { label: 'Escalations Prevented',   value: 3,               suffix: '',    icon: TrendingUp,   color: 'text-rose-400'   },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="max-w-4xl space-y-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-mono">Jun 13 – Jun 19, 2026</div>
          <h1 className="text-xl font-bold text-white">Weekly Summary</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">AI-generated summary of your week's work, impact, and agent activity.</p>
        </div>

        {/* ══ THIS WEEK AT A GLANCE — Standup Block ════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'rgba(132,163,147,0.22)' }}
        >
          {/* Section header */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between" style={{ background: 'rgba(132,163,147,0.03)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-[var(--success)]" />
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">This Week at a Glance</span>
              <span className="text-[10px] font-mono text-[var(--success)] bg-[var(--success)]/8 border border-[var(--success)]/15 px-1.5 py-0.5 rounded ml-1">
                Standup-ready
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                copied
                  ? 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30'
                  : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--success)]/30 hover:text-[var(--success)] hover:bg-[var(--success)]/5'
              )}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy for Standup'}
            </button>
          </div>

          {/* Bullet insights */}
          <div className="px-5 py-5 space-y-3">
            {standupLines.map((line, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
              >
                <div className={cn('flex-shrink-0 mt-0.5', line.color)}>
                  <line.icon size={13} />
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-snug">{line.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Impact Metric Cards ───────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-[var(--success)]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Impact Delivered</span>
            <div className="flex-1 h-px bg-[var(--border)] ml-2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {impactCards.map((card, i) => (
              <motion.div
                key={card.label}
                className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
              >
                <card.icon size={14} className={cn(card.color, 'mb-2')} />
                <div className={cn('text-2xl font-bold font-mono', card.color)}>
                  {card.value}{card.suffix}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">{card.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Task Sections ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {sections.map((section, si) => (
            <motion.div
              key={section.id}
              className="rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--surface)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + si * 0.1 }}
            >
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--surface)]">
                <section.icon size={13} className={section.color} />
                <span className="text-sm font-semibold text-white">{section.label}</span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] font-mono">
                  {section.items.length}
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {section.items.map((item, ii) => (
                  <motion.div
                    key={item.id}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--elevated)]/30 transition-colors"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + si * 0.1 + ii * 0.05 }}
                  >
                    <PriorityBadge priority={item.priority} />
                    <span className="flex-1 text-xs font-semibold text-slate-300 min-w-0 truncate">{item.title}</span>
                    <SourcePill source={item.source} compact />
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-shrink-0 font-mono">
                      <span>Est. {item.effort}</span>
                      <span className={cn('font-medium',
                        item.impact === 'High' ? 'text-red-400' :
                        item.impact === 'Medium' ? 'text-amber-400' : 'text-slate-500')}>
                        {item.impact}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};
