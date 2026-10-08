// Manifiesto de Transporte de RCD (RYR-AM-003): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_MANIFIESTO = "RYR-AM-003";
export const HOJA_MANIFIESTO = "Manifiesto RCD";
// Cargos de quienes reciben los residuos en el sitio de disposición o planta de aprovechamiento
export const CARGOS_RECIBE_RCD = ["Encargado de báscula", "Operador de báscula", "Controlador de ingreso", "Operador de planta de aprovechamiento", "Supervisor de escombrera", "Jefe de planta", "Administrador del sitio de disposición",
  "Auxiliar de recibo de material", "Inspector ambiental del sitio", "Coordinador ambiental del sitio"];
export const CLASES_RCD = ["Tierra y material de excavación", "Concreto y mezclas", "Ladrillo, bloque y cerámica", "Arena, grava y agregados", "Asfalto y material de fresado", "Madera", "Metales (hierro, acero, aluminio)", "Vidrio",
  "Plástico", "Cartón y papel", "Yeso, drywall y cielo raso", "Cables, tuberías y accesorios", "Tierra o material contaminado", "Asbesto-cemento (fibrocemento)", "Mezclado / sin clasificar", "Otro"];
export const DESTINOS_RCD = ["Disposición final en sitio autorizado", "Aprovechamiento (planta de reciclaje de RCD)", "Reutilización en otra obra", "Relleno o adecuación de terreno autorizado"];

