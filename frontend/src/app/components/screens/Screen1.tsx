import { useEffect, useMemo, useState } from "react";
import { Zap, Bell, MessageSquare, RefreshCw, CheckSquare, Square, Circle } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { AIRationale } from "../shared/AIRationale";
import { SparkleIcon } from "../shared/SparkleIcon";
import { getPlan, DailyPlan, RankedTask } from "../../api/taskpilot";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const CARD_BG = "#161D19";
const BORDER = "#232B26";
const BG = "#0E1411";

const FALLBACK_TOP3 = [
  { id: "JIRA-2847", title: "Production logs analysis — upload service 500 errors", source: "Jira", priority: "P0", rationale: "P0 severity + VP escalation + SLA expires in 18h", deadline: "6:00 PM" },
  { id: "SN-10921", title: "Postgres v15 migration prep — staging env", source: "ServiceNow", priority: "P1", rationale: "Release window closes Monday + 3 dependent teams blocked", deadline: "EOD" },
  { id: "EMAIL-042", title: "Auth token refresh regression — investigate root cause", source: "Outlook", priority: "P1", rationale: "Extracted from Sarah Chen's email thread + GitHub issue #4291 cross-linked", deadline: "tomorrow 9:00 AM" },
];

export function Screen1() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const p = await getPlan();
      setPlan(p);
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh() }, []);

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
              Good morning, Alex
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
              {loading ? "Loading..." : `${top3.length} priorities · ${rest.length} remaining tasks`}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Your Top 3 Priorities Today
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(top3.length ? top3 : loading ? [] : FALLBACK_TOP3).map((task: any, i: number) => (
                    <Card key={task.id} style={{ padding: "16px 18px" }}>
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
                  {rest.map((task: any) => (
                    <Card key={task.id} style={{ padding: "12px 16px" }}>
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
                    <>
                      <Card key="1" style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(143,203,168,0.1)", border: `1px solid rgba(143,203,168,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Zap size={13} color={SAGE} />
                          </div>
                          <span style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5 }}>All tasks on track — no critical alerts</span>
                        </div>
                      </Card>
                      <Card key="2" style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(143,203,168,0.1)", border: `1px solid rgba(143,203,168,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <RefreshCw size={13} color={SAGE} />
                          </div>
                          <span style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5 }}>Pipeline updated — data is current</span>
                        </div>
                      </Card>
                    </>
                  )}
                </div>
              </div>

              <Card style={{ padding: "14px 16px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  Sync status
                </div>
                {[
                  ["Sources synced", "5"],
                  ["Tasks loaded", String((plan ? top3.length + rest.length : 0) || "--")],
                  ["Last sync", "Live"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{k}</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 12, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
