// Análisis de Trabajo Seguro - ATS (RYR-SS-008): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_ATS = "RYR-SS-008";
export const HOJA_ATS = "ATS";
export const NIVELES = ["Alto", "Medio", "Bajo"];
export const EPP_ATS = ["Casco de seguridad", "Gafas de seguridad", "Guantes de seguridad", "Botas de seguridad", "Arnés y línea de vida", "Protección auditiva", "Respirador / mascarilla", "Chaleco reflectivo", "Careta o protector facial", "Overol / ropa de trabajo", "Impermeable", "Otro: ____________"];
export const PERMISOS_ATS = ["Permiso de alturas", "Permiso en caliente", "Espacios confinados", "Excavaciones", "Bloqueo y etiquetado (LOTO)", "Plan de izaje", "Ninguno", "Otro: ____________"];
export const PROBABILIDADES = [["1", "1 · Baja"], ["2", "2 · Media"], ["3", "3 · Alta"]];
export const SEVERIDADES = [["1", "1 · Leve"], ["2", "2 · Grave"], ["3", "3 · Mortal o incapacitante"]];

// Peligros frecuentes en obra. Al elegir uno se sugiere el riesgo y el control (siempre se pueden editar).
export const PELIGROS_COMUNES = [
  { peligro: "Caída de personas a distinto nivel", riesgo: "Fracturas, trauma craneoencefálico o muerte", control: "Sistema de protección contra caídas certificado (arnés, eslinga y punto de anclaje), barandas, señalización y personal certificado en alturas" },
  { peligro: "Caída de objetos o herramientas", riesgo: "Golpes, contusiones o traumas por objetos", control: "Demarcar y restringir el área inferior, amarrar las herramientas, usar casco y no apilar materiales en bordes" },
  { peligro: "Contacto con energía eléctrica", riesgo: "Choque eléctrico, quemaduras o muerte", control: "Bloqueo y etiquetado (LOTO), verificar ausencia de tensión, herramientas aisladas, protección diferencial y personal competente" },
  { peligro: "Proyección de partículas o chispas", riesgo: "Lesiones oculares o quemaduras", control: "Gafas o careta de seguridad, pantallas protectoras y área despejada de combustibles" },
  { peligro: "Atrapamiento por partes en movimiento", riesgo: "Amputaciones o aplastamiento", control: "Guardas instaladas, no usar ropa suelta y bloquear el equipo antes de intervenirlo" },
  { peligro: "Manipulación manual de cargas", riesgo: "Lesiones musculoesqueléticas (lumbalgia, hernias)", control: "Limitar el peso por persona, usar ayudas mecánicas, técnica de levantamiento y pausas activas" },
  { peligro: "Posturas forzadas o movimientos repetitivos", riesgo: "Desórdenes musculoesqueléticos", control: "Rotación de tareas, pausas activas y herramientas ergonómicas" },
  { peligro: "Ruido", riesgo: "Pérdida auditiva", control: "Protección auditiva, limitar el tiempo de exposición y mantener los equipos" },
  { peligro: "Polvo y material particulado", riesgo: "Enfermedades respiratorias e irritación ocular", control: "Humedecer el área, respirador con filtro adecuado y gafas de seguridad" },
  { peligro: "Gases, vapores o atmósferas peligrosas", riesgo: "Intoxicación, asfixia, incendio o explosión", control: "Medición de gases antes y durante la tarea, ventilación, vigía y equipo de rescate" },
  { peligro: "Incendio o explosión por trabajo en caliente", riesgo: "Quemaduras, daños materiales o muerte", control: "Permiso de trabajo en caliente, extintor a la mano, vigía de fuego y retiro de combustibles" },
  { peligro: "Sustancias químicas", riesgo: "Quemaduras, intoxicación o irritación", control: "Consultar la hoja de seguridad (SDS), rotular los envases, EPP específico y kit para derrames" },
  { peligro: "Superficies irregulares, húmedas o desordenadas", riesgo: "Caídas al mismo nivel, torceduras y golpes", control: "Orden y aseo, señalización y calzado antideslizante" },
  { peligro: "Derrumbe o deslizamiento de tierra", riesgo: "Atrapamiento y sepultamiento", control: "Entibado o talud adecuado, distancia segura de los acopios y vías de salida" },
  { peligro: "Tránsito de vehículos o maquinaria", riesgo: "Atropellamiento o colisión", control: "Señalero, rutas demarcadas, chaleco reflectivo y velocidades controladas" },
  { peligro: "Izaje de cargas", riesgo: "Caída de la carga, golpes o aplastamiento", control: "Plan de izaje, equipo y accesorios certificados, señalero y zona restringida" },
  { peligro: "Herramientas manuales o eléctricas defectuosas", riesgo: "Cortes, golpes o choque eléctrico", control: "Inspeccionar antes de usar, retirar las defectuosas y usar la herramienta adecuada" },
  { peligro: "Exposición a radiación solar o altas temperaturas", riesgo: "Golpe de calor, quemaduras o deshidratación", control: "Hidratación, protector solar, pausas a la sombra y ropa adecuada" },
  { peligro: "Condiciones climáticas adversas (lluvia, viento, tormenta eléctrica)", riesgo: "Resbalones, caídas o descargas eléctricas", control: "Suspender la tarea ante tormenta eléctrica o viento fuerte y asegurar los materiales" },
  { peligro: "Espacio confinado", riesgo: "Asfixia, intoxicación o atrapamiento", control: "Permiso de espacios confinados, medición de gases, vigía exterior y plan de rescate" },
  { peligro: "Corte o punzonamiento por materiales", riesgo: "Heridas y laceraciones", control: "Guantes de seguridad, manejo adecuado de los materiales y disposición segura de los sobrantes" },
  { peligro: "Presencia de terceros en el área", riesgo: "Lesiones a terceros o a trabajadores", control: "Cerramiento y señalización del área, control de acceso y vigía" },
];

