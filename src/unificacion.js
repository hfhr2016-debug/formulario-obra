// unificacion.js — una actividad = un nombre = un APU, sin importar el tipo de proyecto (Edificación, Vías, Hidrocarburos).
// - Los nombres anteriores quedan como equivalencias del nombre único (ALIAS), así lo ya guardado se sigue reconociendo.
// - aplicarUnificacionCatalogo(): lo corre la persona administradora una vez sobre el catálogo propio de actividades (que ya está en la nube).
// - migrarDatosLocales(): pasa lo ya guardado en este equipo (APU, cantidades del Presupuesto…) a los nombres únicos.
import { UNIFICACION } from "./unificacionDatos";
import { CATALOGO_ACTIVIDADES_BASE } from "./catalogoActividades";

const txt = (v) => String(v === undefined || v === null ? "" : v).trim();
export const norm = (t) => txt(t).toLowerCase().replace(/\s+/g, " ");
const CLAVE_ACT = "ryr_cat_actividades";
export const MARCA = "__unificacion_v1";
export const MARCA_V2 = "__unificacion_v2";   // ya se completaron las actividades unificadas en los tres tipos (se hace una sola vez)

const leer = (k, def) => { try { const t = localStorage.getItem(k); const v = t ? JSON.parse(t) : def; return v && typeof v === "object" ? v : def; } catch (e) { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin memoria */ } };
const clavAct = (it) => `${it.tipo}|${norm(it.actividad)}|${norm(it.unidad)}`;

// nombre anterior (normalizado) -> { nombre, unidad }
// (un nombre anterior que todavía existe como actividad aparte —por ejemplo «Demolición de estructuras» en otra unidad— no se traduce)
export const ALIAS = (() => {
  const vigentes = new Set(CATALOGO_ACTIVIDADES_BASE.map((a) => norm(a.actividad)));
  const m = new Map();
  UNIFICACION.forEach(([nombre, unidad, tipos]) => {
    Object.values(tipos).forEach((lista) => lista.forEach(([ant]) => { if (norm(ant) === norm(nombre) || !vigentes.has(norm(ant))) m.set(norm(ant), { nombre, unidad }); }));
  });
  return m;
})();
// nombre único (normalizado) -> nombres anteriores tal como estaban escritos (para encontrar tablas de referencia hechas con los nombres viejos)
const REVERSO = (() => {
  const m = new Map();
  UNIFICACION.forEach(([nombre, , tipos]) => {
    const l = m.get(norm(nombre)) || [];
    Object.values(tipos).forEach((lista) => lista.forEach(([ant]) => { if (!l.includes(ant)) l.push(ant); }));
    m.set(norm(nombre), l);
  });
  return m;
})();
export const nombresAnteriores = (nombre) => REVERSO.get(norm(nombre)) || [];
// Busca en una tabla hecha con nombres de actividad: primero el nombre actual y, si no está, sus nombres anteriores.
export function buscarPorNombre(tabla, nombre) {
  if (tabla[nombre] !== undefined) return tabla[nombre];
  for (const ant of nombresAnteriores(nombre)) if (tabla[ant] !== undefined) return tabla[ant];
  return undefined;
}
export const NOMBRES_UNICOS = new Set(UNIFICACION.map(([n]) => norm(n)));

const mapaVivo = () => leer(CLAVE_ACT, {});
const hayCatalogoPropio = () => Object.values(mapaVivo()).some((x) => x && txt(x.actividad));
// ¿El catálogo en uso ya trae los nombres únicos? (si no hay catálogo propio, se usa el del código, que ya los trae)
export function unificacionActiva() {
  const m = mapaVivo();
  if (!Object.values(m).some((x) => x && txt(x.actividad))) return true;
  return !!m[MARCA];
}
// Nombre vigente de una actividad: si es uno anterior y la unificación ya está activa, devuelve el nombre único.
export function nombreUnificado(nombre) {
  if (!unificacionActiva()) return nombre;
  const a = ALIAS.get(norm(nombre));
  return a ? a.nombre : nombre;
}

