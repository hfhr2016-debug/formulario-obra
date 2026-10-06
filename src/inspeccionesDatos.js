// Inspección de seguridad (RYR-SS-010): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, textoDuracion, textoResponsable, saltoDePagina } from "./sstBase";

export const CODIGO_INSPECCION = "RYR-SS-010";
export const HOJA_INSPECCION = "Inspecciones";
export const TIPOS_INSPECCION = ["General de seguridad", "Orden y aseo", "Herramientas y equipos", "Andamios y escaleras", "Extintores y botiquines", "Instalaciones eléctricas", "Maquinaria y vehículos", "Almacenamiento y químicos"];
export const ESTADOS = ["Cumple", "No cumple", "N/A"];
export const NIVELES = ["Alto", "Medio", "Bajo"];
export const ESTADOS_HALLAZGO = ["Abierta", "En proceso", "Cerrada"];

// Aspectos verificados, agrupados como en la plantilla
export const GRUPOS_INSPECCION = [["A. ORDEN Y ASEO", ["Áreas de trabajo y de circulación despejadas", "Materiales apilados y almacenados de forma segura", "Residuos clasificados y recipientes disponibles", "Baños, comedor y campamento en condiciones de higiene"]], ["B. SEÑALIZACIÓN Y DEMARCACIÓN", ["Señalización de seguridad visible y completa", "Áreas de riesgo demarcadas y cerradas", "Rutas de evacuación y puntos de encuentro señalizados"]], ["C. HERRAMIENTAS Y EQUIPOS", ["Herramientas manuales en buen estado y bien almacenadas", "Equipos eléctricos con guardas y cables en buen estado", "Maquinaria con inspección preoperacional al día", "Equipos de izaje y accesorios certificados"]], ["D. INSTALACIONES ELÉCTRICAS", ["Tableros cerrados, rotulados y con protección", "Extensiones y empalmes en buen estado (sin cables pelados)", "Conexión a tierra y protección diferencial"]], ["E. TRABAJO EN ALTURAS", ["Andamios armados, certificados y con tarjeta de inspección", "Escaleras en buen estado y bien utilizadas", "Puntos de anclaje, líneas de vida y arneses inspeccionados"]], ["F. EMERGENCIAS", ["Extintores vigentes, señalizados y accesibles", "Botiquín dotado y camilla disponible", "Directorio de emergencias visible y brigada conformada"]], ["G. PERSONAL Y EPP", ["Personal con EPP completos y en buen estado", "Personal afiliado a seguridad social y con capacitación vigente", "Charla de seguridad realizada y registrada"]]];
// Lista plana (el número de cada aspecto es su posición + 1)
export const ITEMS_INSPECCION = GRUPOS_INSPECCION.flatMap(([grupo, items]) => items.map((texto) => ({ grupo, texto })));

export const SPEC_INSPECCION = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha de la inspección", "A", "C"],
    ["horaInicio", "Hora inicio", "D", "E"],
    ["horaFin", "Hora fin", "F", "G"],
    ["duracion", "Duración", "H", "I"],
    ["nInspeccion", "N° de inspección", "J", "K"],
    ["tipo", "Tipo de inspección", "A", "C"],
    ["area", "Área / frente inspeccionado", "H", "J"],
    ["inspectorNombre", "Inspector", "A", "C"],
    ["inspectorCargo", "Cargo", "H", "J", "inspectorNombre"],
    ["acompanaNombre", "Acompaña (responsable del área)", "A", "C"],
    ["acompanaCargo", "Cargo", "H", "J", "acompanaNombre"],
    ["obsGenerales", "4. OBSERVACIONES GENERALES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "checklist", cabecera: "No.", fin: "3. HALLAZGOS Y ACCIONES", finEmpieza: true, numerada: true, columnas: { cumple: "H", no: "I", na: "J", obs: "K" } },
    { clave: "hallazgos", cabecera: "No.", despuesDe: "checklist", fin: "4. OBSERVACIONES GENERALES", finEmpieza: true, columnas: { hallazgo: "B", nivel: "E", accion: "F", responsable: "I", fecha: "K", estado: "L" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "inspector", col: "C" }, { clave: "responsable", col: "I" }] },
};

export const CELDAS_INSPECCION = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","horaInicio":"E13","horaFin":"G13","duracion":"I13","nInspeccion":"K13","tipo":"C14","area":"J14","inspectorNombre":"C15","inspectorCargo":"J15","acompanaNombre":"C16","acompanaCargo":"J16","obsGenerales":"A64","tablas":{"checklist":{"fila0":20,"n":23,"filas":[20,21,22,23,25,26,27,29,30,31,32,34,35,36,38,39,40,42,43,44,46,47,48],"columnas":{"cumple":"H","no":"I","na":"J","obs":"K"}},"hallazgos":{"fila0":53,"n":10,"columnas":{"hallazgo":"B","nivel":"E","accion":"F","responsable":"I","fecha":"K","estado":"L"}}},"firmas":{"inspector":{"nombre":"C69","cargo":"C70"},"responsable":{"nombre":"I69","cargo":"I70"}}};

