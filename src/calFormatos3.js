// calFormatos3.js — Gestión de Calidad, ETAPA 3: Actividad Terminada (CA-014), Pendientes de Entrega (CA-015), Acta de Entrega (CA-016) y Listado Maestro (CA-003).
// La hoja de No Conformidades (CA-013) tiene su propia pantalla (FormularioNC.jsx) porque las no conformidades son registros vivos que se actualizan; aquí solo está su especificación de Excel (NC_FMT).
// Misma regla de siempre: solo AVISA, nunca impide guardar.
import { texto, numero, filasConDatos, hoyISO, listarRegistros, guardarRegistro, nuevoId, datosIniciales, obtenerObraCal, siguienteHoja, ncAbiertas } from "./calBase";

const arr = (a) => (Array.isArray(a) ? a : []);
const SI_NO_NA = ["Sí", "No", "N/A"];
const COLORES_SNN = { "Sí": "#2E7D4F", No: "#B3401F", "N/A": "#6B7280" };
const norm = (t) => texto(t).toLowerCase().replace(/\s+/g, " ");
const FIRMAS3 = (desdeEtiqueta, a, b, c, k) => ({ desdeEtiqueta, personas: [{ k: k[0], titulo: a }, { k: k[1], titulo: b }, { k: k[2], titulo: c }] });
const listaVer = (id, titulo, k, items, fin, despuesDe) => ({ id, titulo, tipo: "lista", k, fin, ...(despuesDe ? { despuesDe } : {}), items: items.map((t) => ({ t })), req: true, resp: { enc: "¿Cumple?", opciones: SI_NO_NA, colores: COLORES_SNN }, obs: { enc: "Observación" } });
const REF = { protocolo: { clave: "ryr_cal_protocolo" }, pendientes: { clave: "ryr_cal_pendientes" } };
const aFecha = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(iso)); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
const diasEntre = (a, b) => { const x = aFecha(a), y = aFecha(b); return x && y ? Math.round((y - x) / 86400000) : null; };
const ddmmyyyy = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const ACTIVIDADES = ["Mampostería", "Pañetes y estucos", "Pisos y enchapes", "Impermeabilización", "Instalaciones hidrosanitarias", "Instalaciones eléctricas", "Pintura, carpintería y cubierta",
  "Cimentación", "Estructura en concreto", "Cubierta", "Carpintería metálica y aluminio", "Carpintería en madera", "Cielos rasos y drywall", "Enchape de baños", "Fachadas", "Zonas exteriores y urbanismo"];
