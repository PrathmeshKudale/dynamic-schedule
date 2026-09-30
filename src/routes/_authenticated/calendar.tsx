import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeGrid } from "@/components/time-grid";
import { EventDialog } from "@/components/event-dialog";
import { buildItems, useTimeOS, type EventRow, type Item } from "@/hooks/use-timeos";
import { CAT_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — TimeOS" },
      { name: "description", content: "Your fixed events and TimeOS-planned work sessions in one calendar." },
      { property: "og:title", content: "Calendar — TimeOS" },
      { property: "og:description", content: "Events and AI-planned sessions together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const VIEWS = [
  { n: 1, l: "Day" },
  { n: 3, l: "3 Days" },
  { n: 7, l: "Week" },
] as const;

function CalendarPage() {
  const q = useTimeOS();
  const [view, setView] = useState<1 | 3 | 7>(7);
  const [offset, setOffset] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<EventRow | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [info, setInfo] = useState<Item | null>(null);

  const days = Array.from({ length: view }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset * view + i);
    return d;
  });
  const items = useMemo(() => (q.data ? buildItems(q.data).filter((i) => !hidden.has(i.category)) : []), [q.data, hidden]);

  return (
    <AppShell
      title="Calendar"
      actions={
        <Button size="sm" onClick={() => { setSel(null); setSlot(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Event
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => setOffset(offset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => setOffset(offset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-sm font-medium">
            {days[0].toLocaleDateString([], { month: "short", day: "numeric" })}
            {view > 1 && ` – ${days[days.length - 1].toLocaleDateString([], { month: "short", day: "numeric" })}`}
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          {VIEWS.map((v) => (
            <button key={v.n} type="button" onClick={() => { setView(v.n); setOffset(0); }}
              className={cn("rounded-md px-3 py-1", view === v.n ? "bg-secondary font-medium" : "text-muted-foreground")}>{v.l}</button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const off = hidden.has(c);
          return (
            <button key={c} type="button" aria-pressed={!off}
              onClick={() => { const n = new Set(hidden); off ? n.delete(c) : n.add(c); setHidden(n); }}
              className={cn("flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs", off && "opacity-40")}>
              <span className={cn("h-2 w-2 rounded-full", catStyle(c).dot)} /> {CAT_LABEL[c]}
            </button>
          );
        })}
      </div>
      {q.isLoading ? <Skeleton className="h-[600px]" /> : q.isError ? (
        <p className="text-sm">Couldn't load calendar. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-2">
          <TimeGrid days={days} items={items} hourPx={48}
            onSlot={(d) => { setSel(null); setSlot(d); setOpen(true); }}
            onItem={(it) => { if (it.kind === "event" && it.raw) { setSel(it.raw); setOpen(true); } else setInfo(it); }} />
        </div>
      )}
      {info && (
        <div className="fixed bottom-20 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-border bg-popover p-4 shadow-lg md:bottom-6 animate-rise" role="dialog" aria-label="Planned session">
          <p className="text-sm font-medium">{info.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">Planned by TimeOS. To change it, edit the task or click Optimize on Overview.</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setInfo(null)}>Close</Button>
            <Button size="sm" asChild><Link to="/tasks">Open tasks</Link></Button>
          </div>
        </div>
      )}
      <EventDialog open={open} onOpenChange={setOpen} event={sel} defaultStart={slot} />
    </AppShell>
  );
}
