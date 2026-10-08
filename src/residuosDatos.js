// Registro de Residuos (RYR-AM-002): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_RESIDUOS = "RYR-AM-002";
export const HOJA_RESIDUOS = "Registro de Residuos";
export const TIPOS_RESIDUO = ["RCD (escombros)", "Aprovechable", "Ordinario", "Orgánico / vegetal", "Peligroso (RESPEL)", "Especial / aceites usados"];
export const UNIDADES_RES = ["m³", "kg", "t", "gal", "und"];
export const DESTINOS_RES = ["Disposición final", "Aprovechamiento", "Reutilización en obra", "Almacenado en obra"];
export const ALMACENAMIENTOS = ["Contenedor en obra", "Acopio cubierto", "Acopio a la intemperie", "Cuarto de residuos", "Caneca o tanque rotulado", "Punto ecológico"];
// Sugerencia de descripción según el tipo (se puede cambiar)
export const DESCRIPCIONES = {
  "RCD (escombros)": ["Escombros de demolición", "Concreto y mortero", "Tierra y material de excavación", "Ladrillo y cerámica"],
  "Aprovechable": ["Cartón y papel", "Plástico", "Metales y chatarra", "Madera", "Vidrio"],
  "Ordinario": ["Residuos de oficina y comedor", "Residuos de barrido"],
  "Orgánico / vegetal": ["Material vegetal de poda", "Restos de comida"],
  "Peligroso (RESPEL)": ["Envases de pintura o solventes", "Estopas impregnadas", "Filtros y baterías", "Residuos con asbesto"],
  "Especial / aceites usados": ["Aceite usado de maquinaria", "Llantas usadas", "Aceite hidráulico"],
};

