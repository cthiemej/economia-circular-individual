import { createFileRoute } from "@tanstack/react-router";
import { baseline, simulateGame, type Decision, type GameConfig } from "@/lib/simulator-engine";

export const Route = createFileRoute("/admin/motor")({
  head: () => ({
    meta: [
      { title: "Prueba del motor — Simulador de Economía Circular" },
      { name: "description", content: "Verificación de los resultados del motor de cálculo del simulador." },
      { property: "og:title", content: "Prueba del motor — Simulador de Economía Circular" },
      { property: "og:description", content: "Verificación de los resultados del motor de cálculo del simulador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MotorPage,
});

const CONFIG: GameConfig = { horizon: 4, focal: "V", rebound: true, projection: true };
const DECISIONS: Decision[] = [
  { practices: [10, 12, 18], trainingSpend: 45, educationSpend: 60 },
  { practices: [15, 4], trainingSpend: 45, educationSpend: 60 },
  { practices: [9, 21, 8], trainingSpend: 45, educationSpend: 60 },
  { practices: [23], trainingSpend: 0, educationSpend: 0 },
];

const f1 = (n: number) => n.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (n: number) => n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MotorPage() {
  const base = baseline("V");
  const results = simulateGame(CONFIG, DECISIONS);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Prueba del motor</h1>
      <div className="flex flex-wrap gap-6 rounded-md border p-4 text-sm">
        <div>Línea base índice: <strong>{f1(base.index)}</strong></div>
        <div>Disposición final: <strong>{f1(base.landfill)} t</strong></div>
        <div>Costo REP: <strong>{f1(base.repCostUF)} UF</strong></div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Año</th><th className="p-2">Índice</th><th className="p-2">Disposición final (t)</th>
            <th className="p-2">Costo REP (UF)</th><th className="p-2">Cumpl. domiciliario</th><th className="p-2">Utilidad (MCLP)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.year} className="border-b">
              <td className="p-2">{r.year}{r.isProjection ? " (proyección)" : ""}</td>
              <td className="p-2">{f1(r.index)}</td>
              <td className="p-2">{f1(r.landfill)}</td>
              <td className="p-2">{f1(r.rep.costUF)}</td>
              <td className="p-2">{f2(r.rep.compliance.dom)}</td>
              <td className="p-2">{f1(r.finance.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
