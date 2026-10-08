// Resumen para el Informe de Cumplimiento Ambiental, ICA (RYR-AM-022): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Consolida el periodo que se reporta a la autoridad: las cifras salen de lo registrado en la app (consolidadoAmb.js); lo que no hay registrado queda en blanco.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { consolidarPeriodo, cantidadesConsolidadas } from "./consolidadoAmb";

export const CODIGO_ICA = "RYR-AM-022";
export const HOJA_ICA = "Resumen para el ICA";
export const ESTADOS_OBLIGACION = ["Cumple", "Parcial", "No cumple", "No aplica"];
export const ESTADOS_PERMISO = ["Vigente", "En trámite", "Vencido", "No aplica"];
export const N_OBLIGACIONES = 12, N_PERMISOS = 4;
// Los 8 conceptos vienen escritos en la plantilla, en este orden (texto solo para la pantalla)
export const CONCEPTOS_ICA = [["Residuos ordinarios", "kg"], ["Residuos aprovechables (reciclables)", "kg"], ["Residuos de construcción y demolición (RCD)", "m³"], ["Residuos peligrosos (RESPEL)", "kg"],
  ["Residuos orgánicos / vegetales", "kg"], ["Agua", "m³"], ["Energía eléctrica", "kWh"], ["Combustible (ACPM y gasolina)", "gal"]];
// Fichas de manejo habituales en una obra de reformas: se ofrecen como punto de partida y se pueden cambiar
export const FICHAS_HABITUALES = ["Manejo de residuos sólidos ordinarios y aprovechables", "Manejo de residuos de construcción y demolición (RCD)", "Manejo de residuos peligrosos (RESPEL)", "Manejo de aguas y vertimientos",
  "Control de emisiones, material particulado y ruido", "Manejo de combustibles y sustancias químicas", "Manejo de maquinaria y equipos", "Manejo de zonas verdes y arbolado", "Atención de quejas y relaciones con la comunidad", "Capacitación y educación ambiental"];

