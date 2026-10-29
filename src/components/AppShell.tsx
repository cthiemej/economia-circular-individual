import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/simulator-content";

export type NavItem = { to: string; label: string; exact?: boolean };

export function AppShell({
  nav,
  userArea,
  children,
}: {
  nav: NavItem[];
  userArea: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between gap-4 bg-primary px-5 text-primary-foreground">
        <span className="truncate font-serif text-base">
          {COMPANY.name} — simulador de economía circular
        </span>
        <div className="flex shrink-0 items-center gap-3 text-sm">{userArea}</div>
      </header>
      <div className="border-b bg-notice px-5 py-1 text-xs text-notice-foreground">
        {COMPANY.disclaimer}
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar p-3 md:block">
          <nav className="flex flex-col gap-0.5">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: !!n.exact }}
                className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-6 py-6 md:px-10">
          <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: !!n.exact }}
                className="whitespace-nowrap rounded-md border px-3 py-1 text-xs"
                activeProps={{ className: "bg-accent" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {children ?? "Esta sección estará disponible próximamente."}
      </p>
    </div>
  );
}
