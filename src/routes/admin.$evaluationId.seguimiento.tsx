import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { evaluationQuery } from "@/lib/evaluations";
import { formatChile } from "@/lib/chile-time";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/$evaluationId/seguimiento")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(evaluationQuery(params.evaluationId)),
  head: () => ({
    meta: [
      { title: "Seguimiento y procesamiento — Simulador" },
      { name: "description", content: "Seguimiento de la evaluación y procesamiento manual de etapas." },
      { property: "og:title", content: "Seguimiento y procesamiento — Simulador" },
      { property: "og:description", content: "Seguimiento de la evaluación y procesamiento manual de etapas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Seguimiento,
  errorComponent: ({ error }) => <div role="alert">{(error as Error).message}</div>,
});

const stageLabel = (n: number) => (n === 0 ? "Etapa 0 — Diagnóstico" : n === 1 ? "Etapa 1 — Mapa regulatorio y Año 1" : `Etapa ${n} — Año ${n}`);

function Seguimiento() {
  const { evaluationId } = Route.useParams();
  const { data: evaluation } = useSuspenseQuery(evaluationQuery(evaluationId));
  const qc = useQueryClient();
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const horizon = evaluation?.horizon ?? 4;

  const status = useQuery({
    queryKey: ["tracking", evaluationId, stage],
    queryFn: async () => {
      const diag = stage === 0 ? await supabase.from("diagnoses").select("saved_at, confirmed_at").eq("evaluation_id", evaluationId).maybeSingle() : null;
      const dec = stage > 0 ? await supabase.from("decisions").select("saved_at, confirmed_at").eq("evaluation_id", evaluationId).eq("year", stage).maybeSingle() : null;
      const rep = stage > 0 ? await supabase.from("rep_declarations").select("saved_at").eq("evaluation_id", evaluationId).eq("year", stage).maybeSingle() : null;
      const res = stage > 0 ? await supabase.from("year_results").select("processed_at").eq("evaluation_id", evaluationId).eq("year", stage).maybeSingle() : null;
      const open = await supabase.rpc("eval_stage_open", { p_evaluation: evaluationId, p_stage: stage });
      return {
        savedAt: (diag?.data?.saved_at ?? dec?.data?.saved_at) ?? null,
        confirmedAt: (diag?.data?.confirmed_at ?? dec?.data?.confirmed_at) ?? null,
        repSaved: !!rep?.data,
        processedAt: res?.data?.processed_at ?? null,
        open: !!open.data,
      };
    },
  });
  useEffect(() => { qc.invalidateQueries({ queryKey: ["tracking", evaluationId] }); }, [evaluationId, qc]);

  async function processNow() {
    if (!confirm("¿Procesar esta etapa ahora? Al procesar, la etapa queda cerrada para edición.")) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/public/process-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ evaluationId, stage }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error ?? "Error al procesar");
      toast.success("Etapa procesada");
      qc.invalidateQueries({ queryKey: ["tracking", evaluationId] });
      qc.invalidateQueries({ queryKey: ["evaluation-context", evaluationId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  const s = status.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">Etapa
          <select className="mt-1 block rounded border bg-background px-2 py-1" value={stage} onChange={(e) => setStage(Number(e.target.value))}>
            {Array.from({ length: horizon + 1 }, (_, n) => <option key={n} value={n}>{stageLabel(n)}</option>)}
          </select>
        </label>
        {stage > 0 && (
          <Button disabled={busy || !s?.open} onClick={processNow}>Procesar etapa ahora</Button>
        )}
      </div>
      {s ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Estado: {!s.savedAt ? "Sin entrar" : s.confirmedAt ? "Confirmado" : "Guardado como borrador"}</p>
          <p>Guardado: {s.savedAt ? formatChile(s.savedAt) : "—"}</p>
          {stage > 0 && <p>Declaración REP: {s.repSaved ? "Presentada" : "No presentada"}</p>}
          {stage > 0 && <p>Procesado: {s.processedAt ? formatChile(s.processedAt) : "No procesado"}</p>}
          <p>{stage === 0 ? "El diagnóstico se revela al confirmarlo: no requiere procesamiento aparte." : "Normalmente el cliente procesa el año al confirmar sus decisiones; este botón es un respaldo manual."}</p>
        </div>
      ) : <p className="text-sm text-muted-foreground">Cargando…</p>}
    </div>
  );
}
