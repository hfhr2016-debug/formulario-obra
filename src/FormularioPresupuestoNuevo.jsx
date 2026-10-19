import React, { useState, useMemo, useEffect } from "react";
import { actividadesParaFormularios, coincideActividad } from "./catalogoVivo";
import ExcelJS from "exceljs";
import { fotoLibro, estilarEscritos } from "./sstBase";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { pedirProyectoFicha } from "./proyectoElegir.js";
import { escribirMemoria, leerMemoria, NOMBRE_HOJA_MEMORIA } from "./memoriaCalculo";

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
// Valor de UNA deducción: se multiplican todas las medidas que se llenen (Largo × Ancho × Alto) por el N° de elementos
function valorDeduccion(unidad, d) {
  const medidas = [numES(d.largo) || 0, numES(d.ancho) || 0, numES(d.alto) || 0].filter((m) => m > 0);
  if (!medidas.length) return 0;
  return medidas.reduce((acc, m) => acc * m, 1) * (numES(d.cantidad) || 1);
}
function totalDeducciones(unidad, sub) { return Math.round((sub.deducciones || []).reduce((acc, d) => acc + valorDeduccion(unidad, d), 0) * 1000) / 1000; }
function unidadEsArea(unidad) { const u=(unidad||"").toLowerCase(); return u==='m²'||u==='m2'; }
function unidadEsLineal(unidad) { const u=(unidad||"").toLowerCase(); return u==='ml'||u==='m'; }

// La plantilla empieza en la columna A; si alguien le insertó columnas, se busca dónde quedó «Tipo de Proyecto» para escribir en el lugar correcto.
function textoCelda(v) { if (v && typeof v === "object") return String(v.text || (v.richText ? v.richText.map((x) => x.text).join("") : "") || ""); return String(v ?? ""); }
function columnaInicial(ws) {
  try { for (let c = 1; c <= 8; c++) if (textoCelda(ws.getCell(13, c).value).trim().toLowerCase() === "tipo de proyecto") return c; } catch (e) { /* si no se encuentra, la A */ }
  return 1;
}

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

function catalogoFiltrado() {
  const modulos = leerTipoProyecto();
  const bloquesHC = leerBloquesHC();
  let tipoActivo = "edificacion";
  if (modulos.vias) tipoActivo = "vias";
  else if (modulos.hidrocarburos) tipoActivo = "hidrocarburos";
  else if (modulos.edificacion) tipoActivo = "edificacion";

  let filtrado = actividadesParaFormularios(tipoActivo);   // las de los tres tipos, primero las del tipo del proyecto
  if (tipoActivo === "hidrocarburos") {
    const algunBloque = bloquesHC.civil || bloquesHC.mecanico || bloquesHC.electrico;
    if (algunBloque) {
      filtrado = filtrado.filter((a) => a.tipo !== "hidrocarburos" || bloquesHC[a.componente]);
    }
  }
  return { tipoActivo, catalogo: filtrado };
}

