// Inspección Ambiental de Maquinaria y Equipos (RYR-AM-008). Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY } from "./sstBase";
import { contarRespuestas } from "./ambBase";

export const CODIGO_MAQUINARIA = "RYR-AM-008";
export const HOJA_MAQUINARIA = "Inspección Maquinaria";
export const TIPOS_EQUIPO = ["Retroexcavadora", "Excavadora", "Minicargador", "Volqueta", "Camión", "Compactador / vibrocompactador", "Mezcladora", "Planta eléctrica", "Compresor", "Grúa", "Bomba de concreto", "Otro"];
export const PROPIETARIOS = ["Propio", "Alquilado", "Del subcontratista"];
export const COMBUSTIBLES = ["Diésel", "Gasolina", "Gas", "Eléctrico"];
export const RESULTADOS = ["Apto para operar", "Apto con observaciones", "No apto: retirar de la operación"];
export const ITEMS_MAQUINARIA = [
  "Sin fugas de aceite, combustible ni líquido hidráulico", "Mantenimiento preventivo al día (hoja de vida o registro)", "Revisión técnico-mecánica y de gases vigente (si aplica)",
  "Silenciador y encerramientos en buen estado", "Sin humo negro o azul visible al funcionar", "Kit antiderrames y extintor a bordo o en el sitio",
  "Bandeja de goteo o piso protegido en el sitio de parqueo", "Equipo limpio, sin lodo ni residuos que se arrastren a la vía", "Residuos del mantenimiento (aceite, filtros, estopas) manejados como peligrosos",
  "Combustible suministrado con contención y sin derrames", "Alarma de reversa y luces funcionando", "Mangueras y acoples hidráulicos sin fisuras",
  "Operador capacitado en manejo ambiental y atención de derrames", "Equipo apagado en los tiempos de espera (sin ralentí prolongado)", "Documentos del equipo y del operador al día (SOAT, licencia)",
  "Registro de consumo de combustible diligenciado",
];

export const SPEC_MAQUINARIA = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["hora", "Hora", "E", "G"], ["nInspeccion", "Inspección N°", "I", "K"],
    ["tipoEquipo", "Tipo de equipo", "A", "C"], ["marcaModelo", "Marca y modelo", "H", "J"],
    ["placa", "Placa o código", "A", "C"], ["propietario", "Propietario", "E", "G"], ["empresaProp", "Empresa propietaria", "I", "K"],
    ["operador", "Operador", "A", "C"], ["horometro", "Horómetro o kilometraje", "H", "J"],
    ["frente", "Frente de trabajo", "A", "C"], ["combustible", "Combustible", "H", "J"],
    ["proxima", "Próxima inspección", "A", "C"], ["correccion", "Corrección antes del", "E", "G"],
    ["obsFinal", "5. OBSERVACIONES Y ACCIONES", "A", "A", null, 1],
  ],
  opciones: [{ clave: "resultado", desde: "4. RESULTADO DE LA INSPECCIÓN", hasta: "Próxima inspección" }],
  tablas: [
    { clave: "lista", cabecera: "No.", fin: "4. RESULTADO DE LA INSPECCIÓN", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "inspecciono", col: "C" }, { clave: "operadorEq", col: "G" }, { clave: "reviso", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MAQUINARIA = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","hora":"G13","nInspeccion":"K13","tipoEquipo":"C15","marcaModelo":"J15","placa":"C16","propietario":"G16","empresaProp":"K16","operador":"C17","horometro":"J17","frente":"C18","combustible":"J18","proxima":"C39","correccion":"G39","obsFinal":"A41","tablas":{"lista":{"fila0":21,"n":16,"filas":[21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],"columnas":{"marca":"I","obs":"K"}}},"opciones":{"resultado":[{"ref":"A38","texto":"Apto para operar"},{"ref":"E38","texto":"Apto con observaciones"},{"ref":"I38","texto":"No apto: retirar de la operación"}]},"firmas":{"inspecciono":{"nombre":"C45","cargo":"C46"},"operadorEq":{"nombre":"G45","cargo":"G46"},"reviso":{"nombre":"K45","cargo":"K46"}}};
export const descubrirMaquinaria = (ws) => descubrirPorEtiquetas(ws, SPEC_MAQUINARIA);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const numeroOTexto = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : v; };

export function escribirMaquinariaEnHoja(ws, d, celdas = CELDAS_MAQUINARIA) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "hora", "nInspeccion", "tipoEquipo", "marcaModelo", "placa", "propietario", "empresaProp", "operador", "frente", "combustible", "obsFinal"]) poner(ws, C[k], d[k]);
  poner(ws, C.horometro, numeroOTexto(d.horometro));
  for (const k of ["fecha", "proxima", "correccion"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  const noMarcadas = marcarOpciones(ws, (C.opciones || {}).resultado, d.resultado ? [d.resultado] : [], {});
  const T = C.tablas || {};
  escribirTabla(ws, T.lista, ITEMS_MAQUINARIA.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observaciones)[i] || "" })));
  const F = C.firmas || {};
  if (F.inspecciono) { poner(ws, F.inspecciono.nombre, d.inspector); poner(ws, F.inspecciono.cargo, d.inspectorCargo); }
  if (F.operadorEq) { poner(ws, F.operadorEq.nombre, d.operador); poner(ws, F.operadorEq.cargo, d.operadorCedula); }   // en este bloque la 3.ª línea es «Cédula:»
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  return noMarcadas;
}

export function validarMaquinaria(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  if (!texto(d.tipoEquipo)) f.push("el tipo de equipo");
  if (!texto(d.placa)) f.push("la placa o código del equipo");
  if (!texto(d.inspector)) f.push("el inspector");
  if (contarRespuestas(ITEMS_MAQUINARIA, d.respuestas).sin) f.push(`responder los puntos de la verificación (faltan ${contarRespuestas(ITEMS_MAQUINARIA, d.respuestas).sin})`);
  if (!d.resultado) f.push("el resultado de la inspección");
  return f;
}
export function camposFaltantesMaquinaria(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  if (!texto(d.inspector)) f.push({ etiqueta: "Nombre del inspector", seccion: "datos" });
  if (!texto(d.tipoEquipo)) f.push({ etiqueta: "Tipo de equipo", seccion: "equipo" });
  if (!texto(d.placa)) f.push({ etiqueta: "Placa o código", seccion: "equipo" });
  arr(ITEMS_MAQUINARIA).forEach((_, i) => { if (!["Sí", "No", "N/A"].includes(arr(d.respuestas)[i])) f.push({ etiqueta: `Respuesta ${i + 1}`, seccion: "lista" }); });
  if (!d.resultado) f.push({ etiqueta: "Resultado", seccion: "resultado" });
  return f;
}
export function resumenMaquinaria(d) {
  const c = contarRespuestas(ITEMS_MAQUINARIA, d.respuestas);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${texto(d.placa).toLowerCase()}|${d.fecha}`, formato: "maquinaria", proyecto: texto(d.proyecto), fecha: d.fecha, tipoEquipo: d.tipoEquipo || "", placa: texto(d.placa),
    cumple: c.si, noCumple: c.no, noAplica: c.na, resultado: d.resultado || "", proxima: d.proxima || "",
  };
}
