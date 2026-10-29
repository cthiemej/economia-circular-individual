// Adaptación de process-round.server.ts (versión multi-equipo) a la versión individual:
// procesa UNA evaluación bajo demanda cuando su dueño (o el administrador) confirma una
// etapa, en vez de esperar a un cron que cierra la ronda para todo un curso.
import {
  simulateGame, mergeParams, sanitizeDecisions,
  type Decision, type RepDeclaration, type Family,
} from "@/lib/simulator-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export async function processStage(admin: Admin, evaluationId: string, stage: number) {
  const { data: evaluation, error: evalErr } = await admin.from("evaluations").select("id, focal, horizon, rebound, projection, params").eq("id", evaluationId).single();
  if (evalErr || !evaluation) throw new Error(`Evaluación ${evaluationId} no encontrada`);
  if (stage < 1 || stage > evaluation.horizon) throw new Error(`La etapa ${stage} está fuera del horizonte (${evaluation.horizon})`);

  const params = mergeParams(evaluation.params);
  const config = { horizon: evaluation.horizon, focal: evaluation.focal as Family, rebound: evaluation.rebound, projection: evaluation.projection };

  const { data: dec } = await admin.from("decisions").select("*").eq("evaluation_id", evaluationId).lte("year", stage);
  const { data: reps } = await admin.from("rep_declarations").select("*").eq("evaluation_id", evaluationId).lte("year", stage);
  const decisions: Decision[] = [];
  const declarations: (RepDeclaration | null)[] = [];
  for (let y = 1; y <= stage; y++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = dec?.find((x: any) => x.year === y);
    decisions.push(d && d.saved_at
      ? { practices: d.practices ?? [], trainingSpend: Number(d.training_spend), educationSpend: Number(d.education_spend) }
      : { practices: [], trainingSpend: 0, educationSpend: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reps?.find((x: any) => x.year === y);
    declarations.push(r ? { tonnes: toNums(r.tonnes), obligation: toNums(r.obligation), costUF: Number(r.cost_uf) || 0 } : null);
  }
  const clean = sanitizeDecisions(decisions, params);
  const isLast = stage === config.horizon;
  const results = simulateGame(
    { ...config, horizon: config.horizon, projection: isLast && config.projection },
    clean, declarations, params,
  ).filter((r) => r.year <= stage || (isLast && r.isProjection));
  const rows = results.map((r) => ({ evaluation_id: evaluationId, year: r.year, is_projection: r.isProjection, result: r, processed_at: new Date().toISOString() }));
  const { error } = await admin.from("year_results").upsert(rows);
  if (error) throw error;

  if (isLast) {
    const { error: finErr } = await admin.from("evaluations").update({ status: "finished" }).eq("id", evaluationId);
    if (finErr) throw finErr;
  }
  return { evaluationId, stage };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNums(o: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  for (const t of ["dom", "nodom"]) {
    out[t] = {};
    for (const m of ["plastico", "papel", "metal"]) out[t][m] = Number(o?.[t]?.[m]) || 0;
  }
  return out;
}
