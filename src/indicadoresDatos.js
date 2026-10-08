// Indicadores del SG-SST (RYR-SS-015): datos y lógica propios de este formato. Lo común está en sstBase.js.
// El Excel calcula los indicadores con sus fórmulas; la app solo escribe los datos base y gestión de cada mes (como NÚMEROS).
// Aquí también se calculan, con las mismas fórmulas, para mostrarlos en pantalla antes de generar.
import { poner, escribirTabla, descubrirPorEtiquetas, saltoDePagina } from "./sstBase";
import { registroMaestro } from "./accionesDatos";

export const CODIGO_INDICADORES = "RYR-SS-015";
export const HOJA_INDICADORES = "Indicadores";
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const K_HORAS = 240000;      // IF e IS usan K = 240.000 (100 trabajadores × 48 horas × 50 semanas)
// Datos base del mes (en el orden de la plantilla)
export const DATOS_BASE = [
  { id: "trab", texto: "Promedio de trabajadores" }, { id: "hht", texto: "Horas-hombre trabajadas (HHT)" }, { id: "at", texto: "Accidentes de trabajo (AT)" }, { id: "atInc", texto: "AT con incapacidad" },
  { id: "dias", texto: "Días de incapacidad por AT" }, { id: "mort", texto: "AT mortales" }, { id: "eln", texto: "Casos nuevos de enfermedad laboral" }, { id: "ela", texto: "Casos antiguos de enfermedad laboral" },
  { id: "inc", texto: "Incidentes y casi accidentes" }, { id: "aus", texto: "Días de ausencia por incapacidad médica" }, { id: "prog", texto: "Días de trabajo programados" },
];
// Indicadores de gestión: las filas con id se escriben; las de porcentaje (null) las calcula el Excel
export const FILAS_GESTION = [
  { id: "capProg", texto: "Capacitaciones programadas" }, { id: "capEjec", texto: "Capacitaciones ejecutadas" }, null,
  { id: "inspProg", texto: "Inspecciones programadas" }, { id: "inspEjec", texto: "Inspecciones ejecutadas" }, null,
  { id: "accAb", texto: "Acciones correctivas abiertas en el mes" }, { id: "accCe", texto: "Acciones correctivas cerradas en el mes" }, null,
  { id: "actos", texto: "Actos y condiciones inseguras reportados (N°)" },
];
export const IDS_MES = [...DATOS_BASE.map((x) => x.id), ...FILAS_GESTION.filter(Boolean).map((x) => x.id)];

