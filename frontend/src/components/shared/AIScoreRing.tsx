import React from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '../../hooks';
import { cn, getScoreColor } from '../../lib/utils';

interface AIScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  className?: string;
}

export const AIScoreRing: React.FC<AIScoreRingProps> = ({ score, size = 'md', delay = 0, className }) => {
  const count = useCountUp(score, 1000, delay);
  const color = getScoreColor(score);

  const sizeConfig = {
    sm: { outer: 48, stroke: 4, text: 'text-sm font-bold', label: 'text-[8px]' },
    md: { outer: 64, stroke: 5, text: 'text-xl font-bold', label: 'text-[9px]' },
    lg: { outer: 80, stroke: 6, text: 'text-2xl font-bold', label: 'text-[10px]' },
  };

  const { outer, stroke, text, label } = sizeConfig[size];
  const r = (outer - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div className={cn('relative flex items-center justify-center flex-shrink-0', className)} style={{ width: outer, height: outer }}>
      <svg width={outer} height={outer} className="absolute -rotate-90">
        <circle cx={outer / 2} cy={outer / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={outer / 2} cy={outer / 2} r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: delay / 1000, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={cn(text)} style={{ color }}>{count}</span>
        <span className={cn(label, 'text-slate-500 uppercase tracking-widest mt-0.5')}>Score</span>
      </div>
    </div>
  );
};
