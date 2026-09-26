import React from "react";

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

export function BotonMenu({ onClick }) {
  return (
    <button onClick={onClick} className="text-white/90 p-1" aria-label="Abrir menú de módulos">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

export default function MenuLateral({ abierto, onCerrar, onNavegar, vistaActual }) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative w-[78%] max-w-[300px] h-full bg-white shadow-xl overflow-y-auto">
        <div className="px-4 py-4 flex items-center justify-between" style={{ background: NAVY }}>
          <div className="text-white font-bold text-[14px]">Módulos SAIEA OBRAS</div>
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
        </div>
      </div>
    </div>
  );
}
