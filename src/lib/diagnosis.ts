import { GAPS } from "@/lib/simulator-content";

export type Gap = { id: string; justification: string };
export const MIN_JUSTIFICATION = 40;

export function diagnosisErrors(gaps: Gap[]) {
  const e: string[] = [];
  if (gaps.length !== 2) e.push("Debes elegir exactamente 2 brechas.");
  for (const g of gaps) if (g.justification.trim().length < MIN_JUSTIFICATION) e.push(`La justificación de "${GAPS.find((x) => x.id === g.id)?.text}" debe tener al menos ${MIN_JUSTIFICATION} caracteres.`);
  return e;
}

