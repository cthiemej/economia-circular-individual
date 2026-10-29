// =====================================================================
// Simulador de economía circular — Cecinas Cordillera S.A. (ficticia)
// Motor de cálculo puro (sin dependencias). Fuente única de verdad del
// modelo: la app de Lovable lo importa tal cual (src/lib/simulator-engine.ts)
// y la Edge Function de cierre de ronda usa una copia idéntica.
// Unidades: toneladas (t), millones de pesos (MCLP), UF.
// =====================================================================

export type Family = "V" | "J" | "P" | "H"; // Vienesas, Jamones, Parrilleros, Hortalizas
export type PackType = "dom" | "nodom";
export type Material = "plastico" | "papel" | "metal";
export type Level10R =
  | "Rechazar" | "Repensar" | "Reducir" | "Reusar" | "Reparar y reusar" | "Reutilizar"
  | "Reciclar" | "Recuperar" | "Habilitador" | "Cumplimiento" | "Información" | "Medición" | "Ninguno"
  | "Reducir y reciclar" | "Reciclar (alto grado)" | "Reciclar (aparente)";

export interface PackComponent {
  id: string;
  label: string;
  family: Family | null;          // null = toda la empresa
  type: PackType;
  material: Material;
  tariffCategory: string;         // categoría del tarifario del sistema colectivo
  tariffUF: number;               // UF por tonelada
  mass: number;                   // t/año en el año 0
  recyclability: number;          // 0..1, fracción técnicamente reciclable
  baseRecycleRate?: number;       // sólo no domiciliarios: tasa de reciclaje en clientes
  emissionFactor: number;         // tCO2e por t de material
  materialCost: number;           // MCLP por t de material
}

export interface PlantStream {
  id: "noApto" | "organicos" | "insumos" | "pallets" | "otros";
  label: string;
  mass: number;
  reuse: number;      // fracción a reusar/reutilizar (peso 10R medio)
  recycle: number;    // fracción a reciclar
  recover: number;    // fracción a valorización energética
  organic: boolean;
}

export interface Practice {
  id: number;
  name: string;
  area: "Envase" | "Operación" | "Gestión";
  fromYear: 1 | 2 | 3 | 4;
  requiresManager: boolean;
  level: Level10R;
  capex: number;      // MCLP, una vez, el año en que se elige
  opex: number;       // MCLP por año desde que se elige
  rebound: number;    // aumento de volumen por año activo (con rebote encendido, ρ = 1)
  teaches: string;
  stakeholders: string[]; // grupos de interés afectados (mapa interno)
}

export interface Params {
  ufCLP: number;                    // valor UF en CLP
  revenueBase: number;              // MCLP
  profitBase: number;               // MCLP utilidad operativa año 0
  sales: Record<Family, number>;    // t producto/año
  unitKg: Record<Family, number>;   // kg de producto por unidad de venta
  familyLabel: Record<Family, string>;
  components: PackComponent[];
  plant: PlantStream[];
  // Comportamiento domiciliario
  baseSeparation: number;           // fracción de hogares que separa
  baseCoverage: number;             // cobertura de recolección del sistema colectivo
  baseTraceability: number;         // fracción de lo valorizado que se puede acreditar
  // Metas REP (fracción) del año 4; años 1-3 = factor × meta año 4
  repTargetsY4: Record<PackType, Record<Material, number>>;
  repTargetFactor: number[];        // índice 0..4 (0 no usado), año 5 = proyección
  penaltyUFperT: Record<PackType, number>; // multa por t de déficit
  surchargeWrongDecl: number;       // recargo sobre costo REP por declaración errónea
  surchargeNoDecl: number;          // recargo si no se presenta
  declTolerance: number;            // tolerancia relativa de la declaración
  // Índice de circularidad
  weights: { avoid: number; reuse: number; recycle: number; recover: number };
  indexTargetGain: Record<1 | 2 | 3 | 4, number>;
  landfillReductionTarget: Record<1 | 2 | 3 | 4, number>;
  // Gastos
  training: { ref: number; carry: number; maxNoAptoCut: number; maxPlantRecycleUp: number };
  education: { ref: number; carry: number; maxSeparationUp: number };
  responseK: number;                // curvatura de rendimientos decrecientes
  managerBoost: number;             // 1.2 = los gastos rinden 20% más
  // Costos y ahorros
  noAptoValue: number;              // MCLP por t de producto no apto evitado
  landfillCost: number;             // MCLP por t a disposición final
  organicLandfillEF: number;        // tCO2e por t orgánica a relleno
  noAptoEF: number;                 // tCO2e por t de producto no apto generado
  // Efecto rebote
  reboundRho: number;
  // Producto focal: fracción del efecto de prácticas de envase que se extiende al resto
  spillover: number;
  practices: Practice[];
}

export interface Decision {
  practices: number[];      // ids elegidos este año (máx 3)
  trainingSpend: number;    // MCLP
  educationSpend: number;   // MCLP
}

export interface GameConfig {
  horizon: 1 | 2 | 3 | 4;
  focal: Family;
  rebound: boolean;
  projection: boolean;      // 1 año adicional sin decisiones
}

