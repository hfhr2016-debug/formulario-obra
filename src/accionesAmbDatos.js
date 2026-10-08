// Acciones correctivas, preventivas y de mejora AMBIENTALES (RYR-AM-017): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Es el CENTRO del seguimiento ambiental: trae lo pendiente de las Inspecciones, los Incidentes, las Quejas, la Matriz de aspectos, la Evaluación
// de contratistas y las Sustancias químicas, y lleva el registro de lo que sigue abierto de una hoja a la siguiente.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, textoResponsable } from "./sstBase";

export const CODIGO_ACCIONES_AMB = "RYR-AM-017";
export const HOJA_ACCIONES_AMB = "Acciones Correctivas Amb.";
export const ORIGENES_AMB = ["Inspección ambiental", "Incidente ambiental", "Queja de la comunidad", "Evaluación de contratista", "Matriz de aspectos e impactos", "Auditoría o seguimiento", "Requerimiento de la autoridad", "Otro"];
export const TIPOS_ACCION_AMB = ["Correctiva", "Preventiva", "De mejora"];
export const ESTADOS_ACCION_AMB = ["Abierta", "En proceso", "Cerrada"];     // "Vencida" no se elige: la calcula la app según la fecha límite
export const EFICACIAS_AMB = ["Sí", "No", "Pendiente"];

