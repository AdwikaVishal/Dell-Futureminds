import { useState } from "react";
import { Search, Bell, Settings, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router";
import { useLayout } from "./LayoutContext";
import { useTheme } from "../../contexts/ThemeContext";

export function TopNav() {
  const navigate = useNavigate();
  const { togglePanel } = useLayout();
  const { isDark, toggleTheme } = useTheme();
  const [searchVal, setSearchVal] = useState("");

  const handleSearch = () => {
    const q = searchVal.trim();
    if (!q) return;
    navigate(`/inbox?search=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{
      height: 60, flexShrink: 0,
      display: "flex", alignItems: "center",
      gap: 12, padding: "0 16px",
      borderBottom: "1px solid var(--border-default)",
      background: "var(--bg-primary)",
    }}>
      <div style={{
        flex: 1, display: "flex", alignItems: "center", gap: 8,
        background: "var(--bg-elevated)", borderRadius: 14, padding: "8px 14px",
        border: "1px solid var(--border-default)", maxWidth: 480,
      }}>
        <Search size={15} color="var(--text-muted)" />
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search tasks, emails, blockers..."
          style={{
            flex: 1, border: "none", outline: "none",
            background: "none", fontSize: 13, color: "var(--text-primary)",
          }}
        />
      </div>

      <button
        onClick={toggleTheme}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={16} color="var(--blue-primary)" /> : <Moon size={16} color="var(--text-secondary)" />}
      </button>

      <button
        onClick={() => navigate("/notifications")}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
        }}
      >
        <Bell size={16} color="var(--text-secondary)" />
      </button>

      <button
        onClick={() => navigate("/settings")}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Settings size={16} color="var(--text-secondary)" />
      </button>

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--bg-sidebar)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#FFFFFF", fontSize: 13, fontWeight: 600,
        fontFamily: "'IBM Plex Mono', monospace", cursor: "default",
      }}>
        A
      </div>
    </div>
  );
}
