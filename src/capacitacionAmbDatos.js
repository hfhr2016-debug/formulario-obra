// Capacitación e Inducción Ambiental (RYR-AM-009). Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, saltoDePagina } from "./sstBase";

export const CODIGO_CAPACITACION_AMB = "RYR-AM-009";
export const HOJA_CAPACITACION_AMB = "Capacitación Ambiental";
export const TIPOS_CAPACITACION = ["Inducción ambiental (personal nuevo)", "Capacitación ambiental", "Charla ambiental (5 minutos)", "Sensibilización a la comunidad"];
export const TEMAS_AMBIENTALES = ["Manejo y separación de residuos", "Escombros y RCD", "Uso eficiente del agua", "Uso eficiente de la energía", "Derrames y atención de contingencias",
  "Manejo de combustibles y químicos", "Control de polvo y ruido", "Protección de fauna y flora", "Normas y permisos ambientales", "Relación con la comunidad", "Plan de manejo ambiental de la obra", "Otro:"];

export const SPEC_CAPACITACION_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["horaInicio", "Hora de inicio", "E", "G"], ["horaFin", "Hora de fin", "I", "K"],
    ["lugar", "Lugar", "A", "C"],
    ["facilitador", "Facilitador", "A", "C"], ["facilitadorCargo", "Cargo o entidad", "H", "J"], ["contenido", "Contenido o resumen", "A", "C"],
    ["observaciones", "4. OBSERVACIONES Y EVALUACIÓN", "A", "A", null, 1],
  ],
  opciones: [{ clave: "tipos", desde: "2. TIPO DE ACTIVIDAD Y TEMAS", hasta: "Temas tratados" }, { clave: "temas", desde: "Temas tratados", hasta: "Facilitador" }],
  tablas: [
    { clave: "asistentes", cabecera: "No.", fin: "Total de asistentes", finEmpieza: true, columnas: { nombre: "B", documento: "F", cargo: "H" },
      encabezados: { nombre: "Nombre completo", documento: "Documento", cargo: "Cargo o empresa" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "facilitadorF", col: "C" }, { clave: "responsable", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CAPACITACION_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","horaInicio":"G13","horaFin":"K13","lugar":"C14","facilitador":"C22","facilitadorCargo":"J22","contenido":"C23","observaciones":"A48","tablas":{"asistentes":{"fila0":26,"n":20,"columnas":{"nombre":"B","documento":"F","cargo":"H"}}},"opciones":{"tipos":[{"ref":"A16","texto":"Inducción ambiental (personal nuevo)"},{"ref":"D16","texto":"Capacitación ambiental"},{"ref":"G16","texto":"Charla ambiental (5 minutos)"},{"ref":"J16","texto":"Sensibilización a la comunidad"}],"temas":[{"ref":"A18","texto":"Manejo y separación de residuos"},{"ref":"E18","texto":"Escombros y RCD"},{"ref":"I18","texto":"Uso eficiente del agua"},{"ref":"A19","texto":"Uso eficiente de la energía"},{"ref":"E19","texto":"Derrames y atención de contingencias"},{"ref":"I19","texto":"Manejo de combustibles y químicos"},{"ref":"A20","texto":"Control de polvo y ruido"},{"ref":"E20","texto":"Protección de fauna y flora"},{"ref":"I20","texto":"Normas y permisos ambientales"},{"ref":"A21","texto":"Relación con la comunidad"},{"ref":"E21","texto":"Plan de manejo ambiental de la obra"},{"ref":"I21","texto":"Otro:"}]},"firmas":{"facilitadorF":{"nombre":"C52","cargo":"C53"},"responsable":{"nombre":"G52","cargo":"G53"},"vobo":{"nombre":"K52","cargo":"K53"}}};
export const descubrirCapacitacionAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_CAPACITACION_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const asistenteNuevo = (base = {}) => ({ nombre: "", documento: "", cargo: "", empresa: "", ...base });
export const asistentesConNombre = (d) => arr(d.asistentes).filter((a) => texto(a.nombre));
// "08:30" -> fracción del día (la fórmula de duración de la hoja resta horas: necesita números, no texto)
export function horaComoFraccion(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(texto(hhmm));
  return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : null;
}
export function duracionMinutos(ini, fin) {
  const a = horaComoFraccion(ini), b = horaComoFraccion(fin);
  return a === null || b === null ? null : Math.round((b - a) * 1440);
}
export const textoDuracionAmb = (ini, fin) => { const m = duracionMinutos(ini, fin); return m === null || m < 0 ? "" : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`; };

export function escribirCapacitacionAmbEnHoja(ws, d, celdas = CELDAS_CAPACITACION_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "lugar", "facilitador", "facilitadorCargo", "contenido", "observaciones"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  for (const k of ["horaInicio", "horaFin"]) { const f = horaComoFraccion(d[k]); poner(ws, C[k], f === null ? d[k] : f); }
  const O = C.opciones || {};
  const noMarcadas = [...marcarOpciones(ws, O.tipos, d.tipo ? [d.tipo] : [], {}), ...marcarOpciones(ws, O.temas, arr(d.temas), d.otros || {})];
  const T = C.tablas || {};
  escribirTabla(ws, T.asistentes, asistentesConNombre(d).map((a) => ({ nombre: texto(a.nombre), documento: texto(a.documento), cargo: [texto(a.cargo), texto(a.empresa)].filter(Boolean).join(" · ") })));
  const filaContenido = C.contenido ? Number(String(C.contenido).replace(/\D/g, "")) : 0;
  if (filaContenido) saltoDePagina(ws, filaContenido);                       // la hoja 2 empieza en «3. Asistentes»
  const F = C.firmas || {};
  if (F.facilitadorF) { poner(ws, F.facilitadorF.nombre, d.facilitador); poner(ws, F.facilitadorF.cargo, d.facilitadorCargo); }
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsableNombre); poner(ws, F.responsable.cargo, d.responsableCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.revisoNombre); poner(ws, F.vobo.cargo, d.revisoCargo); }
  return noMarcadas;
}

export function validarCapacitacionAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!d.tipo) f.push("el tipo de actividad");
  if (!arr(d.temas).length) f.push("al menos un tema tratado");
  if (arr(d.temas).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push("cuál es el otro tema");
  if (!texto(d.facilitador)) f.push("el facilitador");
  if (!asistentesConNombre(d).length) f.push("al menos un asistente");
  if (d.horaInicio && d.horaFin && duracionMinutos(d.horaInicio, d.horaFin) < 0) f.push("la hora de fin (es anterior a la de inicio)");
  return f;
}
export function camposFaltantesCapacitacionAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!d.tipo) f.push({ etiqueta: "Tipo de actividad", seccion: "temas" });
  if (!arr(d.temas).length) f.push({ etiqueta: "Temas tratados", seccion: "temas" });
  if (arr(d.temas).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push({ etiqueta: "Temas tratados", seccion: "temas" });
  if (!texto(d.facilitador)) f.push({ etiqueta: "Nombre del facilitador", seccion: "temas" });
  if (!asistentesConNombre(d).length) f.push({ etiqueta: "Nombre completo", indice: 0, seccion: "asistentes" });
  return f;
}
export function resumenCapacitacionAmb(d) {
  const min = duracionMinutos(d.horaInicio, d.horaFin);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${d.horaInicio || ""}|${d.tipo || ""}`, formato: "capacitacion", proyecto: texto(d.proyecto), fecha: d.fecha, tipo: d.tipo || "",
    temas: arr(d.temas).length, asistentes: asistentesConNombre(d).length, minutos: min !== null && min >= 0 ? min : null,
  };
}
