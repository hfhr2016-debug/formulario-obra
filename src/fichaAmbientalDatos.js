// Ficha Ambiental de la Obra (RYR-AM-001): datos y lógica propios de este formato. Lo común está en sstBase.js.
// Se diligencia UNA vez por proyecto; los demás formatos ambientales traen de aquí los datos de la obra y sus gestores autorizados.
import { poner, escribirTabla, descubrirPorEtiquetas, marcarOpciones, fechaDDMMYYYY, saltoDePagina } from "./sstBase";

export const CODIGO_FICHA_AMB = "RYR-AM-001";
export const HOJA_FICHA_AMB = "Ficha Ambiental";
export const TIPOS_OBRA_AMB = ["Edificación", "Reforma o remodelación", "Vías", "Hidrocarburos", "Redes o infraestructura", "Otra"];
export const INSTRUMENTOS = ["Licencia ambiental", "Plan de Manejo Ambiental (PMA)", "Guía ambiental (PAGA)", "PGAS-C (obra pública)", "Ninguno: aplican las normas generales"];
export const SI_NO_AMB = ["Sí", "No"];
// Las filas de estas tablas vienen escritas en la plantilla, en este orden
export const PERMISOS = ["Aprovechamiento forestal (tala, poda o traslado)", "Permiso de vertimientos", "Concesión o uso de aguas", "Ocupación de cauce", "Permiso de emisiones atmosféricas",
  "Registro como generador de residuos peligrosos", "Otro: ____________", "Otro: ____________"];
export const CONDICIONES = ["Almacena combustibles o sustancias químicas", "Maneja hidrocarburos", "Hay aprovechamiento forestal o tala", "Genera vertimientos", "Cuerpo de agua cercano (menos de 100 m)",
  "Vecinos sensibles (colegio, clínica)", "Usa maquinaria pesada", "Zona protegida o de reserva cercana", "Planta de concreto o trituración en sitio"];
export const GESTORES = ["Escombros y RCD (disposición o aprovechamiento)", "Residuos peligrosos (RESPEL)", "Aceites usados", "Residuos ordinarios (recolección)", "Residuos aprovechables (reciclaje)", "Baños portátiles / aguas residuales"];

