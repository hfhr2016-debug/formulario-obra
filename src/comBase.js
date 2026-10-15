// comBase.js — núcleo de la Gestión de Compras (sin pantallas): lo que enlaza las órdenes de compra con las recepciones, los pedidos pendientes y el Control Presupuestal.
// Los formatos de Compras son «registros» del mismo motor que los de Calidad (calBase.js): { id, obraId, formato, datos, actualizado }.
// Aquí solo se LEEN esos registros (y, al recibir material, se actualiza el estado de la orden); nada de esto importa las pantallas.
import { obtenerObra as obtenerObraCP, capitulosDePresupuesto } from "./cpBase";

export const CLAVES_COM = {
  requisicion: "ryr_comp_requisicion", solicitud: "ryr_comp_solicitud", cuadro: "ryr_comp_cuadro", orden: "ryr_comp_orden",
  recepcion: "ryr_comp_recepcion", pendientes: "ryr_comp_pendientes", evaluacion: "ryr_comp_evaluacion",
};
export const ESTADOS_ORDEN = ["Emitida", "Aprobada", "Enviada al proveedor", "Recibida parcial", "Recibida completa", "Anulada"];

const arr = (a) => (Array.isArray(a) ? a : []);
const leerJSON = (clave, porDefecto) => { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } };
const guardarJSON = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria */ } };
export const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export function num(v) {            // «1.500.000», «1500000», «19», «2,5» -> número; vacío o ilegible -> null
  if (typeof v === "number") return isFinite(v) ? v : null;
  let t = texto(v).replace(/\s|\$/g, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(",", ".");
  return t !== "" && t !== "-" && !isNaN(Number(t)) ? Number(t) : null;
}
export const claveTxt = (t) => texto(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
export const redondear = (n) => Math.round(n * 100) / 100;
export const pesos = (v) => {
  const n = num(v); if (n === null) return "";
  const r = Math.round(n);
  return (r < 0 ? "-$ " : "$ ") + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const diasEntre = (desdeISO, hastaISO) => {      // días de «desde» a «hasta» (positivo si «hasta» es posterior)
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(desdeISO)), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(hastaISO));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 86400000);
};

// ---------- Registros de un formato en una obra ----------
export const registrosCom = (formato, obraId) => arr(leerJSON(CLAVES_COM[formato], [])).filter((r) => r && r.id && (!obraId || r.obraId === obraId));
export const ordenesDeObra = (obraId) => registrosCom("orden", obraId);
export const recepcionesDeObra = (obraId) => registrosCom("recepcion", obraId);
export const numeroDe = (reg) => texto(reg && reg.datos && reg.datos.hoja);

// ---------- Valores de una orden ----------
export const subtotalFila = (f) => { const c = num(f && f.cantidad), p = num(f && f.precio); return c === null || p === null ? null : redondear(c * p); };
export function totalesOrden(d) {
  const filas = arr(d && d.items);
  const subtotal = redondear(filas.reduce((t, f) => t + (subtotalFila(f) || 0), 0));
  const pct = num(d && d.ivaPct);
  const iva = redondear(subtotal * (pct === null ? 0 : pct) / 100);
  return { subtotal, iva, total: redondear(subtotal + iva) };
}
export const ordenVigente = (r) => !!r && (r.datos || {}).estado !== "Anulada";
export const totalDeOrden = (r) => totalesOrden((r && r.datos) || {}).total;

// ---------- Capítulos del presupuesto (los mismos de Control Presupuestal) ----------
// De la obra de Control Presupuestal si ya tiene capítulos; si no, de los capítulos del Presupuesto de Gestión Técnica.
export function capitulosObra(obraId) {
  const obra = obraId ? obtenerObraCP(obraId) : null;
  const propios = arr(obra && obra.capitulos).filter((c) => texto(c.nombre)).map((c) => ({ nombre: texto(c.nombre), contratado: num(c.contratado) || 0 }));
  if (propios.length) return propios;
  try { return arr((capitulosDePresupuesto() || {}).capitulos).map((c) => ({ nombre: texto(c.nombre), contratado: num(c.contratado) || 0 })); } catch (e) { return []; }
}
export const capituloDe = (obraId, nombre) => capitulosObra(obraId).find((c) => claveTxt(c.nombre) === claveTxt(nombre)) || null;

// Lo que ya está pedido (órdenes no anuladas) en un capítulo, sin contar la orden indicada
export function comprometidoCapitulo(obraId, nombreCap, excluirId) {
  const k = claveTxt(nombreCap);
  return redondear(ordenesDeObra(obraId).filter((r) => r.id !== excluirId && ordenVigente(r) && claveTxt((r.datos || {}).capitulo) === k).reduce((t, r) => t + totalDeOrden(r), 0));
}
// Estado de un capítulo frente al presupuesto: lo contratado, lo ya pedido y cuánto quedaría con esta orden
export function estadoPresupuesto(obraId, nombreCap, totalEstaOrden, idOrden) {
  const cap = capituloDe(obraId, nombreCap);
  if (!cap || !(cap.contratado > 0)) return null;
  const comprometido = comprometidoCapitulo(obraId, nombreCap, idOrden);
  const conEsta = redondear(comprometido + (totalEstaOrden || 0));
  return { contratado: cap.contratado, comprometido, conEsta, saldo: redondear(cap.contratado - conEsta), pct: conEsta / cap.contratado };
}

