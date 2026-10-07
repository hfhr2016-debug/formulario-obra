// Reporte de actos y condiciones inseguras (RYR-SS-011): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_ACTOS = "RYR-SS-011";
export const HOJA_ACTOS = "Actos y Condiciones";
export const ACTOS_INSEGUROS = ["No usar o usar mal los EPP", "Omitir procedimientos o permisos", "Trabajar sin ATS o sin autorización", "Usar herramientas o equipos inadecuados", "Trabajar en alturas sin protección", "Bloquear salidas o rutas de evacuación", "Cargas o posturas inadecuadas", "Distracción o uso del celular", "Bromas o juegos en el área de trabajo", "Trabajar bajo alcohol o sustancias", "Manejo inseguro de vehículos", "Otro acto: ____________"];
export const CONDICIONES_INSEGURAS = ["Desorden o falta de aseo", "Herramienta o equipo defectuoso", "Falta de señalización o demarcación", "Falta de guardas o protecciones", "Instalación eléctrica deficiente", "Andamio, escalera o plataforma en mal estado", "Iluminación o ventilación insuficiente", "Piso irregular, húmedo o con huecos", "Material mal almacenado", "Fugas o derrames", "Falta de extintor o de botiquín", "Otra condición: ____________"];
export const PROBABILIDADES = ["Baja", "Media", "Alta"];
export const SEVERIDADES = ["Leve", "Grave", "Mortal"];
export const CORREGIDO = ["Sí", "No", "En proceso"];
export const TIPOS_REPORTE = ["Acto inseguro", "Condición insegura", "Ambos"];

export const SPEC_ACTOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha del hallazgo", "A", "C"],
    ["hora", "Hora", "D", "E"],
    ["nReporte", "N° de reporte", "F", "G"],
    ["tipoReporte", "Tipo de reporte", "H", "J"],
    ["lugar", "Lugar exacto del hallazgo", "A", "C"],
    ["reportaNombre", "Quién reporta", "A", "C"],
    ["reportaCargo", "Cargo / oficio", "H", "J"],
    ["observado", "¿Qué se observó?", "A", "C"],
    ["consecuencia", "Posible consecuencia", "A", "C"],
    ["involucrados", "Persona(s) involucrada(s) (opcional)", "A", "C"],
    ["probabilidad", "Probabilidad", "A", "C"],
    ["severidad", "Severidad", "E", "G"],
    ["nivel", "Nivel de riesgo", "I", "K"],
    ["accionInmediata", "Acción inmediata tomada", "A", "C"],
    ["recomendacion", "Recomendación o acción correctiva propuesta", "A", "C"],
    ["responsableCorreccion", "Responsable de la corrección", "A", "C"],
    ["fechaCompromiso", "Fecha compromiso", "H", "J"],
    ["corregido", "¿Quedó corregido?", "A", "C"],
    ["fechaCierre", "Fecha de cierre", "E", "G"],
    ["verifico", "Verificó el cierre", "I", "K"],
    ["obsCierre", "Observaciones del cierre", "A", "C"],
  ],
  opciones: [
    { clave: "actos", desde: "Actos inseguros", hasta: "Condiciones inseguras" },
    { clave: "condiciones", desde: "Condiciones inseguras", hasta: "3. DESCRIPCIÓN" },
  ],
  fotos: [{ clave: "fotos", desde: "5. EVIDENCIA", hasta: "6. SEGUIMIENTO" }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "reporta", col: "C" }, { clave: "recibe", col: "G" }, { clave: "verifica", col: "K" }] },
};

export const CELDAS_ACTOS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","hora":"E13","nReporte":"G13","tipoReporte":"J13","lugar":"C14","reportaNombre":"C15","reportaCargo":"J15","observado":"C26","consecuencia":"C27","involucrados":"C28","probabilidad":"C29","severidad":"G29","nivel":"K29","accionInmediata":"C31","recomendacion":"C32","responsableCorreccion":"C33","fechaCompromiso":"J33","corregido":"C53","fechaCierre":"G53","verifico":"K53","obsCierre":"C54","opciones":{"actos":[{"ref":"A18","texto":"No usar o usar mal los EPP"},{"ref":"D18","texto":"Omitir procedimientos o permisos"},{"ref":"G18","texto":"Trabajar sin ATS o sin autorización"},{"ref":"J18","texto":"Usar herramientas o equipos inadecuados"},{"ref":"A19","texto":"Trabajar en alturas sin protección"},{"ref":"D19","texto":"Bloquear salidas o rutas de evacuación"},{"ref":"G19","texto":"Cargas o posturas inadecuadas"},{"ref":"J19","texto":"Distracción o uso del celular"},{"ref":"A20","texto":"Bromas o juegos en el área de trabajo"},{"ref":"D20","texto":"Trabajar bajo alcohol o sustancias"},{"ref":"G20","texto":"Manejo inseguro de vehículos"},{"ref":"J20","texto":"Otro acto: ____________"}],"condiciones":[{"ref":"A22","texto":"Desorden o falta de aseo"},{"ref":"D22","texto":"Herramienta o equipo defectuoso"},{"ref":"G22","texto":"Falta de señalización o demarcación"},{"ref":"J22","texto":"Falta de guardas o protecciones"},{"ref":"A23","texto":"Instalación eléctrica deficiente"},{"ref":"D23","texto":"Andamio, escalera o plataforma en mal estado"},{"ref":"G23","texto":"Iluminación o ventilación insuficiente"},{"ref":"J23","texto":"Piso irregular, húmedo o con huecos"},{"ref":"A24","texto":"Material mal almacenado"},{"ref":"D24","texto":"Fugas o derrames"},{"ref":"G24","texto":"Falta de extintor o de botiquín"},{"ref":"J24","texto":"Otra condición: ____________"}]},"fotos":{"fotos":[{"tl":{"col":0,"row":34},"br":{"col":6,"row":50},"aspecto":1.657},{"tl":{"col":6,"row":34},"br":{"col":12,"row":50},"aspecto":1.542}]},"firmas":{"reporta":{"nombre":"C58","cargo":"C59"},"recibe":{"nombre":"G58","cargo":"G59"},"verifica":{"nombre":"K58","cargo":"K59"}}};

