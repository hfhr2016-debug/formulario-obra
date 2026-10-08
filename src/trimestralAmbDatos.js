// Informe Trimestral Ambiental (RYR-AM-021): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Consolida los 3 meses del trimestre: toma lo que dicen los Informes Mensuales guardados y, si un mes no tiene informe, lo que hay registrado en los demás formatos.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { consolidarPeriodo, rangoMes, MESES } from "./consolidadoAmb";

export const CODIGO_TRIMESTRAL_AMB = "RYR-AM-021";
export const HOJA_TRIMESTRAL_AMB = "Informe Trimestral Ambiental";
export const TRIMESTRES = ["I (ene-mar)", "II (abr-jun)", "III (jul-sep)", "IV (oct-dic)"];
// Los 12 conceptos vienen escritos en la plantilla, en este orden
export const CONCEPTOS_TRIM_AMB = [
  { id: "ordinarios", texto: "Residuos ordinarios (kg)" }, { id: "aprovechables", texto: "Residuos aprovechables (kg)" }, { id: "rcd", texto: "RCD generados (m³)" }, { id: "respel", texto: "Residuos peligrosos (kg)" },
  { id: "agua", texto: "Consumo de agua (m³)" }, { id: "energia", texto: "Consumo de energía (kWh)" }, { id: "combustible", texto: "Consumo de combustible (gal)" }, { id: "incidentes", texto: "Incidentes ambientales (N°)" },
  { id: "quejas", texto: "Quejas de la comunidad (N°)" }, { id: "inspecciones", texto: "Inspecciones ambientales (N°)" }, { id: "capacitaciones", texto: "Capacitaciones ambientales (N°)" }, { id: "accionesCerradas", texto: "Acciones correctivas cerradas (N°)" },
];

