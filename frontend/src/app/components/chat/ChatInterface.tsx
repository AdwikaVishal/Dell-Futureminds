import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Loader2, X, Copy, Check, MessageSquare } from "lucide-react";
import { chat, getChatHistory, clearChatHistory, ChatResponse, ChatHistoryItem } from "../../api/taskpilot";

const SUGGESTIONS = [
  { text: "What's my top priority?", icon: "\uD83C\uDFAF" },
  { text: "What should I work on next?", icon: "\u26A1" },
  { text: "Summarize my tasks", icon: "\uD83D\uDCCA" },
  { text: "What's blocking me?", icon: "\uD83D\uDEA7" },
  { text: "Which tasks are most difficult?", icon: "\uD83D\uDD37" },
  { text: "Show my plan for today", icon: "\uD83D\uDCC5" },
  { text: "What's due this week?", icon: "\u23F0" },
  { text: "How many tasks do I have?", icon: "\uD83D\uDD22" },
  { text: "Show my P0/P1 critical tasks", icon: "\uD83D\uDD34" },
  { text: "Compare my top priorities", icon: "\u2696\uFE0F" },
  { text: "Generate weekly summary", icon: "\uD83D\uDCCB" },
  { text: "Help me prioritize", icon: "\uD83D\uDCA1" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  referencedTasks?: Array<{ id: string; title: string; source: string }>;
  suggestions?: string[];
  isTyping?: boolean;
}

export function ChatInterface({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getChatHistory(20);
      if (res.history?.length > 0) {
        const msgs: Message[] = res.history.map((item: ChatHistoryItem) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
          referencedTasks: item.referenced_tasks,
        }));
        setMessages(msgs);
      } else {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Ask me anything about your tasks \u2014 priorities, blockers, summaries, or what to do next.",
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Ask me anything about your tasks \u2014 priorities, blockers, summaries, or what to do next.",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || sending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    setMessages(prev => [...prev, {
      id: "typing",
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isTyping: true,
    }]);

    try {
      const res: ChatResponse = await chat(q);
      setMessages(prev => prev.filter(m => m.id !== "typing"));
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        referencedTasks: res.referenced_tasks,
        suggestions: res.suggestions,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== "typing"));
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  const handleClear = async () => {
    try {
      await clearChatHistory();
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Chat history cleared. Ask me anything about your tasks!",
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      // ignore
    }
  };

  const TypingIndicator = () => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: "var(--bg-primary)", border: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Bot size={14} style={{ color: "var(--text-muted)" }} />
      </div>
      <div style={{
        background: "var(--pastel-blue)", padding: "10px 14px", borderRadius: 14,
        display: "flex", gap: 4,
      }}>
        <span style={{ width: 6, height: 6, background: "var(--text-muted)", borderRadius: "50%", animation: "bounce 1.4s infinite" }} />
        <span style={{ width: 6, height: 6, background: "var(--text-muted)", borderRadius: "50%", animation: "bounce 1.4s infinite", animationDelay: "0.2s" }} />
        <span style={{ width: 6, height: 6, background: "var(--text-muted)", borderRadius: "50%", animation: "bounce 1.4s infinite", animationDelay: "0.4s" }} />
      </div>
    </div>
  );

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";

    return (
      <div style={{ display: "flex", gap: 10, justifyContent: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "var(--bg-primary)", border: "1px solid var(--border-default)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Bot size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        )}
        <div style={{ maxWidth: "85%" }}>
          <div style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: isUser ? "var(--blue-primary)" : "var(--pastel-blue)",
            color: isUser ? "#FFFFFF" : "var(--text-primary)",
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}>
            {message.content}
          </div>

          {message.referencedTasks && message.referencedTasks.length > 0 && (
            <div style={{
              marginTop: 6, padding: "6px 10px",
              background: "var(--bg-primary)", borderRadius: 10,
              border: "1px solid var(--border-default)",
            }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 500 }}>
                Referenced Tasks:
              </div>
              {message.referencedTasks.map((task, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--text-primary)", padding: "2px 0" }}>
                  {task.id}: {task.title}
                </div>
              ))}
            </div>
          )}

          {message.suggestions && message.suggestions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 500 }}>
                Try asking:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {message.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      padding: "4px 10px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isUser && (
            <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
              <button
                onClick={() => handleCopy(message.content, message.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 2, display: "flex", alignItems: "center",
                  fontSize: 11, color: "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {copied === message.id ? <Check size={11} /> : <Copy size={11} />}
                <span style={{ marginLeft: 3 }}>{copied === message.id ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}
        </div>
        {isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "var(--blue-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <User size={14} color="#FFFFFF" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-panel)" }}>
      <div style={{
        padding: "16px 18px", borderBottom: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "var(--blue-primary)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <MessageSquare size={14} color="#FFFFFF" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)", flex: 1 }}>
          AI Assistant
        </span>
        <button
          onClick={handleClear}
          title="Clear chat history"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", display: "flex", padding: 4,
          }}
        >
          <X size={14} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", padding: 4,
            }}
          >
            {"\u2715"}
          </button>
        )}
      </div>

      <div style={{
        flex: 1, overflow: "auto", padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "20px 0",
          }}>
            <Sparkles size={40} style={{ color: "var(--pastel-blue)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
              Ask me anything about your tasks
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 260, margin: "0 0 20px", lineHeight: 1.5 }}>
              I can help you prioritize, plan, summarize, and understand your workload.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: 260 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestionClick(s.text)}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) =>
            msg.isTyping ? <TypingIndicator key={msg.id} /> : <MessageBubble key={msg.id} message={msg} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: "12px 14px", borderTop: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          style={{
            flex: 1, border: "1px solid var(--border-default)", borderRadius: 12,
            padding: "10px 12px", fontSize: 13, outline: "none",
            background: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: input.trim() && !sending ? "var(--bg-sidebar)" : "var(--border-default)",
            border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        >
          {sending ? (
            <Loader2 size={14} color="#FFFFFF" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Send size={14} color={input.trim() ? "#FFFFFF" : "var(--text-muted)"} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
