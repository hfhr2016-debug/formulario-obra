// Gestión de Control Presupuestal — núcleo compartido por los 4 formatos del Lote 1 (sin pantallas; solo datos y cálculos).
//
// Los datos se guardan en el dispositivo (como en las demás gestiones) PERO con la forma que tendrán cuando se conecte el servidor:
// cada registro es un objeto con su propio `id` único, el `obraId` al que pertenece y la fecha de su última modificación (`actualizado`).
// Así, el día que se sincronice con Firestore, cada elemento de estas listas pasa tal cual a un documento.
// Memoria local (igual que en sstComunes, repetida aquí para que este módulo no dependa de pantallas)
function leerJSON(clave, porDefecto) { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } }
function guardarJSON(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria: no se rompe la pantalla */ } }

export const CLAVE_CP_OBRAS = "ryr_cp_obras";                 // obras con sus datos de contrato y sus capítulos
export const CLAVE_CP_FACTURAS = "ryr_cp_facturas";           // cada factura / cuenta de cobro / pago (registro de costos reales)
export const CLAVE_CP_ADICIONALES = "ryr_cp_adicionales";     // cada ítem adicional / obra no prevista
export const CLAVE_CP_ACTAS = "ryr_cp_anticipo_actas";        // cada acta de cobro con su amortización y descuentos
export const CLAVE_CP_OBRA_ACTIVA = "ryr_cp_obra_activa";     // la última obra con la que se trabajó
export const CLAVE_PRESUPUESTO_CANTIDADES = "ryr_presupuesto_cantidades";   // lo guarda el Presupuesto de Gestión Técnica
export const CLAVE_ACTA_ACUMULADO = "ryr_acta_acumulado";                   // lo guarda el Acta de Obra (cantidades acumuladas por actividad)
export const CLAVE_ACTAS_VALOR = "ryr_actas_valor_presente";                // lo guarda el Acta de Obra (valor de cada acta)

export const TIPOS_COSTO = ["Material", "Mano de obra", "Subcontrato", "Maquinaria y equipo", "Transporte", "Administración", "Otro"];
export const ESTADOS_PAGO = ["Pagado", "Pendiente", "Parcial"];
export const TIPOS_ADICIONAL = ["Adicional", "Obra no prevista", "Mayor cantidad", "Menor cantidad (deductivo)"];
export const ESTADOS_ADICIONAL = ["Pendiente", "Aprobado", "Rechazado"];
export const NOMBRES_TIPO_PROYECTO = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };
export const MAX_CAPITULOS = 16;

const arr = (a) => (Array.isArray(a) ? a : []);
export const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const claveObra = (proyecto) => texto(proyecto).toLowerCase().replace(/\s+/g, " ");

// Número escrito por una persona: "1.500.000", "1500000", "-250000", "1,5" -> número. Vacío o ilegible -> null.
export function num(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  let t = texto(v).replace(/\s|\$/g, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");   // formato colombiano: 1.234.567,89
  else t = t.replace(",", ".");
  return t !== "" && t !== "-" && !isNaN(Number(t)) ? Number(t) : null;
}
const n0 = (v) => num(v) || 0;

export function tipoProyectoActual() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    const m = (datos && datos.modulos) || {};
    if (m.vias) return "vias";
    if (m.hidrocarburos) return "hidrocarburos";
  } catch (e) { /* sin tipo guardado: edificación */ }
  return "edificacion";
}
export const nombreTipoProyecto = () => NOMBRES_TIPO_PROYECTO[tipoProyectoActual()];

