import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { tz } from "@/hooks/use-timeos";
import { useModuleAction } from "@/hooks/use-module";
import { CATEGORIES } from "@/lib/parse";
import { fmtDayTime, fmtDuration } from "@/lib/time";
import { CAT_LABEL } from "@/lib/ui";
import { applyWhatIf, previewWhatIf } from "@/lib/whatif/whatif.functions";

export const Route = createFileRoute("/_authenticated/what-if")({
  head: () => ({
    meta: [
      { title: "What-If Planner — TimeOS" },
      { name: "description", content: "Preview how a new commitment would reshape your week before you commit." },
      { property: "og:title", content: "What-If Planner — TimeOS" },
      { property: "og:description", content: "Before/after schedule simulation for any hypothetical event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhatIfPage,
});

function nextWed17() {
  const d = new Date();
  d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function WhatIfPage() {
  const [f, setF] = useState({ title: "College Festival", date: nextWed17(), start: "17:00", end: "22:00", category: "SOCIAL" as (typeof CATEGORIES)[number], isProtected: true });
  const previewFn = useServerFn(previewWhatIf);
  const payload = () => ({
    tz: tz(),
    title: f.title,
    start: new Date(`${f.date}T${f.start}`).toISOString(),
    end: new Date(`${f.date}T${f.end}`).toISOString(),
    category: f.category,
    isProtected: f.isProtected,
  });
  const preview = useMutation({ mutationFn: () => previewFn({ data: payload() }) });
  const apply = useModuleAction(applyWhatIf, [], { success: "Applied — event added and schedule updated", onSuccess: () => preview.reset() });
  const r = preview.data;

  return (
    <AppShell title="What-If">
      <PageIntro eyebrow="Simulation — nothing is saved" title="What if…?" text="Try a commitment before you accept it. TimeOS shows which work would move, what stays protected, and whether your week still fits." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form className="surface h-fit space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); preview.mutate(); }}>
          <div className="space-y-1.5"><Label htmlFor="w-t">What's happening?</Label><Input id="w-t" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="w-d">Date</Label><Input id="w-d" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="w-s">From</Label><Input id="w-s" type="time" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="w-e">To</Label><Input id="w-e" type="time" required value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as never })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between text-sm">Protect this time<Switch checked={f.isProtected} onCheckedChange={(v) => setF({ ...f, isProtected: v })} /></label>
          <Button type="submit" className="w-full" disabled={preview.isPending}>
            {preview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}Simulate
          </Button>
          {preview.isError && <p className="text-xs text-destructive">{(preview.error as Error).message.slice(0, 160)}</p>}
        </form>

        <section className="min-w-0">
          {!r ? (
            <div className="surface grid h-full min-h-72 place-items-center p-10 text-center text-sm text-muted-foreground">Fill in a hypothetical commitment and press Simulate to see the before and after.</div>
          ) : (
            <div className="space-y-4 animate-rise">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Tasks moved" value={String(r.proposal.moved.length)} />
                <Stat label="Unchanged" value={String(r.proposal.keptCount)} />
                <Stat label="Won't fit" value={r.proposal.workload.unplacedMinutes ? fmtDuration(r.proposal.workload.unplacedMinutes) : "0m"} warn={r.proposal.workload.unplacedMinutes > 0} />
              </div>
              <div className="surface p-5">
                <h3 className="text-sm font-semibold">Changes</h3>
                {r.proposal.moved.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Nothing needs to move — this fits around your current plan.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {r.proposal.moved.map((m, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-muted-foreground line-through">{fmtDayTime(m.from.start)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-primary">{fmtDayTime(m.to.start)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />Protected: {r.proposal.protectedItems.join(", ")}</p>
                {r.proposal.warnings.map((w, i) => <p key={i} className="mt-2 text-xs text-warning-foreground">⚠ {w}</p>)}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Column title="Before" items={r.before} />
                <Column title="After" items={r.after} highlight={{ title: r.event.title, start: r.event.start, end: r.event.end }} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => preview.reset()}>Cancel</Button>
                <Button disabled={apply.isPending} onClick={() => apply.mutate(payload())}>{apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Apply changes</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={warn ? "tabular mt-1 text-xl font-semibold text-destructive" : "tabular mt-1 text-xl font-semibold"}>{value}</p>
    </div>
  );
}

function Column({ title, items, highlight }: { title: string; items: { title: string; start: number; end: number }[]; highlight?: { title: string; start: number; end: number } }) {
  const all = [...items.map((i) => ({ ...i, hl: false })), ...(highlight ? [{ ...highlight, hl: true }] : [])].sort((a, b) => a.start - b.start).slice(0, 14);
  return (
    <div className="surface p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {all.length === 0 && <li className="text-sm text-muted-foreground">No planned work.</li>}
        {all.map((i, k) => (
          <li key={k} className={i.hl ? "rounded-lg border border-primary/40 bg-accent px-3 py-2 text-sm" : "rounded-lg px-3 py-1.5 text-sm"}>
            <span className="tabular mr-2 text-xs text-muted-foreground">{fmtDayTime(i.start)}</span>
            <span className={i.hl ? "font-semibold text-accent-foreground" : ""}>{i.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
