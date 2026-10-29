import { DEFAULT_PARAMS, mergeParams, type Params } from "@/lib/simulator-engine";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Rutas de valores escalares editables (anidadas con puntos). */
export const SCALAR_PATHS = [
  "ufCLP",
  "baseSeparation",
  "baseCoverage",
  ...["dom", "nodom"].flatMap((t) => ["plastico", "papel", "metal"].map((m) => `repTargetsY4.${t}.${m}`)),
  ...["avoid", "reuse", "recycle", "recover"].map((k) => `weights.${k}`),
];

function getPath(o: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((a, k) => (isObj(a) ? a[k] : undefined), o);
}
function setPath(o: Obj, path: string, v: unknown) {
  const ks = path.split(".");
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k] as Obj;
  }
  cur[ks[ks.length - 1]] = v;
}
function delPath(o: Obj, path: string) {
  const ks = path.split(".");
  const stack: Obj[] = [o];
  for (const k of ks.slice(0, -1)) {
    const n = stack[stack.length - 1][k];
    if (!isObj(n)) return;
    stack.push(n);
  }
  delete stack[stack.length - 1][ks[ks.length - 1]];
  for (let i = stack.length - 1; i > 0; i--) if (Object.keys(stack[i]).length === 0) delete stack[i - 1][ks[i - 1]];
}

export type ParamForm = {
  scalars: Record<string, string>;
  tariffs: string[];        // por componente, mismo orden que DEFAULT_PARAMS.components
  factors: string[];        // repTargetFactor índices 0..5
};

export function formFromParams(p: Params): ParamForm {
  return {
    scalars: Object.fromEntries(SCALAR_PATHS.map((k) => [k, String(getPath(p, k))])),
    tariffs: p.components.map((c) => String(c.tariffUF)),
    factors: p.repTargetFactor.map(String),
  };
}

/**
 * Construye runs.params: conserva otras claves existentes y guarda solo lo que difiere
 * del valor por defecto, todo como número. Si cambia una tarifa guarda el arreglo
 * components completo; igual con repTargetFactor (mergeParams reemplaza arreglos).
 */
export function buildOverrides(prev: Obj | null | undefined, form: ParamForm): Obj {
  const out: Obj = structuredClone(prev ?? {});
  for (const k of SCALAR_PATHS) {
    const n = Number(form.scalars[k]);
    if (!Number.isFinite(n)) throw new Error(`Valor no numérico en ${k}`);
    if (n === getPath(DEFAULT_PARAMS, k)) delPath(out, k);
    else setPath(out, k, n);
  }
  const effective = mergeParams(prev ?? {});
  const tariffs = form.tariffs.map(Number);
  if (tariffs.some((t) => !Number.isFinite(t))) throw new Error("Tarifa no numérica");
  if (tariffs.some((t, i) => t !== DEFAULT_PARAMS.components[i]?.tariffUF))
    out["components"] = effective.components.map((c, i) => ({ ...c, tariffUF: tariffs[i] }));
  else delete out["components"];
  const factors = form.factors.map(Number);
  if (factors.some((f) => !Number.isFinite(f))) throw new Error("Factor no numérico");
  if (factors.some((f, i) => f !== DEFAULT_PARAMS.repTargetFactor[i])) out["repTargetFactor"] = factors;
  else delete out["repTargetFactor"];
  return out;
}
