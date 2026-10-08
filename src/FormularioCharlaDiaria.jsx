import { useState, useEffect, useRef, useMemo } from "react";
import ExcelJS from "exceljs";
import { ChevronDown, Plus, Trash2, Camera, X, Loader2, FileSpreadsheet } from "lucide-react";
import {
  CODIGO_FORMATO, CELDAS, PELIGROS, EPP, TIPOS_CHARLA, CLIMAS, ORDEN_ASEO, SINTOMAS, TEMAS_SUGERIDOS,
  MAX_ASISTENTES, fechaHoyISO, textoDuracion, parsearPegado, escribirCharlaEnHoja, validarCharla, camposFaltantesCharla, resumenCharla,
  buscarProfesional, recordarProfesional, quitarProfesional, cargosDisponibles,
  CIUDADES, CIUDADES_PRINCIPALES, filtrarOpciones, quitarTildes, normalizarNombre,
  CARGOS_OBRA, unirUnicos, recordarTexto, descubrirCeldas,
} from "./charlaDiariaDatos";
import { BotonMenuSST } from "./sstNavegacion";
import { useFaltantes } from "./sstFaltantes";
import { TraerDeFicha } from "./sstComunes";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#EEF1F6";
const LINE = "#D9DCE1";

const CLAVE_BORRADOR = "ryr_borrador_charla";
const CLAVE_CONSECUTIVO = "ryr_sst_charla_consecutivo";
const CLAVE_ULTIMOS = "ryr_sst_ultimos_asistentes";
const CLAVE_PROFESIONALES = "ryr_sst_profesionales";
const CLAVE_CARGOS_OBRA = "ryr_sst_cargos_oficio";   // cargos/oficios nuevos que se escribieron en los asistentes
const CLAVE_EMPRESAS = "ryr_sst_empresas";             // empresas escritas en los asistentes
const CLAVE_NOMBRES_TECNICA = "ryr_nombres_usados"; // la misma memoria de nombres de Gestión Técnica

// Cuántas fotos admite la plantilla: tantas como recuadros de foto tenga (el mapa se regenera cada vez que cambia el diseño de la plantilla)
const N_FOTOS = Math.max(1, Object.keys(CELDAS).filter((k) => /^foto\d+$/.test(k)).length);
const fotoVacia = () => ({ file: null, previewUrl: "", caption: "" });

const OPCIONES_CIUDADES = CIUDADES.map((x) => ({ texto: x.ciudad, detalle: x.departamento, buscaDetalle: true }));
const CIUDADES_AL_ABRIR = CIUDADES_PRINCIPALES.map((n) => OPCIONES_CIUDADES.find((o) => o.texto === n)).filter(Boolean);
const OPCIONES_TEMAS = TEMAS_SUGERIDOS.map((t) => ({ texto: t, detalle: "" }));

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


// Último consecutivo usado en este dispositivo + 1
function siguienteConsecutivo() {
  let ultimo = 0;
  try { ultimo = parseInt(localStorage.getItem(CLAVE_CONSECUTIVO) || "0", 10) || 0; } catch (e) {}
  return ultimo + 1;
}

function datosIniciales() {
  return {
    fecha: "", horaInicio: "", horaFin: "", nCharla: "",
    proyecto: "",
    contratista: "", ubicacion: "", frente: "",
    tipo: "",
    facilitadorNombre: "", facilitadorCargo: "",      // el facilitador cambia de una charla a otra: empieza vacío
    tema: "", contenido: "",
    actividades: "", peligros: [], otrosPeligros: "", medidas: "", epp: [], otrosEpp: "",
    clima: "", ordenAseo: "", sintomas: "", novedades: "",
    asistentes: [], personalTotal: "",
    responsableNombre: "", responsableCargo: "",      // las firmas empiezan vacías (los nombres se sugieren al escribir)
  };
}