export const descubrirActos = (ws) => descubrirPorEtiquetas(ws, SPEC_ACTOS);

// ---------- Lógica del reporte ----------
const arr = (a) => (Array.isArray(a) ? a : []);
const nPS = (lista, v) => { const i = lista.indexOf(v); return i < 0 ? null : i + 1; };

// Nivel = probabilidad × severidad (1 a 3 cada una): 1-2 Bajo · 3-4 Medio · 6-9 Alto
export function nivelDeRiesgo(prob, sev) {
  const p = nPS(PROBABILIDADES, prob); const s = nPS(SEVERIDADES, sev);
  if (p === null || s === null) return "";
  const v = p * s;
  return v >= 6 ? "Alto" : v >= 3 ? "Medio" : "Bajo";
}
// El tipo de reporte sale de lo marcado: solo actos, solo condiciones o ambos
export function tipoDeReporte(d) {
  const a = arr(d.actos).length > 0; const c = arr(d.condiciones).length > 0;
  return a && c ? "Ambos" : a ? "Acto inseguro" : c ? "Condición insegura" : "";
}

export function escribirActosEnHoja(ws, d, celdas = CELDAS_ACTOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "hora", "nReporte", "lugar", "reportaNombre", "reportaCargo", "observado", "consecuencia", "involucrados",
    "probabilidad", "severidad", "accionInmediata", "recomendacion", "responsableCorreccion", "corregido", "verifico", "obsCierre"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.fechaCompromiso, fechaDDMMYYYY(d.fechaCompromiso));
  poner(ws, C.fechaCierre, fechaDDMMYYYY(d.fechaCierre));
  poner(ws, C.tipoReporte, d.tipoReporte || tipoDeReporte(d));
  poner(ws, C.nivel, d.nivel || nivelDeRiesgo(d.probabilidad, d.severidad));
  const O = C.opciones || {};
  const noMarcadas = [
    ...marcarOpciones(ws, O.actos, arr(d.actos), d.otros || {}),
    ...marcarOpciones(ws, O.condiciones, arr(d.condiciones), d.otros || {}),
  ];
  const F = C.firmas || {};
  // Quien reporta firma con su nombre; recibe y verifica solo si se escribieron
  if (F.reporta) { poner(ws, F.reporta.nombre, d.reportaNombre); poner(ws, F.reporta.cargo, d.reportaCargo); }
  if (F.recibe) { poner(ws, F.recibe.nombre, d.recibeNombre); poner(ws, F.recibe.cargo, d.recibeCargo); }
  if (F.verifica) { poner(ws, F.verifica.nombre, d.verificaNombre || d.verifico); poner(ws, F.verifica.cargo, d.verificaCargo); }
  return noMarcadas;
}

export function validarActos(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha del hallazgo");
  if (!arr(d.actos).length && !arr(d.condiciones).length) faltan.push("marcar al menos un acto o una condición insegura");
  if (!d.lugar || !d.lugar.trim()) faltan.push("el lugar exacto del hallazgo");
  if (!d.observado || !d.observado.trim()) faltan.push("qué se observó");
  if (!d.reportaNombre || !d.reportaNombre.trim()) faltan.push("quién reporta");
  return faltan;
}

export function resumenActos(d) {
  const nivel = d.nivel || nivelDeRiesgo(d.probabilidad, d.severidad);
  return {
    id: `${d.fecha || "sin-fecha"}_${d.nReporte || ""}`, formato: "acto-condicion", fecha: d.fecha || "", proyecto: d.proyecto || "", nReporte: d.nReporte || "",
    tipo: d.tipoReporte || tipoDeReporte(d), nivel, lugar: d.lugar || "", observado: d.observado || "", marcados: [...arr(d.actos), ...arr(d.condiciones)],
    recomendacion: d.recomendacion || "", accionInmediata: d.accionInmediata || "",
    corregido: d.corregido || "", responsable: d.responsableCorreccion || "", fechaCompromiso: d.fechaCompromiso || "", fechaCierre: d.fechaCierre || "",
  };
}


// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarActos().
export function camposFaltantesActos(d) {
  const f = [];
  if (!d.fecha) f.push({ etiqueta: "Fecha del hallazgo", seccion: "datos" });
  if (!arr(d.actos).length && !arr(d.condiciones).length) { f.push({ etiqueta: "Actos inseguros", seccion: "clasificacion" }); f.push({ etiqueta: "Condiciones inseguras", seccion: "clasificacion" }); }
  if (!d.lugar || !d.lugar.trim()) f.push({ etiqueta: "Lugar exacto del hallazgo", seccion: "datos" });
  if (!d.observado || !d.observado.trim()) f.push({ etiqueta: "¿Qué se observó?", seccion: "descripcion" });
  if (!d.reportaNombre || !d.reportaNombre.trim()) f.push({ etiqueta: "Nombre de quien reporta", seccion: "datos" });
  return f;
}
