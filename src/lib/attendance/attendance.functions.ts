// Attendance module — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { must, type Ctx } from "../timeos.functions";

export const listAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const r = await must(ctx.supabase.from("attendance_subjects").select("*").eq("user_id", ctx.userId).order("subject"));
    return ((r as any).data ?? []) as { id: string; subject: string; attended: number; total: number; target: number }[];
  });

const Input = z
  .object({
    id: z.string().uuid().optional(),
    subject: z.string().trim().min(1).max(60),
    attended: z.number().int().min(0).max(1000),
    total: z.number().int().min(0).max(1000),
    target: z.number().int().min(1).max(100),
  })
  .refine((v) => v.attended <= v.total, { message: "Attended can't exceed total classes" });

export const saveSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const row = { user_id: ctx.userId, subject: data.subject, attended: data.attended, total: data.total, target: data.target, updated_at: new Date().toISOString() };
    if (data.id) await must(ctx.supabase.from("attendance_subjects").update(row).eq("id", data.id).eq("user_id", ctx.userId));
    else await must(ctx.supabase.from("attendance_subjects").insert(row));
    return { ok: true };
  });

export const markClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), present: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: row } = await must(ctx.supabase.from("attendance_subjects").select("*").eq("id", data.id).eq("user_id", ctx.userId).single());
    const r = row as any;
    await must(
      ctx.supabase
        .from("attendance_subjects")
        .update({ attended: r.attended + (data.present ? 1 : 0), total: r.total + 1, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", ctx.userId),
    );
    return { ok: true };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await must(ctx.supabase.from("attendance_subjects").delete().eq("id", data.id).eq("user_id", ctx.userId));
    return { ok: true };
  });

export const seedAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const rows = [
      ["DSA", 41, 50],
      ["DBMS", 34, 50],
      ["Web Development", 29, 32],
      ["Mathematics", 38, 50],
      ["Computer Networks", 36, 44],
    ].map(([subject, attended, total]) => ({ user_id: ctx.userId, subject, attended, total, target: 75 }));
    await must(ctx.supabase.from("attendance_subjects").insert(rows));
    return { ok: true };
  });
