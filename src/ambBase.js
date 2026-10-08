// ambBase.js — lógica común de los formatos ambientales con lista de verificación y hallazgos (sin pantalla).
export const RESPUESTAS_AMB = ["Sí", "No", "N/A"];
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const arr = (a) => (Array.isArray(a) ? a : []);

export const hallazgoNuevo = (base = {}) => ({ hallazgo: "", accion: "", responsable: "", fechaLimite: "", ...base });
const hallazgoVacio = (h) => !(texto(h.hallazgo) || texto(h.accion) || texto(h.responsable) || h.fechaLimite);
export const hallazgosConDatos = (lista) => arr(lista).filter((h) => !hallazgoVacio(h));
// Texto del punto de la lista para el hallazgo: «Trampa de grasas limpia…»
export const textoHallazgoDe = (item, obs) => (texto(obs) ? `${item}: ${texto(obs)}` : item);
// Puntos respondidos «No» que aún no están en los hallazgos (se comparan por el origen que guarda cada hallazgo)
export function noCumplenPendientes(items, respuestas, hallazgos) {
  const ya = new Set(arr(hallazgos).map((h) => h.origen).filter(Boolean));
  return arr(items).map((t, i) => ({ i, t })).filter((x) => arr(respuestas)[x.i] === "No" && !ya.has(`p${x.i}`));
}
export function contarRespuestas(items, respuestas) {
  const r = arr(respuestas); let si = 0, no = 0, na = 0, sin = 0;
  arr(items).forEach((_, i) => { if (r[i] === "Sí") si++; else if (r[i] === "No") no++; else if (r[i] === "N/A") na++; else sin++; });
  return { si, no, na, sin };
}
// Mensajes de validación comunes: puntos sin responder y hallazgos incompletos
export function validarListaYHallazgos(items, respuestas, hallazgos) {
  const f = [];
  const c = contarRespuestas(items, respuestas);
  if (c.sin) f.push(`responder los puntos de la verificación (faltan ${c.sin})`);
  const hs = hallazgosConDatos(hallazgos);
  if (hs.some((h) => !texto(h.hallazgo))) f.push("el hallazgo en cada fila de hallazgos");
  if (hs.some((h) => !texto(h.accion))) f.push("la acción a tomar en cada hallazgo");
  return f;
}
export function faltantesListaYHallazgos(items, respuestas, hallazgos, seccionLista = "lista", seccionHallazgos = "hallazgos") {
  const f = [];
  arr(items).forEach((_, i) => { if (!["Sí", "No", "N/A"].includes(arr(respuestas)[i])) f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: seccionLista }); });
  const todos = arr(hallazgos); const hs = hallazgosConDatos(todos);
  todos.forEach((h, i) => {
    if (!hs.includes(h)) return;
    if (!texto(h.hallazgo)) f.push({ etiqueta: "Hallazgo", indice: i, seccion: seccionHallazgos });
  });
  todos.forEach((h, i) => { if (hs.includes(h) && !texto(h.accion)) f.push({ etiqueta: "Acción a tomar", indice: i, seccion: seccionHallazgos }); });
  return f;
}
