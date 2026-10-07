// Registro de entrega de EPP (RYR-SS-006): datos y lógica propios de este formato. Lo común está en sstBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";

export const CODIGO_EPP = "RYR-SS-006";
export const TIPOS_ENTREGA = ["Dotación inicial", "Reposición", "Entrega a visitante", "Entrega mixta"];
export const MOTIVOS_EPP = ["Dotación inicial", "Reposición por desgaste", "Reposición por daño o pérdida", "Cambio de talla", "Reposición por vencimiento"];

// Elementos de protección personal frecuentes en obra (se suman los que el usuario escriba y se recuerdan en el dispositivo)
export const EPP_CATALOGO = [
  "Casco de seguridad", "Gafas de seguridad", "Careta / protector facial", "Guantes de seguridad", "Guantes dieléctricos", "Botas de seguridad", "Botas de caucho",
  "Arnés de seguridad", "Eslinga / línea de vida", "Protector auditivo (tipo copa)", "Protector auditivo (inserción)", "Respirador / mascarilla", "Filtros para respirador",
  "Chaleco reflectivo", "Overol / ropa de trabajo", "Impermeable", "Protector solar", "Rodilleras", "Delantal de cuero", "Mangas de protección", "Capucha / cubrenuca",
];
// "Kit básico" de dotación inicial: se agrega con un toque a un trabajador
export const KIT_BASICO = ["Casco de seguridad", "Gafas de seguridad", "Guantes de seguridad", "Botas de seguridad", "Chaleco reflectivo", "Protector auditivo (tipo copa)"];
export const TALLAS = ["Única", "XS", "S", "M", "L", "XL", "XXL", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

// Cómo se reconoce cada dato en la plantilla: [clave, etiqueta, columna de la etiqueta, columna del valor, buscar después de…, filas debajo]
export const SPEC_EPP = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"],
    ["contratista", "Contratista / Empresa", "G", "H"],
    ["ubicacion", "Ubicación", "A", "C"],
    ["entregaNombre", "Entrega a cargo de", "G", "H"],
    ["entregaCargo", "Cargo", "K", "L", "entregaNombre"],
    ["tipoEntrega", "Tipo de entrega", "A", "C"],
    ["hoja", "Hoja N°", "G", "H"],
  ],
  tabla: { clave: "entregas", cabecera: "No.", fin: "Total de elementos entregados",
    columnas: { fecha: "B", nombre: "C", documento: "D", cargo: "E", epp: "F", referencia: "G", cantidad: "H", talla: "I", motivo: "J", reposicion: "K" } },
  firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "entrega", col: "C" }, { clave: "vobo", col: "I" }] },
};

// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_EPP = {"proyecto":"C11","contratista":"H11","ubicacion":"C12","entregaNombre":"H12","entregaCargo":"L12","tipoEntrega":"C13","hoja":"H13","tablas":{"entregas":{"fila0":16,"n":16,"columnas":{"fecha":"B","nombre":"C","documento":"D","cargo":"E","epp":"F","referencia":"G","cantidad":"H","talla":"I","motivo":"J","reposicion":"K"}}},"firmas":{"entrega":{"nombre":"C39","cargo":"C40"},"vobo":{"nombre":"I39","cargo":"I40"}}};

export const descubrirEpp = (ws) => descubrirPorEtiquetas(ws, SPEC_EPP);

const numero = (v) => (v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : null);
const esFechaISO = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || ""));
const lineaVacia = (l) => !(l.nombre || l.epp || l.documento || l.cargo || l.referencia || l.talla);

// La fecha de una línea es la suya o, si no tiene, la de la entrega
export const fechaDeLinea = (l, d) => l.fecha || d.fechaEntrega || "";

// Las líneas que realmente se escriben en el Excel (se descartan las que están totalmente vacías)
export const lineasConDatos = (d) => (d.lineas || []).filter((l) => !lineaVacia(l));

