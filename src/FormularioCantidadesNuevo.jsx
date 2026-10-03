import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { useCatalogo } from "./catalogos";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function aFechaDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function fechaLocalHoy() { return new Date(); }

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const PESO_ACERO_KG_POR_METRO = {
  '#2 (1/4")': 0.249, '#3 (3/8")': 0.56, '#4 (1/2")': 0.994, '#5 (5/8")': 1.552,
  '#6 (3/4")': 2.235, '#7 (7/8")': 3.042, '#8 (1")': 3.973, '#9 (1 1/8")': 5.06,
  '#10 (1 1/4")': 6.404, '#11 (1 3/8")': 7.907,
};
function esActividadAcero(nombre) { return /acero/i.test(nombre || ""); }

function factorDesperdicioSugerido(nombreActividad) {
  if (!nombreActividad) return null;
  const n = nombreActividad.toLowerCase();
  const reglas = [
    [/cerámic|porcelanat|enchape/, 0.10],
    [/pintura|esmalte|vinílic/, 0.10],
    [/estuco|yeso/, 0.10],
    [/madera|formaleta/, 0.10],
    [/teja/, 0.08],
    [/cable|cableado/, 0.08],
    [/adoquín|ladrillo|bloque|mamposter/, 0.05],
    [/vidrio/, 0.05],
    [/tubería|tuberia|conduit/, 0.05],
    [/acero/, 0.05],
    [/mezcla asfáltica|pavimento|capa de rodadura|base asfáltica/, 0.05],
    [/subbase|base granular|afirmado/, 0.10],
    [/concreto|cemento|agregado|arena|grava|recebo/, 0.03],
  ];
  for (const [patron, factor] of reglas) {
    if (patron.test(n)) return factor;
  }
  return null;
}
function unidadNecesitaAlto(unidad) { const u = (unidad||"").toLowerCase(); return u==='m³'||u==='m3'; }
function unidadEsArea(unidad) { const u=(unidad||"").toLowerCase(); return u==='m²'||u==='m2'; }
function unidadEsLineal(unidad) { const u=(unidad||"").toLowerCase(); return u==='ml'||u==='m'; }
function esUnidadDirecta(unidad) {
  const u = (unidad||"").toLowerCase();
  return ["kg","gl","gb","und","un","ton","kit","glb"].includes(u);
}


function leerTipoProyecto() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    if (!datos) return { edificacion: true, vias: false, hidrocarburos: false };
    return datos.modulos || { edificacion: true, vias: false, hidrocarburos: false };
  } catch (e) { return { edificacion: true, vias: false, hidrocarburos: false }; }
}
function leerBloquesHC() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    if (!datos) return { civil: false, mecanico: false, electrico: false };
    return datos.hcBloques || { civil: false, mecanico: false, electrico: false };
  } catch (e) { return { civil: false, mecanico: false, electrico: false }; }
}
function tipoActivoActual() {
  const modulos = leerTipoProyecto();
  if (modulos.vias) return "vias";
  if (modulos.hidrocarburos) return "hidrocarburos";
  return "edificacion";
}

function filtrarCatalogo(actividades, tipoActivo) {
  // El archivo externo (public/catalogos/<tipo>.json) ya viene filtrado a un solo tipo,
  // así que aquí solo queda aplicar, si aplica, el sub-filtro de bloques de Hidrocarburos.
  const bloquesHC = leerBloquesHC();
  let filtrado = actividades;
  if (tipoActivo === "hidrocarburos") {
    const algunBloque = bloquesHC.civil || bloquesHC.mecanico || bloquesHC.electrico;
    if (algunBloque) {
      filtrado = filtrado.filter((a) => bloquesHC[a.componente]);
    }
  }
  return filtrado;
}

function calcularNeta(unidad, sub) {
  const L = numES(sub.largo) || 0;
  const An = numES(sub.ancho) || 0;
  const H = numES(sub.alto) || 0;
  const N = numES(sub.numElementos) || 1;
  const R = numES(sub.repeticiones) || 1;
  const F = numES(sub.factor) || 1;
  const D = (sub.deducciones || []).reduce((acc, d) => acc + (numES(d.largo) || 0) * (numES(d.ancho) || 1) * (numES(d.alto) || 1), 0);
  const CD = numES(sub.cantidadDirecta) || 0;
  let bruta = 0;
  if (esUnidadDirecta(unidad)) bruta = CD * N * R * F;
  else if (unidadNecesitaAlto(unidad)) bruta = L * (An||1) * (H||1) * N * R * F;
  else if (unidadEsArea(unidad)) bruta = L * (An||1) * N * R * F;
  else if (unidadEsLineal(unidad)) bruta = L * N * R * F;
  else bruta = CD * N * R * F;
  return Math.round(Math.max(0, bruta - D) * 1000) / 1000;
}