// ---------- Catálogo propio (lo corre quien administra) ----------
// Concretos: los mismos 8 (mismo nombre y unidad) en los tres tipos de proyecto.
export const CONCRETOS_COMUNES = [
  "Concreto de limpieza clase h (105 kg/cm2 ó 1500 psi)",
  "Concreto de f'c=140 kg/cm² (2000 PSI), incluye vaciado y vibrado",
  "Concreto de f'c=175 kg/cm² (2500 PSI), incluye vaciado y vibrado",
  "Concreto ciclópeo",
  "Concreto de f'c=210 kg/cm² (3000 PSI), incluye vaciado y vibrado",
  "Concreto de f'c=280 kg/cm² (4000 PSI), incluye vaciado y vibrado",
  "Concreto de f'c=350 kg/cm² (5000 PSI), incluye vaciado y vibrado",
  "Concreto de f'c=420 kg/cm² (6000 PSI), incluye vaciado y vibrado",
];
const TIPOS = ["edificacion", "vias", "hidrocarburos"];
const llaveConcreto = (m, tipo, nombre) => Object.keys(m).find((k) => m[k] && m[k].tipo === tipo && txt(m[k].actividad) && norm(m[k].actividad) === norm(nombre));
// Los concretos que faltan en el catálogo propio, por tipo
function concretosFaltantes(m) {
  const lista = [];
  TIPOS.forEach((tipo) => CONCRETOS_COMUNES.forEach((n) => { if (!llaveConcreto(m, tipo, n)) lista.push({ tipo, nombre: n }); }));
  return lista;
}
function completarConcretos(m) {
  let agregados = 0;
  TIPOS.forEach((tipo) => {
    CONCRETOS_COMUNES.forEach((nombre, i) => {
      if (llaveConcreto(m, tipo, nombre)) return;
      let j = -1;
      for (let k = i - 1; k >= 0 && j < 0; k--) if (llaveConcreto(m, tipo, CONCRETOS_COMUNES[k])) j = k;
      let tpl = null, orden = 0;
      if (j >= 0) { tpl = m[llaveConcreto(m, tipo, CONCRETOS_COMUNES[j])]; orden = (Number(tpl.orden) || 0) + 0.001 * (i - j); }
      else {
        for (let k = i + 1; k < CONCRETOS_COMUNES.length && !tpl; k++) { const kk = llaveConcreto(m, tipo, CONCRETOS_COMUNES[k]); if (kk) { tpl = m[kk]; orden = (Number(tpl.orden) || 0) - 0.001 * (k - i); } }
      }
      if (!tpl) return;
      const nuevo = { tipo, capitulo: tpl.capitulo, actividad: nombre, unidad: "m³", orden, actualizado: Date.now() };
      ["subcapitulo", "grupo", "metodo"].forEach((c) => { if (txt(tpl[c])) nuevo[c] = tpl[c]; });
      let k2 = clavAct(nuevo); let n = 2; while (m[k2]) k2 = `${clavAct(nuevo)}~${n++}`;
      m[k2] = nuevo; agregados += 1;
    });
  });
  return agregados;
}