export const SPEC_FICHA_AMB = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["contratante", "Contratante / Cliente", "A", "C"], ["contratista", "Contratista", "H", "J"],
    ["municipio", "Municipio", "A", "C"], ["direccion", "Dirección o sector", "H", "J"], ["tipoObra", "Tipo de obra", "A", "C"], ["area", "Área o longitud", "H", "J"],
    ["fechaInicio", "Fecha de inicio", "A", "C"], ["finPrevisto", "Fin previsto", "E", "G"], ["trabajadores", "Trabajadores (promedio)", "I", "K"],
    ["autoridad", "Autoridad ambiental", "A", "C"], ["resolucion", "N° de resolución o expediente", "H", "J"],
    ["fechaActo", "Fecha del acto", "A", "C"], ["vigenteHasta", "Vigente hasta", "E", "G"], ["ultimoICA", "Último ICA presentado", "I", "K"],
    ["respNombre", "Nombre", "A", "C"], ["respCargo", "Cargo", "H", "J", "respNombre"], ["respTelefono", "Teléfono", "A", "C", "respNombre"], ["respCorreo", "Correo", "H", "J", "respNombre"],
  ],
  opciones: [{ clave: "instrumentos", desde: "2. INSTRUMENTO AMBIENTAL APLICABLE", hasta: "Autoridad ambiental" }, { clave: "condiciones", desde: "4. CONDICIONES DE LA OBRA", hasta: "5. GESTORES" }],
  tablas: [
    { clave: "permisos", cabecera: "No.", fin: "4. CONDICIONES DE LA OBRA", finEmpieza: true, columnas: { nombre: "B", aplica: "F", resolucion: "G", vigencia: "I", obs: "K" },
      encabezados: { aplica: "¿Aplica?", resolucion: "N° de resolución", vigencia: "Vigente hasta", obs: "Observación" } },
    { clave: "gestores", cabecera: "No.", despuesDe: "permisos", fin: "6. RESPONSABLE AMBIENTAL", finEmpieza: true, columnas: { empresa: "E", nit: "H", autorizacion: "I", vigencia: "K" },
      encabezados: { empresa: "Empresa", nit: "NIT", autorizacion: "N° de autorización o licencia", vigencia: "Vigente hasta" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "7. FIRMAS", personas: [{ clave: "elaboro", col: "C" }, { clave: "reviso", col: "G" }, { clave: "vobo", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_FICHA_AMB = {"proyecto":"C11","contratante":"C12","contratista":"J12","municipio":"C13","direccion":"J13","tipoObra":"C14","area":"J14","fechaInicio":"C15","finPrevisto":"G15","trabajadores":"K15","autoridad":"C19","resolucion":"J19","fechaActo":"C20","vigenteHasta":"G20","ultimoICA":"K20","respNombre":"C45","respCargo":"J45","respTelefono":"C46","respCorreo":"J46","tablas":{"permisos":{"fila0":23,"n":8,"columnas":{"nombre":"B","aplica":"F","resolucion":"G","vigencia":"I","obs":"K"}},"gestores":{"fila0":38,"n":6,"columnas":{"empresa":"E","nit":"H","autorizacion":"I","vigencia":"K"}}},"opciones":{"instrumentos":[{"ref":"A17","texto":"Licencia ambiental"},{"ref":"D17","texto":"Plan de Manejo Ambiental (PMA)"},{"ref":"G17","texto":"Guía ambiental (PAGA)"},{"ref":"J17","texto":"PGAS-C (obra pública)"},{"ref":"A18","texto":"Ninguno: aplican las normas generales"}],"condiciones":[{"ref":"A32","texto":"Almacena combustibles o sustancias químicas"},{"ref":"E32","texto":"Maneja hidrocarburos"},{"ref":"I32","texto":"Hay aprovechamiento forestal o tala"},{"ref":"A33","texto":"Genera vertimientos"},{"ref":"E33","texto":"Cuerpo de agua cercano (menos de 100 m)"},{"ref":"I33","texto":"Vecinos sensibles (colegio, clínica)"},{"ref":"A34","texto":"Usa maquinaria pesada"},{"ref":"E34","texto":"Zona protegida o de reserva cercana"},{"ref":"I34","texto":"Planta de concreto o trituración en sitio"}]},"firmas":{"elaboro":{"nombre":"C50","cargo":"C51"},"reviso":{"nombre":"G50","cargo":"G51"},"vobo":{"nombre":"K50","cargo":"K51"}}};
export const descubrirFichaAmb = (ws) => descubrirPorEtiquetas(ws, SPEC_FICHA_AMB);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
const numeroOTexto = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : v; };
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texto(v));
export const permisoNuevo = () => ({ aplica: "", resolucion: "", vigencia: "", obs: "", nombre: "" });
export const gestorNuevo = () => ({ empresa: "", nit: "", autorizacion: "", vigencia: "" });

export function escribirFichaAmbEnHoja(ws, d, celdas = CELDAS_FICHA_AMB) {
  const C = celdas;
  for (const k of ["proyecto", "contratante", "contratista", "municipio", "direccion", "tipoObra", "area", "autoridad", "resolucion", "respNombre", "respCargo", "respTelefono", "respCorreo"]) poner(ws, C[k], d[k]);
  for (const k of ["fechaInicio", "finPrevisto", "fechaActo", "vigenteHasta", "ultimoICA"]) poner(ws, C[k], fechaDDMMYYYY(d[k]));
  poner(ws, C.trabajadores, numeroOTexto(d.trabajadores));
  const O = C.opciones || {};
  const noMarcadas = [...marcarOpciones(ws, O.instrumentos, arr(d.instrumentos), {}), ...marcarOpciones(ws, O.condiciones, arr(d.condiciones), {})];
  const T = C.tablas || {};
  const fv = (v) => (esFecha(v) ? fechaDDMMYYYY(v) : v);
  escribirTabla(ws, T.permisos, PERMISOS.map((_, i) => { const x = arr(d.permisos)[i] || {}; return { nombre: /^Otro/.test(PERMISOS[i]) && texto(x.nombre) ? `Otro: ${texto(x.nombre)}` : "", aplica: x.aplica, resolucion: x.resolucion, vigencia: fv(x.vigencia), obs: x.obs }; }));
  escribirTabla(ws, T.gestores, GESTORES.map((_, i) => { const x = arr(d.gestores)[i] || {}; return { empresa: x.empresa, nit: x.nit, autorizacion: x.autorizacion, vigencia: fv(x.vigencia) }; }));
  if (T.permisos) saltoDePagina(ws, T.permisos.fila0 + T.permisos.n - 1);            // la hoja 2 empieza en "4. Condiciones de la obra y del entorno"
  const F = C.firmas || {};
  if (F.elaboro) { poner(ws, F.elaboro.nombre, d.elaboroNombre); poner(ws, F.elaboro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
  if (F.vobo) { poner(ws, F.vobo.nombre, d.voboNombre); poner(ws, F.vobo.cargo, d.voboCargo); }
  return noMarcadas;
}

// Un permiso "Otro" solo cuenta si se le escribió el nombre
export const permisosQueAplican = (d) => PERMISOS.map((p, i) => ({ ...(arr(d.permisos)[i] || {}), nombre: /^Otro/.test(p) ? texto((arr(d.permisos)[i] || {}).nombre) : p })).filter((x) => x.aplica === "Sí" && texto(x.nombre));

export function validarFichaAmb(d) {
  const faltan = [];
  if (!texto(d.proyecto)) faltan.push("el nombre del proyecto");
  if (!texto(d.contratista)) faltan.push("el contratista");
  if (!texto(d.municipio)) faltan.push("el municipio");
  if (!arr(d.instrumentos).length) faltan.push("el instrumento ambiental aplicable (o «Ninguno»)");
  if (d.fechaInicio && d.finPrevisto && d.finPrevisto < d.fechaInicio) faltan.push("que el fin previsto no sea anterior al inicio");
  if (arr(d.permisos).some((p, i) => p && p.aplica === "Sí" && !texto(p.resolucion))) faltan.push("el N° de resolución de cada permiso que aplica");
  if (!texto(d.respNombre)) faltan.push("el responsable ambiental de la obra");
  if (!texto(d.elaboroNombre)) faltan.push("quién elabora la ficha");
  return faltan;
}
// Qué casilla exacta falta (para marcarla en rojo). Va en el mismo orden que validarFichaAmb().
export function camposFaltantesFichaAmb(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!texto(d.contratista)) f.push({ etiqueta: "Contratista", seccion: "datos" });
  if (!texto(d.municipio)) f.push({ etiqueta: "Municipio", seccion: "datos" });
  if (!arr(d.instrumentos).length) f.push({ etiqueta: "Instrumento ambiental", seccion: "instrumento" });
  if (d.fechaInicio && d.finPrevisto && d.finPrevisto < d.fechaInicio) f.push({ etiqueta: "Fin previsto", seccion: "datos" });
  let k = 0;   // en pantalla solo se muestran los datos de los permisos que aplican: el índice cuenta solo esos
  arr(d.permisos).forEach((p) => { if (p && p.aplica === "Sí") { if (!texto(p.resolucion)) f.push({ etiqueta: "N° de resolución", indice: k, seccion: "permisos" }); k++; } });
  if (!texto(d.respNombre)) f.push({ etiqueta: "Nombre del responsable ambiental", seccion: "responsable" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}

// Resumen que queda guardado: de aquí los demás formatos ambientales traen los datos de la obra
export function resumenFichaAmb(d) {
  return {
    id: texto(d.proyecto).toLowerCase(), formato: "ficha-ambiental", proyecto: texto(d.proyecto), contratista: texto(d.contratista), contratante: texto(d.contratante), municipio: texto(d.municipio),
    ubicacion: texto(d.municipio), tipoObra: d.tipoObra || "", instrumentos: arr(d.instrumentos), condiciones: arr(d.condiciones),
    permisos: permisosQueAplican(d).map((p) => ({ nombre: p.nombre, resolucion: texto(p.resolucion), vigencia: p.vigencia || "" })),
    gestores: GESTORES.map((tipo, i) => ({ tipo, ...gestorNuevo(), ...(arr(d.gestores)[i] || {}) })).filter((g) => texto(g.empresa)),
    responsable: { nombre: texto(d.respNombre), cargo: texto(d.respCargo), telefono: texto(d.respTelefono) }, actualizado: new Date().toISOString().slice(0, 10),
  };
}
