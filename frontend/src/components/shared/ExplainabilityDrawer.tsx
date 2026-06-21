/**
 * ExplainabilityDrawer — Premium Right-Side Slide-Over Drawer
 *
 * Design reference: Stripe analytics detail panels, Linear issue sidebar.
 * Principles: Trust · Transparency · Auditability · Readability.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BarChart3, Brain, Link2, Shield, ChevronDown,
  CheckCircle, ArrowRight, GitBranch, Mail, MessageSquare, Server, Users, Sparkles
} from 'lucide-react';
import type { Task, SourceSystem } from '../../types';
import { PriorityBadge, StatusBadge } from './PriorityBadge';
import { SourcePill } from './SourcePill';
import { cn } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ExplainabilityDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

// ── Registry for Icons & Styling ─────────────────────────────────────────────

const sourceRegistry: Record<
  SourceSystem,
  { label: string; icon: React.ReactNode; bg: string; text: string; border: string; accent: string }
> = {
  jira: {
    label: 'Jira',
    icon: <GitBranch size={12} />,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    accent: '#3B82F6',
  },
  email: {
    label: 'Email',
    icon: <Mail size={12} />,
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
    accent: '#8B5CF6',
  },
  slack: {
    label: 'Slack',
    icon: <MessageSquare size={12} />,
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
    accent: '#22C55E',
  },
  github: {
    label: 'GitHub',
    icon: <GitBranch size={12} />,
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    accent: '#94A3B8',
  },
  servicenow: {
    label: 'ServiceNow',
    icon: <Server size={12} />,
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    accent: '#14B8A6',
  },
  meeting: {
    label: 'Meeting',
    icon: <Users size={12} />,
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    accent: '#F97316',
  },
};

const FACTOR_BARS = [
  {
    key: 'severity' as const,
    label: 'Severity',
    color: '#EF4444',
    glowColor: 'rgba(239,68,68,0.3)',
    max: 40,
    description: 'Incident severity and blast radius',
  },
  {
    key: 'deadline' as const,
    label: 'Deadline Urgency',
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.3)',
    max: 35,
    description: 'Time to SLA expiry or due date',
  },
  {
    key: 'businessImpact' as const,
    label: 'Business Impact',
    color: '#3B82F6',
    glowColor: 'rgba(59,130,246,0.3)',
    max: 25,
    description: 'Revenue risk and customer exposure',
  },
  {
    key: 'dependencies' as const,
    label: 'Dependencies',
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.3)',
    max: 10,
    description: 'Downstream blockers unlocked',
  },
];

const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-[var(--success)]">{icon}</span>
    <span className="text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">{label}</span>
  </div>
);

const Divider: React.FC = () => (
  <div className="h-px bg-[var(--border)] -mx-6" />
);

// ── Sub-component: PriorityBreakdown ───────────────────────────────────────

export interface PriorityBreakdownProps {
  reasoning: {
    severity: number;
    deadline: number;
    businessImpact: number;
    dependencies: number;
    finalScore: number;
  };
  scoreColor: string;
}

export const PriorityBreakdown: React.FC<PriorityBreakdownProps> = ({
  reasoning,
  scoreColor,
}) => {
  return (
    <div className="space-y-4">
      {FACTOR_BARS.map((bar, i) => {
        const value = reasoning[bar.key];
        const pct = Math.round((value / bar.max) * 100);
        return (
          <div key={bar.key}>
            {/* Label Row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bar.color }}
                />
                <span className="text-xs font-medium text-slate-300">{bar.label}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] text-slate-500 font-mono">{pct}% of max</span>
                <span className="text-sm font-bold font-mono w-7 text-right" style={{ color: bar.color }}>
                  {value}
                </span>
              </div>
            </div>

            {/* Bar Track */}
            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: bar.color,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}

      {/* Final Score Row - Visually distinct but not dominant */}
      <motion.div
        className="flex items-center justify-between mt-5 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div>
          <div className="text-[10px] text-[var(--success)] uppercase tracking-widest font-semibold font-mono">
            Weighted Score Calculation
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Severity 40% · Deadline 35% · Impact 25%
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-slate-500 font-mono">Final Score =</span>
          <span
            className="text-lg font-black font-mono leading-none"
            style={{ color: scoreColor }}
          >
            {reasoning.finalScore}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

