import { useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import { ChevronDown, Plus, Trash2, Camera, X, Loader2, FileSpreadsheet } from "lucide-react";
import {
  CODIGO_FORMATO, CELDAS, PELIGROS, EPP, TIPOS_CHARLA, CLIMAS, ORDEN_ASEO, SINTOMAS, TEMAS_SUGERIDOS,
  MAX_ASISTENTES, fechaHoyISO, textoDuracion, parsearPegado, escribirCharlaEnHoja, validarCharla,
} from "./charlaDiariaDatos";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#EEF1F6";
const LINE = "#D9DCE1";

const CLAVE_BORRADOR = "ryr_borrador_charla";
const CLAVE_FIRMANTES = "ryr_sst_firmantes";
const CLAVE_CONSECUTIVO = "ryr_sst_charla_consecutivo";
const CLAVE_ULTIMOS = "ryr_sst_ultimos_asistentes";

// ---------- Memoria local (nunca debe romper la pantalla si el navegador la bloquea) ----------
function leerJSON(clave, porDefecto) {
  try {
    const t = localStorage.getItem(clave);
    return t ? JSON.parse(t) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}
function guardarJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
function borrar(clave) {
  try { localStorage.removeItem(clave); } catch (e) {}
}

function datosIniciales() {
  const firmantes = leerJSON(CLAVE_FIRMANTES, {});
  const ultimo = parseInt((() => { try { return localStorage.getItem(CLAVE_CONSECUTIVO); } catch (e) { return "0"; } })() || "0", 10) || 0;
  const tipoProyecto = leerJSON("ryr_tipo_proyecto", null);
  return {
    fecha: fechaHoyISO(), horaInicio: "", horaFin: "", nCharla: String(ultimo + 1),
    proyecto: (tipoProyecto && tipoProyecto.proyecto) || "",
    contratista: "REFORMAS Y REMODELACIONES", ubicacion: "", frente: "",
    tipo: TIPOS_CHARLA[0],
    facilitadorNombre: firmantes.facilitadorNombre || "", facilitadorCargo: firmantes.facilitadorCargo || "",
    tema: "", contenido: "",
    actividades: "", peligros: [], otrosPeligros: "", medidas: "", epp: [], otrosEpp: "",
    clima: CLIMAS[0], ordenAseo: ORDEN_ASEO[0], sintomas: SINTOMAS[0], novedades: "",
    asistentes: [], personalTotal: "",
    responsableNombre: firmantes.responsableNombre || "", responsableCargo: firmantes.responsableCargo || "",
  };
}

// ¿La charla ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.tema || d.contenido || d.actividades || d.medidas || d.novedades || d.horaInicio || d.horaFin ||
    d.asistentes.length || d.peligros.length || d.epp.length || d.otrosPeligros || d.otrosEpp);
}

// ---------- Fotos ----------
function comprimirFoto(file, maxAncho = 1000, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("No se pudo procesar la foto"));
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        calidad
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto")); };
    img.src = url;
  });
}

// El logo se agrega desde el código (no va dentro de la plantilla) para evitar problemas con las imágenes del Excel.
async function agregarLogo(workbook, ws) {
  try {
    const r = await fetch("/logo-header.png");
    if (!r.ok) return;
    const buf = await r.arrayBuffer();
    const dims = await new Promise((resolve) => {
      const url = URL.createObjectURL(new Blob([buf], { type: "image/png" }));
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); resolve({ w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      im.src = url;
    });
    const alto = 74;
    const ancho = dims && dims.h ? Math.round((alto * dims.w) / dims.h) : 190;
    const id = workbook.addImage({ buffer: buf, extension: "png" });
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: Math.min(ancho, 225), height: alto } });
  } catch (e) {
    console.warn("No se pudo agregar el logo:", e);
  }
}

