// Corrección ortográfica en todos los formularios.
// Marca los campos de texto como español con revisión ortográfica y autocorrección activadas (el navegador subraya en rojo las
// palabras mal escritas y propone la correcta; en el celular, el teclado las corrige solo). Se aplica también a los campos que
// aparecen después (secciones que se abren, filas que se agregan) con un observador.
import { corregirPalabraEn, corregirTexto, palabraAntesDe } from "./autocorreccion";
const NO_TEXTO = new Set(["numeric", "decimal", "tel", "email", "url"]);

function esTactil() { try { return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } }

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
    if (esTactil()) {
      // Celular: se apaga la autocorrección del teclado (cambiaba «pasifico» por cosas como «pasi to» y chocaba con la de la app);
      // la app corrige al salir de la casilla. La mayúscula la pide el teclado según el tipo de campo.
      el.setAttribute("spellcheck", "false");
      el.setAttribute("autocorrect", "off");
      el.setAttribute("autocomplete", "off");
      const o = opcionesDe(el);
      el.setAttribute("autocapitalize", o.persona ? "words" : o.inicial === false ? "none" : "sentences");
    }
  } catch (e) { /* un campo que no se pueda marcar no debe romper nada */ }
}


// ---------- Autocorrección: arregla sola las tildes y la «ñ» de palabras sin duda (ver autocorreccion.js) ----------
// En campos de nombres de personas, cargos, códigos, direcciones, etc. solo se arreglan tildes y ñ, nunca letras (podrían ser nombres propios)
const RE_NOMBRE = /nombre(?!\s+(del|de la|de el)\s+(proyecto|obra|contrato|empresa|actividad|equipo|formato|documento|material|sitio|lugar|frente))|operador|responsable|apellido|firma|elabor|revis[oó]|aprob[oó]|contratista|propietario|ingenier|residente|director|interventor|c[eé]dula|\bnit\b|correo|email|direcci|c[oó]digo|placa|referencia|cliente|conductor|supervisor|inspector|gerente|representante|encargado|cargo|\bserie\b/i;
const RE_PERSONA = /nombre(?!\s+(del|de la|de el)\s+(proyecto|obra|contrato|empresa|actividad|equipo|formato|documento|material|sitio|lugar|frente))|operador|responsable|apellido|elabor|revis[oó]|aprob[oó]|residente|director|interventor|conductor|supervisor|inspector|gerente|representante|encargado|propietario/i;
const RE_SIN_MAYUS = /placa|c[oó]digo|referencia|\bserie\b|correo|email|\bnit\b|c[eé]dula|\burl\b|usuario|contrase|\bund\b|unidad|\bum\b|medida|n[uú]mero|n°|\bhora\b|fecha|\bpin\b|plano|\bitem\b|\bcap[ií]tulo\b/i;
function opcionesDe(el) {
  try {
    if (el.__opc) return el.__opc;
    const txt = [el.getAttribute("placeholder"), el.getAttribute("aria-label"), el.getAttribute("name"), el.id,
      el.parentElement && el.parentElement.querySelector(":scope > label") && el.parentElement.querySelector(":scope > label").textContent,
      el.closest("td") && (el.closest("table") && el.closest("table").querySelectorAll("th")[el.closest("td").cellIndex] || {}).textContent].filter(Boolean).join(" ");
    return (el.__opc = { fonetica: !RE_NOMBRE.test(txt), persona: RE_PERSONA.test(txt), inicial: !RE_SIN_MAYUS.test(txt) });
  } catch (e) { return { fonetica: false, inicial: false }; }
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
    if (esTactil()) programarPausa(el);                  // celular: corrección en pausa (las palabras ya terminadas)
    if (ev.isComposing || ev.inputType !== "insertText" && ev.inputType !== "insertLineBreak") return;
    const tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    if (tactil) return;                                   // en el celular el teclado compone el texto: se corrige en una pausa, al tocar fuera y al salir de la casilla
    const borde = ev.inputType === "insertLineBreak" ? "\n" : ev.data;
    if (!borde || !BORDES.has(borde)) return;
    const pos = el.selectionStart; if (pos == null) return;
    const w = palabraAntesDe(el.value.slice(0, pos - 1), pos - 1); if (!w) return;
    const c = corregirPalabraEn(el.value, w.ini, w.fin, opcionesDe(el)); if (!c || c === w.palabra) return;
    const ant = el.value[w.ini - 1];
    if (ant && /[0-9_@\/\\#.\-]/.test(ant)) return;
    const desp = pos;                                      // el cursor queda después del borde escrito
    if (cambiarTexto(el, w.ini, w.fin, c)) { try { el.setSelectionRange(desp + (c.length - w.palabra.length), desp + (c.length - w.palabra.length)); } catch (e) {} }
  } catch (e) { /* la autocorrección nunca debe romper la escritura */ }
}
// ----- Celular: no basta con «al salir de la casilla» (tocar un espacio en blanco o un botón no la deja) -----
const BORDES_TXT = " .,;:)?!\n";
// Corrige solo las palabras ya TERMINADAS (seguidas de espacio o signo): la que se está escribiendo la deja el teclado
function corregirTerminadas(el) {
  try {
    const v = el.value; let idx = -1; for (let i = v.length - 1; i >= 0; i--) { if (BORDES_TXT.includes(v[i])) { idx = i; break; } }
    if (idx < 0) return;
    const cabeza = v.slice(0, idx + 1);
    const { texto, cambios } = corregirTexto(cabeza, opcionesDe(el));
    if (cambios > 0 && texto !== cabeza) { el.setRangeText(texto, 0, idx + 1, "preserve"); el.dispatchEvent(new Event("input", { bubbles: true })); }
  } catch (e) { /* nunca debe romper la escritura */ }
}
function programarPausa(el) {
  try { clearTimeout(el.__pausa); el.__pausa = setTimeout(() => { if (document.activeElement === el && !el.__componiendo) corregirTerminadas(el); }, 1200); } catch (e) {}
}
function alTocarFuera(ev) {
  try {
    const el = document.activeElement;
    if (!el || !el.__ortografia || !el.__editado || ev.target === el || !esTactil()) return;
    clearTimeout(el.__pausa);
    const { texto, cambios } = corregirTexto(el.value, opcionesDe(el));
    if (cambios > 0 && texto !== el.value) cambiarTexto(el, 0, el.value.length, texto, false);
    el.__editado = false;
  } catch (e) {}
}
function alSalir(ev) {
  try {
    const el = ev.target;
    if (!el || !el.__ortografia || !el.__editado) return;
    el.__editado = false;
    const corregir = () => {
      try {
        const { texto, cambios } = corregirTexto(el.value, opcionesDe(el));
        if (cambios > 0 && texto !== el.value) cambiarTexto(el, 0, el.value.length, texto, false);
      } catch (e) {}
    };
    // En el celular el teclado termina de escribir la última palabra justo al salir: se espera un instante para no pisarla
    if (esTactil()) { setTimeout(corregir, 120); setTimeout(corregir, 450); } else corregir();
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
  document.addEventListener("pointerdown", alTocarFuera, true);
  const quitar = () => { document.removeEventListener("input", alEscribir, true); document.removeEventListener("focusout", alSalir, true); document.removeEventListener("pointerdown", alTocarFuera, true); };
  if (typeof MutationObserver === "undefined") return quitar;
  const obs = new MutationObserver((lista) => { for (const m of lista) m.addedNodes.forEach(pasar); });
  obs.observe(raiz.body || raiz, { childList: true, subtree: true });
  return () => { obs.disconnect(); quitar(); };
}
