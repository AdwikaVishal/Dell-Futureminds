import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, ListTodo, Plug, MessageSquare, BarChart2, Settings } from "lucide-react";
import { LogoMark } from "./LogoMark";

const SAGE = "#8FCBA8";
const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const BORDER = "#232B26";
const SIDEBAR_BG = "#0A100D";

const NAV_ITEMS = [
  { path: "/daily-plan", label: "Daily Plan", icon: LayoutDashboard },
  { path: "/tasks", label: "All Tasks", icon: ListTodo },
  { path: "/sources", label: "Sources", icon: Plug },
  { path: "/assistant", label: "Chat Assistant", icon: MessageSquare },
  { path: "/weekly-summary", label: "Weekly Summary", icon: BarChart2 },
  { path: "#", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: SIDEBAR_BG,
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 20px" }}>
        <LogoMark size={26} />
        <span style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>
          TaskPilot AI
        </span>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = item.path !== "#" && location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => item.path !== "#" && navigate(item.path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              background: isActive ? "rgba(143,203,168,0.08)" : "transparent",
              border: "none",
              cursor: "pointer",
              color: isActive ? SAGE : TEXT_MUTED,
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              textAlign: "left",
              width: "100%",
              position: "relative",
              transition: "all 0.15s",
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 2.5,
                  borderRadius: 2,
                  background: SAGE,
                }}
              />
            )}
            <Icon size={15} />
            {item.label}
          </button>
        );
      })}

      <div style={{ flexGrow: 1 }} />
      <div
        style={{
          padding: "10px 10px",
          borderRadius: 8,
          background: "rgba(143,203,168,0.05)",
          border: `1px solid rgba(143,203,168,0.1)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: SAGE, display: "inline-block" }} />
          <span style={{ color: SAGE, fontSize: 11, fontWeight: 500 }}>5 sources synced</span>
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 11 }}>Last sync: 2 min ago</div>
      </div>
    </div>
  );
}