// Actividades unificadas que le faltan a algún tipo de proyecto: toda actividad unificada debe existir, con el mismo nombre y unidad, en los tres tipos.
function llavePorNombre(m, tipo, nombre) { return Object.keys(m).find((k) => m[k] && m[k].tipo === tipo && txt(m[k].actividad) && norm(m[k].actividad) === norm(nombre)); }
function faltantesUnificadas(m) {
  const lista = [];
  UNIFICACION.forEach(([nombre, unidad]) => {
    const donde = TIPOS.filter((t) => llavePorNombre(m, t, nombre));
    if (!donde.length) return;                       // no existe en ningún tipo (se quitó a propósito): no se agrega
    TIPOS.forEach((tipo) => { if (!donde.includes(tipo)) lista.push({ tipo, nombre, unidad, fuente: donde[0] }); });
  });
  return lista;
}
function completarUnificadas(m) {
  let agregadas = 0;
  faltantesUnificadas(m).forEach(({ tipo, nombre, unidad, fuente }) => {
    const tpl = m[llavePorNombre(m, fuente, nombre)];
    const delTipo = Object.values(m).filter((x) => x && x.tipo === tipo && txt(x.actividad));
    const delCapitulo = delTipo.filter((x) => norm(x.capitulo) === norm(tpl.capitulo));
    const maxOrden = (l) => l.reduce((mx, x) => Math.max(mx, Number(x.orden) || 0), 0);
    const orden = delCapitulo.length ? maxOrden(delCapitulo) + 0.001 : maxOrden(delTipo) + 10;
    const nuevo = { tipo, capitulo: tpl.capitulo, actividad: nombre, unidad, orden, actualizado: Date.now() };
    ["subcapitulo", "grupo", "metodo"].forEach((c) => { if (txt(tpl[c])) nuevo[c] = tpl[c]; });
    let k2 = clavAct(nuevo); let n = 2; while (m[k2]) k2 = `${clavAct(nuevo)}~${n++}`;
    m[k2] = nuevo; agregadas += 1;
  });
  return agregadas;
}

// Llaves del catálogo propio que corresponden a la lista de nombres anteriores de un tipo (sin repetir)
function llavesDe(m, tipo, lista) {
  const llaves = [];
  lista.forEach(([ant, uni]) => Object.keys(m).forEach((k) => { const x = m[k]; if (x && x.tipo === tipo && norm(x.actividad) === norm(ant) && norm(x.unidad) === norm(uni) && !llaves.includes(k)) llaves.push(k); }));
  return llaves;
}
// Aplica la unificación sobre un catálogo propio (m se modifica) y devuelve cuántas cosas cambió
function unificarMapa(m) {
  let renombradas = 0, quitadas = 0;
  const yaAplicada = !!m[MARCA];
  if (!yaAplicada) {
    UNIFICACION.forEach(([nombre, unidad, tipos]) => {
      Object.entries(tipos).forEach(([tipo, lista]) => {
        const llaves = llavesDe(m, tipo, lista);
        if (!llaves.length) return;
        const guardian = m[llaves[0]];
        const nuevo = { ...guardian, actividad: nombre, unidad, actualizado: Date.now() };
        llaves.forEach((k) => { delete m[k]; });
        let k2 = clavAct(nuevo); let n = 2; while (m[k2]) k2 = `${clavAct(nuevo)}~${n++}`;
        m[k2] = nuevo;
        renombradas += 1; quitadas += llaves.length - 1;
      });
    });
    m[MARCA] = { unificacion: 1, actualizado: Date.now() };
  }
  let agregadas = 0;
  if (!m[MARCA_V2]) {
    agregadas = completarConcretos(m) + completarUnificadas(m);
    m[MARCA_V2] = { unificacion: 2, actualizado: Date.now() };
  }
  return { yaAplicada, renombradas, quitadas, agregadas };
}
export function resumenPendiente() {
  const m = mapaVivo();
  if (!Object.values(m).some((x) => x && txt(x.actividad))) return null;
  if (m[MARCA] && m[MARCA_V2]) return null;
  const r = unificarMapa(JSON.parse(JSON.stringify(m)));   // se calcula sobre una copia
  if (!r.renombradas && !r.quitadas && !r.agregadas) return null;
  return { renombradas: r.renombradas, quitadas: r.quitadas, agregadas: r.agregadas };
}
export function aplicarUnificacionCatalogo() {
  const m = mapaVivo();
  if (!Object.values(m).some((x) => x && txt(x.actividad))) return { ok: true, sinCatalogoPropio: true, renombradas: 0, quitadas: 0, agregadas: 0 };
  const r = unificarMapa(m);
  guardar(CLAVE_ACT, m);
  return { ok: true, yaAplicada: r.yaAplicada && !r.agregadas, renombradas: r.renombradas, quitadas: r.quitadas, agregadas: r.agregadas };
}

