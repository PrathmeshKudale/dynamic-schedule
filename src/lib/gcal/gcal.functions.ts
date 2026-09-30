// Google Calendar module — per-user connect, sync (read-only import) and disconnect.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { must, type Ctx } from "../timeos.functions";
import { DAY } from "../time";

const GATEWAY = "https://connector-gateway.lovable.dev";
const CONNECTOR = "google_calendar";
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const gcalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = Boolean(process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"]);
    if (!configured) return { configured, connected: false, lastSyncedAt: null as string | null };
    const { getConnection } = await import("./connections.server");
    const c = await getConnection((context as unknown as Ctx).userId, CONNECTOR);
    return { configured, connected: Boolean(c), lastSyncedAt: c?.lastSyncedAt ?? null };
  });

export const gcalStartConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("Google Calendar isn't configured for this app yet.");
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL("/oauth/google-calendar/return", sandboxHost ? `https://${sandboxHost}` : url.origin).toString();
    const userId = (context as unknown as Ctx).userId;
    const { getConnection } = await import("./connections.server");
    const existing = await getConnection(userId, CONNECTOR);
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY,
      connectorId: CONNECTOR,
      appUserId: userId,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: existing?.key,
      credentialsConfiguration: { scopes: SCOPES },
    });
    return { authorizationUrl };
  });

export const gcalComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY, data.code);
    if (connectorId !== CONNECTOR) throw new Error("OAuth completion returned the wrong connector");
    const { saveKey } = await import("./connections.server");
    await saveKey((context as unknown as Ctx).userId, CONNECTOR, connectionAPIKey);
    return { ok: true };
  });

export const gcalSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { getConnection, markSynced } = await import("./connections.server");
    const c = await getConnection(ctx.userId, CONNECTOR);
    if (!c) return { ok: false as const, reconnectRequired: false, imported: 0 };
    const { callAsAppUser, appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
    const now = Date.now();
    const q = new URLSearchParams({
      timeMin: new Date(now - DAY).toISOString(),
      timeMax: new Date(now + 14 * DAY).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY, connectionAPIKey: c.key, connectorId: CONNECTOR, path: `/calendar/v3/calendars/primary/events?${q}`, requiredScopes: SCOPES });
    if (await appUserReconnectRequired(res)) return { ok: false as const, reconnectRequired: true, imported: 0 };
    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Calendar sync failed [${res.status}]: ${body}`);
      throw new Error(`Google Calendar sync failed (${res.status}). Your TimeOS schedule was not changed.`);
    }
    const json = (await res.json()) as { items?: any[] };
    const rows = (json.items ?? [])
      .filter((e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime && e.transparency !== "transparent")
      .map((e) => ({
        user_id: ctx.userId,
        title: String(e.summary ?? "Busy").slice(0, 120),
        description: e.location ? String(e.location).slice(0, 500) : null,
        start_time: new Date(e.start.dateTime).toISOString(),
        end_time: new Date(e.end.dateTime).toISOString(),
        category: "OTHER",
        source: "GOOGLE",
        is_fixed: true,
        is_protected: false,
      }));
    // Replace previously imported Google events in this window (idempotent sync).
    await must(ctx.supabase.from("events").delete().eq("user_id", ctx.userId).eq("source", "GOOGLE").gte("end_time", new Date(now - DAY).toISOString()));
    if (rows.length) await must(ctx.supabase.from("events").insert(rows));
    await markSynced(ctx.userId, CONNECTOR);
    return { ok: true as const, reconnectRequired: false, imported: rows.length };
  });

export const gcalDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ removeEvents: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { getConnection, deleteKey } = await import("./connections.server");
    const c = await getConnection(ctx.userId, CONNECTOR);
    if (c) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      await disconnectAppUser({ gatewayBaseUrl: GATEWAY, connectionAPIKey: c.key, connectorId: CONNECTOR });
      await deleteKey(ctx.userId, CONNECTOR);
    }
    if (data.removeEvents) await must(ctx.supabase.from("events").delete().eq("user_id", ctx.userId).eq("source", "GOOGLE"));
    return { ok: true };
  });
