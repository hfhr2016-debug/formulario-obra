// Incidente o Accidente Ambiental (RYR-AM-011). Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, saltoDePagina } from "./sstBase";

export const CODIGO_INCIDENTE_AMB = "RYR-AM-011";
export const HOJA_INCIDENTE_AMB = "Incidente Ambiental";
export const TIPOS_EVENTO_AMB = ["Derrame de combustible o aceite", "Vertimiento no controlado", "Emisión de polvo o gases", "Incendio con afectación ambiental", "Afectación a fauna o flora",
  "Afectación a un cuerpo de agua", "Residuos mal dispuestos", "Daño a redes o servicios", "Ruido o vibración fuera de norma", "Otro:"];
export const COMPONENTES = ["Suelo", "Agua superficial o subterránea", "Aire", "Flora", "Fauna", "Comunidad", "Infraestructura", "Sin afectación"];
export const SEVERIDADES = ["Leve", "Moderada", "Grave"];
export const NOTIFICACION = ["Sí", "No", "No aplica"];
export const ESTADOS_ACCION = ["Abierta", "En curso", "Cerrada"];
export const ESTADOS_EVENTO = ["Abierto", "En seguimiento", "Cerrado"];

export const SPEC_INCIDENTE_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["nReporte", "Reporte N°", "H", "J"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha del evento", "A", "C"], ["horaEvento", "Hora del evento", "E", "G"], ["horaReporte", "Hora del reporte", "I", "K"],
    ["reportadoPor", "Reportado por", "A", "C"], ["reportaCargo", "Cargo", "H", "J"], ["lugar", "Lugar exacto", "A", "C"], ["coordenadas", "Coordenadas", "H", "J"],
    ["quePaso", "¿Qué pasó?", "A", "C"], ["causaInmediata", "Causa inmediata", "A", "C"], ["sustancia", "Sustancia o material", "A", "C"], ["cantidad", "Cantidad estimada", "H", "J"],
    ["severidad", "Severidad", "A", "C"], ["personas", "Personas afectadas", "E", "G"], ["area", "Área afectada (m²)", "I", "K"],
    ["notificado", "¿Se notificó a la autoridad?", "A", "C"], ["autoridad", "Autoridad", "E", "G"], ["radicado", "Fecha y radicado", "I", "K"],
    ["acciones", "Acciones realizadas", "A", "C"], ["residuos", "Residuos generados", "A", "C"], ["disposicion", "Disposición final", "H", "J"],
    ["causaRaiz", "Causa raíz", "A", "C"],
    ["estado", "Estado", "A", "C"], ["fechaCierre", "Fecha de cierre", "E", "G"], ["verifico", "Verificó el cierre", "I", "K"],
  ],
  opciones: [{ clave: "tipos", desde: "2. TIPO DE EVENTO", hasta: "3. DESCRIPCIÓN" }, { clave: "componentes", desde: "4. AFECTACIÓN Y SEVERIDAD", hasta: "Severidad" }],
  tablas: [
    { clave: "correctivas", cabecera: "No.", fin: "7. CIERRE DEL EVENTO", finEmpieza: true, columnas: { accion: "B", responsable: "G", fechaLimite: "J", estado: "L" },
      encabezados: { accion: "Acción correctiva o preventiva", responsable: "Responsable", fechaLimite: "Fecha límite", estado: "Estado" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "8. FIRMAS", personas: [{ clave: "reporta", col: "C" }, { clave: "responsable", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_INCIDENTE_AMB = {"proyecto":"C11","nReporte":"J11","contratista":"C12","ubicacion":"J12","fecha":"C13","horaEvento":"G13","horaReporte":"K13","reportadoPor":"C14","reportaCargo":"J14","lugar":"C15","coordenadas":"J15","quePaso":"C22","causaInmediata":"C23","sustancia":"C24","cantidad":"J24","severidad":"C28","personas":"G28","area":"K28","notificado":"C29","autoridad":"G29","radicado":"K29","acciones":"C31","residuos":"C32","disposicion":"J32","causaRaiz":"C34","estado":"C40","fechaCierre":"G40","verifico":"K40","tablas":{"correctivas":{"fila0":36,"n":3,"columnas":{"accion":"B","responsable":"G","fechaLimite":"J","estado":"L"}}},"opciones":{"tipos":[{"ref":"A17","texto":"Derrame de combustible o aceite"},{"ref":"E17","texto":"Vertimiento no controlado"},{"ref":"I17","texto":"Emisión de polvo o gases"},{"ref":"A18","texto":"Incendio con afectación ambiental"},{"ref":"E18","texto":"Afectación a fauna o flora"},{"ref":"I18","texto":"Afectación a un cuerpo de agua"},{"ref":"A19","texto":"Residuos mal dispuestos"},{"ref":"E19","texto":"Daño a redes o servicios"},{"ref":"I19","texto":"Ruido o vibración fuera de norma"},{"ref":"A20","texto":"Otro:"}],"componentes":[{"ref":"A26","texto":"Suelo"},{"ref":"D26","texto":"Agua superficial o subterránea"},{"ref":"G26","texto":"Aire"},{"ref":"J26","texto":"Flora"},{"ref":"A27","texto":"Fauna"},{"ref":"D27","texto":"Comunidad"},{"ref":"G27","texto":"Infraestructura"},{"ref":"J27","texto":"Sin afectación"}]},"firmas":{"reporta":{"nombre":"C44","cargo":"C45"},"responsable":{"nombre":"G44","cargo":"G45"},"vobo":{"nombre":"K44","cargo":"K45"}}};
export const descubrirIncidenteAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_INCIDENTE_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const numeroOTexto = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : v; };
export const correctivaNueva = (base = {}) => ({ accion: "", responsable: "", fechaLimite: "", estado: "Abierta", ...base });
const correctivaVacia = (c) => !(texto(c.accion) || texto(c.responsable) || c.fechaLimite);
export const correctivasConDatos = (d) => arr(d.correctivas).filter((c) => !correctivaVacia(c));

export function escribirIncidenteAmbEnHoja(ws, d, celdas = CELDAS_INCIDENTE_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "nReporte", "contratista", "ubicacion", "horaEvento", "horaReporte", "reportadoPor", "reportaCargo", "lugar", "coordenadas", "quePaso", "causaInmediata", "sustancia", "cantidad",
    "severidad", "notificado", "autoridad", "radicado", "acciones", "residuos", "disposicion", "causaRaiz", "estado", "verifico"]) poner(ws, C[k], d[k]);
  poner(ws, C.personas, numeroOTexto(d.personas)); poner(ws, C.area, numeroOTexto(d.area));
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha)); poner(ws, C.fechaCierre, fechaDDMMYYYY(d.fechaCierre));
  const O = C.opciones || {};
  const noMarcadas = [...marcarOpciones(ws, O.tipos, arr(d.tipos), d.otros || {}), ...marcarOpciones(ws, O.componentes, arr(d.componentes), {})];
  const T = C.tablas || {};
  escribirTabla(ws, T.correctivas, correctivasConDatos(d).map((c) => ({ ...c, fechaLimite: fechaDDMMYYYY(c.fechaLimite) })));
  const filaSustancia = C.sustancia ? Number(String(C.sustancia).replace(/\D/g, "")) : 0;
  if (filaSustancia) saltoDePagina(ws, filaSustancia);                       // la hoja 2 empieza en «4. Afectación y severidad»
  const F = C.firmas || {};
  if (F.reporta) { poner(ws, F.reporta.nombre, d.reportadoPor); poner(ws, F.reporta.cargo, d.reportaCargo); }
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsableNombre); poner(ws, F.responsable.cargo, d.responsableCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.revisoNombre); poner(ws, F.vobo.cargo, d.revisoCargo); }
  return noMarcadas;
}

