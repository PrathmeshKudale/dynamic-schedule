import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction, type TaskRow } from "@/hooks/use-timeos";
import { saveTask } from "@/lib/timeos.functions";
import { CATEGORIES, PRIORITIES } from "@/lib/parse";
import { CAT_LABEL } from "@/lib/ui";

function localInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function TaskDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task?: TaskRow | null }) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState<string>("ACADEMIC");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [energy, setEnergy] = useState<string>("MEDIUM");
  const save = useAction(saveTask, { success: task ? "Task updated" : "Task added — optimize to plan it", onSuccess: () => onOpenChange(false) });

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setMinutes(task?.estimated_minutes ?? 60);
    setDeadline(localInput(task?.deadline ?? null));
    setCategory(task?.category ?? "ACADEMIC");
    setPriority(task?.priority ?? "MEDIUM");
    setEnergy(task?.energy_requirement ?? "MEDIUM");
  }, [open, task]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Tasks are flexible. TimeOS finds time for them before their deadline.</DialogDescription>
        </DialogHeader>
        <form
          id="task-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            save.mutate({
              id: task?.id,
              title,
              category: category as (typeof CATEGORIES)[number],
              priority: priority as (typeof PRIORITIES)[number],
              estimatedMinutes: Math.max(15, Math.round(minutes)),
              deadline: deadline ? new Date(deadline).toISOString() : null,
              energy: energy as "LOW" | "MEDIUM" | "HIGH",
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. DBMS Assignment" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-min">Estimated minutes</Label>
              <Input id="t-min" type="number" min={15} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dl">Deadline</Label>
              <Input id="t-dl" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Category" value={category} onChange={setCategory} options={CATEGORIES.map((c): [string, string] => [c, CAT_LABEL[c] ?? c])} />
            <Field label="Priority" value={priority} onChange={setPriority} options={PRIORITIES.map((p): [string, string] => [p, p.charAt(0) + p.slice(1).toLowerCase()])} />
            <Field label="Energy" value={energy} onChange={setEnergy} options={[["LOW", "Low"], ["MEDIUM", "Medium"], ["HIGH", "High"]] as [string, string][]} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="task-form" disabled={!title.trim() || save.isPending}>
            {save.isPending ? "Saving…" : "Save task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
