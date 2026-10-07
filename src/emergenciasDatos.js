// Plan de Emergencias de la obra (RYR-SS-019): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda, saltoDePagina } from "./sstBase";

export const CODIGO_EMERGENCIAS = "RYR-SS-019";
export const HOJA_EMERGENCIAS = "Plan de Emergencias";
export const ORIGENES_AMENAZA = ["Natural", "Tecnológico", "Social"];
export const PROBABILIDADES = ["Posible", "Probable", "Inminente"];
export const IMPACTOS = ["Bajo", "Medio", "Alto"];
export const SENALIZACION = ["Sí", "Parcial", "No"];
export const COLORES_AMENAZA = { Alto: { relleno: "C00000", fuente: "FFFFFF" }, Medio: { relleno: "FFC000", fuente: "000000" }, Bajo: { relleno: "00A651", fuente: "000000" } };
// Las 8 primeras amenazas y los 5 roles de la brigada vienen escritos en la plantilla, en este orden (las 2 últimas amenazas quedan para escribirlas)
export const AMENAZAS = ["Incendio o explosión", "Sismo", "Inundación o lluvias fuertes", "Caída de personas a distinto nivel", "Derrumbe o colapso de estructura o excavación", "Descarga eléctrica",
  "Derrame o fuga de sustancias peligrosas", "Accidente de tránsito dentro de la obra", "", ""];
export const ROLES_BRIGADA = ["Jefe de brigada", "Primeros auxilios", "Control de incendios", "Evacuación y rescate", "Comunicaciones"];

