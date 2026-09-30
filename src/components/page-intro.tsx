export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-6 animate-rise">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface p-8 text-center">
      <p className="font-medium">We couldn't load this page.</p>
      <button className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={onRetry}>Retry</button>
    </div>
  );
}
