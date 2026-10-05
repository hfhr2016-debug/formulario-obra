// Inducción en SST para personal nuevo (RYR-SS-004): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, textoDuracion, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_INDUCCION = "RYR-SS-004";
export const VINCULACIONES = ["Contrato directo", "Contratista", "Subcontratista", "Independiente"];
export const APTITUDES = ["Apto", "Apto con restricciones", "No apto"];
export const GRUPOS_RH = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
export const PRESENTO = ["Sí", "No", "N/A"];
export const SI_NO = ["Sí", "No"];
export const NOTA_MINIMA_POR_DEFECTO = 80;

// Los mismos textos que trae la plantilla (la app solo escribe las marcas; los textos ya están en el Excel)
export const DOCUMENTOS_INGRESO = [
  "Documento de identidad", "Afiliación a EPS", "Afiliación a ARL (con fecha de afiliación)", "Afiliación a fondo de pensiones",
  "Examen médico ocupacional de ingreso (concepto de aptitud)", "Certificado de trabajo seguro en alturas (si aplica)",
  "Certificado de espacios confinados (si aplica)", "Licencia de conducción o certificado de operador (si aplica)",
  "Curso de primeros auxilios o brigadista (si aplica)", "Otros certificados de competencia (soldadura, izaje, eléctricos…)",
];
export const TEMAS_INDUCCION = [
  "Política y objetivos del SG-SST; reglamento de higiene y seguridad", "Derechos y deberes del trabajador y del empleador en SST",
  "Peligros y riesgos de la obra y de su labor (matriz de peligros)", "Controles: procedimientos, permisos de trabajo y análisis de trabajo seguro (ATS)",
  "Elementos de protección personal: uso, entrega, cuidado y reposición", "Trabajo en alturas, espacios confinados y trabajo en caliente (si aplica)",
  "Manejo seguro de herramientas, equipos y maquinaria", "Orden y aseo; señalización y demarcación de áreas",
  "Plan de emergencias: rutas de evacuación, puntos de encuentro y brigadas", "Primeros auxilios; ubicación del botiquín y de los extintores",
  "Reporte de actos y condiciones inseguras, incidentes y accidentes de trabajo", "Prevención del consumo de alcohol, tabaco y sustancias psicoactivas",
  "Manejo ambiental: residuos, orden y uso responsable de los recursos", "COPASST o Vigía SST y Comité de Convivencia Laboral",
  "Pausas activas, autocuidado y hábitos saludables",
];

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…, filas debajo]
export const SPEC_INDUCCION = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha de la inducción", "A", "C"],
    ["horaInicio", "Hora inicio", "D", "E"],
    ["horaFin", "Hora fin", "F", "G"],
    ["duracion", "Duración", "H", "I"],
    ["nInduccion", "N° de inducción", "J", "K"],
    ["inductorNombre", "Inductor / facilitador", "A", "C"],
    ["inductorCargo", "Cargo", "H", "J", "inductorNombre"],
    ["nombre", "Nombre completo", "A", "C"],
    ["documento", "Documento de identidad", "H", "J"],
    ["cargo", "Cargo / oficio", "A", "C"],
    ["empresa", "Empresa / contratista", "H", "J"],
    ["fechaIngreso", "Fecha de ingreso a la obra", "A", "C"],
    ["vinculacion", "Tipo de vinculación", "E", "G"],
    ["rh", "Grupo sanguíneo (RH)", "I", "K"],
    ["eps", "EPS", "A", "C"],
    ["arl", "ARL", "E", "G"],
    ["afp", "Fondo de pensiones (AFP)", "I", "K"],
    ["examenFecha", "Examen médico de ingreso", "A", "C"],
    ["aptitud", "Concepto de aptitud", "E", "G"],
    ["restricciones", "Restricciones (si las hay)", "I", "K"],
    ["contactoNombre", "Contacto de emergencia", "A", "C"],
    ["parentesco", "Parentesco", "H", "I"],
    ["telefono", "Teléfono", "K", "L"],
    ["calificacion", "Calificación (0 a 100)", "A", "C"],
    ["notaMinima", "Nota mínima", "D", "E"],
    ["reinduccion", "Reinducción prevista", "I", "K"],
  ],
  tablas: [
    { clave: "documentos", cabecera: "No.", fin: "4. TEMAS DE LA INDUCCIÓN", columnas: { presento: "G", vigencia: "I", observacion: "K" } },
    { clave: "temas", cabecera: "No.", despuesDe: "documentos", fin: "5. EVALUACIÓN DE COMPRENSIÓN", columnas: { impartido: "I", observacion: "K" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "trabajador", col: "C" }, { clave: "inductor", col: "G" }, { clave: "responsable", col: "K" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_INDUCCION = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","horaInicio":"E13","horaFin":"G13","duracion":"I13","nInduccion":"K13","inductorNombre":"C14","inductorCargo":"J14","nombre":"C16","documento":"J16","cargo":"C17","empresa":"J17","fechaIngreso":"C18","vinculacion":"G18","rh":"K18","eps":"C19","arl":"G19","afp":"K19","examenFecha":"C20","aptitud":"G20","restricciones":"K20","contactoNombre":"C21","parentesco":"I21","telefono":"L21","calificacion":"C52","notaMinima":"E52","reinduccion":"K52","tablas":{"documentos":{"fila0":24,"n":10,"columnas":{"presento":"G","vigencia":"I","observacion":"K"}},"temas":{"fila0":36,"n":15,"columnas":{"impartido":"I","observacion":"K"}}},"firmas":{"trabajador":{"nombre":"C59","cargo":"C60"},"inductor":{"nombre":"G59","cargo":"G60"},"responsable":{"nombre":"K59","cargo":"K60"}}};

export const descubrirInduccion = (ws) => descubrirPorEtiquetas(ws, SPEC_INDUCCION);

const esFechaISO = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || ""));
const numero = (v) => (v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : null);

// Resultado de la evaluación: "" (sin nota), "Aprobó" o "Requiere refuerzo"
export function resultadoInduccion(d) {
  const nota = numero(d.calificacion);
  if (nota === null) return "";
  const minima = numero(d.notaMinima) === null ? NOTA_MINIMA_POR_DEFECTO : numero(d.notaMinima);
  return nota >= minima ? "Aprobó" : "Requiere refuerzo";
}

export function escribirInduccionEnHoja(ws, d, celdas = CELDAS_INDUCCION) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "horaInicio", "horaFin", "nInduccion", "inductorNombre", "inductorCargo", "nombre", "documento", "cargo", "empresa",
    "vinculacion", "rh", "eps", "arl", "afp", "aptitud", "restricciones", "contactoNombre", "parentesco", "telefono"]) poner(ws, C[k], d[k]);
  for (const k of ["fecha", "fechaIngreso", "examenFecha", "reinduccion"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  poner(ws, C.duracion, textoDuracion(d.horaInicio, d.horaFin));
  if (numero(d.calificacion) !== null) {
    poner(ws, C.calificacion, numero(d.calificacion));
    if (numero(d.notaMinima) !== null) poner(ws, C.notaMinima, numero(d.notaMinima));
  }
  const T = C.tablas || {};
  escribirTabla(ws, T.documentos, (d.documentos || []).map((x) => ({ ...x, vigencia: esFechaISO(x.vigencia) ? fechaDDMMYYYY(x.vigencia) : x.vigencia })));
  escribirTabla(ws, T.temas, d.temas);
  const F = C.firmas || {};
  if (F.trabajador) { poner(ws, F.trabajador.nombre, d.nombre); poner(ws, F.trabajador.cargo, d.documento); }   // en esta firma la 3.ª fila es "Documento:"
  if (F.inductor) { poner(ws, F.inductor.nombre, d.inductorNombre); poner(ws, F.inductor.cargo, d.inductorCargo); }
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsableNombre); poner(ws, F.responsable.cargo, d.responsableCargo); }
}

export function validarInduccion(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha de la inducción");
  if (!d.inductorNombre || !d.inductorNombre.trim()) faltan.push("el inductor");
  if (!d.nombre || !d.nombre.trim()) faltan.push("el nombre del trabajador");
  if (!d.documento || !String(d.documento).trim()) faltan.push("el documento del trabajador");
  if (!d.cargo || !d.cargo.trim()) faltan.push("el cargo del trabajador");
  const nota = numero(d.calificacion);
  if (d.calificacion !== "" && (nota === null || nota < 0 || nota > 100)) faltan.push("una calificación entre 0 y 100");
  return faltan;
}

// Resumen que se guarda en el dispositivo (para los informes y el Registro de Personal)
export function resumenInduccion(d) {
  return {
    id: `${d.fecha || "sin-fecha"}_${d.documento || d.nombre}`, formato: "induccion", fecha: d.fecha, nombre: d.nombre, documento: d.documento, cargo: d.cargo, empresa: d.empresa,
    proyecto: d.proyecto, inductor: d.inductorNombre, nota: numero(d.calificacion), resultado: resultadoInduccion(d),
    temasImpartidos: (d.temas || []).filter((t) => t.impartido === "Sí").length,
  };
}
