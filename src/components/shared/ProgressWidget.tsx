/**
 * ProgressWidget — Sprint/milestone progress tracker.
 * Clean enterprise style — no circular charts.
 * Accepts SprintProgress data from props (API-ready).
 */
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';
import type { SprintProgress } from '../../types';
import { cn } from '../../lib/utils';

interface ProgressWidgetProps {
  sprint: SprintProgress;
  className?: string;
}

export const ProgressWidget: React.FC<ProgressWidgetProps> = ({ sprint, className }) => {
  const pct = Math.min(Math.round(sprint.percentComplete), 100);
  const isOnTrack = sprint.daysLeft > 1 && pct >= (100 - sprint.daysLeft * 10);

  return (
    <div
      className={cn('rounded-xl border border-[var(--border)] overflow-hidden transition-colors duration-300', className)}
      style={{ background: 'var(--surface)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between transition-colors duration-300">
        <div>
          <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold mb-0.5 font-mono">
            Sprint Progress
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{sprint.sprintName}</span>
        </div>
        <span
          className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded font-mono transition-colors',
            isOnTrack ? 'text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
          )}
        >
          {isOnTrack ? 'On Track' : 'At Risk'}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-[var(--success)]" />
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">Completed</span>
            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{sprint.completed}</span>
          </div>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[var(--text-secondary)]" />
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">Remaining</span>
            <span className="text-sm font-bold text-[var(--text-secondary)] font-mono">{sprint.remaining}</span>
          </div>
          <div className="ml-auto text-xl font-bold font-mono text-[var(--text-primary)]">
            {pct}%
          </div>
        </div>

        {/* Progress bar — segmented for completed vs remaining */}
        <div>
          <div className="flex items-center gap-0.5 h-2">
            {Array.from({ length: sprint.total }).map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'flex-1 h-full rounded-sm first:rounded-l last:rounded-r transition-colors',
                  i < sprint.completed ? 'bg-[var(--success)]' : 'bg-[var(--bg)]'
                )}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5 font-mono">
            <span className="text-[9px] text-[var(--text-muted)]">0</span>
            <span className="text-[9px] text-[var(--text-muted)]">{sprint.total} tasks</span>
          </div>
        </div>

        {/* Days left */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] transition-colors duration-300">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
            {sprint.daysLeft} day{sprint.daysLeft !== 1 ? 's' : ''} remaining
          </span>
          {sprint.velocity !== undefined && (
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
              ~{sprint.velocity} tasks/day
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
