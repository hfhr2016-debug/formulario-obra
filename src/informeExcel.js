// informeExcel.js — escribe el informe mensual de calidad sobre la plantilla «plantilla-cal-informe.xlsx» (misma cabecera, logo, colores y
// CONTROL DOCUMENTAL que los demás formatos de Calidad). Las secciones y las filas dependen del mes, así que se agregan debajo de los datos generales.
import { poner, estilar, fechaDDMMYYYY, fechaHoyISO } from "./sstBase";
const CAFE = "FF5C2A08", CLARO = "FFFFF2CC", TINTA = "FF1B2A45", BLANCO = "FFFFFFFF";
const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const lado = { style: "thin", color: { argb: "FF8C8C8C" } };
const borde = { top: lado, left: lado, bottom: lado, right: lado };
const lineas = (t, ancho) => String(t || "").split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / ancho)), 0);
const ddmmyyyy = (iso) => String(iso || "").split("-").reverse().join("/");
// Anchos (caracteres) de los grupos de columnas de la plantilla: A:C · D · E:I
const ANCHO = { concepto: 63, valor: 26, detalle: 90, tipo: 19, ref: 44 };

export function escribirInforme(ws, inf, { obraDatos = {}, observaciones = "", firmas = {} } = {}) {
  poner(ws, "H7", fechaDDMMYYYY(fechaHoyISO()));
  poner(ws, "C11", inf.obra); poner(ws, "F11", obraDatos.contrato); poner(ws, "I11", inf.periodo);
  poner(ws, "C12", obraDatos.contratista); poner(ws, "F12", obraDatos.ubicacion); poner(ws, "I12", ddmmyyyy(inf.corte));
  let r = 13;
  const unir = (desde, hasta, fila = r) => { if (desde !== hasta) ws.mergeCells(`${desde}${fila}:${hasta}${fila}`); };
  const celda = (ref, valor, { negrilla = false, tam = 10, color = null, fondo = null, h = "left", v = "middle", ajustar = false, caja = true } = {}) => {
    const c = ws.getCell(ref); c.value = valor === undefined || valor === null ? "" : valor;
    estilar(c, { font: { name: "Calibri", size: tam, bold: negrilla, ...(color ? { color: { argb: color } } : {}) }, alignment: { horizontal: h, vertical: v, wrapText: ajustar }, ...(fondo ? { fill: relleno(fondo) } : {}), ...(caja ? { border: borde } : {}) });
    return c;
  };
  const barra = (titulo) => {
    unir("A", "I"); celda(`A${r}`, titulo.toUpperCase(), { negrilla: true, tam: 11, color: BLANCO, fondo: CAFE });
    ws.getRow(r).height = 16.5; r++;
  };
  const rellenarBordes = (desde, hasta) => { for (let c = desde.charCodeAt(0); c <= hasta.charCodeAt(0); c++) ws.getCell(`${String.fromCharCode(c)}${r}`).border = borde; };
  const encabezados = (grupos) => {
    for (const [d, h, t] of grupos) { unir(d, h); celda(`${d}${r}`, t, { negrilla: true, tam: 9, color: TINTA, fondo: CLARO, h: "center", ajustar: true }); }
    rellenarBordes("A", "I"); ws.getRow(r).height = 22; r++;
  };

  for (const s of inf.secciones) {
    barra(s.titulo);
    encabezados([["A", "C", "Concepto"], ["D", "D", "Valor"], ["E", "I", "Detalle"]]);
    for (const [concepto, valor, nota] of s.filas) {
      unir("A", "C"); celda(`A${r}`, concepto, { ajustar: true });
      celda(`D${r}`, valor, { negrilla: true, h: typeof valor === "string" && /^\$/.test(valor.trim()) ? "right" : "center" });
      unir("E", "I"); celda(`E${r}`, nota || "", { ajustar: true });
      rellenarBordes("A", "I");
      ws.getRow(r).height = Math.max(20, Math.max(lineas(concepto, ANCHO.concepto * 1.05), lineas(nota, ANCHO.detalle * 1.05)) * 13 + 4); r++;
    }
    r++;
  }

  barra("Atención requerida");
  if (!inf.detalle.length) {
    unir("A", "I"); celda(`A${r}`, "Sin novedades: no hay rechazos, incumplimientos ni vencimientos en este periodo.", { ajustar: true });
    rellenarBordes("A", "I"); ws.getRow(r).height = 22; r++;
  } else {
    encabezados([["A", "B", "Tipo"], ["C", "C", "Referencia"], ["D", "D", "Estado"], ["E", "I", "Detalle"]]);
    for (const fila of inf.detalle) {
      unir("A", "B"); celda(`A${r}`, fila[0] || "", { ajustar: true });
      celda(`C${r}`, fila[1] || "", { ajustar: true });
      celda(`D${r}`, fila[2] || "", { h: "center", ajustar: true });
      unir("E", "I"); celda(`E${r}`, fila[3] || "", { ajustar: true });
      rellenarBordes("A", "I");
      ws.getRow(r).height = Math.max(20, Math.max(lineas(fila[0], ANCHO.tipo), lineas(fila[1], ANCHO.ref), lineas(fila[3], ANCHO.detalle * 1.05)) * 13 + 4); r++;
    }
  }
  r++;

  barra("Observaciones y conclusiones del periodo");
  unir("A", "I"); celda(`A${r}`, observaciones || "", { ajustar: true, v: "top" });
  rellenarBordes("A", "I"); ws.getRow(r).height = Math.max(60, lineas(observaciones, 170) * 13 + 8); r += 2;

  barra("Firmas");
  const f1 = firmas.elaboro || {}, f2 = firmas.reviso || {};
  const bloques = [["A", "C", "ELABORÓ — INGENIERO / INSPECTOR DE CALIDAD", f1], ["D", "I", "REVISÓ — RESIDENTE DE OBRA / GERENCIA", f2]];
  for (const [d, h, t] of bloques) { unir(d, h); celda(`${d}${r}`, t, { negrilla: true, tam: 9, color: TINTA, fondo: CLARO, h: "center" }); }
  rellenarBordes("A", "I"); r++;
  const filas = [["Firma:", () => ""], ["Nombre:", (f) => f.nombre || ""], ["Cargo:", (f) => f.cargo || ""]];
  for (const [rot, de] of filas) {
    for (const [d, h, , f] of bloques) { unir(d, h); celda(`${d}${r}`, `${rot} ${de(f)}`.trim(), { negrilla: false, tam: 9, v: rot === "Firma:" ? "top" : "middle" }); }
    rellenarBordes("A", "I"); ws.getRow(r).height = rot === "Firma:" ? 42 : 21; r++;
  }
  r++;
  unir("A", "D"); celda(`A${r}`, `REV. ${fechaDDMMYYYY(fechaHoyISO())}`, { negrilla: true, tam: 7.5, color: "FF999999", caja: false });
  try { ws.pageSetup = { ...(ws.pageSetup || {}), orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }; } catch (e) { /* sin ajuste */ }
  return ws;
}
