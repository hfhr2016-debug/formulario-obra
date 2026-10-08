// Evaluación de Contratistas en SST (RYR-SS-022): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda, saltoDePagina } from "./sstBase";
import { accionNueva } from "./accionesDatos";

export const CODIGO_CONTRATISTAS = "RYR-SS-022";
export const HOJA_CONTRATISTAS = "Evaluación de Contratistas";
export const CALIFICACIONES = ["Cumple", "Parcial", "No cumple", "No aplica"];
export const COLORES_CALIFICACION = { Cumple: { relleno: "00A651", fuente: "000000" }, Parcial: { relleno: "FFC000", fuente: "000000" }, "No cumple": { relleno: "C00000", fuente: "FFFFFF" }, "No aplica": { relleno: "D9D9D9", fuente: "595959" } };
export const COLORES_RESULTADO = { Satisfactorio: { relleno: "00A651", fuente: "000000" }, Aceptable: { relleno: "FFC000", fuente: "000000" }, Deficiente: { relleno: "C00000", fuente: "FFFFFF" } };
export const UMBRAL_SATISFACTORIO = 0.9;
export const UMBRAL_ACEPTABLE = 0.7;
// Los 18 criterios vienen escritos en la plantilla, en este orden
export const CRITERIOS = [
  "Todos los trabajadores afiliados a ARL, EPS y pensión", "Pago de la seguridad social al día (planilla)", "Responsable del SG-SST con licencia vigente", "Política de SST firmada y divulgada",
  "Matriz de peligros y valoración de riesgos", "Plan anual de trabajo del SG-SST", "Exámenes médicos ocupacionales de ingreso", "Inducción en SST a todo el personal",
  "Certificados vigentes de trabajo en alturas y demás competencias", "Entrega y uso de EPP, con registro", "ATS y permisos de trabajo de alto riesgo", "Inspecciones de seguridad documentadas",
  "Equipos y herramientas en buen estado (inspección preoperacional)", "Señalización, orden y aseo en el frente de trabajo", "Plan de emergencias y brigada conformada", "Botiquín y extintores disponibles",
  "Reporte e investigación oportuna de accidentes e incidentes", "Reporte de actos y condiciones inseguras"];

