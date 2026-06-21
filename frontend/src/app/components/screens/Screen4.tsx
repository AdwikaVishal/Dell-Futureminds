import { useEffect, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { SourceBadge } from "../shared/SourceBadge";
import { SparkleIcon } from "../shared/SparkleIcon";
import { ExtractionVisualization } from "../shared/ExtractionVisualization";
import { getSources, getRecentExtractions, SourcesResponse, ExtractionItem, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BG = "#0E1411";
const BORDER = "#232B26";

export function Screen4() {
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [extractions, setExtractions] = useState<ExtractionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "tasks_updated" || event.event === "plan_updated") {
      getSources().then(setSources).catch(() => {});
      getRecentExtractions().then(r => setExtractions(r.extractions)).catch(() => {});
    }
  }, []);

  useWebSocket(handleWsEvent);

  useEffect(() => {
    Promise.all([
      getSources(),
      getRecentExtractions(),
    ])
      .then(([srcRes, extRes]) => {
        setSources(srcRes);
        setExtractions(extRes.extractions);
      })
      .catch(() => {})
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
              {loading ? "Loading..." : `${displaySources.length} connected integrations`}
            </p>
          </div>

          <div style={{ background: "rgba(143,203,168,0.07)", border: `1px solid rgba(143,203,168,0.2)`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <SparkleIcon size={14} />
            <span style={{ color: SAGE, fontSize: 13 }}>
              Live data from {displaySources.filter(s => s.status === "Synced").length}/{displaySources.length} connected sources
              {extractions.length > 0 && (
                <span style={{ color: TEXT_MUTED, marginLeft: 4 }}>
                  &middot; <strong style={{ color: SAGE }}>{extractions.length}</strong> hidden action items found
                </span>
              )}
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
                    <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>Live data via API</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 11 }}>
                      Status: {src.status}
                      {src.last_sync ? ` · Last sync: ${new Date(src.last_sync).toLocaleTimeString()}` : ""}
                    </div>
                  </Card>
                ))}
              </div>

              <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                Extracted Action Items
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>
                {sources?.total_tasks ?? 0} total tasks across all sources
              </div>

              {extractions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {extractions.slice(0, 10).map((item) => (
                    <ExtractionVisualization key={item.task_id} item={item} />
                  ))}
                </div>
              )}

              {extractions.length === 0 && !loading && (
                <Card style={{ textAlign: "center", padding: 40 }}>
                  <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>
                    No extractions available yet. Sync your sources to generate tasks.
                  </p>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
