import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { latestResult, resultHead, evaluationResultsQuery, yearLabel } from "@/lib/evaluation-results";
import { EmptyResults, EvaluationResultsPanel } from "@/components/EvaluationResultsPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/anios")({
  validateSearch: (search: Record<string, unknown>): { year?: number | undefined } => ({ year: Number.isInteger(Number(search["year"])) && Number(search["year"]) > 0 ? Number(search["year"]) : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(evaluationResultsQuery(context.evaluationId)),
  head: () => resultHead("Ver resultados por año", "Resultados por año y proyección posterior."),
  errorComponent: ({ error }) => <div role="alert">No se pudieron cargar los resultados: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <EmptyResults />,
  component: Anios,
});

function Anios() {
  const { evaluationId } = Route.useRouteContext();
  const { data } = useSuspenseQuery(evaluationResultsQuery(evaluationId));
  const { year } = Route.useSearch();
  const navigate = Route.useNavigate();
  const result = year === undefined ? latestResult(data.results) : data.results.find((r) => r.year === year);
  return <div className="min-w-0 space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold">Ver resultados por año</h1>{data.results.length > 0 && <Select value={result ? String(result.year) : ""} onValueChange={(v) => navigate({ search: { year: Number(v) } })}><SelectTrigger aria-label="Año de resultados" className="w-60"><SelectValue placeholder="Selecciona un año" /></SelectTrigger><SelectContent>{data.results.map((r) => <SelectItem key={r.year} value={String(r.year)}>{yearLabel(r)}</SelectItem>)}</SelectContent></Select>}</div>{result ? <EvaluationResultsPanel data={data} result={result} /> : data.results.length ? <p className="border-y py-10 text-muted-foreground">El año solicitado aún no tiene resultados publicados.</p> : <EmptyResults />}</div>;
}
