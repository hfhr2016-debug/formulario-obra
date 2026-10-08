// Quejas y PQRS de la Comunidad (RYR-AM-012). Lo común está en sstBase.js.
import { poner, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_PQRS = "RYR-AM-012";
export const HOJA_PQRS = "PQRS Comunidad";
export const CANALES = ["Personal", "Telefónico", "Escrito", "Correo electrónico", "Redes sociales", "Buzón de la obra"];
export const TIPOS_PQRS = ["Petición", "Queja", "Reclamo", "Sugerencia", "Felicitación"];
export const TEMAS_PQRS = ["Ruido", "Polvo", "Vibraciones o daños en vivienda", "Tránsito y movilidad", "Residuos o escombros", "Agua o alcantarillado", "Seguridad en la vía", "Otro:"];
export const CONFORME = ["Sí", "Parcialmente", "No"];
export const ESTADOS_PQRS = ["Abierta", "En trámite", "Cerrada"];
export const DIAS_HABILES_RESPUESTA = 15;

export const SPEC_PQRS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["nPqrs", "PQRS N°", "H", "J"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha de recepción", "A", "C"], ["hora", "Hora", "E", "G"], ["recibio", "Recibió", "I", "K"],
    ["canal", "Canal", "A", "C"], ["tipo", "Tipo", "E", "G"], ["fechaLimite", "Fecha límite de respuesta", "I", "K"],
    ["nombre", "Nombre", "A", "C"], ["documento", "Documento", "H", "J"], ["direccion", "Dirección o predio", "A", "C"], ["telefono", "Teléfono", "H", "J"],
    ["correo", "Correo electrónico", "A", "C"], ["desea", "¿Desea respuesta?", "H", "J"],
    ["descripcion", "Descripción de la solicitud", "A", "C"],
    ["accion", "Acción tomada", "A", "C"], ["responsable", "Responsable", "A", "C"], ["fechaRespuesta", "Fecha de respuesta", "H", "J"],
    ["medio", "Medio de respuesta", "A", "C"], ["compromiso", "Compromiso con la comunidad", "H", "J"],
    ["conforme", "¿Quedó conforme?", "A", "C"], ["fechaCierre", "Fecha de cierre", "E", "G"], ["estado", "Estado", "I", "K"],
  ],
  opciones: [{ clave: "temas", desde: "3. DESCRIPCIÓN", hasta: "Descripción de la solicitud" }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "recibe", col: "C" }, { clave: "responsableF", col: "G" }, { clave: "ciudadano", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_PQRS = {"proyecto":"C11","nPqrs":"J11","contratista":"C12","ubicacion":"J12","fecha":"C13","hora":"G13","recibio":"K13","canal":"C14","tipo":"G14","fechaLimite":"K14","nombre":"C16","documento":"J16","direccion":"C17","telefono":"J17","correo":"C18","desea":"J18","descripcion":"C22","accion":"C25","responsable":"C26","fechaRespuesta":"J26","medio":"C27","compromiso":"J27","conforme":"C29","fechaCierre":"G29","estado":"K29","opciones":{"temas":[{"ref":"A20","texto":"Ruido"},{"ref":"D20","texto":"Polvo"},{"ref":"G20","texto":"Vibraciones o daños en vivienda"},{"ref":"J20","texto":"Tránsito y movilidad"},{"ref":"A21","texto":"Residuos o escombros"},{"ref":"D21","texto":"Agua o alcantarillado"},{"ref":"G21","texto":"Seguridad en la vía"},{"ref":"J21","texto":"Otro:"}]},"firmas":{"recibe":{"nombre":"C33","cargo":"C34"},"responsableF":{"nombre":"G33","cargo":"G34"},"ciudadano":{"nombre":"K33","cargo":"K34"}}};
export const descubrirPqrs = (ws) => descubrirPorEtiquetas(ws, SPEC_PQRS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();

// ---------- Plazo de respuesta: 15 días hábiles (lunes a viernes, sin festivos de Colombia) ----------
const isoDe = (x) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
const sumarDias = (x, n) => new Date(x.getTime() + n * 86400000);
const alLunes = (x) => { const dow = x.getUTCDay(); return dow === 1 ? x : sumarDias(x, (8 - dow) % 7); };          // Ley Emiliani: pasa al lunes siguiente
function pascua(anio) {                                                                                               // algoritmo de Gauss / Meeus
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}
export function festivosColombia(anio) {
  const U = (m, d) => new Date(Date.UTC(anio, m - 1, d)); const p = pascua(anio);
  const fijos = [U(1, 1), U(5, 1), U(7, 20), U(8, 7), U(12, 8), U(12, 25), sumarDias(p, -3), sumarDias(p, -2)];
  const lunes = [U(1, 6), U(3, 19), U(6, 29), U(8, 15), U(10, 12), U(11, 1), U(11, 11), sumarDias(p, 39), sumarDias(p, 60), sumarDias(p, 68)].map(alLunes);
  return new Set([...fijos, ...lunes].map(isoDe));
}
export function sumarDiasHabiles(iso, n = DIAS_HABILES_RESPUESTA) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(iso));
  if (!m) return "";
  let x = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const cache = {}; const fest = (y) => cache[y] || (cache[y] = festivosColombia(y));
  let faltan = n;
  while (faltan > 0) {
    x = sumarDias(x, 1);
    const dow = x.getUTCDay();
    if (dow !== 0 && dow !== 6 && !fest(x.getUTCFullYear()).has(isoDe(x))) faltan--;
  }
  return isoDe(x);
}
export const fechaLimitePqrs = (d) => (d.fecha ? sumarDiasHabiles(d.fecha) : "");
export function estadoPlazo(d, hoyISO) {
  const lim = fechaLimitePqrs(d);
  if (!lim) return { limite: "", vencida: false };
  const cerrada = d.estado === "Cerrada";
  const resp = d.fechaRespuesta || "";
  return { limite: lim, vencida: !cerrada && !resp && !!hoyISO && hoyISO > lim, tarde: !!resp && resp > lim };
}

export function escribirPqrsEnHoja(ws, d, celdas = CELDAS_PQRS) {
  const C = celdas;
  for (const k of ["proyecto", "nPqrs", "contratista", "ubicacion", "hora", "recibio", "canal", "tipo", "documento", "direccion", "telefono", "correo", "desea", "descripcion",
    "accion", "responsable", "medio", "compromiso", "conforme", "estado"]) poner(ws, C[k], d[k]);
  poner(ws, C.nombre, texto(d.nombre) || (d.anonima ? "Anónimo" : ""));
  for (const k of ["fecha", "fechaRespuesta", "fechaCierre"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  poner(ws, C.fechaLimite, fechaDDMMYYYY(fechaLimitePqrs(d)));                 // calculada con festivos (reemplaza la fórmula de la hoja, que no los conoce)
  const noMarcadas = marcarOpciones(ws, (C.opciones || {}).temas, arr(d.temas), d.otros || {});
  const F = C.firmas || {};
  if (F.recibe) { poner(ws, F.recibe.nombre, d.recibio); poner(ws, F.recibe.cargo, d.recibioCargo); }
  if (F.responsableF) { poner(ws, F.responsableF.nombre, d.responsableNombre); poner(ws, F.responsableF.cargo, d.responsableCargo); }
  if (F.ciudadano) { poner(ws, F.ciudadano.nombre, texto(d.nombre) || (d.anonima ? "Anónimo" : "")); poner(ws, F.ciudadano.cargo, d.documento); }     // en este bloque la 3.ª línea es «Documento:»
  return noMarcadas;
}

const esCorreo = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(t));
export function validarPqrs(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha de recepción");
  if (!texto(d.recibio)) f.push("quién recibió la solicitud");
  if (!d.canal) f.push("el canal por el que llegó");
  if (!d.tipo) f.push("el tipo de solicitud");
  if (!texto(d.nombre) && !d.anonima) f.push("el nombre de quien presenta la solicitud (o marca «Anónima»)");
  if (texto(d.correo) && !esCorreo(d.correo)) f.push("el correo electrónico con formato válido");
  if (!arr(d.temas).length) f.push("el tema de la solicitud");
  if (arr(d.temas).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push("cuál es el otro tema");
  if (!texto(d.descripcion)) f.push("la descripción de la solicitud");
  if (d.estado === "Cerrada" && !d.fechaCierre) f.push("la fecha de cierre");
  if (d.estado === "Cerrada" && !texto(d.accion)) f.push("la acción tomada");
  if (d.fechaRespuesta && d.fecha && d.fechaRespuesta < d.fecha) f.push("la fecha de respuesta (es anterior a la de recepción)");
  return f;
}
export function camposFaltantesPqrs(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha de recepción", seccion: "datos" });
  if (!texto(d.recibio)) f.push({ etiqueta: "Nombre de quien recibió", seccion: "datos" });
  if (!d.canal) f.push({ etiqueta: "Canal", seccion: "datos" });
  if (!d.tipo) f.push({ etiqueta: "Tipo", seccion: "datos" });
  if (!texto(d.nombre) && !d.anonima) f.push({ etiqueta: "Nombre de quien presenta", seccion: "ciudadano" });
  if (texto(d.correo) && !esCorreo(d.correo)) f.push({ etiqueta: "Correo electrónico", seccion: "ciudadano" });
  if (!arr(d.temas).length) f.push({ etiqueta: "Tema de la solicitud", seccion: "descripcion" });
  if (arr(d.temas).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push({ etiqueta: "Tema de la solicitud", seccion: "descripcion" });
  if (!texto(d.descripcion)) f.push({ etiqueta: "Descripción de la solicitud", seccion: "descripcion" });
  if (d.estado === "Cerrada" && !d.fechaCierre) f.push({ etiqueta: "Fecha de cierre", seccion: "cierre" });
  if (d.estado === "Cerrada" && !texto(d.accion)) f.push({ etiqueta: "Acción tomada", seccion: "gestion" });
  return f;
}
export function resumenPqrs(d, hoyISO) {
  const p = estadoPlazo(d, hoyISO);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${texto(d.nPqrs) || d.fecha}`, formato: "pqrs", proyecto: texto(d.proyecto), fecha: d.fecha, nPqrs: texto(d.nPqrs), tipo: d.tipo || "", canal: d.canal || "",
    temas: arr(d.temas), estado: d.estado || "", limite: p.limite, vencida: p.vencida, respondidaTarde: !!p.tarde, conforme: d.conforme || "",
  };
}
