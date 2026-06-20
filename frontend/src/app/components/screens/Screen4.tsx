import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { SourceBadge } from "../shared/SourceBadge";
import { SparkleIcon } from "../shared/SparkleIcon";
import { AIRationale } from "../shared/AIRationale";
import { getSources, SourcesResponse } from "../../api/taskpilot";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BG = "#0E1411";
const BORDER = "#232B26";

export function Screen4() {
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSources()
      .then(setSources)
      .catch(() => setSources(null))
      .finally(() => setLoading(false));
  }, []);

  const displaySources = sources?.sources ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0 }}>Sources</h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
              {loading ? "Loading..." : `${displaySources.length} connected integrations · indexed from APIs`}
            </p>
          </div>

          <div style={{ background: "rgba(143,203,168,0.07)", border: `1px solid rgba(143,203,168,0.2)`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <SparkleIcon size={14} />
            <span style={{ color: SAGE, fontSize: 13 }}>
              Hidden action items found today — extracted from unstructured sources via LLM
            </span>
          </div>

          {loading ? (
            <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: "center", padding: 40 }}>
              Loading sources...
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {displaySources.map((src) => (
                  <Card key={src.name} style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${src.color}22`, border: `1px solid ${src.color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: src.color }}>{src.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: src.status === "Synced" ? "#50b464" : "#c8a040", display: "inline-block" }} />
                        <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{src.status}</span>
                      </div>
                    </div>
                    <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{src.name}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>Tasks indexed via pipeline</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 11 }}>Status: {src.status}</div>
                  </Card>
                ))}
              </div>

              <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                LLM Extraction in Progress
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <SourceBadge source="Outlook" />
                    <span style={{ color: TEXT_MUTED, fontSize: 11 }}>Raw source</span>
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, fontFamily: "monospace", lineHeight: 1.6 }}>
                    From: Sarah Chen &lt;schen@acme.com&gt;<br />
                    To: eng-backend@acme.com<br />
                    Subject: Re: Auth token refresh — seeing failures<br />
                    Date: Recent<br /><br />
                    "Hey team, can someone investigate the auth token refresh failures we're seeing in prod? Started around 10:45 PM. Error rate is ~14% and climbing."
                  </div>
                </Card>
                <Card style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ background: "rgba(143,203,168,0.1)", color: SAGE, fontSize: 11, padding: "2px 8px", borderRadius: 20, border: `1px solid rgba(143,203,168,0.2)`, display: "flex", alignItems: "center", gap: 5 }}>
                      <SparkleIcon size={10} /> AI-extracted task
                    </span>
                  </div>
                  {[
                    ["Title", "Investigate auth token refresh failures"],
                    ["Priority", "P1 high"],
                    ["Confidence", "91%"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ color: TEXT_MUTED, fontSize: 12, minWidth: 76 }}>{k}</span>
                      <span style={{ color: TEXT_PRIMARY, fontSize: 12, fontWeight: k === "Priority" ? 500 : 400 }}>{v}</span>
                    </div>
                  ))}
                  <button style={{ marginTop: 8, background: "none", border: "none", color: SAGE, fontSize: 12, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={11} /> Trace to source email
                  </button>
                  <AIRationale text="Extracted action item via LLM from email thread. Deadline inferred from content. Cross-referenced with GitHub issues." />
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
