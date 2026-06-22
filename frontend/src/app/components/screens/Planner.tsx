import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus, Sparkles, RefreshCw, Download, Calendar, ChevronLeft, ChevronRight,
  X, Clock, CheckCircle2, Zap, MoreHorizontal, CalendarPlus,
  Trash2, Check, Circle, CircleDot,
} from "lucide-react";
import {
  getPlan, getCalendarToday, getTasks, createTask, refreshPlan,
  addCalendarEvent, deleteTask, updateTask, deleteCalendarEvent,
  getCalendarMonth, getWeekPlan,
  DailyPlan, CalendarEvent, WebSocketEvent, Task,
} from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";
import { toast } from "sonner";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SLOT_COLORS: Record<string, string> = {
  deep_work: "#F7C5E6",
  shallow_work: "#F5D66E",
  meeting: "#C9D8FF",
  break: "#BFD78D",
  buffer: "var(--border-default)",
};

const SLOT_ICONS: Record<string, string> = {
  deep_work: "🎯",
  shallow_work: "⚡",
  meeting: "🤝",
  break: "☕",
  buffer: "⏳",
};

const PRIORITY_DOTS: Record<string, string> = {
  P0: "#E74C3C",
  P1: "#F39C12",
  P2: "#F1C40F",
  P3: "#3498DB",
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

const fmtShortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting", icon: "🤝", color: "#C9D8FF" },
  { value: "focus", label: "Focus Time", icon: "🎯", color: "#F7C5E6" },
  { value: "break", label: "Break", icon: "☕", color: "#BFD78D" },
  { value: "review", label: "Review", icon: "📋", color: "#F5D66E" },
  { value: "buffer", label: "Buffer", icon: "🌿", color: "var(--border-default)" },
];

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// ─── Shared Styles ──────────────────────────────────────────────────────────────

const styles = {
  panel: {
    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
    borderRadius: 18, padding: "20px 22px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
  } as const,
  input: {
    width: "100%", padding: "10px 14px", border: "1px solid var(--border-default)",
    borderRadius: 12, fontSize: 13, outline: "none",
    fontFamily: "'Space Grotesk', sans-serif", boxSizing: "border-box",
  } as const,
  label: {
    fontSize: 12, fontWeight: 500, color: "var(--text-primary)", display: "block", marginBottom: 4,
  } as const,
  sectionTitle: (icon?: string) => ({
    fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
  } as const),
  btnSecondary: {
    background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-default)",
    padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 500,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    fontFamily: "'Space Grotesk', sans-serif",
  } as const,
};

// ─── Modal Backdrop ──────────────────────────────────────────────────────────────

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-elevated)", borderRadius: 24,
        border: "1px solid var(--border-default)", padding: 24,
        maxWidth: 480, width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        boxSizing: "border-box",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, icon, onClose }: { title: string; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <h3 style={{
        margin: 0, fontSize: 18, fontWeight: 700,
        fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 8,
      }}>
        {icon} {title}
      </h3>
      <button onClick={onClose} style={{
        background: "none", border: "none", padding: 4,
        borderRadius: 8, cursor: "pointer", display: "flex", color: "var(--text-secondary)",
      }}>
        <X size={18} />
      </button>
    </div>
  );
}

// ─── Monthly Calendar ────────────────────────────────────────────────────────────

type MonthViewProps = {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isCurrentMonth: boolean;
  calendarDays: (number | null)[];
  getDayInfo: (day: number) => { dayTasks: Task[]; dayEvents: CalendarEvent[]; allDone: boolean; taskCount: number; eventCount: number };
  isSelectedDate: (day: number) => boolean;
  onDateSelect: (day: number) => void;
  onDayDoubleClick: (day: number) => void;
};

