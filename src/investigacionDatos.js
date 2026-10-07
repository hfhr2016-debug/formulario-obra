// Investigación de accidentes e incidentes (RYR-SS-014): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, textoResponsable, saltoDePagina } from "./sstBase";

export const CODIGO_INVESTIGACION = "RYR-SS-014";
export const HOJA_INVESTIGACION = "Investigación";
export const PLAZO_DIAS = 15;      // la investigación se hace dentro de los 15 días siguientes al evento (Resolución 1401 de 2007)
export const TIPOS_EVENTO = ["Accidente de trabajo", "Accidente grave", "Accidente mortal", "Incidente (sin lesión)", "Casi accidente"];
export const TIPOS_CONTROL = ["Eliminación", "Sustitución", "Control de ingeniería", "Control administrativo", "EPP"];
export const ESTADOS_PLAN = ["Abierta", "En proceso", "Cerrada"];
export const SI_NO = ["Sí", "No"];
export const PREGUNTAS_PORQUES = ["¿Por qué ocurrió el evento?", "¿Por qué ocurrió lo anterior?", "¿Por qué ocurrió lo anterior?", "¿Por qué ocurrió lo anterior?", "¿Por qué ocurrió lo anterior?"];
export const ACTOS_SUBESTANDAR = ["Operar equipo sin autorización", "No advertir ni señalizar", "No asegurar o bloquear", "Operar a velocidad inadecuada", "Anular dispositivos de seguridad", "Usar equipo o herramienta defectuosa",
  "No usar o usar mal los EPP", "Cargar o posicionarse mal", "Distracción o juego", "Trabajar bajo alcohol o drogas", "Omitir procedimientos o permisos", "Otro:"];
export const CONDICIONES_SUBESTANDAR = ["Protecciones o guardas inadecuadas", "EPP inadecuado o defectuoso", "Herramientas o equipos defectuosos", "Espacio limitado o congestión", "Sistema de advertencia inadecuado",
  "Peligro de incendio o explosión", "Orden y aseo deficientes", "Iluminación o ventilación inadecuada", "Ruido o temperaturas extremas", "Instalaciones eléctricas deficientes", "Superficies resbalosas o irregulares", "Otra:"];
export const FACTORES_PERSONALES = ["Capacidad física inadecuada", "Capacidad mental o psicológica inadecuada", "Estrés físico o psicológico", "Falta de conocimiento", "Falta de habilidad o práctica", "Motivación inadecuada",
  "Fatiga o falta de descanso", "Otro:"];
export const FACTORES_TRABAJO = ["Supervisión o liderazgo deficiente", "Ingeniería o diseño inadecuado", "Compras o adquisiciones deficientes", "Mantenimiento deficiente", "Herramientas o equipos inadecuados",
  "Estándares o procedimientos deficientes", "Desgaste normal", "Mal uso o abuso de equipos", "Falta de capacitación o inducción", "Programación o planeación deficiente", "Comunicación deficiente", "Otro:"];

