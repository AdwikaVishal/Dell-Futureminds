import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bot } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { RightPanel } from "./RightPanel";
import { LayoutProvider, useLayout } from "./LayoutContext";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";

const NAV_SHORTCUTS: Record<string, string> = {
  "gd": "/dashboard", "gi": "/inbox", "gp": "/planner",
  "gh": "/hidden", "gdd": "/dedup-groups",
  "gpr": "/priorities", "gde": "/dependencies", "gr": "/reports",
  "gn": "/notifications", "gs": "/settings",
  "gx": "/traces", "gc": "/ai-chat",
};

function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { togglePanel } = useLayout();
  let buffer = "";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b") { e.preventDefault(); togglePanel(); return; }
      buffer += e.key.toLowerCase();
      if (buffer.length > 3) buffer = buffer.slice(-3);
      for (const [shortcut, path] of Object.entries(NAV_SHORTCUTS)) {
        if (buffer.endsWith(shortcut)) {
          navigate(path);
          buffer = "";
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

function FloatingAIBtn() {
  const { panelOpen, togglePanel, llmOk } = useLayout();
  if (panelOpen) return null;
  return (
    <button onClick={togglePanel}
      style={{
        position: "absolute", bottom: 20, right: 20,
        width: 44, height: 44, borderRadius: 14,
        background: "var(--bg-sidebar)", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        zIndex: 100,
      }}>
      <Bot size={20} color="#FFFFFF" />
      {!llmOk && (
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 12, height: 12, borderRadius: "50%",
          background: "#FF3B30",
          border: "2px solid var(--bg-sidebar)",
        }} title="AI API keys not available" />
      )}
    </button>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  useTheme();

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{
        display: "flex", height: "100%", width: "100%",
        overflow: "hidden", background: "var(--bg-primary, var(--bg-primary))", position: "relative",
      }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopNav />
          <main style={{ flex: 1, overflow: "auto", display: "flex" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
              {children}
            </div>
            <RightPanel />
          </main>
        </div>
        <FloatingAIBtn />
      </div>
    </DndProvider>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <LayoutInner>{children}</LayoutInner>
      </LayoutProvider>
    </ThemeProvider>
  );
}
