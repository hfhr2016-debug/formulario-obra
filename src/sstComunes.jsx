// sstComunes.jsx — piezas de pantalla y memoria COMPARTIDAS por los formularios de Gestión SG – SST.
// Las piezas visuales (Seccion, Campo, BuscadorLista, AreaTexto, Lista, CampoCargo, SelectorHora) son las mismas de la Charla
// Diaria. La lógica sin pantalla está en sstBase.js.
import { useState, useEffect, useRef, useMemo } from "react";
import ExcelJS from "exceljs";
import { ChevronDown, Loader2, FileSpreadsheet } from "lucide-react";
import {
  CIUDADES, CIUDADES_PRINCIPALES, filtrarOpciones, quitarTildes, normalizarNombre, CARGOS_OBRA, unirUnicos, recordarTexto,
  buscarProfesional, recordarProfesional, quitarProfesional, cargosDisponibles, mezclarTrabajadores, buscarTrabajador,
} from "./sstBase";
import { BotonMenuSST, useNavegacionSST } from "./sstNavegacion";

export const NAVY = "#1B2A45";
export const GOLD = "#D9A233";
export const PAPER = "#EEF1F6";
export const LINE = "#D9DCE1";

// Memoria del dispositivo. Estas claves las comparten TODOS los formularios SST (y la Charla Diaria).
export const CLAVE_ULTIMOS = "ryr_sst_ultimos_asistentes";
export const CLAVE_PROFESIONALES = "ryr_sst_profesionales";
export const CLAVE_CARGOS_OBRA = "ryr_sst_cargos_oficio";
export const CLAVE_EMPRESAS = "ryr_sst_empresas";
export const CLAVE_NOMBRES_TECNICA = "ryr_nombres_usados";   // la misma memoria de nombres de Gestión Técnica
export const CLAVE_TRABAJADORES = "ryr_sst_trabajadores";     // personas (nombre, documento, cargo, empresa) usadas en los formatos
export const CLAVE_EVENTOS = "ryr_sst_eventos";               // resumen de cada actividad registrada (alimenta la Matriz de Capacitación)

export const OPCIONES_CIUDADES = CIUDADES.map((x) => ({ texto: x.ciudad, detalle: x.departamento, buscaDetalle: true }));
export const CIUDADES_AL_ABRIR = CIUDADES_PRINCIPALES.map((n) => OPCIONES_CIUDADES.find((o) => o.texto === n)).filter(Boolean);

// ---------- Memoria local (nunca debe romper la pantalla si el navegador la bloquea) ----------
export function leerJSON(clave, porDefecto) {
  try {
    const t = localStorage.getItem(clave);
    return t ? JSON.parse(t) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}
export function guardarJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
export function borrar(clave) {
  try { localStorage.removeItem(clave); } catch (e) {}
}

// ---------- Numeración consecutiva (por formato) ----------
export function siguienteConsecutivo(clave) {
  let ultimo = 0;
  try { ultimo = parseInt(localStorage.getItem(clave) || "0", 10) || 0; } catch (e) {}
  return ultimo + 1;
}
// Un número escrito a mano se respeta; el consecutivo solo avanza si el número usado es mayor o igual al guardado.
export function registrarConsecutivo(clave, n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return;
  let guardado = 0;
  try { guardado = parseInt(localStorage.getItem(clave) || "0", 10) || 0; } catch (e) {}
  try { localStorage.setItem(clave, String(Math.max(num, guardado))); } catch (e) {}
}
export function fijarSiguienteConsecutivo(clave, siguiente) {
  try { localStorage.setItem(clave, String(siguiente - 1)); } catch (e) {}
}

// ---------- Borrador: se guarda solo mientras se escribe; al volver se ofrece continuar ----------
export function useBorrador({ clave, d, setD, inicial, tieneContenido }) {
  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem(clave); } catch (e) { return false; }
  });
  const omitir = useRef(false);
  const [aplicado, setAplicado] = useState(() => {
    try { return !localStorage.getItem(clave); } catch (e) { return true; }
  });
  useEffect(() => {
    if (!aplicado) return;
    if (omitir.current) { omitir.current = false; return; }
    if (tieneContenido(d)) guardarJSON(clave, d);
    else borrar(clave);
  }, [d, aplicado]);   // eslint-disable-line
  return {
    borradorDisponible,
    restaurar: () => {
      const guardado = leerJSON(clave, null);
      if (guardado) setD({ ...inicial(), ...guardado });
      setAplicado(true);
      setBorradorDisponible(false);
    },
    descartar: () => { borrar(clave); setAplicado(true); setBorradorDisponible(false); },
    omitirProximoGuardado: () => { omitir.current = true; },
    borrarBorrador: () => borrar(clave),
  };
}