const meses = (clave) => Object.fromEntries(MESES.map((m, i) => [`${clave}${i}`, m]));
export const SPEC_INDICADORES = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "B"],
    ["contratista", "Contratista / Empresa", "A", "B"],
    ["anio", "Año", "J", "M"],
    ["responsable", "Responsable", "J", "M"],
    ["analisis", "ANÁLISIS Y DECISIONES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "base", cabecera: "Dato", fin: "2. INDICADORES DE ACCIDENTALIDAD", finEmpieza: true,
      columnas: Object.fromEntries(MESES.map((_, i) => [`m${i}`, String.fromCharCode(66 + i)])), encabezados: meses("m") },
    { clave: "calculados", cabecera: "Indicador", despuesDe: "base", fin: "El año (acum.)", finEmpieza: true, columnas: { m0: "B" }, encabezados: { m0: "Ene" } },
    { clave: "gestion", cabecera: "Indicador", despuesDe: "calculados", fin: "ANÁLISIS Y DECISIONES", columnas: Object.fromEntries(MESES.map((_, i) => [`m${i}`, String.fromCharCode(66 + i)])), encabezados: meses("m") },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "elaboro", col: "D" }, { clave: "reviso", col: "H" }, { clave: "vobo", col: "M" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_INDICADORES = {"proyecto":"B11","contratista":"B12","anio":"M11","responsable":"M12","analisis":"A51","tablas":{"base":{"fila0":15,"n":11,"columnas":{"m0":"B","m1":"C","m2":"D","m3":"E","m4":"F","m5":"G","m6":"H","m7":"I","m8":"J","m9":"K","m10":"L","m11":"M"}},"calculados":{"fila0":28,"n":9,"columnas":{"m0":"B"}},"gestion":{"fila0":40,"n":10,"columnas":{"m0":"B","m1":"C","m2":"D","m3":"E","m4":"F","m5":"G","m6":"H","m7":"I","m8":"J","m9":"K","m10":"L","m11":"M"}}},"firmas":{"elaboro":{"nombre":"D59","cargo":"D60"},"reviso":{"nombre":"H59","cargo":"H60"},"vobo":{"nombre":"M59","cargo":"M60"}}};
export const descubrirIndicadores = (ws) => descubrirPorEtiquetas(ws, SPEC_INDICADORES);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numero = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const mesVacio = () => Object.fromEntries(IDS_MES.map((id) => [id, ""]));
export const mesesVacios = () => MESES.map(() => mesVacio());
const mesConDatos = (m) => !!m && IDS_MES.some((id) => numero(m[id]) !== null);
export const mesesConDatos = (d) => arr(d.meses).map((m, i) => (mesConDatos(m) ? i : -1)).filter((i) => i >= 0);

// ---------- Indicadores calculados (mismas fórmulas del Excel) ----------
const div = (a, b, k) => (a === null || b === null || b === 0 ? null : (a / b) * k);
export function calcularIndicadores(m) {
  const v = Object.fromEntries(IDS_MES.map((id) => [id, numero((m || {})[id])]));
  const IF = div(v.at, v.hht, K_HORAS), IS = div(v.dias, v.hht, K_HORAS);
  return {
    frecuencia: div(v.at, v.trab, 100), severidad: div(v.dias, v.trab, 100), mortales: div(v.mort, v.at, 100), incidencia: div(v.eln, v.trab, 100000),
    prevalencia: v.trab === null || v.trab === 0 || (v.eln === null && v.ela === null) ? null : (((v.eln || 0) + (v.ela || 0)) / v.trab) * 100000,
    ausentismo: div(v.aus, v.prog, 100), IF, IS, ILI: IF === null || IS === null ? null : (IF * IS) / 1000,
    capacitacion: div(v.capEjec, v.capProg, 1), inspecciones: div(v.inspEjec, v.inspProg, 1), cierre: div(v.accCe, v.accAb, 1),
  };
}
// El año (acumulado) usa los totales del año y el promedio de trabajadores de los meses con dato
export function totalesAnio(d, hastaMes = 11) {            // hastaMes: índice del último mes que cuenta (0 = enero … 11 = diciembre)
  const tot = mesVacio();
  for (const id of IDS_MES) {
    const vals = arr(d.meses).slice(0, hastaMes + 1).map((m) => numero((m || {})[id])).filter((x) => x !== null);
    tot[id] = vals.length ? String(id === "trab" ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0)) : "";
  }
  return tot;
}
export const calcularAnio = (d) => calcularIndicadores(totalesAnio(d));
// Acumulado del año hasta el mes indicado (enero = 0): lo usa el Informe Mensual
export const calcularAcumulado = (d, hastaMes) => calcularIndicadores(totalesAnio(d, hastaMes));

// ---------- Traer lo ya registrado en la app ----------
const delMes = (iso, anio, mes0) => typeof iso === "string" && iso.slice(0, 4) === String(anio) && Number(iso.slice(5, 7)) === mes0 + 1;
// Cuenta, mes a mes, lo que hay registrado. regs = { inspecciones, actos, accidentes, acciones, capacitaciones, personal } (listas de resúmenes)
export function datosRegistrados(anio, regs = {}) {
  const por = mesesVacios().map(() => ({}));
  const suma = (i, id, n) => { if (n) por[i][id] = String((numero(por[i][id]) || 0) + n); };
  const maestro = registroMaestro(arr(regs.acciones));
  for (let i = 0; i < 12; i++) {
    suma(i, "inspEjec", arr(regs.inspecciones).filter((r) => delMes(r.fecha, anio, i)).length);
    suma(i, "actos", arr(regs.actos).filter((r) => delMes(r.fecha, anio, i)).length);
    const acc = arr(regs.accidentes).filter((r) => delMes(r.fechaEvento, anio, i));
    suma(i, "at", acc.filter((r) => r.esAccidente).length);
    suma(i, "atInc", acc.filter((r) => r.esAccidente && r.incapacidad > 0).length);
    suma(i, "dias", acc.filter((r) => r.esAccidente).reduce((s, r) => s + (r.incapacidad || 0), 0));
    suma(i, "mort", acc.filter((r) => r.mortal).length);
    suma(i, "inc", acc.filter((r) => !r.esAccidente).length);
    suma(i, "accAb", maestro.filter((a) => delMes(a.fechaApertura, anio, i)).length);
    suma(i, "accCe", maestro.filter((a) => a.estado === "Cerrada" && delMes(a.fechaCierre, anio, i)).length);
    // Promedio de trabajadores: los activos de la hoja del Registro de Personal con el corte MÁS reciente del mes
    const delMesPersonal = arr(regs.personal).filter((r) => delMes(r.fechaCorte, anio, i)).sort((x, y) => String(x.fechaCorte).localeCompare(String(y.fechaCorte)));
    if (delMesPersonal.length) suma(i, "trab", delMesPersonal[delMesPersonal.length - 1].activos);
    const filasCap = arr(regs.capacitaciones).flatMap((r) => arr(r.filas));
    suma(i, "capProg", filasCap.filter((f) => delMes(f.programada, anio, i)).length);
    suma(i, "capEjec", filasCap.filter((f) => f.estado === "Ejecutada" && delMes(f.ejecutada, anio, i)).length);
  }
  return por;
}
// Completa SOLO las casillas vacías (lo que la persona ya escribió no se pisa). Devuelve los meses nuevos y cuántas casillas se llenaron.
export function completarConRegistrado(d, regs) {
  const reg = datosRegistrados(d.anio, regs);
  let llenadas = 0;
  const nuevos = arr(d.meses).map((m, i) => { const copia = { ...mesVacio(), ...m }; for (const [id, v] of Object.entries(reg[i] || {})) if (texto(copia[id]) === "") { copia[id] = v; llenadas++; } return copia; });
  return { meses: nuevos, llenadas };
}

