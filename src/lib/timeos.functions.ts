import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { schedule, type Mode, type Proposal, type SBlock, type SEvent, type STask } from "./scheduler";
import { CATEGORIES, PRIORITIES, ParsedSchema, type Parsed } from "./parse";
import { DAY, localDateTime, localDayStart } from "./time";
import {
  SCENARIOS,
  dbmsTask,
  festivalEvent,
  lectureEvent,
  overloadTasks,
  seedEvents,
  seedTasks,
  type SeedEvent,
  type SeedTask,
} from "./demo-seed";

export type Ctx = { supabase: any; userId: string };
export const TZ = z.number().int().min(-900).max(900);

export async function loadAll(ctx: Ctx, now: number) {
  const from = new Date(now - 2 * DAY).toISOString();
  const to = new Date(now + 15 * DAY).toISOString();
  const [p, t, e, b] = await Promise.all([
    ctx.supabase.from("profiles").select("*").eq("user_id", ctx.userId).maybeSingle(),
    ctx.supabase.from("tasks").select("*").eq("user_id", ctx.userId).order("created_at"),
    ctx.supabase.from("events").select("*").eq("user_id", ctx.userId).gte("end_time", from).lte("start_time", to).order("start_time"),
    ctx.supabase.from("schedule_blocks").select("*").eq("user_id", ctx.userId).gte("end_time", from).order("start_time"),
  ]);
  for (const r of [p, t, e, b]) if (r.error) throw new Error(r.error.message);
  return { profile: p.data, tasks: t.data ?? [], events: e.data ?? [], blocks: b.data ?? [] };
}

export function toSched(all: Awaited<ReturnType<typeof loadAll>>) {
  const tasks: STask[] = all.tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    estimatedMinutes: t.estimated_minutes,
    deadline: t.deadline ? Date.parse(t.deadline) : null,
    energy: t.energy_requirement,
    isCompleted: t.is_completed,
  }));
  const events: SEvent[] = all.events.map((e: any) => ({
    id: e.id,
    title: e.title,
    start: Date.parse(e.start_time),
    end: Date.parse(e.end_time),
    category: e.category,
    isFixed: e.is_fixed,
    isProtected: e.is_protected,
  }));
  const blocks: SBlock[] = all.blocks.map((b: any) => ({
    taskId: b.task_id,
    start: Date.parse(b.start_time),
    end: Date.parse(b.end_time),
    reasons: Array.isArray(b.reasons) ? b.reasons : [],
  }));
  const pr = all.profile;
  const profile = {
    wake: pr?.wake_time ?? "07:00",
    sleep: pr?.sleep_time ?? "23:00",
    focus: pr?.focus_minutes ?? 45,
    brk: pr?.break_minutes ?? 10,
  };
  return { tasks, events, blocks, profile };
}

export async function writeBlocks(ctx: Ctx, blocks: SBlock[], now: number) {
  const del = await ctx.supabase.from("schedule_blocks").delete().eq("user_id", ctx.userId).gt("end_time", new Date(now).toISOString());
  if (del.error) throw new Error(del.error.message);
  if (!blocks.length) return;
  const ins = await ctx.supabase.from("schedule_blocks").insert(
    blocks.map((b) => ({
      user_id: ctx.userId,
      task_id: b.taskId,
      start_time: new Date(b.start).toISOString(),
      end_time: new Date(b.end).toISOString(),
      reasons: b.reasons as unknown as Json,
    })),
  );
  if (ins.error) throw new Error(ins.error.message);
}