// ---------- Trabajadores ya escritos en otros formatos (sugerencias al escribir un nombre) ----------
export function useTrabajadores() {
  const [lista, setLista] = useState(() => mezclarTrabajadores(leerJSON(CLAVE_TRABAJADORES, []), leerJSON(CLAVE_ULTIMOS, [])));
  const opciones = lista.map((t) => ({ texto: t.nombre, detalle: [t.documento, t.cargo].filter(Boolean).join(" · ") }));
  function recordar(personas) {
    const nueva = mezclarTrabajadores(lista, personas);
    setLista(nueva);
    guardarJSON(CLAVE_TRABAJADORES, nueva);
  }
  return { lista, opciones, alAbrir: opciones.slice(0, 8), recordar, buscar: (nombre) => buscarTrabajador(lista, nombre) };
}

// ---------- Lista desplegable con opciones fijas + las que la persona escribe (se recuerdan en el dispositivo) ----------
export function useListaRecordada(clave, base, { min = 3, max = 60 } = {}) {
  const [extra, setExtra] = useState(() => leerJSON(clave, []));
  const opciones = useMemo(() => unirUnicos(extra, base, false).map((t) => ({ texto: t, detalle: "" })), [extra]);   // eslint-disable-line
  function recordar(valor) {
    const nueva = recordarTexto(extra, valor, { base, min, max });
    if (nueva !== extra) { setExtra(nueva); guardarJSON(clave, nueva); }
  }
  return { opciones, recordar };
}

// ---------- Plantilla de Excel: cargar y descargar ----------
export async function cargarPlantilla(url, nombreHoja) {
  const resp = await fetch(url + "?v=" + Date.now(), { cache: "no-store" });
  if (!resp.ok) throw new Error("No se pudo cargar la plantilla (código " + resp.status + "). ¿Está subido public" + url + "?");
  const buffer = await resp.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.getWorksheet(nombreHoja) || (workbook.worksheets && workbook.worksheets[0]);
  if (!ws) throw new Error('No se encontró la hoja "' + nombreHoja + '" en la plantilla');
  // Protección: la librería de Excel reescribe <outlinePr> en un orden que Excel rechaza ("hemos encontrado un problema
  // con el contenido"). Se descarta esa propiedad para que no pueda dañar el archivo.
  try { if (ws.properties) ws.properties.outlineProperties = undefined; } catch (e) {}
  return { workbook, ws };
}

