import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeParams, type Params } from "@/lib/simulator-engine";

export function useSimulatorParams(evaluationId: string | null | undefined) {
  return useQuery<Params>({
    queryKey: ["evaluation-params", evaluationId],
    enabled: !!evaluationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("evaluations").select("params").eq("id", evaluationId!).maybeSingle();
      if (error) throw error;
      return mergeParams((data?.params as Record<string, unknown> | null) ?? null);
    },
  });
}