// ---------- Datos guardados en este equipo (se puede correr cuantas veces haga falta: solo escribe si algo cambia) ----------
const reclave = (obj, esAPU) => {
  const salida = {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    const a = ALIAS.get(norm(v && v.actividad ? v.actividad : k));
    if (!a) { if (!(k in salida)) salida[k] = v; return; }
    const nk = a.nombre.trim().toLowerCase();
    const nv = v && typeof v === "object" ? { ...v, actividad: a.nombre, unidad: a.unidad || v.unidad } : v;
    if (!(nk in salida)) { salida[nk] = nv; return; }
    const ex = salida[nk];
    if (esAPU) { if (txt(nv && nv.fecha) > txt(ex && ex.fecha)) salida[nk] = nv; }                                  // APU: queda el más reciente
    else if (ex && nv && typeof ex.cantidad === "number" && typeof nv.cantidad === "number") salida[nk] = { ...ex, cantidad: ex.cantidad + nv.cantidad };   // Presupuesto: se suman las cantidades
  });
  return JSON.stringify(salida) !== JSON.stringify(obj) ? salida : null;
};
export function migrarDatosLocales() {
  if (!unificacionActiva()) return false;
  const mapa = mapaVivo();
  if (hayCatalogoPropio() && !mapa[MARCA]) return false;
  let tocado = false;
  const apus = reclave(leer("ryr_apus_guardados", {}), true); if (apus) { guardar("ryr_apus_guardados", apus); tocado = true; }
  const pres = reclave(leer("ryr_presupuesto_cantidades", {}), false); if (pres) { guardar("ryr_presupuesto_cantidades", pres); tocado = true; }
  const acta = leer("ryr_acta_acumulado", {});
  if (acta && Object.keys(acta).length) {
    const nueva = {}; let c = false;
    Object.keys(acta).forEach((k) => { const a = ALIAS.get(norm(k)); if (a) { c = true; nueva[a.nombre] = (Number(nueva[a.nombre]) || 0) + (Number(acta[k]) || 0); } else if (!(k in nueva)) nueva[k] = acta[k]; });
    if (c && JSON.stringify(nueva) !== JSON.stringify(acta)) { guardar("ryr_acta_acumulado", nueva); tocado = true; }
  }
  if (renombrarEnBorradores()) tocado = true;
  return tocado;
}
// Presupuesto, Cantidades de obra y Cronograma sin terminar: sus filas guardan el nombre de la actividad; se pasan al nombre unificado.
function renombrarEnBorradores() {
  let cambio = false;
  const pasar = (clave, campoLista, campoNombre, campoUnidad) => {
    const d = leer(clave, null);
    if (!d || !Array.isArray(d[campoLista])) return;
    let c = false;
    const lista = d[campoLista].map((f) => {
      if (!f || typeof f !== "object") return f;
      const a = ALIAS.get(norm(f[campoNombre]));
      if (!a || a.nombre === f[campoNombre]) return f;
      c = true;
      const n = { ...f, [campoNombre]: a.nombre };
      if (campoUnidad && a.unidad) n[campoUnidad] = a.unidad;
      return n;
    });
    if (c) { guardar(clave, { ...d, [campoLista]: lista }); cambio = true; }
  };
  pasar("ryr_borrador_presupuesto", "filas", "actividad", "unidad");
  pasar("ryr_borrador_cantidades", "actividades", "actividad", "unidad");
  pasar("ryr_borrador_cronograma", "tareas", "nombre", null);
  return cambio;
}
