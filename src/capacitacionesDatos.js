// Matriz de capacitación SG-SST (RYR-SS-005): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_CAPACITACIONES = "RYR-SS-005";
export const TIPOS_CAPACITACION = ["Inducción", "Reinducción", "Capacitación específica", "Entrenamiento", "Simulacro", "Charla de seguridad", "Otra"];
export const ESTADOS = ["Ejecutada", "Pendiente", "Reprogramada", "Cancelada"];
export const METAS_POR_DEFECTO = { cumplimiento: 90, cobertura: 80, eficacia: 80 };

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…, filas debajo]
export const SPEC_CAPACITACIONES = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "H", "L"],
    ["ubicacion", "Ubicación", "A", "C"],
    ["responsableNombre", "Responsable del programa SST", "H", "L"],
    ["responsableCargo", "Cargo", "O", "P", "responsableNombre"],
    ["periodoDesde", "Periodo evaluado — desde", "A", "C"],
    ["periodoHasta", "hasta", "D", "E"],
    ["actualizacion", "Fecha de actualización", "H", "L"],
    ["metaCumplimiento", "Meta de cumplimiento", "G", "G", null, 1],     // las metas están 1 fila debajo de su etiqueta
    ["metaCobertura", "Meta de cobertura", "N", "N", null, 1],
    ["metaEficacia", "Meta de eficacia", "Q", "Q", null, 1],
    ["observaciones", "4. OBSERVACIONES Y SEGUIMIENTO", "A", "A", null, 1],
  ],
  tabla: { clave: "matriz", cabecera: "No.", fin: "TOTALES",
    columnas: { tema: "B", tipo: "C", dirigida: "D", programada: "E", ejecutada: "F", capacitador: "G", duracion: "H", convocados: "I", asistentes: "J", evaluados: "L", aprobados: "M", lista: "O", estado: "P", observaciones: "Q" } },
  firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "J" }, { clave: "vobo", col: "Q" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CAPACITACIONES = {"proyecto":"C11","contratista":"L11","ubicacion":"C12","responsableNombre":"L12","responsableCargo":"P12","periodoDesde":"C13","periodoHasta":"E13","actualizacion":"L13","metaCumplimiento":"G16","metaCobertura":"N16","metaEficacia":"Q16","observaciones":"A37","tablas":{"matriz":{"fila0":20,"n":15,"columnas":{"tema":"B","tipo":"C","dirigida":"D","programada":"E","ejecutada":"F","capacitador":"G","duracion":"H","convocados":"I","asistentes":"J","evaluados":"L","aprobados":"M","lista":"O","estado":"P","observaciones":"Q"}}},"firmas":{"elaboro":{"nombre":"C42","cargo":"C43"},"reviso":{"nombre":"J42","cargo":"J43"},"vobo":{"nombre":"Q42","cargo":"Q43"}}};

export const descubrirCapacitaciones = (ws) => descubrirPorEtiquetas(ws, SPEC_CAPACITACIONES);

const numero = (v) => (v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : null);
const esFechaISO = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || ""));
export const filaVacia = () => ({ tema: "", tipo: "", dirigida: "", programada: "", ejecutada: "", capacitador: "", duracion: "", convocados: "", asistentes: "", evaluados: "", aprobados: "", lista: "", estado: "", observaciones: "", origen: "" });
export const filasConTema = (d) => (d.filas || []).filter((f) => f.tema && f.tema.trim());

// Los mismos cálculos que hace el Excel (así la pantalla y el archivo coinciden)
export function indicadores(d) {
  const filas = filasConTema(d);
  const suma = (k) => filas.reduce((s, f) => s + (numero(f[k]) || 0), 0);
  const programadas = filas.length;
  const ejecutadas = filas.filter((f) => f.estado === "Ejecutada").length;
  const convocados = suma("convocados"), asistentes = suma("asistentes"), evaluados = suma("evaluados"), aprobados = suma("aprobados");
  const pct = (a, b) => (b > 0 ? a / b : null);
  const metas = { cumplimiento: numero(d.metaCumplimiento) ?? METAS_POR_DEFECTO.cumplimiento, cobertura: numero(d.metaCobertura) ?? METAS_POR_DEFECTO.cobertura, eficacia: numero(d.metaEficacia) ?? METAS_POR_DEFECTO.eficacia };
  const cumplimiento = pct(ejecutadas, programadas), cobertura = pct(asistentes, convocados), eficacia = pct(aprobados, evaluados);
  const cumple = (v, meta) => (v === null ? "" : v * 100 >= meta ? "cumple" : "no cumple");
  return { programadas, ejecutadas, convocados, asistentes, evaluados, aprobados, cumplimiento, cobertura, eficacia, metas,
    estadoCumplimiento: cumple(cumplimiento, metas.cumplimiento), estadoCobertura: cumple(cobertura, metas.cobertura), estadoEficacia: cumple(eficacia, metas.eficacia) };
}

