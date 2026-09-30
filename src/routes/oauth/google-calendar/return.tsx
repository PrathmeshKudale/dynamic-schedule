import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  ssr: false,
  head: () => ({ meta: [{ title: "Connecting Google Calendar — TimeOS" }, { name: "robots", content: "noindex" }] }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", code?: string) => {
      window.opener?.postMessage({ type, connectorId: "google_calendar", code: code ?? null }, window.location.origin);
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Google sign-in did not complete.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") return notify("appUserConnectorOAuthComplete");
      setMessage("Google sign-in completed without a code.");
      return notify("appUserConnectorOAuthFailed");
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);
  return <p className="p-8 text-sm text-muted-foreground">{message}</p>;
}
