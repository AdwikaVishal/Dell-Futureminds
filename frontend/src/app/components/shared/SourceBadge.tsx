const TEXT_MUTED = "#8B9890";
const BORDER = "#232B26";

export function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    Jira: "#2684ff",
    ServiceNow: "#62d84e",
    Outlook: "#0078d4",
    Slack: "#4a154b",
    GitHub: "#ffffff",
    "Meeting Transcripts": "#ff6b35",
  };
  return (
    <span
      style={{
        background: "rgba(255,255,255,0.06)",
        color: TEXT_MUTED,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: 4,
        border: `1px solid ${BORDER}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: colors[source] || "#888",
          display: "inline-block",
        }}
      />
      {source}
    </span>
  );
}
