import { useEffect, useState, useCallback, useMemo } from "react";
import { Bell, AlertTriangle, Info, AlertCircle, ShieldCheck, CheckCheck, X, Clock, Filter, ChevronDown, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "../shared/Card";
import { SourceBadge } from "../shared/SourceBadge";
import { getPlan, Alert, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertCircle; stripe: string; bg: string; label: string }> = {
  critical: { icon: AlertCircle, stripe: "#E53E3E", bg: "#FFEBEE", label: "Critical" },
  warning: { icon: AlertTriangle, stripe: "#D69E2E", bg: "#FFF8E1", label: "Warning" },
  info: { icon: Info, stripe: "#3182CE", bg: "#EBF5FF", label: "Info" },
};

const FILTERS = [
  { label: "All", value: "All", icon: Bell },
  { label: "Critical", value: "critical", icon: AlertCircle },
  { label: "Warning", value: "warning", icon: AlertTriangle },
  { label: "Info", value: "info", icon: Info },
] as const;

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationCard({ alert, onDismiss }: { alert: Alert & { timestamp?: string }; onDismiss: (msg: string) => void }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  const isCritical = alert.severity === "critical";

  return (
    <div style={{
      display: "flex", gap: 14, padding: "14px 18px",
      background: "var(--bg-elevated)", borderRadius: 14,
      border: `1px solid ${cfg.stripe}30`,
      borderLeft: `4px solid ${cfg.stripe}`,
      boxShadow: isCritical ? "0 4px 20px rgba(229, 62, 62, 0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
      transition: "all 0.2s",
      animation: isCritical ? "pulseGlow 2s ease-in-out infinite" : undefined,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: cfg.bg, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={16} color={cfg.stripe} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            color: cfg.stripe, textTransform: "uppercase", letterSpacing: "0.04em",
            background: cfg.bg, padding: "1px 8px", borderRadius: 4,
          }}>
            {cfg.label}
          </span>
          {alert.task_id && (
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
              Task: {alert.task_id}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500 }}>
          {alert.message}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <Clock size={11} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            {timeAgo((alert as any).timestamp)}
          </span>
        </div>
      </div>
      <button onClick={() => onDismiss(alert.message)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          borderRadius: 8, color: "var(--text-muted)", flexShrink: 0, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-primary)"; e.currentTarget.style.color = "#111"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
        title="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function Notifications() {
  const [alerts, setAlerts] = useState<(Alert & { timestamp?: string })[]>([]);
  const [narratives, setNarratives] = useState<{ text: string; ts: string }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [showNarratives, setShowNarratives] = useState(true);

  useEffect(() => {
    getPlan()
      .then(p => setAlerts((p?.alerts || []).map(a => ({ ...a, timestamp: new Date().toISOString() }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "alerts_updated") {
      const newAlerts = Array.isArray(event.data) ? event.data as Alert[] : [];
      setAlerts(newAlerts.map(a => ({ ...a, timestamp: new Date().toISOString() })));
    }
    if (event.event === "plan_updated") {
      const p = event.data as any;
      if (p?.alerts) setAlerts(p.alerts.map((a: Alert) => ({ ...a, timestamp: new Date().toISOString() })));
    }
    if (event.event === "narrative_alert") {
      setNarratives(prev => [
        { text: String(event.data), ts: new Date().toISOString() },
        ...prev,
      ].slice(0, 10));
    }
  }, []);

  useWebSocket(handleWsEvent);

  const visibleAlerts = useMemo(() =>
    alerts
      .filter(a => !dismissed.has(a.message + (a.task_id || "")))
      .filter(a => filter === "All" || a.severity === filter.toLowerCase()),
    [alerts, dismissed, filter]
  );

  const groupedAlerts = useMemo(() => {
    const groups: Record<string, (Alert & { timestamp?: string })[]> = {
      critical: [], warning: [], info: [],
    };
    visibleAlerts.forEach(a => {
      if (groups[a.severity]) groups[a.severity].push(a);
      else groups.info.push(a);
    });
    return groups;
  }, [visibleAlerts]);

  const handleDismiss = (msg: string) => {
    const key = msg;
    setDismissed(prev => new Set(prev).add(key));
  };

  const handleDismissAll = () => {
    setDismissed(new Set(visibleAlerts.map(a => a.message + (a.task_id || ""))));
  };

  const criticalCount = groupedAlerts.critical.length;
  const warningCount = groupedAlerts.warning.length;
  const infoCount = groupedAlerts.info.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={20} /> Notifications
            </h2>
            {!loading && visibleAlerts.length > 0 && (
              <div style={{
                background: "var(--text-primary)", color: "#fff", fontSize: 11, fontWeight: 600,
                padding: "2px 10px", borderRadius: 10, fontFamily: "'IBM Plex Mono', monospace",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {visibleAlerts.length}
                {criticalCount > 0 && <span style={{ color: "#FF6B6B" }}>!</span>}
              </div>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {loading ? "Loading..." : (
              <>
                {visibleAlerts.length} active · {criticalCount} critical · {warningCount} warning · {infoCount} info
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {visibleAlerts.length > 0 && (
            <button onClick={handleDismissAll}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--bg-primary)", border: "1px solid var(--border-default)",
                padding: "8px 16px", borderRadius: 10, fontSize: 12,
                cursor: "pointer", color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace",
              }}>
              <CheckCheck size={14} /> Dismiss All
            </button>
          )}
          <button onClick={() => {
            setDismissed(new Set());
            setLoading(true);
            getPlan().then(p => setAlerts((p?.alerts || []).map(a => ({ ...a, timestamp: new Date().toISOString() })))).finally(() => setLoading(false));
          }}
            style={{
              background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none",
              padding: "8px 16px", borderRadius: 10, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* AI Narratives */}
      {narratives.length > 0 && (
        <Card variant="purple" shadow style={{ padding: 0, overflow: "hidden" }}>
          <button onClick={() => setShowNarratives(!showNarratives)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "14px 18px", border: "none", background: "none",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={14} color="#8B5CF6" />
              <span>AI Narratives</span>
              <span style={{
                fontSize: 10, color: "var(--text-secondary)", background: "var(--bg-primary)",
                padding: "1px 6px", borderRadius: 6,
              }}>
                {narratives.length}
              </span>
            </div>
            {showNarratives ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {showNarratives && (
            <div style={{ padding: "0 18px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {narratives.map((n, i) => (
                <div key={i} style={{
                  padding: "8px 12px", background: "var(--bg-primary)", borderRadius: 10,
                  fontSize: 12, color: "#555", lineHeight: 1.5,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9D8FF", flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div>{n.text}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                      {new Date(n.ts).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map(({ label, value, icon: Icon }) => (
          <button key={value} onClick={() => setFilter(value)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: filter === value ? "var(--text-primary)" : "#FFFFFF",
              color: filter === value ? "#fff" : "var(--text-secondary)",
              border: filter === value ? "1px solid var(--text-primary)" : "1px solid var(--border-default)",
              padding: "7px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500,
              transition: "all 0.15s",
            }}>
            <Icon size={13} />
            {label}
            {value !== "All" && (
              <span style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                background: filter === value ? "#FFFFFF20" : "var(--bg-primary)",
                padding: "1px 6px", borderRadius: 6, color: filter === value ? "#fff" : "var(--text-secondary)",
              }}>
                {value === "critical" ? criticalCount : value === "warning" ? warningCount : infoCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, padding: "14px 18px",
              background: "var(--bg-elevated)", borderRadius: 14,
              border: "1px solid var(--border-default)",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--border-subtle)" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: 80, height: 14, background: "var(--border-subtle)", borderRadius: 4 }} />
                <div style={{ width: "70%", height: 12, background: "var(--border-subtle)", borderRadius: 4 }} />
                <div style={{ width: "50%", height: 12, background: "var(--border-subtle)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : visibleAlerts.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <ShieldCheck size={36} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#BFD78D" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, fontWeight: 500 }}>
            All clear! No active notifications.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
            You'll see alerts here when tasks need attention.
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Grouped by severity */}
          {(["critical", "warning", "info"] as const).map(severity => {
            const items = groupedAlerts[severity];
            if (items.length === 0) return null;
            const cfg = SEVERITY_CONFIG[severity];
            const Icon = cfg.icon;
            return (
              <div key={severity}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px 8px 4px",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 8,
                    background: cfg.bg, display: "flex", alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Icon size={13} color={cfg.stripe} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cfg.stripe, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>
                    {cfg.label}
                  </span>
                  <span style={{
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)",
                    background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 6,
                  }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((alert, i) => (
                    <NotificationCard key={alert.message + (alert.task_id || "") + i} alert={alert} onDismiss={handleDismiss} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.15); }
          50% { box-shadow: 0 0 0 6px rgba(229, 62, 62, 0.05); }
        }
      `}</style>
    </div>
  );
}