export interface RepDeclaration {
  // toneladas declaradas por tipo y material, toneladas a valorizar y costo en UF
  tonnes: Record<PackType, Record<Material, number>>;
  obligation: Record<PackType, Record<Material, number>>;
  costUF: number;
}

export interface PackagingLine {
  id: string; label: string; family: Family | null; type: PackType; material: Material;
  tariffCategory: string; tariffUF: number;   // tarifa aplicable (incluye sistema individual si corresponde)
  tonnes: number;                             // t puestas en el mercado
  units: number | null;                       // unidades vendidas de la familia (sólo domiciliarios)
  gramsPerUnit: number | null;                // gramos del componente por unidad (sólo domiciliarios)
}

export interface YearResult {
  year: number;                    // 1..horizon (+1 si proyección)
  isProjection: boolean;
  volume: number;                  // factor de volumen (rebote)
  index: number;                   // 0..100
  indexTarget: number;             // meta del índice (lineal hacia la meta del horizonte)
  flows: { avoided: number; reused: number; recycled: number; recovered: number; landfill: number; reference: number };
  landfill: number;
  landfillAllowedCum: number;
  landfillCum: number;
  landfillOk: boolean;
  rep: {
    placed: Record<PackType, Record<Material, number>>;
    obligation: Record<PackType, Record<Material, number>>;
    valorized: Record<PackType, Record<Material, number>>;
    compliance: Record<PackType, number>;    // valorizado / obligación (≥1 cumple)
    deficit: Record<PackType, number>;       // t
    costUF: number;
    penaltyUF: number;
    surchargeUF: number;
    declarationStatus: "correcta" | "erronea" | "no_presentada" | "no_evaluada";
    declarationErrors: string[];
  };
  finance: {
    revenue: number; profit: number; repCost: number; penalties: number;
    practiceCosts: number; spend: number; savings: number; landfillCost: number;
  };
  packaging: PackagingLine[];      // ficha de envases del año (base de la declaración REP)
  emissions: number;
  separation: number;
  coverage: number;
  trainingEffect: number;
  educationEffect: number;
  warnings: string[];
  activePractices: number[];
}

