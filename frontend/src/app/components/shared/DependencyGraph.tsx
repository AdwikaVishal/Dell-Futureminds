import { useEffect, useState } from "react";
import ReactFlow, { Node, Edge, Background, Controls, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

const TEXT_PRIMARY = "#EDF3EF";
const TEXT_MUTED = "#8B9890";
const SAGE = "#8FCBA8";
const BORDER = "#232B26";

const SOURCE_COLORS: Record<string, string> = {
  jira: "#1a3a4a",
  defect: "#3a1a1a",
  email: "#1a2a3a",
  github: "#1a1a2a",
  slack: "#2a1a2a",
  transcript: "#1a2a1a",
};

export function DependencyGraph({ tasks }: { tasks: any[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Always reset so we don't keep stale empty graph after state updates.
    setNodes([]);
    setEdges([]);

    if (!tasks?.length) return;


    const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
    const newNodes: Node[] = [];
    const edgeSet = new Set<string>();
    const newEdges: Edge[] = [];

    tasks.forEach((task, i) => {
      const label = task.title?.length > 25 ? task.title.slice(0, 22) + "..." : task.title || task.id;
      newNodes.push({
        id: task.id,
        data: { label },
        position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 110 },
        style: {
          background: SOURCE_COLORS[task.source_type] || "#1a1a1a",
          color: TEXT_PRIMARY,
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          fontSize: 11,
          fontFamily: "monospace",
          maxWidth: 180,
        },
      });

      (task.dependencies || []).forEach((depId: string) => {
        if (taskMap[depId]) {
          const key = `${depId}->${task.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            newEdges.push({
              id: key,
              source: depId,
              target: task.id,
              type: "smoothstep",
              animated: true,
              style: { stroke: "#ff6b6b", strokeWidth: 1.5 },
            });
          }
        }
      });

      (task.blocks || []).forEach((blockedId: string) => {
        if (taskMap[blockedId]) {
          const key = `${task.id}->${blockedId}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            newEdges.push({
              id: key,
              source: task.id,
              target: blockedId,
              type: "smoothstep",
              animated: true,
              style: { stroke: SAGE, strokeWidth: 1.5 },
            });
          }
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [tasks, setNodes, setEdges]);

  const hasDeps = edges.length > 0;

  return (
    <div style={{ background: "#0A100D", border: `1px solid ${BORDER}`, borderRadius: 11, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600 }}>Dependency Graph</div>
        <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>
          {hasDeps
            ? `Red arrows = depends on · Green arrows = blocks · ${nodes.length} nodes, ${edges.length} edges`
            : "No dependencies found between tasks"}
        </div>
      </div>
      {hasDeps ? (
        <div style={{ width: "100%", height: 350 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.3}
            maxZoom={2}
            style={{ background: "#0A100D" }}
          >
            <Background color="#1a231e" gap={16} />
            <Controls style={{ background: "#161D19", border: `1px solid ${BORDER}`, button: { background: "#161D19", color: TEXT_MUTED, border: "none" } }} />
          </ReactFlow>
        </div>
      ) : (
        <div style={{ padding: "40px 18px", textAlign: "center", color: TEXT_MUTED, fontSize: 12 }}>
          No dependency relationships found. Tasks with <code>dependencies</code> or <code>blocks</code> fields will appear here.
        </div>
      )}
    </div>
  );
}
