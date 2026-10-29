import { describe, expect, it } from "vitest";
import { addPractice, cardIssues, emptyCard, normalizeCard } from "@/lib/decision-cards";
import { availablePractices } from "@/lib/simulator-engine";

const ids = (y: number, before: number[]) => availablePractices(y, before).map((p) => p.id);

describe("decisiones del año", () => {
  it("no permite una cuarta práctica", () => {
    expect(addPractice([1, 2, 3], 4)).toBeNull();
    expect(addPractice([1, 2], 4)).toEqual([1, 2, 4]);
  });

  it("una práctica elegida el año 1 no aparece el año 2", () => {
    const y1 = ids(1, []);
    expect(ids(2, [y1[0]])).not.toContain(y1[0]);
  });

  it("la práctica 9 aparece desde el año 3 solo si antes se eligió la 18", () => {
    expect(ids(3, [])).not.toContain(9);
    expect(ids(3, [18])).toContain(9);
    expect(ids(2, [18])).not.toContain(9);
  });

  it("la ficha exige nivel 10R y un razonamiento de 40 caracteres", () => {
    const c = { ...emptyCard(), level: "Reducir", reasoning: "r".repeat(40) };
    expect(cardIssues(c)).toEqual([]);
    expect(cardIssues({ ...c, reasoning: "r".repeat(39) })).toHaveLength(1);
    expect(cardIssues({ ...c, level: "" })).toHaveLength(1);
    expect(cardIssues(emptyCard())).toHaveLength(2);
  });

  it("descarta los campos que ya no se piden al leer una ficha guardada", () => {
    const guardada = { level: "Reducir", reasoning: "r".repeat(40), stakeholders: ["Consumidores"], indicator: { name: "a" } };
    expect(normalizeCard(guardada as never)).toEqual({ level: "Reducir", reasoning: "r".repeat(40) });
  });
});
