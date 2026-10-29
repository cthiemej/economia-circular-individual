import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FAMILIES, NORMS, NORM_OPTIONS } from "@/lib/simulator-content";
import { currentYearSheet, mergeParams, type Decision, type Material, type PackType } from "@/lib/simulator-engine";
import { evaluationContextQuery } from "@/lib/evaluation-context";
import { formatChile } from "@/lib/chile-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { writeErrorMessage } from "@/lib/write-errors";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/cumplimiento")({
  head: () => ({
    meta: [
      { title: "Cumplimiento — Simulador de Economía Circular" },
      { name: "description", content: "Mapa normativo y declaración REP de la evaluación." },
      { property: "og:title", content: "Cumplimiento — Simulador de Economía Circular" },
      { property: "og:description", content: "Mapa normativo y declaración REP de la evaluación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cumplimiento,
});

const MIN = 40;
const MATS: Material[] = ["plastico", "papel", "metal"];
const TYPES: PackType[] = ["dom", "nodom"];
const MAT_LABEL: Record<Material, string> = { plastico: "Plástico", papel: "Papel y cartón", metal: "Metal" };
const TYPE_LABEL: Record<PackType, string> = { dom: "Domiciliario", nodom: "No domiciliario" };
const nf = (n: number, d = 2) => n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });

function useStageOpen(evaluationId: string, stage: number) {
  return useQuery({
    queryKey: ["stage-open", evaluationId, stage],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eval_stage_open", { p_evaluation: evaluationId, p_stage: stage });
      if (error) throw error;
      return !!data;
    },
  });
}

function Cumplimiento() {
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Cumplimiento</h1>
      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa normativo</TabsTrigger>
          <TabsTrigger value="rep">Declaración REP</TabsTrigger>
        </TabsList>
        <TabsContent value="mapa"><MapaNormativo /></TabsContent>
        <TabsContent value="rep"><DeclaracionRep /></TabsContent>
      </Tabs>
    </div>
  );
}

type Answer = { id: string; value: string; justification: string };

