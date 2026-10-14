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
// Llaves del catálogo propio que corresponden a la lista de nombres anteriores de un tipo (sin repetir)
function llavesDe(m, tipo, lista) {
  const llaves = [];
  lista.forEach(([ant, uni]) => Object.keys(m).forEach((k) => { const x = m[k]; if (x && x.tipo === tipo && norm(x.actividad) === norm(ant) && norm(x.unidad) === norm(uni) && !llaves.includes(k)) llaves.push(k); }));
  return llaves;
}
export function resumenPendiente() {
  const m = mapaVivo();
  if (!Object.values(m).some((x) => x && txt(x.actividad)) || m[MARCA]) return null;
  let renombradas = 0, quitadas = 0;
  UNIFICACION.forEach(([, , tipos]) => Object.entries(tipos).forEach(([tipo, lista]) => {
    const n = llavesDe(m, tipo, lista).length;
    if (n) { renombradas += 1; quitadas += n - 1; }
  }));
  return { renombradas, quitadas };
}
export function aplicarUnificacionCatalogo() {
  const m = mapaVivo();
  if (m[MARCA]) return { ok: true, yaAplicada: true, renombradas: 0, quitadas: 0 };
  if (!Object.values(m).some((x) => x && txt(x.actividad))) return { ok: true, sinCatalogoPropio: true, renombradas: 0, quitadas: 0 };
  let renombradas = 0, quitadas = 0;
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
  guardar(CLAVE_ACT, m);
  return { ok: true, renombradas, quitadas };
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
  return tocado;
}
