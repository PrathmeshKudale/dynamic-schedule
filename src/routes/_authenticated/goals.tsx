import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ErrorBox, PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useModuleAction, useModuleQuery } from "@/hooks/use-module";
import { createGoal, deleteGoal, listGoals, seedGoals } from "@/lib/goals/goals.functions";
import { GOAL_CATEGORIES } from "@/lib/goals/roadmap";
import { toggleTask } from "@/lib/timeos.functions";
import { fmtDay } from "@/lib/time";
import { CAT_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — TimeOS" },
      { name: "description", content: "Turn long-term goals into milestones and scheduled tasks." },
      { property: "og:title", content: "Goals — TimeOS" },
      { property: "og:description", content: "Goal roadmaps that flow straight into your schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const q = useModuleQuery("goals", listGoals);
  const [open, setOpen] = useState(false);
  const seed = useModuleAction(seedGoals as never, ["goals"], { success: "Sample goals added" });
  const toggle = useModuleAction(toggleTask, ["goals"]);
  const del = useModuleAction(deleteGoal, ["goals"], { success: "Goal removed" });

  return (
    <AppShell title="Goals" actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create goal</Button>}>
      <PageIntro eyebrow="Goal → Roadmap → Tasks → Calendar" title="Your goals, broken into real time" text="Every goal becomes milestones, each milestone a task TimeOS can schedule. Tick a milestone and progress updates everywhere." />
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
      ) : q.isError ? (
        <ErrorBox onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <div className="surface grid place-items-center gap-3 p-12 text-center">
          <Target className="h-8 w-8 text-primary" />
          <p className="text-lg font-semibold">No goals yet</p>
          <p className="text-sm text-muted-foreground">What do you want to accomplish?</p>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Create goal</Button>
            <Button variant="outline" disabled={seed.isPending} onClick={() => seed.mutate(undefined as never)}>Add Alex's sample goals</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((g) => (
            <article key={g.id} className="surface animate-rise p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("text-xs font-medium uppercase tracking-wider", catStyle(g.category).text)}>{CAT_LABEL[g.category]}</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{g.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {g.completedHours}h of {g.estimatedHours}h{g.targetDate ? ` · target ${fmtDay(g.targetDate)}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Delete ${g.title}`} onClick={() => del.mutate({ id: g.id, removeTasks: true })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={g.progress} className="h-2" />
                <span className="tabular w-10 text-right text-sm font-semibold">{g.progress}%</span>
              </div>
              <ol className="mt-4 space-y-1.5">
                {g.milestones.map((m) => (
                  <li key={m.id}>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-60"
                      disabled={!m.taskId || toggle.isPending}
                      onClick={() => m.taskId && toggle.mutate({ id: m.taskId, done: !m.done })}
                    >
                      {m.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className={cn("flex-1", m.done && "text-muted-foreground line-through")}>{m.title}</span>
                      <span className="tabular text-xs text-muted-foreground">{Math.round(m.minutes / 6) / 10}h</span>
                    </button>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
      <GoalDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function GoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof GOAL_CATEGORIES)[number]>("LEARNING");
  const [hours, setHours] = useState(12);
  const [date, setDate] = useState("");
  const create = useModuleAction(createGoal, ["goals"], {
    success: "Roadmap created — milestones added to your tasks",
    onSuccess: () => { onOpenChange(false); setTitle(""); setDate(""); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a goal</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ title, category, estimatedHours: hours, targetDate: date ? new Date(`${date}T23:59`).toISOString() : null });
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="g-title">Goal</Label><Input id="g-title" required minLength={2} maxLength={80} placeholder="Learn React in 30 days" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GOAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="g-hours">Total hours</Label><Input id="g-hours" type="number" min={1} max={200} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="g-date">Target date (optional)</Label><Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate roadmap</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
