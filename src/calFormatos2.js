// calFormatos2.js — Gestión de Calidad, ETAPA 2: Plan de Inspección y Ensayos (CA-001), Excavación y Rellenos (CA-007), Acero de Refuerzo (CA-008),
// Formaleta y Encofrado (CA-009), Vaciado de Concreto (CA-010), Resultados de Concreto y Suelos (CA-011) y Protocolo por Actividad (CA-012).
// Mismas reglas de siempre: solo AVISA (nunca impide guardar), y las no conformidades se crean solas cuando algo no cumple.
import { texto, numero, filasConDatos, hoyISO, listarRegistros, listarPlanos } from "./calBase";

const arr = (a) => (Array.isArray(a) ? a : []);
const SI_NO_NA = ["Sí", "No", "N/A"];
const COLORES_SNN = { "Sí": "#2E7D4F", No: "#B3401F", "N/A": "#6B7280" };
const norm = (t) => texto(t).toLowerCase().replace(/\s+/g, " ");
const fmtN = (n, d = 1) => (n === null || n === undefined || isNaN(n) ? "" : String(Math.round(n * 10 ** d) / 10 ** d).replace(".", ","));
const FIRMAS3 = (desdeEtiqueta, a, b, c, k = ["inspecciona", "ejecuta", "vobo"]) => ({ desdeEtiqueta, personas: [{ k: k[0], titulo: a }, { k: k[1], titulo: b }, { k: k[2], titulo: c }] });
const TRES_CALIDAD = (desde, tercero) => FIRMAS3(desde, "Inspecciona — calidad", "Ejecuta — residente / maestro", tercero);
const listaVer = (id, titulo, k, items, fin, despuesDe, extra = {}) => ({ id, titulo, tipo: "lista", k, fin, ...(despuesDe ? { despuesDe } : {}), items: items.map((t) => ({ t })), req: true, resp: { enc: "¿Cumple?", opciones: SI_NO_NA, colores: COLORES_SNN }, obs: { enc: "Observación" }, ...extra });
const REF = { planos: { clave: "ryr_cal_planos" }, acero: { clave: "ryr_cal_acero" }, formaleta: { clave: "ryr_cal_formaleta" }, vaciado: { clave: "ryr_cal_vaciado" }, resultados: { clave: "ryr_cal_resultados" } };