export const SPEC_MANIFIESTO = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["numero", "Manifiesto N°", "H", "J"], ["contratista", "Contratista / Empresa", "A", "C"], ["fecha", "Fecha", "H", "J"],
    ["ubicacion", "Ubicación de la obra", "A", "C"], ["respObra", "Responsable en obra", "H", "J"],
    ["transportadora", "Empresa transportadora", "A", "C"], ["nit", "NIT", "H", "J"], ["conductor", "Conductor", "A", "C"], ["cedula", "Cédula", "H", "J"],
    ["placa", "Placa del vehículo", "A", "C"], ["capacidad", "Capacidad (m³)", "E", "G"], ["autorizacionT", "N° de autorización", "I", "K"],
    ["cantidad", "Cantidad total", "A", "C"], ["unidad", "Unidad", "E", "G"], ["nViajes", "N° de viajes", "I", "K"],
    ["sitio", "Nombre del sitio o planta", "A", "C"], ["municipio", "Municipio", "H", "J"], ["autAmbiental", "N° de autorización ambiental", "A", "C"], ["certificado", "N° de certificado", "H", "J"],
    ["destino", "Destino", "A", "C"], ["fechaCert", "Fecha del certificado", "H", "J"],
  ],
  opciones: [{ clave: "clases", desde: "3. RESIDUO ENTREGADO", hasta: "Cantidad total" }],
  tablas: [
    { clave: "viajes", cabecera: "No.", fin: "Total de viajes y volumen", finEmpieza: true, columnas: { salida: "B", placa: "C", conductor: "D", volumen: "F", vale: "G", llegada: "H", obs: "I" },
      encabezados: { salida: "Hora de salida", placa: "Placa", conductor: "Conductor", volumen: "Volumen (m³)", vale: "N° de vale o tiquete", llegada: "Hora de llegada", obs: "Observaciones" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "generador", col: "C" }, { clave: "transportador", col: "G" }, { clave: "recibe", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MANIFIESTO = {"proyecto":"C11","numero":"J11","contratista":"C12","fecha":"J12","ubicacion":"C13","respObra":"J13","transportadora":"C15","nit":"J15","conductor":"C16","cedula":"J16","placa":"C17","capacidad":"G17","autorizacionT":"K17","cantidad":"C23","unidad":"G23","nViajes":"K23","sitio":"C36","municipio":"J36","autAmbiental":"C37","certificado":"J37","destino":"C38","fechaCert":"J38","tablas":{"viajes":{"fila0":26,"n":8,"columnas":{"salida":"B","placa":"C","conductor":"D","volumen":"F","vale":"G","llegada":"H","obs":"I"}}},"opciones":{"clases":[{"ref":"A19","texto":"Tierra y material de excavación"},{"ref":"D19","texto":"Concreto y mezclas"},{"ref":"G19","texto":"Ladrillo, bloque y cerámica"},{"ref":"J19","texto":"Arena, grava y agregados"},{"ref":"A20","texto":"Asfalto y material de fresado"},{"ref":"D20","texto":"Madera"},{"ref":"G20","texto":"Metales (hierro, acero, aluminio)"},{"ref":"J20","texto":"Vidrio"},{"ref":"A21","texto":"Plástico"},{"ref":"D21","texto":"Cartón y papel"},{"ref":"G21","texto":"Yeso, drywall y cielo raso"},{"ref":"J21","texto":"Cables, tuberías y accesorios"},{"ref":"A22","texto":"Tierra o material contaminado"},{"ref":"D22","texto":"Asbesto-cemento (fibrocemento)"},{"ref":"G22","texto":"Mezclado / sin clasificar"},{"ref":"J22","texto":"Otro"}]},"firmas":{"generador":{"nombre":"C42","cargo":"C43"},"transportador":{"nombre":"G42","cargo":"G43"},"recibe":{"nombre":"K42","cargo":"K43"}}};
export const descubrirManifiesto = (ws) => descubrirPorEtiquetas(ws, SPEC_MANIFIESTO);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const numeroDe = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const viajeNuevo = (base = {}) => ({ salida: "", placa: "", conductor: "", volumen: "", vale: "", llegada: "", obs: "", ...base });
const viajeVacio = (v) => !(v.salida || v.placa || v.conductor || texto(v.volumen) || v.vale || v.llegada || v.obs);
export const viajesConDatos = (d) => arr(d.viajes).filter((v) => !viajeVacio(v));
const redondear = (n) => Math.round(n * 1000) / 1000;
export const sumaVolumen = (d) => redondear(viajesConDatos(d).reduce((s, v) => s + (numeroDe(v.volumen) || 0), 0));
// Cantidad total: la que el usuario escribe o, si no escribe nada, la suma de los viajes
export const cantidadTotal = (d) => { const m = numeroDe(d.cantidad); return m !== null && texto(d.cantidad) !== "" ? m : sumaVolumen(d) || null; };

export function escribirManifiestoEnHoja(ws, d, celdas = CELDAS_MANIFIESTO) {
  const C = celdas;
  for (const k of ["proyecto", "numero", "contratista", "ubicacion", "respObra", "transportadora", "nit", "conductor", "cedula", "placa", "autorizacionT", "unidad", "sitio", "municipio", "autAmbiental", "certificado", "destino"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha)); poner(ws, C.fechaCert, fechaDDMMYYYY(d.fechaCert));
  poner(ws, C.capacidad, numeroDe(d.capacidad) === null ? d.capacidad : numeroDe(d.capacidad));
  const c = cantidadTotal(d); poner(ws, C.cantidad, c === null ? "" : c);
  const vs = viajesConDatos(d); poner(ws, C.nViajes, vs.length || "");
  const noMarcadas = marcarOpciones(ws, (C.opciones || {}).clases, arr(d.clases), {});
  escribirTabla(ws, (C.tablas || {}).viajes, vs.map((v) => ({ ...v, volumen: numeroDe(v.volumen) === null ? "" : numeroDe(v.volumen) })));
  const F = C.firmas || {};
  if (F.generador) { poner(ws, F.generador.nombre, d.respObra); poner(ws, F.generador.cargo, d.respCargo); }
  if (F.transportador) { poner(ws, F.transportador.nombre, d.conductor); poner(ws, F.transportador.cargo, d.cedula); }
  if (F.recibe) { poner(ws, F.recibe.nombre, d.recibeNombre); poner(ws, F.recibe.cargo, d.recibeCargo); }
  return noMarcadas;
}

export function validarManifiesto(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.respObra)) f.push("el responsable en obra");
  if (!texto(d.transportadora)) f.push("la empresa transportadora");
  if (!texto(d.conductor)) f.push("el conductor");
  if (!texto(d.placa)) f.push("la placa del vehículo");
  if (!arr(d.clases).length) f.push("al menos una clase de residuo entregado");
  const vs = viajesConDatos(d);
  if (vs.some((v) => !(numeroDe(v.volumen) > 0))) f.push("el volumen (mayor que 0) de cada viaje");
  if (!(cantidadTotal(d) > 0)) f.push("la cantidad total (o los viajes con su volumen)");
  if (!texto(d.sitio)) f.push("el sitio de disposición o aprovechamiento");
  return f;
}
// Qué casilla exacta falta (para marcarla en rojo). Mismo orden que validarManifiesto().
export function camposFaltantesManifiesto(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "obra" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "obra" });
  if (!texto(d.respObra)) f.push({ etiqueta: "Responsable en obra (nombre)", seccion: "obra" });
  if (!texto(d.transportadora)) f.push({ etiqueta: "Empresa transportadora", seccion: "transportador" });
  if (!texto(d.conductor)) f.push({ etiqueta: "Conductor", seccion: "transportador" });
  if (!texto(d.placa)) f.push({ etiqueta: "Placa del vehículo", seccion: "transportador" });
  if (!arr(d.clases).length) f.push({ etiqueta: "Clase de residuo", seccion: "residuo" });
  const todos = arr(d.viajes); const vs = viajesConDatos(d);
  todos.forEach((v, i) => { if (vs.includes(v) && !(numeroDe(v.volumen) > 0)) f.push({ etiqueta: "Volumen (m³)", indice: i, seccion: "viajes" }); });
  if (!(cantidadTotal(d) > 0)) f.push({ etiqueta: "Cantidad total", seccion: "residuo" });
  if (!texto(d.sitio)) f.push({ etiqueta: "Nombre del sitio o planta", seccion: "sitio" });
  return f;
}

export function resumenManifiesto(d) {
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${texto(d.numero)}`, formato: "manifiesto-rcd", proyecto: texto(d.proyecto), numero: texto(d.numero), fecha: d.fecha || "",
    descripcion: arr(d.clases).join(", "), clases: arr(d.clases), cantidad: cantidadTotal(d) || 0, unidad: texto(d.unidad) || "m³", viajes: viajesConDatos(d).length,
    transportador: texto(d.transportadora), placa: texto(d.placa), sitio: texto(d.sitio), municipio: texto(d.municipio), certificado: texto(d.certificado),
  };
}