function BuscadorActividad({ valor, onSeleccionar, catalogo, placeholder, limpiarTrasSeleccionar }) {
  const [texto, setTexto] = useState(valor || "");
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!texto || texto.length < 2) return [];
    const q = texto.toLowerCase();
    const coincide = catalogo.filter((it) => it.actividad.toLowerCase().includes(q));
    coincide.sort((a, b) => {
      const ae = a.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      const be = b.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      if (ae !== be) return ae - be;
      return a.actividad.length - b.actividad.length;
    });
    return coincide.slice(0, 12);
  }, [texto, catalogo]);
  return (
    <div className="relative w-full">
      <input
        placeholder={placeholder} value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded px-2 py-1.5 text-[12.5px]" style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((it, i) => (
            <button key={i} type="button"
              onMouseDown={() => { setTexto(limpiarTrasSeleccionar ? "" : it.actividad); setAbierto(false); onSeleccionar(it); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50" style={{ borderColor: LINE }}>
              <div className="text-[12px] font-medium" style={{ color: NAVY }}>{it.actividad}</div>
              <div className="text-[10.5px] text-gray-500">{it.capitulo} · {it.unidad}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function subVacio(factorSugerido) {
  return { ubicacion: "", largo: "", ancho: "", alto: "", numElementos: "",
    factor: factorSugerido !== undefined ? String(factorSugerido) : "",
    cantidadDirecta: "", denominacion: "", metros: "", deducciones: [] };
}
function calcularSub(unidad, actividad, sub) {
  const directa = esUnidadDirecta(unidad);
  const esAcero = esActividadAcero(actividad);
  if (esAcero) {
    const denom = sub.denominacion; const metros = numES(sub.metros);
    const numElem = numES(sub.numElementos) || 1;
    const factor = numES(sub.factor) || 1;
    const peso = denom && PESO_ACERO_KG_POR_METRO[denom] ? metros * PESO_ACERO_KG_POR_METRO[denom] : 0;
    return Math.round(peso * numElem * factor * 1000) / 1000;
  }
  return calcularNeta(unidad, sub);
}

function FilaSub({ sub, actualizar, quitar, mostrarQuitar, unidad, actividad }) {
  const esAcero = esActividadAcero(actividad);
  const directa = esUnidadDirecta(unidad);
  const deducciones = sub.deducciones || [];
  const resultado = calcularSub(unidad, actividad, sub);

  return (
    <div className="border rounded-lg p-2 mb-2" style={{ borderColor: LINE, background: "#FAFAF9" }}>
      <div className="flex items-center justify-between mb-1.5">
        <input placeholder="Ubicación / Frente" value={sub.ubicacion || ""} onChange={(e) => actualizar({ ...sub, ubicacion: e.target.value })} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        {mostrarQuitar && (
          <button type="button" onClick={quitar} className="text-[13px] text-red-500 px-2">✕</button>
        )}
      </div>

      {directa && esAcero ? (
        <div className="mb-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <select value={sub.denominacion || ""} onChange={(e) => actualizar({ ...sub, denominacion: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }}>
              <option value="">Denominación de varilla</option>
              {Object.keys(PESO_ACERO_KG_POR_METRO).map((d) => (<option key={d} value={d}>{d} — {PESO_ACERO_KG_POR_METRO[d]} kg/m</option>))}
            </select>
            <input placeholder="Metros lineales" type="text" inputMode="decimal" value={sub.metros || ""} onChange={(e) => actualizar({ ...sub, metros: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
          </div>
        </div>
      ) : directa ? (
        <input placeholder={`Cantidad (${unidad})`} type="text" inputMode="decimal" value={sub.cantidadDirecta || ""} onChange={(e) => actualizar({ ...sub, cantidadDirecta: e.target.value })} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
      ) : (
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <input placeholder="Largo" type="text" inputMode="decimal" value={sub.largo || ""} onChange={(e) => actualizar({ ...sub, largo: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
          {!unidadEsLineal(unidad) && (
            <input placeholder="Ancho" type="text" inputMode="decimal" value={sub.ancho || ""} onChange={(e) => actualizar({ ...sub, ancho: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
          )}
          {unidadNecesitaAlto(unidad) && (
            <input placeholder="Alto" type="text" inputMode="decimal" value={sub.alto || ""} onChange={(e) => actualizar({ ...sub, alto: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mb-1">
        <input placeholder="N° elementos" type="text" inputMode="decimal" value={sub.numElementos || ""} onChange={(e) => actualizar({ ...sub, numElementos: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Factor de desperdicio" type="text" inputMode="decimal" value={sub.factor || ""} onChange={(e) => actualizar({ ...sub, factor: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
      </div>
      {sub.factor && (
        <div className="text-[10px] text-gray-500 mb-1.5 -mt-1">⚡ Factor sugerido según desperdicio típico de esta actividad — ajústalo si tu caso es distinto.</div>
      )}

      {!directa && (
        <div className="mb-1.5">
          <div className="text-[10px] text-gray-500 mb-1">Deducciones (opcional):</div>
          {deducciones.map((d, di) => (
            <div key={di} className="flex gap-1.5 mb-1 items-center">
              <input placeholder="Largo desc." type="text" inputMode="decimal" value={d.largo} onChange={(e) => {
                const nuevas = [...deducciones]; nuevas[di] = { ...nuevas[di], largo: e.target.value };
                actualizar({ ...sub, deducciones: nuevas });
              }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              <input placeholder="Ancho desc." type="text" inputMode="decimal" value={d.ancho} onChange={(e) => {
                const nuevas = [...deducciones]; nuevas[di] = { ...nuevas[di], ancho: e.target.value };
                actualizar({ ...sub, deducciones: nuevas });
              }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              <input placeholder="Alto desc." type="text" inputMode="decimal" value={d.alto} onChange={(e) => {
                const nuevas = [...deducciones]; nuevas[di] = { ...nuevas[di], alto: e.target.value };
                actualizar({ ...sub, deducciones: nuevas });
              }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              <button type="button" onMouseDown={() => actualizar({ ...sub, deducciones: deducciones.filter((_, k) => k !== di) })} className="text-[11px] text-red-500 px-1">✕</button>
            </div>
          ))}
          <button type="button" onMouseDown={() => actualizar({ ...sub, deducciones: [...deducciones, { largo: "", ancho: "", alto: "" }] })}
            className="w-full py-1.5 rounded-lg text-[11px] font-semibold border" style={{ borderColor: GOLD, color: NAVY }}>
            + Agregar deducción
          </button>
        </div>
      )}

      <div className="mt-2 p-2 rounded-lg text-center" style={{ background: NAVY }}>
        <div className="text-[10px]" style={{ color: GOLD }}>Resultado de este sitio</div>
        <div className="text-white font-bold text-[15px]">{resultado} {unidad}</div>
      </div>
    </div>
  );
}

function TarjetaActividad({ a, actualizar, quitar }) {
  const unidad = a.unidad;
  const subs = a.subs || [subVacio()];
  const totalActividad = useMemo(
    () => subs.reduce((acc, s) => acc + calcularSub(unidad, a.actividad, s), 0),
    [subs, unidad, a.actividad]
  );

  const actualizarSub = (i, nuevo) => {
    const nuevos = [...subs]; nuevos[i] = nuevo;
    actualizar({ ...a, subs: nuevos });
  };
  const agregarSub = () => {
    const desp = factorDesperdicioSugerido(a.actividad);
    const factorSugerido = desp !== null ? Math.round((1 + desp) * 1000) / 1000 : undefined;
    actualizar({ ...a, subs: [...subs, subVacio(factorSugerido)] });
  };
  const quitarSub = (i) => actualizar({ ...a, subs: subs.filter((_, k) => k !== i) });

  return (
    <div className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: "white" }}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[12.5px] font-semibold" style={{ color: NAVY }}>{a.actividad}</div>
          <div className="text-[10.5px] text-gray-500">{a.capitulo} · {unidad}</div>
        </div>
        <button type="button" onClick={quitar} className="text-[13px] text-red-500 px-1">✕</button>
      </div>

      {subs.map((s, i) => (
        <FilaSub
          key={i}
          sub={s}
          actualizar={(n) => actualizarSub(i, n)}
          quitar={() => quitarSub(i)}
          mostrarQuitar={subs.length > 1}
          unidad={unidad}
          actividad={a.actividad}
        />
      ))}

      <button
        type="button" onClick={agregarSub}
        className="w-full py-2 rounded-lg text-[12px] font-semibold border-2 mb-2"
        style={{ borderColor: GOLD, color: NAVY }}
      >
        + Agregar sitio de medición
      </button>

      <div className="p-2 rounded-lg text-center" style={{ background: NAVY }}>
        <div className="text-[10px]" style={{ color: GOLD }}>Total de esta actividad ({subs.length} sitio{subs.length > 1 ? "s" : ""})</div>
        <div className="text-white font-bold text-[16px]">{Math.round(totalActividad * 1000) / 1000} {unidad}</div>
      </div>
    </div>
  );
}

function actividadVacia(it) {
  const desp = factorDesperdicioSugerido(it.actividad);
  const factorSugerido = desp !== null ? Math.round((1 + desp) * 1000) / 1000 : undefined;
  return { actividad: it.actividad, capitulo: it.capitulo, unidad: it.unidad, subs: [subVacio(factorSugerido)] };
}

export default function FormularioCantidadesNuevo({ onVolver, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [proyecto, setProyecto] = useState("");
  const [actividades, setActividades] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_cantidades"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_cantidades"); } catch (e) { return true; }
  });
  function restaurarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_cantidades") || "null");
      if (d) { setProyecto(d.proyecto || ""); setActividades(d.actividades || []); }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    try { localStorage.removeItem("ryr_borrador_cantidades"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  React.useEffect(() => {
    if (!borradorAplicado) return;
    try { localStorage.setItem("ryr_borrador_cantidades", JSON.stringify({ proyecto, actividades })); } catch (e) {}
  }, [borradorAplicado, proyecto, actividades]);

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Cantidades de Obra");
      if (!ws) throw new Error("No se encontró la hoja Cantidades de Obra");

      const mapaActividades = new Map();
      for (let r = 9; r <= 508; r++) {
        const nombreAct = ws.getCell(`F${r}`).value;
        if (!nombreAct) continue;
        const capitulo = ws.getCell(`C${r}`).value || "";
        const unidad = ws.getCell(`J${r}`).value || "";
        const claveAct = `${nombreAct}||${capitulo}`;
        if (!mapaActividades.has(claveAct)) {
          mapaActividades.set(claveAct, { actividad: String(nombreAct), capitulo, unidad, subs: [] });
        }
        const esAcero = esActividadAcero(String(nombreAct));
        const sub = {
          ubicacion: ws.getCell(`G${r}`).value || "",
          largo: esAcero ? "" : String(ws.getCell(`L${r}`).value || ""),
          ancho: esAcero ? "" : String(ws.getCell(`M${r}`).value || ""),
          alto: esAcero ? "" : String(ws.getCell(`N${r}`).value || ""),
          numElementos: String(ws.getCell(`P${r}`).value || ""),
          factor: String(ws.getCell(`R${r}`).value || ""),
          cantidadDirecta: esAcero ? String(ws.getCell(`K${r}`).value || "") : "",
          denominacion: "", metros: "",
          deducciones: [],
        };
        mapaActividades.get(claveAct).subs.push(sub);
      }
      const nuevasActividades = Array.from(mapaActividades.values());
      setActividades(nuevasActividades);
      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea un Cantidades de Obra generado por este sistema.");
    } finally {
      setCargando(false);
    }
  }
  const [ocultarSinUsar, setOcultarSinUsar] = useState(false);

  const tipoActivo = useMemo(() => tipoActivoActual(), []);
  const { actividades: actividadesTipo, cargando: cargandoCatalogo, error: errorCatalogo } = useCatalogo(tipoActivo);
  const catalogo = useMemo(() => filtrarCatalogo(actividadesTipo, tipoActivo), [actividadesTipo, tipoActivo]);
  const nombresTipo = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };

  const agregarActividad = (it) => {
    if (actividades.some((a) => a.actividad === it.actividad)) return;
    setActividades([...actividades, actividadVacia(it)]);
  };
  const actualizarActividad = (i, nuevo) => {
    const nuevas = [...actividades]; nuevas[i] = nuevo; setActividades(nuevas);
  };
  const quitarActividad = (i) => setActividades(actividades.filter((_, k) => k !== i));

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-cantidades-unificado.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Cantidades de Obra");

      let fila = 9;
      let contador = 1;
      actividades.forEach((a) => {
        const subs = a.subs || [];
        subs.forEach((s) => {
          const resultado = calcularSub(a.unidad, a.actividad, s);
          ws.getCell(`A${fila}`).value = `MQ-${String(contador).padStart(3, "0")}`;
          ws.getCell(`B${fila}`).value = nombresTipo[tipoActivo];
          ws.getCell(`C${fila}`).value = a.capitulo;
          ws.getCell(`F${fila}`).value = a.actividad;
          ws.getCell(`G${fila}`).value = s.ubicacion;
          ws.getCell(`J${fila}`).value = a.unidad;
          if (esActividadAcero(a.actividad)) {
            ws.getCell(`K${fila}`).value = resultado;
          } else {
            ws.getCell(`L${fila}`).value = numES(s.largo) || 0;
            ws.getCell(`M${fila}`).value = numES(s.ancho) || 0;
            ws.getCell(`N${fila}`).value = numES(s.alto) || 0;
          }
          ws.getCell(`P${fila}`).value = numES(s.numElementos) || 1;
          ws.getCell(`Q${fila}`).value = 1;
          ws.getCell(`R${fila}`).value = numES(s.factor) || 1;
          const dedTotal = (s.deducciones || []).reduce((acc, d) => acc + (numES(d.largo) || 0) * (numES(d.ancho) || 1) * (numES(d.alto) || 1), 0);
          ws.getCell(`S${fila}`).value = dedTotal;
          ws.getCell(`V${fila}`).value = resultado;
          ws.getCell(`AA${fila}`).value = aFechaDDMMYYYY(fechaLocalHoy());
          fila++;
          contador++;
        });
      });

      if (ocultarSinUsar) {
        for (let r = fila; r <= 508; r++) ws.getRow(r).hidden = true;
      }

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = `Cantidades_de_Obra_${(proyecto || "Proyecto").replace(/[^a-zA-Z0-9]/g, "_")}_${aFechaDDMMYYYY(fechaLocalHoy()).replace(/\//g, "-")}.xlsx`;
      document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
      URL.revokeObjectURL(url);
      try { localStorage.removeItem("ryr_borrador_cantidades"); } catch (e) {}
    } catch (e) {
      console.error(e);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
  }

  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes un Cantidades de Obra sin terminar</div>
        <div className="text-[12.5px] text-gray-500 mb-5">Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel. ¿Quieres continuar donde quedaste?</div>
        <button onClick={restaurarBorrador} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
          ▶ Continuar donde quedé
        </button>
        <button onClick={descartarBorrador} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border" style={{ borderColor: LINE, color: NAVY }}>
          Empezar en blanco
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }} className="min-h-screen">
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="cantidades" />
      <div className="p-4 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} color={NAVY} />}
          <button onClick={onVolver} className="text-[12px]" style={{ color: NAVY }}>← Volver al portal</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Cantidades nuevo
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el Cantidades de Obra que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg flex items-center justify-between" style={{ background: NAVY }}>
          CANTIDADES DE OBRA
          <IndicadorTipoProyecto claveBorrador="ryr_borrador_cantidades" />
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-3" style={{ borderColor: LINE }}>
          <div className="text-[11px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FFF8E8", color: NAVY }}>
            ⚡ Tipo de proyecto activo: <b>{nombresTipo[tipoActivo]}</b> — {cargandoCatalogo ? "cargando actividades…" : errorCatalogo ? "sin catálogo." : `${catalogo.length} actividades disponibles.`}
          </div>
          {errorCatalogo && (
            <div className="text-[11px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FDECEC", color: "#B42318" }}>
              No se pudo cargar el catálogo de actividades: {errorCatalogo} Si es la primera vez que abres este tipo de proyecto en este dispositivo, necesitas conexión a internet.
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              try {
                const lista = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
                if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
                setProyecto(lista[0].datos.proyecto || "");
                alert(`Nombre traído de: "${lista[0].nombreId}"`);
              } catch (e) {
                alert("No se pudo leer la memoria de Ficha Técnica.");
              }
            }}
            className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2"
            style={{ background: NAVY }}
          >
            📋 Traer nombre desde la última Ficha Técnica guardada
          </button>
          <input placeholder="Nombre del proyecto" value={proyecto} onChange={(e) => setProyecto(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-[13px] mb-2" style={{ borderColor: LINE }} />
          <BuscadorActividad valor="" catalogo={catalogo} placeholder="Buscar y agregar actividad..." onSeleccionar={agregarActividad} limpiarTrasSeleccionar />
        </div>

        {actividades.map((a, i) => (
          <TarjetaActividad key={i} a={a} actualizar={(n) => actualizarActividad(i, n)} quitar={() => quitarActividad(i)} />
        ))}

        {actividades.length > 0 && (
          <div className="text-[11.5px] text-center py-2.5 mb-2 rounded-lg" style={{ background: PAPER, color: NAVY }}>
            ¿Terminaste con esta actividad? ⬆️ Vuelve a buscar arriba para agregar la siguiente.
          </div>
        )}

        <label className="flex items-center gap-2 mb-3 text-[12px] cursor-pointer" style={{ color: NAVY }}>
          <input type="checkbox" checked={ocultarSinUsar} onChange={(e) => setOcultarSinUsar(e.target.checked)} />
          Ocultar en el Excel las filas vacías que no se usaron
        </label>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : `Descargar Cantidades de Obra (${actividades.length} actividades)`}
        </button>
      </div>
    </div>
  );
}