// ── Sub-component: EvidenceList ───────────────────────────────────────────

export interface EvidenceListProps {
  evidence: Array<{
    system: SourceSystem;
    id: string;
    label: string;
    snippet?: string;
    url?: string;
  }>;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!evidence || evidence.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] border-dashed p-4 text-center text-xs text-slate-600 bg-[var(--bg)]">
        No grounding evidence linked to this task.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((ev, i) => {
        const meta = sourceRegistry[ev.system] ?? {
          label: ev.system.toUpperCase(),
          icon: <Link2 size={12} />,
          bg: 'bg-slate-500/10',
          text: 'text-slate-400',
          border: 'border-slate-500/20',
          accent: '#94A3B8',
        };
        const isExpanded = expandedId === ev.id;
        const hasSnippet = Boolean(ev.snippet);

        return (
          <motion.div
            key={ev.id}
            className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg)] transition-all duration-150"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <button
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-white/2 transition-colors cursor-pointer"
              onClick={() => hasSnippet && setExpandedId(isExpanded ? null : ev.id)}
            >
              {/* Colored left bar indicator */}
              <div
                className="w-0.5 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: meta.accent }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* System Badge */}
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider', meta.bg, meta.border, meta.text)}>
                    {meta.icon}
                    {meta.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{ev.id}</span>
                </div>
                <div className="text-[12px] font-semibold text-slate-300 mt-1.5 truncate">
                  {ev.label}
                </div>
              </div>

              {hasSnippet && (
                <motion.div
                  className="flex-shrink-0"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} className="text-slate-600" />
                </motion.div>
              )}
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && ev.snippet && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3.5 pt-1.5 border-t border-[var(--border)]" style={{ background: `${meta.accent}05` }}>
                    <div className="pl-3 border-l-2" style={{ borderColor: `${meta.accent}40` }}>
                      <p className="text-[11px] leading-relaxed text-slate-400 italic">
                        "{ev.snippet}"
                      </p>
                    </div>
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium hover:underline"
                        style={{ color: meta.accent }}
                      >
                        Verify details in {meta.label} <ArrowRight size={10} className="mt-0.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Sub-component: ConfidenceCard ──────────────────────────────────────────

export interface ConfidenceCardProps {
  confidence: number;
  sourcesCount: number;
  evidenceCount: number;
}

export const ConfidenceCard: React.FC<ConfidenceCardProps> = ({
  confidence,
  sourcesCount,
  evidenceCount,
}) => {
  const confColor = confidence >= 90 ? 'var(--success)' : confidence >= 75 ? '#3B82F6' : '#F59E0B';
  const confBg = confidence >= 90 ? 'rgba(132,163,147,0.04)' : confidence >= 75 ? 'rgba(59,130,246,0.04)' : 'rgba(245,158,11,0.04)';
  const confBorder = confidence >= 90 ? 'rgba(132,163,147,0.12)' : confidence >= 75 ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)';

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 space-y-3.5 bg-[var(--bg)]">
      <div className="grid grid-cols-3 gap-2">
        {/* Stat 1: Confidence score */}
        <div className="text-center py-1">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Confidence</div>
          <div className="text-lg font-black font-mono" style={{ color: confColor }}>
            {confidence}%
          </div>
        </div>

        {/* Stat 2: Grounded sources count */}
        <div className="text-center py-1 border-x border-[var(--border)]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Sources</div>
          <div className="text-lg font-black font-mono text-blue-400">
            {sourcesCount}
          </div>
        </div>

        {/* Stat 3: Evidence count */}
        <div className="text-center py-1">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Evidence</div>
          <div className="text-lg font-black font-mono text-violet-400">
            {evidenceCount}
          </div>
        </div>
      </div>

      <div className="h-1 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: confColor }}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px]"
        style={{ background: confBg, borderColor: confBorder, color: confColor }}
      >
        <CheckCircle size={12} className="flex-shrink-0" />
        <span className="font-mono text-[10px]">
          {confidence >= 90
            ? 'Verify complete — verified across multiple trusted streams'
            : confidence >= 75
            ? 'High fidelity — metadata matches active task states'
            : 'Unverified — potential data stale risk, review details'}
        </span>
      </div>
    </div>
  );
};

