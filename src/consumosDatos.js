// Control de Consumos (RYR-AM-004): agua, energía y combustibles. Lo común está en sstBase.js.
// La hoja calcula sola el consumo (diferencia entre lecturas) y el resumen del mes; la app solo escribe lecturas.
import { poner, escribirTabla, descubrirPorEtiquetas } from "./sstBase";

export const CODIGO_CONSUMOS = "RYR-AM-004";
export const HOJA_CONSUMOS = "Control de Consumos";
export const FUENTES_AGUA = ["Acueducto", "Carrotanque", "Pozo", "Agua lluvia", "Agua reutilizada"];
export const FUENTES_ENERGIA = ["Red eléctrica", "Planta eléctrica", "Paneles solares"];
export const MODOS_REGISTRO = ["Lectura del medidor", "Consumo del día"];
// Observaciones de AGUA y ENERGÍA: qué equipo o actividad consumió (se elige de la lista o se escribe otro)
export const EQUIPOS_AGUA_ENERGIA = ["Mezcladora de concreto", "Preparación de mortero o pañete", "Curado de concreto", "Riego para control de polvo", "Lavado de llantas o vehículos", "Hidrolavadora", "Limpieza de obra",
  "Campamento, baños y oficina", "Iluminación de obra", "Cortadora de concreto o ladrillo", "Taladro / demoledor", "Pulidora o esmeril", "Soldadura", "Vibrador de concreto", "Motobomba", "Compresor de aire", "Grúa o montacargas",
  "Cambio de medidor", "Fuga o desperdicio detectado", "Otro"];
// Vehículos, maquinaria y equipos que consumen combustible
export const EQUIPOS_COMBUSTIBLE = ["Camioneta", "Camión", "Volqueta", "Retroexcavadora", "Minicargador (Bobcat)", "Excavadora", "Cargador", "Vibrocompactador / rana", "Motoniveladora", "Grúa o montacargas", "Mezcladora de concreto",
  "Bomba de concreto", "Planta eléctrica", "Compresor de aire", "Motobomba", "Cortadora de concreto o ladrillo", "Guadañadora o motosierra", "Moto", "Otro"];