export const SPEC_RESIDUOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"], ["contratista", "Contratista / Empresa", "A", "D"],
    ["periodo", "Periodo", "I", "J"], ["hoja", "Hoja N°", "K", "L"], ["desde", "Desde", "I", "J"], ["hasta", "Hasta", "K", "L"],
  ],
  tablas: [
    { clave: "registros", cabecera: "No.", fin: "3. RESUMEN DEL PERIODO", finEmpieza: true,
      columnas: { fecha: "B", tipo: "C", descripcion: "D", actividad: "E", cantidad: "F", unidad: "G", almacenamiento: "H", destino: "I", gestor: "J", manifiesto: "K", responsable: "L" },
      encabezados: { fecha: "Fecha", tipo: "Tipo de residuo", descripcion: "Descripción del residuo", actividad: "Actividad u origen", cantidad: "Cantidad", unidad: "Unidad", almacenamiento: "Almacenamiento", destino: "Destino", gestor: "Gestor o receptor", manifiesto: "N° manifiesto o certificado", responsable: "Responsable" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "H" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_RESIDUOS = {"proyecto":"D11","contratista":"D12","periodo":"J11","hoja":"L11","desde":"J12","hasta":"L12","tablas":{"registros":{"fila0":15,"n":25,"columnas":{"fecha":"B","tipo":"C","descripcion":"D","actividad":"E","cantidad":"F","unidad":"G","almacenamiento":"H","destino":"I","gestor":"J","manifiesto":"K","responsable":"L"}}},"firmas":{"elaboro":{"nombre":"C52","cargo":"C53"},"reviso":{"nombre":"H52","cargo":"H53"},"vobo":{"nombre":"K52","cargo":"K53"}}};
export const descubrirResiduos = (ws) => descubrirPorEtiquetas(ws, SPEC_RESIDUOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numeroPositivo = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const registroNuevo = (base = {}) => ({ fecha: "", tipo: "", descripcion: "", actividad: "", cantidad: "", unidad: "", almacenamiento: "", destino: "", gestor: "", manifiesto: "", responsable: "", origen: "", ...base });
const vacio = (r) => !(r.tipo || r.descripcion || r.actividad || texto(r.cantidad) || r.gestor || r.manifiesto);
export const registrosConDatos = (d) => arr(d.registros).filter((r) => !vacio(r)).sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const periodoTexto = (iso) => { const m = /^(\d{4})-(\d{2})$/.exec(texto(iso)); return m ? `${MESES[Number(m[2]) - 1][0].toUpperCase()}${MESES[Number(m[2]) - 1].slice(1)} de ${m[1]}` : texto(iso); };
// "1" -> "2", "1 de 3" -> "2 de 3"
export function siguienteHojaRes(hoja) { const m = /^(\s*)(\d+)(.*)$/.exec(String(hoja || "")); return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : ""; }

// Totales por tipo y unidad (lo mismo que calcula la hoja con SUMIFS)
export function totalesPorTipo(d) {
  const t = {};
  for (const r of registrosConDatos(d)) {
    const n = numeroPositivo(r.cantidad); if (n === null || !r.tipo || !r.unidad) continue;
    t[r.tipo] = t[r.tipo] || {}; t[r.tipo][r.unidad] = Math.round(((t[r.tipo][r.unidad] || 0) + n) * 1000) / 1000;
  }
  return t;
}

export function escribirResiduosEnHoja(ws, d, celdas = CELDAS_RESIDUOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "hoja"]) poner(ws, C[k], d[k]);
  poner(ws, C.periodo, periodoTexto(d.periodo));
  poner(ws, C.desde, fechaDDMMYYYY(d.desde)); poner(ws, C.hasta, fechaDDMMYYYY(d.hasta));
  const filas = registrosConDatos(d).map((r) => ({ ...r, fecha: fechaDDMMYYYY(r.fecha), cantidad: numeroPositivo(r.cantidad) === null ? "" : numeroPositivo(r.cantidad) }));
  const T = (C.tablas || {}).registros;
  escribirTabla(ws, T, filas);
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarResiduos(d) {
  const faltan = [];
  if (!texto(d.proyecto)) faltan.push("el nombre del proyecto");
  if (!d.desde) faltan.push("la fecha «Desde»");
  if (!d.hasta) faltan.push("la fecha «Hasta»");
  else if (d.desde && d.hasta < d.desde) faltan.push("que «Hasta» no sea anterior a «Desde»");
  const rs = registrosConDatos(d);
  if (!rs.length) { faltan.push("al menos un registro de residuos"); }
  else {
    if (rs.some((r) => !r.fecha)) faltan.push("la fecha de cada registro");
    if (rs.some((r) => !r.tipo)) faltan.push("el tipo de residuo de cada registro");
    if (rs.some((r) => !(numeroPositivo(r.cantidad) > 0))) faltan.push("la cantidad (mayor que 0) de cada registro");
    if (rs.some((r) => !r.unidad)) faltan.push("la unidad de cada registro");
    if (rs.some((r) => !r.destino)) faltan.push("el destino de cada registro");
  }
  if (!texto(d.elaboroNombre)) faltan.push("quién registra");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo). Mismo orden que validarResiduos().
export function camposFaltantesResiduos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.desde) f.push({ etiqueta: "Desde", seccion: "datos" });
  if (!d.hasta) f.push({ etiqueta: "Hasta", seccion: "datos" });
  else if (d.desde && d.hasta < d.desde) f.push({ etiqueta: "Hasta", seccion: "datos" });
  const todos = arr(d.registros); const rs = registrosConDatos(d);
  if (!rs.length) f.push({ etiqueta: "Cantidad", indice: 0, seccion: "registros" });
  else todos.forEach((r, i) => {
    if (!rs.includes(r)) return;
    if (!r.fecha) f.push({ etiqueta: "Fecha del registro", indice: i, seccion: "registros" });
    if (!r.tipo) f.push({ etiqueta: "Tipo de residuo", indice: i, seccion: "registros" });
    if (!(numeroPositivo(r.cantidad) > 0)) f.push({ etiqueta: "Cantidad", indice: i, seccion: "registros" });
    if (!r.unidad) f.push({ etiqueta: "Unidad", indice: i, seccion: "registros" });
    if (!r.destino) f.push({ etiqueta: "Destino", indice: i, seccion: "registros" });
  });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien registra", seccion: "firmas" });
  return f;
}

export function resumenResiduos(d) {
  const rs = registrosConDatos(d);
  return { id: `${texto(d.proyecto).toLowerCase()}|${d.desde}|${texto(d.hoja)}`, formato: "residuos", proyecto: texto(d.proyecto), hoja: texto(d.hoja), desde: d.desde, hasta: d.hasta, registros: rs.length, totales: totalesPorTipo(d) };
}