const MATS: Material[] = ["plastico", "papel", "metal"];
const TYPES: PackType[] = ["dom", "nodom"];
const zeroMat = (): Record<Material, number> => ({ plastico: 0, papel: 0, metal: 0 });
const zeroTM = (): Record<PackType, Record<Material, number>> => ({ dom: zeroMat(), nodom: zeroMat() });
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------------
// Parámetros por defecto (calibrados; ver hoja del modelo)
// ---------------------------------------------------------------------
export const DEFAULT_PARAMS: Params = {
  ufCLP: 40000,
  revenueBase: 120000,
  profitBase: 10800,
  sales: { V: 9000, J: 7000, P: 8000, H: 6000 },
  unitKg: { V: 0.25, J: 0.2, P: 0.5, H: 1.0 },
  familyLabel: { V: "Vienesas", J: "Jamones y fiambres laminados", P: "Parrilleros y hamburguesas", H: "Hortalizas congeladas" },
  components: [
    { id: "V_film", label: "Film multicapa de vienesas", family: "V", type: "dom", material: "plastico", tariffCategory: "Otros, flexible", tariffUF: 5.09, mass: 250, recyclability: 0.1, emissionFactor: 2.6, materialCost: 2.2 },
    { id: "P_film", label: "Film de parrilleros", family: "P", type: "dom", material: "plastico", tariffCategory: "PEBD con grasa, flexible", tariffUF: 5.09, mass: 180, recyclability: 0, emissionFactor: 2.1, materialCost: 1.8 },
    { id: "J_tray", label: "Bandeja de jamones", family: "J", type: "dom", material: "plastico", tariffCategory: "Otros envases PET", tariffUF: 4.06, mass: 120, recyclability: 0, emissionFactor: 2.4, materialCost: 2.0 },
    { id: "J_film", label: "Film de jamones", family: "J", type: "dom", material: "plastico", tariffCategory: "Otros, flexible", tariffUF: 5.09, mass: 80, recyclability: 0, emissionFactor: 2.6, materialCost: 2.2 },
    { id: "H_bag", label: "Bolsa de hortalizas congeladas", family: "H", type: "dom", material: "plastico", tariffCategory: "PEBD sin grasa, flexible", tariffUF: 2.95, mass: 120, recyclability: 0.5, emissionFactor: 2.0, materialCost: 1.6 },
    { id: "carton", label: "Cajas de cartón corrugado", family: null, type: "nodom", material: "papel", tariffCategory: "Cartón", tariffUF: 0.20, mass: 1000, recyclability: 1, baseRecycleRate: 0.78, emissionFactor: 0.9, materialCost: 0.7 },
    { id: "pallet_film", label: "Film de pallet", family: null, type: "nodom", material: "plastico", tariffCategory: "PEBD sin grasa, flexible", tariffUF: 0.21, mass: 90, recyclability: 1, baseRecycleRate: 0.3, emissionFactor: 2.0, materialCost: 1.6 },
    { id: "strap", label: "Zuncho", family: null, type: "nodom", material: "plastico", tariffCategory: "PP sin grasa, rígido", tariffUF: 0.21, mass: 10, recyclability: 1, baseRecycleRate: 0.2, emissionFactor: 2.0, materialCost: 1.6 },
  ],
  plant: [
    { id: "noApto", label: "Producto no apto (rechazado, dañado o vencido)", mass: 520, reuse: 0.05, recycle: 0, recover: 0, organic: true },
    { id: "organicos", label: "Residuos orgánicos de proceso", mass: 320, reuse: 0, recycle: 0.10, recover: 0, organic: true },
    { id: "insumos", label: "Embalajes de insumos (cartón y film)", mass: 180, reuse: 0, recycle: 0.75, recover: 0, organic: false },
    { id: "pallets", label: "Pallets y cajas de distribución dañados", mass: 100, reuse: 0.10, recycle: 0.30, recover: 0, organic: false },
    { id: "otros", label: "Otros residuos no reciclables", mass: 80, reuse: 0, recycle: 0, recover: 0, organic: false },
  ],
  baseSeparation: 0.15,
  baseCoverage: 0.70,
  baseTraceability: 0.90,
  repTargetsY4: { dom: { plastico: 0.11, papel: 0.18, metal: 0.15 }, nodom: { plastico: 0.32, papel: 0.65, metal: 0.51 } },
  repTargetFactor: [0, 0.4, 0.6, 0.8, 1.0, 1.0],
  penaltyUFperT: { dom: 15, nodom: 12 },
  surchargeWrongDecl: 0.10,
  surchargeNoDecl: 0.20,
  declTolerance: 0.03,
  weights: { avoid: 1.0, reuse: 0.6, recycle: 0.25, recover: 0.2 },
  indexTargetGain: { 1: 14, 2: 21, 3: 25, 4: 27 },
  landfillReductionTarget: { 1: 0.12, 2: 0.22, 3: 0.32, 4: 0.40 },
  training: { ref: 45, carry: 0.4, maxNoAptoCut: 0.12, maxPlantRecycleUp: 0.15 },
  education: { ref: 60, carry: 0.5, maxSeparationUp: 0.12 },
  responseK: 2,
  managerBoost: 1.2,
  noAptoValue: 3.0,
  landfillCost: 0.045,
  organicLandfillEF: 0.7,
  noAptoEF: 4.0,
  reboundRho: 1,
  spillover: 0.3,
  practices: [
    { id: 1, name: "Eliminar embalaje secundario innecesario", area: "Envase", fromYear: 1, requiresManager: false, level: "Rechazar", capex: 60, opex: 0, rebound: 0.004, teaches: "Lo que no se usa no se recicla", stakeholders: ["Clientes del retail", "Proveedores de envases", "Personal de planta"] },
    { id: 2, name: "Aligerar el film (menos gramos por unidad)", area: "Envase", fromYear: 1, requiresManager: false, level: "Reducir", capex: 80, opex: 0, rebound: 0.004, teaches: "Baja las toneladas REP, pero debe seguir protegiendo el alimento", stakeholders: ["Proveedores de envases", "Consumidores", "Sistema colectivo"] },
    { id: 3, name: "Campaña de \"producto sostenible\" sin cambio de envase", area: "Envase", fromYear: 1, requiresManager: false, level: "Ninguno", capex: 0, opex: 80, rebound: 0, teaches: "Trampa: mejora la imagen, no la circularidad", stakeholders: ["Consumidores"] },
    { id: 4, name: "Diseño para reciclaje: envase monomaterial", area: "Envase", fromYear: 2, requiresManager: false, level: "Reciclar (alto grado)", capex: 150, opex: 20, rebound: 0.012, teaches: "Sube la valorización; con grasa, la tarifa REP casi no baja", stakeholders: ["Proveedores de envases", "Gestores de residuos", "Sistema colectivo", "Consumidores"] },
    { id: 5, name: "Formato con menos envase por kilo de producto", area: "Envase", fromYear: 2, requiresManager: false, level: "Reducir", capex: 120, opex: 0, rebound: 0.004, teaches: "Rediseñar el formato también es circularidad", stakeholders: ["Consumidores", "Clientes del retail", "Proveedores de envases"] },
    { id: 6, name: "Reemplazar el film plástico por papel o cartón", area: "Envase", fromYear: 2, requiresManager: false, level: "Reciclar (aparente)", capex: 100, opex: 40, rebound: 0.012, teaches: "Trampa de efectivismo, como en el caso de las bolsas", stakeholders: ["Consumidores", "Proveedores de envases", "Clientes del retail"] },
    { id: 7, name: "Contenido reciclado en film o bandeja", area: "Envase", fromYear: 2, requiresManager: false, level: "Reciclar", capex: 40, opex: 35, rebound: 0.012, teaches: "Límites sanitarios en contacto con alimento y efecto precio", stakeholders: ["Proveedores de envases", "Gestores de residuos"] },
    { id: 8, name: "Atmósfera modificada para extender la vida útil", area: "Envase", fromYear: 3, requiresManager: false, level: "Reducir", capex: 250, opex: 30, rebound: 0.004, teaches: "Algo más de envase puede evitar mucho producto vencido en góndola y en el hogar", stakeholders: ["Clientes del retail", "Consumidores", "Proveedores de envases"] },
    { id: 9, name: "Co-diseño del envase con el proveedor (ecodiseño)", area: "Envase", fromYear: 3, requiresManager: true, level: "Reducir y reciclar", capex: 90, opex: 20, rebound: 0.004, teaches: "El rol de los proveedores", stakeholders: ["Proveedores de envases", "Sistema colectivo"] },
    { id: 10, name: "Reducir merma y producto no apto en planta", area: "Operación", fromYear: 1, requiresManager: false, level: "Reducir", capex: 150, opex: 40, rebound: 0.004, teaches: "Lo que no se produce de más no es residuo", stakeholders: ["Personal de planta", "Proveedores de materias primas"] },
    { id: 11, name: "Reparación y reuso de pallets y cajas de distribución", area: "Operación", fromYear: 1, requiresManager: false, level: "Reparar y reusar", capex: 30, opex: 15, rebound: 0.008, teaches: "Extender la vida útil de lo que sí se necesita", stakeholders: ["Personal de planta", "Clientes del retail"] },
    { id: 12, name: "Subproductos cárnicos a nuevo uso (por ejemplo, alimento animal)", area: "Operación", fromYear: 1, requiresManager: false, level: "Reutilizar", capex: 80, opex: 10, rebound: 0.008, teaches: "El residuo de un proceso como insumo de otro", stakeholders: ["Gestores de residuos", "Productores de alimento animal", "Autoridad sanitaria"] },
    { id: 13, name: "Reciclaje de cartón y film de planta con gestor certificado", area: "Operación", fromYear: 1, requiresManager: false, level: "Reciclar", capex: 20, opex: 20, rebound: 0.012, teaches: "Necesario, pero de menor jerarquía", stakeholders: ["Gestores de residuos", "Personal de planta"] },
    { id: 14, name: "Valorización energética de residuos no reciclables", area: "Operación", fromYear: 1, requiresManager: false, level: "Recuperar", capex: 40, opex: 25, rebound: 0.012, teaches: "La tentación de la última R", stakeholders: ["Gestores de residuos", "Comunidad vecina"] },
    { id: 15, name: "Cajas plásticas retornables para clientes del retail", area: "Operación", fromYear: 2, requiresManager: false, level: "Repensar", capex: 300, opex: 30, rebound: 0.004, teaches: "Depende de que el cliente las acepte y las devuelva", stakeholders: ["Clientes del retail", "Operadores logísticos", "Personal de planta"] },
    { id: 16, name: "Reuso de embalajes de insumos con proveedores", area: "Operación", fromYear: 2, requiresManager: false, level: "Reusar", capex: 20, opex: 10, rebound: 0.008, teaches: "Cierra el ciclo con los proveedores", stakeholders: ["Proveedores de insumos", "Personal de planta"] },
    { id: 17, name: "Biodigestión o compostaje de residuos orgánicos de planta", area: "Operación", fromYear: 2, requiresManager: false, level: "Reciclar", capex: 200, opex: 25, rebound: 0.012, teaches: "Sirve, pero evitar la merma rinde más", stakeholders: ["Gestores de residuos", "Comunidad vecina"] },
    { id: 18, name: "Contratar Encargado de economía circular y REP", area: "Gestión", fromYear: 1, requiresManager: false, level: "Habilitador", capex: 0, opex: 45, rebound: 0, teaches: "Potencia los gastos y desbloquea dos prácticas", stakeholders: ["Personal de planta", "Sistema colectivo", "Proveedores de envases"] },
    { id: 19, name: "Trazabilidad digital con el sistema colectivo de gestión", area: "Gestión", fromYear: 1, requiresManager: false, level: "Cumplimiento", capex: 40, opex: 15, rebound: 0, teaches: "Cumplimiento real frente a cumplimiento en el papel", stakeholders: ["Sistema colectivo", "Gestores de residuos"] },
    { id: 20, name: "Sistema individual de gestión con puntos de acopio propios", area: "Gestión", fromYear: 3, requiresManager: false, level: "Reciclar", capex: 120, opex: 30, rebound: 0.012, teaches: "Menor costo por tonelada, pero mayor riesgo de incumplimiento", stakeholders: ["Sistema colectivo", "Consumidores", "Gestores de residuos"] },
    { id: 21, name: "Alianza con recicladores de base y gestores locales", area: "Gestión", fromYear: 3, requiresManager: false, level: "Reciclar", capex: 20, opex: 25, rebound: 0.012, teaches: "Grupos de interés y trazabilidad", stakeholders: ["Recicladores de base", "Municipios", "Sistema colectivo"] },
    { id: 22, name: "Certificación de economía circular de terceros", area: "Gestión", fromYear: 3, requiresManager: true, level: "Ninguno", capex: 90, opex: 20, rebound: 0, teaches: "Costosa y de poco impacto", stakeholders: ["Clientes del retail", "Consumidores"] },
    { id: 23, name: "Ecoetiquetado de reciclabilidad en los envases", area: "Gestión", fromYear: 4, requiresManager: false, level: "Información", capex: 20, opex: 5, rebound: 0, teaches: "Ayuda a separar, pero sin cambiar el envase mueve poco el índice", stakeholders: ["Consumidores", "Sistema colectivo"] },
    { id: 24, name: "Reporte anual de circularidad con indicadores", area: "Gestión", fromYear: 4, requiresManager: false, level: "Medición", capex: 0, opex: 15, rebound: 0, teaches: "Mide mejor, pero no reduce residuos", stakeholders: ["Clientes del retail", "Inversionistas", "Personal de planta"] },
  ],
};

