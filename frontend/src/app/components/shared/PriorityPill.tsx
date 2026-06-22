const MAP: Record<string, { color: string; bg: string; label: string }> = {
  P0: { color: "#0D0D0D", bg: "var(--pastel-pink)", label: "P0" },
  P1: { color: "#0D0D0D", bg: "var(--pastel-orange)", label: "P1" },
  P2: { color: "#0D0D0D", bg: "var(--pastel-yellow)", label: "P2" },
  P3: { color: "#0D0D0D", bg: "var(--border-default)", label: "P3" },
};

export function PriorityPill({ level }: { level: "P0" | "P1" | "P2" | "P3" }) {
  const s = MAP[level] || MAP.P3;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}
