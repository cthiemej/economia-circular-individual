import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// POST {evaluationId, stage} con el JWT del cliente dueño de la evaluación, o del administrador.
export const Route = createFileRoute("/api/public/process-stage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { evaluationId?: string; stage?: number };
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { processStage } = await import("@/lib/process-stage.server");
        try {
          const auth = request.headers.get("authorization") ?? "";
          if (!auth.startsWith("Bearer ")) return Response.json({ error: "No autorizado" }, { status: 401 });
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
          const user = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            global: { headers: { Authorization: auth } },
          });
          const evaluationId = body.evaluationId;
          const stage = Number(body.stage);
          if (typeof evaluationId !== "string" || !/^[0-9a-f-]{36}$/i.test(evaluationId) || !Number.isInteger(stage))
            return Response.json({ error: "Faltan evaluationId o stage" }, { status: 400 });

          const { data: isAdmin } = await user.rpc("is_admin");
          if (!isAdmin) {
            const { data: isOwner } = await user.rpc("is_owner", { p_evaluation: evaluationId });
            if (!isOwner) return Response.json({ error: "No tienes acceso a esta evaluación" }, { status: 403 });
          }
          const { data: open } = await user.rpc("eval_stage_open", { p_evaluation: evaluationId, p_stage: stage });
          if (!open) return Response.json({ error: "Esta etapa no está lista para procesarse (faltan datos previos o ya fue procesada)" }, { status: 400 });

          const report = await processStage(admin, evaluationId, stage);
          return Response.json({ processed: report });
        } catch (e) {
          return Response.json({ error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