// ---------- fechas ----------
const aFecha = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(iso)); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const diasEntre = (a, b) => { const x = aFecha(a), y = aFecha(b); return x && y ? Math.round((y - x) / 86400000) : null; };
export const sumarDias = (iso, n) => { const x = aFecha(iso); if (!x) return ""; x.setDate(x.getDate() + n); return isoDe(x); };
const minutosDe = (h) => { const m = /^(\d{1,2}):(\d{2})/.exec(texto(h)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const diasFechaHora = (a, b) => { const x = new Date(texto(a)), y = new Date(texto(b)); return texto(a) && texto(b) && !isNaN(x) && !isNaN(y) ? (y - x) / 86400000 : null; };

// ---------- avisos que cruzan formatos (solo avisan) ----------
const mismoElemento = (d, r) => { const e = r.datos || {}; if (norm(d.elemento) !== norm(e.elemento)) return false; return !texto(d.localizacion) || !texto(e.localizacion) || norm(d.localizacion) === norm(e.localizacion); };
function avisoPlano(d, reg) {
  if (!reg || !texto(d.plano)) return [];
  const p = listarPlanos(REF.planos, reg.obraId).find((x) => norm(x.codigo) === norm(d.plano));
  if (!p) return [];
  if (p.estado === "Obsoleto") return [{ tipo: "alerta", texto: `El plano ${p.codigo} figura como OBSOLETO en el Control de Planos${p.version ? " (versión " + p.version + ")" : ""}. Verifica con calidad qué plano rige antes de seguir.` }];
  const a = [];
  if (p.estado === "En revisión") a.push({ tipo: "aviso", texto: `El plano ${p.codigo} está «En revisión» en el Control de Planos: confirma que sea el que se usa para construir.` });
  if (texto(d.version) && texto(p.version) && norm(d.version) !== norm(p.version)) a.push({ tipo: "aviso", texto: `Pusiste la versión ${texto(d.version)} del plano ${p.codigo}, pero en el Control de Planos la versión registrada es la ${p.version}.` });
  return a;
}
function avisoPrevio(d, reg, que, ref, nombre) {
  if (!reg || !texto(d.elemento)) return null;
  const previos = listarRegistros(ref, reg.obraId).filter((r) => mismoElemento(d, r));
  if (!previos.length) return { tipo: "alerta", texto: `No encontré una inspección de ${nombre} para «${texto(d.elemento)}». El punto de retención pide ${nombre} aprobado antes de vaciar.` };
  if (!previos.some((r) => /^Aprobado/.test(texto((r.datos || {}).resultado)))) return { tipo: "alerta", texto: `La inspección de ${nombre} de «${texto(d.elemento)}» no está aprobada (resultado: ${texto(previos[0].datos.resultado) || "sin resultado"}). Revisa antes de vaciar.` };
  return null;
}
const EXC_A = [
    "Localización, ejes y niveles de excavación verificados con topografía",
    "Dimensiones (ancho, largo y profundidad) según planos",
    "Fondo limpio, firme y libre de agua, lodo o material suelto",
    "Suelo de fondo corresponde al del estudio de suelos (verificado por el geotecnista cuando se exige)",
    "Taludes o entibado estables; protección del borde de la excavación",
    "Redes y servicios existentes identificados y protegidos",
  ];
const EXC_B = [
    "Material de relleno aprobado (clase, procedencia y granulometría)",
    "Material libre de materia orgánica, escombros y basura",
    "Humedad cercana a la óptima del Proctor",
    "Espesor de capa suelta dentro de lo especificado",
    "Equipo de compactación adecuado y número de pasadas suficiente",
    "Superficie de cada capa nivelada y con la pendiente de diseño",
  ];
const ACE_A = [
    "Barras corresponden a la calidad y los diámetros de los planos",
    "Certificado del fabricante y lote o colada identificados",
    "Sin óxido suelto, grasa, pintura, barro ni mortero adherido",
    "Sin barras dobladas, torcidas ni con secciones reducidas",
  ];
const ACE_B = [
    "Cantidad, diámetro y separación de barras según el despiece",
    "Estribos: diámetro, separación y zonas de confinamiento según planos",
    "Ganchos y dobleces con el diámetro mínimo de doblado",
    "Longitudes de traslapo y de desarrollo según planos y NSR-10",
    "Traslapos alternados y fuera de las zonas críticas",
    "Refuerzo adicional en aberturas, esquinas y nudos",
  ];
const ACE_C = [
    "Recubrimiento asegurado con separadores o panelas",
    "Amarres firmes; armazón rígido, alineado y a plomo",
    "Dovelas, arranques y refuerzo de empalme en su sitio",
    "Ductos, pasamuros e instalaciones embebidas colocados antes del vaciado",
    "Armazón limpio y sin elementos que lo contaminen antes del vaciado",
  ];
const FOR_A = [
    "Ejes, dimensiones y escuadras verificados con los planos",
    "Niveles y cotas de fondo, losa o cara superior verificados",
    "Plomos de caras verticales dentro de la tolerancia",
    "Contraflechas y pendientes de diseño cuando los planos las piden",
  ];
const FOR_B = [
    "Puntales, cerchas y arriostramientos completos, a plomo y bien apoyados",
    "Apoyos sobre superficie firme (con tablón o base repartidora)",
    "Tensores, grapas y amarres suficientes para resistir la presión del concreto",
    "Formaleta rígida, sin deformaciones ni piezas rotas",
  ];
const FOR_C = [
    "Juntas selladas: sin fugas de lechada",
    "Desencofrante aplicado y sin excesos",
    "Interior limpio: sin aserrín, amarres sueltos, agua ni escombros",
    "Ductos, pasamuros, anclajes y chazos embebidos en su sitio y fijos",
    "Ventanas de limpieza y aberturas de vaciado previstas",
  ];
const VAC_A = [
    "Acero (RYR-CA-008) y formaleta (RYR-CA-009) aprobados para vaciar",
    "Plan de vaciado definido: volumen, orden, juntas y personal",
    "Equipos listos: bomba, vibradores, planta eléctrica y herramientas",
    "Elementos de ensayo disponibles: cono, moldes de cilindros y termómetro",
    "Protección prevista contra lluvia o calor excesivo",
  ];
const VAC_B = [
    "Remisión coincide con el concreto pedido (resistencia, asentamiento, aditivos)",
    "No se agregó agua adicional al concreto en la obra",
    "Altura de caída controlada para evitar segregación",
    "Vibrado completo, sin zonas sin compactar ni exceso de vibración",
    "Vaciado continuo, sin juntas frías; juntas de construcción previstas y tratadas",
    "Acabado y nivelación de la superficie según especificación",
  ];
const VAC_C = [
    "Curado iniciado en el tiempo previsto (agua, membrana o cubierta)",
    "Elemento protegido de impactos, cargas y tránsito",
    "Cilindros protegidos en obra y llevados al laboratorio a tiempo",
  ];
const PRO_G = [
    "Planos y especificaciones vigentes en el frente de trabajo",
    "Materiales aprobados (recepción RYR-CA-004) y de la referencia especificada",
    "Frente limpio, ordenado y con condiciones de seguridad",
    "Actividad previa recibida y aprobada antes de empezar",
  ];
const PRO_0 = [
    "Alineación, plomo y nivel de las hiladas dentro de la tolerancia",
    "Juntas llenas y de espesor uniforme",
    "Trabas y amarres con columnas y demás elementos estructurales",
    "Refuerzo, dovelas y dinteles según planos",
    "Vanos (puertas y ventanas) con las dimensiones de los planos",
    "Unidades sin fisuras ni defectos y de la referencia aprobada",
  ];
const PRO_1 = [
    "Superficie limpia y humedecida antes de aplicar",
    "Plomo y planitud verificados con regla",
    "Adherencia correcta (prueba de golpe, sin sonido hueco)",
    "Sin fisuras; filos, esquinas y dilataciones bien terminados",
    "Espesor uniforme según especificación",
  ];
const PRO_2 = [
    "Base nivelada, limpia y curada",
    "Niveles y pendientes hacia los desagües",
    "Alineación y juntas uniformes",
    "Piezas sin fisuras y sin sonido hueco",
    "Cortes y remates bien ejecutados; tono y referencia uniformes",
  ];
const PRO_3 = [
    "Superficie limpia, seca y con pendiente hacia el desagüe",
    "Aplicación completa, con traslapos y sobrelevantes según la ficha técnica",
    "Puntos críticos sellados (sifones, bajantes, juntas, esquinas)",
    "Prueba de empozamiento realizada y sin filtraciones",
    "Protección posterior colocada",
  ];
const PRO_4 = [
    "Pendientes de desagües y diámetros según planos",
    "Uniones soldadas o selladas correctamente",
    "Soportes y juntas de dilatación colocados",
    "Prueba de presión o de estanqueidad satisfactoria",
    "Aparatos y accesorios instalados y funcionando, sin fugas",
  ];
const PRO_5 = [
    "Calibres y circuitos según los planos",
    "Canalizaciones y cajas fijas, sin obstrucciones",
    "Continuidad y aislamiento medidos y dentro de lo exigido",
    "Tablero rotulado, con protecciones y puesta a tierra verificada",
    "Cumple el RETIE y los requisitos del operador de red",
  ];
const PRO_6 = [
    "Superficie preparada (masillada y lijada) antes de pintar",
    "Número de manos y color según lo aprobado",
    "Acabado uniforme, sin chorreaduras ni manchas",
    "Puertas y ventanas ajustadas, con herrajes funcionando",
    "Cubierta sin filtraciones (prueba con agua) y con remates completos",
  ];
const PLAN_FILAS = [
 [
  "Excavaciones y rellenos",
  "Nivel de fondo, ancho y compactación por capas",
  "Según diseño y estudio de suelos del proyecto",
  "NSR-10 Título H; INV E-142 (Proctor modificado)",
  "Topografía y densidad en sitio (cono de arena u otro)",
  "Por cada capa compactada",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-007"
 ],
 [
  "Acero de refuerzo - recepción",
  "Diámetro, peso, marcación y certificado del fabricante",
  "Barra corrugada de la calidad exigida en planos",
  "NTC 2289 / NTC 248; NSR-10 C.3.5",
  "Revisión del certificado, medición y pesaje",
  "Cada lote recibido",
  "Registro",
  "Almacenista / calidad",
  "RYR-CA-004"
 ],
 [
  "Acero de refuerzo - armado",
  "Despiece, diámetros, traslapos, ganchos, separación y recubrimientos",
  "Planos estructurales y especificaciones",
  "NSR-10 Título C (C.7)",
  "Inspección visual y medición con flexómetro",
  "Antes de cada vaciado",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-008"
 ],
 [
  "Formaleta y encofrado",
  "Dimensiones, niveles, plomos, estabilidad, limpieza y desencofrante",
  "Planos y tolerancias del proyecto",
  "NSR-10 C.6",
  "Medición con nivel, plomada y flexómetro",
  "Antes de cada vaciado",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-009"
 ],
 [
  "Concreto fresco (vaciado)",
  "Asentamiento, temperatura, tiempo de transporte y toma de cilindros",
  "Diseño de mezcla aprobado y remisión del proveedor",
  "NTC 396; NTC 550; NSR-10 C.5",
  "Ensayos en obra con laboratorio o inspector",
  "Cada vaciado (y según muestreo de la norma)",
  "Testigo",
  "Ingeniero de calidad",
  "RYR-CA-010"
 ],
 [
  "Concreto endurecido",
  "Resistencia a la compresión (7, 14 y 28 días)",
  "Resistencia f'c de diseño",
  "NTC 673; NSR-10 C.5.6",
  "Ensayo de cilindros en laboratorio",
  "Según muestreo",
  "Registro",
  "Laboratorio / calidad",
  "RYR-CA-011"
 ],
 [
  "Mampostería",
  "Alineación, plomo, nivel, juntas, refuerzo y trabas",
  "Planos arquitectónicos y estructurales",
  "NSR-10 Título D; NTC 4205",
  "Inspección visual y medición",
  "Por muro o paño terminado",
  "Registro",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Pañetes y estucos",
  "Plomo, planitud, adherencia y fisuras",
  "Especificaciones del proyecto",
  "Especificaciones técnicas",
  "Regla, plomada y prueba de golpe (sonido hueco)",
  "Por zona terminada",
  "Registro",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Pisos y enchapes",
  "Nivel, pendientes, alineación, juntas y adherencia",
  "Planos y especificaciones",
  "Especificaciones técnicas",
  "Nivel, regla y prueba de golpe (sonido hueco)",
  "Por zona terminada",
  "Registro",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Impermeabilización",
  "Aplicación completa, traslapos y prueba de estanqueidad",
  "Ficha técnica del fabricante",
  "Especificaciones del proyecto",
  "Prueba de empozamiento",
  "Por cada área impermeabilizada",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Instalaciones hidrosanitarias",
  "Pendientes, uniones, fugas y funcionamiento",
  "Planos hidrosanitarios",
  "Código colombiano de fontanería (NTC 1500)",
  "Prueba de presión / estanqueidad",
  "Por red, antes de cubrir",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Instalaciones eléctricas",
  "Continuidad, aislamiento, polarización y protecciones",
  "Planos eléctricos",
  "RETIE",
  "Medición con equipo y revisión de tableros",
  "Por circuito, antes de cubrir",
  "Retención",
  "Ingeniero de calidad",
  "RYR-CA-012"
 ],
 [
  "Carpintería y acabados finales",
  "Ajuste, funcionamiento, pintura y limpieza",
  "Especificaciones y muestras aprobadas",
  "Especificaciones técnicas",
  "Inspección visual y funcional",
  "Por espacio terminado",
  "Registro",
  "Ingeniero de calidad",
  "RYR-CA-014"
 ]
];

// ================================================================= CA-001 Plan de inspección y ensayos
const REGISTROS_ASOCIADOS = ["RYR-CA-004", "RYR-CA-006", "RYR-CA-007", "RYR-CA-008", "RYR-CA-009", "RYR-CA-010", "RYR-CA-011", "RYR-CA-012", "RYR-CA-014"];
export const PLAN = {
  id: "cal-plan", col: "cal_plan", clave: "ryr_cal_plan", codigo: "RYR-CA-001", hoja: "Plan Inspección y Ensayos", plantilla: "/plantilla-cal-plan.xlsx", archivo: "Plan_Inspeccion_Ensayos",
  titulo: "Plan de Inspección y Ensayos", subtitulo: "RYR-CA-001 · Qué se controla, con qué criterio, cómo, cuándo y quién", panelObra: ["contrato", "ubicacion", "contratista"], copiarTablas: true,
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "F", obra: "contrato" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "responsable", etq: "Responsable de calidad", colEtq: "F", tipo: "persona", cargo: "Ingeniero de calidad", req: true },
      { k: "interventoria", etq: "Interventoría", colEtq: "J", tipo: "texto" },
      { k: "fecha", etq: "Fecha de elaboración", colEtq: "A", tipo: "fecha", req: true },
      { k: "version", etq: "Versión del plan", colEtq: "D", tipo: "texto" },
      { k: "fechaAprob", etq: "Fecha de aprobación", colEtq: "F", tipo: "fecha" },
      { k: "aprobadoPor", etq: "Aprobado por", colEtq: "H", tipo: "texto" },
    ] },
    { id: "actividades", titulo: "2. Actividades y puntos de control", tipo: "tabla", k: "actividades", fin: "3. CÓMO LEER EL PLAN", max: 22, req: true, nombreFila: "Actividad", plegable: true, limpiar: true, tituloFila: "actividad",
      inicial: PLAN_FILAS.map((f) => ({ actividad: f[0], caracteristica: f[1], criterio: f[2], norma: f[3], metodo: f[4], frecuencia: f[5], tipo: f[6], responsable: f[7], registro: f[8] })),
      cols: [
        { k: "actividad", enc: "Actividad o proceso", tipo: "texto", req: true },
        { k: "caracteristica", enc: "Característica a controlar", tipo: "area" },
        { k: "criterio", enc: "Criterio de aceptación", tipo: "area" },
        { k: "norma", enc: "Norma o especificación", tipo: "texto" },
        { k: "metodo", enc: "Método de inspección o ensayo", tipo: "area" },
        { k: "frecuencia", enc: "Frecuencia", tipo: "texto" },
        { k: "tipo", enc: "Tipo de punto", tipo: "chips", opciones: ["Retención", "Testigo", "Registro"] },
        { k: "responsable", enc: "Responsable", tipo: "texto" },
        { k: "registro", enc: "Registro asociado", tipo: "lista", opciones: REGISTROS_ASOCIADOS },
        { k: "participa", enc: "Participa interventoría", tipo: "chips", opciones: ["Sí", "No"] },
        { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Vigente", "En revisión"], semaforo: true },
        { k: "obs", enc: "Observaciones", tipo: "area" },
      ] },
  ],
  firmas: FIRMAS3("4. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Aprobó — interventoría / supervisión", ["elaboro", "reviso", "aprobo"]),
  etiquetaExtra: (d) => (texto(d.version) ? `Versión ${texto(d.version)}` : ""),
  resumen: (d) => { const f = filasConDatos(PLAN.secciones[1], d); return [{ t: "Actividades", v: f.length }, { t: "Puntos de retención", v: f.filter((x) => x.tipo === "Retención").length, color: "#B3401F" }, { t: "Puntos testigo", v: f.filter((x) => x.tipo === "Testigo").length, color: "#B8860B" }, { t: "Solo registro", v: f.filter((x) => x.tipo === "Registro").length }]; },
  avisos: (d) => {
    const a = []; const f = filasConDatos(PLAN.secciones[1], d);
    if (f.some((x) => !texto(x.tipo))) a.push({ tipo: "aviso", texto: "Hay actividades sin «tipo de punto» (retención, testigo o registro)." });
    if (f.some((x) => x.tipo === "Retención" && !texto(x.responsable))) a.push({ tipo: "aviso", texto: "Hay puntos de retención sin responsable." });
    return a;
  },
};

