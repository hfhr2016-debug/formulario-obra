// Control de Emisiones y Ruido (RYR-AM-006). Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { hallazgosConDatos, contarRespuestas, validarListaYHallazgos, faltantesListaYHallazgos } from "./ambBase";

export const CODIGO_EMISIONES = "RYR-AM-006";
export const HOJA_EMISIONES = "Emisiones y Ruido";
export const CLIMAS_EMI = ["Seco", "Lluvia leve", "Lluvia fuerte", "Viento fuerte"];
export const SECTORES = ["A · Tranquilidad y silencio", "B · Residencial o ruido moderado", "C · Comercial", "C · Industrial", "D · Suburbano o rural"];
export const JORNADAS = ["Diurna (7 a. m. a 9 p. m.)", "Nocturna (9 p. m. a 7 a. m.)"];
export const METODOS = ["Carrotanque", "Manguera", "Aspersor", "Riego manual"];
export const ITEMS_EMISIONES = [
  "Humedecimiento de vías internas y zonas de movimiento de tierras", "Volquetas con carpa o cubiertas al salir de la obra", "Acopios de material cubiertos o humedecidos",
  "Cerramiento o polisombra perimetral en buen estado", "Lavado de llantas de vehículos a la salida de la obra", "Velocidad máxima en obra respetada", "Sin quema de residuos ni materiales",
  "Maquinaria y equipos sin humo visible ni fugas", "Corte de materiales con humedecimiento o extracción", "Equipos de bajo ruido o con silenciador en buen estado", "Actividades ruidosas dentro del horario permitido",
];

