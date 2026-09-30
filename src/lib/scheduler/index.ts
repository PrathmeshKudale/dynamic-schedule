/**
 * TimeOS scheduling engine — deterministic, constraint-based.
 * Hard rules: never overlap fixed events, sleep, protected time, or other blocks.
 */
import { DAY, MIN, localDayStart, localMinutes, parseHM } from "../time";

export type Level = "High" | "Medium" | "Low";

export interface SEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  category: string;
  isFixed: boolean;
  isProtected: boolean;
}
export interface STask {
  id: string;
  title: string;
  category: string;
  priority: string;
  estimatedMinutes: number;
  deadline: number | null;
  energy: string;
  isCompleted: boolean;
}
export interface SBlock {
  taskId: string;
  start: number;
  end: number;
  reasons: string[];
}
export interface SProfile {
  wake: string;
  sleep: string;
  focus: number;
  brk: number;
}
export type Mode = "generate" | "optimize" | "reschedule";

export interface ScheduleInput {
  tasks: STask[];
  events: SEvent[];
  blocks: SBlock[];
  profile: SProfile;
  now: number;
  tz: number;
  mode: Mode;
  horizonDays?: number;
  /** Local day-start timestamps whose remaining blocks are rebuilt (reschedule). */
  scopeDays?: number[];
}

export interface MovedItem {
  taskId: string;
  title: string;
  category: string;
  from: { start: number; end: number };
  to: { start: number; end: number };
  cause: string;
  causeType: "conflict" | "reschedule" | "rebalance";
  reasons: string[];
  confidence: Record<"deadline" | "energyFit" | "availability" | "preference", Level>;
}
export interface AddedItem {
  taskId: string;
  title: string;
  category: string;
  start: number;
  end: number;
  reasons: string[];
  confidence: MovedItem["confidence"];
}
export interface Proposal {
  mode: Mode;
  blocks: SBlock[];
  moved: MovedItem[];
  added: AddedItem[];
  unscheduled: { taskId: string; title: string; start: number; end: number }[];
  keptCount: number;
  protectedItems: string[];
  warnings: string[];
  constraints: string[];
  workload: {
    requiredMinutes: number;
    availableMinutes: number;
    scheduledMinutes: number;
    unplacedMinutes: number;
    gapMinutes: number;
    score: number;
  };
}

interface Busy {
  start: number;
  end: number;
  label: string;
  kind: "sleep" | "protected" | "fixed";
}

const PRIORITY_W: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
const STEP = 15 * MIN;

export function energyAt(localMin: number): "LOW" | "MEDIUM" | "HIGH" {
  if (localMin < 360) return "LOW";
  if (localMin < 840) return "HIGH";
  if (localMin < 1020) return "MEDIUM";
  if (localMin < 1260) return "HIGH";
  return "LOW";
}

const overlap = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

export function buildBusy(events: SEvent[], profile: SProfile, now: number, tz: number, horizon: number) {
  const busy: Busy[] = [];
  const base = localDayStart(now, tz);
  const wakeMin = parseHM(profile.wake);
  const sleepMin = parseHM(profile.sleep);
  for (let d = -1; d <= horizon + 1; d++) {
    const ds = base + d * DAY;
    const sleepS = ds + sleepMin * MIN + (sleepMin < wakeMin ? DAY : 0);
    busy.push({ start: sleepS, end: ds + DAY + wakeMin * MIN, label: "Sleep", kind: "sleep" });
    busy.push({ start: ds + 20 * 60 * MIN, end: ds + 20.75 * 60 * MIN, label: "Dinner", kind: "protected" });
  }
  for (const e of events) {
    busy.push({ start: e.start, end: e.end, label: e.title, kind: e.isProtected ? "protected" : "fixed" });
  }
  return busy;
}

function urgency(t: STask, remaining: number, now: number) {
  const w = PRIORITY_W[t.priority] ?? 2;
  let u = w * 20 + remaining / 60;
  if (t.deadline) {
    const hours = Math.max(0, (t.deadline - now) / 3_600_000);
    u += 200 / (1 + hours / 24);
  }
  return u;
}

function energyScore(task: string, win: string) {
  if (task === "HIGH") return win === "HIGH" ? 3 : win === "MEDIUM" ? 1 : -3;
  if (task === "LOW") return win === "LOW" ? 2 : 1;
  return win === "MEDIUM" ? 2 : win === "HIGH" ? 1 : 0;
}

function confidenceFor(t: STask, start: number, now: number, tz: number): MovedItem["confidence"] {
  const hours = t.deadline ? (t.deadline - now) / 3_600_000 : Infinity;
  const win = energyAt(localMinutes(start, tz));
  const es = energyScore(t.energy, win);
  const lm = localMinutes(start, tz);
  return {
    deadline: hours < 48 ? "High" : hours < 120 ? "Medium" : "Low",
    energyFit: es >= 2 ? "High" : es >= 1 ? "Medium" : "Low",
    availability: "High",
    preference: lm >= 8 * 60 && lm <= 21 * 60 ? "High" : "Medium",
  };
}

