import { useState } from "react";
import { Edit2, Save, X, Trash2 } from "lucide-react";
import { SourceBadge } from "./SourceBadge";
import { PriorityPill } from "./PriorityPill";
import { StatusToggle } from "./StatusToggle";
import { updateTask, deleteTask, Task, TaskStatus, Priority } from "../../api/taskpilot";
import { toast } from "sonner";

export function TaskCard({ task, onUpdate, onDelete, onClick }: { task: Task; onUpdate?: () => void; onDelete?: () => void; onClick?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState({ title: task.title, description: task.description || "", priority: task.priority || "P2", status: task.status || "open", deadline: task.deadline || "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: edited.title,
        description: edited.description || null,
        priority: edited.priority as Priority,
        status: edited.status as TaskStatus,
        deadline: edited.deadline || null,
      });
      toast.success("Task updated");
      setIsEditing(false);
      onUpdate?.();
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success("Task deleted");
      onDelete?.();
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const handleStatusChange = async (_taskId: string, newStatus: string) => {
    try {
      await updateTask(task.id, { status: newStatus as TaskStatus });
      toast.success(`Task ${newStatus === "done" ? "completed" : "moved to " + newStatus}`);
      onUpdate?.();
    } catch { toast.error("Failed to update status"); }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-3xl border border-[var(--blue-primary)] p-4 shadow-md" style={{ background: "var(--bg-elevated)", borderColor: "var(--blue-primary)" }}>
        <div className="space-y-3">
          <input type="text" value={edited.title} onChange={(e) => setEdited({ ...edited, title: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:border-[var(--blue-primary)] text-sm" placeholder="Task title"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          <textarea value={edited.description} onChange={(e) => setEdited({ ...edited, description: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:border-[var(--blue-primary)] resize-none text-sm" placeholder="Description" rows={2}
            style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          <div className="flex gap-3 flex-wrap">
            <select value={edited.priority} onChange={(e) => setEdited({ ...edited, priority: e.target.value })}
              className="px-3 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:border-[var(--blue-primary)] text-sm"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>
            <select value={edited.status} onChange={(e) => setEdited({ ...edited, status: e.target.value })}
              className="px-3 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:border-[var(--blue-primary)] text-sm"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
              <option value="deferred">Deferred</option>
            </select>
            <input type="date" value={edited.deadline?.split("T")[0] || ""} onChange={(e) => setEdited({ ...edited, deadline: e.target.value })}
              className="px-3 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:border-[var(--blue-primary)] text-sm"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSave} disabled={saving || !edited.title.trim()}
            className="px-4 py-2 bg-[var(--blue-primary)] text-white rounded-xl hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50 text-sm"
            style={{ background: "var(--blue-primary)" }}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--border-default)] transition-colors flex items-center gap-2 text-sm"
            style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border p-4 hover:shadow-md transition-shadow group"
      onClick={onClick}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border-default)",
        borderRadius: 24, padding: 16, cursor: onClick ? "pointer" : "default",
      }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <SourceBadge source={task.source || task.source_type} />
            <PriorityPill level={(task.priority ?? "P3") as any} />
            <StatusToggle taskId={task.id} currentStatus={task.status || "open"} onStatusChange={handleStatusChange} size="sm" />
          </div>
          <h4 className="font-medium text-sm leading-snug" style={{ color: "var(--text-primary)" }}>{task.title}</h4>
          {task.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{task.description}</p>}
          {task.deadline && <p className="text-[10px] mt-1.5 font-mono" style={{ color: "var(--text-secondary)" }}>Due: {new Date(task.deadline).toLocaleDateString()}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
          <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg transition-colors" title="Edit"
            style={{ background: "transparent" }}>
            <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg transition-colors" title="Delete"
            style={{ background: "transparent" }}>
            <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
