// Google Calendar module — encrypted per-user connection key storage (server-only).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env["APP_USER_CONNECTION_KEY_SECRET"];
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return Buffer.from(raw, "base64");
}
function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
function decrypt(stored: string) {
  const buf = Buffer.from(stored, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function saveKey(userId: string, connectorId: string, connectionKey: string) {
  const { error } = await (await admin())
    .from("app_user_connections")
    .upsert(
      { user_id: userId, connector_id: connectorId, connection_key_ciphertext: encrypt(connectionKey), updated_at: new Date().toISOString() },
      { onConflict: "user_id,connector_id" },
    );
  if (error) throw error;
}

export async function getConnection(userId: string, connectorId: string) {
  const { data, error } = await (await admin())
    .from("app_user_connections")
    .select("connection_key_ciphertext,last_synced_at")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  return data ? { key: decrypt(data.connection_key_ciphertext), lastSyncedAt: data.last_synced_at as string | null } : null;
}

export async function markSynced(userId: string, connectorId: string) {
  await (await admin()).from("app_user_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId).eq("connector_id", connectorId);
}

export async function deleteKey(userId: string, connectorId: string) {
  const { error } = await (await admin()).from("app_user_connections").delete().eq("user_id", userId).eq("connector_id", connectorId);
  if (error) throw error;
}