function reasonsFor(t: STask, start: number, end: number, now: number, tz: number, profile: SProfile) {
  const r: string[] = [];
  if (t.deadline && t.deadline - now < 3 * DAY) r.push("deadline");
  const win = energyAt(localMinutes(start, tz));
  if (win === "HIGH" && t.energy === "HIGH") r.push("high-energy-period");
  else if (energyScore(t.energy, win) >= 2) r.push("energy-match");
  r.push("availability");
  if (Math.abs((end - start) / MIN - profile.focus) <= 15) r.push("session-length");
  return r;
}

export function schedule(input: ScheduleInput): Proposal {
  const { tasks, events, blocks, profile, now, tz, mode } = input;
  const horizon = input.horizonDays ?? 7;
  const base = localDayStart(now, tz);
  const horizonEnd = base + (horizon + 1) * DAY;
  const t0 = Math.ceil(now / STEP) * STEP;
  const busy = buildBusy(events, profile, now, tz, horizon);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const scope = new Set(input.scopeDays ?? []);
  const warnings: string[] = [];

  const past = blocks.filter((b) => b.end <= now);
  const inProgress = blocks.filter((b) => b.start < now && b.end > now);
  const future = blocks.filter((b) => b.start >= now).sort((a, b) => a.start - b.start);

  // Keep valid future blocks (minimal-change principle)
  const kept: SBlock[] = [];
  if (mode !== "generate") {
    for (const b of future) {
      const t = taskMap.get(b.taskId);
      if (!t || t.isCompleted) continue;
      if (busy.some((x) => overlap(b.start, b.end, x.start, x.end))) continue;
      if (scope.has(localDayStart(b.start, tz))) continue;
      if (t.deadline && b.end > t.deadline) continue;
      if (kept.some((k) => overlap(b.start, b.end, k.start, k.end))) continue;
      kept.push({ ...b, reasons: b.reasons.length ? b.reasons : ["availability"] });
    }
  }

  const minutes = (b: SBlock) => (b.end - b.start) / MIN;
  const done = new Map<string, number>();
  for (const b of [...past, ...inProgress]) done.set(b.taskId, (done.get(b.taskId) ?? 0) + minutes(b));

  // Trim kept blocks that exceed the remaining estimate
  const remaining = new Map<string, number>();
  for (const t of tasks) {
    if (t.isCompleted) continue;
    remaining.set(t.id, Math.max(0, t.estimatedMinutes - (done.get(t.id) ?? 0)));
  }
  const requiredMinutes = [...remaining.values()].reduce((a, b) => a + b, 0);
  for (let i = kept.length - 1; i >= 0; i--) {
    const k = kept[i];
    const rem = remaining.get(k.taskId) ?? 0;
    const keptForTask = kept.filter((x) => x.taskId === k.taskId).reduce((a, x) => a + minutes(x), 0);
    if (keptForTask > rem) kept.splice(i, 1);
  }
  for (const k of kept) remaining.set(k.taskId, (remaining.get(k.taskId) ?? 0) - minutes(k));

  const taskOcc: { start: number; end: number }[] = [...inProgress, ...kept].map((b) => ({
    start: b.start,
    end: b.end + profile.brk * MIN,
  }));
  const dayCount = new Map<string, number>();
  for (const b of [...inProgress, ...kept]) {
    const key = `${b.taskId}|${localDayStart(b.start, tz)}`;
    dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
  }

  const order = tasks
    .filter((t) => !t.isCompleted && (remaining.get(t.id) ?? 0) >= 15)
    .sort((a, b) => urgency(b, remaining.get(b.id)!, now) - urgency(a, remaining.get(a.id)!, now));

  const placed: SBlock[] = [];
  let unplacedMinutes = 0;
  for (const t of order) {
    let rem = remaining.get(t.id)!;
    let limit = horizonEnd;
    if (t.deadline) {
      if (t.deadline <= now) warnings.push(`${t.title} is past its deadline — scheduling it as soon as possible.`);
      else limit = Math.min(horizonEnd, t.deadline);
    }
    let guard = 0;
    while (rem >= 15 && guard++ < 40) {
      const len = Math.min(120, rem <= profile.focus + 15 ? rem : profile.focus);
      let best: { s: number; score: number } | null = null;
      for (let s = t0; s + len * MIN <= limit; s += STEP) {
        const e = s + len * MIN;
        if (busy.some((x) => overlap(s, e, x.start, x.end))) continue;
        if (taskOcc.some((x) => overlap(s, e + profile.brk * MIN, x.start, x.end))) continue;
        const lm = localMinutes(s, tz);
        const dayKey = `${t.id}|${localDayStart(s, tz)}`;
        let score = energyScore(t.energy, energyAt(lm));
        score -= ((s - t0) / DAY) * (t.deadline ? 0.9 : 0.4);
        if ((dayCount.get(dayKey) ?? 0) >= 2) score -= 4;
        if (lm >= 21 * 60) score -= 1;
        if (!best || score > best.score) best = { s, score };
      }
      if (!best) break;
      const e = best.s + len * MIN;
      placed.push({ taskId: t.id, start: best.s, end: e, reasons: reasonsFor(t, best.s, e, now, tz, profile) });
      taskOcc.push({ start: best.s, end: e + profile.brk * MIN });
      const dayKey = `${t.id}|${localDayStart(best.s, tz)}`;
      dayCount.set(dayKey, (dayCount.get(dayKey) ?? 0) + 1);
      rem -= len;
    }
    if (rem >= 15) {
      unplacedMinutes += rem;
      warnings.push(
        `Couldn't fit ${Math.round(rem)} min of ${t.title}${t.deadline ? " before its deadline" : " this week"}.`,
      );
    }
  }

  // Diff against previous future blocks
  const keyOf = (b: SBlock) => `${b.taskId}|${b.start}|${b.end}`;
  const keptKeys = new Set(kept.map(keyOf));
  const removed = future.filter((b) => !keptKeys.has(keyOf(b)));
  const moved: MovedItem[] = [];
  const added: AddedItem[] = [];
  const unscheduled: Proposal["unscheduled"] = [];
  const byTask = new Set([...removed, ...placed].map((b) => b.taskId));
  for (const id of byTask) {
    const t = taskMap.get(id);
    const rm = removed.filter((b) => b.taskId === id).sort((a, b) => a.start - b.start);
    const ad = placed.filter((b) => b.taskId === id).sort((a, b) => a.start - b.start);
    const n = Math.max(rm.length, ad.length);
    for (let i = 0; i < n; i++) {
      const from = rm[i];
      const to = ad[i];
      if (from && to && t) {
        const hit = busy.find((x) => overlap(from.start, from.end, x.start, x.end));
        const inScope = scope.has(localDayStart(from.start, tz));
        moved.push({
          taskId: id,
          title: t.title,
          category: t.category,
          from: { start: from.start, end: from.end },
          to: { start: to.start, end: to.end },
          cause: hit ? `Conflicts with ${hit.label}` : inScope ? "Your day changed" : "Rebalanced around higher-priority work",
          causeType: hit ? "conflict" : inScope ? "reschedule" : "rebalance",
          reasons: to.reasons,
          confidence: confidenceFor(t, to.start, now, tz),
        });
      } else if (to && t) {
        added.push({
          taskId: id,
          title: t.title,
          category: t.category,
          start: to.start,
          end: to.end,
          reasons: to.reasons,
          confidence: confidenceFor(t, to.start, now, tz),
        });
      } else if (from) {
        unscheduled.push({ taskId: id, title: t?.title ?? "Task", start: from.start, end: from.end });
      }
    }
  }

  // Available minutes in horizon
  let availableMinutes = 0;
  for (let s = t0; s < horizonEnd; s += STEP) {
    if (!busy.some((x) => overlap(s, s + STEP, x.start, x.end))) availableMinutes += 15;
  }
  const protectedItems = Array.from(
    new Set([
      "Sleep",
      "Dinner",
      ...events.filter((e) => e.isProtected && e.end > now && e.start < horizonEnd).map((e) => e.title),
    ]),
  );
  const fixedTitles = Array.from(new Set(events.filter((e) => e.isFixed && !e.isProtected).map((e) => e.title)));
  const all = [...inProgress, ...kept, ...placed].sort((a, b) => a.start - b.start);
  const scheduledMinutes = [...kept, ...placed].reduce((a, b) => a + minutes(b), 0);

  return {
    mode,
    blocks: all,
    moved,
    added,
    unscheduled,
    keptCount: kept.length,
    protectedItems,
    warnings,
    constraints: [
      `Fixed commitments${fixedTitles.length ? `: ${fixedTitles.slice(0, 4).join(", ")}` : ""}`,
      `Sleep ${profile.sleep}–${profile.wake}`,
      `Protected: ${protectedItems.join(", ")}`,
      "Deadlines & priority",
      "Energy profile (mornings & early evening = high focus)",
      `Focus sessions of ${profile.focus} min + ${profile.brk} min breaks`,
    ],
    workload: {
      requiredMinutes,
      availableMinutes,
      scheduledMinutes,
      unplacedMinutes,
      gapMinutes: Math.max(0, requiredMinutes - availableMinutes, unplacedMinutes),
      score: availableMinutes ? Math.min(100, Math.round((requiredMinutes / availableMinutes) * 100)) : 100,
    },
  };
}
