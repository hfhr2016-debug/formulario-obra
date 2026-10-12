// Corrección ortográfica en todos los formularios.
// Marca los campos de texto como español con revisión ortográfica y autocorrección activadas (el navegador subraya en rojo las
// palabras mal escritas y propone la correcta; en el celular, el teclado las corrige solo). Se aplica también a los campos que
// aparecen después (secciones que se abren, filas que se agregan) con un observador.
import { corregirPalabra, corregirTexto, palabraAntesDe } from "./autocorreccion";
const NO_TEXTO = new Set(["numeric", "decimal", "tel", "email", "url"]);

export function marcarOrtografia(el) {
  try {
    if (!el || el.__ortografia) return;
    const tag = el.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA") return;
    if (el.hasAttribute("data-sin-ortografia")) return;
    if (tag === "INPUT") {
      const tipo = (el.getAttribute("type") || "text").toLowerCase();
      if (tipo !== "text" && tipo !== "search") return;
      if (NO_TEXTO.has((el.getAttribute("inputmode") || "").toLowerCase())) return;
    }
    el.__ortografia = true;
    el.setAttribute("lang", "es");
    el.setAttribute("spellcheck", "true");
    el.setAttribute("autocorrect", "on");
    if (!el.hasAttribute("autocapitalize")) el.setAttribute("autocapitalize", "sentences");
  } catch (e) { /* un campo que no se pueda marcar no debe romper nada */ }
}


// ---------- Autocorrección: arregla sola las tildes y la «ñ» de palabras sin duda (ver autocorreccion.js) ----------
// En campos de nombres de personas, cargos, códigos, direcciones, etc. solo se arreglan tildes y ñ, nunca letras (podrían ser nombres propios)
const RE_NOMBRE = /nombre(?!\s+(del|de la|de el)\s+(proyecto|obra|contrato|empresa|actividad|equipo|formato|documento|material|sitio|lugar|frente))|operador|responsable|apellido|firma|elabor|revis[oó]|aprob[oó]|contratista|propietario|ingenier|residente|director|interventor|c[eé]dula|\bnit\b|correo|email|direcci|c[oó]digo|placa|referencia|cliente|conductor|supervisor|inspector|gerente|representante|encargado|cargo|\bserie\b/i;
function opcionesDe(el) {
  try {
    if (el.__opc) return el.__opc;
    const txt = [el.getAttribute("placeholder"), el.getAttribute("aria-label"), el.getAttribute("name"), el.id,
      el.parentElement && el.parentElement.querySelector(":scope > label") && el.parentElement.querySelector(":scope > label").textContent,
      el.closest("td") && (el.closest("table") && el.closest("table").querySelectorAll("th")[el.closest("td").cellIndex] || {}).textContent].filter(Boolean).join(" ");
    return (el.__opc = { fonetica: !RE_NOMBRE.test(txt) });
  } catch (e) { return { fonetica: false }; }
}
const BORDES = new Set([" ", ".", ",", ";", ":", ")", "?", "!", "\n"]);
function cambiarTexto(el, ini, fin, nuevo, enfocado = true) {
  // Al escribir se usa execCommand, que conserva «Deshacer» (Ctrl+Z) y avisa a React. Al salir de la casilla NO se enfoca de nuevo
  // (se escribe a mano y se avisa); tampoco si el navegador no permite execCommand.
  if (enfocado) { try { el.setSelectionRange(ini, fin); if (document.execCommand && document.execCommand("insertText", false, nuevo)) return true; } catch (e) {} }
  try { el.setRangeText(nuevo, ini, fin, "end"); el.dispatchEvent(new Event("input", { bubbles: true })); return true; } catch (e) { return false; }
}
function alEscribir(ev) {
  try {
    const el = ev.target;
    if (!el || !el.__ortografia || !ev.isTrusted) return;
    el.__editado = true;
    if (ev.isComposing || ev.inputType !== "insertText" && ev.inputType !== "insertLineBreak") return;
    const tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    if (tactil) return;                                   // en el celular el teclado compone el texto: se corrige al salir de la casilla
    const borde = ev.inputType === "insertLineBreak" ? "\n" : ev.data;
    if (!borde || !BORDES.has(borde)) return;
    const pos = el.selectionStart; if (pos == null) return;
    const w = palabraAntesDe(el.value.slice(0, pos - 1), pos - 1); if (!w) return;
    const c = corregirPalabra(w.palabra, opcionesDe(el)); if (!c || c === w.palabra) return;
    const ant = el.value[w.ini - 1];
    if (ant && /[0-9_@\/\\#.\-]/.test(ant)) return;
    const desp = pos;                                      // el cursor queda después del borde escrito
    if (cambiarTexto(el, w.ini, w.fin, c)) { try { el.setSelectionRange(desp + (c.length - w.palabra.length), desp + (c.length - w.palabra.length)); } catch (e) {} }
  } catch (e) { /* la autocorrección nunca debe romper la escritura */ }
}
function alSalir(ev) {
  try {
    const el = ev.target;
    if (!el || !el.__ortografia || !el.__editado) return;
    el.__editado = false;
    const { texto, cambios } = corregirTexto(el.value, opcionesDe(el));
    if (cambios > 0 && texto !== el.value) cambiarTexto(el, 0, el.value.length, texto, false);
  } catch (e) {}
}

export function activarOrtografia(raiz = document) {
  try { document.documentElement.setAttribute("lang", "es"); } catch (e) {}
  const pasar = (nodo) => {
    if (!nodo || nodo.nodeType !== 1) return;
    marcarOrtografia(nodo);
    if (nodo.querySelectorAll) nodo.querySelectorAll("input, textarea").forEach(marcarOrtografia);
  };
  pasar(raiz.body || raiz);
  document.addEventListener("input", alEscribir, true);
  document.addEventListener("focusout", alSalir, true);
  const quitar = () => { document.removeEventListener("input", alEscribir, true); document.removeEventListener("focusout", alSalir, true); };
  if (typeof MutationObserver === "undefined") return quitar;
  const obs = new MutationObserver((lista) => { for (const m of lista) m.addedNodes.forEach(pasar); });
  obs.observe(raiz.body || raiz, { childList: true, subtree: true });
  return () => { obs.disconnect(); quitar(); };
}
