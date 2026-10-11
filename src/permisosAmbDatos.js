// Registro de Permisos Ambientales (RYR-AM-025): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";
import { PERMISOS } from "./fichaAmbientalDatos";

export const CODIGO_PERMISOS = "RYR-AM-025";
export const HOJA_PERMISOS = "Registro de Permisos";
export const SITUACIONES = ["Obtenido", "En trámite", "No requerido"];
export const AUTORIDADES = ["CAR", "Autoridad ambiental urbana", "AMVA", "Secretaría de Ambiente", "ANLA", "Alcaldía", "Empresa de servicios públicos"];
export const DIAS_AVISO_PERMISO = 60;          // los permisos se renuevan con tiempo: se avisa desde 60 días antes
export const MAX_PERMISOS = 12;
export const OPCIONES_PERMISO = [...PERMISOS.filter((p) => !/^Otro/.test(p)), "Otro:"];
export const COLORES_ESTADO_PERMISO = {
  Vigente: { relleno: "00A651", fuente: "000000" }, "Por vencer": { relleno: "FFC000", fuente: "000000" }, Vencido: { relleno: "C00000", fuente: "FFFFFF" },
  "En trámite": { relleno: "9DC3E6", fuente: "000000" }, "Sin fecha": { relleno: "FFC000", fuente: "000000" }, "No requerido": { relleno: "D9D9D9", fuente: "595959" },
};

