// Ficha SST del Proyecto (RYR-SS-016): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Se diligencia UNA vez por proyecto; lo que se guarda aquí lo pueden traer los demás formularios ("Traer los datos de la obra").
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, saltoDePagina } from "./sstBase";

export const CODIGO_FICHA = "RYR-SS-016";
export const HOJA_FICHA = "Ficha SST";
export const TIPOS_OBRA = ["Edificación", "Vías", "Hidrocarburos", "Redes y servicios públicos", "Otro"];
export const TURNOS = ["Diurno", "Nocturno", "Diurno y nocturno"];
export const CLASES_RIESGO = ["I", "II", "III", "IV", "V"];
export const ESTADO_ORG = ["Constituido", "En trámite", "No aplica"];
export const ESTADO_BRIGADA = ["Conformada", "En trámite", "No aplica"];
export const EXISTE = ["Sí", "No", "En trámite", "No aplica"];
export const RIESGOS_PROYECTO = ["Trabajo en alturas", "Excavaciones y zanjas", "Trabajos eléctricos", "Trabajo en caliente (soldadura, corte)", "Espacios confinados", "Izaje de cargas",
  "Maquinaria pesada y vehículos", "Manejo de sustancias químicas", "Demoliciones", "Andamios y estructuras temporales", "Tránsito vehicular y peatonal", "Otro: ____________"];
// Las filas de estas dos tablas vienen escritas en la plantilla, en este orden
export const DOCUMENTOS_BASE = ["Política de SST firmada y divulgada", "Matriz de peligros y valoración de riesgos", "Plan anual de trabajo del SG-SST", "Reglamento de higiene y seguridad industrial", "Plan de emergencias",
  "Programa de capacitación y entrenamiento", "Procedimiento de permisos de trabajo de alto riesgo", "Programa de trabajo en alturas", "Plan Estratégico de Seguridad Vial (si aplica)", "Exámenes médicos ocupacionales de ingreso"];
export const CONTACTOS = ["Bomberos", "Policía", "Cruz Roja o Defensa Civil", "Hospital o clínica más cercana", "Línea de la ARL", "Ambulancia", "Dirección Territorial del Ministerio de Trabajo", "Otro"];

