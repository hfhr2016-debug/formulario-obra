// Informe Mensual Ambiental (RYR-AM-020): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Consolida lo registrado en los demás formatos durante el mes (consolidadoAmb.js); nada se inventa: lo que no hay registrado queda en blanco.
import { poner, escribirTabla, descubrirPorEtiquetas, saltoDePagina } from "./sstBase";
import { consolidarPeriodo, cantidadesConsolidadas, rangoMes, MESES } from "./consolidadoAmb";

export const CODIGO_MENSUAL_AMB = "RYR-AM-020";
export const HOJA_MENSUAL_AMB = "Informe Mensual Ambiental";
export { MESES };
// Las 8 actividades vienen escritas en la plantilla, en este orden; AUTO dice de dónde sale lo ejecutado (null = se escribe a mano)
export const ACTIVIDADES_MES_AMB = ["Inspecciones ambientales de obra", "Charlas y capacitaciones ambientales", "Entrega de residuos a gestores autorizados", "Monitoreos o mediciones (ruido, material particulado, agua)",
  "Mantenimiento de maquinaria y equipos", "Inspección de sustancias químicas y combustibles", "Seguimiento a contratistas", "Acciones correctivas cerradas"];
const AUTO = ["inspecciones", "capacitaciones", "manifiestos", "monitoreos", "maquinaria", "quimicosHidro", "contratistasEvaluados", "accionesCerradas"];
export const RESIDUOS_MES_AMB = [["Residuos ordinarios", "kg"], ["Residuos aprovechables (reciclables)", "kg"], ["Residuos de construcción y demolición (RCD)", "m³"], ["Residuos peligrosos (RESPEL)", "kg"], ["Residuos orgánicos / vegetales", "kg"]];
export const CONSUMOS_MES_AMB = [["Agua", "m³"], ["Energía eléctrica", "kWh"], ["Combustible (ACPM y gasolina)", "gal"]];
export const GESTION_MES_AMB = [["Incidentes ambientales", "N°"], ["Quejas de la comunidad recibidas", "N°"], ["Quejas atendidas", "N°"], ["Acciones correctivas abiertas al cierre", "N°"], ["Acciones correctivas vencidas", "N°"], ["Contratistas evaluados", "N°"]];

