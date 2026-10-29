import { describe, expect, it } from "vitest";
import { chileLocalToUTC, utcToChileLocal, validateRounds, weeklySchedule } from "@/lib/chile-time";

describe("hora de Chile", () => {
  it("convierte invierno (UTC-4) y verano (UTC-3)", () => {
    expect(chileLocalToUTC("2026-07-01T09:00")).toBe("2026-07-01T13:00:00.000Z");
    expect(chileLocalToUTC("2026-01-15T09:00")).toBe("2026-01-15T12:00:00.000Z");
    expect(utcToChileLocal("2026-07-01T13:00:00.000Z")).toBe("2026-07-01T09:00");
  });

  it("calendario semanal crea rondas 0..H de 7 días sin traslape", () => {
    const r = weeklySchedule("2026-03-02T10:00", 4);
    expect(r.map((x) => x.number)).toEqual([0, 1, 2, 3, 4]);
    expect(utcToChileLocal(r[0].opens_at)).toBe("2026-03-02T10:00");
    expect(utcToChileLocal(r[0].closes_at)).toBe("2026-03-09T10:00");
    expect(utcToChileLocal(r[4].closes_at)).toBe("2026-04-06T10:00");
    expect(validateRounds(r)).toEqual([]);
  });

  it("rechaza cierre antes de apertura y traslapes", () => {
    const bad = [
      { number: 0, opens_at: "2026-03-02T10:00:00Z", closes_at: "2026-03-01T10:00:00Z" },
      { number: 1, opens_at: "2026-03-05T10:00:00Z", closes_at: "2026-03-12T10:00:00Z" },
      { number: 2, opens_at: "2026-03-10T10:00:00Z", closes_at: "2026-03-17T10:00:00Z" },
    ];
    expect(validateRounds(bad)).toHaveLength(2);
  });
});
