import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TimeOS" },
      { name: "description", content: "Sign in to TimeOS to see your adaptive schedule." },
      { property: "og:title", content: "Sign in — TimeOS" },
      { property: "og:description", content: "Your AI Operating System for Time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const [failed, setFailed] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  async function demo() {
    setDemoBusy(true);
    try {
      let r = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (r.error) {
        await ensureDemoUser();
        r = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        if (r.error) throw r.error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Demo sign-in failed. Please try again.");
    } finally {
      setDemoBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
      setFailed(false);
    } catch (err) {
      if (mode === "signin") setFailed(true);
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed. Please try again.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm animate-rise">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your TimeOS"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Let's build your intelligent schedule.</p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
            Check <b>{email}</b> for a confirmation link, then come back and sign in.
          </div>
        ) : (
          <>
            <Button className="mt-8 h-11 w-full text-base" onClick={demo} disabled={demoBusy} type="button">
              {demoBusy ? "Opening demo…" : "Sign in as Demo User (Alex)"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">One click — no account needed.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={google} type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8.1z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
              </svg>
              Continue with Google
            </Button>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ""))} autoComplete="email" autoCapitalize="none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <p
              className={`mt-6 text-center text-sm text-muted-foreground ${
                failed && mode === "signin" ? "rounded-lg border border-primary bg-primary/10 p-3" : ""
              }`}
            >
              {failed && mode === "signin" ? "Sign-in failed. Don't have an account yet?" : mode === "signin" ? "New to TimeOS?" : "Already have an account?"}{" "}
              <button
                type="button"
                className={`font-medium text-primary hover:underline ${failed && mode === "signin" ? "font-semibold underline" : ""}`}
                onClick={() => {
                  setFailed(false);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
