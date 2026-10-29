import { describe, expect, it } from "vitest";
import { DEMO_HORIZON } from "@/lib/demo";
import { writeErrorMessage } from "@/lib/write-errors";
import { formatChile } from "@/lib/chile-time";

describe("configuración de la demostración", () => {
  it("usa un horizonte de 4 años", () => {
    expect(DEMO_HORIZON).toBe(4);
  });
  it("formats the date in Santiago instead of the browser timezone", () => {
    expect(formatChile("2025-11-04T02:59:00Z")).toBe("lun 3 nov, 23:59");
  });
  it("explains a closed-stage error", () => {
    expect(writeErrorMessage({ code: "42501", message: "new row violates row-level security policy" })).toBe("Esta etapa ya no se puede editar");
  });
  it("explains a permission error when the caller cannot edit", () => {
    expect(writeErrorMessage({ code: "42501" }, false)).toBe("No tienes permiso para guardar");
  });
});
