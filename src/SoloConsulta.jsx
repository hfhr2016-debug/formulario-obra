// Modo «solo consulta» para cualquier formulario: se puede mirar y navegar, pero no escribir, guardar, generar ni borrar.
// (Control Presupuestal usa su propia versión en cpPermisos.jsx.)
import { useEffect, useRef } from "react";

// Botones que cambian algo: se bloquean. Todo lo demás (abrir secciones, volver, el menú, elegir un registro para verlo) sigue funcionando.
const MODIFICA = /(generar|descargar|guardar|eliminar|borrar|quitar|agregar|a[ñn]adir|nuevo|nueva|limpiar|vaciar|traer|importar|cargar|duplicar|copiar|firmar|subir|tomar foto|adjuntar|emitir|reabrir|cambiar numeraci|continuar numeraci|restaurar|descartar|\+|🗑|✕|🔄)/i;

export function SoloConsulta({ children, aviso = "Solo consulta: tu cargo puede ver este formato pero no modificarlo." }) {
  const ref = useRef(null);
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return undefined;
    const bloquear = () => {
      raiz.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.dataset.lectura || el.closest("[data-libre-lectura]")) return;
        el.dataset.lectura = "1";
        if (el.type === "checkbox" || el.type === "radio" || el.type === "file" || el.tagName === "SELECT") el.disabled = true; else el.readOnly = true;
      });
      raiz.querySelectorAll("[contenteditable='true']").forEach((el) => el.setAttribute("contenteditable", "false"));
    };
    bloquear();
    const obs = new MutationObserver(bloquear);
    obs.observe(raiz, { childList: true, subtree: true });
    const alClic = (e) => {
      const b = e.target.closest && e.target.closest("button, [role='button'], label[for]");
      if (!b || !raiz.contains(b) || b.closest("[data-libre-lectura]")) return;
      const txt = `${b.textContent || ""} ${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""}`;
      if (b.hasAttribute("data-modifica") || MODIFICA.test(txt)) { e.preventDefault(); e.stopPropagation(); }
    };
    raiz.addEventListener("click", alClic, true);
    return () => { obs.disconnect(); raiz.removeEventListener("click", alClic, true); };
  }, []);
  return (
    <div ref={ref} data-solo-lectura data-solo-consulta>
      <style>{"[data-solo-consulta] [data-barra-generar]{display:none}"}</style>
      <div className="text-center text-[11px] font-semibold py-1.5" style={{ background: "#FFF4DB", color: "#8A5A00" }}>{aviso}</div>
      {children}
    </div>
  );
}
