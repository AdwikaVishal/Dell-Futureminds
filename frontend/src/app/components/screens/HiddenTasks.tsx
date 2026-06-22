import { useEffect, useState, useMemo } from "react";
import { Sparkles, RefreshCw, FileText, AlertCircle, CheckCircle, Plus, X, Pencil, Search, Mail, MessageSquare, Calendar, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../shared/Card";
import { getRecentExtractions, injectTask, convertHiddenTask, ExtractionItem } from "../../api/taskpilot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const SOURCE_ICONS: Record<string, string> = {
  email: "\uD83D\uDCE7",
  transcript: "\uD83D\uDCDD",
  slack: "\uD83D\uDCAC",
  meeting: "\uD83D\uDCC5",
  github: "\uD83D\uDCD8",
  jira: "\uD83D\uDCCB",
  default: "\uD83D\uDD17",
};

function getSourceIcon(source: string) {
  return SOURCE_ICONS[source.toLowerCase()] || SOURCE_ICONS.default;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (pct >= 80) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#BFD78D", color: "var(--text-primary)", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
        <CheckCircle size={10} /> High ({pct}%)
      </div>
    );
  }
  if (pct >= 60) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5D66E", color: "var(--text-primary)", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
        <AlertCircle size={10} /> Medium ({pct}%)
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F7C5E6", color: "var(--text-primary)", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
      <AlertCircle size={10} /> Low ({pct}%)
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#BFD78D" : pct >= 60 ? "#F5D66E" : "#F7C5E6";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--border-default)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
      <span style={{ color: "#0D0D0D", fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function ConvertDialog({ item, open, onOpenChange, onConverted }: { item: ExtractionItem; open: boolean; onOpenChange: (open: boolean) => void; onConverted: (id: string) => void }) {
  const [title, setTitle] = useState(item.title);
  const [priority, setPriority] = useState(item.priority || "P3");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setPriority(item.priority || "P3");
      setError("");
    }
  }, [open, item]);

  const handleConvert = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setConverting(true);
    setError("");
    try {
      await convertHiddenTask({
        task_id: item.task_id,
        title: title.trim(),
        priority: priority as any,
      });
      onConverted(item.task_id);
      onOpenChange(false);
    } catch (err) {
      setError("Failed to convert. Try again.");
      console.error(err);
    }
    finally { setConverting(false); }
  };

  const handleApproveDirect = async () => {
    setConverting(true);
    try {
      await injectTask({
        title: item.title,
        description: item.raw_text?.slice(0, 500),
        source_type: item.source_type || "email",
        priority: item.priority || undefined,
        deadline: item.deadline || undefined,
      });
      onConverted(item.task_id);
      onOpenChange(false);
    } catch (err) { console.error(err); }
    finally { setConverting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 20, maxWidth: 440, padding: 24 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16 }}>Convert to Task</DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Review and edit the task before adding it to your tracked tasks.
          </DialogDescription>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4, display: "block" }}>Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" style={{ borderRadius: 10, border: "1px solid var(--border-default)", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4, display: "block" }}>Priority</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["P1", "P2", "P3"].map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 10, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
                    background: priority === p ? (p === "P1" ? "#F7C5E6" : p === "P2" ? "#F5D66E" : "#BFD78D") : "transparent",
                    border: priority === p ? "none" : "1px solid var(--border-default)",
                    color: priority === p ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {item.raw_text && (
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4, display: "block" }}>Source Text</label>
              <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5, maxHeight: 80, overflow: "auto" }}>
                {item.raw_text.slice(0, 300)}
              </div>
            </div>
          )}
          {error && <div style={{ color: "#E86A6A", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
        </div>
        <DialogFooter style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Button variant="outline" onClick={() => onOpenChange(false)} style={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--border-default)" }}>
            Cancel
          </Button>
          <Button onClick={handleApproveDirect} disabled={converting} variant="secondary" style={{ borderRadius: 10, fontSize: 12, background: "#BFD78D", color: "var(--text-primary)", border: "none" }}>
            <CheckCircle size={12} /> {converting ? "Adding..." : "Quick Approve"}
          </Button>
          <Button onClick={handleConvert} disabled={converting} style={{ borderRadius: 10, fontSize: 12, background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none" }}>
            <Plus size={12} /> {converting ? "Converting..." : "Convert with Edits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HiddenTaskCard({ item, onApproved }: { item: ExtractionItem; onApproved: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await injectTask({
        title: item.title,
        description: item.raw_text?.slice(0, 500),
        source_type: item.source_type || "email",
        priority: item.priority || undefined,
        deadline: item.deadline || undefined,
      });
      onApproved(item.task_id);
    } catch (err) { console.error(err); }
    finally { setApproving(false); }
  };

  return (
    <Card variant="purple" shadow style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--bg-primary)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>
              {getSourceIcon(item.source_type)}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              From: {item.source || item.source_type}
            </span>
            <ConfidenceBadge value={item.confidence || 0} />
            {item.priority && (
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                padding: "1px 8px", borderRadius: 6,
                background: item.priority === "P0" ? "#FFEBEE" : item.priority === "P1" ? "#FFF8E1" : item.priority === "P2" ? "#E8F5E9" : "var(--bg-primary)",
                color: item.priority === "P0" ? "#C62828" : item.priority === "P1" ? "#F57F17" : item.priority === "P2" ? "#2E7D32" : "var(--text-secondary)",
              }}>
                {item.priority}
              </span>
            )}
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{item.task_id}</span>
            {item.deadline && (
              <span style={{ color: "var(--text-secondary)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                Due: {new Date(item.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
          <ConfidenceBar value={item.confidence || 0} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleApprove} disabled={approving}
          style={{ background: "#BFD78D", color: "#0D0D0D", border: "none", padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: approving ? "wait" : "pointer", fontFamily: "'IBM Plex Mono', monospace", opacity: approving ? 0.7 : 1 }}>
          <CheckCircle size={12} style={{ marginRight: 4, display: "inline" }} /> {approving ? "Approving..." : "Approve"}
        </button>
        <button onClick={() => setDialogOpen(true)}
          style={{ background: "#F7C5E6", color: "var(--text-primary)", border: "none", padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
          <Pencil size={12} style={{ marginRight: 4, display: "inline" }} /> Convert to Task
        </button>
        <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "1px solid var(--border-default)", padding: "6px 14px", borderRadius: 10, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
          {expanded ? <ChevronUp size={12} style={{ marginRight: 4, display: "inline" }} /> : <ChevronDown size={12} style={{ marginRight: 4, display: "inline" }} />}
          {expanded ? "Hide Source" : "View Source"}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border-default)", paddingTop: 12 }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6, maxHeight: 120, overflow: "auto" }}>
            {item.raw_text?.split("\n").slice(0, 10).map((l: string, i: number) => <div key={i}>{l || "\u00A0"}</div>)}
          </div>
        </div>
      )}
      <ConvertDialog item={item} open={dialogOpen} onOpenChange={setDialogOpen} onConverted={onApproved} />
    </Card>
  );
}

