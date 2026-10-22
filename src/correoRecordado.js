// Recuerda el correo (nunca la clave) en este aparato para no escribirlo cada vez
const K = "saiea_correo_recordado";
export const leerCorreoRecordado = () => { try { return localStorage.getItem(K) || ""; } catch { return ""; } };
export const guardarCorreoRecordado = (c) => { try { if (c) localStorage.setItem(K, c); else localStorage.removeItem(K); } catch { /* sin almacenamiento: no pasa nada */ } };
