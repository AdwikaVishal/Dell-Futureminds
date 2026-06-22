import { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  Position,
  MarkerType,
  Handle,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { PriorityPill } from "./PriorityPill";
import { StatusPill } from "./StatusPill";

const SOURCE_BG: Record<string, string> = {
  jira: "#F7C5E6",
  defect: "#F7C5E6",
  email: "#C9D8FF",
  github: "#DCC7F7",
  slack: "#F5D66E",
  transcript: "#BFD78D",
};

const SOURCE_LABELS: Record<string, string> = {
  jira: "Jira",
  defect: "Defect",
  email: "Email",
  github: "GitHub",
  slack: "Slack",
  transcript: "Transcript",
};

function TaskNode({ data }: NodeProps) {
  const getNodeBg = (status: string, priority: string) => {
    if (status === "blocked") return "#F7C5E6";
    if (status === "done") return "#BFD78D";
    if (priority === "P0" || priority === "P1") return "#FAD6B3";
    return "#C9D8FF";
  };

  const getBorderColor = (status: string, priority: string) => {
    if (status === "blocked") return "#DC2626";
    if (status === "done") return "#16A34A";
    if (priority === "P0" || priority === "P1") return "var(--blue-primary)";
    return "var(--text-secondary)";
  };

  return (
    <div
      style={{
        background: getNodeBg(data.status, data.priority),
        border: `2px solid ${getBorderColor(data.status, data.priority)}`,
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 140,
        maxWidth: 200,
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0.6 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span
          style={{
            background: SOURCE_BG[data.source_type] || "var(--border-default)",
            color: "#0D0D0D",
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 6,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {SOURCE_LABELS[data.source_type] || data.source_type}
        </span>
        <PriorityPill level={data.priority as any} />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "'Space Grotesk', sans-serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={data.label}
      >
        {data.label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <StatusPill status={data.status} />
        {data.is_blocked && (
          <span style={{ fontSize: 10, color: "#DC2626", fontFamily: "'IBM Plex Mono', monospace" }}>
            Blocked
          </span>
        )}
        {data.is_blocking && data.blocking_count > 0 && (
          <span style={{ fontSize: 10, color: "var(--blue-primary)", fontFamily: "'IBM Plex Mono', monospace" }}>
            Blocks {data.blocking_count}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0.6 }} />
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

export function DependencyGraph({
  nodes: externalNodes,
  edges: externalEdges,
  onNodeClick,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges);

  useMemo(() => {
    setNodes(externalNodes);
    setEdges(externalEdges);
  }, [externalNodes, externalEdges, setNodes, setEdges]);

  const hasDeps = edges.length > 0;

  return (
    <div>
      {hasDeps ? (
        <div
          style={{
            width: "100%",
            height: 500,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--border-default)",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.3}
            maxZoom={2}
            style={{ background: "var(--bg-secondary)" }}
          >
            <Background color="var(--border-default)" gap={16} size={1} />
            <Controls
              position="bottom-left"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
              }}
            />
            <MiniMap
              position="bottom-right"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
              }}
              nodeColor={(node) => {
                const d = node.data || {};
                if (d.status === "blocked") return "#F7C5E6";
                if (d.status === "done") return "#BFD78D";
                if (d.priority === "P0" || d.priority === "P1") return "#FAD6B3";
                return "#C9D8FF";
              }}
            />
            <Panel
              position="top-right"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 3,
                      background: "var(--blue-primary)",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                    Blocks
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 3,
                      background: "var(--text-secondary)",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                    Depends on
                  </span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      ) : (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
            border: "1px solid var(--border-default)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
          <p style={{ margin: 0 }}>No dependency relationships found</p>
          <p style={{ margin: "4px 0 0", fontSize: 11 }}>
            Tasks with <code style={{ background: "var(--bg-primary)", padding: "2px 6px", borderRadius: 4 }}>dependencies</code>{" "}
            or <code style={{ background: "var(--bg-primary)", padding: "2px 6px", borderRadius: 4 }}>blocks</code> fields will
            appear here
          </p>
        </div>
      )}
    </div>
  );
}
