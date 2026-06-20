import { LogoMark } from "./LogoMark";

const SAGE = "#8FCBA8";
const TEXT_PRIMARY = "#EDF3EF";
const BORDER = "#232B26";
const CARD = "#161D19";

export function AppHeader({ planTime }: { planTime?: string }) {
  return (
    <div
      style={{
        height: 52,
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: CARD,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogoMark size={22} />
        <span style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: 14 }}>TaskPilot AI</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {planTime && (
          <span
            style={{
              background: "rgba(143,203,168,0.12)",
              color: SAGE,
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 20,
              border: `1px solid rgba(143,203,168,0.2)`,
            }}
          >
            {planTime}
          </span>
        )}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2a5c3a, #1a3d2b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${BORDER}`,
            color: SAGE,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          A
        </div>
      </div>
    </div>
  );
}