// ---------------------------------------------------------------------
// Validación de decisiones
// ---------------------------------------------------------------------
export function availablePractices(year: number, chosenBefore: number[], params: Params = DEFAULT_PARAMS): Practice[] {
  const hasManager = chosenBefore.includes(18);
  return params.practices.filter(p =>
    p.fromYear <= year && !chosenBefore.includes(p.id) && (!p.requiresManager || hasManager));
}

export function validateDecision(year: number, chosenBefore: number[], d: Decision, params: Params = DEFAULT_PARAMS): string[] {
  const errs: string[] = [];
  if (d.practices.length > 3) errs.push("Máximo 3 prácticas por año.");
  if (new Set(d.practices).size !== d.practices.length) errs.push("Práctica repetida.");
  const avail = new Set(availablePractices(year, chosenBefore, params).map(p => p.id));
  for (const id of d.practices) if (!avail.has(id)) errs.push(`La práctica ${id} no está disponible en el año ${year}.`);
  if (d.trainingSpend < 0 || d.educationSpend < 0) errs.push("Los gastos no pueden ser negativos.");
  return errs;
}

// ---------------------------------------------------------------------
// Núcleo: estado físico de un año dado el conjunto de prácticas activas
// ---------------------------------------------------------------------
interface SpendState { x: number; y: number } // gasto efectivo acumulado (en múltiplos de la referencia)

