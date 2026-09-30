import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, HelpCircle, Loader2, Plus, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useAction, tz, type TimeState } from "@/hooks/use-timeos";
import { applyChange, cancelChange, explainChange } from "@/lib/timeos.functions";
import type { Proposal } from "@/lib/scheduler";
import { fmtDayTime, fmtDuration } from "@/lib/time";
import { REASON_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { MiniMarkdown } from "./analyzing";

type Change = NonNullable<TimeState["pending"]>;

const LEVEL_W: Record<string, string> = { High: "w-full", Medium: "w-2/3", Low: "w-1/3" } as const;

export function ProposalPanel({ change, preview, onPreview }: { change: Change; preview: boolean; onPreview: (v: boolean) => void }) {
  const p = change.proposal as unknown as Proposal;
  const [why, setWhy] = useState<{ text: string; provider: string } | null>(change.narrative ? { text: change.narrative, provider: "cached" } : null);
  const [whyErr, setWhyErr] = useState<string | null>(null);
  const [loadingWhy, setLoadingWhy] = useState(false);
  const explain = useServerFn(explainChange);
  const apply = useAction(applyChange, { success: "Schedule updated", onSuccess: () => onPreview(false) });
  const cancel = useAction(cancelChange, { success: "Proposal discarded — nothing changed", onSuccess: () => onPreview(false) });
  const nothing = !p.moved.length && !p.added.length && !p.unscheduled.length;
  const kindLabel = change.kind === "RESCHEDULE" ? "Rescheduled plan" : change.kind === "GENERATE" ? "Generated schedule" : "Optimized schedule";

  async function askWhy() {
    setLoadingWhy(true);
    setWhyErr(null);
    try {
      setWhy(await explain({ data: { id: change.id, tz: tz() } }));
    } catch {
      setWhyErr("TimeOS AI is temporarily unavailable. The structured reasons below are still accurate.");
    } finally {
      setLoadingWhy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-card shadow-sm animate-rise" aria-labelledby="proposal-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Proposal · awaiting your approval</p>
          <h2 id="proposal-title" className="mt-1 text-lg font-semibold tracking-tight">
            {kindLabel}: {nothing ? "no changes needed" : `${p.moved.length} moved · ${p.added.length} added`}
          </h2>
          {change.trigger_text && <p className="mt-0.5 text-sm text-muted-foreground">Because: “{change.trigger_text}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => cancel.mutate({ id: change.id })} disabled={cancel.isPending}>
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPreview(!preview)}>
            {preview ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
            {preview ? "Hide preview" : "Review on timeline"}
          </Button>
          <Button size="sm" onClick={() => apply.mutate({ id: change.id })} disabled={apply.isPending}>
            {apply.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Apply changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2.5">
          {nothing && <p className="text-sm text-muted-foreground">Your plan already respects every constraint. Nothing needs to move.</p>}
          {p.moved.map((m, i) => (
            <div key={`m${i}`} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-foreground">Moved</span>
                <span className={cn("h-2 w-2 rounded-full", catStyle(m.category).dot)} />
                <span className="font-medium">{m.title}</span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground line-through">{fmtDayTime(m.from.start)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground">{fmtDayTime(m.to.start)}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{m.cause}</p>
              <Confidence c={m.confidence} reasons={m.reasons} />
            </div>
          ))}
          {p.added.map((a, i) => (
            <div key={`a${i}`} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                  <Plus className="-mt-0.5 mr-0.5 inline h-3 w-3" />
                  Added
                </span>
                <span className={cn("h-2 w-2 rounded-full", catStyle(a.category).dot)} />
                <span className="font-medium">{a.title}</span>
                <span className="ml-auto font-mono text-xs">{fmtDayTime(a.start)}</span>
              </div>
              <Confidence c={a.confidence} reasons={a.reasons} />
            </div>
          ))}
          {p.unscheduled.map((u, i) => (
            <div key={`u${i}`} className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              Removed session: {u.title} ({fmtDayTime(u.start)})
            </div>
          ))}
          {p.keptCount > 0 && (
            <p className="px-1 text-xs text-muted-foreground">{p.keptCount} other planned sessions stay exactly where they are.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-accent/60 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
              <ShieldCheck className="h-4 w-4" /> Protected
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.protectedItems.map((x) => (
                <span key={x} className="rounded-full bg-card px-2.5 py-0.5 text-xs">
                  {x}
                </span>
              ))}
            </div>
          </div>
          {p.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
              {p.warnings.map((w) => (
                <p key={w} className="flex gap-2 text-warning-foreground">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Constraints considered</p>
            <ul className="mt-2 space-y-1 text-sm">
              {p.constraints.map((c) => (
                <li key={c} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> <span className="text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Workload: {fmtDuration(p.workload.requiredMinutes)} needed · {fmtDuration(p.workload.availableMinutes)} free this week
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-5">
        {!why && (
          <Button variant="secondary" onClick={askWhy} disabled={loadingWhy} className="gap-2">
            {loadingWhy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
            {loadingWhy ? "Explaining…" : "Why did you change this?"}
          </Button>
        )}
        {whyErr && <p className="mt-2 text-sm text-destructive">{whyErr}</p>}
        {why && (
          <div className="animate-rise">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Why TimeOS made these changes</p>
            <MiniMarkdown text={why.text} />
          </div>
        )}
      </div>
    </section>
  );
}

function Confidence({ c, reasons }: { c: Proposal["moved"][number]["confidence"]; reasons: string[] }) {
  const rows: [string, keyof typeof c][] = [
    ["Deadline", "deadline"],
    ["Energy fit", "energyFit"],
    ["Availability", "availability"],
    ["Preference", "preference"],
  ];
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <span key={r} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {REASON_LABEL[r] ?? r}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {rows.map(([l, k]) => (
          <div key={k}>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{l}</span>
              <span>{c[k]}</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-muted">
              <div className={cn("h-1 rounded-full bg-primary/70", LEVEL_W[c[k]])} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
