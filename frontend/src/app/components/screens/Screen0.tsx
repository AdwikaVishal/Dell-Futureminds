import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// ─── Design tokens (match landing page exactly) ───────────────────────────
const T = {
  bg:          "#0E1411",
  bgVignette:  "#16261D",
  card:        "#161D19",
  border:      "#232B26",
  textPrimary: "#F4F8F5",
  textSecondary:"#94A39B",
  textMuted:   "#6B7A72",
  textFaint:   "#4A5650",
  sage:        "#8FCBA8",
  sageLight:   "#A8DABF",
  sageLighter: "#B8E5CC",
  sageDark:    "#2E5C44",
  sageDarker:  "#16271E",
  sageBorder:  "#3D6B52",
  coral:       "#F09595",
  coralBg:     "rgba(226,75,74,0.12)",
  coralBorder: "rgba(226,75,74,0.25)",
  amber:       "#EF9F27",
  amberBg:     "rgba(239,159,39,0.12)",
  amberBorder: "rgba(239,159,39,0.25)",
  sageBg:      "rgba(143,203,168,0.15)",
  sagePillBorder:"rgba(143,203,168,0.3)",
} as const;

// ─── Particle data (randomised once on mount) ─────────────────────────────
interface Particle {
  top: number; left: number; size: number;
  bright: boolean; duration: number; delay: number;
}

function makeParticles(n = 10): Particle[] {
  return Array.from({ length: n }, () => {
    const bright = Math.random() > 0.7;
    return {
      top:      5  + Math.random() * 75,
      left:     4  + Math.random() * 92,
      size:     bright ? 4 + Math.random() * 2 : 2.5 + Math.random() * 1.5,
      bright,
      duration: 4.5 + Math.random() * 3,
      delay:    Math.random() * 3,
    };
  });
}

// ─── Typewriter hook ──────────────────────────────────────────────────────
function useTypewriter(full: string, speed: number, start: boolean) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!start) return;
    setText("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [start, full, speed]);
  return { text, done };
}

