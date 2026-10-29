import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAdmin } from "@/lib/session";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const admin = await getAdmin();
    if (!admin) throw redirect({ to: "/admin/login" });
    return { admin };
  },
  head: () => ({
    meta: [
      { title: "Administrador — Simulador de Economía Circular" },
      { name: "description", content: "Administración de evaluaciones del simulador de economía circular." },
      { property: "og:title", content: "Administrador — Simulador de Economía Circular" },
      { property: "og:description", content: "Administración de evaluaciones del simulador de economía circular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const NAV: NavItem[] = [
  { to: "/admin", label: "Clientes y evaluaciones" },
  { to: "/admin/motor", label: "Prueba del motor" },
];

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <AppShell
      nav={NAV}
      userArea={
        <>
          <span>{admin.name}</span>
          <Button size="sm" variant="secondary" onClick={signOut}>Cerrar sesión</Button>
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
