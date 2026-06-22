import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Loader2, Copy, Check, MessageSquare, Trash2 } from "lucide-react";
import { chat, getChatHistory, clearChatHistory, ChatResponse, ChatHistoryItem } from "../api/taskpilot";

const SAMPLE_QUESTIONS = [
  { text: "What's my top priority?", icon: "🎯" },
  { text: "What should I work on next?", icon: "⚡" },
  { text: "Summarize my tasks", icon: "📊" },
  { text: "What's blocking me?", icon: "🚧" },
  { text: "Which tasks are most difficult?", icon: "🔷" },
  { text: "What's due this week?", icon: "⏰" },
  { text: "Show my P0/P1 critical tasks", icon: "🔴" },
  { text: "Compare my top priorities", icon: "⚖️" },
  { text: "How many tasks do I have?", icon: "🔢" },
  { text: "Show hidden tasks from emails", icon: "👻" },
  { text: "What are my task dependencies?", icon: "🔗" },
  { text: "Generate weekly summary", icon: "📋" },
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

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await getChatHistory(30);
      if (res.history?.length > 0) {
        const msgs: Message[] = res.history.map((item: ChatHistoryItem) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
          referencedTasks: item.referenced_tasks,
        }));
        setMessages(msgs);
      }
    } catch {
      // no history
    } finally {
      setHistoryLoaded(true);
    }
  };

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

  const handleClear = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch {
      // ignore
    }
  };

  const handleSampleClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const showWelcome = messages.length === 0 && historyLoaded;
  const hasMessages = messages.length > 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      maxWidth: 860, margin: "0 auto", width: "100%",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 0", marginBottom: 8, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MessageSquare size={16} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
              AI Assistant
            </h2>
            <p style={{ fontSize: 12, color: "#7A7A7A", margin: 0 }}>
              Ask me anything about your tasks
            </p>
          </div>
        </div>
        {hasMessages && (
          <button
            onClick={handleClear}
            title="Clear chat history"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              background: "transparent", border: "1px solid #E9E4D8",
              cursor: "pointer", color: "#7A7A7A", fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <Trash2 size={14} />
            Clear history
          </button>
        )}
      </div>

      <div style={{
        flex: 1, overflow: "auto", display: "flex", flexDirection: "column",
        gap: 16, padding: "4px 0",
      }}>
        {showWelcome && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "40px 20px",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "rgba(249, 115, 22, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <Sparkles size={32} color="#F97316" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#111111", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
              How can I help you today?
            </h3>
            <p style={{ fontSize: 13, color: "#7A7A7A", maxWidth: 420, margin: "0 0 28px", lineHeight: 1.6 }}>
              I have full visibility into your task ecosystem. Ask me about priorities, blockers, deadlines, 
              comparisons, difficulty, or anything else about your workload.
            </p>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 6, width: "100%", maxWidth: 560,
            }}>
              {SAMPLE_QUESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSampleClick(s.text)}
                  style={{
                    padding: "10px 14px",
                    background: "#FFFFFF",
                    border: "1px solid #E9E4D8",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    color: "#111111",
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#F97316"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#E9E4D8"}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasMessages && messages.map((msg) =>
          msg.isTyping ? (
            <div key={msg.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#F6F2E9", border: "1px solid #E9E4D8",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Bot size={16} color="#7A7A7A" />
              </div>
              <div style={{
                background: "#C9D8FF", padding: "12px 16px", borderRadius: 16,
                display: "flex", gap: 4,
              }}>
                <span style={{ width: 7, height: 7, background: "#7A7A7A", borderRadius: "50%", animation: "bounce 1.4s infinite" }} />
                <span style={{ width: 7, height: 7, background: "#7A7A7A", borderRadius: "50%", animation: "bounce 1.4s infinite", animationDelay: "0.2s" }} />
                <span style={{ width: 7, height: 7, background: "#7A7A7A", borderRadius: "50%", animation: "bounce 1.4s infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          ) : (
            <div key={msg.id} style={{ display: "flex", gap: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#F6F2E9", border: "1px solid #E9E4D8",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4,
                }}>
                  <Bot size={16} color="#7A7A7A" />
                </div>
              )}
              <div style={{ maxWidth: "75%" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: msg.role === "user" ? "#F97316" : "#C9D8FF",
                  color: msg.role === "user" ? "#FFFFFF" : "#111111",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>

                {msg.referencedTasks && msg.referencedTasks.length > 0 && (
                  <div style={{
                    marginTop: 8, padding: "8px 12px",
                    background: "#F6F2E9", borderRadius: 12,
                    border: "1px solid #E9E4D8",
                  }}>
                    <div style={{ fontSize: 11, color: "#7A7A7A", marginBottom: 4, fontWeight: 500 }}>
                      Referenced Tasks:
                    </div>
                    {msg.referencedTasks.map((task, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#111111", padding: "2px 0" }}>
                        <span style={{
                          display: "inline-block", padding: "1px 6px", borderRadius: 4,
                          background: "#C9D8FF", fontSize: 10, fontWeight: 600, fontFamily: "monospace", marginRight: 6,
                        }}>{task.id}</span>
                        {task.title}
                      </div>
                    ))}
                  </div>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#7A7A7A", marginBottom: 6, fontWeight: 500 }}>
                      Try asking:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSampleClick(s)}
                          style={{
                            padding: "5px 12px",
                            background: "#FFFFFF",
                            border: "1px solid #E9E4D8",
                            borderRadius: 8,
                            fontSize: 11,
                            color: "#7A7A7A",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "#F97316"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "#E9E4D8"}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.role === "assistant" && (
                  <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "2px 4px", display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#B0A8A0", fontFamily: "inherit",
                      }}
                    >
                      {copied === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      {copied === msg.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#F97316",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4,
                }}>
                  <User size={16} color="#FFFFFF" />
                </div>
              )}
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: "16px 0", flexShrink: 0, borderTop: "1px solid #E9E4D8", marginTop: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your tasks..."
            style={{
              flex: 1, border: "1px solid #E9E4D8", borderRadius: 14,
              padding: "12px 16px", fontSize: 13, outline: "none",
              background: "#FFFFFF", color: "#111111", fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: input.trim() && !sending ? "#0D0D0D" : "#E9E4D8",
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            {sending ? (
              <Loader2 size={16} color="#FFFFFF" style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={16} color={input.trim() ? "#FFFFFF" : "#B0A8A0"} />
            )}
          </button>
        </div>
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
