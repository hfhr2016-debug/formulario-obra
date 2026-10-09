// Control Presupuestal · Lote 3 — Flujo de caja, Costos y rentabilidad, Cierre financiero: cálculos y datos que se traen de los otros formatos.
// Los cálculos repiten las fórmulas de las plantillas Excel (el Excel las calcula solo; aquí se usan para mostrarlas en pantalla).
import {
  num, texto, TIPOS_COSTO, totalFactura, listarFacturas, listarAdicionales, totalesAdicionales, valorConAIU, listarActasAnticipo, calcularAnticipo, actasDeObra, obtenerObra,
} from "./cpBase";
import { listarRegistros, CLAVE_CP_CUENTAS, cuentaVacia, calcCuenta } from "./cpLibros";

const arr = (a) => (Array.isArray(a) ? a : []);
const n0 = (v) => num(v) || 0;
const vacioONum = (v) => (num(v) === null ? null : num(v));
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// "2026-10" -> "octubre 2026"
export function nombreMes(ym) { const m = /^(\d{4})-(\d{2})$/.exec(texto(ym)); return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : texto(ym); }
export const mesDeFecha = (iso) => (/^\d{4}-\d{2}/.test(texto(iso)) ? texto(iso).slice(0, 7) : "");

// ---------- Flujo de caja ----------
export const CLAVE_CP_FLUJO = "ryr_cp_flujo";
const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const mesFlujoNuevo = (b = {}) => ({ id: nuevoId(), obraId: "", mes: "", ingProy: "", ingReal: "", egrProy: "", egrReal: "", actualizado: 0, ...b });
export const mesFlujoVacio = (m) => !(m && (texto(m.mes) || texto(m.ingProy) || texto(m.ingReal) || texto(m.egrProy) || texto(m.egrReal)));
const algo = (...v) => v.some((x) => num(x) !== null);
// Igual que las fórmulas de la plantilla: dos cadenas de saldo (proyectado y real). Devuelve una fila de cálculo por mes de la lista.
export function calcFlujo(saldoInicial, meses) {
  const filas = [];
  arr(meses).forEach((m, i) => {
    const p = i ? filas[i - 1] : null;                     // igual que la plantilla: cada mes mira SOLO al mes anterior
    const C = i === 0 ? n0(saldoInicial) : (p.K !== null ? p.K : p.J !== null ? p.J : null);
    const hayProy = algo(m.ingProy, m.egrProy), hayReal = algo(m.ingReal, m.egrReal);
    const H = hayProy ? n0(m.ingProy) - n0(m.egrProy) : null;
    const I = hayReal ? n0(m.ingReal) - n0(m.egrReal) : null;
    const J = !hayProy ? null : i === 0 ? n0(C) + H : (p.J === null ? n0(C) : p.J) + H;
    const K = I === null ? null : (i === 0 ? n0(C) : (p.K !== null ? p.K : p.J !== null ? p.J : n0(C))) + I;
    const L = J === null || K === null ? null : K - J;
    const v = K !== null ? K : J;
    filas.push({ C, H, I, J, K, L, estado: v === null ? "" : v < 0 ? "DÉFICIT" : "OK" });
  });
  return filas;
}
export function resumenFlujo(saldoInicial, meses) {
  const ms = arr(meses).filter((m) => !mesFlujoVacio(m)).sort((a, b) => texto(a.mes).localeCompare(texto(b.mes))), f = calcFlujo(saldoInicial, ms);
  const sum = (k) => ms.reduce((t, m) => t + n0(m[k]), 0);
  const js = f.map((x, i) => ({ j: x.J, mes: ms[i].mes })).filter((x) => x.j !== null);
  const min = js.length ? js.reduce((a, b) => (b.j < a.j ? b : a)) : null;
  const conReal = ms.filter((m) => num(m.ingReal) !== null);
  const proyConReal = conReal.reduce((t, m) => t + n0(m.ingProy), 0);
  return {
    ingProy: sum("ingProy"), egrProy: sum("egrProy"), ingReal: sum("ingReal"), egrReal: sum("egrReal"),
    menorSaldo: min ? min.j : null, mesCritico: min ? nombreMes(min.mes) : "", financiacion: min ? Math.max(0, -min.j) : null,
    recaudo: proyConReal ? sum("ingReal") / proyConReal : null,
    deficits: f.filter((x) => x.estado === "DÉFICIT").length,
  };
}
// Lo que ya pasó, por mes: ingresos = anticipo y actas cobradas (neto); egresos = facturas pagadas. Lo que está por pagar: saldos de Cuentas por Pagar por mes de vencimiento.
export function realesPorMes(obraId) {
  const r = {};
  const cur = (ym) => (r[ym] = r[ym] || { ing: 0, egr: 0, porPagar: 0 });
  const obra = obtenerObra(obraId) || {};
  const actas = listarActasAnticipo(obraId), calc = calcularAnticipo(obra, actas);
  if (calc.valorAnticipo && mesDeFecha(obra.anticipoFecha)) cur(mesDeFecha(obra.anticipoFecha)).ing += calc.valorAnticipo;
  actas.forEach((a, i) => { const ym = mesDeFecha(a.fecha); if (ym && calc.filas[i] && calc.filas[i].neto !== null) cur(ym).ing += calc.filas[i].neto; });
  listarFacturas(obraId).filter((f) => f.estado === "Pagado").forEach((f) => { const ym = mesDeFecha(f.fechaPago || f.fecha); const t = totalFactura(f); if (ym && t !== null) cur(ym).egr += t; });
  listarRegistros(CLAVE_CP_CUENTAS, obraId).filter((c) => !cuentaVacia(c)).forEach((c) => { const ym = mesDeFecha(c.fVence); const s = calcCuenta(c, "").saldo; if (ym && s > 0) cur(ym).porPagar += s; });
  return r;
}

