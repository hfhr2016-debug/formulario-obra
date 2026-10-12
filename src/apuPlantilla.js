// Ubica en la plantilla del APU dónde va cada dato. Así el programa se adapta a la plantilla publicada
// (si cambian de columna el Factor, el Vr Unit., la unidad, las firmas, etc.) y no escribe en la columna equivocada.
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letra = (n) => LETRAS[n - 1];

export function valorSimple(celda) {
  const v = celda ? celda.value : null;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined && v.result !== null) return v.result;
    if (v.text !== undefined) return v.text;
    return "";
  }
  return v;
}
const texto = (celda) => String(valorSimple(celda) || "").trim();
function referenciaDeFormula(celda) {
  const v = celda ? celda.value : null;
  const f = v && typeof v === "object" ? v.formula || v.sharedFormula : null;
  const m = f ? /\$?([A-Z]{1,2})\$?(\d+)/.exec(String(f)) : null;
  return m ? m[1] + m[2] : null;
}
// Primera celda a la derecha de una etiqueta que no sea parte de la misma celda combinada
function derechaDe(ws, direccion) {
  const c = ws.getCell(direccion);
  const maestra = (x) => (x.master && x.master.address) || x.address;
  const base = maestra(c);
  for (let col = c.col + 1; col <= c.col + 12; col++) {
    const n = ws.getCell(c.row, col);
    if (maestra(n) !== base) return maestra(n);
  }
  return null;
}
function buscar(ws, re, filaIni, filaFin, colIni = 1, colFin = 24) {
  for (let r = filaIni; r <= filaFin; r++) for (let c = colIni; c <= colFin; c++) { if (re.test(texto(ws.getCell(r, c)))) return ws.getCell(r, c).address; }
  return null;
}

export function mapaApu(ws) {
  const colEnEncabezado = (fila, re, porDefecto) => {
    for (let c = 6; c <= 12; c++) if (re.test(texto(ws.getCell(fila, c)))) return letra(c);
    return porDefecto;
  };
  const arriba = (re, porDefecto) => {                       // etiqueta en la fila 16 → la celda que usa la fila 17 (=Q4, =T4…)
    const dir = buscar(ws, re, 16, 16, 1, 14);
    if (!dir) return porDefecto;
    const c = ws.getCell(dir);
    return referenciaDeFormula(ws.getCell(c.row + 1, c.col)) || referenciaDeFormula(c) || porDefecto;
  };
  const fecha = buscar(ws, /fecha de emisi/i, 12, 15, 5, 14);
  const ubic = buscar(ws, /^ubicaci/i, 12, 15, 5, 14);
  const nombres = [], cargos = [];
  for (let r = 60; r <= Math.max(ws.rowCount, 60); r++) for (let c = 1; c <= 14; c++) {
    const t = texto(ws.getCell(r, c));
    if (/^nombre:?$/i.test(t)) nombres.push(ws.getCell(r, c).address);
    if (/^cargo:?$/i.test(t)) cargos.push(ws.getCell(r, c).address);
  }
  const alDerecha = (lista, i, porDefecto) => (lista[i] ? derechaDe(ws, lista[i]) : null) || porDefecto;
  return {
    unidad: arriba(/^unidad/i, "P4"),
    cuadrilla: arriba(/^cuadrilla/i, "S4"),
    jornada: arriba(/^jornada/i, "U4"),
    rendimiento: arriba(/consumo/i, "V4"),
    fecha: (fecha && derechaDe(ws, fecha)) || "J13",
    ubicacion: (ubic && derechaDe(ws, ubic)) || "J14",
    elaboroNombre: alDerecha(nombres, 0, "C53"), elaboroCargo: alDerecha(cargos, 0, "C54"),
    interNombre: alDerecha(nombres, 1, "H53"), interCargo: alDerecha(cargos, 1, "H54"),
    // columnas de Factor/Rendimiento y de Vr Unit. según el encabezado de cada tabla (la fila de arriba de la primera fila de datos)
    columnas: (filaInicio) => ({
      factor: colEnEncabezado(filaInicio - 1, /factor|rendim/i, "G"),
      vr: colEnEncabezado(filaInicio - 1, /vr\.?\s*unit|valor\s*unit/i, "H"),
    }),
  };
}

// La plantilla muestra «rendimiento + unidad/jornada» con una fórmula que apunta a una celda vacía (A1): se corrige para que apunte al rendimiento.
export function arreglarRendimientoVisible(ws, mp) {
  try {
    const c = ws.getCell("H17");
    const f = c.value && typeof c.value === "object" ? c.value.formula : null;
    if (f && /^A1&/.test(f)) c.value = { formula: f.replace(/^A1&/, mp.rendimiento + "&") };
  } catch (e) { /* si no se puede, queda como estaba */ }
}
