import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nf, yearLabel } from "@/lib/evaluation-results";
import type { YearResult } from "@/lib/simulator-engine";
import type { ReactNode } from "react";

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left tabular-nums"><thead><tr className="border-b">{headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-3 align-top">{cell}</td>)}</tr>)}</tbody></table></div>;
}
const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const projectionColor = "var(--result-projection)";
type Series = { key: string; label: string; color?: string };

function Trend({ results, series, value }: { results: YearResult[]; series: Series[]; value: (r: YearResult, key: string) => number }) {
  const projectionIndex = results.findIndex((r) => r.isProjection);
  const rows = results.map((r, i) => ({ year: r.year, ...Object.fromEntries(series.flatMap((s) => [
    [s.key, r.isProjection ? null : value(r, s.key)],
    [`${s.key}Projection`, projectionIndex >= 0 && i >= projectionIndex - 1 ? value(r, s.key) : null],
  ])) }));
  return <div className="result-chart h-80 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 15, right: 20, bottom: 10, left: 12 }}>
    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="year" tickFormatter={(n) => `Año ${n}`} stroke="var(--muted-foreground)" /><YAxis tickFormatter={(n) => nf(n, 0)} stroke="var(--muted-foreground)" width={65} /><Tooltip formatter={(v) => nf(Number(v))} labelFormatter={(n) => `Año ${n}`} contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} /><Legend />
    {series.map((s, i) => <Line key={s.key} dataKey={s.key} name={s.label} type="linear" stroke={s.color ?? palette[i % palette.length]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />)}
    {projectionIndex >= 0 && series.map((s) => <Line key={`${s.key}Projection`} dataKey={`${s.key}Projection`} name={`${s.label} (proyección)`} type="linear" stroke={projectionColor} strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />)}
  </LineChart></ResponsiveContainer></div>;
}

export function RepTable({ result }: { result: YearResult }) {
  const types = [{ key: "dom", label: "Domiciliario" }, { key: "nodom", label: "No domiciliario" }] as const;
  const materials = [{ key: "plastico", label: "Plástico" }, { key: "papel", label: "Papel y cartón" }, { key: "metal", label: "Metal" }] as const;
  return <DataTable headers={["Tipo", "Material", "Puestas (t)", "Obligación (t)", "Valorizadas (t)"]} rows={types.flatMap((t) => materials.map((m) => [t.label, m.label, nf(result.rep.placed[t.key][m.key]), nf(result.rep.obligation[t.key][m.key]), nf(result.rep.valorized[t.key][m.key])]))} />;
}

export function FinanceTable({ results }: { results: YearResult[] }) {
  return <DataTable headers={["Año", "REP (MCLP)", "Multas y recargos (MCLP)", "Prácticas (MCLP)", "Gastos (MCLP)", "Ahorros (MCLP)", "Disposición (MCLP)", "Utilidad (MCLP)"]} rows={results.map((r) => [yearLabel(r), ...[r.finance.repCost, r.finance.penalties, r.finance.practiceCosts, r.finance.spend, r.finance.savings, r.finance.landfillCost, r.finance.profit].map((v) => nf(v))])} />;
}

