import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getHealth } from "../../api/taskpilot";

type LayoutContextType = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  togglePanel: () => void;
  llmOk: boolean;
};

const LayoutContext = createContext<LayoutContextType | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [llmOk, setLlmOk] = useState(true);

  useEffect(() => {
    const fetchHealth = () => {
      getHealth().then(h => {
        setLlmOk(h.llm_ok !== false);
      }).catch(() => {});
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LayoutContext.Provider value={{
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar: () => setSidebarOpen(v => !v),
      panelOpen,
      setPanelOpen,
      togglePanel: () => setPanelOpen(v => !v),
      llmOk,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used inside LayoutProvider");
  return ctx;
}
