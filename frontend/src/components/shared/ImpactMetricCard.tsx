/**
 * ImpactMetricCard — compact AI value metric card.
 * Props-driven, no mock-data coupling. Pass from API response.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Eye, GitMerge, Timer, TrendingUp, LucideIcon } from 'lucide-react';
import type { ImpactMetric } from '../../types';
import { cn } from '../../lib/utils';

// Icon registry — add new icons here as the backend introduces new metric types
const iconRegistry: Record<string, LucideIcon> = {
  Eye,
  GitMerge,
  Timer,
  TrendingUp,
};

interface ImpactMetricCardProps {
  metric: ImpactMetric;
  /** Animated display value (pass result of useCountUp or raw value) */
  displayValue?: number | string;
  index?: number;
  className?: string;
}

export const ImpactMetricCard: React.FC<ImpactMetricCardProps> = ({
  metric,
  displayValue,
  index = 0,
  className,
}) => {
  const Icon = iconRegistry[metric.icon];
  const value = displayValue ?? metric.value;

  return (
    <motion.div
      className={cn(
        'rounded-xl p-3.5 border border-[var(--border)] relative overflow-hidden transition-colors duration-300',
        className
      )}
      style={{ background: 'var(--surface)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
    >
      <div className="relative">
        {/* Icon */}
        {Icon && <Icon size={14} className={cn(metric.color, 'mb-2')} />}

        {/* Value */}
        <div className={cn('text-2xl font-bold font-mono', metric.color)}>{value}</div>

        {/* Label */}
        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-tight">{metric.label}</div>

        {/* Sub */}
        <div className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">{metric.sub}</div>

        {/* Trend indicator */}
        {metric.trend && metric.trend !== 'flat' && (
          <div
            className={cn(
              'absolute top-0 right-0 text-[8px] font-bold font-mono',
              metric.trend === 'up' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            {metric.trend === 'up' ? '↑' : '↓'}
          </div>
        )}
      </div>
    </motion.div>
  );
};
