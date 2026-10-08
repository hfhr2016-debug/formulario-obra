// sstNavegacion.jsx — menú lateral para pasar de un formulario de Gestión SG-SST a otro (igual al de Gestión Técnica).
// La app (App.jsx) envuelve las pantallas de SST con <ContextoSST.Provider value={...}>. Los formularios no necesitan recibir nada:
// el botón ☰ del encabezado lee ese contexto. Si no hay contexto (p. ej. en pruebas aisladas), el botón simplemente no aparece.
import { createContext, useContext, useState } from "react";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const LINE = "#D9DCE1";

// value = { modulos: [{ id, nombre, icono, emoji }], vistaActual, ir(id), irInicio(), irSelector(), nombreUsuario?, cerrarSesion? }
export const ContextoSST = createContext(null);
export const useNavegacionSST = () => useContext(ContextoSST);

export function BotonMenuSST({ color }) {
  const nav = useNavegacionSST();
  const [abierto, setAbierto] = useState(false);
  if (!nav) return null;
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="p-1" style={{ color: color || "rgba(255,255,255,0.9)" }} aria-label="Abrir menú de formularios">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {abierto && <MenuLateralSST nav={nav} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function MenuLateralSST({ nav, onCerrar }) {
  const ir = (fn) => () => { onCerrar(); fn(); };
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-label={`Menú de formularios de ${nav.titulo || "Gestión SG-SST"}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative w-[78%] max-w-[300px] h-full bg-white shadow-xl overflow-y-auto">
        <div className="px-4 py-4 flex items-center justify-between" style={{ background: NAVY }}>
          <div>
            <div className="text-white font-bold text-[14px]">{nav.titulo || "Gestión SG – SST"}</div>
            {nav.nombreUsuario && <div className="text-[10.5px] mt-0.5" style={{ color: GOLD }}>{nav.nombreUsuario}</div>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar menú" className="text-white/80 text-[20px] leading-none">✕</button>
        </div>
        <div className="p-2">
          {nav.modulos.map((m) => {
            const aqui = nav.vistaActual === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={ir(() => nav.ir(m.id))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left"
                style={aqui ? { background: "#FFF8E8" } : { background: "white" }}
              >
                {m.icono ? <img src={m.icono} alt="" className="w-[34px] h-[34px] object-contain shrink-0" /> : <span className="text-[24px] w-[34px] text-center shrink-0">{m.emoji}</span>}
                <span className="text-[13px] font-medium" style={{ color: NAVY }}>{m.nombre}</span>
                {aqui && <span className="ml-auto text-[10px]" style={{ color: GOLD }}>● aquí</span>}
              </button>
            );
          })}
          <div className="border-t mt-2 pt-2" style={{ borderColor: LINE }}>
            <button type="button" onClick={ir(nav.irInicio)} className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold" style={{ color: NAVY }}>
              🏠 Inicio de {nav.titulo || "Gestión SG – SST"}
            </button>
            <button type="button" onClick={ir(nav.irSelector)} className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold" style={{ color: NAVY }}>
              🔄 Cambiar de sistema ({nav.otrosSistemas || "Técnica / Ambiental"})
            </button>
          </div>
          {nav.cerrarSesion && (
            <div className="border-t mt-2 pt-2" style={{ borderColor: LINE }}>
              <button type="button" onClick={ir(nav.cerrarSesion)} className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-semibold" style={{ color: "#B42318" }}>
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
