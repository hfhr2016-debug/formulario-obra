// alertasAmbDatos.js — avisos de la pantalla de inicio de Gestión Ambiental (puro, sin pantalla).
import { alertasPermisos, hoyISO } from "./permisosAmbDatos";
import { fechaDDMMYYYY } from "./sstBase";

const diasEntre = (a, b) => { const x = new Date(a + "T00:00:00"), y = new Date(b + "T00:00:00"); return isNaN(x) || isNaN(y) ? null : Math.round((y - x) / 86400000); };

// Lista de avisos {id, tipo, texto, ir}; pura, para poder probarla
export function avisosInicioAmbiental(permisos, planes, hoy = hoyISO()) {
  const out = [];
  const al = alertasPermisos(permisos, hoy);
  for (const a of al) {
    const cuando = a.estado === "Vencido" ? `venció el ${fechaDDMMYYYY(a.vigencia)}` : `vence el ${fechaDDMMYYYY(a.vigencia)} (en ${a.dias} ${a.dias === 1 ? "día" : "días"})`;
    out.push({ id: `perm|${a.proyecto}|${a.nombre}`, tipo: a.estado === "Vencido" ? "alerta" : "aviso", texto: `Permiso «${a.nombre}» de ${a.proyecto}: ${cuando}.`, ir: "amb-permisos" });
  }
  for (const p of Array.isArray(planes) ? planes : []) {
    if (!p || !p.proximaRevision) continue;
    const f = diasEntre(hoy, p.proximaRevision);
    if (f !== null && f < 0) out.push({ id: `plan|${p.proyecto}`, tipo: "alerta", texto: `El plan de emergencias de ${p.proyecto} se debía revisar el ${fechaDDMMYYYY(p.proximaRevision)}.`, ir: "amb-plan-emergencias" });
    else if (f !== null && f <= 30) out.push({ id: `plan|${p.proyecto}`, tipo: "aviso", texto: `El plan de emergencias de ${p.proyecto} se debe revisar antes del ${fechaDDMMYYYY(p.proximaRevision)}.`, ir: "amb-plan-emergencias" });
  }
  return out;
}

