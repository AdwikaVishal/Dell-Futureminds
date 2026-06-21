import React from 'react';
import { cn } from '../../lib/utils';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; bg: string; text: string; dot: string }> = {
  P0: { label: 'P0 CRITICAL', bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  P1: { label: 'P1', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  P2: { label: 'P2', bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  P3: { label: 'P3', bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const config = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold tracking-wide', config.bg, config.text, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  blocked: { label: 'BLOCKED', bg: 'bg-red-500/12', text: 'text-red-400' },
  'sla-risk': { label: 'SLA RISK', bg: 'bg-amber-500/12', text: 'text-amber-400' },
  active: { label: 'ACTIVE', bg: 'bg-blue-500/12', text: 'text-blue-400' },
  'in-progress': { label: 'IN PROGRESS', bg: 'bg-blue-500/12', text: 'text-blue-400' },
  completed: { label: 'COMPLETED', bg: 'bg-green-500/12', text: 'text-green-400' },
  deferred: { label: 'DEFERRED', bg: 'bg-slate-500/12', text: 'text-slate-400' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] ?? { label: status.toUpperCase(), bg: 'bg-slate-500/12', text: 'text-slate-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide', config.bg, config.text, className)}>
      {config.label}
    </span>
  );
};
