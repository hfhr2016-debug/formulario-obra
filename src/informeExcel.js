// informeExcel.js — escribe el informe mensual de calidad en un libro de Excel nuevo (hojas «Informe» y «Atención requerida»).
const NAVY = "FF1B2A45", ORO = "FFD9A233", GRIS = "FFF2F2F2", BLANCO = "FFFFFFFF";
const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const borde = { top: { style: "thin", color: { argb: "FFD0D3D8" } }, left: { style: "thin", color: { argb: "FFD0D3D8" } }, bottom: { style: "thin", color: { argb: "FFD0D3D8" } }, right: { style: "thin", color: { argb: "FFD0D3D8" } } };
const lineas = (t, ancho) => Math.max(1, Math.ceil(String(t || "").length / ancho));
const ddmmyyyy = (iso) => String(iso || "").split("-").reverse().join("/");

export function escribirInforme(wb, inf, { obraDatos = {}, observaciones = "", firmas = {}, logoBase64 = null } = {}) {
  const ws = wb.addWorksheet("Informe");
  [44, 16, 22, 40].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  let r = 1;
  const unir = (fila, desde, hasta) => ws.mergeCells(`${desde}${fila}:${hasta}${fila}`);
  unir(r, "A", "D"); let c = ws.getCell(`A${r}`); c.value = "INFORME MENSUAL DE CALIDAD"; c.font = { bold: true, size: 15, color: { argb: BLANCO } }; c.fill = relleno(NAVY); c.alignment = { vertical: "middle", horizontal: "center" }; ws.getRow(r).height = 36;
  r++; unir(r, "A", "D"); c = ws.getCell(`A${r}`); c.value = "Reformas y Remodelaciones · Control de calidad en obra"; c.font = { size: 10, color: { argb: NAVY } }; c.fill = relleno(ORO); c.alignment = { horizontal: "center" };
  if (logoBase64) { try { const id = wb.addImage({ base64: logoBase64, extension: "png" }); ws.addImage(id, { tl: { col: 0.1, row: 0.1 }, ext: { width: 44, height: 33 } }); } catch (e) { /* sin logo */ } }
  r += 2;
  const dato = (rotulo, valor) => { ws.getCell(`A${r}`).value = rotulo; ws.getCell(`A${r}`).font = { bold: true, color: { argb: NAVY } }; unir(r, "B", "D"); const v = ws.getCell(`B${r}`); v.value = valor || ""; v.alignment = { horizontal: "left" }; r++; };
  dato("Proyecto / obra", inf.obra); dato("Contrato N°", obraDatos.contrato); dato("Contratista / empresa", obraDatos.contratista); dato("Ubicación", obraDatos.ubicacion); dato("Periodo", inf.periodo); dato("Fecha de corte", ddmmyyyy(inf.corte));
  r++;
  for (const s of inf.secciones) {
    unir(r, "A", "D"); c = ws.getCell(`A${r}`); c.value = s.titulo.toUpperCase(); c.font = { bold: true, color: { argb: BLANCO } }; c.fill = relleno(NAVY); r++;
    ws.getCell(`A${r}`).value = "Concepto"; ws.getCell(`B${r}`).value = "Valor"; ws.getCell(`C${r}`).value = "Detalle"; unir(r, "C", "D");
    for (const col of ["A", "B", "C", "D"]) { const h = ws.getCell(`${col}${r}`); h.font = { bold: true, color: { argb: NAVY } }; h.fill = relleno(GRIS); h.border = borde; } r++;
    for (const [concepto, valor, nota] of s.filas) {
      ws.getCell(`A${r}`).value = concepto; const v = ws.getCell(`B${r}`); v.value = valor; v.alignment = { horizontal: "center" }; v.font = { bold: true };
      unir(r, "C", "D"); ws.getCell(`C${r}`).value = nota || ""; ws.getCell(`C${r}`).alignment = { wrapText: true, vertical: "top" };
      for (const col of ["A", "B", "C", "D"]) ws.getCell(`${col}${r}`).border = borde;
      ws.getRow(r).height = Math.max(lineas(concepto, 44), lineas(nota, 60)) * 15; r++;
    }
    r++;
  }
  unir(r, "A", "D"); c = ws.getCell(`A${r}`); c.value = "OBSERVACIONES Y CONCLUSIONES DEL PERIODO"; c.font = { bold: true, color: { argb: BLANCO } }; c.fill = relleno(NAVY); r++;
  unir(r, "A", "D"); c = ws.getCell(`A${r}`); c.value = observaciones || ""; c.alignment = { wrapText: true, vertical: "top" }; c.border = borde; ws.getRow(r).height = Math.max(60, lineas(observaciones, 110) * 15 + 6); r += 2;
  unir(r, "A", "D"); c = ws.getCell(`A${r}`); c.value = "FIRMAS"; c.font = { bold: true, color: { argb: BLANCO } }; c.fill = relleno(NAVY); r++;
  const f1 = firmas.elaboro || {}, f2 = firmas.reviso || {};
  ws.getCell(`A${r}`).value = "Elaboró — ingeniero / inspector de calidad"; ws.getCell(`C${r}`).value = "Revisó — residente de obra / gerencia"; unir(r, "C", "D");
  for (const col of ["A", "C"]) ws.getCell(`${col}${r}`).font = { bold: true, size: 9, color: { argb: NAVY } }; r++;
  ws.getRow(r).height = 34; ws.getCell(`A${r}`).value = "Firma:"; ws.getCell(`C${r}`).value = "Firma:"; unir(r, "C", "D"); for (const col of ["A", "C"]) ws.getCell(`${col}${r}`).alignment = { vertical: "top" }; r++;
  ws.getCell(`A${r}`).value = `Nombre: ${f1.nombre || ""}`; ws.getCell(`C${r}`).value = `Nombre: ${f2.nombre || ""}`; unir(r, "C", "D"); r++;
  ws.getCell(`A${r}`).value = `Cargo: ${f1.cargo || ""}`; ws.getCell(`C${r}`).value = `Cargo: ${f2.cargo || ""}`; unir(r, "C", "D");
  try { ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }; } catch (e) { /* sin ajuste */ }

  // Hoja de atención: lo que hay que mirar
  const wd = wb.addWorksheet("Atención requerida");
  [20, 52, 22, 56].forEach((w, i) => { wd.getColumn(i + 1).width = w; });
  wd.mergeCells("A1:D1"); c = wd.getCell("A1"); c.value = `ATENCIÓN REQUERIDA — ${inf.obra} — ${inf.periodo}`.toUpperCase(); c.font = { bold: true, size: 12, color: { argb: BLANCO } }; c.fill = relleno(NAVY); c.alignment = { vertical: "middle" }; wd.getRow(1).height = 26;
  ["Tipo", "Referencia", "Estado", "Detalle"].forEach((t, i) => { const h = wd.getCell(3, i + 1); h.value = t; h.font = { bold: true, color: { argb: NAVY } }; h.fill = relleno(ORO); h.border = borde; });
  let f = 4;
  if (!inf.detalle.length) { wd.mergeCells(`A${f}:D${f}`); wd.getCell(`A${f}`).value = "Sin novedades: no hay rechazos, incumplimientos ni vencimientos en este periodo."; }
  for (const fila of inf.detalle) {
    fila.forEach((v, i) => { const x = wd.getCell(f, i + 1); x.value = v || ""; x.alignment = { wrapText: true, vertical: "top" }; x.border = borde; });
    wd.getRow(f).height = Math.max(lineas(fila[1], 50), lineas(fila[3], 54)) * 15; f++;
  }
  try { wd.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }; } catch (e) { /* sin ajuste */ }
  return ws;
}
