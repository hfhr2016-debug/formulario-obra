// Permiso de trabajo de alto riesgo (RYR-SS-007): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_PERMISO = "RYR-SS-007";
export const HOJA_PERMISO = "Permisos de Trabajo";
export const VIGENCIAS = ["Un turno", "Un día", "Varios días (renovar a diario)"];
export const RESPUESTAS = ["Sí", "No", "N/A"];
export const LECTURAS = ["Inicial", "Intermedia", "Final"];

// Tipos de trabajo, tal como están en la plantilla (sin la casilla ☐)
export const TIPOS_TRABAJO = ["Trabajo en alturas", "Trabajo en caliente", "Espacios confinados", "Excavaciones y zanjas", "Riesgo eléctrico / bloqueo (LOTO)", "Izaje de cargas", "Demolición o desmonte", "Otro: ______________"];
// Qué verificación específica aplica a cada tipo de trabajo (el grupo es la palabra que abre cada condición específica)
export const GRUPO_DE_TIPO = {
  "Trabajo en alturas": "ALTURAS", "Trabajo en caliente": "CALIENTE", "Espacios confinados": "CONFINADOS",
  "Excavaciones y zanjas": "EXCAVACIONES", "Riesgo eléctrico / bloqueo (LOTO)": "ELÉCTRICO", "Izaje de cargas": "IZAJE",
};
export const VERIF_PREVIA = ["ATS elaborado, socializado y firmado por todo el personal que ejecuta", "Personal con aptitud médica y capacitación o certificación vigente para este trabajo", "Elementos de protección personal completos, certificados y en buen estado", "Área demarcada, señalizada y con acceso restringido a personas ajenas", "Herramientas, equipos y sistemas de protección inspeccionados", "Plan de emergencia y de rescate conocido; medio de comunicación disponible", "Extintor y botiquín disponibles en el sitio del trabajo", "Condiciones del entorno evaluadas (lluvia, viento, tormenta eléctrica)", "Permisos complementarios tramitados y adjuntos (si aplica)", "Coordinación con otras actividades simultáneas en el área"];
export const VERIF_ESPECIFICA = ["ALTURAS · Puntos de anclaje certificados; arnés, eslingas y línea de vida inspeccionados", "ALTURAS · Andamios o plataformas certificados y con tarjeta de inspección", "ALTURAS · Equipo y personal de rescate en alturas disponibles", "CALIENTE · Área libre de combustibles; extintor y vigía de fuego presentes", "CALIENTE · Cilindros, mangueras y equipos de soldadura o corte inspeccionados", "CALIENTE · Protección contra chispas y escoria (mantas, pantallas)", "CONFINADOS · Espacio aislado, ventilado y con medición de gases previa", "CONFINADOS · Vigía permanente en el exterior y comunicación constante", "CONFINADOS · Equipo de rescate y de respiración disponible", "EXCAVACIONES · Servicios enterrados localizados y señalizados", "EXCAVACIONES · Taludes, entibados o sistema de contención; acceso y salida seguros", "ELÉCTRICO · Energía aislada, bloqueada, etiquetada y verificada sin tensión", "ELÉCTRICO · Elementos dieléctricos y distancias de seguridad respetadas", "IZAJE · Plan de izaje, equipo certificado, señalero y área restringida"];
export const grupoDeItem = (t) => String(t).split(" · ")[0];
export const textoDeItem = (t) => (String(t).includes(" · ") ? String(t).split(" · ").slice(1).join(" · ") : String(t));

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…, filas debajo]
export const SPEC_PERMISO = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "A", "C"],
    ["ubicacion", "Ubicación", "H", "J"],
    ["nPermiso", "N° de permiso", "A", "C"],
    ["fecha", "Fecha", "D", "E"],
    ["horaInicio", "Hora inicio", "F", "G"],
    ["horaFin", "Hora fin", "H", "I"],
    ["vigencia", "Vigencia", "J", "K"],
    ["frente", "Frente / lugar del trabajo", "A", "C"],
    ["altura", "Altura o profundidad (m)", "H", "J"],
    ["descripcion", "Descripción del trabajo", "A", "C"],
    ["solicitanteNombre", "Solicitante", "A", "C"],
    ["solicitanteCargo", "Cargo", "H", "J", "solicitanteNombre"],
    ["horaCierre", "Hora de cierre", "A", "C"],
    ["trabajoTerminado", "¿Trabajo terminado?", "E", "G"],
    ["areaEnOrden", "¿Área en orden y sin energía residual?", "I", "K"],
    ["obsCierre", "Observaciones / novedades", "A", "C"],
    ["motivoCancelacion", "Motivo de suspensión o cancelación", "A", "C"],
  ],
  tablas: [
    { clave: "personal", cabecera: "No.", fin: "3. VERIFICACIÓN PREVIA", finEmpieza: true, columnas: { nombre: "B", documento: "E", cargo: "G", cert: "I" } },
    { clave: "verifPrevia", cabecera: "No.", despuesDe: "personal", fin: "4. VERIFICACIÓN ESPECÍFICA", finEmpieza: true, numerada: true, columnas: { cumple: "I", obs: "K" } },
    { clave: "verifEspec", cabecera: "No.", despuesDe: "verifPrevia", fin: "5. MEDICIÓN DE GASES", finEmpieza: true, numerada: true, columnas: { cumple: "I", obs: "K" } },
    { clave: "gases", cabecera: "Medición", despuesDe: "verifEspec", fin: "Registre las lecturas", finEmpieza: true, columnas: { hora: "C", o2: "D", lel: "E", co: "G", h2s: "H", resp: "I" } },
  ],
  opciones: [{ clave: "tipos", desde: "Tipo de trabajo", hasta: "2. PERSONAL QUE EJECUTA" }],
  firmas: [
    { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. AUTORIZACIÓN", hora: true, personas: [{ clave: "solicitante", col: "C" }, { clave: "autoriza", col: "G" }, { clave: "vigia", col: "K" }] },
    { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. CIERRE DEL PERMISO", personas: [{ clave: "cierra", col: "C" }, { clave: "recibe", col: "I" }] },
  ],
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_PERMISO = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","nPermiso":"C13","fecha":"E13","horaInicio":"G13","horaFin":"I13","vigencia":"K13","frente":"C14","altura":"J14","descripcion":"C15","solicitanteNombre":"C16","solicitanteCargo":"J16","horaCierre":"C69","trabajoTerminado":"G69","areaEnOrden":"K69","obsCierre":"C70","motivoCancelacion":"C71","tablas":{"personal":{"fila0":22,"n":6,"columnas":{"nombre":"B","documento":"E","cargo":"G","cert":"I"}},"verifPrevia":{"fila0":30,"n":10,"filas":[30,31,32,33,34,35,36,37,38,39],"columnas":{"cumple":"I","obs":"K"}},"verifEspec":{"fila0":42,"n":14,"filas":[42,43,44,45,46,47,48,49,50,51,52,53,54,55],"columnas":{"cumple":"I","obs":"K"}},"gases":{"fila0":58,"n":3,"columnas":{"hora":"C","o2":"D","lel":"E","co":"G","h2s":"H","resp":"I"}}},"opciones":{"tipos":[{"ref":"A18","texto":"Trabajo en alturas"},{"ref":"D18","texto":"Trabajo en caliente"},{"ref":"G18","texto":"Espacios confinados"},{"ref":"J18","texto":"Excavaciones y zanjas"},{"ref":"A19","texto":"Riesgo eléctrico / bloqueo (LOTO)"},{"ref":"D19","texto":"Izaje de cargas"},{"ref":"G19","texto":"Demolición o desmonte"},{"ref":"J19","texto":"Otro: ______________"}]},"firmas":{"solicitante":{"nombre":"C65","cargo":"C66","hora":"C67"},"autoriza":{"nombre":"G65","cargo":"G66","hora":"G67"},"vigia":{"nombre":"K65","cargo":"K66","hora":"K67"},"cierra":{"nombre":"C74","cargo":"C75"},"recibe":{"nombre":"I74","cargo":"I75"}}};

export const descubrirPermiso = (ws) => descubrirPorEtiquetas(ws, SPEC_PERMISO);

// ---------- Lógica del permiso ----------
const numero = (v) => { const t = String(v === undefined || v === null ? "" : v).trim().replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numeroOTexto = (v) => { const n = numero(v); return n === null ? String(v === undefined || v === null ? "" : v).trim() : n; };
const arr = (a) => (Array.isArray(a) ? a : []);

// Grupos de verificación específica que aplican según los tipos de trabajo marcados
export function gruposActivos(d) {
  return new Set(arr(d.tipos).map((t) => GRUPO_DE_TIPO[t]).filter(Boolean));
}
export const itemActivo = (d, i) => gruposActivos(d).has(grupoDeItem(VERIF_ESPECIFICA[i]));
// Lo que se escribe en el Excel: las condiciones de un trabajo que NO se va a hacer quedan en N/A
export const respuestaEspecifica = (d, i) => (itemActivo(d, i) ? arr(d.espec)[i] || "" : "N/A");

export const gasesObligatorios = (d) => arr(d.tipos).includes("Espacios confinados");
export const gasesVisibles = (d) => gasesObligatorios(d) || arr(d.tipos).includes("Trabajo en caliente");
const lecturaConDatos = (g) => !!(g && (g.hora || g.o2 || g.lel || g.co || g.h2s || g.resp));

const personaVacia = (p) => !(p && (p.nombre || p.documento || p.cargo || p.cert || p.certVence));
// La plantilla tiene una sola casilla "Certificación (tipo y vigencia)": ahí se escribe el tipo y su fecha de vencimiento juntos
export function certTexto(p) {
  const c = String((p && p.cert) || "").trim();
  const v = p && p.certVence ? fechaDDMMYYYY(p.certVence) : "";
  return c && v ? `${c} — vence ${v}` : c || (v ? `Vence ${v}` : "");
}
// Personas cuya certificación ya estaba vencida el día del permiso (la fecha de vencimiento es anterior a la del permiso)
export function certificacionesVencidas(d, hoyISO) {
  const ref = d.fecha || hoyISO || "";
  if (!ref) return [];
  return personalConDatos(d).filter((p) => p.certVence && p.certVence < ref).map((p) => p.nombre || "Sin nombre");
}
export const personalConDatos = (d) => arr(d.personal).filter((p) => !personaVacia(p));

// Condiciones marcadas "No" (el permiso no debería autorizarse mientras haya alguna)
export function condicionesEnNo(d) {
  const previa = VERIF_PREVIA.filter((_, i) => arr(d.previa)[i] === "No");
  const espec = VERIF_ESPECIFICA.filter((_, i) => itemActivo(d, i) && arr(d.espec)[i] === "No");
  return [...previa, ...espec];
}

export function escribirPermisoEnHoja(ws, d, celdas = CELDAS_PERMISO) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "nPermiso", "horaInicio", "horaFin", "vigencia", "frente", "altura", "descripcion", "solicitanteNombre", "solicitanteCargo",
    "horaCierre", "trabajoTerminado", "areaEnOrden", "obsCierre", "motivoCancelacion"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const noMarcadas = marcarOpciones(ws, C.opciones && C.opciones.tipos, arr(d.tipos), d.otros || {});
  const T = C.tablas || {};
  escribirTabla(ws, T.personal, personalConDatos(d).map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, cert: certTexto(p) })));
  escribirTabla(ws, T.verifPrevia, VERIF_PREVIA.map((_, i) => ({ cumple: arr(d.previa)[i] || "", obs: arr(d.previaObs)[i] || "" })));
  escribirTabla(ws, T.verifEspec, VERIF_ESPECIFICA.map((_, i) => ({ cumple: respuestaEspecifica(d, i), obs: itemActivo(d, i) ? arr(d.especObs)[i] || "" : "" })));
  if (gasesVisibles(d)) {
    escribirTabla(ws, T.gases, arr(d.gases).slice(0, LECTURAS.length).map((g) => (lecturaConDatos(g)
      ? { hora: g.hora, o2: numeroOTexto(g.o2), lel: numeroOTexto(g.lel), co: numeroOTexto(g.co), h2s: numeroOTexto(g.h2s), resp: g.resp } : {})));
  }
  const F = C.firmas || {};
  if (F.solicitante) { poner(ws, F.solicitante.nombre, d.solicitanteNombre); poner(ws, F.solicitante.cargo, d.solicitanteCargo); poner(ws, F.solicitante.hora, d.solicitanteHora); }
  if (F.autoriza) { poner(ws, F.autoriza.nombre, d.autorizaNombre); poner(ws, F.autoriza.cargo, d.autorizaCargo); poner(ws, F.autoriza.hora, d.autorizaHora); }
  if (F.vigia) { poner(ws, F.vigia.nombre, d.vigiaNombre); poner(ws, F.vigia.cargo, d.vigiaCargo); poner(ws, F.vigia.hora, d.vigiaHora); }
  // Al cierre firma quien solicitó y recibe quien autorizó, salvo que se indique otra persona
  if (F.cierra) { poner(ws, F.cierra.nombre, d.cierraNombre || d.solicitanteNombre); poner(ws, F.cierra.cargo, d.cierraNombre ? d.cierraCargo : d.solicitanteCargo); }
  if (F.recibe) { poner(ws, F.recibe.nombre, d.recibeNombre || d.autorizaNombre); poner(ws, F.recibe.cargo, d.recibeNombre ? d.recibeCargo : d.autorizaCargo); }
  return noMarcadas;
}

