import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, X, Calendar, User, Tag, FileText, GitMerge, Target, BarChart3, Code, MessageSquare, Mail } from "lucide-react";
import { useSearchParams } from "react-router";
import { Card } from "../shared/Card";
import { SourceBadge } from "../shared/SourceBadge";
import { PriorityPill } from "../shared/PriorityPill";
import { StatusToggle } from "../shared/StatusToggle";
import { SparkleIcon } from "../shared/SparkleIcon";
import { TaskCard } from "../shared/TaskCard";
import { CreateTaskModal } from "../shared/CreateTaskModal";
import { getTasks, updateTask, Task, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const FILTERS = ["All", "jira", "github", "slack", "outlook", "meetings"];

const sourceIcons: Record<string, typeof Code> = {
  jira: Code, github: Code, slack: MessageSquare, outlook: Mail, meetings: Calendar,
};

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <Icon size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
      <span style={{ color: "var(--text-secondary)", fontSize: 12, minWidth: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export function Inbox() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "tasks_updated") {
      setTasks(Array.isArray(event.data) ? event.data as Task[] : []);
    }
  }, []);

  useWebSocket(handleWsEvent);

  useEffect(() => {
    getTasks()
      .then(r => setTasks(Array.isArray(r.tasks) ? r.tasks : []))
      .catch((err) => { console.error("Failed to load tasks:", err); setTasks([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = tasks;
    if (activeFilter !== "All") {
      result = result.filter(t => (t.source || t.source_type || "").toLowerCase() === activeFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q) || t.source?.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, activeFilter, searchQuery]);

  const hiddenCount = tasks.filter(t => t.confidence != null && t.confidence >= 0.7).length;

  const SourceIcon = selectedTask ? sourceIcons[selectedTask.source_type] || FileText : FileText;

  return (
    <div style={{ display: "flex", gap: 16, position: "relative", minHeight: "calc(100vh - 120px)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Unified Inbox</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {loading ? "Loading..." : `${tasks.length} tasks across all sources`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elevated)", borderRadius: 12, padding: "8px 14px", border: "1px solid var(--border-default)", maxWidth: 360 }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 13, color: "var(--text-primary)" }}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)}
                style={{
                  background: activeFilter === f ? "#0D0D0D" : "transparent",
                  color: activeFilter === f ? "#FFFFFF" : "var(--text-secondary)",
                  border: activeFilter === f ? "none" : "1px solid var(--border-default)",
                  padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.15s",
                }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <CreateTaskModal onCreated={() => getTasks().then(r => setTasks(r.tasks)).catch(() => {})} />
        </div>

        {hiddenCount > 0 && (
          <Card variant="purple" shadow>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <SparkleIcon size={14} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>AI Insight</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {hiddenCount} high-confidence task{hiddenCount > 1 ? "s" : ""} found from recent sources.{" "}
              <a href="/hidden" style={{ color: "#0D0D0D", fontWeight: 500 }}>View hidden tasks →</a>
            </span>
          </Card>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40, fontSize: 13 }}>
            {searchQuery.trim() ? `No tasks matching "${searchQuery}".` : "No tasks found for this filter."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((task: any) => (
            <TaskCard key={task.id} task={task as Task} onClick={() => setSelectedTask(task as Task)}
              onUpdate={() => getTasks().then(r => setTasks(r.tasks)).catch(() => {})} />
          ))}
        </div>
      </div>

      {selectedTask && (
        <>
          <div onClick={() => setSelectedTask(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }} />
          <div style={{
            width: 420, flexShrink: 0, position: "sticky", top: 0, alignSelf: "flex-start", zIndex: 50,
            background: "var(--bg-elevated)", borderRadius: 20, border: "1px solid var(--border-default)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
            display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 100px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SourceIcon size={16} color="#0D0D0D" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Task Details</span>
              </div>
              <button onClick={() => setSelectedTask(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", overflow: "auto", flex: 1 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{selectedTask.title}</h3>

              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <SourceBadge source={selectedTask.source || selectedTask.source_type} />
                <PriorityPill level={(selectedTask.priority ?? "P3") as any} />
                {selectedTask.confidence != null && (
                  <span style={{
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: selectedTask.confidence >= 0.7 ? "#E8F5E9" : selectedTask.confidence >= 0.4 ? "#FFF8E1" : "#FFEBEE",
                    color: selectedTask.confidence >= 0.7 ? "#2E7D32" : selectedTask.confidence >= 0.4 ? "#F57F17" : "#C62828",
                  }}>
                    {Math.round(selectedTask.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              <div style={{ background: "var(--bg-primary)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <StatusToggle taskId={selectedTask.id} currentStatus={selectedTask.status || "open"}
                  onStatusChange={async (_id, newStatus) => { await updateTask(selectedTask.id, { status: newStatus as any }); getTasks().then(r => setTasks(r.tasks)).catch(() => {}); }} size="md" />
              </div>

              {selectedTask.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <FileText size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{selectedTask.description}</p>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginBottom: 16 }}>
                <DetailRow icon={Tag} label="Task ID" value={selectedTask.id} />
                <DetailRow icon={User} label="Owner" value={selectedTask.owner || "Unassigned"} />
                <DetailRow icon={Calendar} label="Deadline" value={selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "No deadline"} />
                <DetailRow icon={Target} label="Source" value={`${selectedTask.source_type}${selectedTask.source ? ` (${selectedTask.source})` : ""}`} />
                {selectedTask.grounded && (
                  <DetailRow icon={BarChart3} label="Grounded" value={selectedTask.grounding_confidence != null ? `${Math.round(selectedTask.grounding_confidence * 100)}%` : "Yes"} />
                )}
              </div>

              {selectedTask.merged_from && selectedTask.merged_from.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <GitMerge size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Merged From</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {selectedTask.merged_from.map((id, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#555", fontFamily: "'IBM Plex Mono', monospace", padding: "4px 8px", background: "var(--bg-primary)", borderRadius: 8 }}>
                        {id}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.raw_text && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <FileText size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Raw Text</span>
                  </div>
                  <div style={{
                    background: "var(--bg-primary)", borderRadius: 12, padding: 12, fontSize: 12,
                    color: "#555", maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap",
                    fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5,
                  }}>
                    {selectedTask.raw_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
