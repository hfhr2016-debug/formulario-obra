// comFormatos.js — especificación de cada formato de Gestión de Compras. Usan el mismo motor de Calidad (calBase.js + FormularioCalidad.jsx):
// de cada especificación salen la pantalla, la validación, los datos que faltan y la escritura de la plantilla de Excel por etiquetas.
// Las etiquetas «etq» y los encabezados «enc» son EXACTAMENTE los de la plantilla (public/plantilla-com-*.xlsx, generada desde estas mismas especificaciones).
import { texto, numero, filasConDatos, filaNueva, registrarProveedor, actualizarProveedor, proveedorNoAprobado } from "./calBase";
import {
  num, pesos, redondear, claveTxt, hoyISO, diasEntre, subtotalFila, totalesOrden, capitulosObra, capituloDe, estadoPresupuesto, ESTADOS_ORDEN,
  ordenesDeObra, recepcionesDeObra, numeroDe, ordenVigente, totalDeOrden, lineasDeOrden, recibidoDeOrden, actualizarEstadoOrden, pendientesDeOrdenes, estadoPlazo, ordenPorNumero,
} from "./comBase";

const arr = (a) => (Array.isArray(a) ? a : []);
const SI_NO = ["Sí", "No"];
const UNIDADES = ["un", "kg", "ton", "m", "m²", "m³", "gal", "bulto", "caja", "rollo", "global", "día", "hora", "mes"];
const FIRMAS = (desdeEtiqueta, ...titulos) => ({ desdeEtiqueta, personas: titulos.map((t, i) => ({ k: ["a", "b", "c", "d"][i], titulo: t })) });
const fmtP = (n) => String(n).replace(".", ",");
const ddmm = (iso) => texto(iso).split("-").reverse().join("/");