export function escribirEppEnHoja(ws, d, celdas = CELDAS_EPP) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "entregaNombre", "entregaCargo", "tipoEntrega", "hoja"]) poner(ws, C[k], d[k]);
  const filas = lineasConDatos(d).map((l) => ({
    fecha: fechaDDMMYYYY(fechaDeLinea(l, d)), nombre: l.nombre, documento: l.documento, cargo: l.cargo, epp: l.epp, referencia: l.referencia,
    cantidad: numero(l.cantidad) === null ? "" : numero(l.cantidad), talla: l.talla, motivo: l.motivo, reposicion: esFechaISO(l.reposicion) ? fechaDDMMYYYY(l.reposicion) : l.reposicion,
  }));
  escribirTabla(ws, C.tablas && C.tablas.entregas, filas);
  const F = C.firmas || {};
  if (F.entrega) { poner(ws, F.entrega.nombre, d.entregaNombre); poner(ws, F.entrega.cargo, d.entregaCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarEpp(d) {
  const faltan = [];
  const lineas = lineasConDatos(d);
  if (!d.entregaNombre || !d.entregaNombre.trim()) faltan.push("quién hace la entrega");
  if (!lineas.length) { faltan.push("al menos una línea de entrega"); return faltan; }
  if (lineas.some((l) => !fechaDeLinea(l, d))) faltan.push("la fecha de la entrega");
  if (lineas.some((l) => !l.nombre || !l.nombre.trim())) faltan.push("el nombre del trabajador en cada línea");
  if (lineas.some((l) => !l.epp || !l.epp.trim())) faltan.push("el EPP entregado en cada línea");
  if (lineas.some((l) => !(numero(l.cantidad) > 0))) faltan.push("la cantidad (mayor que 0) en cada línea");
  return faltan;
}

// Resumen que se guarda en el dispositivo (para los informes)
export function resumenEntregaEpp(d) {
  const lineas = lineasConDatos(d);
  const fechas = lineas.map((l) => fechaDeLinea(l, d)).filter(Boolean).sort();
  return {
    id: `${fechas[0] || "sin-fecha"}_${d.hoja || ""}_${lineas.length}`, formato: "entrega-epp", fecha: fechas[0] || "", proyecto: d.proyecto, hoja: d.hoja,
    lineas: lineas.length, unidades: lineas.reduce((s, l) => s + (numero(l.cantidad) || 0), 0),
    trabajadores: new Set(lineas.map((l) => (l.nombre || "").trim().toLowerCase())).size,
  };
}

// "1" -> "2", "1 de 3" -> "2 de 3", "" -> ""
export function siguienteHoja(hoja) {
  const m = /^(\s*)(\d+)(.*)$/.exec(String(hoja || ""));
  return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : "";
}


// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarEpp().
// "esCompacta(i)": las líneas del mismo trabajador que la anterior no muestran su nombre; el índice de la casilla es el de las que sí lo muestran.
export function camposFaltantesEpp(d, esCompacta = () => false) {
  const f = [];
  if (!d.entregaNombre || !d.entregaNombre.trim()) f.push({ etiqueta: "Entrega a cargo de (nombre)", seccion: "general" });
  const todas = d.lineas || [];
  const lineas = lineasConDatos(d);
  if (!lineas.length) { f.push({ etiqueta: "Nombre del trabajador", indice: 0, seccion: "lineas" }); return f; }
  if (lineas.some((l) => !fechaDeLinea(l, d))) f.push({ etiqueta: "Fecha de la entrega", seccion: "general" });
  todas.forEach((l, i) => {
    if (!lineas.includes(l)) return;
    if (!l.nombre || !l.nombre.trim()) f.push({ etiqueta: "Nombre del trabajador", indice: todas.slice(0, i).filter((_, k) => !esCompacta(k)).length, seccion: "lineas" });
    if (!l.epp || !l.epp.trim()) f.push({ etiqueta: "EPP o elemento entregado", indice: i, seccion: "lineas" });
    if (!(numero(l.cantidad) > 0)) f.push({ etiqueta: "Cant.", indice: i, seccion: "lineas" });
  });
  return f;
}