function response(x: number, k: number) { return 1 - Math.exp(-k * x); }

function physicalYear(
  active: Set<number>, focal: Family, volume: number, trainingEff: number, educationEff: number, params: Params,
) {
  const P = params;
  const on = (id: number) => active.has(id);
  const fw = (c: PackComponent) => (c.family === null ? 1 : c.family === focal ? 1 : P.spillover);

  // --- Envases puestos en el mercado
  type Comp = PackComponent & { m: number; r: number; tariff: number; ef: number; mat: Material; cat: string; recycledContent: number };
  const comps: Comp[] = P.components.map(c => ({
    ...c, m: c.mass, r: c.recyclability, tariff: c.tariffUF, ef: c.emissionFactor, mat: c.material, cat: c.tariffCategory, recycledContent: 0,
  }));
  const focalPlastic = (c: Comp) => c.type === "dom" && c.family === focal;
  const isFlexDom = (c: Comp) => c.type === "dom" && c.id !== "J_tray";

  for (const c of comps) {
    const w = fw(c);
    if (c.id === "carton") {
      if (on(1)) c.m *= 1 - 0.15;
      if (on(15)) c.m *= 1 - 0.25; // 40% de cajas a retornables × 60% de aceptación de clientes
    }
    if (c.type === "dom") {
      if (on(2) && isFlexDom(c)) c.m *= 1 - 0.12 * w;
      if (on(5)) c.m *= 1 - 0.15 * w;
      if (on(9)) { c.m *= 1 - 0.10 * w; c.r = clamp(c.r + 0.20 * w, 0, 0.95); }
      if (on(4) && isFlexDom(c)) {
        const target = 0.85;
        if (c.r < target) c.r = c.r + (target - c.r) * w;
        if (c.cat === "Otros, flexible" && c.family === focal) c.cat = "PEBD con grasa, flexible"; // misma tarifa con grasa
      }
      if (on(8) && c.family === focal) c.m *= 1.05;
      if (on(7) && focalPlastic(c)) { c.recycledContent = 0.15; c.ef *= 0.85; }
      if (on(6) && focalPlastic(c) && c.id !== "J_tray") {
        c.m *= 1.6; c.mat = "papel"; c.cat = "Otro papel compuesto"; c.tariff = 4.19; c.r = 0.3; c.ef = 1.9; c.materialCost = 1.2;
      }
    }
    c.m *= volume;
  }

  // --- Comportamiento domiciliario
  let separation = P.baseSeparation + P.education.maxSeparationUp * educationEff + (on(23) ? 0.03 : 0);
  let coverage = P.baseCoverage + (on(19) ? 0.05 : 0) + (on(21) ? 0.10 : 0);
  if (on(20)) coverage *= 0.85;
  separation = clamp(separation); coverage = clamp(coverage);
  const traceability = on(19) ? 1.0 : P.baseTraceability;
  const tariffMult = on(20) ? 0.75 : 1;

  let reused = 0, recycled = 0, recovered = 0, landfill = 0, emissions = 0;
  const placed = zeroTM(), valorized = zeroTM();
  let repCostUF = 0, packMaterialCost = 0;

  for (const c of comps) {
    let rate: number;
    if (c.type === "dom") rate = separation * coverage * c.r;
    else rate = clamp((c.baseRecycleRate ?? 0) + (c.id !== "carton" && on(21) ? 0.3 : 0));
    const rec = c.m * rate;
    recycled += rec + c.m * c.recycledContent * 0.5; // contenido reciclado: crédito parcial de ciclo cerrado
    landfill += c.m - rec;
    placed[c.type][c.mat] += c.m;
    valorized[c.type][c.mat] += rec * traceability;
    repCostUF += c.m * c.tariff * tariffMult;
    emissions += c.m * c.ef;
    packMaterialCost += c.m * c.materialCost * (1 + (c.recycledContent > 0 ? 0.08 : 0));
  }

  // --- Residuos de planta
  const famShare = P.sales[focal] / Object.values(P.sales).reduce((a, b) => a + b, 0);
  let noAptoGenerated = 0;
  for (const s0 of P.plant) {
    let m = s0.mass * volume;
    let reuse = s0.reuse, recycle = s0.recycle, recover = s0.recover;
    if (s0.id === "noApto") {
      if (on(10)) m *= 1 - 0.25;
      m *= 1 - P.training.maxNoAptoCut * trainingEff;
      if (on(8)) m *= 1 - (0.5 * famShare + 0.15 * (1 - famShare));
      if (on(12)) reuse = Math.max(reuse, 0.6);
      noAptoGenerated = m;
    }
    if (s0.id === "organicos") {
      if (on(10)) m *= 0.9;
      if (on(12)) reuse = Math.max(reuse, 0.15);
    }
    if (s0.id === "insumos") {
      if (on(13)) recycle = Math.max(recycle, 0.9);
      if (on(16)) { reuse = 0.5; recycle = Math.min(recycle, 1 - reuse); }
    }
    if (s0.id === "pallets") {
      if (on(11)) reuse = 0.7;
      if (on(13)) recycle = Math.max(recycle, 0.6);
    }
    if (s0.id === "otros" && on(13)) recycle = 0.2;
    if (!s0.organic) recycle = Math.min(1 - reuse, recycle + P.training.maxPlantRecycleUp * trainingEff);
    if (s0.id === "organicos" && on(17)) recycle = recycle + 0.5 * (1 - reuse - recycle);
    if (!s0.organic && on(14)) recover = 0.6 * (1 - reuse - recycle);
    const tot = clamp(reuse + recycle + recover);
    const lf = m * (1 - tot);
    reused += m * reuse; recycled += m * recycle; recovered += m * recover; landfill += lf;
    if (s0.organic) emissions += lf * P.organicLandfillEF;
  }
  emissions += noAptoGenerated * P.noAptoEF;

  // --- Índice
  const baseMass = (P.components.reduce((a, c) => a + c.mass, 0) + P.plant.reduce((a, s) => a + s.mass, 0)) * volume;
  const generated = landfill + reused + recycled + recovered
    - comps.reduce((a, c) => a + c.m * c.recycledContent * 0.5, 0); // el crédito no es masa
  const avoided = baseMass - generated; // puede ser negativo (más envase que en el año 0)
  const W = P.weights;
  const index = clamp((W.avoid * avoided + W.reuse * reused + W.recycle * recycled + W.recover * recovered) / baseMass, 0, 1) * 100;

  const packaging: PackagingLine[] = comps.map(c => {
    const units = c.family ? P.sales[c.family] * volume * 1000 / P.unitKg[c.family] : null;
    return { id: c.id, label: c.label, family: c.family, type: c.type, material: c.mat, tariffCategory: c.cat,
      tariffUF: c.tariff * tariffMult, tonnes: c.m, units, gramsPerUnit: units ? c.m * 1e6 / units : null };
  });
  return { index, avoided, reused, recycled, recovered, landfill, reference: baseMass, placed, valorized, repCostUF, emissions,
    separation, coverage, noAptoGenerated, packMaterialCost, packaging };
}

