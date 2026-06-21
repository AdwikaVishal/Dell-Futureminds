import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Server, Radio, Play, Pause } from 'lucide-react';
import { useModals } from '../../lib/ModalContext';
import { cn } from '../../lib/utils';

export const StatusDrawer: React.FC = () => {
  const { isStatusOpen, closeStatus } = useModals();
  const [logs, setLogs] = useState<string[]>([
    '[INFO] Synced 5 connected streams successfully.',
    '[INFO] Ingestion Agent: listening on IMAP, Slack Socket, GitHub webhook.',
    '[SUCCESS] Database connection pool verified.',
  ]);
  const [isPlaying, setIsPlaying] = useState(true);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStatus();
    };
    if (isStatusOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStatusOpen, closeStatus]);

  // Log Simulation Loop
  useEffect(() => {
    if (!isStatusOpen || !isPlaying) return;

    const mockLogs = [
      '[INFO] Syncing Jira ticket backlog... 0 new tickets found.',
      '[INFO] Scanning Slack #dev-ops channel transcript...',
      '[INFO] Extraction Agent: scanning VP escalation email...',
      '[SUCCESS] No new duplicate entries found in correlation pool.',
      '[INFO] Recalculating priority vector for Task TKT-6921 (score 96/100).',
      '[INFO] Latency checkpoint: synchronization pipeline health nominal (142ms).',
      '[SUCCESS] Daily plan alignment verified (74% adherence).',
      '[INFO] Sleeping for next ingestion window...',
    ];

    const timer = setInterval(() => {
      const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)];
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-30), `[${timestamp}] ${randomLog}`]);
    }, 2800);

    return () => clearInterval(timer);
  }, [isStatusOpen, isPlaying]);

  // Auto-scroll logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const agents = [
    { name: 'Ingestion Agent', role: 'Stream Reader', status: 'Running', count: '5 source feeds' },
    { name: 'Extraction Agent', role: 'NLP Parser', status: 'Idle', count: 'waiting for hooks' },
    { name: 'Correlation Engine', role: 'De-duplicator', status: 'Idle', count: 'last run 2m ago' },
    { name: 'Prioritization Engine', role: 'Rank Vectorizer', status: 'Running', count: 'weights synced' },
  ];

  return (
    <AnimatePresence>
      {isStatusOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeStatus}
          />

          {/* Slide Over Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[460px] max-w-full z-50 flex flex-col shadow-2xl transition-colors duration-300"
            style={{
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] transition-colors duration-300">
              <div className="flex items-center gap-2.5">
                <Activity size={16} className="text-[var(--success)]" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">Agent & Pipeline Status</h2>
              </div>
              <button
                onClick={closeStatus}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-[var(--surface)] transition-colors duration-300">
              {/* Active Agents list */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">
                  <Server size={12} />
                  <span>Agent Network Health</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {agents.map((agent) => (
                    <div
                      key={agent.name}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{agent.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{agent.role} &middot; {agent.count}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          agent.status === 'Running' ? 'bg-[var(--success)] dot-pulse' : 'bg-slate-500'
                        )} />
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold">{agent.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streaming Console logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">
                    <Radio size={12} className={cn(isPlaying && 'animate-pulse')} />
                    <span>Pipeline Agent Console</span>
                  </div>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1 rounded bg-[var(--elevated)] border border-[var(--border)] hover:text-[var(--text-primary)] text-slate-500 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-mono"
                  >
                    {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                    {isPlaying ? 'PAUSE' : 'LIVE'}
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-[10px] text-emerald-500 space-y-1.5 h-64 overflow-y-auto shadow-inner leading-relaxed">
                  {logs.map((log, i) => {
                    const isSuccess = log.includes('[SUCCESS]');
                    return (
                      <div key={i} className={cn(
                        isSuccess ? 'text-[var(--success)] font-semibold' : 'text-slate-400'
                      )}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2 bg-[var(--bg)] transition-colors duration-300">
              <button
                onClick={closeStatus}
                className="px-4 py-2 rounded-lg bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold transition-all hover:bg-white/5 cursor-pointer"
              >
                Close Pipeline view
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
