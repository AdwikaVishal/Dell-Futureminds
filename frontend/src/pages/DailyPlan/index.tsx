import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, RefreshCw, AlertTriangle, CheckCircle, Users, Brain,
  ArrowUp, Zap, Shield, BarChart3,
} from 'lucide-react';
import { PriorityBadge } from '../../components/shared/PriorityBadge';
import { dailyPlan, planChanges } from '../../data';
import { cn } from '../../lib/utils';

const periodColors = {
  morning:   { dot: 'bg-amber-500',  border: 'border-amber-500/20',  badge: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
  afternoon: { dot: 'bg-[var(--success)]',  border: 'border-[var(--success)]/20',  badge: 'text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20' },
  evening:   { dot: 'bg-slate-600',  border: 'border-slate-500/20',  badge: 'text-slate-400 bg-slate-500/10 border border-slate-500/20' },
};

// Execution progress stats (static demo data)
const execStats = [
  { label: 'Blocks Completed', value: '2 / 5',    color: 'text-[var(--success)]' },
  { label: 'Tasks Done',       value: '7',         color: 'text-[var(--text-primary)]' },
  { label: 'Blocked Items',    value: '2',         color: 'text-amber-400'  },
  { label: 'Plan Adherence',   value: '74%',       color: 'text-[var(--success)]'  },
];

export const DailyPlan: React.FC = () => {
  const [checkedBlocks, setCheckedBlocks] = useState<string[]>([]);

  const toggleBlock = (id: string) => {
    setCheckedBlocks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg)] text-[var(--text-primary)] space-y-5">

      {/* ── Plan Re-optimized Alert Banner ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'rgba(132,163,147,0.25)' }}
      >
        {/* Banner header */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-[var(--border)]" style={{ background: 'rgba(132,163,147,0.04)' }}>
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-[var(--success)]" />
            <span className="text-xs font-bold text-[var(--success)] uppercase tracking-widest">
              Plan Re-optimized
            </span>
          </div>
          <div className="h-3.5 w-px bg-[var(--border)]" />
          <p className="text-xs text-[var(--text-primary)] font-medium">
            New P1 defect detected — plan re-generated 2 min ago
          </p>
          <span className="ml-auto text-[10px] font-mono text-[var(--text-muted)]">08:04 UTC</span>
        </div>

        {/* Plan changes strip */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {planChanges.map((change, i) => (
            <div key={change.id} className="flex items-start gap-2">
              <ArrowUp size={10} className="text-[var(--success)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">{change.description}</p>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">{change.time}</span>
              </div>
              {i < planChanges.length - 1 && (
                <span className="ml-3 text-[var(--border)]">·</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-mono">Executive Operating Plan</div>
          <h1 className="text-xl font-bold text-white">Daily Plan</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Friday</div>
            <div className="text-sm font-semibold text-slate-400">Jun 20, 2026</div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--success)]/20 bg-[var(--surface)] text-[var(--success)] text-xs font-semibold hover:bg-[var(--success)]/8 hover:border-[var(--success)]/35 transition-colors">
            <RefreshCw size={11} />
            Re-Optimize
          </button>
        </div>
      </div>

      {/* ── Execution Progress Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {execStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 font-mono">{stat.label}</div>
            <div className={cn('text-2xl font-bold font-mono', stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Focus stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Focus Time', value: '4.5h', color: 'text-[var(--text-primary)]' },
          { label: 'Meetings',         value: '2.5h', color: 'text-amber-400'  },
          { label: 'Est. Completion',  value: '17:00', color: 'text-[var(--success)]'  },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-mono">{stat.label}</div>
            <div className={cn('text-xl font-bold font-mono', stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Timeline Blocks ────────────────────────────────────────────── */}
      <div className="relative space-y-4 max-w-3xl">
        {/* Vertical timeline line */}
        <div className="absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-[var(--border)] to-transparent" />

        {dailyPlan.map((block, i) => {
          const colors = periodColors[block.period];
          const isChecked = checkedBlocks.includes(block.id);

          return (
            <motion.div
              key={block.id}
              className="flex gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center flex-shrink-0 pt-5">
                <div className={cn('w-3.5 h-3.5 rounded-full border-2 border-[var(--bg)] flex-shrink-0 z-10', colors.dot)} />
                <div className="text-[10px] font-mono text-slate-500 mt-2 whitespace-nowrap">
                  {block.timeRange.split('–')[0].trim()}
                </div>
              </div>

              {/* Block card */}
              <div
                className={cn(
                  'flex-1 rounded-xl border overflow-hidden border-[var(--border)] bg-[var(--surface)] transition-opacity',
                  isChecked && 'opacity-50'
                )}
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleBlock(block.id)}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center mt-1 flex-shrink-0 transition-all cursor-pointer',
                      isChecked ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--border)] hover:border-[var(--success)]/50'
                    )}
                  >
                    {isChecked && <span className="text-[9px] font-bold text-[var(--bg)]">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <PriorityBadge priority={block.priority} />
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide font-mono', colors.badge)}>
                        {block.period}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">{block.timeRange}</span>
                    </div>
                    <h2 className={cn('text-base font-bold leading-snug', isChecked ? 'text-slate-500 line-through' : 'text-white')}>
                      {block.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{block.description}</p>
                  </div>

                  {/* Duration chip */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 bg-[var(--bg)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
                    <Clock size={12} className="text-slate-500" />
                    <span className="text-xs font-mono text-slate-400">{block.effort}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-[var(--border)] border-t border-[var(--border)]">
                  {/* Sub-tasks */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <CheckCircle size={11} className="text-[var(--success)]" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">Sub-tasks / Scope</span>
                    </div>
                    <ul className="space-y-2">
                      {block.tasks.map((task, ti) => (
                        <li key={ti} className="flex items-start gap-2">
                          <div className="w-3.5 h-3.5 rounded border border-[var(--border)] bg-[var(--bg)] flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-400 leading-snug">{task}</span>
                        </li>
                      ))}
                    </ul>

                    {block.dependencies && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertTriangle size={10} className="text-amber-400" />
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-semibold font-mono">Dependencies</span>
                        </div>
                        {block.dependencies.map(dep => (
                          <span key={dep} className="inline-flex items-center gap-1 mr-1.5 mb-1 text-[10px] text-amber-400/80 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded font-mono">
                            <AlertTriangle size={8} /> {dep}
                          </span>
                        ))}
                      </div>
                    )}

                    {block.attendees && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Users size={10} className="text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-mono">+ {block.attendees} Attendees</span>
                      </div>
                    )}
                  </div>

                  {/* AI Rationale */}
                  <div className="px-5 py-4" style={{ background: 'rgba(132, 163, 147, 0.02)' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Brain size={11} className="text-[var(--success)]" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">AI Rationale</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed italic">"{block.aiRationale}"</p>
                    <div className="mt-3 flex items-center gap-2 font-mono">
                      <span className="text-[10px] text-slate-600">Effort</span>
                      <span className="text-[10px] font-medium text-slate-400">{block.effort}</span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-slate-600">Impact</span>
                      <span className={cn('text-[10px] font-medium',
                        block.impact === 'High' ? 'text-red-400' : block.impact === 'Medium' ? 'text-amber-400' : 'text-slate-500')}>
                        {block.impact}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
