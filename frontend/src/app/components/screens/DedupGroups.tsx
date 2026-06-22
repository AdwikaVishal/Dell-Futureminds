import { useEffect, useMemo, useState } from "react";
import { GitMerge, Sparkles, RefreshCw, AlertCircle, CheckCircle, HelpCircle, Search, Check, X, Eye, Info, Layers, Percent, ArrowDown } from "lucide-react";
import { Card } from "../shared/Card";
import { SourceBadge } from "../shared/SourceBadge";
import { PriorityPill } from "../shared/PriorityPill";
import { StatusPill } from "../shared/StatusPill";
import { getDedupGroups, DedupGroup } from "../../api/taskpilot";
import { toast } from "sonner";

const CONFIDENCE_CUTOFFS = [
  { label: "High", min: 0.8, color: "#BFD78D", icon: CheckCircle },
  { label: "Medium", min: 0.5, color: "#F5D66E", icon: HelpCircle },
  { label: "Needs Review", min: 0, color: "#F7C5E6", icon: AlertCircle },
];

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const bg = pct >= 80 ? "#E8F5E9" : pct >= 50 ? "#FFF8E1" : "#FFEBEE";
  const fg = pct >= 80 ? "#2E7D32" : pct >= 50 ? "#F57F17" : "#C62828";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: bg, color: fg, fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <Percent size={11} /> {pct}%
    </span>
  );
}

function SubTaskRow({ task, isPrimary }: { task: DedupGroup["tasks"][number]; isPrimary?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 10,
      background: isPrimary ? "#F0F8FF" : "var(--bg-primary)",
      border: isPrimary ? "1px solid #BFD78D" : "1px solid var(--border-default)",
    }}>
      {isPrimary && (
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
          color: "#2E7D32", background: "#E8F5E9", padding: "1px 6px", borderRadius: 4,
        }}>
          Primary
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <SourceBadge source={task.source} />
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>{task.id}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>{task.title}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          {task.priority && <PriorityPill level={task.priority} />}
          <StatusPill status={task.status || "open"} />
          {task.owner && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{task.owner}</span>}
        </div>
      </div>
    </div>
  );
}

