// Indicadores ambientales (RYR-AM-018): datos y lógica propios de este formato. Lo común está en sstBase.js.
// El Excel decide "Cumple / No cumple" con sus fórmulas; la app escribe el sentido, la meta, el resultado del mes y el acumulado (como NÚMEROS).
// Los resultados se pueden traer de lo ya registrado en la app (residuos, consumos, incidentes, quejas, acciones e inspecciones).
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { rangoMes, MESES, valoresIndicadores, consolidarPeriodo } from "./consolidadoAmb";

export const CODIGO_INDICADORES_AMB = "RYR-AM-018";
export const HOJA_INDICADORES_AMB = "Indicadores Ambientales";
export { MESES };
export const SENTIDOS = ["≥", "≤"];
// Los 14 indicadores del formato, en su orden. "calc" es el nombre del cálculo automático (null = se escribe a mano).
export const INDICADORES = [
  { id: "aprovechados", texto: "Residuos aprovechados del total generado", unidad: "%", sentido: "≥", calc: "aprovechados" },
  { id: "rcdAprov", texto: "RCD aprovechados o reutilizados", unidad: "%", sentido: "≥", calc: null },
  { id: "ordinarios", texto: "Residuos ordinarios enviados a relleno", unidad: "kg", sentido: "≤", calc: "ordinarios" },
  { id: "respel", texto: "Residuos peligrosos generados", unidad: "kg", sentido: "≤", calc: "respel" },
  { id: "respelManifiesto", texto: "Residuos peligrosos entregados con manifiesto", unidad: "%", sentido: "≥", calc: null },
  { id: "agua", texto: "Consumo de agua", unidad: "m³", sentido: "≤", calc: "agua" },
  { id: "aguaTrab", texto: "Consumo de agua por trabajador", unidad: "L/trab·día", sentido: "≤", calc: "aguaTrab" },
  { id: "energia", texto: "Consumo de energía", unidad: "kWh", sentido: "≤", calc: "energia" },
  { id: "combustible", texto: "Consumo de combustible", unidad: "gal", sentido: "≤", calc: "combustible" },
  { id: "incidentes", texto: "Incidentes ambientales", unidad: "N°", sentido: "≤", calc: "incidentes" },
  { id: "quejas", texto: "Quejas de la comunidad recibidas", unidad: "N°", sentido: "≤", calc: "quejas" },
  { id: "quejasATiempo", texto: "Quejas atendidas a tiempo", unidad: "%", sentido: "≥", calc: "quejasATiempo" },
  { id: "cumplimientoPlan", texto: "Cumplimiento del plan de manejo ambiental", unidad: "%", sentido: "≥", calc: "cumplimientoPlan" },
  { id: "accionesATiempo", texto: "Acciones correctivas cerradas a tiempo", unidad: "%", sentido: "≥", calc: "accionesATiempo" },
];

