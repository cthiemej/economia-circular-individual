import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PARAMS, type Family } from "@/lib/simulator-engine";

export const FOCAL_ORDER: Family[] = ["V", "J", "P", "H"];
export const focalLabel = (f: string) => DEFAULT_PARAMS.familyLabel[f as Family] ?? f;

/** Rebote por defecto: encendido con horizonte 3 o 4. */
export const defaultRebound = (horizon: number) => horizon >= 3;

export const STATUS_LABEL: Record<string, string> = { active: "En curso", finished: "Finalizada" };

export type EvaluationRow = {
  id: string;
  name: string;
  focal: string;
  horizon: number;
  rebound: boolean;
  projection: boolean;
  params: Record<string, unknown>;
  status: string;
  created_at: string;
  user_id: string;
};

/** Evaluaciones del cliente autenticado. */
export const myEvaluationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["evaluations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, name, focal, horizon, rebound, projection, params, status, created_at, user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EvaluationRow[];
    },
  });

/** Todas las evaluaciones de todos los clientes (solo administrador). */
export const allEvaluationsQuery = queryOptions({
  queryKey: ["evaluations-all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("evaluations")
      .select("id, name, focal, horizon, rebound, projection, params, status, created_at, user_id, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((e) => ({
      ...e,
      ownerName: (e.profiles as { full_name: string | null; email: string | null } | null)?.full_name
        || (e.profiles as { full_name: string | null; email: string | null } | null)?.email
        || "Cliente",
    }));
  },
});

export const evaluationQuery = (evaluationId: string) =>
  queryOptions({
    queryKey: ["evaluation", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("evaluations").select("*").eq("id", evaluationId).maybeSingle();
      if (error) throw error;
      return data as EvaluationRow | null;
    },
  });

export async function createEvaluation(input: {
  userId: string;
  name: string;
  focal: Family;
  horizon: number;
  rebound: boolean;
  projection: boolean;
}) {
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      user_id: input.userId,
      name: input.name,
      focal: input.focal,
      horizon: input.horizon,
      rebound: input.rebound,
      projection: input.projection,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
