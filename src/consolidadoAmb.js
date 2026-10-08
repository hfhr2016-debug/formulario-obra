// Consolidado AMBIENTAL de lo registrado en los demás formatos para un periodo (lo usan Indicadores, Informes y el Resumen para el ICA).
// Todo sale de los resúmenes que cada formulario guarda en el dispositivo; aquí no se escribe nada, solo se cuenta y se suma.
import { enRango, rangoMes, MESES } from "./consolidadoSST";
import { registroMaestroAmb } from "./accionesAmbDatos";
export { enRango, rangoMes, MESES, inicioSemana, finSemana, numeroSemana, sumarDias } from "./consolidadoSST";

// Claves de almacenamiento (las mismas de ambComunes.jsx; aquí van escritas para que este módulo no dependa de la pantalla)
export const FUENTES_AMB = {
  residuos: "ryr_amb_residuos", consumos: "ryr_amb_consumos", inspecciones: "ryr_amb_inspecciones", incidentes: "ryr_amb_incidentes", pqrs: "ryr_amb_pqrs",
  capacitaciones: "ryr_amb_capacitaciones", acciones: "ryr_amb_acciones", contratistas: "ryr_amb_contratistas", manifiestos: "ryr_amb_manifiestos", quimicos: "ryr_amb_quimicos",
  hidrocarburos: "ryr_amb_hidrocarburos", forestal: "ryr_amb_forestal", vertimientos: "ryr_amb_vertimientos", emisiones: "ryr_amb_emisiones", matriz: "ryr_amb_matriz",
  maquinaria: "ryr_amb_maquinaria", ficha: "ryr_amb_ficha", indicadores: "ryr_amb_indicadores", semanales: "ryr_amb_semanales", mensuales: "ryr_amb_mensuales", trimestrales: "ryr_amb_trimestrales",
};

const arr = (a) => (Array.isArray(a) ? a : []);
const num = (v) => { const t = String(v === undefined || v === null ? "" : v).trim().replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const redondear = (n, d = 2) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);
const mesDeISO = (iso) => (esFecha(iso) ? String(iso).slice(0, 7) : "");

// Residuos: kilos de un tipo (las toneladas se pasan a kilos). Devuelve null si ese tipo no tiene ese dato en ninguna hoja.
const TIPO_RES = { ordinarios: "Ordinario", aprovechables: "Aprovechable", organicos: "Orgánico / vegetal", respel: "Peligroso (RESPEL)", rcd: "RCD (escombros)" };
function residuosDelPeriodo(desde, hasta, regs, estricto = false) {
  // estricto: solo las hojas que empiezan y terminan DENTRO del periodo (para una semana, una hoja mensual no se reparte)
  const hojas = arr(regs.residuos).filter((r) => (estricto ? enRango(r.desde, desde, hasta) && enRango(r.hasta, desde, hasta) : enRango(r.desde, desde, hasta)));
  const sumas = {};
  for (const [clave, tipo] of Object.entries(TIPO_RES)) {
    let valor = null;
    for (const h of hojas) {
      const t = (h.totales || {})[tipo]; if (!t) continue;
      const v = clave === "rcd" ? num(t["m³"]) : (num(t.kg) === null && num(t.t) === null ? null : (num(t.kg) || 0) + (num(t.t) || 0) * 1000);
      if (v !== null) valor = (valor || 0) + v;
    }
    sumas[clave] = redondear(valor);
  }
  return { hojas: hojas.length, ...sumas };
}
// Consumos: el resumen de consumos es mensual; se suman los meses que caen en el periodo
function consumosDelPeriodo(desde, hasta, regs) {
  const m1 = mesDeISO(desde), m2 = mesDeISO(hasta);
  const ms = arr(regs.consumos).filter((r) => /^\d{4}-\d{2}$/.test(String(r.mes || "")) && (!m1 || r.mes >= m1) && (!m2 || r.mes <= m2));
  const suma = (k) => { const v = ms.map((r) => num(r[k])).filter((x) => x !== null); return v.length ? redondear(v.reduce((a, b) => a + b, 0)) : null; };
  const trabDias = ms.map((r) => (num(r.trabajadores) || 0) * (num(r.dias) || 0)).reduce((a, b) => a + b, 0);
  const diesel = suma("diesel"), gasolina = suma("gasolina");
  const trab = ms.map((r) => num(r.trabajadores)).filter((x) => x !== null && x > 0);
  const dias = ms.map((r) => num(r.dias)).filter((x) => x !== null);
  return { meses: ms.length, diasConsumo: dias.length ? dias.reduce((a, b) => a + b, 0) : null, agua: suma("agua"), energia: suma("energia"), combustible: diesel === null && gasolina === null ? null : redondear((diesel || 0) + (gasolina || 0)), trabajadoresDia: trabDias,
    trabajadores: trab.length ? Math.round(trab.reduce((a, b) => a + b, 0) / trab.length) : null };
}

