import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gcalComplete, gcalDisconnect, gcalStartConnect, gcalStatus, gcalSync } from "@/lib/gcal/gcal.functions";

function waitForCode(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    const cleanup = () => { window.removeEventListener("message", onMsg); window.clearInterval(poll); };
    const onMsg = (e: MessageEvent) => {
      const t = e.data?.type;
      if (e.origin !== window.location.origin || e.source !== popup || e.data?.connectorId !== "google_calendar") return;
      if (t !== "appUserConnectorOAuthComplete" && t !== "appUserConnectorOAuthFailed") return;
      cleanup();
      if (t === "appUserConnectorOAuthComplete") resolve(typeof e.data?.code === "string" ? e.data.code : null);
      else reject(new Error("Google sign-in failed."));
    };
    window.addEventListener("message", onMsg);
    const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("The Google window was closed before finishing.")); } }, 500);
  });
}

function ago(iso: string | null) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

export function GoogleCalendarCard() {
  const qc = useQueryClient();
  const statusFn = useServerFn(gcalStatus);
  const startFn = useServerFn(gcalStartConnect);
  const completeFn = useServerFn(gcalComplete);
  const syncFn = useServerFn(gcalSync);
  const disconnectFn = useServerFn(gcalDisconnect);
  const [reconnect, setReconnect] = useState(false);
  const status = useQuery({ queryKey: ["gcal"], queryFn: () => statusFn() });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["gcal"] }), qc.invalidateQueries({ queryKey: ["timeos"] })]);

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: async (r) => {
      if (r.reconnectRequired) { setReconnect(true); toast.error("Your Google Calendar access needs to be renewed."); return; }
      setReconnect(false);
      await refresh();
      toast.success(`Synced ${r.imported} Google event${r.imported === 1 ? "" : "s"} as fixed commitments`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const connect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "timeos-google", "width=600,height=720");
      if (!popup) throw new Error("Popup blocked. Allow popups and try again.");
      let code: string | null;
      try {
        const { authorizationUrl } = await startFn();
        const done = waitForCode(popup);
        popup.location.href = authorizationUrl;
        code = await done;
      } catch (e) { popup.close(); throw e; }
      if (code) await completeFn({ data: { code } });
    },
    onSuccess: async () => {
      const wasReconnect = reconnect || status.data?.connected;
      setReconnect(false);
      await refresh();
      toast.success(wasReconnect ? "Reconnected to Google Calendar" : "Google Calendar connected");
      sync.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectFn({ data: { removeEvents: true } }),
    onSuccess: async () => { await refresh(); toast.success("Google Calendar disconnected"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;
  const busy = connect.isPending || sync.isPending || disconnect.isPending;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-medium">
          Google Calendar
          {s?.connected && !reconnect && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Connected</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          {status.isLoading ? "Checking…" : reconnect ? "Your Google Calendar access needs to be renewed."
            : s?.connected ? `Imports your next 14 days as fixed events (read-only). Last synced ${ago(s.lastSyncedAt)}.`
            : s?.configured ? "Import your Google events so TimeOS plans around them. Read-only — TimeOS never edits your Google Calendar."
            : "Google Calendar isn't set up for this app yet."}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {s?.connected && !reconnect ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => sync.mutate()}>
              {sync.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}Sync now
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => disconnect.mutate()}>Disconnect</Button>
          </>
        ) : (
          <Button size="sm" disabled={busy || !s?.configured} onClick={() => connect.mutate()}>
            {connect.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{reconnect ? "Reconnect Google" : "Connect Google"}
          </Button>
        )}
      </div>
    </div>
  );
}
