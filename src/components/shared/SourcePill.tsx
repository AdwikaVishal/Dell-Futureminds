import React from 'react';
import { cn } from '../../lib/utils';
import type { SourceSystem } from '../../types';

const sourceConfig: Record<SourceSystem, { label: string; short: string; bg: string; text: string; border: string }> = {
  jira: { label: 'Jira', short: 'J', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  email: { label: 'Email', short: '@', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  slack: { label: 'Slack', short: 'S', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  github: { label: 'GitHub', short: 'G', bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/20' },
  servicenow: { label: 'ServiceNow', short: 'SN', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  meeting: { label: 'Meeting', short: 'M', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
};

interface SourcePillProps {
  source: SourceSystem;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const SourcePill: React.FC<SourcePillProps> = ({ source, label, compact = false, className }) => {
  const config = sourceConfig[source];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded border text-xs font-medium',
      compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
      config.bg, config.text, config.border,
      className
    )}>
      <span className="font-bold">{compact ? config.short : config.label}</span>
      {!compact && label && <span className="text-[10px] opacity-70">· {label}</span>}
    </span>
  );
};

interface GroundingIndicatorProps {
  sources: Array<{ system: SourceSystem; id: string; label: string }>;
  className?: string;
}

export const GroundingIndicator: React.FC<GroundingIndicatorProps> = ({ sources, className }) => {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Grounded In</span>
      {sources.map((s) => {
        const config = sourceConfig[s.system];
        return (
          <span key={s.id} className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium',
            config.bg, config.text, config.border
          )}>
            <span className="opacity-60">✓</span>
            {s.label}
          </span>
        );
      })}
    </div>
  );
};
