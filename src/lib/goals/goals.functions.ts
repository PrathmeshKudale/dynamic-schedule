// Goals module — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { must, type Ctx } from "../timeos.functions";
import { DAY } from "../time";
import { GOAL_CATEGORIES, buildRoadmap } from "./roadmap";

export const listGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const [g, m, t] = await Promise.all([
      must(ctx.supabase.from("goals").select("*").eq("user_id", ctx.userId).order("created_at")),
      must(ctx.supabase.from("goal_milestones").select("*").eq("user_id", ctx.userId).order("position")),
      must(ctx.supabase.from("tasks").select("id,is_completed,estimated_minutes,deadline").eq("user_id", ctx.userId)),
    ]);
    const tasks = new Map(((t as any).data ?? []).map((x: any) => [x.id, x]));
    return ((g as any).data ?? []).map((goal: any) => {
      const ms = ((m as any).data ?? [])
        .filter((x: any) => x.goal_id === goal.id)
        .map((x: any) => {
          const task: any = x.task_id ? tasks.get(x.task_id) : null;
          return { id: x.id, title: x.title, taskId: x.task_id as string | null, done: Boolean(task?.is_completed), minutes: task?.estimated_minutes ?? 0, deadline: task?.deadline ?? null };
        });
      const totalMin = ms.reduce((a: number, x: any) => a + x.minutes, 0);
      const doneMin = ms.filter((x: any) => x.done).reduce((a: number, x: any) => a + x.minutes, 0);
      return {
        id: goal.id as string,
        title: goal.title as string,
        category: goal.category as string,
        targetDate: goal.target_date as string | null,
        estimatedHours: goal.estimated_hours as number,
        completedHours: Math.round(doneMin / 6) / 10,
        progress: totalMin ? Math.round((doneMin / totalMin) * 100) : 0,
        milestones: ms as { id: string; title: string; taskId: string | null; done: boolean; minutes: number; deadline: string | null }[],
      };
    });
  });

async function insertGoal(ctx: Ctx, g: { title: string; category: string; estimatedHours: number; targetDate: number | null }, now: number) {
  const { data: goal } = await must(
    ctx.supabase
      .from("goals")
      .insert({ user_id: ctx.userId, title: g.title, category: g.category, estimated_hours: g.estimatedHours, target_date: g.targetDate ? new Date(g.targetDate).toISOString() : null })
      .select("*")
      .single(),
  );
  const plan = buildRoadmap(g, now);
  const { data: tasks } = await must(
    ctx.supabase
      .from("tasks")
      .insert(
        plan.map((p) => ({
          user_id: ctx.userId,
          title: p.title,
          category: g.category,
          priority: "MEDIUM",
          estimated_minutes: p.minutes,
          deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
          energy_requirement: p.energy,
        })),
      )
      .select("id,title"),
  );
  await must(
    ctx.supabase.from("goal_milestones").insert(
      plan.map((p, i) => ({ goal_id: (goal as any).id, user_id: ctx.userId, title: p.title.split(": ").slice(1).join(": ") || p.title, position: i, task_id: (tasks as any[])[i]?.id ?? null })),
    ),
  );
}

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(2).max(80),
        category: z.enum(GOAL_CATEGORIES),
        estimatedHours: z.number().int().min(1).max(200),
        targetDate: z.string().datetime().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await insertGoal(context as unknown as Ctx, { ...data, targetDate: data.targetDate ? Date.parse(data.targetDate) : null }, Date.now());
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), removeTasks: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.removeTasks) {
      const { data: ms } = await must(ctx.supabase.from("goal_milestones").select("task_id").eq("goal_id", data.id).eq("user_id", ctx.userId));
      const ids = ((ms as any[]) ?? []).map((m) => m.task_id).filter(Boolean);
      if (ids.length) await must(ctx.supabase.from("tasks").delete().in("id", ids).eq("user_id", ctx.userId));
    }
    await must(ctx.supabase.from("goals").delete().eq("id", data.id).eq("user_id", ctx.userId));
    return { ok: true };
  });

export const seedGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const now = Date.now();
    const samples = [
      { title: "Learn React", category: "LEARNING", estimatedHours: 12, targetDate: now + 30 * DAY },
      { title: "Improve DSA", category: "ACADEMIC", estimatedHours: 16, targetDate: now + 21 * DAY },
      { title: "Build Hackathon Project", category: "PROJECT", estimatedHours: 10, targetDate: now + 10 * DAY },
    ];
    for (const s of samples) await insertGoal(ctx, s, now);
    return { ok: true };
  });