export const SPEC_FICHA = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["contratante", "Contratante / Cliente", "A", "C"], ["nContrato", "N° de contrato", "H", "J"], ["interventoria", "Interventoría", "A", "C"], ["tipoObra", "Tipo de obra", "H", "J"],
    ["fechaInicio", "Fecha de inicio", "A", "C"], ["terminacion", "Terminación prevista", "E", "G"], ["trabajadoresPrev", "Trabajadores previstos", "I", "K"],
    ["horasDia", "Horas de trabajo por día", "A", "C"], ["diasSemana", "Días por semana", "E", "G"], ["turnos", "Turnos", "I", "K"],
    ["arl", "ARL", "A", "C"], ["claseRiesgo", "Clase de riesgo", "H", "J"], ["nAfiliacion", "N° de afiliación o póliza", "A", "C"], ["fechaAfiliacion", "Fecha de afiliación", "H", "J"],
    ["respNombre", "Responsable del SG-SST", "A", "C"], ["respDocumento", "Documento", "H", "J"], ["respCargo", "Cargo", "A", "C"], ["licencia", "Licencia en SST N°", "H", "J"],
    ["vigenciaLicencia", "Vigencia de la licencia", "A", "C"], ["respTelefono", "Teléfono del responsable", "H", "J"], ["residenteNombre", "Residente de obra", "A", "C"],
    ["residenteTelefono", "Teléfono del residente", "H", "J"], ["copasst", "COPASST o Vigía SST", "A", "C"], ["copasstHasta", "Vigente hasta", "H", "J"],
    ["convivencia", "Comité de Convivencia", "A", "C"], ["brigada", "Brigada de emergencias", "H", "J"],
  ],
  opciones: [{ clave: "riesgos", desde: "3. RIESGOS PRINCIPALES", hasta: "4. DOCUMENTOS BASE" }],
  tablas: [
    { clave: "documentos", cabecera: "No.", fin: "5. CONTACTOS DE EMERGENCIA", finEmpieza: true, columnas: { existe: "G", fecha: "I", obs: "K" }, encabezados: { existe: "¿Existe?", fecha: "Fecha o versión", obs: "Observación" } },
    { clave: "contactos", cabecera: "No.", despuesDe: "documentos", fin: "6. FIRMAS", finEmpieza: true, columnas: { telefono: "F", direccion: "H" }, encabezados: { telefono: "Teléfono", direccion: "Dirección o distancia a la obra" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_FICHA = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","contratante":"C13","nContrato":"J13","interventoria":"C14","tipoObra":"J14","fechaInicio":"C15","terminacion":"G15","trabajadoresPrev":"K15","horasDia":"C16","diasSemana":"G16","turnos":"K16","arl":"C18","claseRiesgo":"J18","nAfiliacion":"C19","fechaAfiliacion":"J19","respNombre":"C20","respDocumento":"J20","respCargo":"C21","licencia":"J21","vigenciaLicencia":"C22","respTelefono":"J22","residenteNombre":"C23","residenteTelefono":"J23","copasst":"C24","copasstHasta":"J24","convivencia":"C25","brigada":"J25","tablas":{"documentos":{"fila0":32,"n":10,"columnas":{"existe":"G","fecha":"I","obs":"K"}},"contactos":{"fila0":44,"n":8,"columnas":{"telefono":"F","direccion":"H"}}},"opciones":{"riesgos":[{"ref":"A27","texto":"Trabajo en alturas"},{"ref":"D27","texto":"Excavaciones y zanjas"},{"ref":"G27","texto":"Trabajos eléctricos"},{"ref":"J27","texto":"Trabajo en caliente (soldadura, corte)"},{"ref":"A28","texto":"Espacios confinados"},{"ref":"D28","texto":"Izaje de cargas"},{"ref":"G28","texto":"Maquinaria pesada y vehículos"},{"ref":"J28","texto":"Manejo de sustancias químicas"},{"ref":"A29","texto":"Demoliciones"},{"ref":"D29","texto":"Andamios y estructuras temporales"},{"ref":"G29","texto":"Tránsito vehicular y peatonal"},{"ref":"J29","texto":"Otro: ____________"}]},"firmas":{"elaboro":{"nombre":"C55","cargo":"C56"},"reviso":{"nombre":"G55","cargo":"G56"},"vobo":{"nombre":"K55","cargo":"K56"}}};
export const descubrirFicha = (ws) => descubrirPorEtiquetas(ws, SPEC_FICHA);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texto(v));
const numeroOTexto = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : v; };
export const documentoNuevo = () => ({ existe: "", fecha: "", obs: "" });
export const contactoNuevo = () => ({ telefono: "", direccion: "" });

export function escribirFichaEnHoja(ws, d, celdas = CELDAS_FICHA) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "contratante", "nContrato", "interventoria", "tipoObra", "turnos", "arl", "claseRiesgo", "nAfiliacion", "respNombre", "respDocumento", "respCargo", "licencia",
    "respTelefono", "residenteNombre", "residenteTelefono", "copasst", "convivencia", "brigada"]) poner(ws, C[k], d[k]);
  for (const k of ["fechaInicio", "terminacion", "fechaAfiliacion", "vigenciaLicencia", "copasstHasta"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  for (const k of ["trabajadoresPrev", "horasDia", "diasSemana"]) poner(ws, C[k], numeroOTexto(d[k]));
  const noMarcadas = marcarOpciones(ws, (C.opciones || {}).riesgos, arr(d.riesgos), d.otros || {});
  const T = C.tablas || {};
  escribirTabla(ws, T.documentos, DOCUMENTOS_BASE.map((_, i) => { const x = arr(d.documentos)[i] || {}; return { existe: x.existe, fecha: esFecha(x.fecha) ? fechaDDMMYYYY(x.fecha) : x.fecha, obs: x.obs }; }));
  escribirTabla(ws, T.contactos, CONTACTOS.map((_, i) => { const x = arr(d.contactos)[i] || {}; return { telefono: x.telefono, direccion: x.direccion }; }));
  const filasRiesgos = ((C.opciones || {}).riesgos || []).map((o) => Number(String((o && o.ref) || o).replace(/\D/g, ""))).filter((n) => n > 0);
  if (filasRiesgos.length) saltoDePagina(ws, Math.max(...filasRiesgos));         // la hoja 2 empieza en "4. Documentos base" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
  return noMarcadas;
}

export function validarFicha(d) {
  const faltan = [];
  if (!texto(d.proyecto)) faltan.push("el nombre del proyecto");
  if (!texto(d.contratista)) faltan.push("el contratista");
  if (!texto(d.arl)) faltan.push("la ARL");
  if (!texto(d.respNombre)) faltan.push("el responsable del SG-SST");
  if (d.fechaInicio && d.terminacion && d.terminacion < d.fechaInicio) faltan.push("que la terminación prevista no sea anterior al inicio");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora la ficha");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarFicha().
export function camposFaltantesFicha(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!texto(d.contratista)) f.push({ etiqueta: "Contratista / empresa", seccion: "datos" });
  if (!texto(d.arl)) f.push({ etiqueta: "ARL", seccion: "afiliaciones" });
  if (!texto(d.respNombre)) f.push({ etiqueta: "Nombre del responsable del SG-SST", seccion: "afiliaciones" });
  if (d.fechaInicio && d.terminacion && d.terminacion < d.fechaInicio) f.push({ etiqueta: "Terminación prevista", seccion: "datos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Lo que los demás formularios traen de la obra
export const datosDeObra = (f) => ({ proyecto: f.proyecto || "", contratista: f.contratista || "", ubicacion: f.ubicacion || "" });
// Resumen que se guarda en el dispositivo (uno por proyecto: la última versión de la ficha)
export function resumenFicha(d) {
  return { id: texto(d.proyecto).toLowerCase(), formato: "ficha", proyecto: d.proyecto || "", contratista: d.contratista || "", ubicacion: d.ubicacion || "", contratante: d.contratante || "", interventoria: d.interventoria || "",
    tipoObra: d.tipoObra || "", arl: d.arl || "", claseRiesgo: d.claseRiesgo || "", respNombre: d.respNombre || "", respCargo: d.respCargo || "", respDocumento: d.respDocumento || "", respTelefono: d.respTelefono || "",
    licencia: d.licencia || "", residenteNombre: d.residenteNombre || "", residenteTelefono: d.residenteTelefono || "", trabajadoresPrev: d.trabajadoresPrev || "", fechaInicio: d.fechaInicio || "", terminacion: d.terminacion || "",
    riesgos: arr(d.riesgos), documentosSi: arr(d.documentos).filter((x) => x && x.existe === "Sí").length, actualizada: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })() };
}
