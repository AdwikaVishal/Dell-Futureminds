import { useEffect, useMemo, useState, useCallback } from "react";
import { Zap, Bell, MessageSquare, RefreshCw, CheckSquare, Square, Circle, Brain, TrendingUp, Clock, AlertTriangle, BarChart3, GitBranch, Calendar, Layers } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { AIRationale } from "../shared/AIRationale";
import { SparkleIcon } from "../shared/SparkleIcon";
import { DependencyGraph } from "../shared/DependencyGraph";
import { FeedbackButton } from "../shared/FeedbackButton";
import { getPlan, refreshPlan, getTasks, getDashboard, getCalendarToday, DailyPlan, RankedTask, WebSocketEvent, DashboardResponse, TimeBlock, CalendarEvent, LeverageTask, BlockingImpact } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const CARD_BG = "#161D19";
const BORDER = "#232B26";
const BG = "#0E1411";

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
        {icon && <div style={{ color: SAGE, opacity: 0.6 }}>{icon}</div>}
      </div>
      <div style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </Card>
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
    getTasks().then(setAllTasks).catch(() => {});
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
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={18} color={SAGE} /> Mission Control
              </h2>
              <p style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
                {loading ? "Loading..." : `${allTasks.length} tasks · ${alerts.length} alerts · ${calendarEvents.length} events today`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => refreshPlan().then(setPlan).catch(() => {})}
                style={{ background: "rgba(143,203,168,0.1)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: SAGE, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
            {([
              ["plan", "Plan"],
              ["insights", "Insights"],
              ["timeline", "Timeline"],
              ["team", "Team"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  background: activeTab === key ? "rgba(143,203,168,0.12)" : "transparent",
                  border: "none", borderRadius: 6, padding: "6px 14px",
                  color: activeTab === key ? SAGE : TEXT_MUTED, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                {label}
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
            <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 13, padding: 40 }}>
              <p>No data yet. Connect your sources and run the pipeline to see your daily plan.</p>
              <button onClick={() => refreshPlan().then(setPlan).catch(() => {})}
                style={{ marginTop: 12, background: SAGE, color: "#0a1a0f", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Refresh Now
              </button>
            </div>
          )}

          {/* PLAN TAB */}
          {activeTab === "plan" && plan && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Top 3 */}
                <div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Zap size={12} color={SAGE} /> Top 3 Priorities Today
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {top3.length === 0 && (
                      <Card style={{ padding: "14px 16px" }}>
                        <span style={{ color: TEXT_MUTED, fontSize: 13 }}>No priorities ranked yet.</span>
                      </Card>
                    )}
                    {top3.map((task: any, i: number) => (
                      <Card key={task.id} style={{
                        padding: "14px 16px",
                        border: highlightedId === task.id ? `2px solid #CC3333` : `1px solid ${BORDER}`,
                        transition: "border 0.3s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "rgba(143,203,168,0.12)", color: SAGE, fontSize: 10, fontWeight: 700 }}>
                                {i + 1}
                              </span>
                              <span style={{ color: TEXT_MUTED, fontSize: 10, fontFamily: "monospace" }}>{task.id}</span>
                              <SourceBadge source={task.source || task.source_type} />
                            </div>
                            <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                              {task.title}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                            <PriorityPill level={(task.priority ?? "P3") as any} />
                            <FeedbackButton task={task} compact />
                            {task.deadline && <span style={{ color: TEXT_MUTED, fontSize: 10 }}>{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                        </div>
                        {(task.rationale) && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 6 }} />
                            <AIRationale text={task.rationale} />
                          </div>
                        )}
                       {task.score_breakdown && (
  <div
    style={{
      marginTop: 10,
      padding: "10px 12px",
      background: "rgba(143,203,168,0.04)",
      border: `1px solid rgba(143,203,168,0.08)`,
      borderRadius: 8,
    }}
  >
    <div
      style={{
        color: TEXT_PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <SparkleIcon size={11} />
      Why this is prioritized
    </div>

    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      {task.score_breakdown.deadline_urgency >= 80 && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(239,159,39,0.12)",
            border: "1px solid rgba(239,159,39,0.18)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          ⏰ Deadline approaching
        </span>
      )}

      {task.priority === "P0" && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(204,51,51,0.10)",
            border: "1px solid rgba(204,51,51,0.18)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          🚨 P0 Critical
        </span>
      )}

      {task.priority === "P1" && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(204,51,51,0.08)",
            border: "1px solid rgba(204,51,51,0.14)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          ⚠️ High Severity
        </span>
      )}

      {task.customer_facing && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(143,203,168,0.10)",
            border: "1px solid rgba(143,203,168,0.18)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          👥 Customer Impact
        </span>
      )}

      {task.vp_escalation && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(111,96,255,0.10)",
            border: "1px solid rgba(111,96,255,0.18)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          📢 Leadership Escalation
        </span>
      )}

      {task.score_breakdown.dependency_blocking > 0 && (
        <span
          style={{
            fontSize: 10,
            color: TEXT_PRIMARY,
            background: "rgba(143,203,168,0.10)",
            border: "1px solid rgba(143,203,168,0.18)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          🔗 Blocks Other Work
        </span>
      )}
    </div>
  </div>
)}
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Rest of tasks */}
                <div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    Remaining ({rest.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {rest.map((task: any) => (
                      <Card key={task.id} style={{
                        padding: "10px 14px",
                        border: highlightedId === task.id ? `2px solid #CC3333` : `1px solid ${BORDER}`,
                        transition: "border 0.3s",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => setChecked(p => ({ ...p, [task.id]: !p[task.id] }))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0, flexShrink: 0 }}>
                            {checked[task.id] ? <CheckSquare size={13} color={SAGE} /> : <Square size={13} />}
                          </button>
                          <span style={{ color: checked[task.id] ? TEXT_MUTED : TEXT_PRIMARY, fontSize: 12, flex: 1, textDecoration: checked[task.id] ? "line-through" : "none" }}>
                            {task.title}
                          </span>
                          <SourceBadge source={task.source || task.source_type} />
                          <PriorityPill level={(task.priority ?? "P3") as any} />
                          <span style={{ color: TEXT_MUTED, fontSize: 10, whiteSpace: "nowrap" }}>
                            {task.deadline ? new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card style={{ padding: "12px 14px" }}>
                  <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Bell size={11} color={SAGE} /> Proactive Alerts
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {alerts.length > 0 ? alerts.map((alert: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: "rgba(143,203,168,0.04)", borderRadius: 6, border: `1px solid rgba(143,203,168,0.08)` }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: alert.severity === "critical" ? "#CC3333" : alert.severity === "warning" ? "#EF9F27" : SAGE, flexShrink: 0, marginTop: 4 }} />
                        <span style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4 }}>{alert.message}</span>
                      </div>
                    )) : (
                      <div style={{ color: TEXT_MUTED, fontSize: 11 }}>All tasks on track.</div>
                    )}
                  </div>
                </Card>

                <Card style={{ padding: "12px 14px" }}>
                  <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                    AI Executive Summary
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.5 }}>
                      {top3.length > 0
                        ? `Top task "${top3[0].title}" scored at ${top3[0].score}. ${leverageTasks.length > 0 ? `Highest leverage: "${leverageTasks[0].title}" (${leverageTasks[0].leverage_score}).` : ""} ${deferredTasks.length > 0 ? `${deferredTasks.length} task(s) detected as recurring.` : ""}`
                        : "Run the pipeline to see executive summary."}
                    </div>
                  </div>
                </Card>

                <Card style={{ padding: "12px 14px" }}>
                  <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                    Quick Actions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={handleInjectP1} disabled={injecting}
                      style={{
                        background: injecting ? "#5a1a1a" : "#8B1A1A",
                        color: "#EDF3EF", padding: "8px 12px",
                        border: `1px solid ${injecting ? "#3a0a0a" : "#CC3333"}`,
                        borderRadius: 6, fontSize: 11, fontWeight: 600,
                        cursor: injecting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      {injecting ? "Injecting..." : "Inject P1 Outage"}
                    </button>
                  </div>
                </Card>

                <Card style={{ padding: "12px 14px" }}>
                  <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                    Calendar Today
                  </div>
                  {calendarEvents.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {calendarEvents.slice(0, 4).map((ev) => (
                        <div key={ev.event_id} style={{ fontSize: 11, color: TEXT_MUTED, display: "flex", gap: 6, alignItems: "center" }}>
                          <Clock size={10} color={SAGE} />
                          <span>{ev.title}</span>
                          {!ev.is_all_day && (
                            <span style={{ color: "#6B7A72", fontSize: 10 }}>
                              {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>No events scheduled.</div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* INSIGHTS TAB */}
          {activeTab === "insights" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <GitBranch size={12} color={SAGE} /> Highest Leverage Tasks
                </div>
                {leverageTasks.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {leverageTasks.map((lt: LeverageTask) => (
                      <div key={lt.task_id} style={{ padding: "10px 12px", background: "rgba(143,203,168,0.04)", borderRadius: 6, border: `1px solid rgba(143,203,168,0.08)` }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_PRIMARY, marginBottom: 4 }}>{lt.title}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 10, color: TEXT_MUTED }}>
                          <span>Leverage: {lt.leverage_score}</span>
                          <span>Blocks: {lt.blocks_directly} direct / {lt.blocks_transitively} transitive</span>
                        </div>
                        {lt.blocked_by.length > 0 && (
                          <div style={{ fontSize: 10, color: "#CC3333", marginTop: 4 }}>
                            Blocked by: {lt.blocked_by.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>No leverage data available.</div>
                )}
              </Card>

              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={12} color={SAGE} /> Unblocking Recommendations
                </div>
                {unblockingRecs.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {unblockingRecs.slice(0, 5).map((rec: any, i: number) => (
                      <div key={i} style={{ padding: "8px 10px", background: "rgba(143,203,168,0.04)", borderRadius: 6, border: `1px solid rgba(143,203,168,0.08)` }}>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.4 }}>{rec.suggestion}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>No blocking issues detected.</div>
                )}
              </Card>

              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={12} color={SAGE} /> Deferred / Recurring Tasks
                </div>
                {deferredTasks.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {deferredTasks.map((dt: any) => (
                      <div key={dt.task_id} style={{ padding: "8px 10px", background: "rgba(239,159,39,0.08)", borderRadius: 6, border: "1px solid rgba(239,159,39,0.15)" }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_PRIMARY }}>{dt.title}</div>
                        <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{dt.reason}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>No recurring task patterns detected yet.</div>
                )}
              </Card>

              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Brain size={12} color={SAGE} /> AI Agent Activity
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Ingestion", "Extraction", "Dedup", "Priority", "Planning"].map((agent) => (
                    <div key={agent} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid rgba(35,43,38,0.5)` }}>
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>{agent} Agent</span>
                      <span style={{ fontSize: 10, color: SAGE }}>active</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: TEXT_MUTED }}>
                  <SparkleIcon size={10} /> Pipeline: Observe → Think → Decide → Verify → Act
                </div>
              </Card>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === "timeline" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} color={SAGE} /> Time-Blocked Plan
                </div>
                {timeBlocks.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {timeBlocks.map((tb: TimeBlock, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                          <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: "monospace" }}>
                            {new Date(tb.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div style={{ width: 1, height: 20, background: BORDER, margin: "2px 0" }} />
                        </div>
                        <div style={{
                          flex: 1, padding: "8px 10px", borderRadius: 6,
                          background: tb.slot_type === "deep_work" ? "rgba(143,203,168,0.08)" : "rgba(143,203,168,0.04)",
                          border: `1px solid ${tb.slot_type === "deep_work" ? "rgba(143,203,168,0.2)" : BORDER}`,
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_PRIMARY }}>{tb.title}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: TEXT_MUTED }}>
                            {tb.slot_type === "deep_work" && <span style={{ color: SAGE }}>Deep Work</span>}
                            {tb.priority && <PriorityPill level={tb.priority as any} />}
                            <span>Score: {tb.score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>No time blocks generated. Run pipeline to see your time-blocked plan.</div>
                )}
              </Card>

              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} color={SAGE} /> Today's Events
                </div>
                {calendarEvents.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {calendarEvents.map((ev) => (
                      <div key={ev.event_id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                          <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: "monospace" }}>
                            {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div style={{ width: 1, height: 20, background: BORDER, margin: "2px 0" }} />
                        </div>
                        <div style={{ flex: 1, padding: "8px 10px", borderRadius: 6, background: "rgba(143,203,168,0.04)", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontSize: 12, color: TEXT_PRIMARY }}>{ev.title}</div>
                          <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                            {ev.is_all_day ? "All day" : `${new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>No events for today.</div>
                )}
              </Card>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === "team" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <BarChart3 size={12} color={SAGE} /> Team Velocity
                </div>
                {velocity.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {velocity.map((v: any) => (
                      <div key={v.day} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid rgba(35,43,38,0.5)` }}>
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>{v.day}</span>
                        <span style={{ fontSize: 11, color: TEXT_PRIMARY }}>{v.completed} / {v.total} done</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>Insufficient data for velocity chart. Run the pipeline daily.</div>
                )}
              </Card>

              <Card style={{ padding: "16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={12} color={SAGE} /> Team Risks
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
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: item.severity === "critical" ? "rgba(204,51,51,0.08)" : "rgba(143,203,168,0.04)", borderRadius: 6, border: `1px solid ${item.severity === "critical" ? "rgba(204,51,51,0.2)" : "rgba(143,203,168,0.08)"}` }}>
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: item.severity === "critical" ? "#CC3333" : TEXT_PRIMARY }}>{item.value}</span>
                      </div>
                    ));
                  })()}
                </div>
              </Card>
            </div>
          )}

          {plan && (
            <DependencyGraph tasks={allTasks} />
          )}
        </main>
      </div>
    </div>
  );
}
