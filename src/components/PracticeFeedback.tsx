import { Check, X } from "lucide-react";
import type { Params } from "@/lib/simulator-engine";
import type { SavedDecision } from "@/lib/evaluation-results";
import { levelAccepted } from "@/lib/evaluation-results";
import { normalizeCard } from "@/lib/decision-cards";
import { Badge } from "@/components/ui/badge";
import { LEVEL_COLORS } from "@/lib/simulator-content";

const levelClass = (level: string) => {
  const color = LEVEL_COLORS[level];
  const representative = Object.keys(LEVEL_COLORS).find((key) => LEVEL_COLORS[key] === color) ?? "Ninguno";
  return `level-${representative.replaceAll(" ", "-").replaceAll("(", "").replaceAll(")", "")}`;
};

export function PracticeFeedback({ decision, params, full = false }: { decision?: SavedDecision | undefined; params: Params; full?: boolean }) {
  if (!decision?.practices.length) return <p className="text-sm text-muted-foreground">Sin prácticas elegidas este año.</p>;
  return <div className="grid gap-4 lg:grid-cols-2">{decision.practices.map((id) => {
    const practice = params.practices.find((p) => p.id === id);
    if (!practice) return null;
    const card = normalizeCard(decision.cards[String(id)]);
    const correct = levelAccepted(id, card.level);
    return <article key={id} className="practice-feedback break-inside-avoid space-y-3 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{practice.name}</h3><Badge className={`level-color ${levelClass(practice.level)}`} variant="outline">{practice.level}</Badge></div>
      <p className={`flex items-center gap-2 text-sm ${correct ? "text-success" : "text-destructive"}`}>{correct ? <Check size={16} /> : <X size={16} />}Nivel elegido: {card.level || "Sin ficha"} · {correct ? "Acierto" : "No coincide"}</p>
      <div><p className="text-xs font-semibold uppercase text-muted-foreground">Qué enseña</p><p className="mt-1 text-sm">{practice.teaches}</p></div>
      <div><p className="text-xs font-semibold uppercase text-muted-foreground">Grupos de interés afectados</p><p className="mt-1 text-sm">{practice.stakeholders.join(", ")}</p></div>
      {full && <dl className="space-y-2 border-t pt-3 text-sm">
        <div><dt className="font-medium">Razonamiento</dt><dd className="whitespace-pre-wrap">{card.reasoning || "—"}</dd></div>
      </dl>}
    </article>;
  })}</div>;
}
