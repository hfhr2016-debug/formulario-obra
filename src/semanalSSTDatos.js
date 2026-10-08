// Informe Semanal de SST (RYR-SS-020): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Las cifras de la semana salen de lo registrado en los demás formatos (consolidadoSST.js); nada se inventa: lo que no hay registrado queda en blanco.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { actividadesDelPeriodo, trabajadoresDelPeriodo, numeroSemana } from "./consolidadoSST";

export const CODIGO_SEMANAL = "RYR-SS-020";
export const HOJA_SEMANAL = "Informe Semanal SST";
// Las 10 actividades vienen escritas en la plantilla, en este orden; CLAVES dice de dónde sale cada conteo
export const ACTIVIDADES = ["Charlas diarias de seguridad", "Inducciones SST", "Capacitaciones y entrenamientos", "Inspecciones de seguridad", "Permisos de trabajo de alto riesgo", "Análisis de trabajo seguro (ATS)",
  "Entregas de EPP", "Actos y condiciones inseguras reportados (Tarjeta iCAI)", "Accidentes de trabajo", "Incidentes y casi accidentes"];
export const CLAVES = ["charlas", "inducciones", "capacitaciones", "inspecciones", "permisos", "ats", "epp", "actos", "accidentes", "incidentes"];

export const SPEC_SEMANAL = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["semana", "Semana N°", "A", "C"], ["desde", "Desde", "E", "G"], ["hasta", "Hasta", "I", "K"],
    ["trabajadores", "Trabajadores (promedio)", "A", "C"], ["hht", "Horas-hombre (HHT)", "E", "G"], ["dias", "Días trabajados", "I", "K"],
    ["abiertas", "Abiertas al cierre", "A", "A", null, 1], ["vencidas", "Vencidas", "D", "D", null, 1], ["cerradas", "Cerradas en la semana", "G", "G", null, 1], ["diasInc", "Días de incapacidad por AT", "J", "J", null, 1],
    ["logros", "Logros de la semana", "A", "C"], ["dificultades", "Dificultades o riesgos nuevos", "A", "C"], ["plan", "Plan de la próxima semana", "A", "C"],
  ],
  tablas: [
    { clave: "actividades", cabecera: "No.", fin: "3. ACCIONES CORRECTIVAS Y PREVENTIVAS", finEmpieza: true, columnas: { prog: "G", ejec: "H", obs: "J" }, encabezados: { prog: "Programado", ejec: "Ejecutado", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_SEMANAL = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","semana":"C13","desde":"G13","hasta":"K13","trabajadores":"C14","hht":"G14","dias":"K14","abiertas":"A29","vencidas":"D29","cerradas":"G29","diasInc":"J29","logros":"C31","dificultades":"C32","plan":"C33","tablas":{"actividades":{"fila0":17,"n":10,"columnas":{"prog":"G","ejec":"H","obs":"J"}}},"firmas":{"elaboro":{"nombre":"C37","cargo":"C38"},"reviso":{"nombre":"G37","cargo":"G38"},"vobo":{"nombre":"K37","cargo":"K38"}}};
export const descubrirSemanal = (ws) => descubrirPorEtiquetas(ws, SPEC_SEMANAL);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
export const actividadNueva = () => ({ prog: "", ejec: "", obs: "" });

export function escribirSemanalEnHoja(ws, d, celdas = CELDAS_SEMANAL) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "logros", "dificultades", "plan"]) poner(ws, C[k], d[k]);
  poner(ws, C.semana, numOTexto(texto(d.semana) !== "" ? d.semana : numeroSemana(d.desde)));          // si no se escribió, la semana es la del año (lunes a domingo)
  poner(ws, C.desde, fechaDDMMYYYY(d.desde)); poner(ws, C.hasta, fechaDDMMYYYY(d.hasta));
  for (const k of ["trabajadores", "hht", "dias", "abiertas", "vencidas", "cerradas", "diasInc"]) poner(ws, C[k], numOTexto(d[k]));
  const T = C.tablas || {};
  escribirTabla(ws, T.actividades, ACTIVIDADES.map((_, i) => { const a = arr(d.actividades)[i] || {}; return { prog: numOTexto(a.prog), ejec: numOTexto(a.ejec), obs: a.obs }; }));
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarSemanal(d) {
  const faltan = [];
  if (!d.desde) faltan.push("la fecha de inicio de la semana");
  if (!d.hasta) faltan.push("la fecha final de la semana");
  else if (d.desde && d.hasta < d.desde) faltan.push("que la fecha final no sea anterior a la inicial");
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) faltan.push("lo ejecutado de al menos una actividad (puede ser 0)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarSemanal().
export function camposFaltantesSemanal(d) {
  const f = [];
  if (!d.desde) f.push({ etiqueta: "Desde", seccion: "datos" });
  if (!d.hasta || (d.desde && d.hasta < d.desde)) f.push({ etiqueta: "Hasta", seccion: "datos" });
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) f.push({ etiqueta: "Ejecutado", indice: 0, seccion: "actividades" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Completa SOLO las casillas vacías con lo registrado en la app (lo que la persona ya escribió no se pisa) y solo si hay algo registrado (no se inventan ceros)
export function rellenarSemanaDesdeRegistros(d, regs) {
  const a = actividadesDelPeriodo(d.desde, d.hasta, regs);
  let llenadas = 0;
  const poner0 = (valor, actual) => { if (texto(actual) === "" && valor) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const actividades = ACTIVIDADES.map((_, i) => { const x = { ...actividadNueva(), ...(arr(d.actividades)[i] || {}) }; x.ejec = poner0(a[CLAVES[i]], x.ejec); return x; });
  const prom = trabajadoresDelPeriodo(d.hasta, regs);
  const cambios = { actividades, trabajadores: poner0(prom, d.trabajadores), abiertas: poner0(a.accionesAbiertas, d.abiertas), vencidas: poner0(a.accionesVencidas, d.vencidas),
    cerradas: poner0(a.accionesCerradas, d.cerradas), diasInc: poner0(a.diasIncapacidad, d.diasInc) };
  return { llenadas, cambios };                 // el conteo se lee DESPUÉS de llenar todo (antes salía incompleto)
}

// Resumen que se guarda en el dispositivo
export function resumenSemanal(d) {
  const ej = (i) => num(((arr(d.actividades)[i]) || {}).ejec);
  return { id: `${d.desde || "sin-fecha"}_${d.hasta || ""}`, formato: "semanal", semana: texto(d.semana) !== "" ? d.semana : String(numeroSemana(d.desde)), desde: d.desde || "", hasta: d.hasta || "", proyecto: d.proyecto || "",
    inspecciones: ej(3), accidentes: ej(8), incidentes: ej(9), abiertas: num(d.abiertas), vencidas: num(d.vencidas) };
}