export const SPEC_ACCIONES_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"],
    ["contratista", "Contratista / Empresa", "A", "D"],
    ["fechaCorte", "Fecha de corte", "A", "D"],
    ["periodo", "Periodo", "E", "F"],
    ["ubicacion", "Ubicación", "G", "I"],
    ["responsableSeg", "Responsable del seguimiento", "G", "I"],
    ["hoja", "Hoja N°", "G", "I"],
  ],
  tablas: [
    { clave: "acciones", cabecera: "No.", fin: "Total registradas", finEmpieza: true,
      columnas: { fechaApertura: "B", origen: "C", hallazgo: "D", causa: "E", accion: "F", tipo: "G", responsable: "H", fechaCompromiso: "I", estado: "J", fechaCierre: "K", eficaz: "L", evidencia: "M" },
      encabezados: { fechaApertura: "Fecha", origen: "Origen", hallazgo: "Hallazgo o situación", causa: "Causa identificada", accion: "Acción a ejecutar", tipo: "Tipo", responsable: "Responsable",
        fechaCompromiso: "Fecha límite", estado: "Estado", fechaCierre: "Fecha de cierre", eficaz: "¿Eficaz?", evidencia: "Evidencia u observación" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "3. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "H" }, { clave: "vobo", col: "L" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ACCIONES_AMB = {"proyecto":"D11","contratista":"D12","fechaCorte":"D13","periodo":"F13","ubicacion":"I11","responsableSeg":"I12","hoja":"I13","tablas":{"acciones":{"fila0":16,"n":10,"columnas":{"fechaApertura":"B","origen":"C","hallazgo":"D","causa":"E","accion":"F","tipo":"G","responsable":"H","fechaCompromiso":"I","estado":"J","fechaCierre":"K","eficaz":"L","evidencia":"M"}}},"firmas":{"elaboro":{"nombre":"C32","cargo":"C33"},"reviso":{"nombre":"H32","cargo":"H33"},"vobo":{"nombre":"L32","cargo":"L33"}}};
export const descubrirAccionesAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_ACCIONES_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const accionAmbNueva = (b = {}) => ({ fechaApertura: "", origen: "", ref: "", hallazgo: "", causa: "", tipo: "Correctiva", accion: "", responsable: "", responsableCargo: "", fechaCompromiso: "", estado: "Abierta", fechaCierre: "", eficaz: "", evidencia: "", ...b });
// Una fila "con datos" es la que tiene algo más que lo que trae por defecto (tipo Correctiva y estado Abierta)
export const accionAmbVacia = (a) => !(a && (texto(a.hallazgo) || texto(a.accion) || texto(a.causa) || texto(a.responsable) || texto(a.responsableCargo) || a.fechaCompromiso || a.fechaApertura || texto(a.origen) || texto(a.ref) || a.fechaCierre || texto(a.evidencia)));
export const accionesAmbConDatos = (d) => arr(d.acciones).filter((a) => !accionAmbVacia(a));

// Estado efectivo: una acción que no está cerrada y cuya fecha límite ya pasó queda como "Vencida" (solo en la app; el formato calcula las vencidas por su cuenta)
export function estadoEfectivoAmb(a, referenciaISO) {
  if (!a || a.estado === "Cerrada") return "Cerrada";
  if (a.fechaCompromiso && referenciaISO && a.fechaCompromiso < referenciaISO) return "Vencida";
  return a.estado || "Abierta";
}

export const MESES_PERIODO_AMB = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const sinTilde = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const mesDePeriodoAmb = (p) => { const t = sinTilde(p); return MESES_PERIODO_AMB.findIndex((m) => t.includes(sinTilde(m))); };
// Texto que se escribe: "Septiembre de 2026". El año sale de la fecha de corte; si el mes elegido es posterior al mes de corte, es del año anterior.
export function textoPeriodoAmb(d) {
  const p = texto(d.periodo);
  if (!p || /\d{4}/.test(p)) return p;
  const i = mesDePeriodoAmb(p);
  if (i < 0) return p;
  const m = /^(\d{4})-(\d{2})/.exec(d.fechaCorte || "");
  if (!m) return MESES_PERIODO_AMB[i];
  const anio = Number(m[1]) - (i > Number(m[2]) - 1 ? 1 : 0);
  return `${MESES_PERIODO_AMB[i]} de ${anio}`;
}

export function escribirAccionesAmbEnHoja(ws, d, celdas = CELDAS_ACCIONES_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "hoja"]) poner(ws, C[k], d[k]);
  poner(ws, C.responsableSeg, d.responsableSeg);
  poner(ws, C.periodo, textoPeriodoAmb(d));
  poner(ws, C.fechaCorte, fechaDDMMYYYY(d.fechaCorte));
  const T = C.tablas || {};
  // Se escribe el estado que eligió la persona (Abierta, En proceso o Cerrada): el formato cuenta las vencidas con la fecha límite
  escribirTabla(ws, T.acciones, accionesAmbConDatos(d).map((a) => ({
    fechaApertura: fechaDDMMYYYY(a.fechaApertura), origen: a.origen, hallazgo: a.hallazgo, causa: a.causa, accion: a.accion, tipo: a.tipo,
    responsable: textoResponsable(a.responsable, a.responsableCargo), fechaCompromiso: fechaDDMMYYYY(a.fechaCompromiso), estado: a.estado,
    fechaCierre: a.estado === "Cerrada" ? fechaDDMMYYYY(a.fechaCierre) : "", eficaz: a.estado === "Cerrada" ? a.eficaz : "", evidencia: a.evidencia })));
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarAccionesAmb(d) {
  const faltan = [];
  if (!d.fechaCorte) faltan.push("la fecha de corte");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el seguimiento");
  const acciones = accionesAmbConDatos(d);
  if (!acciones.length) faltan.push("al menos una acción");
  else {
    if (acciones.some((a) => !texto(a.hallazgo) || !texto(a.accion) || !texto(a.responsable) || !a.fechaCompromiso)) faltan.push("el hallazgo, la acción, el responsable y la fecha límite de cada acción");
    if (acciones.some((a) => a.estado === "Cerrada" && !a.fechaCierre)) faltan.push("la fecha de cierre de las acciones cerradas");
  }
  return faltan;
}

// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarAccionesAmb().
export function camposFaltantesAccionesAmb(d) {
  const f = [];
  if (!d.fechaCorte) f.push({ etiqueta: "Fecha de corte", seccion: "datos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  const todas = arr(d.acciones);
  if (!accionesAmbConDatos(d).length) f.push({ etiqueta: "Hallazgo o situación", indice: 0, seccion: "acciones" });
  else todas.forEach((a, i) => {
    if (accionAmbVacia(a)) return;
    if (!texto(a.hallazgo)) f.push({ etiqueta: "Hallazgo o situación", indice: i, seccion: "acciones" });
    if (!texto(a.accion)) f.push({ etiqueta: "Acción a ejecutar", indice: i, seccion: "acciones" });
    if (!texto(a.responsable)) f.push({ etiqueta: "Responsable", indice: i, seccion: "acciones" });
    if (!a.fechaCompromiso) f.push({ etiqueta: "Fecha límite", indice: i, seccion: "acciones" });
    if (a.estado === "Cerrada" && !a.fechaCierre) f.push({ etiqueta: "Fecha de cierre", indice: i, seccion: "acciones" });
  });
  return f;
}

// ---------- Traer acciones de los otros formatos ----------
export const claveAccionAmb = (a) => `${texto(a.origen).toLowerCase()}|${texto(a.ref)}|${texto(a.hallazgo).toLowerCase().slice(0, 80)}`;
// Suma las acciones nuevas a las actuales sin repetir las que ya están (misma procedencia, referencia y hallazgo)
export function unirSinRepetirAmb(actuales, nuevas) {
  const base = arr(actuales).filter((a) => !accionAmbVacia(a));
  const vistas = new Set(base.map(claveAccionAmb));
  const agregadas = [];
  for (const n of arr(nuevas)) { const k = claveAccionAmb(n); if (!vistas.has(k)) { vistas.add(k); agregadas.push(n); } }
  return { lista: [...base, ...agregadas], agregadas: agregadas.length, repetidas: arr(nuevas).length - agregadas.length };
}
// Hallazgos de inspecciones ambientales (y de la verificación de sustancias químicas) que el resumen guardó con su detalle
export function accionesDeInspeccionesAmb(resumenes, origenRef = "") {
  const out = [];
  for (const r of arr(resumenes)) for (const h of arr(r.detalle)) {
    if (!texto(h.hallazgo)) continue;
    out.push(accionAmbNueva({ fechaApertura: r.fecha || "", origen: "Inspección ambiental", ref: `${origenRef}${r.nInspeccion || r.almacen || r.fecha || ""}`, hallazgo: h.hallazgo, tipo: "Correctiva",
      accion: h.accion || "", responsable: h.responsable || "", fechaCompromiso: h.fechaLimite || "", estado: "Abierta" }));
  }
  return out;
}
// Acciones correctivas de incidentes ambientales que siguen abiertas
export function accionesDeIncidentesAmb(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const p of arr(r.plan)) {
    if (p.estado === "Cerrada" || !texto(p.accion)) continue;
    out.push(accionAmbNueva({ fechaApertura: r.fecha || "", origen: "Incidente ambiental", ref: r.nReporte || r.fecha || "", hallazgo: [arr(r.tipos).join(", "), r.causaRaiz].filter(Boolean).join(" — ") || "Incidente ambiental",
      causa: r.causaRaiz || "", tipo: "Correctiva", accion: p.accion, responsable: p.responsable || "", fechaCompromiso: p.fechaLimite || "", estado: p.estado === "En proceso" ? "En proceso" : "Abierta" }));
  }
  return out;
}
// Quejas y reclamos de la comunidad que no se han cerrado
export function accionesDeQuejasAmb(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) {
    if (!["Queja", "Reclamo"].includes(r.tipo) || r.estado === "Cerrada") continue;
    out.push(accionAmbNueva({ fechaApertura: r.fecha || "", origen: "Queja de la comunidad", ref: r.nPqrs || r.fecha || "", hallazgo: `${r.tipo} de la comunidad${arr(r.temas).length ? ": " + arr(r.temas).join(", ") : ""}`,
      tipo: "Correctiva", accion: "Responder y resolver la solicitud de la comunidad", fechaCompromiso: r.limite || "", estado: r.estado === "En trámite" ? "En proceso" : "Abierta" }));
  }
  return out;
}
// Aspectos SIGNIFICATIVOS de la matriz: lo que hay que controlar
export function accionesDeMatrizAmb(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const x of arr(r.aspectos)) {
    if (x.significativo !== "Sí" || !texto(x.aspecto)) continue;
    out.push(accionAmbNueva({ fechaApertura: r.fecha || "", origen: "Matriz de aspectos e impactos", ref: `${r.version || "v"}-${x.nivel}`, hallazgo: `${x.aspecto}${x.impacto ? " — " + x.impacto : ""} (impacto ${String(x.nivel || "").toLowerCase()})`,
      tipo: "Preventiva", accion: x.control || "", responsable: x.responsable || "", estado: "Abierta" }));
  }
  return out;
}
// Acciones de mejora acordadas con los contratistas en su evaluación ambiental
export function accionesDeContratistasAmb(resumenes) {
  const out = [];
  for (const r of arr(resumenes)) for (const m of arr(r.mejoras)) {
    if (!texto(m.accion)) continue;
    out.push(accionAmbNueva({ fechaApertura: r.fecha || "", origen: "Evaluación de contratista", ref: r.contratista || "", hallazgo: `Evaluación ambiental de ${r.contratista || "un contratista"}${r.resultado ? ": " + r.resultado : ""}`,
      tipo: "De mejora", accion: m.accion, responsable: m.responsable || "", fechaCompromiso: m.fecha || "", estado: "Abierta" }));
  }
  return out;
}

// ---------- Registro entre hojas ----------
export function resumenAccionesAmb(d, hoyISO = "") {
  const ref = d.fechaCorte || hoyISO;
  const acciones = accionesAmbConDatos(d).map((a) => ({ ...a, estado: estadoEfectivoAmb(a, ref) }));
  const cuenta = (e) => acciones.filter((a) => a.estado === e).length;
  const cerradas = acciones.filter((a) => a.estado === "Cerrada");
  return { id: `${d.fechaCorte || "sin-fecha"}_${d.hoja || ""}`, formato: "acciones-amb", fechaCorte: d.fechaCorte || "", proyecto: d.proyecto || "", hoja: d.hoja || "", acciones,
    total: acciones.length, abiertas: cuenta("Abierta"), enProceso: cuenta("En proceso"), cerradas: cerradas.length, vencidas: cuenta("Vencida"), eficaces: cerradas.filter((a) => a.eficaz === "Sí").length };
}
// La versión MÁS RECIENTE de cada acción entre todas las hojas guardadas (la hoja de fecha de corte más nueva gana)
export function registroMaestroAmb(resumenes) {
  const orden = arr(resumenes).slice().sort((a, b) => String(a.fechaCorte).localeCompare(String(b.fechaCorte)));
  const mapa = new Map();
  for (const r of orden) for (const a of arr(r.acciones)) mapa.set(claveAccionAmb(a), a);
  return Array.from(mapa.values());
}
// Lo que sigue pendiente (abierto, en proceso o vencido) para arrastrarlo a la hoja nueva
export const pendientesDelRegistroAmb = (resumenes) => registroMaestroAmb(resumenes).filter((a) => a.estado !== "Cerrada").map((a) => accionAmbNueva({ ...a, estado: a.estado === "Vencida" ? "Abierta" : a.estado }));
