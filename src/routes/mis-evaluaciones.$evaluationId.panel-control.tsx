import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mis-evaluaciones/$evaluationId/panel-control")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/mis-evaluaciones/$evaluationId/panel", params, statusCode: 301 }); },
});
