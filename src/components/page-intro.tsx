export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-6 animate-rise">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
