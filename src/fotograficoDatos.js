// Registro Fotográfico Ambiental georreferenciado (RYR-AM-010). Lo común está en sstBase.js.
import { poner, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_FOTOGRAFICO = "RYR-AM-010";
export const HOJA_FOTOGRAFICO = "Registro Fotográfico";
export const TIPOS_REGISTRO_FOTO = ["Seguimiento ambiental", "Antes / estado inicial", "Durante la actividad", "Después / cierre", "Hallazgo", "Cierre de hallazgo", "Incidente ambiental"];
export const ASPECTOS_FOTO = ["Residuos", "Agua y vertimientos", "Aire y ruido", "Suelo y sustancias", "Flora y fauna", "Comunidad y entorno", "Maquinaria", "Otro"];
export const N_FOTOS = 6;

// Cada hoja trae 6 fotos (3 filas de 2). Los rótulos «Aspecto», «Descripción», «Coordenadas» y «Fecha y hora» se repiten: se buscan en orden.
const camposFoto = () => {
  const campos = [];
  const lugares = [["A", "C", null], ["G", "I", null], ["A", "C", "f1FechaHora"], ["G", "I", "f2FechaHora"], ["A", "C", "f3FechaHora"], ["G", "I", "f4FechaHora"]];
  lugares.forEach(([e, v, despues], k) => {
    const n = k + 1;
    campos.push([`f${n}Aspecto`, "Aspecto", e, v, despues]);
    campos.push([`f${n}Descripcion`, "Descripción", e, v, `f${n}Aspecto`]);
    campos.push([`f${n}Coordenadas`, "Coordenadas", e, v, `f${n}Descripcion`]);
    campos.push([`f${n}FechaHora`, "Fecha y hora", e, v, `f${n}Coordenadas`]);
  });
  return campos;
};
export const SPEC_FOTOGRAFICO = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["hoja", "Hoja N°", "J", "K"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "G", "I"],
    ["fecha", "Fecha", "A", "C"], ["tipoRegistro", "Tipo de registro", "E", "G"], ["registro", "Registró", "J", "K"],
    ...camposFoto(),
  ],
  fotos: [{ clave: "fotos", desde: "2. FOTOGRAFÍAS", hasta: "3. FIRMAS", minAltoPx: 80 }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "3. FIRMAS", personas: [{ clave: "registro", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_FOTOGRAFICO = {"proyecto":"C11","hoja":"K11","contratista":"C12","ubicacion":"I12","fecha":"C13","tipoRegistro":"G13","registro":"K13","f1Aspecto":"C17","f1Descripcion":"C18","f1Coordenadas":"C19","f1FechaHora":"C20","f2Aspecto":"I17","f2Descripcion":"I18","f2Coordenadas":"I19","f2FechaHora":"I20","f3Aspecto":"C23","f3Descripcion":"C24","f3Coordenadas":"C25","f3FechaHora":"C26","f4Aspecto":"I23","f4Descripcion":"I24","f4Coordenadas":"I25","f4FechaHora":"I26","f5Aspecto":"C29","f5Descripcion":"C30","f5Coordenadas":"C31","f5FechaHora":"C32","f6Aspecto":"I29","f6Descripcion":"I30","f6Coordenadas":"I31","f6FechaHora":"I32","fotos":{"fotos":[{"tl":{"col":0,"row":15},"br":{"col":6,"row":16},"aspecto":1.783},{"tl":{"col":6,"row":15},"br":{"col":12,"row":16},"aspecto":1.856},{"tl":{"col":0,"row":21},"br":{"col":6,"row":22},"aspecto":1.783},{"tl":{"col":6,"row":21},"br":{"col":12,"row":22},"aspecto":1.856},{"tl":{"col":0,"row":27},"br":{"col":6,"row":28},"aspecto":1.783},{"tl":{"col":6,"row":27},"br":{"col":12,"row":28},"aspecto":1.856}]},"firmas":{"registro":{"nombre":"C37","cargo":"C38"},"reviso":{"nombre":"I37","cargo":"I38"}}};
export const descubrirFotografico = (ws) => descubrirPorEtiquetas(ws, SPEC_FOTOGRAFICO);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const fotoDatosNueva = (base = {}) => ({ aspecto: "", descripcion: "", coordenadas: "", fechaHora: "", ...base });
export const fotosDatosIniciales = () => Array.from({ length: N_FOTOS }, () => fotoDatosNueva());
// «2026-10-08T14:30» -> «08/10/2026 14:30»
export function fechaHoraTexto(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto(v));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : texto(v);
}
// Fecha y hora local de un instante (ms) en el formato del campo «datetime-local»
export function fechaHoraLocalISO(ms = Date.now()) {
  const x = new Date(ms); const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}
// «4.711000, -74.072100»: 6 decimales (≈ 0,1 m)
export const coordenadasTexto = (lat, lon) => `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
export const coordenadasValidas = (t) => { const m = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/.exec(texto(t)); if (!m) return false; const a = Number(m[1].replace(",", ".")), b = Number(m[2].replace(",", ".")); return Math.abs(a) <= 90 && Math.abs(b) <= 180; };
// ¿La foto n tiene algo escrito? (las fotos con datos pero sin imagen se avisan al generar)
export const fotoConDatos = (f, tieneArchivo) => !!(tieneArchivo || texto(f.aspecto) || texto(f.descripcion) || texto(f.coordenadas) || texto(f.fechaHora));

export function escribirFotograficoEnHoja(ws, d, celdas = CELDAS_FOTOGRAFICO, archivos = []) {
  const C = celdas;
  for (const k of ["proyecto", "hoja", "contratista", "ubicacion", "tipoRegistro", "registro"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  arr(d.fotos).slice(0, N_FOTOS).forEach((f, i) => {
    if (!fotoConDatos(f, !!(archivos[i] && archivos[i].file))) return;
    const n = i + 1;
    poner(ws, C[`f${n}Aspecto`], f.aspecto); poner(ws, C[`f${n}Descripcion`], f.descripcion); poner(ws, C[`f${n}Coordenadas`], f.coordenadas); poner(ws, C[`f${n}FechaHora`], fechaHoraTexto(f.fechaHora));
  });
  const F = C.firmas || {};
  if (F.registro) { poner(ws, F.registro.nombre, d.registro); poner(ws, F.registro.cargo, d.registroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarFotografico(d, archivos = []) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.registro)) f.push("quién registró");
  const fotos = arr(d.fotos).slice(0, N_FOTOS);
  const conFoto = fotos.filter((_, i) => archivos[i] && archivos[i].file);
  if (!conFoto.length) f.push("al menos una foto");
  fotos.forEach((x, i) => {
    const hay = !!(archivos[i] && archivos[i].file);
    if (fotoConDatos(x, hay) && !hay) f.push(`la imagen de la foto ${i + 1} (tiene datos escritos pero no foto)`);
    if (hay && !texto(x.aspecto)) f.push(`el aspecto de la foto ${i + 1}`);
    if (hay && !texto(x.descripcion)) f.push(`la descripción de la foto ${i + 1}`);
    if (hay && texto(x.coordenadas) && !coordenadasValidas(x.coordenadas)) f.push(`las coordenadas de la foto ${i + 1} como «latitud, longitud» (ej. 4.711000, -74.072100)`);
  });
  return f;
}
export function camposFaltantesFotografico(d, archivos = []) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.registro)) f.push({ etiqueta: "Nombre de quien registró", seccion: "datos" });
  arr(d.fotos).slice(0, N_FOTOS).forEach((x, i) => {
    const hay = !!(archivos[i] && archivos[i].file);
    if (hay && !texto(x.aspecto)) f.push({ etiqueta: "Aspecto de la foto", indice: i, seccion: "fotos" });
    if (hay && !texto(x.descripcion)) f.push({ etiqueta: "Descripción de la foto", indice: i, seccion: "fotos" });
    if (hay && texto(x.coordenadas) && !coordenadasValidas(x.coordenadas)) f.push({ etiqueta: "Coordenadas de la foto", indice: i, seccion: "fotos" });
  });
  return f;
}
export function resumenFotografico(d, archivos = []) {
  const usadas = arr(d.fotos).filter((_, i) => archivos[i] && archivos[i].file);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.hoja)}`, formato: "fotografico", proyecto: texto(d.proyecto), fecha: d.fecha, tipoRegistro: d.tipoRegistro || "", hoja: texto(d.hoja),
    fotos: usadas.length, conCoordenadas: usadas.filter((x) => coordenadasValidas(x.coordenadas)).length, aspectos: [...new Set(usadas.map((x) => x.aspecto).filter(Boolean))],
  };
}
