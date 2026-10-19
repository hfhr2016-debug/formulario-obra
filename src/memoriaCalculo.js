// Hoja "Memoria de Cálculo": deja escrito de dónde sale cada cantidad (mediciones, deducciones con su descripción y total).
// La usan Presupuesto y Cantidades de Obra. Si algo falla aquí, el Excel principal se genera igual.
export const NOMBRE_HOJA_MEMORIA = "Memoria de Cálculo";

const AZUL = "FF1F3864", CLARO = "FFEAF0F6", AMARILLO = "FFFFF2CC";
const borde = { style: "thin", color: { argb: "FFBFC9D9" } };
const BORDES = { top: borde, left: borde, bottom: borde, right: borde };
const redondear = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
const fmt = (n) => String(redondear(n));
const ANCHOS = [11, 22, 38, 9, 20, 30, 10, 10, 10, 10, 11, 14, 46];
const ENCABEZADOS = ["ID", "Capítulo", "Actividad", "Unidad", "Ubicación / Frente", "Concepto", "Largo", "Ancho", "Alto", "N° elem.", "Factor desp.", "Parcial", "Cálculo"];

// Texto del cálculo de una medición, según el tipo de actividad
function textoMedicion(s, unidad) {
  const u = (unidad || "").toLowerCase();
  const partes = [];
  if (s.tipo === "acero") {
    partes.push(`${fmt(s.metros)} m × ${fmt(s.kgPorMetro)} kg/m`);
  } else if (s.tipo === "directa") {
    partes.push(`${fmt(s.cantidadDirecta)} ${unidad || ""}`.trim());
  } else if (u === "m³" || u === "m3") {
    partes.push(`${fmt(s.largo)} × ${fmt(s.ancho || 1)} × ${fmt(s.alto || 1)}`);
  } else if (u === "m²" || u === "m2") {
    partes.push([s.largo, s.ancho, s.alto].filter((m) => Number(m) > 0).map(fmt).join(" × "));
  } else {
    partes.push(`${fmt(s.largo)}`);
  }
  partes.push(`${fmt(s.numElem || 1)} elem.`);
  if (s.repeticiones && Number(s.repeticiones) !== 1) partes.push(`${fmt(s.repeticiones)} rep.`);
  partes.push(`desp. ${fmt(s.factor || 1)}`);
  return partes.join(" × ");
}

function textoDeduccion(d, unidad) {
  const medidas = [d.largo, d.ancho, d.alto].filter((m) => Number(m) > 0).map(fmt);
  return `${medidas.join(" × ") || "0"} × ${fmt(d.cantidad || 1)} elem.`;
}

/**
 * bloques: [{ id, capitulo, actividad, unidad, subs: [{
 *     ubicacion, tipo: "dim" | "acero" | "directa" | "manual",
 *     largo, ancho, alto, numElem, factor, repeticiones, metros, kgPorMetro, cantidadDirecta,
 *     bruta, deducciones: [{ nombre, largo, ancho, alto, valor }], final }] }]
 */
