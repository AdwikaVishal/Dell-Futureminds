import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { StatusPill } from "../shared/StatusPill";
import { SparkleIcon } from "../shared/SparkleIcon";
import { getWeeklySummary, WeeklySummaryResponse } from "../../api/taskpilot";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BORDER = "#232B26";

const DEMO_WEEK_DATA = [
  { day: "Mon", completed: 8, target: 10 },
  { day: "Tue", completed: 11, target: 10 },
  { day: "Wed", completed: 7, target: 10 },
  { day: "Thu", completed: 9, target: 10 },
  { day: "Fri", completed: 5, target: 10 },
];

export function Screen5() {
  const [summary, setSummary] = useState<WeeklySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getWeeklySummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>Week of</div>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0 }}>
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} – Current
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Tasks tracked", value: loading ? "--" : (summary ? "Live" : "--"), sub: "Live from pipeline" },
              { label: "Sources", value: "6", sub: "connected" },
              { label: "LLM extractions", value: loading ? "--" : (summary ? "Live" : "--"), sub: "per pipeline run" },
              { label: "Alerts generated", value: loading ? "--" : (summary ? "Live" : "--"), sub: "auto-detected" },
            ].map((m) => (
              <Card key={m.label} style={{ padding: "16px 18px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 8 }}>{m.label}</div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{m.sub}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
            <Card style={{ padding: "20px" }}>
              <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
                Weekly completion
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={DEMO_WEEK_DATA} barSize={28} barGap={6}>
                  <XAxis dataKey="day" tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                    {DEMO_WEEK_DATA.map((entry, i) => (
                      <Cell key={i} fill={i === 4 ? "rgba(143,203,168,0.35)" : SAGE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 8, textAlign: "center" }}>
                Demo visualization — per-day completion data coming from pipeline telemetry
              </div>
            </Card>

            <Card style={{ padding: "16px 18px" }}>
              <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
                Pipeline Status
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(143,203,168,0.1)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: SAGE, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    TP
                  </div>
                  <div>
                    <div style={{ color: TEXT_PRIMARY, fontSize: 12, marginBottom: 3 }}>Pipeline</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginBottom: 4 }}>Ingest → Extract → Prioritize → Plan</div>
                    <StatusPill status="In Progress" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {loading && (
            <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: "center", padding: 20 }}>
              Loading weekly summary...
            </div>
          )}

          {summary?.summary && (
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600 }}>Weekly Summary</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                    <SparkleIcon size={11} /> AI-generated
                  </div>
                </div>
                <button onClick={() => setCopied(true)}
                  style={{ background: copied ? "rgba(143,203,168,0.12)" : "", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 14px", color: copied ? SAGE : TEXT_MUTED, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Copy size={12} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: "Inter, sans-serif" }}>
                {summary.summary}
              </pre>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