// ¿La charla ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.tema || d.contenido || d.actividades || d.medidas || d.novedades || d.horaInicio || d.horaFin ||
    d.asistentes.length || d.peligros.length || d.epp.length || d.otrosPeligros || d.otrosEpp);
}

// ---------- Fotos ----------
// Comprime la foto. Con "aspecto" (ancho/alto de la casilla del Excel) la foto se ajusta COMPLETA a esa proporción,
// sin recortarla ni deformarla: el sobrante se rellena con el gris de la casilla. Así, aunque el Excel estire la imagen
// para llenar la casilla, se ve con su forma real.
function comprimirFoto(file, maxAncho = 1000, calidad = 0.75, aspecto = null, fondo = "#F2F2F2") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let ancho, alto, dx = 0, dy = 0, dw, dh;
      if (aspecto) {
        ancho = Math.min(maxAncho, Math.max(img.width, Math.round(img.height * aspecto)));
        alto = Math.round(ancho / aspecto);
        const escala = Math.min(ancho / img.width, alto / img.height);
        dw = Math.round(img.width * escala);
        dh = Math.round(img.height * escala);
        dx = Math.round((ancho - dw) / 2);
        dy = Math.round((alto - dh) / 2);
      } else {
        ancho = img.width;
        alto = img.height;
        if (ancho > maxAncho) {
          alto = Math.round((alto * maxAncho) / ancho);
          ancho = maxAncho;
        }
        dw = ancho;
        dh = alto;
      }
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (aspecto) { ctx.fillStyle = fondo; ctx.fillRect(0, 0, ancho, alto); }
      ctx.drawImage(img, dx, dy, dw, dh);
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
      <button type="button" data-seccion={id} onClick={() => onToggle(id)} className="w-full flex items-center justify-between py-3.5 px-1 text-left relative">
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

function Campo({ label, value, onChange, placeholder, type = "text", lista, inputMode, onBlur }) {
  return (
    <div className="w-full" data-campo={label}>
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
        onBlur={(e) => { e.target.style.borderColor = LINE; if (onBlur) onBlur(e.target.value); }}
      />
    </div>
  );
}

