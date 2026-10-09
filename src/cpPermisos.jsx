// Permisos por cargo dentro de Control Presupuestal.
// E = ve y edita · V = solo consulta · ausente = no lo ve. El administrador (esAdmin) siempre edita todo.
import { useEffect, useRef } from "react";

export const ROLES_CP = [
  { id: "gerente", nombre: "Gerente" },
  { id: "director", nombre: "Director de obra" },
  { id: "residente", nombre: "Residente" },
  { id: "administrativo", nombre: "Administrativo / Contador" },
  { id: "almacenista", nombre: "Almacenista" },
];

// Filas = módulos del menú; columnas = cargos. Para cambiar un permiso, edita solo esta tabla.
export const MATRIZ_CP = {
  "cp-costos":       { gerente: "E", director: "E", residente: "E", administrativo: "E" },
  "cp-control":      { gerente: "E", director: "E", residente: "V", administrativo: "V" },
  "cp-adicionales":  { gerente: "E", director: "E", residente: "E", administrativo: "V" },
  "cp-anticipo":     { gerente: "E", director: "V", administrativo: "E" },
  "cp-materiales":   { gerente: "E", director: "E", residente: "E", administrativo: "V", almacenista: "E" },
  "cp-mano-obra":    { gerente: "E", director: "E", residente: "E", administrativo: "V" },
  "cp-equipos":      { gerente: "E", director: "E", residente: "E", administrativo: "V" },
  "cp-cuentas":      { gerente: "E", director: "V", administrativo: "E" },
  // Cifras financieras restringidas
  "cp-flujo":        { gerente: "E", director: "V", administrativo: "E" },
  "cp-rentabilidad": { gerente: "E", director: "V", administrativo: "V" },
  "cp-cierre":       { gerente: "E", director: "V", administrativo: "V" },
};

// Devuelve "E", "V" o null (sin acceso) para un módulo.
export function nivelCP(perfil, moduloId) {
  if (!perfil) return null;
  if (perfil.esAdmin) return "E";
  if (!(perfil.roles || []).includes("presupuesto")) return null;
  const fila = MATRIZ_CP[moduloId];
  return (fila && fila[perfil.rolCP]) || null;
}

// Envuelve un formulario en modo consulta: se puede mirar y abrir secciones, pero no cambiar nada ni generar Excel.
export function SoloLectura({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return undefined;
    const bloquear = () => {
      raiz.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.dataset.lectura) return;
        el.dataset.lectura = "1";
        if (el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT") el.disabled = true; else el.readOnly = true;
      });
    };
    bloquear();
    const obs = new MutationObserver(bloquear);
    obs.observe(raiz, { childList: true, subtree: true });
    // Los botones solo funcionan si son de navegación: encabezado, secciones, elegir una obra ya guardada.
    const alClic = (e) => {
      const b = e.target.closest && e.target.closest("button");
      if (!b || !raiz.contains(b)) return;
      if (b.closest("[data-libre]") || b.hasAttribute("data-seccion") || (b.textContent || "").trim().startsWith("📋")) return;
      e.preventDefault(); e.stopPropagation();
    };
    raiz.addEventListener("click", alClic, true);
    return () => { obs.disconnect(); raiz.removeEventListener("click", alClic, true); };
  }, []);
  return (
    <div ref={ref} data-solo-lectura>
      <style>{"[data-solo-lectura] [data-barra-generar]{display:none}"}</style>
      <div className="text-center text-[11px] font-semibold py-1.5" style={{ background: "#FFF4DB", color: "#8A5A00" }}>Solo consulta: tu cargo puede ver este formato pero no modificarlo.</div>
      {children}
    </div>
  );
}

export function SinAcceso({ onVolver }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: "#F4F1EA" }}>
      <div>
        <div className="text-[14px] font-semibold mb-2" style={{ color: "#0F2A47" }}>No tienes acceso a este formato</div>
        <div className="text-[12px] mb-4" style={{ color: "#8A8F99" }}>Si crees que deberías verlo, pídele al administrador que revise tu cargo.</div>
        <button type="button" onClick={onVolver} className="text-[12px] underline" style={{ color: "#0F2A47" }}>Volver</button>
      </div>
    </div>
  );
}