const ACTIVIDADES_PROTOCOLO = ACTIVIDADES.slice(0, 7);
const TER_A = [
 "Protocolo de inspección de la actividad diligenciado y aprobado (RYR-CA-012 o el formato específico)",
 "Ensayos y pruebas exigidos realizados, con resultados conformes",
 "No conformidades de la actividad cerradas (RYR-CA-013)",
 "Planos actualizados con las modificaciones aprobadas (récord)",
 "Registro fotográfico de la actividad terminada"
];
const TER_B = [
 "Cumple los planos y las especificaciones técnicas",
 "Dimensiones, niveles y plomos dentro de la tolerancia",
 "Acabado uniforme, sin daños, manchas ni remates pendientes",
 "Funcionamiento verificado (puertas, ventanas, aparatos, instalaciones)",
 "Protegida contra daños de las actividades que siguen"
];
const TER_C = [
 "Área limpia, sin escombros ni sobrantes de material",
 "Residuos separados y retirados al sitio previsto",
 "Señalización y protecciones retiradas o ajustadas"
];
const ACT_A = [
 "Planos récord (como construido) de arquitectura, estructura y redes",
 "Protocolos de inspección y resultados de ensayos del proyecto",
 "Manuales, fichas técnicas y garantías de equipos y materiales",
 "Certificaciones de instalaciones (eléctrica, gas, ascensores y las que apliquen)",
 "Pruebas de funcionamiento realizadas con el recibe presente",
 "Llaves, controles y accesorios entregados",
 "Lista de pendientes de entrega (RYR-CA-015) revisada y firmada"
];
const MAESTRO_FILAS = [
 [
  "RYR-CA-001",
  "Plan de Inspección y Ensayos (PIE)",
  "Ingeniero de calidad",
  "Una vez; se actualiza al cambiar el alcance",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-002",
  "Control de Planos y Versiones Vigentes",
  "Ingeniero de calidad",
  "Cada vez que llega una versión",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-003",
  "Listado Maestro de Registros de Calidad",
  "Ingeniero de calidad",
  "Mensual",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-004",
  "Inspección y Recepción de Materiales",
  "Almacenista / calidad",
  "Cada recepción",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-005",
  "Evaluación de Proveedores y Subcontratistas",
  "Residente / compras",
  "Al contratar y al cerrar",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-006",
  "Control de Ensayos de Materiales",
  "Ingeniero de calidad",
  "Cada ensayo",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-007",
  "Inspección de Excavación, Rellenos y Compactación",
  "Ingeniero de calidad",
  "Por capa o frente",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-008",
  "Inspección de Acero de Refuerzo",
  "Ingeniero de calidad",
  "Antes de cada vaciado",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-009",
  "Inspección de Formaleta y Encofrado",
  "Ingeniero de calidad",
  "Antes de cada vaciado",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-010",
  "Control de Vaciado de Concreto",
  "Ingeniero de calidad",
  "Cada vaciado",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-011",
  "Resultados de Ensayos de Concreto y Suelos",
  "Ingeniero de calidad",
  "Cada resultado",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-012",
  "Protocolo de Inspección por Actividad",
  "Ingeniero de calidad",
  "Cada actividad terminada",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-013",
  "Registro de No Conformidades y Acciones",
  "Ingeniero de calidad",
  "Cada no conformidad",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-014",
  "Lista de Chequeo de Actividad Terminada",
  "Ingeniero de calidad",
  "Cada actividad o espacio",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-015",
  "Lista de Pendientes de Entrega (Punch List)",
  "Residente / calidad",
  "Pre-entrega y entrega",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ],
 [
  "RYR-CA-016",
  "Acta de Entrega y Recibo a Satisfacción",
  "Residente de obra",
  "Cada entrega",
  "Carpeta de calidad y app",
  "Cierre del contrato + 5 años",
  "1",
  "Vigente"
 ]
];