export async function descargarLibro(workbook, nombreArchivo) {
  const salida = await workbook.xlsx.writeBuffer();
  const blob = new Blob([salida], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Texto seguro para nombre de archivo ("Trabajo en alturas" -> "Trabajo-en-alturas")
export function textoParaArchivo(t, max = 30) {
  return quitarTildes(String(t || "")).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max) || "sin-tema";
}

// ---------- Memoria de nombres, cargos y empresas (la usan todos los formularios) ----------
export function useMemoriaSST(contratista = "") {
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
  function quitar(nombre) { guardarProfesionales(quitarProfesional(profesionales, nombre)); }

  // Sugerencias de nombre: los profesionales guardados (con su cargo) y los nombres usados en Gestión Técnica
  const [nombresTecnica] = useState(() => leerJSON(CLAVE_NOMBRES_TECNICA, []));
  const opcionesNombres = [
    ...profesionales.map((p) => ({ texto: p.nombre, detalle: p.cargo })),
    ...nombresTecnica.filter((n) => !buscarProfesional(profesionales, n)).map((n) => ({ texto: n, detalle: "" })),
  ];
  const nombresAlAbrir = profesionales.slice(0, 8).map((p) => ({ texto: p.nombre, detalle: p.cargo }));

  // Cargos y oficios de la obra (lista base + los nuevos que se hayan escrito)
  const [cargosExtra, setCargosExtra] = useState(() => leerJSON(CLAVE_CARGOS_OBRA, []));
  const cargosObraBase = useMemo(() => unirUnicos(CARGOS_OBRA, cargosDisponibles(profesionales)), [profesionales]);
  const opcionesCargosObra = useMemo(() => unirUnicos(cargosObraBase, cargosExtra).map((t) => ({ texto: t, detalle: "" })), [cargosObraBase, cargosExtra]);
  function recordarCargoObra(valor) {
    const nueva = recordarTexto(cargosExtra, valor, { base: cargosObraBase, min: 3, max: 100 });
    if (nueva !== cargosExtra) { setCargosExtra(nueva); guardarJSON(CLAVE_CARGOS_OBRA, nueva); }
  }

  // Empresas ya escritas (la más reciente primero); el contratista del proyecto se ofrece de primero si está escrito
  const [empresas, setEmpresas] = useState(() => leerJSON(CLAVE_EMPRESAS, []));
  const opcionesEmpresas = unirUnicos([contratista, ...empresas], [], false).map((t) => ({ texto: t, detalle: "" }));
  function recordarEmpresa(valor) {
    const nueva = recordarTexto(empresas, valor, { min: 2, max: 50 });
    if (nueva !== empresas) { setEmpresas(nueva); guardarJSON(CLAVE_EMPRESAS, nueva); }
  }

  // Al generar un documento: guarda de una vez las personas, cargos y empresas que se usaron
  function recordarUso({ personas = [], cargosObra = [], empresasUsadas = [] }) {
    let lista = profesionales;
    for (const [n, c] of personas) lista = recordarProfesional(lista, n, c);
    if (lista !== profesionales) guardarProfesionales(lista);
    let cn = cargosExtra; for (const c of cargosObra) cn = recordarTexto(cn, c, { base: cargosObraBase, min: 3, max: 100 });
    if (cn !== cargosExtra) { setCargosExtra(cn); guardarJSON(CLAVE_CARGOS_OBRA, cn); }
    let en = empresas; for (const e of empresasUsadas) en = recordarTexto(en, e, { min: 2, max: 50 });
    if (en !== empresas) { setEmpresas(en); guardarJSON(CLAVE_EMPRESAS, en); }
  }
  return { profesionales, cargos, recordar, quitar, opcionesNombres, nombresAlAbrir, opcionesCargosObra, recordarCargoObra, opcionesEmpresas, recordarEmpresa, recordarUso };
}

// ---------- Nombre + cargo de una persona (facilitador, responsable…) ----------
// "onChange" recibe un cambio parcial: { nombre?, cargo? }. Al elegir un nombre guardado se completa solo su cargo; si el
// cargo se completó solo y luego el nombre pasa a otra persona, ese cargo se quita (un cargo elegido a mano nunca se toca).
// «cargosSugeridos»: cargos propios de este bloque (p. ej. quien recibe en el sitio de disposición); se ofrecen primero
export function BloqueProfesional({ memoria, etqNombre, etqCargo, nombre, cargo, onChange, cargosSugeridos = [] }) {
  const cargoAutomatico = useRef(false);
  const [reinicio, setReinicio] = useState(0);
  function cambiarNombre(valor) {
    const p = buscarProfesional(memoria.profesionales, valor);
    const patch = { nombre: p ? p.nombre : valor };
    if (p) { if (p.cargo) { cargoAutomatico.current = true; patch.cargo = p.cargo; } }
    else if (cargoAutomatico.current) { cargoAutomatico.current = false; patch.cargo = ""; }
    onChange(patch);
  }
  function limpiar() {
    cargoAutomatico.current = false;
    onChange({ nombre: "", cargo: "" });
    setReinicio((x) => x + 1);   // la lista de cargos vuelve a "Seleccione…"
  }
  return (
    <>
      <BuscadorLista
        label={etqNombre}
        value={nombre}
        opciones={memoria.opcionesNombres}
        opcionesAlAbrir={memoria.nombresAlAbrir}
        placeholder={memoria.profesionales.length ? "Elige un nombre guardado o escribe uno nuevo" : "Nombre completo"}
        onChange={cambiarNombre}
        onElegir={(o) => { cambiarNombre(o.texto); memoria.recordar(o.texto, ""); }}
        onLimpiar={limpiar}
        onBlurValor={(v) => memoria.recordar(v, cargo)}
      />
      <CampoCargo
        key={reinicio}
        label={etqCargo}
        value={cargo}
        opciones={cargosSugeridos.length ? [...cargosSugeridos, ...memoria.cargos.filter((c) => !cargosSugeridos.includes(c))] : memoria.cargos}
        onChange={(v) => { cargoAutomatico.current = false; onChange({ cargo: v }); }}
        onGuardar={(v) => memoria.recordar(nombre, v)}
      />
    </>
  );
}

// ---------- Pantallas y barras comunes ----------
export function PantallaBorrador({ cual, onContinuar, onEmpezar, onVolver }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative" style={{ background: PAPER }}>
      <div className="absolute top-3 left-3"><BotonMenuSST color={NAVY} /></div>
      <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes {cual} sin terminar</div>
      <div className="text-[12.5px] text-gray-500 mb-5">
        Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel. ¿Quieres continuar donde quedaste?
      </div>
      <button type="button" onClick={onContinuar} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
        ▶ Continuar donde quedé
      </button>
      <button type="button" onClick={onEmpezar} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
        Empezar en blanco
      </button>
      {onVolver && (
        <button type="button" onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>← Volver a Gestión SG – SST</button>
      )}
    </div>
  );
}