export const SPEC_PERMISOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha de corte", "A", "C"], ["responsable", "Responsable", "E", "G"],
    ["observaciones", "3. OBSERVACIONES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "permisos", cabecera: "No.", fin: "Total de permisos", finEmpieza: true,
      columnas: { nombre: "B", autoridad: "D", resolucion: "E", expedicion: "G", vigencia: "H", situacion: "I", estado: "J", obligaciones: "K" },
      encabezados: { nombre: "Permiso o autorización", autoridad: "Autoridad", resolucion: "Resolución N°", expedicion: "Expedición", vigencia: "Vigente hasta", situacion: "Situación", estado: "Estado", obligaciones: "Obligaciones o condiciones principales" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
export const CELDAS_PERMISOS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","responsable":"G13","observaciones":"A32","tablas":{"permisos":{"fila0":16,"n":12,"columnas":{"nombre":"B","autoridad":"D","resolucion":"E","expedicion":"G","vigencia":"H","situacion":"I","estado":"J","obligaciones":"K"}}},"firmas":{"elaboro":{"nombre":"C36","cargo":"C37"},"reviso":{"nombre":"G36","cargo":"G37"},"vobo":{"nombre":"K36","cargo":"K37"}}};
export const descubrirPermisos = (ws) => descubrirPorEtiquetas(ws, SPEC_PERMISOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const hoyISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`; };
const diasEntre = (a, b) => { const x = new Date(a + "T00:00:00"), y = new Date(b + "T00:00:00"); return isNaN(x) || isNaN(y) ? null : Math.round((y - x) / 86400000); };

export const permisoNuevo = (b = {}) => ({ nombre: "", otro: "", autoridad: "", resolucion: "", expedicion: "", vigencia: "", situacion: "Obtenido", obligaciones: "", ...b });
export const permisoVacio = (p) => !(p && (texto(p.nombre) || texto(p.otro) || texto(p.autoridad) || texto(p.resolucion) || texto(p.expedicion) || texto(p.vigencia) || texto(p.obligaciones)));
export const nombreDePermiso = (p) => (/^Otro/.test(texto(p.nombre)) ? (texto(p.otro) ? `Otro: ${texto(p.otro)}` : "") : texto(p.nombre));
export const permisosConDatos = (d) => arr(d.permisos).filter((p) => !permisoVacio(p));

// Estado de un permiso a una fecha (se calcula siempre con la fecha de «Vigente hasta»)
export function estadoPermiso(p, hoy = hoyISO()) {
  if (!p || !nombreDePermiso(p)) return "";
  if (p.situacion === "No requerido") return "No requerido";
  if (p.situacion === "En trámite") return "En trámite";
  if (!texto(p.vigencia)) return "Sin fecha";
  const f = diasEntre(hoy, p.vigencia); if (f === null) return "Sin fecha";
  return f < 0 ? "Vencido" : f <= DIAS_AVISO_PERMISO ? "Por vencer" : "Vigente";
}
export const diasParaVencer = (p, hoy = hoyISO()) => (texto(p.vigencia) ? diasEntre(hoy, p.vigencia) : null);
export function conteoPermisos(d, hoy = hoyISO()) {
  const c = { total: 0, "Vigente": 0, "Por vencer": 0, Vencido: 0, "En trámite": 0, "Sin fecha": 0, "No requerido": 0 };
  for (const p of permisosConDatos(d)) { const e = estadoPermiso(p, hoy); if (e) { c.total++; c[e]++; } }
  return c;
}

export function avisosPermisos(d, hoy = hoyISO()) {
  const a = []; const ps = permisosConDatos(d).filter((p) => nombreDePermiso(p));
  const nom = (p) => nombreDePermiso(p);
  const venc = ps.filter((p) => estadoPermiso(p, hoy) === "Vencido");
  if (venc.length) a.push({ tipo: "alerta", texto: `Permiso vencido: ${venc.map(nom).join("; ")}. Un permiso vencido ya no ampara la actividad: suspéndela hasta renovarlo o confirma con la autoridad.` });
  const por = ps.filter((p) => estadoPermiso(p, hoy) === "Por vencer");
  if (por.length) a.push({ tipo: "aviso", texto: `Por vencer en menos de ${DIAS_AVISO_PERMISO} días: ${por.map((p) => `${nom(p)} (${fechaDDMMYYYY(p.vigencia)})`).join("; ")}. Pide la renovación ya.` });
  const sf = ps.filter((p) => estadoPermiso(p, hoy) === "Sin fecha"); if (sf.length) a.push({ tipo: "aviso", texto: `Sin fecha de «Vigente hasta»: ${sf.map(nom).join("; ")}. Sin ella no se puede vigilar el vencimiento.` });
  const sr = ps.filter((p) => p.situacion === "Obtenido" && !texto(p.resolucion)); if (sr.length) a.push({ tipo: "aviso", texto: `Falta el N° de resolución de: ${sr.map(nom).join("; ")}.` });
  const inc = ps.filter((p) => texto(p.expedicion) && texto(p.vigencia) && p.vigencia < p.expedicion); if (inc.length) a.push({ tipo: "alerta", texto: `La fecha de vigencia es anterior a la de expedición en: ${inc.map(nom).join("; ")}.` });
  const tr = ps.filter((p) => p.situacion === "En trámite"); if (tr.length) a.push({ tipo: "info", texto: `En trámite: ${tr.map(nom).join("; ")}. No se puede ejecutar la actividad hasta tener la resolución.` });
  const rep = ps.map(nom).filter((n, i, l) => l.indexOf(n) !== i && !/^Otro/.test(n)); if (rep.length) a.push({ tipo: "info", texto: `«${rep[0]}» aparece más de una vez. Si son resoluciones distintas (por ejemplo, una prórroga), anota la diferencia en las obligaciones.` });
  if (!ps.length) a.push({ tipo: "info", texto: "Agrega los permisos de la obra, o tráelos de la Ficha Ambiental con el botón de arriba." });
  return a;
}

export function escribirPermisosEnHoja(ws, d, celdas = CELDAS_PERMISOS, hoy = hoyISO()) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "responsable", "observaciones"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const T = C.tablas || {};
  const ps = permisosConDatos(d);
  escribirTabla(ws, T.permisos, ps.map((p) => ({ nombre: nombreDePermiso(p), autoridad: p.autoridad, resolucion: p.resolucion, expedicion: fechaDDMMYYYY(p.expedicion), vigencia: fechaDDMMYYYY(p.vigencia), situacion: p.situacion, estado: estadoPermiso(p, hoy), obligaciones: p.obligaciones })));
  // La plantilla de la app no trae colores condicionales: el estado se escribe con su color
  if (T.permisos) ps.slice(0, T.permisos.n).forEach((p, i) => { const c = COLORES_ESTADO_PERMISO[estadoPermiso(p, hoy)]; if (c) pintarCelda(ws, T.permisos.columnas.estado + (T.permisos.fila0 + i), "FF" + c.relleno, "FF" + c.fuente); });
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.responsable); poner(ws, F.elaboro.cargo, d.responsableCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarPermisos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha de corte");
  if (!texto(d.responsable)) f.push("el responsable");
  const ps = permisosConDatos(d);
  if (!ps.length) f.push("al menos un permiso");
  else if (ps.some((p) => !nombreDePermiso(p))) f.push("el nombre de cada permiso (si es «Otro», escríbelo)");
  return f;
}
export function camposFaltantesPermisos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha de corte", seccion: "datos" });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable", seccion: "datos" });
  if (!permisosConDatos(d).length) f.push({ etiqueta: "Permiso o autorización", indice: 0, seccion: "permisos" });
  return f;
}

// Resumen que queda guardado (uno por obra): de aquí sale el aviso de la pantalla de inicio. Se guardan las FECHAS, no el estado: el estado se calcula cada día.
export function resumenPermisos(d) {
  const ps = permisosConDatos(d).filter((p) => nombreDePermiso(p));
  return { id: texto(d.proyecto).toLowerCase(), formato: "permisos", proyecto: texto(d.proyecto), fecha: d.fecha,
    permisos: ps.map((p) => ({ nombre: nombreDePermiso(p), resolucion: texto(p.resolucion), vigencia: p.vigencia || "", situacion: p.situacion || "" })), actualizado: hoyISO() };
}
// Alertas para la pantalla de inicio: permisos vencidos o por vencer de todos los registros guardados
export function alertasPermisos(resumenes, hoy = hoyISO()) {
  const out = [];
  for (const r of arr(resumenes)) for (const p of arr(r.permisos)) {
    const e = estadoPermiso({ ...p, nombre: "permiso", otro: "" }, hoy);
    if (e === "Vencido" || e === "Por vencer") out.push({ proyecto: r.proyecto, nombre: p.nombre, vigencia: p.vigencia, estado: e, dias: diasParaVencer(p, hoy) });
  }
  return out.sort((a, b) => (a.dias === null) - (b.dias === null) || a.dias - b.dias);
}
// Permisos que la Ficha Ambiental ya tiene (nombre, resolución y vigencia) para no escribirlos dos veces
export function permisosDeFicha(ficha) {
  return arr(ficha && ficha.permisos).map((p) => {
    const conocido = OPCIONES_PERMISO.includes(p.nombre) && !/^Otro/.test(p.nombre) ? p.nombre : "";
    return permisoNuevo({ nombre: conocido || "Otro:", otro: conocido ? "" : String(p.nombre || "").replace(/^Otro:?\s*/, ""), resolucion: texto(p.resolucion), vigencia: p.vigencia || "", situacion: "Obtenido" });
  });
}