async function createProposal(ctx: Ctx, opts: { tz: number; mode: Mode; kind: string; trigger?: string | null; scopeDays?: number[] }) {
  const now = Date.now();
  const all = await loadAll(ctx, now);
  const s = toSched(all);
  const proposal = schedule({ ...s, now, tz: opts.tz, mode: opts.mode, scopeDays: opts.scopeDays });
  await ctx.supabase.from("schedule_changes").update({ status: "CANCELLED" }).eq("user_id", ctx.userId).eq("status", "PENDING");
  const { data, error } = await ctx.supabase
    .from("schedule_changes")
    .insert({ user_id: ctx.userId, kind: opts.kind, trigger_text: opts.trigger ?? null, proposal: proposal as unknown as Json })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function seedRowsEvents(userId: string, evs: SeedEvent[]) {
  return evs.map((e) => ({
    user_id: userId,
    title: e.title,
    description: e.description ?? null,
    start_time: new Date(e.start).toISOString(),
    end_time: new Date(e.end).toISOString(),
    category: e.category,
    source: e.source,
    is_fixed: e.isFixed,
    is_protected: e.isProtected,
  }));
}
function seedRowsTasks(userId: string, ts: SeedTask[]) {
  return ts.map((t) => ({
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    category: t.category,
    priority: t.priority,
    estimated_minutes: t.estimatedMinutes,
    deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
    energy_requirement: t.energy,
  }));
}

export async function must<T extends { error: any }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r as T;
}

async function generateAndSave(ctx: Ctx, tz: number) {
  const now = Date.now();
  const s = toSched(await loadAll(ctx, now));
  const p = schedule({ ...s, now, tz, mode: "generate" });
  await writeBlocks(ctx, p.blocks, now);
}

// ---------------- Queries ----------------
export const getState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ }).parse(d))
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const now = Date.now();
    const all = await loadAll(ctx, now);
    const changes = await must(
      ctx.supabase.from("schedule_changes").select("*").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(8),
    );
    const list = (changes as any).data ?? [];
    return {
      ...all,
      pending: list.find((c: any) => c.status === "PENDING") ?? null,
      history: list.filter((c: any) => c.status === "APPLIED").slice(0, 5),
      aiConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
      now,
    };
  });

// ---------------- Demo ----------------
export const loadDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, scenario: z.enum(SCENARIOS) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { tz, scenario } = data;
    const now = Date.now();
    const uid = ctx.userId;
    await must(ctx.supabase.from("schedule_changes").delete().eq("user_id", uid));
    await must(ctx.supabase.from("schedule_blocks").delete().eq("user_id", uid));
    await must(ctx.supabase.from("tasks").delete().eq("user_id", uid));
    await must(ctx.supabase.from("events").delete().eq("user_id", uid));
    await must(
      ctx.supabase.from("profiles").upsert({
        user_id: uid,
        name: "Alex",
        course: "B.Tech Computer Science",
        year: "2nd Year",
        wake_time: "07:00",
        sleep_time: "23:00",
        focus_minutes: 45,
        break_minutes: 10,
        demo_loaded: true,
      }),
    );
    await must(ctx.supabase.from("events").insert(seedRowsEvents(uid, seedEvents(now, tz))));
    const base = seedTasks(now, tz);
    if (scenario === "overloaded") base.push(...overloadTasks(now, tz));
    if (scenario === "festival" || scenario === "lecture") base.push(dbmsTask(now, tz));
    await must(ctx.supabase.from("tasks").insert(seedRowsTasks(uid, base)));
    await generateAndSave(ctx, tz);
    if (scenario === "deadline") {
      await must(ctx.supabase.from("tasks").insert(seedRowsTasks(uid, [dbmsTask(now, tz)])));
    }
    if (scenario === "festival" || scenario === "lecture") {
      await must(ctx.supabase.from("events").insert(seedRowsEvents(uid, [festivalEvent(now, tz)])));
    }
    if (scenario === "lecture") {
      const s = toSched(await loadAll(ctx, now));
      const p = schedule({ ...s, now, tz, mode: "optimize" });
      await writeBlocks(ctx, p.blocks, now);
      await must(ctx.supabase.from("events").insert(seedRowsEvents(uid, [lectureEvent(now, tz)])));
    }
    return { ok: true };
  });

export const demoAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, action: z.enum(["deadline", "festival", "lecture"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const now = Date.now();
    if (data.action === "deadline") {
      await must(ctx.supabase.from("tasks").insert(seedRowsTasks(ctx.userId, [dbmsTask(now, data.tz)])));
    } else {
      const ev = data.action === "festival" ? festivalEvent(now, data.tz) : lectureEvent(now, data.tz);
      await must(ctx.supabase.from("events").insert(seedRowsEvents(ctx.userId, [ev])));
    }
    return { ok: true };
  });

