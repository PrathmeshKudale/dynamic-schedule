// Assistant module — "Ask TimeOS" chat grounded in the user's stored schedule.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TZ, loadAll, toSched, type Ctx } from "../timeos.functions";

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) });

export const askTimeOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tz: TZ, messages: z.array(Msg).min(1).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const now = Date.now();
    const s = toSched(await loadAll(ctx, now));
    const { answer } = await import("./assistant.server");
    return answer(s, data.messages, now, data.tz);
  });
