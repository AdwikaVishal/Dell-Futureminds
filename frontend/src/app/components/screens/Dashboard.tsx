import { useEffect, useMemo, useState, useCallback } from "react";
import { Zap, Bell, RefreshCw, Clock, Calendar, AlertTriangle, BarChart3, MessageSquare } from "lucide-react";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { AIRationale } from "../shared/AIRationale";
import { FeedbackButton } from "../shared/FeedbackButton";
import { TaskCard } from "../shared/TaskCard";
import { CreateTaskModal } from "../shared/CreateTaskModal";
import { getPlan, refreshPlan, injectTask, getDashboard, getCalendarToday, DailyPlan, WebSocketEvent, CalendarEvent, Task } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

function KPI({ icon, label, value, sub, variant = "blue" }: { icon: React.ReactNode; label: string; value: string; sub: string; variant?: string }) {
  return (
    <Card variant={variant as any} shadow>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#7A7A7A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#7A7A7A", marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

export function Dashboard() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [narrativeAlert, setNarrativeAlert] = useState<string | null>(null);
  const [narrativeDismissed, setNarrativeDismissed] = useState(false);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "plan_updated" || event.event === "priorities_updated") {
      const p = event.data as DailyPlan;
      setPlan(p);
      setAlerts(p?.alerts || []);
    }
    if (event.event === "alerts_updated") {
      setAlerts(Array.isArray(event.data) ? event.data as any[] : []);
    }
    if (event.event === "narrative_alert") {
      setNarrativeAlert(String(event.data));
      setNarrativeDismissed(false);
    }
  }, []);

  useWebSocket(handleWsEvent);

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, d, cal] = await Promise.all([
        getPlan(),
        getDashboard().catch(() => null),
        getCalendarToday().catch(() => ({ events: [] })),
      ]);
      setPlan(p);
      setDashboard(d);
      setCalendarEvents(cal.events || []);
      setAlerts(p?.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh() }, []);

  const top3 = plan?.top_priorities ?? [];
  const allRanked = plan?.ranked_tasks ?? [];
  const rest = useMemo(() => {
    if (!plan) return [];
    return [...(plan.do_next ?? []), ...(plan.deferred ?? []), ...(plan.blocked ?? [])];
  }, [plan]);

  const handleInjectP1 = async () => {
    setInjecting(true);
    try {
      const updatedPlan = await injectTask({
        title: "P1 Production Outage - Login Service Down",
        description: "Users cannot authenticate.",
        source_type: "injected",
        priority: "P1",
        deadline: new Date(Date.now() + 3600000).toISOString(),
      });
      setPlan(updatedPlan);
      refresh();
    } catch (err) { console.error(err); }
    finally { setInjecting(false); }
  };

  const deferredTasks = plan?.deferred_tasks_detected ?? dashboard?.deferred_tasks ?? [];
  const timeBlocks = plan?.time_blocked_plan?.time_blocks ?? [];
  const focusHours = timeBlocks.length > 0
    ? timeBlocks.reduce((acc: number, tb: any) => acc + (new Date(tb.end).getTime() - new Date(tb.start).getTime()) / 3600000, 0).toFixed(1)
    : "0.0";

  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ color: "#7A7A7A", fontSize: 13, marginTop: 4 }}>
          {loading ? "Loading..." : `${greeting}! ${allRanked.length} active tasks, ${alerts.length} alerts, ${calendarEvents.length} events today`}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KPI icon={<BarChart3 size={16} color="#7A7A7A" />} label="Total Tasks" value={String(allRanked.length)} sub="Active tracked" variant="blue" />
        <KPI icon={<AlertTriangle size={16} color="#7A7A7A" />} label="Top Priority Score" value={top3[0] ? String(top3[0].score) : "--"} sub={top3[0]?.title?.slice(0, 24) || "No tasks"} variant="pink" />
        <KPI icon={<Zap size={16} color="#7A7A7A" />} label="Hidden Tasks" value={String(deferredTasks.length)} sub="AI-extracted" variant="green" />
        <KPI icon={<Clock size={16} color="#7A7A7A" />} label="Focus Hours" value={focusHours} sub={`${timeBlocks.length} blocks scheduled`} variant="yellow" />
      </div>

      {narrativeAlert && !narrativeDismissed && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#F6F2E9", border: "1px solid #F97316", borderRadius: 12, fontSize: 12, color: "#111111" }}>
          <MessageSquare size={14} className="shrink-0 mt-0.5" style={{ color: "#F97316" }} />
          <div style={{ flex: 1 }}>{narrativeAlert}</div>
          <button onClick={() => setNarrativeDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A7A7A", fontSize: 14, padding: 0 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => refreshPlan().then(p => { setPlan(p); setAlerts(p?.alerts || []); }).catch(() => {})}
          style={{ background: "#0D0D0D", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 12, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          <RefreshCw size={13} /> Generate Plan
        </button>
        <button onClick={handleInjectP1} disabled={injecting}
          style={{ background: "none", border: "1px solid #E9E4D8", padding: "10px 20px", borderRadius: 12, fontSize: 12, cursor: injecting ? "not-allowed" : "pointer", color: "#7A7A7A", fontFamily: "'IBM Plex Mono', monospace" }}>
          {injecting ? "Injecting..." : "Inject P1 Outage"}
        </button>
        <CreateTaskModal onCreated={refresh} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ color: "#7A7A7A", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={12} /> Top Priorities Today
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {top3.length === 0 && (
                <Card><span style={{ color: "#7A7A7A", fontSize: 13 }}>No priorities ranked yet. Generate a plan.</span></Card>
              )}
              {top3.map((task: any, i: number) => (
                <Card key={task.id} variant={i === 0 ? "pink" : i === 1 ? "yellow" : "blue"} shadow>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#0D0D0D", opacity: 0.3 }}>#{i + 1}</span>
                        <span style={{ color: "#7A7A7A", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{task.id}</span>
                        <SourceBadge source={task.source || task.source_type} />
                      </div>
                      <div style={{ color: "#111111", fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{task.title}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <PriorityPill level={(task.priority ?? "P3") as any} />
                      <FeedbackButton task={task} compact />
                      {task.deadline && <span style={{ color: "#7A7A7A", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                  {task.rationale && (
                    <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 8 }}>
                      <AIRationale text={task.rationale} />
                    </div>
                  )}
                  {task.score_breakdown && Object.keys(task.score_breakdown).length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      {Object.entries(task.score_breakdown).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 10, color: "#7A7A7A", background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {k.replace(/_/g, " ")}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#7A7A7A", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
              Do Next ({rest.length})
            </div>
            {rest.length === 0 && !loading && (
              <Card><span style={{ color: "#7A7A7A", fontSize: 13 }}>Run the pipeline to see tasks here.</span></Card>
            )}
            {rest.map((task: any) => (
              <TaskCard key={task.id} task={task as Task} onUpdate={refresh} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card variant="orange" shadow>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Bell size={12} /> <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Alerts</span>
            </div>
            {alerts.length > 0 ? alerts.slice(0, 4).map((a: any, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none", fontSize: 12, color: "#7A7A7A", display: "flex", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.severity === "critical" ? "#F7C5E6" : "#F5D66E", flexShrink: 0, marginTop: 4 }} />
                {a.message}
              </div>
            )) : <div style={{ fontSize: 12, color: "#7A7A7A" }}>All clear. No alerts.</div>}
          </Card>

          <Card shadow>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Calendar Today</div>
            {calendarEvents.length > 0 ? calendarEvents.slice(0, 3).map((ev) => (
              <div key={ev.event_id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #E9E4D8", fontSize: 12, color: "#7A7A7A" }}>
                <Calendar size={10} />
                <span style={{ flex: 1 }}>{ev.title}</span>
                {!ev.is_all_day && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            )) : <div style={{ fontSize: 12, color: "#7A7A7A" }}>No events today.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
