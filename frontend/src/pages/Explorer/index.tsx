import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowUpDown, Download, Trash2, CheckSquare,
  ChevronDown, ChevronRight, Sparkles, GitMerge, ExternalLink,
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../../components/shared/PriorityBadge';
import { SourcePill } from '../../components/shared/SourcePill';
import { SlideOver } from '../../components/shared/SlideOver';
import { tasks } from '../../data';
import type { Task } from '../../types';
import { cn } from '../../lib/utils';

// ── Helpers ─────────────────────────────────────────────────────────────────

const sourceStyle = (sys: string) => {
  const map: Record<string, string> = {
    jira:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
    github:     'bg-slate-500/10 text-slate-300 border-slate-500/20',
    slack:      'bg-green-500/10 text-green-400 border-green-500/20',
    email:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
    servicenow: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    meeting:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return map[sys] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

// ── Inline Dedup Evidence Block ─────────────────────────────────────────────

const DedupEvidenceBlock: React.FC<{ task: Task; onViewReasoning: () => void }> = ({ task, onViewReasoning }) => {
  const srcA = task.sourceEvidence[0];
  const srcB = task.sourceEvidence[1] ?? task.sourceEvidence[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="px-5 py-5 space-y-4"
      style={{ background: 'rgba(28, 37, 33, 0.4)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitMerge size={13} className="text-[var(--success)]" />
        <span className="text-[11px] font-bold text-[var(--success)] uppercase tracking-wider font-mono">
          AI Deduplication Trace — Source Evidence Correlation
        </span>
      </div>

      {/* 3-column evidence layout */}
      <div className="grid grid-cols-[1fr_200px_1fr] gap-3 items-start">

        {/* Source A */}
        <div className="rounded-lg border border-[var(--border)] p-3.5 space-y-2.5 bg-[var(--bg)]">
          <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-semibold">Source A</div>
          {srcA && (
            <>
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider', sourceStyle(srcA.system))}>
                  {srcA.system}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{srcA.id}</span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">{srcA.label}</div>
              {srcA.snippet && (
                <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed border-l-2 border-[var(--border)] pl-2 line-clamp-3">
                  "{srcA.snippet}"
                </p>
              )}
            </>
          )}
        </div>

        {/* Center — Merge Reasoning */}
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="w-full h-px bg-[var(--border)]" />
          <div className="text-center space-y-2 px-2">
            <div className="px-2.5 py-1 rounded bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-[10px] font-bold font-mono text-center">
              {task.dedupConfidence ?? 92}% Match
            </div>
            <div className="space-y-1 text-[9px] text-[var(--text-muted)] font-mono text-center">
              <div className="font-semibold text-[var(--text-secondary)]">Shared signals:</div>
              <div>Owner · Severity · System</div>
              <div>Timeline · SLA window</div>
            </div>
            {task.dedupReason && (
              <p className="text-[10px] text-[var(--text-secondary)] leading-normal text-center">
                {task.dedupReason}
              </p>
            )}
          </div>
          <div className="w-full h-px bg-[var(--border)]" />
        </div>

        {/* Source B */}
        <div className="rounded-lg border border-[var(--border)] p-3.5 space-y-2.5 bg-[var(--bg)]">
          <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-semibold">Source B</div>
          {srcB && (
            <>
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider', sourceStyle(srcB.system))}>
                  {srcB.system}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{srcB.id}</span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">{srcB.label}</div>
              {srcB.snippet && (
                <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed border-l-2 border-[var(--border)] pl-2 line-clamp-3">
                  "{srcB.snippet}"
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unified task summary card */}
      <div className="rounded-lg border border-[var(--success)]/20 p-3.5 bg-[var(--success)]/4 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[9px] text-[var(--success)] uppercase tracking-widest font-mono font-semibold">Unified Task Output</div>
          <div className="text-xs font-bold text-[var(--text-primary)]">{task.title}</div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-mono">
            <span>{task.sources.length} sources merged</span>
            <span className="text-[var(--border)]">·</span>
            <span>{task.dedupConfidence ?? 92}% confidence</span>
          </div>
        </div>
        <button
          onClick={onViewReasoning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--success)] border border-[var(--success)]/20 hover:border-[var(--success)]/40 hover:bg-[var(--success)]/8 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <ExternalLink size={11} />
          View reasoning
        </button>
      </div>
    </motion.div>
  );
};

// ── Explorer Page ────────────────────────────────────────────────────────────

export const Explorer: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = tasks.filter(t => {
    const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchPriority && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Task Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{filtered.length} tasks · {selected.length} selected · {tasks.filter(t => t.isMerged).length} deduplicated</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/5 transition-colors bg-[var(--surface)]">
                <Trash2 size={11} /> Bulk Delete
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-[var(--border)] hover:bg-white/4 transition-colors bg-[var(--surface)]">
                <Download size={11} /> Export {selected.length}
              </button>
            </motion.div>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-[var(--border)] hover:bg-white/4 transition-colors" style={{ background: 'var(--surface)' }}>
            <Download size={11} /> Export All
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="pl-7 pr-3 py-1.5 rounded-lg text-xs text-slate-300 placeholder-slate-700 outline-none border border-[var(--border)] w-48 bg-[var(--surface)]"
            placeholder="Search tasks, IDs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 border border-[var(--border)] bg-[var(--surface)] outline-none cursor-pointer"
          value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="P0">P0 Critical</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>
        <select className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 border border-[var(--border)] bg-[var(--surface)] outline-none cursor-pointer"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="sla-risk">SLA Risk</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 border border-[var(--border)] bg-[var(--surface)] hover:text-white transition-colors">
          <Filter size={11} /> More Filters
        </button>
        {(filterPriority !== 'all' || filterStatus !== 'all' || searchQuery) && (
          <button onClick={() => { setFilterPriority('all'); setFilterStatus('all'); setSearchQuery(''); }}
            className="text-xs text-[var(--success)] hover:text-[#A5C0B2] transition-colors">
            Clear all
          </button>
        )}

        {/* Dedup legend */}
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--success)]/15 bg-[var(--success)]/4 text-[10px] font-mono text-[var(--success)]">
          <GitMerge size={11} />
          <span>{tasks.filter(t => t.isMerged).length} tasks deduplicated across sources</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden flex-1 bg-[var(--surface)]">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                <th className="w-8 px-2 py-3"></th>
                <th className="w-10 px-4 py-3">
                  <CheckSquare size={13} className="text-slate-600" />
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Rank</span>
                </th>
                {[
                  { label: 'Priority' }, { label: 'ID' }, { label: 'Task Name' },
                  { label: 'Score' }, { label: 'Status' }, { label: 'Owner' },
                  { label: 'Sources' }, { label: 'SLA / Deadline' }, { label: 'Confidence' },
                ].map(col => (
                  <th key={col.label} className="px-3 py-3 text-left">
                    <button className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-widest font-semibold hover:text-slate-400 transition-colors whitespace-nowrap">
                      {col.label} <ArrowUpDown size={8} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((task, i) => {
                const isExpanded = expandedTasks.includes(task.id);
                return (
                  <React.Fragment key={task.id}>
                    <motion.tr
                      className={cn(
                        'group transition-colors border-b border-[var(--border)] last:border-b-0',
                        task.isMerged
                          ? 'bg-[var(--elevated)]/40 border-l-[3px] border-l-[var(--success)]'
                          : 'hover:bg-white/2',
                        selected.includes(task.id) && 'bg-[var(--success)]/4'
                      )}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      {/* Expansion Chevron */}
                      <td className="px-2 py-3.5 text-center">
                        {task.isMerged && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                            className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-[var(--success)] transition-colors cursor-pointer"
                            title="Show deduplication evidence"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3.5" onClick={e => { e.stopPropagation(); toggleSelect(task.id); }}>
                        <div className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer',
                          selected.includes(task.id) ? 'bg-[var(--success)] border-[var(--success)]' : 'border-white/12 hover:border-[var(--success)]/40')}>
                          {selected.includes(task.id) && <span className="text-[var(--bg)] text-[8px] font-bold">✓</span>}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {task.previousRank && task.previousRank !== task.rank && (
                            <span className={cn('text-[9px]', task.rank < task.previousRank ? 'text-[var(--success)]' : 'text-red-400')}>
                              {task.rank < task.previousRank ? '↑' : '↓'}
                            </span>
                          )}
                          <span className="font-mono text-xs text-slate-400">#{task.rank}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-3 py-3.5 font-mono text-[11px] text-slate-600">{task.id}</td>

                      <td className="px-4 py-3.5">
                        <span
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-semibold text-slate-300 hover:text-[var(--success)] hover:underline transition-colors cursor-pointer block line-clamp-1 max-w-[200px]"
                        >
                          {task.title}
                        </span>
                        {task.isMerged && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20 font-mono">
                              <GitMerge size={8} /> Merged from {task.sources.length} sources
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              ({task.dedupConfidence}% match)
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="font-mono text-xs font-bold" style={{ color: task.score >= 90 ? '#EF4444' : task.score >= 70 ? '#F59E0B' : '#22C55E' }}>
                          {task.score}
                        </span>
                      </td>

                      <td className="px-3 py-3.5"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap">{task.owner.split(' ')[0]}</td>

                      <td className="px-3 py-3.5">
                        <div className="flex gap-1">
                          {task.sources.slice(0, 3).map(s => <SourcePill key={s} source={s} compact />)}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-[11px] text-slate-500 whitespace-nowrap font-mono">{task.deadline ?? '—'}</td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${task.confidence}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-600">{task.confidence}%</span>
                        </div>
                      </td>
                    </motion.tr>

                    {/* Inline dedup evidence — full-width row */}
                    <AnimatePresence>
                      {task.isMerged && isExpanded && (
                        <tr className="border-b border-[var(--border)]">
                          <td colSpan={12} className="p-0 border-l-[3px] border-l-[var(--success)]">
                            <DedupEvidenceBlock
                              task={task}
                              onViewReasoning={() => setSelectedTask(task)}
                            />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};
