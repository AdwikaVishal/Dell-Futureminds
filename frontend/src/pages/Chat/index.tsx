import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Brain, CheckCircle, ExternalLink,
  AlertTriangle, Clock, TrendingUp, Shield, Zap, ArrowRight,
  BarChart3, Users,
} from 'lucide-react';
import { SourcePill } from '../../components/shared/SourcePill';
import { CitationList } from '../../components/shared/CitationList';
import { CitationDrawer } from '../../components/shared/CitationDrawer';
import type { SourceSystem, Citation } from '../../types';
import { cn } from '../../lib/utils';
import * as api from '../../lib/api/taskpilot';

// ── Types ───────────────────────────────────────────────────────────────────

interface FactorRow { label: string; score: number; max: number; color: string; description: string }

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Structured fields
  reasoningBullets?: string[];
  factorBreakdown?: FactorRow[];
  blockers?: Array<{ task: string; owner: string; blocks: string; severity: 'High' | 'Medium' | 'Low' }>;
  deferrals?: Array<{ task: string; reason: string; unlocks: string; impact: string }>;
  vpSummary?: { sender: string; timestamp: string; keyPoints: string[]; actions: string[]; urgency: string; linkedTask?: string };
  topPriority?: { task: string; taskId: string; whyNow: string; whatToDo: string[]; sources: Array<{ system: SourceSystem; label: string }> };
  sources?: Array<{ system: SourceSystem; label: string }>;
  citations?: Citation[];
  confidence?: number;
}

// ── Mock initial messages ────────────────────────────────────────────────────

const initialMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "Analyze current active incidents and prioritize them for today's sprint planning.",
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Based on current Jira tickets, Slack escalations, and your email inbox, here is the prioritized incident list for today. The Login Service failure requires immediate attention — it is blocking EU customers and has an active SLA breach window.',
    reasoningBullets: [
      'Cross-referenced active Jira tickets with #escalations channel and engineering inbox.',
      'Applied priority scoring: severity 40%, deadline urgency 35%, business impact 25%.',
      'Identified critical Auth service degradation affecting EU-West-1 (503 errors, 12% of users).',
    ],
    sources: [
      { system: 'jira', label: 'Jira / API' },
      { system: 'slack', label: '#escalations' },
      { system: 'email', label: 'VP Engineering Inbox' },
    ],
    citations: [
      { id: 'TKT-6921', source: 'jira', title: 'Login Service Failure', snippet: 'P1 incident declared at 07:15 UTC. Auth service 503 errors affecting EU-West-1.' },
      { id: 'EML-003', source: 'email', title: 'VP Engineering Escalation', snippet: '3 Enterprise Customer Escalations. VP requesting immediate status update by 9 AM.' },
      { id: 'SLK-001', source: 'slack', title: '#escalations · 08:04', snippet: '@sarah: seeing latency spikes on the auth cluster, might be related to cert rotation.' },
    ],
    confidence: 98,
  },
];

const suggested = [
  "Why is the upload bug my #1 priority?",
  "Summarize the VP's email",
  "What's blocking me today?",
  "What should I defer?",
  "What's my top priority?",
];

// ── Factor breakdown bar component ───────────────────────────────────────────