// Línea base (año 0) con parámetros dados
export function baseline(focal: Family = "V", params: Params = DEFAULT_PARAMS) {
  return physicalYear(new Set(), focal, 1, 0, 0, params);
}

// ---------------------------------------------------------------------
// Declaración REP: lo que el modelo espera
// ---------------------------------------------------------------------
export function expectedDeclaration(r: YearResult): RepDeclaration {
  return { tonnes: r.rep.placed, obligation: r.rep.obligation, costUF: r.rep.costUF };
}

function checkDeclaration(decl: RepDeclaration | null | undefined, placed: Record<PackType, Record<Material, number>>,
  obligation: Record<PackType, Record<Material, number>>, costUF: number, tol: number) {
  if (decl === undefined) return { status: "no_evaluada" as const, errors: [] as string[] };
  if (decl === null) return { status: "no_presentada" as const, errors: ["La declaración REP no se presentó antes del cierre."] };
  const errors: string[] = [];
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; }; // entradas de formulario: texto o vacío
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(tol * Math.abs(b), 0.5);
  for (const t of TYPES) for (const m of MATS) {
    const dt = num((decl.tonnes as any)?.[t]?.[m]), dob = num((decl.obligation as any)?.[t]?.[m]);
    if (!near(dt, placed[t][m])) errors.push(`Toneladas ${t === "dom" ? "domiciliarias" : "no domiciliarias"} de ${m}: declaró ${dt.toFixed(1)} t.`);
    if (!near(dob, obligation[t][m])) errors.push(`Obligación ${t === "dom" ? "domiciliaria" : "no domiciliaria"} de ${m}: declaró ${dob.toFixed(1)} t.`);
  }
  const dc = num(decl.costUF);
  if (!near(dc, costUF)) errors.push(`Costo REP: declaró ${dc.toFixed(0)} UF.`);
  return { status: errors.length ? "erronea" as const : "correcta" as const, errors };
}

