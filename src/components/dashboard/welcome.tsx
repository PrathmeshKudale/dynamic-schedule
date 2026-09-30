import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction, tz } from "@/hooks/use-timeos";
import { loadDemo, startFresh } from "@/lib/timeos.functions";

export function Welcome() {
  const [step, setStep] = useState<"choose" | "fresh">("choose");
  const [f, setF] = useState({ name: "", wake: "07:00", sleep: "23:00", focus: 45, brk: 10 });
  const demo = useAction(loadDemo, { success: "Your first optimized schedule is ready." });
  const fresh = useAction(startFresh, { success: "Profile saved. Tell TimeOS what's on your plate." });

  return (
    <div className="mx-auto max-w-2xl py-10 animate-rise">
      <p className="text-sm font-medium text-primary">Welcome to TimeOS</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Let's build your first intelligent schedule.</h1>
      <p className="mt-3 text-muted-foreground">
        Start from Alex's week (a 2nd-year CS student with college, deadlines, gym and friends) to see TimeOS adapt, or set up your own
        routine.
      </p>

      {step === "choose" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={demo.isPending}
            onClick={() => demo.mutate({ tz: tz(), scenario: "normal" })}
            className="group rounded-2xl border border-primary/40 bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-semibold">Load Alex's demo week</h2>
            <p className="mt-1 text-sm text-muted-foreground">Timetable, tasks, protected time and a generated plan, all dated from today.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              {demo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating schedule…
                </>
              ) : (
                <>
                  Start demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStep("fresh")}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-shadow hover:shadow-md"
          >
            <h2 className="mt-8 font-semibold">Set up my own routine</h2>
            <p className="mt-1 text-sm text-muted-foreground">Wake and sleep times, focus length, breaks. Add tasks after.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
              Continue <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      ) : (
        <form
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            fresh.mutate(f);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="nm">Your name</Label>
            <Input id="nm" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wk">Wake time</Label>
              <Input id="wk" type="time" value={f.wake} onChange={(e) => setF({ ...f, wake: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sl">Sleep time</Label>
              <Input id="sl" type="time" value={f.sleep} onChange={(e) => setF({ ...f, sleep: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc">Focus session (min)</Label>
              <Input id="fc" type="number" min={15} max={120} value={f.focus} onChange={(e) => setF({ ...f, focus: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk">Break (min)</Label>
              <Input id="bk" type="number" min={5} max={30} value={f.brk} onChange={(e) => setF({ ...f, brk: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep("choose")}>
              Back
            </Button>
            <Button type="submit" disabled={fresh.isPending || !f.name.trim()}>
              {fresh.isPending ? "Saving…" : "Save & continue"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
