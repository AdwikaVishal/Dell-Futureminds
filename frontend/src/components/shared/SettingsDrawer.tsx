import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Cpu, RefreshCw, Sliders, Check } from 'lucide-react';
import { useModals, ModelName } from '../../lib/ModalContext';

export const SettingsDrawer: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    activeModel,
    setActiveModel,
    autoSync,
    setAutoSync,
    latency,
    setLatency,
  } = useModals();

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    if (isSettingsOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  const models: ModelName[] = [
    'Gemini 1.5 Pro (Recommended)',
    'Gemini 1.5 Flash',
    'Claude 3.5 Sonnet',
  ];

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
          />

          {/* Slide Over panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[440px] max-w-full z-50 flex flex-col shadow-2xl transition-colors duration-300"
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
                <Settings size={16} className="text-[var(--success)]" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">System Configuration</h2>
              </div>
              <button
                onClick={closeSettings}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-[var(--surface)] transition-colors duration-300">
              {/* LLM Select */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">
                  <Cpu size={12} />
                  <span>Active Reasoning Model</span>
                </div>
                <div className="space-y-1.5">
                  {models.map((model) => {
                    const isSelected = activeModel === model;
                    return (
                      <button
                        key={model}
                        onClick={() => setActiveModel(model)}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-lg border text-left text-xs transition-all duration-200 cursor-pointer"
                        style={{
                          background: isSelected ? 'var(--elevated)' : 'transparent',
                          borderColor: isSelected ? 'var(--success)' : 'var(--border)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <span className="font-medium">{model}</span>
                        {isSelected && <Check size={13} className="text-[var(--success)] flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sync settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">
                  <RefreshCw size={12} />
                  <span>Ingestion Pipeline Sync</span>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Real-time Ingest Monitor</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Auto-synchronize unstructured developer streams</div>
                    </div>
                    <button
                      onClick={() => setAutoSync(!autoSync)}
                      className="relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer"
                      style={{
                        background: autoSync ? 'var(--success)' : 'var(--border-strong)',
                      }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5"
                        animate={{ x: autoSync ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mock Latency slider */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--success)] uppercase tracking-widest font-mono">
                  <Sliders size={12} />
                  <span>Pipeline Analysis Latency</span>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Mock Engine Latency</span>
                    <span className="font-mono font-bold text-[var(--success)]">{latency}ms</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={latency}
                    onChange={(e) => setLatency(parseInt(e.target.value))}
                    className="w-full h-1 bg-[var(--border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--success)]"
                  />
                  <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono">
                    <span>50ms</span>
                    <span>1000ms (simulate compute)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2 bg-[var(--bg)] transition-colors duration-300">
              <button
                onClick={closeSettings}
                className="px-4 py-2 rounded-lg bg-[var(--success)] hover:opacity-90 text-[var(--bg)] text-[11px] font-bold transition-all cursor-pointer"
              >
                Apply & Save Settings
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
