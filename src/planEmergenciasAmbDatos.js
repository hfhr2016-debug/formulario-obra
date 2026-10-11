// Plan de Emergencias Ambientales (RYR-AM-024): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, sumarMesesISO, pintarCelda } from "./sstBase";

export const CODIGO_PLAN_EMERG = "RYR-AM-024";
export const HOJA_PLAN_EMERG = "Plan Emergencias Ambientales";
export const SI_NO = ["Sí", "No"];
export const MESES_REVISION_PLAN = 12;       // el plan se revisa al menos una vez al año o cuando cambie la obra
export const MESES_SIMULACRO = 12;           // al menos un simulacro al año

// Escenarios, con la acción de respuesta que la app sugiere (el usuario la puede cambiar)
export const ESCENARIOS = [
  { nombre: "Derrame de combustible, aceite o sustancias químicas", accion: "Detener la fuente si es seguro, aislar la zona, contener con material absorbente o barreras para que no llegue a sumideros ni al agua, recoger el material contaminado como residuo peligroso y reportar." },
  { nombre: "Incendio o explosión", accion: "Evacuar a las personas, dar la alarma, llamar a bomberos, atacar el fuego con extintor solo si es pequeño y seguro, y contener el agua de extinción para que no arrastre contaminantes." },
  { nombre: "Vertimiento de concreto, lechadas o aguas con sedimentos a una red o fuente de agua", accion: "Cerrar o tapar el sumidero, detener la actividad, retirar el material con bomba o a mano, limpiar la red si llegó a ella y avisar a la empresa de acueducto." },
  { nombre: "Fuga de gas o de una sustancia peligrosa", accion: "Alejar a las personas, ventilar, eliminar fuentes de ignición, cerrar la válvula si es seguro y llamar a la empresa de gas o a bomberos." },
  { nombre: "Lluvia fuerte o inundación que arrastra sedimentos", accion: "Cubrir acopios, desviar el agua, limpiar sedimentadores y cunetas, y proteger los sumideros con filtros o mallas." },
  { nombre: "Deslizamiento o falla de un talud", accion: "Retirar al personal de la zona, acordonar, suspender trabajos de excavación y llamar al ingeniero o geotecnista." },
  { nombre: "Afectación de fauna o de árboles protegidos", accion: "Suspender la actividad en el punto, no manipular la fauna sin apoyo y llamar a la autoridad ambiental." },
  { nombre: "Otro:", accion: "" },
];
export const RECURSOS = ["Kit antiderrames", "Material absorbente (arena, aserrín, sepiolita)", "Extintores", "Barreras o diques de contención", "Botiquín de primeros auxilios", "Camilla", "Alarma o sistema de aviso", "Otro:"];
export const ESTADOS_RECURSO = ["Bueno", "Requiere reposición", "No hay"];
export const COLORES_RECURSO = { Bueno: { relleno: "00A651", fuente: "000000" }, "Requiere reposición": { relleno: "FFC000", fuente: "000000" }, "No hay": { relleno: "C00000", fuente: "FFFFFF" } };
export const ROLES_BRIGADA = ["Jefe de brigada o coordinador de emergencias", "Brigadista de derrames y contención", "Brigadista contra incendios", "Brigadista de primeros auxilios"];
export const ENTIDADES = [
  { nombre: "Línea de emergencias", cuando: "Cualquier emergencia con riesgo para las personas", sugerido: "123" },
  { nombre: "Bomberos", cuando: "Incendio, explosión o fuga", sugerido: "119" },
  { nombre: "Defensa Civil o Cruz Roja", cuando: "Apoyo en rescate o primeros auxilios", sugerido: "" },
  { nombre: "Autoridad ambiental", cuando: "Afectación a agua, suelo, aire o fauna", sugerido: "" },
  { nombre: "Empresa de acueducto y alcantarillado", cuando: "Vertimiento a la red o daño en tubería", sugerido: "" },
  { nombre: "Gestor de residuos peligrosos", cuando: "Recoger material contaminado", sugerido: "" },
  { nombre: "Interventoría o contratante", cuando: "Informar de todo evento", sugerido: "" },
];
export const MAX_SIMULACROS = 4;

