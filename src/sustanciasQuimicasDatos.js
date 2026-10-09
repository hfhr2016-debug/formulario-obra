// Sustancias Químicas y Combustibles (RYR-AM-014): inventario y verificación del almacenamiento. Lo común está en sstBase.js y ambBase.js.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, saltoDePagina } from "./sstBase";
import { hallazgosConDatos, contarRespuestas, validarListaYHallazgos, faltantesListaYHallazgos } from "./ambBase";

export const CODIGO_QUIMICOS = "RYR-AM-014";
export const HOJA_QUIMICOS = "Sustancias Químicas";
export const TIPOS_SUSTANCIA = ["Combustible", "Lubricante / aceite", "Pintura / solvente", "Cemento / aditivo", "Producto de limpieza", "Gas", "Otro"];
export const UNIDADES = ["gal", "L", "kg", "m³", "Unidad", "Bulto"];
export const SI_NO = ["Sí", "No"];
// Sustancias que se usan en una obra (se elige de la lista desplegable; también se puede escribir otra). [nombre, tipo, unidad habitual]
const C = "Combustible", L = "Lubricante / aceite", P = "Pintura / solvente", A = "Cemento / aditivo", Q = "Producto de limpieza", G = "Gas";
export const CATALOGO_SUSTANCIAS = [
  ["ACPM (diésel)", C, "gal"], ["Gasolina corriente", C, "gal"], ["Gasolina extra", C, "gal"], ["Mezcla de gasolina y aceite (2 tiempos)", C, "gal"], ["Kerosene", C, "gal"],
  ["Aceite de motor", L, "gal"], ["Aceite hidráulico", L, "gal"], ["Aceite de transmisión / caja", L, "gal"], ["Aceite usado (almacenado para entrega)", L, "gal"], ["Grasa lubricante", L, "kg"],
  ["Líquido de frenos", L, "L"], ["Refrigerante / anticongelante", L, "gal"], ["Desmoldante para formaleta", L, "gal"], ["WD-40 / lubricante en aerosol", L, "Unidad"],
  ["Pintura vinilo / látex", P, "gal"], ["Pintura esmalte", P, "gal"], ["Pintura anticorrosiva", P, "gal"], ["Pintura epóxica", P, "gal"], ["Pintura en aerosol", P, "Unidad"],
  ["Thinner", P, "gal"], ["Varsol / disolvente", P, "gal"], ["Aguarrás", P, "gal"], ["Barniz / laca", P, "gal"], ["Sellador", P, "gal"], ["Removedor de pintura", P, "gal"],
  ["Masilla / estuco", P, "kg"], ["Pegante PVC (soldadura líquida)", P, "gal"], ["Limpiador PVC", P, "gal"], ["Pegante de contacto", P, "gal"], ["Silicona / sellante", P, "Unidad"],
  ["Espuma de poliuretano", P, "Unidad"], ["Resina epóxica", P, "kg"], ["Impermeabilizante asfáltico", P, "gal"], ["Emulsión asfáltica", P, "gal"], ["Asfalto", P, "kg"],
  ["Cemento gris", A, "Bulto"], ["Cemento blanco", A, "Bulto"], ["Cal hidratada", A, "Bulto"], ["Yeso", A, "Bulto"], ["Mortero seco / pega de cerámica", A, "Bulto"],
  ["Aditivo plastificante", A, "gal"], ["Aditivo acelerante o retardante", A, "gal"], ["Curador de concreto", A, "gal"], ["Aditivo impermeabilizante", A, "gal"], ["Fibra o aditivo para concreto", A, "kg"],
  ["Ácido muriático", Q, "gal"], ["Soda cáustica", Q, "kg"], ["Hipoclorito / cloro", Q, "gal"], ["Desengrasante", Q, "gal"], ["Detergente", Q, "kg"], ["Jabón desinfectante", Q, "gal"], ["Insecticida / fumigante", Q, "L"],
  ["Gas propano (GLP)", G, "kg"], ["Acetileno", G, "Unidad"], ["Oxígeno industrial", G, "Unidad"], ["Argón / mezcla de soldadura", G, "Unidad"],
  ["Batería (plomo-ácido)", "Otro", "Unidad"], ["Pilas", "Otro", "Unidad"], ["Aerosoles", "Otro", "Unidad"],
];
export const OPCIONES_SUSTANCIAS = CATALOGO_SUSTANCIAS.map(([texto, tipo, unidad]) => ({ texto, detalle: tipo, tipo, unidad }));

