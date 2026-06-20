/**
 * CitationDrawer — slide-in detail panel for a single citation.
 * Designed for future backend integration: accepts a Citation object
 * and displays its available fields. When the backend provides full
 * evidence bodies, they will populate via the `citation.snippet` and
 * `citation.metadata` fields — no structural change required.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, GitBranch, Mail, MessageSquare, Server, Users } from 'lucide-react';
import type { Citation, CitationSourceType } from '../../types';
import { cn } from '../../lib/utils';

const sourceConfig: Record<CitationSourceType, {
  label: string; icon: React.ReactNode; bg: string; text: string; border: string;
  description: string;
}> = {
  jira: { label: 'Jira', icon: <GitBranch size={14} />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', description: 'Jira ticket or issue' },
  email: { label: 'Email', icon: <Mail size={14} />, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', description: 'Email thread or message' },
  slack: { label: 'Slack', icon: <MessageSquare size={14} />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', description: 'Slack channel message' },
  github: { label: 'GitHub', icon: <GitBranch size={14} />, bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/20', description: 'GitHub PR or issue' },
  servicenow: { label: 'ServiceNow', icon: <Server size={14} />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', description: 'ServiceNow ticket' },
  meeting: { label: 'Meeting Notes', icon: <Users size={14} />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', description: 'Meeting transcript or notes' },
};

interface CitationDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ citation, onClose }) => {
  const cfg = citation ? sourceConfig[citation.source] : null;

  return (
    <AnimatePresence>
      {citation && cfg && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[420px] z-50 flex flex-col shadow-2xl transition-colors duration-300"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
              <div>
                <div className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border mb-3', cfg.bg, cfg.border)}>
                  <span className={cfg.text}>{cfg.icon}</span>
                  <span className={cn('text-xs font-semibold', cfg.text)}>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-mono">{citation.id}</h2>
                </div>
                {citation.title && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{citation.title}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Source type */}
              <div className="rounded-lg p-4 border border-[var(--border)] bg-[var(--bg)]">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-2">
                  Source Type
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{cfg.description}</p>
              </div>

              {/* Evidence excerpt */}
              {citation.snippet ? (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-2">
                    Evidence Excerpt
                  </div>
                  <div className="rounded-lg p-4 border border-[var(--border)] bg-[var(--bg)]">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">"{citation.snippet}"</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-4 border border-[var(--border)] border-dashed text-center bg-[var(--bg)]">
                  <p className="text-xs text-[var(--text-muted)]">Full evidence body will be loaded from backend.</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">Connect citation ID to /api/evidence/{citation.id}</p>
                </div>
              )}

              {/* Metadata — renders any key-value pairs from API */}
              {citation.metadata && Object.keys(citation.metadata).length > 0 && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-2">
                    Metadata
                  </div>
                  <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
                    {Object.entries(citation.metadata).map(([key, value]) => {
                      const isTimeOrId = key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('id');
                      return (
                        <div key={key} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide w-24 flex-shrink-0">{key}</span>
                          <span className={cn("text-xs text-[var(--text-secondary)]", isTimeOrId && "font-mono")}>{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Backend integration note */}
              <div className="rounded-lg p-4 border border-blue-500/10" style={{ background: 'rgba(59,130,246,0.04)' }}>
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  <span className="text-blue-400/70 font-medium">Backend ready.</span>{' '}
                  This drawer is designed for integration with{' '}
                  <code className="font-mono text-slate-500 bg-black/10 px-1 rounded">GET /api/citations/:id</code>.
                  Full content, author, timestamp, and thread context will populate here.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[var(--border)]">
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                >
                  Open in {cfg.label} <ExternalLink size={13} />
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/8 text-sm text-[var(--text-muted)] cursor-not-allowed"
                >
                  Deep link requires backend connection
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