export const startFresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        wake: z.string().regex(/^\d{2}:\d{2}$/),
        sleep: z.string().regex(/^\d{2}:\d{2}$/),
        focus: z.number().int().min(15).max(120),
        brk: z.number().int().min(5).max(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(
      ctx.supabase.from("profiles").upsert({
        user_id: ctx.userId,
        name: data.name,
        wake_time: data.wake,
        sleep_time: data.sleep,
        focus_minutes: data.focus,
        break_minutes: data.brk,
      }),
    );
    return { ok: true };
  });

// ---------------- Tasks / Events CRUD ----------------
const TaskInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  estimatedMinutes: z.number().int().min(15).max(3000),
  deadline: z.string().datetime().nullable(),
  energy: z.enum(["LOW", "MEDIUM", "HIGH"]),
  isCompleted: z.boolean().optional(),
});

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TaskInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const row = {
      user_id: ctx.userId,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      priority: data.priority,
      estimated_minutes: data.estimatedMinutes,
      deadline: data.deadline,
      energy_requirement: data.energy,
      ...(data.isCompleted !== undefined ? { is_completed: data.isCompleted, status: data.isCompleted ? "DONE" : "TODO" } : {}),
      updated_at: new Date().toISOString(),
    };
    if (data.id) await must(ctx.supabase.from("tasks").update(row).eq("id", data.id).eq("user_id", ctx.userId));
    else await must(ctx.supabase.from("tasks").insert(row));
    return { ok: true };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(
      ctx.supabase
        .from("tasks")
        .update({ is_completed: data.done, status: data.done ? "DONE" : "TODO", updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", ctx.userId),
    );
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(ctx.supabase.from("tasks").delete().eq("id", data.id).eq("user_id", ctx.userId));
    return { ok: true };
  });

const EventInput = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().max(500).nullable().optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    category: z.enum(CATEGORIES),
    isProtected: z.boolean(),
  })
  .refine((e) => Date.parse(e.end) > Date.parse(e.start), { message: "End must be after start" });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const row = {
      user_id: ctx.userId,
      title: data.title,
      description: data.description ?? null,
      start_time: data.start,
      end_time: data.end,
      category: data.category,
      is_protected: data.isProtected,
      is_fixed: true,
      updated_at: new Date().toISOString(),
    };
    if (data.id) await must(ctx.supabase.from("events").update(row).eq("id", data.id).eq("user_id", ctx.userId));
    else await must(ctx.supabase.from("events").insert({ ...row, source: "MANUAL" }));
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(ctx.supabase.from("events").delete().eq("id", data.id).eq("user_id", ctx.userId));
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        wake: z.string().regex(/^\d{2}:\d{2}$/),
        sleep: z.string().regex(/^\d{2}:\d{2}$/),
        focus: z.number().int().min(15).max(120),
        brk: z.number().int().min(5).max(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(
      ctx.supabase.from("profiles").upsert({
        user_id: ctx.userId,
        name: data.name,
        wake_time: data.wake,
        sleep_time: data.sleep,
        focus_minutes: data.focus,
        break_minutes: data.brk,
        updated_at: new Date().toISOString(),
      }),
    );
    return { ok: true };
  });

// ---------------- AI ----------------
export const parseInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, text: z.string().trim().min(3).max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const { parseText } = await import("./ai.server");
    return parseText(data.text, Date.now(), data.tz);
  });

async function commit(ctx: Ctx, parsed: Parsed, tz: number) {
  const evRows = parsed.events.map((e) => {
    const start = localDateTime(e.date, e.start, tz);
    let end = localDateTime(e.date, e.end, tz);
    if (end <= start) end = start + 60 * 60_000;
    return {
      user_id: ctx.userId,
      title: e.title,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      category: e.category,
      source: "AI",
      is_fixed: true,
      is_protected: e.isProtected,
    };
  });
  const tRows = parsed.tasks.map((t) => ({
    user_id: ctx.userId,
    title: t.title,
    category: t.category,
    priority: t.priority,
    estimated_minutes: t.estimatedMinutes,
    deadline: t.deadlineDate ? new Date(localDateTime(t.deadlineDate, "23:59", tz)).toISOString() : null,
    energy_requirement: t.energy,
  }));
  if (evRows.length) await must(ctx.supabase.from("events").insert(evRows));
  if (tRows.length) await must(ctx.supabase.from("tasks").insert(tRows));
  return evRows.map((e) => localDayStart(Date.parse(e.start_time), tz));
}

