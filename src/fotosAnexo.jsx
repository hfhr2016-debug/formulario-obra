// fotosAnexo.jsx — fotos de un registro de Calidad. No se guardan en la app: se eligen al generar el Excel y salen en una hoja «Fotos»
// al final del libro, cada una con la marca de agua (empresa, proyecto, fecha y hora) si está activada, igual que en el resto de la app.
import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { NAVY, GOLD, PAPER, LINE, Campo } from "./sstComunes";
import { comprimirFoto, lineasMarca, InterruptorMarca, agregarFotosARecuadros } from "./sstControles";

export const MAX_FOTOS_ANEXO = 6;
export const fotoAnexoNueva = (file) => ({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, file, previewUrl: URL.createObjectURL(file), descripcion: "", fechaHora: new Date(file.lastModified || Date.now()).toISOString() });

export function SeccionFotosAnexo({ fotos, setFotos, max = MAX_FOTOS_ANEXO }) {
  const ref = useRef(null);
  const elegir = (e) => {
    const nuevas = Array.from(e.target.files || []).slice(0, max - fotos.length).map(fotoAnexoNueva);
    if (nuevas.length) setFotos([...fotos, ...nuevas]);
    e.target.value = "";
  };
  const cambiar = (i, patch) => setFotos(fotos.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  return (
    <div data-fotos-anexo>
      <div className="mb-2"><InterruptorMarca /></div>
      <div className="space-y-2.5">
        {fotos.map((f, i) => (
          <div key={f.id} className="border rounded-lg p-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
            <img src={f.previewUrl} alt={`Foto ${i + 1}`} className="w-full h-36 object-cover rounded-md" />
            <button type="button" onClick={() => setFotos(fotos.filter((_, k) => k !== i))} aria-label={`Quitar foto ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><X size={12} /></button>
            <div className="mt-2"><Campo label={`Descripción de la foto ${i + 1}`} value={f.descripcion} placeholder="Ej. Armado de columna C3, cara norte" onChange={(v) => cambiar(i, { descripcion: v })} /></div>
          </div>
        ))}
      </div>
      {fotos.length < max && (
        <button type="button" onClick={() => ref.current && ref.current.click()} className="mt-2 w-full py-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 text-[12px] font-medium" style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={18} /> Agregar foto ({fotos.length} de {max})
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={elegir} aria-label="Agregar fotos" />
      <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Las fotos no se guardan en la app: salen en la hoja «Fotos» del Excel que generes ahora (hasta {max} por Excel).</div>
    </div>
  );
}

// Agrega al libro la hoja «Fotos» (2 por fila) con título, proyecto, fecha y la descripción debajo de cada foto. Devuelve cuántas fotos entraron.
export async function agregarHojaFotos(workbook, { titulo, proyecto, fecha, fotos }) {
  const con = (fotos || []).filter((f) => f && f.file);
  if (!con.length) return 0;
  const ws = workbook.addWorksheet("Fotos");
  for (let c = 1; c <= 8; c++) ws.getColumn(c).width = 11.5;
  const navy = "FF1B2A45", oro = "FFD9A233";
  ws.mergeCells("A1:H1"); const t = ws.getCell("A1"); t.value = `ANEXO FOTOGRÁFICO — ${String(titulo || "").toUpperCase()}`;
  t.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } }; t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } }; t.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 26;
  ws.mergeCells("A2:H2"); const s = ws.getCell("A2"); s.value = [proyecto, fecha].filter(Boolean).join("  ·  ");
  s.font = { size: 10, color: { argb: navy } }; s.fill = { type: "pattern", pattern: "solid", fgColor: { argb: oro } }; s.alignment = { horizontal: "center" };
  const cajas = []; const marcas = [];
  con.forEach((f, i) => {
    const fila0 = 4 + Math.floor(i / 2) * 12;          // fila (1-based) donde empieza el bloque
    const c0 = (i % 2) * 4;                              // columna (0-based) A o E
    for (let r = fila0; r < fila0 + 10; r++) ws.getRow(r).height = 19;
    cajas.push({ tl: { col: c0, row: fila0 - 1 }, br: { col: c0 + 4, row: fila0 + 9 }, aspecto: 1.34 });
    const colI = String.fromCharCode(65 + c0), colF = String.fromCharCode(65 + c0 + 3);
    ws.mergeCells(`${colI}${fila0 + 10}:${colF}${fila0 + 10}`);
    const d = ws.getCell(`${colI}${fila0 + 10}`); d.value = `Foto ${i + 1}${f.descripcion ? ": " + f.descripcion : ""}`;
    d.font = { size: 9, color: { argb: navy } }; d.alignment = { wrapText: true, vertical: "top" }; ws.getRow(fila0 + 10).height = 28;
    marcas.push(lineasMarca(proyecto, { fechaHora: f.fechaHora }, f.file));
  });
  try { ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }; } catch (e) { /* sin ajuste de página */ }
  await agregarFotosARecuadros(workbook, ws, con, cajas, "#F2F2F2", marcas);
  return con.length;
}
