import React from 'react';
import { motion } from 'framer-motion';
import type { ReasoningBreakdown } from '../../types';

interface ReasoningPreviewProps {
  reasoning: ReasoningBreakdown;
  delay?: number;
  compact?: boolean;
}

const bars = [
  { key: 'severity' as keyof ReasoningBreakdown, label: 'Severity', color: '#EF4444', max: 40 },
  { key: 'deadline' as keyof ReasoningBreakdown, label: 'Deadline', color: '#F59E0B', max: 35 },
  { key: 'businessImpact' as keyof ReasoningBreakdown, label: 'Business Impact', color: '#3B82F6', max: 25 },
  { key: 'dependencies' as keyof ReasoningBreakdown, label: 'Dependencies', color: '#8B5CF6', max: 10 },
];

export const ReasoningPreview: React.FC<ReasoningPreviewProps> = ({ reasoning, delay = 0, compact = false }) => {
  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-medium">AI Score Breakdown</span>
        </div>
      )}
      {bars.map((bar, i) => {
        const value = reasoning[bar.key] as number;
        const pct = (value / bar.max) * 100;
        return (
          <div key={bar.key} className="flex items-center gap-3">
            <span className={`text-[var(--text-secondary)] ${compact ? 'text-[10px] w-20' : 'text-xs w-28'} flex-shrink-0`}>
              {bar.label}
            </span>
            <div className="flex-1 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: bar.color, boxShadow: `0 0 6px ${bar.color}40` }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: delay + i * 0.1, ease: 'easeOut' }}
              />
            </div>
            <span className={`font-mono font-semibold ${compact ? 'text-[10px] w-5' : 'text-xs w-6'} text-right flex-shrink-0`}
              style={{ color: bar.color }}>
              {value}
            </span>
          </div>
        );
      })}
      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between mt-1 transition-colors duration-300">
        <span className={`text-[var(--text-secondary)] ${compact ? 'text-[10px]' : 'text-xs'} font-medium`}>Final Score</span>
        <span className={`font-mono font-bold ${compact ? 'text-sm' : 'text-base'}`}
          style={{ color: '#EF4444', textShadow: '0 0 12px rgba(239,68,68,0.4)' }}>
          {reasoning.finalScore}
        </span>
      </div>
    </div>
  );
};
