// Lista de Asistencia (RYR-SS-003): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, textoDuracion, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_LISTA = "RYR-SS-003";
export const TIPOS_ACTIVIDAD = ["Capacitación", "Inducción", "Reinducción", "Charla de seguridad", "Reunión COPASST / Vigía", "Reunión de seguimiento", "Simulacro", "Entrenamiento", "Otra"];
export const MODALIDADES = ["Presencial", "Virtual", "Mixta"];
export const SI_NO = ["Sí", "No"];
export const META_APROBACION_POR_DEFECTO = 80;

// Temas frecuentes de capacitación en obra (se suman los que el usuario escriba y se recuerdan en el dispositivo)
export const TEMAS_LISTA = [
  "Trabajo seguro en alturas", "Primeros auxilios", "Uso, cuidado y reposición de EPP", "Prevención de riesgo eléctrico", "Manejo de extintores y control de incendios",
  "Plan de emergencias y evacuación", "Orden y aseo", "Manejo seguro de herramientas manuales", "Prevención de caídas", "Espacios confinados", "Trabajo en caliente",
  "Manejo seguro de sustancias químicas", "Pausas activas y riesgo biomecánico", "Prevención del consumo de alcohol y sustancias psicoactivas",
  "Reporte de actos y condiciones inseguras", "Investigación de incidentes y accidentes", "Seguridad vial", "Manejo de residuos", "Política y objetivos del SG-SST",
  "Funciones del COPASST o Vigía SST", "Comité de Convivencia Laboral", "Hábitos de vida saludable", "Izaje de cargas", "Excavaciones y zanjas", "Armado y uso de andamios",
  "Manejo de maquinaria pesada", "Riesgo público", "Ergonomía", "Inducción en SST", "Reinducción en SST", "Simulacro de evacuación",
];

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…]
export const SPEC_LISTA = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["tipo", "Tipo de actividad", "A", "C"],
    ["modalidad", "Modalidad", "H", "J"],
    ["tema", "Tema / asunto", "A", "C"],
    ["fecha", "Fecha", "A", "C"],
    ["horaInicio", "Hora inicio", "D", "E"],
    ["horaFin", "Hora fin", "F", "G"],
    ["duracion", "Duración", "H", "I"],
    ["hoja", "Hoja N°", "J", "K"],
    ["lugar", "Lugar / sitio", "A", "C"],
    ["entidad", "Entidad que dicta (si es externa)", "H", "J"],
    ["facilitadorNombre", "Facilitador / conferencista", "A", "C"],
    ["facilitadorCargo", "Cargo", "H", "J", "facilitadorNombre"],
    ["contenido", "Objetivo y temas tratados", "A", "C"],
    ["convocados", "Personas convocadas", "E", "H"],
    ["seEvaluo", "¿Se evaluó?", "A", "C"],
    ["evaluados", "Personas evaluadas", "D", "E"],
    ["aprobaron", "Personas que aprobaron", "F", "G"],
    ["meta", "Meta de aprobación", "J", "K"],
    ["observaciones", "Observaciones y compromisos", "A", "C"],
  ],
  tabla: { clave: "asistentes", cabecera: "No.", fin: "Total de asistentes", columnas: { nombre: "B", documento: "E", cargo: "G", empresa: "I" } },
  firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "facilitador", col: "C" }, { clave: "responsable", col: "I" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_LISTA = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","tipo":"C13","modalidad":"J13","tema":"C14","fecha":"C15","horaInicio":"E15","horaFin":"G15","duracion":"I15","hoja":"K15","lugar":"C16","entidad":"J16","facilitadorNombre":"C17","facilitadorCargo":"J17","contenido":"C19","convocados":"H49","seEvaluo":"C51","evaluados":"E51","aprobaron":"G51","meta":"K51","observaciones":"C52","tablas":{"asistentes":{"fila0":24,"n":25,"columnas":{"nombre":"B","documento":"E","cargo":"G","empresa":"I"}}},"firmas":{"facilitador":{"nombre":"C56","cargo":"C57"},"responsable":{"nombre":"I56","cargo":"I57"}}};

export const descubrirLista = (ws) => descubrirPorEtiquetas(ws, SPEC_LISTA);

// Escribe TODOS los datos en la hoja. Solo escribe en esquinas de celdas combinadas.
export function escribirListaEnHoja(ws, d, celdas = CELDAS_LISTA) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "tipo", "modalidad", "tema", "horaInicio", "horaFin", "hoja", "lugar", "entidad",
    "facilitadorNombre", "facilitadorCargo", "contenido", "seEvaluo", "observaciones"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.duracion, textoDuracion(d.horaInicio, d.horaFin));
  const numero = (k) => (d[k] !== "" && d[k] !== undefined && d[k] !== null && !isNaN(Number(d[k])) ? Number(d[k]) : null);
  if (numero("convocados") !== null) poner(ws, C.convocados, numero("convocados"));
  if (d.seEvaluo === "Sí") {          // los datos de evaluación solo se escriben si realmente se evaluó
    for (const k of ["evaluados", "aprobaron"]) if (numero(k) !== null) poner(ws, C[k], numero(k));
    if (numero("meta") !== null) poner(ws, C.meta, numero("meta") / 100);
  }
  escribirTabla(ws, C.tablas && C.tablas.asistentes, d.asistentes);
  const F = C.firmas || {};
  if (F.facilitador) { poner(ws, F.facilitador.nombre, d.facilitadorNombre); poner(ws, F.facilitador.cargo, d.facilitadorCargo); }
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsableNombre); poner(ws, F.responsable.cargo, d.responsableCargo); }
}

export function validarLista(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.tipo) faltan.push("el tipo de actividad");
  if (!d.tema || !d.tema.trim()) faltan.push("el tema o asunto");
  if (!d.facilitadorNombre || !d.facilitadorNombre.trim()) faltan.push("el facilitador");
  if (!(d.asistentes || []).some((a) => a.nombre && a.nombre.trim())) faltan.push("al menos un asistente");
  if (d.seEvaluo === "Sí" && Number(d.aprobaron) > Number(d.evaluados)) faltan.push("que las personas aprobadas no superen a las evaluadas");
  return faltan;
}

// Resumen del evento que se guarda en el dispositivo (lo usará la Matriz de Capacitación)
export function resumenEvento(d, nAsistentes) {
  return {
    id: `${d.fecha || "sin-fecha"}_${(d.tema || "").slice(0, 30)}`, formato: "lista-asistencia", fecha: d.fecha, tipo: d.tipo, tema: d.tema,
    proyecto: d.proyecto, facilitador: d.facilitadorNombre, entidad: d.entidad, horaInicio: d.horaInicio, horaFin: d.horaFin,
    convocados: Number(d.convocados) || 0, asistentes: nAsistentes, seEvaluo: d.seEvaluo, evaluados: Number(d.evaluados) || 0, aprobaron: Number(d.aprobaron) || 0,
  };
}