export const SPEC_CONTRATISTAS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista evaluado", "A", "C"], ["nit", "NIT", "H", "J"], ["contacto", "Representante o contacto", "A", "C"], ["telefono", "Teléfono", "H", "J"],
    ["actividad", "Actividad que ejecuta", "A", "C"], ["fecha", "Fecha de evaluación", "A", "C"], ["periodo", "Periodo evaluado", "E", "G"], ["trabajadores", "Trabajadores del contratista", "I", "K"],
    ["resultado", "Resultado", "K", "K", null, 1],            // la casilla donde el Excel calcula "Satisfactorio", "Aceptable" o "Deficiente": se pinta de su color
  ],
  tablas: [
    { clave: "criterios", cabecera: "No.", fin: "3. RESULTADO", finEmpieza: true, columnas: { calificacion: "H", obs: "J" }, encabezados: { calificacion: "Calificación", obs: "Observación" } },
    { clave: "mejoras", cabecera: "No.", despuesDe: "criterios", fin: "5. FIRMAS", finEmpieza: true, columnas: { accion: "B", responsable: "H", fecha: "K" }, encabezados: { accion: "Acción", responsable: "Responsable", fecha: "Fecha límite" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "evaluo", col: "C" }, { clave: "representante", col: "G" }, { clave: "residente", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CONTRATISTAS = {"proyecto":"C11","contratista":"C12","nit":"J12","contacto":"C13","telefono":"J13","actividad":"C14","fecha":"C15","periodo":"G15","trabajadores":"K15","resultado":"K38","tablas":{"criterios":{"fila0":18,"n":18,"columnas":{"calificacion":"H","obs":"J"}},"mejoras":{"fila0":42,"n":4,"columnas":{"accion":"B","responsable":"H","fecha":"K"}}},"firmas":{"evaluo":{"nombre":"C49","cargo":"C50"},"representante":{"nombre":"G49","cargo":"G50"},"residente":{"nombre":"K49","cargo":"K50"}}};
export const descubrirContratistas = (ws) => descubrirPorEtiquetas(ws, SPEC_CONTRATISTAS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const criterioNuevo = () => ({ calificacion: "", obs: "" });
export const mejoraNueva = (b = {}) => ({ accion: "", responsable: "", fecha: "", ...b });
const mejoraVacia = (m) => !(m && (texto(m.accion) || texto(m.responsable) || m.fecha));
export const mejorasConDatos = (d) => arr(d.mejoras).filter((m) => !mejoraVacia(m));

// ---------- Resultado (las mismas fórmulas del Excel) ----------
export function resultadoEvaluacion(d) {
  const c = arr(d.criterios).slice(0, CRITERIOS.length);
  const cuenta = (v) => c.filter((x) => x && x.calificacion === v).length;
  const calificados = c.filter((x) => x && texto(x.calificacion)).length;
  const aplicables = calificados - cuenta("No aplica"), cumplen = cuenta("Cumple"), parciales = cuenta("Parcial"), noCumplen = cuenta("No cumple");
  const porcentaje = aplicables > 0 ? (cumplen + parciales * 0.5) / aplicables : null;
  const resultado = porcentaje === null ? "" : porcentaje >= UMBRAL_SATISFACTORIO ? "Satisfactorio" : porcentaje >= UMBRAL_ACEPTABLE ? "Aceptable" : "Deficiente";
  return { aplicables, cumplen, parciales, noCumplen, calificados, porcentaje, resultado };
}
// Propone acciones de mejora para los criterios que NO cumplen (máximo lo que cabe en la plantilla), sin repetir las ya escritas
export function proponerMejoras(d, cupo = 4) {
  const ya = mejorasConDatos(d).map((m) => texto(m.accion).toLowerCase());
  const nuevas = [];
  arr(d.criterios).slice(0, CRITERIOS.length).forEach((c, i) => {
    if (c && c.calificacion === "No cumple") { const t = `Cumplir: ${CRITERIOS[i]}`; if (!ya.includes(t.toLowerCase())) nuevas.push(mejoraNueva({ accion: t })); }
  });
  return [...mejorasConDatos(d), ...nuevas].slice(0, cupo);
}

export function escribirContratistasEnHoja(ws, d, celdas = CELDAS_CONTRATISTAS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "nit", "contacto", "telefono", "actividad", "periodo"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.trabajadores, num(d.trabajadores) === null ? d.trabajadores : num(d.trabajadores));
  const T = C.tablas || {};
  const crit = CRITERIOS.map((_, i) => { const x = arr(d.criterios)[i] || {}; return { calificacion: x.calificacion, obs: x.obs }; });
  escribirTabla(ws, T.criterios, crit);
  // Cada calificación se pinta de su color y el resultado también (las reglas de color de Excel no viajan en la plantilla)
  if (T.criterios && T.criterios.columnas && T.criterios.columnas.calificacion) {
    crit.forEach((x, i) => { const c = COLORES_CALIFICACION[x.calificacion]; if (c) pintarCelda(ws, T.criterios.columnas.calificacion + (T.criterios.fila0 + i), "FF" + c.relleno, "FF" + c.fuente); });
  }
  const color = COLORES_RESULTADO[resultadoEvaluacion(d).resultado];
  if (color && C.resultado) pintarCelda(ws, C.resultado, "FF" + color.relleno, "FF" + color.fuente);
  escribirTabla(ws, T.mejoras, mejorasConDatos(d).map((m) => ({ accion: m.accion, responsable: m.responsable, fecha: fechaDDMMYYYY(m.fecha) })));
  if (T.criterios) saltoDePagina(ws, T.criterios.fila0 + T.criterios.n - 1);       // la hoja 2 empieza en "3. Resultado" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.evaluo) { poner(ws, F.evaluo.nombre, d.evaluoNombre); poner(ws, F.evaluo.cargo, d.evaluoCargo); }
  if (F.representante) { poner(ws, F.representante.nombre, d.representanteNombre); poner(ws, F.representante.cargo, d.representanteCargo); }
  if (F.residente) { poner(ws, F.residente.nombre, d.residenteNombre); poner(ws, F.residente.cargo, d.residenteCargo); }
}

export function validarContratistas(d) {
  const faltan = [];
  if (!texto(d.contratista)) faltan.push("el contratista evaluado");
  if (!d.fecha) faltan.push("la fecha de evaluación");
  const sin = CRITERIOS.length - resultadoEvaluacion(d).calificados;
  if (sin > 0) faltan.push(`calificar ${sin === 1 ? "el criterio que falta" : `los ${sin} criterios que faltan`}`);
  if (mejorasConDatos(d).some((m) => !texto(m.accion))) faltan.push("la acción de cada fila de mejora");
  if (!texto(d.evaluoNombre)) faltan.push("quién evalúa");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarContratistas().
export function camposFaltantesContratistas(d) {
  const f = [];
  if (!texto(d.contratista)) f.push({ etiqueta: "Contratista evaluado", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha de evaluación", seccion: "datos" });
  arr(CRITERIOS).forEach((_, i) => { const x = arr(d.criterios)[i]; if (!x || !texto(x.calificacion)) f.push({ etiqueta: `Calificación ${i + 1}`, seccion: "criterios" }); });
  arr(d.mejoras).forEach((m, i) => { if (!mejoraVacia(m) && !texto(m.accion)) f.push({ etiqueta: "Acción de mejora", indice: i, seccion: "mejoras" }); });
  if (!texto(d.evaluoNombre)) f.push({ etiqueta: "Nombre de quien evalúa", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: Acciones Correctivas trae las acciones de mejora y el Informe Mensual cuenta las evaluaciones
export function resumenContratistas(d) {
  const r = resultadoEvaluacion(d);
  return { id: `${d.fecha || "sin-fecha"}_${texto(d.contratista).toLowerCase()}`, formato: "contratista", fecha: d.fecha || "", proyecto: d.proyecto || "", contratista: d.contratista || "", nit: d.nit || "", contacto: d.contacto || "", telefono: d.telefono || "", actividad: d.actividad || "",
    aplicables: r.aplicables, cumplen: r.cumplen, parciales: r.parciales, noCumplen: r.noCumplen, porcentaje: r.porcentaje === null ? null : Math.round(r.porcentaje * 1000) / 10, resultado: r.resultado,
    mejoras: mejorasConDatos(d).map((m) => ({ accion: m.accion, responsable: m.responsable || "", fecha: m.fecha || "" })) };
}
// Acciones de mejora acordadas con los contratistas que Acciones Correctivas puede traer
export function accionesDeContratistas(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const m of arr(r.mejoras)) {
    if (!texto(m.accion)) continue;
    out.push(accionNueva({ fechaApertura: r.fecha || "", origen: "Evaluación de contratistas", ref: texto(r.contratista).slice(0, 20), hallazgo: `${r.contratista || "Contratista"}: evaluación ${r.resultado ? r.resultado.toLowerCase() : ""}${r.porcentaje !== null && r.porcentaje !== undefined ? ` (${r.porcentaje} %)` : ""}`.trim(),
      tipo: "Correctiva", accion: m.accion, responsable: m.responsable || "", fechaCompromiso: m.fecha || "", estado: "Abierta" }));
  }
  return out;
}
