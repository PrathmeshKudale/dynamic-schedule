import { DAY, MIN, localDayStart, localDow, nextDow, WEEKDAYS } from "./time";

export const SCENARIOS = ["normal", "deadline", "festival", "lecture", "overloaded"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export interface SeedEvent {
  title: string;
  description?: string;
  start: number;
  end: number;
  category: string;
  source: string;
  isFixed: boolean;
  isProtected: boolean;
}
export interface SeedTask {
  title: string;
  description?: string;
  category: string;
  priority: string;
  estimatedMinutes: number;
  deadline: number | null;
  energy: string;
}

const at = (ds: number, h: number, m = 0) => ds + (h * 60 + m) * MIN;

export function festivalDay(now: number, tz: number) {
  return localDayStart(now, tz) + 2 * DAY;
}
export function festivalWeekday(now: number, tz: number) {
  return WEEKDAYS[localDow(festivalDay(now, tz), tz)];
}

export function seedEvents(now: number, tz: number): SeedEvent[] {
  const base = localDayStart(now, tz);
  const out: SeedEvent[] = [];
  for (let i = 0; i <= 8; i++) {
    const ds = base + i * DAY;
    const dow = localDow(ds, tz);
    if (dow >= 1 && dow <= 5) {
      out.push({
        title: "College",
        description: "DSA · DBMS · Web Dev · Mathematics · Computer Networks",
        start: at(ds, 9),
        end: at(ds, 14),
        category: "ACADEMIC",
        source: "TIMETABLE",
        isFixed: true,
        isProtected: false,
      });
    }
    if (dow === 1 || dow === 3 || dow === 5) {
      out.push({ title: "Gym", start: at(ds, 7, 15), end: at(ds, 8, 15), category: "HEALTH", source: "MANUAL", isFixed: true, isProtected: true });
    }
    if (dow === 6) {
      out.push({ title: "Friends", description: "Dinner & movie", start: at(ds, 19), end: at(ds, 22), category: "SOCIAL", source: "MANUAL", isFixed: true, isProtected: true });
    }
    if (dow === 0) {
      out.push({ title: "Weekend trip", description: "Day trip to the lake", start: at(ds, 9), end: at(ds, 18), category: "TRAVEL", source: "MANUAL", isFixed: true, isProtected: false });
    }
  }
  return out;
}

export function seedTasks(now: number, tz: number): SeedTask[] {
  return [
    {
      title: "DSA Test Preparation",
      description: "Trees, graphs, DP — 5 chapters",
      category: "ACADEMIC",
      priority: "HIGH",
      estimatedMinutes: 300,
      deadline: at(nextDow(now, tz, 1, 2), 9),
      energy: "HIGH",
    },
    {
      title: "Hackathon Development",
      description: "TimeOS MVP build",
      category: "PROJECT",
      priority: "HIGH",
      estimatedMinutes: 240,
      deadline: at(nextDow(now, tz, 4, 2), 23),
      energy: "HIGH",
    },
    {
      title: "React Practice",
      description: "Hooks & state management module",
      category: "LEARNING",
      priority: "MEDIUM",
      estimatedMinutes: 180,
      deadline: at(localDayStart(now, tz) + 6 * DAY, 23),
      energy: "MEDIUM",
    },
  ];
}

export function dbmsTask(now: number, tz: number): SeedTask {
  return {
    title: "DBMS Assignment",
    description: "Normalization & SQL queries",
    category: "ACADEMIC",
    priority: "HIGH",
    estimatedMinutes: 120,
    deadline: at(localDayStart(now, tz) + DAY, 23, 59),
    energy: "HIGH",
  };
}

export function festivalEvent(now: number, tz: number): SeedEvent {
  const ds = festivalDay(now, tz);
  return { title: "College Festival", start: at(ds, 17), end: at(ds, 22), category: "SOCIAL", source: "MANUAL", isFixed: true, isProtected: false };
}

export function lectureEvent(now: number, tz: number): SeedEvent {
  const ds = localDayStart(now, tz) + DAY;
  return { title: "Extra Lecture", description: "DSA — makeup class", start: at(ds, 16), end: at(ds, 17), category: "ACADEMIC", source: "MANUAL", isFixed: true, isProtected: false };
}

export function overloadTasks(now: number, tz: number): SeedTask[] {
  const base = localDayStart(now, tz);
  return [
    { title: "Computer Networks Revision", category: "ACADEMIC", priority: "HIGH", estimatedMinutes: 480, deadline: at(base + 2 * DAY, 23), energy: "MEDIUM" },
    { title: "Mathematics Problem Set", category: "ACADEMIC", priority: "HIGH", estimatedMinutes: 360, deadline: at(base + 2 * DAY, 23), energy: "HIGH" },
  ];
}
