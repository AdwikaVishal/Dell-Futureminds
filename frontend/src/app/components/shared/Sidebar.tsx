import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, Inbox, CalendarRange, Sparkles,
  GitBranch, BarChart3, Bell, Settings, SquarePen, GitMerge,
  Activity, MessageSquare
} from "lucide-react";
import { useLayout } from "./LayoutContext";
import { getHealth } from "../../api/taskpilot";
import { A2AStatus } from "./A2AStatus";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inbox", label: "Inbox", icon: Inbox },
  { path: "/ai-chat", label: "AI Chat", icon: MessageSquare },
  { path: "/planner", label: "Planner", icon: CalendarRange },
  { path: "/hidden", label: "Hidden Tasks", icon: Sparkles },
  { path: "/dedup-groups", label: "Dedup Groups", icon: GitMerge },
  { path: "/priorities", label: "Priorities", icon: BarChart3 },
  { path: "/dependencies", label: "Dependencies", icon: GitBranch },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, llmOk } = useLayout();
  const w = sidebarOpen ? 240 : 60;
  const [connectors, setConnectors] = useState<{ connected: number; total: number; lastSync: string | null }>({ connected: 0, total: 0, lastSync: null });

  useEffect(() => {
    getHealth().then(h => {
      const all = h.connectors || [];
      setConnectors({
        connected: all.filter((c: any) => c.connected).length,
        total: all.length,
        lastSync: h.last_sync,
      });
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      width: w, flexShrink: 0, height: "100%",
      overflow: "hidden", transition: "width 0.25s ease",
      background: "var(--bg-sidebar)",
    }}>
      <div style={{
        width: 240, height: "100%",
        display: "flex", flexDirection: "column",
        padding: "20px 12px", gap: 2, overflow: "auto",
      }}>
        <button onClick={toggleSidebar}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 24px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "var(--bg-elevated)", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <SquarePen size={16} color="#0D0D0D" />
          </div>
          {sidebarOpen && <span style={{
            color: "#FFFFFF", fontWeight: 700, fontSize: 16,
            fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em",
          }}>
            TaskPilot
          </span>}
        </button>

        {sidebarOpen && NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isAIChat = item.path === "/ai-chat";
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12,
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none", cursor: "pointer",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                textAlign: "left", width: "100%",
                transition: "all 0.15s",
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={16} />
                {isAIChat && !llmOk && (
                  <div style={{
                    position: "absolute", top: -4, right: -6,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#FF3B30",
                    border: "2px solid #0D0D0D",
                  }} />
                )}
              </div>
              {item.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {sidebarOpen && (
          <>
            <button onClick={() => navigate("/traces")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12, width: "100%",
                background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                color: "var(--text-secondary)", fontSize: 13, fontWeight: 400, transition: "all 0.15s",
              }}>
              <Activity size={16} />
              Pipeline Traces
            </button>
            <A2AStatus />
            <div style={{
              padding: "12px", borderRadius: 12, marginTop: 4,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: connectors.connected > 0 ? "#BFD78D" : "#F7C5E6" }} />
                <span style={{ color: "#BFD78D", fontSize: 12, fontWeight: 500 }}>
                  {connectors.connected}/{connectors.total} sources synced
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                {connectors.lastSync
                  ? `Last sync: ${new Date(connectors.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ago`
                  : "No sync data"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
