// Registro de Costos Reales de Obra (RYR-CP-001): facturas, cuentas de cobro y pagos. Lo común está en sstBase.js y cpBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina, textoDe } from "./sstBase";
import { num, texto, facturaVacia, totalFactura } from "./cpBase";

export const CODIGO_COSTOS = "RYR-CP-001";
export const HOJA_COSTOS = "Registro de Costos";

export const SPEC_COSTOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "H", "K"],
    ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "H", "K"],
    ["periodo", "Mes / periodo de registro", "A", "D"], ["responsable", "Responsable del registro", "H", "K"],
  ],
  tablas: [
    { clave: "facturas", cabecera: "No.", fin: "TOTAL DEL PERIODO", finEmpieza: true,
      columnas: { fecha: "B", proveedor: "C", nit: "D", capitulo: "E", concepto: "F", tipoCosto: "G", numero: "H", valorAntes: "I", iva: "J", retenciones: "K", estado: "M", fechaPago: "N", soporte: "O" },
      encabezados: { fecha: "Fecha", proveedor: "Proveedor o beneficiario", nit: "NIT / C.C.", capitulo: "Capítulo del presupuesto", concepto: "Concepto", tipoCosto: "Tipo de costo", numero: "N° factura / cuenta de cobro",
        valorAntes: "Valor antes de IVA", iva: "IVA", retenciones: "Retenciones", estado: "Estado", fechaPago: "Fecha de pago", soporte: "Soporte (ruta o N°)" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "registro", col: "D" }, { clave: "revisa", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_COSTOS = {"proyecto":"D10","tipo":"K10","contrato":"D11","contratante":"K11","periodo":"D12","responsable":"K12","tablas":{"facturas":{"fila0":15,"n":22,"columnas":{"fecha":"B","proveedor":"C","nit":"D","capitulo":"E","concepto":"F","tipoCosto":"G","numero":"H","valorAntes":"I","iva":"J","retenciones":"K","estado":"M","fechaPago":"N","soporte":"O"}}},"firmas":{"registro":{"nombre":"D55","cargo":"D56"},"revisa":{"nombre":"K55","cargo":"K56"}}};
export const descubrirCostos = (ws) => descubrirPorEtiquetas(ws, SPEC_COSTOS);

export const CAPACIDAD_COSTOS = 22;

const arr = (a) => (Array.isArray(a) ? a : []);
export const facturasConDatos = (lista) => arr(lista).filter((f) => !facturaVacia(f));
// Las facturas del periodo, de la más antigua a la más nueva
export const facturasDelPeriodo = (lista, desde, hasta) =>
  facturasConDatos(lista).filter((f) => (!desde || !f.fecha || f.fecha >= desde) && (!hasta || !f.fecha || f.fecha <= hasta)).sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));

export function escribirCostosEnHoja(ws, d, celdas = CELDAS_COSTOS) {
  const C = celdas;
  for (const k of ["proyecto", "tipo", "contrato", "contratante", "periodo", "responsable"]) poner(ws, C[k], d[k]);
  const n = (v) => (num(v) === null ? v : num(v));
  const filas = facturasDelPeriodo(d.facturas, d.desde, d.hasta).map((f) => ({
    fecha: fechaDDMMYYYY(f.fecha), proveedor: f.proveedor, nit: f.nit, capitulo: f.capitulo, concepto: f.concepto, tipoCosto: f.tipo, numero: f.numero,
    valorAntes: n(f.valorAntes), iva: n(f.iva), retenciones: n(f.retenciones), estado: f.estado, fechaPago: fechaDDMMYYYY(f.fechaPago), soporte: f.soporte,
  }));
  escribirTabla(ws, (C.tablas || {}).facturas, filas);     // el valor total, los totales y los resúmenes son fórmulas de la plantilla
  const F = C.firmas || {};
  if (F.registro) { poner(ws, F.registro.nombre, d.registroNombre || d.responsable); poner(ws, F.registro.cargo, d.registroCargo); }
  if (F.revisa) { poner(ws, F.revisa.nombre, d.revisaNombre); poner(ws, F.revisa.cargo, d.revisaCargo); }
}

export function validarCostos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("la obra");
  if (!texto(d.periodo)) f.push("el mes o periodo de registro");
  const xs = facturasDelPeriodo(d.facturas, d.desde, d.hasta);
  if (!xs.length) f.push("al menos una factura o pago en el periodo");
  else {
    if (xs.some((x) => !x.fecha)) f.push("la fecha de cada factura");
    if (xs.some((x) => !texto(x.proveedor))) f.push("el proveedor de cada factura");
    if (xs.some((x) => !texto(x.capitulo))) f.push("el capítulo de cada factura");
    if (xs.some((x) => !texto(x.tipo))) f.push("el tipo de costo de cada factura");
    if (xs.some((x) => num(x.valorAntes) === null)) f.push("el valor de cada factura");
    if (xs.some((x) => !texto(x.estado))) f.push("el estado de pago de cada factura");
  }
  if (!texto(d.responsable)) f.push("el responsable del registro");
  return f;
}
// d.facturas son TODAS las de la obra; el índice de cada casilla en pantalla es la posición entre las que se ven (las del periodo)
export function camposFaltantesCostos(d, visibles) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!texto(d.periodo)) f.push({ etiqueta: "Mes / periodo de registro", seccion: "datos" });
  const xs = arr(visibles);
  if (!facturasConDatos(xs).length) f.push({ etiqueta: "Proveedor o beneficiario", indice: 0, seccion: "facturas" });
  else xs.forEach((x, i) => {
    if (facturaVacia(x)) return;
    if (!x.fecha) f.push({ etiqueta: "Fecha", indice: i, seccion: "facturas" });
    if (!texto(x.proveedor)) f.push({ etiqueta: "Proveedor o beneficiario", indice: i, seccion: "facturas" });
    if (!texto(x.capitulo)) f.push({ etiqueta: "Capítulo del presupuesto", indice: i, seccion: "facturas" });
    if (!texto(x.tipo)) f.push({ etiqueta: "Tipo de costo", indice: i, seccion: "facturas" });
    if (num(x.valorAntes) === null) f.push({ etiqueta: "Valor antes de IVA", indice: i, seccion: "facturas" });
    if (!texto(x.estado)) f.push({ etiqueta: `Estado ${i + 1}`, seccion: "facturas" });
  });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable", seccion: "firmas" });
  return f;
}

export function resumenCostos(lista, desde, hasta) {
  const xs = facturasDelPeriodo(lista, desde, hasta);
  const t = (f) => xs.filter(f).reduce((s, x) => s + (totalFactura(x) || 0), 0);
  return { facturas: xs.length, total: t(() => true), pagado: t((x) => x.estado === "Pagado"), pendiente: t((x) => x.estado === "Pendiente"), parcial: t((x) => x.estado === "Parcial") };
}

// ---------- Periodo ----------
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export function primerDiaMes(iso) { return iso ? iso.slice(0, 8) + "01" : ""; }
export function ultimoDiaMes(iso) {
  if (!iso) return "";
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(a, m, 0).getDate();
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
// Mes completo -> "Octubre 2026"; otro rango -> "01/10/2026 al 15/10/2026"
export function nombrePeriodo(desde, hasta) {
  if (!desde || !hasta) return "";
  if (desde.slice(0, 7) === hasta.slice(0, 7) && desde === primerDiaMes(desde) && hasta === ultimoDiaMes(hasta)) return `${cap(MESES[Number(desde.slice(5, 7)) - 1])} ${desde.slice(0, 4)}`;
  return `${fechaDDMMYYYY(desde)} al ${fechaDDMMYYYY(hasta)}`;
}
