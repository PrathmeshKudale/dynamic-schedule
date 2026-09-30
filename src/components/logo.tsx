export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-tight">TimeOS</span>}
    </span>
  );
}