// Casilla de texto con lista desplegable: al tocarla vacía muestra "opcionesAlAbrir"; al escribir filtra
// "opciones" (sin importar tildes ni mayúsculas). Siempre se puede escribir un valor que no esté en la lista.
// Con "onLimpiar" aparece una × para borrar. La sugerencia se elige con un toque COMPLETO (click): se evita que la
// casilla pierda el foco antes (mousedown), que en el celular cerraba la lista antes de poder tocarla.
function BuscadorLista({ label, value, onChange, onElegir, onLimpiar, opciones, opcionesAlAbrir, placeholder, onBlurValor, maxResultados = 8 }) {
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);
  const eligiendo = useRef(false);
  const cierre = useRef(null); // cierre pendiente (150 ms después de salir de la casilla)
  const abrir = () => { clearTimeout(cierre.current); setAbierto(true); };
  const texto = (value || "").trim();
  const resultados = texto ? filtrarOpciones(opciones, value, maxResultados) : opcionesAlAbrir || [];
  // Si lo escrito ya es exactamente la única sugerencia, no hace falta mostrarla
  const visibles = resultados.length === 1 && quitarTildes(resultados[0].texto).toLowerCase() === quitarTildes(texto).toLowerCase() ? [] : resultados;
  const conBorrar = !!onLimpiar && !!value;

  function elegir(o) {
    eligiendo.current = true; // al soltar el foco no se guarda el texto a medio escribir
    if (onElegir) onElegir(o); else onChange(o.texto);
    setAbierto(false);
    if (inputRef.current) inputRef.current.blur(); // cierra el teclado del celular
  }

  return (
    <div className="w-full relative" data-campo={label}>
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); abrir(); }}
          onFocus={(e) => { e.target.style.borderColor = GOLD; abrir(); }}
          onBlur={(e) => {
            e.target.style.borderColor = LINE;
            if (onBlurValor && !eligiendo.current) onBlurValor(e.target.value);
            eligiendo.current = false;
            clearTimeout(cierre.current);
            cierre.current = setTimeout(() => setAbierto(false), 150);
          }}
          className={claseInput}
          style={conBorrar ? { ...estiloInput, paddingRight: 30 } : estiloInput}
        />
        {conBorrar && (
          <button
            type="button"
            aria-label={`Borrar ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onLimpiar(); abrir(); if (inputRef.current) inputRef.current.focus(); }}
            className="absolute right-2 text-[18px] leading-none px-1"
            style={{ top: "50%", transform: "translateY(-50%)", color: "#8A8F99" }}
          >
            ×
          </button>
        )}
      </div>
      {abierto && visibles.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto" style={{ borderColor: LINE }}>
          {visibles.map((o, i) => (
            <button
              key={o.texto + i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(o)}
              className="w-full text-left px-2.5 py-2 border-b last:border-b-0 text-[12.5px]"
              style={{ borderColor: LINE, color: NAVY }}
            >
              {o.texto}{o.detalle ? <span style={{ color: "#8A8F99" }}> · {o.detalle}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AreaTexto({ label, value, onChange, placeholder, filas = 3 }) {
  return (
    <div className="w-full" data-campo={label}>
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
    <div className="w-full" data-campo={label}>
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={claseInput + " bg-white"} style={estiloInput}>
        <option value="">Seleccione…</option>
        {opciones.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}

// Cargo: lista desplegable + opción "Otro (escribir)". onGuardar se llama al elegir de la lista o al terminar de escribir.
function CampoCargo({ label, value, onChange, onGuardar, opciones }) {
  const [modoOtro, setModoOtro] = useState(false);
  // Si el cargo cambia desde afuera (p. ej. al elegir un nombre guardado) y es uno de la lista, se muestra la lista.
  useEffect(() => {
    if (modoOtro && value && opciones.includes(value)) setModoOtro(false);
  }, [value, opciones, modoOtro]);
  const mostrarInput = modoOtro || (!!value && !opciones.includes(value));
  return (
    <div className="w-full" data-campo={label}>
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <select
        value={mostrarInput ? "__otro__" : value || ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__otro__") { setModoOtro(true); onChange(""); }
          else { setModoOtro(false); onChange(v); if (onGuardar) onGuardar(v); }
        }}
        className={claseInput + " bg-white"}
        style={estiloInput}
      >
        <option value="">Seleccione…</option>
        {opciones.map((o) => (<option key={o} value={o}>{o}</option>))}
        <option value="__otro__">Otro (escribir)…</option>
      </select>
      {mostrarInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => { if (onGuardar && e.target.value.trim()) onGuardar(e.target.value); }}
          placeholder="Escribe el cargo"
          className={claseInput + " mt-1.5"}
          style={estiloInput}
        />
      )}
    </div>
  );
}

function SelectorHora({ label, value, onChange }) {
  const [h, m] = (value || "").split(":");
  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutos = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  return (
    <div className="flex-1 min-w-0" data-campo={label}>
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
  const [fotos, setFotos] = useState(() => Array.from({ length: N_FOTOS }, fotoVacia));
  const [abierta, setAbierta] = useState("general");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState(false);
  const [numeroUsado, setNumeroUsado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [, setRefresco] = useState(0);
  const [pegarAbierto, setPegarAbierto] = useState(false);
  const [textoPegado, setTextoPegado] = useState("");
  const [avisoAsistentes, setAvisoAsistentes] = useState("");

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem(CLAVE_BORRADOR); } catch (e) { return false; }
  });
  const omitirGuardadoRef = useRef(false);
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem(CLAVE_BORRADOR); } catch (e) { return true; }
  });

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  // ---- Profesionales que usan el formato: nombres y cargos guardados en este dispositivo ----
  const [profesionales, setProfesionales] = useState(() => leerJSON(CLAVE_PROFESIONALES, []));
  const cargos = cargosDisponibles(profesionales);
  function guardarProfesionales(lista) {
    setProfesionales(lista);
    guardarJSON(CLAVE_PROFESIONALES, lista);
  }
  function recordar(nombre, cargo) {
    const nueva = recordarProfesional(profesionales, nombre, cargo);
    if (nueva !== profesionales) guardarProfesionales(nueva);
    // También se anota en la memoria de nombres de Gestión Técnica (la misma que usan sus formularios)
    const n = normalizarNombre(nombre);
    if (n.length >= 3) {
      const usados = leerJSON(CLAVE_NOMBRES_TECNICA, []);
      if (!usados.includes(n)) guardarJSON(CLAVE_NOMBRES_TECNICA, [n, ...usados].slice(0, 200));
    }
  }
  // Sugerencias de nombre: los profesionales guardados aquí (con su cargo) y los nombres usados en Gestión Técnica
  const [nombresTecnica] = useState(() => leerJSON(CLAVE_NOMBRES_TECNICA, []));
  const opcionesNombres = [
    ...profesionales.map((p) => ({ texto: p.nombre, detalle: p.cargo })),
    ...nombresTecnica.filter((n) => !buscarProfesional(profesionales, n)).map((n) => ({ texto: n, detalle: "" })),
  ];
  const nombresAlAbrir = profesionales.slice(0, 8).map((p) => ({ texto: p.nombre, detalle: p.cargo }));
  // Al escribir/elegir un nombre ya guardado, se completa solo su cargo.
  // Si el cargo se completó solo (por elegir un nombre guardado) y luego el nombre cambia a otra persona, ese cargo ya
  // no corresponde y se quita. Un cargo que el usuario eligió a mano nunca se toca.
  const cargoAutomatico = useRef({});
  const [reinicioCargo, setReinicioCargo] = useState({ facilitadorCargo: 0, responsableCargo: 0 });
  function cambiarNombre(campoNombre, campoCargo, valor) {
    const p = buscarProfesional(profesionales, valor);
    let quitarCargo = false;
    if (p) { if (p.cargo) cargoAutomatico.current[campoCargo] = true; }
    else if (cargoAutomatico.current[campoCargo]) { cargoAutomatico.current[campoCargo] = false; quitarCargo = true; }
    // Si coincide con uno guardado, se usa su escritura (mayúsculas/acentos) y su cargo.
    setD((cur) => ({
      ...cur,
      [campoNombre]: p ? p.nombre : valor,
      ...(p && p.cargo ? { [campoCargo]: p.cargo } : {}),
      ...(quitarCargo ? { [campoCargo]: "" } : {}),
    }));
  }
  function cambiarCargo(campoCargo, valor) {
    cargoAutomatico.current[campoCargo] = false;
    set(campoCargo, valor);
  }
  // Cargos y oficios de la obra para el registro de asistentes (lista base + los nuevos que se hayan escrito)
  const [cargosExtra, setCargosExtra] = useState(() => leerJSON(CLAVE_CARGOS_OBRA, []));
  const cargosObraBase = useMemo(() => unirUnicos(CARGOS_OBRA, cargosDisponibles(profesionales)), [profesionales]);
  const opcionesCargosObra = useMemo(() => unirUnicos(cargosObraBase, cargosExtra).map((t) => ({ texto: t, detalle: "" })), [cargosObraBase, cargosExtra]);
  function recordarCargoObra(valor) {
    const nueva = recordarTexto(cargosExtra, valor, { base: cargosObraBase, min: 3, max: 100 });
    if (nueva !== cargosExtra) { setCargosExtra(nueva); guardarJSON(CLAVE_CARGOS_OBRA, nueva); }
  }
  // Empresas ya escritas (la más reciente primero); el contratista del proyecto se ofrece de primero si está escrito
  const [empresas, setEmpresas] = useState(() => leerJSON(CLAVE_EMPRESAS, []));
  const opcionesEmpresas = unirUnicos([d.contratista, ...empresas], [], false).map((t) => ({ texto: t, detalle: "" }));
  function recordarEmpresa(valor) {
    const nueva = recordarTexto(empresas, valor, { min: 2, max: 50 });
    if (nueva !== empresas) { setEmpresas(nueva); guardarJSON(CLAVE_EMPRESAS, nueva); }
  }

  // Dibuja el par "nombre + cargo" de una persona (facilitador o responsable) con su lista de nombres guardados.
  // Es una función (no un componente) a propósito: así las casillas no se reinician al escribir.
  function bloqueProfesional(etqNombre, etqCargo, campoNombre, campoCargo) {
    return (
      <>
        <BuscadorLista
          label={etqNombre}
          value={d[campoNombre]}
          opciones={opcionesNombres}
          opcionesAlAbrir={nombresAlAbrir}
          placeholder={profesionales.length ? "Elige un nombre guardado o escribe uno nuevo" : "Nombre completo"}
          onChange={(v) => cambiarNombre(campoNombre, campoCargo, v)}
          onElegir={(o) => { cambiarNombre(campoNombre, campoCargo, o.texto); recordar(o.texto, ""); }}
          onLimpiar={() => limpiarProfesional(campoNombre, campoCargo)}
          onBlurValor={(v) => recordar(v, d[campoCargo])}
        />
        <CampoCargo
          key={reinicioCargo[campoCargo]}
          label={etqCargo}
          value={d[campoCargo]}
          opciones={cargos}
          onChange={(v) => cambiarCargo(campoCargo, v)}
          onGuardar={(v) => recordar(d[campoNombre], v)}
        />
      </>
    );
  }

  function limpiarProfesional(campoNombre, campoCargo) {
    cargoAutomatico.current[campoCargo] = false;
    setD((cur) => ({ ...cur, [campoNombre]: "", [campoCargo]: "" }));
    setReinicioCargo((cur) => ({ ...cur, [campoCargo]: cur[campoCargo] + 1 })); // la lista de cargos vuelve a "Seleccione…"
  }

  // ---- Borrador (las fotos no se guardan) ----
  useEffect(() => {
    if (!borradorAplicado) return;
    // Justo después de generar el Excel se actualiza el N° de charla en pantalla; ese cambio no debe recrear el borrador.
    if (omitirGuardadoRef.current) { omitirGuardadoRef.current = false; return; }
    if (tieneContenido(d)) guardarJSON(CLAVE_BORRADOR, d);
    else borrar(CLAVE_BORRADOR);
  }, [d, borradorAplicado]);

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
    setAsistentes([...asistentes, { nombre: "", documento: "", cargo: "", empresa: "" }]);
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
    const nuevos = lista.slice(0, Math.max(0, libres)).map((a) => ({ ...a, empresa: a.empresa || "" }));
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
  const quitarFoto = (i) => actualizarFoto(i, fotoVacia());

  // ---- Generar Excel ----
  async function generarExcel() {
    setMensajeError("");
    setAvisoGeneracion("");
    const faltan = validarCharla(d);
    if (faltan.length) {
      setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo.");
      resaltarFaltantes(camposFaltantesCharla(d));
      return;
    }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-charla-diaria.xlsx?v=" + Date.now(), { cache: "no-store" });
      if (!resp.ok) throw new Error("No se pudo cargar la plantilla (código " + resp.status + "). ¿Está subido public/plantilla-charla-diaria.xlsx?");
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Charla Diaria");
      if (!ws) throw new Error('No se encontró la hoja "Charla Diaria" en la plantilla');
      // Protección: la librería de Excel reescribe <outlinePr> en un orden que Excel rechaza ("hemos encontrado
      // un problema con el contenido"). Se descarta esa propiedad para que no pueda dañar el archivo.
      try { if (ws.properties) ws.properties.outlineProperties = undefined; } catch (e) {}

      // N° de charla: si se dejó vacío, se asigna el siguiente consecutivo
      const nUsar = d.nCharla && String(d.nCharla).trim() ? String(d.nCharla).trim() : String(siguienteConsecutivo());
      // Distribución REAL de la plantilla subida: cada celda se ubica por el texto de su etiqueta. Si el formato cambia
      // (filas insertadas, casillas de foto distintas…) todo sigue cayendo en su lugar. Si no se puede leer, se usa la
      // distribución por defecto y se avisa.
      let celdas = CELDAS;
      const avisos = [];
      try {
        const lectura = descubrirCeldas(ws);
        if (lectura.celdas) celdas = lectura.celdas;
        else {
          console.warn("No pude leer la distribución de la plantilla; uso la de por defecto:", lectura.problemas);
          avisos.push("No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame.");
        }
      } catch (e) {
        console.warn("Error al leer la plantilla; uso la distribución por defecto:", e);
      }
      const capacidad = celdas.asistentesN || MAX_ASISTENTES;
      const conNombre = asistentes.filter((x) => x.nombre && x.nombre.trim()).length;
      if (conNombre > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} asistentes y hay ${conNombre}`);

      escribirCharlaEnHoja(ws, { ...d, nCharla: nUsar }, celdas);
      // Si la plantilla ya trae el logo dentro (como el formato diseñado por el usuario), no se agrega otro encima.
      const plantillaTraeLogo = typeof ws.getImages === "function" && ws.getImages().length > 0;
      if (!plantillaTraeLogo) await agregarLogo(workbook, ws);

      // Cada foto va en SU casilla de la plantilla (estirada exactamente a esa casilla, sin salirse)
      let fotosSinCasilla = 0;
      for (let i = 0; i < fotos.length; i++) {
        if (!fotos[i].file) continue;
        const caja = celdas[`foto${i + 1}`];
        if (!caja) { fotosSinCasilla++; continue; }
        const buf = await comprimirFoto(fotos[i].file, 1000, 0.75, (celdas.fotoAspecto || [])[i] || null, "#" + (celdas.fondoFoto || "F2F2F2"));
        const id = workbook.addImage({ buffer: buf, extension: "jpeg" });
        // "twoCell": la foto se mueve y cambia de tamaño junto con las celdas de su casilla, así que NO puede quedar más
        // grande que el recuadro aunque después se cambie el alto de las filas en Excel.
        ws.addImage(id, { tl: caja.tl, br: caja.br, editAs: "twoCell" });
        const refPie = celdas[`captionFoto${i + 1}`];
        if (fotos[i].caption && refPie) ws.getCell(refPie).value = fotos[i].caption;
      }
      if (fotosSinCasilla) avisos.push(`La plantilla no tiene casilla para ${fotosSinCasilla} de las fotos y no se incluyó${fotosSinCasilla > 1 ? "eron" : ""}.`);
      setAvisoGeneracion(avisos.join(" "));

      const salida = await workbook.xlsx.writeBuffer();
      const blob = new Blob([salida], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Charla_Diaria_${d.fecha || "sin-fecha"}_N${nUsar}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Memoria para la próxima charla
      guardarJSON(CLAVE_ULTIMOS, asistentes.filter((x) => x.nombre && x.nombre.trim()));
      const resCharla = resumenCharla(d, nUsar);          // para los informes Semanal y Mensual
      guardarJSON("ryr_sst_charlas", [resCharla, ...leerJSON("ryr_sst_charlas", []).filter((x) => x.id !== resCharla.id)].slice(0, 500));
      const n = parseInt(nUsar, 10);
      if (!isNaN(n)) {
        let guardado = 0;
        try { guardado = parseInt(localStorage.getItem(CLAVE_CONSECUTIVO) || "0", 10) || 0; } catch (e) {}
        try { localStorage.setItem(CLAVE_CONSECUTIVO, String(Math.max(n, guardado))); } catch (e) {}
      }
      let lista = recordarProfesional(profesionales, d.facilitadorNombre, d.facilitadorCargo);
      lista = recordarProfesional(lista, d.responsableNombre, d.responsableCargo);
      guardarProfesionales(lista);
      let cargosNuevos = cargosExtra;
      let empresasNuevas = empresas;
      for (const a of asistentes) {
        cargosNuevos = recordarTexto(cargosNuevos, a.cargo, { base: cargosObraBase, min: 3, max: 100 });
        empresasNuevas = recordarTexto(empresasNuevas, a.empresa, { min: 2, max: 50 });
      }
      if (cargosNuevos !== cargosExtra) { setCargosExtra(cargosNuevos); guardarJSON(CLAVE_CARGOS_OBRA, cargosNuevos); }
      if (empresasNuevas !== empresas) { setEmpresas(empresasNuevas); guardarJSON(CLAVE_EMPRESAS, empresasNuevas); }
      borrar(CLAVE_BORRADOR);
      omitirGuardadoRef.current = true;
      setD((cur) => ({ ...cur, nCharla: nUsar }));
      setNumeroUsado(nUsar);
      setGenerado(true);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  // Permite fijar con qué número continúa la numeración (p. ej. para empezar de nuevo en 1 después de las pruebas).
  function cambiarNumeracion() {
    const sig = siguienteConsecutivo();
    const resp = window.prompt(`El siguiente número automático es el ${sig}.\n¿Con qué número quieres que continúe la numeración?`, String(sig));
    if (resp === null) return;
    const n = parseInt(resp, 10);
    if (isNaN(n) || n < 1) { alert("Escribe un número entero mayor o igual a 1."); return; }
    try { localStorage.setItem(CLAVE_CONSECUTIVO, String(n - 1)); } catch (e) {}
    setRefresco((x) => x + 1);
  }

  function nuevaCharla() {
    if (!window.confirm("¿Empezar una charla nueva? Se limpian los datos de esta (el facilitador y el responsable se conservan).")) return;
    borrar(CLAVE_BORRADOR);
    cargoAutomatico.current = {};
    setReinicioCargo((cur) => ({ facilitadorCargo: cur.facilitadorCargo + 1, responsableCargo: cur.responsableCargo + 1 }));
    setD(datosIniciales());   // el proyecto también empieza vacío (se conservan solo el facilitador y el responsable)
    setFotos(Array.from({ length: N_FOTOS }, fotoVacia));
    setGenerado(false);
    setMensajeError("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  // ---------------- Pantalla de borrador ----------------
  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative" style={{ background: PAPER }}>
        <div className="absolute top-3 left-3"><BotonMenuSST color={NAVY} /></div>
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
          <button type="button" onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>← Volver a Gestión SG – SST</button>
        )}
      </div>
    );
  }

  // ---------------- Formulario ----------------
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />

      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <BotonMenuSST />
              {onVolver && (
                <button type="button" onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                  Gestión SG – SST
                </button>
              )}
            </div>
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
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, ...{ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion } }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista
              label="Ubicación"
              value={d.ubicacion}
              onChange={(v) => set("ubicacion", v)}
              opciones={OPCIONES_CIUDADES}
              opcionesAlAbrir={CIUDADES_AL_ABRIR}
              placeholder="Elige una ciudad o escribe otra"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
                {!d.fecha && (
                  <button type="button" onClick={() => set("fecha", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>
                    Usar la fecha de hoy
                  </button>
                )}
              </div>
              <Campo label="N° de charla" value={d.nCharla} inputMode="numeric" placeholder={`Automático: ${siguienteConsecutivo()}`} onChange={(v) => set("nCharla", v.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="text-[10.5px] -mt-1" style={{ color: "#8A8F99" }}>
              Si dejas el N° de charla vacío, se asigna solo el siguiente número consecutivo.{" "}
              <button type="button" onClick={cambiarNumeracion} className="underline" style={{ color: NAVY }}>Cambiar la numeración</button>
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
            {bloqueProfesional("Facilitador (nombre)", "Cargo del facilitador", "facilitadorNombre", "facilitadorCargo")}
          </div>
        </Seccion>

        {/* 2. TEMA */}
        <Seccion id="tema" titulo="2. Tema de la charla" subtitulo="Qué se explicó y qué se acordó" abierta={abierta === "tema"} onToggle={alternar} contador={d.tema ? 1 : 0}>
          <div className="space-y-2.5">
            <BuscadorLista label="Tema principal" value={d.tema} opciones={OPCIONES_TEMAS} opcionesAlAbrir={OPCIONES_TEMAS} maxResultados={10} placeholder="Elige uno de la lista o escribe el tuyo" onChange={(v) => set("tema", v)} />
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
                <Campo label="Documento" value={a.documento} inputMode="numeric" onChange={(v) => actualizarAsistente(i, "documento", v)} />
                <BuscadorLista
                  label="Cargo / oficio"
                  value={a.cargo}
                  onChange={(v) => actualizarAsistente(i, "cargo", v)}
                  opciones={opcionesCargosObra}
                  opcionesAlAbrir={opcionesCargosObra}
                  maxResultados={10}
                  placeholder="Elige un cargo de la obra o escribe otro"
                  onBlurValor={(v) => recordarCargoObra(v)}
                />
                <BuscadorLista
                  label="Empresa"
                  value={a.empresa}
                  onChange={(v) => actualizarAsistente(i, "empresa", v)}
                  opciones={opcionesEmpresas}
                  opcionesAlAbrir={opcionesEmpresas}
                  placeholder="Escribe la empresa"
                  onBlurValor={(v) => recordarEmpresa(v)}
                />
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
        <Seccion id="fotos" titulo="6. Evidencia fotográfica" subtitulo={`Opcional · hasta ${N_FOTOS} fotos de la charla`} abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.filter((f) => f.file).length}>
          <div className="grid grid-cols-2 gap-2.5">
            {fotos.map((f, i) => (
              <CasillaFoto key={i} foto={f} numero={i + 1} onChange={(n) => actualizarFoto(i, n)} onRemove={() => quitarFoto(i)} />
            ))}
          </div>
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Empiezan vacías · al escribir se sugieren los nombres guardados" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Facilitador (quien dicta la charla)</div>
            {bloqueProfesional("Facilitador (nombre)", "Cargo del facilitador", "facilitadorNombre", "facilitadorCargo")}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable SST / Residente de obra (Vo.Bo.)</div>
            {bloqueProfesional("Nombre", "Cargo", "responsableNombre", "responsableCargo")}
          </div>
          {profesionales.length > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: LINE }}>
              <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Nombres guardados ({profesionales.length})</div>
              <div className="text-[10.5px] mb-2" style={{ color: "#8A8F99" }}>Aparecen como sugerencia al escribir un nombre. Si guardaste uno mal escrito, bórralo aquí.</div>
              {profesionales.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: LINE }}>
                  <div className="text-[12px]" style={{ color: NAVY }}>
                    {p.nombre} <span style={{ color: "#8A8F99" }}>· {p.cargo || "sin cargo"}</span>
                  </div>
                  <button type="button" aria-label={`Borrar ${p.nombre}`} onClick={() => guardarProfesionales(quitarProfesional(profesionales, p.nombre))} style={{ color: "#B3401F" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
          {avisoGeneracion && !mensajeError && (
            <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FFF4DB", color: "#8A5A00" }}>{avisoGeneracion}</div>
          )}
          {generado && !mensajeError && (
            <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#E8F5EC", color: "#1D6B3A" }}>
              ✓ Excel descargado (charla N° {numeroUsado}). Imprímelo para las firmas, o toca "Empezar una charla nueva" (al final de la pantalla).
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
