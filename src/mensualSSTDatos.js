// Informe Mensual de SST (RYR-SS-021): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Consolida los indicadores del año (formato de Indicadores) y lo registrado en los demás formatos durante el mes; lo que no hay registrado queda en blanco.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda, saltoDePagina } from "./sstBase";
import { actividadesDelPeriodo, trabajadoresDelPeriodo, rangoMes, MESES } from "./consolidadoSST";
import { calcularIndicadores, calcularAcumulado, numero as numeroInd } from "./indicadoresDatos";

export const CODIGO_MENSUAL = "RYR-SS-021";
export const HOJA_MENSUAL = "Informe Mensual SST";
export { MESES };
export const COLORES_CUMPLE = { Cumple: { relleno: "00A651", fuente: "000000" }, "No cumple": { relleno: "C00000", fuente: "FFFFFF" } };
// Los 7 indicadores y las 8 actividades vienen escritos en la plantilla, en este orden
export const INDICADORES = ["Frecuencia de accidentalidad (%)", "Severidad de accidentalidad (%)", "Proporción de AT mortales (%)", "Índice de frecuencia (IF)", "Índice de severidad (IS)", "Índice de lesiones incapacitantes (ILI)", "Ausentismo por causa médica (%)"];
export const CLAVES_INDICADOR = ["frecuencia", "severidad", "mortales", "IF", "IS", "ILI", "ausentismo"];
export const ACTIVIDADES = ["Capacitaciones y entrenamientos", "Inspecciones de seguridad", "Charlas diarias de seguridad", "Inducciones SST", "Permisos de trabajo de alto riesgo", "Análisis de trabajo seguro (ATS)", "Actos y condiciones inseguras reportados", "Acciones correctivas cerradas"];
export const CLAVES_ACTIVIDAD = ["capacitaciones", "inspecciones", "charlas", "inducciones", "permisos", "ats", "actos", "accionesCerradas"];

