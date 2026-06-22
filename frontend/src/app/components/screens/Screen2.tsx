import { useEffect, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { AppHeader } from "../shared/AppHeader";
import { Sidebar } from "../shared/Sidebar";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { SourceBadge } from "../shared/SourceBadge";
import { StatusPill } from "../shared/StatusPill";
import { SparkleIcon } from "../shared/SparkleIcon";
import { AIRationale } from "../shared/AIRationale";
import { getTasks, Task, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BORDER = "#232B26";
const BG = "#0E1411";
const CARD_BG = "#161D19";

export function Screen2() {
  const [expanded, setExpanded] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "tasks_updated") {
      setTasks(event.data as Task[]);
    }
  }, []);

  useWebSocket(handleWsEvent);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>All Tasks</h2>
              <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
                {loading ? "Loading..." : `${tasks.length} tasks across sources`}
              </p>
            </div>
          </div>

          {!loading && tasks.length === 0 && (
            <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 13, padding: 60 }}>
              <p>No tasks found. Connect your sources and run the pipeline to populate your task list.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map((task: any) => (
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
                        <SparkleIcon size={10} /> merged from {[...new Set(task.merged_sources ?? [])].join(", ") || task.source_type}
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
