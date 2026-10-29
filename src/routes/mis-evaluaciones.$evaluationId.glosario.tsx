import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GLOSSARY } from "@/lib/simulator-content";
import { resultHead } from "@/lib/evaluation-results";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/glosario")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"] : "" }),
  head: () => resultHead("Glosario", "Conceptos de economía circular, jerarquía de las 10R y Ley REP."),
  component: Glosario,
});

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
function Glosario() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const entries = GLOSSARY.filter((entry) => normalize(`${entry.term} ${entry.def}`).includes(normalize(q)));
  return <div className="max-w-4xl space-y-6"><h1 className="text-2xl font-semibold">Glosario</h1><div className="relative max-w-md"><Search className="absolute left-3 top-3 text-muted-foreground" size={16} /><Input aria-label="Buscar en el glosario" placeholder="Buscar término" className="pl-9" value={q} onChange={(e) => navigate({ search: { q: e.target.value }, replace: true })} /></div><dl className="divide-y">{entries.map((entry) => <div key={entry.term} className="py-5"><dt className="font-serif text-lg font-semibold">{entry.term}</dt><dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.def}</dd></div>)}</dl>{!entries.length && <p className="text-muted-foreground">Sin coincidencias.</p>}</div>;
}