export function escribirCapacitacionesEnHoja(ws, d, celdas = CELDAS_CAPACITACIONES) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "responsableNombre", "responsableCargo", "observaciones"]) poner(ws, C[k], d[k]);
  for (const k of ["periodoDesde", "periodoHasta", "actualizacion"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  for (const [clave, campo] of [["metaCumplimiento", "metaCumplimiento"], ["metaCobertura", "metaCobertura"], ["metaEficacia", "metaEficacia"]]) {
    if (numero(d[campo]) !== null) poner(ws, C[clave], numero(d[campo]) / 100);
  }
  const filas = filasConTema(d).map((f) => ({
    tema: f.tema, tipo: f.tipo, dirigida: f.dirigida, programada: fechaDDMMYYYY(f.programada), ejecutada: fechaDDMMYYYY(f.ejecutada), capacitador: f.capacitador,
    duracion: numero(f.duracion) ?? "", convocados: numero(f.convocados) ?? "", asistentes: numero(f.asistentes) ?? "", evaluados: numero(f.evaluados) ?? "", aprobados: numero(f.aprobados) ?? "",
    lista: f.lista, estado: f.estado, observaciones: f.observaciones,
  }));
  escribirTabla(ws, C.tablas && C.tablas.matriz, filas);
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.responsableNombre); poner(ws, F.elaboro.cargo, d.responsableCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarCapacitaciones(d) {
  const faltan = [];
  if (!d.periodoDesde || !d.periodoHasta) faltan.push("el periodo evaluado (desde y hasta)");
  else if (d.periodoHasta < d.periodoDesde) faltan.push("que el periodo termine después de empezar");
  if (!d.responsableNombre || !d.responsableNombre.trim()) faltan.push("el responsable del programa");
  const filas = filasConTema(d);
  if (!filas.length) faltan.push("al menos una capacitación");
  if (filas.some((f) => numero(f.aprobados) !== null && numero(f.aprobados) > (numero(f.evaluados) || 0))) faltan.push("que las personas aprobadas no superen a las evaluadas");
  return faltan;
}

// ---------- Traer las actividades que ya se registraron en el dispositivo ----------
// La Lista de Asistencia guarda un resumen de cada actividad (CLAVE_EVENTOS); las inducciones guardan el suyo (una por trabajador).
const TIPO_DE_LISTA = { "Capacitación": "Capacitación específica", "Inducción": "Inducción", "Reinducción": "Reinducción", "Entrenamiento": "Entrenamiento", "Simulacro": "Simulacro", "Charla de seguridad": "Charla de seguridad", "Otra": "Otra" };
// Las reuniones (COPASST, seguimiento) no son capacitaciones: no se traen.
const enPeriodo = (fecha, desde, hasta) => !!fecha && (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
const horas = (min) => (min > 0 ? Math.round((min / 60) * 10) / 10 : "");

export function filasDesdeEventos(eventos, desde, hasta, yaTraidos = []) {
  const vistos = new Set(yaTraidos);
  const filas = [];
  for (const e of eventos || []) {
    if (e.formato !== "lista-asistencia" || !(e.tipo in TIPO_DE_LISTA) || !enPeriodo(e.fecha, desde, hasta) || vistos.has("lista:" + e.id)) continue;
    const evaluada = e.seEvaluo === "Sí";
    filas.push({ ...filaVacia(), tema: e.tema, tipo: TIPO_DE_LISTA[e.tipo], ejecutada: e.fecha, capacitador: e.entidad || e.facilitador || "", duracion: String(horas(e.duracionMin)),
      convocados: e.convocados ? String(e.convocados) : "", asistentes: String(e.asistentes || ""), evaluados: evaluada && e.evaluados ? String(e.evaluados) : "", aprobados: evaluada && e.evaluados ? String(e.aprobaron || 0) : "",
      lista: e.hoja ? `Hoja ${e.hoja}` : "", estado: "Ejecutada", origen: "lista:" + e.id });
  }
  return filas.sort((a, b) => a.ejecutada.localeCompare(b.ejecutada));
}

// Todas las inducciones del periodo se resumen en UNA fila (no una por trabajador)
export function filaDesdeInducciones(inducciones, desde, hasta, yaTraidos = []) {
  const del = (inducciones || []).filter((x) => enPeriodo(x.fecha, desde, hasta));
  if (!del.length || yaTraidos.includes("induccion:" + (desde || "") + "_" + (hasta || ""))) return null;
  const conNota = del.filter((x) => x.nota !== null && x.nota !== undefined);
  const ultima = del.map((x) => x.fecha).sort().slice(-1)[0];
  return { ...filaVacia(), tema: "Inducción en SST (personal nuevo)", tipo: "Inducción", dirigida: "Personal nuevo", ejecutada: ultima, capacitador: "", duracion: "",
    convocados: String(del.length), asistentes: String(del.length), evaluados: String(conNota.length), aprobados: String(conNota.filter((x) => x.resultado === "Aprobó").length),
    estado: "Ejecutada", observaciones: `${del.length} trabajadores inducidos en el periodo`, origen: "induccion:" + (desde || "") + "_" + (hasta || "") };
}


// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarCapacitaciones().
export function camposFaltantesCapacitaciones(d) {
  const f = [];
  if (!d.periodoDesde) f.push({ etiqueta: "Periodo — desde", seccion: "general" });
  if (!d.periodoHasta || (d.periodoDesde && d.periodoHasta < d.periodoDesde)) f.push({ etiqueta: "Periodo — hasta", seccion: "general" });
  if (!d.responsableNombre || !d.responsableNombre.trim()) f.push({ etiqueta: "Responsable del programa SST (nombre)", seccion: "general" });
  const filas = filasConTema(d);
  if (!filas.length) f.push({ etiqueta: "Tema de la capacitación", indice: 0, seccion: "matriz" });
  (d.filas || []).forEach((fila, i) => { if (numero(fila.aprobados) !== null && numero(fila.aprobados) > (numero(fila.evaluados) || 0)) f.push({ etiqueta: "Personas aprobadas", indice: i, seccion: "matriz" }); });
  return f;
}
