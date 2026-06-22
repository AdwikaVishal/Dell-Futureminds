import { useEffect, useState, useCallback, useMemo } from "react";
import { Zap, TrendingUp, AlertTriangle, Search, CheckCircle, Filter, Download, RefreshCw, ArrowUpRight, Layers, BarChart3, Clock, Sparkles, Target } from "lucide-react";
import { Card } from "../shared/Card";
import { PriorityCard } from "../shared/PriorityCard";
import { getPlan, getDashboard, LeverageTask, RankedTask, DeferredTask, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P0: { bg: "#FFEBEE", text: "#C62828", label: "Critical" },
  P1: { bg: "#FFF8E1", text: "#F57F17", label: "High" },
  P2: { bg: "#E8F5E9", text: "#2E7D32", label: "Medium" },
  P3: { bg: "var(--bg-primary)", text: "var(--text-secondary)", label: "Low" },
};

const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];

function LeverageCard({ task }: { task: LeverageTask }) {
  const totalBlocked = (task.blocks_directly || 0) + (task.blocks_transitively || 0);
  return (
    <div style={{
      padding: "12px 14px", background: "var(--bg-primary)", borderRadius: 14,
      border: "1px solid var(--border-default)", display: "flex",
      justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <ArrowUpRight size={11} color="#2E7D32" />
          Unblocks <strong>{task.blocks_directly}</strong> directly · <strong>{task.blocks_transitively}</strong> transitively
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
          💡 Unblocking this unblocks {totalBlocked} task{totalBlocked !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{
        background: "#BFD78D", padding: "4px 12px", borderRadius: 8,
        fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
        marginLeft: 12, flexShrink: 0,
      }}>
        L{task.leverage_score.toFixed(1)}
      </div>
    </div>
  );
}

function DeferredCard({ task }: { task: DeferredTask }) {
  return (
    <div style={{
      padding: "12px 14px", background: "#FFF8E1", borderRadius: 14,
      border: "1px solid #F5D66E",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, flex: 1 }}>{task.title}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
          background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 6, color: "var(--text-secondary)",
        }}>
          {task.appeared_in_last_n_runs} runs
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
        ⏳ {task.reason}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
        {task.priority && (
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            padding: "1px 8px", borderRadius: 6,
            background: task.priority === "P0" ? "#FFEBEE" : task.priority === "P1" ? "#FFF8E1" : task.priority === "P2" ? "#E8F5E9" : "var(--bg-primary)",
            color: task.priority === "P0" ? "#C62828" : task.priority === "P1" ? "#F57F17" : task.priority === "P2" ? "#2E7D32" : "var(--text-secondary)",
          }}>
            {task.priority}
          </span>
        )}
        {task.source_type && (
          <span style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            padding: "1px 8px", borderRadius: 6, background: "#E8F0FE", color: "#4A9EFF",
          }}>
            {task.source_type}
          </span>
        )}
        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
          📌 Action: Follow up on this task
        </span>
      </div>
    </div>
  );
}