export const SPEC_EMERGENCIAS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"], ["direccion", "Dirección exacta de la obra", "A", "C"],
    ["fechaElaboracion", "Fecha de elaboración", "A", "C"], ["vigencia", "Vigencia hasta", "E", "G"], ["version", "Versión del plan", "I", "K"], ["responsable", "Responsable del plan", "A", "C"],
    ["telefono", "Teléfono", "H", "J"], ["trabajadores", "Trabajadores (promedio)", "A", "C"], ["visitantes", "Visitantes por día (aprox.)", "E", "G"], ["horario", "Horario de trabajo", "I", "K"],
    ["puntoEncuentro", "Punto de encuentro", "A", "C"], ["ruta", "Ruta de evacuación", "A", "C"], ["extintores", "Extintores (N° y tipo)", "A", "C"], ["botiquines", "Botiquines (N°)", "H", "J"],
    ["camillas", "Camillas (N°)", "A", "C"], ["alarma", "Alarma o aviso", "H", "J"], ["senalizacion", "Señalización instalada", "A", "C"], ["centroMedico", "Centro médico más cercano", "H", "J"],
    ["procIncendio", "En caso de incendio", "A", "C"], ["procSismo", "En caso de sismo o evacuación", "A", "C"], ["procAccidente", "En caso de accidente con lesionados", "A", "C"],
  ],
  tablas: [
    { clave: "amenazas", cabecera: "No.", fin: "3. BRIGADA DE EMERGENCIAS", finEmpieza: true, columnas: { amenaza: "B", origen: "E", prob: "G", impacto: "I", nivel: "J", medidas: "K" },
      encabezados: { amenaza: "Amenaza", origen: "Origen", prob: "Probabilidad", impacto: "Impacto", nivel: "Nivel", medidas: "Medidas principales" } },
    { clave: "brigada", cabecera: "No.", despuesDe: "amenazas", fin: "4. RECURSOS Y RUTAS", finEmpieza: true, columnas: { nombre: "E", telefono: "H", suplente: "J" }, encabezados: { nombre: "Nombre", telefono: "Teléfono", suplente: "Suplente" } },
    { clave: "simulacros", cabecera: "No.", despuesDe: "brigada", fin: "7. FIRMAS", finEmpieza: true, columnas: { fecha: "B", tipo: "D", participantes: "G", minutos: "H", obs: "I" },
      encabezados: { fecha: "Fecha", tipo: "Tipo de simulacro", participantes: "Participantes", minutos: "Minutos", obs: "Observaciones y mejoras" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_EMERGENCIAS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","direccion":"C13","fechaElaboracion":"C14","vigencia":"G14","version":"K14","responsable":"C15","telefono":"J15","trabajadores":"C16","visitantes":"G16","horario":"K16","puntoEncuentro":"C37","ruta":"C38","extintores":"C39","botiquines":"J39","camillas":"C40","alarma":"J40","senalizacion":"C41","centroMedico":"J41","procIncendio":"C43","procSismo":"C44","procAccidente":"C45","tablas":{"amenazas":{"fila0":19,"n":10,"columnas":{"amenaza":"B","origen":"E","prob":"G","impacto":"I","nivel":"J","medidas":"K"}},"brigada":{"fila0":31,"n":5,"columnas":{"nombre":"E","telefono":"H","suplente":"J"}},"simulacros":{"fila0":48,"n":4,"columnas":{"fecha":"B","tipo":"D","participantes":"G","minutos":"H","obs":"I"}}},"firmas":{"elaboro":{"nombre":"C55","cargo":"C56"},"reviso":{"nombre":"G55","cargo":"G56"},"vobo":{"nombre":"K55","cargo":"K56"}}};
export const descubrirEmergencias = (ws) => descubrirPorEtiquetas(ws, SPEC_EMERGENCIAS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const amenazaNueva = (nombre = "") => ({ amenaza: nombre, origen: "", prob: "", impacto: "", medidas: "" });
export const brigadistaNuevo = () => ({ nombre: "", telefono: "", suplente: "" });
export const simulacroNuevo = () => ({ fecha: "", tipo: "", participantes: "", minutos: "", obs: "" });
const simulacroVacio = (s) => !(s && (s.fecha || texto(s.tipo) || texto(s.participantes) || texto(s.minutos) || texto(s.obs)));
export const simulacrosConDatos = (d) => arr(d.simulacros).filter((s) => !simulacroVacio(s));
const evaluada = (a) => !!(a && texto(a.prob) && texto(a.impacto));
// Nivel de la amenaza = probabilidad × impacto (Posible/Bajo = 1 … Inminente/Alto = 3): 6 o más Alto, 3 o 4 Medio, menos Bajo (la misma fórmula del Excel)
export function nivelAmenaza(a) {
  const p = PROBABILIDADES.indexOf((a || {}).prob) + 1, i = IMPACTOS.indexOf((a || {}).impacto) + 1;
  if (!p || !i) return "";
  const v = p * i; return v >= 6 ? "Alto" : v >= 3 ? "Medio" : "Bajo";
}
export const amenazasAltas = (d) => arr(d.amenazas).filter((a) => nivelAmenaza(a) === "Alto");

export function escribirEmergenciasEnHoja(ws, d, celdas = CELDAS_EMERGENCIAS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "direccion", "version", "responsable", "telefono", "horario", "puntoEncuentro", "ruta", "extintores", "alarma", "senalizacion", "centroMedico", "procIncendio", "procSismo", "procAccidente"]) poner(ws, C[k], d[k]);
  for (const k of ["trabajadores", "visitantes", "botiquines", "camillas"]) poner(ws, C[k], num(d[k]) === null ? d[k] : num(d[k]));
  poner(ws, C.fechaElaboracion, fechaDDMMYYYY(d.fechaElaboracion)); poner(ws, C.vigencia, fechaDDMMYYYY(d.vigencia));
  const T = C.tablas || {};
  const am = arr(d.amenazas);
  escribirTabla(ws, T.amenazas, AMENAZAS.map((n, i) => { const a = am[i] || {}; return { amenaza: a.amenaza !== undefined ? a.amenaza : n, origen: a.origen, prob: a.prob, impacto: a.impacto, medidas: a.medidas }; }));
  // El nivel (Alto, Medio o Bajo) lo calcula el Excel; aquí se pinta de su color (las reglas de color de Excel no viajan en la plantilla)
  if (T.amenazas && T.amenazas.columnas && T.amenazas.columnas.nivel) {
    AMENAZAS.forEach((_, i) => { const c = COLORES_AMENAZA[nivelAmenaza(am[i])]; if (c) pintarCelda(ws, T.amenazas.columnas.nivel + (T.amenazas.fila0 + i), "FF" + c.relleno, "FF" + c.fuente); });
  }
  escribirTabla(ws, T.brigada, ROLES_BRIGADA.map((_, i) => { const b = arr(d.brigada)[i] || {}; return { nombre: b.nombre, telefono: b.telefono, suplente: b.suplente }; }));
  escribirTabla(ws, T.simulacros, simulacrosConDatos(d).map((s) => ({ fecha: fechaDDMMYYYY(s.fecha), tipo: s.tipo, participantes: num(s.participantes) === null ? s.participantes : num(s.participantes), minutos: num(s.minutos) === null ? s.minutos : num(s.minutos), obs: s.obs })));
  if (T.brigada) saltoDePagina(ws, T.brigada.fila0 + T.brigada.n - 1);         // la hoja 2 empieza en "4. Recursos y rutas" (la librería pierde el salto de la plantilla)
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarEmergencias(d) {
  const faltan = [];
  if (!d.fechaElaboracion) faltan.push("la fecha de elaboración");
  if (!texto(d.direccion)) faltan.push("la dirección de la obra");
  if (!texto(d.responsable)) faltan.push("el responsable del plan");
  if (!arr(d.amenazas).some(evaluada)) faltan.push("al menos una amenaza con su probabilidad e impacto");
  else if (arr(d.amenazas).some((a) => a && (texto(a.prob) || texto(a.impacto)) && !evaluada(a))) faltan.push("la probabilidad y el impacto de cada amenaza que empezaste a evaluar");
  if (!texto((arr(d.brigada)[0] || {}).nombre)) faltan.push("el jefe de brigada");
  if (!texto(d.puntoEncuentro)) faltan.push("el punto de encuentro");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora el plan");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarEmergencias().
export function camposFaltantesEmergencias(d) {
  const f = [];
  if (!d.fechaElaboracion) f.push({ etiqueta: "Fecha de elaboración", seccion: "datos" });
  if (!texto(d.direccion)) f.push({ etiqueta: "Dirección exacta de la obra", seccion: "datos" });
  if (!texto(d.responsable)) f.push({ etiqueta: "Responsable del plan", seccion: "datos" });
  const am = arr(d.amenazas);
  if (!am.some(evaluada)) f.push({ etiqueta: "Probabilidad 1", seccion: "amenazas" });
  else am.forEach((a, i) => { if (a && (texto(a.prob) || texto(a.impacto)) && !evaluada(a)) { if (!texto(a.prob)) f.push({ etiqueta: `Probabilidad ${i + 1}`, seccion: "amenazas" }); if (!texto(a.impacto)) f.push({ etiqueta: `Impacto ${i + 1}`, seccion: "amenazas" }); } });
  if (!texto((arr(d.brigada)[0] || {}).nombre)) f.push({ etiqueta: "Nombre del jefe de brigada", seccion: "brigada" });
  if (!texto(d.puntoEncuentro)) f.push({ etiqueta: "Punto de encuentro", seccion: "recursos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo (el plan vigente)
export function resumenEmergencias(d) {
  return { id: `${d.fechaElaboracion || "sin-fecha"}_${d.version || ""}`, formato: "emergencias", fecha: d.fechaElaboracion || "", vigencia: d.vigencia || "", proyecto: d.proyecto || "", version: d.version || "",
    amenazasAltas: amenazasAltas(d).length, simulacros: simulacrosConDatos(d).length, ultimoSimulacro: simulacrosConDatos(d).map((s) => s.fecha).filter(Boolean).sort().slice(-1)[0] || "" };
}