export const EQUIPOS_CONSUMO = [...EQUIPOS_AGUA_ENERGIA, ...EQUIPOS_COMBUSTIBLE.filter((x) => !EQUIPOS_AGUA_ENERGIA.includes(x))];
export const TIPOS_COMBUSTIBLE = ["Diésel (ACPM)", "Gasolina", "Otro"];
// La lista desplegable (BuscadorLista) espera objetos { texto }
export const comoOpciones = (lista) => lista.map((t) => ({ texto: t }));
export const MESES_NOMBRE = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const SPEC_CONSUMOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["mes", "Mes", "I", "K"], ["anio", "Año", "L", "M"], ["contratista", "Contratista / Empresa", "A", "C"],
    ["trabajadores", "Trabajadores (promedio)", "I", "K"], ["medidorAgua", "Medidor de agua N°", "A", "C"], ["medidorEnergia", "Medidor de energía N°", "E", "G"],
    ["responsable", "Responsable del registro", "J", "L"], ["observaciones", "Observaciones y medidas de ahorro", "A", "C"],
  ],
  tablas: [
    { clave: "dias", cabecera: "Fecha", fin: "TOTAL DEL MES", finEmpieza: true,
      columnas: { fecha: "A", aguaLect: "B", aguaFuente: "D", enLect: "E", enFuente: "G", obs: "H", diesel: "I", gasolina: "J", otro: "K", equipo: "L" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. OBSERVACIONES Y FIRMAS", personas: [{ clave: "registro", col: "C" }, { clave: "reviso", col: "J" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CONSUMOS = {"proyecto":"C11","mes":"K11","anio":"M11","contratista":"C12","trabajadores":"K12","medidorAgua":"C13","medidorEnergia":"G13","responsable":"L13","observaciones":"C60","tablas":{"dias":{"fila0":18,"n":32,"columnas":{"fecha":"A","aguaLect":"B","aguaFuente":"D","enLect":"E","enFuente":"G","obs":"H","diesel":"I","gasolina":"J","otro":"K","equipo":"L"}}},"firmas":{"registro":{"nombre":"C63","cargo":"C64"},"reviso":{"nombre":"J63","cargo":"J64"}}};
export const descubrirConsumos = (ws) => descubrirPorEtiquetas(ws, SPEC_CONSUMOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const redondear = (n) => Math.round(n * 1000) / 1000;
export const diaNuevo = (base = {}) => ({ fecha: "", aguaLect: "", aguaFuente: "", enLect: "", enFuente: "", obs: "", comb: [], ...base });
export const combNuevo = (base = {}) => ({ equipo: "", tipo: TIPOS_COMBUSTIBLE[0], galones: "", ...base });
// Combustible del día: lista [{ equipo, tipo, galones }]. Los borradores antiguos (diésel / gasolina / otro + equipo en el mismo día) se convierten solos.
export function entradasComb(x) {
  if (Array.isArray(x.comb)) return x.comb;
  const out = [];
  [["diesel", TIPOS_COMBUSTIBLE[0]], ["gasolina", TIPOS_COMBUSTIBLE[1]], ["otro", TIPOS_COMBUSTIBLE[2]]].forEach(([k, tipo]) => { if (texto(x[k]) !== "") out.push({ equipo: texto(x.equipo), tipo, galones: x[k] }); });
  if (!out.length && texto(x.equipo)) out.push({ equipo: texto(x.equipo), tipo: TIPOS_COMBUSTIBLE[0], galones: "" });
  return out;
}
const claveTipo = (t) => (/di[eé]sel|acpm/i.test(t) ? "diesel" : /gasolina/i.test(t) ? "gasolina" : "otro");
// Lo que va a la hoja en la fila del día: galones por tipo y el texto de "equipo o actividad" (varios equipos: «Volqueta (30 gal diésel); Planta eléctrica (5 gal gasolina)»)
export function combDelDia(x) {
  const es = entradasComb(x); const tot = { diesel: null, gasolina: null, otro: null };
  es.forEach((e) => { const g = num(e.galones); if (g !== null) { const k = claveTipo(e.tipo); tot[k] = redondear((tot[k] || 0) + g); } });
  const nombres = es.filter((e) => texto(e.equipo) || num(e.galones) !== null);
  const equipo = !nombres.some((e) => texto(e.equipo)) ? "" : nombres.length <= 1 ? texto((nombres[0] || {}).equipo)
    : nombres.map((e) => { const g = num(e.galones); const k = claveTipo(e.tipo); const t = k === "diesel" ? "diésel" : k === "gasolina" ? "gasolina" : "otro"; return `${texto(e.equipo) || "Sin equipo"}${g !== null ? ` (${fmtN(g)} gal ${t})` : ""}`; }).join("; ");
  return { ...tot, equipo };
}
const vacio = (x) => !(texto(x.aguaLect) || texto(x.enLect) || texto(x.obs) || entradasComb(x).some((e) => texto(e.equipo) || texto(e.galones) !== ""));
export const diasConDatos = (d) => arr(d.dias).filter((x) => !vacio(x)).sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
export const mesDe = (iso) => { const m = /^(\d{4})-(\d{2})/.exec(texto(iso)); return m ? { anio: Number(m[1]), mes: Number(m[2]) } : null; };
export const nombreMes = (ym) => { const m = mesDe(ym); return m ? MESES_NOMBRE[m.mes - 1] : ""; };
const fmtN = (n) => String(n).replace(".", ",");
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ¿Lo que se anota cada día es la lectura del medidor o el consumo del día? (por defecto, la lectura)
export const modoConsumo = (d) => d.modo === "Consumo del día";
// Lecturas que van a la hoja y consumo de cada día (listas paralelas a diasConDatos()).
//  · «Lectura del medidor»: lo escrito es la lectura; el consumo es la diferencia con la anterior (el primer día, con la lectura inicial si se anotó).
//  · «Consumo del día»: lo escrito es el consumo; la lectura se arma sumando desde la lectura inicial (0 si no se anotó), para que la hoja calcule lo mismo.
export function lecturasYConsumos(d) {
  const ds = diasConDatos(d), porConsumo = modoConsumo(d);
  const una = (campo, ini) => {
    const iniN = num(ini); let previa = iniN, acum = porConsumo ? (iniN === null ? 0 : iniN) : null;
    const lecturas = [], consumos = [];
    ds.forEach((x) => {
      const v = num(x[campo]);
      if (porConsumo) { if (v === null) { lecturas.push(null); consumos.push(null); } else { acum = redondear(acum + v); lecturas.push(acum); consumos.push(redondear(v)); } }
      else { lecturas.push(v); consumos.push(v !== null && previa !== null ? redondear(v - previa) : null); if (v !== null) previa = v; }
    });
    const hay = lecturas.some((x) => x !== null);
    return { lecturas, consumos, ini: porConsumo ? (hay ? (iniN === null ? 0 : iniN) : null) : iniN };
  };
  return { agua: una("aguaLect", d.iniAgua), energia: una("enLect", d.iniEnergia) };
}
// Consumo de cada día (lista paralela a diasConDatos())
export function consumosCalculados(d) {
  const r = lecturasYConsumos(d);
  return r.agua.consumos.map((a, i) => ({ agua: a, energia: r.energia.consumos[i] }));
}
export function totalesConsumos(d) {
  const cs = consumosCalculados(d); const ds = diasConDatos(d);
  const suma = (f) => { const v = cs.map(f).filter((x) => x !== null); return v.length ? redondear(v.reduce((s, x) => s + x, 0)) : null; };
  const comb = (k) => { const v = ds.map((x) => combDelDia(x)[k]).filter((x) => x !== null); return v.length ? redondear(v.reduce((s, x) => s + x, 0)) : null; };
  return { agua: suma((c) => c.agua), energia: suma((c) => c.energia), diesel: comb("diesel"), gasolina: comb("gasolina"), otro: comb("otro") };
}

// Problemas de coherencia: [{ indice (en diasConDatos), tipo, texto }]
export function problemasConsumos(d) {
  const ds = diasConDatos(d); const p = []; const ym = texto(d.mes);
  let pa = null, pe = null;
  ds.forEach((x, i) => {
    if (x.fecha && ym && x.fecha.slice(0, 7) !== ym) p.push({ i, tipo: "fecha", texto: `la fecha del día ${i + 1} no es del mes ${nombreMes(ym)} ${mesDe(ym).anio}` });
    if (x.fecha && i > 0 && ds[i - 1].fecha === x.fecha) p.push({ i, tipo: "fecha", texto: `la fecha ${x.fecha.split("-").reverse().join("/")} está repetida` });
    const cambio = /medidor/i.test(`${x.obs || ""} ${combDelDia(x).equipo}`);
    const a = num(x.aguaLect), e = num(x.enLect);
    const porConsumo = modoConsumo(d);
    const ini = (v) => { const n = num(v); return n === null ? null : n; };
    if (i === 0) { pa = ini(d.iniAgua); pe = ini(d.iniEnergia); }
    if (!porConsumo && a !== null && pa !== null && a < pa && !cambio) p.push({ i, tipo: "agua", texto: `revisa la lectura de agua del día ${i + 1}: ${fmtN(a)} es menor que la lectura anterior (${fmtN(pa)}). Si lo que anotas cada día es el consumo y no la lectura del medidor, elige «Consumo del día» en «Qué anotas cada día». Si cambiaron el medidor, anótalo en las observaciones del día (elige «Cambio de medidor»)` });
    if (!porConsumo && e !== null && pe !== null && e < pe && !cambio) p.push({ i, tipo: "energia", texto: `revisa la lectura de energía del día ${i + 1}: ${fmtN(e)} es menor que la lectura anterior (${fmtN(pe)}). Si lo que anotas cada día es el consumo y no la lectura del medidor, elige «Consumo del día» en «Qué anotas cada día». Si cambiaron el medidor, anótalo en las observaciones del día (elige «Cambio de medidor»)` });
    if (a !== null) pa = a; if (e !== null) pe = e;
  });
  return p;
}
// Avisos que no bloquean: lectura que falta entre dos días (la hoja no calcula el consumo de ese día ni del siguiente)
export function avisosConsumos(d) {
  const ds = diasConDatos(d); const av = [];
  for (let i = 1; i < ds.length; i++) {
    if (ds[i - 1].fecha && ds[i].fecha) { const n = diasEntre(ds[i - 1].fecha, ds[i].fecha); if (n > 1) av.push(`Entre el ${ds[i - 1].fecha.split("-").reverse().join("/")} y el ${ds[i].fecha.split("-").reverse().join("/")} hay ${n} días: el consumo de ese tramo sale en una sola cifra.`); }
    const que = modoConsumo(d) ? "el consumo" : "la lectura";
    if (num(ds[i - 1].aguaLect) !== null && num(ds[i].aguaLect) === null) av.push(`Falta ${que} de agua del día ${i + 1}: la hoja no calculará ese consumo ni el del día siguiente.`);
    if (num(ds[i - 1].enLect) !== null && num(ds[i].enLect) === null) av.push(`Falta ${que} de energía del día ${i + 1}: la hoja no calculará ese consumo ni el del día siguiente.`);
  }
  return av;
}

export function escribirConsumosEnHoja(ws, d, celdas = CELDAS_CONSUMOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "medidorAgua", "medidorEnergia", "observaciones"]) poner(ws, C[k], d[k]);
  const m = mesDe(d.mes); poner(ws, C.mes, m ? MESES_NOMBRE[m.mes - 1] : ""); poner(ws, C.anio, m ? m.anio : "");
  const t = num(d.trabajadores); poner(ws, C.trabajadores, t === null ? "" : t);
  poner(ws, C.responsable, d.elaboroNombre);
  const lc = lecturasYConsumos(d), ds = diasConDatos(d);
  const filas = ds.map((x, i) => {
    const cb = combDelDia(x);
    const f = { equipo: cb.equipo, obs: x.obs, aguaFuente: x.aguaFuente, enFuente: x.enFuente };
    const [dd, mm, aa] = (x.fecha || "").split("-").reverse(); f.fecha = x.fecha ? `${dd}/${mm}/${aa}` : "";
    f.aguaLect = lc.agua.lecturas[i] === null ? "" : lc.agua.lecturas[i]; f.enLect = lc.energia.lecturas[i] === null ? "" : lc.energia.lecturas[i];
    for (const k of ["diesel", "gasolina", "otro"]) f[k] = cb[k] === null ? "" : cb[k];
    return f;
  });
  filas.unshift({ aguaLect: lc.agua.ini === null ? "" : lc.agua.ini, enLect: lc.energia.ini === null ? "" : lc.energia.ini });     // primera fila de la hoja: lectura inicial (cierre del mes anterior)
  escribirTabla(ws, (C.tablas || {}).dias, filas);
  const F = C.firmas || {};
  if (F.registro) { poner(ws, F.registro.nombre, d.elaboroNombre); poner(ws, F.registro.cargo, d.elaboroCargo); }
  if (F.reviso) { poner(ws, F.reviso.nombre, d.revisoNombre); poner(ws, F.reviso.cargo, d.revisoCargo); }
}

export function validarConsumos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("el nombre del proyecto");
  if (!mesDe(d.mes)) f.push("el mes del registro");
  if (!diasConDatos(d).length) f.push("al menos un día con lecturas o combustible");
  else {
    if (diasConDatos(d).some((x) => !x.fecha)) f.push("la fecha de cada día");
    for (const p of problemasConsumos(d)) f.push(p.texto);
  }
  if (d.trabajadores !== "" && num(d.trabajadores) !== null && num(d.trabajadores) <= 0) f.push("los trabajadores (promedio) mayores que 0, o déjalos vacíos");
  if (!texto(d.elaboroNombre)) f.push("quién registra");
  return f;
}
export function camposFaltantesConsumos(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!mesDe(d.mes)) f.push({ etiqueta: "Mes del registro", seccion: "datos" });
  const todos = arr(d.dias); const ds = diasConDatos(d);
  const idx = (x) => todos.indexOf(x);
  if (!ds.length) f.push({ etiqueta: "Fecha del día", indice: 0, seccion: "dias" });
  else {
    ds.forEach((x) => { if (!x.fecha) f.push({ etiqueta: "Fecha del día", indice: idx(x), seccion: "dias" }); });
    for (const p of problemasConsumos(d)) {
      const x = ds[p.i]; const campo = p.tipo === "fecha" ? "Fecha del día" : p.tipo === "agua" ? "Lectura de agua (m³)" : "Lectura de energía (kWh)";
      f.push({ etiqueta: campo, indice: idx(x), seccion: "dias" });
    }
  }
  if (d.trabajadores !== "" && num(d.trabajadores) !== null && num(d.trabajadores) <= 0) f.push({ etiqueta: "Trabajadores (promedio)", seccion: "datos" });
  if (!texto(d.elaboroNombre)) f.push({ etiqueta: "Nombre de quien registra", seccion: "firmas" });
  return f;
}

