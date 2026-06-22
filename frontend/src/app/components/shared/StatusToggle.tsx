import { Check, RotateCcw, Clock, Lock, Archive } from "lucide-react";

const STATUSES = [
  { value: "open", label: "Open", icon: <Clock className="w-3 h-3" />, color: "bg-[#C9D8FF]" },
  { value: "in_progress", label: "In Progress", icon: <RotateCcw className="w-3 h-3" />, color: "bg-[#F5D66E]" },
  { value: "done", label: "Done", icon: <Check className="w-3 h-3" />, color: "bg-[#BFD78D]" },
  { value: "blocked", label: "Blocked", icon: <Lock className="w-3 h-3" />, color: "bg-[#F7C5E6]" },
  { value: "deferred", label: "Deferred", icon: <Archive className="w-3 h-3" />, color: "bg-[var(--border-default)]" },
];

export function StatusToggle({ taskId, currentStatus, onStatusChange, size = "md" }: {
  taskId: string; currentStatus: string; onStatusChange: (taskId: string, newStatus: string) => void; size?: "sm" | "md" | "lg";
}) {
  const current = STATUSES.find(s => s.value === currentStatus);
  const sizeClasses = { sm: "text-[10px] px-1.5 py-0.5 gap-1", md: "text-xs px-2.5 py-1 gap-1.5", lg: "text-sm px-3 py-1.5 gap-2" };

  return (
    <div className="relative group inline-block">
      <button className={`flex items-center rounded-lg transition-colors ${sizeClasses[size]} ${current?.color || "bg-[var(--border-default)]"} text-[var(--text-primary)] hover:opacity-80`} title="Change status">
        {current?.icon}
        <span>{current?.label || "Unknown"}</span>
      </button>
      <div className="absolute top-full right-0 mt-1 hidden group-hover:block bg-white border border-[var(--border-default)] rounded-2xl p-2 shadow-lg z-10 min-w-[130px]">
        <div className="space-y-0.5">
          {STATUSES.map((s) => (
            <button key={s.value}
              className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs transition-colors ${s.value === currentStatus ? "bg-[var(--bg-primary)] font-medium" : "hover:bg-[var(--bg-primary)]"}`}
              onClick={() => onStatusChange(taskId, s.value)}>
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