export const SPEC_ICA = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["titular", "Titular o contratista", "A", "C"], ["nit", "NIT", "H", "J"],
    ["autoridad", "Autoridad ambiental", "A", "C"], ["licencia", "Licencia, resolución o expediente", "H", "J"],
    ["ubicacion", "Ubicación", "A", "C"], ["nInforme", "Informe ICA N°", "H", "J"],
    ["desde", "Periodo desde", "A", "C"], ["hasta", "Periodo hasta", "E", "G"], ["avance", "% avance de obra", "I", "K"],
    ["incidentes", "Incidentes ambientales", "A", "A", null, 1], ["quejas", "Quejas recibidas", "C", "C", null, 1], ["atendidas", "Quejas atendidas", "E", "E", null, 1],
    ["abiertas", "Acciones correctivas abiertas", "G", "G", null, 1], ["cerradas", "Acciones correctivas cerradas", "I", "I", null, 1], ["requerimientos", "Requerimientos de la autoridad", "K", "K", null, 1],
    ["conclusiones", "Conclusiones del periodo", "A", "C"], ["noConformidades", "No conformidades y acciones propuestas", "A", "C"], ["anexos", "Anexos que acompañan el ICA", "A", "C"],
  ],
  tablas: [
    { clave: "obligaciones", cabecera: "No.", fin: "Cumplimiento promedio de las obligaciones", finEmpieza: true, columnas: { obligacion: "B", medida: "F", estado: "I", cumplimiento: "J", anexo: "K" },
      encabezados: { obligacion: "Obligación o ficha de manejo", medida: "Medida ejecutada en el periodo", estado: "Estado", cumplimiento: "Cumplimiento", anexo: "Anexo o evidencia" } },
    { clave: "residuos", cabecera: "No.", despuesDe: "obligaciones", fin: "4. PERMISOS AMBIENTALES", finEmpieza: true, columnas: { cant: "G", acum: "I", gestor: "K" },
      encabezados: { cant: "Cantidad del periodo", acum: "Acumulado del proyecto", gestor: "Gestor o fuente" } },
    { clave: "permisos", cabecera: "No.", despuesDe: "residuos", fin: "5. INCIDENTES, QUEJAS Y NO CONFORMIDADES", finEmpieza: true, columnas: { permiso: "B", resolucion: "F", vigente: "H", estado: "J", obs: "K" },
      encabezados: { permiso: "Permiso o autorización", resolucion: "Resolución N°", vigente: "Vigente hasta", estado: "Estado", obs: "Observación" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ICA = {"proyecto":"C11","titular":"C12","nit":"J12","autoridad":"C13","licencia":"J13","ubicacion":"C14","nInforme":"J14","desde":"C15","hasta":"G15","avance":"K15","incidentes":"A49","quejas":"C49","atendidas":"E49","abiertas":"G49","cerradas":"I49","requerimientos":"K49","conclusiones":"C51","noConformidades":"C52","anexos":"C53","tablas":{"obligaciones":{"fila0":18,"n":12,"columnas":{"obligacion":"B","medida":"F","estado":"I","cumplimiento":"J","anexo":"K"}},"residuos":{"fila0":33,"n":8,"columnas":{"cant":"G","acum":"I","gestor":"K"}},"permisos":{"fila0":43,"n":4,"columnas":{"permiso":"B","resolucion":"F","vigente":"H","estado":"J","obs":"K"}}},"firmas":{"elaboro":{"nombre":"C57","cargo":"C58"},"reviso":{"nombre":"G57","cargo":"G58"},"vobo":{"nombre":"K57","cargo":"K58"}}};
export const descubrirIca = (ws) => descubrirPorEtiquetas(ws, SPEC_ICA);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numOTexto = (v) => (num(v) === null ? v : num(v));
const fraccion = (v) => { const n = num(v); return n === null ? "" : n / 100; };         // el % se escribe como 90 y el formato lo guarda como 0,9
export const obligacionNueva = () => ({ obligacion: "", medida: "", estado: "", cumplimiento: "", anexo: "" });
export const cantidadIcaNueva = () => ({ cant: "", acum: "", gestor: "" });
export const permisoIcaNuevo = () => ({ permiso: "", resolucion: "", vigente: "", estado: "", obs: "" });

export function escribirIcaEnHoja(ws, d, celdas = CELDAS_ICA) {
  const C = celdas;
  for (const k of ["proyecto", "titular", "nit", "autoridad", "licencia", "ubicacion", "conclusiones", "noConformidades", "anexos"]) poner(ws, C[k], d[k]);
  poner(ws, C.nInforme, numOTexto(d.nInforme));
  poner(ws, C.desde, fechaDDMMYYYY(d.desde)); poner(ws, C.hasta, fechaDDMMYYYY(d.hasta)); poner(ws, C.avance, fraccion(d.avance));
  for (const k of ["incidentes", "quejas", "atendidas", "abiertas", "cerradas", "requerimientos"]) poner(ws, C[k], numOTexto(d[k]));
  const T = C.tablas || {};
  escribirTabla(ws, T.obligaciones, Array.from({ length: N_OBLIGACIONES }, (_, i) => { const x = arr(d.obligaciones)[i] || {}; return { obligacion: x.obligacion, medida: x.medida, estado: x.estado, cumplimiento: fraccion(x.cumplimiento), anexo: x.anexo }; }));
  escribirTabla(ws, T.residuos, CONCEPTOS_ICA.map((_, i) => { const x = arr(d.residuos)[i] || {}; return { cant: numOTexto(x.cant), acum: numOTexto(x.acum), gestor: x.gestor }; }));
  escribirTabla(ws, T.permisos, Array.from({ length: N_PERMISOS }, (_, i) => { const x = arr(d.permisos)[i] || {}; return { permiso: x.permiso, resolucion: x.resolucion, vigente: fechaDDMMYYYY(x.vigente), estado: x.estado, obs: x.obs }; }));
  if (T.obligaciones) saltoDePagina(ws, T.obligaciones.fila0 + T.obligaciones.n);           // la hoja 2 empieza en "3. Residuos y consumos del periodo" (la fila del promedio queda en la hoja 1)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

const fueraDe100 = (v) => texto(v) !== "" && (num(v) === null || num(v) < 0 || num(v) > 100);
const conNombre = (d) => arr(d.obligaciones).map((x, i) => ({ x: x || {}, i })).filter(({ x }) => texto(x.obligacion) !== "");
export function validarIca(d) {
  const faltan = [];
  if (!d.desde) faltan.push("la fecha de inicio del periodo");
  if (!d.hasta) faltan.push("la fecha final del periodo");
  else if (d.desde && d.hasta < d.desde) faltan.push("que la fecha final no sea anterior a la inicial");
  if (fueraDe100(d.avance)) faltan.push("el % de avance de obra (entre 0 y 100)");
  if (!conNombre(d).length) faltan.push("al menos una obligación o ficha de manejo");
  if (conNombre(d).some(({ x }) => texto(x.estado) === "")) faltan.push("el estado de cada obligación escrita");
  if (conNombre(d).some(({ x }) => fueraDe100(x.cumplimiento))) faltan.push("el cumplimiento de cada obligación (entre 0 y 100)");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el resumen");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]
export function camposFaltantesIca(d) {
  const f = [];
  if (!d.desde) f.push({ etiqueta: "Periodo desde", seccion: "datos" });
  if (!d.hasta || (d.desde && d.hasta < d.desde)) f.push({ etiqueta: "Periodo hasta", seccion: "datos" });
  if (fueraDe100(d.avance)) f.push({ etiqueta: "% avance de obra", seccion: "datos" });
  if (!conNombre(d).length) f.push({ etiqueta: "Obligación o ficha de manejo", indice: 0, seccion: "obligaciones" });
  conNombre(d).forEach(({ x, i }) => { if (texto(x.estado) === "") f.push({ etiqueta: "Estado", indice: i, seccion: "obligaciones" }); });
  conNombre(d).forEach(({ x, i }) => { if (fueraDe100(x.cumplimiento)) f.push({ etiqueta: "Cumplimiento (%)", indice: i, seccion: "obligaciones" }); });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Promedio de los cumplimientos escritos (lo mismo que calcula la fórmula del Excel)
export function promedioCumplimiento(d) {
  const xs = arr(d.obligaciones).map((x) => num((x || {}).cumplimiento)).filter((x) => x !== null);
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
}

// ---------- Traer lo ya registrado ----------
// Completa SOLO las casillas vacías: residuos y consumos del periodo y acumulado de la obra, incidentes, quejas y acciones, los permisos de la Ficha Ambiental y la autoridad/expediente.
// No se inventan ceros: lo que no hay registrado queda en blanco.
export function rellenarIcaDesdeRegistros(d, regs, ficha = null, mensuales = []) {
  if (!d.desde || !d.hasta) return { llenadas: 0, cambios: {} };
  let llenadas = 0;
  const poner0 = (valor, actual) => { if (texto(actual) === "" && valor !== null && valor !== undefined && Number(valor) !== 0) { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const ponerTxt = (valor, actual) => { if (texto(actual) === "" && texto(valor) !== "") { llenadas++; return String(valor); } return actual === undefined || actual === null ? "" : actual; };
  const c = consolidarPeriodo(d.desde, d.hasta, regs), ac = consolidarPeriodo("", d.hasta, regs);
  const mes = cantidadesConsolidadas(c), acum = cantidadesConsolidadas(ac);
  const residuos = CONCEPTOS_ICA.map((_, i) => { const x = { ...cantidadIcaNueva(), ...(arr(d.residuos)[i] || {}) }; x.cant = poner0(mes[i], x.cant); x.acum = poner0(acum[i], x.acum); return x; });
  // Permisos que la Ficha Ambiental dice que aplican a la obra (solo en las filas vacías)
  const delPermiso = arr(ficha && ficha.permisos);
  const permisos = Array.from({ length: N_PERMISOS }, (_, i) => ({ ...permisoIcaNuevo(), ...(arr(d.permisos)[i] || {}) }));
  const yaEstan = new Set(permisos.map((p) => texto(p.permiso).toLowerCase()).filter(Boolean));
  const pendientes = delPermiso.filter((f) => texto(f.nombre) && !yaEstan.has(texto(f.nombre).toLowerCase()));          // un permiso ya escrito no se vuelve a traer
  let k = 0;
  permisos.forEach((p) => { if (texto(p.permiso) === "" && k < pendientes.length) { const f = pendientes[k++]; p.permiso = texto(f.nombre); p.resolucion = ponerTxt(f.resolucion, p.resolucion); p.vigente = ponerTxt(f.vigencia, p.vigente); llenadas++; } });
  // % de avance: el del último Informe Mensual guardado dentro del periodo
  const enPeriodo = arr(mensuales).filter((m) => m.id && m.avance !== null && m.avance !== undefined && `${m.id}-01` >= d.desde.slice(0, 7) + "-01" && `${m.id}-01` <= d.hasta).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const ult = enPeriodo[enPeriodo.length - 1];
  const cambios = { residuos, permisos, avance: poner0(ult ? ult.avance : null, d.avance), incidentes: poner0(c.incidentes, d.incidentes), quejas: poner0(c.quejas, d.quejas), atendidas: poner0(c.quejasAtendidas, d.atendidas),
    abiertas: poner0(c.accionesAbiertas, d.abiertas), cerradas: poner0(c.accionesCerradas, d.cerradas),
    autoridad: ponerTxt(ficha && ficha.autoridad, d.autoridad), licencia: ponerTxt(ficha && ficha.resolucion, d.licencia) };
  return { llenadas, cambios };
}

// Resumen que se guarda en el dispositivo
export function resumenIca(d) {
  return { id: `${d.desde || "sin-fecha"}_${d.hasta || ""}`, formato: "ica", nInforme: texto(d.nInforme), proyecto: d.proyecto || "", desde: d.desde || "", hasta: d.hasta || "", autoridad: d.autoridad || "",
    obligaciones: conNombre(d).length, cumplimiento: promedioCumplimiento(d), avance: num(d.avance) };
}
