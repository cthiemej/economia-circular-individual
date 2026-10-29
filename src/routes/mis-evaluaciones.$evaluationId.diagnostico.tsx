import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAPS } from "@/lib/simulator-content";
import { diagnosisErrors, MIN_JUSTIFICATION, type Gap } from "@/lib/diagnosis";
import { formatChile } from "@/lib/chile-time";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { writeErrorMessage } from "@/lib/write-errors";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Simulador de Economía Circular" },
      { name: "description", content: "Elige las dos brechas principales de la empresa." },
      { property: "og:title", content: "Diagnóstico — Simulador de Economía Circular" },
      { property: "og:description", content: "Elige las dos brechas principales de la empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Diagnostico,
});

function Diagnostico() {
  const { evaluationId } = Route.useRouteContext();
  const qc = useQueryClient();

  const saved = useQuery({
    queryKey: ["diagnosis", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("diagnoses").select("*").eq("evaluation_id", evaluationId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const open = useQuery({
    queryKey: ["stage-open", evaluationId, 0],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eval_stage_open", { p_evaluation: evaluationId, p_stage: 0 });
      if (error) throw error;
      return !!data;
    },
  });
  const processed = !!saved.data?.confirmed_at;
  const canEdit = !!open.data && saved.isSuccess;

  const [gaps, setGaps] = useState<Gap[]>([]);
  useEffect(() => {
    if (saved.data) setGaps(((saved.data.gaps as Gap[] | null) ?? []).map((g) => ({ id: g.id, justification: g.justification ?? "" })));
  }, [saved.data]);

  function toggle(id: string) {
    if (!canEdit) return;
    setGaps((gs) => gs.some((g) => g.id === id) ? gs.filter((g) => g.id !== id) : gs.length >= 2 ? (toast.error("Solo puedes elegir 2 brechas"), gs) : [...gs, { id, justification: "" }]);
  }

  async function save(confirm: boolean) {
    if (!open.data) { toast.error("Esta etapa ya no se puede editar"); return; }
    if (confirm) {
      const errs = diagnosisErrors(gaps);
      if (errs.length) { toast.error(errs.join(" ")); return; }
    }
    const now = new Date().toISOString();
    const row = { evaluation_id: evaluationId, gaps, saved_at: now, ...(confirm ? { confirmed_at: now } : {}) };
    const { error } = await supabase.from("diagnoses").upsert(row, { onConflict: "evaluation_id" });
    if (error) { toast.error(writeErrorMessage(error, true)); return; }
    toast.success(confirm ? "Diagnóstico confirmado" : "Borrador guardado");
    qc.invalidateQueries({ queryKey: ["diagnosis", evaluationId] });
    qc.invalidateQueries({ queryKey: ["stage-open", evaluationId] });
    qc.invalidateQueries({ queryKey: ["evaluation-context", evaluationId] });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Diagnóstico</h1>
        <p className="text-sm text-muted-foreground">Elige exactamente 2 brechas y justifica cada una (mínimo {MIN_JUSTIFICATION} caracteres).</p>
      </div>
      {!canEdit && (
        <p className="rounded bg-muted px-3 py-2 text-sm">
          {processed ? "El diagnóstico ya está confirmado: modo lectura." : "Modo lectura."}
        </p>
      )}
      {saved.data?.saved_at && (
        <p className="text-xs text-muted-foreground">
          Último guardado: {formatChile(saved.data.saved_at)}{saved.data.confirmed_at ? ` · Confirmado: ${formatChile(saved.data.confirmed_at)}` : " · Borrador"}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {GAPS.map((g) => {
          const sel = gaps.find((x) => x.id === g.id);
          return (
            <div key={g.id} className={`space-y-3 rounded-lg border-2 p-4 ${sel ? "border-primary bg-accent/40" : "border-border"}`}>
              <Button variant="ghost" type="button" aria-pressed={!!sel} disabled={!canEdit} onClick={() => toggle(g.id)} className="h-auto w-full justify-start whitespace-normal p-0 text-left disabled:cursor-default">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{g.text}</span>
                  {sel && <span className="shrink-0 text-xs font-semibold text-primary">Elegida</span>}
                </div>
              </Button>
              {sel && (
                canEdit ? (
                  <div>
                    <Textarea aria-label={`Justificación: ${g.text}`} value={sel.justification} placeholder="Justificación"
                      onChange={(e) => setGaps((gs) => gs.map((x) => (x.id === g.id ? { ...x, justification: e.target.value } : x)))} />
                    <div className={`text-right text-xs ${sel.justification.trim().length < MIN_JUSTIFICATION ? "text-destructive" : "text-muted-foreground"}`}>
                      {sel.justification.trim().length}/{MIN_JUSTIFICATION}
                    </div>
                  </div>
                ) : <p className="whitespace-pre-wrap text-sm">{sel.justification || "—"}</p>
              )}
              {processed && (
                <div className={`rounded px-3 py-2 text-sm ${g.isReal ? "bg-accent" : "bg-muted"}`}>
                  <strong>{g.isReal ? "Brecha real" : "Distractor"}</strong>{sel ? " · elegida" : ""}
                  <p className="mt-1">{g.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => save(false)}>Guardar borrador</Button>
          <Button onClick={() => save(true)}>Confirmar</Button>
        </div>
      )}
    </div>
  );
}
