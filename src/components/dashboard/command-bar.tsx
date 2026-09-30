import { useState } from "react";
import { CalendarPlus, CornerDownLeft, ListPlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction, tz } from "@/hooks/use-timeos";
import { commitParsed, parseInput } from "@/lib/timeos.functions";
import type { Parsed } from "@/lib/parse";
import { CAT_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { fmtDuration } from "@/lib/time";

function fmtHM(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function CommandBar({ examples, onCommitted }: { examples: string[]; onCommitted?: (p: Parsed) => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ parsed: Parsed; provider: string } | null>(null);
  const parse = useAction(parseInput, {
    error: "TimeOS AI is temporarily unavailable. Your existing schedule is safe.",
    onSuccess: (r) => setPreview(r),
  });
  const commit = useAction(commitParsed, {
    success: "Added to TimeOS",
    onSuccess: () => {
      if (preview) onCommitted?.(preview.parsed);
      setPreview(null);
      setText("");
    },
  });
  const empty = preview && !preview.parsed.events.length && !preview.parsed.tasks.length;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <form
        className="flex items-center gap-3 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) parse.mutate({ tz: tz(), text });
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <label htmlFor="cmd" className="sr-only">
          Tell TimeOS what you need to do
        </label>
        <input
          id="cmd"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell TimeOS what you need to do…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
        <Button type="submit" size="sm" disabled={parse.isPending || text.trim().length < 3} className="gap-1.5">
          {parse.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CornerDownLeft className="h-3.5 w-3.5" />}
          {parse.isPending ? "Understanding…" : "Parse"}
        </Button>
      </form>

      {!preview && (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2.5">
          <span className="py-1 text-xs text-muted-foreground">Try:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className="border-t border-border p-4 animate-rise">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Here's what I understood {preview.provider === "demo" && <span className="normal-case">(demo parser)</span>}
            </p>
            <button type="button" onClick={() => setPreview(null)} aria-label="Discard" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {empty ? (
            <p className="text-sm text-muted-foreground">
              I couldn't find an event or task in that. Try including a time ("5 PM to 10 PM") or an effort ("2 hours").
            </p>
          ) : (
            <ul className="space-y-2">
              {preview.parsed.events.map((e, i) => (
                <li key={`e${i}`} className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm">
                  <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                  <span className={cn("h-2 w-2 rounded-full", catStyle(e.category).dot)} />
                  <span className="font-medium">{e.title}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {fmtDate(e.date)} · {fmtHM(e.start)}–{fmtHM(e.end)}
                  </span>
                  <span className="hidden rounded bg-secondary px-1.5 py-0.5 text-[11px] sm:inline">Fixed event</span>
                </li>
              ))}
              {preview.parsed.tasks.map((t, i) => (
                <li key={`t${i}`} className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm">
                  <ListPlus className="h-4 w-4 text-muted-foreground" />
                  <span className={cn("h-2 w-2 rounded-full", catStyle(t.category).dot)} />
                  <span className="font-medium">{t.title}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {fmtDuration(t.estimatedMinutes)}
                    {t.deadlineDate ? ` · due ${fmtDate(t.deadlineDate)}` : ""}
                  </span>
                  <span className="hidden rounded bg-secondary px-1.5 py-0.5 text-[11px] sm:inline">
                    {CAT_LABEL[t.category]} · {t.priority.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!!empty || commit.isPending} onClick={() => commit.mutate({ tz: tz(), parsed: preview.parsed })}>
              {commit.isPending ? "Adding…" : "Add to schedule"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
