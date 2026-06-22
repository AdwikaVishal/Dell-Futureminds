import { useEffect, useMemo, useState, useCallback } from "react";
import { Zap, Bell, RefreshCw, CheckSquare, Square, AlertTriangle, BarChart3, GitBranch, Clock, Calendar, Brain, TrendingUp, Layers } from "lucide-react";
import type { Node, Edge } from "reactflow";
import { MarkerType } from "reactflow";
import { AppHeader } from "../shared/AppHeader";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { AIRationale } from "../shared/AIRationale";
import { SparkleIcon } from "../shared/SparkleIcon";
import { DependencyGraph } from "../shared/DependencyGraph";
import { FeedbackButton } from "../shared/FeedbackButton";
import { getPlan, refreshPlan, getTasks, getDashboard, getCalendarToday, DailyPlan, RankedTask, WebSocketEvent, DashboardResponse, TimeBlock, CalendarEvent, LeverageTask, BlockingImpact } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #D9D9D9", padding: "16px 20px", background: "var(--bg-elevated)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
        {icon && <div style={{ color: "var(--border-default)" }}>{icon}</div>}
      </div>
      <div style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Screen1() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"plan" | "insights" | "timeline" | "team">("plan");

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "plan_updated" || event.event === "priorities_updated") {
      setPlan(event.data as DailyPlan);
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
    } catch (err) {
      console.error("[Dashboard] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh() }, []);

  useEffect(() => {
    getTasks().then(r => setAllTasks(r.tasks || [])).catch(() => {});
  }, []);

  const handleInjectP1 = async () => {
    setInjecting(true);
    try {
      const res = await fetch("/api/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "P1 Production Outage - Login Service Down",
          description: "Users cannot authenticate. Affects all customers.",
          source_type: "injected",
          priority: "P1",
          deadline: new Date(Date.now() + 3600000).toISOString(),
        }),
      });
      const updatedPlan = await res.json();
      setPlan(updatedPlan);
      const injectedTask = [...(updatedPlan.top_priorities ?? []), ...(updatedPlan.do_next ?? [])].find((t: any) => t.source === "injected" || t.source_type === "injected");
      if (injectedTask) {
        setHighlightedId(injectedTask.id);
        setTimeout(() => setHighlightedId(null), 3000);
      }
      refresh();
    } catch (err) {
      console.error("[Inject] failed:", err);
    } finally {
      setInjecting(false);
    }
  };

  const top3 = plan?.top_priorities ?? [];
  const rest = useMemo(() => {
    if (!plan) return [];
    return [...(plan.do_next ?? []), ...(plan.deferred ?? []), ...(plan.blocked ?? [])];
  }, [plan]);
  const alerts = plan?.alerts ?? [];
  const timeBlocks = plan?.time_blocked_plan?.time_blocks ?? [];
  const leverageTasks = plan?.highest_leverage_tasks ?? dashboard?.dependency_analysis?.highest_leverage_tasks ?? [];
  const blocking = dashboard?.dependency_analysis?.blocking_impacts ?? {};
  const unblockingRecs = dashboard?.dependency_analysis?.unblocking_recommendations ?? [];
  const velocity = dashboard?.team_velocity?.daily_counts ?? [];
  const deferredTasks = plan?.deferred_tasks_detected ?? dashboard?.deferred_tasks ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader planTime={plan ? "Dashboard ready" : undefined} />
      <main style={{ flex: 1, overflow: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={18} color="var(--blue-primary)" /> Mission Control
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
              {loading ? "Loading..." : `${allTasks.length} tasks · ${alerts.length} alerts · ${calendarEvents.length} events today`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => refreshPlan().then(setPlan).catch(() => {})}
              style={{ background: "none", border: "1px solid #D9D9D9", padding: "8px 14px", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #D9D9D9" }}>
          {(["plan", "insights", "timeline", "team"] as const).map((key) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === key ? "2px solid var(--blue-primary)" : "2px solid transparent",
                padding: "8px 16px",
                color: activeTab === key ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 12, fontWeight: activeTab === key ? 600 : 400,
                cursor: "pointer", marginBottom: -1,
                fontFamily: "'IBM Plex Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.06em",
                transition: "all 0.15s",
              }}>
              {key}
            </button>
          ))}
        </div>

        {/* Executive Summary - always shown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <MetricCard label="Tasks" value={String(allTasks.length)} sub="active tracked" icon={<BarChart3 size={14} />} />
          <MetricCard label="Alerts" value={String(alerts.length)} sub={alerts.length > 0 ? `${alerts.filter(a => a.severity === 'critical').length} critical` : "all clear"} icon={<AlertTriangle size={14} />} />
          <MetricCard label="Top Priority Score" value={top3[0] ? String(top3[0].score) : "--"} sub={top3[0]?.title?.slice(0, 30) || "no tasks"} icon={<Brain size={14} />} />
          <MetricCard label="Events Today" value={String(calendarEvents.length)} sub={`${calendarEvents.filter(e => !e.is_all_day).length} meetings`} icon={<Calendar size={14} />} />
        </div>

        {!plan && !loading && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, padding: 40, border: "1px solid #D9D9D9", background: "var(--bg-elevated)" }}>
            <p>No data yet. Connect your sources and run the pipeline to see your daily plan.</p>
            <button onClick={() => refreshPlan().then(setPlan).catch(() => {})}
              style={{ marginTop: 12, background: "var(--text-primary)", color: "#FFFFFF", border: "none", padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Refresh Now
            </button>
          </div>
        )}

        {/* PLAN TAB */}
        {activeTab === "plan" && plan && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Top 3 */}
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  <Zap size={12} color="var(--blue-primary)" /> Top 3 Priorities Today
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {top3.length === 0 && (
                    <div style={{ border: "1px solid #D9D9D9", padding: "16px 20px", background: "var(--bg-elevated)" }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>No priorities ranked yet.</span>
                    </div>
                  )}
                  {top3.map((task: any, i: number) => (
                    <div key={task.id} style={{
                      border: highlightedId === task.id ? "2px solid #DC2626" : "1px solid #D9D9D9",
                      padding: "16px 20px", background: "var(--bg-elevated)",
                      transition: "border 0.3s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--border-default)", lineHeight: 1 }}>
                              #{i + 1}
                            </span>
                            <span style={{ color: "var(--text-secondary)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{task.id}</span>
                            <SourceBadge source={task.source || task.source_type} />
                          </div>
                          <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
                            {task.title}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          <PriorityPill level={(task.priority ?? "P3") as any} />
                          <FeedbackButton task={task} compact />
                          {task.deadline && <span style={{ color: "var(--text-secondary)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                      {(task.rationale) && (
                        <div style={{ marginTop: 8, borderTop: "1px solid #D9D9D9", paddingTop: 8 }}>
                          <AIRationale text={task.rationale} />
                        </div>
                      )}
                      {task.score_breakdown && Object.keys(task.score_breakdown).length > 0 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {Object.entries(task.score_breakdown).map(([k, v]) => (
                            <span key={k} style={{ fontSize: 10, color: "var(--text-secondary)", border: "1px solid #D9D9D9", padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace" }}>
                              {k.replace(/_/g, " ")}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rest of tasks */}
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Remaining ({rest.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {rest.map((task: any) => (
                    <div key={task.id} style={{
                      border: highlightedId === task.id ? "2px solid #DC2626" : "1px solid #D9D9D9",
                      padding: "10px 14px", background: "var(--bg-elevated)",
                      transition: "border 0.3s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => setChecked(p => ({ ...p, [task.id]: !p[task.id] }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--border-default)", padding: 0, flexShrink: 0 }}>
                          {checked[task.id] ? <CheckSquare size={13} color="#16A34A" /> : <Square size={13} />}
                        </button>
                        <span style={{ color: checked[task.id] ? "var(--border-default)" : "var(--text-primary)", fontSize: 12, flex: 1, textDecoration: checked[task.id] ? "line-through" : "none" }}>
                          {task.title}
                        </span>
                        <SourceBadge source={task.source || task.source_type} />
                        <PriorityPill level={(task.priority ?? "P3") as any} />
                        <span style={{ color: "var(--text-secondary)", fontSize: 10, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {task.deadline ? new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ border: "1px solid #D9D9D9", padding: "16px 18px", background: "var(--bg-elevated)" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <Bell size={11} color="var(--blue-primary)" /> Proactive Alerts
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {alerts.length > 0 ? alerts.map((alert: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", border: "1px solid #D9D9D9" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: alert.severity === "critical" ? "#DC2626" : alert.severity === "warning" ? "#D97706" : "var(--text-secondary)", flexShrink: 0, marginTop: 4 }} />
                      <span style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.4 }}>{alert.message}</span>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>All tasks on track.</div>
                  )}
                </div>
              </div>

              <div style={{ border: "1px solid #D9D9D9", padding: "16px 18px", background: "var(--bg-elevated)" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  AI Executive Summary
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {top3.length > 0
                    ? `Top task "${top3[0].title}" scored at ${top3[0].score}. ${leverageTasks.length > 0 ? `Highest leverage: "${leverageTasks[0].title}" (${leverageTasks[0].leverage_score}).` : ""} ${deferredTasks.length > 0 ? `${deferredTasks.length} task(s) detected as recurring.` : ""}`
                    : "Run the pipeline to see executive summary."}
                </div>
              </div>

              <div style={{ border: "1px solid #D9D9D9", padding: "16px 18px", background: "var(--bg-elevated)" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Quick Actions
                </div>
                <button onClick={handleInjectP1} disabled={injecting}
                  style={{
                    background: injecting ? "#F8F8F6" : "none",
                    color: "#DC2626", padding: "8px 12px",
                    border: "1px solid #DC2626",
                    fontSize: 11, fontWeight: 600,
                    cursor: injecting ? "not-allowed" : "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                    width: "100%",
                  }}>
                  {injecting ? "Injecting..." : "Inject P1 Outage"}
                </button>
              </div>

              <div style={{ border: "1px solid #D9D9D9", padding: "16px 18px", background: "var(--bg-elevated)" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Calendar Today
                </div>
                {calendarEvents.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {calendarEvents.slice(0, 4).map((ev) => (
                      <div key={ev.event_id} style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}>
                        <Clock size={10} color="var(--text-secondary)" />
                        <span>{ev.title}</span>
                        {!ev.is_all_day && (
                          <span style={{ color: "var(--text-secondary)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>No events scheduled.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === "insights" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <GitBranch size={12} color="var(--blue-primary)" /> Highest Leverage Tasks
              </div>
              {leverageTasks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leverageTasks.map((lt: LeverageTask) => (
                    <div key={lt.task_id} style={{ padding: "10px 12px", border: "1px solid #D9D9D9" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{lt.title}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span>Leverage: {lt.leverage_score}</span>
                        <span>Blocks: {lt.blocks_directly} direct / {lt.blocks_transitively} transitive</span>
                      </div>
                      {lt.blocked_by.length > 0 && (
                        <div style={{ fontSize: 10, color: "#DC2626", marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                          Blocked by: {lt.blocked_by.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>No leverage data available.</div>
              )}
            </div>

            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <AlertTriangle size={12} color="var(--blue-primary)" /> Unblocking Recommendations
              </div>
              {unblockingRecs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unblockingRecs.slice(0, 5).map((rec: any, i: number) => (
                    <div key={i} style={{ padding: "8px 10px", border: "1px solid #D9D9D9" }}>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{rec.suggestion}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>No blocking issues detected.</div>
              )}
            </div>

            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <TrendingUp size={12} color="var(--blue-primary)" /> Deferred / Recurring Tasks
              </div>
              {deferredTasks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {deferredTasks.map((dt: any) => (
                    <div key={dt.task_id} style={{ padding: "8px 10px", border: "1px solid #D9D9D9" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{dt.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{dt.reason}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>No recurring task patterns detected yet.</div>
              )}
            </div>

            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <Brain size={12} color="var(--blue-primary)" /> AI Agent Activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Ingestion", "Extraction", "Dedup", "Priority", "Planning"].map((agent) => (
                  <div key={agent} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #E5E5E5" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{agent} Agent</span>
                    <span style={{ fontSize: 10, color: "#16A34A", fontFamily: "'IBM Plex Mono', monospace" }}>active</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-secondary)" }}>
                <SparkleIcon size={10} /> Pipeline: Observe → Think → Decide → Verify → Act
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <Clock size={12} color="var(--blue-primary)" /> Time-Blocked Plan
              </div>
              {timeBlocks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {timeBlocks.map((tb: TimeBlock, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {new Date(tb.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div style={{ width: 1, height: 20, background: "var(--border-default)", margin: "2px 0" }} />
                      </div>
                      <div style={{
                        flex: 1, padding: "8px 10px",
                        border: `1px solid ${tb.slot_type === "deep_work" ? "var(--blue-primary)" : "var(--border-default)"}`,
                        background: tb.slot_type === "deep_work" ? "#FFF8F3" : "#FFFFFF",
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{tb.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {tb.slot_type === "deep_work" && <span style={{ color: "var(--blue-primary)" }}>Deep Work</span>}
                          {tb.priority && <PriorityPill level={tb.priority as any} />}
                          <span>Score: {tb.score}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>No time blocks generated. Run pipeline to see your time-blocked plan.</div>
              )}
            </div>

            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <Calendar size={12} color="var(--blue-primary)" /> Today's Events
              </div>
              {calendarEvents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {calendarEvents.map((ev) => (
                    <div key={ev.event_id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div style={{ width: 1, height: 20, background: "var(--border-default)", margin: "2px 0" }} />
                      </div>
                      <div style={{ flex: 1, padding: "8px 10px", border: "1px solid #D9D9D9", background: "var(--bg-elevated)" }}>
                        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{ev.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {ev.is_all_day ? "All day" : `${new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>No events for today.</div>
              )}
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "team" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <BarChart3 size={12} color="var(--blue-primary)" /> Team Velocity
              </div>
              {velocity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {velocity.map((v: any) => (
                    <div key={v.day} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E5E5E5" }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v.day}</span>
                      <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace" }}>{v.completed} / {v.total} done</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Insufficient data for velocity chart. Run the pipeline daily.</div>
              )}
            </div>

            <div style={{ border: "1px solid #D9D9D9", padding: "20px", background: "var(--bg-elevated)" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                <AlertTriangle size={12} color="var(--blue-primary)" /> Team Risks
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const blockedCount = allTasks.filter(t => t.status === "blocked").length;
                  const overdueCount = allTasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length;
                  const p0p1Unassigned = allTasks.filter(t => (t.priority === "P0" || t.priority === "P1") && !t.owner).length;
                  const items = [];
                  if (blockedCount > 0) items.push({ label: "Blocked Tasks", value: String(blockedCount), severity: "warning" });
                  if (overdueCount > 0) items.push({ label: "Overdue Tasks", value: String(overdueCount), severity: "critical" });
                  if (p0p1Unassigned > 0) items.push({ label: "Unassigned P0/P1", value: String(p0p1Unassigned), severity: "critical" });
                  if (items.length === 0) items.push({ label: "No risks", value: "All clear", severity: "info" });
                  return items.map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: `1px solid ${item.severity === "critical" ? "#DC2626" : "var(--border-default)"}` }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: item.severity === "critical" ? "#DC2626" : "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace" }}>{item.value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {plan && allTasks.length > 0 && (
          <DependencyGraph
            nodes={allTasks.map((t: any, i: number) => ({
              id: t.id,
              type: "taskNode",
              position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 110 },
              data: {
                label: t.title,
                source_type: t.source_type,
                priority: t.priority || "P2",
                status: t.status || "open",
                is_blocked: (t.dependencies?.length || 0) > 0,
                is_blocking: (t.blocks?.length || 0) > 0,
                blocking_count: t.blocks?.length || 0,
              },
            }))}
            edges={(() => {
              const taskMap = Object.fromEntries(allTasks.map((t: any) => [t.id, t]));
              const edges: Edge[] = [];
              const edgeSet = new Set<string>();
              allTasks.forEach((t: any) => {
                (t.dependencies || []).forEach((depId: string) => {
                  if (taskMap[depId]) {
                    const key = `${depId}->${t.id}`;
                    if (!edgeSet.has(key)) {
                      edgeSet.add(key);
                      edges.push({
                        id: key,
                        source: depId,
                        target: t.id,
                        type: "smoothstep",
                        animated: true,
                        style: { stroke: "#F7C5E6", strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: "#F7C5E6" },
                      });
                    }
                  }
                });
                (t.blocks || []).forEach((blockedId: string) => {
                  if (taskMap[blockedId]) {
                    const key = `${t.id}->${blockedId}`;
                    if (!edgeSet.has(key)) {
                      edgeSet.add(key);
                      edges.push({
                        id: key,
                        source: t.id,
                        target: blockedId,
                        type: "smoothstep",
                        animated: true,
                        style: { stroke: "#BFD78D", strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: "#BFD78D" },
                      });
                    }
                  }
                });
              });
              return edges;
            })()}
          />
        )}
      </main>
    </div>
  );
}
