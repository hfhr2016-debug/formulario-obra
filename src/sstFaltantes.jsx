// sstFaltantes.jsx — cuando falta un dato para generar el formato, además de decir cuál es, MARCA la casilla en rojo,
// abre la sección donde está y la muestra en pantalla. Al tocar una casilla marcada, su color desaparece.
// Las casillas se reconocen por su nombre (atributo data-campo, que ponen Campo, Lista, BuscadorLista, AreaTexto, etc.).
import { useEffect, useRef, useState } from "react";

const ROJO = "#E53935";
const CSS = `
.sst-falta { outline: 2px solid ${ROJO}; outline-offset: 3px; border-radius: 8px; background: #FFEBEE; }
.sst-falta label, .sst-falta > span { color: #C62828 !important; font-weight: 700 !important; }
.sst-falta input, .sst-falta select, .sst-falta textarea { border-color: ${ROJO} !important; background: #FFF5F5 !important; }
.sst-falta::before { content: "Falta este dato"; display: block; font-size: 10px; font-weight: 700; color: #C62828; margin-bottom: 2px; }
.sst-seccion-falta { box-shadow: inset 4px 0 0 ${ROJO}; background: #FFF5F5; }
.sst-seccion-falta::after { content: "● Falta completar"; position: absolute; right: 34px; font-size: 10.5px; font-weight: 700; color: #C62828; }
`;
function inyectarEstilo() {
  if (typeof document === "undefined" || document.getElementById("sst-falta-css")) return;
  const s = document.createElement("style"); s.id = "sst-falta-css"; s.textContent = CSS; document.head.appendChild(s);
}
const esc = (t) => String(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
export const claveFalta = (it) => `${it.etiqueta}#${it.indice || 0}`;

// Pinta lo que sigue faltando: las casillas (data-campo) y el título de su sección (data-seccion)
function aplicar(items) {
  if (typeof document === "undefined") return null;
  document.querySelectorAll(".sst-falta").forEach((e) => e.classList.remove("sst-falta"));
  document.querySelectorAll(".sst-seccion-falta").forEach((e) => e.classList.remove("sst-seccion-falta"));
  let primero = null;
  for (const it of items) {
    const el = document.querySelectorAll(`[data-campo="${esc(it.etiqueta)}"]`)[it.indice || 0];
    if (el) { el.classList.add("sst-falta"); if (!primero) primero = el; }
    if (it.seccion) { const b = document.querySelector(`[data-seccion="${esc(it.seccion)}"]`); if (b) b.classList.add("sst-seccion-falta"); }
  }
  return primero;
}

// items: [{ etiqueta, indice?, seccion }]. marcar(items) los resalta, abre la primera sección con faltantes y se desplaza hasta la primera casilla.
export function useFaltantes(setAbierta) {
  const [items, setItems] = useState([]);
  const irAlPrimero = useRef(false);
  useEffect(inyectarEstilo, []);
  useEffect(() => {                      // tras cada dibujo: vuelve a pintar lo que siga faltando (las secciones se cierran y se abren)
    const primero = aplicar(items);
    if (irAlPrimero.current && primero) { irAlPrimero.current = false; try { primero.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* sin desplazamiento */ } }
  });
  useEffect(() => {                      // al tocar o escribir en una casilla marcada, deja de marcarse
    const alTocar = (e) => {
      const el = e.target && e.target.closest ? e.target.closest("[data-campo]") : null;
      if (!el || !el.classList.contains("sst-falta")) return;
      const etiqueta = el.getAttribute("data-campo");
      const mismas = Array.from(document.querySelectorAll(`[data-campo="${esc(etiqueta)}"]`));
      const indice = mismas.indexOf(el);
      el.classList.remove("sst-falta");     // el color se quita ya; el estado se actualiza DESPUÉS de que React guarde lo escrito
      // (si se actualizara aquí, en la fase de captura, React volvería a dibujar el campo con su valor viejo y se perdería la tecla)
      setTimeout(() => setItems((cur) => { const sig = cur.filter((x) => !(x.etiqueta === etiqueta && (x.indice || 0) === indice)); return sig.length === cur.length ? cur : sig; }), 0);
    };
    ["input", "change", "click"].forEach((t) => document.addEventListener(t, alTocar, true));
    return () => ["input", "change", "click"].forEach((t) => document.removeEventListener(t, alTocar, true));
  }, []);
  return {
    faltan: items,
    marcar: (lista) => {
      setItems(lista);
      const sec = (lista.find((x) => x.seccion) || {}).seccion;
      if (sec && setAbierta) setAbierta(sec);
      irAlPrimero.current = true;
    },
    limpiar: () => setItems([]),
  };
}
