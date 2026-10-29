// =====================================================================
// Contenido fijo del simulador (textos, catálogos y claves de corrección)
// Va en src/lib/simulator-content.ts. No inventar textos fuera de este archivo.
// =====================================================================

export const COMPANY = {
  name: "Cecinas Cordillera S.A.",
  disclaimer:
    "Empresa ficticia creada para un ejercicio académico. Todas sus cifras son simuladas; las tarifas REP provienen del tarifario público 2026 de un sistema colectivo de gestión.",
  intro:
    "Cecinas Cordillera es una productora nacional de cecinas, grande y no PYME. Tiene una planta principal, vende a supermercados y al canal tradicional, y desde 2023 cumple la Ley REP a través de un sistema colectivo de gestión. Su consumo de energía es de unas 70 Tcal al año.",
  challenge:
    "A lo largo de la evaluación diriges la estrategia de economía circular de la empresa. Cada etapa corresponde a un año: eliges hasta tres prácticas y justificas cada una, fijas los gastos de capacitación y educación al consumidor y presentas la declaración REP. Tu meta es subir el índice de circularidad, no superar el presupuesto de disposición final, cumplir la REP y cuidar la utilidad. El impacto de cada práctica no se informa: hay que deducirlo de los datos.",
};

export const FAMILIES = {
  V: { label: "Vienesas", represents: "Tradicional, pollo, sureña, pavo", pack: "Envase flexible multicapa y caja de cartón corrugado", salesT: 9000 },
  J: { label: "Jamones y fiambres laminados", represents: "Jamones, mortadelas, salames, quesos laminados", pack: "Bandeja plástica con film y caja de cartón", salesT: 7000 },
  P: { label: "Parrilleros y hamburguesas", represents: "Chorizos, longanizas, hamburguesas", pack: "Bolsa o film plástico y caja de cartón", salesT: 8000 },
  H: { label: "Hortalizas congeladas", represents: "Papas fritas, choclo, mix primavera", pack: "Bolsa de polietileno y caja de cartón", salesT: 6000 },
} as const;

// Ronda 0: brechas. isReal = brecha real del modelo; feedback se muestra después del cierre de la ronda 0.
export const GAPS = [
  { id: "G1", text: "Envase flexible multimaterial.", isReal: true,
    feedback: "Brecha real: el film multicapa casi no se recicla aunque el hogar lo separe; limita la valorización domiciliaria y el cumplimiento REP." },
  { id: "G2", text: "Merma y producto no apto con poco aprovechamiento.", isReal: true,
    feedback: "Brecha real: es el mayor flujo de residuos de planta y el que más pesa en el índice y en los costos." },
  { id: "G3", text: "Exceso de embalaje secundario.", isReal: true,
    feedback: "Brecha real: las cajas de cartón son el mayor volumen de envase; evitarlas está más arriba en la jerarquía que reciclarlas." },
  { id: "G4", text: "Baja separación y valorización por falta de educación al consumidor.", isReal: true,
    feedback: "Brecha real: con 15% de hogares que separan y envases casi no reciclables, la valorización domiciliaria no alcanza las metas REP." },
  { id: "G5", text: "Falta de energía renovable.", isReal: false,
    feedback: "Distractor: es un tema de emisiones, no de circularidad de materiales en este modelo." },
  { id: "G6", text: "No tener un sello de sostenibilidad.", isReal: false,
    feedback: "Distractor: un sello no cambia ningún flujo físico." },
] as const;

// Ronda 1: mapa normativo. key = clave provisional del profesor.
export const NORMS = [
  { id: "N1", name: "Ley 20.920 REP (decreto de envases y embalajes)", key: "si",
    explanation: "Aplica directamente: la empresa pone en el mercado productos envasados, tiene metas por material y cumple a través de un sistema colectivo." },
  { id: "N2", name: "Ley 21.305 de eficiencia energética", key: "si",
    explanation: "Aplica según el consumo simulado: los grandes consumidores (sobre 50 Tcal al año) deben tener un sistema de gestión de energía y reportar; la empresa consume cerca de 70 Tcal." },
  { id: "N3", name: "Ley 21.368 de plásticos de un solo uso", key: "indirecta",
    explanation: "Indirecta: regula la entrega de plásticos de un solo uso en locales de comida y las botellas; afecta a clientes de foodservice más que al envase de un producto de retail." },
  { id: "N4", name: "Ley 21.455 Marco de Cambio Climático", key: "indirecta",
    explanation: "Indirecta: fija neutralidad al 2050 y planes sectoriales, sin una obligación directa de reducción para esta empresa en el modelo." },
  { id: "N5", name: "Ley 21.100 de bolsas plásticas", key: "no",
    explanation: "No aplica: regula al comercio que entrega bolsas, y la empresa vende a ese comercio." },
  { id: "N6", name: "Exención de la Ley REP para menos de 300 kg al año", key: "no",
    explanation: "No aplica: la empresa supera con holgura ese volumen." },
] as const;
export const NORM_OPTIONS = [
  { value: "si", label: "Sí, aplica directamente" },
  { value: "indirecta", label: "Aplica de forma indirecta" },
  { value: "no", label: "No aplica" },
] as const;

export const STAKEHOLDERS = [
  "Consumidores", "Clientes del retail", "Proveedores de envases", "Proveedores de insumos", "Proveedores de materias primas",
  "Gestores de residuos", "Recicladores de base", "Sistema colectivo", "Personal de planta", "Operadores logísticos",
  "Municipios", "Comunidad vecina", "Autoridad sanitaria", "Productores de alimento animal", "Inversionistas",
] as const;