// Los 13 puntos vienen escritos en la plantilla, en este orden
export const ITEMS_QUIMICOS = [
  "Zona de almacenamiento señalizada, ventilada y techada", "Piso impermeable con contención o dique para el 110 % del recipiente mayor",
  "Recipientes cerrados, rotulados y en buen estado", "Hojas de seguridad (SDS) impresas y visibles en el sitio",
  "Sustancias incompatibles almacenadas por separado", "Kit antiderrames disponible y completo", "Extintor adecuado y vigente cerca de la zona",
  "Prohibición de fumar y fuentes de ignición señalizadas", "Personal capacitado en manejo de sustancias y con EPP disponible", "Sin derrames, goteos ni manchas en la zona",
  "Tanques de combustible con contención y conexión a tierra", "Registro de entradas y salidas actualizado", "Envases vacíos manejados como residuo peligroso",
];

export const SPEC_QUIMICOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "H", "J"],
    ["fecha", "Fecha", "A", "C"], ["almacen", "Almacén o zona", "E", "G"], ["responsable", "Responsable", "I", "K"],
    ["obsGenerales", "5. OBSERVACIONES", "A", "A", null, 1],
  ],
  tablas: [
    { clave: "inventario", cabecera: "No.", fin: "3. VERIFICACIÓN DEL ALMACENAMIENTO", finEmpieza: true,
      columnas: { sustancia: "B", tipo: "E", cantidad: "G", unidad: "H", ubicacion: "I", hoja: "K", rotulado: "L" },
      encabezados: { sustancia: "Sustancia o producto", tipo: "Tipo", cantidad: "Cantidad", unidad: "Unidad", ubicacion: "Ubicación", hoja: "Hoja de seguridad", rotulado: "Rotulado" } },
    { clave: "lista", cabecera: "No.", despuesDe: "inventario", fin: "4. HALLAZGOS Y ACCIONES", finEmpieza: true, numerada: true, columnas: { marca: "I", obs: "K" }, encabezados: { marca: ["¿Cumple?", "Cumple"], obs: "Observación" } },
    { clave: "hallazgos", cabecera: "No.", despuesDe: "lista", fin: "5. OBSERVACIONES", finEmpieza: true, columnas: { hallazgo: "B", accion: "G", responsable: "J", fechaLimite: "L" },
      encabezados: { hallazgo: "Hallazgo", accion: "Acción a tomar", responsable: "Responsable", fechaLimite: "Fecha límite" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "6. FIRMAS", personas: [{ clave: "verifico", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_QUIMICOS = {"proyecto":"C11","contratista":"C12","ubicacion":"J12","fecha":"C13","almacen":"G13","responsable":"K13","obsGenerales":"A50","tablas":{"inventario":{"fila0":16,"n":12,"columnas":{"sustancia":"B","tipo":"E","cantidad":"G","unidad":"H","ubicacion":"I","hoja":"K","rotulado":"L"}},"lista":{"fila0":30,"n":13,"filas":[30,31,32,33,34,35,36,37,38,39,40,41,42],"columnas":{"marca":"I","obs":"K"}},"hallazgos":{"fila0":45,"n":4,"columnas":{"hallazgo":"B","accion":"G","responsable":"J","fechaLimite":"L"}}},"firmas":{"verifico":{"nombre":"C54","cargo":"C55"},"reviso":{"nombre":"I54","cargo":"I55"}}};
export const descubrirQuimicos = (ws) => descubrirPorEtiquetas(ws, SPEC_QUIMICOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
export const sustanciaNueva = (b = {}) => ({ sustancia: "", tipo: "", cantidad: "", unidad: "", ubicacion: "", hoja: "", rotulado: "", ...b });
export const sustanciaVacia = (s) => !(s && (texto(s.sustancia) || texto(s.tipo) || texto(s.cantidad) || texto(s.unidad) || texto(s.ubicacion) || s.hoja || s.rotulado));
export const sustanciasConDatos = (d) => arr(d.sustancias).filter((s) => !sustanciaVacia(s));
export const sinHojaDeSeguridad = (d) => sustanciasConDatos(d).filter((s) => s.hoja !== "Sí");

export function escribirQuimicosEnHoja(ws, d, celdas = CELDAS_QUIMICOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "almacen", "responsable", "obsGenerales"]) poner(ws, C[k], d[k]);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  const T = C.tablas || {};
  escribirTabla(ws, T.inventario, sustanciasConDatos(d).map((s) => ({ ...s, cantidad: num(s.cantidad) === null ? s.cantidad : num(s.cantidad) })));
  escribirTabla(ws, T.lista, ITEMS_QUIMICOS.map((_, i) => ({ marca: arr(d.respuestas)[i] || "", obs: arr(d.observaciones)[i] || "" })));
  escribirTabla(ws, T.hallazgos, hallazgosConDatos(d.hallazgos).map((h) => ({ ...h, fechaLimite: fechaDDMMYYYY(h.fechaLimite) })));
  if (T.inventario) saltoDePagina(ws, T.inventario.fila0 + T.inventario.n - 1);   // la verificación y las firmas van en la hoja 2
  const F = C.firmas || {};
  if (F.verifico) { poner(ws, F.verifico.nombre, d.verificoNombre); poner(ws, F.verifico.cargo, d.verificoCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarQuimicos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!d.fecha) f.push("la fecha");
  const ss = sustanciasConDatos(d);
  if (!ss.length) f.push("al menos una sustancia en el inventario");
  else if (ss.some((s) => !texto(s.sustancia))) f.push("el nombre de cada sustancia del inventario");
  if (!texto(d.verificoNombre)) f.push("quién verifica");
  f.push(...validarListaYHallazgos(ITEMS_QUIMICOS, d.respuestas, d.hallazgos));
  return f;
}
export function camposFaltantesQuimicos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fecha) f.push({ etiqueta: "Fecha", seccion: "datos" });
  const todas = arr(d.sustancias);
  if (!sustanciasConDatos(d).length) f.push({ etiqueta: "Sustancia o producto", indice: 0, seccion: "inventario" });
  else todas.forEach((s, i) => { if (!sustanciaVacia(s) && !texto(s.sustancia)) f.push({ etiqueta: "Sustancia o producto", indice: i, seccion: "inventario" }); });
  if (!texto(d.verificoNombre)) f.push({ etiqueta: "Nombre de quien verifica", seccion: "firmas" });
  f.push(...faltantesListaYHallazgos(ITEMS_QUIMICOS, d.respuestas, d.hallazgos, "lista", "hallazgos"));
  return f;
}

export function resumenQuimicos(d) {
  const c = contarRespuestas(ITEMS_QUIMICOS, d.respuestas);
  const ss = sustanciasConDatos(d);
  return { id: `${texto(d.proyecto).toLowerCase()}|${d.fecha}|${texto(d.almacen).toLowerCase()}`, formato: "quimicos", proyecto: texto(d.proyecto), fecha: d.fecha, almacen: texto(d.almacen),
    detalle: hallazgosConDatos(d.hallazgos).map((h) => ({ hallazgo: h.hallazgo || "", accion: h.accion || "", responsable: h.responsable || "", fechaLimite: h.fechaLimite || "" })),
    sustancias: ss.length, sinHoja: sinHojaDeSeguridad(d).length, combustibles: ss.filter((s) => s.tipo === "Combustible").length,
    cumple: c.si, noCumple: c.no, noAplica: c.na, hallazgos: hallazgosConDatos(d.hallazgos).length, porcentaje: c.si + c.no ? Math.round((c.si / (c.si + c.no)) * 1000) / 10 : null };
}