// ─── Clock ────────────────────────────────────────────────────────────────
function useClock() {
  const [label, setLabel] = useState("");
  function fmt() {
    const d = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August",
                    "September","October","November","December"];
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} · ${h}:${m} ${ap}`;
  }
  useEffect(() => {
    setLabel(fmt());
    const id = setInterval(() => setLabel(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

// ─── Status segments ──────────────────────────────────────────────────────
const SOURCES = ["scanning", "jira", "outlook", "servicenow", "slack", "github"];

// ─── Main component ───────────────────────────────────────────────────────
export function Screen0({ onStart }: { onStart: () => void }) {
  const particles = useRef(makeParticles()).current;
  const clock = useClock();
  const [activeSeg, setActiveSeg] = useState(0);

  // Typewriter sequencing
  const [startLine1, setStartLine1] = useState(false);
  const [startLine2, setStartLine2] = useState(false);
  const [showPills,  setShowPills]  = useState(false);
  const [showCta,   setShowCta]    = useState(false);

  const line1 = useTypewriter("Morning, Alex.", 55, startLine1);
  const line2 = useTypewriter("3 things found you overnight.", 32, startLine2);

  // Kick off sequence
  useEffect(() => {
    const t1 = setTimeout(() => setStartLine1(true), 500);
    return () => clearTimeout(t1);
  }, []);
  useEffect(() => {
    if (!line1.done) return;
    const t = setTimeout(() => setStartLine2(true), 250);
    return () => clearTimeout(t);
  }, [line1.done]);
  useEffect(() => {
    if (!line2.done) return;
    const t1 = setTimeout(() => setShowPills(true), 400);
    const t2 = setTimeout(() => setShowCta(true),  600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [line2.done]);

  // Status sweep
  useEffect(() => {
    const id = setInterval(() => setActiveSeg(s => (s + 1) % SOURCES.length), 900);
    return () => clearInterval(id);
  }, []);

  // Fade-out on navigate
  const [exiting, setExiting] = useState(false);
  function handleStart() {
    setExiting(true);
    setTimeout(onStart, 500);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes dotPulse  { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.5)} }
        @keyframes glowPulse { 0%,100%{opacity:.5;transform:scale(1)}  50%{opacity:1;transform:scale(1.15)} }
        @keyframes sparkSpin { 0%{transform:rotate(-5deg) scale(1)} 50%{transform:rotate(16deg) scale(1.12)} 100%{transform:rotate(-5deg) scale(1)} }
        @keyframes typeBlink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes typeDone  { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes bob       { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,6px)} }
        @keyframes drift1    { 0%,100%{transform:translate(0,0);opacity:.6}     50%{transform:translate(10px,-18px);opacity:1} }
        @keyframes drift2    { 0%,100%{transform:translate(0,0);opacity:.3}     50%{transform:translate(-12px,14px);opacity:.8} }
        @keyframes drift3    { 0%,100%{transform:translate(0,0);opacity:.5}     50%{transform:translate(-14px,-10px);opacity:.9} }
        @keyframes drift4    { 0%,100%{transform:translate(0,0) scale(1);opacity:.4} 50%{transform:translate(8px,14px) scale(1.3);opacity:.85} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .s0-live-dot { animation: dotPulse 1.6s ease-in-out infinite; }
        .s0-mark-glow { animation: glowPulse 2.6s ease-in-out infinite; }
        .s0-logo-icon { animation: sparkSpin 3s ease-in-out infinite; transform-origin: center; }
        .s0-cursor { display:inline-block; width:3px; height:.85em; background:${T.sageLight}; margin-left:2px; vertical-align:text-bottom; animation: typeBlink .9s step-end infinite; }
        .s0-cursor.done { animation: typeDone 1.1s step-end infinite; }
        .s0-scroll-hint { animation: bob 2.2s ease-in-out infinite; }
        .s0-cta:hover  { transform:translateY(-2px)!important; box-shadow:0 0 36px rgba(143,203,168,.5),0 6px 20px rgba(0,0,0,.35)!important; }
        .s0-cta:hover .s0-arrow { transform:translateX(3px); }
        .s0-arrow { transition:transform .2s ease; }
        .s0-fadeup { animation: fadeUp .7s ease-out forwards; }
        @media(prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important}}
      `}</style>

      <div style={{
        width:"100%", height:"100%", fontFamily:"'Inter',-apple-system,sans-serif",
        background: `radial-gradient(ellipse 70% 50% at 50% 28%, ${T.bgVignette} 0%, ${T.bg} 65%)`,
        display:"flex", flexDirection:"column", overflow:"hidden", position:"relative",
        transition: exiting ? "opacity .5s ease, transform .5s ease" : undefined,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-20px)" : "translateY(0)",
      }}>

        {/* Particles */}
        {particles.map((p, i) => (
          <span key={i} style={{
            position:"absolute", borderRadius:"50%", pointerEvents:"none",
            background: p.bright ? T.sageLight : T.sage,
            width: p.size, height: p.size,
            top: `${p.top}%`, left: `${p.left}%`,
            boxShadow: `0 0 ${p.bright ? 8 : 5}px ${p.bright ? T.sageLight : T.sage}`,
            animation: `drift${(i % 4) + 1} ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}

        {/* Status bar */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"28px 0 0 40px", position:"relative", zIndex:2 }}>
          <div className="s0-live-dot" style={{
            width:6, height:6, borderRadius:"50%", background:T.sage, flexShrink:0,
            boxShadow:`0 0 6px ${T.sage}`,
          }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.03em", color:T.textMuted }}>
            {SOURCES.map((seg, i) => (
              <span key={seg} style={{
                color: i === activeSeg ? T.sageLight : T.textMuted,
                transition:"color .4s ease",
              }}>
                {seg}{i < SOURCES.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        </div>

        {/* Center */}
        <div style={{
          flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", padding:"20px 24px", position:"relative", zIndex:2,
        }}>
          {/* Logo */}
          <div style={{ position:"relative", width:68, height:68, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:26 }}>
            <div className="s0-mark-glow" style={{
              position:"absolute", width:68, height:68, borderRadius:20,
              background:"radial-gradient(circle, rgba(143,203,168,0.4), transparent 70%)",
              filter:"blur(4px)",
            }} />
            <div style={{
              position:"relative", width:48, height:48, borderRadius:14,
              background:`linear-gradient(135deg, ${T.sageDark}, ${T.sageDarker})`,
              border:`0.5px solid ${T.sageBorder}`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg className="s0-logo-icon" width={22} height={22} viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z" fill={T.sageLighter}/>
              </svg>
            </div>
          </div>

          {/* Date/time */}
          <p className="s0-fadeup" style={{
            fontFamily:"'JetBrains Mono',monospace", fontSize:13,
            color:T.textMuted, letterSpacing:"0.04em", marginBottom:10,
            animationDelay:"0.05s",
          }}>
            {clock}
          </p>

          {/* Headline line 1 */}
          <p style={{
            fontSize:"clamp(28px,5vw,36px)", fontWeight:600, letterSpacing:"-0.02em",
            lineHeight:1.15, textAlign:"center", margin:"0 0 2px", color:T.textPrimary,
            minHeight:"1.2em",
          }}>
            {line1.text}
            {startLine1 && !line1.done && <span className="s0-cursor" />}
            {line1.done && !startLine2 && <span className="s0-cursor done" />}
          </p>

          {/* Headline line 2 */}
          <p style={{
            fontSize:"clamp(28px,5vw,36px)", fontWeight:600, letterSpacing:"-0.02em",
            lineHeight:1.15, textAlign:"center", margin:"0 0 20px", color:"#5C6A62",
            minHeight:"1.2em",
          }}>
            {line2.text}
            {startLine2 && !line2.done && <span className="s0-cursor" />}
          </p>

          {/* Pills */}
          <div style={{
            display:"flex", gap:6, marginBottom:30,
            transition:"opacity .5s ease, transform .5s ease",
            opacity: showPills ? 1 : 0,
            transform: showPills ? "translateY(0)" : "translateY(10px)",
          }}>
            <span style={{ fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:500, border:`0.5px solid ${T.coralBorder}`, background:T.coralBg, color:T.coral }}>1 critical</span>
            <span style={{ fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:500, border:`0.5px solid ${T.amberBorder}`, background:T.amberBg, color:T.amber }}>2 high</span>
            <span style={{ fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:500, border:`0.5px solid ${T.sagePillBorder}`, background:T.sageBg, color:T.sage }}>plan ready</span>
          </div>

          {/* CTA */}
          <button className="s0-cta" onClick={handleStart} style={{
            background:`linear-gradient(135deg, ${T.sageLighter}, ${T.sage})`,
            color:T.bg, border:"none", padding:"13px 30px", borderRadius:100,
            fontSize:14, fontWeight:500, fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            boxShadow:"0 0 28px rgba(143,203,168,0.35), 0 4px 16px rgba(0,0,0,0.3)",
            transition:"transform .2s ease, box-shadow .2s ease, opacity .5s ease",
            opacity: showCta ? 1 : 0,
            transform: showCta ? "translateY(0)" : "translateY(10px)",
          }}>
            See what&apos;s on deck
            <span style={{ display:"inline-block", width:1, height:14, background:T.bg, marginLeft:2, animation:"typeBlink 1.1s step-end infinite" }} />
            <ArrowRight className="s0-arrow" size={15} />
          </button>
        </div>

        {/* Scroll hint */}
        <button className="s0-scroll-hint" onClick={handleStart} style={{
          position:"absolute", bottom:64, left:"50%", transform:"translateX(-50%)",
          width:32, height:32, borderRadius:"50%", background:T.sageDarker,
          border:`0.5px solid ${T.sageBorder}`, display:"flex", alignItems:"center",
          justifyContent:"center", zIndex:2, cursor:"pointer",
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.sage} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Footer */}
        <div style={{ textAlign:"center", paddingBottom:18, position:"relative", zIndex:2 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.textFaint }}>
            last sync 2 min ago
          </span>
        </div>

      </div>
    </>
  );
}