export const SPEC_TRIMESTRAL_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["trimestre", "Trimestre", "A", "C"], ["anio", "Año", "E", "G"], ["nInforme", "Informe N°", "I", "K"],
    ["desde", "Periodo desde", "A", "C"], ["hasta", "Periodo hasta", "E", "G"], ["avance", "% avance de obra", "I", "K"],
    ["cumplPlan", "Cumplimiento del plan de manejo (%)", "A", "A", null, 1], ["medidos", "Indicadores medidos", "D", "D", null, 1], ["cumplen", "Indicadores que cumplen", "G", "G", null, 1], ["abiertas", "Acciones abiertas al cierre", "J", "J", null, 1],
    ["resultados", "Resultados y tendencias", "A", "C"], ["hallazgos", "Hallazgos principales", "A", "C"], ["mejoras", "Acciones de mejora y plan del próximo trimestre", "A", "C"],
  ],
  tablas: [
    { clave: "conceptos", cabecera: "No.", fin: "3. CUMPLIMIENTO DEL TRIMESTRE", finEmpieza: true, columnas: { m1: "F", m2: "G", m3: "H", meta: "K" }, encabezados: { m1: "Mes 1", m2: "Mes 2", m3: "Mes 3", meta: "Meta" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_TRIMESTRAL_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","trimestre":"C13","anio":"G13","nInforme":"K13","desde":"C14","hasta":"G14","avance":"K14","cumplPlan":"A31","medidos":"D31","cumplen":"G31","abiertas":"J31","resultados":"C33","hallazgos":"C34","mejoras":"C35","tablas":{"conceptos":{"fila0":17,"n":12,"columnas":{"m1":"F","m2":"G","m3":"H","meta":"K"}}},"firmas":{"elaboro":{"nombre":"C39","cargo":"C40"},"reviso":{"nombre":"G39","cargo":"G40"},"vobo":{"nombre":"K39","cargo":"K40"}}};
export const descubrirTrimestralAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_TRIMESTRAL_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
export const conceptoNuevo = () => ({ m1: "", m2: "", m3: "", meta: "" });
export const indiceTrimestre = (t) => TRIMESTRES.indexOf(t);
// Los 3 meses (índices 0-11) del trimestre y el rango de fechas completo
export const mesesDelTrimestre = (t) => { const q = indiceTrimestre(t); return q < 0 ? [] : [q * 3, q * 3 + 1, q * 3 + 2]; };
export function rangoTrimestre(t, anio) {
  const ms = mesesDelTrimestre(t);
  if (!ms.length || !/^\d{4}$/.test(texto(anio))) return { desde: "", hasta: "" };
  return { desde: rangoMes(anio, ms[0]).desde, hasta: rangoMes(anio, ms[2]).hasta };
}
export const nombresMesesTrimestre = (t) => mesesDelTrimestre(t).map((i) => MESES[i]);
// El cumplimiento se escribe en % (90) y el formato lo guarda como fracción (0,9) con formato de porcentaje
const fraccion = (v) => { const n = num(v); return n === null ? "" : n / 100; };

export function escribirTrimestralAmbEnHoja(ws, d, celdas = CELDAS_TRIMESTRAL_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "trimestre", "resultados", "hallazgos", "mejoras"]) poner(ws, C[k], d[k]);
  for (const k of ["anio", "nInforme", "medidos", "cumplen", "abiertas"]) poner(ws, C[k], numOTexto(d[k]));
  poner(ws, C.desde, fechaDDMMYYYY(d.desde)); poner(ws, C.hasta, fechaDDMMYYYY(d.hasta));
  poner(ws, C.avance, fraccion(d.avance)); poner(ws, C.cumplPlan, fraccion(d.cumplPlan));
  const T = C.tablas || {};
  escribirTabla(ws, T.conceptos, CONCEPTOS_TRIM_AMB.map((_, i) => { const x = arr(d.conceptos)[i] || {}; return { m1: numOTexto(x.m1), m2: numOTexto(x.m2), m3: numOTexto(x.m3), meta: numOTexto(x.meta) }; }));
  // Los títulos "Mes 1, Mes 2, Mes 3" pasan a ser los nombres de los meses del trimestre
  if (T.conceptos && T.conceptos.columnas) {
    const nombres = nombresMesesTrimestre(d.trimestre), fila = T.conceptos.fila0 - 1;
    ["m1", "m2", "m3"].forEach((k, i) => { if (nombres[i] && T.conceptos.columnas[k]) poner(ws, T.conceptos.columnas[k] + fila, nombres[i]); });
    saltoDePagina(ws, T.conceptos.fila0 + T.conceptos.n - 1);                                // la hoja 2 empieza en "3. Cumplimiento del trimestre"
  }
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

const fueraDe100 = (v) => texto(v) !== "" && (num(v) === null || num(v) < 0 || num(v) > 100);
export function validarTrimestralAmb(d) {
  const faltan = [];
  if (indiceTrimestre(d.trimestre) < 0) faltan.push("el trimestre");
  if (!/^\d{4}$/.test(texto(d.anio))) faltan.push("el año (4 cifras)");
  if (fueraDe100(d.avance)) faltan.push("el % de avance de obra (entre 0 y 100)");
  if (fueraDe100(d.cumplPlan)) faltan.push("el cumplimiento del plan de manejo (entre 0 y 100)");
  if (num(d.cumplen) !== null && num(d.medidos) !== null && num(d.cumplen) > num(d.medidos)) faltan.push("que los indicadores que cumplen no sean más que los medidos");
  if (!arr(d.conceptos).some((x) => x && (texto(x.m1) !== "" || texto(x.m2) !== "" || texto(x.m3) !== ""))) faltan.push("la cifra de al menos un concepto (puede ser 0)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarTrimestralAmb().
export function camposFaltantesTrimestralAmb(d) {
  const f = [];
  if (indiceTrimestre(d.trimestre) < 0) f.push({ etiqueta: "Trimestre", seccion: "datos" });
  if (!/^\d{4}$/.test(texto(d.anio))) f.push({ etiqueta: "Año", seccion: "datos" });
  if (fueraDe100(d.avance)) f.push({ etiqueta: "% avance de obra", seccion: "datos" });
  if (fueraDe100(d.cumplPlan)) f.push({ etiqueta: "Cumplimiento del plan de manejo (%)", seccion: "cumplimiento" });
  if (num(d.cumplen) !== null && num(d.medidos) !== null && num(d.cumplen) > num(d.medidos)) f.push({ etiqueta: "Indicadores que cumplen", seccion: "cumplimiento" });
  if (!arr(d.conceptos).some((x) => x && (texto(x.m1) !== "" || texto(x.m2) !== "" || texto(x.m3) !== ""))) f.push({ etiqueta: "Mes 1", indice: 0, seccion: "consolidado" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// ---------- Traer lo ya registrado ----------
const delConsolidado = (c) => ({ ordinarios: c.residuos.ordinarios, aprovechables: c.residuos.aprovechables, rcd: c.residuos.rcd, respel: c.residuos.respel, agua: c.consumos.agua, energia: c.consumos.energia,
  combustible: c.consumos.combustible, incidentes: c.incidentes, quejas: c.quejas, inspecciones: c.inspecciones, capacitaciones: c.capacitaciones, accionesCerradas: c.accionesCerradas });
// Completa SOLO las casillas vacías. Por cada mes: el Informe Mensual guardado (sus cifras, incluso un 0 escrito a propósito) o, si no existe, lo registrado en los demás formatos (sin ceros inventados).
export function rellenarTrimestreDesdeRegistros(d, regs, mensuales = [], indicadores = []) {
  const ms = mesesDelTrimestre(d.trimestre);
  if (!ms.length || !/^\d{4}$/.test(texto(d.anio))) return { llenadas: 0, cambios: {}, deMensual: 0 };
  let llenadas = 0, deMensual = 0;
  const poner0 = (valor, actual, cero = false) => { if (texto(actual) === "" && valor !== null && valor !== undefined && (cero || Number(valor) !== 0)) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const porMes = ms.map((m) => {
    const id = `${d.anio}-${String(m + 1).padStart(2, "0")}`;
    const men = arr(mensuales).find((x) => x.id === id);
    if (men) { deMensual++; return { valores: men.valores || {}, cero: true }; }
    const r = rangoMes(d.anio, m);
    return { valores: delConsolidado(consolidarPeriodo(r.desde, r.hasta, regs)), cero: false };
  });
  const conceptos = CONCEPTOS_TRIM_AMB.map((def, i) => {
    const x = { ...conceptoNuevo(), ...(arr(d.conceptos)[i] || {}) };
    ["m1", "m2", "m3"].forEach((k, j) => { x[k] = poner0((porMes[j].valores || {})[def.id], x[k], porMes[j].cero); });
    return x;
  });
  const { desde, hasta } = rangoTrimestre(d.trimestre, d.anio);
  const c = consolidarPeriodo(desde, hasta, regs);
  // Indicadores del último mes del trimestre que tenga el formato de Indicadores guardado
  const ultimoInd = ms.slice().reverse().map((m) => arr(indicadores).find((x) => x.id === `${d.anio}-${String(m + 1).padStart(2, "0")}`)).find(Boolean);
  const cambios = { conceptos,
    cumplPlan: poner0(c.cumplimientoInspecciones, d.cumplPlan), abiertas: poner0(c.accionesAbiertas, d.abiertas),
    medidos: poner0(ultimoInd ? ultimoInd.medidos : null, d.medidos), cumplen: poner0(ultimoInd ? ultimoInd.cumplen : null, d.cumplen, true) };
  return { llenadas, cambios, deMensual };
}

// Resumen que se guarda en el dispositivo: el Resumen para el ICA lo usa
export function resumenTrimestralAmb(d) {
  const v = (id, mes) => { const i = CONCEPTOS_TRIM_AMB.findIndex((x) => x.id === id); return num(((arr(d.conceptos)[i]) || {})[mes]); };
  const total = (id) => { const xs = ["m1", "m2", "m3"].map((m) => v(id, m)).filter((x) => x !== null); return xs.length ? xs.reduce((a, b) => a + b, 0) : null; };
  return { id: `${texto(d.anio)}-T${indiceTrimestre(d.trimestre) + 1}`, formato: "trimestral-amb", trimestre: d.trimestre || "", anio: texto(d.anio), nInforme: texto(d.nInforme), proyecto: d.proyecto || "", desde: d.desde || "", hasta: d.hasta || "",
    totales: Object.fromEntries(CONCEPTOS_TRIM_AMB.map((c) => [c.id, total(c.id)])), cumplPlan: num(d.cumplPlan), medidos: num(d.medidos), cumplen: num(d.cumplen), abiertas: num(d.abiertas), avance: num(d.avance) };
}
