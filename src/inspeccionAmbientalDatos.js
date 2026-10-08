// Inspección Ambiental de Obra (RYR-AM-007). Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { hallazgosConDatos, contarRespuestas, validarListaYHallazgos, faltantesListaYHallazgos } from "./ambBase";

export const CODIGO_INSPECCION_AMB = "RYR-AM-007";
export const HOJA_INSPECCION_AMB = "Inspección Ambiental";
export const TIPOS_INSPECCION = ["Rutina semanal", "Previa a lluvias", "Por queja", "Por hallazgo anterior", "Visita de la autoridad", "Otra"];
export const CLIMAS_INSP = ["Seco", "Lluvia leve", "Lluvia fuerte", "Viento fuerte"];
// Los 24 puntos vienen escritos en la plantilla, en este orden (aspecto, condición a verificar)
export const PUNTOS_INSPECCION = [
  ["Residuos", "Puntos ecológicos y canecas rotulados, con tapa y sin desbordar"], ["Residuos", "Residuos separados por tipo (aprovechables, ordinarios y peligrosos)"],
  ["Residuos", "Escombros acopiados en el sitio autorizado, sin invadir el espacio público"], ["Residuos", "Residuos peligrosos en zona rotulada, techada y con contención"],
  ["Residuos", "Certificados y manifiestos de entrega al día"], ["Agua", "Trampas de grasas y sedimentadores en funcionamiento"],
  ["Agua", "Sin vertimientos de concreto, pinturas o solventes"], ["Agua", "Uso del agua sin desperdicio ni fugas"],
  ["Aire y ruido", "Vías y zonas de movimiento de tierras humedecidas"], ["Aire y ruido", "Volquetas y acopios cubiertos"],
  ["Aire y ruido", "Actividades ruidosas dentro del horario permitido"], ["Aire y ruido", "Maquinaria sin humo visible"],
  ["Suelo y sustancias", "Combustibles y químicos con contención y hojas de seguridad"], ["Suelo y sustancias", "Kit antiderrames disponible y completo"],
  ["Suelo y sustancias", "Sin manchas de aceite o combustible en el suelo"], ["Suelo y sustancias", "Mantenimiento de maquinaria sobre piso protegido"],
  ["Flora y fauna", "Árboles y zonas verdes protegidos o con permiso vigente"], ["Flora y fauna", "Sin captura ni afectación de fauna silvestre"],
  ["Comunidad y entorno", "Cerramiento y señalización en buen estado"], ["Comunidad y entorno", "Vías y andenes públicos limpios (barrido)"],
  ["Comunidad y entorno", "Sin quejas de la comunidad abiertas sin atender"], ["Comunidad y entorno", "Valla informativa de la obra con datos ambientales"],
  ["Gestión y documentos", "Registros ambientales al día (residuos, consumos y manifiestos)"], ["Gestión y documentos", "Permisos y autorizaciones ambientales vigentes en obra"],
];
export const ITEMS_INSPECCION_AMB = PUNTOS_INSPECCION.map((p) => p[1]);

export const SPEC_INSPECCION_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["hora", "Hora", "E", "G"], ["nInspeccion", "Inspección N°", "I", "K"],
    ["inspector", "Inspector", "A", "C"], ["frente", "Frente o zona", "H", "J"],
    ["tipo", "Tipo de inspección", "A", "C"], ["clima", "Condición del clima", "E", "G"], ["acompano", "Acompañó", "I", "K"],
    ["obsGenerales", "4. OBSERVACIONES GENERALES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "lista", cabecera: "No.", fin: "3. HALLAZGOS Y ACCIONES", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
    { clave: "hallazgos", cabecera: "No.", despuesDe: "lista", fin: "4. OBSERVACIONES GENERALES", finEmpieza: true, columnas: { hallazgo: "B", accion: "G", responsable: "J", fechaLimite: "L" },
      encabezados: { hallazgo: "Hallazgo", accion: "Acción a tomar", responsable: "Responsable", fechaLimite: "Fecha límite" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "inspecciono", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_INSPECCION_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","hora":"G13","nInspeccion":"K13","inspector":"C14","frente":"J14","tipo":"C15","clima":"G15","acompano":"K15","obsGenerales":"A51","tablas":{"lista":{"fila0":18,"n":24,"filas":[18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41],"columnas":{"marca":"I","obs":"K"}},"hallazgos":{"fila0":44,"n":6,"columnas":{"hallazgo":"B","accion":"G","responsable":"J","fechaLimite":"L"}}},"firmas":{"inspecciono":{"nombre":"C55","cargo":"C56"},"reviso":{"nombre":"I55","cargo":"I56"}}};
export const descubrirInspeccionAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_INSPECCION_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const inspeccionAmbInicial = () => ({});

export function escribirInspeccionAmbEnHoja(ws, d, celdas = CELDAS_INSPECCION_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "hora", "nInspeccion", "inspector", "frente", "tipo", "clima", "acompano", "obsGenerales"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const T = C.tablas || {};
  escribirTabla(ws, T.lista, ITEMS_INSPECCION_AMB.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observaciones)[i] || "" })));
  escribirTabla(ws, T.hallazgos, hallazgosConDatos(d.hallazgos).map((h) => ({ ...h, fechaLimite: fechaDDMMYYYY(h.fechaLimite) })));
  if (T.lista && T.lista.filas) saltoDePagina(ws, T.lista.filas[T.lista.filas.length - 1]);   // los hallazgos y las firmas van en la hoja 2
  const F = C.firmas || {};
  if (F.inspecciono) { poner(ws, F.inspecciono.nombre, d.inspector); poner(ws, F.inspecciono.cargo, d.inspectorCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarInspeccionAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.inspector)) f.push("el inspector");
  f.push(...validarListaYHallazgos(ITEMS_INSPECCION_AMB, d.respuestas, d.hallazgos));
  return f;
}
export function camposFaltantesInspeccionAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.inspector)) f.push({ etiqueta: "Nombre del inspector", seccion: "datos" });
  f.push(...faltantesListaYHallazgos(ITEMS_INSPECCION_AMB, d.respuestas, d.hallazgos, "lista", "hallazgos"));
  return f;
}
export function resumenInspeccionAmb(d) {
  const c = contarRespuestas(ITEMS_INSPECCION_AMB, d.respuestas);
  const porAspecto = {};
  PUNTOS_INSPECCION.forEach(([a], i) => { const r = arr(d.respuestas)[i]; if (!porAspecto[a]) porAspecto[a] = { si: 0, no: 0 }; if (r === "Sí") porAspecto[a].si++; else if (r === "No") porAspecto[a].no++; });
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.nInspeccion)}`, formato: "inspeccion", proyecto: texto(d.proyecto), fecha: d.fecha, nInspeccion: texto(d.nInspeccion), tipo: d.tipo || "",
    cumple: c.si, noCumple: c.no, noAplica: c.na, hallazgos: hallazgosConDatos(d.hallazgos).length, porAspecto,
    detalle: hallazgosConDatos(d.hallazgos).map((h) => ({ hallazgo: h.hallazgo || "", accion: h.accion || "", responsable: h.responsable || "", fechaLimite: h.fechaLimite || "" })),   // lo usa el seguimiento de acciones
    porcentaje: c.si + c.no ? Math.round((c.si / (c.si + c.no)) * 1000) / 10 : null,
  };
}
