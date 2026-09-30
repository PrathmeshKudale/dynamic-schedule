import type { TimeState } from "@/hooks/use-timeos";
import { buildBusy, schedule, type SBlock, type SEvent, type STask } from "./scheduler";

export function toSchedInput(state: TimeState) {
  const tasks: STask[] = state.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    estimatedMinutes: t.estimated_minutes,
    deadline: t.deadline ? Date.parse(t.deadline) : null,
    energy: t.energy_requirement,
    isCompleted: t.is_completed,
  }));
  const events: SEvent[] = state.events.map((e) => ({
    id: e.id,
    title: e.title,
    start: Date.parse(e.start_time),
    end: Date.parse(e.end_time),
    category: e.category,
    isFixed: e.is_fixed,
    isProtected: e.is_protected,
  }));
  const blocks: SBlock[] = state.blocks.map((b) => ({
    taskId: b.task_id,
    start: Date.parse(b.start_time),
    end: Date.parse(b.end_time),
    reasons: [],
  }));
  const p = state.profile;
  const profile = { wake: p?.wake_time ?? "07:00", sleep: p?.sleep_time ?? "23:00", focus: p?.focus_minutes ?? 45, brk: p?.break_minutes ?? 10 };
  return { tasks, events, blocks, profile };
}

export function analyze(state: TimeState) {
  const now = Date.now();
  const tz = new Date().getTimezoneOffset();
  const s = toSchedInput(state);
  const sim = schedule({ ...s, now, tz, mode: "optimize" });
  const taskMap = new Map(s.tasks.map((t) => [t.id, t]));

  // Conflicts: stored future blocks that overlap an event
  const conflicts: { task: string; event: string }[] = [];
  for (const b of s.blocks) {
    if (b.end <= now) continue;
    const e = s.events.find((x) => b.start < x.end && x.start < b.end);
    if (e) conflicts.push({ task: taskMap.get(b.taskId)?.title ?? "Task", event: e.title });
  }
  // Unplanned work
  const planned = new Map<string, number>();
  for (const b of s.blocks) planned.set(b.taskId, (planned.get(b.taskId) ?? 0) + (b.end - b.start) / 60000);
  const unplanned = s.tasks
    .filter((t) => !t.isCompleted && t.estimatedMinutes - (planned.get(t.id) ?? 0) >= 15)
    .map((t) => ({ task: t, minutes: t.estimatedMinutes - (planned.get(t.id) ?? 0) }));

  // Usable time left today
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const busy = buildBusy(s.events, s.profile, now, tz, 1);
  let usable = 0;
  const step = 15 * 60000;
  for (let t = Math.ceil(now / step) * step; t < midnight.getTime(); t += step) {
    if (!busy.some((x) => t < x.end && x.start < t + step)) usable += 15;
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const focusToday = s.blocks
    .filter((b) => b.start >= todayStart.getTime() && b.start < midnight.getTime())
    .reduce((a, b) => a + (b.end - b.start) / 60000, 0);

  const unplannedMinutes = unplanned.reduce((a, u) => a + u.minutes, 0);
  const health =
    conflicts.length || unplannedMinutes > 120 ? "Needs attention" : unplannedMinutes > 0 || sim.workload.score > 70 ? "Tight" : "Good";

  return { sim, conflicts, unplanned, unplannedMinutes, usable, focusToday, health, now };
}
