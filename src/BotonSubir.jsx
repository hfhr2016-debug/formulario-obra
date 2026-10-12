import { useEffect, useRef, useState } from "react";

// Botón flotante «Ir al inicio»: aparece en cualquier pantalla cuando se ha bajado un buen trecho y lleva de vuelta arriba.
// Escucha el desplazamiento de la página y de cualquier zona con scroll propio (captura), así sirve en todos los formularios.
const UMBRAL = 350;

function subirA(el) {
  try { el.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { el.scrollTop = 0; }
}

export default function BotonSubir() {
  const [visible, setVisible] = useState(false);
  const objetivo = useRef(null);

  useEffect(() => {
    const alDesplazar = (ev) => {
      const t = ev.target;
      const el = t === document || t === window || !t || t.nodeType === 9 ? (document.scrollingElement || document.documentElement) : t;
      if (!el || typeof el.scrollTop !== "number") return;
      if (el.scrollTop > UMBRAL) { objetivo.current = el; setVisible(true); }
      else if (objetivo.current === el || !objetivo.current) { objetivo.current = null; setVisible(false); }
    };
    document.addEventListener("scroll", alDesplazar, true);
    return () => document.removeEventListener("scroll", alDesplazar, true);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      data-boton-subir
      aria-label="Ir al inicio del formulario"
      onClick={() => { const el = objetivo.current || document.scrollingElement || document.documentElement; subirA(el); if (el !== document.scrollingElement) subirA(document.scrollingElement || document.documentElement); }}
      className="fixed z-40 flex items-center gap-1 rounded-full shadow-lg text-[12px] font-semibold px-3 py-2 print:hidden"
      style={{ right: 12, bottom: 84, background: "#1B2A45", color: "white", border: "1px solid rgba(255,255,255,0.35)" }}
    >
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>↑</span> Ir al inicio
    </button>
  );
}
