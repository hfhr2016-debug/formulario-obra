// Control de Hidrocarburos (RYR-AM-015): suministro diario de combustibles y lubricantes y balance del tanque. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";
import { horaComoFraccion } from "./capacitacionAmbDatos";

export const CODIGO_HIDROCARBUROS = "RYR-AM-015";
export const HOJA_HIDROCARBUROS = "Control Hidrocarburos";
export const PRODUCTOS_HC = ["Diésel (ACPM)", "Gasolina", "Aceite de motor", "Aceite hidráulico", "Grasa", "Otro"];
export const VERIFICACIONES_HC = [
  "Se suministró sobre piso protegido o con bandeja", "Kit antiderrames disponible y completo", "Sin derrames ni goteos en la zona", "Tanque o cancha con contención en buen estado",
  "Zona señalizada, sin fuentes de ignición", "Extintor vigente y a la mano", "Entradas y salidas registradas en este formato", "Se presentó un derrame (diligenciar el Incidente Ambiental)",
];
export const TEXTO_DERRAME = VERIFICACIONES_HC[VERIFICACIONES_HC.length - 1];

export const SPEC_HIDROCARBUROS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["tanque", "Tanque o punto de suministro", "E", "G"], ["capacidad", "Capacidad (gal)", "I", "K"],
    ["responsable", "Responsable del suministro", "A", "C"], ["proveedor", "Proveedor", "H", "J"],
    ["saldoInicial", "Saldo inicial (gal)", "A", "C"], ["recibido", "Recibido hoy (gal)", "E", "G"], ["saldoMedido", "Saldo medido (gal)", "E", "G"],
    ["observaciones", "Observaciones", "A", "C"],
  ],
  tablas: [
    { clave: "suministros", cabecera: "No.", fin: "Total suministrado en el día", finEmpieza: true,
      columnas: { hora: "B", equipo: "C", producto: "E", cantidad: "G", horometro: "H", recibio: "I", obs: "K" },
      encabezados: { hora: "Hora", equipo: "Equipo o vehículo (placa o código)", producto: "Producto", cantidad: "Cantidad (gal)", horometro: "Horómetro o km", recibio: "Recibió (operador)", obs: "Observación" } },
  ],
  opciones: [{ clave: "verificaciones", desde: "4. VERIFICACIÓN DE LA ZONA", hasta: "Observaciones" }],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "5. FIRMAS", personas: [{ clave: "suministro", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_HIDROCARBUROS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","tanque":"G13","capacidad":"K13","responsable":"C14","proveedor":"J14","saldoInicial":"C33","recibido":"G33","saldoMedido":"G34","observaciones":"C41","tablas":{"suministros":{"fila0":17,"n":14,"columnas":{"hora":"B","equipo":"C","producto":"E","cantidad":"G","horometro":"H","recibio":"I","obs":"K"}}},"opciones":{"verificaciones":[{"ref":"A37","texto":"Se suministró sobre piso protegido o con bandeja"},{"ref":"G37","texto":"Kit antiderrames disponible y completo"},{"ref":"A38","texto":"Sin derrames ni goteos en la zona"},{"ref":"G38","texto":"Tanque o cancha con contención en buen estado"},{"ref":"A39","texto":"Zona señalizada, sin fuentes de ignición"},{"ref":"G39","texto":"Extintor vigente y a la mano"},{"ref":"A40","texto":"Entradas y salidas registradas en este formato"},{"ref":"G40","texto":"Se presentó un derrame (diligenciar el Incidente Ambiental)"}]},"firmas":{"suministro":{"nombre":"C45","cargo":"C46"},"reviso":{"nombre":"I45","cargo":"I46"}}};
export const descubrirHidrocarburos = (ws) => descubrirPorEtiquetas(ws, SPEC_HIDROCARBUROS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const suministroNuevo = (b = {}) => ({ hora: "", equipo: "", producto: "", cantidad: "", horometro: "", recibio: "", obs: "", ...b });
export const suministroVacio = (s) => !(s && (texto(s.hora) || texto(s.equipo) || texto(s.producto) || texto(s.cantidad) || texto(s.horometro) || texto(s.recibio) || texto(s.obs)));
export const suministrosConDatos = (d) => arr(d.suministros).filter((s) => !suministroVacio(s));

// ---------- Balance (las mismas fórmulas del Excel) ----------
export const totalSuministrado = (d) => suministrosConDatos(d).reduce((t, s) => t + (num(s.cantidad) || 0), 0);
export function balanceTanque(d) {
  const ini = num(d.saldoInicial), rec = num(d.recibido) || 0, med = num(d.saldoMedido);
  const despachado = totalSuministrado(d);
  const teorico = ini === null ? null : ini + rec - despachado;
  const diferencia = teorico === null || med === null ? null : med - teorico;
  return { despachado, teorico, diferencia };
}
export const huboDerrame = (d) => arr(d.verificaciones).includes(TEXTO_DERRAME);

export function escribirHidrocarburosEnHoja(ws, d, celdas = CELDAS_HIDROCARBUROS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "tanque", "responsable", "proveedor", "observaciones"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  for (const k of ["capacidad", "saldoInicial", "recibido", "saldoMedido"]) poner(ws, C[k], num(d[k]) === null ? d[k] : num(d[k]));
  const T = C.tablas || {};
  // La hora va como fracción del día (la celda tiene formato de hora)
  escribirTabla(ws, T.suministros, suministrosConDatos(d).map((s) => { const h = horaComoFraccion(s.hora); return { ...s, hora: h === null ? s.hora : h, cantidad: num(s.cantidad) === null ? s.cantidad : num(s.cantidad), horometro: num(s.horometro) === null ? s.horometro : num(s.horometro) }; }));
  const noMarcadas = marcarOpciones(ws, (C.opciones || {}).verificaciones, arr(d.verificaciones), {});
  const F = C.firmas || {};
  if (F.suministro) { poner(ws, F.suministro.nombre, d.responsable); poner(ws, F.suministro.cargo, d.responsableCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  return noMarcadas;
}

export function validarHidrocarburos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.tanque)) f.push("el tanque o punto de suministro");
  if (!texto(d.responsable)) f.push("el responsable del suministro");
  const ss = suministrosConDatos(d);
  if (!ss.length) f.push("al menos un suministro del día");
  else {
    if (ss.some((s) => !texto(s.equipo))) f.push("el equipo o vehículo de cada suministro");
    if (ss.some((s) => num(s.cantidad) === null)) f.push("la cantidad (en galones) de cada suministro");
  }
  return f;
}
export function camposFaltantesHidrocarburos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.tanque)) f.push({ etiqueta: "Tanque o punto de suministro", seccion: "datos" });
  if (!texto(d.responsable)) f.push({ etiqueta: "Nombre del responsable del suministro", seccion: "datos" });
  const todos = arr(d.suministros);
  if (!suministrosConDatos(d).length) f.push({ etiqueta: "Equipo o vehículo", indice: 0, seccion: "suministros" });
  else todos.forEach((s, i) => {
    if (suministroVacio(s)) return;
    if (!texto(s.equipo)) f.push({ etiqueta: "Equipo o vehículo", indice: i, seccion: "suministros" });
    if (num(s.cantidad) === null) f.push({ etiqueta: "Cantidad (gal)", indice: i, seccion: "suministros" });
  });
  return f;
}

export function resumenHidrocarburos(d) {
  const b = balanceTanque(d);
  const porProducto = {};
  suministrosConDatos(d).forEach((s) => { const p = s.producto || "Sin producto"; porProducto[p] = (porProducto[p] || 0) + (num(s.cantidad) || 0); });
  return { id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.tanque).toLowerCase()}`, formato: "hidrocarburos", proyecto: texto(d.proyecto), fecha: d.fecha, tanque: texto(d.tanque),
    suministros: suministrosConDatos(d).length, galones: b.despachado, porProducto, diferencia: b.diferencia, derrame: huboDerrame(d) };
}
