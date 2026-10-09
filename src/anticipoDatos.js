// Anticipo, Amortización y Retenciones (RYR-CP-004). Lo común está en sstBase.js y cpBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { num, texto, calcularAnticipo } from "./cpBase";

export const CODIGO_ANTICIPO = "RYR-CP-004";
export const HOJA_ANTICIPO = "Anticipo y Amortización";
export const CAPACIDAD_ANTICIPO = 14;

export const SPEC_ANTICIPO = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "G", "J"],
    ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "G", "J"],
    ["fechaContrato", "Fecha del contrato", "A", "D"], ["fechaAnticipo", "Fecha del anticipo", "G", "J"],
    ["valorContrato", "Valor del contrato", "A", "D"], ["anticipoPct", "Anticipo pactado (%)", "A", "D"],
    ["amortPct", "Amortización por acta (%)", "A", "D"], ["retegarantia", "Retegarantía (%)", "A", "D"],
  ],
  tablas: [
    { clave: "actas", cabecera: "No.", fin: "TOTALES", finEmpieza: true,
      columnas: { acta: "B", fecha: "C", periodo: "D", bruto: "E", otros: "J" },
      encabezados: { acta: "Acta N°", fecha: "Fecha", periodo: "Periodo o descripción", bruto: "Valor bruto del acta", otros: "Otros descuentos" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "registro", col: "D" }, { clave: "revisa", col: "J" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ANTICIPO = {"proyecto":"D10","tipo":"J10","contrato":"D11","contratante":"J11","fechaContrato":"D12","fechaAnticipo":"J12","valorContrato":"D14","anticipoPct":"D15","amortPct":"D17","retegarantia":"D18","tablas":{"actas":{"fila0":21,"n":14,"columnas":{"acta":"B","fecha":"C","periodo":"D","bruto":"E","otros":"J"}}},"firmas":{"registro":{"nombre":"D40","cargo":"D41"},"revisa":{"nombre":"J40","cargo":"J41"}}};
export const descubrirAnticipo = (ws) => descubrirPorEtiquetas(ws, SPEC_ANTICIPO);

const arr = (a) => (Array.isArray(a) ? a : []);
export const actaNueva = (b = {}) => ({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, obraId: "", acta: "", fecha: "", periodo: "", bruto: "", otros: "", actualizado: 0, ...b });
export const actaVacia = (a) => !(a && (texto(a.acta) || texto(a.periodo) || texto(a.bruto) || texto(a.otros)));
export const actasConDatos = (lista) => arr(lista).filter((a) => !actaVacia(a));
const pct = (v) => (num(v) === null ? "" : num(v) / 100);

export function escribirAnticipoEnHoja(ws, d, celdas = CELDAS_ANTICIPO) {
  const C = celdas;
  for (const k of ["proyecto", "tipo", "contrato", "contratante"]) poner(ws, C[k], d[k]);
  for (const k of ["fechaContrato", "fechaAnticipo"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  if (num(d.valorContrato) !== null) poner(ws, C.valorContrato, num(d.valorContrato));
  for (const k of ["anticipoPct", "amortPct", "retegarantia"]) poner(ws, C[k], pct(d[k]));        // 30 -> 0,30 (la plantilla le da formato de porcentaje)
  const n = (v) => (num(v) === null ? v : num(v));
  const filas = actasConDatos(d.actas).map((a) => ({ acta: /^\d+$/.test(texto(a.acta)) ? Number(texto(a.acta)) : a.acta, fecha: fechaDDMMYYYY(a.fecha), periodo: a.periodo, bruto: n(a.bruto), otros: n(a.otros) }));
  escribirTabla(ws, (C.tablas || {}).actas, filas);        // amortización, retegarantía, neto, saldo y totales son fórmulas
  const F = C.firmas || {};
  if (F.registro) { poner(ws, F.registro.nombre, d.registroNombre); poner(ws, F.registro.cargo, d.registroCargo); }
  if (F.revisa) { poner(ws, F.revisa.nombre, d.revisaNombre); poner(ws, F.revisa.cargo, d.revisaCargo); }
}

export function validarAnticipo(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("la obra");
  if (num(d.valorContrato) === null) f.push("el valor del contrato");
  if (num(d.anticipoPct) === null) f.push("el porcentaje del anticipo");
  if (num(d.amortPct) === null) f.push("el porcentaje de amortización por acta");
  const xs = actasConDatos(d.actas);
  if (!xs.length) f.push("al menos un acta");
  else {
    if (xs.some((x) => !texto(x.acta))) f.push("el número de cada acta");
    if (xs.some((x) => !x.fecha)) f.push("la fecha de cada acta");
    if (xs.some((x) => num(x.bruto) === null)) f.push("el valor bruto de cada acta");
  }
  if (!texto(d.registroNombre)) f.push("quien registra");
  return f;
}
export function camposFaltantesAnticipo(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (num(d.valorContrato) === null) f.push({ etiqueta: "Valor del contrato", seccion: "datos" });
  if (num(d.anticipoPct) === null) f.push({ etiqueta: "Anticipo pactado (%)", seccion: "condiciones" });
  if (num(d.amortPct) === null) f.push({ etiqueta: "Amortización por acta (%)", seccion: "condiciones" });
  const xs = arr(d.actas);
  if (!actasConDatos(xs).length) f.push({ etiqueta: "Acta N°", indice: 0, seccion: "actas" });
  else xs.forEach((x, i) => {
    if (actaVacia(x)) return;
    if (!texto(x.acta)) f.push({ etiqueta: "Acta N°", indice: i, seccion: "actas" });
    if (!x.fecha) f.push({ etiqueta: "Fecha", indice: i, seccion: "actas" });
    if (num(x.bruto) === null) f.push({ etiqueta: "Valor bruto del acta", indice: i, seccion: "actas" });
  });
  if (!texto(d.registroNombre)) f.push({ etiqueta: "Nombre de quien registra", seccion: "firmas" });
  return f;
}
export function resumenAnticipo(obra, actas) {
  const c = calcularAnticipo(obra, actasConDatos(actas));
  return { valorAnticipo: c.valorAnticipo, amortizado: c.totales.amort, saldo: c.totales.saldo, retegarantia: c.totales.reteg, actas: actasConDatos(actas).length };
}