// ── Sub-component: ReasoningSummary ────────────────────────────────────────

export interface ReasoningSummaryProps {
  rationale: string;
}

export const ReasoningSummary: React.FC<ReasoningSummaryProps> = ({ rationale }) => {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--elevated)]/30 flex gap-3">
      <span className="text-[var(--success)] flex-shrink-0 mt-0.5">
        <Sparkles size={14} />
      </span>
      <p className="text-xs text-slate-300 leading-relaxed">
        {rationale}
      </p>
    </div>
  );
};

// ── Main Component: ExplainabilityDrawer ───────────────────────────────────

export const ExplainabilityDrawer: React.FC<ExplainabilityDrawerProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  // Listen for Escape key to close the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const { theme } = useTheme();
  const scoreColor = task
    ? task.score >= 90 ? (theme === 'dark' ? '#E08585' : '#C25A5A')
    : task.score >= 70 ? (theme === 'dark' ? '#D1A775' : '#B38649')
    : (theme === 'dark' ? 'var(--success)' : '#5C8B70')
    : (theme === 'dark' ? 'var(--success)' : '#5C8B70');

  return (
    <AnimatePresence>
      {isOpen && task && (
        <>
          {/* Backdrop (click to close) */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Right side slide-over panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[480px] max-w-full z-50 flex flex-col shadow-2xl transition-colors duration-300"
            style={{
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header section (Section A) */}
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] flex-shrink-0 flex items-start justify-between gap-4 bg-[var(--surface)] transition-colors duration-300">
              <div className="flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div
                    className="h-6 px-2 rounded flex items-center justify-center border text-[10px] font-black font-mono"
                    style={{
                      background: `${scoreColor}10`,
                      borderColor: `${scoreColor}30`,
                      color: scoreColor,
                    }}
                  >
                    Priority #{task.rank}
                  </div>
                  <div
                    className="h-6 px-2 rounded flex items-center justify-center border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg)]"
                  >
                    Score: {task.score}
                  </div>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{task.id}</span>
                </div>

                {/* Title */}
                <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug tracking-tight">
                  {task.title}
                </h2>

                {/* Deadline/SLA */}
                {task.deadline && (
                  <div className="inline-flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">SLA/Timeline:</span>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono">{task.deadline}</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-primary)] hover:bg-white/6 transition-colors"
                title="Close drawer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body sections */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-[var(--surface)] transition-colors duration-300">
              {/* Section B — Priority Breakdown */}
              <div>
                <SectionLabel icon={<BarChart3 size={12} />} label="Priority Score Breakdown" />
                <PriorityBreakdown
                  reasoning={task.reasoning}
                  scoreColor={scoreColor}
                />
              </div>

              <Divider />

              {/* Section C — Source Evidence */}
              <div>
                <SectionLabel icon={<Link2 size={12} />} label="Grounded Source Evidence" />
                <EvidenceList evidence={task.sourceEvidence} />
              </div>

              <Divider />

              {/* Section D — Confidence / Grounding */}
              <div>
                <SectionLabel icon={<Shield size={12} />} label="Fidelity & Confidence" />
                <ConfidenceCard
                  confidence={task.confidence}
                  sourcesCount={task.sources.length}
                  evidenceCount={task.sourceEvidence.length}
                />
              </div>

              <Divider />

              {/* Section E — AI Reasoning Summary */}
              <div>
                <SectionLabel icon={<Brain size={12} />} label="Autonomous AI Rationale" />
                <ReasoningSummary rationale={task.aiRationale} />
              </div>
            </div>

            {/* Footer action */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0 flex items-center justify-end gap-2 bg-[var(--bg)] transition-colors duration-300">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/12 transition-colors cursor-pointer bg-[var(--surface)]"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
