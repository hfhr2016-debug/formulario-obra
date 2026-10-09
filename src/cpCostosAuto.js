// cpCostosAuto.js — Registro de Costos: conceptos con precio de referencia (los mismos de los APU) y cálculo automático de IVA y retenciones.
// Sin pantallas: solo datos y cálculos (así se pueden probar solos).
import { CATALOGO_MATERIALES, CATALOGO_MANO_OBRA, CATALOGO_EQUIPOS } from "./catalogoPrecios";
import { num, texto, pesos, TIPOS_COSTO } from "./cpBase";

const leer = (clave, porDefecto) => { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; } };
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria */ } };

// ---------- Tarifas de IVA y retenciones (valores de partida; cada empresa los ajusta con su contador) ----------
export const CLAVE_CP_TARIFAS = "ryr_cp_tarifas";
// iva: % sobre el valor antes de IVA · rf: retención en la fuente (%) · ica: ReteICA (por mil)
export const TARIFAS_BASE = {
  "Material": { iva: 19, rf: 2.5, ica: 0 },
  "Mano de obra": { iva: 0, rf: 0, ica: 0 },
  "Subcontrato": { iva: 19, rf: 2, ica: 0 },
  "Maquinaria y equipo": { iva: 19, rf: 4, ica: 0 },
  "Transporte": { iva: 0, rf: 1, ica: 0 },
  "Administración": { iva: 19, rf: 4, ica: 0 },
  "Otro": { iva: 19, rf: 0, ica: 0 },
};
export function leerTarifas() {
  const g = leer(CLAVE_CP_TARIFAS, {}) || {};
  const out = {};
  TIPOS_COSTO.forEach((t) => { out[t] = { ...(TARIFAS_BASE[t] || TARIFAS_BASE.Otro), ...((g && g[t]) || {}) }; });
  out.reteIva = !!(g && g.reteIva);
  return out;
}
export const guardarTarifas = (t) => guardar(CLAVE_CP_TARIFAS, t);
export const tarifaDe = (tarifas, tipo) => (tarifas && (tarifas[tipo] || tarifas.Otro)) || TARIFAS_BASE.Otro;

// IVA que le corresponde al valor antes de IVA según el tipo de costo. Sin valor → vacío.
export function ivaAuto(f, tarifas) {
  const b = num(f.valorAntes);
  if (b === null) return "";
  return String(Math.round(b * (num(tarifaDe(tarifas, f.tipo).iva) || 0) / 100));
}
// Retenciones: fuente + ReteICA sobre el valor antes de IVA (+ ReteIVA del 15 % del IVA si la empresa la aplica).
export function retencionesAuto(f, tarifas) {
  const b = num(f.valorAntes);
  if (b === null) return "";
  const t = tarifaDe(tarifas, f.tipo);
  let r = b * (num(t.rf) || 0) / 100 + b * (num(t.ica) || 0) / 1000;
  if (tarifas && tarifas.reteIva) r += (num(f.iva) || 0) * 0.15;
  return String(Math.round(r));
}
// Facturas hechas antes de existir el cálculo automático: lo que ya tienen escrito se respeta (se toma como manual).
export function normalizarManual(f) {
  const g = { ...f };
  if (g.ivaManual === undefined) g.ivaManual = texto(g.iva) !== "";
  if (g.retManual === undefined) g.retManual = texto(g.retenciones) !== "";
  return g;
}
// Aplica el cambio y recalcula lo automático: valor = cantidad × precio (si hay precio de referencia), luego IVA y retenciones.
export function conAutomaticos(f, patch, tarifas) {
  let g = normalizarManual({ ...f, ...patch });
  const c = num(g.cantidad), p = num(g.precioUnit);
  if (!("valorAntes" in patch) && p !== null && c !== null) g.valorAntes = String(Math.round(c * p));
  if (!g.ivaManual) g.iva = ivaAuto(g, tarifas);
  if (!g.retManual) g.retenciones = retencionesAuto(g, tarifas);
  return g;
}

