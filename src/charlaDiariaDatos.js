// Lógica pura de la Charla Diaria de Seguridad (sin React) — así se puede probar sin navegador.
// PELIGROS, EPP y CELDAS salen del mismo script que construye la plantilla de Excel
// (public/plantilla-charla-diaria.xlsx), para que nunca se desincronicen.

export const CODIGO_FORMATO = "RYR-SS-002";
export const PELIGROS = ["Caída a distinto nivel (alturas)", "Caída al mismo nivel / resbalones", "Caída de objetos o herramientas", "Golpes, cortes y atrapamientos", "Sobreesfuerzo / carga manual", "Riesgo eléctrico", "Proyección de partículas", "Ruido", "Polvo / material particulado", "Tránsito de vehículos y maquinaria", "Excavaciones / taludes", "Izaje de cargas", "Trabajo en caliente / incendio", "Espacios confinados / gases", "Sustancias químicas / derrames", "Exposición solar / calor", "Lluvia / tormenta eléctrica", "Animales (serpientes, insectos)", "Seguridad pública / terceros", "Orden y aseo deficiente"];
export const EPP = ["Casco de seguridad", "Gafas de seguridad", "Guantes", "Botas de seguridad", "Arnés y línea de vida", "Protección auditiva", "Respirador / mascarilla", "Chaleco reflectivo", "Careta / protector facial", "Overol / ropa de trabajo", "Impermeable (lluvia)", "Protector solar / hidratación"];
export const CELDAS = {"proyecto": "C7", "contratista": "C8", "ubicacion": "J8", "fecha": "C9", "horaInicio": "E9", "horaFin": "G9", "duracion": "I9", "nCharla": "K9", "frente": "C10", "tipo": "J10", "facilitadorNombre": "C11", "facilitadorCargo": "J11", "tema": "C13", "contenido": "C14", "actividades": "C19", "peligros": ["A22", "D22", "G22", "J22", "A23", "D23", "G23", "J23", "A24", "D24", "G24", "J24", "A25", "D25", "G25", "J25", "A26", "D26", "G26", "J26"], "otrosPeligros": "C27", "medidas": "C28", "epp": ["A32", "D32", "G32", "J32", "A33", "D33", "G33", "J33", "A34", "D34", "G34", "J34"], "otrosEpp": "C35", "clima": "C37", "ordenAseo": "G37", "sintomas": "K37", "novedades": "C38", "asistentesFila0": 43, "asistentesN": 30, "personalTotal": "H73", "captionFoto1": "A85", "captionFoto2": "G85", "foto1": {"tl": {"col": 0, "row": 74}, "br": {"col": 6, "row": 84}}, "foto2": {"tl": {"col": 6, "row": 74}, "br": {"col": 12, "row": 84}}, "facilitadorNombreFirma": "C89", "responsableNombre": "I89", "facilitadorCargoFirma": "C90", "responsableCargo": "I90"};
export const MAX_ASISTENTES = CELDAS.asistentesN;

export const TIPOS_CHARLA = [
  "Inicio de jornada (charla de 5 min)",
  "Previa a actividad de alto riesgo",
  "Lecciones aprendidas (incidente / casi accidente)",
  "Campaña o tema especial",
];
export const CLIMAS = ["Soleado", "Nublado", "Lluvia", "Tormenta eléctrica"];
export const ORDEN_ASEO = ["Conforme", "Con novedad"];
export const SINTOMAS = ["No", "Sí (ver novedades)"];

export const TEMAS_SUGERIDOS = [
  "Uso correcto de los EPP", "Trabajo seguro en alturas", "Orden y aseo en el frente de trabajo",
  "Manejo manual de cargas y ergonomía", "Uso seguro de herramientas manuales", "Uso seguro de herramientas eléctricas",
  "Riesgo eléctrico", "Excavaciones y taludes", "Izaje de cargas y señalero", "Trabajo en caliente (soldadura y corte)",
  "Espacios confinados", "Manejo de sustancias químicas", "Manejo seguro de maquinaria pesada",
  "Tránsito, señalización y seguridad vial en obra", "Hidratación y exposición solar", "Pausas activas",
  "Prevención de mordeduras de serpientes e insectos", "Plan de emergencias y rutas de evacuación",
  "Uso de extintores", "Primeros auxilios", "Reporte de actos y condiciones inseguras",
  "Derecho a negarse a trabajar en condiciones inseguras", "Consumo de alcohol y sustancias psicoactivas",
  "Trabajo bajo lluvia y tormentas eléctricas", "Seguridad en andamios y escaleras", "Prevención de caída de objetos",
  "Lecciones aprendidas de incidentes recientes", "Autocuidado y estilos de vida saludable",
];

