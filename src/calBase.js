// calBase.js — núcleo de la Gestión de Calidad (sin pantallas): cada formato se describe con una «especificación» (calFormatos.js) y de ella salen
// el registro, la validación, los datos que faltan, la lectura de la plantilla de Excel por etiquetas y la escritura de la hoja.
//
// Un REGISTRO es una hoja del formato (p. ej. una recepción de materiales): { id, obraId, formato, datos, actualizado }.
// Se guarda en el dispositivo (clave de cada formato) y se sincroniza con Firestore por el mismo motor de Control Presupuestal (sincronizar.js).
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";

function leerJSON(clave, porDefecto) { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } }
function guardarJSON(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria: no se rompe la pantalla */ } }

export const CLAVE_CAL_PROVEEDORES = "ryr_cal_proveedores";
export const CLAVE_CAL_NC = "ryr_cal_nc";
export const CLAVE_CAL_OBRAS = "ryr_cal_obras";
export const CLAVE_CAL_OBRA = "ryr_cal_obra_activa";

const arr = (a) => (Array.isArray(a) ? a : []);
export const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const claveNombre = (t) => texto(t).toLowerCase().replace(/\s+/g, " ");
export function numero(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const t = texto(v).replace(",", ".");
  return t !== "" && !isNaN(Number(t)) ? Number(t) : null;
}
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// ---------- Obras de Calidad (maestro propio, sincronizado; se adelanta con lo que la app ya conoce de Control Presupuestal) ----------
export const obraCalVacia = (proyecto = "") => ({ id: claveNombre(proyecto), proyecto: texto(proyecto), contrato: "", contratante: "", ubicacion: "", contratista: "", actualizado: 0 });
export const listarObrasCal = () => arr(leerJSON(CLAVE_CAL_OBRAS, [])).filter((o) => o && o.id);
export const obtenerObraCal = (id) => listarObrasCal().find((o) => o.id === id) || null;
export function guardarObraCal(obra) {
  if (!obra || !texto(obra.proyecto)) return obra;
  const o = { ...obraCalVacia(obra.proyecto), ...obra, id: obra.id || claveNombre(obra.proyecto), actualizado: Date.now() };
  guardarJSON(CLAVE_CAL_OBRAS, [o, ...listarObrasCal().filter((x) => x.id !== o.id)]);
  guardarJSON(CLAVE_CAL_OBRA, o.id);
  return o;
}

// ---------- Estructura de una especificación ----------
// secciones: [{ id, titulo, tipo: "campos" | "tabla" | "lista", ... }]
//   campos: { campos: [{ k, etq (etiqueta en la plantilla), colEtq, despues?, tipo: texto|area|fecha|hora|lista|chips|numero, opciones?, req?, obra? (se toma de la obra), fuente? }] }
//   tabla : { k, cabecera, fin, finEmpieza?, despuesDe?, max, cols: [{ k, enc, tipo, opciones?, req?, colores? }] }   — filas libres (el usuario agrega)
//   lista : { k, cabecera, fin, despuesDe?, items: [{ t, peso? }], resp: { enc, opciones }, obs: { enc } }          — filas fijas de la plantilla (verificación / criterios)
export const seccionesDe = (fmt, tipo) => arr(fmt.secciones).filter((s) => !tipo || s.tipo === tipo);
export const camposDe = (fmt) => seccionesDe(fmt, "campos").flatMap((s) => arr(s.campos).map((c) => ({ ...c, seccion: s.id })));
export const etiquetaUI = (c) => c.label || c.etq || c.enc;

export function datosIniciales(fmt) {
  const d = {};
  for (const s of arr(fmt.secciones)) {
    if (s.tipo === "campos") for (const c of arr(s.campos)) d[c.k] = c.inicial !== undefined ? c.inicial : "";
    else if (s.tipo === "tabla") d[s.k] = [];
    else if (s.tipo === "lista") d[s.k] = arr(s.items).map(() => ({ resp: "", obs: "" }));
  }
  for (const f of arr(fmt.firmas && fmt.firmas.personas)) { d[`${f.k}Nombre`] = ""; d[`${f.k}Cargo`] = ""; }
  return d;
}
export const filaNueva = (tabla, base = {}) => { const f = {}; for (const c of arr(tabla.cols)) f[c.k] = ""; return { ...f, ...base }; };
const filaVacia = (tabla, f) => !arr(tabla.cols).some((c) => texto(f && f[c.k]) !== "");
export const filasConDatos = (tabla, datos) => arr(datos[tabla.k]).filter((f) => !filaVacia(tabla, f));