// APU guardado de la actividad (se busca por el nombre exacto, sin importar el tipo de proyecto)
function apuDeActividad(nombre) {
  try {
    const apus = JSON.parse(localStorage.getItem("ryr_apus_guardados") || "{}");
    const apu = apus[String(nombre || "").trim().toLowerCase()];
    return apu && Number(apu.total) > 0 ? apu : null;
  } catch (e) { return null; }
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
    [/pañete|revoque|mortero|repello|masilla|sellador|imprimante/, 0.10],
    [/impermeabiliz|aislamiento/, 0.05],
    [/drywall|sistema liviano|cielo raso|cielorraso/, 0.08],
    [/guardaescoba|piso|silicona|sello|junta/, 0.05],
    [/malla/, 0.05],
    [/espejo|puerta|ventana|divisiones de aluminio|reja|baranda|pasamanos|escalera|perfiles|cercha|elementos metálicos|placas, pernos/, 0.03],
    [/andén|sardinel|bordillo|canal|bajante|ducto|red interna/, 0.05],
    [/tierra vegetal/, 0.05],
    [/mezcla|emulsi|riego|tratamiento superficial|lechada|bacheo|asfált/, 0.05],
    [/geotextil|geomalla|geomembrana/, 0.10],
    [/baldosa|granito/, 0.08],
    [/lámina|zinc|cerca de|pilote|pernos/, 0.03],
    [/demarcación|marca vial|marcas viales/, 0.05],
    [/terraplén|terraplen|pedraplén|pedraplen|relleno|material granular|subrasante|base estabilizada|mejoramiento/, 0.10],
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
    const coincide = catalogo.filter((it) => coincideActividad(it, texto));
    coincide.sort((a, b) => {
      const aEmpieza = a.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      const bEmpieza = b.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
      return a.actividad.length - b.actividad.length;
    });
    return coincide.slice(0, 60);
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
      const c0 = columnaInicial(ws);
      let memoria = new Map();
      try { memoria = leerMemoria(workbook.getWorksheet(NOMBRE_HOJA_MEMORIA)); } catch (e) { /* archivo sin hoja de memoria */ }
      for (let r = 14; r <= 513; r++) {
        const act = ws.getCell(r, c0 + 2).value;
        if (!act) continue;
        nuevasFilas.push({
          actividad: textoCelda(act),
          capitulo: textoCelda(ws.getCell(r, c0 + 1).value),
          unidad: textoCelda(ws.getCell(r, c0 + 3).value),
          cantidad: String(ws.getCell(r, c0 + 4).value || ""),
          precio: String(ws.getCell(r, c0 + 5).value || ""),
          subs: (memoria.get("P-" + String(r).padStart(3, "0")) || []).map((m) => ({ ubicacion: m.ubicacion, largo: m.largo, ancho: m.ancho, alto: m.alto, numElem: m.numElem, factor: m.factor, deducciones: m.deducciones, denominacion: "", metros: "" })),
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

  const { tipoActivo, catalogo } = useMemo(() => catalogoFiltrado(), []);

  const nombresTipo = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };

  const actualizarFila = (i, cambios) => {
    const nuevas = [...filas];
    nuevas[i] = { ...nuevas[i], ...cambios };
    setFilas(nuevas);
  };

  function brutaSub(unidad, actividad, sub) {
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
    else if (unidadEsArea(unidad)) bruta = largo * (ancho || 1) * (alto || 1) * numElem * factor;   // en m²: se multiplican las medidas que se llenen (Largo × Ancho, o Largo × Alto para muros)
    else if (unidadEsLineal(unidad)) bruta = largo * numElem * factor;
    return bruta;
  }
  function calcularSub(unidad, actividad, sub) {
    const dedTotal = totalDeducciones(unidad, sub);
    return Math.round(Math.max(0, brutaSub(unidad, actividad, sub) - dedTotal) * 1000) / 1000;
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

  function armarBloqueMemoria(f, fila) {
    const id = "P-" + String(fila).padStart(3, "0");
    const subsConDatos = (f.subs || []).filter((sb) => calcularSub(f.unidad, f.actividad, sb) > 0 || brutaSub(f.unidad, f.actividad, sb) > 0);
    if (!subsConDatos.length) {
      return { id, capitulo: f.capitulo, actividad: f.actividad, unidad: f.unidad, subs: [{ tipo: "manual", final: numES(f.cantidad) || 0 }] };
    }
    return {
      id, capitulo: f.capitulo, actividad: f.actividad, unidad: f.unidad,
      subs: subsConDatos.map((sb) => {
        const acero = esActividadAcero(f.actividad);
        return {
          ubicacion: sb.ubicacion || "", tipo: acero ? "acero" : "dim",
          largo: numES(sb.largo) || 0, ancho: numES(sb.ancho) || 0, alto: numES(sb.alto) || 0,
          numElem: numES(sb.numElem) || 1, factor: numES(sb.factor) || 1,
          metros: numES(sb.metros) || 0, kgPorMetro: (sb.denominacion && PESO_ACERO_KG_POR_METRO[sb.denominacion]) || 0,
          bruta: brutaSub(f.unidad, f.actividad, sb),
          deducciones: acero ? [] : (sb.deducciones || []).filter((d) => (d.nombre || "").trim() || valorDeduccion(f.unidad, d)).map((d) => ({ nombre: d.nombre || "", largo: numES(d.largo) || 0, ancho: numES(d.ancho) || 0, alto: numES(d.alto) || 0, cantidad: numES(d.cantidad) || 1, valor: valorDeduccion(f.unidad, d) })),
          final: calcularSub(f.unidad, f.actividad, sb),
        };
      }),
    };
  }

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-presupuesto-unificado.xlsx?v=" + Date.now(), { cache: "no-store" });
      if (!resp.ok || /text\/html/i.test(resp.headers.get("content-type") || "")) throw new Error("No se encontró la plantilla del Presupuesto en el sitio (el archivo plantilla-presupuesto-unificado.xlsx debe estar dentro de la carpeta public).");
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const fotoEstilo = fotoLibro(workbook);
      const ws = workbook.getWorksheet("Presupuesto");

      const c0 = columnaInicial(ws);
      ws.getCell(6, c0 + 6).value = aFechaDDMMYYYY(fechaLocalHoy());
      try { if (proyecto) ws.getCell(12, c0 + 1).value = proyecto; } catch (e) { /* el nombre del proyecto es opcional */ }

      let fila = 14;
      const bloquesMemoria = [];
      filas.forEach((f) => {
        if (!f.actividad || (!numES(f.cantidad) && !numES(f.precio))) return;
        try { bloquesMemoria.push(armarBloqueMemoria(f, fila)); } catch (e) { console.error("memoria de cálculo", e); }
        ws.getCell(fila, c0).value = nombresTipo[tipoActivo];
        ws.getCell(fila, c0 + 1).value = f.capitulo;
        ws.getCell(fila, c0 + 2).value = f.actividad;
        ws.getCell(fila, c0 + 3).value = f.unidad;
        ws.getCell(fila, c0 + 4).value = numES(f.cantidad) || 0;
        ws.getCell(fila, c0 + 5).value = numES(f.precio) || 0;
        fila++;
      });

      // Resumen por capítulo: debajo del presupuesto, con las mismas columnas (Capítulo en C, Subtotal en G)
      try {
        const capitulos = [];
        filas.forEach((f) => { if (f.actividad && (numES(f.cantidad) || numES(f.precio)) && f.capitulo && !capitulos.includes(f.capitulo)) capitulos.push(f.capitulo); });
        if (capitulos.length) {
          const AZUL = "FF1F3864", CLARO = "FFEAF0F6";
          const borde = { style: "thin", color: { argb: "FFBFC9D9" } };
          const bordes = { top: borde, left: borde, bottom: borde, right: borde };
          const clonar = (o) => JSON.parse(JSON.stringify(o || {}));
          const enPlantilla = textoCelda(ws.getCell(528, c0).value).trim() !== "";   // plantilla con el resumen ya diseñado
          // Estilos de la plantilla (títulos y filas modelo) antes de escribir
          const modeloDato = [], modeloTotal = [];
          for (let k = 0; k <= 6; k++) { modeloDato.push(clonar(ws.getCell(530, c0 + k).style)); modeloTotal.push(clonar(ws.getCell(532, c0 + k).style)); }
          let r = 528;
          if (!enPlantilla) {
            const t = ws.getCell(r, c0);
            t.value = "RESUMEN POR CAPÍTULO";
            ws.mergeCells(r, c0, r, c0 + 6);
            t.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
            t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
            t.alignment = { horizontal: "center", vertical: "middle" };
            ws.getCell(r + 1, c0 + 2).value = "Capítulo"; ws.getCell(r + 1, c0 + 6).value = "Subtotal";
            for (let k = 0; k <= 6; k++) {
              const c = ws.getCell(r + 1, c0 + k);
              c.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
              c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
              c.alignment = { horizontal: "center", vertical: "middle" }; c.border = bordes;
            }
          }
          r++;
          const primera = r + 1;
          const poner = (fila, modelo, extra) => {
            for (let k = 0; k <= 6; k++) {
              const c = ws.getCell(fila, c0 + k);
              if (enPlantilla) c.style = clonar(modelo[k]);
              else {
                c.font = { name: "Calibri", size: 10, bold: !!extra }; c.border = bordes;
                if (extra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLARO } };
                c.alignment = { vertical: "middle", horizontal: k === 6 ? "right" : "left" };
              }
            }
            ws.getCell(fila, c0 + 6).numFmt = '"$" #,##0.00';
          };
          capitulos.forEach((cap) => {
            r++;
            ws.getCell(r, c0 + 2).value = cap;
            ws.getCell(r, c0 + 6).value = { formula: "SUMIF($B$14:$B$512,C" + r + ",$G$14:$G$512)" };
            poner(r, modeloDato, false);
          });
          r++;
          ws.getCell(r, c0 + 2).value = "TOTAL";
          ws.getCell(r, c0 + 6).value = { formula: "SUM(G" + primera + ":G" + (r - 1) + ")" };
          poner(r, modeloTotal, true);
        }
      } catch (e) { console.error("No se pudo escribir el resumen por capítulo", e); }

      if (ocultarSinUsar) {
        for (let r = fila; r <= 513; r++) {
          ws.getRow(r).hidden = true;
        }
      }

      estilarEscritos(workbook, fotoEstilo);

      try { escribirMemoria(workbook, bloquesMemoria, { proyecto, fecha: aFechaDDMMYYYY(fechaLocalHoy()) }); }
      catch (e) { console.error("No se pudo escribir la hoja de memoria de cálculo", e); }

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
              capitulo: f.capitulo || "",   // lo usa Control Presupuestal para agrupar por capítulo
            };
          }
        });
        localStorage.setItem("ryr_presupuesto_cantidades", JSON.stringify(guardadas));
      } catch (e) {}
    } catch (e) {
      console.error(e);
      alert("Hubo un error generando el Excel: " + ((e && e.message) || e) + "\n\n(Si este mensaje se repite, envíaselo a soporte tal cual.)");
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
        <button onClick={descartarBorrador} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
          Empezar en blanco
        </button>
        {onVolver && (
          <button onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>
            ← Volver al portal
          </button>
        )}
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

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg flex items-center justify-between" style={{ background: NAVY }}>
          Presupuesto
          <IndicadorTipoProyecto />
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-3" style={{ borderColor: LINE }}>
          <div className="text-[11px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FFF8E8", color: NAVY }}>
            ⚡ Tipo de proyecto activo: <b>{nombresTipo[tipoActivo]}</b> — {catalogo.length} actividades disponibles en el buscador.
          </div>
          <button
            type="button"
            onClick={() => { pedirProyectoFicha(() => {
              try {
                const lista = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
                if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
                setProyecto(lista[0].datos.proyecto || "");
                alert(`Nombre traído de: "${lista[0].nombreId}"`);
              } catch (e) {
                alert("No se pudo leer la memoria de Ficha Técnica.");
              }
            });}}
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
                  const apu = apuDeActividad(it.actividad);   // un solo APU por actividad, sirve en cualquier tipo de proyecto
                  actualizarFila(i, { actividad: it.actividad, capitulo: it.capitulo, unidad: it.unidad, subs: [subMedicionVacia(factorSugerido)], precio: apu ? String(Math.round(apu.total * 100) / 100) : (f.precioDeAPU ? "" : f.precio), precioDeAPU: !!apu });
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
                              className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]"
                              style={{ borderColor: LINE }}
                            >
                              <option value="">Denominación de varilla</option>
                              {Object.keys(PESO_ACERO_KG_POR_METRO).map((d) => (
                                <option key={d} value={d}>{d} — {PESO_ACERO_KG_POR_METRO[d]} kg/m</option>
                              ))}
                            </select>
                            <input placeholder="Metros lineales" type="text" inputMode="decimal" value={sub.metros || ""} onChange={(e) => actualizarSub(i, si, { metros: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                          </div>
                        ) : (unidadNecesitaAlto(f.unidad) || unidadEsArea(f.unidad) || unidadEsLineal(f.unidad)) && (
                          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                            <input placeholder="Largo" type="text" inputMode="decimal" value={sub.largo || ""} onChange={(e) => actualizarSub(i, si, { largo: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            {!unidadEsLineal(f.unidad) && (
                              <input placeholder="Ancho" type="text" inputMode="decimal" value={sub.ancho || ""} onChange={(e) => actualizarSub(i, si, { ancho: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            )}
                            {(unidadNecesitaAlto(f.unidad) || unidadEsArea(f.unidad)) && (
                              <input placeholder="Alto" data-medicion-alto type="text" inputMode="decimal" value={sub.alto || ""} onChange={(e) => actualizarSub(i, si, { alto: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-1.5 mb-1">
                          <input placeholder="N° elem." type="text" inputMode="decimal" value={sub.numElem || ""} onChange={(e) => actualizarSub(i, si, { numElem: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                          <input placeholder="Factor de desperdicio" type="text" inputMode="decimal" value={sub.factor || ""} onChange={(e) => actualizarSub(i, si, { factor: e.target.value })} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                        </div>
                        {sub.factor && (
                          <div className="text-[10px] text-gray-500 mb-1">⚡ Factor sugerido según desperdicio típico — ajústalo si tu caso es distinto.</div>
                        )}

                        {!esActividadAcero(f.actividad) && (
                          <>
                            <div className="text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Deducciones (opcional) <span className="font-normal text-gray-500">— descríbelas (Ventana 1, Puerta…) y quedan en la memoria del Excel</span></div>
                            {(sub.deducciones || []).length > 0 && (
                              <div className="grid gap-1.5 mb-0.5 text-[10px] text-gray-500" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.8fr) 22px" }}>
                                <span>Descripción</span><span>Largo</span><span>Ancho</span><span>Alto</span><span>N° elem.</span><span></span>
                              </div>
                            )}
                            {(sub.deducciones || []).map((d, di) => {
                              const cambiar = (campo, valor) => { const nuevas = [...(sub.deducciones || [])]; nuevas[di] = { ...nuevas[di], [campo]: valor }; actualizarSub(i, si, { deducciones: nuevas }); };
                              return (
                                <div key={di} data-deduccion className="grid gap-1.5 mb-1 items-center" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.8fr) 22px" }}>
                                  <input placeholder="Ej. Ventana 1" data-deduccion-nombre type="text" value={d.nombre || ""} onChange={(e) => cambiar("nombre", e.target.value)} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                  <input placeholder="Largo" type="text" inputMode="decimal" value={d.largo} onChange={(e) => cambiar("largo", e.target.value)} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                  <input placeholder="Ancho" type="text" inputMode="decimal" value={d.ancho} onChange={(e) => cambiar("ancho", e.target.value)} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                  <input placeholder="Alto" type="text" inputMode="decimal" value={d.alto} onChange={(e) => cambiar("alto", e.target.value)} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                  <input placeholder="N°" data-deduccion-cantidad type="text" inputMode="decimal" value={d.cantidad || ""} onChange={(e) => cambiar("cantidad", e.target.value)} className="w-full min-w-0 border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                                  <button type="button" onMouseDown={() => actualizarSub(i, si, { deducciones: (sub.deducciones || []).filter((_, k) => k !== di) })} className="text-[12px] text-red-500 text-center" aria-label="Quitar deducción">✕</button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onMouseDown={() => actualizarSub(i, si, { deducciones: [...(sub.deducciones || []), { nombre: "", largo: "", ancho: "", alto: "", cantidad: "" }] })}
                              className="w-full py-1.5 rounded-lg text-[11px] font-semibold border"
                              style={{ borderColor: GOLD, color: NAVY }}
                            >
                              + Agregar deducción
                            </button>
                            {(sub.deducciones || []).length > 0 && (
                              <div data-total-deducciones className="mt-1.5 flex items-center justify-between rounded-lg px-2 py-1.5 border text-[12px]" style={{ borderColor: LINE, background: "#fff" }}>
                                <span className="font-bold" style={{ color: NAVY }}>Total deducciones</span>
                                <span className="font-bold">{totalDeducciones(f.unidad, sub)} {f.unidad}</span>
                              </div>
                            )}
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

                <div className="rounded-lg border p-2.5" style={{ borderColor: LINE, background: PAPER }} data-totales>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[12.5px] font-bold shrink-0" style={{ color: NAVY, width: 112 }}>Total</div>
                    <input
                      placeholder="Cantidad"
                      aria-label="Total de la cantidad"
                      type="text" inputMode="decimal"
                      value={f.cantidad}
                      onChange={(e) => actualizarFila(i, { cantidad: e.target.value })}
                      className="flex-1 min-w-0 border rounded px-2 py-1.5 text-[14px] font-bold text-right"
                      style={{ borderColor: LINE, color: NAVY }}
                    />
                    <div className="text-[12.5px] font-bold shrink-0 w-10" style={{ color: NAVY }} data-unidad-total>{f.unidad}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[12px] font-semibold shrink-0" style={{ color: NAVY, width: 112 }}>Precio Unitario</div>
                    <input
                      placeholder="Precio Unitario"
                      type="text" inputMode="decimal"
                      value={f.precio}
                      onChange={(e) => actualizarFila(i, { precio: e.target.value, precioDeAPU: false })}
                      className="flex-1 min-w-0 border rounded px-2 py-1.5 text-[13px] text-right"
                      style={{ borderColor: LINE }}
                    />
                    <div className="text-[11px] text-gray-500 shrink-0 w-10">{f.unidad ? "/ " + f.unidad : ""}</div>
                  </div>
                  {f.precioDeAPU
                    ? <div className="text-[10.5px] mb-1.5" style={{ color: "#2E7D32" }} data-precio-apu>✓ Precio unitario traído del APU de esta actividad (puedes cambiarlo).</div>
                    : (!f.precio && <div className="text-[10.5px] text-gray-500 mb-1.5" data-sin-apu>Esta actividad aún no tiene APU guardado: escribe el precio o crea el APU y se cargará solo.</div>)}
                  <div className="flex items-center gap-2 pt-1.5 border-t" style={{ borderColor: LINE }}>
                    <div className="text-[12.5px] font-bold shrink-0" style={{ color: NAVY, width: 112 }}>Valor Total</div>
                    <div className="flex-1 text-right text-[15px] font-bold" style={{ color: NAVY }} data-valor-total>
                      {formatoMoneda((numES(f.cantidad) || 0) * (numES(f.precio) || 0))}
                    </div>
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
