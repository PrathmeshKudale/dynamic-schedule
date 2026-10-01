import { createServerFn } from "@tanstack/react-start";

// Public demo account — intentionally shared, holds only seeded demo data.
export const DEMO_EMAIL = "alex.demo@timeos.ai";
export const DEMO_PASSWORD = "TimeOS-Demo-2026!";

export const ensureDemoUser = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Alex (Demo)" },
  });
  if (error && !/already|registered|exists/i.test(error.message)) {
    throw new Error("Could not prepare the demo account");
  }
  return { ok: true };
});
