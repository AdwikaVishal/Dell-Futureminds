import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Users, GitMerge, Zap, Calendar, Shield } from 'lucide-react';
import type { AgentActivity, AgentType } from '../../types';
import { cn } from '../../lib/utils';

const agentConfig: Record<AgentType, { icon: React.ReactNode; color: string; bg: string }> = {
  email: { icon: <Mail size={12} />, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  meeting: { icon: <Users size={12} />, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  dedup: { icon: <GitMerge size={12} />, color: 'text-green-400', bg: 'bg-green-500/15' },
  priority: { icon: <Zap size={12} />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  planning: { icon: <Calendar size={12} />, color: 'text-teal-400', bg: 'bg-teal-500/15' },
  security: { icon: <Shield size={12} />, color: 'text-red-400', bg: 'bg-red-500/15' },
};

interface AgentTimelineProps {
  activities: AgentActivity[];
  compact?: boolean;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ activities, compact = false }) => {
  return (
    <div className="space-y-0">
      {activities.map((activity, i) => {
        const config = agentConfig[activity.agent];
        return (
          <motion.div
            key={activity.id}
            className="flex gap-3 relative"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.18, duration: 0.4, ease: 'easeOut' }}
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10', config.bg, config.color)}>
                {config.icon}
              </div>
              {i < activities.length - 1 && (
                <motion.div
                  className="w-px flex-1 min-h-[20px] mt-1"
                  style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)' }}
                  initial={{ scaleY: 0, originY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.18 + 0.2, duration: 0.3 }}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-4 flex-1 min-w-0', i === activities.length - 1 && 'pb-0')}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn('text-xs font-semibold', config.color)}>{activity.agentName}</span>
                <span className="text-[10px] font-mono text-slate-600">{activity.time}</span>
                <span className="ml-auto flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.6)' }} />
                </span>
              </div>
              <p className={cn('text-slate-300 leading-snug', compact ? 'text-[11px]' : 'text-xs')}>{activity.action}</p>
              {!compact && activity.details && (
                <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{activity.details}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