// ---------- Formato de pesos y porcentajes ----------
export function pesos(v) {
  const n = num(v);
  if (n === null) return "";
  const r = Math.round(n);
  return (r < 0 ? "-$ " : "$ ") + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
export function miles(v) {      // 1234567 -> "1.234.567" (para mostrar mientras se escribe)
  const t = texto(v);
  if (!t) return "";
  const neg = t.startsWith("-");
  const [ent, dec] = t.replace(/[^0-9,]/g, "").split(",");
  const e = (ent || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + e + (dec !== undefined ? "," + dec : "");
}
export const porcentaje = (frac, dec = 1) => (frac === null || frac === undefined || frac === "" || !isFinite(frac) ? "" : (Math.round(frac * 100 * Math.pow(10, dec)) / Math.pow(10, dec)).toString().replace(".", ",") + " %");
// "25" o "25,5" escrito como porcentaje -> fracción 0,25 (lo que Excel guarda con formato %)
export function fraccion(v) { const n = num(v); return n === null ? null : n / 100; }

// ---------- Obras ----------
export const obraVacia = (proyecto = "") => ({
  id: claveObra(proyecto), proyecto: texto(proyecto), contrato: "", contratante: "", fechaContrato: "", plazo: "", valorContrato: "", aiu: "",
  anticipoFecha: "", anticipoPct: "", amortPct: "", retegarantia: "", capitulos: [], actualizado: 0,
});
export const capituloNuevo = (b = {}) => ({ id: nuevoId(), nombre: "", contratado: "", ejecutado: "", ...b });
export function listarObras() { return arr(leerJSON(CLAVE_CP_OBRAS, [])).filter((o) => o && o.id); }
export function obtenerObra(id) { return listarObras().find((o) => o.id === id) || null; }
// Guarda (crea o reemplaza) la obra. Devuelve la obra guardada.
export function guardarObra(obra) {
  if (!obra || !texto(obra.proyecto)) return obra;
  const o = { ...obraVacia(obra.proyecto), ...obra, id: obra.id || claveObra(obra.proyecto), actualizado: Date.now() };
  guardarJSON(CLAVE_CP_OBRAS, [o, ...listarObras().filter((x) => x.id !== o.id)]);
  guardarJSON(CLAVE_CP_OBRA_ACTIVA, o.id);
  return o;
}
export const obraActivaId = () => leerJSON(CLAVE_CP_OBRA_ACTIVA, "");
// Obras que ya conoce la app por la Ficha Técnica, la Ficha SST o la Ambiental (para no escribir el nombre dos veces)
export function proyectosConocidos() {
  const nombres = [];
  const ver = (p) => { const t = texto(p); if (t && !nombres.some((x) => claveObra(x) === claveObra(t))) nombres.push(t); };
  listarObras().forEach((o) => ver(o.proyecto));
  arr(leerJSON("ryr_proyectos_guardados", [])).forEach((p) => ver(p && p.datos && p.datos.proyecto));
  arr(leerJSON("ryr_amb_ficha", [])).forEach((f) => ver(f && f.proyecto));
  arr(leerJSON("ryr_sst_ficha", [])).forEach((f) => ver(f && f.proyecto));
  return nombres;
}
// Datos de la Ficha Técnica del proyecto (contrato) para adelantar el formulario
export function datosDeFichaTecnica(proyecto) {
  const p = arr(leerJSON("ryr_proyectos_guardados", [])).find((x) => x && x.datos && claveObra(x.datos.proyecto) === claveObra(proyecto));
  return p && p.datos ? { contrato: texto(p.datos.noContrato), contratista: texto(p.datos.contratista) } : null;
}

// ---------- Facturas (costos reales) ----------
export const facturaNueva = (b = {}) => ({ id: nuevoId(), obraId: "", fecha: "", proveedor: "", nit: "", capitulo: "", concepto: "", tipo: "", numero: "", valorAntes: "", iva: "", retenciones: "", estado: "", fechaPago: "", soporte: "", actualizado: 0, ...b });
export const facturaVacia = (f) => !(f && (texto(f.proveedor) || texto(f.concepto) || texto(f.valorAntes) || texto(f.numero) || texto(f.nit)));
export const listarFacturas = (obraId) => arr(leerJSON(CLAVE_CP_FACTURAS, [])).filter((f) => f && (!obraId || f.obraId === obraId));
// Reemplaza TODAS las facturas de la obra por las dadas (las de otras obras no se tocan)
export function guardarFacturasDeObra(obraId, lista) {
  const otras = arr(leerJSON(CLAVE_CP_FACTURAS, [])).filter((f) => f && f.obraId !== obraId);
  const ahora = Date.now();
  guardarJSON(CLAVE_CP_FACTURAS, [...arr(lista).filter((f) => !facturaVacia(f)).map((f) => ({ ...f, obraId, actualizado: ahora })), ...otras]);
}
// Valor total de la factura: igual a la fórmula de la plantilla (valor antes de IVA + IVA − retenciones)
export const totalFactura = (f) => (num(f.valorAntes) === null ? null : n0(f.valorAntes) + n0(f.iva) - n0(f.retenciones));
export function costoRealPorCapitulo(facturas, nombreCap, hastaISO) {
  const k = texto(nombreCap).toLowerCase();
  return arr(facturas).filter((f) => texto(f.capitulo).toLowerCase() === k && (!hastaISO || !f.fecha || f.fecha <= hastaISO)).reduce((t, f) => t + (totalFactura(f) || 0), 0);
}

// ---------- Adicionales ----------
export const adicionalNuevo = (b = {}) => ({ id: nuevoId(), obraId: "", fecha: "", descripcion: "", tipo: "", capitulo: "", unidad: "", cantidad: "", valorUnitario: "", aiu: "", justificacion: "", solicita: "", aprueba: "", fechaAprobacion: "", estado: "Pendiente", actualizado: 0, ...b });
export const adicionalVacio = (a) => !(a && (texto(a.descripcion) || texto(a.cantidad) || texto(a.valorUnitario)));
export const listarAdicionales = (obraId) => arr(leerJSON(CLAVE_CP_ADICIONALES, [])).filter((a) => a && (!obraId || a.obraId === obraId));
export function guardarAdicionalesDeObra(obraId, lista) {
  const otras = arr(leerJSON(CLAVE_CP_ADICIONALES, [])).filter((a) => a && a.obraId !== obraId);
  const ahora = Date.now();
  guardarJSON(CLAVE_CP_ADICIONALES, [...arr(lista).filter((a) => !adicionalVacio(a)).map((a) => ({ ...a, obraId, actualizado: ahora })), ...otras]);
}
// Cantidad con signo: en un deductivo (menos obra) la cantidad se resta
export const cantidadConSigno = (a) => { const c = num(a.cantidad); return c === null ? null : (a.tipo === "Menor cantidad (deductivo)" ? -Math.abs(c) : c); };
export const valorDirectoAdicional = (a) => { const c = cantidadConSigno(a); const v = num(a.valorUnitario); return c === null || v === null ? null : c * v; };
export const valorConAIU = (a) => { const d = valorDirectoAdicional(a); return d === null ? null : d * (1 + n0(fraccion(a.aiu))); };
export const adicionalesAprobadosPorCapitulo = (adicionales, nombreCap) => {
  const k = texto(nombreCap).toLowerCase();
  return arr(adicionales).filter((a) => a.estado === "Aprobado" && texto(a.capitulo).toLowerCase() === k).reduce((t, a) => t + (valorDirectoAdicional(a) || 0), 0);
};
export function totalesAdicionales(adicionales) {
  const por = (estado) => arr(adicionales).filter((a) => a.estado === estado).reduce((t, a) => t + (valorConAIU(a) || 0), 0);
  return { aprobado: por("Aprobado"), pendiente: por("Pendiente"), rechazado: por("Rechazado"),
    directo: arr(adicionales).reduce((t, a) => t + (valorDirectoAdicional(a) || 0), 0), conAIU: arr(adicionales).reduce((t, a) => t + (valorConAIU(a) || 0), 0) };
}

// ---------- Presupuesto y actas de Gestión Técnica ----------
// El Presupuesto guarda cada actividad con su capítulo, cantidad y precio; el Acta de Obra guarda la cantidad acumulada por actividad.
// De ahí salen, por capítulo: lo contratado (cantidad × precio) y lo ejecutado según actas (cantidad acumulada × precio).
export function capitulosDePresupuesto() {
  const pres = leerJSON(CLAVE_PRESUPUESTO_CANTIDADES, {}) || {};
  const acum = leerJSON(CLAVE_ACTA_ACUMULADO, {}) || {};
  const acumNorm = {};
  Object.keys(acum).forEach((k) => { acumNorm[texto(k).toLowerCase()] = n0(acum[k]); });
  const caps = new Map();
  let sinCapitulo = 0;
  Object.keys(pres).forEach((k) => {
    const a = pres[k] || {};
    const nombre = texto(a.capitulo);
    if (!nombre) { sinCapitulo++; return; }
    const precio = n0(a.precio), cant = n0(a.cantidad);
    const cur = caps.get(nombre) || { nombre, contratado: 0, ejecutado: 0 };
    cur.contratado += cant * precio;
    cur.ejecutado += (acumNorm[k] || 0) * precio;
    caps.set(nombre, cur);
  });
  return { capitulos: Array.from(caps.values()).map((c) => ({ ...c, contratado: Math.round(c.contratado), ejecutado: Math.round(c.ejecutado) })), sinCapitulo, hayActas: Object.keys(acum).length > 0 };
}
export function actasDeObra() {      // [{actaNo, valor, fecha}] guardadas por el Acta de Obra
  const g = leerJSON(CLAVE_ACTAS_VALOR, {}) || {};
  return Object.keys(g).map((k) => ({ actaNo: texto(g[k].actaNo || k), valor: n0(g[k].valor), fecha: texto(g[k].fecha) })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ---------- Control Presupuestal: mismas fórmulas de la plantilla (por capítulo) ----------
export function filaControl(cap, costoReal, adiciones) {
  const C = num(cap.contratado), D = adiciones === null || adiciones === undefined ? null : adiciones, F = num(cap.ejecutado), H = texto(cap.nombre) ? costoReal : null;
  const E = C === null && (D === null || D === 0) ? null : n0(C) + n0(D);
  const G = E === null || E === 0 ? null : n0(F) / E;
  const I = F === null || H === null ? null : H - F;
  const J = I === null || F === 0 ? null : I / F;
  const K = E === null ? null : E - n0(F);
  const L = F === null || F === 0 || H === null ? null : (H / F) * E;
  const M = L === null || E === null || E === 0 ? null : L / E - 1;
  const estado = J === null ? "" : J > 0.05 ? "ALERTA" : J > 0 ? "VIGILAR" : "OK";
  return { nombre: texto(cap.nombre), C, D, E, F, G, H, I, J, K, L, M, estado };
}
export function controlDeObra(obra, facturas, adicionales, corteISO) {
  const filas = arr(obra && obra.capitulos).filter((c) => texto(c.nombre)).map((c) => filaControl(c, costoRealPorCapitulo(facturas, c.nombre, corteISO), adicionalesAprobadosPorCapitulo(adicionales, c.nombre) || null));
  const s = (k) => filas.reduce((t, f) => t + (f[k] === null ? 0 : f[k]), 0);
  const tot = { C: s("C"), D: s("D"), E: s("E"), F: s("F"), H: s("H"), I: s("I"), K: s("K"), L: s("L") };
  tot.G = tot.E === 0 ? null : tot.F / tot.E;
  tot.J = tot.F === 0 ? null : tot.I / tot.F;
  tot.M = tot.L === 0 || tot.E === 0 ? null : tot.L / tot.E - 1;
  tot.estado = tot.J === null ? "" : tot.J > 0.05 ? "ALERTA" : tot.J > 0 ? "VIGILAR" : "OK";
  return { filas, tot };
}
// Facturas cuyo capítulo no coincide con ninguno del Control (no se sumarían): se avisan
export function facturasSinCapitulo(obra, facturas) {
  const nombres = arr(obra && obra.capitulos).map((c) => texto(c.nombre).toLowerCase()).filter(Boolean);
  return arr(facturas).filter((f) => !facturaVacia(f) && !nombres.includes(texto(f.capitulo).toLowerCase()));
}
export const COLORES_ESTADO = { ALERTA: { relleno: "FFF8CBAD", fuente: "FF000000" }, VIGILAR: { relleno: "FFFFE699", fuente: "FF000000" }, OK: { relleno: "FFC6E0B4", fuente: "FF000000" } };

// ---------- Anticipo y amortización: mismas fórmulas de la plantilla ----------
export function calcularAnticipo(obra, actas) {
  const valorAnt = num(obra.valorContrato) !== null && num(obra.anticipoPct) !== null ? n0(obra.valorContrato) * (n0(obra.anticipoPct) / 100) : null;
  const pAmort = n0(obra.amortPct) / 100, pRet = n0(obra.retegarantia) / 100;
  let acumulado = 0;
  const filas = arr(actas).map((a) => {
    const E = num(a.bruto);
    if (E === null) return { bruto: null, amort: null, reteg: null, neto: null, saldo: null };
    const disponible = valorAnt === null ? 0 : valorAnt - acumulado;
    const amort = valorAnt === null ? 0 : Math.min(E * pAmort, disponible);
    acumulado += amort;
    const reteg = E * pRet;
    return { bruto: E, amort, reteg, neto: E - amort - reteg - n0(a.otros), saldo: valorAnt === null ? null : valorAnt - acumulado };
  });
  const sum = (k) => filas.reduce((t, f) => t + (f[k] || 0), 0);
  return { valorAnticipo: valorAnt, filas, totales: { bruto: sum("bruto"), amort: sum("amort"), reteg: sum("reteg"), otros: arr(actas).reduce((t, a) => t + n0(a.otros), 0), neto: sum("neto"), saldo: valorAnt === null ? null : valorAnt - sum("amort") } };
}

// ---------- Actas del anticipo (cada acta de cobro de la obra) ----------
export const listarActasAnticipo = (obraId) => arr(leerJSON(CLAVE_CP_ACTAS, [])).filter((a) => a && (!obraId || a.obraId === obraId));
export function guardarActasAnticipoDeObra(obraId, lista) {
  const otras = arr(leerJSON(CLAVE_CP_ACTAS, [])).filter((a) => a && a.obraId !== obraId);
  const ahora = Date.now();
  guardarJSON(CLAVE_CP_ACTAS, [...arr(lista).filter((a) => texto(a.acta) || texto(a.periodo) || texto(a.bruto) || texto(a.otros)).map((a) => ({ ...a, obraId, actualizado: ahora })), ...otras]);
}
