import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Check, GraduationCap, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useModuleAction, useModuleQuery } from "@/hooks/use-module";
import { deleteSubject, listAttendance, markClass, saveSubject, seedAttendance } from "@/lib/attendance/attendance.functions";
import { project } from "@/lib/attendance/projection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — TimeOS" },
      { name: "description", content: "Track attendance per subject and see how many classes you can safely miss." },
      { property: "og:title", content: "Attendance — TimeOS" },
      { property: "og:description", content: "Projected attendance against your minimum target." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const q = useModuleQuery("attendance", listAttendance);
  const [open, setOpen] = useState(false);
  const seed = useModuleAction(seedAttendance as never, ["attendance"], { success: "Sample subjects added" });
  const mark = useModuleAction(markClass, ["attendance"]);
  const del = useModuleAction(deleteSubject, ["attendance"], { success: "Subject removed" });
  const rows = (q.data ?? []).map((r) => ({ ...r, s: project(r.attended, r.total, r.target) }));
  const atRisk = rows.filter((r) => r.s.status !== "safe");

  return (
    <AppShell title="Attendance" actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Subject</Button>}>
      <PageIntro eyebrow="Attendance intelligence" title="Know exactly where you stand" text="Mark each class as attended or missed. TimeOS calculates how many you can still miss — or need to attend — to stay above your target." />
      {q.isLoading ? <Skeleton className="h-72" /> : !rows.length ? (
        <div className="surface grid place-items-center gap-3 p-12 text-center">
          <GraduationCap className="h-8 w-8 text-primary" />
          <p className="text-lg font-semibold">No subjects tracked</p>
          <p className="text-sm text-muted-foreground">Add your subjects to start tracking attendance.</p>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Add subject</Button>
            <Button variant="outline" disabled={seed.isPending} onClick={() => seed.mutate(undefined as never)}>Add Alex's subjects</Button>
          </div>
        </div>
      ) : (
        <>
          {atRisk.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <p><span className="font-medium">{atRisk.map((r) => r.subject).join(", ")}</span> {atRisk.length === 1 ? "needs" : "need"} attention. {atRisk[0]!.s.message}</p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <article key={r.id} className="surface animate-rise p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{r.subject}</h3>
                    <p className="tabular text-xs text-muted-foreground">{r.attended}/{r.total} classes · target {r.target}%</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${r.subject}`} onClick={() => del.mutate({ id: r.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className={cn("tabular text-3xl font-semibold tracking-tight", r.s.status === "risk" ? "text-destructive" : r.s.status === "edge" ? "text-warning-foreground" : "text-primary")}>{r.s.pct}%</span>
                </div>
                <div className="relative mt-2 h-2 rounded-full bg-muted">
                  <div className={cn("h-2 rounded-full", r.s.status === "risk" ? "bg-destructive" : r.s.status === "edge" ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, r.s.pct)}%` }} />
                  <div className="absolute -top-1 h-4 w-0.5 bg-foreground/60" style={{ left: `${r.target}%` }} aria-hidden />
                </div>
                <p className="mt-3 min-h-10 text-xs text-muted-foreground">{r.s.message}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate({ id: r.id, present: true })}><Check className="mr-1 h-3.5 w-3.5" /> Attended</Button>
                  <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate({ id: r.id, present: false })}><X className="mr-1 h-3.5 w-3.5" /> Missed</Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <SubjectDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function SubjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [f, setF] = useState({ subject: "", attended: 0, total: 0, target: 75 });
  const save = useModuleAction(saveSubject, ["attendance"], { success: "Subject added", onSuccess: () => { onOpenChange(false); setF({ subject: "", attended: 0, total: 0, target: 75 }); } });
  const num = (k: "attended" | "total" | "target") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add subject</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
          <div className="space-y-1.5"><Label htmlFor="a-sub">Subject</Label><Input id="a-sub" required maxLength={60} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="a-att">Attended</Label><Input id="a-att" type="number" min={0} value={f.attended} onChange={num("attended")} /></div>
            <div className="space-y-1.5"><Label htmlFor="a-tot">Total</Label><Input id="a-tot" type="number" min={0} value={f.total} onChange={num("total")} /></div>
            <div className="space-y-1.5"><Label htmlFor="a-tar">Target %</Label><Input id="a-tar" type="number" min={1} max={100} value={f.target} onChange={num("target")} /></div>
          </div>
          {f.attended > f.total && <p className="text-xs text-destructive">Attended can't be more than total classes.</p>}
          <DialogFooter><Button type="submit" disabled={save.isPending || f.attended > f.total}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
