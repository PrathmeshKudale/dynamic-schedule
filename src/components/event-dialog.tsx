import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction, type EventRow } from "@/hooks/use-timeos";
import { deleteEvent, saveEvent } from "@/lib/timeos.functions";
import { CATEGORIES } from "@/lib/parse";
import { CAT_LABEL } from "@/lib/ui";

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultStart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: EventRow | null;
  defaultStart?: Date | null;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [prot, setProt] = useState(false);
  const save = useAction(saveEvent, { success: "Event saved", onSuccess: () => onOpenChange(false) });
  const del = useAction(deleteEvent, { success: "Event deleted", onSuccess: () => onOpenChange(false) });

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setStart(toLocalInput(new Date(event.start_time)));
      setEnd(toLocalInput(new Date(event.end_time)));
      setCategory(event.category);
      setProt(event.is_protected);
    } else {
      const s = defaultStart ?? new Date();
      setTitle("");
      setStart(toLocalInput(s));
      setEnd(toLocalInput(new Date(s.getTime() + 3_600_000)));
      setCategory("OTHER");
      setProt(false);
    }
  }, [open, event, defaultStart]);

  const invalid = !title.trim() || !start || !end || new Date(end) <= new Date(start);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>Events are fixed. TimeOS plans your tasks around them.</DialogDescription>
        </DialogHeader>
        <form
          id="event-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalid) return;
            save.mutate({
              id: event?.id,
              title,
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              category: category as (typeof CATEGORIES)[number],
              isProtected: prot,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Physics lab" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Start</Label>
              <Input id="ev-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">End</Label>
              <Input id="ev-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CAT_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Protected time</span>
              <span className="block text-xs text-muted-foreground">TimeOS will never schedule work over it or move it.</span>
            </span>
            <Switch checked={prot} onCheckedChange={setProt} />
          </label>
          {end && start && new Date(end) <= new Date(start) && <p className="text-sm text-destructive">End must be after start.</p>}
        </form>
        <DialogFooter className="gap-2 sm:justify-between">
          {event ? (
            <Button variant="ghost" className="text-destructive" onClick={() => del.mutate({ id: event.id })} disabled={del.isPending}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" form="event-form" disabled={invalid || save.isPending}>
            {save.isPending ? "Saving…" : "Save event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
