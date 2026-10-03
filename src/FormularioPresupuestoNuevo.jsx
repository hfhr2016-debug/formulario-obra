import React, { useState, useMemo, useEffect } from "react";
import ExcelJS from "exceljs";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { useCatalogo } from "./catalogos";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function formatoMoneda(n) {
  return "$ " + (Math.round((n || 0) * 100) / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function aFechaDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function fechaLocalHoy() {
  return new Date();
}

const PESO_ACERO_KG_POR_METRO = {
  '#2 (1/4")': 0.249, '#3 (3/8")': 0.56, '#4 (1/2")': 0.994, '#5 (5/8")': 1.552,
  '#6 (3/4")': 2.235, '#7 (7/8")': 3.042, '#8 (1")': 3.973, '#9 (1 1/8")': 5.06,
  '#10 (1 1/4")': 6.404, '#11 (1 3/8")': 7.907,
};
function esActividadAcero(nombre) { return /acero/i.test(nombre || ""); }
function unidadNecesitaAlto(unidad) { const u = (unidad||"").toLowerCase(); return u==='m³'||u==='m3'; }
function unidadEsArea(unidad) { const u=(unidad||"").toLowerCase(); return u==='m²'||u==='m2'; }
function unidadEsLineal(unidad) { const u=(unidad||"").toLowerCase(); return u==='ml'||u==='m'; }

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";


function leerTipoProyecto() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    if (!datos) return { edificacion: true, vias: false, hidrocarburos: false };
    return datos.modulos || { edificacion: true, vias: false, hidrocarburos: false };
  } catch (e) {
    return { edificacion: true, vias: false, hidrocarburos: false };
  }
}
function leerBloquesHC() {
  try {
    const datos = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    if (!datos) return { civil: false, mecanico: false, electrico: false };
    return datos.hcBloques || { civil: false, mecanico: false, electrico: false };
  } catch (e) {
    return { civil: false, mecanico: false, electrico: false };
  }
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

function BuscadorActividad({ valor, onSeleccionar, catalogo, placeholder }) {
  const [texto, setTexto] = useState(valor || "");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    if (!texto || texto.length < 2) return [];
    const q = texto.toLowerCase();
    const coincide = catalogo.filter((it) => it.actividad.toLowerCase().includes(q));
    coincide.sort((a, b) => {
      const aEmpieza = a.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      const bEmpieza = b.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
      return a.actividad.length - b.actividad.length;
    });
    return coincide.slice(0, 12);
  }, [texto, catalogo]);

  return (
    <div className="relative w-full">
      <input
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded px-2 py-1.5 text-[12.5px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((it, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => {
                setTexto(it.actividad);
                setAbierto(false);
                onSeleccionar(it);
              }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div className="text-[12px] font-medium" style={{ color: NAVY }}>{it.actividad}</div>
              <div className="text-[10.5px] text-gray-500">{it.capitulo} · {it.unidad}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function subMedicionVacia(factorSugerido) {
  return { ubicacion: "", largo: "", ancho: "", alto: "", numElem: "",
    factor: factorSugerido !== undefined ? String(factorSugerido) : "",
    deducciones: [], denominacion: "", metros: "" };
}
function filaVacia() {
  return { actividad: "", capitulo: "", unidad: "", cantidad: "", precio: "", subs: [] };
}

export default function FormularioPresupuestoNuevo({ onVolver, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [proyecto, setProyecto] = useState("");
  const [filas, setFilas] = useState([filaVacia()]);
  const [expandidos, setExpandidos] = useState({});
  const [generando, setGenerando] = useState(false);
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_presupuesto"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_presupuesto"); } catch (e) { return true; }
  });
  function restaurarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_presupuesto") || "null");
      if (d) { setProyecto(d.proyecto || ""); setFilas(d.filas || [filaVacia()]); }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    try { localStorage.removeItem("ryr_borrador_presupuesto"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  React.useEffect(() => {
    if (!borradorAplicado) return;
    try { localStorage.setItem("ryr_borrador_presupuesto", JSON.stringify({ proyecto, filas })); } catch (e) {}
  }, [borradorAplicado, proyecto, filas]);

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Presupuesto");
      if (!ws) throw new Error("No se encontró la hoja Presupuesto");

      const nuevasFilas = [];
      for (let r = 14; r <= 513; r++) {
        const act = ws.getCell(`C${r}`).value;
        if (!act) continue;
        nuevasFilas.push({
          actividad: String(act),
          capitulo: ws.getCell(`B${r}`).value || "",
          unidad: ws.getCell(`D${r}`).value || "",
          cantidad: String(ws.getCell(`E${r}`).value || ""),
          precio: String(ws.getCell(`F${r}`).value || ""),
          subs: [],
        });
      }
      setFilas(nuevasFilas.length ? nuevasFilas : [filaVacia()]);
      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea un Presupuesto generado por este sistema.");
    } finally {
      setCargando(false);
    }
  }
  const [ocultarSinUsar, setOcultarSinUsar] = useState(false);

  const tipoActivo = useMemo(() => tipoActivoActual(), []);
  const { actividades: actividadesTipo, cargando: cargandoCatalogo, error: errorCatalogo } = useCatalogo(tipoActivo);
  const catalogo = useMemo(() => filtrarCatalogo(actividadesTipo, tipoActivo), [actividadesTipo, tipoActivo]);

  const nombresTipo = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };

  const actualizarFila = (i, cambios) => {
    const nuevas = [...filas];
    nuevas[i] = { ...nuevas[i], ...cambios };
    setFilas(nuevas);
  };

  function calcularSub(unidad, actividad, sub) {
    const largo = numES(sub.largo);
    const ancho = numES(sub.ancho);
    const alto = numES(sub.alto);
    const numElem = numES(sub.numElem) || 1;
    const factor = numES(sub.factor) || 1;
    let bruta = 0;
    if (esActividadAcero(actividad)) {
      const denom = sub.denominacion;
      const metros = numES(sub.metros);
      bruta = (denom && PESO_ACERO_KG_POR_METRO[denom] ? metros * PESO_ACERO_KG_POR_METRO[denom] : 0) * numElem * factor;
    } else if (unidadNecesitaAlto(unidad)) bruta = largo * (ancho || 1) * (alto || 1) * numElem * factor;
    else if (unidadEsArea(unidad)) bruta = largo * (ancho || 1) * numElem * factor;
    else if (unidadEsLineal(unidad)) bruta = largo * numElem * factor;
    const dedTotal = (sub.deducciones || []).reduce((acc, d) => acc + (numES(d.largo) || 0) * (numES(d.ancho) || 1) * (numES(d.alto) || 1), 0);
    return Math.round(Math.max(0, bruta - dedTotal) * 1000) / 1000;
  }

  const actualizarSub = (i, si, cambios) => {
    const fila = filas[i];
    const subs = [...(fila.subs || [])];
    subs[si] = { ...subs[si], ...cambios };
    const cantTotal = subs.reduce((acc, s) => acc + calcularSub(fila.unidad, fila.actividad, s), 0);
    actualizarFila(i, { subs, cantidad: cantTotal ? String(Math.round(cantTotal * 1000) / 1000) : fila.cantidad });
  };
  const agregarSub = (i) => {
    const fila = filas[i];
    const desp = factorDesperdicioSugerido(fila.actividad);
    const factorSugerido = desp !== null ? Math.round((1 + desp) * 1000) / 1000 : undefined;
    actualizarFila(i, { subs: [...(fila.subs || []), subMedicionVacia(factorSugerido)] });
  };
  const quitarSub = (i, si) => {
    const fila = filas[i];
    const subs = (fila.subs || []).filter((_, k) => k !== si);
    const cantTotal = subs.reduce((acc, s) => acc + calcularSub(fila.unidad, fila.actividad, s), 0);
    actualizarFila(i, { subs, cantidad: cantTotal ? String(Math.round(cantTotal * 1000) / 1000) : "" });
  };

  const agregarFila = () => setFilas([...filas, filaVacia()]);
  const quitarFila = (i) => setFilas(filas.filter((_, k) => k !== i));

  const totalGeneral = useMemo(
    () => filas.reduce((acc, f) => acc + (numES(f.cantidad) || 0) * (numES(f.precio) || 0), 0),
    [filas]
  );

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-presupuesto-unificado.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Presupuesto");

      ws.getCell("G6").value = aFechaDDMMYYYY(fechaLocalHoy());

      let fila = 14;
      filas.forEach((f) => {
        if (!f.actividad || (!numES(f.cantidad) && !numES(f.precio))) return;
        ws.getCell(`A${fila}`).value = nombresTipo[tipoActivo];
        ws.getCell(`B${fila}`).value = f.capitulo;
        ws.getCell(`C${fila}`).value = f.actividad;
        ws.getCell(`D${fila}`).value = f.unidad;
        ws.getCell(`E${fila}`).value = numES(f.cantidad) || 0;
        ws.getCell(`F${fila}`).value = numES(f.precio) || 0;
        fila++;
      });

      if (ocultarSinUsar) {
        for (let r = fila; r <= 513; r++) {
          ws.getRow(r).hidden = true;
        }
      }

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Presupuesto_${(proyecto || "Proyecto").replace(/[^a-zA-Z0-9]/g, "_")}_${aFechaDDMMYYYY(fechaLocalHoy()).replace(/\//g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      try { localStorage.removeItem("ryr_borrador_presupuesto"); } catch (e) {}
      // Comparte las cantidades del presupuesto con Cronograma, Acta de Obra e Informe Diario
      try {
        const guardadas = {};
        filas.forEach((f) => {
          if (f.actividad && numES(f.cantidad) > 0) {
            guardadas[f.actividad.trim().toLowerCase()] = {
              actividad: f.actividad,
              unidad: f.unidad,
              cantidad: numES(f.cantidad),
              precio: numES(f.precio) || 0,
            };
          }
        });
        localStorage.setItem("ryr_presupuesto_cantidades", JSON.stringify(guardadas));
      } catch (e) {}
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
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes un Presupuesto sin terminar</div>
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
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="presupuesto" />
      <div className="p-4 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} color={NAVY} />}
          <button onClick={onVolver} className="text-[12px]" style={{ color: NAVY }}>← Volver al portal</button>
          <span className="ml-auto">
            <IndicadorTipoProyecto claveBorrador="ryr_borrador_presupuesto" onVolver={onVolver} />
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Presupuesto nuevo
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el Presupuesto que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>
          PRESUPUESTO DE OBRA
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-3" style={{ borderColor: LINE }}>
          <div className="text-[11px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FFF8E8", color: NAVY }}>
            ⚡ Tipo de proyecto activo: <b>{nombresTipo[tipoActivo]}</b> — {cargandoCatalogo ? "cargando actividades…" : errorCatalogo ? "sin catálogo." : `${catalogo.length} actividades disponibles en el buscador.`}
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
          <input
            placeholder="Nombre del proyecto"
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-[13px]"
            style={{ borderColor: LINE }}
          />
        </div>

        {filas.map((f, i) => (
          <div key={i} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: "white" }}>
            <div className="flex items-start gap-2 mb-2">
              <BuscadorActividad
                valor={f.actividad}
                catalogo={catalogo}
                placeholder="Buscar actividad..."
                onSeleccionar={(it) => {
                  const desp = factorDesperdicioSugerido(it.actividad);
                  const factorSugerido = desp !== null ? Math.round((1 + desp) * 1000) / 1000 : undefined;
                  actualizarFila(i, { actividad: it.actividad, capitulo: it.capitulo, unidad: it.unidad, subs: [subMedicionVacia(factorSugerido)] });
                }}
              />
              {filas.length > 1 && (
                <button type="button" onClick={() => quitarFila(i)} className="text-[13px] text-red-500 px-1 shrink-0">✕</button>
              )}
            </div>
            {f.actividad && (
              <>
                <div className="rounded-lg px-2.5 py-1.5 mb-1.5" style={{ background: NAVY }}>
                  <div className="text-white text-[12.5px] font-semibold">{f.actividad}</div>
                  <div className="text-[10px]" style={{ color: GOLD }}>{f.capitulo} · Unidad: {f.unidad}</div>
                </div>
                <div className="flex items-center justify-end mb-1.5">
                  <button
                    type="button"
                    onMouseDown={() => setExpandidos({ ...expandidos, [i]: !expandidos[i] })}
                    className="text-[10.5px] px-2 py-0.5 rounded-full border shrink-0"
                    style={{ borderColor: GOLD, color: NAVY }}
                  >
                    📐 {expandidos[i] ? "Ocultar medición" : "Calcular medición"}
                  </button>
                </div>

                {expandidos[i] && (
                  <div className="mb-1.5">
                    {(f.subs && f.subs.length ? f.subs : [subMedicionVacia()]).map((sub, si) => (
                      <div key={si} className="border rounded-lg p-2 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <input placeholder="Ubicación / Frente" value={sub.ubicacion || ""} onChange={(e) => actualizarSub(i, si, { ubicacion: e.target.value })} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                          {f.subs && f.subs.length > 1 && (
                            <button type="button" onClick={() => quitarSub(i, si)} className="text-[13px] text-red-500 px-2">✕</button>
                          )}
                        </div>

                        {esActividadAcero(f.actividad) ? (
                          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                            <select
                              value={sub.denominacion || ""}
                              onChange={(e) => actualizarSub(i, si, { denominacion: e.target.value })}
                              className="border rounded px-2 py-1.5 text-[12px]"
                              style={{ borderColor: LINE }}
                            >
                              <option value="">Denominación de varilla</option>
                              {Object.keys(PESO_ACERO_KG_POR_METRO).map((d) => (
                                <option key={d} value={d}>{d} — {PESO_ACERO_KG_POR_METRO[d]} kg/m</option>
                              ))}
                            </select>
                            <input placeholder="Metros lineales" type="text" inputMode="decimal" value={sub.metros || ""} onChange={(e) => actualizarSub(i, si, { metros: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                          </div>
                        ) : (unidadNecesitaAlto(f.unidad) || unidadEsArea(f.unidad) || unidadEsLineal(f.unidad)) && (
                          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                            <input placeholder="Largo" type="text" inputMode="decimal" value={sub.largo || ""} onChange={(e) => actualizarSub(i, si, { largo: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            {!unidadEsLineal(f.unidad) && (
                              <input placeholder="Ancho" type="text" inputMode="decimal" value={sub.ancho || ""} onChange={(e) => actualizarSub(i, si, { ancho: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            )}
                            {unidadNecesitaAlto(f.unidad) && (
                              <input placeholder="Alto" type="text" inputMode="decimal" value={sub.alto || ""} onChange={(e) => actualizarSub(i, si, { alto: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-1.5 mb-1">
                          <input placeholder="N° elem." type="text" inputMode="decimal" value={sub.numElem || ""} onChange={(e) => actualizarSub(i, si, { numElem: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                          <input placeholder="Factor de desperdicio" type="text" inputMode="decimal" value={sub.factor || ""} onChange={(e) => actualizarSub(i, si, { factor: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                        </div>
                        {sub.factor && (
                          <div className="text-[10px] text-gray-500 mb-1">⚡ Factor sugerido según desperdicio típico — ajústalo si tu caso es distinto.</div>
                        )}

                        {!esActividadAcero(f.actividad) && (
                          <>
                            <div className="text-[10px] text-gray-500 mb-1">Deducciones (opcional):</div>
                            {(sub.deducciones || []).map((d, di) => (
                              <div key={di} className="flex gap-1.5 mb-1 items-center">
                                <input placeholder="Largo desc." type="text" inputMode="decimal" value={d.largo} onChange={(e) => {
                                  const nuevas = [...(sub.deducciones || [])]; nuevas[di] = { ...nuevas[di], largo: e.target.value };
                                  actualizarSub(i, si, { deducciones: nuevas });
                                }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                <input placeholder="Ancho desc." type="text" inputMode="decimal" value={d.ancho} onChange={(e) => {
                                  const nuevas = [...(sub.deducciones || [])]; nuevas[di] = { ...nuevas[di], ancho: e.target.value };
                                  actualizarSub(i, si, { deducciones: nuevas });
                                }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                <input placeholder="Alto desc." type="text" inputMode="decimal" value={d.alto} onChange={(e) => {
                                  const nuevas = [...(sub.deducciones || [])]; nuevas[di] = { ...nuevas[di], alto: e.target.value };
                                  actualizarSub(i, si, { deducciones: nuevas });
                                }} className="flex-1 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                <button type="button" onMouseDown={() => actualizarSub(i, si, { deducciones: (sub.deducciones || []).filter((_, k) => k !== di) })} className="text-[11px] text-red-500 px-1">✕</button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onMouseDown={() => actualizarSub(i, si, { deducciones: [...(sub.deducciones || []), { largo: "", ancho: "", alto: "" }] })}
                              className="w-full py-1.5 rounded-lg text-[11px] font-semibold border"
                              style={{ borderColor: GOLD, color: NAVY }}
                            >
                              + Agregar deducción
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <button
                      type="button" onClick={() => agregarSub(i)}
                      className="w-full py-2 rounded-lg text-[12px] font-semibold border-2 mb-1.5"
                      style={{ borderColor: GOLD, color: NAVY }}
                    >
                      + Agregar sitio de medición
                    </button>
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    placeholder="Cantidad"
                    type="text" inputMode="decimal"
                    value={f.cantidad}
                    onChange={(e) => actualizarFila(i, { cantidad: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-[12.5px]"
                    style={{ borderColor: LINE }}
                  />
                  <input
                    placeholder="Precio Unitario"
                    type="text" inputMode="decimal"
                    value={f.precio}
                    onChange={(e) => actualizarFila(i, { precio: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-[12.5px]"
                    style={{ borderColor: LINE }}
                  />
                  <div className="flex-1 text-[12px] text-right font-medium pt-1.5" style={{ color: NAVY }}>
                    {formatoMoneda((numES(f.cantidad) || 0) * (numES(f.precio) || 0))}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={agregarFila}
          className="w-full py-2.5 rounded-lg text-[12.5px] font-semibold border-2 mb-4"
          style={{ borderColor: GOLD, color: NAVY }}
        >
          + Agregar actividad
        </button>

        <div className="p-3 rounded-lg mb-4 text-center" style={{ background: NAVY }}>
          <div className="text-[11px]" style={{ color: GOLD }}>COSTO DIRECTO (sin AIU)</div>
          <div className="text-white font-bold text-[20px]">{formatoMoneda(totalGeneral)}</div>
        </div>

        <label className="flex items-center gap-2 mb-3 text-[12px] cursor-pointer" style={{ color: NAVY }}>
          <input type="checkbox" checked={ocultarSinUsar} onChange={(e) => setOcultarSinUsar(e.target.checked)} />
          Ocultar en el Excel las filas vacías que no se usaron
        </label>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : "Descargar Presupuesto en Excel"}
        </button>
      </div>
    </div>
  );
}
