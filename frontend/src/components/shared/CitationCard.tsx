/**
 * CitationCard — displays a single citation returned by the chat API.
 * Designed to accept raw API data: { id: "JIRA-1234", source: "jira" }
 * and resolve it into a visual card without coupling to mock data.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Mail, MessageSquare, Server, Users, ExternalLink } from 'lucide-react';
import type { Citation, CitationSourceType } from '../../types';
import { cn } from '../../lib/utils';

// ── Source configuration registry — extend here as new systems are added ──

const sourceRegistry: Record<
  CitationSourceType,
  { label: string; short: string; icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  jira: {
    label: 'Jira',
    short: 'J',
    icon: <GitBranch size={11} />,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  email: {
    label: 'Email',
    short: '@',
    icon: <Mail size={11} />,
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
  },
  slack: {
    label: 'Slack',
    short: 'S',
    icon: <MessageSquare size={11} />,
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
  },
  github: {
    label: 'GitHub',
    short: 'G',
    icon: <GitBranch size={11} />,
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
  },
  servicenow: {
    label: 'ServiceNow',
    short: 'SN',
    icon: <Server size={11} />,
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
  },
  meeting: {
    label: 'Meeting',
    short: 'M',
    icon: <Users size={11} />,
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
  },
};

interface CitationCardProps {
  citation: Citation;
  /** Zero-based index for stagger animations */
  index?: number;
  /** Called when the card is clicked — open CitationDrawer */
  onClick?: (citation: Citation) => void;
  className?: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index = 0,
  onClick,
  className,
}) => {
  const cfg = sourceRegistry[citation.source] ?? {
    label: citation.source,
    short: citation.source[0].toUpperCase(),
    icon: <ExternalLink size={11} />,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  };

  return (
    <motion.button
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left',
        'hover:brightness-125 transition-all duration-150 cursor-pointer group',
        cfg.bg, cfg.border,
        className
      )}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      onClick={() => onClick?.(citation)}
      title={`Open ${cfg.label} evidence`}
    >
      <span className={cn('flex-shrink-0', cfg.text)}>{cfg.icon}</span>
      <span className={cn('text-[11px] font-mono font-semibold', cfg.text)}>{citation.id}</span>
      {citation.title && (
        <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{citation.title}</span>
      )}
      <ExternalLink
        size={8}
        className="text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0 ml-auto"
      />
    </motion.button>
  );
};