// ---------- Datos que se traen de la app (Costos y rentabilidad / Cierre) ----------
export function costoPorTipo(obraId, hastaISO) {
  const r = {}; TIPOS_COSTO.forEach((t) => { r[t] = 0; });
  listarFacturas(obraId).filter((f) => !hastaISO || !f.fecha || f.fecha <= hastaISO).forEach((f) => { const t = TIPOS_COSTO.includes(f.tipo) ? f.tipo : "Otro"; r[t] += totalFactura(f) || 0; });
  return r;
}
export function facturadoEnActas(obraId) {
  const a = listarActasAnticipo(obraId).filter((x) => num(x.bruto) !== null);
  return a.length ? a.reduce((t, x) => t + n0(x.bruto), 0) : actasDeObra().reduce((t, x) => t + x.valor, 0);
}
export function adicionalesDeObra(obraId) {
  const ap = listarAdicionales(obraId).filter((a) => a.estado === "Aprobado").map((a) => valorConAIU(a) || 0);
  return { neto: ap.reduce((t, v) => t + v, 0), mas: ap.filter((v) => v > 0).reduce((t, v) => t + v, 0), menos: -ap.filter((v) => v < 0).reduce((t, v) => t + v, 0) };
}
export function saldoCuentasPorPagar(obraId) {
  return listarRegistros(CLAVE_CP_CUENTAS, obraId).filter((c) => !cuentaVacia(c)).reduce((t, c) => { const s = calcCuenta(c, "").saldo; return t + (s > 0 ? s : 0); }, 0);
}
const redondo = (v) => String(Math.round(v));

