import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$evaluationId/")({
  head: () => ({
    meta: [
      { title: "Evaluación — Simulador de Economía Circular" },
      { name: "description", content: "Menú de administración de una evaluación." },
      { property: "og:title", content: "Evaluación — Simulador de Economía Circular" },
      { property: "og:description", content: "Menú de administración de una evaluación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <p className="text-sm text-muted-foreground">Elige una opción del menú de la evaluación.</p>,
});
