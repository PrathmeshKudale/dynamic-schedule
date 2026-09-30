// Goals module — deterministic roadmap generator (Goal -> Milestones -> Tasks).
import { DAY } from "../time";

export const GOAL_CATEGORIES = ["ACADEMIC", "LEARNING", "HEALTH", "PROJECT", "PERSONAL"] as const;

const STAGES: Record<string, string[]> = {
  LEARNING: ["Foundations", "Core concepts practice", "Build a mini project", "Review & polish"],
  ACADEMIC: ["Cover the syllabus", "Solve practice problems", "Mock test", "Revise weak topics"],
  PROJECT: ["Plan & scope", "Build core features", "Test & fix", "Polish & present"],
  HEALTH: ["Set a baseline", "Build the habit", "Increase intensity", "Check progress"],
  PERSONAL: ["Get started", "Keep momentum", "Push further", "Wrap up"],
};

export interface PlannedMilestone {
  title: string;
  minutes: number;
  deadline: number | null;
  energy: "LOW" | "MEDIUM" | "HIGH";
}

export function buildRoadmap(goal: { title: string; category: string; estimatedHours: number; targetDate: number | null }, now: number): PlannedMilestone[] {
  const stages = STAGES[goal.category] ?? STAGES["PERSONAL"]!;
  const total = Math.max(1, goal.estimatedHours) * 60;
  const per = Math.min(3000, Math.max(30, Math.round(total / stages.length / 15) * 15));
  const span = goal.targetDate ? Math.max(goal.targetDate - now, stages.length * DAY) : null;
  return stages.map((s, i) => ({
    title: `${goal.title}: ${s}`,
    minutes: per,
    deadline: span ? now + Math.round((span * (i + 1)) / stages.length) : null,
    energy: i === stages.length - 1 ? "MEDIUM" : "HIGH",
  }));
}
