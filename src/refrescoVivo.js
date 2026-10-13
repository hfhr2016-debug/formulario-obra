// Cuando llegan datos de otro dispositivo, la pantalla abierta se pone al día sola.
// 1) Cada pantalla que sabe ponerse al día por sí misma (borradores, catálogo de actividades) se registra aquí
//    y dice qué claves del dispositivo maneja: así se actualiza SIN cerrarse ni perder la sección abierta.
// 2) Las claves que nadie maneja hacen que la pantalla se vuelva a leer completa; en ese caso los borradores
//    se recuperan solos (sin preguntar «¿restaurar?»), porque ya traen lo último que escribió esta persona.
let marca = 0;
export const marcarRefrescoVivo = () => { marca = Date.now(); };
export const refrescoVivoReciente = () => Date.now() - marca < 6000;

const manejadores = new Set();
export function alLlegarDatos(fn) {            // fn(claves) -> lista de claves que esa pantalla ya actualizó
  manejadores.add(fn);
  return () => manejadores.delete(fn);
}
export function avisarDatosRemotos(claves) {    // devuelve las claves que nadie pudo actualizar en vivo
  const manejadas = new Set();
  manejadores.forEach((fn) => { try { (fn(claves) || []).forEach((k) => manejadas.add(k)); } catch (e) { /* una pantalla con error no frena a las demás */ } });
  return claves.filter((k) => !manejadas.has(k));
}
