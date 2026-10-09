// Corrección ortográfica en todos los formularios.
// Marca los campos de texto como español con revisión ortográfica y autocorrección activadas (el navegador subraya en rojo las
// palabras mal escritas y propone la correcta; en el celular, el teclado las corrige solo). Se aplica también a los campos que
// aparecen después (secciones que se abren, filas que se agregan) con un observador.
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

export function activarOrtografia(raiz = document) {
  try { document.documentElement.setAttribute("lang", "es"); } catch (e) {}
  const pasar = (nodo) => {
    if (!nodo || nodo.nodeType !== 1) return;
    marcarOrtografia(nodo);
    if (nodo.querySelectorAll) nodo.querySelectorAll("input, textarea").forEach(marcarOrtografia);
  };
  pasar(raiz.body || raiz);
  if (typeof MutationObserver === "undefined") return () => {};
  const obs = new MutationObserver((lista) => { for (const m of lista) m.addedNodes.forEach(pasar); });
  obs.observe(raiz.body || raiz, { childList: true, subtree: true });
  return () => obs.disconnect();
}
