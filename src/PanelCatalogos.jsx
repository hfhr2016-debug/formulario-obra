// PanelCatalogos.jsx — el administrador cambia precios y agrega materiales, mano de obra y equipos sin pasar por GitHub ni Vercel.
// Lo que guarda aquí se sincroniza solo con los demás dispositivos (ver sincronizar.js, flujos «cat_*»).
import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { descargarLibro } from "./sstComunes";
import { CATALOGOS, catalogoDef, itemsConLlave, hayCatalogoPropio, guardarItem, quitarItem, filasParaExcel, importarFilas, ENCABEZADOS_EXCEL } from "./catalogoVivo";

const NAVY = "#1B2A45", GOLD = "#D9A233", PAPER = "#F7F7F5", LINE = "#D9DCE1";
const pesos = (n) => "$ " + Math.round(Number(n) || 0).toLocaleString("es-CO");
const vacio = { codigo: "", descripcion: "", unidad: "", precio: "" };
const celdaTexto = (v) => (v && typeof v === "object" ? (v.result !== undefined ? v.result : v.text !== undefined ? v.text : v.richText ? v.richText.map((r) => r.text).join("") : "") : v);

export default function PanelCatalogos({ onVolver }) {
  const [cat, setCat] = useState("materiales");
  const [busca, setBusca] = useState("");
  const [version, setVersion] = useState(0);
  const [edit, setEdit] = useState(null);           // { llave|null, item }
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const def = catalogoDef(cat);
  const todos = useMemo(() => itemsConLlave(cat), [cat, version]);          // eslint-disable-line
  const q = busca.trim().toLowerCase();
  const filtrados = q ? todos.filter(({ item }) => `${item.descripcion} ${item.codigo}`.toLowerCase().includes(q)) : todos;
  const refrescar = () => setVersion((v) => v + 1);

  function guardarEdicion() {
    const r = guardarItem(cat, edit.item, edit.llave);
    if (!r.ok) { setError(r.error); return; }
    setError(""); setAviso(edit.llave ? "Cambio guardado." : "Ítem agregado."); setEdit(null); refrescar();
  }
  function quitar() {
    if (!window.confirm("¿Quitar este ítem del catálogo?")) return;
    quitarItem(cat, edit.llave); setEdit(null); setAviso("Ítem quitado."); refrescar();
  }
  async function descargar() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(def.titulo.slice(0, 30));
    ws.addRow(ENCABEZADOS_EXCEL);
    filasParaExcel(cat).forEach((f) => ws.addRow(f));
    ws.getRow(1).font = { bold: true };
    ws.columns = [{ width: 14 }, { width: 70 }, { width: 10 }, { width: 14 }];
    await descargarLibro(wb, `Catalogo_${def.id}.xlsx`);
  }
  async function subir(e) {
    const archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    setError(""); setAviso("");
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await archivo.arrayBuffer());
      const ws = wb.worksheets[0];
      const filas = [];
      ws.eachRow((fila) => filas.push([1, 2, 3, 4].map((c) => celdaTexto(fila.getCell(c).value))));
      const r = importarFilas(cat, filas);
      refrescar();
      setAviso(`Excel leído: ${r.actualizados} precios/ítems actualizados, ${r.nuevos} nuevos, ${r.sinCambio} sin cambios.${r.errores.length ? " Se omitieron: " + r.errores.slice(0, 3).join("; ") + (r.errores.length > 3 ? "…" : ".") : ""}`);
    } catch (err) {
      console.error(err);
      setError("No se pudo leer el Excel. Usa el que descargas aquí: columnas Código, Descripción, Unidad y Precio.");
    }
  }

  const campo = "w-full border rounded-lg px-3 py-2 text-[13px]";
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <button onClick={onVolver} className="text-white/80 text-[12.5px] mb-2">← Volver</button>
        <div className="text-white font-bold text-[16px]">Catálogos de precios</div>
        <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>Lo que cambies se actualiza solo en todos los dispositivos</div>
      </div>
      <div className="p-4 max-w-xl mx-auto pb-24">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {CATALOGOS.map((c) => (
            <button key={c.id} type="button" onClick={() => { setCat(c.id); setBusca(""); setEdit(null); setAviso(""); setError(""); }} aria-pressed={cat === c.id}
              className="text-[12px] px-3 py-1.5 rounded-full border font-semibold" style={cat === c.id ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: NAVY, borderColor: LINE }}>{c.titulo}</button>
          ))}
        </div>
        <div className="text-[11px] mb-2" style={{ color: "#8A8F99" }}>
          {todos.length} ítems · {hayCatalogoPropio(cat) ? "catálogo propio (sincronizado)" : "catálogo base: se guarda como propio al hacer el primer cambio"}
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descripción o código" className={campo + " mb-2"} style={{ borderColor: LINE, background: "white" }} />
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => { setEdit({ llave: null, item: { ...vacio, unidad: def.unidadSug } }); setError(""); setAviso(""); }} className="flex-1 py-2 rounded-lg text-white font-bold text-[12.5px]" style={{ background: GOLD }}>+ Agregar ítem</button>
          <button type="button" onClick={descargar} className="px-3 py-2 rounded-lg border text-[12px] font-semibold" style={{ borderColor: LINE, color: NAVY, background: "white" }}>⬇ Excel</button>
          <label className="px-3 py-2 rounded-lg border text-[12px] font-semibold cursor-pointer" style={{ borderColor: LINE, color: NAVY, background: "white" }}>
            ⬆ Subir Excel<input type="file" accept=".xlsx" onChange={subir} className="hidden" data-subir-excel />
          </label>
        </div>
        {aviso && <div className="text-[11.5px] mb-2 p-2 rounded" style={{ background: "#EAF4EC", color: "#1D6B3A" }}>{aviso}</div>}
        {error && !edit && <div className="text-[11.5px] mb-2 p-2 rounded" style={{ background: "#FDEDEA", color: "#B3401F" }}>{error}</div>}

        {edit && (
          <div className="bg-white rounded-xl p-3 mb-3 space-y-2" style={{ border: `1px solid ${GOLD}` }} data-editor>
            <div className="text-[12px] font-bold" style={{ color: NAVY }}>{edit.llave ? "Cambiar ítem" : "Nuevo ítem"}</div>
            <label className="block text-[11px] font-semibold" style={{ color: "#8A8F99" }}>Descripción
              <input value={edit.item.descripcion} onChange={(e) => setEdit({ ...edit, item: { ...edit.item, descripcion: e.target.value } })} className={campo + " mt-0.5"} style={{ borderColor: LINE }} aria-label="Descripción" /></label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-[11px] font-semibold" style={{ color: "#8A8F99" }}>Código
                <input value={edit.item.codigo} placeholder="(automático)" onChange={(e) => setEdit({ ...edit, item: { ...edit.item, codigo: e.target.value } })} className={campo + " mt-0.5"} style={{ borderColor: LINE }} aria-label="Código" /></label>
              <label className="block text-[11px] font-semibold" style={{ color: "#8A8F99" }}>Unidad
                <input value={edit.item.unidad} onChange={(e) => setEdit({ ...edit, item: { ...edit.item, unidad: e.target.value } })} className={campo + " mt-0.5"} style={{ borderColor: LINE }} aria-label="Unidad" /></label>
              <label className="block text-[11px] font-semibold" style={{ color: "#8A8F99" }}>Precio ($)
                <input inputMode="decimal" value={edit.item.precio} onChange={(e) => setEdit({ ...edit, item: { ...edit.item, precio: e.target.value } })} className={campo + " mt-0.5"} style={{ borderColor: LINE }} aria-label="Precio" /></label>
            </div>
            {error && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>{error}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={guardarEdicion} className="flex-1 py-2 rounded-lg text-white font-bold text-[12.5px]" style={{ background: NAVY }}>Guardar</button>
              <button type="button" onClick={() => { setEdit(null); setError(""); }} className="px-3 py-2 rounded-lg border text-[12.5px]" style={{ borderColor: LINE, color: NAVY }}>Cancelar</button>
              {edit.llave && <button type="button" onClick={quitar} className="px-3 py-2 rounded-lg border text-[12.5px]" style={{ borderColor: LINE, color: "#B3401F" }}>Quitar</button>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
          {filtrados.slice(0, 80).map(({ llave, item }) => (
            <button key={llave} type="button" onClick={() => { setEdit({ llave, item: { codigo: item.codigo, descripcion: item.descripcion, unidad: item.unidad, precio: String(item.precio).replace(".", ",") } }); setError(""); setAviso(""); }}
              className="w-full text-left px-3 py-2 border-b last:border-b-0 flex items-center gap-2" style={{ borderColor: LINE }} data-item>
              <span className="flex-1 min-w-0"><span className="block text-[12.5px] truncate" style={{ color: NAVY }}>{item.descripcion}</span><span className="block text-[10.5px]" style={{ color: "#8A8F99" }}>{item.codigo}</span></span>
              <span className="text-right shrink-0"><span className="block text-[12.5px] font-semibold" style={{ color: NAVY }}>{pesos(item.precio)}</span><span className="block text-[10.5px]" style={{ color: "#8A8F99" }}>/ {item.unidad || "u"}</span></span>
            </button>
          ))}
          {!filtrados.length && <div className="p-3 text-[12px]" style={{ color: "#8A8F99" }}>No hay ítems con esa búsqueda.</div>}
        </div>
        {filtrados.length > 80 && <div className="text-[11px] mt-2" style={{ color: "#8A8F99" }}>Se muestran 80 de {filtrados.length}. Usa la búsqueda para encontrar el resto.</div>}
        <div className="text-[10.5px] mt-3" style={{ color: "#8A8F99" }}>Los APU y presupuestos que ya elaboraste conservan los precios con los que se hicieron; el cambio vale para lo que elabores de ahora en adelante.</div>
      </div>
    </div>
  );
}
