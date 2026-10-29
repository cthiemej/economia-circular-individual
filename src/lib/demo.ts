import { supabase } from "@/integrations/supabase/client";

export const DEMO_HORIZON = 4;

/** Evaluación de demostración de un solo "cliente" (sin equipos ni rondas), para que el
 * administrador pueda probar rápidamente el flujo completo del simulador. */
export async function createDemoEvaluation() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sesión no iniciada.");
  const { data, error } = await supabase
    .from("evaluations")
    .insert({ user_id: u.user.id, name: "Demostración", focal: "V", horizon: DEMO_HORIZON, rebound: true, projection: true, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