export const BENEFIT_TYPES = ["Económico", "Ambiental", "Regulatorio", "Reputacional"] as const;

export const GLOSSARY = [
  { term: "Economía circular", def: "Modelo que busca mantener productos y materiales en uso el mayor tiempo posible y evitar residuos desde el diseño." },
  { term: "Jerarquía de las 10R", def: "Orden de preferencia: rechazar, repensar, reducir (uso inteligente); reusar, reparar, restaurar, remanufacturar, reutilizar (extensión de vida útil); reciclar, recuperar (aplicación útil de materiales)." },
  { term: "Índice de circularidad", def: "Indicador de 0 a 100 del simulador. Pondera las toneladas según cómo se manejan: pesa más lo evitado, luego lo reusado, luego lo reciclado y lo recuperado; la disposición final no suma." },
  { term: "Efectivismo", def: "Medida que se ve sostenible pero no mejora, o empeora, el resultado ambiental real." },
  { term: "Merma", def: "Producto o materia prima que se pierde en el proceso o en la cadena antes de venderse o consumirse." },
  { term: "Producto no apto", def: "Producto rechazado por calidad, dañado o vencido, en planta o devuelto por el cliente." },
  { term: "Disposición final", def: "Envío de residuos a relleno sanitario. Es la última opción y no suma al índice." },
  { term: "Ley REP", def: "Ley 20.920 de Responsabilidad Extendida del Productor: quien pone envases en el mercado debe financiar y asegurar su valorización según metas." },
  { term: "Sistema colectivo de gestión", def: "Entidad que agrupa a productores para cumplir en conjunto las metas REP y cobra una tarifa por tonelada declarada." },
  { term: "Sistema individual de gestión", def: "El productor cumple sus metas por su cuenta, con su propia logística de recolección." },
  { term: "Domiciliario y no domiciliario", def: "Envase domiciliario es el que llega a los hogares; no domiciliario es el que queda en empresas o comercios, como cajas y film de pallet." },
  { term: "Valorización", def: "Reutilización, reciclaje o recuperación de un residuo que se puede acreditar ante la REP." },
  { term: "Envase con grasa", def: "Envase que contiene sustancias grasas. En el tarifario del sistema colectivo paga una tarifa mayor porque es más difícil de reciclar." },
  { term: "Efecto rebote", def: "La eficiencia baja costos, la empresa vende más y el consumo total de materiales puede subir (paradoja de Jevons)." },
  { term: "UF", def: "Unidad de Fomento: unidad de cuenta reajustable en Chile. Las tarifas REP se expresan en UF por tonelada." },
] as const;

// Etiquetas de los gastos
export const SPENDS = {
  training: { label: "Capacitación del personal", hint: "Referencia: CLP 45 millones al año (≈CLP 150 mil por trabajador de planta). Sobre 1,5 veces la referencia el efecto adicional es casi nulo." },
  education: { label: "Educación al consumidor", hint: "Referencia: CLP 60 millones al año. Sobre 1,5 veces la referencia el efecto adicional es casi nulo." },
} as const;

// Opciones que el equipo usa en la ficha y respuestas aceptadas por práctica (clave para comparar en el panel)
export const TEAM_LEVEL_OPTIONS = [
  "Rechazar", "Repensar", "Reducir", "Reusar", "Reparar", "Restaurar", "Remanufacturar", "Reutilizar", "Reciclar", "Recuperar",
  "No es una práctica circular",
] as const;
export const ACCEPTED_LEVELS: Record<number, string[]> = {
  1: ["Rechazar"], 2: ["Reducir"], 3: ["No es una práctica circular"], 4: ["Reciclar"], 5: ["Reducir"],
  6: ["Reciclar", "No es una práctica circular"], 7: ["Reciclar"], 8: ["Reducir"], 9: ["Reducir", "Reciclar"],
  10: ["Reducir"], 11: ["Reparar", "Reusar"], 12: ["Reutilizar"], 13: ["Reciclar"], 14: ["Recuperar"],
  15: ["Repensar"], 16: ["Reusar"], 17: ["Reciclar"], 18: ["No es una práctica circular"], 19: ["No es una práctica circular"],
  20: ["Reciclar"], 21: ["Reciclar"], 22: ["No es una práctica circular"], 23: ["No es una práctica circular"], 24: ["No es una práctica circular"],
};

export const LEVEL_COLORS: Record<string, string> = {
  Rechazar: "#1f7a4d", Repensar: "#1f7a4d", Reducir: "#1f7a4d", "Reducir y reciclar": "#1f7a4d",
  Reusar: "#3c9d6b", "Reparar y reusar": "#3c9d6b", Reutilizar: "#3c9d6b", Reparar: "#3c9d6b", Restaurar: "#3c9d6b", Remanufacturar: "#3c9d6b",
  Reciclar: "#c99a1e", "Reciclar (alto grado)": "#c99a1e", "Reciclar (aparente)": "#c99a1e", Recuperar: "#d4732a",
  Habilitador: "#5a6b7d", Cumplimiento: "#5a6b7d", Información: "#5a6b7d", Medición: "#5a6b7d", Ninguno: "#8a8a8a",
  "No es una práctica circular": "#8a8a8a",
};
