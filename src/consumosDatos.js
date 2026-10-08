// Control de Consumos (RYR-AM-004): agua, energía y combustibles. Lo común está en sstBase.js.
// La hoja calcula sola el consumo (diferencia entre lecturas) y el resumen del mes; la app solo escribe lecturas.
import { poner, escribirTabla, descubrirPorEtiquetas } from "./sstBase";

export const CODIGO_CONSUMOS = "RYR-AM-004";
export const HOJA_CONSUMOS = "Control de Consumos";
export const FUENTES_AGUA = ["Acueducto", "Carrotanque", "Pozo", "Agua lluvia", "Agua reutilizada"];
export const FUENTES_ENERGIA = ["Red eléctrica", "Planta eléctrica", "Paneles solares"];
export const MESES_NOMBRE = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const SPEC_CONSUMOS = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "C"], ["mes", "Mes", "H", "J"], ["anio", "Año", "K", "L"], ["contratista", "Contratista / Empresa", "A", "C"],
    ["trabajadores", "Trabajadores (promedio)", "H", "J"], ["medidorAgua", "Medidor de agua N°", "A", "C"], ["medidorEnergia", "Medidor de energía N°", "E", "G"],
    ["responsable", "Responsable del registro", "I", "K"], ["observaciones", "Observaciones y medidas de ahorro", "A", "C"],
  ],
  tablas: [
    { clave: "dias", cabecera: "Fecha", fin: "El primer día", finEmpieza: true,
      columnas: { fecha: "A", aguaLect: "B", aguaFuente: "D", enLect: "E", enFuente: "G", diesel: "H", gasolina: "I", otro: "J", equipo: "K" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "4. OBSERVACIONES Y FIRMAS", personas: [{ clave: "registro", col: "C" }, { clave: "reviso", col: "I" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CONSUMOS = {"proyecto":"C11","mes":"J11","anio":"L11","contratista":"C12","trabajadores":"J12","medidorAgua":"C13","medidorEnergia":"G13","responsable":"K13","observaciones":"C57","tablas":{"dias":{"fila0":17,"n":31,"columnas":{"fecha":"A","aguaLect":"B","aguaFuente":"D","enLect":"E","enFuente":"G","diesel":"H","gasolina":"I","otro":"J","equipo":"K"}}},"firmas":{"registro":{"nombre":"C60","cargo":"C61"},"reviso":{"nombre":"I60","cargo":"I61"}}};
export const descubrirConsumos = (ws) => descubrirPorEtiquetas(ws, SPEC_CONSUMOS);

const arr = (a) => (Array.isArray(a) ? a : []);
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();
export const num = (v) => { const t = texto(v).replace(",", "."); return t !== "" && !isNaN(Number(t)) ? Number(t) : null; };
const redondear = (n) => Math.round(n * 1000) / 1000;
export const diaNuevo = (base = {}) => ({ fecha: "", aguaLect: "", aguaFuente: "", enLect: "", enFuente: "", diesel: "", gasolina: "", otro: "", equipo: "", ...base });
const vacio = (x) => !(texto(x.aguaLect) || texto(x.enLect) || texto(x.diesel) || texto(x.gasolina) || texto(x.otro) || texto(x.equipo));
export const diasConDatos = (d) => arr(d.dias).filter((x) => !vacio(x)).sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
export const mesDe = (iso) => { const m = /^(\d{4})-(\d{2})/.exec(texto(iso)); return m ? { anio: Number(m[1]), mes: Number(m[2]) } : null; };
export const nombreMes = (ym) => { const m = mesDe(ym); return m ? MESES_NOMBRE[m.mes - 1] : ""; };
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// Consumo = lectura − lectura del registro anterior (igual que la hoja). Devuelve una lista paralela a diasConDatos().
export function consumosCalculados(d) {
  const ds = diasConDatos(d); let pa = null, pe = null;
  return ds.map((x) => {
    const a = num(x.aguaLect), e = num(x.enLect);
    const r = { agua: a !== null && pa !== null ? redondear(a - pa) : null, energia: e !== null && pe !== null ? redondear(e - pe) : null };
    pa = a; pe = e; return r;
  });
}
export function totalesConsumos(d) {
  const cs = consumosCalculados(d); const ds = diasConDatos(d);
  const suma = (f) => { const v = cs.map(f).filter((x) => x !== null); return v.length ? redondear(v.reduce((s, x) => s + x, 0)) : null; };
  const comb = (k) => { const v = ds.map((x) => num(x[k])).filter((x) => x !== null); return v.length ? redondear(v.reduce((s, x) => s + x, 0)) : null; };
  return { agua: suma((c) => c.agua), energia: suma((c) => c.energia), diesel: comb("diesel"), gasolina: comb("gasolina"), otro: comb("otro") };
}

// Problemas de coherencia: [{ indice (en diasConDatos), tipo, texto }]
export function problemasConsumos(d) {
  const ds = diasConDatos(d); const p = []; const ym = texto(d.mes);
  let pa = null, pe = null;
  ds.forEach((x, i) => {
    if (x.fecha && ym && x.fecha.slice(0, 7) !== ym) p.push({ i, tipo: "fecha", texto: `la fecha del día ${i + 1} no es del mes ${nombreMes(ym)} ${mesDe(ym).anio}` });
    if (x.fecha && i > 0 && ds[i - 1].fecha === x.fecha) p.push({ i, tipo: "fecha", texto: `la fecha ${x.fecha.split("-").reverse().join("/")} está repetida` });
    const cambio = /medidor/i.test(x.equipo || "");
    const a = num(x.aguaLect), e = num(x.enLect);
    if (a !== null && pa !== null && a < pa && !cambio) p.push({ i, tipo: "agua", texto: `la lectura de agua del día ${i + 1} es menor que la anterior (si cambiaron el medidor, anótalo en «Equipo o actividad»)` });
    if (e !== null && pe !== null && e < pe && !cambio) p.push({ i, tipo: "energia", texto: `la lectura de energía del día ${i + 1} es menor que la anterior (si cambiaron el medidor, anótalo en «Equipo o actividad»)` });
    if (a !== null) pa = a; if (e !== null) pe = e;
  });
  return p;
}
// Avisos que no bloquean: lectura que falta entre dos días (la hoja no calcula el consumo de ese día ni del siguiente)
export function avisosConsumos(d) {
  const ds = diasConDatos(d); const av = [];
  for (let i = 1; i < ds.length; i++) {
    if (ds[i - 1].fecha && ds[i].fecha) { const n = diasEntre(ds[i - 1].fecha, ds[i].fecha); if (n > 1) av.push(`Entre el ${ds[i - 1].fecha.split("-").reverse().join("/")} y el ${ds[i].fecha.split("-").reverse().join("/")} hay ${n} días: el consumo de ese tramo sale en una sola cifra.`); }
    if (num(ds[i - 1].aguaLect) !== null && num(ds[i].aguaLect) === null) av.push(`Falta la lectura de agua del día ${i + 1}: la hoja no calculará ese consumo ni el del día siguiente.`);
    if (num(ds[i - 1].enLect) !== null && num(ds[i].enLect) === null) av.push(`Falta la lectura de energía del día ${i + 1}: la hoja no calculará ese consumo ni el del día siguiente.`);
  }
  return av;
}

export function escribirConsumosEnHoja(ws, d, celdas = CELDAS_CONSUMOS) {
  const C = celdas;
  for (const k of ["proyecto", "contratista", "medidorAgua", "medidorEnergia", "observaciones"]) poner(ws, C[k], d[k]);
  const m = mesDe(d.mes); poner(ws, C.mes, m ? MESES_NOMBRE[m.mes - 1] : ""); poner(ws, C.anio, m ? m.anio : "");
  const t = num(d.trabajadores); poner(ws, C.trabajadores, t === null ? "" : t);
  poner(ws, C.responsable, d.elaboroNombre);
  const filas = diasConDatos(d).map((x) => {
    const f = { equipo: x.equipo, aguaFuente: x.aguaFuente, enFuente: x.enFuente };
    const [dd, mm, aa] = (x.fecha || "").split("-").reverse(); f.fecha = x.fecha ? `${dd}/${mm}/${aa}` : "";
    for (const k of ["aguaLect", "enLect", "diesel", "gasolina", "otro"]) { const n = num(x[k]); f[k] = n === null ? "" : n; }
    return f;
  });
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
  const ultimo = (k) => { for (let i = ds.length - 1; i >= 0; i--) if (num(ds[i][k]) !== null) return num(ds[i][k]); return null; };
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