// ---------- Lo recibido de cada orden ----------
// { descripción-normalizada: cantidad recibida } sumando todas las recepciones de esa orden (menos la indicada)
export function recibidoDeOrden(obraId, numeroOrden, excluirRecepcionId) {
  const mapa = new Map();
  const n = texto(numeroOrden); if (!n) return mapa;
  recepcionesDeObra(obraId).filter((r) => r.id !== excluirRecepcionId && texto((r.datos || {}).ordenCompra) === n).forEach((r) => {
    arr((r.datos || {}).materiales).forEach((f) => {
      const c = num(f.recibida); if (c === null || !texto(f.descripcion)) return;
      const k = claveTxt(f.descripcion); mapa.set(k, (mapa.get(k) || 0) + c);
    });
  });
  return mapa;
}
export const ordenPorNumero = (obraId, numeroOrden) => ordenesDeObra(obraId).find((r) => numeroDe(r) === texto(numeroOrden)) || null;
// Líneas de una orden con lo pedido, lo recibido hasta ahora y el saldo
export function lineasDeOrden(obraId, reg, excluirRecepcionId) {
  const rec = recibidoDeOrden(obraId, numeroDe(reg), excluirRecepcionId);
  return arr((reg.datos || {}).items).filter((f) => texto(f.descripcion)).map((f) => {
    const pedida = num(f.cantidad) || 0, recibida = rec.get(claveTxt(f.descripcion)) || 0;
    return { descripcion: texto(f.descripcion), unidad: texto(f.unidad), pedida, recibida, saldo: redondear(pedida - recibida), precio: num(f.precio) || 0 };
  });
}
// Estado de la orden según lo recibido (no toca las anuladas). Devuelve el estado que le corresponde o "" si no cambia.
export function estadoSegunRecepcion(obraId, reg) {
  if (!reg || (reg.datos || {}).estado === "Anulada") return "";
  const ls = lineasDeOrden(obraId, reg);
  if (!ls.length) return "";
  if (ls.every((l) => l.recibida >= l.pedida - 1e-9)) return "Recibida completa";
  if (ls.some((l) => l.recibida > 0)) return "Recibida parcial";
  return "";
}
// Tras guardar una recepción: la orden pasa a «Recibida parcial» o «Recibida completa». Devuelve el estado nuevo si cambió.
export function actualizarEstadoOrden(obraId, numeroOrden) {
  const reg = ordenPorNumero(obraId, numeroOrden); if (!reg) return "";
  const nuevo = estadoSegunRecepcion(obraId, reg);
  if (!nuevo || nuevo === (reg.datos || {}).estado) return "";
  const todas = arr(leerJSON(CLAVES_COM.orden, []));
  guardarJSON(CLAVES_COM.orden, [{ ...reg, datos: { ...reg.datos, estado: nuevo }, actualizado: Date.now() }, ...todas.filter((x) => x && x.id !== reg.id)]);
  return nuevo;
}

// ---------- Pedidos pendientes (para el formato RYR-CO-006) ----------
export function estadoPlazo(fechaPrometida, hoy) {
  const d = diasEntre(fechaPrometida, hoy);
  if (d === null) return { dias: "", estado: "" };
  if (d > 0) return { dias: String(d), estado: "Atrasado" };
  return { dias: "0", estado: d >= -3 ? "Por vencer" : "En plazo" };
}
export function pendientesDeOrdenes(obraId, hoy = hoyISO()) {
  const filas = [];
  ordenesDeObra(obraId).filter((r) => ordenVigente(r) && (r.datos || {}).estado !== "Recibida completa")
    .sort((a, b) => texto((a.datos || {}).fechaEntrega).localeCompare(texto((b.datos || {}).fechaEntrega)) || numeroDe(a).localeCompare(numeroDe(b), "es", { numeric: true })).forEach((r) => {
      lineasDeOrden(obraId, r).filter((l) => l.saldo > 1e-9).forEach((l) => {
        const pl = estadoPlazo((r.datos || {}).fechaEntrega, hoy);
        filas.push({ orden: numeroDe(r), proveedor: texto((r.datos || {}).proveedor), descripcion: l.descripcion, unidad: l.unidad, pedida: String(l.pedida), recibida: String(l.recibida), saldo: String(l.saldo),
          fechaPrometida: texto((r.datos || {}).fechaEntrega), dias: pl.dias, estado: pl.estado, gestion: "" });
      });
    });
  return filas;
}

// ---------- Compras recibidas que todavía no están en el Registro de Costos ----------
// Cada recepción con valor es una posible factura: valor = Σ cantidad recibida × precio de la orden (+ el IVA de la orden).
export function comprasPorRegistrar(obraId, facturasYaRegistradas = []) {
  const yaRegistradas = new Set(arr(facturasYaRegistradas).map((f) => texto(f && f.origenCompra)).filter(Boolean));
  const salida = [];
  recepcionesDeObra(obraId).forEach((rec) => {
    const d = rec.datos || {};
    if (yaRegistradas.has(rec.id) || !texto(d.ordenCompra) || /^Rechazado/.test(texto(d.resultado))) return;
    const ord = ordenPorNumero(obraId, d.ordenCompra); if (!ord) return;
    const precios = new Map(arr((ord.datos || {}).items).map((f) => [claveTxt(f.descripcion), num(f.precio) || 0]));
    const antes = redondear(arr(d.materiales).reduce((t, f) => t + (num(f.recibida) || 0) * (precios.get(claveTxt(f.descripcion)) || 0), 0));
    if (!(antes > 0)) return;
    const pct = num((ord.datos || {}).ivaPct) || 0;
    salida.push({
      recepcionId: rec.id, fecha: texto(d.fecha), proveedor: texto(d.proveedor), nit: texto(d.nit), capitulo: texto((ord.datos || {}).capitulo), tipo: texto((ord.datos || {}).tipoCosto) || "Material",
      numero: texto(d.remision), orden: numeroDe(ord), concepto: `Orden de compra ${numeroDe(ord)} · entrada ${texto(d.hoja) || "s/n"}`, valorAntes: Math.round(antes), iva: Math.round(antes * pct / 100),
    });
  });
  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
