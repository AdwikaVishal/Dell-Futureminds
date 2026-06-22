import { ArrowRight, Sparkles, LayoutDashboard, Inbox, CalendarRange, ListChecks, BarChart3, GitBranch, Puzzle, Bell } from "lucide-react";

const FEATURES = [
  { icon: Inbox, label: "Unified Inbox", desc: "All tasks from Jira, GitHub, Slack, Outlook in one place" },
  { icon: Sparkles, label: "Hidden Task AI", desc: "AI extracts action items from emails and meeting transcripts" },
  { icon: BarChart3, label: "AI Prioritization", desc: "Smart scoring based on urgency, dependencies, and impact" },
  { icon: GitBranch, label: "Dependency Graph", desc: "Visual map of task relationships and blockers" },
  { icon: CalendarRange, label: "Smart Planner", desc: "Auto-generated daily plans with time blocking" },
  { icon: Puzzle, label: "Integrations", desc: "Connect Jira, GitHub, Slack, Outlook, and more" },
];

const PROBLEMS = [
  { emoji: "🔄", label: "Context Switching", desc: "Jumping between 6+ tools to find what matters" },
  { emoji: "👻", label: "Hidden Tasks", desc: "Action items buried in emails and meetings" },
  { emoji: "⏰", label: "Missed Deadlines", desc: "No unified view of what's due and when" },
  { emoji: "🔌", label: "Tool Overload", desc: "Too many platforms, no single source of truth" },
];

export function Screen0({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      width: "100%", minHeight: "100%",
      background: "#F6F2E9", fontFamily: "'Inter', sans-serif",
      overflow: "auto",
    }}>
      <div style={{ borderBottom: "1px solid #E9E4D8", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Space Grotesk', sans-serif" }}>TaskPilot</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Features", "How it Works", "Demo"].map((l) => (
            <button key={l} style={{ background: "none", border: "none", padding: "8px 16px", fontSize: 13, color: "#7A7A7A", cursor: "pointer" }}>{l}</button>
          ))}
          <button onClick={onStart} style={{
            background: "#0D0D0D", color: "#FFFFFF", border: "none",
            padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Get Started <ArrowRight size={14} style={{ marginLeft: 6, display: "inline" }} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          <div>
            <h1 style={{ fontSize: 48, margin: "0 0 16px", lineHeight: 1.1 }}>
              Your AI Chief of Staff for Engineering Work
            </h1>
            <p style={{ fontSize: 16, color: "#7A7A7A", lineHeight: 1.6, margin: "0 0 32px" }}>
              TaskPilot unifies tasks from Jira, emails, Slack, GitHub and meetings into one AI-powered dashboard that prioritizes, plans, and surfaces what matters.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={onStart} style={{
                background: "#0D0D0D", color: "#FFFFFF", border: "none",
                padding: "14px 32px", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Start Free Trial
              </button>
              <button style={{
                background: "none", border: "1px solid #E9E4D8", borderRadius: 14,
                padding: "14px 32px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#111111",
              }}>
                Watch Demo
              </button>
            </div>
          </div>
          <div style={{
            background: "#FFFFFF", borderRadius: 20, border: "1px solid #E9E4D8",
            padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Dashboard Preview</span>
              <span style={{ color: "#B0A8A0", fontSize: 12 }}>14 tasks · 3 urgent</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {["#F7C5E6", "#F5D66E", "#BFD78D", "#C9D8FF"].map((c, i) => (
                <div key={i} style={{ background: c, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#7A7A7A", marginBottom: 4 }}>Card {i + 1}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{[14, 87, 2, 4.5][i]}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#F7C5E6", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>#1 Fix Payment API Bug</div>
              <div style={{ fontSize: 11, color: "#7A7A7A" }}>P1 · Due in 3h · Blocks: 2 teammates</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 80 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 12px" }}>The Problem We Solve</h2>
          <p style={{ textAlign: "center", color: "#7A7A7A", fontSize: 15, margin: "0 0 32px" }}>Engineers lose 4+ hours/week just figuring out what to work on.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {PROBLEMS.map((p) => (
              <div key={p.label} style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid #E9E4D8", padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{p.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{p.label}</div>
                <div style={{ color: "#7A7A7A", fontSize: 13 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 80 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 32px" }}>Everything You Need</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid #E9E4D8", padding: 24 }}>
                  <Icon size={24} color="#0D0D0D" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{f.label}</div>
                  <div style={{ color: "#7A7A7A", fontSize: 13 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 80 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 32px" }}>How It Works</h2>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {[
              { step: "01", label: "Connect Sources", desc: "Link Jira, GitHub, Slack, Outlook" },
              { step: "02", label: "AI Understands", desc: "Extracts tasks from all sources" },
              { step: "03", label: "Prioritizes", desc: "Scores by urgency & impact" },
              { step: "04", label: "Plans Your Day", desc: "Generates time-blocked plan" },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: "#0D0D0D",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF", fontWeight: 700, fontSize: 16, margin: "0 auto 12px",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>{s.step}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.label}</div>
                <div style={{ color: "#7A7A7A", fontSize: 12 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #E9E4D8", padding: "24px 40px", textAlign: "center", color: "#B0A8A0", fontSize: 13 }}>
        © {new Date().getFullYear()} TaskPilot AI. Built for engineers who deserve better tooling.
      </div>
    </div>
  );
}
