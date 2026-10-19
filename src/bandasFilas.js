// Filas alternadas en los formatos: blanca, azul claro, blanca... (solo las filas con datos; las vacías quedan como la plantilla)
export const AZUL_BANDA = "FFEAF0F6";
export function aplicarBandas(ws, filaIni, filaFin, colIni, colFin) {
  try {
    for (let r = filaIni; r <= filaFin; r++) {
      const argb = (r - filaIni) % 2 === 1 ? AZUL_BANDA : "FFFFFFFF";
      for (let c = colIni; c <= colFin; c++) {
        ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
      }
    }
  } catch (e) { /* si no se pueden pintar, el formato queda sin bandas */ }
}
