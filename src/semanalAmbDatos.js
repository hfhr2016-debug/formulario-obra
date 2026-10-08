// Informe Semanal Ambiental (RYR-AM-019): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Las cifras de la semana salen de lo registrado en los demás formatos (consolidadoAmb.js); nada se inventa: lo que no hay registrado queda en blanco.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { consolidarPeriodo, cantidadesConsolidadas, numeroSemana } from "./consolidadoAmb";

export const CODIGO_SEMANAL_AMB = "RYR-AM-019";
export const HOJA_SEMANAL_AMB = "Informe Semanal Ambiental";
export const CLIMAS = ["Seco", "Lluvia leve", "Lluvia fuerte", "Viento fuerte"];
// Las 9 actividades vienen escritas en la plantilla, en este orden; AUTO dice de dónde sale lo ejecutado (null = se escribe a mano)
export const ACTIVIDADES_AMB = ["Inspección ambiental de obra", "Charlas y capacitaciones ambientales", "Mantenimiento de puntos ecológicos y zona de residuos", "Humectación de vías y acopios",
  "Entrega de residuos a gestores autorizados", "Revisión de maquinaria y kit antiderrames", "Limpieza de vías y andenes (barrido)", "Registro de consumos de agua y energía", "Atención de quejas de la comunidad"];
const AUTO = ["inspecciones", "capacitaciones", null, null, "manifiestos", "maquinaria", null, null, "quejasAtendidas"];
// Las 8 cantidades, en el orden de la plantilla
export const CANTIDADES_AMB = [["Residuos ordinarios", "kg"], ["Residuos aprovechables (reciclables)", "kg"], ["Residuos de construcción y demolición (RCD)", "m³"], ["Residuos peligrosos (RESPEL)", "kg"],
  ["Residuos orgánicos / vegetales", "kg"], ["Agua", "m³"], ["Energía eléctrica", "kWh"], ["Combustible (ACPM y gasolina)", "gal"]];

