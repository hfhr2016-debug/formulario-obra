// Aprovechamiento Forestal (RYR-AM-016): individuos intervenidos, compensación y verificación. Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { contarRespuestas } from "./ambBase";

export const CODIGO_FORESTAL = "RYR-AM-016";
export const HOJA_FORESTAL = "Aprovechamiento Forestal";
export const INTERVENCIONES = ["Tala", "Poda", "Traslado", "Conservación"];
export const DESTINOS_MADERA = ["Entrega a la autoridad", "Uso en la obra", "Comercialización", "Disposición final"];
export const FORMAS_COMPENSACION = ["Siembra", "Pago", "Otra"];
export const SI_NO = ["Sí", "No"];
// Los 9 puntos vienen escritos en la plantilla, en este orden
export const ITEMS_FORESTAL = [
  "Individuos señalizados antes de intervenirlos", "Solo se intervinieron los individuos autorizados", "Tala dirigida por personal capacitado y con EPP",
  "Revisión previa de nidos, colmenas y fauna antes de la tala", "Fauna encontrada rescatada o reubicada con apoyo de la autoridad", "Residuos vegetales (ramas, hojas) aprovechados o dispuestos en sitio autorizado",
  "Madera transportada con salvoconducto vigente", "Individuos conservados protegidos con cerramiento", "Área intervenida limpia al terminar",
];

