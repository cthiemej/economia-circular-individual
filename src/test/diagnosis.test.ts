import { describe, expect, it } from "vitest";
import { diagnosisErrors } from "@/lib/diagnosis";
const long = "x".repeat(40);
describe("diagnóstico", () => {
  it("exige exactamente 2 brechas", () => {
    expect(diagnosisErrors([{ id: "G1", justification: long }])).toHaveLength(1);
    expect(diagnosisErrors([{ id: "G1", justification: long }, { id: "G2", justification: long }])).toEqual([]);
  });
  it("exige 40 caracteres por justificación", () => {
    expect(diagnosisErrors([{ id: "G1", justification: "x".repeat(39) }, { id: "G2", justification: long }])).toHaveLength(1);
  });
});