export function resumenConsumos(d) {
  const ds = diasConDatos(d); const t = totalesConsumos(d);
  const lc = lecturasYConsumos(d);
  const ultimo = (k) => { const l = k === "aguaLect" ? lc.agua.lecturas : lc.energia.lecturas; for (let i = l.length - 1; i >= 0; i--) if (l[i] !== null) return l[i]; return null; };
  const prom = (total, n) => (total !== null && n > 0 ? redondear(total / n) : null);
  const nCons = (f) => consumosCalculados(d).filter((c) => c[f] !== null).length;
  const tr = num(d.trabajadores);
  return {
    id: `${texto(d.proyecto).toLowerCase()}|${d.mes}`, formato: "consumos", proyecto: texto(d.proyecto), mes: d.mes, dias: ds.length, trabajadores: tr,
    agua: t.agua, energia: t.energia, diesel: t.diesel, gasolina: t.gasolina, otro: t.otro,
    promAgua: prom(t.agua, nCons("agua")), promEnergia: prom(t.energia, nCons("energia")),
    ultimaLecturaAgua: ultimo("aguaLect"), ultimaLecturaEnergia: ultimo("enLect"), ultimaFecha: ds.length ? ds[ds.length - 1].fecha : "",
    medidorAgua: texto(d.medidorAgua), medidorEnergia: texto(d.medidorEnergia),
  };
}
