// Reporte de accidente o incidente de trabajo (RYR-SS-013): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, saltoDePagina } from "./sstBase";

export const CODIGO_ACCIDENTE = "RYR-SS-013";
export const HOJA_ACCIDENTE = "Accidente o Incidente";
export const TIPOS_EVENTO = ["Accidente de trabajo", "Accidente grave", "Accidente mortal", "Incidente (sin lesión)", "Casi accidente"];
export const VINCULACIONES = ["Planta", "Contratista", "Subcontratista", "Independiente", "Aprendiz"];
export const SI_NO = ["Sí", "No"];
export const PARTES_CUERPO = ["Cabeza", "Ojos", "Cara", "Cuello", "Tronco o tórax", "Espalda", "Hombros o brazos", "Manos o dedos", "Piernas", "Pies", "Múltiples partes", "Ninguna (incidente)"];
export const TIPOS_LESION = ["Herida o corte", "Contusión o golpe", "Fractura", "Esguince o luxación", "Quemadura", "Amputación", "Trauma craneoencefálico", "Intoxicación", "Lesión por esfuerzo", "Daño por proyección", "Otra:", "Ninguna (incidente)"];
export const MECANISMOS = ["Caída de personas", "Caída de objetos", "Golpe o atrapamiento", "Contacto eléctrico", "Contacto con sustancias", "Sobreesfuerzo", "Accidente de tránsito", "Proyección de partículas", "Derrumbe o colapso", "Incendio o explosión", "Agresión de terceros", "Otro:"];
// Las 5 filas de notificaciones vienen escritas en la plantilla, en este orden
export const ENTIDADES_NOTIFICACION = ["ARL (FURAT)", "EPS", "Dirección Territorial del Ministerio de Trabajo (grave o mortal)", "COPASST o Vigía SST", "Interventoría / Cliente"];
export const REPORTADO = ["Sí", "No", "No aplica"];