export function escribirMemoria(workbook, bloques, { proyecto = "", fecha = "", prefijoId = "" } = {}) {
  if (!bloques || !bloques.length) return null;
  const ws = workbook.addWorksheet(NOMBRE_HOJA_MEMORIA);
  try { ANCHOS.forEach((w, i) => { ws.getColumn(i + 1).width = w; }); } catch (e) { /* anchos opcionales */ }

  const poner = (r, c, v, est = {}) => {
    const cel = ws.getCell(r, c);
    cel.value = v;
    if (est.font) cel.font = est.font;
    if (est.fill) cel.fill = est.fill;
    if (est.alignment) cel.alignment = est.alignment;
    if (est.numFmt) cel.numFmt = est.numFmt;
    if (est.border) cel.border = est.border;
    return cel;
  };
  const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

  // Título
  poner(1, 1, "MEMORIA DE CÁLCULO", { font: { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } }, fill: relleno(AZUL), alignment: { horizontal: "center", vertical: "middle" } });
  try { ws.mergeCells(1, 1, 1, 13); } catch (e) {}
  poner(2, 1, `${proyecto ? "Proyecto: " + proyecto + "   ·   " : ""}Generado: ${fecha}   ·   Cada cantidad del formato principal se explica aquí: medición, deducciones y total.`, { font: { name: "Calibri", size: 10, italic: true }, alignment: { vertical: "middle" } });
  try { ws.mergeCells(2, 1, 2, 13); } catch (e) {}

  // Encabezados de columna
  ENCABEZADOS.forEach((t, i) => poner(4, i + 1, t, {
    font: { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } }, fill: relleno(AZUL),
    alignment: { horizontal: "center", vertical: "middle", wrapText: true }, border: BORDES,
  }));
  try { ws.views = [{ state: "frozen", ySplit: 4 }]; } catch (e) {}
  try { ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }; } catch (e) {}

  const base = { font: { name: "Calibri", size: 10 }, border: BORDES, alignment: { vertical: "middle" } };
  const numero = (extra = {}) => ({ ...base, numFmt: "#,##0.00#", alignment: { vertical: "middle", horizontal: "right" }, ...extra });

  let r = 5;
  bloques.forEach((b) => {
    const unidad = b.unidad || "";
    // Fila de título del bloque
    for (let c = 1; c <= 13; c++) poner(r, c, null, { fill: relleno(CLARO), border: BORDES, font: { name: "Calibri", size: 10, bold: true } });
    poner(r, 1, b.id, { fill: relleno(CLARO), border: BORDES, font: { name: "Calibri", size: 10, bold: true } });
    poner(r, 2, b.capitulo || "", { fill: relleno(CLARO), border: BORDES, font: { name: "Calibri", size: 10, bold: true } });
    poner(r, 3, b.actividad || "", { fill: relleno(CLARO), border: BORDES, font: { name: "Calibri", size: 10, bold: true }, alignment: { vertical: "middle", wrapText: true } });
    poner(r, 4, unidad, { fill: relleno(CLARO), border: BORDES, font: { name: "Calibri", size: 10, bold: true }, alignment: { horizontal: "center", vertical: "middle" } });
    r++;

    const finales = [];
    (b.subs || []).forEach((s) => {
      const ubic = s.ubicacion || "";
      const fila = (concepto, extra = {}) => {
        poner(r, 1, b.id, base); poner(r, 2, null, base); poner(r, 3, null, base);
        poner(r, 4, unidad, { ...base, alignment: { horizontal: "center", vertical: "middle" } });
        poner(r, 5, ubic, { ...base, alignment: { vertical: "middle", wrapText: true } });
        poner(r, 6, concepto, { ...base, ...(extra.negrita ? { font: { name: "Calibri", size: 10, bold: true } } : {}), alignment: { vertical: "middle", wrapText: true } });
        for (let c = 7; c <= 11; c++) poner(r, c, null, numero());
        poner(r, 12, null, numero());
        poner(r, 13, null, { ...base, alignment: { vertical: "middle", wrapText: true } });
      };

      if (s.tipo === "manual") {
        fila("Cantidad ingresada directamente", { negrita: true });
        poner(r, 12, redondear(s.final), numero({ numFmt: "#,##0.000", font: { name: "Calibri", size: 10, bold: true }, fill: relleno(AMARILLO) }));
        poner(r, 13, "Sin medición detallada: la cantidad se escribió directamente.", { ...base, alignment: { vertical: "middle", wrapText: true } });
        finales.push(r); r++;
        return;
      }

      // Medición
      const filaMed = r;
      fila(s.tipo === "acero" ? "Medición (acero)" : s.tipo === "directa" ? "Medición (cantidad directa)" : "Medición");
      if (s.tipo === "acero") poner(r, 7, redondear(s.metros), numero());
      else if (s.tipo === "directa") poner(r, 7, redondear(s.cantidadDirecta), numero());
      else {
        poner(r, 7, redondear(s.largo), numero());
        if (s.ancho !== "" && s.ancho != null && Number(s.ancho)) poner(r, 8, redondear(s.ancho), numero());
        if (s.alto !== "" && s.alto != null && Number(s.alto)) poner(r, 9, redondear(s.alto), numero());
      }
      poner(r, 10, redondear(s.numElem || 1), numero());
      poner(r, 11, redondear(s.factor || 1), numero());
      poner(r, 12, redondear(s.bruta), numero({ numFmt: "#,##0.000" }));
      poner(r, 13, textoMedicion(s, unidad), { ...base, alignment: { vertical: "middle", wrapText: true } });
      r++;

      // Deducciones, una por línea, con su descripción
      const ded = s.deducciones || [];
      const primeraDed = r;
      ded.forEach((d) => {
        fila("Deducción: " + (String(d.nombre || "").trim() || "(sin descripción)"));
        poner(r, 7, redondear(d.largo), numero());
        if (Number(d.ancho)) poner(r, 8, redondear(d.ancho), numero());
        if (Number(d.alto)) poner(r, 9, redondear(d.alto), numero());
        poner(r, 10, redondear(d.cantidad || 1), numero());
        poner(r, 12, -redondear(d.valor), numero({ numFmt: "#,##0.000;[Red]-#,##0.000" }));
        poner(r, 13, textoDeduccion(d, unidad), { ...base, alignment: { vertical: "middle", wrapText: true } });
        r++;
      });
      const ultimaDed = r - 1;
      const totalDed = ded.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
      if (ded.length) {
        fila("Total deducciones", { negrita: true });
        poner(r, 12, { formula: `SUM(L${primeraDed}:L${ultimaDed})`, result: -redondear(totalDed) }, numero({ numFmt: "#,##0.000;[Red]-#,##0.000", font: { name: "Calibri", size: 10, bold: true } }));
        r++;
      }

      // Cantidad de este sitio / actividad
      fila("Cantidad", { negrita: true });
      const rangoFin = ded.length ? ultimaDed : filaMed;
      poner(r, 12, { formula: `MAX(0,SUM(L${filaMed}:L${rangoFin}))`, result: redondear(s.final) }, numero({ numFmt: "#,##0.000", font: { name: "Calibri", size: 10, bold: true }, fill: relleno(AMARILLO) }));
      poner(r, 13, "Medición menos deducciones", { ...base, alignment: { vertical: "middle", wrapText: true } });
      finales.push(r);
      r++;
    });

    if ((b.subs || []).length > 1) {
      poner(r, 1, b.id, base); for (let c = 2; c <= 11; c++) poner(r, c, null, base);
      poner(r, 4, unidad, { ...base, alignment: { horizontal: "center", vertical: "middle" } });
      poner(r, 6, "TOTAL ACTIVIDAD", { ...base, font: { name: "Calibri", size: 10, bold: true } });
      const suma = finales.map((f) => `L${f}`).join("+");
      const total = (b.subs || []).reduce((acc, s) => acc + (Number(s.final) || 0), 0);
      poner(r, 12, { formula: suma, result: redondear(total) }, numero({ numFmt: "#,##0.000", font: { name: "Calibri", size: 10, bold: true }, fill: relleno(AMARILLO) }));
      poner(r, 13, "Suma de las ubicaciones; es la cantidad del formato principal", { ...base, alignment: { vertical: "middle", wrapText: true } });
      r++;
    }
    r++;   // fila en blanco entre bloques
  });
  return ws;
}