// Casillas que se repiten en los formatos
const OBRA = [
  { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
  { k: "ubicacion", etq: "Ubicación", colEtq: "H", obra: "ubicacion" },
];
const FUENTES = {
  // Capítulos del presupuesto de la obra (los de Control Presupuestal), con lo contratado
  capitulos: ({ obraId }) => capitulosObra(obraId).map((c) => ({ texto: c.nombre, detalle: c.contratado ? pesos(c.contratado) : "" })),
  // Órdenes de compra de la obra que se pueden recibir; al elegir una se traen el proveedor, el NIT y sus ítems con lo que falta por recibir
  ordenes: ({ obraId, idRegistro }) => ordenesDeObra(obraId).filter((r) => ordenVigente(r) && numeroDe(r) && (r.datos || {}).estado !== "Recibida completa")
    .sort((a, b) => numeroDe(b).localeCompare(numeroDe(a), "es", { numeric: true })).map((r) => ({
      texto: numeroDe(r), detalle: `${texto((r.datos || {}).proveedor)} · ${pesos(totalDeOrden(r))}`,
      patch: {
        ordenCompra: numeroDe(r), proveedor: texto((r.datos || {}).proveedor), nit: texto((r.datos || {}).nit),
        materiales: lineasDeOrden(obraId, r, idRegistro).map((l) => filaNueva(RECEPCION.secciones[1], { descripcion: l.descripcion, unidad: l.unidad, pedida: String(l.pedida), anterior: String(l.recibida), recibida: "" })),
      },
    })),
};

// ================================================================= CO-001 Requisición de materiales y servicios
export const REQUISICION = {
  fuentes: FUENTES,
  id: "com-requisicion", col: "comp_requisicion", clave: "ryr_comp_requisicion", codigo: "RYR-CO-001", hoja: "Requisición", plantilla: "/plantilla-com-requisicion.xlsx", archivo: "Requisicion",
  titulo: "Requisición de Materiales y Servicios", subtitulo: "RYR-CO-001 · Pedido de obra a compras", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Todo pedido de obra empieza aquí: qué se necesita, cuánto y para cuándo",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha de la requisición", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Requisición N°", colEtq: "H", tipo: "texto" },
      { k: "solicitante", etq: "Solicitante", colEtq: "A", tipo: "persona", req: true },
      { k: "cargoSol", etq: "Cargo del solicitante", colEtq: "H", tipo: "texto" },
      { k: "fechaRequerida", etq: "Fecha en que se necesita", colEtq: "A", tipo: "fecha", req: true },
      { k: "prioridad", etq: "Prioridad", colEtq: "H", tipo: "chips", opciones: ["Normal", "Urgente", "Crítica"], req: true },
      { k: "capitulo", etq: "Capítulo del presupuesto", colEtq: "A", tipo: "texto", fuente: "capitulos", req: true },
      { k: "actividad", etq: "Actividad o frente de obra", colEtq: "H", tipo: "texto" },
    ] },
    { id: "items", titulo: "2. Materiales o servicios solicitados", tipo: "tabla", k: "items", fin: "3. APROBACIÓN", max: 15, req: true, nombreFila: "Ítem", cols: [
      { k: "descripcion", enc: "Descripción del material o servicio", tipo: "texto", req: true, fuente: "materiales", w: 4 },
      { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES, req: true, w: 1 },
      { k: "cantidad", enc: "Cantidad", tipo: "numero", req: true, w: 1 },
      { k: "especificacion", enc: "Especificación, marca o referencia", tipo: "texto", w: 3 },
      { k: "obs", enc: "Observación", tipo: "texto", w: 2 },
    ] },
    { id: "aprobacion", titulo: "3. Aprobación", tipo: "campos", campos: [
      { k: "estado", etq: "Estado de la requisición", colEtq: "A", tipo: "chips", opciones: ["Pendiente de aprobación", "Aprobada", "Aprobada parcialmente", "Rechazada", "Atendida"], inicial: "Pendiente de aprobación", req: true, semaforo: true },
      { k: "observaciones", etq: "Observaciones de quien aprueba", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("4. FIRMAS", "Solicita — residente / almacenista", "Aprueba — director de obra", "Recibe — compras"),
  etiquetaExtra: (d) => `${filasConDatos(REQUISICION.secciones[1], d).length} ítems${texto(d.prioridad) && d.prioridad !== "Normal" ? " · " + d.prioridad : ""}`,
  resumen: (d) => [{ t: "Ítems", v: filasConDatos(REQUISICION.secciones[1], d).length }, { t: "Prioridad", v: texto(d.prioridad) || "—", color: d.prioridad === "Crítica" ? "#B3401F" : d.prioridad === "Urgente" ? "#B8860B" : undefined }, { t: "Estado", v: texto(d.estado) || "—" }],
  avisos: (d) => {
    const a = [];
    if (texto(d.fechaRequerida) && texto(d.fecha) && d.fechaRequerida < d.fecha) a.push({ tipo: "aviso", texto: "La fecha en que se necesita es anterior a la fecha de la requisición. Revísala." });
    const dias = diasEntre(d.fecha, d.fechaRequerida);
    if (dias !== null && dias >= 0 && dias < 3 && d.prioridad === "Normal") a.push({ tipo: "info", texto: "Faltan menos de 3 días para la fecha requerida: ¿la prioridad debería ser «Urgente»?" });
    return a;
  },
};

// ================================================================= CO-002 Solicitud de cotización
export const SOLICITUD = {
  id: "com-solicitud", col: "comp_solicitud", clave: "ryr_comp_solicitud", codigo: "RYR-CO-002", hoja: "Solicitud de Cotización", plantilla: "/plantilla-com-solicitud.xlsx", archivo: "Solicitud_Cotizacion",
  titulo: "Solicitud de Cotización", subtitulo: "RYR-CO-002 · Petición de precios a proveedores", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Pedimos lo mismo a varios proveedores para comparar en igualdad de condiciones",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha de la solicitud", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Solicitud N°", colEtq: "H", tipo: "texto" },
      { k: "proveedor", etq: "Proveedor", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "contacto", etq: "Contacto", colEtq: "A", tipo: "texto" },
      { k: "telefono", etq: "Teléfono o correo", colEtq: "H", tipo: "texto" },
      { k: "requisicion", etq: "Requisición N°", colEtq: "A", tipo: "texto" },
      { k: "fechaLimite", etq: "Fecha límite para responder", colEtq: "H", tipo: "fecha", req: true },
    ] },
    { id: "items", titulo: "2. Lo que se pide cotizar", tipo: "tabla", k: "items", fin: "3. CONDICIONES", finEmpieza: true, max: 15, req: true, nombreFila: "Ítem", cols: [
      { k: "descripcion", enc: "Descripción del material o servicio", tipo: "texto", req: true, fuente: "materiales", w: 4 },
      { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES, req: true, w: 1 },
      { k: "cantidad", enc: "Cantidad", tipo: "numero", req: true, w: 1 },
      { k: "especificacion", enc: "Especificaciones, marca o referencia", tipo: "texto", w: 4 },
    ] },
    { id: "condiciones", titulo: "3. Condiciones de la compra", tipo: "campos", campos: [
      { k: "lugar", etq: "Lugar de entrega", colEtq: "A", tipo: "texto" },
      { k: "plazo", etq: "Plazo de entrega requerido", colEtq: "H", tipo: "texto" },
      { k: "pago", etq: "Forma de pago propuesta", colEtq: "A", tipo: "texto" },
      { k: "validez", etq: "Validez de la oferta (días)", colEtq: "H", tipo: "numero" },
      { k: "estado", etq: "Estado de la solicitud", colEtq: "A", tipo: "chips", opciones: ["Por enviar", "Enviada", "Respondida", "Sin respuesta"], inicial: "Por enviar", req: true },
      { k: "observaciones", etq: "Observaciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("4. FIRMAS", "Elabora — compras", "Revisa — director de obra"),
  etiquetaExtra: (d) => texto(d.proveedor),
  resumen: (d) => [{ t: "Ítems", v: filasConDatos(SOLICITUD.secciones[1], d).length }, { t: "Responder antes del", v: texto(d.fechaLimite) ? ddmm(d.fechaLimite) : "—" }, { t: "Estado", v: texto(d.estado) || "—" }],
  avisos: (d) => {
    const a = [];
    if (texto(d.fechaLimite) && texto(d.fecha) && d.fechaLimite < d.fecha) a.push({ tipo: "aviso", texto: "La fecha límite para responder es anterior a la fecha de la solicitud." });
    if (texto(d.proveedor) && proveedorNoAprobado(d.proveedor)) a.push({ tipo: "alerta", texto: `El proveedor «${texto(d.proveedor)}» tiene una evaluación «NO APROBADO» en Calidad. Revisa antes de pedirle cotización.` });
    return a;
  },
  alGuardar: (d) => { registrarProveedor({ nombre: d.proveedor, nit: d.nit }); },
};

// ================================================================= CO-003 Cuadro comparativo de cotizaciones
const menorCotizacion = (d) => {
  const f = filasConDatos(CUADRO.secciones[1], d).map((x) => ({ p: texto(x.proveedor), v: num(x.valor) })).filter((x) => x.v !== null && x.v > 0);
  return f.length ? f.reduce((m, x) => (x.v < m.v ? x : m)) : null;
};
export const CUADRO = {
  id: "com-cuadro", col: "comp_cuadro", clave: "ryr_comp_cuadro", codigo: "RYR-CO-003", hoja: "Cuadro Comparativo", plantilla: "/plantilla-com-cuadro.xlsx", archivo: "Cuadro_Comparativo",
  titulo: "Cuadro Comparativo de Cotizaciones", subtitulo: "RYR-CO-003 · Elegir al proveedor con criterio", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Se compara precio, plazo y condiciones, y queda escrito por qué se eligió a cada proveedor",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha del cuadro", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Cuadro N°", colEtq: "H", tipo: "texto" },
      { k: "requisicion", etq: "Requisición N°", colEtq: "A", tipo: "texto" },
      { k: "objeto", etq: "Objeto de la compra", colEtq: "A", tipo: "area", req: true },
    ] },
    { id: "cotizaciones", titulo: "2. Proveedores que cotizaron", tipo: "tabla", k: "cotizaciones", fin: "3. COMPARACIÓN POR ÍTEM", max: 5, req: true, nombreFila: "Proveedor", tituloFila: "proveedor", cols: [
      { k: "proveedor", enc: "Proveedor", tipo: "texto", req: true, fuente: "proveedores", w: 3 },
      { k: "nit", enc: "NIT", tipo: "texto", w: 2 },
      { k: "valor", enc: "Valor total cotizado", tipo: "numero", req: true, w: 2 },
      { k: "plazo", enc: "Plazo de entrega (días)", tipo: "numero", w: 1 },
      { k: "pago", enc: "Forma de pago", tipo: "texto", w: 2 },
      { k: "cumple", enc: "Cumple lo solicitado", tipo: "chips", opciones: ["Cumple", "Cumple parcial", "No cumple"], semaforo: true, w: 2 },
    ] },
    { id: "precios", titulo: "3. Comparación por ítem", tipo: "tabla", k: "precios", fin: "4. DECISIÓN", despuesDe: "cotizaciones", max: 12, nombreFila: "Ítem", tituloFila: "descripcion", cols: [
      { k: "descripcion", enc: "Descripción del ítem", tipo: "texto", fuente: "materiales", w: 4 },
      { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES, w: 1 },
      { k: "cantidad", enc: "Cantidad", tipo: "numero", w: 1 },
      { k: "p1", enc: "Precio unit. prov. 1", tipo: "numero", w: 1 },
      { k: "p2", enc: "Precio unit. prov. 2", tipo: "numero", w: 1 },
      { k: "p3", enc: "Precio unit. prov. 3", tipo: "numero", w: 1 },
      { k: "p4", enc: "Precio unit. prov. 4", tipo: "numero", w: 1 },
      { k: "p5", enc: "Precio unit. prov. 5", tipo: "numero", w: 1 },
    ] },
    { id: "decision", titulo: "4. Decisión", tipo: "campos", campos: [
      { k: "menor", etq: "Menor valor cotizado", colEtq: "A", tipo: "calculado", calc: (d) => { const m = menorCotizacion(d); return m ? `${m.p || "Proveedor s/n"} — ${pesos(m.v)}` : ""; } },
      { k: "seleccionado", etq: "Proveedor seleccionado", colEtq: "A", tipo: "texto", fuente: "proveedores", req: true },
      { k: "criterio", etq: "Criterio de selección", colEtq: "H", tipo: "lista", opciones: ["Menor precio", "Mejor plazo de entrega", "Mejor relación precio-calidad", "Único proveedor disponible", "Otro"], req: true },
      { k: "justificacion", etq: "Justificación de la elección", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("5. FIRMAS", "Elabora — compras", "Aprueba — director de obra / gerencia"),
  etiquetaExtra: (d) => texto(d.seleccionado) || `${filasConDatos(CUADRO.secciones[1], d).length} cotizaciones`,
  resumen: (d) => { const m = menorCotizacion(d); return [{ t: "Cotizaciones", v: filasConDatos(CUADRO.secciones[1], d).length }, { t: "Menor valor", v: m ? pesos(m.v) : "—", color: "#1D6B3A" }, { t: "Seleccionado", v: texto(d.seleccionado) || "—" }]; },
  avisos: (d) => {
    const a = []; const cot = filasConDatos(CUADRO.secciones[1], d);
    if (cot.length && cot.length < 3) a.push({ tipo: "info", texto: `Solo hay ${cot.length} ${cot.length === 1 ? "cotización" : "cotizaciones"}. Lo recomendado es comparar mínimo 3; si no es posible, anótalo en la justificación.` });
    const m = menorCotizacion(d);
    if (m && texto(d.seleccionado) && claveTxt(d.seleccionado) !== claveTxt(m.p) && !texto(d.justificacion)) a.push({ tipo: "aviso", texto: `El proveedor seleccionado no es el de menor valor (${m.p || "s/n"}): escribe en «Justificación» por qué se eligió.` });
    if (texto(d.seleccionado) && !cot.some((c) => claveTxt(c.proveedor) === claveTxt(d.seleccionado))) a.push({ tipo: "aviso", texto: "El proveedor seleccionado no está entre los que cotizaron en este cuadro." });
    if (texto(d.seleccionado) && proveedorNoAprobado(d.seleccionado)) a.push({ tipo: "alerta", texto: `El proveedor «${texto(d.seleccionado)}» tiene una evaluación «NO APROBADO» en Calidad.` });
    return a;
  },
  alGuardar: (d) => { filasConDatos(CUADRO.secciones[1], d).forEach((c) => registrarProveedor({ nombre: c.proveedor, nit: c.nit })); registrarProveedor({ nombre: d.seleccionado }); },
};

// ================================================================= CO-004 Orden de compra
export const ORDEN = {
  fuentes: FUENTES,
  id: "com-orden", col: "comp_orden", clave: "ryr_comp_orden", codigo: "RYR-CO-004", hoja: "Orden de Compra", plantilla: "/plantilla-com-orden.xlsx", archivo: "Orden_Compra",
  titulo: "Orden de Compra", subtitulo: "RYR-CO-004 · Compromiso con el proveedor y con el presupuesto", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Cada orden queda ligada a un capítulo del presupuesto para saber cuánto se ha comprometido",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha de la orden", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Orden de compra N°", colEtq: "H", tipo: "texto" },
      { k: "proveedor", etq: "Proveedor", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "requisicion", etq: "Requisición N°", colEtq: "A", tipo: "texto" },
      { k: "cuadro", etq: "Cuadro comparativo N°", colEtq: "H", tipo: "texto" },
      { k: "capitulo", etq: "Capítulo del presupuesto", colEtq: "A", tipo: "texto", fuente: "capitulos", req: true },
      { k: "tipoCosto", etq: "Tipo de costo", colEtq: "H", tipo: "lista", opciones: ["Material", "Subcontrato", "Maquinaria y equipo", "Transporte", "Otro"], inicial: "Material", req: true },
    ] },
    { id: "items", titulo: "2. Lo que se compra", tipo: "tabla", k: "items", fin: "3. VALORES", max: 15, req: true, nombreFila: "Ítem", cols: [
      { k: "descripcion", enc: "Descripción del material o servicio", tipo: "texto", req: true, fuente: "materiales", w: 4 },
      { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES, req: true, w: 1 },
      { k: "cantidad", enc: "Cantidad", tipo: "numero", req: true, w: 1 },
      { k: "precio", enc: "Precio unitario", tipo: "numero", req: true, w: 2 },
      { k: "subtotal", enc: "Subtotal", tipo: "calculado", enExcel: true, formato: "pesos", w: 2, calc: (f) => { const s = subtotalFila(f); return s === null ? "" : s; }, excel: (f) => { const s = subtotalFila(f); return s === null ? "" : s; } },
    ] },
    { id: "valores", titulo: "3. Valores", tipo: "campos", campos: [
      { k: "subtotal", etq: "Subtotal", colEtq: "A", tipo: "calculado", formato: "pesos", calc: (d) => totalesOrden(d).subtotal },
      { k: "ivaPct", etq: "IVA (%)", colEtq: "H", tipo: "numero", inicial: "19" },
      { k: "iva", etq: "Valor del IVA", colEtq: "A", tipo: "calculado", formato: "pesos", calc: (d) => totalesOrden(d).iva },
      { k: "total", etq: "Valor total de la orden", colEtq: "H", tipo: "calculado", formato: "pesos", calc: (d) => totalesOrden(d).total },
    ] },
    { id: "entrega", titulo: "4. Entrega y pago", tipo: "campos", campos: [
      { k: "lugar", etq: "Lugar de entrega", colEtq: "A", tipo: "texto" },
      { k: "fechaEntrega", etq: "Fecha de entrega prometida", colEtq: "H", tipo: "fecha", req: true },
      { k: "pago", etq: "Forma de pago", colEtq: "A", tipo: "lista", opciones: ["Contado", "Crédito 30 días", "Crédito 60 días", "Anticipo y saldo contra entrega", "Otra"] },
      { k: "estado", etq: "Estado de la orden", colEtq: "H", tipo: "lista", opciones: ESTADOS_ORDEN, inicial: "Emitida", req: true },
      { k: "observaciones", etq: "Condiciones y observaciones", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("5. FIRMAS", "Elabora — compras", "Aprueba — director de obra / gerencia", "Acepta — proveedor"),
  etiquetaExtra: (d) => `${texto(d.proveedor)}${totalesOrden(d).total ? " · " + pesos(totalesOrden(d).total) : ""}`,
  resumen: (d) => { const t = totalesOrden(d); return [{ t: "Ítems", v: filasConDatos(ORDEN.secciones[1], d).length }, { t: "Valor total", v: pesos(t.total) || "—" }, { t: "Estado", v: texto(d.estado) || "—", color: d.estado === "Anulada" ? "#B3401F" : undefined }]; },
  avisos: (d, reg) => {
    const a = []; const t = totalesOrden(d);
    if (texto(d.proveedor) && proveedorNoAprobado(d.proveedor)) a.push({ tipo: "alerta", texto: `El proveedor «${texto(d.proveedor)}» tiene una evaluación «NO APROBADO» en Calidad. Revisa antes de comprar.` });
    if (texto(d.capitulo) && reg && reg.obraId) {
      const e = estadoPresupuesto(reg.obraId, d.capitulo, d.estado === "Anulada" ? 0 : t.total, reg.id);
      if (e) {
        const base = `Capítulo «${texto(d.capitulo)}»: presupuesto ${pesos(e.contratado)} · ya pedido ${pesos(e.comprometido)} · con esta orden ${pesos(e.conEsta)} (${fmtP(Math.round(e.pct * 1000) / 10)} %).`;
        if (e.conEsta > e.contratado) a.push({ tipo: "alerta", texto: `Con esta orden las compras del capítulo SUPERAN el presupuesto en ${pesos(e.conEsta - e.contratado)}. ${base}` });
        else if (e.pct >= 0.9) a.push({ tipo: "aviso", texto: `Con esta orden se usa el ${fmtP(Math.round(e.pct * 1000) / 10)} % del presupuesto del capítulo. ${base}` });
        else a.push({ tipo: "info", texto: base });
      } else if (!capituloDe(reg.obraId, d.capitulo)) a.push({ tipo: "info", texto: `El capítulo «${texto(d.capitulo)}» no está en el presupuesto de Control Presupuestal de esta obra, así que no se puede comparar. Elige uno de la lista para comparar.` });
    }
    if (texto(d.fechaEntrega) && texto(d.fecha) && d.fechaEntrega < d.fecha) a.push({ tipo: "aviso", texto: "La fecha de entrega prometida es anterior a la fecha de la orden." });
    return a;
  },
  alGuardar: (d) => { registrarProveedor({ nombre: d.proveedor, nit: d.nit }); },
};

// ================================================================= CO-005 Recepción de materiales (entrada a almacén)
const saldoRecepcion = (f) => { const p = num(f.pedida); if (p === null) return ""; return redondear(p - (num(f.anterior) || 0) - (num(f.recibida) || 0)); };
export const RECEPCION = {
  id: "com-recepcion", col: "comp_recepcion", clave: "ryr_comp_recepcion", codigo: "RYR-CO-005", hoja: "Entrada a Almacén", plantilla: "/plantilla-com-recepcion.xlsx", archivo: "Entrada_Almacen",
  titulo: "Recepción de Materiales", subtitulo: "RYR-CO-005 · Entrada a almacén contra la orden de compra", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Lo que llega a la obra se cuenta contra lo pedido: así se sabe qué falta por entregar",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha de recepción", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Entrada N°", colEtq: "H", tipo: "texto" },
      { k: "ordenCompra", etq: "Orden de compra N°", colEtq: "A", tipo: "texto", fuente: "ordenes", req: true, ayuda: "Elige la orden: se traen el proveedor y los ítems con lo que falta por recibir." },
      { k: "remision", etq: "Remisión o factura N°", colEtq: "H", tipo: "texto", req: true },
      { k: "proveedor", etq: "Proveedor", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "placa", etq: "Placa del vehículo", colEtq: "A", tipo: "texto" },
      { k: "hora", etq: "Hora", colEtq: "H", tipo: "hora" },
    ] },
    { id: "materiales", titulo: "2. Materiales recibidos", tipo: "tabla", k: "materiales", fin: "3. RESULTADO", finEmpieza: true, max: 15, req: true, nombreFila: "Material", tituloFila: "descripcion",
      autoFila: (n, f) => {
        const p = num(n.pedida); const falta = p === null ? null : p - (num(n.anterior) || 0) - (num(n.recibida) || 0);
        if (num(n.recibida) !== null && falta !== null && (!n.estado || ((n.estado === "Completo" || n.estado === "Faltante") && n.estado === f.estado))) return { estado: falta <= 1e-9 ? "Completo" : "Faltante" };
        return null;
      },
      cols: [
        { k: "descripcion", enc: "Material y referencia", tipo: "texto", req: true, fuente: "materiales", w: 4 },
        { k: "unidad", enc: "Unidad", tipo: "chips", opciones: UNIDADES, req: true, w: 1 },
        { k: "pedida", enc: "Cantidad pedida", tipo: "numero", w: 1 },
        { k: "anterior", enc: "Recibido antes", tipo: "numero", w: 1 },
        { k: "recibida", enc: "Cantidad recibida", tipo: "numero", req: true, w: 1 },
        { k: "saldo", enc: "Saldo por recibir", tipo: "calculado", enExcel: true, w: 1, calc: saldoRecepcion, excel: saldoRecepcion },
        { k: "estado", enc: "Estado", tipo: "chips", opciones: ["Completo", "Faltante", "Con daños", "Devuelto"], req: true, semaforo: true, w: 2 },
      ] },
    { id: "resultado", titulo: "3. Resultado de la recepción", tipo: "campos", campos: [
      { k: "resultado", etq: "Resultado", colEtq: "A", tipo: "chips", opciones: ["Recibido completo", "Recibido con faltantes", "Recibido con novedades", "Rechazado / devuelto"], req: true, semaforo: true },
      { k: "almacenamiento", etq: "Ubicación de almacenamiento", colEtq: "A", tipo: "texto" },
      { k: "novedades", etq: "Novedades, daños o devoluciones", colEtq: "A", tipo: "area" },
      { k: "inspeccion", etq: "¿Requiere inspección de calidad?", colEtq: "A", tipo: "chips", opciones: SI_NO, ayuda: "Si es «Sí», regístrala en Calidad › Recepción de Materiales (RYR-CA-004)." },
    ] },
  ],
  firmas: FIRMAS("4. FIRMAS", "Recibe — almacenista", "Entrega — proveedor / transportador", "Revisa — residente de obra"),
  fuentes: FUENTES,
  etiquetaExtra: (d) => `${texto(d.proveedor)}${texto(d.ordenCompra) ? " · OC " + texto(d.ordenCompra) : ""}`,
  resumen: (d) => {
    const m = filasConDatos(RECEPCION.secciones[1], d);
    return [{ t: "Materiales", v: m.length }, { t: "Con faltantes", v: m.filter((x) => x.estado === "Faltante").length, color: "#B8860B" }, { t: "Con daños o devueltos", v: m.filter((x) => x.estado === "Con daños" || x.estado === "Devuelto").length, color: "#B3401F" }];
  },
  avisos: (d, reg) => {
    const a = [];
    const orden = reg && reg.obraId && texto(d.ordenCompra) ? ordenPorNumero(reg.obraId, d.ordenCompra) : null;
    if (texto(d.ordenCompra) && reg && reg.obraId && !orden) a.push({ tipo: "aviso", texto: `No encuentro la orden de compra N° ${texto(d.ordenCompra)} en esta obra. Elígela de la lista para comparar contra lo pedido.` });
    if (orden && orden.datos.estado === "Anulada") a.push({ tipo: "alerta", texto: `La orden de compra N° ${texto(d.ordenCompra)} está ANULADA.` });
    const sobra = filasConDatos(RECEPCION.secciones[1], d).filter((x) => num(x.pedida) !== null && (num(x.anterior) || 0) + (num(x.recibida) || 0) > num(x.pedida) + 1e-9);
    if (sobra.length) a.push({ tipo: "aviso", texto: `Se recibió más de lo pedido en: ${sobra.map((x) => texto(x.descripcion)).slice(0, 3).join(", ")}. Confírmalo con el proveedor.` });
    if (texto(d.proveedor) && proveedorNoAprobado(d.proveedor)) a.push({ tipo: "alerta", texto: `El proveedor «${texto(d.proveedor)}» tiene una evaluación «NO APROBADO». Revisa con calidad antes de recibir.` });
    if (d.resultado === "Recibido completo" && filasConDatos(RECEPCION.secciones[1], d).some((x) => x.estado === "Faltante" || x.estado === "Con daños" || x.estado === "Devuelto")) a.push({ tipo: "aviso", texto: "El resultado es «Recibido completo» pero hay materiales con faltantes, daños o devueltos. Revisa el resultado." });
    return a;
  },
  alGuardar: (d, reg) => {
    registrarProveedor({ nombre: d.proveedor, nit: d.nit });
    if (reg && reg.obraId && texto(d.ordenCompra)) actualizarEstadoOrden(reg.obraId, d.ordenCompra);     // la orden pasa a «Recibida parcial» o «Recibida completa»
  },
};

// ================================================================= CO-006 Control de pedidos pendientes
const plazoDe = (f, d) => estadoPlazo(f.fechaPrometida, texto(d && d.fecha) || hoyISO());
export const PENDIENTES = {
  id: "com-pendientes", col: "comp_pendientes", clave: "ryr_comp_pendientes", codigo: "RYR-CO-006", hoja: "Pedidos Pendientes", plantilla: "/plantilla-com-pendientes.xlsx", archivo: "Pedidos_Pendientes",
  titulo: "Control de Pedidos Pendientes", subtitulo: "RYR-CO-006 · Lo pedido que aún no ha llegado", panelObra: ["contrato", "ubicacion", "contratista"],
  lema: "Se arma solo con las órdenes de compra y las entradas a almacén: pedido menos recibido",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      ...OBRA,
      { k: "fecha", etq: "Fecha de corte", colEtq: "A", tipo: "fecha", req: true },
      { k: "hoja", etq: "Hoja N°", colEtq: "H", tipo: "texto" },
    ] },
    { id: "pedidos", titulo: "2. Pedidos pendientes de entrega", tipo: "tabla", k: "pedidos", fin: "3. OBSERVACIONES", max: 30, req: true, nombreFila: "Pedido", tituloFila: "descripcion",
      traer: {
        texto: "↻ Traer los pedidos pendientes de las órdenes de compra",
        fn: ({ obraId, datos }) => {
          const previas = new Map(arr(datos.pedidos).map((f) => [`${texto(f.orden)}|${claveTxt(f.descripcion)}`, f]));
          return pendientesDeOrdenes(obraId, texto(datos.fecha) || hoyISO()).map((f) => ({ ...f, gestion: (previas.get(`${f.orden}|${claveTxt(f.descripcion)}`) || {}).gestion || "" }));     // la gestión ya escrita se conserva
        },
        vacio: "No hay pedidos pendientes: todo lo ordenado ya llegó (o todavía no hay órdenes de compra en esta obra).",
      },
      cols: [
        { k: "orden", enc: "Orden N°", tipo: "texto", w: 1 },
        { k: "proveedor", enc: "Proveedor", tipo: "texto", w: 2 },
        { k: "descripcion", enc: "Material o servicio", tipo: "texto", w: 3 },
        { k: "unidad", enc: "Unidad", tipo: "texto", w: 1 },
        { k: "pedida", enc: "Pedido", tipo: "numero", w: 1 },
        { k: "recibida", enc: "Recibido", tipo: "numero", w: 1 },
        { k: "saldo", enc: "Saldo", tipo: "numero", w: 1 },
        { k: "fechaPrometida", enc: "Entrega prometida", tipo: "fecha", w: 1 },
        { k: "dias", enc: "Días de atraso", tipo: "calculado", enExcel: true, w: 1, calc: (f, d) => plazoDe(f, d).dias, excel: (f, d) => plazoDe(f, d).dias },
        { k: "estado", enc: "Estado", tipo: "calculado", enExcel: true, semaforo: true, w: 1, calc: (f, d) => plazoDe(f, d).estado, excel: (f, d) => plazoDe(f, d).estado },
        { k: "gestion", enc: "Gestión con el proveedor", tipo: "texto", w: 2 },
      ] },
    { id: "obs", titulo: "3. Observaciones", tipo: "campos", campos: [
      { k: "observaciones", etq: "Observaciones y acciones a tomar", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("4. FIRMAS", "Elabora — compras", "Revisa — director de obra"),
  etiquetaExtra: (d) => `${filasConDatos(PENDIENTES.secciones[1], d).length} pedidos`,
  resumen: (d) => {
    const f = filasConDatos(PENDIENTES.secciones[1], d); const est = (x) => plazoDe(x, d).estado;
    return [{ t: "Pedidos pendientes", v: f.length }, { t: "Atrasados", v: f.filter((x) => est(x) === "Atrasado").length, color: "#B3401F" }, { t: "Por vencer (3 días)", v: f.filter((x) => est(x) === "Por vencer").length, color: "#B8860B" }];
  },
  avisos: (d) => {
    const a = []; const atr = filasConDatos(PENDIENTES.secciones[1], d).filter((x) => plazoDe(x, d).estado === "Atrasado");
    if (atr.length) a.push({ tipo: "alerta", texto: `${atr.length} ${atr.length === 1 ? "pedido está atrasado" : "pedidos están atrasados"}. Escribe en «Gestión con el proveedor» qué se acordó para cada uno.` });
    if (atr.some((x) => !texto(x.gestion))) a.push({ tipo: "aviso", texto: "Hay pedidos atrasados sin gestión escrita." });
    return a;
  },
};

// ================================================================= CO-007 Evaluación de proveedores (desde Compras)
export const CRITERIOS_COMPRAS = [
  { t: "Cumplimiento de los plazos de entrega", peso: 25 },
  { t: "Calidad y conformidad de lo entregado", peso: 25 },
  { t: "Precio y condiciones comerciales", peso: 20 },
  { t: "Cantidades y documentos correctos (remisión, factura, certificados)", peso: 10 },
  { t: "Atención de reclamos, devoluciones y garantías", peso: 10 },
  { t: "Servicio: respuesta rápida y disponibilidad", peso: 10 },
];
// Puntaje = Σ peso × calificación / 5, solo si están los 6 criterios calificados (igual que la hoja de Excel)
export function puntajeCompras(d) {
  const cal = arr(d.criterios).map((x) => numero(x.resp));
  if (cal.length !== CRITERIOS_COMPRAS.length || cal.some((n) => n === null)) return null;
  return Math.round(cal.reduce((t, n, i) => t + (CRITERIOS_COMPRAS[i].peso * n) / 5, 0) * 10) / 10;
}
export const resultadoCompras = (p) => (p === null ? "Falta calificar" : p >= 80 ? "APROBADO" : p >= 60 ? "APROBADO CONDICIONADO" : "NO APROBADO");
// Datos de lo que ya pasó con el proveedor en la obra (para evaluar con hechos)
export function historialProveedor(obraId, nombre) {
  const k = claveTxt(nombre); if (!k || !obraId) return null;
  const ords = ordenesDeObra(obraId).filter((r) => ordenVigente(r) && claveTxt((r.datos || {}).proveedor) === k);
  if (!ords.length) return null;
  const total = ords.reduce((t, r) => t + totalDeOrden(r), 0);
  const recs = recepcionesDeObra(obraId).filter((r) => claveTxt((r.datos || {}).proveedor) === k);
  const novedades = recs.filter((r) => /faltantes|novedades|Rechazado/.test(texto((r.datos || {}).resultado))).length;
  const atrasadas = ords.filter((r) => (r.datos || {}).estado !== "Recibida completa" && texto((r.datos || {}).fechaEntrega) && r.datos.fechaEntrega < hoyISO()).length;
  return { ordenes: ords.length, total, recepciones: recs.length, novedades, atrasadas };
}
export const EVALUACION = {
  id: "com-evaluacion", col: "comp_evaluacion", clave: "ryr_comp_evaluacion", codigo: "RYR-CO-007", hoja: "Evaluación Proveedores", plantilla: "/plantilla-com-evaluacion.xlsx", archivo: "Evaluacion_Proveedor_Compras",
  titulo: "Evaluación de Proveedores", subtitulo: "RYR-CO-007 · Cumplimiento, calidad y precio", panelObra: [],
  lema: "Se evalúa con lo que pasó: entregas a tiempo, lo recibido y el trato comercial",
  secciones: [
    { id: "datos", titulo: "1. Datos generales", tipo: "campos", campos: [
      { k: "proyecto", etq: "Proyecto / Obra", colEtq: "A", obra: "proyecto" },
      { k: "proveedor", etq: "Proveedor", colEtq: "A", tipo: "texto", req: true, fuente: "proveedores" },
      { k: "nit", etq: "NIT", colEtq: "H", tipo: "texto" },
      { k: "tipoEval", etq: "Tipo de evaluación", colEtq: "A", tipo: "lista", opciones: ["Selección inicial", "Reevaluación periódica", "Cierre de orden o contrato", "Por incumplimiento"], req: true },
      { k: "suministro", etq: "Suministro o servicio evaluado", colEtq: "H", tipo: "texto", req: true },
      { k: "desde", etq: "Periodo evaluado desde", colEtq: "A", tipo: "fecha" },
      { k: "hasta", etq: "Hasta", colEtq: "E", tipo: "fecha" },
      { k: "fecha", etq: "Fecha de evaluación", colEtq: "H", tipo: "fecha", req: true },
    ] },
    { id: "criterios", titulo: "2. Calificación por criterio", tipo: "lista", k: "criterios", cabecera: "No.", fin: "TOTAL (sobre 100 puntos)", items: CRITERIOS_COMPRAS, req: true,
      resp: { enc: "Calificación (1 a 5)", opciones: ["1", "2", "3", "4", "5"], numerica: true, etiquetas: { 1: "Muy deficiente", 2: "Deficiente", 3: "Aceptable", 4: "Bueno", 5: "Excelente" } }, obs: { enc: "Observaciones" } },
    { id: "decision", titulo: "3. Decisión", tipo: "campos", campos: [
      { k: "decision", etq: "Decisión", colEtq: "A", tipo: "lista", opciones: ["Seguir comprándole", "Seguir con plan de mejora", "Comprar solo si no hay alternativa", "No volver a comprarle"], req: true },
      { k: "proxima", etq: "Fecha de próxima evaluación", colEtq: "H", tipo: "fecha" },
      { k: "fortalezas", etq: "Fortalezas observadas", colEtq: "A", tipo: "area" },
      { k: "mejorar", etq: "Aspectos a mejorar y acuerdos", colEtq: "A", tipo: "area" },
    ] },
  ],
  firmas: FIRMAS("4. FIRMAS", "Evalúa — compras", "Revisa — residente de obra", "Vo.Bo. — gerencia"),
  etiquetaExtra: (d) => texto(d.proveedor),
  resumen: (d) => { const p = puntajeCompras(d); const r = resultadoCompras(p); return [{ t: "Puntaje (sobre 100)", v: p === null ? "" : fmtP(p) }, { t: "Resultado", v: r, color: r === "APROBADO" ? "#1D6B3A" : r === "NO APROBADO" ? "#B3401F" : "#B8860B" }]; },
  avisos: (d, reg) => {
    const a = []; const r = resultadoCompras(puntajeCompras(d));
    const h = reg && reg.obraId ? historialProveedor(reg.obraId, d.proveedor) : null;
    if (h) a.push({ tipo: "info", texto: `En esta obra: ${h.ordenes} ${h.ordenes === 1 ? "orden" : "órdenes"} por ${pesos(h.total)} · ${h.recepciones} ${h.recepciones === 1 ? "entrada" : "entradas"} a almacén (${h.novedades} con faltantes o novedades) · ${h.atrasadas} ${h.atrasadas === 1 ? "orden atrasada" : "órdenes atrasadas"}.` });
    if (r === "NO APROBADO" && /^Seguir comprándole/.test(texto(d.decision))) a.push({ tipo: "aviso", texto: "El resultado es «NO APROBADO» pero la decisión es seguir comprándole. Revisa que sea lo que quieres." });
    if ((r === "APROBADO CONDICIONADO" || r === "NO APROBADO") && !texto(d.mejorar)) a.push({ tipo: "aviso", texto: `El resultado es «${r}»: anota qué debe corregir el proveedor y para cuándo.` });
    return a;
  },
  alGuardar: (d, reg) => {
    if (!texto(d.proveedor)) return;
    registrarProveedor({ nombre: d.proveedor, nit: d.nit });
    const p = puntajeCompras(d);
    if (p !== null) actualizarProveedor(d.proveedor, { evaluacionCompras: { fecha: d.fecha, puntaje: p, resultado: resultadoCompras(p), decision: d.decision, obraId: reg && reg.obraId } });
  },
};

export const FORMATOS_COM = { "com-requisicion": REQUISICION, "com-solicitud": SOLICITUD, "com-cuadro": CUADRO, "com-orden": ORDEN, "com-recepcion": RECEPCION, "com-pendientes": PENDIENTES, "com-evaluacion": EVALUACION };
export const LISTA_FORMATOS_COM = [REQUISICION, SOLICITUD, CUADRO, ORDEN, RECEPCION, PENDIENTES, EVALUACION];