function MonthlyCalendar({
  year, month, onPrevMonth, onNextMonth, onToday, isCurrentMonth,
  calendarDays, getDayInfo, isSelectedDate, onDateSelect, onDayDoubleClick,
}: MonthViewProps) {
  const now = new Date();
  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onPrevMonth} style={{
            background: "none", border: "1px solid var(--border-default)", borderRadius: 10,
            padding: "6px 10px", cursor: "pointer", display: "flex",
            alignItems: "center", color: "var(--text-secondary)",
          }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={onNextMonth} style={{
            background: "none", border: "1px solid var(--border-default)", borderRadius: 10,
            padding: "6px 10px", cursor: "pointer", display: "flex",
            alignItems: "center", color: "var(--text-secondary)",
          }}>
            <ChevronRight size={14} />
          </button>
        </div>
        <button onClick={onToday} style={{
          background: isCurrentMonth ? "#0D0D0D" : "none",
          border: isCurrentMonth ? "none" : "1px solid var(--border-default)",
          color: isCurrentMonth ? "#FFFFFF" : "var(--text-secondary)",
          padding: "6px 14px", borderRadius: 10, fontSize: 11,
          cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 500,
        }}>
          Today
        </button>
      </div>

      {/* Weekday row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, color: "var(--text-secondary)",
            fontWeight: 500, padding: "6px 0", fontFamily: "'IBM Plex Mono', monospace",
          }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {calendarDays.map((d, i) => {
          if (d === null) return <div key={i} />;
          const today = isCurrentMonth && d === now.getDate();
          const sel = isSelectedDate(d);
          const info = getDayInfo(d);
          return (
            <div key={i}
              onClick={() => onDateSelect(d)}
              onDoubleClick={() => onDayDoubleClick(d)}
              title="Click to select, double-click to add task"
              style={{
                textAlign: "center", padding: "8px 4px", borderRadius: 12,
                background: sel ? "var(--blue-primary)" : today ? "#0D0D0D" : "transparent",
                color: sel || today ? "#FFFFFF" : "var(--text-primary)",
                fontWeight: sel || today ? 600 : 400,
                fontSize: 13, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                minHeight: 48, transition: "background 0.15s",
              }}>
              <span>{d}</span>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", minHeight: 8 }}>
                {info.allDone && (
                  <CheckCircle2 size={8} color={sel || today ? "#81C784" : "#2ECC71"} />
                )}
                {!info.allDone && info.taskCount > 0 && (
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: sel || today ? "#FFFFFF" : "var(--text-secondary)",
                  }} />
                )}
                {info.eventCount > 0 && (
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: sel || today ? "#90CAF9" : "#3498DB",
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, marginTop: 12, paddingTop: 10,
        borderTop: "1px solid var(--border-default)", fontSize: 11, color: "var(--text-secondary)",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-secondary)", display: "inline-block" }} /> Tasks
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3498DB", display: "inline-block" }} /> Events
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <CheckCircle2 size={11} color="#2ECC71" /> All done
        </span>
      </div>
    </div>
  );
}

// ─── Weekly Timeline ─────────────────────────────────────────────────────────────

type TimeBlockItem = {
  _type?: "event";
  event_id?: string;
  title: string;
  start: string;
  end: string;
  slot_type?: string;
};

type WeeklyTimelineProps = {
  weekStart: Date;
  weekDays: Date[];
  getBlocksForDay: (day: Date) => { blocks: TimeBlockItem[]; events: TimeBlockItem[] };
};

function WeeklyTimeline({ weekStart, weekDays, getBlocksForDay }: WeeklyTimelineProps) {
  const now = new Date();
  return (
    <div style={{
      ...styles.panel,
      overflowX: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
          Week of {fmtShortDate(weekStart)}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
          Drag tasks to reschedule
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 4, minWidth: 560 }}>
        <div />
        {weekDays.map((day, i) => {
          const isDayToday = day.toDateString() === now.toDateString();
          return (
            <div key={i} style={{
              textAlign: "center", fontSize: 10, fontWeight: 600,
              color: isDayToday ? "var(--blue-primary)" : "var(--text-secondary)",
              fontFamily: "'IBM Plex Mono', monospace", padding: "4px 0",
            }}>
              {DAY_NAMES[i]}
              <div style={{ fontSize: 14, color: isDayToday ? "var(--text-primary)" : "var(--text-secondary)", marginTop: 1 }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 4, marginTop: 8, minWidth: 560 }}>
        {HOURS.map(h => (
          <div key={h} style={{ display: "contents" }}>
            <div style={{
              fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace",
              textAlign: "right", paddingRight: 8, lineHeight: "30px",
            }}>
              {String(h).padStart(2, "0")}:00
            </div>
            {weekDays.map((day, di) => {
              const { blocks, events: dayEvts } = getBlocksForDay(day);
              const hourItems = [...blocks, ...dayEvts].filter((item: any) =>
                new Date(item.start).getHours() === h
              );
              const MAX_VISIBLE = 3;
              const visible = hourItems.slice(0, MAX_VISIBLE);
              const overflow = hourItems.length - MAX_VISIBLE;
              return (
                <div key={di} style={{
                  minHeight: 30, borderTop: "1px solid var(--border-subtle)",
                  position: "relative", padding: "1px 0",
                }}>
                  {visible.map((item: any, bi: number) => {
                    const isEvent = item._type === "event";
                    return (
                      <div key={bi} title={`${item.title} (${fmtTime(item.start)}-${fmtTime(item.end)})`} style={{
                        background: isEvent ? "#DBEAFE" : (SLOT_COLORS[item.slot_type] || "var(--border-default)"),
                        borderRadius: 6, padding: "2px 6px 2px 4px", fontSize: 10,
                        marginBottom: 2, cursor: "default",
                        color: "var(--text-primary)", lineHeight: 1.4,
                        display: "flex", alignItems: "center", gap: 3,
                        overflow: "hidden", whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        borderLeft: isEvent ? "3px solid #3B82F6" : "none",
                      }}>
                        <span style={{ flexShrink: 0, fontSize: 11 }}>
                          {isEvent ? "📅" : (SLOT_ICONS[item.slot_type] || "📌")}
                        </span>
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.title}
                        </span>
                        <span style={{
                          color: "var(--text-secondary)", fontSize: 9, marginLeft: "auto",
                          fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
                        }}>
                          {fmtTime(item.start)}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div style={{ fontSize: 9, color: "var(--text-secondary)", paddingLeft: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                      +{overflow} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Selected Date Panel (Today's Tasks & Events) ────────────────────────────────

type SelectedDatePanelProps = {
  selectedDate: Date;
  tasks: Task[];
  events: CalendarEvent[];
  onToggleTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onDeleteEvent: (id: string) => void;
};

function formatTimeStr(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function SelectedDatePanel({ selectedDate, tasks, events, onToggleTask, onDeleteTask, onDeleteEvent }: SelectedDatePanelProps) {
  const dateStr = selectedDate.toISOString().split("T")[0];
  const dayTasks = tasks.filter(t => t.deadline && t.deadline.split("T")[0] === dateStr);
  const dayEvents = events.filter(ev => ev.start_time.split("T")[0] === dateStr);

  return (
    <div style={{ ...styles.panel, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tasks Section */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
        }}>
          <Clock size={14} /> {fmtShortDate(selectedDate)} Tasks
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
            ({dayTasks.length})
          </span>
        </div>
        {dayTasks.length > 0 ? dayTasks.slice(0, 20).map(task => (
          <div key={task.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: "1px solid var(--border-subtle)",
          }}>
            <div
              onClick={() => onToggleTask(task)}
              style={{ cursor: "pointer", flexShrink: 0, display: "flex" }}
              title={task.status === "done" ? "Mark as open" : "Mark as done"}
            >
              {task.status === "done" ? (
                <Check size={14} color="#2ECC71" />
              ) : (
                <CircleDot size={14} color={PRIORITY_DOTS[task.priority || "P3"]} />
              )}
            </div>
            <span style={{
              flex: 1, fontSize: 12,
              color: task.status === "done" ? "#B0B0B0" : "var(--text-primary)",
              fontWeight: 500,
              textDecoration: task.status === "done" ? "line-through" : "none",
            }}>
              {task.title}
            </span>
            <button onClick={() => onDeleteTask(task.id)} style={{
              background: "none", border: "none", padding: 2,
              borderRadius: 6, cursor: "pointer", display: "flex",
              color: "#CCC", flexShrink: 0,
            }} title="Delete task">
              <Trash2 size={12} />
            </button>
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
            🎉
            <div style={{ marginTop: 4, fontSize: 11 }}>Nothing scheduled</div>
          </div>
        )}
      </div>

      {/* Events Section */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
        }}>
          <Calendar size={14} /> {fmtShortDate(selectedDate)} Events
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
            ({dayEvents.length})
          </span>
        </div>
        {dayEvents.length > 0 ? dayEvents.slice(0, 20).map(ev => (
          <div key={ev.event_id} style={{
            display: "flex", gap: 8, padding: "8px 10px",
            background: "#EEF2FF", borderRadius: 10, marginBottom: 6,
            alignItems: "center",
          }}>
            <div style={{ width: 3, borderRadius: 2, background: "#C9D8FF", flexShrink: 0, alignSelf: "stretch" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{ev.title}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                {formatTimeStr(ev.start_time)} - {formatTimeStr(ev.end_time)}
              </div>
            </div>
            <button onClick={() => onDeleteEvent(ev.event_id)} style={{
              background: "none", border: "none", padding: 2,
              borderRadius: 6, cursor: "pointer", display: "flex",
              color: "#CCC", flexShrink: 0,
            }} title="Delete event">
              <Trash2 size={12} />
            </button>
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
            🕐
            <div style={{ marginTop: 4, fontSize: 11 }}>No events on this date</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Task Modal ──────────────────────────────────────────────────────────────

type AddTaskModalProps = {
  form: { title: string; description: string; priority: string; date: string; time: string };
  onChange: (f: typeof form) => void;
  onClose: () => void;
  onSubmit: () => void;
  creating: boolean;
};

function AddTaskModal({ form, onChange, onClose, onSubmit, creating }: AddTaskModalProps) {
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Add Task" icon={<Plus size={18} />} onClose={onClose} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={styles.label}>Title *</label>
          <input type="text" value={form.title}
            onChange={e => onChange({ ...form, title: e.target.value })}
            placeholder="Enter task title"
            style={styles.input} />
        </div>

        <div>
          <label style={styles.label}>Description</label>
          <textarea value={form.description}
            onChange={e => onChange({ ...form, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
            style={{ ...styles.input, resize: "vertical" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={styles.label}>Priority</label>
            <select value={form.priority}
              onChange={e => onChange({ ...form, priority: e.target.value })}
              style={{ ...styles.input, background: "var(--bg-elevated)" }}>
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Date</label>
            <input type="date" value={form.date}
              onChange={e => onChange({ ...form, date: e.target.value })}
              style={styles.input} />
          </div>
        </div>

        <div>
          <label style={styles.label}>Time</label>
          <input type="time" value={form.time}
            onChange={e => onChange({ ...form, time: e.target.value })}
            style={styles.input} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: "12px 0", background: "var(--bg-primary)",
          color: "var(--text-secondary)", border: "none", borderRadius: 12,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          Cancel
        </button>
        <button onClick={onSubmit}
          disabled={!form.title.trim() || creating}
          style={{
            flex: 1, padding: "12px 0", background: "var(--blue-primary)",
            color: "#FFFFFF", border: "none", borderRadius: 12,
            fontSize: 13, fontWeight: 600,
            cursor: !form.title.trim() || creating ? "not-allowed" : "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            opacity: !form.title.trim() || creating ? 0.6 : 1,
          }}>
          {creating ? "Creating..." : "Submit"}
        </button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────────

type AddEventModalProps = {
  form: { title: string; date: string; start_time: string; end_time: string; type: string; description: string };
  onChange: (f: AddEventModalProps["form"]) => void;
  onClose: () => void;
  onSubmit: () => void;
  creating: boolean;
};

function AddEventModal({ form, onChange, onClose, onSubmit, creating }: AddEventModalProps) {
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Add Event" icon={<CalendarPlus size={18} />} onClose={onClose} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={styles.label}>Event Title *</label>
          <input type="text" value={form.title}
            onChange={e => onChange({ ...form, title: e.target.value })}
            placeholder="e.g. Sprint Planning, Team Standup"
            style={styles.input} />
        </div>

        <div>
          <label style={styles.label}>Event Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6 }}>
            {EVENT_TYPES.map(et => (
              <button key={et.value} onClick={() => onChange({ ...form, type: et.value })}
                style={{
                  padding: "8px 4px", borderRadius: 10,
                  border: form.type === et.value ? `2px solid ${et.color}` : "1px solid var(--border-default)",
                  background: form.type === et.value ? `${et.color}30` : "#FFFFFF",
                  cursor: "pointer", textAlign: "center", fontSize: 11, color: "var(--text-primary)",
                }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{et.icon}</div>
                <div style={{ fontWeight: form.type === et.value ? 600 : 400 }}>{et.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={styles.label}>Date</label>
          <input type="date" value={form.date}
            onChange={e => onChange({ ...form, date: e.target.value })}
            style={styles.input} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={styles.label}>Start Time</label>
            <input type="time" value={form.start_time}
              onChange={e => onChange({ ...form, start_time: e.target.value })}
              style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>End Time</label>
            <input type="time" value={form.end_time}
              onChange={e => onChange({ ...form, end_time: e.target.value })}
              style={styles.input} />
          </div>
        </div>

        <div>
          <label style={styles.label}>Description</label>
          <textarea value={form.description}
            onChange={e => onChange({ ...form, description: e.target.value })}
            placeholder="Optional description"
            rows={2}
            style={{ ...styles.input, resize: "vertical" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: "12px 0", background: "var(--bg-primary)",
          color: "var(--text-secondary)", border: "none", borderRadius: 12,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          Cancel
        </button>
        <button onClick={onSubmit}
          disabled={!form.title.trim() || !form.date || creating}
          style={{
            flex: 1, padding: "12px 0", background: "var(--bg-sidebar)",
            color: "#FFFFFF", border: "none", borderRadius: 12,
            fontSize: 13, fontWeight: 600,
            cursor: !form.title.trim() || !form.date || creating ? "not-allowed" : "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            opacity: !form.title.trim() || !form.date || creating ? 0.6 : 1,
          }}>
          {creating ? "Adding..." : "Add Event"}
        </button>
      </div>
    </ModalBackdrop>
  );
}

// =============================================================================
// MAIN PLANNER COMPONENT
// =============================================================================

export function Planner() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", description: "", priority: "P2", date: "", time: "" });
  const [addEventForm, setAddEventForm] = useState({
    title: "", date: "", start_time: "09:00", end_time: "10:00", type: "meeting", description: ""
  });
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, calMonth, calToday, t] = await Promise.all([
        getPlan(),
        getCalendarMonth(year, month + 1).catch(() => null),
        getCalendarToday().catch(() => ({ events: [] })),
        getTasks().catch(() => ({ tasks: [] })),
      ]);
      setPlan(p);
      const allEvents: CalendarEvent[] = [];
      if (calMonth?.days) {
        calMonth.days.forEach((d: any) => {
          if (d.events) allEvents.push(...d.events);
        });
      }
      const todayEvts = calToday.events || [];
      const merged = [...allEvents, ...todayEvts.filter(ev => !allEvents.some(e => e.event_id === ev.event_id))];
      setEvents(merged);
      setAllTasks(t.tasks || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [year, month]);

  const handleWsEvent = useCallback((event: WebSocketEvent) => {
    if (event.event === "plan_updated") setPlan(event.data as DailyPlan);
    if (event.event === "tasks_updated" || event.event === "events_updated") refresh();
  }, [refresh]);

  useWebSocket(handleWsEvent);

  useEffect(() => { refresh(); }, [refresh]);

  const timeBlocks: any[] = (plan as any)?.time_blocked_plan?.time_blocks ?? [];

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [month, year]);

  const getDayInfo = useCallback((day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTasks = allTasks.filter(t => t.deadline && t.deadline.split("T")[0] === dateStr);
    const dayEvents = events.filter(ev => ev.start_time.split("T")[0] === dateStr);
    const allDone = dayTasks.length > 0 && dayTasks.every(t => t.status === "done");
    return { dayTasks, dayEvents, allDone, taskCount: dayTasks.length, eventCount: dayEvents.length };
  }, [year, month, allTasks, events]);

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const getBlocksForDay = useCallback((day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    const blocks = timeBlocks
      .filter((tb: any) => new Date(tb.start).toISOString().split("T")[0] === dayStr)
      .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const dayEvts = events
      .filter(ev => ev.start_time?.split("T")[0] === dayStr)
      .map(ev => ({
        _type: "event" as const,
        event_id: ev.event_id,
        title: ev.title,
        start: ev.start_time,
        end: ev.end_time,
      }))
      .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return { blocks, events: dayEvts };
  }, [timeBlocks, events]);

  const selectedDateTasks = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return allTasks.filter(t => t.deadline && t.deadline.split("T")[0] === dateStr);
  }, [allTasks, selectedDate]);

  const selectedDateEvents = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return events.filter(ev => ev.start_time.split("T")[0] === dateStr);
  }, [events, selectedDate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await refreshPlan(); await refresh(); }
    catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const handleExport = () => {
    const data = { plan, events, tasks: allTasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTask = async () => {
    if (!addForm.title.trim()) return;
    setCreating(true);
    try {
      const deadline = addForm.date
        ? addForm.time ? `${addForm.date}T${addForm.time}` : addForm.date
        : undefined;
      await createTask({
        title: addForm.title,
        description: addForm.description || undefined,
        priority: addForm.priority as any,
        deadline,
        status: "open",
      });
      setShowAddModal(false);
      setAddForm({ title: "", description: "", priority: "P2", date: "", time: "" });
      toast.success("Task created successfully");
      await refresh();
    } catch (err) { console.error(err); toast.error("Failed to create task"); }
    finally { setCreating(false); }
  };

  const handleCreateEvent = async () => {
    if (!addEventForm.title.trim()) return;
    setCreating(true);
    try {
      await addCalendarEvent({
        title: addEventForm.title,
        date: addEventForm.date,
        start_time: `${addEventForm.date}T${addEventForm.start_time}`,
        end_time: `${addEventForm.date}T${addEventForm.end_time}`,
        type: addEventForm.type,
        description: addEventForm.description,
        color: EVENT_TYPES.find(e => e.value === addEventForm.type)?.color || "#C9D8FF",
      });
      setShowAddEventModal(false);
      setAddEventForm({ title: "", date: "", start_time: "09:00", end_time: "10:00", type: "meeting", description: "" });
      toast.success("Event added successfully");
      await refresh();
    } catch (err) { console.error(err); toast.error("Failed to add event"); }
    finally { setCreating(false); }
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "open" : "done";
    try {
      await updateTask(task.id, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
      await refresh();
    } catch { toast.error("Failed to update task"); }
  };

  const handleDeleteTaskAction = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
      await refresh();
    } catch { toast.error("Failed to delete task"); }
  };

  const handleDeleteEventAction = async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId);
      toast.success("Event deleted");
      await refresh();
    } catch { toast.error("Failed to delete event"); }
  };

  const handleReplan = async () => {
    setGenerating(true);
    try { await refreshPlan(); await refresh(); }
    catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const handleDayDoubleClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setAddForm(f => ({ ...f, date: dateStr }));
    setShowAddModal(true);
  };

  const openTasksCount = allTasks.filter(t => t.status !== "done").length;
  const highPriorityOpen = allTasks.filter(
    t => (t.priority === "P0" || t.priority === "P1") && t.status !== "done"
  );

  const isSelectedDate = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  const handlePrevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }, [month]);

  const handleToday = useCallback(() => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
    setSelectedDate(new Date());
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontFamily: "'Space Grotesk', sans-serif" }}>
            📅 Planner
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            {fmtDate(now)}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
            {loading ? "Loading... " : `${timeBlocks.length} blocks \u00B7 ${events.length} events \u00B7 ${allTasks.length} tasks`}
          </p>
        </div>
        <button onClick={refresh} style={{
          background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none",
          padding: "10px 20px", borderRadius: 12, fontSize: 12,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ─── Quick Actions ─── */}
      <div style={{
        display: "flex", gap: 10, padding: "14px 18px",
        background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
        borderRadius: 16, alignItems: "center",
      }}>
        <button onClick={() => {
          const dateStr = selectedDate.toISOString().split("T")[0];
          setAddForm(f => ({ ...f, date: dateStr }));
          setShowAddModal(true);
        }} style={{
          background: "var(--blue-primary)", color: "#FFFFFF", border: "none",
          padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <Plus size={14} /> Add Task
        </button>
        <button onClick={() => {
          const dateStr = selectedDate.toISOString().split("T")[0];
          setAddEventForm(f => ({ ...f, date: dateStr }));
          setShowAddEventModal(true);
        }} style={{
          background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none",
          padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <CalendarPlus size={14} /> Add Event
        </button>
        <button onClick={handleGenerate} disabled={generating} style={{
          ...styles.btnSecondary,
          cursor: generating ? "not-allowed" : "pointer",
          opacity: generating ? 0.6 : 1,
        }}>
          <Zap size={14} /> {generating ? "Generating..." : "Generate Plan"}
        </button>
        <button onClick={handleReplan} disabled={generating} style={{
          ...styles.btnSecondary,
          cursor: generating ? "not-allowed" : "pointer",
          opacity: generating ? 0.6 : 1,
        }}>
          <RefreshCw size={14} /> Re-plan
        </button>
        <button onClick={handleExport} style={styles.btnSecondary}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* ─── Three-Column Grid ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "4fr 5fr 3fr", gap: 14, alignItems: "start" }}>

        {/* ── LEFT: Monthly Calendar ── */}
        <MonthlyCalendar
          year={year}
          month={month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          isCurrentMonth={isCurrentMonth}
          calendarDays={calendarDays}
          getDayInfo={getDayInfo}
          isSelectedDate={isSelectedDate}
          onDateSelect={(day) => setSelectedDate(new Date(year, month, day))}
          onDayDoubleClick={handleDayDoubleClick}
        />

        {/* ── CENTER: Weekly Timeline ── */}
        <WeeklyTimeline
          weekStart={weekStart}
          weekDays={weekDays}
          getBlocksForDay={getBlocksForDay}
        />

        {/* ── RIGHT: Selected Date Panel ── */}
        <SelectedDatePanel
          selectedDate={selectedDate}
          tasks={allTasks}
          events={events}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTaskAction}
          onDeleteEvent={handleDeleteEventAction}
        />
      </div>

      {/* ─── AI Recommendations ─── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", background: "#FEF9E7",
        border: "1px solid #F5D66E", borderRadius: 14,
      }}>
        <Sparkles size={16} color="#F39C12" />
        <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {openTasksCount > 0 ? (
            <>
              You have {openTasksCount} open task{openTasksCount !== 1 ? "s" : ""}.
              {highPriorityOpen.length > 0 && (
                <> {highPriorityOpen.length} high-priority task{highPriorityOpen.length !== 1 ? "s" : ""} need{highPriorityOpen.length === 1 ? "s" : ""} attention.</>
              )}
              {" "}Consider scheduling a deep work session.
            </>
          ) : "All tasks completed! Great work."}
        </span>
      </div>

      {/* ─── Modals ─── */}
      {showAddModal && (
        <AddTaskModal
          form={addForm}
          onChange={setAddForm}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateTask}
          creating={creating}
        />
      )}

      {showAddEventModal && (
        <AddEventModal
          form={addEventForm}
          onChange={setAddEventForm}
          onClose={() => setShowAddEventModal(false)}
          onSubmit={handleCreateEvent}
          creating={creating}
        />
      )}
    </div>
  );
}