// ---------- Componentes de pantalla ----------
function Seccion({ id, titulo, subtitulo, abierta, onToggle, contador, children }) {
  return (
    <div className="border-b" style={{ borderColor: LINE }}>
      <button type="button" onClick={() => onToggle(id)} className="w-full flex items-center justify-between py-3.5 px-1 text-left">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: NAVY }}>{titulo}</div>
          {subtitulo && <div className="text-[11px]" style={{ color: "#8A8F99" }}>{subtitulo}</div>}
        </div>
        <div className="flex items-center gap-2">
          {contador > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: GOLD, color: "white" }}>{contador}</span>
          )}
          <ChevronDown size={18} style={{ color: NAVY, transform: abierta ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </div>
      </button>
      {abierta && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}

const claseInput = "w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none";
const estiloInput = { borderColor: LINE, background: "white" };
const etiquetaCls = "block text-[10px] uppercase tracking-wide mb-1 font-medium";

function Campo({ label, value, onChange, placeholder, type = "text", lista, inputMode }) {
  return (
    <div className="w-full">
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <input
        type={type}
        value={value}
        list={lista}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={claseInput}
        style={estiloInput}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

function AreaTexto({ label, value, onChange, placeholder, filas = 3 }) {
  return (
    <div className="w-full">
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <textarea
        rows={filas}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={claseInput + " resize-none"}
        style={estiloInput}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

function Lista({ label, value, onChange, opciones }) {
  return (
    <div className="w-full">
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={claseInput + " bg-white"} style={estiloInput}>
        {opciones.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}

function SelectorHora({ label, value, onChange }) {
  const [h, m] = (value || "").split(":");
  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutos = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  return (
    <div className="flex-1 min-w-0">
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <div className="flex items-center gap-1">
        <select value={h || ""} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} className="flex-1 min-w-0 text-[13.5px] px-2 py-2 rounded-md border outline-none bg-white" style={{ borderColor: LINE }}>
          <option value="" disabled>Hora</option>
          {horas.map((v) => (<option key={v} value={v}>{v}</option>))}
        </select>
        <span className="text-[13.5px] font-semibold" style={{ color: "#8A8F99" }}>:</span>
        <select value={m || ""} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} className="flex-1 min-w-0 text-[13.5px] px-2 py-2 rounded-md border outline-none bg-white" style={{ borderColor: LINE }}>
          <option value="" disabled>Min</option>
          {minutos.map((v) => (<option key={v} value={v}>{v}</option>))}
        </select>
      </div>
    </div>
  );
}

function Chips({ opciones, elegidas, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((op) => {
        const on = elegidas.includes(op);
        return (
          <button
            key={op}
            type="button"
            onClick={() => onChange(on ? elegidas.filter((x) => x !== op) : [...elegidas, op])}
            className="text-[11.5px] px-2.5 py-1.5 rounded-full border text-left"
            style={{ background: on ? NAVY : "white", color: on ? "white" : NAVY, borderColor: on ? NAVY : LINE, fontWeight: on ? 600 : 400 }}
          >
            {on ? "✓ " : ""}{op}
          </button>
        );
      })}
    </div>
  );
}

function CasillaFoto({ foto, numero, onChange, onRemove }) {
  const inputRef = useRef(null);
  function manejarArchivo(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    onChange({ file, previewUrl: URL.createObjectURL(file), caption: foto.caption });
  }
  return (
    <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
      {foto.previewUrl ? (
        <div className="relative">
          <img src={foto.previewUrl} alt={`Foto ${numero}`} className="w-full h-32 object-cover rounded-md" />
          <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current && inputRef.current.click()} className="w-full h-32 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5" style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={22} />
          <span className="text-[11px] font-medium">Foto {numero}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} />
      {foto.previewUrl && (
        <input
          type="text"
          value={foto.caption}
          onChange={(e) => onChange({ ...foto, caption: e.target.value })}
          placeholder="Descripción de la foto"
          className="w-full mt-2 text-[12px] px-2 py-1.5 rounded-md border outline-none"
          style={{ borderColor: LINE, background: "white" }}
        />
      )}
    </div>
  );
}

// =====================================================================================
export default function FormularioCharlaDiaria({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [fotos, setFotos] = useState([{ file: null, previewUrl: "", caption: "" }, { file: null, previewUrl: "", caption: "" }]);
  const [abierta, setAbierta] = useState("general");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState(false);
  const [pegarAbierto, setPegarAbierto] = useState(false);
  const [textoPegado, setTextoPegado] = useState("");
  const [avisoAsistentes, setAvisoAsistentes] = useState("");

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem(CLAVE_BORRADOR); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem(CLAVE_BORRADOR); } catch (e) { return true; }
  });

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  // ---- Borrador (las fotos no se guardan) ----
  useEffect(() => {
    if (!borradorAplicado) return;
    if (tieneContenido(d)) guardarJSON(CLAVE_BORRADOR, d);
    else borrar(CLAVE_BORRADOR);
  }, [d, borradorAplicado]);

  // ---- Recuerda facilitador y responsable (así no hay que escribirlos cada día) ----
  useEffect(() => {
    if (!borradorAplicado) return;
    guardarJSON(CLAVE_FIRMANTES, {
      facilitadorNombre: d.facilitadorNombre, facilitadorCargo: d.facilitadorCargo,
      responsableNombre: d.responsableNombre, responsableCargo: d.responsableCargo,
    });
  }, [borradorAplicado, d.facilitadorNombre, d.facilitadorCargo, d.responsableNombre, d.responsableCargo]);

  function restaurarBorrador() {
    const guardado = leerJSON(CLAVE_BORRADOR, null);
    if (guardado) setD({ ...datosIniciales(), ...guardado });
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    borrar(CLAVE_BORRADOR);
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({
      ...cur,
      proyecto: f.proyecto || cur.proyecto,
      contratista: f.contratista || cur.contratista,
      ubicacion: f.ubicacion || cur.ubicacion,
    }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Asistentes ----
  const asistentes = d.asistentes;
  const setAsistentes = (nuevos) => setD((cur) => ({ ...cur, asistentes: nuevos }));
  const hayEspacio = asistentes.length < MAX_ASISTENTES;

  function agregarAsistente() {
    if (!hayEspacio) { setAvisoAsistentes(`El formato tiene espacio para ${MAX_ASISTENTES} asistentes. Para más personas, genera una segunda hoja de esta charla.`); return; }
    setAvisoAsistentes("");
    setAsistentes([...asistentes, { nombre: "", documento: "", cargo: "", empresa: d.contratista }]);
  }
  function actualizarAsistente(i, campo, valor) {
    setAsistentes(asistentes.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)));
  }
  function quitarAsistente(i) {
    setAsistentes(asistentes.filter((_, idx) => idx !== i));
    setAvisoAsistentes("");
  }
  function agregarVarios(lista) {
    const libres = MAX_ASISTENTES - asistentes.length;
    const nuevos = lista.slice(0, Math.max(0, libres)).map((a) => ({ ...a, empresa: a.empresa || d.contratista }));
    setAsistentes([...asistentes, ...nuevos]);
    setAvisoAsistentes(
      lista.length > libres
        ? `Se agregaron ${nuevos.length} de ${lista.length}: el formato tiene espacio para ${MAX_ASISTENTES} asistentes.`
        : ""
    );
  }
  function aplicarPegado() {
    const lista = parsearPegado(textoPegado);
    if (!lista.length) { setAvisoAsistentes("No encontré nombres en el texto pegado."); return; }
    agregarVarios(lista);
    setTextoPegado("");
    setPegarAbierto(false);
  }
  const ultimos = leerJSON(CLAVE_ULTIMOS, []);
  function cargarUltimos() {
    if (asistentes.length && !window.confirm("Ya hay asistentes escritos. ¿Reemplazarlos por los de la última charla?")) return;
    setAsistentes(ultimos.slice(0, MAX_ASISTENTES).map((a) => ({ ...a })));
    setAvisoAsistentes("");
  }

  const nAsistentes = asistentes.filter((a) => a.nombre && a.nombre.trim()).length;
  const totalObra = Number(d.personalTotal);
  const cobertura = totalObra > 0 ? Math.round((nAsistentes / totalObra) * 100) : null;

  // ---- Fotos ----
  const actualizarFoto = (i, nueva) => setFotos((cur) => cur.map((f, idx) => (idx === i ? nueva : f)));
  const quitarFoto = (i) => actualizarFoto(i, { file: null, previewUrl: "", caption: "" });

  // ---- Generar Excel ----
  async function generarExcel() {
    setMensajeError("");
    const faltan = validarCharla(d);
    if (faltan.length) {
      setMensajeError("Falta completar: " + faltan.join(", ") + ".");
      return;
    }
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-charla-diaria.xlsx?v=" + Date.now(), { cache: "no-store" });
      if (!resp.ok) throw new Error("No se pudo cargar la plantilla (código " + resp.status + "). ¿Está subido public/plantilla-charla-diaria.xlsx?");
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Charla Diaria");
      if (!ws) throw new Error('No se encontró la hoja "Charla Diaria" en la plantilla');

      escribirCharlaEnHoja(ws, d);
      await agregarLogo(workbook, ws);

      const posiciones = [
        { pos: CELDAS.foto1, caption: CELDAS.captionFoto1 },
        { pos: CELDAS.foto2, caption: CELDAS.captionFoto2 },
      ];
      for (let i = 0; i < fotos.length; i++) {
        if (!fotos[i].file) continue;
        const buf = await comprimirFoto(fotos[i].file);
        const id = workbook.addImage({ buffer: buf, extension: "jpeg" });
        ws.addImage(id, { tl: posiciones[i].pos.tl, br: posiciones[i].pos.br });
        if (fotos[i].caption) ws.getCell(posiciones[i].caption).value = fotos[i].caption;
      }

      const salida = await workbook.xlsx.writeBuffer();
      const blob = new Blob([salida], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Charla_Diaria_${d.fecha || "sin-fecha"}_N${d.nCharla || "0"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Memoria para la próxima charla
      guardarJSON(CLAVE_ULTIMOS, asistentes.filter((x) => x.nombre && x.nombre.trim()));
      const n = parseInt(d.nCharla, 10);
      if (!isNaN(n)) { try { localStorage.setItem(CLAVE_CONSECUTIVO, String(n)); } catch (e) {} }
      borrar(CLAVE_BORRADOR);
      setGenerado(true);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  function nuevaCharla() {
    if (!window.confirm("¿Empezar una charla nueva? Se limpian los datos de esta (el facilitador y el responsable se conservan).")) return;
    borrar(CLAVE_BORRADOR);
    setD(datosIniciales());
    setFotos([{ file: null, previewUrl: "", caption: "" }, { file: null, previewUrl: "", caption: "" }]);
    setGenerado(false);
    setMensajeError("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  // ---------------- Pantalla de borrador ----------------
  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes una charla sin terminar</div>
        <div className="text-[12.5px] text-gray-500 mb-5">
          Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel (las fotos no se guardan, hay que volver a subirlas). ¿Quieres continuar donde quedaste?
        </div>
        <button type="button" onClick={restaurarBorrador} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
          ▶ Continuar donde quedé
        </button>
        <button type="button" onClick={descartarBorrador} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
          Empezar en blanco
        </button>
        {onVolver && (
          <button type="button" onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>← Volver a Gestión SST</button>
        )}
      </div>
    );
  }

  // ---------------- Formulario ----------------
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <datalist id="temas-charla">
        {TEMAS_SUGERIDOS.map((t) => (<option key={t} value={t} />))}
      </datalist>

      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            {onVolver && (
              <button type="button" onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px] mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                Gestión SST
              </button>
            )}
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CHARLA DIARIA DE SEGURIDAD</div>
            <div className="text-[11px]" style={{ color: GOLD }}>{CODIGO_FORMATO} · Charla de 5 minutos</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS GENERALES */}
        <Seccion id="general" titulo="1. Datos generales" subtitulo="Fecha, hora, lugar y quién dicta la charla" abierta={abierta === "general"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
              <Campo label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="N° de charla" value={d.nCharla} inputMode="numeric" onChange={(v) => set("nCharla", v.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            {textoDuracion(d.horaInicio, d.horaFin) && (
              <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>⏱ Duración: {textoDuracion(d.horaInicio, d.horaFin)}</div>
            )}
            <Campo label="Frente / lugar de la charla" value={d.frente} onChange={(v) => set("frente", v)} placeholder="Ej. Torre A, piso 3" />
            <Lista label="Tipo de charla" value={d.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_CHARLA} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Facilitador (nombre)" value={d.facilitadorNombre} onChange={(v) => set("facilitadorNombre", v)} />
              <Campo label="Cargo del facilitador" value={d.facilitadorCargo} onChange={(v) => set("facilitadorCargo", v)} />
            </div>
          </div>
        </Seccion>

        {/* 2. TEMA */}
        <Seccion id="tema" titulo="2. Tema de la charla" subtitulo="Qué se explicó y qué se acordó" abierta={abierta === "tema"} onToggle={alternar} contador={d.tema ? 1 : 0}>
          <div className="space-y-2.5">
            <Campo label="Tema principal" value={d.tema} lista="temas-charla" placeholder="Elige uno de la lista o escribe el tuyo" onChange={(v) => set("tema", v)} />
            <AreaTexto label="Contenido / puntos tratados" filas={5} value={d.contenido} onChange={(v) => set("contenido", v)} placeholder="Ideas principales que se explicaron al personal" />
          </div>
        </Seccion>

        {/* 3. ACTIVIDADES, PELIGROS Y CONTROLES */}
        <Seccion id="peligros" titulo="3. Actividades, peligros y controles" subtitulo="Qué se hace hoy y cómo se cuidan" abierta={abierta === "peligros"} onToggle={alternar} contador={d.peligros.length + d.epp.length}>
          <div className="space-y-3">
            <AreaTexto label="Actividades programadas hoy" filas={3} value={d.actividades} onChange={(v) => set("actividades", v)} />
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1.5 font-medium" style={{ color: "#8A8F99" }}>Peligros identificados hoy (toca los que apliquen)</div>
              <Chips opciones={PELIGROS} elegidas={d.peligros} onChange={(v) => set("peligros", v)} />
            </div>
            <Campo label="Otros peligros" value={d.otrosPeligros} onChange={(v) => set("otrosPeligros", v)} />
            <AreaTexto label="Medidas de control acordadas" filas={3} value={d.medidas} onChange={(v) => set("medidas", v)} />
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1.5 font-medium" style={{ color: "#8A8F99" }}>EPP obligatorio hoy</div>
              <Chips opciones={EPP} elegidas={d.epp} onChange={(v) => set("epp", v)} />
            </div>
            <Campo label="Otros EPP / elementos" value={d.otrosEpp} onChange={(v) => set("otrosEpp", v)} />
          </div>
        </Seccion>

        {/* 4. CONDICIONES */}
        <Seccion id="condiciones" titulo="4. Condiciones del día y novedades" abierta={abierta === "condiciones"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Clima" value={d.clima} onChange={(v) => set("clima", v)} opciones={CLIMAS} />
              <Lista label="Orden y aseo del área" value={d.ordenAseo} onChange={(v) => set("ordenAseo", v)} opciones={ORDEN_ASEO} />
            </div>
            <Lista label="¿Personal con síntomas o no apto para trabajar?" value={d.sintomas} onChange={(v) => set("sintomas", v)} opciones={SINTOMAS} />
            <AreaTexto label="Novedades, observaciones y compromisos" filas={4} value={d.novedades} onChange={(v) => set("novedades", v)} placeholder="Si hay novedad en aseo o personal, descríbela aquí" />
          </div>
        </Seccion>

        {/* 5. ASISTENTES */}
        <Seccion id="asistentes" titulo="5. Registro de asistentes" subtitulo={`${nAsistentes} de ${MAX_ASISTENTES} · la firma se hace en papel al imprimir`} abierta={abierta === "asistentes"} onToggle={alternar} contador={nAsistentes}>
          <div className="space-y-2 mb-3">
            {ultimos.length > 0 && (
              <button type="button" onClick={cargarUltimos} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
                👥 Cargar los {ultimos.length} asistentes de la última charla
              </button>
            )}
            <button type="button" onClick={() => setPegarAbierto((a) => !a)} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>
              📋 Pegar una lista de nombres
            </button>
            {pegarAbierto && (
              <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11px] mb-1.5" style={{ color: NAVY }}>
                  Una persona por línea. Si copias desde Excel con las columnas <b>Nombre, Documento, Cargo, Empresa</b>, se separan solas.
                </div>
                <textarea rows={5} value={textoPegado} onChange={(e) => setTextoPegado(e.target.value)} className={claseInput + " resize-none"} style={estiloInput} placeholder={"Juan Pérez\nMaría Gómez\nCarlos Ruiz"} />
                <button type="button" onClick={aplicarPegado} className="w-full mt-2 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: GOLD }}>Agregar a la lista</button>
              </div>
            )}
          </div>

          {asistentes.map((a, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <Campo label="Nombre completo" value={a.nombre} onChange={(v) => actualizarAsistente(i, "nombre", v)} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Documento" value={a.documento} inputMode="numeric" onChange={(v) => actualizarAsistente(i, "documento", v)} />
                  <Campo label="Cargo / oficio" value={a.cargo} onChange={(v) => actualizarAsistente(i, "cargo", v)} />
                </div>
                <Campo label="Empresa" value={a.empresa} onChange={(v) => actualizarAsistente(i, "empresa", v)} />
              </div>
              <button type="button" onClick={() => quitarAsistente(i)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarAsistente} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar asistente
          </button>
          {avisoAsistentes && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoAsistentes}</div>}

          <div className="mt-4 pt-3 border-t" style={{ borderColor: LINE }}>
            <Campo label="Personal total en obra hoy (opcional)" value={d.personalTotal} inputMode="numeric" onChange={(v) => set("personalTotal", v.replace(/[^0-9]/g, ""))} placeholder="Para calcular el % de cobertura" />
            {cobertura !== null && (
              <div className="text-[12px] font-semibold mt-1.5" style={{ color: NAVY }}>
                Cobertura de la charla: {cobertura}% ({nAsistentes} de {totalObra})
              </div>
            )}
          </div>
        </Seccion>

        {/* 6. FOTOS */}
        <Seccion id="fotos" titulo="6. Evidencia fotográfica" subtitulo="Opcional · hasta 2 fotos de la charla" abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.filter((f) => f.file).length}>
          <div className="grid grid-cols-2 gap-2.5">
            {fotos.map((f, i) => (
              <CasillaFoto key={i} foto={f} numero={i + 1} onChange={(n) => actualizarFoto(i, n)} onRemove={() => quitarFoto(i)} />
            ))}
          </div>
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Se recuerdan para la próxima charla" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Facilitador (el mismo de arriba)</div>
            <div className="text-[12.5px]" style={{ color: "#5B6270" }}>{d.facilitadorNombre || "— sin nombre —"} {d.facilitadorCargo ? `· ${d.facilitadorCargo}` : ""}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable SST / Residente de obra (Vo.Bo.)</div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Nombre" value={d.responsableNombre} onChange={(v) => set("responsableNombre", v)} />
              <Campo label="Cargo" value={d.responsableCargo} onChange={(v) => set("responsableCargo", v)} />
            </div>
          </div>
        </Seccion>

        <div className="pt-5">
          <button type="button" onClick={nuevaCharla} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar una charla nueva
          </button>
        </div>
      </div>

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-3 pt-2 pb-3" style={{ background: "white", borderColor: LINE }}>
        <div className="max-w-md mx-auto">
          {mensajeError && (
            <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FDECEC", color: "#B42318" }}>{mensajeError}</div>
          )}
          {generado && !mensajeError && (
            <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#E8F5EC", color: "#1D6B3A" }}>
              ✓ Excel descargado. Imprímelo para las firmas, o toca "Empezar una charla nueva" (al final de la pantalla).
            </div>
          )}
          <button
            type="button"
            onClick={generarExcel}
            disabled={generando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[14px]"
            style={{ background: generando ? "#8A8F99" : GOLD }}
          >
            {generando ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {generando ? "Generando..." : "Generar Excel de la charla"}
          </button>
        </div>
      </div>
    </div>
  );
}
