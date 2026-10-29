import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { allEvaluationsQuery, focalLabel, STATUS_LABEL } from "@/lib/evaluations";
import { createDemoEvaluation } from "@/lib/demo";
import { formatChile } from "@/lib/chile-time";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(allEvaluationsQuery),
  head: () => ({
    meta: [
      { title: "Clientes y evaluaciones — Simulador de Economía Circular" },
      { name: "description", content: "Lista de clientes y sus evaluaciones." },
      { property: "og:title", content: "Clientes y evaluaciones — Simulador de Economía Circular" },
      { property: "og:description", content: "Lista de clientes y sus evaluaciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminEvaluations,
  errorComponent: ({ error }) => <div role="alert">{(error as Error).message}</div>,
});

function AdminEvaluations() {
  const { data: evaluations } = useSuspenseQuery(allEvaluationsQuery);
  const [demoBusy, setDemoBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function demo() {
    if (demoBusy) return;
    setDemoBusy(true);
    try {
      const id = await createDemoEvaluation();
      await qc.invalidateQueries({ queryKey: ["evaluations-all"] });
      await navigate({ to: "/admin/$evaluationId", params: { evaluationId: id } });
      toast.success("Evaluación de demostración creada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear la demostración."); }
    finally { setDemoBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clientes y evaluaciones</h1>
        <Button variant="outline" disabled={demoBusy} onClick={demo}><FlaskConical size={16} />{demoBusy ? "Creando…" : "Crear evaluación de demostración"}</Button>
      </div>
      {evaluations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay evaluaciones de ningún cliente.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Cliente</th><th className="p-2">Evaluación</th><th className="p-2">Producto focal</th><th className="p-2">Horizonte</th><th className="p-2">Estado</th><th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <tr key={e.id} className="border-b hover:bg-muted/50">
                <td className="p-2">{e.ownerName}</td>
                <td className="p-2">
                  <Link to="/admin/$evaluationId" params={{ evaluationId: e.id }} className="font-medium underline-offset-2 hover:underline">{e.name}</Link>
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
    </div>
  );
}
