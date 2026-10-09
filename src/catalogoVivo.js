// catalogoVivo.js — catálogos de precios (materiales, mano de obra, equipos) que el administrador puede cambiar desde la app.
// Sin pantallas. Los datos viven en el dispositivo (claves ryr_cat_*) y el motor de sincronización los espeja con Firestore.
// Si todavía no hay catálogo guardado, se usa el que trae el código (catalogoPrecios.js): nada se rompe.
import { CATALOGO_MATERIALES, CATALOGO_MANO_OBRA, CATALOGO_EQUIPOS } from "./catalogoPrecios";
import { CATALOGO_ACTIVIDADES_BASE } from "./catalogoActividades";

export const CATALOGOS = [
  { id: "materiales", titulo: "Materiales", clave: "ryr_cat_materiales", col: "cat_materiales", base: CATALOGO_MATERIALES, unidadSug: "u" },
  { id: "mano_obra", titulo: "Mano de obra", clave: "ryr_cat_mano_obra", col: "cat_mano_obra", base: CATALOGO_MANO_OBRA, unidadSug: "día" },
  { id: "equipos", titulo: "Equipos y herramientas", clave: "ryr_cat_equipos", col: "cat_equipos", base: CATALOGO_EQUIPOS, unidadSug: "día" },
];
export const catalogoDef = (id) => CATALOGOS.find((c) => c.id === id);

const leer = (clave) => { try { const t = localStorage.getItem(clave); const v = t ? JSON.parse(t) : {}; return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria */ } };
const txt = (v) => String(v === undefined || v === null ? "" : v).trim();
const clave = (t) => txt(t).toLowerCase().replace(/\s+/g, " ");