export function validarPermiso(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.descripcion || !d.descripcion.trim()) faltan.push("la descripción del trabajo");
  if (!arr(d.tipos).length) faltan.push("al menos un tipo de trabajo");
  if (!d.solicitanteNombre || !d.solicitanteNombre.trim()) faltan.push("el solicitante");
  const personal = personalConDatos(d);
  if (!personal.length) faltan.push("al menos una persona que ejecuta el trabajo");
  else if (personal.some((p) => !p.nombre || !p.nombre.trim())) faltan.push("el nombre de cada persona que ejecuta");
  const sinPrevia = VERIF_PREVIA.filter((_, i) => !arr(d.previa)[i]).length;
  if (sinPrevia) faltan.push(`responder la verificación previa (faltan ${sinPrevia})`);
  const sinEspec = VERIF_ESPECIFICA.filter((_, i) => itemActivo(d, i) && !arr(d.espec)[i]).length;
  if (sinEspec) faltan.push(`responder la verificación específica de este trabajo (faltan ${sinEspec})`);
  if (gasesObligatorios(d)) {
    const g = arr(d.gases)[0];
    if (!g || numero(g.o2) === null || numero(g.lel) === null) faltan.push("la medición inicial de gases (oxígeno y explosividad)");
  }
  if (!d.autorizaNombre || !d.autorizaNombre.trim()) faltan.push("quién autoriza el permiso");
  return faltan;
}

// Resumen que se guarda en el dispositivo (para informes y para las acciones correctivas)
export function resumenPermiso(d) {
  const noCumple = condicionesEnNo(d);
  return {
    id: `${d.fecha || "sin-fecha"}_${d.nPermiso || ""}`, formato: "permiso-trabajo", fecha: d.fecha || "", proyecto: d.proyecto || "", nPermiso: d.nPermiso || "",
    tipos: arr(d.tipos), descripcion: d.descripcion || "", personas: personalConDatos(d).length, condicionesEnNo: noCumple.length,
  };
}