// ---- Lectura: devuelve Map(id -> [sub]) con la medición y las deducciones (con su descripción) de cada bloque ----
const texto = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return String(v.text || (v.richText ? v.richText.map((x) => x.text).join("") : "") || (v.result != null ? v.result : "") || "");
  return String(v);
};
const numTxt = (v) => {
  if (v == null || v === "") return "";
  const n = typeof v === "object" ? Number(v.result) : Number(v);
  return Number.isFinite(n) && n !== 0 ? String(n) : "";
};

export function leerMemoria(ws) {
  const mapa = new Map();
  if (!ws) return mapa;
  try {
    const ultima = Math.min(ws.rowCount || 0, 6000);
    let actual = null, idActual = "";
    for (let r = 5; r <= ultima; r++) {
      const id = texto(ws.getCell(r, 1).value).trim();
      if (!id) { actual = null; continue; }
      const concepto = texto(ws.getCell(r, 6).value).trim();
      if (!concepto) { idActual = id; actual = null; continue; }   // fila de título del bloque
      if (concepto === "Medición") {
        actual = {
          ubicacion: texto(ws.getCell(r, 5).value),
          largo: numTxt(ws.getCell(r, 7).value), ancho: numTxt(ws.getCell(r, 8).value), alto: numTxt(ws.getCell(r, 9).value),
          numElem: numTxt(ws.getCell(r, 10).value), factor: numTxt(ws.getCell(r, 11).value), deducciones: [],
        };
        if (!mapa.has(id)) mapa.set(id, []);
        mapa.get(id).push(actual);
      } else if (/^Deducción/.test(concepto) && actual) {
        const nombre = concepto.replace(/^Deducción:?\s*/, "").replace(/^\(sin descripción\)$/, "");
        actual.deducciones.push({
          nombre,
          largo: numTxt(ws.getCell(r, 7).value), ancho: numTxt(ws.getCell(r, 8).value), alto: numTxt(ws.getCell(r, 9).value),
          cantidad: numTxt(ws.getCell(r, 10).value),
        });
      } else if (/^Medición \(/.test(concepto)) {
        actual = null;   // acero o cantidad directa: no se reconstruye
      }
    }
  } catch (e) { console.error("No se pudo leer la memoria de cálculo", e); }
  return mapa;
}