// Precio escrito por una persona: "3.920", "3920,5", "$ 1.200.000" -> número; vacío o ilegible -> null
export function precioDeTexto(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  let t = txt(v).replace(/\s|\$/g, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(",", ".");
  const n = Number(t);
  return t !== "" && !isNaN(n) ? n : null;
}

// Ítems vigentes de un catálogo: los de la nube/dispositivo si ya hay, o los del código
export function catalogoVigente(id) {
  const def = catalogoDef(id);
  if (!def) return [];
  const items = Object.values(leer(def.clave)).filter((x) => x && txt(x.descripcion));
  if (!items.length) return def.base;
  return items.slice().sort((a, b) => txt(a.descripcion).localeCompare(txt(b.descripcion), "es"));
}
export const hayCatalogoPropio = (id) => { const def = catalogoDef(id); return !!def && Object.values(leer(def.clave)).some((x) => x && txt(x.descripcion)); };
export const mapaDe = (id) => leer(catalogoDef(id).clave);

// Antes de cambiar algo se copia el catálogo del código al dispositivo (si no estaba): así lo que no se toca sigue ahí.
export function sembrarBase(id) {
  const def = catalogoDef(id);
  const m = leer(def.clave);
  if (Object.values(m).some((x) => x && txt(x.descripcion))) return false;
  const nuevo = {};
  def.base.forEach((it) => {
    let k = txt(it.codigo) || `S-${Object.keys(nuevo).length + 1}`;
    let n = 2; while (nuevo[k]) k = `${txt(it.codigo)}~${n++}`;
    nuevo[k] = { codigo: txt(it.codigo), descripcion: txt(it.descripcion), unidad: txt(it.unidad), precio: Number(it.precio) || 0, actualizado: Date.now() };
  });
  guardar(def.clave, nuevo);
  return true;
}
export function codigoNuevo(id) {
  const def = catalogoDef(id);
  const m = leer(def.clave);
  let n = Object.keys(m).length + 1, k;
  do { k = `N-${def.id.slice(0, 3).toUpperCase()}-${String(n++).padStart(3, "0")}`; } while (m[k]);
  return k;
}
// Agrega o cambia un ítem. `llave` = la clave con la que ya estaba (para cambiar su código sin duplicarlo).
export function guardarItem(id, item, llave) {
  const def = catalogoDef(id);
  const desc = txt(item.descripcion), precio = precioDeTexto(item.precio);
  if (!desc) return { ok: false, error: "Escribe la descripción." };
  if (precio === null || precio < 0) return { ok: false, error: "Escribe un precio válido." };
  sembrarBase(id);
  const m = leer(def.clave);
  const codigo = txt(item.codigo) || codigoNuevo(id);
  const k = llave && m[llave] ? llave : codigo;
  if (!llave && m[k]) return { ok: false, error: `Ya existe un ítem con el código ${codigo}.` };
  if (Object.keys(m).some((o) => o !== k && clave(m[o].descripcion) === clave(desc) && txt(m[o].unidad) === txt(item.unidad))) return { ok: false, error: "Ya existe un ítem con esa descripción y unidad." };
  m[k] = { codigo, descripcion: desc, unidad: txt(item.unidad), precio, actualizado: Date.now() };
  guardar(def.clave, m);
  return { ok: true, llave: k };
}
export function quitarItem(id, llave) {
  const def = catalogoDef(id);
  sembrarBase(id);
  const m = leer(def.clave);
  if (!m[llave]) return false;
  delete m[llave];
  guardar(def.clave, m);
  return true;
}
// Llaves de los ítems vigentes (para editar/quitar) con su ítem
export function itemsConLlave(id) {
  const def = catalogoDef(id);
  const m = leer(def.clave);
  if (!Object.values(m).some((x) => x && txt(x.descripcion))) {
    return def.base.map((it, i) => ({ llave: txt(it.codigo) || `S-${i + 1}`, item: it }));
  }
  return Object.keys(m).map((k) => ({ llave: k, item: m[k] })).filter((x) => x.item && txt(x.item.descripcion))
    .sort((a, b) => txt(a.item.descripcion).localeCompare(txt(b.item.descripcion), "es"));
}

// ---------- Excel ----------
export const ENCABEZADOS_EXCEL = ["Código", "Descripción", "Unidad", "Precio"];
export const filasParaExcel = (id) => itemsConLlave(id).map(({ item }) => [txt(item.codigo), txt(item.descripcion), txt(item.unidad), Number(item.precio) || 0]);
// Convierte las filas leídas de un Excel ([código, descripción, unidad, precio]) en cambios sobre el catálogo.
// Se reconoce el ítem por el código; si no trae código, por la descripción. Devuelve el resumen.
export function importarFilas(id, filas) {
  const def = catalogoDef(id);
  const limpias = [];
  const errores = [];
  filas.forEach((f, i) => {
    const [cod, desc, uni, pre] = [txt(f[0]), txt(f[1]), txt(f[2]), f[3]];
    if (!cod && !desc && (pre === undefined || pre === null || txt(pre) === "")) return;          // fila vacía
    if (/^c[oó]digo$/i.test(cod) && /^descripci[oó]n$/i.test(desc)) return;                       // encabezado
    const p = precioDeTexto(pre);
    if (!desc) { errores.push(`Fila ${i + 1}: falta la descripción`); return; }
    if (p === null || p < 0) { errores.push(`Fila ${i + 1} («${desc}»): precio no válido`); return; }
    limpias.push({ codigo: cod, descripcion: desc, unidad: uni, precio: p });
  });
  if (!limpias.length) return { nuevos: 0, actualizados: 0, sinCambio: 0, errores: errores.length ? errores : ["El archivo no tiene filas con datos."] };
  sembrarBase(id);
  const m = leer(def.clave);
  let nuevos = 0, actualizados = 0, sinCambio = 0;
  limpias.forEach((it) => {
    let k = it.codigo && m[it.codigo] ? it.codigo : null;
    if (!k) k = Object.keys(m).find((o) => clave(m[o].descripcion) === clave(it.descripcion) && (!it.unidad || txt(m[o].unidad) === it.unidad)) || null;
    if (k) {
      const a = m[k];
      if (Number(a.precio) === it.precio && (!it.unidad || txt(a.unidad) === it.unidad) && txt(a.descripcion) === it.descripcion) { sinCambio++; return; }
      m[k] = { ...a, descripcion: it.descripcion, unidad: it.unidad || a.unidad, precio: it.precio, actualizado: Date.now() };
      actualizados++;
    } else {
      const codigo = it.codigo || codigoNuevo(id);
      let llave = codigo; let n = 2; while (m[llave]) llave = `${codigo}~${n++}`;
      m[llave] = { codigo, descripcion: it.descripcion, unidad: it.unidad, precio: it.precio, actualizado: Date.now() };
      nuevos++;
    }
  });
  guardar(def.clave, m);
  return { nuevos, actualizados, sinCambio, errores };
}

// =====================================================================================================================
// ACTIVIDADES (Edificaciones, Vías e Hidrocarburos): las usan el Presupuesto, las Cantidades, el Cronograma y el APU.
// Cada actividad es un documento; el orden del catálogo se guarda en `orden`.
// =====================================================================================================================
export const ACTIVIDADES = { id: "actividades", titulo: "Actividades", clave: "ryr_cat_actividades", col: "cat_actividades" };
export const TIPOS_PROYECTO = [
  { id: "edificacion", nombre: "Edificaciones" },
  { id: "vias", nombre: "Vías y carreteras" },
  { id: "hidrocarburos", nombre: "Hidrocarburos" },
];
const clavAct = (it) => `${it.tipo}|${clave(it.actividad)}|${clave(it.unidad)}`;
let cacheAct = { raw: null, valor: null };

function ordenarAct(lista) {
  return lista.slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || txt(a.actividad).localeCompare(txt(b.actividad), "es"));
}
// Actividades vigentes: las del dispositivo/nube si ya hay; si no, las del código. Sin `orden`, en el orden del catálogo base.
export function actividadesVigentes() {
  let raw = null;
  try { raw = localStorage.getItem(ACTIVIDADES.clave); } catch (e) { raw = null; }
  if (cacheAct.valor && cacheAct.raw === raw) return cacheAct.valor;
  let valor = CATALOGO_ACTIVIDADES_BASE;
  if (raw) {
    try {
      const m = JSON.parse(raw);
      const items = Object.values(m && typeof m === "object" ? m : {}).filter((x) => x && txt(x.actividad) && x.tipo);
      if (items.length) valor = ordenarAct(items);
    } catch (e) { /* queda el del código */ }
  }
  cacheAct = { raw, valor };
  return valor;
}
const mapaAct = () => leer(ACTIVIDADES.clave);
export const hayActividadesPropias = () => Object.values(mapaAct()).some((x) => x && txt(x.actividad));
// Llaves del catálogo base (únicas: si dos actividades quedan iguales, la segunda lleva ~2)
let llavesBase = null;
function llavesDeLaBase() {
  if (llavesBase) return llavesBase;
  const usadas = new Set();
  llavesBase = CATALOGO_ACTIVIDADES_BASE.map((it) => { let k = clavAct(it); let n = 2; while (usadas.has(k)) k = `${clavAct(it)}~${n++}`; usadas.add(k); return k; });
  return llavesBase;
}
export function sembrarActividades() {
  const m = mapaAct();
  if (Object.values(m).some((x) => x && txt(x.actividad))) return false;
  const nuevo = {};
  const llaves = llavesDeLaBase();
  CATALOGO_ACTIVIDADES_BASE.forEach((it, i) => { nuevo[llaves[i]] = { ...it, orden: (i + 1) * 10, actualizado: Date.now() }; });
  guardar(ACTIVIDADES.clave, nuevo);
  return true;
}
export function itemsActividades(tipo) {
  const m = mapaAct();
  const hay = Object.values(m).some((x) => x && txt(x.actividad));
  const lista = hay
    ? ordenarAct(Object.keys(m).filter((k) => m[k] && txt(m[k].actividad)).map((k) => ({ ...m[k], __llave: k })))
    : CATALOGO_ACTIVIDADES_BASE.map((it, i) => ({ ...it, orden: (i + 1) * 10, __llave: llavesDeLaBase()[i] }));
  return (tipo ? lista.filter((x) => x.tipo === tipo) : lista).map((x) => ({ llave: x.__llave, item: x }));
}
// Orden para una actividad nueva: justo después de la última de su mismo capítulo y subcapítulo (o capítulo; o del tipo)
function ordenParaNueva(m, it) {
  const todas = Object.values(m).filter((x) => x && x.tipo === it.tipo);
  const mismas = (ks) => todas.filter((x) => ks.every((k) => txt(x[k]) === txt(it[k])));
  for (const ks of [["capitulo", "subcapitulo"], ["capitulo"], []]) {
    const g = mismas(ks);
    if (g.length) return Math.max(...g.map((x) => Number(x.orden) || 0)) + 1;
  }
  return Math.max(0, ...Object.values(m).map((x) => Number(x && x.orden) || 0)) + 10;
}
export function guardarActividad(item, llave) {
  const act = txt(item.actividad), uni = txt(item.unidad);
  if (!TIPOS_PROYECTO.some((t) => t.id === item.tipo)) return { ok: false, error: "Elige el tipo de proyecto." };
  if (!act) return { ok: false, error: "Escribe el nombre de la actividad." };
  if (!uni) return { ok: false, error: "Escribe la unidad." };
  if (!txt(item.capitulo)) return { ok: false, error: "Escribe el capítulo." };
  sembrarActividades();
  const m = mapaAct();
  const nuevo = { ...(llave && m[llave] ? m[llave] : {}), tipo: item.tipo, codigo: txt(item.codigo), capitulo: txt(item.capitulo), subcapitulo: txt(item.subcapitulo), grupo: txt(item.grupo), actividad: act, unidad: uni, metodo: txt(item.metodo) };
  ["codigo", "grupo", "metodo", "subcapitulo"].forEach((k) => { if (!nuevo[k]) delete nuevo[k]; });
  const k = llave && m[llave] ? llave : clavAct(nuevo);
  if (!llave && m[k]) return { ok: false, error: "Ya existe esa actividad con esa unidad en este tipo de proyecto." };
  if (Object.keys(m).some((o) => o !== k && clavAct(m[o]) === clavAct(nuevo))) return { ok: false, error: "Ya existe esa actividad con esa unidad en este tipo de proyecto." };
  if (!llave || !m[k]) nuevo.orden = ordenParaNueva(m, nuevo);
  nuevo.actualizado = Date.now();
  m[k] = nuevo;
  guardar(ACTIVIDADES.clave, m);
  return { ok: true, llave: k };
}
export function quitarActividad(llave) {
  sembrarActividades();
  const m = mapaAct();
  if (!m[llave]) return false;
  delete m[llave];
  guardar(ACTIVIDADES.clave, m);
  return true;
}
export const ENCABEZADOS_EXCEL_ACT = ["Tipo (edificacion / vias / hidrocarburos)", "Código", "Capítulo", "Subcapítulo", "Grupo", "Actividad", "Unidad", "Método sugerido"];
export const filasActividadesParaExcel = () => itemsActividades().map(({ item }) => [item.tipo, txt(item.codigo), txt(item.capitulo), txt(item.subcapitulo), txt(item.grupo), txt(item.actividad), txt(item.unidad), txt(item.metodo)]);
const tipoDeTexto = (t) => {
  const k = clave(t).replace(/[áéíóú]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[c]));
  if (k.startsWith("edif") || k.startsWith("reform")) return "edificacion";
  if (k.startsWith("via") || k.startsWith("carret")) return "vias";
  if (k.startsWith("hidro")) return "hidrocarburos";
  return "";
};
// Filas leídas de un Excel ([tipo, código, capítulo, subcapítulo, grupo, actividad, unidad, método]). Reconoce la actividad por tipo+nombre+unidad.
export function importarActividades(filas) {
  const limpias = []; const errores = [];
  filas.forEach((f, i) => {
    const [t, cod, cap, sub, gru, act, uni, met] = [f[0], txt(f[1]), txt(f[2]), txt(f[3]), txt(f[4]), txt(f[5]), txt(f[6]), txt(f[7])];
    if (!txt(t) && !act && !cap) return;
    if (/^tipo/i.test(txt(t)) && /^actividad/i.test(act)) return;
    const tipo = tipoDeTexto(t);
    if (!tipo) { errores.push(`Fila ${i + 1}: tipo de proyecto no reconocido («${txt(t)}»)`); return; }
    if (!act || !uni || !cap) { errores.push(`Fila ${i + 1}: faltan actividad, unidad o capítulo`); return; }
    limpias.push({ tipo, codigo: cod, capitulo: cap, subcapitulo: sub, grupo: gru, actividad: act, unidad: uni, metodo: met });
  });
  if (!limpias.length) return { nuevos: 0, actualizados: 0, sinCambio: 0, errores: errores.length ? errores : ["El archivo no tiene filas con datos."] };
  sembrarActividades();
  const m = mapaAct();
  let nuevos = 0, actualizados = 0, sinCambio = 0;
  limpias.forEach((it) => {
    const k = Object.keys(m).find((o) => clavAct(m[o]) === clavAct(it));
    if (k) {
      const a = m[k];
      const igual = ["codigo", "capitulo", "subcapitulo", "grupo", "metodo"].every((c) => txt(a[c]) === txt(it[c]) || (!txt(it[c]) && c !== "capitulo"));
      if (igual) { sinCambio++; return; }
      const mezcla = { ...a };
      ["codigo", "capitulo", "subcapitulo", "grupo", "metodo"].forEach((c) => { if (txt(it[c])) mezcla[c] = it[c]; });
      mezcla.actualizado = Date.now(); m[k] = mezcla; actualizados++;
    } else {
      const nuevo = { ...it }; ["codigo", "subcapitulo", "grupo", "metodo"].forEach((c) => { if (!nuevo[c]) delete nuevo[c]; });
      nuevo.orden = ordenParaNueva(m, nuevo); nuevo.actualizado = Date.now();
      let llave = clavAct(nuevo); let n = 2; while (m[llave]) llave = `${clavAct(nuevo)}~${n++}`;
      m[llave] = nuevo; nuevos++;
    }
  });
  guardar(ACTIVIDADES.clave, m);
  return { nuevos, actualizados, sinCambio, errores };
}
