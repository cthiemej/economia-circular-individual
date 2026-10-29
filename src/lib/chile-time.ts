// Conversión entre hora de Chile (America/Santiago) y UTC, sin dependencias.
export const CHILE_TZ = "America/Santiago";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHILE_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function wallParts(ms: number) {
  const p: Record<string, number> = {};
  for (const x of fmt.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function offsetMs(utcMs: number) {
  const p = wallParts(utcMs);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}

function parseLocal(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error("Fecha no válida");
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DDTHH:mm" en hora de Chile → ISO UTC. */
export function chileLocalToUTC(local: string): string {
  const { y, mo, d, h, mi } = parseLocal(local);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - offsetMs(guess);
  const off2 = offsetMs(t);
  if (guess - off2 !== t) t = guess - off2;
  return new Date(t).toISOString();
}

/** ISO UTC → "YYYY-MM-DDTHH:mm" en hora de Chile (para inputs datetime-local). */
export function utcToChileLocal(iso: string): string {
  const p = wallParts(new Date(iso).getTime());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatChile(iso: string) {
  const parts = new Intl.DateTimeFormat("es-CL", { timeZone: CHILE_TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value.replace(/\./g, "") ?? "";
  return `${value("weekday")} ${value("day")} ${value("month")}, ${value("hour")}:${value("minute")}`;
}

/** Suma días al reloj local de Chile (respeta cambios de horario). */
export function addDaysLocal(local: string, days: number): string {
  const { y, mo, d, h, mi } = parseLocal(local);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(h)}:${pad(mi)}`;
}

export type RoundSlot = { number: number; opens_at: string; closes_at: string };

/** Rondas 0..horizon de 7 días consecutivos desde la primera apertura (hora de Chile). */
export function weeklySchedule(firstOpenLocal: string, horizon: number): RoundSlot[] {
  return Array.from({ length: horizon + 1 }, (_, i) => ({
    number: i,
    opens_at: chileLocalToUTC(addDaysLocal(firstOpenLocal, 7 * i)),
    closes_at: chileLocalToUTC(addDaysLocal(firstOpenLocal, 7 * (i + 1))),
  }));
}

/** Errores: cierre no posterior a apertura, o rondas que se traslapan. */
export function validateRounds(rounds: RoundSlot[]): string[] {
  const errs: string[] = [];
  const sorted = [...rounds].sort((a, b) => a.number - b.number);
  for (const r of sorted) {
    if (new Date(r.closes_at) <= new Date(r.opens_at)) errs.push(`Ronda ${r.number}: el cierre debe ser posterior a la apertura`);
  }
  for (let i = 1; i < sorted.length; i++) {
    if (new Date(sorted[i].opens_at) < new Date(sorted[i - 1].closes_at))
      errs.push(`Ronda ${sorted[i].number} se traslapa con la ronda ${sorted[i - 1].number}`);
  }
  return errs;
}
