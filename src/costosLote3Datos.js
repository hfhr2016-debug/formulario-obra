// Control Presupuestal · Lote 3: Flujo de Caja (RYR-CP-009), Costos y Rentabilidad (RYR-CP-010), Cierre Financiero (RYR-CP-011).
// Igual que el Lote 2: cada formato es una configuración que leen las pantallas genéricas (FormularioCostosLibro y FormularioCostosFicha).
// La app escribe solo los datos; las fórmulas siguen en la plantilla. Lo común está en sstBase.js, cpBase.js, cpLibros.js y cpLote3.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";
import { num, texto, TIPOS_COSTO, COLORES_ESTADO, tipoProyectoActual } from "./cpBase";
import {
  CLAVE_CP_FLUJO, mesFlujoNuevo, mesFlujoVacio, calcFlujo, resumenFlujo, nombreMes, realesPorMes, calcInforme, calcCierre, traerInforme, traerCierre, UNIDADES_CIERRE,
} from "./cpLote3";

const arr = (a) => (Array.isArray(a) ? a : []);
const numero = (v) => (num(v) === null ? "" : num(v));
const frac = (v) => (num(v) === null ? "" : num(v) / 100);
function pesos(v) { const n = num(v); if (n === null) return ""; const r = Math.round(n); return (r < 0 ? "-$ " : "$ ") + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function pct(f) { return f === null || f === undefined || !isFinite(f) ? "" : (Math.round(f * 1000) / 10).toString().replace(".", ",") + " %"; }
const COLOR_SEM = { ALERTA: COLORES_ESTADO.ALERTA, VIGILAR: COLORES_ESTADO.VIGILAR, OK: COLORES_ESTADO.OK, "DÉFICIT": COLORES_ESTADO.ALERTA, PÉRDIDA: COLORES_ESTADO.ALERTA, "POR DEBAJO DE LO PACTADO": COLORES_ESTADO.VIGILAR, "CUMPLE LO PACTADO": COLORES_ESTADO.OK };
const pintar = (ws, ref, estado) => { const c = COLOR_SEM[estado]; if (c && ref) pintarCelda(ws, ref, c.relleno, c.fuente); };

// ===================== Especificaciones de las plantillas =====================
export const SPEC_FLUJO = {
  campos: [["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "G", "J"], ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "G", "J"],
    ["corte", "Fecha de corte", "A", "D"], ["responsable", "Responsable del control", "G", "J"]],
  tablas: [{ clave: "meses", cabecera: "No.", fin: "TOTAL", finEmpieza: true,
    columnas: { mes: "B", saldoIni: "C", ingProy: "D", ingReal: "E", egrProy: "F", egrReal: "G", estado: "M" },
    encabezados: { estado: "Estado", mes: "Mes o periodo", saldoIni: "Saldo inicial", ingProy: "Ingresos proyectados", ingReal: "Ingresos reales", egrProy: "Egresos proyectados", egrReal: "Egresos reales" } }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "elabora", col: "D" }, { clave: "revisa", col: "J" }] },
};
export const CELDAS_FLUJO = {"proyecto":"D10","tipo":"J10","contrato":"D11","contratante":"J11","corte":"D12","responsable":"J12","tablas":{"meses":{"fila0":15,"n":12,"columnas":{"mes":"B","saldoIni":"C","ingProy":"D","ingReal":"E","egrProy":"F","egrReal":"G","estado":"M"}}},"firmas":{"elabora":{"nombre":"D40","cargo":"D41"},"revisa":{"nombre":"J40","cargo":"J41"}}};
export const descubrirFlujo = (ws) => descubrirPorEtiquetas(ws, SPEC_FLUJO);

