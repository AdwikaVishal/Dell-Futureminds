/**
 * HiddenTaskCard — displays a single AI-extracted task from unstructured sources.
 * Props-driven, no mock-data coupling.
 * confidence prop is surfaced prominently per spec requirement.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Mail, MessageSquare, Users, GitBranch, Server } from 'lucide-react';
import type { HiddenTask, SourceSystem } from '../../types';
import { PriorityBadge } from './PriorityBadge';
import { SourcePill } from './SourcePill';
import { cn } from '../../lib/utils';

const sourceIconMap: Partial<Record<SourceSystem, React.ReactNode>> = {
  email: <Mail size={11} className="text-violet-400" />,
  slack: <MessageSquare size={11} className="text-green-400" />,
  meeting: <Users size={11} className="text-orange-400" />,
  jira: <GitBranch size={11} className="text-blue-400" />,
  servicenow: <Server size={11} className="text-teal-400" />,
};

interface HiddenTaskCardProps {
  task: HiddenTask;
  /** AI confidence 0–100, shown as a subtle indicator */
  confidence?: number;
  index?: number;
  onClick?: (task: HiddenTask) => void;
  className?: string;
}

export const HiddenTaskCard: React.FC<HiddenTaskCardProps> = ({
  task,
  confidence,
  index = 0,
  onClick,
  className,
}) => {
  return (
    <motion.div
      className={cn(
        'px-5 py-3.5 flex items-start gap-3 hover:bg-white/2 transition-colors cursor-pointer group',
        className
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={() => onClick?.(task)}
    >
      {/* Source icon */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(59,130,246,0.1)' }}
      >
        {sourceIconMap[task.source] ?? <Mail size={11} className="text-blue-400" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 font-medium leading-snug">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <SourcePill source={task.source} compact />
          <span className="text-[10px] text-slate-600 truncate">{task.extractedFrom}</span>
          {confidence !== undefined && (
            <span className="text-[9px] text-slate-700 font-mono ml-auto flex-shrink-0">
              {confidence}% conf.
            </span>
          )}
          <span className="text-[10px] text-slate-700 ml-auto flex-shrink-0">{task.timestamp}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <PriorityBadge priority={task.priority} />
        <ChevronRight
          size={12}
          className="text-slate-700 group-hover:text-slate-400 transition-colors"
        />
      </div>
    </motion.div>
  );
};
