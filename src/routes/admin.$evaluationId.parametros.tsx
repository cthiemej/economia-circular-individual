import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { evaluationQuery } from "@/lib/evaluations";
import { DEFAULT_PARAMS, mergeParams } from "@/lib/simulator-engine";
import { buildOverrides, formFromParams, type ParamForm } from "@/lib/param-overrides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/$evaluationId/parametros")({
  head: () => ({
    meta: [
      { title: "Parámetros — Simulador" },
      { name: "description", content: "Parámetros del modelo para esta evaluación." },
      { property: "og:title", content: "Parámetros — Simulador" },
      { property: "og:description", content: "Parámetros del modelo para esta evaluación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParamsPage,
});

type Overrides = Record<string, unknown>;
const TYPES = [["dom", "Domiciliario"], ["nodom", "No domiciliario"]] as const;
const MATS = [["plastico", "Plástico"], ["papel", "Papel y cartón"], ["metal", "Metal"]] as const;
const WEIGHTS = [["avoid", "Evitar"], ["reuse", "Reusar"], ["recycle", "Reciclar"], ["recover", "Recuperar"]] as const;

function ParamsPage() {
  const { evaluationId } = Route.useParams();
  const { data: evaluation } = useSuspenseQuery(evaluationQuery(evaluationId));
  const prev = (evaluation?.params ?? {}) as Overrides;
  return <ParamsForm key={JSON.stringify(prev)} evaluationId={evaluationId} prev={prev} />;
}

function ParamsForm({ evaluationId, prev }: { evaluationId: string; prev: Overrides }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ParamForm>(() => formFromParams(mergeParams(prev)));
  const [busy, setBusy] = useState(false);
  const comps = mergeParams(prev).components;

  const setS = (k: string, v: string) => setForm((f) => ({ ...f, scalars: { ...f.scalars, [k]: v } }));
  const num = (k: string, step = "any") => (
    <Input aria-label={k} type="number" step={step} className="w-28" value={form.scalars[k]} onChange={(e) => setS(k, e.target.value)} />
  );

  async function persist(params: Overrides) {
    setBusy(true);
    const { error } = await supabase.from("evaluations").update({ params: params as never }).eq("id", evaluationId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Parámetros guardados");
    qc.invalidateQueries({ queryKey: ["evaluation", evaluationId] });
    qc.invalidateQueries({ queryKey: ["evaluation-context", evaluationId] });
  }

  function save() {
    try { persist(buildOverrides(prev, form)); } catch (e) { toast.error((e as Error).message); }
  }
  function reset() {
    if (!confirm("¿Restaurar todos los parámetros a sus valores por defecto?")) return;
    persist({});
  }

  return (
    <div className="space-y-8">
      <p className="rounded bg-notice px-3 py-2 text-sm text-notice-foreground">
        Cambiar parámetros después de confirmar el diagnóstico hace que los resultados no sean comparables entre evaluaciones.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">General</h2>
        <label className="flex items-center gap-3 text-sm"><span className="w-64">Valor UF (CLP)</span>{num("ufCLP")}</label>
        <label className="flex items-center gap-3 text-sm"><span className="w-64">Separación base de hogares (0–1)</span>{num("baseSeparation")}</label>
        <label className="flex items-center gap-3 text-sm"><span className="w-64">Cobertura base de recolección (0–1)</span>{num("baseCoverage")}</label>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Componentes de envase</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-1">Componente</th><th>Tipo</th><th>Categoría</th><th>Masa (t)</th><th>Tarifa (UF/t)</th></tr></thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={c.id} className="border-t">
                <td className="py-1">{c.label}</td>
                <td>{c.type === "dom" ? "Domiciliario" : "No domiciliario"}</td>
                <td>{c.tariffCategory}</td>
                <td>{c.mass.toLocaleString("es-CL")}</td>
                <td>
                  <Input aria-label={`Tarifa: ${c.label}`} type="number" step="any" className="w-24" value={form.tariffs[i]}
                    onChange={(e) => setForm((f) => ({ ...f, tariffs: f.tariffs.map((t, j) => (j === i ? e.target.value : t)) }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Metas REP del año 4 (fracción)</h2>
        <table className="text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="pr-4">Tipo</th>{MATS.map(([, l]) => <th key={l} className="pr-2">{l}</th>)}</tr></thead>
          <tbody>
            {TYPES.map(([t, tl]) => (
              <tr key={t}><td className="pr-4">{tl}</td>{MATS.map(([m]) => <td key={m} className="py-1 pr-2">{num(`repTargetsY4.${t}.${m}`)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <h3 className="pt-2 text-sm font-medium">Factor de meta por año (× meta del año 4)</h3>
        <div className="flex flex-wrap gap-3">
          {form.factors.map((v, i) => i === 0 ? null : (
            <label key={i} className="text-sm">
              <div className="text-muted-foreground">{i === 5 ? "Año 5 (proy.)" : `Año ${i}`}</div>
              <Input type="number" step="any" className="w-24" value={v}
                onChange={(e) => setForm((f) => ({ ...f, factors: f.factors.map((x, j) => (j === i ? e.target.value : x)) }))} />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Pesos del índice de circularidad</h2>
        <div className="flex flex-wrap gap-3">
          {WEIGHTS.map(([k, l]) => (
            <label key={k} className="text-sm"><div className="text-muted-foreground">{l}</div>{num(`weights.${k}`)}</label>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <Button onClick={save} disabled={busy}>Guardar parámetros</Button>
        <Button variant="outline" onClick={reset} disabled={busy}>Restaurar valores por defecto</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Valores por defecto: UF {DEFAULT_PARAMS.ufCLP.toLocaleString("es-CL")} CLP · separación {DEFAULT_PARAMS.baseSeparation} · cobertura {DEFAULT_PARAMS.baseCoverage}.
      </p>
    </div>
  );
}
