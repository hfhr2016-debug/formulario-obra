// Permiso de trabajo de alto riesgo (RYR-SS-007): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Cada permiso es de UN tipo (caliente, frío, espacios confinados, eléctricos, alturas, excavaciones, radiación, sustancias químicas o condiciones extremas).
// El tipo elegido pinta la fila superior del formato de su color y trae sus propios requisitos para marcar con ✔.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda, alturaMinimaFila, saltoDePagina } from "./sstBase";

export const CODIGO_PERMISO = "RYR-SS-007";
export const HOJA_PERMISO = "Permisos de Trabajo";
export const VIGENCIAS = ["Un turno", "Un día", "Varios días (renovar a diario)"];
export const RESPUESTAS = ["Sí", "No", "N/A"];
export const RESPUESTAS_REQ = ["Cumple", "No cumple", "N/A"];
export const LECTURAS = ["Inicial", "Intermedia", "Final"];
export const MARCA = "✔";

// Tipos de permiso: nombre (lo que se imprime en la fila superior), color de fondo y de letra, y si pide medición de gases
export const TIPOS_PERMISO = [{"id": "caliente", "nombre": "TRABAJO EN CALIENTE", "relleno": "C00000", "fuente": "FFFFFF", "gases": "opcional"}, {"id": "frio", "nombre": "TRABAJO EN FRÍO", "relleno": "0070C0", "fuente": "FFFFFF", "gases": "opcional"}, {"id": "confinados", "nombre": "TRABAJO EN ESPACIOS CONFINADOS", "relleno": "FFC000", "fuente": "000000", "gases": "obligatoria"}, {"id": "electricos", "nombre": "TRABAJOS ELÉCTRICOS", "relleno": "FFFFFF", "fuente": "000000", "gases": "no"}, {"id": "alturas", "nombre": "TRABAJO EN ALTURAS", "relleno": "00A651", "fuente": "000000", "gases": "no"}, {"id": "excavaciones", "nombre": "EXCAVACIONES", "relleno": "F57C00", "fuente": "000000", "gases": "opcional"}, {"id": "radiacion", "nombre": "TRABAJO CON RADIACIÓN", "relleno": "7030A0", "fuente": "FFFFFF", "gases": "no"}, {"id": "quimicos", "nombre": "SUSTANCIAS PELIGROSAS O QUÍMICAS", "relleno": "7F4F24", "fuente": "FFFFFF", "gases": "opcional"}, {"id": "extremas", "nombre": "TRABAJO EN CONDICIONES EXTREMAS", "relleno": "595959", "fuente": "FFFFFF", "gases": "no"}];
// Requisitos específicos de cada tipo (hasta 12). Es el mismo contenido de la hoja "Requisitos por permiso" del Excel.
export const REQUISITOS_PERMISO = {"caliente": ["Área despejada de combustibles e inflamables (o protegidos con mantas ignífugas)", "Extintor adecuado, cargado y a la mano", "Vigía de fuego designado (permanece 30 minutos después de terminar)", "Mantas o pantallas ignífugas contra chispas y escoria", "Equipos de soldadura u oxicorte inspeccionados (cables, mangueras, válvulas y antirretorno)", "Cilindros asegurados en posición vertical, con capuchón y lejos de la fuente de calor", "Ventilación o extracción de humos y gases", "Aberturas, ductos y alcantarillas cercanas selladas o protegidas", "Medición de atmósfera inflamable realizada si hay riesgo de gases o vapores", "EPP específicos (careta, guantes, peto, polainas) y ropa sin material inflamable", "Revisión del área 30 minutos después de terminar el trabajo"], "frio": ["Alcance del trabajo definido y confirmado: no genera chispas ni calor", "Herramientas y equipos antichispa o que no generan fuentes de ignición", "Equipos eléctricos y neumáticos aptos para la clasificación del área", "Medición de atmósfera inflamable (LEL) realizada en el sitio", "Equipo o línea despresurizada, drenada y purgada (si aplica)", "Energías aisladas, bloqueadas y etiquetadas (LOTO)", "Superficies calientes y fuentes de ignición cercanas controladas", "Extintor adecuado, cargado y a la mano", "EPP adecuado (guantes, gafas, ropa antiestática)", "Área delimitada y señalizada", "Procedimiento de trabajo y ATS conocidos por todo el personal", "Plan de emergencia y medio de comunicación disponibles"], "confinados": ["Espacio identificado, señalizado y con acceso controlado", "Personal autorizado con capacitación y certificación en espacios confinados", "Energías y fluidos aislados, bloqueados y etiquetados (tuberías, equipos, electricidad)", "Medición de gases previa y continua (oxígeno, explosividad, CO y H₂S)", "Ventilación natural o forzada en funcionamiento", "Vigía permanente en el exterior con registro de ingreso y salida", "Comunicación continua entre el vigía y las personas en el interior", "Plan de rescate, equipo de rescate (trípode, malacate) y respiración disponibles", "Iluminación y equipos aptos para el ambiente (a prueba de explosión si aplica)", "Limpieza, drenaje o inertización del espacio realizada", "EPP y ropa adecuados al riesgo", "Tiempo máximo de permanencia definido"], "electricos": ["Personal competente y autorizado para el trabajo eléctrico (RETIE)", "Procedimiento de bloqueo y etiquetado (LOTO) aplicado", "Circuito abierto y desenergizado en el punto de corte", "Ausencia de tensión verificada con detector adecuado", "Puesta a tierra temporal instalada", "Zona de trabajo delimitada y señalizada", "Distancias de seguridad respetadas frente a partes energizadas", "EPP dieléctrico en buen estado (casco, guantes, calzado y careta)", "Herramientas y equipos aislados, inspeccionados y con protección diferencial", "Condiciones climáticas evaluadas (lluvia, tormenta eléctrica)", "Coordinación con el operador de red o responsable del sistema eléctrico"], "alturas": ["Personal con certificación vigente en trabajo seguro en alturas y aptitud médica", "Coordinador de trabajo en alturas presente", "Procedimiento de trabajo en alturas y ATS socializados", "Sistema de acceso seguro (andamio certificado, escalera o plataforma inspeccionada)", "Puntos de anclaje identificados y con la resistencia requerida", "Arnés, eslingas, absorbedor de impacto y línea de vida inspeccionados", "Barandas, cerramientos o redes de protección instalados", "Área inferior demarcada y señalizada contra caída de objetos", "Plan de rescate y equipo de rescate disponibles; personal entrenado", "Herramientas aseguradas contra caídas", "Condiciones climáticas evaluadas (lluvia, viento fuerte, tormenta eléctrica)", "Comunicación entre quien trabaja y el coordinador o vigía"], "excavaciones": ["Servicios enterrados localizados y señalizados (gas, energía, agua y datos)", "Tipo de suelo evaluado y sistema de contención definido (talud o entibado)", "Taludes o entibados construidos según el diseño", "Material excavado y equipos retirados del borde (distancia segura)", "Zona delimitada, con barandas o cerramiento y señalización visible", "Accesos y salidas seguros (escaleras o rampas) cerca del personal", "Control de agua, drenaje o bombeo implementado", "Inspección previa por persona competente (cada turno o después de lluvia)", "Atmósfera verificada si hay sospecha de gases (excavaciones profundas)", "Control de tránsito y de vibraciones cerca de la excavación", "Plan de rescate y equipo básico de emergencia disponibles", "EPP completos y vigía cuando se requiera"], "radiacion": ["Personal autorizado con licencia o autorización vigente para manejo de fuentes radiactivas", "Oficial de protección radiológica designado y presente", "Dosímetros personales asignados y en uso", "Fuente radiactiva identificada, con su certificado y registro de inventario", "Área controlada delimitada y señalizada, con barreras y distancia segura calculada", "Monitor de radiación calibrado y operativo", "Personal ajeno evacuado o avisado del horario de la tarea", "Transporte y almacenamiento seguros de la fuente", "Control de tiempo de exposición, distancia y blindaje", "Registro de dosis y bitácora de operación al día", "Aptitud médica del personal expuesto", "Plan de emergencia radiológica y contactos disponibles"], "quimicos": ["Hojas de datos de seguridad (SDS) disponibles y leídas por el personal", "Sustancias rotuladas con el sistema globalmente armonizado (SGA)", "Cantidad limitada a la necesaria y en recipientes adecuados", "Compatibilidad entre sustancias verificada", "Ventilación adecuada en el área de trabajo", "EPP específico (respirador, guantes, gafas, delantal) según la SDS", "Duchas y lavaojos de emergencia disponibles y cercanos", "Kit de derrames y material absorbente disponible", "Fuentes de ignición controladas o eliminadas", "Personal capacitado en manejo de sustancias químicas y en el plan de emergencia", "Disposición de residuos peligrosos definida"], "extremas": ["Condiciones evaluadas (temperatura, radiación UV, lluvia, viento, tormenta eléctrica y visibilidad)", "Criterios para suspender el trabajo definidos y comunicados", "Hidratación disponible y pausas programadas", "Sombra, refugio o zona de descanso disponible", "Ropa adecuada al clima y protección solar", "Aclimatación del personal nuevo o que regresa", "Monitoreo de síntomas (golpe de calor, hipotermia y fatiga)", "Iluminación suficiente si el trabajo es nocturno", "Trabajo en parejas o con vigía", "Primeros auxilios y medio de comunicación disponibles", "Plan de evacuación o suspensión ante tormenta eléctrica"]};
export const VERIF_PREVIA = ["ATS elaborado, socializado y firmado por todo el personal que ejecuta", "Personal con aptitud médica y capacitación o certificación vigente para este trabajo", "Elementos de protección personal completos, certificados y en buen estado", "Área demarcada, señalizada y con acceso restringido a personas ajenas", "Herramientas, equipos y sistemas de protección inspeccionados", "Plan de emergencia y de rescate conocido; medio de comunicación disponible", "Extintor y botiquín disponibles en el sitio del trabajo", "Condiciones del entorno evaluadas (lluvia, viento, tormenta eléctrica)", "Permisos complementarios tramitados y adjuntos (si aplica)", "Coordinación con otras actividades simultáneas en el área"];

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…, filas debajo]
export const SPEC_PERMISO = {
  campos: [
    ["tipoPermiso", "TIPO DE PERMISO DE TRABAJO", "A", "D"],
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
    ["equipo", "Equipo, sustancia o circuito", "A", "C"],
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
    { clave: "personal", cabecera: "No.", fin: "3. VERIFICACIÓN PREVIA", finEmpieza: true, columnas: { nombre: "B", documento: "E", cargo: "G", cert: "I" },
      // Las columnas se ubican por el título de su encabezado: si se insertan columnas, se siguen encontrando. La fecha de vencimiento
      // ("vence") es opcional: si la plantilla tiene una columna aparte para ella se escribe ahí; si no, va junto al tipo de certificación.
      encabezados: { nombre: "Nombre completo", documento: "Documento de identidad", cargo: "Cargo / oficio",
        cert: ["Certificación (tipo y vigencia)", "Certificación (tipo)", "Certificación", "Tipo de certificación"],
        vence: ["Fecha de vencimiento", "Vencimiento", "Vigencia", "Vence", "Fecha de vigencia", "Vigencia de la certificación"] } },
    { clave: "verifPrevia", cabecera: "No.", despuesDe: "personal", fin: "4. REQUISITOS ESPECÍFICOS", finEmpieza: true, numerada: true, columnas: { cumple: "I", obs: "K" }, encabezados: { cumple: ["¿Cumple?", "Cumple"], obs: "Observación" } },
    { clave: "requisitos", cabecera: "No.", despuesDe: "verifPrevia", fin: "5. MEDICIÓN DE GASES", finEmpieza: true, numerada: true, columnas: { texto: "B", cumple: "H", no: "I", na: "J", obs: "K" },
      encabezados: { texto: "Requisito", cumple: "Cumple", no: "No cumple", na: "N/A", obs: "Observación" } },
    { clave: "gases", cabecera: "Medición", despuesDe: "requisitos", fin: "Registre las lecturas", finEmpieza: true, columnas: { hora: "C", o2: "D", lel: "E", co: "G", h2s: "H", resp: "I" },
      encabezados: { hora: "Hora", o2: "Oxígeno O₂ (%)", lel: "Explosividad LEL (%)", co: "CO (ppm)", h2s: "H₂S (ppm)", resp: "Responsable de la medición" } },
  ],
  firmas: [
    { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. AUTORIZACIÓN", hora: true, personas: [{ clave: "solicitante", col: "C" }, { clave: "autoriza", col: "G" }, { clave: "vigia", col: "K" }] },
    { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. CIERRE DEL PERMISO", personas: [{ clave: "cierra", col: "C" }, { clave: "recibe", col: "I" }] },
  ],
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_PERMISO = {"tipoPermiso":"D10","proyecto":"C12","contratista":"C13","ubicacion":"J13","nPermiso":"C14","fecha":"E14","horaInicio":"G14","horaFin":"I14","vigencia":"L14","frente":"C15","altura":"J15","equipo":"C16","descripcion":"C17","solicitanteNombre":"C18","solicitanteCargo":"J18","horaCierre":"C66","trabajoTerminado":"G66","areaEnOrden":"K66","obsCierre":"C67","motivoCancelacion":"C68","tablas":{"personal":{"fila0":21,"n":6,"columnas":{"nombre":"B","documento":"E","cargo":"G","cert":"I","vence":"K"}},"verifPrevia":{"fila0":29,"n":10,"filas":[29,30,31,32,33,34,35,36,37,38],"columnas":{"cumple":"I","obs":"K"}},"requisitos":{"fila0":41,"n":12,"filas":[41,42,43,44,45,46,47,48,49,50,51,52],"columnas":{"texto":"B","cumple":"H","no":"I","na":"J","obs":"K"}},"gases":{"fila0":55,"n":3,"columnas":{"hora":"C","o2":"D","lel":"E","co":"G","h2s":"H","resp":"I"}}},"firmas":{"solicitante":{"nombre":"C62","cargo":"C63","hora":"C64"},"autoriza":{"nombre":"G62","cargo":"G63","hora":"G64"},"vigia":{"nombre":"K62","cargo":"K63","hora":"K64"},"cierra":{"nombre":"C71","cargo":"C72"},"recibe":{"nombre":"I71","cargo":"I72"}}};

export const descubrirPermiso = (ws) => descubrirPorEtiquetas(ws, SPEC_PERMISO);

// ---------- Lógica del permiso ----------
const numero = (v) => { const t = String(v === undefined || v === null ? "" : v).trim().replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const numeroOTexto = (v) => { const n = numero(v); return n === null ? String(v === undefined || v === null ? "" : v).trim() : n; };
const arr = (a) => (Array.isArray(a) ? a : []);

export const tipoDe = (d) => TIPOS_PERMISO.find((t) => t.id === d.tipoPermiso) || null;
export const requisitosDe = (d) => { const t = tipoDe(d); return t ? REQUISITOS_PERMISO[t.id] || [] : []; };
export const gasesObligatorios = (d) => { const t = tipoDe(d); return !!t && t.gases === "obligatoria"; };
// La medición de gases se puede diligenciar en cualquier permiso (la plantilla siempre tiene su sección); solo es OBLIGATORIA en espacios confinados
export const gasesVisibles = () => true;
const lecturaConDatos = (g) => !!(g && (g.hora || g.o2 || g.lel || g.co || g.h2s || g.resp));

const personaVacia = (p) => !(p && (p.nombre || p.documento || p.cargo || p.cert || p.certVence));
// La plantilla tiene una sola casilla "Certificación (tipo y vigencia)": ahí se escribe el tipo y su fecha de vencimiento juntos
export function certTexto(p) {
  const c = String((p && p.cert) || "").trim();
  const v = p && p.certVence ? fechaDDMMYYYY(p.certVence) : "";
  return c && v ? `${c}\nvence ${v}` : c || (v ? `Vence ${v}` : "");     // en dos líneas: la casilla es angosta y el texto largo no se leería
}
// Altura que necesita la casilla de la certificación para que se lea completa (unos 26 caracteres por línea)
export function alturaCertificacion(p, separado = false) {
  const t = separado ? String((p && p.cert) || "").trim() : certTexto(p);
  if (!t) return 0;
  const lineas = t.split("\n").reduce((n, linea) => n + Math.max(1, Math.ceil(linea.length / 26)), 0);
  return Math.max(28, lineas * 12 + 6);
}
// Personas cuya certificación ya estaba vencida el día del permiso (la fecha de vencimiento es anterior a la del permiso)
export function certificacionesVencidas(d, hoyISO) {
  const ref = d.fecha || hoyISO || "";
  if (!ref) return [];
  return personalConDatos(d).filter((p) => p.certVence && p.certVence < ref).map((p) => p.nombre || "Sin nombre");
}
export const personalConDatos = (d) => arr(d.personal).filter((p) => !personaVacia(p));

// Condiciones marcadas "No" / "No cumple" (el permiso no debería autorizarse mientras haya alguna)
export function condicionesEnNo(d) {
  const previa = VERIF_PREVIA.filter((_, i) => arr(d.previa)[i] === "No");
  const req = requisitosDe(d).filter((_, i) => arr(d.requisitos)[i] === "No cumple");
  return [...previa, ...req];
}

export function escribirPermisoEnHoja(ws, d, celdas = CELDAS_PERMISO) {
  const C = celdas;
  const tipo = tipoDe(d);
  for (const k of ["proyecto", "contratista", "ubicacion", "nPermiso", "horaInicio", "horaFin", "vigencia", "frente", "altura", "equipo", "descripcion", "solicitanteNombre", "solicitanteCargo",
    "horaCierre", "trabajoTerminado", "areaEnOrden", "obsCierre", "motivoCancelacion"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  // La fila del tipo de permiso: el nombre y SU color (en el Excel manual lo hace una regla de color; aquí se pinta directamente)
  if (tipo && C.tipoPermiso) {
    poner(ws, C.tipoPermiso, tipo.nombre);
    pintarCelda(ws, C.tipoPermiso, "FF" + tipo.relleno, "FF" + tipo.fuente);
  }
  const T = C.tablas || {};
  const personal = personalConDatos(d);
  const separado = !!(T.personal && T.personal.columnas && T.personal.columnas.vence);   // ¿hay una columna aparte para la fecha de vencimiento?
  escribirTabla(ws, T.personal, personal.map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo,
    cert: separado ? p.cert : certTexto(p), vence: separado ? fechaDDMMYYYY(p.certVence) : "" })));
  if (T.personal) personal.slice(0, T.personal.n).forEach((p, i) => { const alto = alturaCertificacion(p, separado); if (alto) alturaMinimaFila(ws, T.personal.fila0 + i, alto); });
  // El salto de página manual de la plantilla se pierde al abrirla: se vuelve a poner (la hoja 2 empieza en los requisitos)
  if (T.verifPrevia && T.verifPrevia.filas) saltoDePagina(ws, T.verifPrevia.filas[T.verifPrevia.filas.length - 1]);
  escribirTabla(ws, T.verifPrevia, VERIF_PREVIA.map((_, i) => ({ cumple: arr(d.previa)[i] || "", obs: arr(d.previaObs)[i] || "" })));
  // Requisitos específicos del tipo: el texto de cada uno y un ✔ en la casilla que corresponde (Cumple / No cumple / N/A)
  escribirTabla(ws, T.requisitos, requisitosDe(d).map((texto, i) => {
    const v = arr(d.requisitos)[i];
    return { texto, cumple: v === "Cumple" ? MARCA : "", no: v === "No cumple" ? MARCA : "", na: v === "N/A" ? MARCA : "", obs: arr(d.requisitosObs)[i] || "" };
  }));
  if (arr(d.gases).some(lecturaConDatos)) {              // se escribe lo que se haya medido, sea cual sea el tipo de permiso
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
  return [];
}

export function validarPermiso(d) {
  const faltan = [];
  if (!tipoDe(d)) faltan.push("el tipo de permiso");
  if (!d.fecha) faltan.push("la fecha");
  if (!d.descripcion || !d.descripcion.trim()) faltan.push("la descripción del trabajo");
  if (!d.solicitanteNombre || !d.solicitanteNombre.trim()) faltan.push("el solicitante");
  const personal = personalConDatos(d);
  if (!personal.length) faltan.push("al menos una persona que ejecuta el trabajo");
  else if (personal.some((p) => !p.nombre || !p.nombre.trim())) faltan.push("el nombre de cada persona que ejecuta");
  const sinPrevia = VERIF_PREVIA.filter((_, i) => !arr(d.previa)[i]).length;
  if (sinPrevia) faltan.push(`responder la verificación previa (faltan ${sinPrevia})`);
  const sinReq = requisitosDe(d).filter((_, i) => !arr(d.requisitos)[i]).length;
  if (sinReq) faltan.push(`responder los requisitos del permiso (faltan ${sinReq})`);
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
  const t = tipoDe(d);
  return {
    id: `${d.fecha || "sin-fecha"}_${d.nPermiso || ""}`, formato: "permiso-trabajo", fecha: d.fecha || "", proyecto: d.proyecto || "", nPermiso: d.nPermiso || "",
    tipoPermiso: t ? t.nombre : "", tipos: t ? [t.nombre] : [], descripcion: d.descripcion || "", personas: personalConDatos(d).length, condicionesEnNo: noCumple.length,
  };
}


// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarPermiso().
export function camposFaltantesPermiso(d) {
  const f = [];
  if (!tipoDe(d)) f.push({ etiqueta: "Tipo de permiso", seccion: "tipo" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!d.descripcion || !d.descripcion.trim()) f.push({ etiqueta: "Descripción del trabajo", seccion: "datos" });
  if (!d.solicitanteNombre || !d.solicitanteNombre.trim()) f.push({ etiqueta: "Nombre del solicitante", seccion: "datos" });
  const todos = arr(d.personal);
  if (!personalConDatos(d).length) f.push({ etiqueta: "Nombre completo", indice: 0, seccion: "personal" });
  else todos.forEach((p, i) => { if (!personaVacia(p) && (!p.nombre || !p.nombre.trim())) f.push({ etiqueta: "Nombre completo", indice: i, seccion: "personal" }); });
  VERIF_PREVIA.forEach((_, i) => { if (!arr(d.previa)[i]) f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: "previa" }); });
  requisitosDe(d).forEach((_, i) => { if (!arr(d.requisitos)[i]) f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: "req" }); });
  if (gasesObligatorios(d)) {
    const g = arr(d.gases)[0] || {};
    if (numero(g.o2) === null) f.push({ etiqueta: "Oxígeno O₂ (%)", indice: 0, seccion: "gases" });
    if (numero(g.lel) === null) f.push({ etiqueta: "Explosividad LEL (%)", indice: 0, seccion: "gases" });
  }
  if (!d.autorizaNombre || !d.autorizaNombre.trim()) f.push({ etiqueta: "Nombre de quien autoriza", seccion: "autorizacion" });
  return f;
}