// ---------------------------------------------------------------------
// Simulación completa
// ---------------------------------------------------------------------
export function simulateGame(
  config: GameConfig, decisions: Decision[], declarations: (RepDeclaration | null | undefined)[] = [],
  params: Params = DEFAULT_PARAMS,
): YearResult[] {
  const P = params;
  const results: YearResult[] = [];
  const base = baseline(config.focal, P);
  const baseProfitBeforeRepLf = P.profitBase + base.repCostUF * P.ufCLP / 1e6 + base.landfill * P.landfillCost;
  const chosen: number[] = [];
  const startYear: Record<number, number> = {};
  const spend: SpendState = { x: 0, y: 0 };
  let volume = 1, landfillCum = 0;
  const H = config.horizon;
  const gain = P.indexTargetGain[H];
  const lfTarget = P.landfillReductionTarget[H];
  const years = H + (config.projection ? 1 : 0);

  for (let y = 1; y <= years; y++) {
    const isProj = y > H;
    const d: Decision = isProj ? { practices: [], trainingSpend: 0, educationSpend: 0 } : (decisions[y - 1] ?? { practices: [], trainingSpend: 0, educationSpend: 0 });
    const warnings: string[] = [];
    if (!isProj) {
      const errs = validateDecision(y, chosen, d, P);
      if (errs.length) throw new Error(`Año ${y}: ${errs.join(" ")}`);
    }
    for (const id of d.practices) { chosen.push(id); startYear[id] = y; }
    const active = new Set(chosen);
    const boost = active.has(18) ? P.managerBoost : 1;

    // Gastos con arrastre y rendimientos decrecientes
    spend.x = d.trainingSpend / P.training.ref + P.training.carry * spend.x;
    spend.y = d.educationSpend / P.education.ref + P.education.carry * spend.y;
    if (d.trainingSpend > 1.5 * P.training.ref) warnings.push("Capacitación sobre 1,5 veces la referencia: el efecto adicional es casi nulo.");
    if (d.educationSpend > 1.5 * P.education.ref) warnings.push("Educación al consumidor sobre 1,5 veces la referencia: el efecto adicional es casi nulo.");
    const tEff = response(spend.x * boost, P.responseK);
    const eEff = response(spend.y * boost, P.responseK);

    // Rebote: volumen acumulado por prácticas activas
    if (config.rebound) {
      const dv = [...active].reduce((a, id) => a + (P.practices.find(p => p.id === id)!.rebound), 0) * P.reboundRho;
      volume = 1 + dv;
    }
    const ph = physicalYear(active, config.focal, volume, tEff, eEff, P);

    // REP
    const f = P.repTargetFactor[Math.min(y, 5)];
    const obligation = zeroTM();
    const compliance: Record<PackType, number> = { dom: 1, nodom: 1 };
    const deficit: Record<PackType, number> = { dom: 0, nodom: 0 };
    let penaltyUF = 0;
    for (const t of TYPES) {
      let obl = 0, val = 0;
      for (const m of MATS) {
        obligation[t][m] = ph.placed[t][m] * P.repTargetsY4[t][m] * f;
        obl += obligation[t][m]; val += ph.valorized[t][m];
      }
      compliance[t] = obl > 0 ? val / obl : 1;
      deficit[t] = Math.max(0, obl - val);
      penaltyUF += deficit[t] * P.penaltyUFperT[t];
    }
    const decl = isProj ? undefined : declarations[y - 1];
    const chk = checkDeclaration(decl, ph.placed, obligation, ph.repCostUF, P.declTolerance);
    const surchargeUF = chk.status === "erronea" ? ph.repCostUF * P.surchargeWrongDecl : chk.status === "no_presentada" ? ph.repCostUF * P.surchargeNoDecl : 0;

    // Finanzas (MCLP)
    let practiceCosts = 0;
    for (const id of active) {
      const p = P.practices.find(q => q.id === id)!;
      practiceCosts += p.opex + (startYear[id] === y ? p.capex : 0);
    }
    const repCost = ph.repCostUF * P.ufCLP / 1e6;
    const penalties = (penaltyUF + surchargeUF) * P.ufCLP / 1e6;
    const noAptoSaved = base.noAptoGenerated * volume - ph.noAptoGenerated;
    const packSaved = base.packMaterialCost * volume - ph.packMaterialCost;
    const savings = noAptoSaved * P.noAptoValue + packSaved;
    const lfCost = ph.landfill * P.landfillCost;
    const spendTot = d.trainingSpend + d.educationSpend;
    const profit = baseProfitBeforeRepLf * volume - repCost - lfCost - penalties - practiceCosts - spendTot + savings;

    // Presupuesto de disposición final (trayectoria lineal hacia la meta)
    landfillCum += ph.landfill;
    let allowedCum = 0;
    for (let k = 1; k <= Math.min(y, H); k++) allowedCum += base.landfill * (1 - lfTarget * k / H);
    if (y > H) allowedCum += base.landfill * (1 - lfTarget);

    const indexTarget = base.index + gain * Math.min(y, H) / H;
    if (compliance.dom < 1) warnings.push("Déficit de valorización domiciliaria: multa REP.");
    if (compliance.nodom < 1) warnings.push("Déficit de valorización no domiciliaria: multa REP.");

    results.push({
      year: y, isProjection: isProj, volume, index: ph.index, indexTarget,
      flows: { avoided: ph.avoided, reused: ph.reused, recycled: ph.recycled, recovered: ph.recovered, landfill: ph.landfill, reference: ph.reference },
      landfill: ph.landfill, landfillAllowedCum: allowedCum, landfillCum, landfillOk: landfillCum <= allowedCum + 1e-6,
      rep: { placed: ph.placed, obligation, valorized: ph.valorized, compliance, deficit, costUF: ph.repCostUF, penaltyUF, surchargeUF,
        declarationStatus: chk.status, declarationErrors: chk.errors },
      finance: { revenue: P.revenueBase * volume, profit, repCost, penalties, practiceCosts, spend: spendTot, savings, landfillCost: lfCost },
      packaging: ph.packaging, emissions: ph.emissions, separation: ph.separation, coverage: ph.coverage, trainingEffect: tEff, educationEffect: eEff,
      warnings, activePractices: [...active],
    });
  }
  return results;
}

