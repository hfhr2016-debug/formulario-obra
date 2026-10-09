// Adicionales, Obra no Prevista y Mayores Cantidades (RYR-CP-003). Lo común está en sstBase.js y cpBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY } from "./sstBase";
import { num, texto, adicionalVacio, cantidadConSigno, totalesAdicionales } from "./cpBase";

export const CODIGO_ADICIONALES = "RYR-CP-003";
export const HOJA_ADICIONALES = "Adicionales y Obra no Prevista";
export const CAPACIDAD_ADICIONALES = 16;

export const SPEC_ADICIONALES = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "I", "L"],
    ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "I", "L"],
    ["fechaContrato", "Fecha del contrato", "A", "D"], ["plazo", "Plazo del contrato (días)", "I", "L"],
    ["valorOriginal", "Valor del contrato original", "A", "F"],
  ],
  tablas: [
    { clave: "items", cabecera: "No.", fin: "TOTAL DE ÍTEMS REGISTRADOS", finEmpieza: true,
      columnas: { fecha: "B", descripcion: "C", tipo: "D", capitulo: "E", unidad: "F", cantidad: "G", valorUnitario: "H", aiu: "J", justificacion: "L", solicita: "M", aprueba: "N", fechaAprobacion: "O", estado: "P" },
      encabezados: { fecha: "Fecha", descripcion: "Descripción del ítem", tipo: "Tipo", capitulo: "Capítulo afectado", unidad: "Unidad", cantidad: "Cantidad", valorUnitario: "Valor unitario", aiu: "AIU %",
        justificacion: "Justificación", solicita: "Solicitado por", aprueba: "Aprobado por", fechaAprobacion: "Fecha de aprobación", estado: "Estado" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "registro", col: "D" }, { clave: "aprueba", col: "L" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_ADICIONALES = {"proyecto":"D10","tipo":"L10","contrato":"D11","contratante":"L11","fechaContrato":"D12","plazo":"L12","valorOriginal":"F37","tablas":{"items":{"fila0":15,"n":16,"columnas":{"fecha":"B","descripcion":"C","tipo":"D","capitulo":"E","unidad":"F","cantidad":"G","valorUnitario":"H","aiu":"J","justificacion":"L","solicita":"M","aprueba":"N","fechaAprobacion":"O","estado":"P"}}},"firmas":{"registro":{"nombre":"D44","cargo":"D45"},"aprueba":{"nombre":"L44","cargo":"L45"}}};
export const descubrirAdicionales = (ws) => descubrirPorEtiquetas(ws, SPEC_ADICIONALES);

const arr = (a) => (Array.isArray(a) ? a : []);
export const adicionalesConDatos = (lista) => arr(lista).filter((a) => !adicionalVacio(a));

export function escribirAdicionalesEnHoja(ws, d, celdas = CELDAS_ADICIONALES) {
  const C = celdas;
  for (const k of ["proyecto", "tipo", "contrato", "contratante", "plazo"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaContrato, fechaDDMMYYYY(d.fechaContrato));
  if (num(d.valorOriginal) !== null) poner(ws, C.valorOriginal, num(d.valorOriginal));
  const n = (v) => (num(v) === null ? v : num(v));
  const filas = adicionalesConDatos(d.items).map((a) => ({
    fecha: fechaDDMMYYYY(a.fecha), descripcion: a.descripcion, tipo: a.tipo, capitulo: a.capitulo, unidad: a.unidad,
    cantidad: cantidadConSigno(a) === null ? a.cantidad : cantidadConSigno(a),            // un deductivo (menos obra) va con cantidad negativa
    valorUnitario: n(a.valorUnitario), aiu: num(a.aiu) === null ? "" : num(a.aiu) / 100,   // la plantilla da formato de porcentaje: 25 -> 0,25
    justificacion: a.justificacion, solicita: a.solicita, aprueba: a.aprueba, fechaAprobacion: fechaDDMMYYYY(a.fechaAprobacion), estado: a.estado,
  }));
  escribirTabla(ws, (C.tablas || {}).items, filas);     // valor directo, valor con AIU, totales y efecto en el contrato son fórmulas
  const F = C.firmas || {};
  if (F.registro) { poner(ws, F.registro.nombre, d.registroNombre); poner(ws, F.registro.cargo, d.registroCargo); }
  if (F.aprueba) { poner(ws, F.aprueba.nombre, d.apruebaNombre); poner(ws, F.aprueba.cargo, d.apruebaCargo); }
}

export function validarAdicionales(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("la obra");
  const xs = adicionalesConDatos(d.items);
  if (!xs.length) f.push("al menos un ítem adicional");
  else {
    if (xs.some((x) => !x.fecha)) f.push("la fecha de cada ítem");
    if (xs.some((x) => !texto(x.descripcion))) f.push("la descripción de cada ítem");
    if (xs.some((x) => !texto(x.tipo))) f.push("el tipo de cada ítem");
    if (xs.some((x) => !texto(x.capitulo))) f.push("el capítulo afectado de cada ítem");
    if (xs.some((x) => num(x.cantidad) === null || num(x.valorUnitario) === null)) f.push("la cantidad y el valor unitario de cada ítem");
    if (xs.some((x) => x.estado === "Aprobado" && !texto(x.aprueba))) f.push("quién aprobó cada ítem aprobado");
  }
  if (!texto(d.registroNombre)) f.push("quien registra");
  return f;
}
export function camposFaltantesAdicionales(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  const xs = arr(d.items);
  if (!adicionalesConDatos(xs).length) f.push({ etiqueta: "Descripción del ítem", indice: 0, seccion: "items" });
  else xs.forEach((x, i) => {
    if (adicionalVacio(x)) return;
    if (!x.fecha) f.push({ etiqueta: "Fecha", indice: i, seccion: "items" });
    if (!texto(x.descripcion)) f.push({ etiqueta: "Descripción del ítem", indice: i, seccion: "items" });
    if (!texto(x.tipo)) f.push({ etiqueta: "Tipo", indice: i, seccion: "items" });
    if (!texto(x.capitulo)) f.push({ etiqueta: "Capítulo afectado", indice: i, seccion: "items" });
    if (num(x.cantidad) === null) f.push({ etiqueta: "Cantidad", indice: i, seccion: "items" });
    if (num(x.valorUnitario) === null) f.push({ etiqueta: "Valor unitario", indice: i, seccion: "items" });
    if (x.estado === "Aprobado" && !texto(x.aprueba)) f.push({ etiqueta: "Aprobado por", indice: i, seccion: "items" });
  });
  if (!texto(d.registroNombre)) f.push({ etiqueta: "Nombre de quien registra", seccion: "firmas" });
  return f;
}
export function resumenAdicionales(lista) {
  const t = totalesAdicionales(adicionalesConDatos(lista));
  return { items: adicionalesConDatos(lista).length, ...t };
}