export function fechaHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function fechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Minutos entre dos horas "HH:MM" (si cruza medianoche suma 24 h). "" si falta alguna.
export function minutosEntre(inicio, fin) {
  if (!inicio || !fin) return "";
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => isNaN(n))) return "";
  let min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (min < 0) min += 24 * 60;
  return min;
}

export function textoDuracion(inicio, fin) {
  const m = minutosEntre(inicio, fin);
  return m === "" ? "" : `${m} min`;
}

// Convierte texto pegado (una persona por línea; columnas separadas por tabulador o punto y coma,
// como al copiar desde Excel) en filas de asistentes: nombre, documento, cargo, empresa.
export function parsearPegado(texto) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const partes = l.split(/\t|;/).map((p) => p.trim());
      return { nombre: partes[0] || "", documento: partes[1] || "", cargo: partes[2] || "", empresa: partes[3] || "" };
    })
    .filter((a) => a.nombre);
}

// Marca ☒ / ☐ en cada opción de una lista según las opciones elegidas.
function marcarGrid(ws, opciones, celdas, elegidas) {
  opciones.forEach((op, i) => {
    if (!celdas[i]) return;
    ws.getCell(celdas[i]).value = (elegidas.includes(op) ? "☒ " : "☐ ") + op;
  });
}

function poner(ws, ref, valor) {
  if (valor === undefined || valor === null || valor === "") return;
  ws.getCell(ref).value = valor;
}

// Escribe TODOS los datos de la charla en la hoja de la plantilla.
// Solo escribe en celdas "ancla" (la esquina de cada celda combinada) — escribir en otra celda de
// una combinación falla en ExcelJS.
export function escribirCharlaEnHoja(ws, d) {
  const C = CELDAS;
  poner(ws, C.proyecto, d.proyecto);
  poner(ws, C.contratista, d.contratista);
  poner(ws, C.ubicacion, d.ubicacion);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.horaInicio, d.horaInicio);
  poner(ws, C.horaFin, d.horaFin);
  poner(ws, C.duracion, textoDuracion(d.horaInicio, d.horaFin));
  poner(ws, C.nCharla, d.nCharla);
  poner(ws, C.frente, d.frente);
  poner(ws, C.tipo, d.tipo);
  poner(ws, C.facilitadorNombre, d.facilitadorNombre);
  poner(ws, C.facilitadorCargo, d.facilitadorCargo);

  poner(ws, C.tema, d.tema);
  poner(ws, C.contenido, d.contenido);

  poner(ws, C.actividades, d.actividades);
  marcarGrid(ws, PELIGROS, C.peligros, d.peligros || []);
  poner(ws, C.otrosPeligros, d.otrosPeligros);
  poner(ws, C.medidas, d.medidas);
  marcarGrid(ws, EPP, C.epp, d.epp || []);
  poner(ws, C.otrosEpp, d.otrosEpp);

  poner(ws, C.clima, d.clima);
  poner(ws, C.ordenAseo, d.ordenAseo);
  poner(ws, C.sintomas, d.sintomas);
  poner(ws, C.novedades, d.novedades);

  (d.asistentes || []).slice(0, MAX_ASISTENTES).forEach((a, i) => {
    const f = C.asistentesFila0 + i;
    poner(ws, `B${f}`, a.nombre);
    poner(ws, `E${f}`, a.documento);
    poner(ws, `G${f}`, a.cargo);
    poner(ws, `I${f}`, a.empresa);
  });
  const total = Number(d.personalTotal);
  if (total > 0) ws.getCell(C.personalTotal).value = total;

  poner(ws, C.facilitadorNombreFirma, d.facilitadorNombre);
  poner(ws, C.facilitadorCargoFirma, d.facilitadorCargo);
  poner(ws, C.responsableNombre, d.responsableNombre);
  poner(ws, C.responsableCargo, d.responsableCargo);
}

// Validaciones antes de generar. Devuelve una lista de textos (vacía = todo bien).
export function validarCharla(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.tema || !d.tema.trim()) faltan.push("el tema de la charla");
  if (!d.facilitadorNombre || !d.facilitadorNombre.trim()) faltan.push("el nombre del facilitador");
  if (!(d.asistentes || []).some((a) => a.nombre && a.nombre.trim())) faltan.push("al menos un asistente");
  return faltan;
}
