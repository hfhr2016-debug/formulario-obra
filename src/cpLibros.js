// Control Presupuestal · Lote 2 — datos y cálculos de Materiales, Subcontratos, Mano de obra, Maquinaria y Cuentas por pagar.
// Igual que el Lote 1: cada registro lleva su `id`, su `obraId` y `actualizado` (listo para Firestore) y se guarda en el dispositivo.
// Los cálculos repiten las fórmulas de las plantillas Excel (el Excel las calcula solo; aquí se usan para mostrarlas en pantalla).
import { num, texto, nuevoId, netoFactura, listarFacturas } from "./cpBase";

function leerJSON(clave, porDefecto) { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } }
function guardarJSON(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria: no se rompe la pantalla */ } }
const arr = (a) => (Array.isArray(a) ? a : []);
const n0 = (v) => num(v) || 0;

export const CLAVE_CP_MATERIALES = "ryr_cp_materiales";
export const CLAVE_CP_SUBCONTRATOS = "ryr_cp_subcontratos";
export const CLAVE_CP_MANO_OBRA = "ryr_cp_mano_obra";
export const CLAVE_CP_EQUIPOS = "ryr_cp_equipos";
export const CLAVE_CP_CUENTAS = "ryr_cp_cuentas";
export const CLAVE_CP_CABECERAS = "ryr_cp_cabeceras";       // datos de encabezado por formato y obra (periodo, responsable, fecha de corte)

export const PROPIEDADES_EQUIPO = ["Propio", "Alquilado"];
export const UNIDADES_COBRO = ["Hora", "Día", "Mes", "Viaje", "Global"];

// ---------- Almacenamiento por obra ----------
export const listarRegistros = (clave, obraId) => arr(leerJSON(clave, [])).filter((r) => r && (!obraId || r.obraId === obraId));
// Reemplaza TODOS los registros de la obra (los de otras obras no se tocan); los vacíos no se guardan.
export function guardarRegistrosDeObra(clave, obraId, lista, estaVacio) {
  const otros = arr(leerJSON(clave, [])).filter((r) => r && r.obraId !== obraId);
  const ahora = Date.now();
  guardarJSON(clave, [...arr(lista).filter((r) => !estaVacio(r)).map((r) => ({ ...r, obraId, actualizado: ahora })), ...otros]);
}
export function leerCabecera(formato, obraId) { const t = leerJSON(CLAVE_CP_CABECERAS, {}); return (t && t[`${formato}|${obraId}`]) || {}; }
export function guardarCabecera(formato, obraId, datos) { const t = leerJSON(CLAVE_CP_CABECERAS, {}) || {}; t[`${formato}|${obraId}`] = datos; guardarJSON(CLAVE_CP_CABECERAS, t); }

// ---------- Materiales ----------
export const materialNuevo = (b = {}) => ({ id: nuevoId(), obraId: "", material: "", capitulo: "", unidad: "", cantPres: "", precioPres: "", cantComp: "", precioReal: "", cantCons: "", actualizado: 0, ...b });
export const materialVacio = (m) => !(m && (texto(m.material) || texto(m.cantPres) || texto(m.cantComp) || texto(m.precioReal) || texto(m.precioPres)));
export function calcMaterial(m) {
  const pres = num(m.cantPres), pp = num(m.precioPres), comp = num(m.cantComp), real = num(m.precioReal);
  const saldo = comp === null ? null : comp - n0(m.cantCons);
  const pctComp = pres && comp !== null ? comp / pres : null;
  const variacion = pp && real !== null ? real / pp - 1 : null;
  const sobrecosto = comp !== null && pp !== null && real !== null ? comp * (real - pp) : null;
  const estado = variacion === null ? "" : variacion > 0.05 ? "ALERTA" : variacion > 0 ? "VIGILAR" : "OK";
  return { saldo, pctComp, variacion, sobrecosto, estado };
}
export function resumenMateriales(lista) {
  const xs = arr(lista).filter((m) => !materialVacio(m));
  let presComprado = 0, real = 0, sobre = 0, alertas = 0;
  xs.forEach((m) => { const c = calcMaterial(m); presComprado += n0(m.cantComp) * n0(m.precioPres); real += n0(m.cantComp) * n0(m.precioReal); sobre += c.sobrecosto || 0; if (c.estado === "ALERTA") alertas++; });
  return { n: xs.length, presComprado, real, sobre, variacionGlobal: presComprado ? real / presComprado - 1 : null, alertas };
}

// ---------- Subcontratos ----------
export const subcontratoNuevo = (b = {}) => ({ id: nuevoId(), obraId: "", subcontratista: "", nit: "", objeto: "", capitulo: "", valor: "", adicionales: "", avance: "", pagado: "", reteg: "", actualizado: 0, ...b });
export const subcontratoVacio = (s) => !(s && (texto(s.subcontratista) || texto(s.objeto) || texto(s.valor) || texto(s.nit)));
export function calcSubcontrato(s) {
  const v = num(s.valor);
  const total = v === null ? null : v + n0(s.adicionales);
  const av = num(s.avance);
  const ejecutado = total !== null && av !== null ? total * (av / 100) : null;
  const saldo = ejecutado === null ? null : ejecutado - n0(s.pagado) - n0(s.reteg);
  return { total, ejecutado, saldo, estado: saldo === null ? "" : saldo <= 0 ? "Al día" : "Con saldo" };
}

