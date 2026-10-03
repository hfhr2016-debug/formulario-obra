import React from "react";
import { useAuth } from "./AuthContext";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const LINE = "#D9DCE1";

const MODULOS_MENU = [
  { id: "ficha", nombre: "Ficha Técnica", icono: "/icons/icon-ficha-tecnica.png" },
  { id: "apus", nombre: "APU's", icono: "/icons/icon-apus.png" },
  { id: "presupuesto", nombre: "Presupuesto", icono: "/icons/icon-presupuesto.png" },
  { id: "cronograma", nombre: "Cronograma", icono: "/icons/icon-cronograma.png" },
  { id: "cantidades", nombre: "Cantidades de Obra", icono: "/icons/icon-cantidades.png" },
  { id: "diario", nombre: "Informe Diario", icono: "/icons/icon-informe-diario.png" },
  { id: "semanal", nombre: "Informe Semanal", icono: "/icons/icon-informe-semanal.png" },
  { id: "mensual", nombre: "Informe Mensual", icono: "/icons/icon-informe-mensual.png" },
  { id: "memorias", nombre: "Memorias de Cálculo", icono: "/icons/icon-memorias.png" },
  { id: "acta", nombre: "Acta de Obra", icono: "/icons/icon-acta.png" },
];

export function BotonMenu({ onClick, color }) {
  return (
    <button onClick={onClick} className="p-1" style={{ color: color || "rgba(255,255,255,0.9)" }} aria-label="Abrir menú de módulos">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

export default function MenuLateral({ abierto, onCerrar, onNavegar, vistaActual }) {
  const sesion = useAuth();
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative w-[78%] max-w-[300px] h-full bg-white shadow-xl overflow-y-auto">
        <div className="px-4 py-4 flex items-center justify-between" style={{ background: NAVY }}>
          <div>
            <div className="text-white font-bold text-[14px]">Módulos SAIEA OBRAS</div>
            {sesion?.perfil && (
              <div className="text-[10.5px] mt-0.5" style={{ color: GOLD }}>{sesion.perfil.nombre || sesion.perfil.correo}</div>
            )}
          </div>
          <button onClick={onCerrar} className="text-white/80 text-[20px] leading-none">✕</button>
        </div>
        <div className="p-2">
          {MODULOS_MENU.map((m) => (
            <button
              key={m.id}
              onClick={() => { onNavegar(m.id); onCerrar(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left"
              style={vistaActual === m.id ? { background: "#FFF8E8" } : { background: "white" }}
            >
              <img src={m.icono} alt="" className="w-[34px] h-[34px] object-contain shrink-0" />
              <span className="text-[13px] font-medium" style={{ color: NAVY }}>{m.nombre}</span>
              {vistaActual === m.id && <span className="ml-auto text-[10px]" style={{ color: GOLD }}>● aquí</span>}
            </button>
          ))}
          <div className="border-t mt-2 pt-2" style={{ borderColor: LINE }}>
            <button
              onClick={() => { onNavegar("inicio"); onCerrar(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold"
              style={{ color: NAVY }}
            >
              🏠 Menú principal (portal completo)
            </button>
            <button
              onClick={() => { onNavegar("selector-apps"); onCerrar(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold"
              style={{ color: NAVY }}
            >
              🔄 Cambiar de sistema (SST / Ambiental)
            </button>
          </div>
          {sesion?.cerrarSesion && (
            <div className="border-t mt-2 pt-2" style={{ borderColor: LINE }}>
              <button
                onClick={() => { onCerrar(); sesion.cerrarSesion(); }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold"
                style={{ color: "#B42318" }}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function tipoProyectoActivo() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    const modulos = datos?.modulos || {};
    if (modulos.vias) return "vias";
    if (modulos.hidrocarburos) return "hidrocarburos";
  } catch (e) {}
  return "edificacion";
}

export function IndicadorTipoProyecto({ claveBorrador, clavesExtra }) {
  const [tipo, setTipo] = React.useState(() => tipoProyectoActivo());
  const [abierto, setAbierto] = React.useState(false);
  const nombres = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };

  function elegir(nuevoTipo) {
    setAbierto(false);
    if (nuevoTipo === tipo) return;
    const ok = window.confirm(
      `¿Cambiar a "${nombres[nuevoTipo]}"? Se perderán los datos de "${nombres[tipo]}" que hayas escrito en este formulario (no se puede deshacer).`
    );
    if (!ok) return;
    try {
      localStorage.setItem("ryr_tipo_proyecto", JSON.stringify({
        modulos: { edificacion: nuevoTipo === "edificacion", vias: nuevoTipo === "vias", hidrocarburos: nuevoTipo === "hidrocarburos" },
        hcBloques: { civil: false, mecanico: false, electrico: false },
        hcElementos: {}, proyecto: "",
      }));
      if (claveBorrador) localStorage.removeItem(claveBorrador);
      (clavesExtra || []).forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    window.location.reload();
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
        style={{ background: "rgba(217,162,51,0.18)", color: "#D9A233", border: "none" }}
      >
        {nombres[tipo]}
        <span style={{ fontSize: 8 }}>▾</span>
      </button>
      {abierto && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setAbierto(false)} style={{ display: "block" }} />
          <span
            className="absolute z-40 mt-1 left-0 rounded-lg shadow-lg border overflow-hidden"
            style={{ background: "white", borderColor: LINE, minWidth: 190, display: "block" }}
          >
            {Object.entries(nombres).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => elegir(key)}
                className="w-full text-left px-3 py-2 text-[12px] block"
                style={{
                  color: key === tipo ? GOLD : NAVY,
                  fontWeight: key === tipo ? 700 : 400,
                  background: key === tipo ? "rgba(217,162,51,0.08)" : "white",
                  border: "none",
                }}
              >
                {key === tipo ? "● " : ""}{label}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
