import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { baseline, mergeParams } from "@/lib/simulator-engine";
import { evaluationContextQuery } from "@/lib/evaluation-context";
import { focalLabel } from "@/lib/evaluations";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/panel-base")({
  head: () => ({
    meta: [
      { title: "Panel base — Simulador de Economía Circular" },
      { name: "description", content: "Situación de la empresa en el año 0." },
      { property: "og:title", content: "Panel base — Simulador de Economía Circular" },
      { property: "og:description", content: "Situación de la empresa en el año 0." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelBase,
});

const f1 = (n: number) => n.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (n: number) => n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function PanelBase() {
  const { evaluationId } = Route.useRouteContext();
  const { data: ctx } = useSuspenseQuery(evaluationContextQuery(evaluationId));
  const params = mergeParams(ctx.run.params);
  const b = baseline(ctx.focal, params);
  const packT = b.packaging.reduce((a, p) => a + p.tonnes, 0);
  const chart = [{ name: "Año 0", Reusado: b.reused, Reciclado: b.recycled, Recuperado: b.recovered, "Disposición final": b.landfill }];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Panel base (año 0)</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Índice de circularidad" value={f1(b.index)} />
        <Card label="Disposición final" value={`${f1(b.landfill)} t`} />
        <Card label="Envases puestos en el mercado" value={`${f1(packT)} t`} />
        <Card label="Costo REP" value={`${f1(b.repCostUF)} UF`} sub={`${f1((b.repCostUF * params.ufCLP) / 1e6)} millones de pesos`} />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Ficha de envases</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">Componente</th><th className="p-2">Familia</th><th className="p-2">Tipo</th><th className="p-2">Material</th><th className="p-2">Categoría tarifaria</th><th className="p-2 text-right">Tarifa (UF/t)</th><th className="p-2 text-right">Toneladas</th></tr></thead>
          <tbody>
            {b.packaging.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.label}</td>
                <td className="p-2">{p.family ? focalLabel(p.family) : "Toda la empresa"}</td>
                <td className="p-2">{p.type === "dom" ? "Domiciliario" : "No domiciliario"}</td>
                <td className="p-2 capitalize">{p.material === "plastico" ? "plástico" : p.material}</td>
                <td className="p-2">{p.tariffCategory}</td>
                <td className="p-2 text-right">{f2(p.tariffUF)}</td>
                <td className="p-2 text-right">{f1(p.tonnes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Residuos de planta</h2>
        <table className="w-full max-w-xl text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">Flujo</th><th className="p-2 text-right">Toneladas</th></tr></thead>
          <tbody>
            {params.plant.map((s) => (
              <tr key={s.id} className="border-b"><td className="p-2">{s.label}</td><td className="p-2 text-right">{f1(s.mass)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Destino de los residuos (t)</h2>
        <div className="h-80 max-w-xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${f1(v)} t`} />
              <Legend />
              <Bar dataKey="Reusado" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="Reciclado" stackId="a" fill="var(--chart-2)" />
              <Bar dataKey="Recuperado" stackId="a" fill="var(--chart-3)" />
              <Bar dataKey="Disposición final" stackId="a" fill="var(--chart-5)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
