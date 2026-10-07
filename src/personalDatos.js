// Registro de Personal de la obra (RYR-SS-017): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Alimenta los Indicadores (el promedio de trabajadores) y la memoria de trabajadores.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_PERSONAL = "RYR-SS-017";
export const HOJA_PERSONAL = "Registro de Personal";
export const ESTADOS_PERSONA = ["Activo", "Retirado"];
export const DIAS_AVISO = 30;           // se avisa un examen o un certificado que vence en los próximos 30 días

export const SPEC_PERSONAL = {
  campos: [["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["fechaCorte", "Fecha de corte", "I", "L"], ["hoja", "Hoja N°", "I", "L"]],
  tablas: [
    { clave: "personas", cabecera: "No.", fin: "3. RESUMEN DE ESTA HOJA", finEmpieza: true,
      columnas: { nombre: "B", documento: "C", cargo: "D", empresa: "E", ingreso: "F", eps: "G", arl: "H", examen: "I", induccion: "J", alturas: "K", estado: "L", retiro: "M", obs: "N" },
      encabezados: { nombre: "Nombre completo", documento: "Documento de identidad", cargo: "Cargo / oficio", empresa: "Empresa", ingreso: "Fecha de ingreso", eps: "EPS", arl: "ARL", examen: "Examen médico (vence)",
        induccion: "Inducción SST (fecha)", alturas: "Alturas (vigencia)", estado: "Estado", retiro: "Fecha de retiro", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "H" }, { clave: "vobo", col: "M" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_PERSONAL = {"proyecto":"C11","contratista":"C12","fechaCorte":"L11","hoja":"L12","tablas":{"personas":{"fila0":15,"n":22,"columnas":{"nombre":"B","documento":"C","cargo":"D","empresa":"E","ingreso":"F","eps":"G","arl":"H","examen":"I","induccion":"J","alturas":"K","estado":"L","retiro":"M","obs":"N"}}},"firmas":{"elaboro":{"nombre":"C44","cargo":"C45"},"reviso":{"nombre":"H44","cargo":"H45"},"vobo":{"nombre":"M44","cargo":"M45"}}};
export const descubrirPersonal = (ws) => descubrirPorEtiquetas(ws, SPEC_PERSONAL);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const personaNueva = (b = {}) => ({ nombre: "", documento: "", cargo: "", empresa: "", ingreso: "", eps: "", arl: "", examen: "", induccion: "", alturas: "", estado: "Activo", retiro: "", obs: "", ...b });
// Una fila "con datos" es la que tiene algo más que el estado "Activo" que trae por defecto
export const personaVacia = (p) => !(p && (texto(p.nombre) || texto(p.documento) || texto(p.cargo) || texto(p.empresa) || p.ingreso || texto(p.eps) || texto(p.arl) || p.examen || p.induccion || p.alturas || p.retiro || texto(p.obs)));
export const personasConDatos = (d) => arr(d.personas).filter((p) => !personaVacia(p));
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texto(v));
const fecha = (v) => (esFecha(v) ? fechaDDMMYYYY(v) : texto(v));
const sumarDias = (iso, n) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return ""; const f = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); f.setUTCDate(f.getUTCDate() + n); return f.toISOString().slice(0, 10); };

// Estado de un requisito con fecha de vencimiento: "vencido", "por vencer" (próximos 30 días), "vigente" o "" (sin fecha)
export function estadoVencimiento(iso, referenciaISO) {
  if (!esFecha(iso) || !esFecha(referenciaISO)) return "";
  if (iso < referenciaISO) return "vencido";
  return iso <= sumarDias(referenciaISO, DIAS_AVISO) ? "por vencer" : "vigente";
}
// Lo que le falta o está vencido a una persona activa (para mostrarlo como aviso)
export function alertasPersona(p, referenciaISO) {
  if (!p || personaVacia(p) || p.estado === "Retirado") return [];
  const a = [];
  if (!p.examen) a.push("sin examen médico"); else { const e = estadoVencimiento(p.examen, referenciaISO); if (e === "vencido") a.push("examen médico vencido"); else if (e === "por vencer") a.push("examen médico por vencer"); }
  if (!p.induccion) a.push("sin inducción SST");
  if (p.alturas) { const e = estadoVencimiento(p.alturas, referenciaISO); if (e === "vencido") a.push("certificado de alturas vencido"); else if (e === "por vencer") a.push("certificado de alturas por vencer"); }
  return a;
}

export function escribirPersonalEnHoja(ws, d, celdas = CELDAS_PERSONAL) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "hoja"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaCorte, fechaDDMMYYYY(d.fechaCorte));
  const T = C.tablas || {};
  escribirTabla(ws, T.personas, personasConDatos(d).map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, empresa: p.empresa, ingreso: fecha(p.ingreso), eps: p.eps, arl: p.arl,
    examen: fecha(p.examen), induccion: fecha(p.induccion), alturas: fecha(p.alturas), estado: p.estado || "Activo", retiro: p.estado === "Retirado" ? fecha(p.retiro) : "", obs: p.obs })));
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarPersonal(d) {
  const faltan = [];
  if (!d.fechaCorte) faltan.push("la fecha de corte");
  const ps = personasConDatos(d);
  if (!ps.length) faltan.push("al menos una persona");
  else {
    if (ps.some((p) => !texto(p.nombre) || !texto(p.documento) || !texto(p.cargo))) faltan.push("el nombre, el documento y el cargo de cada persona");
    if (ps.some((p) => p.estado === "Retirado" && !p.retiro)) faltan.push("la fecha de retiro de quienes están retirados");
  }
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el registro");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarPersonal().
export function camposFaltantesPersonal(d) {
  const f = [];
  if (!d.fechaCorte) f.push({ etiqueta: "Fecha de corte", seccion: "datos" });
  const todos = arr(d.personas);
  if (!personasConDatos(d).length) f.push({ etiqueta: "Nombre completo", indice: 0, seccion: "personas" });
  else todos.forEach((p, i) => {
    if (personaVacia(p)) return;
    if (!texto(p.nombre)) f.push({ etiqueta: "Nombre completo", indice: i, seccion: "personas" });
    if (!texto(p.documento)) f.push({ etiqueta: "Documento de identidad", indice: i, seccion: "personas" });
    if (!texto(p.cargo)) f.push({ etiqueta: "Cargo / oficio", indice: i, seccion: "personas" });
    if (p.estado === "Retirado" && !p.retiro) f.push({ etiqueta: "Fecha de retiro", indice: i, seccion: "personas" });
  });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// ---------- Traer personas de otros formatos ----------
export const clavePersona = (p) => (texto(p.documento) ? "d:" + texto(p.documento).replace(/\D/g, "") : "n:" + texto(p.nombre).toLowerCase());
export function unirPersonas(actuales, nuevas) {
  const base = arr(actuales).filter((p) => !personaVacia(p));
  const vistas = new Set(base.map(clavePersona));
  const agregadas = [];
  for (const n of arr(nuevas)) { const k = clavePersona(n); if (!vistas.has(k)) { vistas.add(k); agregadas.push(n); } }
  return { lista: [...base, ...agregadas], agregadas: agregadas.length, repetidas: arr(nuevas).length - agregadas.length };
}
// Las personas a las que ya se les hizo la inducción SST (la fecha de la inducción queda registrada)
export function personasDeInducciones(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) if (texto(r.nombre)) out.push(personaNueva({ nombre: r.nombre, documento: r.documento || "", cargo: r.cargo || "", empresa: r.empresa || "", ingreso: r.fecha || "", induccion: r.fecha || "" }));
  return out;
}
// Quienes siguen activos en la última hoja guardada de cada persona
export function personasDelRegistro(resumenes) {
  const orden = arr(resumenes).slice().sort((a, b) => String(a.fechaCorte).localeCompare(String(b.fechaCorte)));
  const mapa = new Map();
  for (const r of orden) for (const p of arr(r.personas)) { mapa.delete(clavePersona(p)); mapa.set(clavePersona(p), p); }   // el orden es el de la hoja más reciente de cada persona
  return Array.from(mapa.values()).filter((p) => p.estado !== "Retirado").map((p) => personaNueva(p));
}

// Resumen que se guarda en el dispositivo: alimenta los Indicadores (promedio de trabajadores) y el traer de hojas anteriores
export function resumenPersonal(d) {
  const ps = personasConDatos(d);
  return { id: `${d.fechaCorte || "sin-fecha"}_${d.hoja || ""}`, formato: "personal", fechaCorte: d.fechaCorte || "", proyecto: d.proyecto || "", hoja: d.hoja || "",
    total: ps.length, activos: ps.filter((p) => p.estado !== "Retirado").length, retirados: ps.filter((p) => p.estado === "Retirado").length,
    conExamen: ps.filter((p) => p.examen).length, conInduccion: ps.filter((p) => p.induccion).length, conAlturas: ps.filter((p) => p.alturas).length,
    personas: ps.map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, empresa: p.empresa, ingreso: p.ingreso, eps: p.eps, arl: p.arl, examen: p.examen, induccion: p.induccion, alturas: p.alturas, estado: p.estado || "Activo", retiro: p.retiro, obs: p.obs })) };
}