export const SPEC_PLAN_EMERG = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["responsable", "Responsable del plan", "A", "C"], ["version", "Versión del plan", "H", "J"],
    ["fecha", "Fecha de elaboración", "A", "C"], ["ultimaRevision", "Última revisión", "E", "G"], ["proximaRevision", "Próxima revisión", "I", "K"],
    ["cuerpoAgua", "Cuerpo de agua más cercano", "A", "C"], ["distancia", "Distancia (m)", "F", "H"], ["alcantarilla", "¿Alcantarilla o sumidero cerca?", "I", "K"],
    ["vecinos", "Vecinos sensibles", "A", "C"], ["zonaProtegida", "¿Zona protegida cerca?", "H", "J"],
    ["centroSalud", "Centro de salud más cercano", "A", "C"], ["telefonoCentro", "Teléfono del centro", "H", "J"],
    ["puntoEncuentro", "Punto de encuentro", "A", "C"], ["acceso", "Acceso para ambulancia y bomberos", "H", "J"],
    ["ultimoSimulacro", "Fecha del último simulacro", "E", "G"], ["observaciones", "8. OBSERVACIONES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "escenarios", cabecera: "No.", fin: "Escenarios que aplican a la obra", finEmpieza: true,
      columnas: { nombre: "B", aplica: "D", donde: "E", accion: "G", responsable: "K" },
      encabezados: { nombre: "Escenario", aplica: "¿Aplica?", donde: "Dónde puede ocurrir", accion: "Qué hacer (acción de respuesta)", responsable: "Responsable" } },
    { clave: "recursos", cabecera: "No.", despuesDe: "escenarios", fin: "5. BRIGADA", finEmpieza: true,
      columnas: { nombre: "B", cantidad: "E", ubicacion: "F", revision: "I", estado: "K" },
      encabezados: { nombre: "Recurso", cantidad: "Cantidad", ubicacion: "Ubicación", revision: "Última revisión", estado: "Estado" } },
    { clave: "brigada", cabecera: "No.", despuesDe: "recursos", fin: "No.",
      columnas: { rol: "B", nombre: "E", telefono: "I", suplente: "K" },
      encabezados: { rol: "Función en la brigada", nombre: "Nombre", telefono: "Teléfono", suplente: "Suplente (si no está)" } },
    { clave: "entidades", cabecera: "No.", despuesDe: "brigada", fin: "6. SIMULACROS", finEmpieza: true,
      columnas: { nombre: "B", telefono: "F", cuando: "H" },
      encabezados: { nombre: "Entidad externa", telefono: "Teléfono", cuando: "Cuándo llamar" } },
    { clave: "simulacros", cabecera: "No.", despuesDe: "entidades", fin: "Simulacros realizados", finEmpieza: true,
      columnas: { fecha: "B", escenario: "D", participantes: "G", resultado: "H" },
      encabezados: { fecha: "Fecha", escenario: "Escenario practicado", participantes: "Participantes", resultado: "Resultado y mejoras" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "9. FIRMAS", personas: [{ clave: "responsable", col: "C" }, { clave: "residente", col: "G" }, { clave: "aprobo", col: "K" }] },
};
// Distribución de la plantilla entregada (respaldo si no se puede leer la plantilla). Generado por el motor.
export const CELDAS_PLAN_EMERG = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","responsable":"C13","version":"J13","fecha":"C14","ultimaRevision":"G14","proximaRevision":"K14","cuerpoAgua":"C16","distancia":"H16","alcantarilla":"K16","vecinos":"C17","zonaProtegida":"J17","centroSalud":"C18","telefonoCentro":"J18","puntoEncuentro":"C19","acceso":"J19","ultimoSimulacro":"K61","observaciones":"A65","tablas":{"escenarios":{"fila0":22,"n":8,"columnas":{"nombre":"B","aplica":"D","donde":"E","accion":"G","responsable":"K"}},"recursos":{"fila0":33,"n":8,"columnas":{"nombre":"B","cantidad":"E","ubicacion":"F","revision":"I","estado":"K"}},"brigada":{"fila0":43,"n":4,"columnas":{"rol":"B","nombre":"E","telefono":"I","suplente":"K"}},"entidades":{"fila0":48,"n":7,"columnas":{"nombre":"B","telefono":"F","cuando":"H"}},"simulacros":{"fila0":57,"n":4,"columnas":{"fecha":"B","escenario":"D","participantes":"G","resultado":"H"}}},"firmas":{"responsable":{"nombre":"C69","cargo":"C70"},"residente":{"nombre":"G69","cargo":"G70"},"aprobo":{"nombre":"K69","cargo":"K70"}}};
export const descubrirPlanEmerg = (ws) => descubrirPorEtiquetas(ws, SPEC_PLAN_EMERG);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const nombreDe = (lista, i, p) => (/^Otro/.test(lista[i].nombre || lista[i]) ? (texto(p.otro) ? `Otro: ${texto(p.otro)}` : "") : (lista[i].nombre || lista[i]));