const numeroNoNegativo = (v) => { const t = texto(v).replace(",", "."); return t === "" || (!isNaN(Number(t)) && Number(t) >= 0); };
export function validarIncidenteAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha del evento");
  if (!texto(d.reportadoPor)) f.push("quién reporta");
  if (!arr(d.tipos).length) f.push("el tipo de evento");
  if (arr(d.tipos).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push("cuál es el otro tipo de evento");
  if (!texto(d.quePaso)) f.push("qué pasó");
  if (!arr(d.componentes).length) f.push("el componente afectado (o «Sin afectación»)");
  if (!d.severidad) f.push("la severidad");
  if (!numeroNoNegativo(d.personas)) f.push("las personas afectadas como número");
  if (!numeroNoNegativo(d.area)) f.push("el área afectada como número");
  if (d.notificado === "Sí" && !texto(d.autoridad)) f.push("la autoridad notificada");
  if (!texto(d.acciones)) f.push("las acciones de contención realizadas");
  if (correctivasConDatos(d).some((c) => !texto(c.accion))) f.push("la acción en cada fila de acciones correctivas");
  if (d.estado === "Cerrado" && !d.fechaCierre) f.push("la fecha de cierre");
  return f;
}
export function camposFaltantesIncidenteAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "evento" });
  if (!d.fecha) f.push({ etiqueta: "Fecha del evento", seccion: "evento" });
  if (!texto(d.reportadoPor)) f.push({ etiqueta: "Nombre de quien reporta", seccion: "evento" });
  if (!arr(d.tipos).length) f.push({ etiqueta: "Tipo de evento", seccion: "tipo" });
  if (arr(d.tipos).includes("Otro:") && !texto((d.otros || {})["Otro:"])) f.push({ etiqueta: "Tipo de evento", seccion: "tipo" });
  if (!texto(d.quePaso)) f.push({ etiqueta: "¿Qué pasó?", seccion: "descripcion" });
  if (!arr(d.componentes).length) f.push({ etiqueta: "Componentes afectados", seccion: "afectacion" });
  if (!d.severidad) f.push({ etiqueta: "Severidad", seccion: "afectacion" });
  if (!numeroNoNegativo(d.personas)) f.push({ etiqueta: "Personas afectadas", seccion: "afectacion" });
  if (!numeroNoNegativo(d.area)) f.push({ etiqueta: "Área afectada (m²)", seccion: "afectacion" });
  if (d.notificado === "Sí" && !texto(d.autoridad)) f.push({ etiqueta: "Autoridad notificada", seccion: "afectacion" });
  if (!texto(d.acciones)) f.push({ etiqueta: "Acciones realizadas", seccion: "acciones" });
  arr(d.correctivas).forEach((c, i) => { if (correctivasConDatos(d).includes(c) && !texto(c.accion)) f.push({ etiqueta: "Acción correctiva o preventiva", indice: i, seccion: "causas" }); });
  if (d.estado === "Cerrado" && !d.fechaCierre) f.push({ etiqueta: "Fecha de cierre", seccion: "cierre" });
  return f;
}
export function resumenIncidenteAmb(d) {
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${texto(d.nReporte) || d.fecha}`, formato: "incidente", proyecto: texto(d.proyecto), fecha: d.fecha, nReporte: texto(d.nReporte),
    tipos: arr(d.tipos), severidad: d.severidad || "", estado: d.estado || "", componentes: arr(d.componentes),
    notificado: d.notificado || "", causaRaiz: texto(d.causaRaiz), plan: correctivasConDatos(d).map((c) => ({ accion: c.accion || "", responsable: c.responsable || "", fechaLimite: c.fechaLimite || "", estado: c.estado || "Abierta" })), acciones: correctivasConDatos(d).length, abiertas: correctivasConDatos(d).filter((c) => c.estado !== "Cerrada").length,
  };
}