// regs = { residuos, consumos, inspecciones, incidentes, pqrs, capacitaciones, acciones, contratistas, manifiestos, quimicos, hidrocarburos, forestal } (listas de resúmenes)
export function consolidarPeriodo(desde, hasta, regs = {}, opciones = {}) {
  const dentro = (lista, campo = "fecha") => arr(lista).filter((r) => enRango(r[campo], desde, hasta));
  const res = residuosDelPeriodo(desde, hasta, regs, !!opciones.residuosEstrictos);
  const con = consumosDelPeriodo(desde, hasta, regs);
  const quejas = dentro(regs.pqrs).filter((r) => ["Queja", "Reclamo"].includes(r.tipo));
  const atendidas = quejas.filter((r) => r.estado === "Cerrada");
  const aTiempo = quejas.filter((r) => !r.vencida && !r.respondidaTarde);
  const maestro = registroMaestroAmb(arr(regs.acciones));
  const abiertas = maestro.filter((a) => a.estado !== "Cerrada" && (!esFecha(a.fechaApertura) || !esFecha(hasta) || a.fechaApertura <= hasta));
  const cerradas = maestro.filter((a) => a.estado === "Cerrada" && enRango(a.fechaCierre, desde, hasta));
  const cerradasATiempo = cerradas.filter((a) => !esFecha(a.fechaCompromiso) || a.fechaCierre <= a.fechaCompromiso);
  const insp = dentro(regs.inspecciones);
  const pcts = insp.map((r) => num(r.porcentaje)).filter((x) => x !== null);
  const mans = dentro(regs.manifiestos);
  const hidro = dentro(regs.hidrocarburos);
  return {
    residuos: res, consumos: con,
    inspecciones: insp.length, cumplimientoInspecciones: pcts.length ? redondear(pcts.reduce((a, b) => a + b, 0) / pcts.length, 1) : null,
    quimicos: dentro(regs.quimicos).length, maquinaria: dentro(regs.maquinaria).length, quimicosHidro: dentro(regs.quimicos).length + hidro.length,
    monitoreos: dentro(regs.emisiones).length + dentro(regs.vertimientos).length, hidrocarburos: hidro.length, derrames: hidro.filter((h) => h.derrame).length,
    capacitaciones: dentro(regs.capacitaciones).length, incidentes: dentro(regs.incidentes).length,
    quejas: quejas.length, quejasAtendidas: atendidas.length, quejasATiempo: aTiempo.length,
    accionesAbiertas: abiertas.length, accionesVencidas: abiertas.filter((a) => esFecha(a.fechaCompromiso) && esFecha(hasta) && a.fechaCompromiso < hasta).length,
    accionesCerradas: cerradas.length, accionesCerradasATiempo: cerradasATiempo.length,
    contratistasEvaluados: dentro(regs.contratistas).length,
    manifiestos: mans.length, manifiestosM3: redondear(mans.filter((m) => !m.unidad || m.unidad === "m³").reduce((s, m) => s + (num(m.cantidad) || 0), 0)),
    forestal: dentro(regs.forestal).length,
  };
}
const pct = (a, b) => (a === null || b === null || b === 0 ? null : redondear((a / b) * 100, 1));
// Valor del indicador para un periodo (null si no hay de dónde calcularlo)
export function valoresIndicadores(desde, hasta, regs = {}) {
  const c = consolidarPeriodo(desde, hasta, regs);
  const r = c.residuos;
  const aprov = r.aprovechables, ord = r.ordinarios;
  const totalAprov = aprov === null && ord === null ? null : (aprov || 0) + (ord || 0);
  return {
    aprovechados: pct(aprov, totalAprov), rcdAprov: null, ordinarios: ord, respel: r.respel, respelManifiesto: null,
    agua: c.consumos.agua, aguaTrab: c.consumos.agua !== null && c.consumos.trabajadoresDia > 0 ? redondear((c.consumos.agua * 1000) / c.consumos.trabajadoresDia, 1) : null,
    energia: c.consumos.energia, combustible: c.consumos.combustible, incidentes: c.incidentes, quejas: c.quejas,
    quejasATiempo: c.quejas ? pct(c.quejasATiempo, c.quejas) : null, cumplimientoPlan: c.cumplimientoInspecciones, accionesATiempo: c.accionesCerradas ? pct(c.accionesCerradasATiempo, c.accionesCerradas) : null,
  };
}

// Las 8 cantidades de los informes, en el orden del formato: ordinarios, aprovechables, RCD, RESPEL, orgánicos, agua, energía y combustible
export function cantidadesConsolidadas(c) {
  const r = c.residuos, k = c.consumos;
  return [r.ordinarios, r.aprovechables, r.rcd, r.respel, r.organicos, k.agua, k.energia, k.combustible];
}
