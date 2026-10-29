import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { GAPS, NORMS, NORM_OPTIONS } from "@/lib/simulator-content";
import { mergeParams } from "@/lib/simulator-engine";
import { nf, resultHead, evaluationResultsQuery, yearLabel } from "@/lib/evaluation-results";
import { PracticeFeedback } from "@/components/PracticeFeedback";
import { DataTable, FinanceTable } from "@/components/ResultsCharts";
import { EmptyResults } from "@/components/EvaluationResultsPanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/resumen")({
  loader: ({ context }) => context.queryClient.ensureQueryData(evaluationResultsQuery(context.evaluationId)),
  head: () => resultHead("Resumen del juego", "Diagnóstico, estrategia, normativa y resultados de economía circular."),
  errorComponent: ({ error }) => <div role="alert">No se pudo cargar el resumen: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <EmptyResults />,
  component: Resumen,
});

function Resumen() {
  const { evaluationId } = Route.useRouteContext();
  const { data } = useSuspenseQuery(evaluationResultsQuery(evaluationId));
  const params = mergeParams(data.ctx.run.params);
  const diagnosisPublished = data.ctx.stages.diagnosisConfirmed;
  const normsPublished = data.ctx.stages.regmapConfirmed;
  const played = data.results.filter((r) => !r.isProjection);
  const projection = data.results.find((r) => r.isProjection);
  return <div className="game-summary min-w-0 space-y-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Resumen del juego</h1><p className="mt-2 text-sm text-muted-foreground">{data.ctx.evaluationName} · {params.familyLabel[data.ctx.focal]}</p></div><Button variant="outline" className="print:hidden" onClick={() => window.print()}><Printer size={16} />Imprimir / guardar PDF</Button></div>
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">1. Diagnóstico</h2>{!data.gaps.length && <p className="text-sm text-muted-foreground">Sin diagnóstico guardado.</p>}{data.gaps.map((answer) => { const gap = GAPS.find((g) => g.id === answer.id); return <div key={answer.id} className="space-y-2"><h3 className="font-semibold">{gap?.text ?? answer.id}</h3><p className="whitespace-pre-wrap text-sm">{answer.justification}</p>{diagnosisPublished && gap && <p className={`text-sm ${gap.isReal ? "text-success" : "text-destructive"}`}>{gap.feedback}</p>}</div>; })}</section>
    <section className="space-y-5 border-t pt-6"><h2 className="text-xl font-semibold">2. Estrategia</h2>{played.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay años procesados.</p>}{played.map((r) => { const d = data.decisions.find((decision) => decision.year === r.year); return <div key={r.year} className="space-y-4"><h3 className="text-lg font-semibold">{yearLabel(r)}</h3><PracticeFeedback decision={d} params={params} full /></div>; })}</section>
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">3. Normativa</h2><DataTable headers={["Norma", "Respuesta", "Justificación", ...(normsPublished ? ["Clave provisional", "Comentario"] : [])]} rows={NORMS.map((n) => { const answer = data.norms.find((a) => a.id === n.id); return [n.name, NORM_OPTIONS.find((o) => o.value === answer?.value)?.label ?? "Sin respuesta", answer?.justification || "—", ...(normsPublished ? [<span className={answer?.value === n.key ? "text-success" : "text-destructive"}>{NORM_OPTIONS.find((o) => o.value === n.key)?.label}</span>, n.explanation] : [])]; })} /></section>
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">4. Costo REP</h2><DataTable headers={["Año", "REP (UF)", "REP (MCLP)", "Multas (UF)", "Recargos (UF)"]} rows={played.map((r) => [yearLabel(r), nf(r.rep.costUF), nf(r.finance.repCost), nf(r.rep.penaltyUF), nf(r.rep.surchargeUF)])} /></section>
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">5. Resultados</h2><DataTable headers={["Año", "Índice", "Meta", "Disposición final (t)", "Acumulada (t)", "Permitida (t)", "Utilidad (MCLP)"]} rows={played.map((r) => [yearLabel(r), nf(r.index), nf(r.indexTarget), nf(r.landfill), nf(r.landfillCum), nf(r.landfillAllowedCum), nf(r.finance.profit)])} /><FinanceTable results={played} /></section>
    {projection && <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">6. Proyección posterior · año {projection.year}</h2><DataTable headers={["Índice", "Disposición final (t)", "Utilidad (MCLP)", "Volumen", "Emisiones (tCO2e)"]} rows={[[nf(projection.index), nf(projection.landfill), nf(projection.finance.profit), nf(projection.volume, 3), nf(projection.emissions)]]} /><FinanceTable results={[projection]} /></section>}
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">Preguntas guía</h2><ol className="list-decimal space-y-3 pl-5 text-sm">{["¿En qué nivel de la jerarquía quedó cada práctica?", "¿Qué práctica mejoró un indicador y empeoró otro?", "¿Cuánto costó la REP y cuánto ahorró reducir la merma?", "¿Qué leyes aplican y cuál es la más discutible?", "¿Qué pasó con el volumen y con las toneladas por el efecto rebote?", "¿Qué mostró la proyección?"].map((q) => <li key={q}>{q}</li>)}</ol></section>
  </div>;
}