// ---------- Registros guardados ----------
export function listarRegistros(fmt, obraId) {
  return arr(leerJSON(fmt.clave, [])).filter((r) => r && r.id && (!obraId || r.obraId === obraId)).sort((a, b) => String((b.datos || {}).fecha || "").localeCompare(String((a.datos || {}).fecha || "")) || (b.actualizado || 0) - (a.actualizado || 0));
}
export function obtenerRegistro(fmt, id) { return arr(leerJSON(fmt.clave, [])).find((r) => r && r.id === id) || null; }
export function guardarRegistro(fmt, reg) {
  const r = { ...reg, formato: fmt.id, actualizado: Date.now() };
  guardarJSON(fmt.clave, [r, ...arr(leerJSON(fmt.clave, [])).filter((x) => x && x.id !== r.id)]);
  return r;
}
export function eliminarRegistro(fmt, id) { guardarJSON(fmt.clave, arr(leerJSON(fmt.clave, [])).filter((x) => x && x.id !== id)); }
// Un registro vacío (sin nada escrito aparte de lo que viene de la obra) no se guarda
export function tieneContenido(fmt, datos) {
  for (const s of arr(fmt.secciones)) {
    if (s.tipo === "campos") { if (arr(s.campos).some((c) => !c.obra && texto(datos[c.k]) !== "" && texto(datos[c.k]) !== texto(c.inicial))) return true; }
    else if (s.tipo === "tabla") { if (filasConDatos(s, datos).length) return true; }
    else if (s.tipo === "lista") { if (arr(datos[s.k]).some((x) => texto(x.resp) || texto(x.obs))) return true; }
  }
  return false;
}
// «Hoja N°» siguiente de este formato en esta obra: la mayor registrada + 1
export function siguienteHoja(fmt, obraId) {
  let max = 0;
  for (const r of listarRegistros(fmt, obraId)) { const n = parseInt(texto((r.datos || {}).hoja), 10); if (!isNaN(n) && n > max) max = n; }
  return String(max + 1);
}
export function registroNuevo(fmt, obra) {
  const datos = datosIniciales(fmt);
  const o = obra || {};
  for (const c of camposDe(fmt)) {
    if (c.obra) datos[c.k] = texto(c.obra === "proyecto" ? o.proyecto : o[c.obra]);
    if (c.k === "fecha" && c.hoy !== false) datos.fecha = hoyISO();
    if (c.k === "hoja") datos.hoja = siguienteHoja(fmt, o.id);
  }
  return { id: nuevoId(), obraId: o.id || "", formato: fmt.id, datos, actualizado: 0 };
}
export function etiquetaRegistro(fmt, reg) {
  const d = reg.datos || {};
  const partes = [d.fecha || "sin fecha"];
  if (texto(d.hoja)) partes.push(`Hoja ${texto(d.hoja)}`);
  const extra = fmt.etiquetaExtra ? texto(fmt.etiquetaExtra(d)) : "";
  if (extra) partes.push(extra);
  return partes.join(" · ");
}

