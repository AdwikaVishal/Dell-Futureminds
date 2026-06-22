const SOURCE_COLORS: Record<string, string> = {
  jira: "var(--pastel-blue)", Jira: "var(--pastel-blue)",
  github: "var(--pastel-purple)", GitHub: "var(--pastel-purple)",
  slack: "var(--pastel-pink)", Slack: "var(--pastel-pink)",
  outlook: "var(--pastel-blue)", Outlook: "var(--pastel-blue)",
  email: "var(--pastel-blue)", Email: "var(--pastel-blue)",
  servicenow: "var(--pastel-green)", ServiceNow: "var(--pastel-green)",
  "meeting transcripts": "var(--pastel-orange)", "Meeting Transcripts": "var(--pastel-orange)",
  defect: "var(--pastel-pink)", Defect: "var(--pastel-pink)",
  injected: "var(--pastel-yellow)", Injected: "var(--pastel-yellow)",
};

export function SourceBadge({ source }: { source: string }) {
  const bg = SOURCE_COLORS[source] || "var(--border-default)";
  return (
    <span style={{
      background: bg, color: "#0D0D0D",
      fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 8,
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {source}
    </span>
  );
}
