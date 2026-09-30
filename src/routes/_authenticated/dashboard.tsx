import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, CalendarClock, Check, Clock, Gauge, History, Play, ShieldCheck, Siren, Sparkles, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeGrid } from "@/components/time-grid";
import { CommandBar } from "@/components/dashboard/command-bar";
import { ProposalPanel } from "@/components/dashboard/proposal-panel";
import { DayChangedDialog } from "@/components/dashboard/day-changed-dialog";
import { Analyzing } from "@/components/dashboard/analyzing";
import { Welcome } from "@/components/dashboard/welcome";
import { EventDialog } from "@/components/event-dialog";
import { buildItems, tz, useAction, useTimeOS, type EventRow, type Item, type TimeState } from "@/hooks/use-timeos";
import { proposeSchedule, toggleTask } from "@/lib/timeos.functions";
import { analyze } from "@/lib/client-analysis";
import type { Proposal } from "@/lib/scheduler";
import { fmtDayTime, fmtDuration, fmtTime, WEEKDAYS } from "@/lib/time";
import { CAT_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — TimeOS" },
      { name: "description", content: "Your optimized day: what's happening, what matters, what to do next, and why." },
      { property: "og:title", content: "Overview — TimeOS" },
      { property: "og:description", content: "Your adaptive daily plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const q = useTimeOS();
  const [dayOpen, setDayOpen] = useState(false);
  const optimize = useAction(proposeSchedule, { error: "TimeOS AI is temporarily unavailable. Your existing schedule is safe." });

  const actions = q.data?.profile ? (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDayOpen(true)}>
        <Siren className="h-4 w-4 text-destructive" /> <span className="hidden sm:inline">My day changed</span>
      </Button>
      <Button size="sm" className="gap-1.5" disabled={optimize.isPending} onClick={() => optimize.mutate({ tz: tz(), mode: "optimize", trigger: null })}>
        <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Optimize schedule</span>
        <span className="sm:hidden">Optimize</span>
      </Button>
    </>
  ) : null;

  return (
    <AppShell title="Overview" actions={actions}>
      {q.isLoading && <DashSkeleton />}
      {q.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          We couldn't load your schedule.{" "}
          <Button variant="link" className="h-auto p-0" onClick={() => q.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {q.data && !q.data.profile && <Welcome />}
      {q.data && q.data.profile && <DashboardBody state={q.data} optimizing={optimize.isPending} onDayChanged={() => setDayOpen(true)} />}
      <DayChangedDialog open={dayOpen} onOpenChange={setDayOpen} />
    </AppShell>
  );
}

function DashSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function DashboardBody({ state, optimizing, onDayChanged }: { state: TimeState; optimizing: boolean; onDayChanged: () => void }) {
  const [preview, setPreview] = useState(false);
  const [range, setRange] = useState<1 | 3>(1);
  const [evOpen, setEvOpen] = useState(false);
  const [evSel, setEvSel] = useState<EventRow | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const a = useMemo(() => analyze(state), [state]);
  const pending = state.pending;
  const proposal = pending ? (pending.proposal as unknown as Proposal) : null;

  const items = useMemo(() => {
    if (preview && proposal) {
      const hl = new Map<string, "moved" | "added">();
      proposal.moved.forEach((m) => hl.set(`${m.taskId}|${m.to.start}`, "moved"));
      proposal.added.forEach((x) => hl.set(`${x.taskId}|${x.start}`, "added"));
      const past = state.blocks
        .filter((b) => Date.parse(b.end_time) <= Date.now())
        .map((b) => ({ taskId: b.task_id, start: Date.parse(b.start_time), end: Date.parse(b.end_time) }));
      return buildItems(state, { blocksOverride: [...past, ...proposal.blocks], highlights: hl });
    }
    return buildItems(state);
  }, [state, preview, proposal]);

  const now = a.now;
  const current = items.find((i) => i.start <= now && i.end > now);
  const next = items.find((i) => i.start > now);
  const name = state.profile?.name ?? "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const open = state.tasks.filter((t) => !t.is_completed);
  const done = state.tasks.length - open.length;
  const focus = [...open]
    .sort((x, y) => (x.deadline ? Date.parse(x.deadline) : Infinity) - (y.deadline ? Date.parse(y.deadline) : Infinity))
    .slice(0, 3);
  const top = focus[0];
  const topNext = top ? items.find((i) => i.kind === "block" && i.taskId === top.id && i.start > now) : undefined;
  const protectedToday = Array.from(new Set(state.events.filter((e) => e.is_protected && Date.parse(e.end_time) > now).map((e) => e.title))).slice(0, 3);

  const festDay = WEEKDAYS[new Date(Date.now() + 2 * 86_400_000).getDay()];
  const examples = [
    "DBMS assignment due tomorrow, need 2 hours",
    `I have a college festival ${festDay} from 5 PM to 10 PM`,
    "I also have an extra lecture tomorrow at 4 PM",
  ];

  const days = Array.from({ length: range }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-6">
      <div className="animate-rise">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[28px]">
          {greet}, {name}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} · Here's your optimized day.
        </p>
      </div>

      <CommandBar examples={examples} />

      {optimizing && <Analyzing />}
      {!optimizing && pending && <ProposalPanel key={pending.id} change={pending} preview={preview} onPreview={setPreview} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 min-w-0">
          {/* Intelligence brief */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="brief">
            <h3 id="brief" className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-primary" /> TimeOS Intelligence
            </h3>
            <div className="mt-3 space-y-1.5 text-[15px] leading-relaxed">
              <p>
                You have <b>{fmtDuration(a.usable)}</b> of usable time left today.
              </p>
              {top && (
                <p>
                  Your highest-priority item is <b>{top.title}</b>
                  {top.deadline ? `, due ${fmtDayTime(top.deadline)}` : ""}.{" "}
                  {topNext ? (
                    <>
                      I found a {Math.round((topNext.end - topNext.start) / 60000)}-minute window for it at <b>{fmtDayTime(topNext.start)}</b>.
                    </>
                  ) : (
                    <span className="text-warning-foreground">It has no time planned yet. Optimize to find some.</span>
                  )}
                </p>
              )}
              {a.conflicts.length > 0 && (
                <p className="flex items-start gap-2 text-destructive">
                  <TriangleAlert className="mt-1 h-4 w-4 shrink-0" />
                  <span>
                    <b>{a.conflicts[0].event}</b> now overlaps {a.conflicts.length} planned session{a.conflicts.length > 1 ? "s" : ""} (
                    {Array.from(new Set(a.conflicts.map((c) => c.task))).join(", ")}).
                  </span>
                </p>
              )}
              {a.unplanned.length > 0 && a.conflicts.length === 0 && (
                <p className="text-muted-foreground">
                  {fmtDuration(a.unplannedMinutes)} of work isn't on the calendar yet ({a.unplanned.map((u) => u.task.title).join(", ")}).
                </p>
              )}
              {protectedToday.length > 0 && <p className="text-muted-foreground">{protectedToday.join(", ")} stay protected.</p>}
            </div>
            {(a.conflicts.length > 0 || a.unplanned.length > 0) && !pending && (
              <p className="mt-3 text-sm font-medium text-primary">Next step: click Optimize schedule to fix this.</p>
            )}
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Clock} label="Available today" value={fmtDuration(a.usable)} />
            <Stat icon={CalendarClock} label="Focus time today" value={fmtDuration(a.focusToday)} />
            <Stat icon={Check} label="Tasks" value={`${done}/${state.tasks.length} done`} />
            <Stat
              icon={Gauge}
              label="Schedule health"
              value={a.health}
              tone={a.health === "Good" ? "good" : a.health === "Tight" ? "warn" : "bad"}
            />
          </div>

          {/* Timeline */}
          <section className="rounded-2xl border border-border bg-card" aria-labelledby="tl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h3 id="tl" className="text-sm font-semibold">
                {preview ? "Preview: proposed schedule" : "Schedule"}
              </h3>
              <div className="flex items-center gap-2">
                {preview && <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">Not applied yet</span>}
                <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
                  {([1, 3] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={cn("rounded-md px-2.5 py-1", range === r ? "bg-secondary font-medium" : "text-muted-foreground")}
                    >
                      {r === 1 ? "Today" : "3 days"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-2">
              <TimeGrid
                days={days}
                items={items}
                hourPx={range === 1 ? 44 : 40}
                showHeader={range > 1}
                onSlot={(d) => {
                  setEvSel(null);
                  setSlot(d);
                  setEvOpen(true);
                }}
                onItem={(it: Item) => {
                  if (it.kind === "event" && it.raw) {
                    setEvSel(it.raw);
                    setEvOpen(true);
                  }
                }}
              />
            </div>
            <Legend />
          </section>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-label="Now and next">
            <div className="bg-primary p-5 text-primary-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">Now</p>
              {current ? (
                <>
                  <p className="mt-1.5 text-lg font-semibold leading-tight">{current.title}</p>
                  <p className="mt-1 font-mono text-xs opacity-85">
                    {fmtTime(current.start)}–{fmtTime(current.end)} · {CAT_LABEL[current.category]}
                  </p>
                  <p className="mt-0.5 text-xs opacity-85">{Math.round((current.end - now) / 60000)} min left</p>
                  {current.kind === "block" && (
                    <Button asChild size="sm" variant="secondary" className="mt-3 gap-1.5">
                      <Link to="/tasks">
                        <Play className="h-3.5 w-3.5" /> Start focus
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <p className="mt-1.5 text-sm opacity-90">Free time. Nothing is scheduled right now.</p>
              )}
            </div>
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next</p>
              {next ? (
                <div className="mt-1.5 flex items-start gap-2.5">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", catStyle(next.category).dot)} />
                  <div>
                    <p className="font-medium">{next.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {fmtDayTime(next.start)}–{fmtTime(next.end)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">Nothing else planned.</p>
              )}
            </div>
          </section>

          <FocusList tasks={focus} />

          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="wl">
            <h3 id="wl" className="text-sm font-semibold">
              Workload intelligence
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Required" value={fmtDuration(a.sim.workload.requiredMinutes)} />
              <Mini label="Free this week" value={fmtDuration(a.sim.workload.availableMinutes)} />
              <Mini label="Gap" value={a.sim.workload.gapMinutes ? fmtDuration(a.sim.workload.gapMinutes) : "None"} warn={a.sim.workload.gapMinutes > 0} />
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted">
              <div
                className={cn("h-1.5 rounded-full", a.sim.workload.score > 80 ? "bg-destructive" : a.sim.workload.score > 55 ? "bg-warning" : "bg-primary")}
                style={{ width: `${Math.max(4, a.sim.workload.score)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {a.sim.workload.gapMinutes > 0
                ? "More work than realistic time. Options: redistribute tasks, move flexible work, or extend deadlines. TimeOS won't cut your rest or social time without asking."
                : `Your plan uses ${a.sim.workload.score}% of your free waking time. Rest and social time stay intact.`}
            </p>
            {a.sim.workload.gapMinutes > 0 && (
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onDayChanged}>
                Rebalance my schedule
              </Button>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="hist">
            <h3 id="hist" className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-muted-foreground" /> Recent adaptations
            </h3>
            {state.history.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No changes applied yet. Optimize or reschedule to see them here.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {state.history.map((h) => {
                  const p = h.proposal as unknown as Proposal;
                  return (
                    <li key={h.id} className="text-sm">
                      <p className="font-medium">
                        {h.kind === "RESCHEDULE" ? "Rescheduled" : "Optimized"} · {p.moved.length} moved, {p.added.length} added
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.trigger_text ? `“${h.trigger_text}” · ` : ""}
                        {h.applied_at ? fmtDayTime(h.applied_at) : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Nothing changes without your approval.
            </p>
          </section>
        </div>
      </div>
      <EventDialog open={evOpen} onOpenChange={setEvOpen} event={evSel} defaultStart={slot} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-lg font-semibold tracking-tight tabular",
          tone === "good" && "text-primary",
          tone === "warn" && "text-warning-foreground",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-2">
      <p className={cn("text-sm font-semibold tabular", warn && "text-destructive")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FocusList({ tasks }: { tasks: TimeState["tasks"] }) {
  const toggle = useAction(toggleTask);
  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="focus">
      <div className="flex items-center justify-between">
        <h3 id="focus" className="text-sm font-semibold">
          Today's focus
        </h3>
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
          All tasks
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You're all caught up.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3">
              <Checkbox
                id={`f-${t.id}`}
                className="mt-0.5"
                checked={t.is_completed}
                onCheckedChange={(v) => toggle.mutate({ id: t.id, done: v === true })}
              />
              <label htmlFor={`f-${t.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {fmtDuration(t.estimated_minutes)} · {t.deadline ? `due ${fmtDayTime(t.deadline)}` : "no deadline"}
                </span>
              </label>
              <span className={cn("mt-1.5 h-2 w-2 rounded-full", catStyle(t.category).dot)} aria-label={CAT_LABEL[t.category]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-cat-academic/15" /> Fixed event
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-dashed border-border bg-card" />
        <Sparkles className="h-3 w-3 text-primary" /> Planned by TimeOS
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm ring-2 ring-warning" /> Moved
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm ring-2 ring-primary" /> Added
      </span>
      <span>Click an empty slot to add an event.</span>
    </div>
  );
}
