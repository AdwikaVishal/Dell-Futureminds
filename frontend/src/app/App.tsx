import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { Screen0 } from "./components/screens/Screen0";
import { Screen1 } from "./components/screens/Screen1";
import { Screen2 } from "./components/screens/Screen2";
import { Screen3 } from "./components/screens/Screen3";
import { Screen4 } from "./components/screens/Screen4";
import { Screen5 } from "./components/screens/Screen5";

const BG = "#0E1411";
const CARD = "#161D19";
const SAGE = "#8FCBA8";
const TEXT_MUTED = "#8B9890";
const BORDER = "#232B26";

const ROUTES = [
  { path: "/daily-plan", screen: 1 },
  { path: "/tasks", screen: 2 },
  { path: "/sources", screen: 4 },
  { path: "/assistant", screen: 3 },
  { path: "/weekly-summary", screen: 5 },
] as const;

function NavOverlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = location.pathname === "/";

  if (isRoot) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 50, padding: "6px 10px", zIndex: 999 }}>
      {ROUTES.map(({ path, screen }) => (
        <button key={path} onClick={() => navigate(path)}
          style={{ width: 28, height: 28, borderRadius: "50%", background: location.pathname === path ? "rgba(143,203,168,0.18)" : "transparent", border: location.pathname === path ? `1px solid rgba(143,203,168,0.3)` : "1px solid transparent", color: location.pathname === path ? SAGE : TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          {screen}
        </button>
      ))}
    </div>
  );
}

function Layout() {
  return (
    <div style={{ width: "100%", height: "100%", background: BG, fontFamily: "Inter, system-ui, sans-serif", color: "#EDF3EF", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <NavOverlay />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </div>
    </div>
  );
}

function WrappedScreen0() {
  const navigate = useNavigate();
  return <Screen0 onStart={() => navigate("/daily-plan")} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WrappedScreen0 />} />
          <Route path="/daily-plan" element={<Screen1 />} />
          <Route path="/tasks" element={<Screen2 />} />
          <Route path="/sources" element={<Screen4 />} />
          <Route path="/assistant" element={<Screen3 />} />
          <Route path="/weekly-summary" element={<Screen5 />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
