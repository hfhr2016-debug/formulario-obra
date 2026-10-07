// Matriz de Peligros y Valoración de Riesgos — GTC 45 (RYR-SS-018): datos y lógica propios de este formato. Lo común está en sstBase.js.
// El Excel calcula NP, NR, nivel y aceptabilidad con sus fórmulas; la app escribe lo que se digita (ND, NE, NC…) y pinta el nivel de su color.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";

export const CODIGO_MATRIZ = "RYR-SS-018";
export const HOJA_MATRIZ = "Matriz de Peligros";
export const CLASIFICACION = ["Biológico", "Físico", "Químico", "Psicosocial", "Biomecánico", "Condiciones de seguridad", "Fenómenos naturales"];
export const SI_NO = ["Sí", "No"];
// Opciones tal como se eligen en pantalla ("6 · Alto"); en el Excel solo va el número. El nivel "bajo" de deficiencia no recibe valor en la GTC 45.
export const NIVELES_ND = ["10 · Muy alto", "6 · Alto", "2 · Medio"];
export const NIVELES_NE = ["4 · Continua", "3 · Frecuente", "2 · Ocasional", "1 · Esporádica"];
export const NIVELES_NC = ["100 · Mortal o catastrófica", "60 · Muy grave", "25 · Grave", "10 · Leve"];
export const COLORES_NIVEL_MATRIZ = { I: { relleno: "C00000", fuente: "FFFFFF" }, II: { relleno: "F57C00", fuente: "000000" }, III: { relleno: "FFC000", fuente: "000000" }, IV: { relleno: "00A651", fuente: "000000" } };
export const ACEPTABILIDAD = { I: "No aceptable", II: "No aceptable o aceptable con control específico", III: "Mejorable", IV: "Aceptable" };