export const escenarioNuevo = () => ({ aplica: "", donde: "", accion: "", responsable: "", otro: "" });
export const recursoNuevo = () => ({ cantidad: "", ubicacion: "", revision: "", estado: "", otro: "" });
export const brigadistaNuevo = () => ({ nombre: "", telefono: "", suplente: "" });
export const entidadNueva = (i) => ({ telefono: (ENTIDADES[i] && ENTIDADES[i].sugerido) || "" });
export const simulacroNuevo = (b = {}) => ({ fecha: "", escenario: "", participantes: "", resultado: "", ...b });
const simulacroVacio = (s) => !(s && (texto(s.fecha) || texto(s.escenario) || texto(s.participantes) || texto(s.resultado)));
export const simulacrosConDatos = (d) => arr(d.simulacros).filter((s) => !simulacroVacio(s));
export const escenariosQueAplican = (d) => ESCENARIOS.map((e, i) => ({ ...escenarioNuevo(), ...(arr(d.escenarios)[i] || {}), nombre: nombreDe(ESCENARIOS, i, arr(d.escenarios)[i] || {}) })).filter((x) => x.aplica === "Sí" && x.nombre);
export const ultimoSimulacro = (d) => simulacrosConDatos(d).map((s) => texto(s.fecha)).filter(Boolean).sort().pop() || "";
export const revisionSugerida = (d) => (d.fecha ? sumarMesesISO(d.fecha, MESES_REVISION_PLAN) : "");

