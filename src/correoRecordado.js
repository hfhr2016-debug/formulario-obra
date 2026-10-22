// Recuerda los correos (nunca la clave) en este aparato, para sugerirlos mientras se escribe
const K = "saiea_correos_recordados";
export const leerCorreosRecordados = () => { try { const l = JSON.parse(localStorage.getItem(K) || "[]"); return Array.isArray(l) ? l.filter((x) => typeof x === "string") : []; } catch { return []; } };
const guardar = (l) => { try { localStorage.setItem(K, JSON.stringify(l)); } catch { /* sin almacenamiento: no pasa nada */ } };
export const agregarCorreoRecordado = (c) => { c = String(c || "").trim(); if (!c) return leerCorreosRecordados(); const l = [c, ...leerCorreosRecordados().filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 8); guardar(l); return l; };
export const olvidarCorreoRecordado = (c) => { const l = leerCorreosRecordados().filter((x) => x !== c); guardar(l); return l; };
