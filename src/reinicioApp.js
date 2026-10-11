// reinicioApp.js — Reinicio de la app: borra los datos guardados en el equipo (borradores, consecutivos, historial, copia sincronizada).
// No importa Firebase: recibe el «almacén» (localStorage) para poder probarlo. No toca la sesión iniciada ni las preferencias "saiea_*".
export const PREFIJO_DATOS = "ryr_";
export const CLAVE_REINICIO_VISTO = "saiea_reinicio_visto";

export const esDatoDeLaApp = (clave) => typeof clave === "string" && clave.startsWith(PREFIJO_DATOS);

// Borra todos los datos de la app de este equipo. Devuelve cuántas claves borró.
export function limpiarEquipo(almacen) {
  const claves = [];
  try { for (let i = 0; i < almacen.length; i++) { const k = almacen.key(i); if (esDatoDeLaApp(k)) claves.push(k); } } catch (x) { /* nada */ }
  claves.forEach((k) => { try { almacen.removeItem(k); } catch (x) { /* nada */ } });
  return claves.length;
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const leerVisto = (almacen) => { try { return num(almacen.getItem(CLAVE_REINICIO_VISTO)); } catch (x) { return 0; } };
export const debeReiniciar = (vistoLocal, marcaNube) => num(marcaNube) > num(vistoLocal);

// Aviso general: si el Administrador pidió reiniciar todos los equipos y este aún no lo hizo, lo hace UNA vez. Devuelve true si limpió.
export function aplicarReinicioGeneral(almacen, marcaNube) {
  if (!debeReiniciar(leerVisto(almacen), marcaNube)) return false;
  limpiarEquipo(almacen);
  try { almacen.setItem(CLAVE_REINICIO_VISTO, String(num(marcaNube))); } catch (x) { /* nada */ }
  return true;
}
// Marca este equipo como ya reiniciado por esa orden (para el equipo del Administrador que la dio).
export function marcarVisto(almacen, marca) { try { almacen.setItem(CLAVE_REINICIO_VISTO, String(num(marca))); } catch (x) { /* nada */ } }