export function Priorities() {
  const [ranked, setRanked] = useState<RankedTask[]>([]);
  const [leverage, setLeverage] = useState<LeverageTask[]>([]);
  const [deferred, setDeferred] = useState<DeferredTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePriorityFilter, setActivePriorityFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");

  const fetchData = () => {
    Promise.all([
      getPlan().catch(() => null),
      getDashboard().catch(() => null),
    ]).then(([plan, db]) => {
      const r = plan?.ranked_tasks ?? db?.plan?.ranked_tasks ?? [];
      const l = db?.dependency_analysis?.highest_leverage_tasks ?? plan?.highest_leverage_tasks ?? [];
      const d = plan?.deferred_tasks_detected ?? db?.deferred_tasks ?? [];
      setRanked(r);
      setLeverage(l);
      setDeferred(d);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "plan_updated" || event.event === "priorities_updated") {
      const p = event.data as any;
      if (p?.ranked_tasks) setRanked(p.ranked_tasks);
    }
  }, []);

  useWebSocket(handleWsEvent);

  const avgScore = ranked.length > 0
    ? ranked.reduce((sum, t) => sum + (t.score || 0), 0) / ranked.length
    : 0;

  const avgLeverage = leverage.length > 0
    ? leverage.reduce((sum, t) => sum + (t.leverage_score || 0), 0) / leverage.length
    : 0;

  const totalBlockedByLeverage = leverage.reduce((sum, t) => sum + (t.blocks_directly || 0) + (t.blocks_transitively || 0), 0);

  const priorityGroups = useMemo(() => {
    const groups: Record<string, RankedTask[]> = { P0: [], P1: [], P2: [], P3: [] };
    ranked.forEach(t => {
      const p = t.priority || "P3";
      if (groups[p]) groups[p].push(t);
      else groups["P3"].push(t);
    });
    return groups;
  }, [ranked]);

  const priorityDistribution = useMemo(() => {
    const total = ranked.length || 1;
    return PRIORITY_ORDER.map(p => ({
      priority: p,
      count: priorityGroups[p]?.length || 0,
      pct: Math.round(((priorityGroups[p]?.length || 0) / total) * 100),
      ...PRIORITY_COLORS[p],
    }));
  }, [priorityGroups]);

  const filteredRanked = useMemo(() => {
    let result = ranked;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(q));
    }
    if (activePriorityFilter) {
      result = result.filter(t => (t.priority || "P3") === activePriorityFilter);
    }
    return result;
  }, [ranked, searchQuery, activePriorityFilter]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={22} /> Priorities
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={22} /> Priority Command Center
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
            {ranked.length} ranked · {leverage.length} leverage · {deferred.length} deferred · {priorityGroups.P0?.length || 0} critical
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchData} style={{
            background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none",
            padding: "10px 20px", borderRadius: 12, fontSize: 12,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <Card variant="blue" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Ranked</span>
            <BarChart3 size={14} color="var(--text-secondary)" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>{ranked.length}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{leverage.length} leverage · {deferred.length} deferred</span>
        </Card>

        <Card variant="green" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Leverage</span>
            <ArrowUpRight size={14} color="#2E7D32" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>{leverage.length}</span>
            {leverage.length > 0 && (
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                avg L{avgLeverage.toFixed(1)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Unblocks {totalBlockedByLeverage} task{totalBlockedByLeverage !== 1 ? "s" : ""}
          </span>
        </Card>

        <Card variant="yellow" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Deferred</span>
            <Clock size={14} color="#F57F17" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>{deferred.length}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Postponed tasks</span>
        </Card>

        <Card variant="pink" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Critical</span>
            <AlertTriangle size={14} color="#C62828" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>{priorityGroups.P0?.length || 0}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Requires immediate attention</span>
        </Card>

        <Card variant="purple" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg Score</span>
            <Target size={14} color="var(--text-secondary)" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>
            {avgScore > 0 ? avgScore.toFixed(0) : "-"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {avgScore > 0 ? `Across ${ranked.length} ranked tasks` : "No ranked tasks"}
          </span>
        </Card>
      </div>

      {/* Priority Distribution Bar */}
      <Card shadow>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Layers size={14} />
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Priority Distribution</span>
        </div>
        <div style={{ display: "flex", gap: 6, height: 32, marginBottom: 10 }}>
          {priorityDistribution.map(({ priority, count, pct, bg }) => (
            <div key={priority} style={{
              flex: count || 0.01, minWidth: count > 0 ? `${pct}%` : 0,
              background: bg, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              position: "relative", transition: "all 0.3s",
            }}>
              {count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#111", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {priority} ({count})
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
          {priorityDistribution.map(({ priority, count, pct, label }) => (
            <span key={priority} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: PRIORITY_COLORS[priority].bg, display: "inline-block" }} />
              {label}: <strong style={{ color: "var(--text-primary)" }}>{count}</strong> ({pct}%)
            </span>
          ))}
        </div>
      </Card>

      {/* Leverage & Deferred Side by Side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card variant="green" shadow>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <TrendingUp size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Highest Leverage Tasks</span>
            {leverage.length > 0 && (
              <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 10 }}>
                {leverage.length}
              </span>
            )}
          </div>
          {leverage.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {leverage.slice(0, 10).map((lt: LeverageTask) => (
                <LeverageCard key={lt.task_id} task={lt} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12, padding: "8px 0" }}>
              <TrendingUp size={14} />
              <span>Run a pipeline analysis to identify highest-leverage tasks.</span>
            </div>
          )}
        </Card>

        <Card variant="yellow" shadow>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <AlertTriangle size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Deferred Tasks</span>
            {deferred.length > 0 && (
              <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 10 }}>
                {deferred.length}
              </span>
            )}
          </div>
          {deferred.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {deferred.slice(0, 10).map((dt: DeferredTask) => (
                <DeferredCard key={dt.task_id} task={dt} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12, padding: "8px 0" }}>
              <CheckCircle size={14} color="#BFD78D" />
              <span>All clear — no deferred tasks detected.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Ranked Tasks with Groups */}
      <Card shadow>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Ranked Tasks</span>
            <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 10 }}>
              {filteredRanked.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {PRIORITY_ORDER.map(p => (
                <button key={p} onClick={() => setActivePriorityFilter(activePriorityFilter === p ? null : p)}
                  style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", border: "none",
                    background: activePriorityFilter === p ? PRIORITY_COLORS[p].bg : "var(--bg-primary)",
                    color: activePriorityFilter === p ? PRIORITY_COLORS[p].text : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elevated)", borderRadius: 10, padding: "6px 12px", border: "1px solid var(--border-default)" }}>
              <Search size={13} color="var(--text-muted)" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 12, color: "var(--text-primary)", width: 160, fontFamily: "'IBM Plex Mono', monospace" }} />
            </div>
          </div>
        </div>

        {/* Grouped by Priority */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PRIORITY_ORDER.map(p => {
            const tasks = activePriorityFilter && activePriorityFilter !== p
              ? []
              : searchQuery.trim()
                ? filteredRanked.filter(t => (t.priority || "P3") === p)
                : priorityGroups[p] || [];
            if (tasks.length === 0 && !activePriorityFilter) return null;
            if (tasks.length === 0) return null;
            const cfg = PRIORITY_COLORS[p];
            return (
              <div key={p}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                  padding: "6px 10px", background: cfg.bg, borderRadius: 8,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                    color: cfg.text, padding: "1px 6px", borderRadius: 4,
                    background: cfg.text + "15",
                  }}>
                    {p}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cfg.text }}>{cfg.label}</span>
                  <span style={{
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)",
                    background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 6,
                  }}>
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tasks.map((task) => (
                    <PriorityCard key={task.id} task={task} rank={ranked.indexOf(task) + 1} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredRanked.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", textAlign: "center", padding: 20 }}>
            {searchQuery.trim()
              ? `No tasks matching "${searchQuery}".`
              : "Run a pipeline analysis to generate ranked priorities."}
          </div>
        )}
      </Card>
    </div>
  );
}
