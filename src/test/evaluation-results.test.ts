import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, simulateGame } from "@/lib/simulator-engine";
import { latestResult, levelAccepted, publishedResults } from "@/lib/evaluation-results";

const results = simulateGame({ horizon: 4, focal: "V", rebound: true, projection: true }, [
  { practices: [10, 12, 18], trainingSpend: 45, educationSpend: 60 },
  { practices: [15, 4], trainingSpend: 45, educationSpend: 60 },
  { practices: [9, 21, 8], trainingSpend: 45, educationSpend: 60 },
  { practices: [23], trainingSpend: 0, educationSpend: 0 },
], [], DEFAULT_PARAMS);

describe("resultados publicados de la evaluación", () => {
  it("keeps the calibrated Prompt 2 index at 20.6 in year 1", () => {
    expect(Number(results[0].index.toFixed(1))).toBe(20.6);
  });
  it("publishedResults sorts by year (year_results solo existe si fue procesado)", () => {
    expect(publishedResults(results).map((r) => r.year)).toEqual([1, 2, 3, 4, 5]);
  });
  it("latest dashboard year excludes projection", () => {
    expect(latestResult(publishedResults(results))?.year).toBe(4);
  });
  it("compares the client's level to the accepted practice levels", () => {
    expect(levelAccepted(10, "Reducir")).toBe(true);
    expect(levelAccepted(10, "Recuperar")).toBe(false);
    expect(levelAccepted(9, "Reciclar")).toBe(true);
  });
});
