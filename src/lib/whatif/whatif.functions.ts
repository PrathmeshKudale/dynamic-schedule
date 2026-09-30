// What-If module — simulate a hypothetical event without saving, then optionally apply.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { schedule } from "../scheduler";
import { CATEGORIES } from "../parse";
import { TZ, loadAll, must, toSched, writeBlocks, type Ctx } from "../timeos.functions";

const Hypo = z
  .object({
    tz: TZ,
    title: z.string().trim().min(1).max(120),
    start: z.string().datetime(),
    end: z.string().datetime(),
    category: z.enum(CATEGORIES),
    isProtected: z.boolean(),
  })
  .refine((e) => Date.parse(e.end) > Date.parse(e.start), { message: "End must be after start" });

async function simulate(ctx: Ctx, h: z.infer<typeof Hypo>) {
  const now = Date.now();
  const s = toSched(await loadAll(ctx, now));
  const ev = { id: "what-if", title: h.title, start: Date.parse(h.start), end: Date.parse(h.end), category: h.category, isFixed: true, isProtected: h.isProtected };
  const proposal = schedule({ ...s, events: [...s.events, ev], now, tz: h.tz, mode: "optimize" });
  const titles = new Map(s.tasks.map((t) => [t.id, t.title]));
  const before = s.blocks.filter((b) => b.end > now).map((b) => ({ ...b, title: titles.get(b.taskId) ?? "Task" }));
  const after = proposal.blocks.map((b) => ({ ...b, title: titles.get(b.taskId) ?? "Task" }));
  return { proposal, before, after, event: ev, now };
}

export const previewWhatIf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Hypo.parse(d))
  .handler(async ({ data, context }) => simulate(context as unknown as Ctx, data));

export const applyWhatIf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Hypo.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { proposal, now } = await simulate(ctx, data);
    await must(
      ctx.supabase.from("events").insert({
        user_id: ctx.userId,
        title: data.title,
        start_time: data.start,
        end_time: data.end,
        category: data.category,
        source: "MANUAL",
        is_fixed: true,
        is_protected: data.isProtected,
      }),
    );
    await writeBlocks(ctx, proposal.blocks, now);
    await ctx.supabase.from("schedule_changes").update({ status: "CANCELLED" }).eq("user_id", ctx.userId).eq("status", "PENDING");
    await must(
      ctx.supabase.from("schedule_changes").insert({
        user_id: ctx.userId,
        kind: "WHAT_IF",
        trigger_text: `What if: ${data.title}`,
        proposal: proposal as unknown as Json,
        status: "APPLIED",
        applied_at: new Date().toISOString(),
      }),
    );
    return { ok: true };
  });
