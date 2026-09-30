import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Settings,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

const GROUPS = [
  {
    label: "Plan",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutGrid },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Grow",
    items: [
      { to: "/goals", label: "Goals", icon: Target },
      { to: "/attendance", label: "Attendance", icon: GraduationCap },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/assistant", label: "Ask TimeOS", icon: Bot },
      { to: "/what-if", label: "What-If", icon: FlaskConical },
    ],
  },
] as const;

const MOBILE = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/assistant", label: "AI", icon: Bot },
  { to: "/settings", label: "Profile", icon: Settings },
] as const;

export function AppShell({ children, title, actions }: { children: ReactNode; title?: string; actions?: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const linkCls =
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground";
  const activeCls = { className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium [&_svg]:text-sidebar-primary" };
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/dashboard" aria-label="TimeOS home" className="text-sidebar-foreground">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-2" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((n) => (
                  <Link key={n.to} to={n.to} className={linkCls} activeProps={activeCls}>
                    <n.icon className="h-4 w-4" aria-hidden />
                    {n.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-3 mb-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs text-sidebar-foreground/70">
          <p className="font-medium text-sidebar-foreground">Plan less. Adapt faster.</p>
          <p className="mt-0.5">TimeOS proposes — you decide.</p>
        </div>
        <div className="flex flex-col gap-0.5 border-t border-sidebar-border p-3">
          <Link to="/settings" className={linkCls} activeProps={activeCls}>
            <Settings className="h-4 w-4" aria-hidden /> Settings
          </Link>
          <button onClick={signOut} className={linkCls}>
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/75 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="md:hidden" aria-label="TimeOS home">
              <Logo compact />
            </Link>
            {title && <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden" aria-label="Main">
        {MOBILE.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary font-medium" }}
          >
            <n.icon className="h-5 w-5" aria-hidden />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
