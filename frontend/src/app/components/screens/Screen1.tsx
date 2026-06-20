import { useEffect, useMemo, useState, useCallback } from "react";
import { Zap, Bell, MessageSquare, RefreshCw, CheckSquare, Square, Circle } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { AIRationale } from "../shared/AIRationale";
import { SparkleIcon } from "../shared/SparkleIcon";
import { DependencyGraph } from "../shared/DependencyGraph";
import { FeedbackButton } from "../shared/FeedbackButton";
import { getPlan, refreshPlan, getTasks, DailyPlan, RankedTask, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const CARD_BG = "#161D19";
const BORDER = "#232B26";
const BG = "#0E1411";

export function Screen1() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "plan_updated" || event.event === "priorities_updated") {
      setPlan(event.data as DailyPlan);
    }
  }, []);

  useWebSocket(handleWsEvent);

  const refresh = async () => {
    setLoading(true);
    try {
      const p = await getPlan();
      console.log("[DailyPlan] API response:", p);
      setPlan(p);
    } catch (err) {
      console.error("[DailyPlan] Fetch failed:", err);
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
      console.log("[Inject] response:", updatedPlan);
      setPlan(updatedPlan);
      const injectedTask = [...(updatedPlan.top_priorities ?? []), ...(updatedPlan.do_next ?? [])].find((t: any) => t.source === "injected" || t.source_type === "injected");
      if (injectedTask) {
        setHighlightedId(injectedTask.id);
        setTimeout(() => setHighlightedId(null), 3000);
      }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader planTime={plan ? "Plan ready" : undefined} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h2 style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
              Daily Plan
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
              {loading ? "Loading..." : !plan ? "No plan available. Run a refresh to get started." : `${top3.length} priorities · ${rest.length} remaining tasks`}
            </p>
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

          {plan && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Your Top 3 Priorities Today
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {top3.length === 0 && (
                    <Card style={{ padding: "16px 18px" }}>
                      <span style={{ color: TEXT_MUTED, fontSize: 13 }}>No priorities ranked yet.</span>
                    </Card>
                  )}
                  {top3.map((task: any, i: number) => (
                    <Card key={task.id} style={{
                      padding: "16px 18px",
                      border: highlightedId === task.id ? `2px solid #CC3333` : `1px solid ${BORDER}`,
                      transition: "border 0.3s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ color: TEXT_MUTED, fontSize: 11, fontFamily: "monospace" }}>{task.id}</span>
                            <SourceBadge source={task.source || task.source_type} />
                          </div>
                          <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "rgba(143,203,168,0.12)", color: SAGE, fontSize: 11, fontWeight: 700, marginRight: 8, flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            {task.title}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          <PriorityPill level={(task.priority ?? "P3") as any} />
                          <FeedbackButton task={task} compact />
                          {task.deadline && <span style={{ color: TEXT_MUTED, fontSize: 11 }}>Due {task.deadline}</span>}
                        </div>
                      </div>
                      {(task.rationale) && (
                        <>
                          <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 12 }} />
                          <AIRationale text={task.rationale} />
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Rest of Today
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rest.length === 0 && (
                    <Card style={{ padding: "12px 16px" }}>
                      <span style={{ color: TEXT_MUTED, fontSize: 13 }}>No additional tasks.</span>
                    </Card>
                  )}
                  {rest.map((task: any) => (
                    <Card key={task.id} style={{
                      padding: "12px 16px",
                      border: highlightedId === task.id ? `2px solid #CC3333` : `1px solid ${BORDER}`,
                      transition: "border 0.3s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setChecked(p => ({ ...p, [task.id]: !p[task.id] }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0, flexShrink: 0 }}>
                          {checked[task.id] ? <CheckSquare size={15} color={SAGE} /> : <Square size={15} />}
                        </button>
                        <span style={{ color: checked[task.id] ? TEXT_MUTED : TEXT_PRIMARY, fontSize: 13, flex: 1, textDecoration: checked[task.id] ? "line-through" : "none" }}>
                          {task.title}
                        </span>
                        <SourceBadge source={task.source || task.source_type} />
                        <PriorityPill level={(task.priority ?? "P3") as any} />
                        <span style={{ color: TEXT_MUTED, fontSize: 11, whiteSpace: "nowrap" }}>
                          {task.deadline ? `Due ${task.deadline}` : ""}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Proactive Alerts
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.length > 0 ? alerts.map((alert: any, i: number) => (
                    <Card key={i} style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(143,203,168,0.1)", border: `1px solid rgba(143,203,168,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Bell size={13} color={SAGE} />
                        </div>
                        <span style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5 }}>{alert.message}</span>
                      </div>
                    </Card>
                  )) : (
                    <Card style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(143,203,168,0.1)", border: `1px solid rgba(143,203,168,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Zap size={13} color={SAGE} />
                        </div>
                        <span style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5 }}>All tasks on track — no critical alerts</span>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              <Card style={{ padding: "14px 16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Sync status
                </div>
                {[
                  ["Sources synced", "Live"],
                  ["Tasks loaded", String((plan ? top3.length + rest.length : 0) || "--")],
                  ["Last sync", plan?.generated_at ? new Date(plan.generated_at).toLocaleTimeString() : "Pending"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{k}</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 12, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </Card>

              <button onClick={handleInjectP1} disabled={injecting}
                style={{
                  background: injecting ? "#5a1a1a" : "#8B1A1A",
                  color: "#EDF3EF",
                  padding: "10px 14px",
                  border: `1px solid ${injecting ? "#3a0a0a" : "#CC3333"}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: injecting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.2s",
                }}>
                {injecting ? "Injecting..." : "Inject P1 Defect"}
              </button>
            </div>
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
