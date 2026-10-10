// calFormatos.js — especificación de cada formato de Calidad (ver calBase.js). Las etiquetas «etq» y los encabezados «enc» son EXACTAMENTE los de la plantilla de Excel
// (la app ubica las celdas por esas etiquetas, así que si ajustas anchos o filas no se desalinea nada).
import { texto, numero, filasConDatos, proveedorNoAprobado, registrarProveedor, registrarEvaluacion, obtenerProveedor } from "./calBase";
import { FORMATOS_ETAPA2 } from "./calFormatos2";
import { FORMATOS_ETAPA3 } from "./calFormatos3";

const arr = (a) => (Array.isArray(a) ? a : []);
const SI_NO = ["Sí", "No"];
const SI_NO_NA = ["Sí", "No", "N/A"];
const COLORES_SNN = { "Sí": "#2E7D4F", No: "#B3401F", "N/A": "#6B7280" };

const FIRMAS3 = (desdeEtiqueta, a, b, c) => ({ desdeEtiqueta, personas: [{ k: "elaboro", titulo: a }, { k: "reviso", titulo: b }, { k: "vobo", titulo: c }] });

// ================================================================= CA-004 Recepción de materiales
const UNIDADES_MAT = ["un", "kg", "ton", "m", "m²", "m³", "gal", "bulto", "caja", "rollo", "global"];
const VERIF_RECEPCION = [
  "La remisión o factura coincide con la orden de compra (material, referencia y cantidad)",
  "Trae certificado de calidad, ficha técnica o ensayos del fabricante",
  "Cumple la norma o especificación exigida (NTC, marcación o sello de calidad)",
  "Marca, referencia y dimensiones corresponden a lo aprobado para la obra",
  "Empaque y embalaje en buen estado, sin humedad, golpes ni deformaciones",
  "Sin contaminación, óxido excesivo, grietas ni defectos visibles",
  "Fecha de fabricación o vencimiento vigente y lote identificado",
  "Cantidad recibida verificada (conteo, pesaje o medición)",
  "Se descargó y almacenó en el sitio previsto (estibas, techo, separado del suelo)",
];
export const RECEPCION = {
  id: "cal-recepcion", col: "cal_recepcion", clave: "ryr_cal_recepcion", codigo: "RYR-CA-004", hoja: "Recepción de Materiales", plantilla: "/plantilla-cal-recepcion.xlsx", archivo: "Recepcion_Materiales",
  titulo: "Recepción de Materiales", subtitulo: "RYR-CA-004 · Inspección y recepción de materiales", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "fecha", etq: "Fecha de recepción", colEtq: "A", tipo: "fecha", req: true },
      { k: "hora", etq: "Hora", colEtq: "E", tipo: "hora" },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
      { k: "proveedor", etq: "Proveedor", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "remision", etq: "Remisión o factura N°", colEtq: "A", tipo: "texto", req: true },
      { k: "ordenCompra", etq: "Orden de compra N°", colEtq: "E", tipo: "texto" },
      { k: "placa", etq: "Placa del vehículo", colEtq: "H", tipo: "texto" },
    ] },
    { id: "materiales", titulo: "2. Materiales recibidos", tipo: "tabla", k: "materiales", fin: "3. VERIFICACIÓN DE LA RECEPCIÓN", max: 8, req: true, nombreFila: "Material", cols: [
      { k: "material", enc: "Material y referencia", tipo: "texto", req: true, fuente: "materiales" },
      { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES_MAT, req: true },
      { k: "pedida", enc: "Cantidad pedida", tipo: "numero" },
      { k: "recibida", enc: "Cantidad recibida", tipo: "numero", req: true },
      { k: "marca", enc: "Marca o fabricante", tipo: "texto" },
      { k: "lote", enc: "Lote o colada", tipo: "texto" },
      { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Conforme", "No conforme", "En cuarentena"], req: true, semaforo: true },
    ] },
    { id: "verif", titulo: "3. Verificación de la recepción", tipo: "lista", k: "verif", despuesDe: "materiales", fin: "4. MUESTRAS Y ENSAYOS", items: VERIF_RECEPCION.map((t) => ({ t })), req: true,
      resp: { enc: "¿Cumple?", opciones: SI_NO_NA, colores: COLORES_SNN }, obs: { enc: "Observación" } },
    { id: "muestras", titulo: "4. Muestras y ensayos", tipo: "campos", campos: [
      { k: "muestra", etq: "¿Se tomó muestra para ensayo?", colEtq: "A", tipo: "chips", opciones: SI_NO },
      { k: "ensayo", etq: "Ensayo solicitado", colEtq: "E", tipo: "texto" },
      { k: "laboratorio", etq: "Laboratorio", colEtq: "A", tipo: "texto" },
      { k: "fechaEnvio", etq: "Fecha de envío", colEtq: "H", tipo: "fecha" },
      { k: "informe", etq: "Informe N°", colEtq: "K", tipo: "texto" },
    ] },
    { id: "resultado", titulo: "5. Resultado de la recepción", tipo: "campos", campos: [
      { k: "resultado", etq: "Resultado", colEtq: "A", tipo: "chips", opciones: ["Aceptado", "Aceptado con observaciones", "En cuarentena (espera ensayo)", "Rechazado"], req: true, semaforo: true },
      { k: "almacenamiento", etq: "Ubicación de almacenamiento", colEtq: "H", tipo: "texto" },
      { k: "observaciones", etq: "Observaciones y acción tomada", colEtq: "A", tipo: "area" },
      { k: "rechazo", etq: "Si se rechaza: motivo y devolución", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: { desdeEtiqueta: "6. FIRMAS", personas: [{ k: "recibe", titulo: "Recibe — almacenista" }, { k: "inspecciona", titulo: "Inspecciona — calidad" }, { k: "entrega", titulo: "Entrega — proveedor / transportador" }] },
  etiquetaExtra: (d) => texto(d.proveedor),
  resumen: (d) => {
    const m = filasConDatos(RECEPCION.secciones[1], d); const v = arr(d.verif);
    return [
      { t: "Materiales", v: m.length }, { t: "No conformes", v: m.filter((x) => x.estado === "No conforme").length, color: "#B3401F" },
      { t: "Verificaciones «No»", v: v.filter((x) => x.resp === "No").length, color: "#B3401F" }, { t: "Verificaciones «Sí»", v: v.filter((x) => x.resp === "Sí").length, color: "#1D6B3A" },
    ];
  },
  avisos: (d) => {
    const a = [];
    if (texto(d.proveedor) && proveedorNoAprobado(d.proveedor)) a.push({ tipo: "alerta", texto: `El proveedor «${texto(d.proveedor)}» tiene una evaluación «NO APROBADO». Revisa con calidad antes de recibir.` });
    if (arr(d.verif).some((x) => x.resp === "No") && d.resultado === "Aceptado") a.push({ tipo: "aviso", texto: "Hay verificaciones en «No» pero el resultado es «Aceptado». Revisa si debería ser «Aceptado con observaciones» o «Rechazado»." });
    if (d.muestra === "Sí" && !texto(d.ensayo)) a.push({ tipo: "aviso", texto: "Dijiste que se tomó muestra: indica el ensayo solicitado." });
    return a;
  },
  ncSugerida: (d) => {
    const malos = filasConDatos(RECEPCION.secciones[1], d).filter((x) => x.estado === "No conforme");
    if (d.resultado !== "Rechazado" && !malos.length) return [];
    const nombres = (malos.length ? malos : filasConDatos(RECEPCION.secciones[1], d)).map((x) => texto(x.material)).filter(Boolean).join(", ");
    return [{ clave: "rechazo", origen: "CA-004", titulo: "Material rechazado o no conforme en la recepción", descripcion: `${d.resultado === "Rechazado" ? "Material rechazado" : "Material no conforme"}: ${nombres || "sin detalle"}. Proveedor: ${texto(d.proveedor) || "—"}. Remisión: ${texto(d.remision) || "—"}.${texto(d.rechazo) ? " Motivo: " + texto(d.rechazo) : ""}` }];
  },
  alGuardar: (d) => { registrarProveedor({ nombre: d.proveedor, nit: d.nit }); },
};

// ================================================================= CA-005 Evaluación de proveedores
export const CRITERIOS_PROVEEDOR = [
  { t: "Calidad del producto o del trabajo entregado", peso: 30 },
  { t: "Cumplimiento de plazos de entrega o ejecución", peso: 25 },
  { t: "Cumplimiento de especificaciones y documentos (certificados, fichas, ensayos)", peso: 15 },
  { t: "Atención de no conformidades, reclamos y garantías", peso: 10 },
  { t: "Precio y condiciones comerciales", peso: 10 },
  { t: "Cumplimiento de seguridad (SST) y de lo ambiental", peso: 10 },
];
// Igual que las fórmulas de la hoja: puntaje = Σ peso × calificación / 5, solo si están los 6 criterios calificados
export function puntajeProveedor(d) {
  const cal = arr(d.criterios).map((x) => numero(x.resp));
  if (cal.some((n) => n === null)) return null;
  return Math.round(cal.reduce((t, n, i) => t + (CRITERIOS_PROVEEDOR[i].peso * n) / 5, 0) * 10) / 10;
}
export const resultadoProveedor = (p) => (p === null ? "Falta calificar" : p >= 80 ? "APROBADO" : p >= 60 ? "APROBADO CONDICIONADO" : "NO APROBADO");
const SUMINISTROS_EVALUADOS = [
  // Materiales
  "Concreto premezclado", "Acero de refuerzo", "Cemento", "Agregados (arena, gravilla, triturado)", "Mampostería (ladrillo, bloque)", "Madera y formaleta",
  "Tubería y accesorios hidrosanitarios", "Material eléctrico", "Pinturas y acabados", "Cerámica y enchapes", "Carpintería metálica y aluminio", "Vidrios",
  "Impermeabilizantes", "Cubiertas y cielos rasos", "Drywall y perfilería", "Estructura metálica", "Prefabricados",
  // Servicios y subcontratos
  "Mano de obra: estructura", "Mano de obra: mampostería y pañetes", "Mano de obra: acabados", "Mano de obra: instalaciones",
  "Alquiler de maquinaria", "Alquiler de equipos y andamios", "Transporte de materiales", "Transporte y disposición de escombros (RCD)",
  "Laboratorio de ensayos", "Topografía", "Asesoría o diseño técnico", "Suministro de EPP y dotación",
];
export const PROVEEDORES = {
  id: "cal-proveedores", col: "cal_proveedores_eval", clave: "ryr_cal_proveedores_eval", codigo: "RYR-CA-005", hoja: "Evaluación Proveedores", plantilla: "/plantilla-cal-proveedores.xlsx", archivo: "Evaluacion_Proveedor",
  titulo: "Evaluación de Proveedores", subtitulo: "RYR-CA-005 · Proveedores y subcontratistas", panelObra: [],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "proveedor", etq: "Proveedor o subcontratista", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "tipoTercero", etq: "Tipo de tercero", colEtq: "A", tipo: "lista", opciones: ["Proveedor de materiales", "Subcontratista de mano de obra", "Subcontratista de obra", "Alquiler de equipos", "Laboratorio / servicios", "Otro"], req: true },
      { k: "tipoEval", etq: "Tipo de evaluación", colEtq: "H", tipo: "lista", opciones: ["Selección inicial", "Reevaluación periódica", "Cierre de contrato u orden", "Por incumplimiento"], req: true },
      { k: "suministro", etq: "Suministro o trabajo evaluado", colEtq: "A", tipo: "listaOtro", opciones: SUMINISTROS_EVALUADOS, otroTexto: "Escribe otro suministro o trabajo", guardarOtros: "ryr_cal_suministros", req: true },
      { k: "contratoOrden", etq: "Contrato u orden N°", colEtq: "H", tipo: "texto" },
      { k: "desde", etq: "Periodo evaluado desde", colEtq: "A", tipo: "fecha" },
      { k: "hasta", etq: "Hasta", colEtq: "E", tipo: "fecha" },
      { k: "fecha", etq: "Fecha de evaluación", colEtq: "H", tipo: "fecha", req: true },
    ] },
    { id: "criterios", titulo: "2. Calificación por criterio", tipo: "lista", k: "criterios", cabecera: "No.", fin: "TOTAL (sobre 100 puntos)", items: CRITERIOS_PROVEEDOR, req: true,
      resp: { enc: "Calificación (1 a 5)", opciones: ["1", "2", "3", "4", "5"], numerica: true, etiquetas: { 1: "Muy deficiente", 2: "Deficiente", 3: "Aceptable", 4: "Bueno", 5: "Excelente" } }, obs: { enc: "Observaciones" } },
    { id: "decision", titulo: "3. Decisión y seguimiento", tipo: "campos", campos: [
      { k: "decision", etq: "Decisión", colEtq: "A", tipo: "lista", opciones: ["Continuar contratando", "Continuar con plan de mejora", "Suspender y reevaluar", "No volver a contratar"], req: true },
      { k: "proxima", etq: "Fecha de próxima evaluación", colEtq: "H", tipo: "fecha" },
      { k: "fortalezas", etq: "Fortalezas observadas", colEtq: "A", tipo: "area" },
      { k: "mejorar", etq: "Aspectos a mejorar y acciones acordadas", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: { desdeEtiqueta: "4. FIRMAS", personas: [{ k: "evalua", titulo: "Evalúa — inspector / ingeniero de calidad" }, { k: "reviso", titulo: "Revisó — residente de obra" }, { k: "vobo", titulo: "Vo.Bo. — gerencia / compras" }] },
  etiquetaExtra: (d) => texto(d.proveedor),
  resumen: (d) => { const p = puntajeProveedor(d); const r = resultadoProveedor(p); return [{ t: "Puntaje (sobre 100)", v: p === null ? "" : String(p).replace(".", ",") }, { t: "Resultado", v: r, color: r === "APROBADO" ? "#1D6B3A" : r === "NO APROBADO" ? "#B3401F" : r === "APROBADO CONDICIONADO" ? "#B8860B" : "#8A8F99" }]; },
  avisos: (d) => {
    const a = []; const r = resultadoProveedor(puntajeProveedor(d));
    if (r === "NO APROBADO" && d.decision === "Continuar contratando") a.push({ tipo: "aviso", texto: "El resultado es «NO APROBADO» pero la decisión es «Continuar contratando». Revisa que sea lo que quieres." });
    if (r === "APROBADO" && d.decision === "No volver a contratar") a.push({ tipo: "aviso", texto: "El resultado es «APROBADO» pero la decisión es «No volver a contratar». Revisa que sea lo que quieres." });
    return a;
  },
  alGuardar: (d, reg) => {
    if (!texto(d.proveedor)) return;
    registrarProveedor({ nombre: d.proveedor, nit: d.nit, tipo: d.tipoTercero });
    const p = puntajeProveedor(d);
    if (p !== null) registrarEvaluacion(d.proveedor, { fecha: d.fecha, puntaje: p, resultado: resultadoProveedor(p), decision: d.decision, obraId: reg && reg.obraId });
  },
};

// ================================================================= CA-006 Control de ensayos
export const ENSAYOS = {
  id: "cal-ensayos", col: "cal_ensayos", clave: "ryr_cal_ensayos", codigo: "RYR-CA-006", hoja: "Control de Ensayos", plantilla: "/plantilla-cal-ensayos.xlsx", archivo: "Control_Ensayos",
  titulo: "Control de Ensayos", subtitulo: "RYR-CA-006 · Muestras enviadas al laboratorio y resultados", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "F", obra: "contrato" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "responsable", etq: "Responsable de calidad", colEtq: "F", tipo: "persona", cargo: "Ingeniero de calidad", req: true },
      { k: "labHabitual", etq: "Laboratorio habitual", colEtq: "J", tipo: "texto" },
      { k: "fecha", etq: "Fecha de corte", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Hoja N°", colEtq: "D", tipo: "texto" },
      { k: "periodo", etq: "Periodo", colEtq: "F", tipo: "texto" },
    ] },
    { id: "ensayos", titulo: "2. Ensayos solicitados y resultados", tipo: "tabla", k: "ensayos", fin: "Resumen", max: 18, req: true, nombreFila: "Ensayo", cols: [
      { k: "fechaEnvio", enc: "Fecha de envío", tipo: "fecha", req: true },
      { k: "material", enc: "Material", tipo: "texto", req: true, fuente: "materiales" },
      { k: "ensayo", enc: "Ensayo solicitado", tipo: "texto", req: true },
      { k: "norma", enc: "Norma del ensayo", tipo: "texto" },
      { k: "lote", enc: "Lote o lugar de origen de la muestra", tipo: "texto" },
      { k: "laboratorio", enc: "Laboratorio", tipo: "texto" },
      { k: "informe", enc: "Informe N°", tipo: "texto" },
      { k: "fechaResultado", enc: "Fecha del resultado", tipo: "fecha" },
      { k: "exigido", enc: "Valor exigido", tipo: "texto" },
      { k: "obtenido", enc: "Valor obtenido", tipo: "texto" },
      { k: "resultado", enc: "Resultado", tipo: "chips", opciones: ["Cumple", "No cumple", "Pendiente"], req: true, semaforo: true },
      { k: "obs", enc: "Observaciones y acción", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("3. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Vo.Bo. — interventoría / supervisión"),
  etiquetaExtra: (d) => `${filasConDatos(ENSAYOS.secciones[1], d).length} ensayos`,
  resumen: (d) => {
    const e = filasConDatos(ENSAYOS.secciones[1], d);
    const c = e.filter((x) => x.resultado === "Cumple").length, n = e.filter((x) => x.resultado === "No cumple").length, p = e.filter((x) => x.resultado === "Pendiente").length;
    return [{ t: "Ensayos", v: e.length }, { t: "Cumplen", v: c, color: "#1D6B3A" }, { t: "No cumplen", v: n, color: "#B3401F" }, { t: "Pendientes", v: p, color: "#B8860B" },
      { t: "% de cumplimiento", v: c + n ? `${Math.round((c / (c + n)) * 1000) / 10}`.replace(".", ",") + " %" : "" }];
  },
  avisos: (d) => {
    const a = [];
    const e = filasConDatos(ENSAYOS.secciones[1], d);
    if (e.some((x) => x.resultado && x.resultado !== "Pendiente" && !texto(x.obtenido))) a.push({ tipo: "aviso", texto: "Hay ensayos con resultado pero sin «valor obtenido»." });
    if (e.some((x) => x.resultado === "Pendiente" && texto(x.obtenido))) a.push({ tipo: "aviso", texto: "Hay ensayos «Pendiente» que ya tienen valor obtenido. Cambia su resultado a «Cumple» o «No cumple»." });
    return a;
  },
  ncSugerida: (d) => filasConDatos(ENSAYOS.secciones[1], d).map((x, i) => ({ x, i })).filter(({ x }) => x.resultado === "No cumple").map(({ x }) => ({
    clave: `ens:${texto(x.ensayo)}|${texto(x.informe)}|${texto(x.material)}|${texto(x.lote)}`, origen: "CA-006", titulo: `Ensayo que no cumple: ${texto(x.ensayo)}`,
    descripcion: `Ensayo «${texto(x.ensayo)}» de ${texto(x.material) || "material sin nombre"} no cumple. Exigido: ${texto(x.exigido) || "—"}; obtenido: ${texto(x.obtenido) || "—"}. Informe ${texto(x.informe) || "—"}, laboratorio ${texto(x.laboratorio) || "—"}. Origen de la muestra: ${texto(x.lote) || "—"}.`,
  })),
};

// ================================================================= CA-002 Control de planos
export const PLANOS = {
  id: "cal-planos", col: "cal_planos", clave: "ryr_cal_planos", codigo: "RYR-CA-002", hoja: "Control de Planos", plantilla: "/plantilla-cal-planos.xlsx", archivo: "Control_Planos",
  titulo: "Control de Planos", subtitulo: "RYR-CA-002 · Solo se construye con planos vigentes", panelObra: ["contrato", "ubicacion", "contratista"],
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "contrato", etq: "Contrato N°", colEtq: "D", obra: "contrato" },
      { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
      { k: "contratista", etq: "Contratista / Empresa", colEtq: "A", obra: "contratista" },
      { k: "disenador", etq: "Diseñador responsable", colEtq: "D", tipo: "texto" },
      { k: "responsable", etq: "Responsable del control", colEtq: "I", tipo: "persona", cargo: "Ingeniero de calidad", req: true },
      { k: "fecha", etq: "Fecha de corte", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Hoja N°", colEtq: "D", tipo: "texto" },
      { k: "interventoria", etq: "Interventoría", colEtq: "H", tipo: "texto" },
    ] },
    { id: "planos", titulo: "2. Listado de planos", tipo: "tabla", k: "planos", fin: "Resumen", max: 16, req: true, nombreFila: "Plano", cols: [
      { k: "codigo", enc: "Código del plano", tipo: "texto", req: true },
      { k: "nombre", enc: "Contenido o nombre del plano", tipo: "texto", req: true },
      { k: "disciplina", enc: "Disciplina", tipo: "lista", opciones: ["Arquitectónico", "Estructural", "Hidrosanitario", "Eléctrico", "Geotécnico", "Urbanismo / vías", "Otro"] },
      { k: "version", enc: "Versión", tipo: "texto", req: true },
      { k: "fechaVersion", enc: "Fecha de la versión", tipo: "fecha" },
      { k: "fechaRecibo", enc: "Fecha de recibo en obra", tipo: "fecha" },
      { k: "origen", enc: "Origen", tipo: "lista", opciones: ["Diseñador", "Interventoría", "Contratante", "Contratista"] },
      { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Vigente", "Para construcción", "Obsoleto", "Récord (as built)", "En revisión"], req: true, semaforo: true },
      { k: "distribuido", enc: "Distribuido a", tipo: "texto" },
      { k: "retiro", enc: "¿Se retiró la versión anterior?", tipo: "chips", opciones: SI_NO_NA },
      { k: "obs", enc: "Observaciones", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS3("3. FIRMAS", "Elaboró — inspector / ingeniero de calidad", "Revisó — residente de obra", "Vo.Bo. — interventoría / supervisión"),
  etiquetaExtra: (d) => `${filasConDatos(PLANOS.secciones[1], d).length} planos`,
  resumen: (d) => {
    const p = filasConDatos(PLANOS.secciones[1], d);
    return [{ t: "Vigentes", v: p.filter((x) => x.estado === "Vigente").length, color: "#1D6B3A" }, { t: "Para construcción", v: p.filter((x) => x.estado === "Para construcción").length },
      { t: "Obsoletos", v: p.filter((x) => x.estado === "Obsoleto").length, color: "#B3401F" }, { t: "En revisión", v: p.filter((x) => x.estado === "En revisión").length, color: "#B8860B" },
      { t: "Sin retirar versión anterior", v: p.filter((x) => x.retiro === "No").length, color: "#B3401F" }];
  },
  avisos: (d) => {
    const a = []; const p = filasConDatos(PLANOS.secciones[1], d);
    const sin = p.filter((x) => x.retiro === "No");
    if (sin.length) a.push({ tipo: "alerta", texto: `${sin.length} ${sin.length === 1 ? "plano tiene" : "planos tienen"} la versión anterior sin retirar de la obra: ${sin.map((x) => texto(x.codigo)).filter(Boolean).join(", ")}. Retírala o séllala como OBSOLETA.` });
    const cods = p.map((x) => texto(x.codigo).toLowerCase()).filter(Boolean);
    const rep = cods.filter((c, i) => cods.indexOf(c) !== i);
    if (rep.length) a.push({ tipo: "aviso", texto: `El código ${rep[0]} está repetido en esta hoja. Si es una versión nueva, deja solo la vigente y marca la anterior como obsoleta.` });
    return a;
  },
};

export const FORMATOS_CAL = { "cal-planos": PLANOS, "cal-recepcion": RECEPCION, "cal-proveedores": PROVEEDORES, "cal-ensayos": ENSAYOS, ...FORMATOS_ETAPA2, ...FORMATOS_ETAPA3 };
export { obtenerProveedor };
