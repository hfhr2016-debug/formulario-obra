// ProyectoFicha.jsx — «Traer proyecto desde la Ficha Técnica»: lista los proyectos guardados (los que se crean en Ficha Técnica) y deja elegir uno.
// Reutilizable en cualquier formulario: <TraerProyectoFicha onElegir={(p) => ...} tipoActual="edificacion" />
// p = { nombre, contrato, contratista, ubicacion, tipo, datos }
import React, { useState } from "react";

const NAVY = "#1B2A45", LINE = "#D9DCE1";
const NOMBRES_TIPO = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };

export function tipoDeProyecto(datos) {
  const m = (datos && datos.modulos) || {};
  return m.vias ? "vias" : m.hidrocarburos ? "hidrocarburos" : "edificacion";
}
export function listarProyectosFicha() {
  try {
    const l = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
    return (Array.isArray(l) ? l : []).filter((p) => p && p.nombreId && p.datos).map((p) => ({
      nombre: p.datos.proyecto || p.nombreId, contrato: p.datos.noContrato || "", contratista: p.datos.contratista || "", ubicacion: p.datos.ubicacion || "",
      tipo: tipoDeProyecto(p.datos), datos: p.datos,
    }));
  } catch (e) { return []; }
}

export default function TraerProyectoFicha({ onElegir, tipoActual, etiqueta = "📋 Traer proyecto desde la Ficha Técnica" }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState("");
  const lista = abierto ? listarProyectosFicha() : [];
  function elegir(p) {
    setAbierto(false);
    setAviso(tipoActual && p.tipo !== tipoActual ? `Ojo: «${p.nombre}» es de ${NOMBRES_TIPO[p.tipo]} y este formulario está en ${NOMBRES_TIPO[tipoActual]}. Se trajeron los datos generales; el catálogo no cambia.` : `Datos traídos de «${p.nombre}».`);
    onElegir(p);
  }
  return (
    <div>
      <button type="button" data-traer-proyecto onClick={() => { setAbierto(true); setAviso(""); }} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>{etiqueta}</button>
      {aviso && <div data-aviso-proyecto className="text-[11px] mt-1.5 px-2 py-1 rounded" style={{ background: "#FFF8E8", color: NAVY }}>{aviso}</div>}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} role="dialog" aria-modal="true" aria-label="Elegir proyecto" data-modal-proyectos>
          <div className="bg-white rounded-xl p-4 max-w-sm w-full text-left" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className="text-[14px] font-bold mb-2" style={{ color: NAVY }}>Elige el proyecto</div>
            {lista.length === 0 ? (
              <div className="text-[12px] text-gray-500 mb-3">Todavía no hay proyectos. Se crean solos al llenar la Ficha Técnica (Gestión Técnica → Ficha Técnica → Proyecto Nuevo).</div>
            ) : lista.map((p, i) => (
              <button key={i} type="button" data-proyecto-opcion onClick={() => elegir(p)} className="w-full text-left px-3 py-2.5 mb-1.5 rounded-lg border bg-white" style={{ borderColor: LINE }}>
                <div className="text-[12.5px] font-semibold" style={{ color: NAVY }}>{p.nombre}</div>
                <div className="text-[10.5px] text-gray-500">{NOMBRES_TIPO[p.tipo]}{p.contrato ? ` · Contrato ${p.contrato}` : ""}{p.ubicacion ? ` · ${p.ubicacion}` : ""}</div>
              </button>
            ))}
            <button type="button" onClick={() => setAbierto(false)} className="w-full py-2 rounded-lg border text-[13px] mt-1" style={{ borderColor: LINE, color: NAVY }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
