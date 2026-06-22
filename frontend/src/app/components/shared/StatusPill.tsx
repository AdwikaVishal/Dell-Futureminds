const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  "In Progress": { bg: "var(--pastel-blue)", color: "#0D0D0D" },
  "Done": { bg: "var(--pastel-green)", color: "#0D0D0D" },
  "Not started": { bg: "var(--border-default)", color: "#0D0D0D" },
  "open": { bg: "var(--border-default)", color: "#0D0D0D" },
  "in_progress": { bg: "var(--pastel-blue)", color: "#0D0D0D" },
  "blocked": { bg: "var(--pastel-pink)", color: "#0D0D0D" },
  "done": { bg: "var(--pastel-green)", color: "#0D0D0D" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { bg: "var(--border-default)", color: "#0D0D0D" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 8,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {status}
    </span>
  );
}
