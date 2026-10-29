import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { latestResult, resultHead, evaluationResultsQuery } from "@/lib/evaluation-results";
import { EmptyResults, EvaluationResultsPanel } from "@/components/EvaluationResultsPanel";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/panel")({
  loader: ({ context }) => context.queryClient.ensureQueryData(evaluationResultsQuery(context.evaluationId)),
  head: () => resultHead("Panel de control", "Resultados publicados: circularidad, cumplimiento REP y finanzas."),
  errorComponent: ({ error }) => <div role="alert">No se pudieron cargar los resultados: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <EmptyResults />,
  component: Panel,
});
function Panel() {
  const { evaluationId } = Route.useRouteContext();
  const { data } = useSuspenseQuery(evaluationResultsQuery(evaluationId));
  const result = latestResult(data.results);
  return <div className="min-w-0 space-y-6"><h1 className="text-2xl font-semibold">Panel de control</h1>{result ? <EvaluationResultsPanel data={data} result={result} /> : <EmptyResults />}</div>;
}
