import { useState } from "react";
import { ChevronDown, GitMerge, Info } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { SourceBadge } from "./SourceBadge";
import { PriorityPill } from "./PriorityPill";
import { StatusPill } from "./StatusPill";
import { SparkleIcon } from "./SparkleIcon";
import type { DedupGroup } from "@/app/api/taskpilot";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-primary" : pct >= 60 ? "bg-chart-3" : "bg-chart-5";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Match confidence
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-mono tabular-nums min-w-[3ch] text-right",
          pct >= 80 ? "text-primary" : pct >= 60 ? "text-chart-3" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function SubTaskCard({ task }: { task: DedupGroup["tasks"][number] }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <SourceBadge source={task.source} />
        <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
        <div className="ml-auto flex items-center gap-2">
          {task.priority && <PriorityPill level={task.priority} />}
          <StatusPill status={task.status || "open"} />
        </div>
      </div>
      <p className="text-sm text-foreground leading-snug">{task.title}</p>
      {task.deadline && (
        <p className="text-xs text-muted-foreground mt-1">
          Due {task.deadline}
          {task.owner ? ` · ${task.owner}` : ""}
        </p>
      )}
    </div>
  );
}

type MergedTaskCardProps = {
  group: DedupGroup;
  defaultExpanded?: boolean;
};

export function MergedTaskCard({ group, defaultExpanded = false }: MergedTaskCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const uniqueSources = [...new Set(group.tasks.map((t) => t.source))];

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden"
      role="region"
      aria-label={`Merged from ${group.merged_count} sources`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
            expanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            <GitMerge size={14} />
          </span>
          <span className="text-sm font-medium text-foreground">
            Merged from{" "}
            <span className="text-primary">{group.merged_count} source{group.merged_count !== 1 ? "s" : ""}</span>
          </span>
        </div>
        <ChevronDown
          size={15}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div className="px-4 pb-3 space-y-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {uniqueSources.map((src) => (
            <SourceBadge key={src} source={src} />
          ))}
        </div>

        <ConfidenceBar value={group.match_confidence} />
      </div>

      {expanded && (
        <div className="border-t border-border">
          <div className="px-4 py-3 flex items-start gap-2 bg-muted/10">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {group.reasoning}
            </p>
          </div>

          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Merged tasks
            </p>
            {group.tasks.map((task) => (
              <SubTaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
