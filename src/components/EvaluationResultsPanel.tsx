import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { mergeParams, type YearResult } from "@/lib/simulator-engine";
import { nf, pct, yearLabel, type EvaluationResults } from "@/lib/evaluation-results";
import { PracticeFeedback } from "@/components/PracticeFeedback";
import { ResultsCharts } from "@/components/ResultsCharts";

const statusLabels = { correcta: "Correcta", erronea: "Errónea", no_presentada: "No presentada", no_evaluada: "No evaluada" };
export function EmptyResults() {
  return <div className="border-y py-12 text-center"><h2 className="text-lg font-semibold">Aún no hay resultados publicados</h2><p className="mt-2 text-sm text-muted-foreground">Esta evaluación todavía no tiene años procesados.</p></div>;
}
export function EvaluationResultsPanel({ data, result }: { data: EvaluationResults; result: YearResult }) {
  const stats = [
    { title: "Índice de circularidad", value: nf(result.index), detail: `Meta: ${nf(result.indexTarget)} · ${pct(result.indexTarget > 0 ? result.index / result.indexTarget : 0)} de la meta`, ok: result.index >= result.indexTarget },
    { title: "Disposición final acumulada", value: `${nf(result.landfillCum)} t`, detail: `Permitido: ${nf(result.landfillAllowedCum)} t`, ok: result.landfillOk },
    { title: "REP domiciliaria", value: pct(result.rep.compliance.dom), detail: "Valorización / obligación", ok: result.rep.compliance.dom >= 1 },
    { title: "REP no domiciliaria", value: pct(result.rep.compliance.nodom), detail: "Valorización / obligación", ok: result.rep.compliance.nodom >= 1 },
    { title: "Costo REP", value: `${nf(result.rep.costUF)} UF`, detail: `${nf(result.finance.repCost)} millones de pesos` },
    { title: "Multas y recargos", value: `${nf(result.finance.penalties)} MCLP`, detail: `Multas: ${nf(result.rep.penaltyUF)} UF · Recargos: ${nf(result.rep.surchargeUF)} UF` },
    { title: "Utilidad operativa", value: `${nf(result.finance.profit)} MCLP`, detail: "Millones de pesos" },
  ];
  return <div className="min-w-0 space-y-8">
    <div className="flex items-center gap-3"><h2 className="text-xl font-semibold">{yearLabel(result)}</h2>{result.isProjection && <span className="text-sm text-muted-foreground">Sin nuevas decisiones</span>}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((s) => <article key={s.title} className="rounded-md border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{s.title}</p><p className={`mt-3 text-2xl font-semibold tabular-nums ${s.ok === true ? "text-success" : s.ok === false ? "text-destructive" : ""}`}>{s.value}</p><p className="mt-2 text-xs text-muted-foreground">{s.detail}</p></article>)}</div>
    <section className="grid gap-6 border-y py-5 md:grid-cols-2"><div><h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Avisos</h2>{result.warnings.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : <p className="text-sm text-success">Sin avisos</p>}</div><div><h2 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle2 size={17} />Declaración REP: {statusLabels[result.rep.declarationStatus]}</h2>{result.rep.declarationErrors.length > 0 && <ul className="list-disc space-y-2 pl-5 text-sm text-destructive">{result.rep.declarationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>}</div></section>
    <ResultsCharts results={data.results} selected={result} />
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">{result.isProjection ? "Prácticas activas en la proyección" : "Comentarios de las prácticas elegidas"}</h2>{result.isProjection ? <ul className="list-disc space-y-2 pl-5 text-sm">{result.activePractices.map((id) => <li key={id}>{mergeParams(data.ctx.run.params).practices.find((p) => p.id === id)?.name ?? id}</li>)}</ul> : <PracticeFeedback decision={data.decisions.find((d) => d.year === result.year)} params={mergeParams(data.ctx.run.params)} />}</section>
  </div>;
}