// ================================================================= CA-015 Pendientes de entrega (punch list)
const ESTADOS_PEND = ["Pendiente", "En corrección", "Corregido", "Verificado"];
const abierto = (f) => f.estado === "Pendiente" || f.estado === "En corrección" || !texto(f.estado);
const vencidoPend = (f, hoy = hoyISO()) => !!(texto(f.fechaCompromiso) && abierto(f) && texto(f.fechaCompromiso) < hoy);
export const PENDIENTES = {
  id: "cal-pendientes", col: "cal_pendientes", clave: "ryr_cal_pendientes", codigo: "RYR-CA-015", hoja: "Pendientes de Entrega", plantilla: "/plantilla-cal-pendientes.xlsx", archivo: "Pendientes_Entrega",
  titulo: "Pendientes de Entrega", subtitulo: "RYR-CA-015 · Detalles por corregir antes de entregar", panelObra: ["contrato", "ubicacion", "contratista"],
  pendientesTitulo: "Pendientes por vencer o vencidos",
  pendientes: (obraId) => {
    const hoy = hoyISO(); const out = [];
    for (const r of listarRegistros(REF.pendientes, obraId)) for (const [i, f] of arr((r.datos || {}).pendientes).entries()) {
      if (!texto(f.descripcion) || !abierto(f) || !texto(f.fechaCompromiso)) continue;
      const faltan = diasEntre(hoy, f.fechaCompromiso); if (faltan === null || faltan > 3) continue;
      out.push({ id: `${r.id}|${i}`, faltan, estado: faltan < 0 ? "vencido" : faltan === 0 ? "hoy" : "pronto", titulo: `${texto(f.espacio) || texto((r.datos || {}).torre) || "Sin ubicación"} · ${texto(f.descripcion)}`,
        detalle: `Compromiso ${f.fechaCompromiso}${faltan < 0 ? ` (vencido hace ${-faltan} ${faltan === -1 ? "día" : "días"})` : faltan === 0 ? " (vence hoy)" : ` (en ${faltan} ${faltan === 1 ? "día" : "días"})`}${texto(f.responsable) ? " · " + texto(f.responsable) : ""}` });
    }
    return out.sort((a, b) => a.faltan - b.faltan);
  },
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "torre", etq: "Torre, piso o zona", colEtq: "F", tipo: "texto", req: true },
      { k: "hoja", etq: "Hoja N°", colEtq: "J", tipo: "texto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "fecha", etq: "Fecha de la inspección", colEtq: "F", tipo: "fecha", req: true },
      { k: "inspeccion", etq: "Inspección N°", colEtq: "J", tipo: "texto" },
      { k: "inspecciona", etq: "Inspecciona", colEtq: "A", tipo: "texto" },
      { k: "acompana", etq: "Acompaña (cliente o interventoría)", colEtq: "F", tipo: "texto" },
    ] },
    { id: "pendientes", titulo: "2. Pendientes", tipo: "tabla", k: "pendientes", fin: "Resumen", max: 18, req: true, nombreFila: "Pendiente", cols: [
      { k: "fecha", enc: "Fecha", tipo: "fecha" },
      { k: "espacio", enc: "Espacio o ubicación", tipo: "texto" },
      { k: "sistema", enc: "Sistema o actividad", tipo: "texto" },
      { k: "descripcion", enc: "Descripción del pendiente", tipo: "area", req: true, repetir: false },
      { k: "prioridad", enc: "Prioridad", tipo: "chips", opciones: ["Alta", "Media", "Baja"] },
      { k: "responsable", enc: "Responsable", tipo: "texto" },
      { k: "fechaCompromiso", enc: "Fecha compromiso", tipo: "fecha", real: true },
      { k: "estado", enc: "Estado", tipo: "chips", opciones: ESTADOS_PEND, req: true, semaforo: true, repetir: false },
      { k: "fechaCorreccion", enc: "Fecha de corrección", tipo: "fecha", repetir: false },
      { k: "verificadoPor", enc: "Verificado por", tipo: "texto", repetir: false },
      { k: "obs", enc: "Observaciones", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("3. FIRMAS", "Inspecciona — calidad", "Responde — residente de obra", "Revisa — cliente / interventoría", ["inspecciona", "responde", "revisa"]),
  etiquetaExtra: (d) => [texto(d.torre), `${filasConDatos(PENDIENTES.secciones[1], d).length} pendientes`].filter(Boolean).join(" · "),
  resumen: (d) => {
    const f = filasConDatos(PENDIENTES.secciones[1], d); const ver = f.filter((x) => x.estado === "Verificado").length;
    return [{ t: "Total", v: f.length }, { t: "Pendientes o en corrección", v: f.filter((x) => x.estado === "Pendiente" || x.estado === "En corrección").length, color: "#B8860B" }, { t: "Corregidos", v: f.filter((x) => x.estado === "Corregido").length },
      { t: "Verificados", v: ver, color: "#1D6B3A" }, { t: "Vencidos", v: f.filter((x) => vencidoPend(x)).length, color: "#B3401F" }, { t: "% verificado", v: f.length ? `${Math.round((ver / f.length) * 1000) / 10}`.replace(".", ",") + " %" : "" }];
  },
  avisos: (d) => {
    const a = []; const f = filasConDatos(PENDIENTES.secciones[1], d);
    const venc = f.filter((x) => vencidoPend(x)); if (venc.length) a.push({ tipo: "alerta", texto: `${venc.length} ${venc.length === 1 ? "pendiente tiene" : "pendientes tienen"} la fecha compromiso vencida.` });
    if (f.some((x) => x.estado === "Corregido" && !texto(x.fechaCorreccion))) a.push({ tipo: "aviso", texto: "Hay pendientes «Corregido» sin fecha de corrección." });
    if (f.some((x) => x.estado === "Verificado" && !texto(x.verificadoPor))) a.push({ tipo: "aviso", texto: "Hay pendientes «Verificado» sin el nombre de quien verificó." });
    if (f.some((x) => x.prioridad === "Alta" && !texto(x.responsable))) a.push({ tipo: "aviso", texto: "Hay pendientes de prioridad alta sin responsable." });
    if (f.some((x) => abierto(x) && !texto(x.fechaCompromiso))) a.push({ tipo: "aviso", texto: "Hay pendientes abiertos sin fecha compromiso: sin ella la app no puede avisarte cuando venzan." });
    return a;
  },
};
export function conteoPendientes(obraId) {
  let abiertos = 0, alta = 0;
  for (const r of listarRegistros(REF.pendientes, obraId)) for (const f of arr((r.datos || {}).pendientes)) if (texto(f.descripcion) && abierto(f)) { abiertos++; if (f.prioridad === "Alta") alta++; }
  return { abiertos, alta };
}

// Los pendientes de una actividad terminada que «pasan a la lista de entrega» se copian a una hoja de Pendientes (CA-015) de la obra; no se duplican.
function pasarAPendientes(obraId, d, items) {
  const obra = obtenerObraCal(obraId) || {};
  const todos = listarRegistros(REF.pendientes, obraId).filter((r) => (r.datos || {}).origenAuto);
  let hojaReg = todos.find((r) => arr((r.datos || {}).pendientes).length + items.length <= PENDIENTES.secciones[1].max);
  if (!hojaReg) {
    const datos = datosIniciales(PENDIENTES);
    Object.assign(datos, { proyecto: texto(obra.proyecto), contratista: texto(obra.contratista), fecha: hoyISO(), hoja: siguienteHoja(PENDIENTES, obraId), torre: "Varios (de actividades terminadas)", origenAuto: true });
    hojaReg = { id: nuevoId(), obraId, formato: PENDIENTES.id, datos, actualizado: 0 };
  }
  const nuevas = items.map((x) => ({ fecha: texto(d.fecha) || hoyISO(), espacio: texto(d.torre), sistema: texto(d.actividad), descripcion: texto(x.pendiente), prioridad: "Media", responsable: texto(x.responsable), fechaCompromiso: texto(x.fechaLimite), estado: "Pendiente", fechaCorreccion: "", verificadoPor: "", obs: "Viene de Actividad Terminada" }));
  guardarRegistro(PENDIENTES, { ...hojaReg, datos: { ...hojaReg.datos, pendientes: [...arr(hojaReg.datos.pendientes), ...nuevas] } });
}

// ================================================================= CA-014 Lista de chequeo de actividad terminada
const REG_LISTA = "Lista de pendientes (CA-015)";
export const TERMINADA = {
  id: "cal-terminada", col: "cal_terminada", clave: "ryr_cal_terminada", codigo: "RYR-CA-014", hoja: "Actividad Terminada", plantilla: "/plantilla-cal-terminada.xlsx", archivo: "Actividad_Terminada",
  titulo: "Actividad Terminada", subtitulo: "RYR-CA-014 · Antes de dar por terminada una actividad o un espacio", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "actividad", etq: "Actividad terminada", colEtq: "A", tipo: "listaOtro", opciones: ACTIVIDADES, otroTexto: "Escribe otra actividad", guardarOtros: "ryr_cal_actividades_terminadas", req: true },
      { k: "torre", etq: "Torre, piso o espacio", colEtq: "H", tipo: "texto", req: true },
      { k: "subcontratista", etq: "Subcontratista o cuadrilla", colEtq: "A", tipo: "texto" },
      { k: "cantidad", etq: "Cantidad ejecutada", colEtq: "H", tipo: "texto" },
    ] },
    listaVer("docs", "2. Documentos y registros", "docs", TER_A, "3. CONDICIÓN FÍSICA DE LA ACTIVIDAD"),
    listaVer("cond", "3. Condición física de la actividad", "cond", TER_B, "4. ORDEN, ASEO Y AMBIENTE", "docs"),
    listaVer("orden", "4. Orden, aseo y ambiente", "orden", TER_C, "5. PENDIENTES POR CORREGIR", "cond"),
    { id: "pend", titulo: "5. Pendientes por corregir", tipo: "tabla", k: "pend", despuesDe: "orden", fin: "6. RESULTADO", max: 4, nombreFila: "Pendiente", cols: [
      { k: "pendiente", enc: "Pendiente", tipo: "area", req: true },
      { k: "responsable", enc: "Responsable", tipo: "texto" },
      { k: "fechaLimite", enc: "Fecha límite", tipo: "fecha" },
      { k: "registrado", enc: "Registrado en", tipo: "chips", opciones: ["Corregido en el momento", REG_LISTA], repetir: false },
    ] },
    { id: "resultado", titulo: "6. Resultado", tipo: "campos", campos: [
      { k: "resultado", etq: "La actividad se da por", colEtq: "A", tipo: "chips", opciones: ["Recibida", "Recibida con pendientes", "No recibida"], req: true, semaforo: true },
      { k: "fechaRecibo", etq: "Fecha de recibo", colEtq: "H", tipo: "fecha" },
      { k: "observaciones", etq: "Observaciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("7. FIRMAS", "Inspecciona — calidad", "Entrega — residente / subcontratista", "Recibe — interventoría / supervisión", ["inspecciona", "entrega", "recibe"]),
  etiquetaExtra: (d) => [texto(d.actividad), texto(d.torre)].filter(Boolean).join(" · "),
  resumen: (d) => { const t = [...arr(d.docs), ...arr(d.cond), ...arr(d.orden)]; return [{ t: "Verificaciones «Sí»", v: t.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" }, { t: "Verificaciones «No»", v: t.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "Pendientes anotados", v: filasConDatos(TERMINADA.secciones[4], d).length }]; },
  avisos: (d, reg) => {
    const a = []; const t = [...arr(d.docs), ...arr(d.cond), ...arr(d.orden)]; const pend = filasConDatos(TERMINADA.secciones[4], d);
    const nos = t.filter((x) => x.resp === "No").length;
    if (d.resultado === "Recibida" && nos) a.push({ tipo: "alerta", texto: `Hay ${nos} verificaciones en «No» y la actividad se da por «Recibida». Corrígelas o usa «Recibida con pendientes».` });
    if (d.resultado === "Recibida" && pend.length) a.push({ tipo: "aviso", texto: "Anotaste pendientes y la actividad se da por «Recibida». Revisa si debería ser «Recibida con pendientes»." });
    if (d.resultado === "Recibida con pendientes" && !pend.length && !nos) a.push({ tipo: "aviso", texto: "Dices «Recibida con pendientes» pero no anotaste ninguno en la sección 5." });
    if (reg && arr(d.docs)[2] && arr(d.docs)[2].resp === "Sí") { const n = ncAbiertas(reg.obraId).length; if (n) a.push({ tipo: "aviso", texto: `Marcaste las no conformidades como cerradas, pero la obra tiene ${n} abiertas. Confirma que ninguna sea de esta actividad.` }); }
    if (reg && arr(d.docs)[0] && arr(d.docs)[0].resp === "Sí" && ACTIVIDADES_PROTOCOLO.includes(texto(d.actividad))) {
      const ok = listarRegistros(REF.protocolo, reg.obraId).some((r) => norm((r.datos || {}).actividad) === norm(d.actividad) && /^Aprobada/.test(texto((r.datos || {}).resultado)));
      if (!ok) a.push({ tipo: "aviso", texto: `No encontré un protocolo (RYR-CA-012) aprobado de «${texto(d.actividad)}» en esta obra, y marcaste que está diligenciado y aprobado.` });
    }
    const alLista = pend.filter((x) => x.registrado === REG_LISTA && !arr(d.pasados).includes(`${texto(x.pendiente)}|${texto(x.responsable)}`));
    if (alLista.length) a.push({ tipo: "ok", texto: `Al guardar, ${alLista.length === 1 ? "1 pendiente pasará" : alLista.length + " pendientes pasarán"} a la lista de Pendientes de Entrega (RYR-CA-015).` });
    return a;
  },
  alGuardar: (d, reg) => {
    const ya = arr(d.pasados); const claves = [];
    const nuevos = filasConDatos(TERMINADA.secciones[4], d).filter((x) => x.registrado === REG_LISTA && !ya.includes(`${texto(x.pendiente)}|${texto(x.responsable)}`));
    if (!nuevos.length || !reg) return null;
    pasarAPendientes(reg.obraId, d, nuevos);
    for (const x of nuevos) claves.push(`${texto(x.pendiente)}|${texto(x.responsable)}`);
    return { pasados: [...ya, ...claves] };
  },
};

// ================================================================= CA-016 Acta de entrega y recibo a satisfacción
const mesesMas = (iso, m) => { const d = aFecha(iso); if (!d || !(m > 0)) return ""; const dia = d.getDate(); d.setMonth(d.getMonth() + Math.round(m)); if (d.getDate() !== dia) d.setDate(0); return ddmmyyyy(d); };
export const ACTA = {
  id: "cal-acta", col: "cal_acta", clave: "ryr_cal_acta", codigo: "RYR-CA-016", hoja: "Acta de Entrega", plantilla: "/plantilla-cal-acta.xlsx", archivo: "Acta_Entrega",
  titulo: "Acta de Entrega", subtitulo: "RYR-CA-016 · Entrega y recibo a satisfacción", panelObra: ["contrato", "contratante", "ubicacion", "contratista"],
  alCrear: (d, obraId) => { const c = conteoPendientes(obraId); d.pendAbiertos = String(c.abiertos); d.pendAlta = String(c.alta); },
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista (entrega)", colEtq: "A", obra: "contratista" },
      { k: "contrato", etq: "Contrato N°", colEtq: "H", obra: "contrato" },
      { k: "contratante", etq: "Contratante o cliente (recibe)", colEtq: "A", obra: "contratante" },
      { k: "interventoria", etq: "Interventoría", colEtq: "H", tipo: "texto" },
      { k: "fecha", etq: "Fecha de entrega", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Acta N°", colEtq: "H", tipo: "texto" },
      { k: "tipo", etq: "Tipo de entrega", colEtq: "A", tipo: "lista", opciones: ["Parcial (espacio, torre o etapa)", "Final de obra", "Otra"], req: true },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "alcance", etq: "Alcance entregado (descripción)", colEtq: "A", tipo: "area", req: true },
    ] },
    listaVer("entregables", "2. Documentos y entregables", "entregables", ACT_A, "3. LECTURAS Y ENTREGA DE LLAVES"),
    { id: "lecturas", titulo: "3. Lecturas y entrega de llaves", tipo: "tabla", k: "lecturas", cabecera: "Concepto", despuesDe: "entregables", fin: "4. ESTADO DE LA ENTREGA", max: 4, fija: true, nombreFila: "Lectura",
      inicial: ["Agua", "Energía eléctrica", "Gas", "Llaves (cantidad)"].map((c) => ({ concepto: c })),
      cols: [
        { k: "concepto", enc: "Concepto", tipo: "calculado", calc: (f) => f.concepto },
        { k: "medidor", enc: "Medidor o referencia", tipo: "texto" },
        { k: "lectura", enc: "Lectura", tipo: "numero" },
        { k: "obs", enc: "Observación", tipo: "texto" },
      ] },
    { id: "estado", titulo: "4. Estado de la entrega", tipo: "campos", campos: [
      { k: "pendAbiertos", etq: "Pendientes abiertos (cantidad)", colEtq: "A", tipo: "numero", ayuda: "Se adelanta con los pendientes abiertos de la obra (RYR-CA-015)." },
      { k: "plazoPend", etq: "Plazo para corregirlos", colEtq: "F", tipo: "texto" },
      { k: "pendAlta", etq: "Prioridad alta", colEtq: "K", tipo: "numero" },
      { k: "inicioGarantia", etq: "Inicio de la garantía", colEtq: "A", tipo: "fecha" },
      { k: "mesesGarantia", etq: "Plazo de garantía (meses)", colEtq: "F", tipo: "numero" },
      { k: "venceGarantia", etq: "Vence", colEtq: "K", tipo: "calculado", calc: (d) => mesesMas(d.inicioGarantia, numero(d.mesesGarantia)) },
      { k: "resultado", etq: "Resultado de la entrega", colEtq: "A", tipo: "chips", opciones: ["Recibida a satisfacción", "Recibida con pendientes", "No recibida"], req: true, semaforo: true },
      { k: "obsRecibe", etq: "Observaciones del que recibe", colEtq: "A", tipo: "area" },
      { k: "respuesta", etq: "Respuesta o compromisos del contratista", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("5. FIRMAS", "Entrega — residente / director de obra", "Recibe — contratante / cliente", "Testigo — interventoría / calidad", ["entrega", "recibe", "testigo"]),
  etiquetaExtra: (d) => texto(d.tipo),
  resumen: (d) => { const t = arr(d.entregables); return [{ t: "Entregables «Sí»", v: t.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" }, { t: "Entregables «No»", v: t.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "Pendientes abiertos", v: texto(d.pendAbiertos) || "0" }, { t: "Vence la garantía", v: mesesMas(d.inicioGarantia, numero(d.mesesGarantia)) }]; },
  avisos: (d, reg) => {
    const a = []; const t = arr(d.entregables); const abiertos = numero(d.pendAbiertos) || 0;
    if (d.resultado === "Recibida a satisfacción" && abiertos > 0) a.push({ tipo: "alerta", texto: `Dices «Recibida a satisfacción» pero hay ${abiertos} pendientes abiertos. Usa «Recibida con pendientes» o ciérralos antes.` });
    if (d.resultado === "Recibida a satisfacción" && t.some((x) => x.resp === "No")) a.push({ tipo: "alerta", texto: "Hay entregables en «No» y el resultado es «Recibida a satisfacción»." });
    if (reg) {
      const real = conteoPendientes(reg.obraId).abiertos; if (real !== abiertos) a.push({ tipo: "aviso", texto: `En la obra hay ${real} pendientes abiertos (RYR-CA-015) y en el acta dice ${abiertos}.` });
      const nc = ncAbiertas(reg.obraId).length; if (nc && d.tipo === "Final de obra") a.push({ tipo: "aviso", texto: `Es la entrega final y hay ${nc} no conformidades sin cerrar.` });
    }
    if (texto(d.inicioGarantia) && !(numero(d.mesesGarantia) > 0)) a.push({ tipo: "aviso", texto: "Escribe el plazo de la garantía en meses para calcular cuándo vence." });
    return a;
  },
};

// ================================================================= CA-003 Listado maestro de registros de calidad
export const MAESTRO = {
  id: "cal-maestro", fotos: false, col: "cal_maestro", clave: "ryr_cal_maestro", codigo: "RYR-CA-003", hoja: "Listado Maestro", plantilla: "/plantilla-cal-maestro.xlsx", archivo: "Listado_Maestro",
  titulo: "Listado Maestro de Registros", subtitulo: "RYR-CA-003 · Qué registros existen, quién los llena y cuánto se conservan", panelObra: ["contrato", "contratista"], copiarTablas: true,
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "E", obra: "contrato" },
      { k: "fecha", etq: "Fecha de corte", colEtq: "G", tipo: "fecha", req: true },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "responsable", etq: "Responsable del listado", colEtq: "E", tipo: "persona", cargo: "Ingeniero de calidad" },
    ] },
    { id: "registros", titulo: "2. Registros de calidad", tipo: "tabla", k: "registros", fin: "Registros vigentes", max: 17, req: true, nombreFila: "Registro", plegable: true, tituloFila: "nombre", limpiar: true,
      inicial: MAESTRO_FILAS.map((f) => ({ codigo: f[0], nombre: f[1], responsable: f[2], frecuencia: f[3], archivo: f[4], conservacion: f[5], version: f[6], estado: f[7] })),
      cols: [
        { k: "codigo", enc: "Código", tipo: "texto", req: true },
        { k: "nombre", enc: "Nombre del registro", tipo: "texto", req: true },
        { k: "responsable", enc: "Responsable de diligenciarlo", tipo: "texto" },
        { k: "frecuencia", enc: "Frecuencia", tipo: "texto" },
        { k: "archivo", enc: "Dónde se archiva", tipo: "texto" },
        { k: "conservacion", enc: "Tiempo de conservación", tipo: "texto" },
        { k: "version", enc: "Versión", tipo: "numero", numerica: true },
        { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Vigente", "Obsoleto"], semaforo: true },
      ] },
  ],
  firmas: { ...FIRMAS3("3. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Vo.Bo. — gerencia / interventoría", ["elaboro", "reviso", "vobo"]), req: false },
  etiquetaExtra: (d) => `${filasConDatos(MAESTRO.secciones[1], d).length} registros`,
  resumen: (d) => { const f = filasConDatos(MAESTRO.secciones[1], d); return [{ t: "Registros", v: f.length }, { t: "Vigentes", v: f.filter((x) => x.estado === "Vigente").length, color: "#1D6B3A" }, { t: "Obsoletos", v: f.filter((x) => x.estado === "Obsoleto").length, color: "#B3401F" }]; },
  avisos: (d) => {
    const a = []; const f = filasConDatos(MAESTRO.secciones[1], d); const cods = f.map((x) => norm(x.codigo));
    const rep = cods.filter((c, i) => cods.indexOf(c) !== i); if (rep.length) a.push({ tipo: "aviso", texto: `El código ${rep[0].toUpperCase()} está repetido en el listado.` });
    return a;
  },
};

// ================================================================= CA-013 No conformidades: especificación SOLO para escribir la hoja de Excel (la pantalla es FormularioNC.jsx)
export const ORIGENES_NC = ["Inspección en obra", "Ensayo de laboratorio", "Recepción de materiales", "Auditoría interna", "Observación de la interventoría", "Queja del cliente", "Otro"];
export const NC_FMT = {
  id: "cal-nc", plantilla: "/plantilla-cal-nc.xlsx", hoja: "No Conformidades", archivo: "No_Conformidades", titulo: "No Conformidades",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "H", obra: "contrato" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "K", obra: "ubicacion" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "responsable", etq: "Responsable del seguimiento", colEtq: "H", tipo: "persona", cargo: "Ingeniero de calidad" },
      { k: "fecha", etq: "Fecha de corte", colEtq: "A", tipo: "fecha" },
      { k: "periodo", etq: "Periodo", colEtq: "E", tipo: "texto" },
      { k: "hoja", etq: "Hoja N°", colEtq: "G", tipo: "texto" },
    ] },
    { id: "ncs", titulo: "2. Registro y seguimiento", tipo: "tabla", k: "ncs", fin: "Total registradas", max: 12, nombreFila: "No conformidad", cols: [
      { k: "fecha", enc: "Fecha", tipo: "fecha" },
      { k: "origen", enc: "Origen", tipo: "texto" },
      { k: "ubicacion", enc: "Actividad o ubicación", tipo: "texto" },
      { k: "descripcion", enc: "Descripción de la no conformidad", tipo: "area" },
      { k: "causa", enc: "Causa identificada", tipo: "area" },
      { k: "accion", enc: "Acción a ejecutar", tipo: "area" },
      { k: "gravedad", enc: "Gravedad", tipo: "chips", opciones: ["Leve", "Mayor", "Crítica"], semaforo: true },
      { k: "tipoAccion", enc: "Tipo de acción", tipo: "texto" },
      { k: "responsable", enc: "Responsable", tipo: "texto" },
      { k: "fechaLimite", enc: "Fecha límite", tipo: "fecha", real: true },
      { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Abierta", "En proceso", "Cerrada"], semaforo: true },
      { k: "fechaCierre", enc: "Fecha de cierre", tipo: "fecha" },
      { k: "verificacion", enc: "Verificación de eficacia y evidencia", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("3. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Vo.Bo. — interventoría / gerencia", ["elaboro", "reviso", "vobo"]),
};
// Una no conformidad guardada -> fila de la hoja
export const filaNC = (n) => ({ fecha: texto(n.fecha), origen: texto(n.origen), ubicacion: texto(n.ubicacion), descripcion: [texto(n.titulo), texto(n.descripcion)].filter(Boolean).join(". "), causa: texto(n.causa), accion: texto(n.accion),
  gravedad: texto(n.gravedad), tipoAccion: texto(n.tipoAccion), responsable: texto(n.responsable), fechaLimite: texto(n.fechaLimite), estado: texto(n.estado), fechaCierre: texto(n.fechaCierre), verificacion: texto(n.verificacion) });

export const FORMATOS_ETAPA3 = { "cal-terminada": TERMINADA, "cal-pendientes": PENDIENTES, "cal-acta": ACTA, "cal-maestro": MAESTRO };