// ---------- Conceptos que generan factura, con su precio de referencia ----------
const claveTexto = (t) => texto(t).toLowerCase().replace(/\s+/g, " ");
const unidadTxt = (u) => (texto(u) ? ` / ${texto(u)}` : "");

// Materiales, mano de obra y equipos del catálogo de los APU + actividades del Presupuesto y APU guardados por la persona.
export function construirConceptos() {
  const mapa = new Map();
  const poner = (o) => {
    const k = `${o.tipo}|${claveTexto(o.texto)}`;
    const cur = mapa.get(k);
    if (!cur) { mapa.set(k, { ...o, precios: [...o.precios] }); return; }
    o.precios.forEach((p) => { if (!cur.precios.some((q) => q.etq === p.etq && q.valor === p.valor)) cur.precios.push(p); });
    cur.capitulo = cur.capitulo || o.capitulo; cur.unidad = cur.unidad || o.unidad;
  };
  const cat = (lista, tipo, etiqueta) => lista.forEach((m) => poner({ texto: texto(m.descripcion), tipo, unidad: texto(m.unidad), capitulo: "", precios: [{ etq: etiqueta, valor: Number(m.precio) || 0 }] }));
  cat(CATALOGO_MATERIALES, "Material", "Catálogo APU");
  cat(CATALOGO_MANO_OBRA, "Mano de obra", "Catálogo APU");
  cat(CATALOGO_EQUIPOS, "Maquinaria y equipo", "Catálogo APU");
  const pres = leer("ryr_presupuesto_cantidades", {}) || {};
  Object.keys(pres).forEach((k) => {
    const a = pres[k] || {};
    if (!texto(a.actividad)) return;
    poner({ texto: texto(a.actividad), tipo: "Subcontrato", unidad: texto(a.unidad), capitulo: texto(a.capitulo), precios: Number(a.precio) ? [{ etq: "Presupuesto", valor: Number(a.precio) }] : [] });
  });
  const apus = leer("ryr_apus_guardados", {}) || {};
  Object.keys(apus).forEach((k) => {
    const a = apus[k] || {};
    if (!texto(a.actividad)) return;
    poner({ texto: texto(a.actividad), tipo: "Subcontrato", unidad: texto(a.unidad), capitulo: "", precios: Number(a.total) ? [{ etq: "APU", valor: Math.round(Number(a.total)) }] : [] });
  });
  const lista = Array.from(mapa.values());
  lista.forEach((o) => { o.detalle = o.precios.length ? `${o.tipo} · ${pesos(o.precios[0].valor)}${unidadTxt(o.unidad)}` : o.tipo; });
  return lista;
}
// Conceptos que ya se usaron en facturas anteriores (sin precio): se ofrecen aunque no estén en ningún catálogo
export function conceptosUsados(facturas) {
  const m = new Map();
  (facturas || []).forEach((f) => { const t = texto(f.concepto); if (t && !m.has(claveTexto(t))) m.set(claveTexto(t), { texto: t, tipo: texto(f.tipo), unidad: texto(f.unidad), capitulo: texto(f.capitulo), precios: [], detalle: "usado antes" }); });
  return Array.from(m.values());
}
// Opciones para la lista: si ya se eligió el tipo de costo, solo los de ese tipo (más los usados antes sin tipo definido).
export function opcionesParaTipo(conceptos, usados, tipo) {
  const t = texto(tipo);
  const base = t ? conceptos.filter((o) => o.tipo === t) : conceptos;
  const propios = usados.filter((o) => !t || !o.tipo || o.tipo === t);
  const vistos = new Set(base.map((o) => claveTexto(o.texto)));
  return [...propios.filter((o) => !vistos.has(claveTexto(o.texto))), ...base];
}
// Busca el concepto exacto (para saber sus precios de referencia)
export function buscarConcepto(conceptos, textoConcepto, tipo) {
  const k = claveTexto(textoConcepto);
  if (!k) return null;
  return conceptos.find((o) => claveTexto(o.texto) === k && (!texto(tipo) || o.tipo === tipo)) || conceptos.find((o) => claveTexto(o.texto) === k) || null;
}