export const SPEC_ACCIDENTE = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["nReporte", "N° de reporte", "A", "C"],
    ["fechaEvento", "Fecha del evento", "D", "E"],
    ["horaEvento", "Hora del evento", "F", "G"],
    ["fechaReporte", "Fecha del reporte", "H", "J"],
    ["tipoEvento", "Tipo de evento", "A", "C"],
    ["lugar", "Lugar exacto", "H", "J"],
    ["actividad", "Actividad que realizaba", "A", "C"],
    ["enJornada", "¿En su jornada laboral?", "H", "J"],
    ["trabajadorNombre", "Nombre completo", "A", "C"],
    ["documento", "Documento de identidad", "H", "J"],
    ["cargo", "Cargo / oficio", "A", "C"],
    ["empresa", "Empresa", "H", "J"],
    ["edad", "Edad (años)", "A", "C"],
    ["antiguedad", "Antigüedad en el cargo", "D", "F"],
    ["vinculacion", "Tipo de vinculación", "G", "I"],
    ["eps", "EPS", "A", "C"],
    ["arl", "ARL", "H", "J"],
    ["queOcurrio", "¿Qué pasó?", "A", "C"],
    ["primerosAuxilios", "Primeros auxilios en obra", "A", "C"],
    ["quienPresto", "¿Quién los prestó?", "E", "G"],
    ["remitidoA", "Remitido a", "I", "K"],
    ["hospitalizado", "¿Hospitalizado?", "A", "C"],
    ["incapacidad", "Incapacidad estimada (días)", "E", "G"],
    ["danosMateriales", "Daños materiales", "I", "K"],
    ["descripcionDanos", "Descripción de los daños", "A", "C"],
    ["accionesInmediatas", "6. ACCIONES INMEDIATAS TOMADAS", "A", "A", null, 1],
  ],
  opciones: [
    { clave: "cuerpo", desde: "Parte del cuerpo afectada", hasta: "Tipo de lesión" },
    { clave: "lesion", desde: "Tipo de lesión", hasta: "Cómo ocurrió" },
    { clave: "mecanismo", desde: "Cómo ocurrió", hasta: "4. ATENCIÓN" },
  ],
  tablas: [
    { clave: "testigos", cabecera: "No.", fin: "6. ACCIONES INMEDIATAS", finEmpieza: true, columnas: { nombre: "B", cargo: "E", contacto: "G", vio: "I" },
      encabezados: { nombre: "Nombre completo", cargo: "Cargo", contacto: "Teléfono o contacto", vio: "Qué vio (resumen)" } },
    { clave: "notificaciones", cabecera: "Entidad o persona", despuesDe: "testigos", fin: "Recuerde", finEmpieza: true, columnas: { reportado: "E", fecha: "G", hora: "I", radicado: "J" },
      encabezados: { reportado: "¿Reportado?", fecha: "Fecha", hora: "Hora", radicado: "N° de radicado o referencia" } },
  ],
  fotos: [{ clave: "fotos", desde: "8. EVIDENCIA", hasta: "9. FIRMAS" }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "9. FIRMAS", personas: [{ clave: "reporta", col: "B" }, { clave: "afectado", col: "E" }, { clave: "sst", col: "H" }, { clave: "residente", col: "K" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ACCIDENTE = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","nReporte":"C13","fechaEvento":"E13","horaEvento":"G13","fechaReporte":"J13","tipoEvento":"C14","lugar":"J14","actividad":"C15","enJornada":"J15","trabajadorNombre":"C17","documento":"J17","cargo":"C18","empresa":"J18","edad":"C19","antiguedad":"F19","vinculacion":"I19","eps":"C20","arl":"J20","queOcurrio":"C22","primerosAuxilios":"C36","quienPresto":"G36","remitidoA":"K36","hospitalizado":"C37","incapacidad":"G37","danosMateriales":"K37","descripcionDanos":"C38","accionesInmediatas":"A44","tablas":{"testigos":{"fila0":41,"n":2,"columnas":{"nombre":"B","cargo":"E","contacto":"G","vio":"I"}},"notificaciones":{"fila0":47,"n":5,"columnas":{"reportado":"E","fecha":"G","hora":"I","radicado":"J"}}},"opciones":{"cuerpo":[{"ref":"A24","texto":"Cabeza"},{"ref":"D24","texto":"Ojos"},{"ref":"G24","texto":"Cara"},{"ref":"J24","texto":"Cuello"},{"ref":"A25","texto":"Tronco o tórax"},{"ref":"D25","texto":"Espalda"},{"ref":"G25","texto":"Hombros o brazos"},{"ref":"J25","texto":"Manos o dedos"},{"ref":"A26","texto":"Piernas"},{"ref":"D26","texto":"Pies"},{"ref":"G26","texto":"Múltiples partes"},{"ref":"J26","texto":"Ninguna (incidente)"}],"lesion":[{"ref":"A28","texto":"Herida o corte"},{"ref":"D28","texto":"Contusión o golpe"},{"ref":"G28","texto":"Fractura"},{"ref":"J28","texto":"Esguince o luxación"},{"ref":"A29","texto":"Quemadura"},{"ref":"D29","texto":"Amputación"},{"ref":"G29","texto":"Trauma craneoencefálico"},{"ref":"J29","texto":"Intoxicación"},{"ref":"A30","texto":"Lesión por esfuerzo"},{"ref":"D30","texto":"Daño por proyección"},{"ref":"G30","texto":"Otra: ____________"},{"ref":"J30","texto":"Ninguna (incidente)"}],"mecanismo":[{"ref":"A32","texto":"Caída de personas"},{"ref":"D32","texto":"Caída de objetos"},{"ref":"G32","texto":"Golpe o atrapamiento"},{"ref":"J32","texto":"Contacto eléctrico"},{"ref":"A33","texto":"Contacto con sustancias"},{"ref":"D33","texto":"Sobreesfuerzo"},{"ref":"G33","texto":"Accidente de tránsito"},{"ref":"J33","texto":"Proyección de partículas"},{"ref":"A34","texto":"Derrumbe o colapso"},{"ref":"D34","texto":"Incendio o explosión"},{"ref":"G34","texto":"Agresión de terceros"},{"ref":"J34","texto":"Otro: ____________"}]},"fotos":{"fotos":[{"tl":{"col":0,"row":53},"br":{"col":6,"row":71},"aspecto":1.424},{"tl":{"col":6,"row":53},"br":{"col":12,"row":71},"aspecto":1.357}]},"firmas":{"reporta":{"nombre":"B76","cargo":"B77"},"afectado":{"nombre":"E76","cargo":"E77"},"sst":{"nombre":"H76","cargo":"H77"},"residente":{"nombre":"K76","cargo":"K77"}}};
export const descubrirAccidente = (ws) => descubrirPorEtiquetas(ws, SPEC_ACCIDENTE);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const testigoNuevo = (b = {}) => ({ nombre: "", cargo: "", contacto: "", vio: "", ...b });
const testigoVacio = (t) => !(t && (texto(t.nombre) || texto(t.cargo) || texto(t.contacto) || texto(t.vio)));
export const testigosConDatos = (d) => arr(d.testigos).filter((t) => !testigoVacio(t));
export const notificacionNueva = () => ({ reportado: "", fecha: "", hora: "", radicado: "" });
// Un accidente (a diferencia de un incidente o casi accidente) tiene un trabajador lesionado
export const esAccidente = (d) => /^Accidente/.test(d.tipoEvento || "");
export const esGraveOMortal = (d) => d.tipoEvento === "Accidente grave" || d.tipoEvento === "Accidente mortal";

export function escribirAccidenteEnHoja(ws, d, celdas = CELDAS_ACCIDENTE) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "nReporte", "horaEvento", "tipoEvento", "lugar", "actividad", "enJornada", "trabajadorNombre", "documento", "cargo", "empresa", "edad", "antiguedad",
    "vinculacion", "eps", "arl", "queOcurrio", "primerosAuxilios", "quienPresto", "remitidoA", "hospitalizado", "danosMateriales", "descripcionDanos", "accionesInmediatas"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaEvento, fechaDDMMYYYY(d.fechaEvento));
  poner(ws, C.fechaReporte, fechaDDMMYYYY(d.fechaReporte));
  const dias = texto(d.incapacidad).replace(",", ".");
  poner(ws, C.incapacidad, dias !== "" && !isNaN(Number(dias)) ? Number(dias) : d.incapacidad);
  const O = C.opciones || {};
  const noMarcadas = [
    ...marcarOpciones(ws, O.cuerpo, arr(d.cuerpo), d.otros || {}),
    ...marcarOpciones(ws, O.lesion, arr(d.lesion), d.otros || {}),
    ...marcarOpciones(ws, O.mecanismo, arr(d.mecanismo), d.otros || {}),
  ];
  const T = C.tablas || {};
  escribirTabla(ws, T.testigos, testigosConDatos(d).map((t) => ({ nombre: t.nombre, cargo: t.cargo, contacto: t.contacto, vio: t.vio })));
  escribirTabla(ws, T.notificaciones, ENTIDADES_NOTIFICACION.map((_, i) => { const n = arr(d.notificaciones)[i] || {}; return { reportado: n.reportado, fecha: fechaDDMMYYYY(n.fecha), hora: n.hora, radicado: n.radicado }; }));
  if (T.testigos) saltoDePagina(ws, T.testigos.fila0 + T.testigos.n - 1 + 2);   // la hoja 2 empieza en "7. Reportes y notificaciones"
  const F = C.firmas || {};
  // Firman: quien reporta, el trabajador afectado (con su nombre y cargo), el responsable SST y el residente
  if (F.reporta) { poner(ws, F.reporta.nombre, d.reportaNombre); poner(ws, F.reporta.cargo, d.reportaCargo); }
  if (F.afectado && esAccidente(d)) { poner(ws, F.afectado.nombre, d.trabajadorNombre); poner(ws, F.afectado.cargo, d.cargo); }
  if (F.sst) { poner(ws, F.sst.nombre, d.sstNombre); poner(ws, F.sst.cargo, d.sstCargo); }
  if (F.residente) { poner(ws, F.residente.nombre, d.residenteNombre); poner(ws, F.residente.cargo, d.residenteCargo); }
  return noMarcadas;
}

export function validarAccidente(d) {
  const faltan = [];
  if (!d.tipoEvento) faltan.push("el tipo de evento");
  if (!d.fechaEvento) faltan.push("la fecha del evento");
  if (!d.horaEvento) faltan.push("la hora del evento");
  if (!texto(d.lugar)) faltan.push("el lugar exacto");
  if (!texto(d.queOcurrio)) faltan.push("qué pasó");
  if (esAccidente(d)) {
    if (!texto(d.trabajadorNombre)) faltan.push("el nombre del trabajador afectado");
    if (!texto(d.documento)) faltan.push("el documento del trabajador afectado");
  }
  if (!texto(d.reportaNombre)) faltan.push("quién reporta");
  return faltan;
}

// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarAccidente().
export function camposFaltantesAccidente(d) {
  const f = [];
  if (!d.tipoEvento) f.push({ etiqueta: "Tipo de evento", seccion: "evento" });
  if (!d.fechaEvento) f.push({ etiqueta: "Fecha del evento", seccion: "evento" });
  if (!d.horaEvento) f.push({ etiqueta: "Hora del evento", seccion: "evento" });
  if (!texto(d.lugar)) f.push({ etiqueta: "Lugar exacto", seccion: "evento" });
  if (!texto(d.queOcurrio)) f.push({ etiqueta: "¿Qué pasó?", seccion: "descripcion" });
  if (esAccidente(d)) {
    if (!texto(d.trabajadorNombre)) f.push({ etiqueta: "Nombre del trabajador afectado", seccion: "trabajador" });
    if (!texto(d.documento)) f.push({ etiqueta: "Documento de identidad", seccion: "trabajador" });
  }
  if (!texto(d.reportaNombre)) f.push({ etiqueta: "Nombre de quien reporta", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: alimenta la Investigación (que lo trae por su número de reporte) y los Indicadores
export function resumenAccidente(d) {
  const dias = Number(texto(d.incapacidad).replace(",", "."));
  return { id: `${d.fechaEvento || "sin-fecha"}_${d.nReporte || ""}`, formato: "accidente", nReporte: d.nReporte || "", fechaEvento: d.fechaEvento || "", horaEvento: d.horaEvento || "", tipoEvento: d.tipoEvento || "",
    proyecto: d.proyecto || "", contratista: d.contratista || "", ubicacion: d.ubicacion || "", lugar: d.lugar || "", queOcurrio: d.queOcurrio || "",
    trabajadorNombre: d.trabajadorNombre || "", documento: d.documento || "", cargo: d.cargo || "", incapacidad: isNaN(dias) ? 0 : dias,
    hospitalizado: d.hospitalizado || "", esAccidente: esAccidente(d), mortal: d.tipoEvento === "Accidente mortal", grave: esGraveOMortal(d) };
}
