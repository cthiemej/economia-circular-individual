import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchEvaluationContext, type EvaluationContext } from "@/lib/evaluation-context";
import { ACCEPTED_LEVELS } from "@/lib/simulator-content";
import { normalizeCard, type PracticeCard } from "@/lib/decision-cards";
import type { YearResult } from "@/lib/simulator-engine";

export type SavedDecision = { year: number; practices: number[]; cards: Record<string, PracticeCard>; training_spend: number; education_spend: number };
export type GapAnswer = { id: string; justification: string };
export type NormAnswer = { id: string; value: string; justification: string };

/** year_results solo existe cuando ya fue procesado, así que no hace falta otro chequeo. */
export function publishedResults(results: YearResult[]) {
  return [...results].sort((a, b) => a.year - b.year);
}
export const latestResult = (results: YearResult[]) => results.filter((r) => !r.isProjection).at(-1);
export const levelAccepted = (id: number, level: string) => (ACCEPTED_LEVELS[id] ?? []).includes(level);
export const nf = (n: number, decimals = 1) => n.toLocaleString("es-CL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const pct = (n: number) => `${nf(n * 100)}%`;
export const yearLabel = (r: YearResult) => `Año ${r.year}${r.isProjection ? " (proyección)" : ""}`;
export const resultHead = (title: string, description: string) => ({ meta: [
  { title: `${title} — Simulador de Economía Circular` }, { name: "description", content: description },
  { property: "og:title", content: `${title} — Simulador de Economía Circular` }, { property: "og:description", content: description },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] });

export type EvaluationResults = {
  ctx: EvaluationContext;
  results: YearResult[];
  decisions: SavedDecision[];
  gaps: GapAnswer[];
  norms: NormAnswer[];
};

async function fetchEvaluationResults(evaluationId: string): Promise<EvaluationResults> {
  const [ctx, results, decisions, diagnosis, norms] = await Promise.all([
    fetchEvaluationContext(evaluationId),
    supabase.from("year_results").select("result").eq("evaluation_id", evaluationId).order("year"),
    supabase.from("decisions").select("year, practices, cards, training_spend, education_spend").eq("evaluation_id", evaluationId).order("year"),
    supabase.from("diagnoses").select("gaps").eq("evaluation_id", evaluationId).maybeSingle(),
    supabase.from("regulatory_maps").select("answers").eq("evaluation_id", evaluationId).maybeSingle(),
  ]);
  for (const response of [results, decisions, diagnosis, norms]) if (response.error) throw response.error;
  const savedDecisions: SavedDecision[] = (decisions.data ?? []).map((d) => ({ ...d,
    cards: Object.fromEntries(Object.entries((d.cards ?? {}) as Record<string, Partial<PracticeCard>>).map(([id, card]) => [id, normalizeCard(card)])),
  }));
  return { ctx, results: publishedResults((results.data ?? []).map((r) => r.result as unknown as YearResult)),
    decisions: savedDecisions, gaps: (diagnosis.data?.gaps ?? []) as GapAnswer[], norms: (norms.data?.answers ?? []) as NormAnswer[] };
}
export const evaluationResultsQuery = (evaluationId: string) => queryOptions({
  queryKey: ["evaluation-results", evaluationId], queryFn: () => fetchEvaluationResults(evaluationId), refetchInterval: 30000,
});