export const SPEC_ATS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "H", "I"],
    ["ubicacion", "Ubicación", "A", "C"],
    ["fecha", "Fecha", "H", "I"],
    ["tarea", "Tarea o actividad a analizar", "A", "C"],
    ["area", "Área / frente de trabajo", "A", "C"],
    ["nAts", "N° de ATS", "E", "H"],
    ["horaInicio", "Hora inicio", "I", "J"],
    ["supervisorNombre", "Supervisor responsable", "A", "C"],
    ["supervisorCargo", "Cargo del supervisor", "E", "H"],
    ["horaFin", "Hora fin", "I", "J"],
    ["permisoAsociado", "Permiso de trabajo asociado (N°)", "A", "C"],
    ["puntoEncuentro", "Punto de encuentro", "A", "C"],
    ["telefono", "Teléfono de emergencias", "E", "H"],
    ["brigadista", "Brigadista", "I", "J"],
    ["centroSalud", "Centro de salud más cercano", "A", "C"],
    ["ruta", "Ruta de evacuación o rescate", "E", "H"],
  ],
  tablas: [
    { clave: "pasos", cabecera: "No.", fin: "3. EPP Y PERMISOS REQUERIDOS", finEmpieza: true, columnas: { paso: "B", peligro: "C", riesgo: "D", prob: "E", sev: "F", control: "H", responsable: "I", residual: "J" } },
    { clave: "equipo", cabecera: "No.", despuesDe: "pasos", fin: "5. PLAN DE EMERGENCIA", finEmpieza: true, columnas: { nombre: "B", documento: "C", cargo: "D", hora: "I" } },
  ],
  opciones: [
    { clave: "epp", desde: "EPP requerido", hasta: "Permisos y requisitos asociados" },
    { clave: "permisos", desde: "Permisos y requisitos asociados", hasta: "4. EQUIPO DE TRABAJO" },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "F" }, { clave: "aprobo", col: "I" }] },
};

export const CELDAS_ATS = {"proyecto":"C11","contratista":"I11","ubicacion":"C12","fecha":"I12","tarea":"C13","area":"C14","nAts":"H14","horaInicio":"J14","supervisorNombre":"C15","supervisorCargo":"H15","horaFin":"J15","permisoAsociado":"C16","puntoEncuentro":"C52","telefono":"H52","brigadista":"J52","centroSalud":"C53","ruta":"H53","tablas":{"pasos":{"fila0":20,"n":12,"columnas":{"paso":"B","peligro":"C","riesgo":"D","prob":"E","sev":"F","control":"H","responsable":"I","residual":"J"}},"equipo":{"fila0":43,"n":8,"columnas":{"nombre":"B","documento":"C","cargo":"D","hora":"I"}}},"opciones":{"epp":[{"ref":"A34","texto":"Casco de seguridad"},{"ref":"D34","texto":"Gafas de seguridad"},{"ref":"G34","texto":"Guantes de seguridad"},{"ref":"I34","texto":"Botas de seguridad"},{"ref":"A35","texto":"Arnés y línea de vida"},{"ref":"D35","texto":"Protección auditiva"},{"ref":"G35","texto":"Respirador / mascarilla"},{"ref":"I35","texto":"Chaleco reflectivo"},{"ref":"A36","texto":"Careta o protector facial"},{"ref":"D36","texto":"Overol / ropa de trabajo"},{"ref":"G36","texto":"Impermeable"},{"ref":"I36","texto":"Otro: ____________"}],"permisos":[{"ref":"A38","texto":"Permiso de alturas"},{"ref":"D38","texto":"Permiso en caliente"},{"ref":"G38","texto":"Espacios confinados"},{"ref":"I38","texto":"Excavaciones"},{"ref":"A39","texto":"Bloqueo y etiquetado (LOTO)"},{"ref":"D39","texto":"Plan de izaje"},{"ref":"G39","texto":"Ninguno"},{"ref":"I39","texto":"Otro: ____________"}]},"firmas":{"elaboro":{"nombre":"C57","cargo":"C58"},"reviso":{"nombre":"F57","cargo":"F58"},"aprobo":{"nombre":"I57","cargo":"I58"}}};