// Ficha del año en curso (para la pantalla de Declaración REP): simula con las decisiones guardadas
// hasta ese año y devuelve los envases y las metas REP del año, sin evaluar declaraciones.
// `decisions` va indexado por año (posición 0 = año 1); los años faltantes cuentan como vacíos.
export function currentYearSheet(config: GameConfig, decisions: (Decision | null | undefined)[], year: number, params: Params = DEFAULT_PARAMS) {
  year = Math.max(1, Math.min(Math.round(year), config.horizon));
  const padded = Array.from({ length: year }, (_, i) => decisions[i] ?? { practices: [], trainingSpend: 0, educationSpend: 0 });
  const r = simulateGame({ ...config, projection: false }, sanitizeDecisions(padded as Decision[], params), [], params);
  const y = r[year - 1];
  const f = params.repTargetFactor[Math.min(year, 5)];
  const targets = {
    dom: Object.fromEntries(MATS.map(m => [m, params.repTargetsY4.dom[m] * f])) as Record<Material, number>,
    nodom: Object.fromEntries(MATS.map(m => [m, params.repTargetsY4.nodom[m] * f])) as Record<Material, number>,
  };
  return { packaging: y.packaging, targets, ufCLP: params.ufCLP };
}

// Porcentaje de logro de la meta del índice al final del horizonte
export function indexAchievement(results: YearResult[], horizon: number, focal: Family, params: Params = DEFAULT_PARAMS): number {
  const b = baseline(focal, params).index;
  const last = results.find(r => r.year === horizon)!;
  return (last.index - b) / params.indexTargetGain[horizon as 1 | 2 | 3 | 4];
}

// Combina los parámetros por defecto con las sobrescrituras del profesor (runs.params).
// Objetos: se combinan por clave; arreglos y valores simples: se reemplazan.
export function mergeParams(overrides: Record<string, unknown> | null | undefined, base: Params = DEFAULT_PARAMS): Params {
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const merge = (a: any, b: any): any => {
    if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
    return out;
  };
  return merge(structuredClone(base), overrides ?? {});
}

// Limpia decisiones guardadas antes de simular (prácticas no disponibles o más de 3 se descartan).
export function sanitizeDecisions(decisions: Decision[], params: Params = DEFAULT_PARAMS): Decision[] {
  const chosen: number[] = [];
  return decisions.map((d, i) => {
    const avail = new Set(availablePractices(i + 1, chosen, params).map(p => p.id));
    const practices = [...new Set(d?.practices ?? [])].filter(id => avail.has(id)).slice(0, 3);
    chosen.push(...practices);
    return { practices, trainingSpend: Math.max(0, Number(d?.trainingSpend) || 0), educationSpend: Math.max(0, Number(d?.educationSpend) || 0) };
  });
}
