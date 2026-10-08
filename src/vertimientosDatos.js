// Control de Vertimientos y Manejo de Aguas (RYR-AM-005). Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { hallazgosConDatos, contarRespuestas, validarListaYHallazgos, faltantesListaYHallazgos } from "./ambBase";

export const CODIGO_VERTIMIENTOS = "RYR-AM-005";
export const HOJA_VERTIMIENTOS = "Control de Vertimientos";
export const CLIMAS_AMB = ["Seco", "Lluvia leve", "Lluvia fuerte"];
export const ITEMS_VERTIMIENTOS = [
  "Trampa de grasas limpia y en funcionamiento", "Sedimentador o desarenador funcionando, sin desbordes", "Cunetas y canales perimetrales despejados",
  "Lodos y sedimentos retirados y dispuestos correctamente", "Lavado de llantas y equipos en el sitio destinado, con recirculación o captación",
  "Baños portátiles o batería sanitaria con mantenimiento al día", "Sin vertimiento de concreto, pinturas, aceites o solventes al suelo o alcantarillado",
  "Sin afectación a cuerpos de agua, sumideros o cauces cercanos", "Aguas lluvias manejadas sin arrastre de sedimentos fuera de la obra",
  "Tanques y reservorios de agua tapados y sin fugas", "Áreas de preparación de concreto con piso protegido y captación de lavados", "Uso de agua sin desperdicio (mangueras, llaves y tuberías sin fugas)",
];
export const SISTEMAS = ["Trampa de grasas", "Sedimentador o desarenador", "Cuneta o canal perimetral", "Tanque de almacenamiento de agua", "Baño portátil o batería sanitaria", "Pozo séptico"];

export const SPEC_VERTIMIENTOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["hora", "Hora", "E", "G"], ["clima", "Condición del clima", "I", "K"], ["nInspeccion", "Inspección N°", "A", "C"], ["inspectorNombre", "Inspector", "E", "G"],
  ],
  tablas: [
    { clave: "lista", cabecera: "No.", fin: "3. LIMPIEZA DE SISTEMAS Y RETIRO DE LODOS", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
    { clave: "lodos", cabecera: "No.", despuesDe: "lista", fin: "4. HALLAZGOS Y ACCIONES", finEmpieza: true, columnas: { fecha: "B", sistema: "C", volumen: "E", gestor: "F", certificado: "H", obs: "J" },
      encabezados: { fecha: "Fecha", sistema: "Sistema o punto", volumen: "Volumen (m³)", gestor: "Gestor o destino", certificado: "N° de certificado", obs: "Observaciones" } },
    { clave: "hallazgos", cabecera: "No.", despuesDe: "lodos", fin: "5. FIRMAS", finEmpieza: true, columnas: { hallazgo: "B", accion: "G", responsable: "J", fechaLimite: "L" },
      encabezados: { hallazgo: "Hallazgo", accion: "Acción a tomar", responsable: "Responsable", fechaLimite: "Fecha límite" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "inspector", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_VERTIMIENTOS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","hora":"G13","clima":"K13","nInspeccion":"C14","inspectorNombre":"G14","tablas":{"lista":{"fila0":17,"n":12,"filas":[17,18,19,20,21,22,23,24,25,26,27,28],"columnas":{"marca":"I","obs":"K"}},"lodos":{"fila0":31,"n":4,"columnas":{"fecha":"B","sistema":"C","volumen":"E","gestor":"F","certificado":"H","obs":"J"}},"hallazgos":{"fila0":37,"n":3,"columnas":{"hallazgo":"B","accion":"G","responsable":"J","fechaLimite":"L"}}},"firmas":{"inspector":{"nombre":"C43","cargo":"C44"},"reviso":{"nombre":"I43","cargo":"I44"}}};
export const descubrirVertimientos = (ws) => descubrirPorEtiquetas(ws, SPEC_VERTIMIENTOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numeroDe = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const lodoNuevo = (base = {}) => ({ fecha: "", sistema: "", volumen: "", gestor: "", certificado: "", obs: "", ...base });
const lodoVacio = (l) => !(l.fecha || l.sistema || texto(l.volumen) || l.gestor || l.certificado || l.obs);
export const lodosConDatos = (d) => arr(d.lodos).filter((l) => !lodoVacio(l));

export function escribirVertimientosEnHoja(ws, d, celdas = CELDAS_VERTIMIENTOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "hora", "clima", "nInspeccion", "inspectorNombre"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const T = C.tablas || {};
  escribirTabla(ws, T.lista, ITEMS_VERTIMIENTOS.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observaciones)[i] || "" })));
  escribirTabla(ws, T.lodos, lodosConDatos(d).map((l) => ({ ...l, fecha: fechaDDMMYYYY(l.fecha), volumen: numeroDe(l.volumen) === null ? "" : numeroDe(l.volumen) })));
  escribirTabla(ws, T.hallazgos, hallazgosConDatos(d.hallazgos).map((h) => ({ ...h, fechaLimite: fechaDDMMYYYY(h.fechaLimite) })));
  const F = C.firmas || {};
  if (F.inspector) { poner(ws, F.inspector.nombre, d.inspectorNombre); poner(ws, F.inspector.cargo, d.inspectorCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarVertimientos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.inspectorNombre)) f.push("el inspector");
  f.push(...validarListaYHallazgos(ITEMS_VERTIMIENTOS, d.respuestas, d.hallazgos));
  const ls = lodosConDatos(d);
  if (ls.some((l) => !l.fecha)) f.push("la fecha de cada retiro de lodos");
  if (ls.some((l) => !texto(l.sistema))) f.push("el sistema o punto de cada retiro de lodos");
  if (ls.some((l) => !(numeroDe(l.volumen) > 0))) f.push("el volumen (mayor que 0) de cada retiro de lodos");
  return f;
}
export function camposFaltantesVertimientos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.inspectorNombre)) f.push({ etiqueta: "Nombre del inspector", seccion: "datos" });
  f.push(...faltantesListaYHallazgos(ITEMS_VERTIMIENTOS, d.respuestas, d.hallazgos, "lista", "hallazgos"));
  const todos = arr(d.lodos); const ls = lodosConDatos(d);
  todos.forEach((l, i) => {
    if (!ls.includes(l)) return;
    if (!l.fecha) f.push({ etiqueta: "Fecha del retiro", indice: i, seccion: "lodos" });
    if (!texto(l.sistema)) f.push({ etiqueta: "Sistema o punto", indice: i, seccion: "lodos" });
    if (!(numeroDe(l.volumen) > 0)) f.push({ etiqueta: "Volumen (m³)", indice: i, seccion: "lodos" });
  });
  return f;
}

export function resumenVertimientos(d) {
  const c = contarRespuestas(ITEMS_VERTIMIENTOS, d.respuestas);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.nInspeccion)}`, formato: "vertimientos", proyecto: texto(d.proyecto), fecha: d.fecha, nInspeccion: texto(d.nInspeccion),
    cumple: c.si, noCumple: c.no, noAplica: c.na, hallazgos: hallazgosConDatos(d.hallazgos).length,
    lodosM3: Math.round(lodosConDatos(d).reduce((s, l) => s + (numeroDe(l.volumen) || 0), 0) * 1000) / 1000,
  };
}
