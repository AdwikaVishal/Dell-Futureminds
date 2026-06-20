import { useState } from "react";

const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";

function derivePreference(task: any): string {
  const title = (task.title || "").toLowerCase();
  const src = (task.source_type || "").toLowerCase();
  if (["security", "audit", "token", "vulnerability"].some((k) => title.includes(k))) return "prefer_security";
  if (["ui", "dashboard", "safari", "render", "chart"].some((k) => title.includes(k))) return "prefer_ui_bugs";
  if (["database", "migration", "api", "sync", "websocket"].some((k) => title.includes(k)))
    return "prefer_backend";
  if (["memory", "leak", "latency", "performance"].some((k) => title.includes(k))) return "prefer_performance";
  if (["refactor", "cleanup", "docs"].some((k) => title.includes(k))) return "prefer_refactors";
  if (["github", "jira", "slack", "connector"].some((k) => title.includes(k))) return "prefer_integrations";
  return `prefer_${src}`;
}

export function FeedbackButton({ task, compact }: { task: any; compact?: boolean }) {
  const [sent, setSent] = useState(false);

  const handleUpvote = async () => {
    if (sent) return;
    const preference = derivePreference(task);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, action: "upvote", preference }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch {
      // silently fail
    }
  };

  return (
    <button
      onClick={handleUpvote}
      title="Upvote this task type"
      style={{
        background: "none",
        border: sent ? `1px solid ${SAGE}` : "1px solid transparent",
        cursor: "pointer",
        color: sent ? SAGE : TEXT_MUTED,
        padding: compact ? "2px 6px" : "3px 8px",
        borderRadius: 6,
        fontSize: compact ? 10 : 11,
        fontWeight: 500,
        transition: "all 0.2s",
        opacity: sent ? 1 : 0.5,
      }}
      onMouseEnter={(e) => { if (!sent) e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { if (!sent) e.currentTarget.style.opacity = "0.5"; }}
    >
      {sent ? "Learned!" : "Teach"}
    </button>
  );
}
