import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { availablePractices, mergeParams, type Practice } from "@/lib/simulator-engine";
import { TEAM_LEVEL_OPTIONS } from "@/lib/simulator-content";
import { addPractice, cardIssues, MAX_PRACTICES, MIN_REASONING, normalizeCard, type PracticeCard } from "@/lib/decision-cards";
import { evaluationContextQuery } from "@/lib/evaluation-context";
import { formatChile } from "@/lib/chile-time";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { writeErrorMessage } from "@/lib/write-errors";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/decisiones")({
  head: () => ({
    meta: [
      { title: "Decisiones — Simulador de Economía Circular" },
      { name: "description", content: "Prácticas y fichas del año en curso." },
      { property: "og:title", content: "Decisiones — Simulador de Economía Circular" },
      { property: "og:description", content: "Prácticas y fichas del año en curso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Decisiones,
});

const AREAS = [
  { key: "Envase", label: "Diseño de envase y embalaje" },
  { key: "Operación", label: "Operación y subproductos" },
  { key: "Gestión", label: "Gestión, alianzas y cumplimiento" },
] as const;

type Cards = Record<string, PracticeCard>;

async function processStage(evaluationId: string, stage: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/public/process-stage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify({ evaluationId, stage }),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error ?? "No se pudo procesar la etapa");
}

function Decisiones() {
  const { evaluationId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: ctx } = useSuspenseQuery(evaluationContextQuery(evaluationId));
  const params = useMemo(() => mergeParams(ctx.run.params), [ctx.run.params]);
  const year = Math.min(Math.max(ctx.stages.nextStage, 1), ctx.run.horizon);

  const decisions = useQuery({
    queryKey: ["decisions", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("decisions").select("*").eq("evaluation_id", evaluationId).order("year");
      if (error) throw error;
      return data;
    },
  });
  const open = useQuery({
    queryKey: ["stage-open", evaluationId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eval_stage_open", { p_evaluation: evaluationId, p_stage: year });
      if (error) throw error;
      return !!data;
    },
  });
  const saved = decisions.data?.find((d) => d.year === year) ?? null;

  const chosenBefore = (decisions.data ?? []).filter((d) => d.year < year).flatMap((d) => d.practices);
  const available = availablePractices(year, chosenBefore, params);
  const canEdit = !!open.data && decisions.isSuccess;

  const [selected, setSelected] = useState<number[]>([]);
  const [cards, setCards] = useState<Cards>({});
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (!decisions.isSuccess) return;
    setSelected(saved?.practices ?? []);
    const raw = (saved?.cards ?? {}) as Record<string, Partial<PracticeCard>>;
    setCards(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, normalizeCard(v)])));
  }, [decisions.isSuccess, saved?.saved_at, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = (id: number) => params.practices.find((p) => p.id === id);
  const cardOf = (id: number) => cards[String(id)] ?? normalizeCard(null);
  const setCard = (id: number, c: PracticeCard) => setCards((cs) => ({ ...cs, [String(id)]: c }));

  function toggle(id: number) {
    if (!canEdit) return;
    if (selected.includes(id)) { setSelected(selected.filter((x) => x !== id)); return; }
    const next = addPractice(selected, id);
    if (!next) { toast.error(`Puedes elegir como máximo ${MAX_PRACTICES} prácticas por año.`); return; }
    setSelected(next);
  }

  const pending = selected.flatMap((id) => cardIssues(cardOf(id)).map((i) => `${byId(id)?.name}: falta ${i}`));

  async function save(confirm: boolean) {
    if (!open.data) { toast.error("Esta etapa ya no se puede editar"); return; }
    if (confirm && (pending.length || selected.length === 0)) {
      toast.error(selected.length === 0 ? "Elige al menos una práctica." : "Completa las validaciones pendientes antes de confirmar.");
      return;
    }
    const keep = Object.fromEntries(selected.map((id) => [String(id), cardOf(id)]));
    const row = {
      evaluation_id: evaluationId, year, practices: selected, cards: keep as never,
      training_spend: 0, education_spend: 0,
      saved_at: null as unknown as string, // la base de datos fija saved_at
      confirmed_at: confirm ? new Date().toISOString() : (saved?.confirmed_at ?? null),
    };
    const { error } = await supabase.from("decisions").upsert(row, { onConflict: "evaluation_id,year" });
    if (error) { toast.error(writeErrorMessage(error, true)); return; }
    qc.invalidateQueries({ queryKey: ["decisions", evaluationId] });
    if (!confirm) { toast.success("Borrador guardado"); return; }

    setProcessing(true);
    try {
      await processStage(evaluationId, year);
      toast.success(`Decisiones confirmadas: resultados del año ${year} disponibles.`);
      qc.invalidateQueries({ queryKey: ["evaluation-context", evaluationId] });
      qc.invalidateQueries({ queryKey: ["evaluation-results", evaluationId] });
      qc.invalidateQueries({ queryKey: ["stage-open", evaluationId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo procesar el año.");
    } finally {
      setProcessing(false);
    }
  }

  const stageClosed = open.isSuccess && !open.data;
  const list: Practice[] = canEdit ? available : [...available, ...selected.map(byId).filter((p): p is Practice => !!p && !available.includes(p))];

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Decisiones del año {year}</h1>
      {stageClosed && <p className="rounded bg-notice px-3 py-2 text-sm text-notice-foreground">Esta etapa ya fue procesada: modo lectura.</p>}
      <p className="text-sm text-muted-foreground">Elegidas: {selected.length} de {MAX_PRACTICES}</p>

      <Tabs defaultValue="Envase">
        <TabsList className="flex h-auto flex-wrap">
          {AREAS.map((a) => <TabsTrigger key={a.key} value={a.key}>{a.label}</TabsTrigger>)}
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        {AREAS.map((a) => (
          <TabsContent key={a.key} value={a.key} className="space-y-4">
            {list.filter((p) => p.area === a.key).length === 0 && <p className="text-sm text-muted-foreground">No hay prácticas disponibles en esta área.</p>}
            {list.filter((p) => p.area === a.key).map((p) => {
              const sel = selected.includes(p.id);
              return (
                <div key={p.id} className={`rounded-lg border-2 p-4 ${sel ? "border-primary bg-accent/30" : "border-border"}`}>
                  <Button variant="ghost" type="button" aria-pressed={sel} disabled={!canEdit} onClick={() => toggle(p.id)} className="h-auto w-full flex-wrap justify-start whitespace-normal p-0 text-left disabled:cursor-default">
                    <span className="font-medium">{p.name}</span>
                    {p.fromYear === year && <Badge>Nueva</Badge>}
                    {p.requiresManager && <Badge variant="secondary">Requiere Encargado</Badge>}
                    {sel && <span className="ml-auto text-xs font-semibold text-primary">Elegida</span>}
                  </Button>
                  {sel && <CardForm card={cardOf(p.id)} onChange={(c) => setCard(p.id, c)} disabled={!canEdit} />}
                </div>
              );
            })}
          </TabsContent>
        ))}

        <TabsContent value="resumen" className="space-y-4">
          {selected.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay prácticas elegidas.</p> : selected.map((id) => <Summary key={id} name={byId(id)?.name ?? `Práctica ${id}`} card={cardOf(id)} />)}
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">Validaciones pendientes</h3>
            {pending.length === 0 ? <p className="text-sm text-muted-foreground">Ninguna.</p> : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">{pending.map((x) => <li key={x}>{x}</li>)}</ul>
            )}
          </div>
          {saved?.saved_at && (
            <p className="text-xs text-muted-foreground">
              Guardado por última vez: {formatChile(saved.saved_at)}
              {saved.confirmed_at ? ` · Confirmado: ${formatChile(saved.confirmed_at)}` : " · Borrador"}
            </p>
          )}
          {canEdit && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => save(false)} disabled={processing}>Guardar borrador</Button>
              <Button onClick={() => save(true)} disabled={processing}>{processing ? "Procesando…" : "Confirmar decisiones y procesar el año"}</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CardForm({ card, onChange, disabled }: { card: PracticeCard; onChange: (c: PracticeCard) => void; disabled: boolean }) {
  const set = <K extends keyof PracticeCard>(k: K, v: PracticeCard[K]) => onChange({ ...card, [k]: v });
  const issues = cardIssues(card);
  return (
    <div className="mt-4 space-y-4 border-t pt-4 text-sm">
      <div className="space-y-2">
        <div className="font-medium">Nivel de la jerarquía 10R</div>
        <select aria-label="Nivel de la jerarquía 10R" disabled={disabled} className="rounded-md border bg-background px-2 py-2" value={card.level} onChange={(e) => set("level", e.target.value)}>
          <option value="">Elige…</option>
          {TEAM_LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <div className="font-medium">Razonamiento</div>
        <Textarea aria-label="Razonamiento" disabled={disabled} placeholder="¿Por qué elegiste esta práctica?" value={card.reasoning} onChange={(e) => set("reasoning", e.target.value)} />
        <div className={`text-right text-xs ${card.reasoning.trim().length < MIN_REASONING ? "text-destructive" : "text-muted-foreground"}`}>{card.reasoning.trim().length}/{MIN_REASONING}</div>
      </div>
      {issues.length > 0 && <p className="text-xs text-destructive">Falta: {issues.join(", ")}.</p>}
    </div>
  );
}

function Summary({ name, card }: { name: string; card: PracticeCard }) {
  return (
    <div className="space-y-1 rounded-lg border p-4 text-sm">
      <div className="font-semibold">{name}</div>
      <div><span className="text-muted-foreground">Nivel 10R:</span> {card.level || "—"}</div>
      <div><span className="text-muted-foreground">Razonamiento:</span> {card.reasoning || "—"}</div>
    </div>
  );
}
