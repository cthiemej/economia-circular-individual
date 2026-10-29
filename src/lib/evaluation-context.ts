import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Family } from "@/lib/simulator-engine";

export type StageStatus = {
  /** Número de la última etapa procesada (0 = ninguna; el año N si year_results tiene filas hasta N). */
  lastProcessedYear: number;
  diagnosisConfirmed: boolean;
  regmapConfirmed: boolean;
  /** Próxima etapa a trabajar: 0 = diagnóstico, 1 = mapa regulatorio + año 1, N = año N. */
  nextStage: number;
  finished: boolean;
};

export async function fetchEvaluationContext(evaluationId: string) {
  const { data: evaluation, error } = await supabase.from("evaluations").select("*").eq("id", evaluationId).single();
  if (error) throw error;
  const [{ data: diag }, { data: regmap }, { data: results }] = await Promise.all([
    supabase.from("diagnoses").select("confirmed_at").eq("evaluation_id", evaluationId).maybeSingle(),
    supabase.from("regulatory_maps").select("confirmed_at").eq("evaluation_id", evaluationId).maybeSingle(),
    supabase.from("year_results").select("year, is_projection").eq("evaluation_id", evaluationId),
  ]);
  const playedYears = (results ?? []).filter((r) => !r.is_projection).map((r) => r.year);
  const lastProcessedYear = playedYears.length ? Math.max(...playedYears) : 0;
  const diagnosisConfirmed = !!diag?.confirmed_at;
  const regmapConfirmed = !!regmap?.confirmed_at;
  const nextStage = !diagnosisConfirmed ? 0 : lastProcessedYear < evaluation.horizon ? lastProcessedYear + 1 : evaluation.horizon;
  const stages: StageStatus = {
    lastProcessedYear,
    diagnosisConfirmed,
    regmapConfirmed,
    nextStage,
    finished: evaluation.status === "finished" || lastProcessedYear >= evaluation.horizon,
  };
  return {
    evaluationId: evaluation.id as string,
    evaluationName: evaluation.name as string,
    focal: evaluation.focal as Family,
    run: {
      id: evaluation.id as string,
      name: evaluation.name as string,
      horizon: evaluation.horizon as number,
      rebound: evaluation.rebound as boolean,
      projection: evaluation.projection as boolean,
      params: (evaluation.params ?? {}) as Record<string, unknown>,
    },
    stages,
  };
}

export type EvaluationContext = Awaited<ReturnType<typeof fetchEvaluationContext>>;

export const evaluationContextQuery = (evaluationId: string) =>
  queryOptions({ queryKey: ["evaluation-context", evaluationId], queryFn: () => fetchEvaluationContext(evaluationId) });

export const stageName = (n: number) => (n === 0 ? "Diagnóstico" : n === 1 ? "Mapa regulatorio y Año 1" : `Año ${n}`);
