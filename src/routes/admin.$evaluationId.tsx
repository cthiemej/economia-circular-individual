import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { evaluationQuery } from "@/lib/evaluations";

export const Route = createFileRoute("/admin/$evaluationId")({
  loader: async ({ context, params }) => {
    const evaluation = await context.queryClient.ensureQueryData(evaluationQuery(params.evaluationId));
    if (!evaluation) throw new Error("Evaluación no encontrada");
  },
  component: EvaluationLayout,
  errorComponent: ({ error }) => <div role="alert">{(error as Error).message}</div>,
  notFoundComponent: () => <div>Evaluación no encontrada.</div>,
});

const tab = "rounded-md border px-3 py-1.5 text-sm hover:bg-accent";
const active = { className: "bg-accent font-medium" };

function EvaluationLayout() {
  const { evaluationId } = Route.useParams();
  const { data: evaluation } = useSuspenseQuery(evaluationQuery(evaluationId));
  if (!evaluation) return null;
  const p = { evaluationId };
  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Clientes y evaluaciones</Link>
        <h1 className="text-2xl font-semibold">{evaluation.name}</h1>
        <p className="text-sm text-muted-foreground">
          {evaluation.horizon} {evaluation.horizon === 1 ? "año" : "años"} · rebote {evaluation.rebound ? "sí" : "no"} · proyección {evaluation.projection ? "sí" : "no"}
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 print:hidden">
        <Link to="/admin/$evaluationId/parametros" params={p} className={tab} activeProps={active}>Parámetros</Link>
        <Link to="/admin/$evaluationId/seguimiento" params={p} className={tab} activeProps={active}>Seguimiento y procesamiento</Link>
        <Link to="/mis-evaluaciones/$evaluationId" params={p} className={tab}>Abrir evaluación completa →</Link>
        <Link to="/admin/motor" className={tab}>Prueba del motor</Link>
      </nav>
      <Outlet />
    </div>
  );
}