export const SPEC_EMISIONES = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"], ["fecha", "Fecha", "A", "C"],
    ["responsable", "Responsable del control", "E", "G"], ["sector", "Sector del predio (ruido)", "A", "C"], ["clima", "Condición del clima", "H", "J"],
  ],
  tablas: [
    { clave: "lista", cabecera: "No.", fin: "3. REGISTRO DE HUMEDECIMIENTO DE VÍAS Y ZONAS", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
    { clave: "humedecimiento", cabecera: "No.", despuesDe: "lista", fin: "4. MEDICIÓN DE RUIDO", finEmpieza: true, columnas: { hora: "B", zona: "C", metodo: "F", agua: "H", responsable: "I", obs: "K" },
      encabezados: { hora: "Hora", zona: "Zona o tramo", metodo: "Método", agua: "Agua usada (m³)", responsable: "Responsable", obs: "Observaciones" } },
    { clave: "ruido", cabecera: "No.", despuesDe: "humedecimiento", fin: "El límite se calcula", finEmpieza: true, columnas: { punto: "B", hora: "D", fuente: "E", jornada: "G", nivel: "I" },
      encabezados: { punto: "Punto de medición", hora: "Hora", fuente: "Fuente o actividad", jornada: "Jornada", nivel: "Nivel medido dB(A)" } },
    { clave: "hallazgos", cabecera: "No.", despuesDe: "ruido", fin: "6. FIRMAS", finEmpieza: true, columnas: { hallazgo: "B", accion: "G", responsable: "J", fechaLimite: "L" },
      encabezados: { hallazgo: "Hallazgo", accion: "Acción a tomar", responsable: "Responsable", fechaLimite: "Fecha límite" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "controlo", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_EMISIONES = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","responsable":"G13","sector":"C14","clima":"J14","tablas":{"lista":{"fila0":17,"n":11,"filas":[17,18,19,20,21,22,23,24,25,26,27],"columnas":{"marca":"I","obs":"K"}},"humedecimiento":{"fila0":30,"n":4,"columnas":{"hora":"B","zona":"C","metodo":"F","agua":"H","responsable":"I","obs":"K"}},"ruido":{"fila0":36,"n":4,"columnas":{"punto":"B","hora":"D","fuente":"E","jornada":"G","nivel":"I"}},"hallazgos":{"fila0":43,"n":3,"columnas":{"hallazgo":"B","accion":"G","responsable":"J","fechaLimite":"L"}}},"firmas":{"controlo":{"nombre":"C49","cargo":"C50"},"reviso":{"nombre":"I49","cargo":"I50"}}};
export const descubrirEmisiones = (ws) => descubrirPorEtiquetas(ws, SPEC_EMISIONES);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numeroDe = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const humedNuevo = (base = {}) => ({ hora: "", zona: "", metodo: "", agua: "", responsable: "", obs: "", ...base });
export const ruidoNuevo = (base = {}) => ({ punto: "", hora: "", fuente: "", jornada: "", nivel: "", ...base });
const humedVacio = (h) => !(h.hora || h.zona || h.metodo || texto(h.agua) || h.responsable || h.obs);
const ruidoVacio = (r) => !(r.punto || r.hora || r.fuente || r.jornada || texto(r.nivel));
export const humedConDatos = (d) => arr(d.humedecimiento).filter((h) => !humedVacio(h));
export const ruidoConDatos = (d) => arr(d.ruido).filter((r) => !ruidoVacio(r));

// Misma regla que la fórmula de la hoja (Res. 0627 de 2006): límite en dB(A) según sector y jornada
export function limiteRuido(sector, jornada) {
  if (!sector || !jornada) return null;
  const dia = jornada.startsWith("D"); const s = sector.charAt(0);
  if (s === "A") return dia ? 55 : 50;
  if (s === "B") return dia ? 65 : 55;
  if (s === "D") return dia ? 55 : 50;
  if (/industrial/i.test(sector)) return 75;
  return dia ? 70 : 60;
}
export function evaluarRuido(d, r) {
  const n = numeroDe(r.nivel); const l = limiteRuido(d.sector, r.jornada);
  return { limite: l, cumple: n !== null && l !== null ? n <= l : null };
}

export function escribirEmisionesEnHoja(ws, d, celdas = CELDAS_EMISIONES) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "responsable", "sector", "clima"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const T = C.tablas || {};
  escribirTabla(ws, T.lista, ITEMS_EMISIONES.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observaciones)[i] || "" })));
  escribirTabla(ws, T.humedecimiento, humedConDatos(d).map((h) => ({ ...h, agua: numeroDe(h.agua) === null ? "" : numeroDe(h.agua) })));
  escribirTabla(ws, T.ruido, ruidoConDatos(d).map((r) => ({ ...r, nivel: numeroDe(r.nivel) === null ? "" : numeroDe(r.nivel) })));
  escribirTabla(ws, T.hallazgos, hallazgosConDatos(d.hallazgos).map((h) => ({ ...h, fechaLimite: fechaDDMMYYYY(h.fechaLimite) })));
  const F = C.firmas || {};
  if (F.controlo) { poner(ws, F.controlo.nombre, d.responsable); poner(ws, F.controlo.cargo, d.responsableCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarEmisiones(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.responsable)) f.push("el responsable del control");
  f.push(...validarListaYHallazgos(ITEMS_EMISIONES, d.respuestas, d.hallazgos));
  const hs = humedConDatos(d);
  if (hs.some((h) => !h.zona || !texto(h.zona))) f.push("la zona o tramo de cada humedecimiento");
  if (hs.some((h) => texto(h.agua) !== "" && !(numeroDe(h.agua) >= 0))) f.push("el agua usada como número en cada humedecimiento");
  const rs = ruidoConDatos(d);
  if (rs.length && !d.sector) f.push("el sector del predio (para calcular el límite de ruido)");
  if (rs.some((r) => !texto(r.punto))) f.push("el punto de cada medición de ruido");
  if (rs.some((r) => !r.jornada)) f.push("la jornada de cada medición de ruido");
  if (rs.some((r) => numeroDe(r.nivel) === null)) f.push("el nivel medido de cada medición de ruido");
  return f;
}
export function camposFaltantesEmisiones(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable del control", seccion: "datos" });
  f.push(...faltantesListaYHallazgos(ITEMS_EMISIONES, d.respuestas, d.hallazgos, "lista", "hallazgos"));
  const th = arr(d.humedecimiento); const hs = humedConDatos(d);
  th.forEach((h, i) => { if (hs.includes(h) && !texto(h.zona)) f.push({ etiqueta: "Zona o tramo", indice: i, seccion: "humedecimiento" }); });
  const tr = arr(d.ruido); const rs = ruidoConDatos(d);
  if (rs.length && !d.sector) f.push({ etiqueta: "Sector del predio (ruido)", seccion: "datos" });
  tr.forEach((r, i) => {
    if (!rs.includes(r)) return;
    if (!texto(r.punto)) f.push({ etiqueta: "Punto de medición", indice: i, seccion: "ruido" });
    if (!r.jornada) f.push({ etiqueta: "Jornada", indice: i, seccion: "ruido" });
    if (numeroDe(r.nivel) === null) f.push({ etiqueta: "Nivel medido dB(A)", indice: i, seccion: "ruido" });
  });
  return f;
}

export function resumenEmisiones(d) {
  const c = contarRespuestas(ITEMS_EMISIONES, d.respuestas); const rs = ruidoConDatos(d);
  const niveles = rs.map((r) => numeroDe(r.nivel)).filter((n) => n !== null);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}`, formato: "emisiones", proyecto: texto(d.proyecto), fecha: d.fecha,
    cumple: c.si, noCumple: c.no, noAplica: c.na, hallazgos: hallazgosConDatos(d.hallazgos).length, humedecimientos: humedConDatos(d).length,
    aguaM3: Math.round(humedConDatos(d).reduce((s, h) => s + (numeroDe(h.agua) || 0), 0) * 1000) / 1000,
    mediciones: rs.length, excedidas: rs.filter((r) => evaluarRuido(d, r).cumple === false).length, maxDb: niveles.length ? Math.max(...niveles) : null, sector: d.sector || "",
  };
}