const DATOS10 = [["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "F", "I"], ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "F", "I"]];
const FIRMAS10 = { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "elabora", col: "D" }, { clave: "revisa", col: "I" }] };
export const SPEC_COSTOS = {
  campos: [...DATOS10, ["corte", "Fecha de corte", "A", "D"], ["responsable", "Responsable del informe", "F", "I"],
    ["valorInicial", "Valor del contrato inicial", "A", "D"], ["adicionales", "Adicionales aprobados", "A", "D"], ["facturado", "Facturado en actas a la fecha", "A", "D"],
    ["avance", "% de avance físico de la obra", "A", "D"], ["porTerminar", "Costo estimado por terminar", "A", "D"], ["margenObjetivo", "Margen objetivo %", "A", "D"], ["estado", "Estado de la rentabilidad", "A", "D"]],
  tablas: [{ clave: "tipos", cabecera: "No.", fin: "TOTAL COSTO", finEmpieza: true, columnas: { pres: "C", real: "D", estado: "H" },
    encabezados: { pres: "Presupuestado", real: "Costo real acumulado", estado: "Estado" } }],
  firmas: FIRMAS10,
};
export const CELDAS_COSTOS = {"proyecto":"D10","tipo":"I10","contrato":"D11","contratante":"I11","corte":"D12","responsable":"I12","valorInicial":"D14","adicionales":"D15","facturado":"D17","avance":"D35","porTerminar":"D36","margenObjetivo":"D40","estado":"D41","tablas":{"tipos":{"fila0":22,"n":7,"columnas":{"pres":"C","real":"D","estado":"H"}}},"firmas":{"elabora":{"nombre":"D46","cargo":"D47"},"revisa":{"nombre":"I46","cargo":"I47"}}};
export const descubrirCostos = (ws) => descubrirPorEtiquetas(ws, SPEC_COSTOS);

export const SPEC_CIERRE = {
  campos: [...DATOS10, ["corte", "Fecha de cierre", "A", "D"], ["responsable", "Responsable del cierre", "F", "I"],
    ["valorInicial", "Valor del contrato inicial", "A", "D"], ["adicionales", "Adicionales aprobados", "A", "D"], ["deductivos", "Deductivos (menores cantidades)", "A", "D"], ["facturado", "Total facturado en actas", "A", "D"],
    ["utilidadPactada", "Utilidad pactada en el contrato (%)", "A", "D"], ["resultado", "Resultado", "A", "D"],
    ["unidad", "Unidad de medida", "A", "D"], ["cantidad", "Cantidad total ejecutada", "A", "D"],
    ["anticipoEntregado", "Anticipo entregado", "A", "D"], ["anticipoAmortizado", "Anticipo amortizado", "A", "D"], ["retegarantia", "Retegarantía pendiente de devolución", "A", "D"], ["cuentasPorPagar", "Cuentas por pagar pendientes", "A", "D"],
    ["observaciones", "7. OBSERVACIONES Y LECCIONES APRENDIDAS", "A", "A", undefined, 1]],
  tablas: [{ clave: "tipos", cabecera: "No.", fin: "COSTO TOTAL", finEmpieza: true, columnas: { real: "C" }, encabezados: { real: "Costo real final" } }],
  firmas: FIRMAS10,
};
export const CELDAS_CIERRE = {"proyecto":"D10","tipo":"I10","contrato":"D11","contratante":"I11","corte":"D12","responsable":"I12","valorInicial":"D14","adicionales":"D15","deductivos":"D16","facturado":"D18","utilidadPactada":"D35","resultado":"D37","unidad":"D40","cantidad":"D41","anticipoEntregado":"D47","anticipoAmortizado":"D48","retegarantia":"D50","cuentasPorPagar":"D51","observaciones":"A54","tablas":{"tipos":{"fila0":23,"n":7,"columnas":{"real":"C"}}},"firmas":{"elabora":{"nombre":"D62","cargo":"D63"},"revisa":{"nombre":"I62","cargo":"I63"}}};
export const descubrirCierre = (ws) => descubrirPorEtiquetas(ws, SPEC_CIERRE);

