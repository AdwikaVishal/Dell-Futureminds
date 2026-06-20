import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { StatusPill } from "../shared/StatusPill";
import { SparkleIcon } from "../shared/SparkleIcon";
import { AIRationale } from "../shared/AIRationale";
import { getTasks, Task } from "../../api/taskpilot";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BORDER = "#232B26";
const BG = "#0E1411";
const CARD_BG = "#161D19";

const FALLBACK_TASKS = [
  { id: "JIRA-2847", title: "Production logs analysis — upload service 500 errors", source: "Jira", priority: "P0", deadline: "Jun 19, 6:00 PM", status: "In Progress", merged: true },
  { id: "SN-10921", title: "Postgres v15 migration prep", source: "ServiceNow", priority: "P1", deadline: "Jun 19, EOD", status: "Not started", merged: false },
  { id: "EMAIL-042", title: "Auth token refresh regression", source: "Outlook", priority: "P1", deadline: "Jun 20, 9:00 AM", status: "Not started", merged: true },
  { id: "GH-491", title: "Update API rate limit docs", source: "GitHub", priority: "P2", deadline: "Jun 19, 3:00 PM", status: "Done", merged: false },
  { id: "SL-08", title: "Respond to #platform-ops thread on cache config", source: "Slack", priority: "P2", deadline: "Jun 19, 5:30 PM", status: "Not started", merged: true },
];

export function Screen2() {
  const [expanded, setExpanded] = useState("JIRA-2847");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks().then(setTasks).catch(() => setTasks(FALLBACK_TASKS)).finally(() => setLoading(false));
  }, []);

  const displayTasks = tasks.length > 0 ? tasks : FALLBACK_TASKS;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>All Tasks</h2>
              <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>{displayTasks.length} tasks across sources</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Source", "Priority", "Deadline", "Status"].map((f) => (
                <button key={f} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "6px 14px", color: TEXT_MUTED, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  {f} <ChevronDown size={11} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {displayTasks.map((task: any) => (
              <div key={task.id}>
                <Card style={{ cursor: "pointer", padding: "13px 16px" }}>
                  <div onClick={() => setExpanded(expanded === task.id ? "" : task.id)} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ChevronDown size={13} color={TEXT_MUTED}
                      style={{ transform: expanded === task.id ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", flexShrink: 0 }} />
                    <span style={{ color: TEXT_MUTED, fontSize: 11, fontFamily: "monospace", minWidth: 72 }}>{task.id}</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 13, flex: 1 }}>{task.title}</span>
                    <SourceBadge source={task.source || task.source_type} />
                    <PriorityPill level={(task.priority ?? "P3") as any} />
                    <span style={{ color: TEXT_MUTED, fontSize: 12, minWidth: 110 }}>{task.deadline || ""}</span>
                    <StatusPill status={task.status || "open"} />
                    {(task.merged_sources?.length > 0 || task.merged_from?.length > 0) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(143,203,168,0.08)", color: SAGE, fontSize: 11, padding: "2px 8px", borderRadius: 20, border: `1px solid rgba(143,203,168,0.18)`, whiteSpace: "nowrap" }}>
                        <SparkleIcon size={10} /> merged from sources
                      </span>
                    )}
                  </div>
                  {expanded === task.id && (
                    <div style={{ marginTop: 12 }}>
                      <AIRationale text={`Task ${task.id}: ${task.title}. Source: ${task.source || task.source_type}. Priority: ${task.priority || "unset"}.`} />
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
