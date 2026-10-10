// Sincronización de Control Presupuestal (y de los datos de Gestión Técnica que este usa) con el servidor.
//
// Cómo funciona, en corto:
//  - Los formularios siguen leyendo y escribiendo en el dispositivo (así funcionan sin señal y no hubo que cambiarlos).
//  - Este motor "espeja" esos datos con Firestore: lo que cambia en el dispositivo se sube, lo que cambia en el servidor baja.
//  - Cada registro (una factura, un adicional, una obra...) es un documento. Si dos personas cambian el MISMO registro, gana el último cambio.
//  - Al cerrar sesión se borra la copia del dispositivo (si ya quedó todo subido), para que otra persona que use el mismo equipo no la vea.
//
// Este archivo NO importa Firebase: recibe un «adaptador» (ver sincronizarFirestore.js), así se puede probar con dos dispositivos simulados.

const G = "gerente", D = "director", R = "residente", A = "administrativo", L = "almacenista";

// Cada flujo = una colección del servidor. leer / escribir = cargos que pueden (el administrador siempre puede).
// Es la misma matriz de cpPermisos.jsx; las reglas del servidor (firestore.rules) se generan desde esta tabla con generar_reglas.js.
export const FLUJOS = [
  { col: "cp_obras",          clave: "ryr_cp_obras",          tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A, L], escribir: [G, D, R, A] },
  { col: "cp_facturas",       clave: "ryr_cp_facturas",       tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A],    escribir: [G, D, R, A] },
  { col: "cp_adicionales",    clave: "ryr_cp_adicionales",    tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_anticipo_actas", clave: "ryr_cp_anticipo_actas", tipo: "lista", idDe: (r) => r.id,       leer: [G, D, A],       escribir: [G, A] },
  { col: "cp_materiales",     clave: "ryr_cp_materiales",     tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A, L], escribir: [G, D, R, L] },
  { col: "cp_subcontratos",   clave: "ryr_cp_subcontratos",   tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_mano_obra",      clave: "ryr_cp_mano_obra",      tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_equipos",        clave: "ryr_cp_equipos",        tipo: "lista", idDe: (r) => r.id,       leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_cuentas",        clave: "ryr_cp_cuentas",        tipo: "lista", idDe: (r) => r.id,       leer: [G, D, A],       escribir: [G, A] },
  { col: "cp_flujo",          clave: "ryr_cp_flujo",          tipo: "lista", idDe: (r) => r.id,       leer: [G, D, A],       escribir: [G, A] },
  // Encabezados y fichas por formato y obra (clave local «formato|obra»). Costos y Cierre guardan ahí cifras de rentabilidad.
  { col: "cp_cab_materiales", clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "materiales|", leer: [G, D, R, A, L], escribir: [G, D, R, L] },
  { col: "cp_cab_manoObra",   clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "manoObra|",   leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_cab_equipos",    clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "equipos|",    leer: [G, D, R, A],    escribir: [G, D, R] },
  { col: "cp_cab_cuentas",    clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "cuentas|",    leer: [G, D, A],       escribir: [G, A] },
  { col: "cp_cab_flujo",      clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "flujo|",      leer: [G, D, A],       escribir: [G, A] },
  { col: "cp_cab_costos",     clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "costos|",     leer: [G, D, A],       escribir: [G] },
  { col: "cp_cab_cierre",     clave: "ryr_cp_cabeceras", tipo: "mapa", prefijo: "cierre|",     leer: [G, D, A],       escribir: [G] },
  // Datos de Gestión Técnica que Control Presupuestal necesita (los escribe quien tenga la gestión Técnica).
  { col: "cp_tecnica_presupuesto", clave: "ryr_presupuesto_cantidades", tipo: "mapa", tecnica: true },
  { col: "cp_tecnica_acta",        clave: "ryr_acta_acumulado",         tipo: "mapa", tecnica: true },
  { col: "cp_tecnica_actasvalor",  clave: "ryr_actas_valor_presente",   tipo: "mapa", tecnica: true },
  { col: "cp_tecnica_proyectos",   clave: "ryr_proyectos_guardados",    tipo: "lista", idDe: (r) => r.nombreId, tecnica: true },
  // Gestión de Calidad: cada formato es una colección; escriben y leen el administrador y quien tenga la gestión «calidad».
  { col: "cal_planos",            clave: "ryr_cal_planos",            tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_recepcion",         clave: "ryr_cal_recepcion",         tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_proveedores_eval",  clave: "ryr_cal_proveedores_eval",  tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_ensayos",           clave: "ryr_cal_ensayos",           tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_proveedores",       clave: "ryr_cal_proveedores",       tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_nc",                clave: "ryr_cal_nc",                tipo: "lista", idDe: (r) => r.id, calidad: true },
  // Gestión de Calidad: cada formato es una colección; leen y escriben el administrador y quien tenga la gestión «calidad».
  { col: "cal_obras",             clave: "ryr_cal_obras",             tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_planos",            clave: "ryr_cal_planos",            tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_recepcion",         clave: "ryr_cal_recepcion",         tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_proveedores_eval",  clave: "ryr_cal_proveedores_eval",  tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_ensayos",           clave: "ryr_cal_ensayos",           tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_proveedores",       clave: "ryr_cal_proveedores",       tipo: "lista", idDe: (r) => r.id, calidad: true },
  { col: "cal_nc",                clave: "ryr_cal_nc",                tipo: "lista", idDe: (r) => r.id, calidad: true },
  // Catálogos (materiales, mano de obra, equipos): los lee todo usuario activo; solo el administrador los cambia.
  { col: "cat_materiales", clave: "ryr_cat_materiales", tipo: "mapa", catalogo: true },
  { col: "cat_mano_obra",  clave: "ryr_cat_mano_obra",  tipo: "mapa", catalogo: true },
  { col: "cat_equipos",    clave: "ryr_cat_equipos",    tipo: "mapa", catalogo: true },
  { col: "cat_actividades", clave: "ryr_cat_actividades", tipo: "mapa", catalogo: true },
];
export const CLAVES_SINCRONIZADAS = Array.from(new Set(FLUJOS.map((f) => f.clave)));
export const CLAVE_ESTADO_SYNC = "ryr_sync_estado";
export const CLAVE_UID_SYNC = "ryr_sync_uid";

// ¿Este perfil puede leer / escribir este flujo? (el servidor lo vuelve a comprobar)
export function puede(perfil, f, modo) {
  if (!perfil) return false;
  if (perfil.esAdmin) return true;
  if (f.catalogo) return modo === "leer";                       // los catálogos: todos leen, solo el administrador escribe
  const roles = perfil.roles || [];
  if (f.calidad) return roles.includes("calidad");
  if (f.tecnica) return roles.includes("tecnica") || (modo === "leer" && roles.includes("presupuesto"));
  if (!roles.includes("presupuesto")) return false;
  return (f[modo] || []).includes(perfil.rolCP);
}

// ---------- Utilidades ----------
export const codificarId = (k) => btoa(unescape(encodeURIComponent(String(k)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const decodificarId = (s) => decodeURIComponent(escape(atob(String(s).replace(/-/g, "+").replace(/_/g, "/"))));
// Forma canónica para comparar: ignora `actualizado` (los formularios lo renuevan en cada guardado aunque nada haya cambiado)
const canon = (v) => JSON.stringify(v, (k, x) => (k === "actualizado" ? undefined : x));
const leer = (almacen, clave, porDefecto) => { try { const t = almacen.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } };
const escribir = (almacen, clave, valor) => { try { almacen.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria */ } };

// Registros locales de un flujo como { id: objeto }
function registrosLocales(almacen, f) {
  const out = {};
  if (f.tipo === "lista") {
    const a = leer(almacen, f.clave, []);
    (Array.isArray(a) ? a : []).forEach((r) => { const id = r && f.idDe(r); if (id) out[id] = r; });
  } else {
    const m = leer(almacen, f.clave, {}) || {};
    Object.keys(m).forEach((k) => { if (!f.prefijo || k.startsWith(f.prefijo)) out[k] = m[k]; });
  }
  return out;
}
function guardarRegistrosLocales(almacen, f, regs) {
  if (f.tipo === "lista") {
    const actual = leer(almacen, f.clave, []);
    const lista = Array.isArray(actual) ? actual : [];
    const vistos = new Set();
    const salida = [];
    lista.forEach((r) => { const id = r && f.idDe(r); if (!id) return; if (regs[id] !== undefined) { salida.push(regs[id]); vistos.add(id); } });   // conserva el orden local
    const nuevos = Object.keys(regs).filter((id) => !vistos.has(id)).map((id) => regs[id]);
    nuevos.sort((x, y) => (Number(y && y.actualizado) || 0) - (Number(x && x.actualizado) || 0));                                                  // lo nuevo, al frente y lo más reciente primero
    salida.unshift(...nuevos);
    escribir(almacen, f.clave, salida);
  } else {
    const m = leer(almacen, f.clave, {}) || {};
    Object.keys(m).forEach((k) => { if ((!f.prefijo || k.startsWith(f.prefijo)) && regs[k] === undefined) delete m[k]; });
    Object.keys(regs).forEach((k) => { m[k] = regs[k]; });
    escribir(almacen, f.clave, m);
  }
}

// ---------- Motor ----------
export function crearMotor({ almacen, adaptador, uid, perfil, ahora = () => Date.now(), onEvento = () => {}, retardo = 700, esperaInicial = 6000, flujos = FLUJOS }) {
  const mios = flujos.filter((f) => puede(perfil, f, "leer"));
  const estadoTodo = leer(almacen, CLAVE_ESTADO_SYNC, {}) || {};
  const est = (f) => (estadoTodo[f.col] = estadoTodo[f.col] || { base: {}, ts: {} });
  const guardarEstado = () => escribir(almacen, CLAVE_ESTADO_SYNC, estadoTodo);
  const bajas = [];
  let temporizador = null, detenido = false, enCurso = Promise.resolve();
  const primeros = new Set();
  let resolverListo; const listo = new Promise((r) => { resolverListo = r; });
  const marcarPrimero = (col) => { primeros.add(col); if (primeros.size >= mios.length) resolverListo(); };
  const cambiosRemotos = new Set();
  const recientes = {};            // lo que acaba de llegar del servidor: { col: { clave: { obj, t } } }
  const GRACIA_MS = 20000;         // un formulario abierto con datos viejos no puede «borrar» en este tiempo lo que acaba de llegar

  // ----- Bajar: lo que llega del servidor -----
  function alLlegar(f, docs) {
    const e = est(f);
    const loc = registrosLocales(almacen, f);
    let cambio = false;
    docs.forEach(({ id, data }) => {
      if (!data) return;
      let k; try { k = decodificarId(id); } catch (x) { return; }
      const ts = Number(data.ts) || 0;
      if (ts <= (e.ts[k] || 0)) return;                                   // ya lo tengo (incluye lo que yo mismo subí)
      const enLocal = loc[k] !== undefined;
      const localCanon = enLocal ? canon(loc[k]) : null;
      if (e.base[k] !== undefined) {
        if (enLocal && e.base[k] !== localCanon) return;                  // edité este registro y aún no subió: mi cambio se sube y gana
        if (!enLocal) return;                                              // lo borré aquí y aún no subió el borrado
      } else if (enLocal && !data.borrado) {
        let remoto = null; try { remoto = JSON.parse(data.json); } catch (x) { /* ilegible */ }
        if (remoto && canon(remoto) === localCanon) { e.base[k] = localCanon; e.ts[k] = ts; return; }
        const loc_act = Number(loc[k] && loc[k].actualizado) || 0;
        if (loc_act > ts) return;                                          // primera vez que se ven: gana lo más reciente
      }
      if (data.borrado) {
        if (enLocal) { delete loc[k]; cambio = true; }
        delete e.base[k]; e.ts[k] = ts;
      } else {
        let obj; try { obj = JSON.parse(data.json); } catch (x) { return; }
        loc[k] = obj; e.base[k] = canon(obj); e.ts[k] = ts; cambio = true;
        (recientes[f.col] = recientes[f.col] || {})[k] = { obj, t: ahora() };
      }
    });
    if (cambio) { guardarRegistrosLocales(almacen, f, loc); cambiosRemotos.add(f.col); guardarEstado(); onEvento({ tipo: "datos", col: f.col, remoto: true }); }
    else guardarEstado();
  }

  // ----- Subir: lo que cambió en el dispositivo -----
  function subir() {
    if (detenido) return Promise.resolve();
    const tareas = [];
    flujos.filter((f) => puede(perfil, f, "escribir")).forEach((f) => {
      const e = est(f);
      const loc = registrosLocales(almacen, f);
      // Protección: si «desapareció» algo que llegó hace segundos, casi seguro lo borró un formulario con datos viejos: se devuelve.
      let restaurado = false;
      const rec = recientes[f.col] || {};
      Object.keys(e.base).forEach((k) => {
        if (loc[k] !== undefined || (f.prefijo && !k.startsWith(f.prefijo))) return;
        const r = rec[k];
        if (r && ahora() - r.t < GRACIA_MS) { loc[k] = r.obj; restaurado = true; }
      });
      if (restaurado) { guardarRegistrosLocales(almacen, f, loc); onEvento({ tipo: "datos", col: f.col, remoto: true, restaurado: true }); }
      Object.keys(loc).forEach((k) => {
        const c = canon(loc[k]);
        if (e.base[k] === c) return;
        const ts = Math.max(ahora(), (e.ts[k] || 0) + 1);
        e.base[k] = c; e.ts[k] = ts;                                       // optimista: la cola sin conexión del SDK lo enviará
        tareas.push(adaptador.escribir(f.col, codificarId(k), { json: JSON.stringify(loc[k]), ts, borrado: false, por: uid }).catch((er) => onEvento({ tipo: "error", col: f.col, error: er })));
      });
      Object.keys(e.base).forEach((k) => {
        if (loc[k] !== undefined) return;
        if (f.prefijo && !k.startsWith(f.prefijo)) return;
        const ts = Math.max(ahora(), (e.ts[k] || 0) + 1);
        delete e.base[k]; e.ts[k] = ts;
        tareas.push(adaptador.escribir(f.col, codificarId(k), { json: "", ts, borrado: true, por: uid }).catch((er) => onEvento({ tipo: "error", col: f.col, error: er })));
      });
    });
    guardarEstado();
    return Promise.all(tareas).then(() => undefined);
  }

  function programar() {
    if (detenido) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { enCurso = subir(); }, retardo);
  }

  return {
    // Empieza a escuchar. Se resuelve cuando llegó la primera respuesta de todas las colecciones (o a los `esperaInicial` ms sin señal).
    async iniciar() {
      mios.forEach((f) => {
        let primera = true;
        bajas.push(adaptador.escuchar(f.col,
          (docs) => { if (detenido) return; alLlegar(f, docs); if (primera) { primera = false; marcarPrimero(f.col); } },
          (er) => { onEvento({ tipo: "error", col: f.col, error: er }); if (primera) { primera = false; marcarPrimero(f.col); } }));
      });
      if (!mios.length) resolverListo();
      const espera = new Promise((r) => setTimeout(r, esperaInicial));
      await Promise.race([listo, espera]);
      enCurso = subir();                                                   // lo que solo existe aquí (p. ej. datos de antes de la sincronización) se sube
      await enCurso;
      onEvento({ tipo: "listo" });
    },
    cambio(clave) { if (CLAVES_SINCRONIZADAS.includes(clave)) programar(); },
    enviarYa() { clearTimeout(temporizador); enCurso = subir(); return enCurso; },
    // ¿Queda algo en el dispositivo que el servidor aún no tiene?
    hayPendientes() {
      return flujos.some((f) => {
        if (!puede(perfil, f, "leer")) return false;
        const e = est(f), loc = registrosLocales(almacen, f);
        if (!puede(perfil, f, "escribir")) return false;
        return Object.keys(loc).some((k) => e.base[k] !== canon(loc[k])) || Object.keys(e.base).some((k) => loc[k] === undefined && (!f.prefijo || k.startsWith(f.prefijo)));
      });
    },
    // Termina. Con `limpiar` borra la copia del dispositivo, SOLO si todo quedó subido.
    async detener({ limpiar = false, esperarMs = 3000 } = {}) {
      clearTimeout(temporizador);
      if (!detenido) { try { await subir(); } catch (x) { /* sigue */ } }
      let confirmado = true;
      try { if (adaptador.esperarEscrituras) confirmado = await adaptador.esperarEscrituras(esperarMs); } catch (x) { confirmado = false; }
      detenido = true;
      bajas.splice(0).forEach((b) => { try { b(); } catch (x) { /* ya cerrada */ } });
      const limpio = limpiar && confirmado && !this.hayPendientes();
      if (limpio) borrarCopiaLocal(almacen, mios);
      return { limpio, confirmado };
    },
    listo,
    estado: estadoTodo,
  };
}

// Borra del dispositivo los datos sincronizados (solo los de los flujos dados) y el registro de sincronización.
export function borrarCopiaLocal(almacen, flujos = FLUJOS) {
  flujos.forEach((f) => {
    if (f.tipo === "lista") { try { almacen.removeItem(f.clave); } catch (x) { /* nada */ } return; }
    const m = leer(almacen, f.clave, {}) || {};
    Object.keys(m).forEach((k) => { if (!f.prefijo || k.startsWith(f.prefijo)) delete m[k]; });
    if (Object.keys(m).length) escribir(almacen, f.clave, m); else { try { almacen.removeItem(f.clave); } catch (x) { /* nada */ } }
  });
  try { almacen.removeItem(CLAVE_ESTADO_SYNC); almacen.removeItem(CLAVE_UID_SYNC); } catch (x) { /* nada */ }
}