function MergedPreview({ tasks }: { tasks: DedupGroup["tasks"] }) {
  const primary = tasks[0];
  const secondary = tasks.slice(1);

  const mergedTitle = primary.title;
  const sourceTypes = [...new Set(tasks.map(t => t.source))];
  const priorities = [...new Set(tasks.filter(t => t.priority).map(t => t.priority))];
  const mergedPriority = priorities.includes("P0") ? "P0" : priorities.includes("P1") ? "P1" : priorities.includes("P2") ? "P2" : "P3";

  return (
    <div style={{
      background: "linear-gradient(135deg, #F0F8FF 0%, var(--bg-primary) 100%)",
      borderRadius: 14, padding: 18, border: "2px solid #BFD78D",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Layers size={14} color="#2E7D32" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32", fontFamily: "'Space Grotesk', sans-serif" }}>
          Merged Preview
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
          color: "#2E7D32", background: "#E8F5E9", padding: "2px 8px", borderRadius: 4, marginLeft: 4,
        }}>
          Consolidated
        </span>
      </div>

      <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 14, border: "1px solid var(--border-default)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            padding: "2px 8px", borderRadius: 4, background: "#BFD78D", color: "#111",
          }}>
            {mergedPriority}
          </span>
          {sourceTypes.map(src => <SourceBadge key={src} source={src} />)}
          <span style={{
            fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace",
            background: "var(--bg-primary)", padding: "1px 6px", borderRadius: 4,
          }}>
            {tasks.length} sources
          </span>
        </div>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {mergedTitle}
        </h4>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Source Contributions
          </div>
          {tasks.map((task, i) => (
            <div key={task.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              background: i === 0 ? "#F0F8FF" : "var(--bg-elevated)", borderRadius: 8,
              border: i === 0 ? "1px solid #BFD78D" : "1px solid var(--border-default)",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: i === 0 ? "#BFD78D" : "var(--border-default)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: i === 0 ? "#111" : "var(--text-secondary)",
                fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <SourceBadge source={task.source} />
              <span style={{ flex: 1, fontSize: 12, color: "#111", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
              </span>
              {i === 0 && (
                <span style={{ fontSize: 9, color: "#2E7D32", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--bg-primary)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: "#111" }}>Merge Result: </span>
          All {tasks.length} similar tasks will be consolidated into one. The primary task retains its original
          metadata while incorporating context from all sources. {secondary.length > 0 && `Secondary tasks (${secondary.map(t => t.id).join(", ")}) will be archived.`}
        </div>
      </div>
    </div>
  );
}

function ViewModal({ group, onClose, onApprove, onSplit }: {
  group: DedupGroup;
  onClose: () => void;
  onApprove: (g: DedupGroup) => void;
  onSplit: (g: DedupGroup) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const pct = Math.round(group.match_confidence * 100);
  const barColor = pct >= 80 ? "#2E7D32" : pct >= 50 ? "#F57F17" : "#C62828";
  const barBg = pct >= 80 ? "#E8F5E9" : pct >= 50 ? "#FFF8E1" : "#FFEBEE";

  const connectorStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "4px 0", color: "#C0B8B0", gap: 2,
  };

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    group.tasks.forEach(t => {
      counts[t.source] = (counts[t.source] || 0) + 1;
    });
    return Object.entries(counts);
  }, [group.tasks]);

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        backdropFilter: "blur(4px)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          width: "90%", maxWidth: 720, maxHeight: "90vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "all 0.2s ease",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border-default)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Layers size={18} color="#555" />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Merge Details</span>
          </div>
          <button onClick={handleClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, borderRadius: 8, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Merged Preview */}
          <MergedPreview tasks={group.tasks} />

          {/* Header Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <ConfidenceBadge value={group.match_confidence} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <Layers size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {group.merged_count} source{group.merged_count !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {[...new Set(group.tasks.map(t => t.source))].map(src => (
                <SourceBadge key={src} source={src} />
              ))}
            </div>
          </div>

          {/* Source Distribution */}
          {sourceBreakdown.length > 1 && (
            <div>
              <p style={{
                margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
                fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                Source Distribution
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sourceBreakdown.map(([src, count]) => (
                  <div key={src} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "var(--bg-primary)", borderRadius: 10, padding: "6px 12px",
                    border: "1px solid var(--border-default)",
                  }}>
                    <SourceBadge source={src} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          <div style={{
            background: "var(--bg-elevated)", borderRadius: 12, padding: 16,
            borderLeft: `4px solid ${barColor}`, fontSize: 13, color: "#555", lineHeight: 1.6,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 3, color: "var(--text-secondary)" }} />
              <p style={{ margin: 0 }}>{group.reasoning}</p>
            </div>
          </div>

          {/* Task Merge Flow */}
          <div>
            <p style={{
              margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
              fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              Task Merge Flow ({group.tasks.length} tasks)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <SubTaskRow task={group.tasks[0]} isPrimary />
              {group.tasks.slice(1).map((task, i) => (
                <div key={task.id}>
                  <div style={connectorStyle}>
                    <ArrowDown size={14} />
                    {i < group.tasks.slice(2).length && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 12, background: "#E0D8D0",
                      }} />
                    )}
                  </div>
                  <SubTaskRow task={task} />
                </div>
              ))}
            </div>
          </div>

          {/* Similarity Breakdown */}
          <div>
            <p style={{
              margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
              fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              Similarity Breakdown
            </p>
            <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#555" }}>Match Confidence</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: barColor,
                }}>
                  {pct}%
                </span>
              </div>
              <div style={{
                width: "100%", height: 10, borderRadius: 5, background: barBg, overflow: "hidden",
              }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 5,
                  background: barColor, transition: "width 0.6s ease",
                }} />
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                {pct >= 80
                  ? "High confidence: These tasks are very likely duplicates."
                  : pct >= 50
                    ? "Medium confidence: These tasks may be duplicates. Manual review recommended."
                    : "Low confidence: These tasks may not be duplicates. Review carefully before merging."}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
          padding: "16px 24px 20px", borderTop: "1px solid var(--border-default)",
        }}>
          <button onClick={() => { onApprove(group); handleClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#E8F5E9", color: "#2E7D32", border: "none",
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#C8E6C9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#E8F5E9")}
          >
            <Check size={14} /> Approve Merge
          </button>
          <button onClick={() => { onSplit(group); handleClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FFEBEE", color: "#C62828", border: "none",
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFCDD2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFEBEE")}
          >
            <X size={14} /> Split Tasks
          </button>
          <button onClick={handleClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--bg-primary)", color: "var(--text-secondary)", border: "none",
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border-default)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-primary)")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function DedupGroups() {
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterConfidence, setFilterConfidence] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewGroup, setViewGroup] = useState<DedupGroup | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getDedupGroups();
      setGroups(data.groups || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const categorized = useMemo(() => {
    return CONFIDENCE_CUTOFFS.map(({ label, min, color, icon: Icon }) => {
      const filtered = min === 0.8
        ? groups.filter(g => g.match_confidence >= 0.8)
        : min === 0.5
          ? groups.filter(g => g.match_confidence >= 0.5 && g.match_confidence < 0.8)
          : groups.filter(g => g.match_confidence < 0.5);
      return { label, min, color, icon: Icon, groups: filtered, count: filtered.length };
    });
  }, [groups]);

  const displayed = useMemo(() => {
    let result = groups;
    if (filterConfidence === "High") result = result.filter(g => g.match_confidence >= 0.8);
    else if (filterConfidence === "Medium") result = result.filter(g => g.match_confidence >= 0.5 && g.match_confidence < 0.8);
    else if (filterConfidence === "Needs Review") result = result.filter(g => g.match_confidence < 0.5);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(g =>
        g.tasks.some(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.source.toLowerCase().includes(q))
      );
    }
    return result;
  }, [groups, filterConfidence, searchQuery]);

  const totalMerged = groups.reduce((s, g) => s + g.merged_count, 0);
  const highCount = groups.filter(g => g.match_confidence >= 0.8).length;
  const reviewCount = groups.filter(g => g.match_confidence < 0.5).length;

  const groupKey = (g: DedupGroup) => g.id || g.tasks.map(t => t.id).join(",");

  const handleApprove = async (g: DedupGroup) => {
    toast.success(`Approved merge for ${g.merged_count} tasks`);
  };

  const handleSplit = async (g: DedupGroup) => {
    toast.success(`Split ${g.merged_count} tasks into individual items`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <GitMerge size={20} /> Dedup Groups
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {loading ? "Loading..." : `${groups.length} groups · ${totalMerged} merged tasks`}
          </p>
        </div>
        <button onClick={fetchData}
          style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 12, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Card variant="default" shadow>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Total Groups</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{groups.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{totalMerged} merged tasks</div>
        </Card>
        <Card variant="green" shadow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>High Confidence</div>
            <CheckCircle size={16} color="#BFD78D" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{highCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{highCount === 1 ? "1 group" : `${highCount} groups`}</div>
        </Card>
        <Card variant="yellow" shadow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Medium</div>
            <HelpCircle size={16} color="#F5D66E" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{groups.length - highCount - reviewCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>needs verification</div>
        </Card>
        <Card variant="pink" shadow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Needs Review</div>
            <AlertCircle size={16} color="#F7C5E6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{reviewCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{reviewCount === 1 ? "requires attention" : "require attention"}</div>
        </Card>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elevated)", borderRadius: 12, padding: "8px 14px", border: "1px solid var(--border-default)", flex: 1, maxWidth: 320 }}>
          <Search size={15} color="var(--text-muted)" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ID, or source..."
            style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 13, color: "var(--text-primary)" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ label: "All", value: null }, { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Needs Review", value: "Needs Review" }].map(({ label, value }) => (
            <button key={label} onClick={() => setFilterConfidence(value)}
              style={{
                background: filterConfidence === value ? "#0D0D0D" : "transparent",
                color: filterConfidence === value ? "#FFFFFF" : "var(--text-secondary)",
                border: filterConfidence === value ? "none" : "1px solid var(--border-default)",
                padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.15s",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40, fontSize: 13 }}>Loading dedup groups...</div>
      ) : displayed.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <Sparkles size={24} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>No deduplication groups found. Run the pipeline to detect cross-source duplicates.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CONFIDENCE_CUTOFFS.map(({ label, min, color, icon: Icon }) => {
            const categoryGroups = filterConfidence
              ? displayed.filter(g => {
                  if (label === "High") return g.match_confidence >= 0.8;
                  if (label === "Medium") return g.match_confidence >= 0.5 && g.match_confidence < 0.8;
                  return g.match_confidence < 0.5;
                })
              : displayed.filter(g => {
                  if (label === "High") return g.match_confidence >= 0.8;
                  if (label === "Medium") return g.match_confidence >= 0.5 && g.match_confidence < 0.8;
                  return g.match_confidence < 0.5;
                });
            if (categoryGroups.length === 0) return null;
            return (
              <div key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                  <Icon size={16} color={color} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
                  <span style={{
                    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)",
                    background: "var(--bg-primary)", padding: "1px 8px", borderRadius: 10,
                  }}>
                    {categoryGroups.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {categoryGroups.map((group) => {
                    const key = groupKey(group);
                    const uniqueSources = [...new Set(group.tasks.map(t => t.source))];
                    return (
                      <Card key={key} shadow variant={label === "High" ? "green" : label === "Medium" ? "yellow" : "pink"}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                              <ConfidenceBadge value={group.match_confidence} />
                              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                <Layers size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                                {group.merged_count} sources
                              </span>
                              <div style={{ display: "flex", gap: 3 }}>
                                {uniqueSources.map(src => <SourceBadge key={src} source={src} />)}
                              </div>
                            </div>
                            <SubTaskRow task={group.tasks[0]} isPrimary />
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0, flexDirection: "column" }}>
                            <button onClick={() => handleApprove(group)}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "#E8F5E9", color: "#2E7D32", border: "none",
                                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                              }}>
                              <Check size={12} /> Approve
                            </button>
                            <button onClick={() => handleSplit(group)}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "#FFEBEE", color: "#C62828", border: "none",
                                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                              }}>
                              <X size={12} /> Split
                            </button>
                            <button onClick={() => setViewGroup(group)}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "var(--bg-primary)", color: "var(--text-secondary)", border: "none",
                                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer",
                              }}>
                              <Eye size={12} /> View
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewGroup && (
        <ViewModal
          group={viewGroup}
          onClose={() => setViewGroup(null)}
          onApprove={handleApprove}
          onSplit={handleSplit}
        />
      )}
    </div>
  );
}
