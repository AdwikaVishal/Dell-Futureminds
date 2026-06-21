export function PriorityPill({ level }: { level: "P0" | "P1" | "P2" | "P3" }) {
  const map = {
    P0: { bg: "rgba(220,80,80,0.15)", color: "#e05555", label: "P0 critical" },
    P1: { bg: "rgba(200,140,40,0.15)", color: "#c8a040", label: "P1 high" },
    P2: { bg: "rgba(80,180,100,0.15)", color: "#50b464", label: "P2 medium" },
    P3: { bg: "rgba(120,120,160,0.15)", color: "#8888aa", label: "P3 low" },
  };
  const s = map[level];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