export const SPEC_FORESTAL = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["autoridad", "Autoridad ambiental", "A", "C"], ["resolucion", "Resolución o permiso N°", "H", "J"],
    ["fechaResolucion", "Fecha de la resolución", "A", "C"], ["vigencia", "Vigente hasta", "E", "G"], ["autorizados", "Individuos autorizados", "I", "K"],
    ["fecha", "Fecha del registro", "A", "C"], ["responsable", "Responsable", "E", "G"],
    ["forma", "Forma de compensación", "A", "C"], ["aCompensar", "Árboles a compensar", "E", "G"], ["sembrados", "Árboles sembrados", "I", "K"],
    ["sitio", "Sitio de siembra", "A", "C"], ["fechaSiembra", "Fecha de siembra", "G", "I"],
    ["observaciones", "5. OBSERVACIONES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "individuos", cabecera: "No.", fin: "Individuos registrados", finEmpieza: true,
      columnas: { especie: "B", codigo: "D", dap: "E", altura: "F", intervencion: "G", autorizado: "I", volumen: "J", destino: "K" },
      encabezados: { especie: "Especie (nombre común)", codigo: "Código o ubicación", dap: "DAP (cm)", altura: "Altura (m)", intervencion: "Intervención", autorizado: "¿Autorizado?", volumen: "Volumen (m³)", destino: "Destino de la madera" } },
    { clave: "lista", cabecera: "No.", despuesDe: "individuos", fin: "5. OBSERVACIONES", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "responsable", col: "C" }, { clave: "residente", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_FORESTAL = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","autoridad":"C13","resolucion":"J13","fechaResolucion":"C14","vigencia":"G14","autorizados":"K14","fecha":"C15","responsable":"G15","forma":"C32","aCompensar":"G32","sembrados":"K32","sitio":"C33","fechaSiembra":"I33","observaciones":"A46","tablas":{"individuos":{"fila0":18,"n":12,"columnas":{"especie":"B","codigo":"D","dap":"E","altura":"F","intervencion":"G","autorizado":"I","volumen":"J","destino":"K"}},"lista":{"fila0":36,"n":9,"filas":[36,37,38,39,40,41,42,43,44],"columnas":{"marca":"I","obs":"K"}}},"firmas":{"responsable":{"nombre":"C50","cargo":"C51"},"residente":{"nombre":"G50","cargo":"G51"},"vobo":{"nombre":"K50","cargo":"K51"}}};
export const descubrirForestal = (ws) => descubrirPorEtiquetas(ws, SPEC_FORESTAL);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const individuoNuevo = (b = {}) => ({ especie: "", codigo: "", dap: "", altura: "", intervencion: "", autorizado: "", volumen: "", destino: "", ...b });
export const individuoVacio = (x) => !(x && (texto(x.especie) || texto(x.codigo) || texto(x.dap) || texto(x.altura) || texto(x.intervencion) || texto(x.autorizado) || texto(x.volumen) || texto(x.destino)));
export const individuosConDatos = (d) => arr(d.individuos).filter((x) => !individuoVacio(x));
export const volumenTotal = (d) => Math.round(individuosConDatos(d).reduce((t, x) => t + (num(x.volumen) || 0), 0) * 100) / 100;
export const sinAutorizacion = (d) => individuosConDatos(d).filter((x) => x.autorizado === "No");
export function porcentajeCompensacion(d) {
  const a = num(d.aCompensar), s = num(d.sembrados);
  return a && a > 0 && s !== null ? s / a : null;
}

export function escribirForestalEnHoja(ws, d, celdas = CELDAS_FORESTAL) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "autoridad", "resolucion", "responsable", "forma", "sitio", "observaciones"]) poner(ws, C[k], d[k]);
  for (const k of ["fechaResolucion", "vigencia", "fecha", "fechaSiembra"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  for (const k of ["autorizados", "aCompensar", "sembrados"]) poner(ws, C[k], num(d[k]) === null ? d[k] : num(d[k]));
  const T = C.tablas || {};
  escribirTabla(ws, T.individuos, individuosConDatos(d).map((x) => ({ ...x, dap: num(x.dap) === null ? x.dap : num(x.dap), altura: num(x.altura) === null ? x.altura : num(x.altura), volumen: num(x.volumen) === null ? x.volumen : num(x.volumen) })));
  escribirTabla(ws, T.lista, ITEMS_FORESTAL.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observacionesPuntos)[i] || "" })));
  if (T.individuos) saltoDePagina(ws, T.individuos.fila0 + T.individuos.n);   // la compensación, la verificación y las firmas van en la hoja 2 (después de la fila de totales)
  const F = C.firmas || {};
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsable); poner(ws, F.responsable.cargo, d.responsableCargo); }
  if (F.residente) { poner(ws, F.residente.nombre, d.residenteNombre); poner(ws, F.residente.cargo, d.residenteCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarForestal(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha del registro");
  if (!texto(d.resolucion)) f.push("el número de la resolución o permiso");
  const xs = individuosConDatos(d);
  if (!xs.length) f.push("al menos un individuo intervenido");
  else {
    if (xs.some((x) => !texto(x.especie))) f.push("la especie de cada individuo");
    if (xs.some((x) => !texto(x.intervencion))) f.push("el tipo de intervención de cada individuo");
  }
  if (!texto(d.responsable)) f.push("el responsable");
  const c = contarRespuestas(ITEMS_FORESTAL, d.respuestas);
  if (c.sin) f.push(`responder los puntos de la verificación (faltan ${c.sin})`);
  return f;
}
export function camposFaltantesForestal(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha del registro", seccion: "datos" });
  if (!texto(d.resolucion)) f.push({ etiqueta: "Resolución o permiso N°", seccion: "datos" });
  const todos = arr(d.individuos);
  if (!individuosConDatos(d).length) f.push({ etiqueta: "Especie (nombre común)", indice: 0, seccion: "individuos" });
  else todos.forEach((x, i) => {
    if (individuoVacio(x)) return;
    if (!texto(x.especie)) f.push({ etiqueta: "Especie (nombre común)", indice: i, seccion: "individuos" });
    if (!texto(x.intervencion)) f.push({ etiqueta: `Intervención ${i + 1}`, seccion: "individuos" });
  });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable", seccion: "datos" });
  arr(ITEMS_FORESTAL).forEach((_, i) => { if (!["Sí", "No", "N/A"].includes(arr(d.respuestas)[i])) f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: "lista" }); });
  return f;
}

export function resumenForestal(d) {
  const xs = individuosConDatos(d); const c = contarRespuestas(ITEMS_FORESTAL, d.respuestas);
  const por = (t) => xs.filter((x) => x.intervencion === t).length;
  const p = porcentajeCompensacion(d);
  return { id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.resolucion).toLowerCase()}`, formato: "forestal", proyecto: texto(d.proyecto), fecha: d.fecha, resolucion: texto(d.resolucion),
    individuos: xs.length, talas: por("Tala"), podas: por("Poda"), traslados: por("Traslado"), conservados: por("Conservación"), sinAutorizar: sinAutorizacion(d).length, volumen: volumenTotal(d),
    aCompensar: num(d.aCompensar), sembrados: num(d.sembrados), compensacion: p === null ? null : Math.round(p * 1000) / 10, cumple: c.si, noCumple: c.no };
}