// ---------- Escribir en la hoja ----------
export function escribirIndicadoresEnHoja(ws, d, celdas = CELDAS_INDICADORES) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "responsable", "analisis"]) poner(ws, C[k], d[k]);
  const a = numero(d.anio);
  poner(ws, C.anio, a === null ? d.anio : a);
  const T = C.tablas || {};
  const celdaMes = (id, i) => { const n = numero(((arr(d.meses)[i]) || {})[id]); return n === null ? "" : n; };
  const fila = (id) => Object.fromEntries(MESES.map((_, i) => [`m${i}`, celdaMes(id, i)]));
  escribirTabla(ws, T.base, DATOS_BASE.map((x) => fila(x.id)));
  escribirTabla(ws, T.gestion, FILAS_GESTION.map((x) => (x ? fila(x.id) : {})));       // las filas de porcentaje las calcula el Excel con su fórmula
  if (T.calculados) saltoDePagina(ws, T.calculados.fila0 + T.calculados.n);   // la hoja 2 empieza en "3. Indicadores de gestión" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

// Primer mes con datos que no tiene sentido: más AT con incapacidad o mortales que accidentes
export function primerMesInconsistente(d) {
  return arr(d.meses).findIndex((m) => { const at = numero((m || {}).at), inc = numero((m || {}).atInc), mo = numero((m || {}).mort); return (at !== null && ((inc !== null && inc > at) || (mo !== null && mo > at))) || (at === null && ((inc || 0) > 0 || (mo || 0) > 0)); });
}
export function validarIndicadores(d) {
  const faltan = [];
  const a = numero(d.anio);
  if (a === null || a < 2000 || a > 2100) faltan.push("el año (4 cifras)");
  if (!mesesConDatos(d).length) faltan.push("los datos de al menos un mes");
  if (primerMesInconsistente(d) >= 0) faltan.push(`revisar ${MESES_LARGO[primerMesInconsistente(d)].toLowerCase()}: los AT con incapacidad o mortales no pueden ser más que los accidentes de trabajo`);
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}

// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarIndicadores().
export function camposFaltantesIndicadores(d) {
  const f = [];
  const a = numero(d.anio);
  if (a === null || a < 2000 || a > 2100) f.push({ etiqueta: "Año", seccion: "datos" });
  if (!mesesConDatos(d).length) f.push({ etiqueta: "Promedio de trabajadores", seccion: "mes" });
  if (primerMesInconsistente(d) >= 0) { f.push({ etiqueta: "AT con incapacidad", seccion: "mes" }); f.push({ etiqueta: "AT mortales", seccion: "mes" }); }
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: los datos de cada año, para seguir llenando mes a mes
export function resumenIndicadores(d) {
  const anio = calcularAnio(d);
  return { id: String(d.anio || "sin-año"), formato: "indicadores", anio: String(d.anio || ""), proyecto: d.proyecto || "", meses: arr(d.meses), mesesConDatos: mesesConDatos(d).length, frecuenciaAnio: anio.frecuencia, severidadAnio: anio.severidad };
}
