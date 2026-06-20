import { ArrowRight } from "lucide-react";

const SAGE = "#8FCBA8";
const BG = "#0E1411";
const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const BORDER = "#232B26";

const DOTS = [
  { x: "8%", y: "14%" },
  { x: "22%", y: "72%" },
  { x: "68%", y: "18%" },
  { x: "82%", y: "61%" },
  { x: "91%", y: "30%" },
  { x: "15%", y: "45%" },
  { x: "55%", y: "80%" },
  { x: "40%", y: "9%" },
];

export function Screen0({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        width: "100%", height: "100%", background: BG,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", position: "relative", fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -68%)", width: 520, height: 520,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(30,74,50,0.55) 0%, rgba(20,50,34,0.3) 30%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {DOTS.map((d, i) => (
        <span key={i} style={{
          position: "absolute", left: d.x, top: d.y,
          width: i % 2 === 0 ? 3 : 4, height: i % 2 === 0 ? 3 : 4,
          borderRadius: "50%", background: SAGE, opacity: 0.15 + (i % 3) * 0.08,
        }} />
      ))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <div style={{ marginBottom: 32, position: "relative" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(155deg, #1e4a32 0%, #0e2318 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid rgba(143,203,168,0.22)`,
            boxShadow: "0 0 0 1px rgba(143,203,168,0.08), 0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <svg width={26} height={26} viewBox="0 0 16 16" fill="none">
              <path d="M8 1L9.18 6.18L14 7L9.18 7.82L8 13L6.82 7.82L2 7L6.82 6.18L8 1Z" fill={SAGE} opacity="0.9" />
            </svg>
          </div>
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 10, letterSpacing: "0.01em" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 style={{ color: TEXT_PRIMARY, fontSize: 48, fontWeight: 700, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.08, textAlign: "center" }}>
          Good morning, Alex
        </h1>
        <p style={{ color: TEXT_MUTED, fontSize: 15, marginTop: 16, textAlign: "center", maxWidth: 360, lineHeight: 1.65 }}>
          Your day is mapped across{" "}
          <strong style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>5 sources</strong>.{" "}
          <strong style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>3 things</strong>{" "}
          needed your attention overnight.
        </p>
        <button onClick={onStart} style={{
          marginTop: 36, background: "#a8d9bc", color: "#0c1f14",
          border: "none", borderRadius: 50, padding: "13px 30px", fontSize: 15,
          fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          letterSpacing: "-0.01em", transition: "opacity 0.15s",
        }}>
          Start your day <ArrowRight size={15} />
        </button>
        <button onClick={onStart} style={{
          marginTop: 20, width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.1)`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