export const SPEC_MATRIZ = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["ubicacion", "Ubicación", "A", "C"],
    ["fechaElaboracion", "Fecha de elaboración", "H", "J"], ["actualizacion", "Última actualización", "H", "J"], ["version", "Versión de la matriz", "M", "P"], ["hoja", "Hoja N°", "M", "P"], ["participan", "Participan en la valoración", "M", "P"],
  ],
  tablas: [
    { clave: "riesgos", cabecera: "No.", fin: "3. GUÍA DE VALORACIÓN", finEmpieza: true,
      columnas: { proceso: "B", tarea: "C", rutinaria: "D", peligro: "E", clasificacion: "F", efectos: "G", controles: "H", nd: "I", ne: "J", nc: "M", nivel: "O", expuestos: "Q", medidas: "R" },
      encabezados: { proceso: "Proceso o actividad", tarea: "Tarea", rutinaria: "¿Rutinaria?", peligro: "Peligro (descripción)", clasificacion: "Clasificación", efectos: "Efectos posibles", controles: "Controles existentes",
        nd: "ND", ne: "NE", nc: "NC", nivel: "Nivel de riesgo", expuestos: "Expuestos", medidas: "Medidas de intervención" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "J" }, { clave: "vobo", col: "Q" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MATRIZ = {"proyecto":"C11","contratista":"C12","ubicacion":"C13","fechaElaboracion":"J11","actualizacion":"J12","version":"P11","hoja":"P12","participan":"P13","tablas":{"riesgos":{"fila0":16,"n":12,"columnas":{"proceso":"B","tarea":"C","rutinaria":"D","peligro":"E","clasificacion":"F","efectos":"G","controles":"H","nd":"I","ne":"J","nc":"M","nivel":"O","expuestos":"Q","medidas":"R"}}},"firmas":{"elaboro":{"nombre":"C36","cargo":"C37"},"reviso":{"nombre":"J36","cargo":"J37"},"vobo":{"nombre":"Q36","cargo":"Q37"}}};
export const descubrirMatriz = (ws) => descubrirPorEtiquetas(ws, SPEC_MATRIZ);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
// Entiende un número solo ("6") o con su descripción ("6 · Alto"): lo que cuenta es el número con el que empieza
const num = (v) => { const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(texto(v)); return m ? Number(m[1].replace(",", ".")) : null; };
export const riesgoNuevo = (b = {}) => ({ proceso: "", tarea: "", rutinaria: "", peligro: "", clasificacion: "", efectos: "", controles: "", nd: "", ne: "", nc: "", expuestos: "", medidas: "", ...b });
export const riesgoVacio = (r) => !(r && (texto(r.proceso) || texto(r.tarea) || texto(r.peligro) || texto(r.efectos) || texto(r.controles) || texto(r.medidas) || r.nd || r.ne || r.nc || texto(r.clasificacion) || texto(r.expuestos) || texto(r.rutinaria)));
export const riesgosConDatos = (d) => arr(d.riesgos).filter((r) => !riesgoVacio(r));

// ---------- Valoración GTC 45 (las mismas fórmulas del Excel) ----------
export function valorar(r) {
  const nd = num(r.nd), ne = num(r.ne), nc = num(r.nc);
  const np = nd !== null && ne !== null ? nd * ne : null;
  const interpNP = np === null ? "" : np >= 24 ? "Muy alto" : np >= 10 ? "Alto" : np >= 6 ? "Medio" : "Bajo";
  const nr = np !== null && nc !== null ? np * nc : null;
  const nivel = nr === null ? "" : nr >= 600 ? "I" : nr >= 150 ? "II" : nr >= 40 ? "III" : "IV";
  return { np, interpNP, nr, nivel, aceptabilidad: nivel ? ACEPTABILIDAD[nivel] : "" };
}
export const noAceptables = (d) => riesgosConDatos(d).filter((r) => ["I", "II"].includes(valorar(r).nivel));

export function escribirMatrizEnHoja(ws, d, celdas = CELDAS_MATRIZ) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "version", "hoja", "participan"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaElaboracion, fechaDDMMYYYY(d.fechaElaboracion)); poner(ws, C.actualizacion, fechaDDMMYYYY(d.actualizacion));
  const T = C.tablas || {};
  const filas = riesgosConDatos(d);
  escribirTabla(ws, T.riesgos, filas.map((r) => ({ proceso: r.proceso, tarea: r.tarea, rutinaria: r.rutinaria, peligro: r.peligro, clasificacion: r.clasificacion, efectos: r.efectos, controles: r.controles,
    nd: num(r.nd) === null ? "" : num(r.nd), ne: num(r.ne) === null ? "" : num(r.ne), nc: num(r.nc) === null ? "" : num(r.nc), expuestos: num(r.expuestos) === null ? r.expuestos : num(r.expuestos), medidas: r.medidas })));
  // El nivel de riesgo (I a IV) lo calcula el Excel; aquí se le pone el color que le corresponde (las reglas de color de Excel no viajan en la plantilla)
  if (T.riesgos && T.riesgos.columnas && T.riesgos.columnas.nivel) {
    filas.slice(0, T.riesgos.n).forEach((r, i) => { const c = COLORES_NIVEL_MATRIZ[valorar(r).nivel]; if (c) pintarCelda(ws, T.riesgos.columnas.nivel + (T.riesgos.fila0 + i), "FF" + c.relleno, "FF" + c.fuente); });
  }
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarMatriz(d) {
  const faltan = [];
  if (!d.fechaElaboracion) faltan.push("la fecha de elaboración");
  const rs = riesgosConDatos(d);
  if (!rs.length) faltan.push("al menos un peligro");
  else {
    if (rs.some((r) => !texto(r.peligro))) faltan.push("la descripción del peligro de cada fila");
    if (rs.some((r) => !texto(r.clasificacion))) faltan.push("la clasificación de cada peligro");
    if (rs.some((r) => num(r.nd) === null || num(r.ne) === null || num(r.nc) === null)) faltan.push("el nivel de deficiencia, de exposición y de consecuencia de cada peligro");
  }
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora la matriz");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarMatriz().
export function camposFaltantesMatriz(d) {
  const f = [];
  if (!d.fechaElaboracion) f.push({ etiqueta: "Fecha de elaboración", seccion: "datos" });
  const todos = arr(d.riesgos);
  if (!riesgosConDatos(d).length) f.push({ etiqueta: "Peligro (descripción)", indice: 0, seccion: "riesgos" });
  else todos.forEach((r, i) => {
    if (riesgoVacio(r)) return;
    if (!texto(r.peligro)) f.push({ etiqueta: "Peligro (descripción)", indice: i, seccion: "riesgos" });
    if (!texto(r.clasificacion)) f.push({ etiqueta: "Clasificación", indice: i, seccion: "riesgos" });
    if (num(r.nd) === null) f.push({ etiqueta: `Nivel de deficiencia ${i + 1}`, seccion: "riesgos" });
    if (num(r.ne) === null) f.push({ etiqueta: `Nivel de exposición ${i + 1}`, seccion: "riesgos" });
    if (num(r.nc) === null) f.push({ etiqueta: `Nivel de consecuencia ${i + 1}`, seccion: "riesgos" });
  });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: Acciones Correctivas trae de aquí los riesgos no aceptables
export function resumenMatriz(d) {
  const rs = riesgosConDatos(d).map((r) => { const v = valorar(r); return { proceso: r.proceso || "", tarea: r.tarea || "", peligro: r.peligro || "", nivel: v.nivel, nr: v.nr, medidas: r.medidas || "", controles: r.controles || "" }; });
  return { id: `${d.fechaElaboracion || "sin-fecha"}_${d.version || ""}_${d.hoja || ""}`, formato: "matriz", fecha: d.fechaElaboracion || "", proyecto: d.proyecto || "", version: d.version || "", hoja: d.hoja || "", riesgos: rs,
    total: rs.length, noAceptables: rs.filter((r) => ["I", "II"].includes(r.nivel)).length };
}