export const SPEC_INVESTIGACION = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["nInvestigacion", "N° de investigación", "A", "C"],
    ["nReporte", "Reporte N°", "D", "E"],
    ["fechaEvento", "Fecha del evento", "F", "G"],
    ["fechaInvestigacion", "Fecha de investigación", "H", "J"],
    ["tipoEvento", "Tipo de evento", "A", "C"],
    ["plazo", "Plazo máximo (15 días)", "H", "J"],
    ["trabajadorNombre", "Trabajador afectado", "A", "C"],
    ["documento", "Documento", "H", "J"],
    ["cargo", "Cargo / oficio", "A", "C"],
    ["incapacidad", "Días de incapacidad", "H", "J"],
    ["descripcion", "Descripción del evento", "A", "C"],
    ["causaRaiz", "Causa raíz identificada", "A", "C"],
    ["lecciones", "Lecciones aprendidas", "A", "C"],
    ["socializo", "¿Se socializó con el equipo?", "A", "C"],
    ["fechaSocializacion", "Fecha de socialización", "E", "G"],
    ["accionesAbiertas", "Acciones abiertas (N°)", "I", "K"],
    ["verificacion", "Verificación de eficacia (fecha y resultado)", "A", "C"],
  ],
  opciones: [
    { clave: "actos", desde: "Causas inmediatas · Actos subestándar", hasta: "Causas inmediatas · Condiciones subestándar" },
    { clave: "condiciones", desde: "Causas inmediatas · Condiciones subestándar", hasta: "Causas básicas · Factores personales" },
    { clave: "personales", desde: "Causas básicas · Factores personales", hasta: "Causas básicas · Factores del trabajo" },
    { clave: "trabajo", desde: "Causas básicas · Factores del trabajo", hasta: "6. PLAN DE ACCIÓN" },
  ],
  tablas: [
    { clave: "equipo", cabecera: "No.", fin: "3. DESCRIPCIÓN Y SECUENCIA", finEmpieza: true, columnas: { nombre: "B", rol: "E", documento: "I" },
      encabezados: { nombre: "Nombre completo", rol: "Cargo y rol en la investigación", documento: "Documento" } },
    { clave: "secuencia", cabecera: "No.", despuesDe: "equipo", fin: "4. ANÁLISIS DE CAUSAS", finEmpieza: true, columnas: { hora: "B", hecho: "D" }, encabezados: { hora: "Hora o momento", hecho: "Qué ocurrió" } },
    { clave: "porques", cabecera: "No.", despuesDe: "secuencia", fin: "Causa raíz", finEmpieza: true, columnas: { respuesta: "G" }, encabezados: { respuesta: "Respuesta (causa encontrada)" } },
    { clave: "plan", cabecera: "No.", despuesDe: "porques", fin: "7. LECCIONES APRENDIDAS", finEmpieza: true, columnas: { accion: "B", control: "F", responsable: "H", fecha: "J", estado: "K" },
      encabezados: { accion: "Acción", control: "Tipo de control", responsable: "Responsable", fecha: "Fecha compromiso", estado: "Estado" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "8. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "aprobo", col: "K" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_INVESTIGACION = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","nInvestigacion":"C13","nReporte":"E13","fechaEvento":"G13","fechaInvestigacion":"J13","tipoEvento":"C14","plazo":"J14","trabajadorNombre":"C15","documento":"J15","cargo":"C16","incapacidad":"J16","descripcion":"C24","causaRaiz":"C39","lecciones":"C65","socializo":"C66","fechaSocializacion":"G66","accionesAbiertas":"K66","verificacion":"C67","tablas":{"equipo":{"fila0":19,"n":4,"columnas":{"nombre":"B","rol":"E","documento":"I"}},"secuencia":{"fila0":26,"n":6,"columnas":{"hora":"B","hecho":"D"}},"porques":{"fila0":34,"n":5,"columnas":{"respuesta":"G"}},"plan":{"fila0":58,"n":6,"columnas":{"accion":"B","control":"F","responsable":"H","fecha":"J","estado":"K"}}},"opciones":{"actos":[{"ref":"A42","texto":"Operar equipo sin autorización"},{"ref":"D42","texto":"No advertir ni señalizar"},{"ref":"G42","texto":"No asegurar o bloquear"},{"ref":"J42","texto":"Operar a velocidad inadecuada"},{"ref":"A43","texto":"Anular dispositivos de seguridad"},{"ref":"D43","texto":"Usar equipo o herramienta defectuosa"},{"ref":"G43","texto":"No usar o usar mal los EPP"},{"ref":"J43","texto":"Cargar o posicionarse mal"},{"ref":"A44","texto":"Distracción o juego"},{"ref":"D44","texto":"Trabajar bajo alcohol o drogas"},{"ref":"G44","texto":"Omitir procedimientos o permisos"},{"ref":"J44","texto":"Otro: ____________"}],"condiciones":[{"ref":"A46","texto":"Protecciones o guardas inadecuadas"},{"ref":"D46","texto":"EPP inadecuado o defectuoso"},{"ref":"G46","texto":"Herramientas o equipos defectuosos"},{"ref":"J46","texto":"Espacio limitado o congestión"},{"ref":"A47","texto":"Sistema de advertencia inadecuado"},{"ref":"D47","texto":"Peligro de incendio o explosión"},{"ref":"G47","texto":"Orden y aseo deficientes"},{"ref":"J47","texto":"Iluminación o ventilación inadecuada"},{"ref":"A48","texto":"Ruido o temperaturas extremas"},{"ref":"D48","texto":"Instalaciones eléctricas deficientes"},{"ref":"G48","texto":"Superficies resbalosas o irregulares"},{"ref":"J48","texto":"Otra: ____________"}],"personales":[{"ref":"A50","texto":"Capacidad física inadecuada"},{"ref":"D50","texto":"Capacidad mental o psicológica inadecuada"},{"ref":"G50","texto":"Estrés físico o psicológico"},{"ref":"J50","texto":"Falta de conocimiento"},{"ref":"A51","texto":"Falta de habilidad o práctica"},{"ref":"D51","texto":"Motivación inadecuada"},{"ref":"G51","texto":"Fatiga o falta de descanso"},{"ref":"J51","texto":"Otro: ____________"}],"trabajo":[{"ref":"A53","texto":"Supervisión o liderazgo deficiente"},{"ref":"D53","texto":"Ingeniería o diseño inadecuado"},{"ref":"G53","texto":"Compras o adquisiciones deficientes"},{"ref":"J53","texto":"Mantenimiento deficiente"},{"ref":"A54","texto":"Herramientas o equipos inadecuados"},{"ref":"D54","texto":"Estándares o procedimientos deficientes"},{"ref":"G54","texto":"Desgaste normal"},{"ref":"J54","texto":"Mal uso o abuso de equipos"},{"ref":"A55","texto":"Falta de capacitación o inducción"},{"ref":"D55","texto":"Programación o planeación deficiente"},{"ref":"G55","texto":"Comunicación deficiente"},{"ref":"J55","texto":"Otro: ____________"}]},"firmas":{"elaboro":{"nombre":"C71","cargo":"C72"},"reviso":{"nombre":"G71","cargo":"G72"},"aprobo":{"nombre":"K71","cargo":"K72"}}};
export const descubrirInvestigacion = (ws) => descubrirPorEtiquetas(ws, SPEC_INVESTIGACION);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const miembroNuevo = (b = {}) => ({ nombre: "", rol: "", documento: "", ...b });
export const hechoNuevo = (b = {}) => ({ hora: "", hecho: "", ...b });
export const accionPlanNueva = (b = {}) => ({ accion: "", control: "", responsable: "", responsableCargo: "", fecha: "", estado: "Abierta", ...b });
const miembroVacio = (m) => !(m && (texto(m.nombre) || texto(m.rol) || texto(m.documento)));
const hechoVacio = (h) => !(h && (texto(h.hora) || texto(h.hecho)));
const planVacio = (p) => !(p && (texto(p.accion) || texto(p.responsable) || texto(p.responsableCargo) || p.fecha || texto(p.control)));
export const equipoConDatos = (d) => arr(d.equipo).filter((m) => !miembroVacio(m));
export const secuenciaConDatos = (d) => arr(d.secuencia).filter((h) => !hechoVacio(h));
export const planConDatos = (d) => arr(d.plan).filter((p) => !planVacio(p));
export const causasMarcadas = (d) => arr(d.actos).length + arr(d.condiciones).length + arr(d.personales).length + arr(d.trabajo).length;

// Fecha + n días (en texto AAAA-MM-DD), sin problemas de zona horaria
export function sumarDias(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const f = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
}
export const plazoMaximo = (d) => sumarDias(d.fechaEvento, PLAZO_DIAS);
export const fueraDePlazo = (d) => !!(d.fechaEvento && d.fechaInvestigacion && d.fechaInvestigacion > plazoMaximo(d));

export function escribirInvestigacionEnHoja(ws, d, celdas = CELDAS_INVESTIGACION) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "nInvestigacion", "nReporte", "tipoEvento", "trabajadorNombre", "documento", "cargo", "descripcion", "causaRaiz", "lecciones", "socializo", "verificacion"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaEvento, fechaDDMMYYYY(d.fechaEvento));
  poner(ws, C.fechaInvestigacion, fechaDDMMYYYY(d.fechaInvestigacion));
  poner(ws, C.plazo, fechaDDMMYYYY(plazoMaximo(d)));                       // el plazo se calcula solo a partir de la fecha del evento
  poner(ws, C.fechaSocializacion, fechaDDMMYYYY(d.fechaSocializacion));
  const dias = texto(d.incapacidad).replace(",", ".");
  poner(ws, C.incapacidad, dias !== "" && !isNaN(Number(dias)) ? Number(dias) : d.incapacidad);
  const abiertas = d.accionesAbiertas !== undefined && d.accionesAbiertas !== "" ? d.accionesAbiertas : planConDatos(d).filter((p) => p.estado !== "Cerrada").length;
  poner(ws, C.accionesAbiertas, abiertas === "" ? "" : Number(abiertas));
  const O = C.opciones || {};
  const noMarcadas = [
    ...marcarOpciones(ws, O.actos, arr(d.actos), d.otros || {}),
    ...marcarOpciones(ws, O.condiciones, arr(d.condiciones), d.otros || {}),
    ...marcarOpciones(ws, O.personales, arr(d.personales), d.otros || {}),
    ...marcarOpciones(ws, O.trabajo, arr(d.trabajo), d.otros || {}),
  ];
  const T = C.tablas || {};
  escribirTabla(ws, T.equipo, equipoConDatos(d).map((m) => ({ nombre: m.nombre, rol: m.rol, documento: m.documento })));
  escribirTabla(ws, T.secuencia, secuenciaConDatos(d).map((h) => ({ hora: h.hora, hecho: h.hecho })));
  escribirTabla(ws, T.porques, PREGUNTAS_PORQUES.map((_, i) => ({ respuesta: arr(d.porques)[i] || "" })));
  escribirTabla(ws, T.plan, planConDatos(d).map((p) => ({ accion: p.accion, control: p.control, responsable: textoResponsable(p.responsable, p.responsableCargo), fecha: fechaDDMMYYYY(p.fecha), estado: p.estado })));
  if (T.porques) saltoDePagina(ws, T.porques.fila0 + T.porques.n - 1 + 1);   // la hoja 2 empieza en "5. Causas" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.aprobo) { poner(ws, F.aprobo.nombre, d.aproboNombre); poner(ws, F.aprobo.cargo, d.aproboCargo); }
  return noMarcadas;
}