export const SPEC_MENSUAL = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["mes", "Mes", "A", "C"], ["anio", "Año", "E", "G"], ["nInforme", "Informe N°", "I", "K"],
    ["trabajadores", "Trabajadores (promedio)", "A", "C"], ["hht", "Horas-hombre (HHT)", "E", "G"], ["dias", "Días trabajados", "I", "K"],
    ["accidentes", "Accidentes de trabajo", "A", "A", null, 1], ["incidentes", "Incidentes y casi accidentes", "C", "C", null, 1], ["diasInc", "Días de incapacidad", "E", "E", null, 1],
    ["abiertas", "Acciones abiertas al cierre", "G", "G", null, 1], ["vencidas", "Acciones vencidas", "I", "I", null, 1], ["contratistas", "Contratistas evaluados", "K", "K", null, 1],
    ["simulacros", "Simulacros y reuniones del mes", "A", "C"], ["hechos", "Hechos relevantes del mes", "A", "C"], ["conclusiones", "Conclusiones", "A", "C"], ["planMes", "Plan del próximo mes", "A", "C"],
  ],
  tablas: [
    { clave: "indicadores", cabecera: "No.", fin: "3. CUMPLIMIENTO DEL PLAN DE TRABAJO", finEmpieza: true, columnas: { mes: "F", acum: "H", meta: "J", cumple: "K" },
      encabezados: { mes: "Resultado del mes", acum: "Acumulado del año", meta: "Meta", cumple: "¿Cumple?" } },
    { clave: "actividades", cabecera: "No.", despuesDe: "indicadores", fin: "4. ACCIDENTALIDAD Y SEGUIMIENTO", finEmpieza: true, columnas: { prog: "G", ejec: "H", obs: "J" }, encabezados: { prog: "Programado", ejec: "Ejecutado", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MENSUAL = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","mes":"C13","anio":"G13","nInforme":"K13","trabajadores":"C14","hht":"G14","dias":"K14","accidentes":"A36","incidentes":"C36","diasInc":"E36","abiertas":"G36","vencidas":"I36","contratistas":"K36","simulacros":"C38","hechos":"C39","conclusiones":"C41","planMes":"C42","tablas":{"indicadores":{"fila0":17,"n":7,"columnas":{"mes":"F","acum":"H","meta":"J","cumple":"K"}},"actividades":{"fila0":26,"n":8,"columnas":{"prog":"G","ejec":"H","obs":"J"}}},"firmas":{"elaboro":{"nombre":"C46","cargo":"C47"},"reviso":{"nombre":"G46","cargo":"G47"},"vobo":{"nombre":"K46","cargo":"K47"}}};
export const descubrirMensual = (ws) => descubrirPorEtiquetas(ws, SPEC_MENSUAL);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
export const indicadorNuevo = () => ({ mes: "", acum: "", meta: "" });
export const actividadNueva = () => ({ prog: "", ejec: "", obs: "" });
export const indiceMes = (mes) => MESES.indexOf(mes);
// ¿Cumple? = el resultado del mes no supera la meta (son indicadores de accidentalidad: menos es mejor)
export function cumpleIndicador(i) { const r = num((i || {}).mes), m = num((i || {}).meta); return r === null || m === null ? "" : r <= m ? "Cumple" : "No cumple"; }

export function escribirMensualEnHoja(ws, d, celdas = CELDAS_MENSUAL) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "mes", "simulacros", "hechos", "conclusiones", "planMes"]) poner(ws, C[k], d[k]);
  for (const k of ["anio", "nInforme", "trabajadores", "hht", "dias", "accidentes", "incidentes", "diasInc", "abiertas", "vencidas", "contratistas"]) poner(ws, C[k], numOTexto(d[k]));
  const T = C.tablas || {};
  const filas = INDICADORES.map((_, i) => { const x = arr(d.indicadores)[i] || {}; return { mes: numOTexto(x.mes), acum: numOTexto(x.acum), meta: numOTexto(x.meta) }; });
  escribirTabla(ws, T.indicadores, filas);
  // "¿Cumple?" lo calcula el Excel; aquí se le pone el color que le corresponde (las reglas de color de Excel no viajan en la plantilla)
  if (T.indicadores && T.indicadores.columnas && T.indicadores.columnas.cumple) {
    INDICADORES.forEach((_, i) => { const c = COLORES_CUMPLE[cumpleIndicador(arr(d.indicadores)[i])]; if (c) pintarCelda(ws, T.indicadores.columnas.cumple + (T.indicadores.fila0 + i), "FF" + c.relleno, "FF" + c.fuente); });
  }
  escribirTabla(ws, T.actividades, ACTIVIDADES.map((_, i) => { const a = arr(d.actividades)[i] || {}; return { prog: numOTexto(a.prog), ejec: numOTexto(a.ejec), obs: a.obs }; }));
  if (T.actividades) saltoDePagina(ws, T.actividades.fila0 + T.actividades.n - 1);       // la hoja 2 empieza en "4. Accidentalidad y seguimiento" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarMensual(d) {
  const faltan = [];
  if (indiceMes(d.mes) < 0) faltan.push("el mes");
  const a = num(d.anio);
  if (a === null || a < 2000 || a > 2100) faltan.push("el año (4 cifras)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarMensual().
export function camposFaltantesMensual(d) {
  const f = [];
  if (indiceMes(d.mes) < 0) f.push({ etiqueta: "Mes", seccion: "datos" });
  const a = num(d.anio);
  if (a === null || a < 2000 || a > 2100) f.push({ etiqueta: "Año", seccion: "datos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

const r4 = (v) => (v === null || v === undefined ? "" : String(Math.round(v * 10000) / 10000));
const lineaEvento = (e) => `${e.tipo}${e.tema ? ": " + e.tema : ""} (${fechaDDMMYYYY(e.fecha)})`;
// Completa SOLO las casillas vacías con lo registrado en la app (indicadores del año y formatos del mes); no pisa lo escrito ni inventa ceros
export function rellenarMesDesdeRegistros(d, regs) {
  const idx = indiceMes(d.mes), { desde, hasta } = rangoMes(d.anio, idx);
  if (!desde) return { llenadas: 0, cambios: {}, sinIndicadores: false };
  const a = actividadesDelPeriodo(desde, hasta, regs);
  const anio = arr(regs.indicadores).find((x) => String(x.anio) === String(d.anio));
  const mesInd = anio ? (arr(anio.meses)[idx] || {}) : null;
  let llenadas = 0;
  const poner0 = (valor, actual) => { if (texto(actual) === "" && valor !== "" && valor !== null && valor !== undefined && valor !== 0) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const indicadores = INDICADORES.map((_, i) => ({ ...indicadorNuevo(), ...(arr(d.indicadores)[i] || {}) }));
  if (anio && mesInd) {
    const m = calcularIndicadores(mesInd), ac = calcularAcumulado(anio, idx);
    CLAVES_INDICADOR.forEach((k, i) => { indicadores[i].mes = poner0(r4(m[k]), indicadores[i].mes); indicadores[i].acum = poner0(r4(ac[k]), indicadores[i].acum); });
  }
  const actividades = ACTIVIDADES.map((_, i) => ({ ...actividadNueva(), ...(arr(d.actividades)[i] || {}) }));
  CLAVES_ACTIVIDAD.forEach((k, i) => { actividades[i].ejec = poner0(a[k], actividades[i].ejec); });
  if (mesInd) { actividades[0].prog = poner0(numeroInd(mesInd.capProg), actividades[0].prog); actividades[1].prog = poner0(numeroInd(mesInd.inspProg), actividades[1].prog); }
  const trab = mesInd && numeroInd(mesInd.trab) !== null ? numeroInd(mesInd.trab) : trabajadoresDelPeriodo(hasta, regs);
  const eventos = [...a.simulacros, ...a.reuniones].sort((x, y) => String(x.fecha).localeCompare(String(y.fecha)));
  const cambios = { indicadores, actividades, trabajadores: poner0(trab, d.trabajadores), hht: poner0(mesInd ? numeroInd(mesInd.hht) : null, d.hht),
    accidentes: poner0(a.accidentes, d.accidentes), incidentes: poner0(a.incidentes, d.incidentes), diasInc: poner0(a.diasIncapacidad, d.diasInc), abiertas: poner0(a.accionesAbiertas, d.abiertas),
    vencidas: poner0(a.accionesVencidas, d.vencidas), contratistas: poner0(a.contratistasEvaluados, d.contratistas), simulacros: poner0(eventos.map(lineaEvento).join("; "), d.simulacros) };
  return { llenadas, sinIndicadores: !anio, cambios };           // el conteo se lee DESPUÉS de llenar todo (antes salía incompleto)
}

// Resumen que se guarda en el dispositivo
export function resumenMensual(d) {
  return { id: `${d.anio || "sin-año"}_${indiceMes(d.mes) + 1}`, formato: "mensual", mes: d.mes || "", anio: String(d.anio || ""), proyecto: d.proyecto || "", nInforme: d.nInforme || "",
    noCumplen: arr(d.indicadores).filter((i) => cumpleIndicador(i) === "No cumple").length, cumplen: arr(d.indicadores).filter((i) => cumpleIndicador(i) === "Cumple").length };
}