export const SPEC_INDICADORES_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["mes", "Mes", "A", "C"],
    ["anio", "Año", "E", "G"],
    ["trabajadores", "Trabajadores (promedio)", "I", "K"],
    ["elaboro", "Elaboró", "A", "C"],
    ["fechaElaboracion", "Fecha de elaboración", "H", "J"],
    ["analisis", "Análisis de los indicadores que no cumplen", "A", "C"],
    ["acciones", "Acciones a tomar", "A", "C"],
  ],
  tablas: [
    { clave: "indicadores", cabecera: "No.", fin: "Indicadores medidos", finEmpieza: true, numerada: true,
      columnas: { sentido: "F", meta: "G", mes: "H", acum: "J" },
      encabezados: { sentido: "Sentido", meta: "Meta", mes: "Resultado del mes", acum: "Acumulado" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
export const CELDAS_INDICADORES_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","mes":"C13","anio":"G13","trabajadores":"K13","elaboro":"C14","fechaElaboracion":"J14","analisis":"C35","acciones":"C36","tablas":{"indicadores":{"fila0":17,"n":14,"filas":[17,18,19,20,21,22,23,24,25,26,27,28,29,30],"columnas":{"sentido":"F","meta":"G","mes":"H","acum":"J"}}},"firmas":{"elaboro":{"nombre":"C40","cargo":"C41"},"reviso":{"nombre":"G40","cargo":"G41"},"vobo":{"nombre":"K40","cargo":"K41"}}};
export const descubrirIndicadoresAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_INDICADORES_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numero = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const indicadorNuevo = (def) => ({ sentido: def.sentido, meta: "", mes: "", acum: "" });
export const indicadoresIniciales = () => INDICADORES.map(indicadorNuevo);
export const indiceMes = (m) => MESES.indexOf(m);
const conResultado = (i) => numero((i || {}).mes) !== null;
export const indicadoresConResultado = (d) => arr(d.indicadores).filter(conResultado);

// "Cumple" o "No cumple" (igual que el Excel); "" si falta la meta o el resultado
export function cumpleIndicador(i) {
  const meta = numero((i || {}).meta), res = numero((i || {}).mes);
  if (meta === null || res === null) return "";
  return (i.sentido === "≤" ? res <= meta : res >= meta) ? "Cumple" : "No cumple";
}
export function conteoCumplimiento(d) {
  const r = arr(d.indicadores).map(cumpleIndicador);
  const cumplen = r.filter((x) => x === "Cumple").length, noCumplen = r.filter((x) => x === "No cumple").length;
  return { medidos: cumplen + noCumplen, cumplen, noCumplen, porcentaje: cumplen + noCumplen ? Math.round((cumplen / (cumplen + noCumplen)) * 100) : null };
}

// ---------- Traer lo ya registrado en la app ----------
// Periodo del mes elegido y acumulado desde enero hasta ese mes. Completa SOLO las casillas vacías.
export function completarConRegistradoAmb(d, regs) {
  const idx = indiceMes(d.mes);
  if (idx < 0 || !/^\d{4}$/.test(texto(d.anio))) return { indicadores: arr(d.indicadores), llenadas: 0, trabajadores: null };
  const mes = rangoMes(d.anio, idx), anio = { desde: `${d.anio}-01-01`, hasta: mes.hasta };
  const delMes = valoresIndicadores(mes.desde, mes.hasta, regs), acumulado = valoresIndicadores(anio.desde, anio.hasta, regs);
  let llenadas = 0;
  const nuevos = INDICADORES.map((def, k) => {
    const cur = { ...indicadorNuevo(def), ...(arr(d.indicadores)[k] || {}) };
    if (!def.calc) return cur;
    if (texto(cur.mes) === "" && delMes[def.calc] !== null && delMes[def.calc] !== undefined) { cur.mes = String(delMes[def.calc]); llenadas++; }
    if (texto(cur.acum) === "" && acumulado[def.calc] !== null && acumulado[def.calc] !== undefined) { cur.acum = String(acumulado[def.calc]); llenadas++; }
    return cur;
  });
  const trab = consolidarPeriodo(mes.desde, mes.hasta, regs).consumos.trabajadores;
  return { indicadores: nuevos, llenadas, trabajadores: trab };
}
// Metas (y sentido) del último mes guardado, para no escribirlas cada mes
export function metasDelUltimoGuardado(resumenes) {
  const ult = arr(resumenes).slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
  return ult && arr(ult.indicadores).length ? ult.indicadores.map((i) => ({ sentido: i.sentido, meta: i.meta })) : null;
}

// ---------- Escribir en la hoja ----------
export function escribirIndicadoresAmbEnHoja(ws, d, celdas = CELDAS_INDICADORES_AMB, hoyISO = "") {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "mes", "analisis", "acciones"]) poner(ws, C[k], d[k]);
  const a = numero(d.anio); poner(ws, C.anio, a === null ? d.anio : a);
  const t = numero(d.trabajadores); poner(ws, C.trabajadores, t === null ? "" : t);
  poner(ws, C.elaboro, d.elaboroNombre);
  poner(ws, C.fechaElaboracion, fechaDDMMYYYY(d.fechaElaboracion || hoyISO));
  const T = C.tablas || {};
  const n = (v) => { const x = numero(v); return x === null ? "" : x; };
  escribirTabla(ws, T.indicadores, INDICADORES.map((def, k) => { const i = { ...indicadorNuevo(def), ...(arr(d.indicadores)[k] || {}) }; return { sentido: i.sentido || def.sentido, meta: n(i.meta), mes: n(i.mes), acum: n(i.acum) }; }));
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarIndicadoresAmb(d) {
  const faltan = [];
  if (indiceMes(d.mes) < 0) faltan.push("el mes");
  if (!/^\d{4}$/.test(texto(d.anio))) faltan.push("el año (4 cifras)");
  if (!indicadoresConResultado(d).length) faltan.push("el resultado de al menos un indicador");
  if (arr(d.indicadores).some((i) => conResultado(i) && numero(i.meta) === null)) faltan.push("la meta de los indicadores que tienen resultado");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarIndicadoresAmb().
export function camposFaltantesIndicadoresAmb(d) {
  const f = [];
  if (indiceMes(d.mes) < 0) f.push({ etiqueta: "Mes", seccion: "datos" });
  if (!/^\d{4}$/.test(texto(d.anio))) f.push({ etiqueta: "Año", seccion: "datos" });
  if (!indicadoresConResultado(d).length) f.push({ etiqueta: "Resultado del mes", indice: 0, seccion: "indicadores" });
  arr(d.indicadores).forEach((i, k) => { if (conResultado(i) && numero(i.meta) === null) f.push({ etiqueta: "Meta", indice: k, seccion: "indicadores" }); });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: lo usan los informes mensual y trimestral y el Resumen para el ICA
export function resumenIndicadoresAmb(d) {
  const c = conteoCumplimiento(d);
  const idx = indiceMes(d.mes);
  return { id: `${texto(d.anio)}-${String(idx + 1).padStart(2, "0")}`, formato: "indicadores-amb", anio: texto(d.anio), mes: d.mes || "", proyecto: texto(d.proyecto),
    indicadores: INDICADORES.map((def, k) => { const i = { ...indicadorNuevo(def), ...(arr(d.indicadores)[k] || {}) }; return { id: def.id, texto: def.texto, unidad: def.unidad, sentido: i.sentido, meta: i.meta, mes: i.mes, acum: i.acum, cumple: cumpleIndicador(i) }; }),
    medidos: c.medidos, cumplen: c.cumplen, noCumplen: c.noCumplen, porcentaje: c.porcentaje };
}
