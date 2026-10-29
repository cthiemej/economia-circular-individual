import { describe, expect, it } from "vitest";
import { buildOverrides, formFromParams } from "@/lib/param-overrides";
import { DEFAULT_PARAMS, mergeParams } from "@/lib/simulator-engine";

describe("parámetros guardados", () => {
  it("sin cambios no guarda nada", () => {
    expect(buildOverrides({}, formFromParams(DEFAULT_PARAMS))).toEqual({});
  });

  it("guarda solo la clave cambiada, como número", () => {
    const f = formFromParams(DEFAULT_PARAMS);
    f.scalars["ufCLP"] = "39500";
    f.scalars["weights.reuse"] = "0.7";
    expect(buildOverrides({}, f)).toEqual({ ufCLP: 39500, weights: { reuse: 0.7 } });
  });

  it("al cambiar una tarifa guarda el arreglo components completo", () => {
    const f = formFromParams(DEFAULT_PARAMS);
    f.tariffs[0] = "6";
    const o = buildOverrides({}, f) as { components: { tariffUF: number }[] };
    expect(o.components).toHaveLength(DEFAULT_PARAMS.components.length);
    expect(o.components[0].tariffUF).toBe(6);
    expect(mergeParams(o).components[1].tariffUF).toBe(DEFAULT_PARAMS.components[1].tariffUF);
  });

  it("volver al valor por defecto elimina la clave", () => {
    const f = formFromParams(DEFAULT_PARAMS);
    expect(buildOverrides({ ufCLP: 1, weights: { avoid: 2 } }, f)).toEqual({});
  });
});