// ===================== Configuración de cada formato =====================
const T = { texto: "texto", dinero: "dinero", num: "num", pct: "pct", fecha: "fecha", chips: "chips", mes: "mes", area: "area" };
const siguienteMes = (ym) => { const m = /^(\d{4})-(\d{2})$/.exec(texto(ym)); if (!m) { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; } const y = Number(m[1]), mm = Number(m[2]); return mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, "0")}`; };
const ordenar = (xs) => [...xs].sort((a, b) => texto(a.mes).localeCompare(texto(b.mes)));

export const FORMATOS3 = {
  flujo: {
    id: "flujo", codigo: "RYR-CP-009", hoja: "Flujo de Caja", plantilla: "/plantilla-flujo-caja.xlsx", archivo: "FlujoDeCaja",
    titulo: "Flujo de Caja", subtitulo: "RYR-CP-009 · Ingresos y egresos por mes",
    spec: SPEC_FLUJO, celdas: () => CELDAS_FLUJO, descubrir: descubrirFlujo,
    cabecera: [{ k: "corte", label: "Fecha de corte", tipo: T.fecha, req: true }, { k: "responsable", label: "Responsable del control", ph: "Administración" }, { k: "saldoInicial", label: "Saldo inicial de caja (primer mes)", tipo: T.dinero }],
    listas: [{
      id: "meses", seccion: "meses", titulo: "Flujo mensual", singular: "mes", capacidad: 12, clave: CLAVE_CP_FLUJO, nuevo: mesFlujoNuevo, vacio: mesFlujoVacio,
      alAgregar: (todas) => ({ mes: siguienteMes((todas.filter((m) => m.mes).slice(-1)[0] || {}).mes) }),
      campos: [
        { k: "mes", label: "Mes o periodo", tipo: T.mes, req: true },
        { k: "ingProy", label: "Ingresos proyectados", tipo: T.dinero, mitad: true },
        { k: "ingReal", label: "Ingresos reales", tipo: T.dinero, mitad: true },
        { k: "egrProy", label: "Egresos proyectados", tipo: T.dinero, mitad: true },
        { k: "egrReal", label: "Egresos reales", tipo: T.dinero, mitad: true },
      ],
      botones: [
        { texto: "📥 Traer los reales: anticipo, actas cobradas y facturas pagadas", accion: ({ obraId, filas }) => {
          const real = realesPorMes(obraId), meses = Object.keys(real).filter((k) => real[k].ing || real[k].egr).sort();
          if (!meses.length) return { aviso: "No encontré actas cobradas ni facturas pagadas con fecha en el Anticipo ni en el Registro de Costos." };
          let xs = filas.filter((m) => !mesFlujoVacio(m)), nuevos = 0, omitidos = 0;
          meses.forEach((ym) => {
            let m = xs.find((x) => x.mes === ym);
            if (!m) { if (xs.length >= 12) { omitidos++; return; } m = mesFlujoNuevo({ obraId, mes: ym }); xs = [...xs, m]; nuevos++; }
            xs = xs.map((x) => (x.id === m.id ? { ...x, ...(real[ym].ing ? { ingReal: String(Math.round(real[ym].ing)) } : {}), ...(real[ym].egr ? { egrReal: String(Math.round(real[ym].egr)) } : {}) } : x));
          });
          return { filas: ordenar(xs), aviso: `Se trajeron los reales de ${meses.length - omitidos} ${meses.length - omitidos === 1 ? "mes" : "meses"}${nuevos ? ` (${nuevos} mes${nuevos === 1 ? "" : "es"} nuevo${nuevos === 1 ? "" : "s"})` : ""}${omitidos ? `; ${omitidos} no caben en la hoja` : ""}.` };
        } },
        { texto: "📥 Traer los egresos proyectados de Cuentas por Pagar (por vencimiento)", accion: ({ obraId, filas }) => {
          const real = realesPorMes(obraId), meses = Object.keys(real).filter((k) => real[k].porPagar > 0).sort();
          if (!meses.length) return { aviso: "No hay cuentas por pagar con saldo y fecha de vencimiento." };
          let xs = filas.filter((m) => !mesFlujoVacio(m)), omitidos = 0;
          meses.forEach((ym) => {
            let m = xs.find((x) => x.mes === ym);
            if (!m) { if (xs.length >= 12) { omitidos++; return; } m = mesFlujoNuevo({ obraId, mes: ym }); xs = [...xs, m]; }
            xs = xs.map((x) => (x.id === m.id ? { ...x, egrProy: String(Math.round(real[ym].porPagar)) } : x));
          });
          return { filas: ordenar(xs), aviso: `Se trajeron los pagos por vencer de ${meses.length - omitidos} ${meses.length - omitidos === 1 ? "mes" : "meses"}${omitidos ? `; ${omitidos} no caben en la hoja` : ""}.` };
        } },
      ],
      calculo: (r, ctx, i, todas) => {
        const so = ordenar(todas.filter((m) => !mesFlujoVacio(m))), k = so.findIndex((x) => x.id === r.id);
        const c = k < 0 ? null : calcFlujo(ctx.cab.saldoInicial, so)[k];
        if (!c || (c.J === null && c.K === null)) return null;
        const mal = c.estado === "DÉFICIT";
        return { color: mal ? "#B3401F" : "#1D6B3A", fondo: mal ? "#FDECEA" : "#EAF4EC",
          lineas: [["Saldo inicial", pesos(c.C)], ["Saldo final proyectado", c.J === null ? "—" : pesos(c.J)], ["Saldo final real", c.K === null ? "—" : pesos(c.K)], ["Desviación del saldo", c.L === null ? "—" : pesos(c.L)], ["Estado", c.estado]] };
      },
    }],
    cifras: (d) => { const r = resumenFlujo(d.cab.saldoInicial, d.meses); return [
      { t: "Ingresos proyectados", v: pesos(r.ingProy) }, { t: "Egresos proyectados", v: pesos(r.egrProy) },
      { t: "Menor saldo proyectado", v: pesos(r.menorSaldo), color: r.menorSaldo !== null && r.menorSaldo < 0 ? "#B3401F" : "#1D6B3A" }, { t: "Mes más crítico", v: r.mesCritico },
      { t: "Financiación necesaria", v: pesos(r.financiacion), color: r.financiacion ? "#B3401F" : "#1D6B3A" }, { t: "Cumplimiento del recaudo", v: pct(r.recaudo) }]; },
    ayuda: "El saldo inicial se escribe solo en el primer mes; los siguientes lo arrastran. DÉFICIT = el saldo del mes queda por debajo de cero: hay que conseguir recursos o mover pagos. Mientras un mes no tenga datos reales, el estado se calcula con lo proyectado.",
    firmas: [{ clave: "elabora", titulo: "Elaboró — Administración", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: "Revisó — Gerencia", n: "Nombre de quien revisa", c: "Cargo de quien revisa" }],
  },
};

const camposTipos = (conPres) => TIPOS_COSTO.flatMap((t, i) => [
  ...(conPres ? [{ k: `pres${i}`, label: `${t}: presupuestado`, tipo: T.dinero, mitad: true }] : []),
  { k: `real${i}`, label: `${t}: costo real`, tipo: T.dinero, mitad: conPres },
]);
const FIRMAS_GERENCIA = (der) => [{ clave: "elabora", titulo: "Elaboró — Director de obra", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: der, n: "Nombre de quien revisa", c: "Cargo de quien revisa" }];

export const FICHAS = {
  costos: {
    id: "costos", codigo: "RYR-CP-010", hoja: "Costos y Rentabilidad", plantilla: "/plantilla-costos-rentab.xlsx", archivo: "Costos_Rentabilidad",
    titulo: "Costos y Rentabilidad", subtitulo: "RYR-CP-010 · Costo real, utilidad y margen proyectado",
    spec: SPEC_COSTOS, celdas: () => CELDAS_COSTOS, descubrir: descubrirCostos, calc: calcInforme, fechaTraer: "corte",
    cabecera: [{ k: "corte", label: "Fecha de corte", tipo: T.fecha, req: true }, { k: "responsable", label: "Responsable del informe", ph: "Director de obra" }],
    secciones: [
      { id: "contrato", titulo: "Valor del contrato e ingresos", campos: [
        { k: "valorInicial", label: "Valor del contrato inicial", tipo: T.dinero, req: true }, { k: "adicionales", label: "Adicionales aprobados", tipo: T.dinero }, { k: "facturado", label: "Facturado en actas a la fecha", tipo: T.dinero }],
        sub: (c) => (c.vigente === null ? "Valor vigente y facturado" : `Vigente ${pesos(c.vigente)}`),
        resumen: (c) => [["Valor vigente del contrato", pesos(c.vigente)], ["% facturado del valor vigente", pct(c.pctFact)]] },
      { id: "tipos", titulo: "Costo real por tipo", campos: camposTipos(true), tarjetas: true,
        sub: (c) => `Costo real ${pesos(c.costo) || "$ 0"}`,
        resumen: (c) => [...c.tipos.filter((x) => x.pres !== null || x.real !== null).map((x) => [x.tipo, `${pesos(x.real) || "$ 0"}${x.estado ? " · " + x.estado : ""}`]), ["Total costo real", pesos(c.costo) || "$ 0"], ["Estado del total", c.estadoT || "—"]] },
      { id: "rentab", titulo: "Rentabilidad", campos: [
        { k: "avance", label: "% de avance físico de la obra", tipo: T.pct, ph: "Ej. 40", mitad: true }, { k: "margenObjetivo", label: "Margen objetivo %", tipo: T.pct, ph: "Ej. 20", mitad: true },
        { k: "porTerminar", label: "Costo estimado por terminar", tipo: T.dinero }],
        sub: (c) => (c.margenProy === null ? "Utilidad a la fecha y proyectada" : `Margen proyectado ${pct(c.margenProy)}`),
        resumen: (c) => [["Utilidad a la fecha", pesos(c.utilFecha) || "—"], ["Margen a la fecha", pct(c.margenFecha) || "—"], ["Costo proyectado al cierre", pesos(c.costoProy) || "—"], ["Utilidad proyectada al cierre", pesos(c.utilProy) || "—"], ["Margen proyectado", pct(c.margenProy) || "—"], ["Estado de la rentabilidad", c.estado || "—"]] },
    ],
    traer: { texto: "📥 Traer de la app: contrato, adicionales aprobados, actas y costos por tipo", fn: (obraId, obra, d) => traerInforme(obraId, obra, d.corte) },
    cifras: (c) => [{ t: "Valor vigente", v: pesos(c.vigente) }, { t: "Costo real", v: pesos(c.costo) || "$ 0" },
      { t: "Utilidad a la fecha", v: pesos(c.utilFecha), color: c.utilFecha !== null && c.utilFecha < 0 ? "#B3401F" : "#1D6B3A" }, { t: "Margen a la fecha", v: pct(c.margenFecha) },
      { t: "Utilidad proyectada", v: pesos(c.utilProy), color: c.utilProy !== null && c.utilProy < 0 ? "#B3401F" : "#1D6B3A" }, { t: "Margen proyectado", v: pct(c.margenProy) },
      { t: "Estado", v: c.estado, color: c.estado === "ALERTA" ? "#B3401F" : c.estado === "VIGILAR" ? "#8A6D00" : "#1D6B3A" }],
    ayuda: "Semáforo de la rentabilidad: OK si el margen proyectado alcanza el objetivo; VIGILAR si hay utilidad pero menor al objetivo; ALERTA si no hay utilidad. Ingresos y costos deben estar en la misma base (ambos con IVA o ambos sin IVA).",
    firmas: FIRMAS_GERENCIA("Revisó — Gerencia"),
  },
  cierre: {
    id: "cierre", codigo: "RYR-CP-011", hoja: "Cierre Financiero", plantilla: "/plantilla-cierre.xlsx", archivo: "CierreFinanciero",
    titulo: "Cierre Financiero", subtitulo: "RYR-CP-011 · Resultado final, costo por unidad y saldos",
    spec: SPEC_CIERRE, celdas: () => CELDAS_CIERRE, descubrir: descubrirCierre, calc: calcCierre, fechaTraer: "corte",
    cabecera: [{ k: "corte", label: "Fecha de cierre", tipo: T.fecha, req: true }, { k: "responsable", label: "Responsable del cierre", ph: "Director de obra" }],
    secciones: [
      { id: "contrato", titulo: "Valor final del contrato", campos: [
        { k: "valorInicial", label: "Valor del contrato inicial", tipo: T.dinero, req: true }, { k: "adicionales", label: "Adicionales aprobados", tipo: T.dinero },
        { k: "deductivos", label: "Deductivos (menores cantidades)", tipo: T.dinero }, { k: "facturado", label: "Total facturado en actas", tipo: T.dinero }],
        sub: (c) => (c.valorFinal === null ? "Contrato, adicionales y facturado" : `Valor final ${pesos(c.valorFinal)}`),
        resumen: (c) => [["Valor final del contrato", pesos(c.valorFinal) || "—"], ["Saldo por facturar", pesos(c.saldoFact) || "—"]] },
      { id: "tipos", titulo: "Costo final por tipo", campos: camposTipos(false), tarjetas: false,
        sub: (c) => `Costo total ${pesos(c.costo) || "$ 0"}`, resumen: (c) => [["Costo total", pesos(c.costo) || "$ 0"]] },
      { id: "resultado", titulo: "Resultado y costo por unidad", campos: [
        { k: "utilidadPactada", label: "Utilidad pactada en el contrato (%)", tipo: T.pct, ph: "Ej. 10" },
        { k: "unidad", label: "Unidad de medida", tipo: T.chips, opciones: Object.values(UNIDADES_CIERRE) },
        { k: "cantidad", label: "Cantidad total ejecutada", tipo: T.num, ph: "Ej. 850" }],
        sub: (c) => (c.margen === null ? "Utilidad final y costo por unidad" : `Margen final ${pct(c.margen)}`),
        resumen: (c) => [["Utilidad final", pesos(c.utilidad) || "—"], ["Margen final", pct(c.margen) || "—"], ["Diferencia contra lo pactado", c.dif === null ? "—" : pct(c.dif)], ["Resultado", c.resultado || "—"], ["Costo por unidad", pesos(c.costoU) || "—"], ["Valor del contrato por unidad", pesos(c.valorU) || "—"], ["Utilidad por unidad", pesos(c.utilU) || "—"]] },
      { id: "liquidacion", titulo: "Liquidación y saldos", campos: [
        { k: "anticipoEntregado", label: "Anticipo entregado", tipo: T.dinero }, { k: "anticipoAmortizado", label: "Anticipo amortizado", tipo: T.dinero },
        { k: "retegarantia", label: "Retegarantía pendiente de devolución", tipo: T.dinero }, { k: "cuentasPorPagar", label: "Cuentas por pagar pendientes", tipo: T.dinero }],
        sub: (c) => (c.anticipoSin === null ? "Anticipo, retegarantía y cuentas por pagar" : `Anticipo sin amortizar ${pesos(c.anticipoSin)}`),
        resumen: (c) => [["Anticipo sin amortizar", pesos(c.anticipoSin) || "—"]] },
      { id: "observaciones", titulo: "Observaciones y lecciones aprendidas", campos: [{ k: "observaciones", label: "Observaciones y lecciones aprendidas", tipo: T.area, ph: "Qué salió bien, qué se debe mejorar, qué se repetiría en una obra parecida" }], sub: () => "Texto libre", resumen: () => [] },
    ],
    traer: { texto: "📥 Traer de la app: contrato, adicionales, actas, costos, anticipo y cuentas por pagar", fn: (obraId, obra, d) => traerCierre(obraId, obra, d.corte) },
    cifras: (c) => [{ t: "Valor final", v: pesos(c.valorFinal) }, { t: "Costo total", v: pesos(c.costo) || "$ 0" },
      { t: "Utilidad final", v: pesos(c.utilidad), color: c.utilidad !== null && c.utilidad < 0 ? "#B3401F" : "#1D6B3A" }, { t: "Margen final", v: pct(c.margen) },
      { t: "Costo por unidad", v: pesos(c.costoU) }, { t: "Resultado", v: c.resultado, color: c.resultado === "PÉRDIDA" ? "#B3401F" : c.resultado === "CUMPLE LO PACTADO" ? "#1D6B3A" : "#8A6D00" }],
    ayuda: "La utilidad pactada es la «U» del AIU del contrato. La unidad de medida depende del tipo de proyecto: m² en edificación, km en vías, ml en hidrocarburos.",
    firmas: FIRMAS_GERENCIA("Aprobó — Gerencia"),
  },
};
// Valores de partida de una ficha
export function fichaInicial(id) {
  const base = {};
  if (id === "cierre") base.unidad = UNIDADES_CIERRE[tipoProyectoActual()] || "";
  return base;
}

// ===================== Escritura en la hoja =====================
export function escribirFlujoEnHoja(ws, d, C) {
  const o = d.obra || {}, cab = d.cab || {};
  poner(ws, C.proyecto, o.proyecto); poner(ws, C.tipo, d.tipo); poner(ws, C.contrato, o.contrato); poner(ws, C.contratante, o.contratante);
  poner(ws, C.corte, fechaDDMMYYYY(cab.corte)); poner(ws, C.responsable, cab.responsable);
  const ms = ordenar(arr(d.meses).filter((m) => !mesFlujoVacio(m)));
  const T0 = (C.tablas || {}).meses;
  const filas = ms.map((m, i) => ({ mes: nombreMes(m.mes), ...(i === 0 ? { saldoIni: num(cab.saldoInicial) === null ? 0 : num(cab.saldoInicial) } : {}), ingProy: numero(m.ingProy), ingReal: numero(m.ingReal), egrProy: numero(m.egrProy), egrReal: numero(m.egrReal) }));
  if (!filas.length && T0) filas.push({ saldoIni: 0 });        // la primera casilla de «Saldo inicial» es una entrada: nunca se deja con la fórmula de arrastre
  escribirTabla(ws, T0, filas);
  if (T0 && T0.columnas) calcFlujo(cab.saldoInicial, ms).forEach((c, i) => { if (i < T0.n) pintar(ws, `${T0.columnas.estado}${T0.fila0 + i}`, c.estado); });
  const F = C.firmas || {}, fs = d.firmas || {};
  for (const k of ["elabora", "revisa"]) if (F[k]) { poner(ws, F[k].nombre, (fs[k] || {}).nombre); poner(ws, F[k].cargo, (fs[k] || {}).cargo); }
}

export function escribirFichaEnHoja(id, ws, d, C) {
  const F = FICHAS[id], o = d.obra || {}, v = d.datos || {}, c = F.calc(v);
  poner(ws, C.proyecto, o.proyecto); poner(ws, C.tipo, d.tipo); poner(ws, C.contrato, o.contrato); poner(ws, C.contratante, o.contratante);
  poner(ws, C.corte, fechaDDMMYYYY(v.corte)); poner(ws, C.responsable, v.responsable);
  const dinero = (k) => { if (num(v[k]) !== null) poner(ws, C[k], num(v[k])); };
  const porc = (k) => { if (num(v[k]) !== null) poner(ws, C[k], num(v[k]) / 100); };
  const T0 = (C.tablas || {}).tipos;
  if (id === "costos") {
    ["valorInicial", "adicionales", "facturado", "porTerminar"].forEach(dinero); ["avance", "margenObjetivo"].forEach(porc);
    escribirTabla(ws, T0, TIPOS_COSTO.map((t, i) => ({ pres: numero(v[`pres${i}`]), real: numero(v[`real${i}`]) })));
    if (T0 && T0.columnas.estado) { c.tipos.forEach((x, i) => pintar(ws, `${T0.columnas.estado}${T0.fila0 + i}`, x.estado)); pintar(ws, `${T0.columnas.estado}${T0.fila0 + T0.n}`, c.estadoT); }
    pintar(ws, C.estado, c.estado);
  } else {
    ["valorInicial", "adicionales", "deductivos", "facturado", "cantidad", "anticipoEntregado", "anticipoAmortizado", "retegarantia", "cuentasPorPagar"].forEach(dinero);
    porc("utilidadPactada");
    poner(ws, C.unidad, v.unidad);
    escribirTabla(ws, T0, TIPOS_COSTO.map((t, i) => ({ real: numero(v[`real${i}`]) })));
    pintar(ws, C.resultado, c.resultado);
    if (texto(v.observaciones)) { poner(ws, C.observaciones, texto(v.observaciones)); }
  }
  const FI = C.firmas || {}, fs = d.firmas || {};
  for (const k of ["elabora", "revisa"]) if (FI[k]) { poner(ws, FI[k].nombre, (fs[k] || {}).nombre); poner(ws, FI[k].cargo, (fs[k] || {}).cargo); }
}

// ===================== Validación =====================
export function faltantes3(id, d) {
  const f = [], o = d.obra || {};
  if (!texto(o.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos", texto: "la obra" });
  if (id === "flujo") {
    const F = FORMATOS3.flujo, cab = d.cab || {};
    F.cabecera.forEach((c) => { if (c.req && !texto(cab[c.k])) f.push({ etiqueta: c.label, seccion: "datos", texto: c.label.toLowerCase() }); });
    const xs = arr(d.meses), con = xs.filter((m) => !mesFlujoVacio(m));
    if (!con.length) f.push({ etiqueta: "Mes o periodo", indice: 0, seccion: "meses", texto: "al menos un mes" });
    else xs.forEach((m, i) => { if (!mesFlujoVacio(m) && !texto(m.mes)) f.push({ etiqueta: "Mes o periodo", indice: i, seccion: "meses", texto: "el mes de cada fila" }); });
    if (!texto(((d.firmas || {}).elabora || {}).nombre)) f.push({ etiqueta: F.firmas[0].n, seccion: "firmas", texto: "quien elabora" });
    return f;
  }
  const F = FICHAS[id], v = d.datos || {};
  F.cabecera.forEach((c) => { if (c.req && !texto(v[c.k])) f.push({ etiqueta: c.label, seccion: "datos", texto: c.label.toLowerCase() }); });
  F.secciones.forEach((s) => s.campos.filter((c) => c.req).forEach((c) => { if (num(v[c.k]) === null) f.push({ etiqueta: c.label, seccion: s.id, texto: c.label.toLowerCase() }); }));
  if (!texto(((d.firmas || {}).elabora || {}).nombre)) f.push({ etiqueta: F.firmas[0].n, seccion: "firmas", texto: "quien elabora" });
  return f;
}
export const validar3 = (id, d) => [...new Set(faltantes3(id, d).map((x) => x.texto))];
