import { Lock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Item } from "@/hooks/use-timeos";
import { catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/time";

const DAY = 86_400_000;

interface Props {
  days: Date[];
  items: Item[];
  startHour?: number;
  endHour?: number;
  hourPx?: number;
  onSlot?: (start: Date) => void;
  onItem?: (item: Item) => void;
  showHeader?: boolean;
}

function lanes(items: Item[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { item: Item; lane: number; lanes: number }[] = [];
  let group: { item: Item; lane: number }[] = [];
  let groupEnd = 0;
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => out.push({ ...g, lanes: n }));
    group = [];
  };
  for (const it of sorted) {
    if (group.length && it.start >= groupEnd) flush();
    const used = new Set(group.filter((g) => g.item.end > it.start).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    group.push({ item: it, lane });
    groupEnd = Math.max(groupEnd, it.end);
  }
  flush();
  return out;
}

export function TimeGrid({ days, items, startHour = 7, endHour = 23, hourPx = 52, onSlot, onItem, showHeader = true }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = hours.length * hourPx;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ minWidth: days.length > 3 ? 720 : undefined }}>
        {showHeader && (
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
            <div />
            {days.map((d) => {
              const today = d.toDateString() === new Date().toDateString();
              return (
                <div key={d.toISOString()} className="px-2 py-2.5 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {d.toLocaleDateString([], { weekday: "short" })}
                  </div>
                  <div
                    className={cn(
                      "mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-medium tabular",
                      today && "bg-primary text-primary-foreground",
                    )}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="relative grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)`, height }}>
          <div className="relative">
            {hours.map((h, i) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground" style={{ top: i * hourPx }}>
                {i === 0 ? "" : `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const ds = new Date(d);
            ds.setHours(0, 0, 0, 0);
            const dayStart = ds.getTime();
            const gridStart = dayStart + startHour * 3_600_000;
            const gridEnd = dayStart + endHour * 3_600_000;
            const dayItems = items.filter((it) => it.end > gridStart && it.start < gridEnd && it.start < dayStart + DAY);
            return (
              <div key={dayStart} className="relative border-l border-border">
                {hours.map((h, i) => (
                  <button
                    type="button"
                    key={h}
                    aria-label={`Add event ${ds.toLocaleDateString()} ${h}:00`}
                    tabIndex={onSlot ? 0 : -1}
                    disabled={!onSlot}
                    onClick={() => onSlot?.(new Date(dayStart + h * 3_600_000))}
                    className="absolute inset-x-0 border-t border-border/70 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none disabled:hover:bg-transparent"
                    style={{ top: i * hourPx, height: hourPx }}
                  />
                ))}
                {lanes(dayItems).map(({ item, lane, lanes: n }) => {
                  const s = Math.max(item.start, gridStart);
                  const e = Math.min(item.end, gridEnd);
                  const top = ((s - gridStart) / 3_600_000) * hourPx;
                  const h = Math.max(18, ((e - s) / 3_600_000) * hourPx - 2);
                  const st = catStyle(item.category);
                  const isBlock = item.kind === "block";
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onItem?.(item)}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring",
                        st.border,
                        isBlock ? cn(st.soft, "border-dashed bg-card ring-1 ring-inset ring-border") : st.solid,
                        item.done && "opacity-50",
                        item.highlight === "moved" && "ring-2 ring-warning animate-rise",
                        item.highlight === "added" && "ring-2 ring-primary animate-rise",
                      )}
                      style={{ top, height: h, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
                    >
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        {isBlock && <Sparkles className="h-2.5 w-2.5 shrink-0 text-primary" aria-label="Planned by TimeOS" />}
                        {item.isProtected && <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-label="Protected" />}
                        <span className={cn("truncate", item.done && "line-through")}>{item.title}</span>
                      </div>
                      {h > 30 && (
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {fmtTime(item.start)}–{fmtTime(item.end)}
                        </div>
                      )}
                    </button>
                  );
                })}
                {now && now > gridStart && now < gridEnd && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: ((now - gridStart) / 3_600_000) * hourPx }}>
                    <div className="relative h-px bg-destructive">
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