function MapaNormativo() {
  const { evaluationId } = Route.useRouteContext();
  const qc = useQueryClient();
  const open = useStageOpen(evaluationId, 1);
  const saved = useQuery({
    queryKey: ["regmap", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("regulatory_maps").select("*").eq("evaluation_id", evaluationId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const processed = !!saved.data?.confirmed_at;
  const canEdit = !!open.data && saved.isSuccess;
  const [answers, setAnswers] = useState<Answer[]>(NORMS.map((n) => ({ id: n.id, value: "", justification: "" })));
  useEffect(() => {
    if (!saved.data) return;
    const s = (saved.data.answers as Answer[] | null) ?? [];
    setAnswers(NORMS.map((n) => s.find((a) => a.id === n.id) ?? { id: n.id, value: "", justification: "" }));
  }, [saved.data]);
  const set = (id: string, patch: Partial<Answer>) => setAnswers((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  async function save(confirm: boolean) {
    if (!open.data) { toast.error("Esta etapa ya no se puede editar"); return; }
    if (confirm) {
      const bad = answers.filter((a) => !a.value || a.justification.trim().length < MIN);
      if (bad.length) { toast.error(`Completa la opción y una justificación de al menos ${MIN} caracteres en cada norma.`); return; }
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("regulatory_maps").upsert(
      { evaluation_id: evaluationId, answers, saved_at: now, ...(confirm ? { confirmed_at: now } : {}) },
      { onConflict: "evaluation_id" },
    );
    if (error) { toast.error(writeErrorMessage(error, true)); return; }
    toast.success(confirm ? "Mapa normativo confirmado" : "Borrador guardado");
    qc.invalidateQueries({ queryKey: ["regmap", evaluationId] });
  }

  const hits = NORMS.filter((n) => answers.find((a) => a.id === n.id)?.value === n.key).length;

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">Indica si cada norma aplica a la empresa y justifica (mínimo {MIN} caracteres).</p>
      {!canEdit && (
        <p className="rounded bg-muted px-3 py-2 text-sm">
          {processed ? "El mapa normativo ya está confirmado: modo lectura." : "Esta etapa aún no está abierta: modo lectura."}
        </p>
      )}
      {saved.data?.saved_at && (
        <p className="text-xs text-muted-foreground">
          Último guardado: {formatChile(saved.data.saved_at)}{saved.data.confirmed_at ? ` · Confirmado: ${formatChile(saved.data.confirmed_at)}` : " · Borrador"}
        </p>
      )}
      {processed && <p className="text-sm font-medium">Coincidencias con la clave: {hits} de {NORMS.length}</p>}
      {NORMS.map((n) => {
        const a = answers.find((x) => x.id === n.id) ?? { id: n.id, value: "", justification: "" };
        const match = a.value === n.key;
        return (
          <div key={n.id} className={`space-y-3 rounded-lg border-2 p-4 ${processed ? (match ? "border-primary" : "border-destructive/60") : "border-border"}`}>
            <div className="font-medium">{n.name}</div>
            <div className="flex flex-wrap gap-2">
              {NORM_OPTIONS.map((o) => (
                <Button key={o.value} type="button" size="sm" variant={a.value === o.value ? "default" : "outline"}
                  disabled={!canEdit} onClick={() => set(n.id, { value: o.value })}>{o.label}</Button>
              ))}
            </div>
            {canEdit ? (
              <div>
                <Textarea aria-label={`Justificación: ${n.name}`} value={a.justification} placeholder="Justificación" onChange={(e) => set(n.id, { justification: e.target.value })} />
                <div className={`text-right text-xs ${a.justification.trim().length < MIN ? "text-destructive" : "text-muted-foreground"}`}>
                  {a.justification.trim().length}/{MIN}
                </div>
              </div>
            ) : <p className="whitespace-pre-wrap text-sm">{a.justification || "—"}</p>}
            {processed && (
              <div className={`rounded px-3 py-2 text-sm ${match ? "bg-accent" : "bg-muted"}`}>
                <strong>{match ? "Coincide" : "No coincide"}</strong> · Clave: {NORM_OPTIONS.find((o) => o.value === n.key)?.label}
                <p className="mt-1">{n.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
      {canEdit && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => save(false)}>Guardar borrador</Button>
          <Button onClick={() => save(true)}>Confirmar</Button>
        </div>
      )}
    </div>
  );
}

type Grid = Record<PackType, Record<Material, string>>;
const emptyGrid = (): Grid => ({ dom: { plastico: "", papel: "", metal: "" }, nodom: { plastico: "", papel: "", metal: "" } });
const toGrid = (v: unknown): Grid => {
  const g = emptyGrid();
  const o = (v ?? {}) as Record<string, Record<string, number>>;
  for (const t of TYPES) for (const m of MATS) if (o[t]?.[m] != null) g[t][m] = nf(o[t][m], 6);
  return g;
};
const parseNum = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function DeclaracionRep() {
  const { evaluationId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: ctx } = useSuspenseQuery(evaluationContextQuery(evaluationId));
  const params = useMemo(() => mergeParams(ctx.run.params), [ctx.run.params]);
  const horizon = ctx.run.horizon;
  const year = Math.min(Math.max(ctx.stages.nextStage, 1), horizon);

  const decisions = useQuery({
    queryKey: ["decisions", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("decisions").select("*").eq("evaluation_id", evaluationId).order("year");
      if (error) throw error;
      return data;
    },
  });
  const rep = useQuery({
    queryKey: ["rep", evaluationId, year],
    queryFn: async () => {
      const { data, error } = await supabase.from("rep_declarations").select("*").eq("evaluation_id", evaluationId).eq("year", year).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const open = useStageOpen(evaluationId, year);
  const canEdit = !!open.data && rep.isSuccess && decisions.isSuccess;

  const sheet = useMemo(() => {
    const arr: (Decision | null)[] = Array.from({ length: horizon }, (_, i) => {
      const d = decisions.data?.find((x) => x.year === i + 1);
      return d ? { practices: d.practices ?? [], trainingSpend: Number(d.training_spend), educationSpend: Number(d.education_spend) } : null;
    });
    return currentYearSheet({ horizon: horizon as 1 | 2 | 3 | 4, focal: ctx.focal, rebound: ctx.run.rebound, projection: ctx.run.projection }, arr, year, params);
  }, [decisions.data, horizon, ctx.focal, ctx.run.rebound, ctx.run.projection, year, params]);

  const [tonnes, setTonnes] = useState<Grid>(emptyGrid());
  const [obligation, setObligation] = useState<Grid>(emptyGrid());
  const [cost, setCost] = useState("");
  useEffect(() => {
    if (!rep.isSuccess) return;
    setTonnes(toGrid(rep.data?.tonnes));
    setObligation(toGrid(rep.data?.obligation));
    setCost(rep.data ? nf(rep.data.cost_uf, 6) : "");
  }, [rep.data, rep.isSuccess]);

  const changed = !!rep.data?.saved_at && (decisions.data ?? []).some(
    (d) => d.year <= year && d.saved_at && new Date(d.saved_at).getTime() > new Date(rep.data!.saved_at!).getTime(),
  );

  async function save() {
    if (!open.data) { toast.error("Esta etapa ya no se puede editar"); return; }
    const all = [...TYPES.flatMap((t) => MATS.map((m) => tonnes[t][m])), ...TYPES.flatMap((t) => MATS.map((m) => obligation[t][m])), cost];
    if (all.some((s) => s.trim() === "" || !Number.isFinite(parseNum(s)) || parseNum(s) < 0)) {
      toast.error("Completa todos los campos con números mayores o iguales a 0."); return;
    }
    const num = (g: Grid) => Object.fromEntries(TYPES.map((t) => [t, Object.fromEntries(MATS.map((m) => [m, parseNum(g[t][m])]))]));
    const { error } = await supabase.from("rep_declarations").upsert(
      { evaluation_id: evaluationId, year, tonnes: num(tonnes), obligation: num(obligation), cost_uf: parseNum(cost), saved_at: new Date().toISOString() },
      { onConflict: "evaluation_id,year" },
    );
    if (error) { toast.error(writeErrorMessage(error, true)); return; }
    toast.success("Declaración guardada");
    qc.invalidateQueries({ queryKey: ["rep", evaluationId, year] });
  }

  const gridInputs = (g: Grid, setG: (g: Grid) => void, label: string) => (
    <table className="w-full text-sm">
      <thead><tr className="text-left"><th className="py-1">Tipo</th>{MATS.map((m) => <th key={m}>{MAT_LABEL[m]}</th>)}</tr></thead>
      <tbody>
        {TYPES.map((t) => (
          <tr key={t}>
            <td className="py-1 pr-2">{TYPE_LABEL[t]}</td>
            {MATS.map((m) => (
              <td key={m} className="pr-2">
                <Input aria-label={`${label}: ${TYPE_LABEL[t]}, ${MAT_LABEL[m]}`} inputMode="decimal" disabled={!canEdit} value={g[t][m]} placeholder="t"
                  onChange={(e) => setG({ ...g, [t]: { ...g[t], [m]: e.target.value } })} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6 pt-4">
      <p className="text-sm text-muted-foreground">Declaración REP del año {year}.</p>
      {(!rep.isSuccess || !decisions.isSuccess) && <p role="status" className="text-sm text-muted-foreground">Cargando declaración…</p>}
      {changed && <p className="rounded bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">Tus prácticas cambiaron la ficha de envases. Revisa tu declaración.</p>}
      {!canEdit && (
        <p className="rounded bg-muted px-3 py-2 text-sm">
          La etapa del año {year} no está abierta: modo lectura.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Ficha de envases del año {year}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left">
              <tr><th className="py-1">Componente</th><th>Aplica a</th><th>Tipo</th><th>Material</th><th>Categoría tarifaria</th><th className="text-right">Unidades vendidas</th><th className="text-right">g/unidad</th><th className="text-right">t compradas</th><th className="text-right">Tarifa UF/t</th></tr>
            </thead>
            <tbody>
              {sheet.packaging.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-1">{p.label}</td>
                  <td>{p.family ? FAMILIES[p.family].label : "Toda la empresa"}</td>
                  <td>{TYPE_LABEL[p.type]}</td>
                  <td>{MAT_LABEL[p.material]}</td>
                  <td>{p.tariffCategory}</td>
                  <td className="text-right">{p.type === "dom" && p.units != null ? nf(p.units, 0) : "—"}</td>
                  <td className="text-right">{p.type === "dom" && p.gramsPerUnit != null ? nf(p.gramsPerUnit) : "—"}</td>
                  <td className="text-right">{p.type === "nodom" ? nf(p.tonnes) : "—"}</td>
                  <td className="text-right">{nf(p.tariffUF)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded bg-muted px-3 py-2 text-sm">
          Los envases <strong>no domiciliarios</strong> (cajas de cartón corrugado, film de pallet y zuncho) se
          presentan de forma general para toda la empresa: son los mismos para cualquier producto y sus toneladas
          no se reparten entre productos. Declara el total que aparece en la columna «t compradas». Los envases{" "}
          <strong>domiciliarios</strong>, en cambio, son de cada familia de producto: sus toneladas se calculan a
          partir de las unidades vendidas y los gramos por unidad.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">Metas de valorización del año {year}</h2>
          <table className="w-full text-sm">
            <thead className="border-b text-left"><tr><th className="py-1">Tipo</th>{MATS.map((m) => <th key={m} className="text-right">{MAT_LABEL[m]}</th>)}</tr></thead>
            <tbody>
              {TYPES.map((t) => (
                <tr key={t} className="border-b"><td className="py-1">{TYPE_LABEL[t]}</td>
                  {MATS.map((m) => <td key={m} className="text-right">{nf(sheet.targets[t][m] * 100, 1)} %</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">Valor UF vigente: <strong>${nf(sheet.ufCLP, 0)}</strong></p>
        </div>
        <div className="rounded-lg bg-muted p-4 text-sm">
          <h2 className="mb-2 font-semibold">Cómo completar la declaración</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Toneladas domiciliarias = unidades × gramos / 1.000.000.</li>
            <li>Toneladas no domiciliarias: usa el total de la columna «t compradas», igual para todos los productos.</li>
            <li>Toneladas a valorizar = toneladas × meta.</li>
            <li>Al procesar la etapa se verifica contra lo valorizado.</li>
            <li>Costo = toneladas × tarifa.</li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Tu declaración</h2>
        <div>
          <h3 className="mb-1 text-sm font-medium">Toneladas puestas en el mercado</h3>
          <p className="mb-2 text-xs text-muted-foreground">La fila «No domiciliario» es la misma para cualquier producto: corresponde al embalaje de distribución de toda la empresa.</p>
          {gridInputs(tonnes, setTonnes, "Puestas")}
        </div>
        <div><h3 className="mb-1 text-sm font-medium">Toneladas a valorizar</h3>{gridInputs(obligation, setObligation, "Obligación")}</div>
        <div className="max-w-xs">
          <h3 className="mb-1 text-sm font-medium">Costo total (UF)</h3>
          <Input aria-label="Costo total REP (UF)" inputMode="decimal" disabled={!canEdit} value={cost} placeholder="UF" onChange={(e) => setCost(e.target.value)} />
        </div>
        {rep.data?.saved_at && <p className="text-xs text-muted-foreground">Último guardado: {formatChile(rep.data.saved_at)}</p>}
        {canEdit && <Button onClick={save}>Guardar declaración</Button>}
      </section>
    </div>
  );
}