export function EncabezadoFormulario({ titulo, subtitulo, onVolver }) {
  const nav = useNavegacionSST();
  const sistema = (nav && nav.titulo) || "Gestión SG – SST";      // en Gestión Ambiental el contexto trae su propio título
  return (
    <div data-libre className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <BotonMenuSST />
            {onVolver && (
              <button type="button" onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                {sistema}
              </button>
            )}
          </div>
          <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{titulo}</div>
          <div className="text-[11px]" style={{ color: GOLD }}>{subtitulo}</div>
        </div>
        <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
      </div>
    </div>
  );
}

export function BarraGenerar({ mensajeError, aviso, mensajeOk, generando, textoBoton, onGenerar }) {
  return (
    <div data-barra-generar className="fixed bottom-0 left-0 right-0 border-t px-3 pt-2 pb-3" style={{ background: "white", borderColor: LINE }}>
      <div className="max-w-md mx-auto">
        {mensajeError && (
          <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FDECEC", color: "#B42318" }}>{mensajeError}</div>
        )}
        {aviso && !mensajeError && (
          <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FFF4DB", color: "#8A5A00" }}>{aviso}</div>
        )}
        {mensajeOk && !mensajeError && (
          <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#E8F5EC", color: "#1D6B3A" }}>{mensajeOk}</div>
        )}
        <button
          type="button"
          onClick={onGenerar}
          disabled={generando}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[14px]"
          style={{ background: generando ? "#8A8F99" : GOLD }}
        >
          {generando ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          {generando ? "Generando..." : textoBoton}
        </button>
      </div>
    </div>
  );
}

// ---------- Piezas visuales (las mismas de la Charla Diaria) ----------
// ---------- Componentes de pantalla ----------
export function Seccion({ id, titulo, subtitulo, abierta, onToggle, contador, children }) {
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

export const claseInput = "w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none";

export const estiloInput = { borderColor: LINE, background: "white" };

export const etiquetaCls = "block text-[10px] uppercase tracking-wide mb-1 font-medium";

export function Campo({ label, value, onChange, placeholder, type = "text", lista, inputMode, onBlur }) {
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
export function BuscadorLista({ label, value, onChange, onElegir, onLimpiar, opciones, opcionesAlAbrir, placeholder, onBlurValor, maxResultados = 8 }) {
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

export function AreaTexto({ label, value, onChange, placeholder, filas = 3 }) {
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

export function Lista({ label, value, onChange, opciones }) {
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
export function CampoCargo({ label, value, onChange, onGuardar, opciones, placeholder = "Escribe el cargo" }) {
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
          placeholder={placeholder}
          className={claseInput + " mt-1.5"}
          style={estiloInput}
        />
      )}
    </div>
  );
}

export function SelectorHora({ label, value, onChange }) {
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

// ---------- "Traer los datos de la obra" desde la Ficha SST (una vez diligenciada, los demás formularios no tienen que repetirlos) ----------
export function TraerDeFicha({ onTraer }) {
  const [aviso, setAviso] = useState("");
  const fichas = leerJSON("ryr_sst_ficha", []);
  if (!fichas.length) return null;
  const traer = (f) => { onTraer(f); setAviso(`Se trajeron los datos de «${f.proyecto}».`); };
  return (
    <div className="p-2 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
      {fichas.length === 1 ? (
        <button type="button" onClick={() => traer(fichas[0])} className="w-full text-left text-[12px] font-semibold" style={{ color: NAVY }}>📋 Traer los datos de la obra · {fichas[0].proyecto}</button>
      ) : (
        <Lista label="📋 Traer los datos de la obra (Ficha SST)" value="" onChange={(v) => { const f = fichas.find((x) => x.proyecto === v); if (f) traer(f); }} opciones={fichas.map((x) => x.proyecto)} />
      )}
      {aviso && <div className="text-[11px] mt-1" style={{ color: "#2E7D4F" }}>{aviso}</div>}
    </div>
  );
}
