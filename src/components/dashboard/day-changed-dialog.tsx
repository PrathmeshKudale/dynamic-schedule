import { useState } from "react";
import { Loader2, Siren } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAction, tz } from "@/hooks/use-timeos";
import { myDayChanged } from "@/lib/timeos.functions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "lecture", label: "Unexpected lecture", template: "Extra lecture tomorrow at 4 PM" },
  { id: "assignment", label: "Assignment added", template: "New assignment due tomorrow, need 2 hours" },
  { id: "event", label: "Event added", template: "" },
  { id: "travel", label: "Travel delay", template: "Travel delay today from 5 PM to 7 PM" },
  { id: "tired", label: "Feeling tired", template: "" },
  { id: "missed", label: "Missed task", template: "" },
  { id: "emergency", label: "Personal emergency", template: "Personal emergency today from 6 PM to 9 PM" },
  { id: "custom", label: "Custom", template: "" },
];

export function DayChangedDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState("");
  const run = useAction(myDayChanged, {
    error: "TimeOS couldn't rebuild your day. Your existing schedule is safe.",
    onSuccess: () => {
      onOpenChange(false);
      setReason(null);
      setText("");
      onDone?.();
    },
  });
  const needsText = reason && !["tired", "missed"].includes(reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-destructive" /> My day changed
          </DialogTitle>
          <DialogDescription>TimeOS rebuilds the rest of your day and shows you every change before applying it.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => {
                setReason(o.id);
                setText(o.template);
              }}
              aria-pressed={reason === o.id}
              className={cn(
                "rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40",
                reason === o.id && "border-primary bg-accent text-accent-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {reason && (
          <div className="space-y-1.5 animate-rise">
            <Label htmlFor="changed">{needsText ? "What changed?" : "Anything to add? (optional)"}</Label>
            <Textarea
              id="changed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={reason === "tired" ? "I'll protect the rest of today as rest time." : "e.g. Extra lecture tomorrow at 4 PM"}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || (needsText ? text.trim().length < 3 : false) || run.isPending}
            onClick={() => reason && run.mutate({ tz: tz(), reason, text: text.trim() })}
          >
            {run.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {run.isPending ? "Rebuilding your day…" : "Reschedule my day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
