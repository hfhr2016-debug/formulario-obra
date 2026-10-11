import React, { useState } from "react";

const NAVY = "#1B2A45";
const LINE = "#D9DCE1";
const ROJO = "#B3401F";

// Reiniciar la app (borrar datos de prueba). Siempre pide confirmar o cancelar antes de borrar.
// Recibe las acciones desde afuera: onLimpiarEquipo() y onLimpiarTodos() (async; si lanzan error, no se borra nada).
export default function ReinicioApp({ onLimpiarEquipo, onLimpiarTodos, recargar = () => window.location.reload() }) {
  const [pide, setPide] = useState(null);       // "equipo" | "todos" | null
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");

  const confirmar = async () => {
    setTrabajando(true); setError("");
    try {
      if (pide === "todos") await onLimpiarTodos(); else await onLimpiarEquipo();
      setHecho(pide === "todos" ? "Listo. Este equipo quedó limpio y los demás se limpiarán la próxima vez que abran la app con internet." : "Listo. Este equipo quedó limpio.");
      setPide(null);
      setTimeout(recargar, 1500);
    } catch (e) {
      setError(pide === "todos" ? "No se pudo enviar la orden a los demás equipos (¿están al día las reglas de Firestore y hay internet?). No se borró nada." : "No se pudo borrar. No se cambió nada.");
      setPide(null);
    }
    setTrabajando(false);
  };

  return (
    <div className="mt-6 rounded-xl p-3" style={{ border: `1px solid ${LINE}`, background: "#fff" }} data-reinicio>
      <div className="text-[13.5px] font-bold" style={{ color: NAVY }}>🧹 Reiniciar la app (borrar datos de prueba)</div>
      <div className="text-[11.5px] mt-1" style={{ color: "#6B7280" }}>
        Borra borradores, consecutivos e historial guardados en el equipo. No borra usuarios, formularios ni plantillas, y no cierra la sesión.
        Los datos que están en la nube (Firebase) se borran aparte desde su consola; si no se borran allí, vuelven a bajar al sincronizar.
      </div>
      <div className="flex gap-2 mt-3">
        <button type="button" data-limpiar-equipo onClick={() => { setPide("equipo"); setHecho(""); setError(""); }} className="flex-1 py-2 rounded-lg border text-[12.5px] font-semibold" style={{ borderColor: ROJO, color: ROJO }}>Limpiar este equipo</button>
        <button type="button" data-limpiar-todos onClick={() => { setPide("todos"); setHecho(""); setError(""); }} className="flex-1 py-2 rounded-lg border text-[12.5px] font-semibold" style={{ borderColor: ROJO, color: ROJO }}>Limpiar todos los equipos</button>
      </div>
      {hecho && <div className="mt-2 text-[12px]" style={{ color: "#1B7A3E" }} role="status">{hecho}</div>}
      {error && <div className="mt-2 text-[12px]" style={{ color: ROJO }} role="alert">{error}</div>}

      {pide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} role="dialog" aria-modal="true" aria-label="Confirmar borrado">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <div className="text-[14px] font-bold" style={{ color: ROJO }}>{pide === "todos" ? "¿Limpiar TODOS los equipos?" : "¿Limpiar este equipo?"}</div>
            <div className="text-[12.5px] mt-2" style={{ color: NAVY }}>
              {pide === "todos"
                ? "Se borrarán los datos guardados en este equipo y en cada equipo que abra la app (tu PC, celulares, etc.), incluido lo que esté sin sincronizar. Esto no se puede deshacer."
                : "Se borrarán los datos guardados en este equipo, incluido lo que esté sin sincronizar. Esto no se puede deshacer."}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" data-cancelar onClick={() => setPide(null)} disabled={trabajando} className="flex-1 py-2 rounded-lg border text-[13px]" style={{ borderColor: LINE, color: NAVY }}>Cancelar</button>
              <button type="button" data-confirmar onClick={confirmar} disabled={trabajando} className="flex-1 py-2 rounded-lg text-white font-bold text-[13px]" style={{ background: ROJO }}>{trabajando ? "Borrando…" : "Confirmar y borrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enlace pequeño para CUALQUIER usuario: limpia solo el equipo en el que está. Pide Confirmar o Cancelar antes de borrar.
export function LimpiarEquipoEnlace({ onLimpiarEquipo, recargar = () => window.location.reload(), className = "", style }) {
  const [abierto, setAbierto] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const confirmar = async () => {
    setTrabajando(true); setError("");
    try { await onLimpiarEquipo(); setAbierto(false); recargar(); } catch (e) { setError("No se pudo borrar. No se cambió nada."); }
    setTrabajando(false);
  };
  return (
    <>
      <button type="button" data-limpiar-equipo-enlace onClick={() => { setAbierto(true); setError(""); }} className={className} style={style}>Limpiar este equipo</button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} role="dialog" aria-modal="true" aria-label="Confirmar borrado">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full text-left">
            <div className="text-[14px] font-bold" style={{ color: ROJO }}>¿Limpiar este equipo?</div>
            <div className="text-[12.5px] mt-2" style={{ color: NAVY }}>
              Se borrarán los borradores, consecutivos e historial guardados en este equipo, incluido lo que aún no se haya sincronizado. Lo que ya está en la nube volverá a bajar. No cierra tu sesión y no afecta a los demás equipos. Esto no se puede deshacer.
            </div>
            {error && <div className="mt-2 text-[12px]" style={{ color: ROJO }} role="alert">{error}</div>}
            <div className="flex gap-2 mt-4">
              <button type="button" data-cancelar onClick={() => setAbierto(false)} disabled={trabajando} className="flex-1 py-2 rounded-lg border text-[13px]" style={{ borderColor: LINE, color: NAVY }}>Cancelar</button>
              <button type="button" data-confirmar onClick={confirmar} disabled={trabajando} className="flex-1 py-2 rounded-lg text-white font-bold text-[13px]" style={{ background: ROJO }}>{trabajando ? "Borrando…" : "Confirmar y borrar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
