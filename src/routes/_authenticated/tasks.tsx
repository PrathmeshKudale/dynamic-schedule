import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/task-dialog";
import { useAction, useTimeOS, type TaskRow } from "@/hooks/use-timeos";
import { deleteTask, toggleTask } from "@/lib/timeos.functions";
import { fmtDayTime, fmtDuration } from "@/lib/time";
import { CAT_LABEL, catStyle } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — TimeOS" },
      { name: "description", content: "Flexible work TimeOS plans around your fixed commitments." },
      { property: "og:title", content: "Tasks — TimeOS" },
      { property: "og:description", content: "Your tasks, deadlines and planned time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const q = useTimeOS();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<TaskRow | null>(null);
  const toggle = useAction(toggleTask);
  const del = useAction(deleteTask, { success: "Task deleted" });
  const planned = new Map<string, number>();
  q.data?.blocks.forEach((b) => planned.set(b.task_id, (planned.get(b.task_id) ?? 0) + (Date.parse(b.end_time) - Date.parse(b.start_time)) / 60000));
  const tasks = [...(q.data?.tasks ?? [])].sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity));

  return (
    <AppShell title="Tasks" actions={<Button size="sm" onClick={() => { setSel(null); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Task</Button>}>
      {q.isLoading ? <Skeleton className="h-64" /> : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-medium">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">What do you need to get done?</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>Create task</Button>
        </div>
      ) : (
        <ul className="divide-y divide-border surface">
          {tasks.map((t) => {
            const p = planned.get(t.id) ?? 0;
            return (
              <li key={t.id} className="flex items-center gap-4 p-4">
                <Checkbox aria-label={`Complete ${t.title}`} checked={t.is_completed} onCheckedChange={(v) => toggle.mutate({ id: t.id, done: v === true })} />
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", t.is_completed && "text-muted-foreground line-through")}>{t.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", catStyle(t.category).dot)} />{CAT_LABEL[t.category]}</span>
                    <span>{t.priority.toLowerCase()} priority</span>
                    <span>{t.deadline ? `due ${fmtDayTime(t.deadline)}` : "no deadline"}</span>
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>Planned</span><span>{fmtDuration(p)} / {fmtDuration(t.estimated_minutes)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (p / t.estimated_minutes) * 100)}%` }} /></div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setSel(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => del.mutate({ id: t.id })}><Trash2 className="h-4 w-4" /></Button>
              </li>
            );
          })}
        </ul>
      )}
      <TaskDialog open={open} onOpenChange={setOpen} task={sel} />
    </AppShell>
  );
}
