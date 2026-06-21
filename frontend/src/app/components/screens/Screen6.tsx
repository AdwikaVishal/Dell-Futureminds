import { useEffect, useState } from "react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BORDER = "#232B26";
const CARD_BG = "#161D19";

interface Trace {
  id: number;
  timestamp: string;
  step_name: string;
  duration_ms: number;
  tokens_used: number;
  status: string;
}

export function Screen6() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/traces")
      .then((res) => res.json())
      .then((data) => {
        setTraces(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Trace fetch error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Pipeline Traces</h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
              {loading ? "Loading..." : `${traces.length} trace${traces.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {loading && (
            <p style={{ color: TEXT_MUTED, fontSize: 13 }}>Loading traces...</p>
          )}

          {!loading && traces.length === 0 && (
            <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 13, padding: 60 }}>
              <p>No traces available. Run a pipeline to collect step timing data.</p>
            </div>
          )}

          {!loading && traces.length > 0 && (
            <Card style={{ overflow: "hidden", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1A231E" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: TEXT_MUTED, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Step</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", color: TEXT_MUTED, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Latency (ms)</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", color: TEXT_MUTED, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Tokens</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", color: TEXT_MUTED, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Status</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", color: TEXT_MUTED, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((trace, idx) => (
                    <tr key={trace.id} style={{ borderBottom: idx < traces.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <td style={{ padding: "10px 14px", color: TEXT_PRIMARY, fontFamily: "monospace", fontSize: 12 }}>{trace.step_name}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: TEXT_PRIMARY }}>{trace.duration_ms.toFixed(1)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: trace.tokens_used > 0 ? TEXT_PRIMARY : TEXT_MUTED }}>
                        {trace.tokens_used > 0 ? trace.tokens_used : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 500,
                          background: trace.status === "ok" ? "rgba(143,203,168,0.12)" : "rgba(255,107,107,0.12)",
                          color: trace.status === "ok" ? SAGE : "#FF6B6B",
                          border: `1px solid ${trace.status === "ok" ? "rgba(143,203,168,0.25)" : "rgba(255,107,107,0.25)"}`,
                        }}>
                          {trace.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: TEXT_MUTED, fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(trace.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
