import { useState } from "react";
import { ChevronDown, ChevronUp, Info, CheckCircle, TrendingUp } from "lucide-react";
import { Card } from "./Card";
import { SourceBadge } from "./SourceBadge";
import { PriorityPill } from "./PriorityPill";
import { StatusPill } from "./StatusPill";
import type { RankedTask } from "../../api/taskpilot";

const FACTOR_LABELS: Record<string, string> = {
  severity: "Severity",
  deadline_urgency: "Deadline Urgency",
  business_impact: "Business Impact",
  dependency_impact: "Dependency Impact",
  customer_impact: "Customer Impact",
  escalation_weight: "Escalation",
  team_blocking_weight: "Team Blocking",
};

const FACTOR_COLORS: Record<string, string> = {
  severity: "#F7C5E6",
  deadline_urgency: "#FAD6B3",
  business_impact: "#DCC7F7",
  dependency_impact: "#C9D8FF",
  customer_impact: "#BFD78D",
  escalation_weight: "#F5D66E",
  team_blocking_weight: "var(--border-default)",
};

export function PriorityCard({
  task,
  rank,
  onComplete,
}: {
  task: RankedTask;
  rank: number;
  onComplete?: () => void;
}) {
  const [showRationale, setShowRationale] = useState(false);

  const breakdown = task.score_breakdown || {};
  const factors = Object.entries(FACTOR_LABELS).filter(([key]) => key in breakdown);

  return (
    <Card shadow>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: rank <= 3 ? "#0D0D0D" : "var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: rank <= 3 ? "#FFFFFF" : "var(--text-secondary)",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            #{rank}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <PriorityPill level={(task.priority ?? "P3") as any} />
            <SourceBadge source={task.source || task.source_type} />
            <StatusPill status={task.status || "open"} />
            {task.deadline && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                Due: {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
              Score: {task.score.toFixed(1)}
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </h3>

          <button
            onClick={() => setShowRationale(!showRationale)}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {showRationale ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            {showRationale ? "Hide AI Reasoning" : "Show AI Reasoning"}
          </button>

          {showRationale && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                background: "var(--bg-primary)",
                borderRadius: 12,
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <Info size={14} style={{ color: "var(--blue-primary)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {task.rationale || "No rationale available."}
                </div>
              </div>

              {factors.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    Score Breakdown
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6 }}>
                    {factors.map(([key, label]) => {
                      const val = breakdown[key] ?? 0;
                      return (
                        <div
                          key={key}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: FACTOR_COLORS[key] || "var(--bg-primary)",
                          }}
                        >
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                            {typeof val === "number" ? val.toFixed(1) : val}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {onComplete && (
            <button
              onClick={onComplete}
              style={{
                padding: "8px 14px",
                background: "#BFD78D",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <CheckCircle size={12} /> Done
            </button>
          )}
          <button
            onClick={() => setShowRationale((v) => !v)}
            style={{
              padding: "8px 14px",
              background: showRationale ? "#0D0D0D" : "var(--bg-primary)",
              color: showRationale ? "#FFFFFF" : "var(--text-secondary)",
              border: "none",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <TrendingUp size={12} /> Details
          </button>
        </div>
      </div>
    </Card>
  );
}
