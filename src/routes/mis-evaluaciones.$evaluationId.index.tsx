import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { COMPANY, FAMILIES, GLOSSARY } from "@/lib/simulator-content";
import { evaluationContextQuery, stageName } from "@/lib/evaluation-context";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/")({
  head: () => ({
    meta: [
      { title: "Bienvenida — Simulador de Economía Circular" },
      { name: "description", content: "Presentación de la empresa y el desafío." },
      { property: "og:title", content: "Bienvenida — Simulador de Economía Circular" },
      { property: "og:description", content: "Presentación de la empresa y el desafío." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

const def = (term: string) => GLOSSARY.find((g) => g.term === term)?.def ?? "";

function Welcome() {
  const { evaluationId } = Route.useRouteContext();
  const { data: ctx } = useSuspenseQuery(evaluationContextQuery(evaluationId));
  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">{COMPANY.name}</h1>
        <p>{COMPANY.intro}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Familias de productos</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">Familia</th><th className="p-2">Qué representa</th><th className="p-2">Envase supuesto</th><th className="p-2 text-right">Ventas (t/año)</th></tr></thead>
          <tbody>
            {Object.entries(FAMILIES).map(([k, f]) => (
              <tr key={k} className={`border-b ${k === ctx.focal ? "bg-accent font-medium" : ""}`}>
                <td className="p-2">{f.label}{k === ctx.focal ? " (focal)" : ""}</td>
                <td className="p-2">{f.represents}</td>
                <td className="p-2">{f.pack}</td>
                <td className="p-2 text-right">{f.salesT.toLocaleString("es-CL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-1 font-semibold">Jerarquía de las 10R</h2>
          <p className="text-sm">{def("Jerarquía de las 10R")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-1 font-semibold">Ley REP</h2>
          <p className="text-sm">{def("Ley REP")}</p>
          <p className="mt-2 text-sm">{def("Sistema colectivo de gestión")}</p>
        </div>
      </section>

      <section className="rounded-lg border-2 border-primary p-4">
        <h2 className="mb-1 font-semibold">Tu desafío</h2>
        <p>{COMPANY.challenge}</p>
        <p className="mt-3">Producto focal de tu evaluación: <strong className="text-primary">{FAMILIES[ctx.focal]?.label}</strong></p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cómo avanzas</h2>
        <p className="text-sm text-muted-foreground">
          No hay horarios ni rondas: avanzas a tu propio ritmo. Completa y confirma cada etapa
          para desbloquear la siguiente.
        </p>
        <p className="text-sm">
          Etapa actual: <strong>{ctx.stages.finished ? "Evaluación finalizada" : stageName(ctx.stages.nextStage)}</strong>
        </p>
      </section>
    </div>
  );
}
