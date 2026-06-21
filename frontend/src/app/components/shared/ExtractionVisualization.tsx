import { SparkleIcon } from "./SparkleIcon";
import { SourceBadge } from "./SourceBadge";
import { PriorityPill } from "./PriorityPill";
import { StatusPill } from "./StatusPill";
import type { ExtractionItem } from "@/app/api/taskpilot";

const SAGE = "#8FCBA8";
const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const BORDER = "#232B26";
const CARD_BG = "#161D19";
const RAW_BG = "#111813";

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? SAGE : pct >= 60 ? "#c8a040" : "#e05555";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${color}14`,
        color,
        fontSize: 12,
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: 20,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {pct}% confidence
    </span>
  );
}

function RawSourcePanel({ raw_text }: { raw_text: string }) {
  const lines = raw_text.split("\n").slice(0, 20);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: RAW_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_MUTED,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        Raw source
      </div>
      <div style={{ padding: "12px 14px", overflow: "auto", flex: 1 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: "'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace",
              fontSize: 12,
              lineHeight: 1.6,
              color: line.startsWith("From:") || line.startsWith("Subject:")
                ? SAGE
                : line.startsWith(">")
                  ? TEXT_MUTED
                  : i === 0 || lines[i - 1] === ""
                    ? TEXT_PRIMARY
                    : TEXT_MUTED,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              opacity: line.trim() ? 1 : 0.3,
            }}
          >
            {line || "\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtractedTaskPanel({ item }: { item: ExtractionItem }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: SAGE,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <SparkleIcon size={12} />
        AI-Extracted task
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 2 }}>Title</div>
          <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
            {item.title}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {item.priority && (
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 3 }}>Priority</div>
              <PriorityPill level={item.priority} />
            </div>
          )}
          {item.deadline && (
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 3 }}>Due date</div>
              <span style={{ color: TEXT_PRIMARY, fontSize: 13 }}>{item.deadline}</span>
            </div>
          )}
          <div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 3 }}>Status</div>
            <StatusPill status={item.status || "open"} />
          </div>
        </div>

        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 3 }}>Source</div>
          <SourceBadge source={item.source} />
        </div>

        {item.confidence != null && (
          <div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Confidence</div>
            <ConfidenceBadge value={item.confidence} />
          </div>
        )}

        {item.source_sentence && (
          <div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 2 }}>Source sentence</div>
            <div
              style={{
                color: TEXT_MUTED,
                fontSize: 12,
                fontStyle: "italic",
                lineHeight: 1.5,
                padding: "8px 10px",
                background: "rgba(0,0,0,0.15)",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
              }}
            >
              &ldquo;{item.source_sentence}&rdquo;
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "auto",
            paddingTop: 10,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <a
            href={`/tasks?task=${item.task_id}`}
            style={{
              color: SAGE,
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              opacity: 0.8,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
          >
            Trace to source &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

type ExtractionVisualizationProps = {
  item: ExtractionItem;
};

export function ExtractionVisualization({ item }: ExtractionVisualizationProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid rgba(143,203,168,0.15)`,
        background: CARD_BG,
        overflow: "hidden",
      }}
      role="region"
      aria-label="Extraction visualization"
    >
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(143,203,168,0.05)",
          borderBottom: `1px solid rgba(143,203,168,0.1)`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <SparkleIcon size={13} />
        <span style={{ color: SAGE, fontSize: 12, fontWeight: 500 }}>
          Extraction
        </span>
        <span style={{ color: TEXT_MUTED, fontSize: 12, marginLeft: "auto" }}>
          {item.task_id}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 12,
        }}
      >
        <RawSourcePanel raw_text={item.raw_text} />
        <ExtractedTaskPanel item={item} />
      </div>
    </div>
  );
}