// ---------- Costos y rentabilidad ----------
export const SEMAFORO_TIPO = (g) => (g === null ? "" : g > 0.05 ? "ALERTA" : g > 0 ? "VIGILAR" : "OK");
export function calcInforme(d) {
  const vigente = d.valorInicial === "" && d.adicionales === "" ? null : n0(d.valorInicial) + n0(d.adicionales);
  const fact = num(d.facturado);
  const tipos = TIPOS_COSTO.map((t, i) => {
    const pres = num(d[`pres${i}`]), real = num(d[`real${i}`]);
    const dif = pres === null || real === null ? null : real - pres;
    const pd = pres === null || pres === 0 || real === null ? null : real / pres - 1;
    return { tipo: t, pres, real, dif, pd, estado: SEMAFORO_TIPO(pd) };
  });
  const costo = tipos.reduce((t, x) => t + (x.real || 0), 0);
  const presT = tipos.some((x) => x.pres !== null) ? tipos.reduce((t, x) => t + (x.pres || 0), 0) : null;
  const realConPres = tipos.filter((x) => x.pres !== null).reduce((t, x) => t + (x.real || 0), 0);
  const pdT = presT === null || presT === 0 ? null : realConPres / presT - 1;
  const utilFecha = fact ? fact - costo : null;
  const margenFecha = fact ? utilFecha / fact : null;
  const porTerminar = num(d.porTerminar);
  const costoProy = porTerminar === null ? null : costo + porTerminar;
  const utilProy = costoProy === null || !vigente ? null : vigente - costoProy;
  const margenProy = utilProy === null ? null : utilProy / vigente;
  const obj = num(d.margenObjetivo) === null ? null : num(d.margenObjetivo) / 100;
  const estado = margenProy === null ? "" : margenProy <= 0 ? "ALERTA" : obj !== null && margenProy < obj ? "VIGILAR" : "OK";
  return { vigente, pctFact: vigente && fact !== null ? fact / vigente : null, tipos, costo, presT, difT: presT === null ? null : realConPres - presT, pdT, estadoT: SEMAFORO_TIPO(pdT), utilFecha, margenFecha, costoProy, utilProy, margenProy, estado };
}
export function traerInforme(obraId, obra, corteISO) {
  const ad = adicionalesDeObra(obraId), costos = costoPorTipo(obraId, corteISO), out = {};
  if (num(obra.valorContrato) !== null) out.valorInicial = redondo(num(obra.valorContrato));
  out.adicionales = redondo(ad.neto);
  const f = facturadoEnActas(obraId); if (f) out.facturado = redondo(f);
  TIPOS_COSTO.forEach((t, i) => { out[`real${i}`] = costos[t] ? redondo(costos[t]) : ""; });
  return out;
}

// ---------- Cierre financiero ----------
export const UNIDADES_CIERRE = { edificacion: "m² construidos", vias: "km", hidrocarburos: "ml (metros lineales)" };
export function calcCierre(d) {
  const hay = num(d.valorInicial) !== null;
  const valorFinal = hay ? n0(d.valorInicial) + n0(d.adicionales) - n0(d.deductivos) : null;
  const saldoFact = valorFinal === null ? null : valorFinal - n0(d.facturado);
  const costos = TIPOS_COSTO.map((t, i) => ({ tipo: t, real: num(d[`real${i}`]) }));
  const costo = costos.reduce((t, x) => t + (x.real || 0), 0);
  const utilidad = valorFinal ? valorFinal - costo : null;
  const margen = utilidad === null ? null : utilidad / valorFinal;
  const pact = num(d.utilidadPactada) === null ? null : num(d.utilidadPactada) / 100;
  const dif = margen === null || pact === null ? null : margen - pact;
  const resultado = margen === null ? "" : margen <= 0 ? "PÉRDIDA" : pact !== null && margen < pact ? "POR DEBAJO DE LO PACTADO" : "CUMPLE LO PACTADO";
  const cant = num(d.cantidad);
  const costoU = cant ? costo / cant : null, valorU = cant && valorFinal !== null ? valorFinal / cant : null;
  return { valorFinal, saldoFact, costos, costo, utilidad, margen, dif, resultado, costoU, valorU, utilU: costoU === null || valorU === null ? null : valorU - costoU, anticipoSin: num(d.anticipoEntregado) === null ? null : n0(d.anticipoEntregado) - n0(d.anticipoAmortizado) };
}
export function traerCierre(obraId, obra, corteISO) {
  const ad = adicionalesDeObra(obraId), costos = costoPorTipo(obraId, corteISO), out = {};
  if (num(obra.valorContrato) !== null) out.valorInicial = redondo(num(obra.valorContrato));
  out.adicionales = redondo(ad.mas); out.deductivos = redondo(ad.menos);
  const f = facturadoEnActas(obraId); if (f) out.facturado = redondo(f);
  TIPOS_COSTO.forEach((t, i) => { out[`real${i}`] = costos[t] ? redondo(costos[t]) : ""; });
  const actas = listarActasAnticipo(obraId), c = calcularAnticipo(obra, actas);
  if (c.valorAnticipo !== null) { out.anticipoEntregado = redondo(c.valorAnticipo); out.anticipoAmortizado = redondo(c.totales.amort); }
  if (c.totales.reteg) out.retegarantia = redondo(c.totales.reteg);
  out.cuentasPorPagar = redondo(saldoCuentasPorPagar(obraId));
  return out;
}