export const SPEC_MENSUAL_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["mes", "Mes", "A", "C"], ["anio", "Año", "E", "G"], ["nInforme", "Informe N°", "I", "K"],
    ["trabajadores", "Trabajadores (promedio)", "A", "C"], ["dias", "Días trabajados", "E", "G"], ["avance", "% avance de obra", "I", "K"],
    ["hechos", "Hechos relevantes del mes", "A", "C"], ["conclusiones", "Conclusiones", "A", "C"], ["planMes", "Plan del próximo mes", "A", "C"],
  ],
  tablas: [
    { clave: "actividades", cabecera: "No.", fin: "3. RESIDUOS GENERADOS", finEmpieza: true, columnas: { prog: "G", ejec: "H", obs: "J" }, encabezados: { prog: "Programado", ejec: "Ejecutado", obs: "Observaciones" } },
    { clave: "residuos", cabecera: "No.", despuesDe: "actividades", fin: "4. CONSUMOS DE RECURSOS", finEmpieza: true, columnas: { cant: "G", acum: "I", obs: "K" }, encabezados: { cant: "Cantidad del mes", acum: "Acumulado de la obra", obs: "Gestor o destino" } },
    { clave: "consumos", cabecera: "No.", despuesDe: "residuos", fin: "5. GESTIÓN Y SEGUIMIENTO", finEmpieza: true, columnas: { cant: "G", acum: "I", obs: "K" }, encabezados: { cant: "Consumo del mes", acum: "Acumulado de la obra", obs: "Observaciones" } },
    { clave: "gestion", cabecera: "No.", despuesDe: "consumos", fin: "6. HECHOS RELEVANTES, CONCLUSIONES Y PLAN", finEmpieza: true, columnas: { cant: "G", acum: "I", obs: "K" }, encabezados: { cant: "Cantidad del mes", acum: "Acumulado de la obra", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MENSUAL_AMB = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","mes":"C13","anio":"G13","nInforme":"K13","trabajadores":"C14","dias":"G14","avance":"K14","hechos":"C46","conclusiones":"C47","planMes":"C48","tablas":{"actividades":{"fila0":17,"n":8,"columnas":{"prog":"G","ejec":"H","obs":"J"}},"residuos":{"fila0":27,"n":5,"columnas":{"cant":"G","acum":"I","obs":"K"}},"consumos":{"fila0":34,"n":3,"columnas":{"cant":"G","acum":"I","obs":"K"}},"gestion":{"fila0":39,"n":6,"columnas":{"cant":"G","acum":"I","obs":"K"}}},"firmas":{"elaboro":{"nombre":"C52","cargo":"C53"},"reviso":{"nombre":"G52","cargo":"G53"},"vobo":{"nombre":"K52","cargo":"K53"}}};
export const descubrirMensualAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_MENSUAL_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
export const actividadMesNueva = () => ({ prog: "", ejec: "", obs: "" });
export const cantidadMesNueva = () => ({ cant: "", acum: "", obs: "" });
export const indiceMes = (mes) => MESES.indexOf(mes);
// El avance de obra se escribe en % (45) y el formato lo guarda como fracción (0,45) con formato de porcentaje
const avanceFraccion = (v) => { const n = num(v); return n === null ? "" : n / 100; };

export function escribirMensualAmbEnHoja(ws, d, celdas = CELDAS_MENSUAL_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "mes", "hechos", "conclusiones", "planMes"]) poner(ws, C[k], d[k]);
  for (const k of ["anio", "nInforme", "trabajadores", "dias"]) poner(ws, C[k], numOTexto(d[k]));
  poner(ws, C.avance, avanceFraccion(d.avance));
  const T = C.tablas || {};
  escribirTabla(ws, T.actividades, ACTIVIDADES_MES_AMB.map((_, i) => { const a = arr(d.actividades)[i] || {}; return { prog: numOTexto(a.prog), ejec: numOTexto(a.ejec), obs: a.obs }; }));
  const cant = (lista, grupo) => lista.map((_, i) => { const a = arr(d[grupo])[i] || {}; return { cant: numOTexto(a.cant), acum: numOTexto(a.acum), obs: a.obs }; });
  escribirTabla(ws, T.residuos, cant(RESIDUOS_MES_AMB, "residuos"));
  escribirTabla(ws, T.consumos, cant(CONSUMOS_MES_AMB, "consumos"));
  escribirTabla(ws, T.gestion, cant(GESTION_MES_AMB, "gestion"));
  if (T.residuos) saltoDePagina(ws, T.residuos.fila0 + T.residuos.n - 1);                // la hoja 2 empieza en "4. Consumos de recursos"
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarMensualAmb(d) {
  const faltan = [];
  if (indiceMes(d.mes) < 0) faltan.push("el mes");
  if (!/^\d{4}$/.test(texto(d.anio))) faltan.push("el año (4 cifras)");
  if (texto(d.avance) !== "" && (num(d.avance) === null || num(d.avance) < 0 || num(d.avance) > 100)) faltan.push("el % de avance de obra (entre 0 y 100)");
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) faltan.push("lo ejecutado de al menos una actividad (puede ser 0)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el informe");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarMensualAmb().
export function camposFaltantesMensualAmb(d) {
  const f = [];
  if (indiceMes(d.mes) < 0) f.push({ etiqueta: "Mes", seccion: "datos" });
  if (!/^\d{4}$/.test(texto(d.anio))) f.push({ etiqueta: "Año", seccion: "datos" });
  if (texto(d.avance) !== "" && (num(d.avance) === null || num(d.avance) < 0 || num(d.avance) > 100)) f.push({ etiqueta: "% avance de obra", seccion: "datos" });
  if (!arr(d.actividades).some((a) => a && texto(a.ejec) !== "")) f.push({ etiqueta: "Ejecutado", indice: 0, seccion: "actividades" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Completa SOLO las casillas vacías con lo registrado en la app (lo que la persona ya escribió no se pisa) y solo si hay algo registrado (no se inventan ceros)
export function rellenarMesAmbDesdeRegistros(d, regs) {
  const idx = indiceMes(d.mes);
  if (idx < 0 || !/^\d{4}$/.test(texto(d.anio))) return { llenadas: 0, cambios: {} };
  const { desde, hasta } = rangoMes(d.anio, idx);
  const c = consolidarPeriodo(desde, hasta, regs), ac = consolidarPeriodo("", hasta, regs);
  let llenadas = 0;
  const poner0 = (valor, actual) => { if (texto(actual) === "" && valor !== null && valor !== undefined && Number(valor) !== 0) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const actividades = ACTIVIDADES_MES_AMB.map((_, i) => { const x = { ...actividadMesNueva(), ...(arr(d.actividades)[i] || {}) }; x.ejec = poner0(c[AUTO[i]], x.ejec); return x; });
  const mes = cantidadesConsolidadas(c), acum = cantidadesConsolidadas(ac);
  const relleno = (lista, grupo, desdeI) => lista.map((_, i) => { const x = { ...cantidadMesNueva(), ...(arr(d[grupo])[i] || {}) }; x.cant = poner0(mes[desdeI + i], x.cant); x.acum = poner0(acum[desdeI + i], x.acum); return x; });
  const residuos = relleno(RESIDUOS_MES_AMB, "residuos", 0), consumos = relleno(CONSUMOS_MES_AMB, "consumos", 5);
  const g = [[c.incidentes, ac.incidentes], [c.quejas, ac.quejas], [c.quejasAtendidas, ac.quejasAtendidas], [c.accionesAbiertas, null], [c.accionesVencidas, null], [c.contratistasEvaluados, ac.contratistasEvaluados]];
  const gestion = GESTION_MES_AMB.map((_, i) => { const x = { ...cantidadMesNueva(), ...(arr(d.gestion)[i] || {}) }; x.cant = poner0(g[i][0], x.cant); x.acum = poner0(g[i][1], x.acum); return x; });
  const cambios = { actividades, residuos, consumos, gestion, trabajadores: poner0(c.consumos.trabajadores, d.trabajadores), dias: poner0(c.consumos.diasConsumo, d.dias) };
  return { llenadas, cambios };                 // el conteo se lee DESPUÉS de llenar todo
}

// Resumen que se guarda en el dispositivo: el Informe Trimestral y el Resumen para el ICA lo usan
export function resumenMensualAmb(d) {
  const ej = (i) => num(((arr(d.actividades)[i]) || {}).ejec);
  const cm = (g, i) => num(((arr(d[g])[i]) || {}).cant);
  const idx = indiceMes(d.mes);
  return { id: `${texto(d.anio)}-${String(idx + 1).padStart(2, "0")}`, formato: "mensual-amb", mes: d.mes || "", anio: texto(d.anio), nInforme: texto(d.nInforme), proyecto: d.proyecto || "", avance: num(d.avance),
    valores: { ordinarios: cm("residuos", 0), aprovechables: cm("residuos", 1), rcd: cm("residuos", 2), respel: cm("residuos", 3), agua: cm("consumos", 0), energia: cm("consumos", 1), combustible: cm("consumos", 2),
      incidentes: cm("gestion", 0), quejas: cm("gestion", 1), inspecciones: ej(0), capacitaciones: ej(1), accionesCerradas: ej(7) },
    abiertas: cm("gestion", 3), vencidas: cm("gestion", 4) };
}
