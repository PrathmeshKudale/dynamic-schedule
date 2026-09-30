import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tz, useAction, useTimeOS } from "@/hooks/use-timeos";
import { demoAction, loadDemo, updateProfile } from "@/lib/timeos.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TimeOS" },
      { name: "description", content: "Schedule preferences, connected accounts and demo controls." },
      { property: "og:title", content: "Settings — TimeOS" },
      { property: "og:description", content: "Configure TimeOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const SCEN = [
  { id: "normal", l: "Normal Day" },
  { id: "deadline", l: "Deadline Pressure" },
  { id: "festival", l: "College Festival" },
  { id: "lecture", l: "Unexpected Lecture" },
  { id: "overloaded", l: "Overloaded Week" },
] as const;

function SettingsPage() {
  const q = useTimeOS();
  const p = q.data?.profile;
  const [f, setF] = useState({ name: "", wake: "07:00", sleep: "23:00", focus: 45, brk: 10 });
  useEffect(() => {
    if (p) setF({ name: p.name, wake: p.wake_time, sleep: p.sleep_time, focus: p.focus_minutes, brk: p.break_minutes });
  }, [p]);
  const save = useAction(updateProfile, { success: "Preferences saved. Optimize to apply them." });
  const scen = useAction(loadDemo, { success: "Demo scenario loaded" });
  const act = useAction(demoAction, { success: "Added. Go to Overview and optimize." });

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card title="Profile & schedule preferences" desc="These are preferences, not rigid rules.">
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="w">Wake time</Label><Input id="w" type="time" value={f.wake} onChange={(e) => setF({ ...f, wake: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="s">Sleep time</Label><Input id="s" type="time" value={f.sleep} onChange={(e) => setF({ ...f, sleep: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="fo">Focus session (min)</Label><Input id="fo" type="number" min={15} max={120} value={f.focus} onChange={(e) => setF({ ...f, focus: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label htmlFor="b">Break (min)</Label><Input id="b" type="number" min={5} max={30} value={f.brk} onChange={(e) => setF({ ...f, brk: Number(e.target.value) })} /></div>
            <p className="col-span-2 text-xs text-muted-foreground">Energy profile: high focus 6 AM–2 PM and 5–9 PM, medium 2–5 PM, low after 9 PM. Dinner (8:00–8:45 PM) and sleep are always protected.</p>
            <div className="col-span-2"><Button type="submit" disabled={save.isPending || !f.name.trim()}>{save.isPending ? "Saving…" : "Save preferences"}</Button></div>
          </form>
        </Card>

        <Card title="Connected accounts" desc="">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Google Calendar</p>
              <p className="text-sm text-muted-foreground">Not connected. Google Calendar sync isn't available in this demo, so TimeOS uses its own calendar.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">Demo mode</span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Lovable AI</p>
              <p className="text-sm text-muted-foreground">Reads your typed requests and writes the explanations. If AI isn't available, a built-in demo parser takes over.</p>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{q.data?.aiConfigured ? "Active" : "Demo fallback"}</span>
          </div>
        </Card>

        <Card title="Demo scenario" desc="For presentations. Loading a scenario replaces your current data with Alex's week.">
          <div className="flex flex-wrap gap-2">
            {SCEN.map((s) => (
              <Button key={s.id} variant="outline" size="sm" disabled={scen.isPending} onClick={() => scen.mutate({ tz: tz(), scenario: s.id })}>{s.l}</Button>
            ))}
            {scen.isPending && <Loader2 className="h-4 w-4 animate-spin self-center" />}
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={act.isPending} onClick={() => act.mutate({ tz: tz(), action: "deadline" })}>Simulate DBMS deadline</Button>
            <Button variant="secondary" size="sm" disabled={act.isPending} onClick={() => act.mutate({ tz: tz(), action: "festival" })}>Add college festival</Button>
            <Button variant="secondary" size="sm" disabled={act.isPending} onClick={() => act.mutate({ tz: tz(), action: "lecture" })}>Add unexpected lecture</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
