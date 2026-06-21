const SAGE = "#8FCBA8";
const TEXT_MUTED = "#8B9890";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "In Progress": { bg: "rgba(143,203,168,0.12)", color: SAGE },
  "Done": { bg: "rgba(80,180,100,0.12)", color: "#50b464" },
  "Not started": { bg: "rgba(139,152,144,0.1)", color: TEXT_MUTED },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS["Not started"];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
      {status}
    </span>
  );
}
