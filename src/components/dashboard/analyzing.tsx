import { Check, Loader2 } from "lucide-react";

const STEPS = ["Checking conflicts", "Protecting commitments", "Finding available time", "Optimizing tasks"];

export function Analyzing({ label = "TimeOS is analyzing your schedule…" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-accent/50 p-5 animate-rise" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </p>
      <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
            <Check className="h-3.5 w-3.5 text-primary" /> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Minimal markdown: paragraphs, "- " bullets and **bold**. */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}|\n(?=[-•*] )/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") ? (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^[-•*] /.test(l.trim())))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().replace(/^[-•*] /, ""))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(b.replace(/^#+\s*/, ""))}</p>;
      })}
    </div>
  );
}