// ---------- Validación ----------
const faltaCampo = (c, d) => texto(d[c.k]) === "";
// Lista de {etiqueta, indice, seccion} de lo que falta (para marcar las casillas en rojo) y su texto
export function faltantes(fmt, datos) {
  const f = [];
  for (const s of arr(fmt.secciones)) {
    if (s.tipo === "campos") {
      for (const c of arr(s.campos)) if (c.req && !c.obra && faltaCampo(c, datos)) f.push({ etiqueta: etiquetaUI(c), seccion: s.id });
      for (const c of arr(s.campos)) if (c.req && c.obra && faltaCampo(c, datos)) f.push({ etiqueta: etiquetaUI(c), seccion: "datos" });
    } else if (s.tipo === "tabla") {
      const todas = arr(datos[s.k]); const con = filasConDatos(s, datos);
      if (s.req && !con.length) f.push({ etiqueta: etiquetaUI(arr(s.cols).find((c) => c.req) || s.cols[0]), indice: 0, seccion: s.id });
      todas.forEach((fila, i) => {
        if (!con.includes(fila)) return;
        for (const c of arr(s.cols)) if (c.req && texto(fila[c.k]) === "") f.push({ etiqueta: etiquetaUI(c), indice: i, seccion: s.id });
      });
    } else if (s.tipo === "lista" && s.req) {
      arr(datos[s.k]).forEach((x, i) => { if (texto(x.resp) === "") f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: s.id }); });
    }
  }
  const p = arr(fmt.firmas && fmt.firmas.personas)[0];
  if (p && fmt.firmas.req !== false && texto(datos[`${p.k}Nombre`]) === "") f.push({ etiqueta: `Nombre — ${p.titulo || p.k}`, seccion: "firmas" });
  return f;
}
export function validar(fmt, datos) {
  const out = [];
  for (const x of faltantes(fmt, datos)) {
    const t = x.indice !== undefined && x.indice > 0 ? `${x.etiqueta} (fila ${x.indice + 1})` : x.etiqueta;
    if (!out.includes(t)) out.push(t);
  }
  if (fmt.validarExtra) out.push(...arr(fmt.validarExtra(datos)));
  return out;
}

// ---------- Lectura de la plantilla por etiquetas ----------
export function specDescubrir(fmt) {
  const campos = []; const tablas = [];
  for (const c of camposDe(fmt)) campos.push([c.k, c.etq, c.colEtq || "A", c.colEtq === "Z" ? "Y" : "Z", c.despues || null, c.filasDebajo || 0]);
  for (const s of arr(fmt.secciones)) {
    if (s.tipo === "tabla") {
      tablas.push({ clave: s.k, cabecera: s.cabecera || "No.", fin: s.fin, finEmpieza: !!s.finEmpieza, despuesDe: s.despuesDe, columnas: {}, encabezados: Object.fromEntries(arr(s.cols).map((c) => [c.k, c.enc])) });
    } else if (s.tipo === "lista") {
      const enc = { resp: s.resp.enc }; if (s.obs) enc.obs = s.obs.enc;
      tablas.push({ clave: s.k, cabecera: s.cabecera || "No.", fin: s.fin, finEmpieza: !!s.finEmpieza, despuesDe: s.despuesDe, numerada: true, columnas: {}, encabezados: enc });
    }
  }
  const spec = { campos, tablas, empieza: [] };
  if (fmt.firmas) spec.firmas = { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: fmt.firmas.desdeEtiqueta, personas: fmt.firmas.personas.map((p) => ({ clave: p.k, col: "A" })) };
  return spec;
}
// Devuelve las celdas o lanza un error claro (no se escribe nada en filas equivocadas)
export function descubrirCal(ws, fmt) {
  const lectura = descubrirPorEtiquetas(ws, specDescubrir(fmt));
  const problemas = [...(lectura.problemas || [])];
  const celdas = lectura.celdas || lectura.parcial || {};
  for (const s of arr(fmt.secciones)) {
    if (s.tipo !== "tabla" && s.tipo !== "lista") continue;
    const T = (celdas.tablas || {})[s.k];
    if (!T) { problemas.push(`No encontré la tabla «${s.titulo}»`); continue; }
    const esperadas = s.tipo === "tabla" ? arr(s.cols).map((c) => [c.k, c.enc]) : [["resp", s.resp.enc], ...(s.obs ? [["obs", s.obs.enc]] : [])];
    for (const [k, enc] of esperadas) if (!T.columnas[k]) problemas.push(`No encontré la columna «${enc}»`);
  }
  if (problemas.length) {
    throw new Error("La plantilla de Excel de la app no coincide con esta versión del formulario (" + problemas[0] + "). No se generó el Excel para no escribir los datos en filas equivocadas. Sube juntos el código y la plantilla de la misma entrega, o avísame.");
  }
  return celdas;
}