export const SPEC_SEMANAL_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["semana", "Semana N°", "A", "C"], ["desde", "Desde", "E", "G"], ["hasta", "Hasta", "I", "K"],
    ["trabajadores", "Trabajadores (promedio)", "A", "C"], ["dias", "Días trabajados", "E", "G"], ["clima", "Clima predominante", "I", "K"],
    ["incidentes", "Incidentes ambientales", "A", "A", null, 1], ["quejas", "Quejas recibidas", "C", "C", null, 1], ["quejasAt", "Quejas atendidas", "E", "E", null, 1],
    ["abiertas", "Acciones abiertas al cierre", "G", "G", null, 1], ["vencidas", "Acciones vencidas", "I", "I", null, 1], ["cerradas", "Acciones cerradas en la semana", "K", "K", null, 1],
    ["logros", "Logros de la semana", "A", "C"], ["dificultades", "Dificultades o impactos nuevos", "A", "C"], ["plan", "Plan de la próxima semana", "A", "C"],
  ],
  tablas: [
    { clave: "actividades", cabecera: "No.", fin: "3. RESIDUOS GENERADOS Y CONSUMOS DE LA SEMANA", finEmpieza: true, columnas: { prog: "G", ejec: "H", obs: "J" }, encabezados: { prog: "Programado", ejec: "Ejecutado", obs: "Observaciones" } },
    { clave: "cantidades", cabecera: "No.", despuesDe: "actividades", fin: "4. SEGUIMIENTO", finEmpieza: true, columnas: { cant: "G", acum: "I", obs: "K" }, encabezados: { cant: "Cantidad de la semana", acum: "Acumulado de la obra", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_SEMANAL_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","semana":"C13","desde":"G13","hasta":"K13","trabajadores":"C14","dias":"G14","clima":"K14","incidentes":"A38","quejas":"C38","quejasAt":"E38","abiertas":"G38","vencidas":"I38","cerradas":"K38","logros":"C40","dificultades":"C41","plan":"C42","tablas":{"actividades":{"fila0":17,"n":9,"columnas":{"prog":"G","ejec":"H","obs":"J"}},"cantidades":{"fila0":28,"n":8,"columnas":{"cant":"G","acum":"I","obs":"K"}}},"firmas":{"elaboro":{"nombre":"C46","cargo":"C47"},"reviso":{"nombre":"G46","cargo":"G47"},"vobo":{"nombre":"K46","cargo":"K47"}}};
export const descubrirSemanalAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_SEMANAL_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
export const actividadAmbNueva = () => ({ prog: "", ejec: "", obs: "" });
export const cantidadAmbNueva = () => ({ cant: "", acum: "", obs: "" });

export function escribirSemanalAmbEnHoja(ws, d, celdas = CELDAS_SEMANAL_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "clima", "logros", "dificultades", "plan"]) poner(ws, C[k], d[k]);
  poner(ws, C.semana, numOTexto(texto(d.semana) !== "" ? d.semana : numeroSemana(d.desde)));          // si no se escribió, la semana es la del año (lunes a domingo)
  poner(ws, C.desde, fechaDDMMYYYY(d.desde)); poner(ws, C.hasta, fechaDDMMYYYY(d.hasta));
  for (const k of ["trabajadores", "dias", "incidentes", "quejas", "quejasAt", "abiertas", "vencidas", "cerradas"]) poner(ws, C[k], numOTexto(d[k]));
  const T = C.tablas || {};
  escribirTabla(ws, T.actividades, ACTIVIDADES_AMB.map((_, i) => { const a = arr(d.actividades)[i] || {}; return { prog: numOTexto(a.prog), ejec: numOTexto(a.ejec), obs: a.obs }; }));
  escribirTabla(ws, T.cantidades, CANTIDADES_AMB.map((_, i) => { const a = arr(d.cantidades)[i] || {}; return { cant: numOTexto(a.cant), acum: numOTexto(a.acum), obs: a.obs }; }));
  if (T.actividades) saltoDePagina(ws, T.actividades.fila0 + T.actividades.n - 1);        // la hoja 2 empieza en "3. Residuos generados y consumos"
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarSemanalAmb(d) {
  const faltan = [];
  if (!d.desde) faltan.push("la fecha de inicio de la semana");
  if (!d.hasta) faltan.push("la fecha final de la semana");
  else if (d.desde && d.hasta < d.desde) faltan.push("que la fecha final no sea anterior a la inicial");
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) faltan.push("lo ejecutado de al menos una actividad (puede ser 0)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarSemanalAmb().
export function camposFaltantesSemanalAmb(d) {
  const f = [];
  if (!d.desde) f.push({ etiqueta: "Desde", seccion: "datos" });
  if (!d.hasta || (d.desde && d.hasta < d.desde)) f.push({ etiqueta: "Hasta", seccion: "datos" });
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) f.push({ etiqueta: "Ejecutado", indice: 0, seccion: "actividades" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Completa SOLO las casillas vacías con lo registrado en la app (lo que la persona ya escribió no se pisa) y solo si hay algo registrado (no se inventan ceros)
export function rellenarSemanaAmbDesdeRegistros(d, regs) {
  const c = consolidarPeriodo(d.desde, d.hasta, regs, { residuosEstrictos: true });
  const acum = consolidarPeriodo("", d.hasta, regs, { residuosEstrictos: false });
  let llenadas = 0;
  const poner0 = (valor, actual) => { if (texto(actual) === "" && valor !== null && valor !== undefined && Number(valor) !== 0) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const actividades = ACTIVIDADES_AMB.map((_, i) => { const x = { ...actividadAmbNueva(), ...(arr(d.actividades)[i] || {}) }; if (AUTO[i]) x.ejec = poner0(c[AUTO[i]], x.ejec); return x; });
  // Residuos (los 5 primeros): lo registrado esa semana y el acumulado de la obra hasta el final de la semana. Los consumos no se traen: la lectura se registra por mes.
  const sem = cantidadesConsolidadas(c), ac = cantidadesConsolidadas(acum);
  const cantidades = CANTIDADES_AMB.map((_, i) => { const x = { ...cantidadAmbNueva(), ...(arr(d.cantidades)[i] || {}) }; if (i < 5) { x.cant = poner0(sem[i], x.cant); x.acum = poner0(ac[i], x.acum); } return x; });
  const cambios = { actividades, cantidades, trabajadores: poner0(c.consumos.trabajadores, d.trabajadores), incidentes: poner0(c.incidentes, d.incidentes), quejas: poner0(c.quejas, d.quejas),
    quejasAt: poner0(c.quejasAtendidas, d.quejasAt), abiertas: poner0(c.accionesAbiertas, d.abiertas), vencidas: poner0(c.accionesVencidas, d.vencidas), cerradas: poner0(c.accionesCerradas, d.cerradas) };
  return { llenadas, cambios };                 // el conteo se lee DESPUÉS de llenar todo
}

// Resumen que se guarda en el dispositivo
export function resumenSemanalAmb(d) {
  const ej = (i) => num(((arr(d.actividades)[i]) || {}).ejec);
  const cant = (i) => num(((arr(d.cantidades)[i]) || {}).cant);
  return { id: `${d.desde || "sin-fecha"}_${d.hasta || ""}`, formato: "semanal-amb", semana: texto(d.semana) !== "" ? d.semana : String(numeroSemana(d.desde)), desde: d.desde || "", hasta: d.hasta || "", proyecto: d.proyecto || "",
    inspecciones: ej(0), ordinarios: cant(0), aprovechables: cant(1), rcd: cant(2), respel: cant(3), incidentes: num(d.incidentes), quejas: num(d.quejas), abiertas: num(d.abiertas), vencidas: num(d.vencidas) };
}
