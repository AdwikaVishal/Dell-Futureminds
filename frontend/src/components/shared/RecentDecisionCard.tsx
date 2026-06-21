/**
 * RecentDecisionCard — a single AI reprioritization event.
 * Accepts RecentDecision from props — no mock-data coupling.
 * Designed as a live operational feed entry.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { RecentDecision } from '../../types';
import { cn } from '../../lib/utils';

interface RecentDecisionCardProps {
  decision: RecentDecision;
  index?: number;
  className?: string;
}

export const RecentDecisionCard: React.FC<RecentDecisionCardProps> = ({
  decision,
  index = 0,
  className,
}) => {
  const isNew = decision.direction === 'new';
  const isUp = decision.direction === 'up';

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--elevated)]/25 transition-colors duration-300',
        className
      )}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.08 }}
    >
      {/* Rank change indicator */}
      {isNew ? (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)] flex-shrink-0">
          NEW
        </span>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          {isUp
            ? <ArrowUp size={11} className="text-[var(--success)]" />
            : <ArrowDown size={11} className="text-[var(--danger)]" />
          }
          {decision.oldRank !== null && (
            <span className="text-[10px] font-mono text-[var(--text-muted)] line-through">
              #{decision.oldRank}
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-mono font-bold',
              isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            #{decision.newRank}
          </span>
        </div>
      )}

      {/* Task name */}
      <span className="text-xs text-[var(--text-secondary)] flex-1 min-w-0 truncate">
        {decision.taskName}
      </span>

      {/* Reason */}
      <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0 truncate max-w-[70px] opacity-80" title={decision.reason}>
        {decision.reason}
      </span>
    </motion.div>
  );
};