// ---------- Escritura de la hoja ----------
const COLOR_RES = {
  bueno: ["FFC6EFCE", "FF006100"], malo: ["FFFFC7CE", "FF9C0006"], medio: ["FFFFEB9C", "FF7A4F00"],
};
export const COLORES_ESTADO = {
  Cumple: "bueno", Conforme: "bueno", Sí: null, Aprobado: "bueno", Aceptado: "bueno", Vigente: "bueno", "Para construcción": "bueno", Cerrada: "bueno", Cerrado: "bueno",
  "No cumple": "malo", "No conforme": "malo", Rechazado: "malo", Obsoleto: "malo", Crítica: "malo", Abierta: "malo", Vencida: "malo",
  Pendiente: "medio", "En cuarentena": "medio", "En cuarentena (espera ensayo)": "medio", "Aceptado con observaciones": "medio", "En revisión": "medio", Mayor: "medio",
};
function pintarSemaforo(ws, ref, valor) {
  const k = COLORES_ESTADO[texto(valor)];
  if (k && ref) { const [fondo, letra] = COLOR_RES[k]; pintarCelda(ws, ref, fondo, letra); }
}
// Formatos como "#,##0.##" muestran "10." en Excel cuando el número es entero: se cambia a "#,##0".
function ajustarFormato(ws, ref, v) {
  if (!ref || typeof v !== "number" || !Number.isInteger(v)) return;
  try { const c = ws.getCell(ref); if (c && /\.#+$/.test(String(c.numFmt || ""))) c.numFmt = String(c.numFmt).replace(/\.#+/g, ""); } catch (e) { /* sin formato */ }
}
function valorExcel(def, v) {
  const t = texto(v);
  if (t === "") return "";
  if (def.tipo === "fecha") return fechaDDMMYYYY(t);
  if (def.tipo === "numero") { const n = numero(t); return n === null ? t : n; }
  return typeof v === "string" ? v : t;
}
export function escribirEnHoja(ws, fmt, datos, celdas) {
  for (const c of camposDe(fmt)) {
    const ref = celdas[c.k]; if (!ref) continue;
    const v = valorExcel(c, datos[c.k]);
    poner(ws, ref, v);
    ajustarFormato(ws, ref, v);
    if (c.semaforo) pintarSemaforo(ws, ref, v);
  }
  for (const s of arr(fmt.secciones)) {
    const T = (celdas.tablas || {})[s.k]; if (!T) continue;
    if (s.tipo === "tabla") {
      const filas = filasConDatos(s, datos).map((f) => { const o = {}; for (const c of s.cols) o[c.k] = valorExcel(c, f[c.k]); return o; });
      escribirTabla(ws, T, filas);
      filas.forEach((f, i) => {
        const r = T.filas ? T.filas[i] : T.fila0 + i;
        for (const c of s.cols) if (T.columnas[c.k]) ajustarFormato(ws, `${T.columnas[c.k]}${r}`, f[c.k]);
        for (const c of s.cols) if (c.semaforo && T.columnas[c.k]) pintarSemaforo(ws, `${T.columnas[c.k]}${r}`, f[c.k]);
      });
    } else if (s.tipo === "lista") {
      const filas = arr(datos[s.k]).map((x) => ({ resp: s.resp.numerica ? (numero(x.resp) === null ? "" : numero(x.resp)) : x.resp, obs: x.obs }));
      escribirTabla(ws, T, filas);
      filas.forEach((f, i) => { if (s.resp.semaforo) pintarSemaforo(ws, `${T.columnas.resp}${T.filas[i]}`, f.resp); });
    }
  }
  const F = celdas.firmas || {};
  for (const p of arr(fmt.firmas && fmt.firmas.personas)) {
    if (!F[p.k]) continue;
    poner(ws, F[p.k].nombre, datos[`${p.k}Nombre`]); poner(ws, F[p.k].cargo, datos[`${p.k}Cargo`]);
  }
}

// ---------- Proveedores y subcontratistas (lista común a todos los formatos) ----------
export const listarProveedores = () => arr(leerJSON(CLAVE_CAL_PROVEEDORES, [])).filter((p) => p && p.id);
export const obtenerProveedor = (nombre) => listarProveedores().find((p) => p.id === claveNombre(nombre)) || null;
export function registrarProveedor({ nombre, nit, tipo }) {
  const n = texto(nombre); if (!n) return null;
  const todos = listarProveedores();
  const ya = todos.find((p) => p.id === claveNombre(n));
  const p = { ...(ya || {}), id: claveNombre(n), nombre: n, nit: texto(nit) || (ya && ya.nit) || "", tipo: texto(tipo) || (ya && ya.tipo) || "", actualizado: Date.now() };
  guardarJSON(CLAVE_CAL_PROVEEDORES, [p, ...todos.filter((x) => x.id !== p.id)]);
  return p;
}
export function registrarEvaluacion(nombre, evaluacion) {
  const p = registrarProveedor({ nombre });
  if (!p) return null;
  const sig = { ...p, evaluacion: { ...evaluacion }, actualizado: Date.now() };
  guardarJSON(CLAVE_CAL_PROVEEDORES, [sig, ...listarProveedores().filter((x) => x.id !== sig.id)]);
  return sig;
}
export const DECISIONES_NO_APROBADO = ["NO APROBADO"];
export const proveedorNoAprobado = (nombre) => { const p = obtenerProveedor(nombre); return !!(p && p.evaluacion && p.evaluacion.resultado === "NO APROBADO"); };

// ---------- No conformidades (las crea la persona al confirmar la sugerencia; el formato CA-013 las gestiona) ----------
export const listarNC = (obraId) => arr(leerJSON(CLAVE_CAL_NC, [])).filter((n) => n && n.id && (!obraId || n.obraId === obraId));
export function ncDeOrigen(obraId, origenId, clave) { return listarNC(obraId).find((n) => n.origenId === origenId && n.origenClave === clave) || null; }
export function crearNC(obraId, datos) {
  const todas = arr(leerJSON(CLAVE_CAL_NC, []));
  const propias = todas.filter((n) => n && n.obraId === obraId);
  const num = propias.reduce((m, n) => Math.max(m, parseInt(n.numero, 10) || 0), 0) + 1;
  const nc = { id: nuevoId(), obraId, numero: String(num), estado: "Abierta", fecha: hoyISO(), actualizado: Date.now(), ...datos };
  guardarJSON(CLAVE_CAL_NC, [nc, ...todas]);
  return nc;
}

// Crea las no conformidades que el formato sugiere (material rechazado, ensayo que no cumple…) y que aún no existen. No duplica: la clave identifica el origen.
// Devuelve las que se crearon ahora.
export function crearNCsAutomaticas(fmt, reg) {
  if (!fmt.ncSugerida || !reg) return [];
  const creadas = [];
  for (const s of arr(fmt.ncSugerida(reg.datos || {}))) {
    if (ncDeOrigen(reg.obraId, reg.id, s.clave)) continue;
    creadas.push(crearNC(reg.obraId, { origen: s.origen, origenId: reg.id, origenClave: s.clave, origenFormato: fmt.id, titulo: s.titulo, descripcion: s.descripcion, ubicacion: texto((reg.datos || {}).ubicacion), automatica: true }));
  }
  return creadas;
}

// ---------- Planos vigentes (los lee CA-008, CA-009 y CA-010 para avisar de planos obsoletos) ----------
export function listarPlanos(fmtPlanos, obraId) {
  const mapa = new Map();
  for (const r of listarRegistros(fmtPlanos, obraId).slice().reverse()) {      // del más viejo al más nuevo: gana el último
    for (const f of arr((r.datos || {}).planos)) { const c = texto(f.codigo); if (c) mapa.set(c.toLowerCase(), { codigo: c, nombre: texto(f.nombre), version: texto(f.version), estado: texto(f.estado) }); }
  }
  return Array.from(mapa.values());
}