// ================================================================= CA-007 Excavación y rellenos
const ACT_EXC = ["Excavación", "Relleno y compactación", "Excavación y relleno"];
const conExc = (d) => d.actividad !== "Relleno y compactación";
const conRell = (d) => d.actividad !== "Excavación";
const pctComp = (f) => { const m = numero(f.dmax), s = numero(f.dsit); return m && s !== null ? (s / m) * 100 : null; };
const resComp = (f) => { const p = pctComp(f), e = numero(f.exigido); return p === null || e === null ? "" : p >= e - 1e-9 ? "Cumple" : "No cumple"; };
export const EXCAVACION = {
  id: "cal-excavacion", col: "cal_excavacion", clave: "ryr_cal_excavacion", codigo: "RYR-CA-007", hoja: "Excavación y Rellenos", plantilla: "/plantilla-cal-excavacion.xlsx", archivo: "Excavacion_Rellenos",
  titulo: "Excavación y Rellenos", subtitulo: "RYR-CA-007 · Verificación antes de cubrir o continuar con la siguiente capa", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "actividad", etq: "Actividad", colEtq: "A", tipo: "lista", opciones: ACT_EXC, req: true },
      { k: "frente", etq: "Frente, eje o abscisa", colEtq: "H", tipo: "texto", req: true },
      { k: "material", etq: "Material y procedencia", colEtq: "A", tipo: "texto" },
      { k: "equipo", etq: "Equipo de compactación", colEtq: "H", tipo: "texto" },
      { k: "estudio", etq: "Estudio de suelos (referencia)", colEtq: "A", tipo: "texto" },
      { k: "plano", etq: "Plano de referencia", colEtq: "H", tipo: "texto" },
    ] },
    listaVer("exc", "2. Excavación", "exc", EXC_A, "3. RELLENO Y COMPACTACIÓN", null, { visibleSi: conExc }),
    listaVer("rell", "3. Relleno y compactación", "rell", EXC_B, "4. CONTROL DE DENSIDAD (ensayos de compactación)", "exc", { visibleSi: conRell }),
    { id: "densidad", titulo: "4. Control de densidad (ensayos de compactación)", tipo: "tabla", k: "densidad", despuesDe: "rell", fin: "El porcentaje exigido", finEmpieza: true, max: 8, nombreFila: "Ensayo", visibleSi: conRell, cols: [
      { k: "capa", enc: "Capa N°", tipo: "texto" },
      { k: "loc", enc: "Localización (eje o abscisa)", tipo: "texto" },
      { k: "cota", enc: "Cota", tipo: "texto" },
      { k: "dmax", enc: "Densidad seca máxima (kg/m³)", tipo: "numero" },
      { k: "dsit", enc: "Densidad seca en sitio (kg/m³)", tipo: "numero" },
      { k: "pct", enc: "% de compactación", tipo: "calculado", calc: (f) => { const p = pctComp(f); return p === null ? "" : fmtN(p) + " %"; } },
      { k: "exigido", enc: "% exigido", tipo: "porcentaje", ayuda: "Escribe 95 para 95 %" },
      { k: "res", enc: "Resultado", tipo: "calculado", calc: resComp, semaforo: true },
      { k: "obs", enc: "Observación", tipo: "area" },
    ] },
    { id: "resultado", titulo: "5. Resultado de la inspección", tipo: "campos", campos: [
      { k: "autoriza", etq: "¿Se autoriza continuar?", colEtq: "A", tipo: "chips", opciones: ["Sí", "Sí, con observaciones", "No"], req: true, semaforo: true },
      { k: "fechaAut", etq: "Fecha de autorización", colEtq: "H", tipo: "fecha" },
      { k: "observaciones", etq: "Observaciones y correcciones pedidas", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: TRES_CALIDAD("6. FIRMAS", "Vo.Bo. — interventoría / geotecnista"),
  etiquetaExtra: (d) => texto(d.frente),
  resumen: (d) => {
    const f = filasConDatos(EXCAVACION.secciones[3], d); const todas = [...arr(d.exc), ...arr(d.rell)];
    return [{ t: "Ensayos de densidad", v: f.length }, { t: "Cumplen", v: f.filter((x) => resComp(x) === "Cumple").length, color: "#1D6B3A" }, { t: "No cumplen", v: f.filter((x) => resComp(x) === "No cumple").length, color: "#B3401F" }, { t: "Verificaciones «No»", v: todas.filter((x) => x.resp === "No").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = avisoPlano(d, reg); const f = filasConDatos(EXCAVACION.secciones[3], d); const malos = f.filter((x) => resComp(x) === "No cumple");
    const nos = [...(conExc(d) ? arr(d.exc) : []), ...(conRell(d) ? arr(d.rell) : [])].filter((x) => x.resp === "No").length;
    if (malos.length && d.autoriza && d.autoriza !== "No") a.push({ tipo: "alerta", texto: `Autorizas continuar, pero ${malos.length} ${malos.length === 1 ? "ensayo de compactación no cumple" : "ensayos de compactación no cumplen"}. Se recompacta la capa y se repite el ensayo antes de continuar.` });
    if (nos && d.autoriza === "Sí") a.push({ tipo: "aviso", texto: `Hay ${nos} verificaciones en «No» pero la autorización es «Sí». Revisa si debería ser «Sí, con observaciones» o «No».` });
    if (conRell(d) && !f.length && d.autoriza && d.autoriza !== "No") a.push({ tipo: "aviso", texto: "Es un relleno y no registraste ensayos de densidad en la tabla." });
    return a;
  },
  ncSugerida: (d) => filasConDatos(EXCAVACION.secciones[3], d).filter((x) => resComp(x) === "No cumple").map((x) => ({
    clave: `den:${texto(x.capa)}|${texto(x.loc)}`, origen: "CA-007", titulo: `Compactación que no cumple (capa ${texto(x.capa) || "sin número"})`,
    descripcion: `Capa ${texto(x.capa) || "—"} en ${texto(x.loc) || texto(d.frente) || "—"}: compactación de ${fmtN(pctComp(x))} % frente a ${texto(x.exigido)} % exigido (densidad en sitio ${texto(x.dsit)}, máxima ${texto(x.dmax)} kg/m³).`,
  })),
};

// ================================================================= CA-008 Acero de refuerzo
const resultadoAprob = ["Aprobado para vaciar", "Aprobado con observaciones", "Rechazado"];
const resTol = (f) => { const e = numero(f.esp), m = numero(f.medido); if (e === null || m === null) return ""; const t = numero(f.tol) || 0; return Math.abs(m - e) <= t + 1e-9 ? "Cumple" : "No cumple"; };
export const ACERO = {
  id: "cal-acero", col: "cal_acero", clave: "ryr_cal_acero", codigo: "RYR-CA-008", hoja: "Acero de Refuerzo", plantilla: "/plantilla-cal-acero.xlsx", archivo: "Acero_Refuerzo",
  titulo: "Acero de Refuerzo", subtitulo: "RYR-CA-008 · Punto de retención: no se funde sin esta aprobación", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "elemento", etq: "Elemento", colEtq: "A", tipo: "texto", req: true },
      { k: "localizacion", etq: "Eje, nivel o localización", colEtq: "H", tipo: "texto" },
      { k: "plano", etq: "Plano de referencia", colEtq: "A", tipo: "texto" },
      { k: "version", etq: "Versión", colEtq: "F", tipo: "texto" },
      { k: "vaciadoProg", etq: "Vaciado programado", colEtq: "H", tipo: "fecha" },
      { k: "lote", etq: "Lote o colada del acero", colEtq: "A", tipo: "texto" },
      { k: "certificado", etq: "Certificado N°", colEtq: "H", tipo: "texto" },
    ] },
    listaVer("material", "2. Material", "material", ACE_A, "3. DESPIECE Y ARMADO"),
    listaVer("armado", "3. Despiece y armado", "armado", ACE_B, "4. POSICIÓN Y PREPARACIÓN PARA EL VACIADO", "material"),
    listaVer("posicion", "4. Posición y preparación para el vaciado", "posicion", ACE_C, "5. MEDICIÓN DE RECUBRIMIENTOS", "armado"),
    { id: "recub", titulo: "5. Medición de recubrimientos", tipo: "tabla", k: "recub", despuesDe: "posicion", fin: "El recubrimiento y su tolerancia", finEmpieza: true, max: 5, nombreFila: "Punto", cols: [
      { k: "punto", enc: "Punto medido (cara o elemento)", tipo: "texto" },
      { k: "esp", enc: "Recubrimiento especificado (mm)", tipo: "numero" },
      { k: "medido", enc: "Recubrimiento medido (mm)", tipo: "numero" },
      { k: "tol", enc: "Tolerancia (± mm)", tipo: "numero" },
      { k: "res", enc: "Resultado", tipo: "calculado", calc: resTol, semaforo: true },
      { k: "obs", enc: "Observación", tipo: "area" },
    ] },
    { id: "aprobacion", titulo: "6. Aprobación para vaciar", tipo: "campos", campos: [
      { k: "resultado", etq: "Resultado", colEtq: "A", tipo: "chips", opciones: resultadoAprob, req: true, semaforo: true },
      { k: "fechaAprob", etq: "Fecha y hora de aprobación", colEtq: "H", tipo: "fechahora" },
      { k: "observaciones", etq: "Correcciones pedidas y observaciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: TRES_CALIDAD("7. FIRMAS", "Aprueba — interventoría / supervisión"),
  etiquetaExtra: (d) => texto(d.elemento),
  resumen: (d) => {
    const todas = [...arr(d.material), ...arr(d.armado), ...arr(d.posicion)]; const r = filasConDatos(ACERO.secciones[4], d);
    return [{ t: "Verificaciones «No»", v: todas.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "Verificaciones «Sí»", v: todas.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" }, { t: "Recubrimientos medidos", v: r.length }, { t: "Fuera de tolerancia", v: r.filter((x) => resTol(x) === "No cumple").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = avisoPlano(d, reg); const todas = [...arr(d.material), ...arr(d.armado), ...arr(d.posicion)];
    const malos = filasConDatos(ACERO.secciones[4], d).filter((x) => resTol(x) === "No cumple");
    if (d.resultado === "Aprobado para vaciar" && todas.some((x) => x.resp === "No")) a.push({ tipo: "alerta", texto: "Hay verificaciones en «No» pero el resultado es «Aprobado para vaciar». Corrige primero o cambia el resultado." });
    if (d.resultado === "Aprobado para vaciar" && malos.length) a.push({ tipo: "alerta", texto: `${malos.length} ${malos.length === 1 ? "recubrimiento está fuera" : "recubrimientos están fuera"} de la tolerancia y el resultado es «Aprobado para vaciar».` });
    return a;
  },
  ncSugerida: (d) => d.resultado !== "Rechazado" ? [] : [{ clave: "rechazo", origen: "CA-008", titulo: `Acero de refuerzo rechazado: ${texto(d.elemento) || "elemento sin nombre"}`,
    descripcion: `Acero de «${texto(d.elemento) || "—"}» (${texto(d.localizacion) || "—"}) rechazado para vaciar. Lote: ${texto(d.lote) || "—"}.${texto(d.observaciones) ? " Correcciones: " + texto(d.observaciones) : ""}` }],
};

// ================================================================= CA-009 Formaleta y encofrado
const diasDesenc = (d) => diasFechaHora(d.fechaVaciado, d.fechaDesenc);
export const FORMALETA = {
  id: "cal-formaleta", col: "cal_formaleta", clave: "ryr_cal_formaleta", codigo: "RYR-CA-009", hoja: "Formaleta y Encofrado", plantilla: "/plantilla-cal-formaleta.xlsx", archivo: "Formaleta_Encofrado",
  titulo: "Formaleta y Encofrado", subtitulo: "RYR-CA-009 · Punto de retención: no se funde sin esta aprobación", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "elemento", etq: "Elemento", colEtq: "A", tipo: "texto", req: true },
      { k: "localizacion", etq: "Eje, nivel o localización", colEtq: "H", tipo: "texto" },
      { k: "tipoFormaleta", etq: "Tipo de formaleta", colEtq: "A", tipo: "listaOtro", opciones: ["Madera", "Metálica", "Plástica / modular", "Mixta"], otroTexto: "Escribe otro tipo de formaleta", guardarOtros: "ryr_cal_tipos_formaleta" },
      { k: "desencofrante", etq: "Desencofrante usado", colEtq: "H", tipo: "texto" },
      { k: "plano", etq: "Plano de referencia", colEtq: "A", tipo: "texto" },
      { k: "version", etq: "Versión", colEtq: "F", tipo: "texto" },
      { k: "vaciadoProg", etq: "Vaciado programado", colEtq: "H", tipo: "fecha" },
    ] },
    listaVer("geometria", "2. Geometría", "geometria", FOR_A, "3. ESTABILIDAD Y APUNTALAMIENTO"),
    listaVer("estabilidad", "3. Estabilidad y apuntalamiento", "estabilidad", FOR_B, "4. HERMETICIDAD, LIMPIEZA Y EMBEBIDOS", "geometria"),
    listaVer("hermeticidad", "4. Hermeticidad, limpieza y embebidos", "hermeticidad", FOR_C, "5. MEDICIÓN DE TOLERANCIAS", "estabilidad"),
    { id: "tolerancias", titulo: "5. Medición de tolerancias", tipo: "tabla", k: "tolerancias", despuesDe: "hermeticidad", fin: "Las tolerancias salen", finEmpieza: true, max: 6, nombreFila: "Medición", cols: [
      { k: "dimension", enc: "Dimensión medida", tipo: "texto" },
      { k: "planos", enc: "Valor de planos (mm o cm)", tipo: "numero" },
      { k: "medido", enc: "Valor medido", tipo: "numero" },
      { k: "tol", enc: "Tolerancia (±)", tipo: "numero" },
      { k: "res", enc: "Resultado", tipo: "calculado", calc: (f) => resTol({ esp: f.planos, medido: f.medido, tol: f.tol }), semaforo: true },
      { k: "obs", enc: "Observación", tipo: "area" },
    ] },
    { id: "aprobacion", titulo: "6. Aprobación para vaciar", tipo: "campos", campos: [
      { k: "resultado", etq: "Resultado", colEtq: "A", tipo: "chips", opciones: resultadoAprob, req: true, semaforo: true },
      { k: "fechaAprob", etq: "Fecha y hora de aprobación", colEtq: "H", tipo: "fechahora" },
      { k: "observaciones", etq: "Correcciones pedidas y observaciones", colEtq: "A", tipo: "area" },
    ] },
    { id: "desencofrado", titulo: "7. Desencofrado (se diligencia después del vaciado)", tipo: "campos", campos: [
      { k: "fechaVaciado", etq: "Fecha y hora del vaciado", colEtq: "A", tipo: "fechahora" },
      { k: "fechaDesenc", etq: "Fecha y hora de desencofrado", colEtq: "F", tipo: "fechahora" },
      { k: "diasDesenc", etq: "Días transcurridos", colEtq: "J", tipo: "calculado", calc: (d) => { const n = diasDesenc(d); return n === null ? "" : Math.round(n * 10) / 10; } },
      { k: "tiempoMin", etq: "¿Se cumplió el tiempo mínimo?", colEtq: "A", tipo: "chips", opciones: ["Sí", "No"] },
      { k: "estadoDesenc", etq: "Estado del concreto al desencofrar", colEtq: "F", tipo: "texto" },
    ] },
  ],
  firmas: TRES_CALIDAD("8. FIRMAS", "Aprueba — interventoría / supervisión"),
  etiquetaExtra: (d) => texto(d.elemento),
  resumen: (d) => {
    const todas = [...arr(d.geometria), ...arr(d.estabilidad), ...arr(d.hermeticidad)]; const r = filasConDatos(FORMALETA.secciones[4], d);
    return [{ t: "Verificaciones «No»", v: todas.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "Verificaciones «Sí»", v: todas.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" }, { t: "Mediciones", v: r.length }, { t: "Fuera de tolerancia", v: r.filter((x) => resTol({ esp: x.planos, medido: x.medido, tol: x.tol }) === "No cumple").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = avisoPlano(d, reg); const todas = [...arr(d.geometria), ...arr(d.estabilidad), ...arr(d.hermeticidad)];
    const malos = filasConDatos(FORMALETA.secciones[4], d).filter((x) => resTol({ esp: x.planos, medido: x.medido, tol: x.tol }) === "No cumple");
    if (d.resultado === "Aprobado para vaciar" && todas.some((x) => x.resp === "No")) a.push({ tipo: "alerta", texto: "Hay verificaciones en «No» pero el resultado es «Aprobado para vaciar». Corrige primero o cambia el resultado." });
    if (d.resultado === "Aprobado para vaciar" && malos.length) a.push({ tipo: "alerta", texto: `${malos.length} ${malos.length === 1 ? "medición está fuera" : "mediciones están fuera"} de la tolerancia y el resultado es «Aprobado para vaciar».` });
    const n = diasDesenc(d);
    if (n !== null && n < 0) a.push({ tipo: "aviso", texto: "La fecha de desencofrado es anterior a la del vaciado." });
    if (n !== null && n >= 0 && n < 1 && d.tiempoMin === "Sí") a.push({ tipo: "aviso", texto: "Desencofraste en menos de un día y marcaste que se cumplió el tiempo mínimo. Revisa el tiempo que exige la especificación." });
    return a;
  },
  ncSugerida: (d) => d.resultado !== "Rechazado" ? [] : [{ clave: "rechazo", origen: "CA-009", titulo: `Formaleta rechazada: ${texto(d.elemento) || "elemento sin nombre"}`,
    descripcion: `Formaleta de «${texto(d.elemento) || "—"}» (${texto(d.localizacion) || "—"}) rechazada para vaciar.${texto(d.observaciones) ? " Correcciones: " + texto(d.observaciones) : ""}` }],
};

// ================================================================= CA-010 Vaciado de concreto
export const edadesDe = (t) => Array.from(new Set(texto(t).split(/[^0-9]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n < 1000))).sort((a, b) => a - b);
const tiempoCamion = (f) => { const a = minutosDe(f.salida), b = minutosDe(f.descargue); return a === null || b === null || b < a ? null : b - a; };
const asentCamion = (f, d) => { const g = numero(f.asent), lo = numero(d.asMin), hi = numero(d.asMax); return g === null || lo === null || hi === null ? "" : g >= lo && g <= hi ? "Cumple" : "No cumple"; };
export const VACIADO = {
  id: "cal-vaciado", col: "cal_vaciado", clave: "ryr_cal_vaciado", codigo: "RYR-CA-010", hoja: "Vaciado de Concreto", plantilla: "/plantilla-cal-vaciado.xlsx", archivo: "Vaciado_Concreto",
  titulo: "Vaciado de Concreto", subtitulo: "RYR-CA-010 · Cada camión, ensayos en obra y curado", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "horaIni", etq: "Hora de inicio", colEtq: "E", tipo: "hora" },
      { k: "horaFin", etq: "Hora de finalización", colEtq: "H", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "K", tipo: "texto" },
      { k: "elemento", etq: "Elemento vaciado", colEtq: "A", tipo: "texto", req: true },
      { k: "localizacion", etq: "Eje, nivel o localización", colEtq: "H", tipo: "texto" },
      { k: "proveedor", etq: "Proveedor del concreto", colEtq: "A", tipo: "texto", fuente: "proveedores" },
      { k: "planta", etq: "Planta o mezcla N°", colEtq: "H", tipo: "texto" },
      { k: "fc", etq: "Resistencia especificada f'c (MPa)", colEtq: "A", tipo: "numero", req: true },
      { k: "asMin", etq: "Asentamiento mínimo (mm)", colEtq: "D", tipo: "numero" },
      { k: "asMax", etq: "Asentamiento máximo (mm)", colEtq: "G", tipo: "numero" },
      { k: "volProg", etq: "Volumen programado (m³)", colEtq: "J", tipo: "numero" },
      { k: "metodo", etq: "Método de colocación", colEtq: "A", tipo: "listaOtro", opciones: ["Bomba", "Mixer directo (canaleta)", "Carretilla o buggy", "Grúa y balde", "Manual"], otroTexto: "Escribe otro método de colocación", guardarOtros: "ryr_cal_metodos_colocacion" },
      { k: "clima", etq: "Clima durante el vaciado", colEtq: "H", tipo: "lista", opciones: ["Soleado", "Nublado", "Caluroso", "Lluvia ligera", "Lluvia"] },
      { k: "edadesEnsayo", label: "Edades de ensayo de los cilindros (días)", tipo: "texto", soloApp: true, inicial: "7, 28", ayuda: "Con esto la app te recuerda cuándo ensayar cada cilindro. Ejemplo: 7, 28" },
    ] },
    listaVer("antes", "2. Antes del vaciado", "antes", VAC_A, "3. CAMIONES RECIBIDOS Y ENSAYOS EN OBRA"),
    { id: "camiones", titulo: "3. Camiones recibidos y ensayos en obra", tipo: "tabla", k: "camiones", despuesDe: "antes", fin: "TOTALES", max: 10, req: true, nombreFila: "Camión", cols: [
      { k: "remision", enc: "Remisión N°", tipo: "texto", req: true },
      { k: "salida", enc: "Hora de salida de planta", tipo: "horaExcel", entrada: "hora" },
      { k: "descargue", enc: "Hora de descargue", tipo: "horaExcel", entrada: "hora" },
      { k: "tiempo", enc: "Tiempo (min)", tipo: "calculado", calc: (f) => { const t = tiempoCamion(f); return t === null ? "" : String(t); } },
      { k: "volumen", enc: "Volumen (m³)", tipo: "numero" },
      { k: "asent", enc: "Asentamiento (mm)", tipo: "numero" },
      { k: "temp", enc: "Temp. del concreto (°C)", tipo: "numero" },
      { k: "cilindros", enc: "Cilindros tomados (N°)", tipo: "numero" },
      { k: "res", enc: "Asentamiento", tipo: "calculado", calc: (f, d) => asentCamion(f, d), semaforo: true },
      { k: "obs", enc: "Observaciones", tipo: "area" },
    ] },
    listaVer("durante", "4. Durante el vaciado", "durante", VAC_B, "5. DESPUÉS DEL VACIADO Y CURADO", "camiones"),
    listaVer("despues", "5. Después del vaciado y curado", "despues", VAC_C, "Método de curado", "durante"),
    { id: "curado", titulo: "6. Curado, observaciones y firmas", tipo: "campos", campos: [
      { k: "curado", etq: "Método de curado", colEtq: "A", tipo: "lista", opciones: ["Agua (riego o inmersión)", "Membrana de curado", "Cubierta húmeda", "Plástico", "Otro"] },
      { k: "inicioCurado", etq: "Inicio del curado", colEtq: "F", tipo: "fechahora" },
      { k: "duracionCurado", etq: "Duración (días)", colEtq: "I", tipo: "numero" },
      { k: "observaciones", etq: "Observaciones, novedades y acciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: TRES_CALIDAD("6. OBSERVACIONES Y FIRMAS", "Vo.Bo. — interventoría / supervisión"),
  etiquetaExtra: (d) => texto(d.elemento),
  resumen: (d) => {
    const c = filasConDatos(VACIADO.secciones[2], d); const vol = c.reduce((t, f) => t + (numero(f.volumen) || 0), 0);
    return [{ t: "Camiones", v: c.length }, { t: "Volumen recibido (m³)", v: fmtN(vol, 2) }, { t: "Cilindros tomados", v: c.reduce((t, f) => t + (numero(f.cilindros) || 0), 0) }, { t: "Asentamiento fuera de rango", v: c.filter((f) => asentCamion(f, d) === "No cumple").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = avisoPlano(d, reg); const c = filasConDatos(VACIADO.secciones[2], d);
    const ac = avisoPrevio(d, reg, "acero", REF.acero, "acero de refuerzo (RYR-CA-008)"); if (ac) a.push(ac);
    const fo = avisoPrevio(d, reg, "formaleta", REF.formaleta, "formaleta (RYR-CA-009)"); if (fo) a.push(fo);
    const fuera = c.filter((f) => asentCamion(f, d) === "No cumple");
    if (fuera.length) a.push({ tipo: "alerta", texto: `${fuera.length === 1 ? "Un camión tiene" : fuera.length + " camiones tienen"} el asentamiento fuera del rango (${texto(d.asMin)}–${texto(d.asMax)} mm): ${fuera.map((f) => texto(f.remision)).filter(Boolean).join(", ") || "revisa la tabla"}. Consulta antes de colocar ese concreto.` });
    const largos = c.filter((f) => (tiempoCamion(f) || 0) > 90);
    if (largos.length) a.push({ tipo: "aviso", texto: `${largos.length === 1 ? "Un camión pasó" : largos.length + " camiones pasaron"} de 90 minutos entre la salida de planta y el descargue (${largos.map((f) => texto(f.remision)).filter(Boolean).join(", ")}). Confirma el tiempo máximo que fija la especificación.` });
    if (c.length && !c.some((f) => (numero(f.cilindros) || 0) > 0)) a.push({ tipo: "aviso", texto: "No registraste cilindros tomados en ningún camión. Si se tomaron, anótalos para que la app te recuerde cuándo ensayarlos." });
    if (c.length && !texto(d.asMin) && !texto(d.asMax)) a.push({ tipo: "aviso", texto: "Escribe el asentamiento mínimo y máximo para que la app revise cada camión." });
    const vol = c.reduce((t, f) => t + (numero(f.volumen) || 0), 0), prog = numero(d.volProg);
    if (prog && vol && Math.abs(vol - prog) > prog * 0.1) a.push({ tipo: "aviso", texto: `El volumen recibido (${fmtN(vol, 2)} m³) difiere más de 10 % del programado (${fmtN(prog, 2)} m³).` });
    if ((d.antes || []).length && arr(d.antes)[0].resp === "No") a.push({ tipo: "alerta", texto: "Marcaste que el acero y la formaleta NO estaban aprobados para vaciar." });
    return a;
  },
  ncSugerida: (d) => filasConDatos(VACIADO.secciones[2], d).filter((f) => asentCamion(f, d) === "No cumple").map((f) => ({
    clave: `cam:${texto(f.remision)}`, origen: "CA-010", titulo: `Concreto con asentamiento fuera de rango (remisión ${texto(f.remision) || "sin número"})`,
    descripcion: `Remisión ${texto(f.remision) || "—"} del ${texto(d.fecha) || "—"}: asentamiento ${texto(f.asent)} mm, rango permitido ${texto(d.asMin)}–${texto(d.asMax)} mm. Elemento: ${texto(d.elemento) || "—"}. Proveedor: ${texto(d.proveedor) || "—"}.`,
  })),
};

// ---- Seguimiento de cilindros: de cada vaciado salen los ensayos por hacer (edades × camión); se cierran cuando se registra la resistencia en CA-011 ----
const claveCil = (fechaVaciado, remision, elemento, edad) => `${texto(fechaVaciado)}|${norm(remision) || norm(elemento)}|${Number(edad)}`;
export function cilindrosPorEnsayar(obraId, hoy = hoyISO(), actual = null) {
  const hechos = new Set(); const enTabla = new Set();     // hechos: ya tienen resistencia · enTabla: ya están en alguna hoja de resultados, aún sin resistencia
  const lee = (rows) => { for (const f of arr(rows)) { const k = claveCil(f.fechaVaciado, f.remision, f.elemento, f.edad); if (texto(f.resistencia) !== "") hechos.add(k); else enTabla.add(k); } };
  for (const r of listarRegistros(REF.resultados, obraId)) if (!(actual && actual.id === r.id)) lee((r.datos || {}).cilindros);
  if (actual) lee(actual.datos && actual.datos.cilindros);
  const out = [];
  for (const r of listarRegistros(REF.vaciado, obraId)) {
    const d = r.datos || {}; const edades = edadesDe(d.edadesEnsayo);
    for (const f of arr(d.camiones)) {
      const n = numero(f.cilindros); if (!n || n <= 0 || !texto(d.fecha)) continue;
      for (const e of edades) {
        const k = claveCil(d.fecha, f.remision, d.elemento, e);
        if (hechos.has(k)) continue;
        const prevista = sumarDias(d.fecha, e); const faltan = diasEntre(hoy, prevista);
        out.push({ id: `${r.id}|${k}`, estado: faltan < 0 ? "vencido" : faltan === 0 ? "hoy" : faltan <= 3 ? "pronto" : "proximo", faltan, prevista, yaEnTabla: enTabla.has(k),
          titulo: `${texto(d.elemento) || "Vaciado"} · remisión ${texto(f.remision) || "s/n"} · ${e} días`,
          detalle: `Vaciado ${d.fecha} · ensayo previsto ${prevista}${faltan < 0 ? ` (vencido hace ${-faltan} ${faltan === -1 ? "día" : "días"})` : faltan === 0 ? " (hoy)" : ` (en ${faltan} ${faltan === 1 ? "día" : "días"})`}`,
          fila: { fechaVaciado: d.fecha, elemento: texto(d.elemento), remision: texto(f.remision), edad: String(e), fcEsp: texto(d.fc) } });
      }
    }
  }
  return out.sort((a, b) => a.faltan - b.faltan);
}

// ================================================================= CA-011 Resultados de concreto y suelos
const pctFc = (f) => { const i = numero(f.resistencia), j = numero(f.fcEsp); return i === null || !j ? null : (i / j) * 100; };
const resCil = (f) => { const i = numero(f.resistencia), j = numero(f.fcEsp); if (i === null || j === null) return ""; return numero(f.edad) === 28 ? (i >= j ? "Cumple" : "No cumple") : "Seguimiento"; };
export const RESULTADOS = {
  id: "cal-resultados", col: "cal_resultados", clave: "ryr_cal_resultados", codigo: "RYR-CA-011", hoja: "Resultados Concreto y Suelos", plantilla: "/plantilla-cal-resultados.xlsx", archivo: "Resultados_Concreto_Suelos",
  titulo: "Resultados de Concreto y Suelos", subtitulo: "RYR-CA-011 · Resistencia de cilindros y compactación contra lo exigido", panelObra: ["contrato", "ubicacion", "contratista"],
  pendientesTabla: "cilindros", pendientesTitulo: "Cilindros por ensayar", pendientes: (obraId, actual) => cilindrosPorEnsayar(obraId, hoyISO(), actual),
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "F", obra: "contrato" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "J", obra: "ubicacion" },
      { k: "laboratorio", etq: "Laboratorio", colEtq: "A", tipo: "texto" },
      { k: "responsable", etq: "Responsable de calidad", colEtq: "F", tipo: "persona", cargo: "Ingeniero de calidad", req: true },
      { k: "fecha", etq: "Fecha de corte", colEtq: "J", tipo: "fecha", req: true },
    ] },
    { id: "cilindros", titulo: "2. Resistencia a la compresión de cilindros de concreto", tipo: "tabla", k: "cilindros", fin: "Resumen a 28 días", max: 12, nombreFila: "Cilindro", autoFila: (n, prev) => {
        const dias = diasEntre(n.fechaVaciado, n.fechaEnsayo); const antes = diasEntre(prev.fechaVaciado, prev.fechaEnsayo);
        if (dias === null || dias < 0) return null;
        return !texto(n.edad) || (antes !== null && texto(n.edad) === String(antes)) ? { edad: String(dias) } : null;
      }, cols: [
      { k: "fechaVaciado", enc: "Fecha de vaciado", tipo: "fecha" },
      { k: "elemento", enc: "Elemento", tipo: "texto" },
      { k: "remision", enc: "Remisión N°", tipo: "texto" },
      { k: "cilindro", enc: "Cilindro N°", tipo: "texto" },
      { k: "edad", enc: "Edad (días)", tipo: "numero", numerica: true, req: true },
      { k: "fechaEnsayo", enc: "Fecha de ensayo", tipo: "fecha" },
      { k: "carga", enc: "Carga de rotura (kN)", tipo: "numero" },
      { k: "resistencia", enc: "Resistencia obtenida (MPa)", tipo: "numero" },
      { k: "fcEsp", enc: "f'c especificado (MPa)", tipo: "numero" },
      { k: "pct", enc: "% de f'c", tipo: "calculado", calc: (f) => { const p = pctFc(f); return p === null ? "" : fmtN(p) + " %"; } },
      { k: "res", enc: "Resultado", tipo: "calculado", calc: resCil, semaforo: true },
      { k: "obs", enc: "Observaciones", tipo: "area" },
    ] },
    { id: "suelos", titulo: "3. Ensayos de suelos y compactación", tipo: "tabla", k: "suelos", despuesDe: "cilindros", fin: "Todo resultado", finEmpieza: true, max: 6, nombreFila: "Ensayo", cols: [
      { k: "fecha", enc: "Fecha", tipo: "fecha" },
      { k: "capa", enc: "Capa o material", tipo: "texto" },
      { k: "loc", enc: "Localización", tipo: "texto" },
      { k: "ensayo", enc: "Ensayo", tipo: "texto" },
      { k: "informe", enc: "Informe N°", tipo: "texto" },
      { k: "unidad", enc: "Unidad", tipo: "texto", sugerencias: ["%", "kg/m³", "g/cm³", "MPa", "kg/cm²", "mm", "cm", "golpes/30 cm", "CBR %", "L/min"], ayuda: "Primero la unidad: así ves en qué se mide lo exigido" },
      { k: "exigido", enc: "Valor exigido", tipo: "texto", etqUnidad: "unidad" },
      { k: "obtenido", enc: "Valor obtenido", tipo: "texto", etqUnidad: "unidad" },
      { k: "resultado", enc: "Resultado", tipo: "chips", opciones: ["Cumple", "No cumple", "Pendiente"], semaforo: true },
      { k: "obs", enc: "Observaciones", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("4. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Vo.Bo. — interventoría / supervisión", ["elaboro", "reviso", "vobo"]),
  etiquetaExtra: (d) => `${filasConDatos(RESULTADOS.secciones[1], d).length} cilindros · ${filasConDatos(RESULTADOS.secciones[2], d).length} ensayos de suelos`,
  resumen: (d) => {
    const c = filasConDatos(RESULTADOS.secciones[1], d); const a28 = c.filter((f) => numero(f.edad) === 28 && numero(f.resistencia) !== null);
    const rs = a28.map((f) => numero(f.resistencia)); const prom = rs.length ? rs.reduce((t, n) => t + n, 0) / rs.length : null;
    return [{ t: "Cilindros a 28 días", v: c.filter((f) => numero(f.edad) === 28).length }, { t: "Resistencia promedio (MPa)", v: fmtN(prom) }, { t: "Resistencia mínima (MPa)", v: rs.length ? fmtN(Math.min(...rs)) : "" },
      { t: "No cumplen a 28 días", v: c.filter((f) => resCil(f) === "No cumple").length, color: "#B3401F" }, { t: "Suelos que no cumplen", v: filasConDatos(RESULTADOS.secciones[2], d).filter((f) => f.resultado === "No cumple").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = []; const c = filasConDatos(RESULTADOS.secciones[1], d); const s = filasConDatos(RESULTADOS.secciones[2], d);
    if (c.some((f) => texto(f.resistencia) && !texto(f.fcEsp))) a.push({ tipo: "aviso", texto: "Hay cilindros con resistencia pero sin «f'c especificado»: sin ese dato no se puede decir si cumplen." });
    if (c.some((f) => numero(f.edad) !== null && numero(f.edad) !== 28 && texto(f.resistencia) && resCil(f) === "Seguimiento")) a.push({ tipo: "ok", texto: "Los cilindros a edades menores de 28 días son de seguimiento: solo a 28 días se decide si cumplen." });
    if (s.some((f) => f.resultado && f.resultado !== "Pendiente" && !texto(f.obtenido))) a.push({ tipo: "aviso", texto: "Hay ensayos de suelos con resultado pero sin «valor obtenido»." });
    const venc = reg ? cilindrosPorEnsayar(reg.obraId, hoyISO(), reg).filter((x) => x.estado === "vencido") : [];
    if (venc.length) a.push({ tipo: "alerta", texto: `${venc.length} ${venc.length === 1 ? "cilindro tiene" : "cilindros tienen"} el ensayo vencido. Mira la sección «Cilindros por ensayar».` });
    return a;
  },
  ncSugerida: (d) => [
    ...filasConDatos(RESULTADOS.secciones[1], d).filter((f) => resCil(f) === "No cumple").map((f) => ({
      clave: `cil:${texto(f.fechaVaciado)}|${texto(f.remision)}|${texto(f.cilindro)}|${texto(f.edad)}`, origen: "CA-011", titulo: `Cilindro de concreto que no cumple a 28 días (${texto(f.elemento) || "elemento sin nombre"})`,
      descripcion: `Cilindro ${texto(f.cilindro) || "—"} de ${texto(f.elemento) || "—"} (remisión ${texto(f.remision) || "—"}, vaciado ${texto(f.fechaVaciado) || "—"}): ${texto(f.resistencia)} MPa frente a f'c de ${texto(f.fcEsp)} MPa (${fmtN(pctFc(f))} %). Laboratorio: ${texto(d.laboratorio) || "—"}.`,
    })),
    ...filasConDatos(RESULTADOS.secciones[2], d).filter((f) => f.resultado === "No cumple").map((f) => ({
      clave: `suelo:${texto(f.fecha)}|${texto(f.capa)}|${texto(f.ensayo)}|${texto(f.informe)}`, origen: "CA-011", titulo: `Ensayo de suelos que no cumple: ${texto(f.ensayo) || "sin nombre"}`,
      descripcion: `${texto(f.ensayo) || "Ensayo"} en ${texto(f.capa) || "—"} (${texto(f.loc) || "—"}): exigido ${texto(f.exigido) || "—"} ${texto(f.unidad)}, obtenido ${texto(f.obtenido) || "—"} ${texto(f.unidad)}. Informe ${texto(f.informe) || "—"}.`,
    })),
  ],
};

// ================================================================= CA-012 Protocolo por actividad
export const GRUPOS_PROTOCOLO = [
  { act: "Mampostería", k: "g0", items: PRO_0, fin: "PAÑETES Y ESTUCOS" },
  { act: "Pañetes y estucos", k: "g1", items: PRO_1, fin: "PISOS Y ENCHAPES" },
  { act: "Pisos y enchapes", k: "g2", items: PRO_2, fin: "IMPERMEABILIZACIÓN" },
  { act: "Impermeabilización", k: "g3", items: PRO_3, fin: "INSTALACIONES HIDROSANITARIAS" },
  { act: "Instalaciones hidrosanitarias", k: "g4", items: PRO_4, fin: "INSTALACIONES ELÉCTRICAS" },
  { act: "Instalaciones eléctricas", k: "g5", items: PRO_5, fin: "PINTURA, CARPINTERÍA Y CUBIERTA" },
  { act: "Pintura, carpintería y cubierta", k: "g6", items: PRO_6, fin: "4. RESULTADO DE LA INSPECCIÓN" },
];
const todasProtocolo = (d) => [...arr(d.general), ...GRUPOS_PROTOCOLO.filter((g) => d.actividad === g.act).flatMap((g) => arr(d[g.k]))];
export const PROTOCOLO = {
  id: "cal-protocolo", col: "cal_protocolo", clave: "ryr_cal_protocolo", codigo: "RYR-CA-012", hoja: "Protocolo por Actividad", plantilla: "/plantilla-cal-protocolo.xlsx", archivo: "Protocolo_Actividad",
  titulo: "Protocolo por Actividad", subtitulo: "RYR-CA-012 · Se diligencia el grupo de la actividad inspeccionada", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "actividad", etq: "Actividad inspeccionada", colEtq: "A", tipo: "lista", opciones: [...GRUPOS_PROTOCOLO.map((g) => g.act), "Otra (solo verificación general)"], req: true },
      { k: "torre", etq: "Torre, piso o espacio", colEtq: "H", tipo: "texto", req: true },
      { k: "subcontratista", etq: "Subcontratista o cuadrilla", colEtq: "A", tipo: "texto" },
      { k: "cantidad", etq: "Cantidad inspeccionada", colEtq: "H", tipo: "texto" },
    ] },
    listaVer("general", "2. Verificación general (toda actividad)", "general", PRO_G, "3. VERIFICACIÓN ESPECÍFICA (según la actividad)"),
    ...GRUPOS_PROTOCOLO.map((g, i) => listaVer(`esp${i}`, `3. Verificación específica: ${g.act}`, g.k, g.items, g.fin, i === 0 ? "general" : GRUPOS_PROTOCOLO[i - 1].k, { visibleSi: (d) => d.actividad === g.act })),
    { id: "resultado", titulo: "4. Resultado de la inspección", tipo: "campos", campos: [
      { k: "resultado", etq: "Resultado", colEtq: "A", tipo: "chips", opciones: ["Aprobada", "Aprobada con observaciones", "Rechazada"], req: true, semaforo: true },
      { k: "fechaAprob", etq: "Fecha de aprobación", colEtq: "H", tipo: "fecha" },
      { k: "observaciones", etq: "Observaciones y correcciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: TRES_CALIDAD("5. FIRMAS", "Vo.Bo. — interventoría / supervisión"),
  etiquetaExtra: (d) => [texto(d.actividad), texto(d.torre)].filter(Boolean).join(" · "),
  resumen: (d) => { const t = todasProtocolo(d); return [{ t: "Verificaciones «Sí»", v: t.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" }, { t: "Verificaciones «No»", v: t.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "N/A", v: t.filter((x) => x.resp === "N/A").length }]; },
  avisos: (d) => {
    const a = []; const nos = todasProtocolo(d).filter((x) => x.resp === "No").length;
    if (nos && d.resultado === "Aprobada") a.push({ tipo: "alerta", texto: `Hay ${nos} verificaciones en «No» y el resultado es «Aprobada». Revisa si debería ser «Aprobada con observaciones» o «Rechazada».` });
    if (!nos && d.resultado === "Rechazada" && todasProtocolo(d).length && todasProtocolo(d).every((x) => x.resp)) a.push({ tipo: "aviso", texto: "Todas las verificaciones están en «Sí» o «N/A» pero el resultado es «Rechazada». Explica el motivo en las observaciones." });
    return a;
  },
  ncSugerida: (d) => d.resultado !== "Rechazada" && d.resultado !== "Aprobada con observaciones" ? [] : [{ clave: "res", origen: "CA-012", titulo: `${d.resultado === "Rechazada" ? "Actividad rechazada" : "Actividad aprobada con observaciones"}: ${texto(d.actividad) || "sin actividad"}`,
    descripcion: `${texto(d.actividad) || "Actividad"} en ${texto(d.torre) || "—"}${texto(d.subcontratista) ? " (" + texto(d.subcontratista) + ")" : ""}: ${d.resultado.toLowerCase()}. Aspectos verificados en «No»: ${todasProtocolo(d).filter((x) => x.resp === "No").length}.${texto(d.observaciones) ? " Correcciones: " + texto(d.observaciones) : ""}` }],
};

export const FORMATOS_ETAPA2 = {
  "cal-plan": PLAN, "cal-excavacion": EXCAVACION, "cal-acero": ACERO, "cal-formaleta": FORMALETA, "cal-vaciado": VACIADO, "cal-resultados": RESULTADOS, "cal-protocolo": PROTOCOLO,
};