// ---------- Mano de obra directa ----------
export const manoObraNueva = (b = {}) => ({ id: nuevoId(), obraId: "", periodo: "", oficio: "", descripcion: "", capitulo: "", trabajadores: "", dias: "", jornal: "", prest: "", obs: "", actualizado: 0, ...b });
export const manoObraVacia = (m) => !(m && (texto(m.periodo) || texto(m.oficio) || texto(m.descripcion) || texto(m.jornal) || texto(m.trabajadores)));
export function calcManoObra(m) {
  const t = num(m.trabajadores), d = num(m.dias), j = num(m.jornal);
  const subtotal = t !== null && d !== null && j !== null ? t * d * j : null;
  const prestaciones = subtotal === null ? null : subtotal * (n0(m.prest) / 100);
  return { subtotal, prestaciones, total: subtotal === null ? null : subtotal + prestaciones };
}
export function resumenManoObraSubcontratos(subs, mos) {
  const ss = arr(subs).filter((s) => !subcontratoVacio(s)), ms = arr(mos).filter((m) => !manoObraVacia(m));
  const t = { ejecutado: 0, pagado: 0, reteg: 0, saldo: 0, mano: 0 };
  ss.forEach((s) => { const c = calcSubcontrato(s); t.ejecutado += c.ejecutado || 0; t.pagado += n0(s.pagado); t.reteg += n0(s.reteg); t.saldo += c.saldo || 0; });
  ms.forEach((m) => { t.mano += calcManoObra(m).total || 0; });
  return { ...t, total: t.ejecutado + t.mano, nSub: ss.length, nMano: ms.length };
}

// ---------- Maquinaria y equipos ----------
export const equipoNuevo = (b = {}) => ({ id: nuevoId(), obraId: "", equipo: "", placa: "", propiedad: "", proveedor: "", capitulo: "", unidad: "", tarifa: "", cantidad: "", combustible: "", operador: "", obs: "", actualizado: 0, ...b });
export const equipoVacio = (e) => !(e && (texto(e.equipo) || texto(e.placa) || texto(e.tarifa) || texto(e.cantidad)));
export function calcEquipo(e) {
  const t = num(e.tarifa), c = num(e.cantidad);
  const valor = t !== null && c !== null ? t * c : null;
  return { valor, total: valor === null ? null : valor + n0(e.combustible) + n0(e.operador) };
}
export function resumenEquipos(lista) {
  const xs = arr(lista).filter((e) => !equipoVacio(e));
  const r = { Propio: 0, Alquilado: 0, total: 0, n: xs.length };
  xs.forEach((e) => { const t = calcEquipo(e).total || 0; r.total += t; if (e.propiedad === "Propio") r.Propio += t; else if (e.propiedad === "Alquilado") r.Alquilado += t; });
  return r;
}

// ---------- Cuentas por pagar ----------
export const cuentaNueva = (b = {}) => ({ id: nuevoId(), obraId: "", proveedor: "", nit: "", numero: "", fEmision: "", fVence: "", valor: "", abonado: "", capitulo: "", obs: "", facturaId: "", actualizado: 0, ...b });
export const cuentaVacia = (c) => !(c && (texto(c.proveedor) || texto(c.numero) || texto(c.valor) || texto(c.nit)));
const diasEntre = (aISO, bISO) => Math.round((Date.parse(aISO + "T00:00:00Z") - Date.parse(bISO + "T00:00:00Z")) / 86400000);
// corte y vencimiento: "AAAA-MM-DD". Igual que la plantilla: sin saldo = Pagada; sin fecha = Pendiente; con mora = Vencida.
export function calcCuenta(c, corte) {
  const v = num(c.valor);
  const saldo = v === null ? null : v - n0(c.abonado);
  const mora = saldo !== null && saldo > 0 && c.fVence && corte ? Math.max(0, diasEntre(corte, c.fVence)) : null;
  const estado = saldo === null ? "" : saldo <= 0 ? "Pagada" : mora === null ? "Pendiente" : mora > 0 ? "Vencida" : "Por vencer";
  return { saldo, mora, estado };
}
export function antiguedadDeuda(lista, corte) {
  const r = { porVencer: 0, d30: 0, d60: 0, d90: 0, mas90: 0, sinFecha: 0, total: 0 };
  arr(lista).filter((c) => !cuentaVacia(c)).forEach((c) => {
    const { saldo, mora, estado } = calcCuenta(c, corte);
    if (saldo === null) return;
    r.total += saldo;
    if (estado === "Por vencer") r.porVencer += saldo;
    else if (estado === "Pendiente") r.sinFecha += saldo;
    else if (estado === "Vencida") { if (mora <= 30) r.d30 += saldo; else if (mora <= 60) r.d60 += saldo; else if (mora <= 90) r.d90 += saldo; else r.mas90 += saldo; }
  });
  return r;
}
// Facturas del Registro de Costos que siguen sin pagar (Pendiente o Parcial) y que aún no están en la lista de cuentas
export function facturasPorPagar(obraId, cuentas) {
  const ya = new Set(arr(cuentas).map((c) => c.facturaId).filter(Boolean));
  return listarFacturas(obraId).filter((f) => (f.estado === "Pendiente" || f.estado === "Parcial") && !ya.has(f.id));
}
export function cuentaDesdeFactura(f, obraId) {
  return cuentaNueva({ obraId, proveedor: f.proveedor, nit: f.nit, numero: f.numero, fEmision: f.fecha, valor: netoFactura(f) === null ? "" : String(Math.round(netoFactura(f))), capitulo: f.capitulo, obs: f.concepto, facturaId: f.id });
}
