// Consolidado de lo registrado en los demás formatos para un periodo (lo usan los informes Semanal y Mensual).
// Todo sale de los resúmenes que cada formulario guarda en el dispositivo; aquí no se escribe nada, solo se cuenta.
import { registroMaestro } from "./accionesDatos";

export const FUENTES = { charlas: "ryr_sst_charlas", inducciones: "ryr_sst_inducciones", eventos: "ryr_sst_eventos", inspecciones: "ryr_sst_inspecciones", permisos: "ryr_sst_permisos", ats: "ryr_sst_ats",
  epp: "ryr_sst_entregas_epp", actos: "ryr_sst_reportes_actos", accidentes: "ryr_sst_accidentes", acciones: "ryr_sst_acciones", contratistas: "ryr_sst_contratistas", personal: "ryr_sst_personal", indicadores: "ryr_sst_indicadores" };

const arr = (a) => (Array.isArray(a) ? a : []);
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
export const enRango = (iso, desde, hasta) => esFecha(iso) && (!esFecha(desde) || iso >= desde) && (!esFecha(hasta) || iso <= hasta);

// ---------- Fechas ----------
const aUTC = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const aISO = (f) => f.toISOString().slice(0, 10);
export function sumarDias(iso, n) { const f = aUTC(iso); if (!f) return ""; f.setUTCDate(f.getUTCDate() + n); return aISO(f); }
// La semana va de lunes a domingo
export function inicioSemana(iso) { const f = aUTC(iso); if (!f) return ""; const dia = (f.getUTCDay() + 6) % 7; return sumarDias(iso, -dia); }
export const finSemana = (iso) => sumarDias(inicioSemana(iso), 6);
// Número de semana del año (ISO 8601: la semana 1 es la que tiene el primer jueves del año)
export function numeroSemana(iso) {
  const f = aUTC(iso); if (!f) return "";
  const dia = (f.getUTCDay() + 6) % 7; f.setUTCDate(f.getUTCDate() - dia + 3);
  const primerJueves = new Date(Date.UTC(f.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((f - primerJueves) / 86400000 - 3 + ((primerJueves.getUTCDay() + 6) % 7)) / 7);
}
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export function rangoMes(anio, mesIdx) {
  const a = Number(anio);
  if (!a || mesIdx < 0 || mesIdx > 11) return { desde: "", hasta: "" };
  const p = (n) => String(n).padStart(2, "0");
  return { desde: `${a}-${p(mesIdx + 1)}-01`, hasta: `${a}-${p(mesIdx + 1)}-${p(new Date(Date.UTC(a, mesIdx + 1, 0)).getUTCDate())}` };
}

// ---------- Conteos del periodo ----------
// regs = { charlas, inducciones, eventos, inspecciones, permisos, ats, epp, actos, accidentes, acciones, contratistas } (listas de resúmenes)
export function actividadesDelPeriodo(desde, hasta, regs = {}) {
  const dentro = (lista, campo = "fecha") => arr(lista).filter((r) => enRango(r[campo], desde, hasta));
  const eventos = (...tipos) => dentro(regs.eventos).filter((e) => tipos.includes(e.tipo));
  const acc = dentro(regs.accidentes, "fechaEvento");
  const maestro = registroMaestro(arr(regs.acciones));
  const abiertas = maestro.filter((a) => a.estado !== "Cerrada" && (!esFecha(a.fechaApertura) || !esFecha(hasta) || a.fechaApertura <= hasta));
  return {
    charlas: dentro(regs.charlas).length + eventos("Charla de seguridad").length,
    inducciones: dentro(regs.inducciones).length,
    capacitaciones: eventos("Capacitación", "Entrenamiento").length,
    inspecciones: dentro(regs.inspecciones).length,
    permisos: dentro(regs.permisos).length,
    ats: dentro(regs.ats).length,
    epp: dentro(regs.epp).length,
    actos: dentro(regs.actos).length,
    accidentes: acc.filter((r) => r.esAccidente).length,
    incidentes: acc.filter((r) => !r.esAccidente).length,
    diasIncapacidad: acc.filter((r) => r.esAccidente).reduce((s, r) => s + (Number(r.incapacidad) || 0), 0),
    accionesAbiertas: abiertas.length,
    accionesVencidas: abiertas.filter((a) => esFecha(a.fechaCompromiso) && esFecha(hasta) && a.fechaCompromiso < hasta).length,
    accionesCerradas: maestro.filter((a) => a.estado === "Cerrada" && enRango(a.fechaCierre, desde, hasta)).length,
    simulacros: eventos("Simulacro"),
    reuniones: eventos("Reunión COPASST / Vigía", "Reunión de seguimiento"),
    contratistasEvaluados: dentro(regs.contratistas).length,
  };
}
// Promedio de trabajadores: los activos de la hoja del Registro de Personal con el corte MÁS reciente hasta esa fecha
export function trabajadoresDelPeriodo(hasta, regs = {}) {
  const hojas = arr(regs.personal).filter((r) => esFecha(r.fechaCorte) && (!esFecha(hasta) || r.fechaCorte <= hasta)).sort((a, b) => String(a.fechaCorte).localeCompare(String(b.fechaCorte)));
  return hojas.length ? hojas[hojas.length - 1].activos : null;
}
