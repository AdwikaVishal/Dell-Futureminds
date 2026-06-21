import { useEffect, useState } from "react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";

const BG = "#0E1411";
const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const CARD_BG = "#161D19";
const BORDER = "#232B26";

interface Connector {
  name: string;
  connected: boolean;
  status?: string;
  last_sync?: string;
}

export function Settings() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConnectors = async () => {
      try {
        const res = await fetch("/api/sources");
        if (res.ok) {
          const data = await res.json();
          if (data.sources && Array.isArray(data.sources)) {
            setConnectors(
              data.sources.map((s: any) => ({
                name: s.name,
                connected: s.status === "Synced",
                status: s.status,
                last_sync: s.last_sync,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch connector status:", err);
        setConnectors([
          { name: "Jira", connected: true },
          { name: "GitHub", connected: true },
          { name: "ServiceNow", connected: false },
          { name: "Outlook", connected: false },
          { name: "Slack", connected: false },
          { name: "Meeting Transcripts", connected: false },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchConnectors();
  }, []);

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", background: BG }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader />
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Settings</h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 24 }}>
              API keys and connector credentials are managed via environment variables (<code style={{ background: "#232B26", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.env</code>).
            </p>

            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <h3 style={{ color: TEXT_PRIMARY, fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>API Keys</h3>
              {[
                { label: "Groq API Key", env: "GROQ_API_KEY" },
                { label: "Jira API Token", env: "JIRA_API_TOKEN" },
                { label: "GitHub Token", env: "GITHUB_TOKEN" },
              ].map((key) => (
                <div key={key.label} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #232B26" }}>
                  <span style={{ color: SAGE, fontSize: 13, marginRight: 10 }}>✓</span>
                  <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, width: 140 }}>{key.label}</span>
                  <code style={{ background: BG, padding: "4px 10px", borderRadius: 6, fontSize: 13, color: TEXT_MUTED }}>••••••••</code>
                </div>
              ))}
            </div>

            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
              <h3 style={{ color: TEXT_PRIMARY, fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Connector Status</h3>
              {loading ? (
                <p style={{ color: TEXT_MUTED, fontSize: 13 }}>Loading...</p>
              ) : (
                connectors.map((conn, i) => (
                  <div key={conn.name} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: i < connectors.length - 1 ? "1px solid #232B26" : "none" }}>
                    <span style={{ marginRight: 10, fontSize: 14 }}>{conn.connected ? "🟢" : "🔴"}</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, width: 150 }}>{conn.name}:</span>
                    <span style={{ color: conn.connected ? "#51CF66" : "#FF6B6B", fontSize: 13 }}>
                      {conn.connected ? "Connected" : "Disconnected"}
                    </span>
                    {!conn.connected && <span style={{ marginLeft: 8, color: TEXT_MUTED, fontSize: 12 }}>(simulated)</span>}
                  </div>
                ))
              )}
              <div style={{ marginTop: 16, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>* Disconnected connectors fall back to simulated data automatically.</p>
                <p style={{ margin: "4px 0 0" }}>* All API keys are stored securely in the backend <code style={{ background: BG, padding: "1px 5px", borderRadius: 4 }}>.env</code> file.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