const diasEntre = (a, b) => { const x = new Date(a + "T00:00:00"), y = new Date(b + "T00:00:00"); return isNaN(x) || isNaN(y) ? null : Math.round((y - x) / 86400000); };
export const hoyISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`; };

// Avisos que NO impiden generar el Excel: ayudan a que el plan sirva de verdad
export function avisosPlan(d, hoy = hoyISO()) {
  const a = [];
  const aplican = escenariosQueAplican(d);
  if (!aplican.length) a.push({ tipo: "aviso", texto: "Marca los escenarios que pueden ocurrir en esta obra (sección 3). Un plan sin escenarios no sirve a la hora de la emergencia." });
  const sinAccion = aplican.filter((x) => !texto(x.accion)); if (sinAccion.length) a.push({ tipo: "aviso", texto: `Falta qué hacer en: ${sinAccion.map((x) => x.nombre).join("; ")}.` });
  const sinResp = aplican.filter((x) => texto(x.accion) && !texto(x.responsable)); if (sinResp.length) a.push({ tipo: "aviso", texto: `Falta quién responde en: ${sinResp.map((x) => x.nombre).join("; ")}.` });
  const aplicaN = (k) => aplican.some((x) => x.nombre === ESCENARIOS[k].nombre);
  if (d.alcantarilla === "Sí" && !aplicaN(0) && !aplicaN(2)) a.push({ tipo: "aviso", texto: "Hay alcantarilla o sumidero cerca y no marcaste el derrame ni el vertimiento: lo que se derrame puede llegar a la red." });
  const dist = num(d.distancia); if (dist !== null && dist <= 100 && !aplicaN(0) && !aplicaN(2)) a.push({ tipo: "aviso", texto: "El cuerpo de agua está a 100 m o menos y no marcaste derrame ni vertimiento." });
  if (d.zonaProtegida === "Sí" && !aplicaN(6)) a.push({ tipo: "info", texto: "Hay una zona protegida cerca: piensa si aplica la afectación de fauna o de árboles." });
  const rec = arr(d.recursos);
  const malos = RECURSOS.map((r, i) => ({ r: nombreDe(RECURSOS, i, rec[i] || {}), e: (rec[i] || {}).estado })).filter((x) => x.r && (x.e === "No hay" || x.e === "Requiere reposición"));
  if (malos.length) a.push({ tipo: "alerta", texto: `Recursos por reponer: ${malos.map((x) => `${x.r} (${x.e.toLowerCase()})`).join(", ")}.` });
  const kit = arr(d.recursos)[0] || {}; if (aplicaN(0) && !texto(kit.estado) && !texto(kit.cantidad)) a.push({ tipo: "aviso", texto: "El derrame aplica y no anotaste el kit antiderrames (cantidad o estado)." });
  const jefe = arr(d.brigada)[0] || {}; if (!texto(jefe.nombre)) a.push({ tipo: "aviso", texto: "Falta nombrar al jefe de brigada." }); else if (!texto(jefe.telefono)) a.push({ tipo: "aviso", texto: "Falta el teléfono del jefe de brigada." });
  const sinTel = ENTIDADES.map((e, i) => ({ n: e.nombre, t: (arr(d.entidades)[i] || {}).telefono })).filter((x) => !texto(x.t)).length;
  if (sinTel) a.push({ tipo: "info", texto: `Faltan ${sinTel} teléfono${sinTel === 1 ? "" : "s"} de entidades externas (sección 5).` });
  const ult = ultimoSimulacro(d);
  if (!ult) a.push({ tipo: "aviso", texto: `Aún no hay simulacros. Haz al menos uno cada ${MESES_SIMULACRO} meses con el escenario más probable.` });
  else { const dd = diasEntre(ult, hoy); if (dd !== null && dd > MESES_SIMULACRO * 30) a.push({ tipo: "alerta", texto: `El último simulacro fue el ${fechaDDMMYYYY(ult)}, hace más de ${MESES_SIMULACRO} meses.` }); }
  if (d.proximaRevision) { const f = diasEntre(hoy, d.proximaRevision); if (f !== null && f < 0) a.push({ tipo: "alerta", texto: `La revisión del plan venció el ${fechaDDMMYYYY(d.proximaRevision)}.` }); else if (f !== null && f <= 30) a.push({ tipo: "aviso", texto: `El plan se debe revisar antes del ${fechaDDMMYYYY(d.proximaRevision)}.` }); }
  else if (d.fecha) a.push({ tipo: "info", texto: `Revisa el plan cada ${MESES_REVISION_PLAN} meses o cuando cambie la obra (nuevas fases, nuevos químicos, otro frente). Fecha sugerida: ${fechaDDMMYYYY(revisionSugerida(d))}.`, accion: "revision" });
  return a;
}

export function escribirPlanEmergEnHoja(ws, d, celdas = CELDAS_PLAN_EMERG) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "responsable", "version", "cuerpoAgua", "alcantarilla", "vecinos", "zonaProtegida", "centroSalud", "telefonoCentro", "puntoEncuentro", "acceso", "observaciones"]) poner(ws, C[k], d[k]);
  for (const k of ["fecha", "ultimaRevision", "proximaRevision"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  poner(ws, C.ultimoSimulacro, fechaDDMMYYYY(ultimoSimulacro(d)));
  poner(ws, C.distancia, num(d.distancia) === null ? d.distancia : num(d.distancia));
  const T = C.tablas || {};
  const dr = (lista, k) => arr(lista)[k] || {};
  escribirTabla(ws, T.escenarios, ESCENARIOS.map((e, i) => { const x = dr(d.escenarios, i); return { nombre: nombreDe(ESCENARIOS, i, x), aplica: x.aplica, donde: x.donde, accion: x.accion, responsable: x.responsable }; }));
  escribirTabla(ws, T.recursos, RECURSOS.map((r, i) => { const x = dr(d.recursos, i); return { nombre: nombreDe(RECURSOS, i, x), cantidad: num(x.cantidad) === null ? x.cantidad : num(x.cantidad), ubicacion: x.ubicacion, revision: fechaDDMMYYYY(x.revision), estado: x.estado }; }));
  escribirTabla(ws, T.brigada, ROLES_BRIGADA.map((r, i) => { const x = dr(d.brigada, i); return { rol: r, nombre: x.nombre, telefono: x.telefono, suplente: x.suplente }; }));
  escribirTabla(ws, T.entidades, ENTIDADES.map((e, i) => ({ nombre: e.nombre, telefono: dr(d.entidades, i).telefono, cuando: e.cuando })));
  escribirTabla(ws, T.simulacros, simulacrosConDatos(d).map((s) => ({ fecha: fechaDDMMYYYY(s.fecha), escenario: s.escenario, participantes: num(s.participantes) === null ? s.participantes : num(s.participantes), resultado: s.resultado })));
  // Estado de los recursos con color (la plantilla de la app no trae colores condicionales)
  if (T.recursos) arr(d.recursos).slice(0, T.recursos.n).forEach((x, i) => { const c = COLORES_RECURSO[x && x.estado]; if (c) pintarCeldaEstado(ws, T.recursos.columnas.estado + (T.recursos.fila0 + i), c); });
  const F = C.firmas || {};
  if (F.responsable) { poner(ws, F.responsable.nombre, d.responsable); poner(ws, F.responsable.cargo, d.responsableCargo); }
  if (F.residente) { poner(ws, F.residente.nombre, d.residenteNombre); poner(ws, F.residente.cargo, d.residenteCargo); }
  if (F.aprobo) { poner(ws, F.aprobo.nombre, d.aproboNombre); poner(ws, F.aprobo.cargo, d.aproboCargo); }
}
const pintarCeldaEstado = (ws, ref, c) => pintarCelda(ws, ref, "FF" + c.relleno, "FF" + c.fuente);

export function validarPlanEmerg(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!texto(d.contratista)) f.push("el contratista");
  if (!d.fecha) f.push("la fecha de elaboración");
  if (!texto(d.responsable)) f.push("el responsable del plan");
  if (escenariosQueAplican(d).length === 0) f.push("al menos un escenario que aplique (sección 3)");
  const idx = arr(d.escenarios).findIndex((x, i) => /^Otro/.test(ESCENARIOS[i].nombre) && x && x.aplica === "Sí" && !texto(x.otro));
  if (idx >= 0) f.push("el nombre del escenario «Otro»");
  return f;
}
export function camposFaltantesPlanEmerg(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!texto(d.contratista)) f.push({ etiqueta: "Contratista / empresa", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha de elaboración", seccion: "datos" });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable", seccion: "datos" });
  return f;
}

// Resumen que queda guardado: de aquí sale el aviso de la pantalla de inicio (revisión y simulacros)
export function resumenPlanEmerg(d) {
  const ap = escenariosQueAplican(d);
  return { id: texto(d.proyecto).toLowerCase(), formato: "plan-emergencias", proyecto: texto(d.proyecto), fecha: d.fecha, version: texto(d.version), proximaRevision: d.proximaRevision || "",
    ultimoSimulacro: ultimoSimulacro(d), escenarios: ap.length, recursosPorReponer: arr(d.recursos).filter((x) => x && (x.estado === "No hay" || x.estado === "Requiere reposición")).length, actualizado: hoyISO() };
}