const FactorBar: React.FC<{ row: FactorRow; delay: number }> = ({ row, delay }) => {
  const pct = Math.round((row.score / row.max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
          <span className="text-xs text-slate-300">{row.label}</span>
          <span className="text-[10px] text-slate-500">{row.description}</span>
        </div>
        <span className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.score}</span>
      </div>
      <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: row.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// ── Message renderer ────────────────────────────────────────────────────────

const AssistantMessage: React.FC<{ msg: Message; onCitationClick: (c: Citation) => void }> = ({ msg, onCitationClick }) => (
  <div className="rounded-xl rounded-tl-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <div className="p-4 space-y-4">
      {/* Main answer */}
      <p className="text-sm text-slate-300 leading-relaxed">{msg.content}</p>

      {/* VP Email Summary */}
      {msg.vpSummary && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
          <div className="bg-[var(--elevated)] px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-[var(--success)]" />
              <span className="text-xs font-bold text-[var(--success)]">VP Email Summary</span>
              {msg.vpSummary.linkedTask && (
                <span className="text-[10px] font-mono text-slate-500 ml-1">→ {msg.vpSummary.linkedTask}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{msg.vpSummary.timestamp}</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">From</span>
              <span className="text-xs text-slate-300 font-medium">{msg.vpSummary.sender}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Key Points</span>
              <ul className="space-y-1">
                {msg.vpSummary.keyPoints.map((pt, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-[var(--success)] mt-0.5 flex-shrink-0">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Action Items Extracted</span>
              <ul className="space-y-1">
                {msg.vpSummary.actions.map((a, i) => (
                  <li key={i} className="text-xs text-[var(--success)] flex items-start gap-2">
                    <CheckCircle size={10} className="mt-0.5 flex-shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t border-[var(--border)]">
              <span className="text-[10px] text-red-400 uppercase tracking-wider block font-semibold mb-0.5">Urgency</span>
              <span className="text-xs text-red-300">{msg.vpSummary.urgency}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Priority Card */}
      {msg.topPriority && (
        <div className="border border-[var(--success)]/20 rounded-lg overflow-hidden bg-[var(--success)]/4">
          <div className="px-4 py-2.5 border-b border-[var(--success)]/15 flex items-center gap-2" style={{ background: 'rgba(132,163,147,0.05)' }}>
            <Zap size={12} className="text-[var(--success)]" />
            <span className="text-xs font-bold text-[var(--success)]">Top Priority Right Now</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="text-[10px] text-slate-500 font-mono mb-0.5">{msg.topPriority.taskId}</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{msg.topPriority.task}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Why now</span>
              <p className="text-xs text-slate-300">{msg.topPriority.whyNow}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">What to do first</span>
              <ul className="space-y-1">
                {msg.topPriority.whatToDo.map((step, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-[var(--success)] font-mono text-[10px] flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {msg.topPriority.sources.map(s => (
                <SourcePill key={s.label} source={s.system} label={s.label} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reasoning bullets */}
      {msg.reasoningBullets && (
        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <div className="text-[10px] text-[var(--success)] uppercase tracking-widest font-semibold font-mono">
            Key Reasoning
          </div>
          <ul className="space-y-1.5">
            {msg.reasoningBullets.map((bullet, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-[var(--success)] mt-0.5 flex-shrink-0">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Factor breakdown */}
      {msg.factorBreakdown && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'var(--elevated)' }}>
            <BarChart3 size={12} className="text-[var(--success)]" />
            <span className="text-xs font-bold text-[var(--success)]">Priority Factor Breakdown</span>
            <span className="ml-auto text-[10px] font-mono text-slate-500">Weighted scoring model</span>
          </div>
          <div className="p-4 space-y-3.5">
            {msg.factorBreakdown.map((row, i) => (
              <FactorBar key={row.label} row={row} delay={0.1 + i * 0.08} />
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-[10px] text-slate-500 font-mono">Severity 40% · Deadline 35% · Impact 25%</span>
              <span className="text-sm font-black font-mono text-red-400">
                Score: {msg.factorBreakdown.reduce((acc, r) => acc + r.score, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Blockers list */}
      {msg.blockers && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'var(--elevated)' }}>
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">Active Blockers</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {msg.blockers.map((b, i) => (
              <div key={i} className="p-3.5 flex items-start gap-3">
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{b.task}</div>
                  <div className="text-[10px] text-slate-500">
                    Owner: <span className="text-slate-400">{b.owner}</span>
                    <span className="mx-1.5 text-[var(--border)]">·</span>
                    Blocks: <span className="text-slate-400">{b.blocks}</span>
                  </div>
                </div>
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0',
                  b.severity === 'High' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                  b.severity === 'Medium' ? 'bg-orange-500/15 text-orange-400 border-orange-500/20' :
                  'bg-amber-500/15 text-amber-400 border-amber-500/20'
                )}>
                  {b.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deferral recommendations */}
      {msg.deferrals && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'var(--elevated)' }}>
            <Clock size={12} className="text-[var(--success)]" />
            <span className="text-xs font-bold text-[var(--success)]">Recommended Deferrals</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {msg.deferrals.map((d, i) => (
              <div key={i} className="p-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{d.task}</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider flex-shrink-0">
                    {d.impact}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-1">{d.reason}</p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--success)]">
                  <ArrowRight size={9} />
                  <span>Unlocks: {d.unlocks}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citations */}
      {msg.citations && msg.citations.length > 0 && (
        <CitationList
          citations={msg.citations}
          onCitationClick={onCitationClick}
          className="mt-4 pt-4 border-t border-[var(--border)]"
        />
      )}
    </div>

    {/* Footer */}
    {(msg.sources || msg.confidence) && (
      <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-slate-500 font-mono" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-2">
          <span>Grounded in {msg.sources?.length ?? 0} source{(msg.sources?.length ?? 0) !== 1 ? 's' : ''}</span>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1">
            {msg.sources?.map(s => <SourcePill key={s.label} source={s.system} label={s.label} compact />)}
          </div>
        </div>
        {msg.confidence && (
          <div className="flex items-center gap-1.5 text-[var(--success)]">
            <CheckCircle size={10} />
            <span>Confidence: {msg.confidence}%</span>
          </div>
        )}
      </div>
    )}
  </div>
);

// ── Chat page ────────────────────────────────────────────────────────────────

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `msg-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const apiRes = await api.chat(text);
      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: apiRes.answer,
        citations: (apiRes.referenced_task_ids || []).map(tid => ({
          id: tid,
          source: 'jira' as const,
          title: `Referenced Task ${tid}`,
          snippet: `Referenced Taskopilot system item.`,
        })),
        confidence: 95,
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
    } catch (err) {
      setTimeout(() => {
        let aiMsg: Message;
        const lower = text.toLowerCase().trim();

        if (lower.includes('upload bug') || (lower.includes('why') && lower.includes('priority'))) {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: 'The Login Service Failure (TKT-6921) is ranked #1 because it combines the highest severity score, an imminent SLA breach, active VP escalation, and blocks 2 downstream deployments — all detected simultaneously across Jira, email, and Slack.',
            reasoningBullets: [
              'Severity score 96/100 — P1 incident declared at 07:15 UTC, affecting 12% of EU users.',
              'SLA breach window: 4 hours remaining. Customer-facing impact triggers automatic elevation.',
              'VP of Engineering escalation received via email at 08:32 — correlated to open Jira ticket.',
            ],
            factorBreakdown: [
              { label: 'Severity',           score: 40, max: 40, color: '#EF4444', description: '— P1, 12% EU users impacted' },
              { label: 'Deadline Urgency',   score: 30, max: 35, color: '#F59E0B', description: '— SLA expires in 4h' },
              { label: 'Business Impact',    score: 20, max: 25, color: '#3B82F6', description: '— Enterprise customers, VP escalation' },
              { label: 'Dependencies',       score: 6,  max: 10, color: '#8B5CF6', description: '— Blocks AUTH-992, DB-4041' },
            ],
            sources: [
              { system: 'jira', label: 'Jira TKT-6921' },
              { system: 'email', label: 'VP Engineering Inbox' },
              { system: 'slack', label: '#escalations' },
            ],
            citations: [
              { id: 'TKT-6921', source: 'jira', title: 'Login Service Failure', snippet: 'P1 incident declared 07:15 UTC. Auth 503 errors affecting EU-West-1.', metadata: { Severity: 'P1', Reported: '07:15 UTC', Score: '96/100' } },
              { id: 'EML-003', source: 'email', title: 'VP Escalation', snippet: '3 Enterprise customers escalated. Status update required by 9 AM.', metadata: { Sender: 'vp@enterprise.com', Received: '08:32 AM' } },
            ],
            confidence: 96,
          };
        } else if (lower.includes('vp') || lower.includes('email') || lower.includes('summarize')) {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: 'Here is the summary of the urgent escalation email from the VP of Engineering. Three action items were extracted and one has been correlated with an active Jira incident.',
            vpSummary: {
              sender: 'VP of Engineering <vp@enterprise.com>',
              timestamp: 'Today, 08:32 AM',
              keyPoints: [
                'EU customer login failures have been ongoing for 45+ minutes. Board visibility imminent.',
                'SLA breach clock has started — response window is 30 minutes.',
                'Auth service cert rotation (June 17) is suspected root cause.',
              ],
              actions: [
                'Draft and send status update to VP by 09:00 AM',
                'Coordinate DevOps rollback for EU-West-1 cert rotation',
                'Confirm root cause before customer notification goes out',
              ],
              urgency: 'Critical — VP escalation active. Status update required before 09:00 AM or escalation goes to board.',
              linkedTask: 'TKT-6921',
            },
            sources: [{ system: 'email', label: 'VP Engineering Inbox' }],
            citations: [
              { id: 'EML-003', source: 'email', title: 'VP Escalation: Login Service', snippet: 'Status update required by 9 AM or escalating to board.', metadata: { Thread: 'EML-003', Received: '08:32 AM', Sender: 'vp@enterprise.com' } },
            ],
            confidence: 99,
          };
        } else if (lower.includes('block') || lower.includes('blocking')) {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: "I found 3 active blockers currently impacting your throughput. The highest severity block is on the EU login flow — it's compounding because AUTH-992 is blocking TKT-6921 resolution.",
            blockers: [
              { task: 'AUTH-992 — OAuth Token Refresh Failing (EU)', owner: 'Platform Team',   blocks: 'TKT-6921 Login Service restoration',    severity: 'High' },
              { task: 'SEC-132 — Security Review Pending',           owner: 'Jordan Lee',      blocks: 'Q3 DB Migration & Release v4.2.1',     severity: 'Medium' },
              { task: 'DB-4041 — Read Replica Latency > 500ms',      owner: 'Sam Rivera',      blocks: '12 dependent API endpoints',            severity: 'Medium' },
            ],
            sources: [
              { system: 'jira', label: 'Jira / API' },
              { system: 'servicenow', label: 'ServiceNow' },
            ],
            citations: [
              { id: 'AUTH-992', source: 'jira', title: 'OAuth Token Refresh Failing', snippet: 'EU-West-1 cert rotation root cause. Blocking Login Service restoration.' },
              { id: 'SEC-132', source: 'servicenow', title: 'Security Compliance Audit', snippet: 'Security sign-off pending. No response from security team in 48h.' },
            ],
            confidence: 94,
          };
        } else if (lower.includes('defer')) {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: 'Based on SLA timelines, dependency mapping, and current resource load, I recommend deferring 2 tasks that are safe to move without impacting critical path.',
            deferrals: [
              {
                task: 'ARCH-201 — Q4 Architecture Planning Document',
                reason: 'Non-blocking strategic work with a next-week deadline. CTO has not flagged urgency.',
                unlocks: '1.5h focus time for P1 incident resolution today',
                impact: 'Low risk',
              },
              {
                task: 'PR Review — Internal Metrics Logger Refactor',
                reason: 'Non-customer-facing tech debt. Can wait until Login Service is stable.',
                unlocks: '45min for DevOps coordination',
                impact: 'Low risk',
              },
            ],
            sources: [{ system: 'github', label: 'GitHub PR' }],
            citations: [
              { id: 'ARCH-201', source: 'jira', title: 'Q4 Architecture Planning', snippet: 'Draft Q4 architecture proposal. Next week deadline. No hard dependencies.' },
            ],
            confidence: 88,
          };
        } else if (lower.includes('top priority') || lower.includes("what's my top") || lower.includes('what is my top')) {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: "Your top priority right now is TKT-6921 — Login Service Failure. It has the highest compound risk score in the queue and an active SLA breach window.",
            topPriority: {
              task: 'Login Service Failure',
              taskId: 'TKT-6921',
              whyNow: 'P1 incident with 4-hour SLA window, active VP escalation, and 12% of EU users unable to authenticate. Blocking 2 downstream deployments. Severity score: 96/100.',
              whatToDo: [
                'Check AUTH-992 cert rotation rollback status with DevOps',
                'Draft VP Engineering status update (due 09:00 AM)',
                'Confirm EU-West-1 auth cluster latency trend',
              ],
              sources: [
                { system: 'jira', label: 'Jira TKT-6921' },
                { system: 'email', label: 'VP Escalation EML-003' },
                { system: 'slack', label: '#escalations SLK-001' },
              ],
            },
            citations: [
              { id: 'TKT-6921', source: 'jira', title: 'Login Service Failure', snippet: 'Auth service 503 errors, EU-West-1. SLA expires in 4 hours.' },
            ],
            confidence: 98,
          };
        } else {
          aiMsg = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `Based on current task queue and connected data sources: the Login Service Failure (TKT-6921) remains your highest priority — SLA breach window is 4 hours. Here is what I found for your query: "${text}".`,
            reasoningBullets: [
              'Urgency score calculated at 96% based on SLA proximity and active VP escalation.',
              'Three cross-source signals correlated: Jira, Email, Slack.',
            ],
            sources: [
              { system: 'jira', label: 'Jira / API' },
              { system: 'email', label: 'Email Inbox' },
            ],
            citations: [
              { id: 'TKT-6921', source: 'jira', title: 'Login Service Failure', snippet: 'P1 incident. Auth service 503. EU-West-1 affected.' },
            ],
            confidence: 88,
          };
        }

        setMessages(prev => [...prev, aiMsg]);
        setIsThinking(false);
      }, 1100);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">

      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-2 flex-shrink-0 bg-[var(--bg)]">
        <span className="text-sm font-semibold text-[var(--success)]">TaskPilot AI</span>
        <span className="text-slate-700">›</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Active Session: Incident Triage</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] dot-pulse" />
          <span>5 sources connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/30 flex items-center justify-center">
                    <Brain size={14} className="text-[var(--success)]" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--success)] to-[#40564C] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">AC</span>
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`flex-1 max-w-xl ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="px-4 py-3 rounded-xl rounded-tr-sm text-sm text-[var(--text-primary)] border border-[var(--border)] bg-[var(--bg)]/50">
                    {msg.content}
                  </div>
                ) : (
                  <AssistantMessage msg={msg} onCitationClick={setActiveCitation} />
                )}
              </div>
            </motion.div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-8 h-8 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/30 flex items-center justify-center flex-shrink-0">
                <Brain size={14} className="text-[var(--success)]" />
              </div>
              <div className="px-4 py-3 rounded-xl rounded-tl-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-6 py-3 flex flex-wrap gap-2 border-t border-[var(--border)] flex-shrink-0" style={{ background: 'var(--bg)' }}>
        {suggested.map(p => (
          <button key={p} onClick={() => sendMessage(p)}
            className="px-3 py-1.5 rounded-lg text-xs text-[var(--success)] border border-[var(--success)]/20 hover:border-[var(--success)]/40 hover:bg-[var(--success)]/5 transition-all"
            style={{ background: 'rgba(132, 163, 147, 0.03)' }}>
            "{p}"
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] focus-within:border-[var(--success)]/40 transition-colors bg-[var(--surface)]">
          <input
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-slate-600 outline-none"
            placeholder="Ask TaskPilot or enter a command..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          />
          <button className="p-1.5 rounded text-slate-600 hover:text-slate-400 transition-colors">
            <Paperclip size={15} />
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-[var(--success)] hover:bg-[var(--success)]/80 text-[var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-center text-[9px] text-slate-600 mt-2">
          TaskPilot AI operates on verified enterprise data. Press{' '}
          <kbd className="px-1 py-0.5 rounded border border-[var(--border)] font-mono text-slate-600">⌘K</kbd>
          {' '}for commands.
        </p>
      </div>

      <CitationDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
};
