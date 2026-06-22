import { useEffect, useState, useCallback, useMemo } from "react";
import {
  GitBranch,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Card } from "../shared/Card";
import { PriorityPill } from "../shared/PriorityPill";
import { StatusPill } from "../shared/StatusPill";
import { DependencyGraph } from "../shared/DependencyGraph";
import type { Node, Edge } from "reactflow";
import { MarkerType } from "reactflow";
import {
  getDependencyInsights,
  DependencyInsights,
  WebSocketEvent,
} from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";

const edgeColors: Record<string, string> = {
  blocks: "var(--blue-primary)",
  depends_on: "var(--text-secondary)",
};

export function Dependencies() {
  const [insights, setInsights] = useState<DependencyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDependencyInsights();
      setInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWsEvent = useCallback(
    (event: WebSocketEvent) => {
      if (event.event === "plan_updated") fetchData();
    },
    [fetchData]
  );

  useWebSocket(handleWsEvent);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !insights) return null;
    return insights.tasks.find((t) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, insights]);

  const completedCount = useMemo(
    () => insights?.tasks.filter((t) => t.status === "done").length || 0,
    [insights]
  );

  const flowNodes: Node[] = useMemo(() => {
    if (!insights) return [];
    return insights.tasks.map((task, index) => ({
      id: task.id,
      type: "taskNode",
      position: {
        x: 220 * (index % 4) + 40,
        y: 160 * Math.floor(index / 4) + 40,
      },
      data: {
        label:
          task.title.length > 30
            ? task.title.slice(0, 27) + "..."
            : task.title || task.id,
        source_type: task.source_type,
        priority: task.priority,
        status: task.status,
        is_blocked: task.is_blocked,
        is_blocking: task.is_blocking,
        blocking_count: task.blocking_count,
      },
    }));
  }, [insights]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!insights) return [];
    return insights.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: edge.is_critical,
      style: {
        stroke: edgeColors[edge.type] || "var(--text-secondary)",
        strokeWidth: edge.is_critical ? 3 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColors[edge.type] || "var(--text-secondary)",
      },
      label: edge.type === "blocks" ? "Blocks" : "Depends on",
      labelStyle: {
        fontSize: 9,
        fill: "var(--text-secondary)",
        background: "var(--bg-secondary)",
        padding: "2px 6px",
        borderRadius: 6,
        border: "1px solid var(--border-default)",
      },
    }));
  }, [insights]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedTaskId(node.id);
  }, []);

  if (loading && !insights) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 384,
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
      >
        Loading dependency insights...
      </div>
    );
  }

  const summary = insights?.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <GitBranch size={20} /> Dependency Insights
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Understand task relationships and blockers
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>{summary?.total_tasks || 0} tasks</span>
            <span>{summary?.total_edges || 0} relationships</span>
            <span>{summary?.blockers_count || 0} blockers</span>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: "var(--bg-sidebar)",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 20px",
              borderRadius: 12,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: 8,
                background: "#C9D8FF",
                borderRadius: 10,
                display: "flex",
              }}
            >
              <GitBranch size={18} color="#0D0D0D" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {summary?.total_edges || 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Relationships</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: 8,
                background: "#F7C5E6",
                borderRadius: 10,
                display: "flex",
              }}
            >
              <AlertCircle size={18} color="#0D0D0D" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {summary?.blockers_count || 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Blockers</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: 8,
                background: "#F5D66E",
                borderRadius: 10,
                display: "flex",
              }}
            >
              <TrendingUp size={18} color="#0D0D0D" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {summary?.critical_path_length || 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Critical Path</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: 8,
                background: "#BFD78D",
                borderRadius: 10,
                display: "flex",
              }}
            >
              <CheckCircle size={18} color="#0D0D0D" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {completedCount}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Completed</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Layout: Graph + Sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        {/* Graph */}
        <Card style={{ padding: "16px 18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                Dependency Graph
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                {flowEdges.length > 0
                  ? `${flowEdges.length} relationships visualized`
                  : "No relationships found"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
                title="Fit View"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          <DependencyGraph
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={handleNodeClick}
          />
        </Card>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Blockers */}
          {insights?.blockers && insights.blockers.length > 0 && (
            <Card style={{ padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <AlertCircle size={14} color="#DC2626" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Top Blockers
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  ({insights.blockers.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insights.blockers.slice(0, 3).map((blocker) => (
                  <div
                    key={blocker.task_id}
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-primary)",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontFamily: "'Space Grotesk', sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 140,
                        }}
                        title={blocker.title}
                      >
                        {blocker.title}
                      </span>
                      <PriorityPill level={blocker.priority as any} />
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      <span>Blocks {blocker.blocks_directly} directly</span>
                      <span>{blocker.blocks_transitively} transitively</span>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        width: "100%",
                        height: 6,
                        background: "var(--border-default)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "var(--blue-primary)",
                          borderRadius: 3,
                          width: `${blocker.impact_percentage}%`,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 4,
                        fontSize: 10,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>Impact</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {blocker.impact_score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {insights?.recommendations && insights.recommendations.length > 0 && (
            <Card style={{ padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <CheckCircle size={14} color="#BFD78D" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Unblocking Strategy
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insights.recommendations.slice(0, 3).map((rec, index) => (
                  <div
                    key={rec.blocking_task_id}
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-primary)",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontFamily: "'Space Grotesk', sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 120,
                        }}
                        title={rec.blocking_task_title}
                      >
                        {index + 1}. {rec.blocking_task_title}
                      </span>
                      <PriorityPill level={rec.priority as any} />
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      <span>Unblocks {rec.total_blocked_count} tasks</span>
                      <span>·</span>
                      <span>{rec.effort_estimate}</span>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {rec.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Selected Task Detail */}
      {selectedTask && (
        <Card
          style={{
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                Task Details
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                {selectedTask.title}
              </p>
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <PriorityPill level={selectedTask.priority as any} />
            <StatusPill status={selectedTask.status} />
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {selectedTask.is_blocked
                ? `Blocked by ${selectedTask.blocked_by_count} tasks`
                : "Not blocked"}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {selectedTask.is_blocking
                ? `Blocks ${selectedTask.blocking_count} tasks`
                : "Does not block any task"}
            </span>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading &&
        !insights?.blockers?.length &&
        !insights?.recommendations?.length &&
        !insights?.tasks?.length && (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
              No dependency information available. Run the pipeline to analyze
              dependencies.
            </p>
          </Card>
        )}
    </div>
  );
}