export const descubrirAts = (ws) => descubrirPorEtiquetas(ws, SPEC_ATS);

// ---------- Lógica del ATS ----------
const arr = (a) => (Array.isArray(a) ? a : []);
const num13 = (v) => { const n = Number(v); return n >= 1 && n <= 3 ? n : null; };

// Nivel = probabilidad × severidad: 1-2 Bajo · 3-4 Medio · 6-9 Alto (igual que la fórmula del Excel)
export function nivelRiesgo(prob, sev) {
  const p = num13(prob); const s = num13(sev);
  if (p === null || s === null) return "";
  const v = p * s;
  return v >= 6 ? "Alto" : v >= 3 ? "Medio" : "Bajo";
}

const pasoVacio = (p) => !(p && (p.paso || p.peligro || p.riesgo || p.control || p.responsable || p.prob || p.sev || p.residual));
export const pasosConDatos = (d) => arr(d.pasos).filter((p) => !pasoVacio(p));
const equipoVacio = (e) => !(e && (e.nombre || e.documento || e.cargo));
export const equipoConDatos = (d) => arr(d.equipo).filter((e) => !equipoVacio(e));

export function escribirAtsEnHoja(ws, d, celdas = CELDAS_ATS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "tarea", "area", "nAts", "horaInicio", "horaFin", "supervisorNombre", "supervisorCargo", "permisoAsociado",
    "puntoEncuentro", "telefono", "brigadista", "centroSalud", "ruta"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const O = C.opciones || {};
  const noMarcadas = [
    ...marcarOpciones(ws, O.epp, arr(d.epp), d.otros || {}),
    ...marcarOpciones(ws, O.permisos, arr(d.permisos), d.otros || {}),
  ];
  const T = C.tablas || {};
  // Probabilidad y severidad van como NÚMEROS: el Excel calcula el nivel con su fórmula
  escribirTabla(ws, T.pasos, pasosConDatos(d).map((p) => ({
    paso: p.paso, peligro: p.peligro, riesgo: p.riesgo, prob: num13(p.prob) === null ? "" : num13(p.prob), sev: num13(p.sev) === null ? "" : num13(p.sev),
    control: p.control, responsable: p.responsable, residual: p.residual,
  })));
  escribirTabla(ws, T.equipo, equipoConDatos(d).map((e) => ({ nombre: e.nombre, documento: e.documento, cargo: e.cargo, hora: e.hora || d.horaSocializacion || "" })));
  const F = C.firmas || {};
  // Quien elabora es el supervisor de la tarea
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre || d.supervisorNombre); poner(ws, F.elaboro.cargo, d.elaboroNombre ? d.elaboroCargo : d.supervisorCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.aprobo) { poner(ws, F.aprobo.nombre, d.aproboNombre); poner(ws, F.aprobo.cargo, d.aproboCargo); }
  return noMarcadas;
}

export function validarAts(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.tarea || !d.tarea.trim()) faltan.push("la tarea o actividad a analizar");
  if (!d.supervisorNombre || !d.supervisorNombre.trim()) faltan.push("el supervisor responsable");
  const pasos = pasosConDatos(d);
  if (!pasos.length) { faltan.push("al menos un paso de la tarea"); }
  else {
    if (pasos.some((p) => !p.paso || !p.paso.trim())) faltan.push("el paso de la tarea en cada fila");
    if (pasos.some((p) => !p.peligro || !p.peligro.trim())) faltan.push("el peligro identificado en cada paso");
    if (pasos.some((p) => num13(p.prob) === null || num13(p.sev) === null)) faltan.push("la probabilidad y la severidad en cada paso");
    if (pasos.some((p) => !p.control || !p.control.trim())) faltan.push("las medidas de control en cada paso");
  }
  if (!equipoConDatos(d).length) faltan.push("al menos una persona del equipo de trabajo");
  return faltan;
}

export function resumenAts(d) {
  const pasos = pasosConDatos(d);
  const niveles = pasos.map((p) => nivelRiesgo(p.prob, p.sev));
  return {
    id: `${d.fecha || "sin-fecha"}_${d.nAts || ""}`, formato: "ats", fecha: d.fecha || "", proyecto: d.proyecto || "", nAts: d.nAts || "", tarea: d.tarea || "",
    pasos: pasos.length, riesgosAltos: niveles.filter((n) => n === "Alto").length, equipo: equipoConDatos(d).length,
  };
}
