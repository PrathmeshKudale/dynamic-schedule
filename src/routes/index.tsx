import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitCompareArrows, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TimeOS — Your AI Operating System for Time" },
      { name: "description", content: "Calendars store your time. TimeOS understands, plans and continuously adapts it — and explains every change." },
      { property: "og:title", content: "TimeOS — Your AI Operating System for Time" },
      { property: "og:description", content: "Plan less. Adapt faster. Live more. An adaptive, explainable scheduler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const LOOP = ["Input life data", "Understand context", "Prioritize", "Generate schedule", "Explain why", "You approve", "Life changes", "Adapt"];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <Button asChild size="sm">
          <Link to="/auth">Open TimeOS</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div className="animate-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Adaptive decision engine for time
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight md:text-[56px]">
              Calendars store your time.
              <br />
              <span className="text-primary">TimeOS adapts it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Classes, deadlines, gym, friends and sleep go in. A realistic plan comes out, and it rebuilds itself when
              life changes. Every move comes with a reason.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Try the live demo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Plan less. Adapt faster. Live more.</p>
          </div>

          <div className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-sm [animation-delay:120ms]">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Schedule updated</p>
            <div className="mt-4 space-y-3 text-sm">
              <DiffRow tag="Moved" title="DSA Test Prep" from="Fri 5:00 PM" to="Sat 7:45 AM" why="Conflicts with College Festival" />
              <DiffRow tag="Moved" title="Hackathon Dev" from="Thu 4:00 PM" to="Sat 7:00 PM" why="Extra lecture added" />
              <div className="rounded-lg border border-border bg-accent/60 p-3">
                <p className="flex items-center gap-2 font-medium text-accent-foreground">
                  <ShieldCheck className="h-4 w-4" /> Protected
                </p>
                <p className="mt-1 text-muted-foreground">Gym · Friends · Sleep · Dinner</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-14">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {LOOP.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-card px-3 py-1.5">{s}</span>
                {i < LOOP.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            ))}
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: Sparkles, t: "Understands plain language", d: "Type “festival Friday 5 to 10 PM” and TimeOS turns it into a real, checked calendar event." },
              { icon: Zap, t: "Moves only what's affected", d: "When plans change, only the work that clashes gets moved. Everything else stays where it was." },
              { icon: GitCompareArrows, t: "Shows every change", d: "See what moved and why, and what was protected. Nothing changes until you approve it." },
            ].map((f) => (
              <div key={f.t}>
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function DiffRow({ tag, title, from, to, why }: { tag: string; title: string; from: string; to: string; why: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning-foreground">{tag}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        <span className="line-through">{from}</span> → <span className="text-foreground">{to}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{why}</p>
    </div>
  );
}
