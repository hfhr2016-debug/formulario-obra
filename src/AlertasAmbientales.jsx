// AlertasAmbientales.jsx — aviso en la pantalla de inicio de Gestión Ambiental: permisos vencidos o por vencer y plan de emergencias por revisar.
import { leerJSON } from "./sstComunes";
import { CLAVE_AMB_PERMISOS, CLAVE_AMB_PLAN_EMERG } from "./ambComunes";
import { avisosInicioAmbiental } from "./alertasAmbDatos";

export default function AlertasAmbientales({ onIr }) {
  let avisos = [];
  try { avisos = avisosInicioAmbiental(leerJSON(CLAVE_AMB_PERMISOS, []), leerJSON(CLAVE_AMB_PLAN_EMERG, [])); } catch (e) { avisos = []; }
  if (!avisos.length) return null;
  return (
    <div data-alertas-amb className="px-4 pt-3 space-y-1.5">
      {avisos.slice(0, 6).map((a) => (
        <button key={a.id} type="button" data-alerta-amb={a.tipo} onClick={() => onIr(a.ir)} className="w-full text-left text-[11.5px] px-2.5 py-2 rounded-md"
          style={{ background: a.tipo === "alerta" ? "#FDEDEA" : "#FFF8E8", color: a.tipo === "alerta" ? "#B3401F" : "#7A5A00" }}>{a.tipo === "alerta" ? "⛔" : "⚠️"} {a.texto}</button>
      ))}
      {avisos.length > 6 && <div className="text-[11px]" style={{ color: "#8A8F99" }}>y {avisos.length - 6} más…</div>}
    </div>
  );
}
