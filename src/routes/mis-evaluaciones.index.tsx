import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getClient } from "@/lib/session";
import { createEvaluation, defaultRebound, focalLabel, myEvaluationsQuery, STATUS_LABEL } from "@/lib/evaluations";
import { FOCAL_ORDER } from "@/lib/evaluations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatChile } from "@/lib/chile-time";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/mis-evaluaciones/")({
  ssr: false,
  beforeLoad: async () => {
    const client = await getClient();
    if (!client) throw redirect({ to: "/" });
    return { client };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(myEvaluationsQuery(context.client.userId)),
  head: () => ({
    meta: [
      { title: "Mis evaluaciones — Simulador de Economía Circular" },
      { name: "description", content: "Tus evaluaciones del simulador de economía circular." },
      { property: "og:title", content: "Mis evaluaciones — Simulador de Economía Circular" },
      { property: "og:description", content: "Tus evaluaciones del simulador de economía circular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyEvaluations,
});

function MyEvaluations() {
  const { client } = Route.useRouteContext();
  const { data: evaluations } = useSuspenseQuery(myEvaluationsQuery(client.userId));
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mis evaluaciones</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)}>Nueva evaluación</Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">{client.fullName}</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{client.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {evaluations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tienes evaluaciones. Crea la primera con «Nueva evaluación».</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Nombre</th><th className="p-2">Producto focal</th><th className="p-2">Horizonte</th><th className="p-2">Estado</th><th className="p-2">Creada</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <tr key={e.id} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  <Link to="/mis-evaluaciones/$evaluationId" params={{ evaluationId: e.id }} className="font-medium underline-offset-2 hover:underline">{e.name}</Link>
                </td>
                <td className="p-2">{focalLabel(e.focal)}</td>
                <td className="p-2">{e.horizon} {e.horizon === 1 ? "año" : "años"}</td>
                <td className="p-2">{STATUS_LABEL[e.status] ?? e.status}</td>
                <td className="p-2">{formatChile(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <NewEvaluationDialog open={open} onOpenChange={setOpen} userId={client.userId} />
    </div>
  );
}

function NewEvaluationDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [focal, setFocal] = useState<typeof FOCAL_ORDER[number]>("V");
  const [horizon, setHorizon] = useState(4);
  const [rebound, setRebound] = useState(true);
  const [projection, setProjection] = useState(true);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) { toast.error("Escribe un nombre (por ejemplo, el de la empresa)"); return; }
    setBusy(true);
    try {
      const id = await createEvaluation({ userId, name: name.trim(), focal, horizon, rebound, projection });
      await qc.invalidateQueries({ queryKey: ["evaluations", userId] });
      onOpenChange(false);
      setName("");
      navigate({ to: "/mis-evaluaciones/$evaluationId", params: { evaluationId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la evaluación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva evaluación</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="en">Nombre (empresa o fecha)</Label>
            <Input id="en" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Mi empresa — octubre 2026" />
          </div>
          <div className="space-y-1">
            <Label id="focal-label">Producto focal</Label>
            <div className="flex gap-2" role="group" aria-labelledby="focal-label">
              {FOCAL_ORDER.map((f) => (
                <Button key={f} type="button" size="sm" aria-pressed={f === focal} variant={f === focal ? "default" : "outline"} onClick={() => setFocal(f)}>{focalLabel(f)}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label id="horizon-label">Horizonte (años)</Label>
            <div className="flex gap-2" role="group" aria-labelledby="horizon-label">
              {[1, 2, 3, 4].map((h) => (
                <Button key={h} type="button" size="sm" aria-pressed={h === horizon} variant={h === horizon ? "default" : "outline"}
                  onClick={() => { setHorizon(h); setRebound(defaultRebound(h)); }}>{h}</Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rb">Efecto rebote</Label>
            <Switch id="rb" checked={rebound} onCheckedChange={setRebound} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pj">Proyección posterior de 1 año</Label>
            <Switch id="pj" checked={projection} onCheckedChange={setProjection} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={busy}>{busy ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
