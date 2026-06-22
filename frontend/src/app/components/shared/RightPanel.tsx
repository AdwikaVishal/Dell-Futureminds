import { useLayout } from "./LayoutContext";
import { ChatInterface } from "../chat/ChatInterface";

export function RightPanel() {
  const { panelOpen, togglePanel } = useLayout();

  return (
    <div style={{
      width: panelOpen ? 340 : 0, flexShrink: 0, height: "100%",
      overflow: "hidden", transition: "width 0.25s ease",
      borderLeft: panelOpen ? "1px solid var(--border-default)" : "none",
      background: "var(--bg-panel)",
    }}>
      <div style={{
        width: 340, height: "100%",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <ChatInterface onClose={togglePanel} />
      </div>
    </div>
  );
}