export function HiddenTasks() {
  const [extractions, setExtractions] = useState<ExtractionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecentExtractions();
      setExtractions(data.extractions || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproved = (taskId: string) => {
    setExtractions(prev => prev.filter(e => e.task_id !== taskId));
    setTotal(prev => Math.max(0, prev - 1));
  };

  const filteredExtractions = useMemo(() => {
    let result = extractions;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.raw_text?.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q)
      );
    }
    if (sourceFilter !== "all") {
      result = result.filter(e => e.source_type === sourceFilter);
    }
    if (confidenceFilter === "high") {
      result = result.filter(e => (e.confidence || 0) >= 0.8);
    } else if (confidenceFilter === "medium") {
      result = result.filter(e => (e.confidence || 0) >= 0.6 && (e.confidence || 0) < 0.8);
    } else if (confidenceFilter === "low") {
      result = result.filter(e => (e.confidence || 0) < 0.6);
    }
    return result;
  }, [extractions, searchQuery, sourceFilter, confidenceFilter]);

  const highConf = extractions.filter(e => (e.confidence || 0) >= 0.8).length;
  const mediumConf = extractions.filter(e => (e.confidence || 0) >= 0.6 && (e.confidence || 0) < 0.8).length;
  const lowConf = extractions.filter(e => (e.confidence || 0) < 0.6).length;

  const sourceOptions = useMemo(() => {
    const sources = new Set(extractions.map(e => e.source_type));
    return ["all", ...Array.from(sources)];
  }, [extractions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Sparkles size={20} /> Hidden Tasks Found
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            AI-extracted action items from emails, meetings, and unstructured sources
          </p>
        </div>
        <button onClick={fetchData} style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 12, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
        <Card variant="default" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>{total}</span>
        </Card>
        <Card variant="green" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>High</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{highConf}</span>
        </Card>
        <Card variant="yellow" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Medium</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{mediumConf}</span>
        </Card>
        <Card variant="pink" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Low</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{lowConf}</span>
        </Card>
        <Card variant="blue" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Approved</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{total - extractions.length}</span>
        </Card>
        <Card variant="purple" shadow style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>Pending</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{extractions.length}</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
        borderRadius: 16, padding: "12px 16px",
      }}>
        <Filter size={14} color="var(--text-secondary)" />
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)", borderRadius: 10, padding: "4px 12px", border: "1px solid var(--border-default)", flex: 1, maxWidth: 240 }}>
          <Search size={13} color="var(--text-muted)" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 12, color: "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid var(--border-default)", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)", background: "var(--bg-elevated)", outline: "none" }}>
          <option value="all">All Sources</option>
          {sourceOptions.filter(s => s !== "all").map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid var(--border-default)", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)", background: "var(--bg-elevated)", outline: "none" }}>
          <option value="all">All Confidence</option>
          <option value="high">High (80%+)</option>
          <option value="medium">Medium (60-79%)</option>
          <option value="low">Low (&lt;60%)</option>
        </select>

        <button onClick={() => { setSearchQuery(""); setSourceFilter("all"); setConfidenceFilter("all"); }}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", textDecoration: "underline" }}>
          Reset
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40, fontSize: 13 }}>Loading hidden tasks...</div>
      ) : filteredExtractions.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <AlertCircle size={24} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            {searchQuery || sourceFilter !== "all" || confidenceFilter !== "all"
              ? "No hidden tasks match your filters."
              : "No hidden tasks found. Run the pipeline to extract tasks from emails and meetings."}
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Group by confidence */}
          {["high", "medium", "low"].map(level => {
            const items = filteredExtractions.filter(e => {
              const c = e.confidence || 0;
              if (level === "high") return c >= 0.8;
              if (level === "medium") return c >= 0.6 && c < 0.8;
              return c < 0.6;
            });
            if (items.length === 0) return null;
            const label = level === "high" ? "HIGH CONFIDENCE" : level === "medium" ? "MEDIUM CONFIDENCE" : "LOW CONFIDENCE";
            const color = level === "high" ? "#BFD78D" : level === "medium" ? "#F5D66E" : "#F7C5E6";
            return (
              <div key={level}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                    padding: "2px 10px", borderRadius: 6, background: color, color: "var(--text-primary)",
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {items.map((item: ExtractionItem) => (
                  <HiddenTaskCard key={item.task_id} item={item} onApproved={handleApproved} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
