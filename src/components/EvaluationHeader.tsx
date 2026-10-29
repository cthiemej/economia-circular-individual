import { focalLabel } from "@/lib/evaluations";
import { stageName, type EvaluationContext } from "@/lib/evaluation-context";
import { Badge } from "@/components/ui/badge";

export function EvaluationHeader({ ctx }: { ctx: EvaluationContext }) {
  const { stages } = ctx;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card p-4 text-sm">
      <div><span className="text-muted-foreground">Evaluación</span> <strong>{ctx.evaluationName}</strong></div>
      <div><span className="text-muted-foreground">Producto focal</span> <strong>{focalLabel(ctx.focal)}</strong></div>
      {stages.finished ? (
        <Badge variant="outline" className="border-primary text-primary">Evaluación finalizada</Badge>
      ) : (
        <div>
          <span className="text-muted-foreground">Etapa actual: </span>
          <strong>{stageName(stages.nextStage)}</strong>
        </div>
      )}
      {stages.lastProcessedYear > 0 && (
        <Badge variant="outline" className="border-primary text-primary">
          Resultados del año {stages.lastProcessedYear} disponibles
        </Badge>
      )}
    </div>
  );
}
