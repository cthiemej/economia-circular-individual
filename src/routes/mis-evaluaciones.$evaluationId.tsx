import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { getAdmin, getClient } from "@/lib/session";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientInfo } from "@/lib/session";
import { evaluationContextQuery } from "@/lib/evaluation-context";
import { EvaluationHeader } from "@/components/EvaluationHeader";
import { AppShell, type NavItem } from "@/components/AppShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const client = await getClient();
    const admin = client ? null : await getAdmin();
    if (!client && !admin) throw redirect({ to: "/" });
    return { client, admin, evaluationId: params.evaluationId };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(evaluationContextQuery(context.evaluationId)),
  errorComponent: ({ error }) => <div role="alert">{(error as Error).message}</div>,
  head: () => ({
    meta: [
      { title: "Mi evaluación — Simulador de Economía Circular" },
      { name: "description", content: "Espacio de trabajo de tu evaluación en el simulador de economía circular." },
      { property: "og:title", content: "Mi evaluación — Simulador de Economía Circular" },
      { property: "og:description", content: "Espacio de trabajo de tu evaluación en el simulador de economía circular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvaluationLayout,
});

function nav(evaluationId: string, isAdminViewing: boolean): NavItem[] {
  const base = `/mis-evaluaciones/${evaluationId}`;
  const items: NavItem[] = [
    { to: base, label: "Bienvenida", exact: true },
    { to: `${base}/panel-base`, label: "Panel base" },
    { to: `${base}/diagnostico`, label: "Diagnóstico" },
    { to: `${base}/decisiones`, label: "Decisiones" },
    { to: `${base}/cumplimiento`, label: "Cumplimiento" },
    { to: `${base}/panel`, label: "Panel de control" },
    { to: `${base}/anios`, label: "Ver resultados por año" },
    { to: `${base}/resumen`, label: "Resumen del juego" },
    { to: `${base}/glosario`, label: "Glosario" },
  ];
  return isAdminViewing ? items : items;
}

function EvaluationLayout() {
  const { client, admin, evaluationId } = Route.useRouteContext();
  const { data: ctx } = useSuspenseQuery(evaluationContextQuery(evaluationId));
  return (
    <AppShell
      nav={nav(evaluationId, !!admin)}
      userArea={client ? <ClientMenu client={client} /> : <AdminBackLink evaluationId={evaluationId} />}
    >
      <EvaluationHeader ctx={ctx} />
      <Outlet />
    </AppShell>
  );
}

function AdminBackLink({ evaluationId }: { evaluationId: string }) {
  return (
    <Link to="/admin/$evaluationId" params={{ evaluationId }} className="rounded-md px-2 py-1 hover:bg-primary-foreground/10">
      ← Volver al panel de administrador
    </Link>
  );
}

function ClientMenu({ client }: { client: ClientInfo }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="rounded-md px-2 py-1 hover:bg-primary-foreground/10">
        {client.fullName}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{client.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/mis-evaluaciones">Mis evaluaciones</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