export function validarInvestigacion(d) {
  const faltan = [];
  if (!d.fechaInvestigacion) faltan.push("la fecha de investigación");
  if (!d.fechaEvento) faltan.push("la fecha del evento");
  if (!d.tipoEvento) faltan.push("el tipo de evento");
  if (!equipoConDatos(d).length) faltan.push("al menos una persona del equipo investigador");
  else if (equipoConDatos(d).some((m) => !texto(m.nombre))) faltan.push("el nombre de cada integrante del equipo");
  if (!texto(d.descripcion)) faltan.push("la descripción del evento");
  if (!texto(d.causaRaiz)) faltan.push("la causa raíz");
  if (!causasMarcadas(d)) faltan.push("marcar al menos una causa (inmediata o básica)");
  const plan = planConDatos(d);
  if (!plan.length) faltan.push("al menos una acción en el plan de acción");
  else if (plan.some((p) => !texto(p.accion) || !texto(p.responsable) || !p.fecha)) faltan.push("la acción, el responsable y la fecha de cada fila del plan");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora la investigación");
  return faltan;
}

// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarInvestigacion().
export function camposFaltantesInvestigacion(d) {
  const f = [];
  if (!d.fechaInvestigacion) f.push({ etiqueta: "Fecha de investigación", seccion: "datos" });
  if (!d.fechaEvento) f.push({ etiqueta: "Fecha del evento", seccion: "datos" });
  if (!d.tipoEvento) f.push({ etiqueta: "Tipo de evento", seccion: "datos" });
  const eq = arr(d.equipo);
  if (!equipoConDatos(d).length) f.push({ etiqueta: "Nombre completo", indice: 0, seccion: "equipo" });
  else eq.forEach((m, i) => { if (!miembroVacio(m) && !texto(m.nombre)) f.push({ etiqueta: "Nombre completo", indice: i, seccion: "equipo" }); });
  if (!texto(d.descripcion)) f.push({ etiqueta: "Descripción del evento", seccion: "descripcion" });
  if (!texto(d.causaRaiz)) f.push({ etiqueta: "Causa raíz identificada", seccion: "porques" });
  if (!causasMarcadas(d)) { f.push({ etiqueta: "Actos subestándar", seccion: "causas" }); f.push({ etiqueta: "Condiciones subestándar", seccion: "causas" }); }
  const plan = arr(d.plan);
  if (!planConDatos(d).length) f.push({ etiqueta: "Acción", indice: 0, seccion: "plan" });
  else plan.forEach((p, i) => {
    if (planVacio(p)) return;
    if (!texto(p.accion)) f.push({ etiqueta: "Acción", indice: i, seccion: "plan" });
    if (!texto(p.responsable)) f.push({ etiqueta: "Responsable", indice: i, seccion: "plan" });
    if (!p.fecha) f.push({ etiqueta: "Fecha compromiso", indice: i, seccion: "plan" });
  });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: alimenta Acciones Correctivas (trae el plan de acción abierto)
export function resumenInvestigacion(d) {
  const plan = planConDatos(d).map((p) => ({ accion: p.accion, control: p.control, responsable: p.responsable, responsableCargo: p.responsableCargo || "", fecha: p.fecha || "", estado: p.estado || "Abierta" }));
  return { id: `${d.fechaInvestigacion || "sin-fecha"}_${d.nInvestigacion || ""}`, formato: "investigacion", nInvestigacion: d.nInvestigacion || "", nReporte: d.nReporte || "", fechaEvento: d.fechaEvento || "",
    fechaInvestigacion: d.fechaInvestigacion || "", proyecto: d.proyecto || "", tipoEvento: d.tipoEvento || "", causaRaiz: d.causaRaiz || "", plan, accionesAbiertas: plan.filter((p) => p.estado !== "Cerrada").length };
}
