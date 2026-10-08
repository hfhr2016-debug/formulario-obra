// Matriz de Aspectos e Impactos Ambientales (RYR-AM-013): datos y lógica propios de este formato. Lo común está en sstBase.js.
// El Excel calcula el valor (frecuencia × severidad), el nivel y si es significativo; la app escribe lo que se digita y pinta el nivel.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";

export const CODIGO_MATRIZ_AMB = "RYR-AM-013";
export const HOJA_MATRIZ_AMB = "Matriz Aspectos e Impactos";
export const MEDIOS = ["Agua", "Aire", "Suelo", "Flora", "Fauna", "Paisaje", "Comunidad", "Recursos naturales"];
export const CONDICIONES = ["Normal", "Anormal", "Emergencia"];
export const TIPOS_IMPACTO = ["Negativo", "Positivo"];
// Opciones como se eligen en pantalla ("3 · Frecuente"); en el Excel solo va el número
export const NIVELES_FRECUENCIA = ["1 · Rara vez", "2 · Ocasional", "3 · Frecuente", "4 · Muy frecuente", "5 · Permanente"];
export const NIVELES_SEVERIDAD = ["1 · Insignificante", "2 · Leve", "3 · Moderada", "4 · Grave", "5 · Crítica"];
export const COLORES_NIVEL = { Bajo: { relleno: "00A651", fuente: "000000" }, Medio: { relleno: "FFC000", fuente: "000000" }, Alto: { relleno: "C00000", fuente: "FFFFFF" } };
export const COLORES_SIGNIFICATIVO = { "Sí": { relleno: "C00000", fuente: "FFFFFF" }, No: { relleno: "00A651", fuente: "000000" }, Positivo: { relleno: "9DC3E6", fuente: "000000" } };
export const UMBRAL_ALTO = 15;
export const UMBRAL_MEDIO = 8;

// Aspectos habituales de una obra de reformas y remodelaciones: se agregan con un toque y se ajustan
export const ASPECTOS_TIPICOS = [
  { proceso: "Demoliciones y desmontes", aspecto: "Generación de escombros (RCD)", impacto: "Ocupación de espacio y contaminación del suelo", medio: "Suelo", requisito: "Resolución 0472 de 2017" },
  { proceso: "Demoliciones y desmontes", aspecto: "Emisión de material particulado", impacto: "Alteración de la calidad del aire", medio: "Aire", requisito: "" },
  { proceso: "Obra civil (pega, corte, pulido)", aspecto: "Generación de ruido", impacto: "Molestia a la comunidad y afectación auditiva", medio: "Comunidad", requisito: "Resolución 0627 de 2006" },
  { proceso: "Obra civil (concreto y morteros)", aspecto: "Vertimiento de aguas de lavado con cemento", impacto: "Contaminación del agua y de las redes", medio: "Agua", requisito: "Decreto 1076 de 2015" },
  { proceso: "Acabados (pintura)", aspecto: "Uso de pinturas y solventes", impacto: "Emisión de compuestos orgánicos y residuos peligrosos", medio: "Aire", requisito: "Decreto 1076 de 2015" },
  { proceso: "Mantenimiento de maquinaria", aspecto: "Derrame de combustibles o aceites", impacto: "Contaminación del suelo y del agua", medio: "Suelo", requisito: "Decreto 1076 de 2015" },
  { proceso: "Mantenimiento de maquinaria", aspecto: "Generación de residuos peligrosos (aceites, filtros, estopas)", impacto: "Contaminación del suelo y riesgo para la salud", medio: "Suelo", requisito: "Decreto 1076 de 2015" },
  { proceso: "Actividades generales", aspecto: "Consumo de agua", impacto: "Agotamiento del recurso hídrico", medio: "Recursos naturales", requisito: "" },
  { proceso: "Actividades generales", aspecto: "Consumo de energía", impacto: "Agotamiento de recursos y emisiones indirectas", medio: "Recursos naturales", requisito: "" },
  { proceso: "Actividades generales", aspecto: "Generación de residuos ordinarios y aprovechables", impacto: "Ocupación de rellenos y pérdida de material aprovechable", medio: "Suelo", requisito: "" },
  { proceso: "Transporte de materiales", aspecto: "Emisiones de vehículos y polvo en vías", impacto: "Alteración de la calidad del aire", medio: "Aire", requisito: "" },
  { proceso: "Intervención de zonas verdes", aspecto: "Tala o poda de árboles", impacto: "Pérdida de cobertura vegetal y hábitat de fauna", medio: "Flora", requisito: "Decreto 1076 de 2015" },
];