export const descubrirInspeccion = (ws) => descubrirPorEtiquetas(ws, SPEC_INSPECCION);

// ---------- Lógica de la inspección ----------
const arr = (a) => (Array.isArray(a) ? a : []);
const MARCA = "✔";

export const conteo = (d) => {
  const r = arr(d.respuestas);
  const c = { cumple: 0, no: 0, na: 0, sin: 0 };
  ITEMS_INSPECCION.forEach((_, i) => {
    const v = r[i];
    if (v === "Cumple") c.cumple++; else if (v === "No cumple") c.no++; else if (v === "N/A") c.na++; else c.sin++;
  });
  return c;
};
// % de cumplimiento = Cumple ÷ (Cumple + No cumple); los N/A no cuentan (igual que la fórmula del Excel)
export function porcentajeCumplimiento(d) {
  const c = conteo(d);
  return c.cumple + c.no === 0 ? null : Math.round((c.cumple / (c.cumple + c.no)) * 100);
}
const hallazgoVacio = (h) => !(h && (h.hallazgo || h.accion || h.responsable || h.responsableCargo || h.fecha));
export const hallazgosConDatos = (d) => arr(d.hallazgos).filter((h) => !hallazgoVacio(h));

export function escribirInspeccionEnHoja(ws, d, celdas = CELDAS_INSPECCION) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "horaInicio", "horaFin", "nInspeccion", "tipo", "area", "inspectorNombre", "inspectorCargo", "acompanaNombre", "acompanaCargo", "obsGenerales"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.duracion, textoDuracion(d.horaInicio, d.horaFin));
  const T = C.tablas || {};
  // Cada aspecto marca UNA casilla (Cumple / No cumple / N/A); los totales y el % los calcula el Excel con sus fórmulas
  escribirTabla(ws, T.checklist, ITEMS_INSPECCION.map((_, i) => {
    const v = arr(d.respuestas)[i];
    return { cumple: v === "Cumple" ? MARCA : "", no: v === "No cumple" ? MARCA : "", na: v === "N/A" ? MARCA : "", obs: arr(d.observaciones)[i] || "" };
  }));
  if (T.hallazgos) saltoDePagina(ws, T.hallazgos.fila0 - 3);   // la hoja 2 empieza en "3. Hallazgos" (la librería pierde el salto de la plantilla)
  escribirTabla(ws, T.hallazgos, hallazgosConDatos(d).map((h) => ({ hallazgo: h.hallazgo, nivel: h.nivel, accion: h.accion, responsable: textoResponsable(h.responsable, h.responsableCargo), fecha: fechaDDMMYYYY(h.fecha), estado: h.estado })));
  const F = C.firmas || {};
  if (F.inspector) { poner(ws, F.inspector.nombre, d.inspectorNombre); poner(ws, F.inspector.cargo, d.inspectorCargo); }
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsableNombre || d.acompanaNombre); poner(ws, F.responsable.cargo, d.responsableNombre ? d.responsableCargo : d.acompanaCargo); }
}

export function validarInspeccion(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha de la inspección");
  if (!d.tipo || !d.tipo.trim()) faltan.push("el tipo de inspección");
  if (!d.inspectorNombre || !d.inspectorNombre.trim()) faltan.push("quién inspecciona");
  const c = conteo(d);
  if (c.sin) faltan.push(`responder los aspectos de la lista (faltan ${c.sin})`);
  const hs = hallazgosConDatos(d);
  if (hs.some((h) => !h.hallazgo || !h.hallazgo.trim())) faltan.push("el hallazgo en cada fila de hallazgos");
  return faltan;
}

// Aspectos "No cumple" que todavía no están en la lista de hallazgos (para pasarlos con un toque)
export function pendientesDePasarAHallazgos(d) {
  const ya = new Set(hallazgosConDatos(d).map((h) => (h.hallazgo || "").trim().toLowerCase()));
  return ITEMS_INSPECCION.map((it, i) => ({ ...it, i })).filter((it) => arr(d.respuestas)[it.i] === "No cumple" && !ya.has(it.texto.toLowerCase()) && !ya.has(`${it.texto} — ${arr(d.observaciones)[it.i] || ""}`.toLowerCase()));
}
export const textoHallazgoDeAspecto = (d, i) => {
  const obs = (arr(d.observaciones)[i] || "").trim();
  return obs ? `${ITEMS_INSPECCION[i].texto} — ${obs}` : ITEMS_INSPECCION[i].texto;
};

export function resumenInspeccion(d) {
  const c = conteo(d);
  return {
    id: `${d.fecha || "sin-fecha"}_${d.nInspeccion || ""}`, formato: "inspeccion", fecha: d.fecha || "", proyecto: d.proyecto || "", nInspeccion: d.nInspeccion || "", tipo: d.tipo || "",
    cumple: c.cumple, noCumple: c.no, na: c.na, porcentaje: porcentajeCumplimiento(d), hallazgos: hallazgosConDatos(d).length,
    hallazgosAbiertos: hallazgosConDatos(d).filter((h) => h.estado !== "Cerrada").length,
  };
}
