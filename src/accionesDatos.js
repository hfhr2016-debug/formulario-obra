// Acciones correctivas, preventivas y de mejora (RYR-SS-012): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Este formato es el CENTRO del seguimiento: trae lo pendiente de Inspecciones, Actos y Condiciones e Investigaciones de accidentes,
// y lleva el registro de lo que sigue abierto de una hoja a la siguiente.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, textoResponsable } from "./sstBase";

export const CODIGO_ACCIONES = "RYR-SS-012";
export const HOJA_ACCIONES = "Acciones Correctivas";
export const ORIGENES = ["Inspección", "Acto o condición insegura", "Accidente o incidente", "Auditoría", "Reunión COPASST o Vigía", "Otro"];
export const TIPOS_ACCION = ["Correctiva", "Preventiva", "Mejora"];
export const ESTADOS_ACCION = ["Abierta", "En proceso", "Cerrada"];          // "Vencida" no se elige: la calcula la app según la fecha compromiso
export const EFICACIAS = ["Eficaz", "No eficaz", "Pendiente"];

export const SPEC_ACCIONES = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"],
    ["contratista", "Contratista / Empresa", "A", "D"],
    ["ubicacion", "Ubicación", "A", "D"],
    ["fechaCorte", "Fecha de corte", "I", "K"],
    ["periodo", "Periodo evaluado", "I", "K"],
    ["hoja", "Hoja N°", "I", "K"],
  ],
  tablas: [
    { clave: "acciones", cabecera: "No.", fin: "3. RESUMEN DE ESTA HOJA", finEmpieza: true,
      columnas: { fechaApertura: "B", origen: "C", ref: "D", hallazgo: "E", tipo: "F", accion: "G", responsable: "H", fechaCompromiso: "I", estado: "J", fechaCierre: "K", eficacia: "L" },
      encabezados: { fechaApertura: "Fecha de apertura", origen: "Origen", ref: "Referencia (N°)", hallazgo: "Hallazgo o causa", tipo: "Tipo de acción", accion: "Acción a ejecutar",
        responsable: "Responsable", fechaCompromiso: "Fecha compromiso", estado: "Estado", fechaCierre: "Fecha de cierre", eficacia: "Eficacia" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ACCIONES = {"proyecto":"D11","contratista":"D12","ubicacion":"D13","fechaCorte":"K11","periodo":"K12","hoja":"K13","tablas":{"acciones":{"fila0":16,"n":10,"columnas":{"fechaApertura":"B","origen":"C","ref":"D","hallazgo":"E","tipo":"F","accion":"G","responsable":"H","fechaCompromiso":"I","estado":"J","fechaCierre":"K","eficacia":"L"}}},"firmas":{"elaboro":{"nombre":"C33","cargo":"C34"},"reviso":{"nombre":"G33","cargo":"G34"},"vobo":{"nombre":"K33","cargo":"K34"}}};
export const descubrirAcciones = (ws) => descubrirPorEtiquetas(ws, SPEC_ACCIONES);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const accionNueva = (b = {}) => ({ fechaApertura: "", origen: "", ref: "", hallazgo: "", tipo: "Correctiva", accion: "", responsable: "", responsableCargo: "", fechaCompromiso: "", estado: "Abierta", fechaCierre: "", eficacia: "", ...b });
// Una fila "con datos" es la que tiene algo más que lo que trae por defecto (tipo Correctiva y estado Abierta)
export const accionVacia = (a) => !(a && (texto(a.hallazgo) || texto(a.accion) || texto(a.responsable) || texto(a.responsableCargo) || a.fechaCompromiso || a.fechaApertura || texto(a.origen) || texto(a.ref) || a.fechaCierre));
export const accionesConDatos = (d) => arr(d.acciones).filter((a) => !accionVacia(a));

// Estado que se escribe en el formato: una acción que no está cerrada y cuya fecha compromiso ya pasó queda como "Vencida"
export function estadoEfectivo(a, referenciaISO) {
  if (!a || a.estado === "Cerrada") return "Cerrada";
  if (a.fechaCompromiso && referenciaISO && a.fechaCompromiso < referenciaISO) return "Vencida";
  return a.estado || "Abierta";
}

export function escribirAccionesEnHoja(ws, d, celdas = CELDAS_ACCIONES, hoyISO = "") {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "periodo", "hoja"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaCorte, fechaDDMMYYYY(d.fechaCorte));
  const ref = d.fechaCorte || hoyISO;
  const T = C.tablas || {};
  escribirTabla(ws, T.acciones, accionesConDatos(d).map((a) => {
    const est = estadoEfectivo(a, ref);
    return { fechaApertura: fechaDDMMYYYY(a.fechaApertura), origen: a.origen, ref: a.ref, hallazgo: a.hallazgo, tipo: a.tipo, accion: a.accion,
      responsable: textoResponsable(a.responsable, a.responsableCargo), fechaCompromiso: fechaDDMMYYYY(a.fechaCompromiso), estado: est,
      fechaCierre: est === "Cerrada" ? fechaDDMMYYYY(a.fechaCierre) : "", eficacia: est === "Cerrada" ? a.eficacia : "" };
  }));
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarAcciones(d) {
  const faltan = [];
  if (!d.fechaCorte) faltan.push("la fecha de corte");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el seguimiento");
  const acciones = accionesConDatos(d);
  if (!acciones.length) faltan.push("al menos una acción");
  else {
    if (acciones.some((a) => !texto(a.hallazgo) || !texto(a.accion) || !texto(a.responsable) || !a.fechaCompromiso)) faltan.push("el hallazgo, la acción, el responsable y la fecha compromiso de cada acción");
    if (acciones.some((a) => a.estado === "Cerrada" && !a.fechaCierre)) faltan.push("la fecha de cierre de las acciones cerradas");
  }
  return faltan;
}

// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarAcciones().
export function camposFaltantesAcciones(d) {
  const f = [];
  if (!d.fechaCorte) f.push({ etiqueta: "Fecha de corte", seccion: "datos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  const todas = arr(d.acciones);
  if (!accionesConDatos(d).length) f.push({ etiqueta: "Hallazgo o causa", indice: 0, seccion: "acciones" });
  else todas.forEach((a, i) => {
    if (accionVacia(a)) return;
    if (!texto(a.hallazgo)) f.push({ etiqueta: "Hallazgo o causa", indice: i, seccion: "acciones" });
    if (!texto(a.accion)) f.push({ etiqueta: "Acción a ejecutar", indice: i, seccion: "acciones" });
    if (!texto(a.responsable)) f.push({ etiqueta: "Responsable", indice: i, seccion: "acciones" });
    if (!a.fechaCompromiso) f.push({ etiqueta: "Fecha compromiso", indice: i, seccion: "acciones" });
    if (a.estado === "Cerrada" && !a.fechaCierre) f.push({ etiqueta: "Fecha de cierre", indice: i, seccion: "acciones" });
  });
  return f;
}

// ---------- Traer acciones de los otros formatos ----------
export const claveAccion = (a) => `${texto(a.origen).toLowerCase()}|${texto(a.ref)}|${texto(a.hallazgo).toLowerCase().slice(0, 80)}`;
// Suma las acciones nuevas a las actuales sin repetir las que ya están (misma procedencia, referencia y hallazgo)
export function unirSinRepetir(actuales, nuevas) {
  const base = arr(actuales).filter((a) => !accionVacia(a));
  const vistas = new Set(base.map(claveAccion));
  const agregadas = [];
  for (const n of arr(nuevas)) { const k = claveAccion(n); if (!vistas.has(k)) { vistas.add(k); agregadas.push(n); } }
  return { lista: [...base, ...agregadas], agregadas: agregadas.length, repetidas: arr(nuevas).length - agregadas.length };
}
// Hallazgos de inspecciones que siguen abiertos o en proceso
export function accionesDeInspecciones(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const h of arr(r.detalle)) {
    if (h.estado === "Cerrada" || !texto(h.hallazgo)) continue;
    out.push(accionNueva({ fechaApertura: r.fecha || "", origen: "Inspección", ref: r.nInspeccion || "", hallazgo: h.hallazgo, tipo: "Correctiva", accion: h.accion || "",
      responsable: h.responsable || "", responsableCargo: h.responsableCargo || "", fechaCompromiso: h.fecha || "", estado: h.estado === "En proceso" ? "En proceso" : "Abierta" }));
  }
  return out;
}
// Reportes de actos y condiciones inseguras que no se han corregido
export function accionesDeActos(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) {
    if (r.corregido === "Sí" || !texto(r.observado)) continue;
    out.push(accionNueva({ fechaApertura: r.fecha || "", origen: "Acto o condición insegura", ref: r.nReporte || "", hallazgo: r.observado, tipo: "Correctiva",
      accion: r.recomendacion || r.accionInmediata || "", responsable: r.responsable || "", fechaCompromiso: r.fechaCompromiso || "", estado: r.corregido === "En proceso" ? "En proceso" : "Abierta" }));
  }
  return out;
}
// Acciones del plan de una investigación de accidente que siguen abiertas
export function accionesDeInvestigaciones(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const p of arr(r.plan)) {
    if (p.estado === "Cerrada" || !texto(p.accion)) continue;
    out.push(accionNueva({ fechaApertura: r.fechaInvestigacion || r.fechaEvento || "", origen: "Accidente o incidente", ref: r.nInvestigacion || r.nReporte || "", hallazgo: r.causaRaiz || r.tipoEvento || "Investigación de accidente",
      tipo: "Correctiva", accion: p.accion, responsable: p.responsable || "", responsableCargo: p.responsableCargo || "", fechaCompromiso: p.fecha || "", estado: p.estado === "En proceso" ? "En proceso" : "Abierta" }));
  }
  return out;
}

// ---------- Registro entre hojas ----------
export function resumenAcciones(d, hoyISO = "") {
  const ref = d.fechaCorte || hoyISO;
  const acciones = accionesConDatos(d).map((a) => ({ ...a, estado: estadoEfectivo(a, ref) }));
  const cuenta = (e) => acciones.filter((a) => a.estado === e).length;
  const cerradas = acciones.filter((a) => a.estado === "Cerrada");
  return { id: `${d.fechaCorte || "sin-fecha"}_${d.hoja || ""}`, formato: "acciones", fechaCorte: d.fechaCorte || "", proyecto: d.proyecto || "", hoja: d.hoja || "", acciones,
    total: acciones.length, abiertas: cuenta("Abierta"), enProceso: cuenta("En proceso"), cerradas: cerradas.length, vencidas: cuenta("Vencida"), eficaces: cerradas.filter((a) => a.eficacia === "Eficaz").length };
}
// La versión MÁS RECIENTE de cada acción entre todas las hojas guardadas (la hoja de fecha de corte más nueva gana)
export function registroMaestro(resumenes) {
  const orden = arr(resumenes).slice().sort((a, b) => String(a.fechaCorte).localeCompare(String(b.fechaCorte)));
  const mapa = new Map();
  for (const r of orden) for (const a of arr(r.acciones)) mapa.set(claveAccion(a), a);
  return Array.from(mapa.values());
}
// Lo que sigue pendiente (abierto, en proceso o vencido) para arrastrarlo a la hoja nueva
export const pendientesDelRegistro = (resumenes) => registroMaestro(resumenes).filter((a) => a.estado !== "Cerrada").map((a) => accionNueva({ ...a, estado: a.estado === "Vencida" ? "Abierta" : a.estado }));