export function ResultsCharts({ results, selected }: { results: YearResult[]; selected: YearResult }) {
  const flows: Series[] = [{ key: "avoided", label: "Evitado" }, { key: "reused", label: "Reusado" }, { key: "recycled", label: "Reciclado" }, { key: "recovered", label: "Recuperado" }, { key: "landfill", label: "Disposición final" }];
  const flowRows = results.map((r) => ({ year: r.year, isProjection: r.isProjection, ...r.flows }));
  return <Tabs defaultValue="general" className="min-w-0">
    <div className="overflow-x-auto"><TabsList className="h-auto w-max justify-start"><TabsTrigger value="general">Descripción general</TabsTrigger><TabsTrigger value="flujos">Flujos 10R</TabsTrigger><TabsTrigger value="residuos">Residuos y valorización</TabsTrigger><TabsTrigger value="rep">Cumplimiento REP</TabsTrigger><TabsTrigger value="finanzas">Finanzas</TabsTrigger><TabsTrigger value="otros">Indicadores complementarios</TabsTrigger></TabsList></div>
    <TabsContent value="general" className="space-y-4 pt-5"><h2 className="text-xl font-semibold">Índice y meta por año</h2><Trend results={results} series={[{ key: "index", label: "Índice" }, { key: "indexTarget", label: "Meta" }]} value={(r, k) => k === "index" ? r.index : r.indexTarget} /></TabsContent>
    <TabsContent value="flujos" className="space-y-4 pt-5"><h2 className="text-xl font-semibold">Flujos de materiales (t)</h2><div className="result-chart h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={flowRows} margin={{ left: 12, right: 20 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="year" tickFormatter={(n) => `Año ${n}`} /><YAxis tickFormatter={(n) => nf(n, 0)} width={65} /><Tooltip formatter={(v) => `${nf(Number(v))} t`} labelFormatter={(n) => `Año ${n}`} contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} /><Legend />{flows.map((f, i) => <Bar key={f.key} dataKey={f.key} name={f.label} stackId="flows" fill={palette[i]} isAnimationActive={false}>{flowRows.map((r) => <Cell key={r.year} fill={r.isProjection ? projectionColor : palette[i]} fillOpacity={r.isProjection ? 0.3 + i * 0.13 : 1} stroke={r.isProjection ? projectionColor : "none"} strokeDasharray={r.isProjection ? "4 3" : undefined} />)}</Bar>)}</BarChart></ResponsiveContainer></div></TabsContent>
    <TabsContent value="residuos" className="space-y-5 pt-5"><h2 className="text-xl font-semibold">Disposición final (t)</h2><Trend results={results} series={[{ key: "landfill", label: "Por año" }, { key: "landfillCum", label: "Acumulada" }, { key: "landfillAllowedCum", label: "Trayectoria permitida" }]} value={(r, k) => k === "landfill" ? r.landfill : k === "landfillCum" ? r.landfillCum : r.landfillAllowedCum} /><DataTable headers={["Año", "Disposición final (t)", "Acumulada (t)", "Permitida (t)", "Estado"]} rows={results.map((r) => [yearLabel(r), nf(r.landfill), nf(r.landfillCum), nf(r.landfillAllowedCum), r.landfillOk ? "Cumple" : "Supera lo permitido"])} /></TabsContent>
    <TabsContent value="rep" className="space-y-5 pt-5"><h2 className="text-xl font-semibold">Valorización REP · {yearLabel(selected)}</h2><RepTable result={selected} /><h2 className="text-xl font-semibold">Costo REP por año (UF)</h2><Trend results={results} series={[{ key: "costUF", label: "Costo REP (UF)" }]} value={(r) => r.rep.costUF} /><DataTable headers={["Año", "REP (UF)", "REP (MCLP)", "Multas (UF)", "Recargos (UF)"]} rows={results.map((r) => [yearLabel(r), nf(r.rep.costUF), nf(r.finance.repCost), nf(r.rep.penaltyUF), nf(r.rep.surchargeUF)])} /></TabsContent>
    <TabsContent value="finanzas" className="space-y-5 pt-5"><h2 className="text-xl font-semibold">Utilidad operativa (MCLP)</h2><Trend results={results} series={[{ key: "profit", label: "Utilidad" }]} value={(r) => r.finance.profit} /><FinanceTable results={results} /></TabsContent>
    <TabsContent value="otros" className="space-y-5 pt-5"><h2 className="text-xl font-semibold">Emisiones (tCO2e)</h2><Trend results={results} series={[{ key: "emissions", label: "Emisiones" }]} value={(r) => r.emissions} /><h2 className="text-xl font-semibold">Volumen · factor de rebote</h2><Trend results={results} series={[{ key: "volume", label: "Volumen" }]} value={(r) => r.volume} /><h2 className="text-xl font-semibold">Hogares y efecto de los gastos (%)</h2><Trend results={results} series={[{ key: "separation", label: "Separación" }, { key: "coverage", label: "Cobertura" }, { key: "trainingEffect", label: "Capacitación" }, { key: "educationEffect", label: "Educación" }]} value={(r, k) => (k === "separation" ? r.separation : k === "coverage" ? r.coverage : k === "trainingEffect" ? r.trainingEffect : r.educationEffect) * 100} /></TabsContent>
  </Tabs>;
}