export const SPEC_MATRIZ_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratista", "Contratista / Empresa", "A", "C"], ["fechaElaboracion", "Fecha de elaboración", "A", "C"],
    ["ubicacion", "Ubicación", "H", "K"], ["elaboro", "Elaboró", "H", "K"], ["actualizacion", "Última actualización", "E", "G"], ["version", "Versión", "I", "K"],
  ],
  tablas: [
    // "numerada": las notas de la escala que siguen a la tabla no cuentan como filas
    { clave: "aspectos", cabecera: "No.", fin: "3. FIRMAS", finEmpieza: true, numerada: true,
      columnas: { proceso: "B", aspecto: "C", impacto: "D", medio: "E", condicion: "F", tipo: "G", frecuencia: "H", severidad: "I", nivel: "K", significativo: "L", requisito: "M", control: "N", responsable: "O" },
      encabezados: { proceso: "Proceso o actividad", aspecto: "Aspecto ambiental", impacto: "Impacto ambiental", medio: "Medio afectado", condicion: "Condición", tipo: "Tipo de impacto", frecuencia: "Frecuencia (1-5)", severidad: "Severidad (1-5)",
        nivel: "Nivel", significativo: "¿Significativo?", requisito: "Requisito legal", control: "Control o medida de manejo", responsable: "Responsable" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "3. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "H" }, { clave: "vobo", col: "N" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_MATRIZ_AMB = {"proyecto":"C11","contratista":"C12","fechaElaboracion":"C13","ubicacion":"K11","elaboro":"K12","actualizacion":"G13","version":"K13","tablas":{"aspectos":{"fila0":16,"n":10,"filas":[16,17,18,19,20,21,22,23,24,25],"columnas":{"proceso":"B","aspecto":"C","impacto":"D","medio":"E","condicion":"F","tipo":"G","frecuencia":"H","severidad":"I","nivel":"K","significativo":"L","requisito":"M","control":"N","responsable":"O"}}},"firmas":{"elaboro":{"nombre":"C31","cargo":"C32"},"reviso":{"nombre":"H31","cargo":"H32"},"vobo":{"nombre":"N31","cargo":"N32"}}};
export const descubrirMatrizAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_MATRIZ_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
// Entiende un número solo ("3") o con su descripción ("3 · Frecuente"): lo que cuenta es el número con el que empieza
const num = (v) => { const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(texto(v)); return m ? Number(m[1].replace(",", ".")) : null; };
export const aspectoNuevo = (b = {}) => ({ proceso: "", aspecto: "", impacto: "", medio: "", condicion: "Normal", tipo: "Negativo", frecuencia: "", severidad: "", requisito: "", control: "", responsable: "", ...b });
// Una fila "con datos" es la que tiene algo escrito aparte de los valores por defecto (condición Normal y tipo Negativo)
export const aspectoVacio = (a) => !(a && (texto(a.proceso) || texto(a.aspecto) || texto(a.impacto) || texto(a.medio) || texto(a.requisito) || texto(a.control) || texto(a.responsable) || a.frecuencia || a.severidad));
export const aspectosConDatos = (d) => arr(d.aspectos).filter((a) => !aspectoVacio(a));

// ---------- Valoración (las mismas fórmulas del Excel) ----------
export function valorarAspecto(a) {
  const f = num(a.frecuencia), s = num(a.severidad);
  const valor = f !== null && s !== null ? f * s : null;
  const nivel = valor === null ? "" : valor >= UMBRAL_ALTO ? "Alto" : valor >= UMBRAL_MEDIO ? "Medio" : "Bajo";
  const significativo = valor === null ? "" : a.tipo === "Positivo" ? "Positivo" : nivel === "Alto" || a.condicion === "Emergencia" ? "Sí" : "No";
  return { valor, nivel, significativo };
}
export const significativos = (d) => aspectosConDatos(d).filter((a) => valorarAspecto(a).significativo === "Sí");

export function escribirMatrizAmbEnHoja(ws, d, celdas = CELDAS_MATRIZ_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "ubicacion", "elaboro", "version"]) poner(ws, C[k], d[k]);
  poner(ws, C.fechaElaboracion, fechaDDMMYYYY(d.fechaElaboracion)); poner(ws, C.actualizacion, fechaDDMMYYYY(d.actualizacion));
  const T = C.tablas || {};
  const filas = aspectosConDatos(d);
  escribirTabla(ws, T.aspectos, filas.map((a) => ({ proceso: a.proceso, aspecto: a.aspecto, impacto: a.impacto, medio: a.medio, condicion: a.condicion, tipo: a.tipo,
    frecuencia: num(a.frecuencia) === null ? "" : num(a.frecuencia), severidad: num(a.severidad) === null ? "" : num(a.severidad), requisito: a.requisito, control: a.control, responsable: a.responsable })));
  // El valor, el nivel y «¿Significativo?» los calcula el Excel; aquí se les pone su color (las reglas de color de Excel no viajan en la plantilla)
  const col = (T.aspectos && T.aspectos.columnas) || {};
  filas.slice(0, (T.aspectos && T.aspectos.n) || 0).forEach((a, i) => {
    const r = T.aspectos.filas ? T.aspectos.filas[i] : T.aspectos.fila0 + i;
    const v = valorarAspecto(a);
    const cn = COLORES_NIVEL[v.nivel], cs = COLORES_SIGNIFICATIVO[v.significativo];
    if (cn && col.nivel) pintarCelda(ws, `${col.nivel}${r}`, "FF" + cn.relleno, "FF" + cn.fuente);
    if (cs && col.significativo) pintarCelda(ws, `${col.significativo}${r}`, "FF" + cs.relleno, "FF" + cs.fuente);
  });
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
}

export function validarMatrizAmb(d) {
  const faltan = [];
  if (!texto(d.proyecto)) faltan.push("el nombre del proyecto");
  if (!d.fechaElaboracion) faltan.push("la fecha de elaboración");
  const rs = aspectosConDatos(d);
  if (!rs.length) faltan.push("al menos un aspecto ambiental");
  else {
    if (rs.some((a) => !texto(a.aspecto))) faltan.push("el aspecto ambiental de cada fila");
    if (rs.some((a) => !texto(a.impacto))) faltan.push("el impacto ambiental de cada fila");
    if (rs.some((a) => num(a.frecuencia) === null || num(a.severidad) === null)) faltan.push("la frecuencia y la severidad de cada aspecto");
  }
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora la matriz");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo): [{ etiqueta, indice?, seccion }]. Va en el mismo orden que validarMatrizAmb().
export function camposFaltantesMatrizAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!d.fechaElaboracion) f.push({ etiqueta: "Fecha de elaboración", seccion: "datos" });
  const todos = arr(d.aspectos);
  if (!aspectosConDatos(d).length) f.push({ etiqueta: "Aspecto ambiental", indice: 0, seccion: "aspectos" });
  else todos.forEach((a, i) => {
    if (aspectoVacio(a)) return;
    if (!texto(a.aspecto)) f.push({ etiqueta: "Aspecto ambiental", indice: i, seccion: "aspectos" });
    if (!texto(a.impacto)) f.push({ etiqueta: "Impacto ambiental", indice: i, seccion: "aspectos" });
    if (num(a.frecuencia) === null) f.push({ etiqueta: `Frecuencia ${i + 1}`, seccion: "aspectos" });
    if (num(a.severidad) === null) f.push({ etiqueta: `Severidad ${i + 1}`, seccion: "aspectos" });
  });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que se guarda en el dispositivo: Acciones Correctivas Ambientales puede traer de aquí los aspectos significativos
export function resumenMatrizAmb(d) {
  const rs = aspectosConDatos(d).map((a) => { const v = valorarAspecto(a); return { proceso: a.proceso || "", aspecto: a.aspecto || "", impacto: a.impacto || "", medio: a.medio || "", valor: v.valor, nivel: v.nivel, significativo: v.significativo, control: a.control || "", responsable: a.responsable || "" }; });
  return { id: `${texto(d.proyecto).toLowerCase()}|${d.fechaElaboracion || "sin-fecha"}|${texto(d.version)}`, formato: "matriz-aspectos", fecha: d.fechaElaboracion || "", proyecto: texto(d.proyecto), version: texto(d.version),
    aspectos: rs, total: rs.length, significativos: rs.filter((r) => r.significativo === "Sí").length };
}
