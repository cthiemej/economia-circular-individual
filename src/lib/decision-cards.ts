export const MIN_REASONING = 40;
export const MAX_PRACTICES = 3;

/**
 * Ficha de una práctica elegida. El equipo sólo clasifica la práctica en la
 * jerarquía de las 10R y justifica por qué la eligió; el resto del análisis
 * (grupos de interés, beneficios e indicadores) se discute en clase.
 */
export type PracticeCard = {
  level: string;
  reasoning: string;
};

export const emptyCard = (): PracticeCard => ({ level: "", reasoning: "" });

/** Lee una ficha guardada y descarta los campos que ya no se piden. */
export function normalizeCard(c: Partial<PracticeCard> | null | undefined): PracticeCard {
  return { level: c?.level ?? "", reasoning: c?.reasoning ?? "" };
}

/** Campos pendientes de una ficha (vacío = completa). */
export function cardIssues(c: PracticeCard): string[] {
  const out: string[] = [];
  if (!c.level) out.push("nivel 10R");
  if (c.reasoning.trim().length < MIN_REASONING) out.push(`razonamiento (mínimo ${MIN_REASONING} caracteres)`);
  return out;
}

/** Intenta agregar una práctica respetando el máximo; devuelve null si ya hay 3. */
export function addPractice(selected: number[], id: number): number[] | null {
  if (selected.includes(id)) return selected;
  if (selected.length >= MAX_PRACTICES) return null;
  return [...selected, id];
}
