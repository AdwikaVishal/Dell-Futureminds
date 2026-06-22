import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { SourceBadge } from "../shared/SourceBadge";
import { SparkleIcon } from "../shared/SparkleIcon";
import { sendChatMessage } from "../../api/taskpilot";


const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const CARD_BG = "#161D19";
const BORDER = "#232B26";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  citations?: string[];
}

export function Screen3() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const resp = await sendChatMessage(userMsg);
      setMessages(prev => [...prev, { role: "ai", content: resp.response, citations: [] }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "I'm sorry, I couldn't process that request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "20px 28px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 18, fontWeight: 600, margin: 0 }}>Chat Assistant</h2>
            <p style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>Ask anything about your tasks, priorities, or sources</p>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 13, marginTop: 40 }}>
                <SparkleIcon size={20} color={SAGE} />
                <p style={{ marginTop: 12 }}>Ask me about your tasks, priorities, or any source.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                  {["What's my #1 priority?", "Any blockers?", "Summarize recent emails"].map(q => (
                    <button key={q} onClick={() => { setInput(q); }}
                      style={{ background: "rgba(143,203,168,0.07)", border: `1px solid rgba(143,203,168,0.18)`, borderRadius: 20, padding: "5px 12px", color: SAGE, fontSize: 12, cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
                {msg.role === "ai" && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(143,203,168,0.12)", border: `1px solid rgba(143,203,168,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <SparkleIcon size={14} />
                  </div>
                )}
                <div style={{ maxWidth: msg.role === "user" ? 420 : 580, background: msg.role === "ai" ? "rgba(143,203,168,0.05)" : CARD_BG, border: msg.role === "ai" ? `1px solid rgba(143,203,168,0.15)` : `1px solid ${BORDER}`, borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "4px 12px 12px 12px", padding: "12px 16px" }}>
                  <span style={{ color: TEXT_PRIMARY, fontSize: 13 }}>{msg.content}</span>
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: 8, color: TEXT_MUTED, fontSize: 11 }}>
                      References: {msg.citations.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(143,203,168,0.12)", border: `1px solid rgba(143,203,168,0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SparkleIcon size={14} />
                </div>
                <div style={{ background: "rgba(143,203,168,0.05)", border: `1px solid rgba(143,203,168,0.15)`, borderRadius: "4px 12px 12px 12px", padding: "12px 16px" }}>
                  <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "0 28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px", gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask about your tasks, priorities, or any source…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT_PRIMARY, fontSize: 13 }} />
              <button onClick={handleSend}
                style={{ background: SAGE, border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <Send size={14} color="#0a1a0f" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
