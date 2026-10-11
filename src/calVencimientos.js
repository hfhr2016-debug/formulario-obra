// calVencimientos.js — junta en un solo lugar todo lo de Calidad que vence o ya venció (sin guardar nada propio: lo calcula de los registros).
import { texto, numero, hoyISO, listarRegistros, listarObrasCal, listarNCActivas } from "./calBase";
import { cilindrosPorEnsayar, diasEntre, sumarDias } from "./calFormatos2";
import { PENDIENTES, ACTA, MAESTRO } from "./calFormatos3";
import { PROVEEDORES, proximaSugerida } from "./calFormatos";

export const TIPOS_VENC = {
  cilindros: { titulo: "Cilindros por ensayar", vista: "cal-resultados", emoji: "🧪" },
  pendientes: { titulo: "Pendientes de entrega", vista: "cal-pendientes", emoji: "⏳" },
  nc: { titulo: "No conformidades", vista: "cal-nc", emoji: "🚫" },
  garantia: { titulo: "Garantías por vencer", vista: "cal-acta", emoji: "📝" },
  maestro: { titulo: "Listado maestro", vista: "cal-maestro", emoji: "🗂️" },
  proveedor: { titulo: "Reevaluación de proveedores", vista: "cal-proveedores", emoji: "🤝" },
};
const DIAS_AVISO = 3;          // se avisa desde 3 días antes
const DIAS_GARANTIA = 30;      // la garantía se avisa desde 30 días antes
const DIAS_PROVEEDOR = 15;      // la reevaluación de un proveedor se avisa desde 15 días antes
const DIAS_MAESTRO = 31;       // el listado maestro se actualiza cada mes

const estadoDe = (faltan) => (faltan < 0 ? "vencido" : faltan === 0 ? "hoy" : "pronto");
const cuando = (faltan, unaVez) => (faltan < 0 ? `vencido hace ${-faltan} ${faltan === -1 ? "día" : "días"}` : faltan === 0 ? "vence hoy" : `${unaVez} en ${faltan} ${faltan === 1 ? "día" : "días"}`);
function masMeses(iso, m) {
  const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(iso)); if (!x || !(m > 0)) return "";
  const d = new Date(Number(x[1]), Number(x[2]) - 1, Number(x[3])); const dia = d.getDate();
  d.setMonth(d.getMonth() + Math.round(m)); if (d.getDate() !== dia) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lo pendiente de UNA obra
export function vencimientosDeObra(obra, hoy = hoyISO()) {
  const out = []; const base = { obraId: obra.id, obra: obra.proyecto };
  const poner = (tipo, e) => out.push({ ...base, tipo, vista: TIPOS_VENC[tipo].vista, ...e });
  for (const c of cilindrosPorEnsayar(obra.id, hoy)) if (c.estado !== "proximo") poner("cilindros", { estado: c.estado, faltan: c.faltan, titulo: c.titulo, detalle: c.detalle });
  for (const p of PENDIENTES.pendientes(obra.id)) poner("pendientes", { estado: p.estado, faltan: p.faltan, titulo: p.titulo, detalle: p.detalle });
  for (const n of listarNCActivas(obra.id)) {
    const nombre = `N° ${n.numero} · ${texto(n.titulo) || texto(n.descripcion).slice(0, 50) || "sin título"}`;
    if (n.estado === "Cerrada") {      // cerrada: falta comprobar que la acción funcionó (ISO 9001, 10.2)
      if (n.verifResultado === "No eficaz") { poner("nc", { estado: "vencido", faltan: -1, titulo: nombre, detalle: "La acción no fue eficaz: reábrela y define una acción nueva" }); continue; }
      if (n.verifResultado === "Eficaz" || !texto(n.verifPlan)) continue;
      const fv = diasEntre(hoy, n.verifPlan); if (fv === null || fv > DIAS_AVISO) continue;
      poner("nc", { estado: estadoDe(fv), faltan: fv, titulo: nombre, detalle: `Verificar la eficacia de la acción (${cuando(fv, "toca")}) · cerrada el ${texto(n.fechaCierre)}` });
      continue;
    }
    if (!texto(n.fechaLimite)) { if (!(diasEntre(n.fecha, hoy) > DIAS_AVISO)) continue; poner("nc", { estado: "pronto", faltan: 999, titulo: nombre, detalle: "Sin fecha límite: ponla para que la app pueda avisarte" }); continue; }
    const faltan = diasEntre(hoy, n.fechaLimite); if (faltan === null || faltan > DIAS_AVISO) continue;
    poner("nc", { estado: estadoDe(faltan), faltan, titulo: nombre, detalle: `Fecha límite ${n.fechaLimite} (${cuando(faltan, "vence")})${texto(n.responsable) ? " · " + texto(n.responsable) : ""}` });
  }
  for (const r of listarRegistros(ACTA, obra.id)) {
    const d = r.datos || {}; const vence = masMeses(d.inicioGarantia, numero(d.mesesGarantia)); if (!vence) continue;
    const faltan = diasEntre(hoy, vence); if (faltan === null || faltan < 0 || faltan > DIAS_GARANTIA) continue;
    poner("garantia", { estado: faltan === 0 ? "hoy" : "pronto", faltan, titulo: `Acta ${texto(d.hoja) || ""} · ${texto(d.tipo) || "entrega"}`.trim(), detalle: `La garantía vence el ${vence} (${cuando(faltan, "vence")})` });
  }
  // Proveedores: se toma la última evaluación de cada uno; si ya pasó (o está por llegar) su fecha de reevaluación, se avisa
  const ultimas = new Map();
  for (const r of listarRegistros(PROVEEDORES, obra.id)) { const d = r.datos || {}; const k = texto(d.proveedor).toLowerCase(); if (k && texto(d.fecha) && (!ultimas.has(k) || ultimas.get(k).fecha < d.fecha)) ultimas.set(k, d); }
  for (const d of ultimas.values()) {
    if (d.decision === "No volver a contratar") continue;
    const cuandoToca = texto(d.proxima) || proximaSugerida(d); if (!cuandoToca) continue;
    const faltan = diasEntre(hoy, cuandoToca); if (faltan === null || faltan > DIAS_PROVEEDOR) continue;
    poner("proveedor", { estado: estadoDe(faltan), faltan, titulo: texto(d.proveedor), detalle: `Reevaluación prevista el ${cuandoToca} (${cuando(faltan, "toca")}) · última evaluación ${texto(d.fecha)}` });
  }
  const maestros = listarRegistros(MAESTRO, obra.id).filter((r) => texto((r.datos || {}).fecha));
  if (maestros.length) {
    const ultimo = maestros.map((r) => r.datos.fecha).sort().pop(); const pasados = diasEntre(ultimo, hoy);
    if (pasados !== null && pasados > DIAS_MAESTRO) poner("maestro", { estado: "vencido", faltan: DIAS_MAESTRO - pasados, titulo: "Listado maestro de registros", detalle: `Último corte ${ultimo} (hace ${pasados} días): se actualiza cada mes` });
  }
  return out.sort((a, b) => a.faltan - b.faltan);
}

// Todas las obras (o las que se pidan)
export function vencimientos(obraIds = null, hoy = hoyISO()) {
  const obras = listarObrasCal().filter((o) => !obraIds || obraIds.includes(o.id));
  return obras.flatMap((o) => vencimientosDeObra(o, hoy));
}
export const resumenVenc = (items) => ({ vencidos: items.filter((i) => i.estado === "vencido").length, hoy: items.filter((i) => i.estado === "hoy").length, pronto: items.filter((i) => i.estado === "pronto").length, total: items.length });