export const commitParsed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, parsed: ParsedSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    // Ensure the user has a profile
    await ctx.supabase.from("profiles").upsert({ user_id: ctx.userId }, { onConflict: "user_id", ignoreDuplicates: true });
    await commit(ctx, data.parsed, data.tz);
    return { ok: true };
  });

export const proposeSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tz: TZ, mode: z.enum(["generate", "optimize", "reschedule"]), trigger: z.string().max(500).nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const scope = data.mode === "reschedule" ? [localDayStart(Date.now(), data.tz), localDayStart(Date.now(), data.tz) + DAY] : undefined;
    return createProposal(ctx, { tz: data.tz, mode: data.mode, kind: data.mode.toUpperCase(), trigger: data.trigger, scopeDays: scope });
  });

export const myDayChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, reason: z.string().max(40), text: z.string().trim().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const now = Date.now();
    const today = localDayStart(now, data.tz);
    const scope = new Set<number>([today]);
    let provider = "demo";
    if (data.text.length >= 3) {
      const { parseText } = await import("./ai.server");
      const r = await parseText(data.text, now, data.tz);
      provider = r.provider;
      const days = await commit(ctx, r.parsed, data.tz);
      days.forEach((d) => scope.add(d));
    }
    if (data.reason === "tired") {
      // Protect the rest of today as rest time; remaining work moves to later days.
      const end = today + DAY - 1;
      if (end > now + 15 * 60_000) {
        await must(
          ctx.supabase.from("events").insert({
            user_id: ctx.userId,
            title: "Rest — feeling tired",
            start_time: new Date(Math.ceil(now / 900_000) * 900_000).toISOString(),
            end_time: new Date(Math.min(end, today + 23 * 3_600_000)).toISOString(),
            category: "PERSONAL",
            source: "AI",
            is_fixed: true,
            is_protected: true,
          }),
        );
      }
    }
    const change = await createProposal(ctx, {
      tz: data.tz,
      mode: "reschedule",
      kind: "RESCHEDULE",
      trigger: data.text || data.reason,
      scopeDays: [...scope],
    });
    return { change, provider };
  });

export const applyChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: row, error } = await ctx.supabase
      .from("schedule_changes")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (error || !row) throw new Error("Proposal not found");
    if (row.status !== "PENDING") throw new Error("This proposal is no longer pending");
    const p = row.proposal as unknown as Proposal;
    const now = Date.now();
    // Re-validate: task ids must still exist
    const { data: tasks } = await ctx.supabase.from("tasks").select("id").eq("user_id", ctx.userId);
    const ids = new Set((tasks ?? []).map((t: any) => t.id));
    await writeBlocks(ctx, p.blocks.filter((b) => ids.has(b.taskId) && b.end > now), now);
    await must(
      ctx.supabase.from("schedule_changes").update({ status: "APPLIED", applied_at: new Date().toISOString() }).eq("id", data.id),
    );
    return { ok: true };
  });

export const cancelChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(ctx.supabase.from("schedule_changes").update({ status: "CANCELLED" }).eq("id", data.id).eq("user_id", ctx.userId));
    return { ok: true };
  });

export const explainChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), tz: TZ }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: row } = await ctx.supabase
      .from("schedule_changes")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!row) throw new Error("Change not found");
    if (row.narrative) return { text: row.narrative as string, provider: "cached" };
    const { explainProposal } = await import("./ai.server");
    const r = await explainProposal(row.proposal as unknown as Proposal, data.tz, row.trigger_text);
    await ctx.supabase.from("schedule_changes").update({ narrative: r.text }).eq("id", data.id);
    return r;
  });
