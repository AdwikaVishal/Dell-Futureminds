import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Check, Terminal, FileText } from 'lucide-react';
import { useModals } from '../../lib/ModalContext';
import { cn } from '../../lib/utils';

interface ExtractionTemplate {
  name: string;
  source: 'email' | 'slack' | 'meeting';
  text: string;
  extractedTitle: string;
  confidence: number;
}

const templates: ExtractionTemplate[] = [
  {
    name: 'VP Incident Escalation',
    source: 'email',
    text: 'From: VP Engineering\nSubject: URGENT: EU-West-1 OAuth cert expiration risk\nHi team, our telemetry alerts indicate the OAuth certificate for auth services on EU-West-1 expires in 24 hours. We need a hotfix and cert rotation completed immediately to avoid downtime.',
    extractedTitle: 'Hotfix & rotate OAuth security certificate on EU-West-1',
    confidence: 97,
  },
  {
    name: 'Ops Slack Alert',
    source: 'slack',
    text: '#dev-ops | 15:42\n[Alertmanager] CPU saturation threshold exceeded on production database node-02 (94% utilization). Staging rollback and connection pooling limits check requested.',
    extractedTitle: 'Investigate node-02 CPU saturation and connection limit constraints',
    confidence: 88,
  },
  {
    name: 'Standup Meeting Action',
    source: 'meeting',
    text: 'Transcript - Standup notes June 20:\n"Alex will update the security compliance checklist SEC-132 before audit submission on Monday. Let\'s make sure we document all network rules."',
    extractedTitle: 'Document network rule configurations for SEC-132 audit compliance',
    confidence: 91,
  },
];

export const NewRequestModal: React.FC = () => {
  const { isNewRequestOpen, closeNewRequest, addNotification } = useModals();
  const [inputText, setInputText] = useState('');
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'extracted' | 'inserted'>('input');
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ExtractionTemplate | null>(null);

  const steps = [
    'Parsing unstructured stream input...',
    'Extracting semantic tasks & action items...',
    'Running correlation & deduplication match check...',
    'Recalculating agenda priority ranks...',
  ];

  // Reset state on open
  useEffect(() => {
    if (isNewRequestOpen) {
      setInputText('');
      setPhase('input');
      setActiveStep(0);
      setSelectedTemplate(null);
    }
  }, [isNewRequestOpen]);

  // Handle template click
  const handleSelectTemplate = (tpl: ExtractionTemplate) => {
    setSelectedTemplate(tpl);
    setInputText(tpl.text);
  };

  // Run mock analysis loop
  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setPhase('analyzing');
    setActiveStep(0);

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setPhase('extracted');
          }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
  };

  const handleInsert = () => {
    const title = selectedTemplate ? selectedTemplate.extractedTitle : 'Extracted AI task from custom input';
    const source = selectedTemplate ? selectedTemplate.source : 'email';
    
    // Add a live notification
    addNotification({
      type: source.toUpperCase(),
      msg: `AI Synced: "${title.slice(0, 45)}..." added to daily agenda.`,
      time: 'Just now',
      color: source === 'email' ? 'text-[var(--danger)]' : source === 'slack' ? 'text-[var(--warning)]' : 'text-[var(--success)]',
    });

    setPhase('inserted');
    setTimeout(() => {
      closeNewRequest();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isNewRequestOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeNewRequest}
          >
            {/* Modal Dialog */}
            <motion.div
              className="w-full max-w-lg rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl transition-colors duration-300"
              style={{ background: 'var(--surface)' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[var(--success)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">New AI Request Ingestion</span>
                </div>
                <button
                  onClick={closeNewRequest}
                  className="p-1 rounded-lg text-slate-500 hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {phase === 'input' && (
                  <div className="space-y-4">
                    {/* Templates */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Quick Templates</div>
                      <div className="flex flex-wrap gap-2">
                        {templates.map((tpl) => (
                          <button
                            key={tpl.name}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer",
                              selectedTemplate?.name === tpl.name
                                ? "border-[var(--success)] bg-[var(--success)]/8 text-[var(--success)]"
                                : "border-[var(--border)] hover:bg-[var(--elevated)]/50 text-[var(--text-secondary)]"
                            )}
                          >
                            {tpl.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TextArea input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Unstructured Input Text</label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste an email body, meeting transcript snippet, or incident log stream here..."
                        className="w-full h-36 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] placeholder-slate-600 outline-none focus:border-[var(--success)] transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={!inputText.trim()}
                      className="w-full py-2.5 rounded-lg bg-[var(--success)] hover:opacity-90 disabled:opacity-40 text-[var(--bg)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send size={12} />
                      Analyze & Extract Action Items
                    </button>
                  </div>
                )}

                {phase === 'analyzing' && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-6">
                    {/* Pulsing ring */}
                    <div className="relative w-14 h-14 rounded-full border-2 border-[var(--success)]/20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--success)] animate-ping opacity-30" />
                      <Sparkles size={20} className="text-[var(--success)]" />
                    </div>

                    {/* Step log console */}
                    <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-[10px] text-[var(--text-secondary)] space-y-2">
                      <div className="flex items-center gap-1.5 text-[var(--success)] border-b border-[var(--border)] pb-1.5 mb-2">
                        <Terminal size={11} />
                        <span>AI Extraction Agent Running...</span>
                      </div>
                      {steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 transition-all duration-300",
                            idx < activeStep ? "text-[var(--success)] font-semibold" : idx === activeStep ? "text-[var(--text-primary)]" : "opacity-30"
                          )}
                        >
                          <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">
                            {idx < activeStep ? <Check size={8} /> : idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase === 'extracted' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Extracted results card */}
                    <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">AI Extracted Action Item</div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 uppercase font-mono">
                          {selectedTemplate?.source ?? 'custom'}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">Confidence: {selectedTemplate?.confidence ?? 90}%</span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                        {selectedTemplate?.extractedTitle ?? 'Extracted AI task from custom input'}
                      </h3>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--border-strong)] pl-2">
                        "{inputText.slice(0, 100)}..."
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPhase('input')}
                        className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--elevated)]/50 text-xs font-bold transition-all cursor-pointer"
                      >
                        Start Over
                      </button>
                      <button
                        onClick={handleInsert}
                        className="flex-1 py-2.5 rounded-lg bg-[var(--success)] hover:opacity-90 text-[var(--bg)] text-xs font-bold transition-all cursor-pointer"
                      >
                        Accept & Sync to Daily Plan
                      </button>
                    </div>
                  </div>
                )}

                {phase === 'inserted' && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 border border-[var(--success)]/30 flex items-center justify-center text-[var(--success)] shadow-[0_0_12px_var(--success)]">
                      <Check size={20} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Sync Successful</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">Action item added to Daily Plan, weights re-prioritized.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
