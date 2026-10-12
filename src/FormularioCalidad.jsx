// FormularioCalidad.jsx — pantalla ÚNICA de los formatos de Gestión de Calidad: se arma sola a partir de la especificación del formato (calFormatos.js).
// Cada hoja del formato es un «registro» que se guarda solo en el dispositivo (y se sincroniza); se puede reabrir, corregir, eliminar y exportar a Excel.
import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  texto, camposDe, seccionesDe, registroNuevo, listarRegistros, guardarRegistro, eliminarRegistro, obtenerRegistro, tieneContenido, etiquetaRegistro, filaNueva, filasConDatos,
  faltantes, validar, descubrirCal, escribirEnHoja, listarProveedores, crearNCsAutomaticas, ncDeOrigen, etiquetaUI, esVisible,
} from "./calBase";
import { CifrasResumen } from "./cpComunes";
import { useObraCal, PanelObraCal } from "./calComunes";
import { catalogoVigente } from "./catalogoVivo";
import {
  NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraObra, BarraGenerar, Seccion, Campo, Lista, AreaTexto, BuscadorLista, CampoCargo, SelectorHora,
} from "./sstComunes";
import { ChipsOpcion, FilaVerificacion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { SeccionFotosAnexo, agregarHojaFotos } from "./fotosAnexo";

const COLOR_ESTADO = {
  Cumple: "#2E7D4F", Conforme: "#2E7D4F", Aprobado: "#2E7D4F", Aceptado: "#2E7D4F", Vigente: "#2E7D4F", "Para construcción": "#2E7D4F", Sí: "#2E7D4F",
  "No cumple": "#B3401F", "No conforme": "#B3401F", Rechazado: "#B3401F", Obsoleto: "#B3401F", No: "#B3401F",
  Pendiente: "#B8860B", "En cuarentena": "#B8860B", "En cuarentena (espera ensayo)": "#B8860B", "Aceptado con observaciones": "#B8860B", "En revisión": "#B8860B", "N/A": "#6B7280",
  "Sí, con observaciones": "#B8860B", "Aprobado para vaciar": "#2E7D4F", "Aprobado con observaciones": "#B8860B", Aprobada: "#2E7D4F", Rechazada: "#B3401F", "Aprobada con observaciones": "#B8860B", Seguimiento: "#B8860B",
};
const COLOR_PEND = { vencido: ["#FDEDEA", "#B3401F"], hoy: ["#FFF1DD", "#9A5B00"], pronto: ["#FFF8E8", "#7A5A00"], proximo: ["#F3F4F6", "#4B5563"] };
// Casilla de solo lectura para lo que la app calcula (resultado de una fórmula de la plantilla)
function Calculado({ label, valor, semaforo }) {
  const t = String(valor === undefined || valor === null ? "" : valor);
  return (
    <div className="w-full" data-campo={label} data-calculado>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8F99" }}>{label} <span className="normal-case font-normal">· se calcula solo</span></div>
      <div className="text-[13px] font-semibold px-2.5 py-1.5 rounded-md" style={{ background: "#F3F4F6", color: (semaforo && COLOR_ESTADO[t]) || NAVY, minHeight: 30 }}>{t || "—"}</div>
    </div>
  );
}
const colorAviso = { alerta: ["#FDEDEA", "#B3401F"], aviso: ["#FFF8E8", "#7A5A00"], ok: ["#EAF4EC", "#1D6B3A"], info: ["#EEF3FA", "#1B2A45"] };

export default function FormularioCalidad({ fmt, onVolver }) {
  const h = useObraCal();
  const [reg, setReg] = useState(null);                // registro abierto (null = se ve la lista)
  const [version, setVersion] = useState(0);           // sube al guardar/eliminar, para repintar la lista
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTabla, setAvisoTabla] = useState({});
  const [creadasNC, setCreadasNC] = useState([]);
  const [filaAbierta, setFilaAbierta] = useState({});
  const [porQuitar, setPorQuitar] = useState(null);   // fila que se va a quitar, esperando confirmación {k, i, nombre}
  const [quitada, setQuitada] = useState(null);       // última fila quitada, para poder deshacer {k, i, fila, nombre}
  const [fotos, setFotos] = useState([]);              // fotos del Excel que se va a generar (no se guardan)
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const previo = useRef("");

  const sinObra = !h.obra || h.creando;
  const registros = useMemo(() => (h.id ? listarRegistros(fmt, h.id) : []), [h.id, version, fmt]);   // eslint-disable-line
  const proveedores = useMemo(() => listarProveedores().map((p) => ({ texto: p.nombre, detalle: p.nit || "", nit: p.nit || "", tipo: p.tipo || "" })), [reg === null]);   // eslint-disable-line
  const materiales = useMemo(() => catalogoVigente("materiales").map((m) => ({ texto: String(m.descripcion || ""), detalle: String(m.unidad || ""), unidad: String(m.unidad || "") })), []);

  // Al cambiar de obra se cierra el registro abierto
  useEffect(() => { setReg(null); setCreadasNC([]); setFotos([]); }, [h.id]);
  useEffect(() => { if (!quitada) return undefined; const t = setTimeout(() => setQuitada(null), 15000); return () => clearTimeout(t); }, [quitada]);
  useEffect(() => { if (!reg) { setQuitada(null); setPorQuitar(null); } }, [reg === null]);
  // Lo que viene de la obra (proyecto, contrato, ubicación…) se mantiene al día en el registro abierto
  useEffect(() => {
    if (!reg || !h.obra) return;
    const cambios = {};
    for (const c of camposDe(fmt)) if (c.obra) { const v = texto(c.obra === "proyecto" ? h.obra.proyecto : h.obra[c.obra]); if (texto(reg.datos[c.k]) !== v) cambios[c.k] = v; }
    if (Object.keys(cambios).length) setReg((cur) => (cur ? { ...cur, datos: { ...cur.datos, ...cambios } } : cur));
  }, [h.obra, reg && reg.id]);   // eslint-disable-line
  // Se guarda solo (sin crear no conformidades: eso se hace al guardar o generar)
  useEffect(() => {
    if (!reg) return;
    const firma = JSON.stringify(reg.datos);
    if (firma === previo.current) return;
    previo.current = firma;
    if (tieneContenido(fmt, reg.datos)) guardarRegistro(fmt, reg);
  }, [reg]);   // eslint-disable-line

  const datos = reg ? reg.datos : null;
  const set = (k, v) => setReg((cur) => ({ ...cur, datos: { ...cur.datos, [k]: v } }));
  const setVarios = (patch) => setReg((cur) => ({ ...cur, datos: { ...cur.datos, ...patch } }));

  function nuevo() {
    const r = registroNuevo(fmt, h.obra);
    const ultimo = registros[0];                            // las firmas se adelantan con las del último registro
    if (ultimo) for (const p of fmt.firmas.personas) { r.datos[`${p.k}Nombre`] = (ultimo.datos || {})[`${p.k}Nombre`] || ""; r.datos[`${p.k}Cargo`] = (ultimo.datos || {})[`${p.k}Cargo`] || ""; }
    if (ultimo && fmt.copiarTablas) for (const t of seccionesDe(fmt, "tabla")) r.datos[t.k] = JSON.parse(JSON.stringify((ultimo.datos || {})[t.k] || r.datos[t.k]));   // p. ej. el plan: la versión nueva parte de la anterior
    if (fmt.alCrear) fmt.alCrear(r.datos, r.obraId, h.obra);
    previo.current = JSON.stringify(r.datos);
    setReg(r); setFotos([]); setAbierta("datos"); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setCreadasNC([]); window.scrollTo(0, 0);
  }
  function abrir(id) {
    const r = obtenerRegistro(fmt, id); if (!r) return;
    previo.current = JSON.stringify(r.datos);
    setReg(r); setFotos([]); setAbierta("datos"); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setCreadasNC([]); window.scrollTo(0, 0);
  }
  function eliminar(id) { if (window.confirm("¿Eliminar este registro? No se puede deshacer.")) { eliminarRegistro(fmt, id); setVersion((v) => v + 1); } }

  // Guardar de verdad: guarda, actualiza las listas comunes (proveedores…) y crea las no conformidades que corresponden
  function guardarFinal() {
    if (!reg) return [];
    let guardado = tieneContenido(fmt, reg.datos) ? guardarRegistro(fmt, reg) : reg;
    const parche = fmt.alGuardar ? fmt.alGuardar(guardado.datos, guardado) : null;
    if (parche && typeof parche === "object") {
      guardado = { ...guardado, datos: { ...guardado.datos, ...parche } };
      if (tieneContenido(fmt, guardado.datos)) guardado = guardarRegistro(fmt, guardado);
      previo.current = JSON.stringify(guardado.datos);
      setReg(guardado);
    }
    const nuevas = crearNCsAutomaticas(fmt, guardado);
    // los nombres escritos (responsable y firmas) quedan guardados para ofrecerlos la próxima vez
    memoria.recordarUso({ personas: [...fmt.firmas.personas.map((p) => [guardado.datos[`${p.k}Nombre`], guardado.datos[`${p.k}Cargo`]]), ...camposDe(fmt).filter((c) => c.tipo === "persona").map((c) => [guardado.datos[c.k], c.cargo || ""])] });
    setCreadasNC(nuevas); setVersion((v) => v + 1);
    return nuevas;
  }
  function guardarYVolver() {
    const nuevas = guardarFinal();
    if (nuevas.length) window.alert(`Se ${nuevas.length === 1 ? "creó 1 no conformidad" : `crearon ${nuevas.length} no conformidades`} a partir de este registro. Las verás en el formato «No Conformidades».`);
    setReg(null); window.scrollTo(0, 0);
  }

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const falta = validar(fmt, datos);
    if (!h.obra) falta.unshift("la obra");
    if (falta.length) { setMensajeError("Falta completar: " + falta.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(faltantes(fmt, datos)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla(fmt.plantilla, fmt.hoja);
      const celdas = descubrirCal(ws, fmt);
      for (const s of seccionesDe(fmt, "tabla").filter((x) => esVisible(x, datos))) {
        const T = celdas.tablas[s.k];
        if (filasConDatos(s, datos).length > T.n) throw new Error(`la plantilla tiene espacio para ${T.n} filas en «${s.titulo}» y hay ${filasConDatos(s, datos).length}`);
      }
      escribirEnHoja(ws, fmt, datos, celdas);
      const nFotos = fmt.fotos === false ? 0 : await agregarHojaFotos(workbook, { titulo: fmt.titulo, proyecto: h.obra.proyecto, fecha: String(datos.fecha || "").split("-").reverse().join("/"), fotos });
      await descargarLibro(workbook, `${fmt.archivo}_${textoParaArchivo(h.obra.proyecto, 24)}_${datos.fecha || "sin-fecha"}${texto(datos.hoja) ? "_Hoja-" + textoParaArchivo(datos.hoja, 12) : ""}.xlsx`);
      memoria.recordarUso({ personas: fmt.firmas.personas.map((p) => [datos[`${p.k}Nombre`], datos[`${p.k}Cargo`]]) });
      const nuevas = guardarFinal();
      setGenerado(`✓ Excel descargado y registro guardado${nFotos ? ` (con ${nFotos} ${nFotos === 1 ? "foto" : "fotos"})` : ""}.${nuevas.length ? ` Se ${nuevas.length === 1 ? "creó 1 no conformidad" : `crearon ${nuevas.length} no conformidades`}.` : ""}`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // ---------- Casillas ----------
  const opcionesProveedor = proveedores;
  function campo(c) {
    const el = campoBase(c);
    return c.ayuda ? <div key={c.k}>{el}<div className="text-[10.5px] mt-0.5" style={{ color: "#8A8F99" }}>{c.ayuda}</div></div> : el;
  }
  function campoBase(c) {
    const etq = etiquetaUI(c); const v = datos[c.k];
    if (c.tipo === "calculado") return <Calculado key={c.k} label={etq} valor={c.calc ? c.calc(datos) : ""} />;
    if (c.fuente === "proveedores") {
      return <BuscadorLista key={c.k} label={etq} value={v} onChange={(x) => set(c.k, x)} opciones={opcionesProveedor} opcionesAlAbrir={opcionesProveedor.slice(0, 8)} placeholder="Elige uno guardado o escribe uno nuevo"
        onElegir={(o) => setVarios({ [c.k]: o.texto, ...(o.nit && !texto(datos.nit) ? { nit: o.nit } : {}), ...(o.tipo && "tipoTercero" in datos && !texto(datos.tipoTercero) ? { tipoTercero: o.tipo } : {}) })} />;
    }
    if (c.tipo === "listaOtro") {
      let extras = [];
      try { extras = c.guardarOtros ? JSON.parse(localStorage.getItem(c.guardarOtros) || "[]") : []; } catch (e) { extras = []; }
      const opciones = [...c.opciones, ...extras.filter((x) => !c.opciones.includes(x))];
      const recordar = (x) => { const t = texto(x); if (!t || !c.guardarOtros || opciones.includes(t)) return; try { localStorage.setItem(c.guardarOtros, JSON.stringify([...extras, t])); } catch (e) { /* sin almacenamiento */ } };
      return <CampoCargo key={c.k} label={etq} value={v} opciones={opciones} placeholder={c.otroTexto} onChange={(x) => set(c.k, x)} onGuardar={recordar} />;
    }
    if (c.tipo === "persona") {
      return <BuscadorLista key={c.k} label={etq} value={v} onChange={(x) => set(c.k, x)} opciones={memoria.opcionesNombres} opcionesAlAbrir={memoria.nombresAlAbrir} placeholder="Elige un profesional guardado o escribe el nombre" />;
    }
    if (c.tipo === "area") return <AreaTexto key={c.k} label={etq} value={v} filas={2} onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "fecha") return <Campo key={c.k} label={etq} type="date" value={v} onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "hora") return <SelectorHora key={c.k} label={etq} value={v} onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "fechahora") return <Campo key={c.k} label={etq} type="datetime-local" value={v} onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "lista") return <Lista key={c.k} label={etq} value={v} opciones={c.opciones} onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "chips") return <ChipsOpcion key={c.k} label={etq} value={v} opciones={c.opciones} colores={COLOR_ESTADO} pequeno onChange={(x) => set(c.k, x)} />;
    if (c.tipo === "numero" || c.tipo === "porcentaje") return <Campo key={c.k} label={etq} value={v} inputMode="decimal" onChange={(x) => set(c.k, x.replace(/[^0-9.,]/g, ""))} />;
    return <Campo key={c.k} label={etq} value={v} onChange={(x) => set(c.k, x)} />;
  }
  function celdaTabla(s, fila, i, c) {
    const act = (patch) => setReg((cur) => ({ ...cur, datos: { ...cur.datos, [s.k]: cur.datos[s.k].map((f, k) => { if (k !== i) return f; const n = { ...f, ...patch }; const extra = s.autoFila ? s.autoFila(n, f) : null; return extra ? { ...n, ...extra } : n; }) } }));
    const etq = etiquetaUI({ etq: c.enc, label: c.label }) + (c.etqUnidad && texto(fila[c.etqUnidad]) ? ` (${texto(fila[c.etqUnidad])})` : ""); const v = fila[c.k];
    if (c.tipo === "calculado") return <Calculado key={c.k} label={etq} valor={c.calc ? c.calc(fila, datos) : ""} semaforo={c.semaforo} />;
    if (c.tipo === "hora" || c.tipo === "horaExcel") return <SelectorHora key={c.k} label={etq} value={v} onChange={(x) => act({ [c.k]: x })} />;
    if (c.tipo === "fechahora") return <Campo key={c.k} label={etq} type="datetime-local" value={v} onChange={(x) => act({ [c.k]: x })} />;
    if (c.fuente === "materiales") {
      return <BuscadorLista key={c.k} label={etq} value={v} onChange={(x) => act({ [c.k]: x })} opciones={materiales} opcionesAlAbrir={materiales.slice(0, 8)} placeholder="Elige del catálogo o escribe"
        onElegir={(o) => { const col = s.cols.find((x) => x.k === "unidad"); act({ [c.k]: o.texto, ...(col && col.opciones && !texto(fila.unidad) && col.opciones.includes(o.unidad) ? { unidad: o.unidad } : {}) }); }} />;
    }
    if (c.tipo === "area") return <AreaTexto key={c.k} label={etq} value={v} filas={2} onChange={(x) => act({ [c.k]: x })} />;
    if (c.tipo === "fecha") return <Campo key={c.k} label={etq} type="date" value={v} onChange={(x) => act({ [c.k]: x })} />;
    if (c.tipo === "lista") return <Lista key={c.k} label={etq} value={v} opciones={c.opciones} onChange={(x) => act({ [c.k]: x })} />;
    if (c.tipo === "chips") return <ChipsOpcion key={c.k} label={etq} nombre={etq} value={v} opciones={c.opciones} colores={COLOR_ESTADO} pequeno onChange={(x) => act({ [c.k]: x })} />;
    if (c.tipo === "numero" || c.tipo === "porcentaje") return <Campo key={c.k} label={etq} value={v} inputMode="decimal" placeholder={c.ayuda || ""} onChange={(x) => act({ [c.k]: x.replace(/[^0-9.,]/g, "") })} />;
    if (c.sugerencias) { const ops = c.sugerencias.map((t) => ({ texto: t, detalle: "" })); return <BuscadorLista key={c.k} label={etq} value={v} onChange={(x) => act({ [c.k]: x })} opciones={ops} opcionesAlAbrir={ops} placeholder="Elige o escribe la unidad" />; }
    return <Campo key={c.k} label={etq} value={v} placeholder={c.ayuda || ""} onChange={(x) => act({ [c.k]: x })} />;
  }
  // Agrega una fila a una tabla (respeta el máximo de filas de la plantilla); devuelve false si ya no cabe
  function agregarFila(s, base = {}) {
    const filas = (datos && datos[s.k]) || [];
    if (filas.length >= s.max) { setAvisoTabla((a) => ({ ...a, [s.k]: `Esta hoja tiene espacio para ${s.max} filas. Guarda esta hoja y crea otra con «Nuevo registro» para continuar.` })); return false; }
    setAvisoTabla((a) => ({ ...a, [s.k]: "" }));
    setReg((cur) => ({ ...cur, datos: { ...cur.datos, [s.k]: [...cur.datos[s.k], filaNueva(s, base)] } }));
    return true;
  }
  // Quita la fila (ya confirmada) y deja la última quitada para poder deshacer
  function quitarYa(k, i, nombre, recordar) {
    const fila = reg && reg.datos && Array.isArray(reg.datos[k]) ? reg.datos[k][i] : null;
    if (recordar !== false && fila) setQuitada({ k, i, fila, nombre });
    setReg((cur) => ({ ...cur, datos: { ...cur.datos, [k]: cur.datos[k].filter((_, j) => j !== i) } }));
    setAvisoTabla((a) => ({ ...a, [k]: "" }));
  }
  function deshacerQuitar() {
    if (!quitada) return;
    const q = quitada;
    setReg((cur) => { const arr = [...(cur.datos[q.k] || [])]; arr.splice(Math.min(q.i, arr.length), 0, q.fila); return { ...cur, datos: { ...cur.datos, [q.k]: arr } }; });
    setQuitada(null);
  }
  // Devuelve a la tabla los registros estándar que faltan, en su orden original (no toca lo ya escrito)
  function faltantesDeLista(s) {
    if (!s.restaurar || !Array.isArray(s.inicial)) return [];
    const clave = s.cols[0].k; const n = (x) => String(x == null ? "" : x).trim().toLowerCase();
    const hay = new Set(((datos && datos[s.k]) || []).map((f) => n(f[clave])));
    return s.inicial.filter((o) => !hay.has(n(o[clave])));
  }
  function restaurarLista(s) {
    const clave = s.cols[0].k; const n = (x) => String(x == null ? "" : x).trim().toLowerCase();
    setReg((cur) => {
      const actuales = cur.datos[s.k] || []; const porClave = new Map(actuales.map((f) => [n(f[clave]), f]));
      const ordenadas = s.inicial.map((o) => porClave.get(n(o[clave])) || filaNueva(s, o));
      const usados = new Set(s.inicial.map((o) => n(o[clave])));
      const extras = actuales.filter((f) => !usados.has(n(f[clave])));
      return { ...cur, datos: { ...cur.datos, [s.k]: [...ordenadas, ...extras] } };
    });
    setAvisoTabla((a) => ({ ...a, [s.k]: "" })); setQuitada(null);
  }
  function seccionTabla(s) {
    const filas = datos[s.k];
    const quitar = (i) => {
      const fila = (reg && reg.datos && Array.isArray(reg.datos[s.k]) ? reg.datos[s.k][i] : null) || {};
      const conDatos = s.cols.some((c) => { const v = fila[c.k]; return v !== undefined && v !== null && v !== false && String(v).trim() !== ""; });
      const nombre = String(s.tituloFila ? fila[s.tituloFila] || "" : "").trim() || `${s.nombreFila || "fila"} ${i + 1}`;
      if (conDatos) setPorQuitar({ k: s.k, i, nombre }); else quitarYa(s.k, i, nombre, false);
    };
    const agregar = (base = {}) => agregarFila(s, base);
    const ultima = filas[filas.length - 1];
    return (
      <Seccion key={s.id} id={s.id} titulo={s.titulo} subtitulo={`${filasConDatos(s, datos).length} de ${s.max}`} abierta={abierta === s.id} onToggle={alternar} contador={filasConDatos(s, datos).length}>
        {filas.map((fila, i) => {
          const llave = `${s.k}${i}`; const plegada = s.plegable && !filaAbierta[llave];
          return (
          <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
            {s.plegable ? (
              <button type="button" data-fila={llave} onClick={() => setFilaAbierta((a) => ({ ...a, [llave]: !a[llave] }))} className="w-full text-left text-[12px] font-semibold pr-5" style={{ color: NAVY }}>
                <span style={{ color: GOLD }}>{plegada ? "▸" : "▾"} #{i + 1}</span> {texto(fila[s.tituloFila]) || <span style={{ color: "#8A8F99" }}>(sin nombre)</span>}
              </button>
            ) : <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>{s.nombreFila || "Fila"} #{i + 1}</div>}
            {!plegada && <div className="space-y-2 mt-1.5">{s.cols.map((c) => celdaTabla(s, fila, i, c))}</div>}
            {!s.fija && <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${s.nombreFila || "fila"} ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>}
          </div>
          );
        })}
        {!s.fija && <div className="space-y-2">
          {ultima && <button type="button" onClick={() => agregar(Object.fromEntries(s.cols.filter((c) => c.repetir !== false && c.tipo !== "calculado" && !["obs", "informe", "resultado", "obtenido", "lote", "recibida", "pedida", "codigo", "estado", "cilindro", "carga", "resistencia", "fechaEnsayo", "remision"].includes(c.k)).map((c) => [c.k, ultima[c.k]])))} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>➕ Otro con los mismos datos del anterior</button>}
          <button type="button" onClick={() => agregar()} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar {String(s.nombreFila || "fila").toLowerCase()}</button>
        </div>}
        {faltantesDeLista(s).length > 0 && <button type="button" data-restaurar-lista onClick={() => restaurarLista(s)} className="mt-2 w-full text-center py-2 rounded-md text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY, background: "#FFF8E8" }}>↺ Restaurar los {faltantesDeLista(s).length} registros que faltan (en su orden original)</button>}
        {avisoTabla[s.k] && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoTabla[s.k]}</div>}
      </Seccion>
    );
  }
  function seccionLista(s) {
    const lista = datos[s.k];
    const act = (i, patch) => setReg((cur) => ({ ...cur, datos: { ...cur.datos, [s.k]: cur.datos[s.k].map((x, k) => (k === i ? { ...x, ...patch } : x)) } }));
    const respondidas = lista.filter((x) => texto(x.resp)).length;
    const conPeso = s.items.some((it) => it.peso);
    return (
      <Seccion key={s.id} id={s.id} titulo={s.titulo} subtitulo={`${respondidas} de ${s.items.length} respondidas`} abierta={abierta === s.id} onToggle={alternar} contador={respondidas}>
        {s.items.map((it, i) => conPeso ? (
          <div key={i} className="border rounded-lg p-2.5 mb-2" data-campo={`Respuesta ${i + 1}`} style={{ borderColor: LINE, background: PAPER }}>
            <div className="text-[12.5px] mb-2" style={{ color: NAVY }}><span className="font-bold mr-1.5" style={{ color: GOLD }}>{i + 1}.</span>{it.t} <span className="text-[10.5px]" style={{ color: "#8A8F99" }}>(peso {it.peso} %)</span></div>
            <ChipsOpcion value={lista[i].resp} opciones={s.resp.opciones} pequeno sinMarca nombre={`Respuesta ${i + 1}`} onChange={(x) => act(i, { resp: x })} />
            {lista[i].resp && s.resp.etiquetas && <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>{s.resp.etiquetas[lista[i].resp]}</div>}
            <input type="text" value={lista[i].obs || ""} onChange={(e) => act(i, { obs: e.target.value })} placeholder="Observación (opcional)" aria-label={`Observación ${i + 1}`} className="w-full mt-2 text-[12.5px] px-2.5 py-1.5 rounded-md border outline-none" style={{ borderColor: LINE, background: "white" }} />
          </div>
        ) : (
          <FilaVerificacion key={i} numero={i + 1} texto={it.t} valor={lista[i].resp} opciones={s.resp.opciones} colores={s.resp.colores} onChange={(x) => act(i, { resp: x })} observacion={lista[i].obs} onObservacion={(x) => act(i, { obs: x })} />
        ))}
        {!conPeso && <button type="button" onClick={() => setReg((cur) => ({ ...cur, datos: { ...cur.datos, [s.k]: cur.datos[s.k].map((x) => (texto(x.resp) ? x : { ...x, resp: s.resp.opciones[0] })) } }))} className="text-[11.5px] underline mt-1" style={{ color: NAVY }}>Marcar «{s.resp.opciones[0]}» en todas las que faltan</button>}
      </Seccion>
    );
  }

  // ---------- Pantalla ----------
  const avisos = datos && fmt.avisos ? fmt.avisos(datos, reg) : [];
  const sugeridas = datos && fmt.ncSugerida ? fmt.ncSugerida(datos) : [];
  const cifras = datos && fmt.resumen ? fmt.resumen(datos) : [];
  // Pendientes de la obra (p. ej. cilindros por ensayar): salen de otros registros guardados
  const pendientes = useMemo(() => (fmt.pendientes && h.id ? fmt.pendientes(h.id, reg) : []), [fmt, h.id, version, reg && reg.id, reg && JSON.stringify((reg.datos || {})[fmt.pendientesTabla || "_"])]);   // eslint-disable-line
  const tablaPend = fmt.pendientesTabla ? seccionesDe(fmt, "tabla").find((t) => t.k === fmt.pendientesTabla) : null;
  const listaPend = (conBoton) => (
    <div className="space-y-1.5" data-pendientes>
      {pendientes.slice(0, 40).map((p) => (
        <div key={p.id} className="text-[11.5px] px-2.5 py-1.5 rounded flex items-center gap-2" style={{ background: COLOR_PEND[p.estado][0], color: COLOR_PEND[p.estado][1] }}>
          <div className="flex-1"><div className="font-semibold">{p.titulo}</div><div>{p.detalle}</div></div>
          {conBoton && tablaPend && <button type="button" disabled={p.yaEnTabla} onClick={() => agregarFila(tablaPend, p.fila)} className="text-[11px] font-semibold px-2 py-1 rounded border" style={{ borderColor: COLOR_PEND[p.estado][1], opacity: p.yaEnTabla ? 0.5 : 1 }}>{p.yaEnTabla ? "Ya está" : "Agregar"}</button>}
        </div>
      ))}
      {pendientes.length > 40 && <div className="text-[11px]" style={{ color: "#8A8F99" }}>Y {pendientes.length - 40} más.</div>}
    </div>
  );
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo={fmt.titulo} subtitulo={fmt.subtitulo} onVolver={onVolver} />
      <BarraObra h={h} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="obra" titulo="Obra" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Elige o crea la obra"} abierta={abierta === "obra" || (sinObra && abierta !== "x")} onToggle={alternar}>
          <PanelObraCal h={h} campos={fmt.panelObra} />
        </Seccion>

        {!sinObra && !reg && (
          <div className="pt-3">
            {pendientes.length > 0 && <div className="mb-3"><div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>{fmt.pendientesTitulo} ({pendientes.length})</div>{listaPend(false)}</div>}
            <button type="button" onClick={nuevo} className="w-full text-center py-2.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: NAVY }}>➕ Nuevo registro</button>
            <div className="text-[11px] font-semibold mt-4 mb-1.5" style={{ color: NAVY }}>Registros guardados de esta obra ({registros.length})</div>
            {registros.length === 0 && <div className="text-[12px]" style={{ color: "#8A8F99" }}>Aún no hay registros. Toca «Nuevo registro» para empezar.</div>}
            {registros.map((r) => (
              <div key={r.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <button type="button" onClick={() => abrir(r.id)} className="flex-1 text-left text-[12.5px]" style={{ color: NAVY }}>{etiquetaRegistro(fmt, r)}</button>
                <button type="button" onClick={() => eliminar(r.id)} aria-label="Eliminar registro" style={{ color: "#B3401F" }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {!sinObra && reg && (
          <>
            <div className="flex items-center justify-between py-2">
              <button type="button" onClick={guardarYVolver} className="text-[12px] underline" style={{ color: NAVY }}>← Guardar y volver a la lista</button>
              <span className="text-[10.5px]" style={{ color: "#8A8F99" }}>Se guarda solo</span>
            </div>
            {(avisos.length > 0 || sugeridas.length > 0 || creadasNC.length > 0) && (
              <div className="space-y-1.5 mb-2" data-avisos>
                {avisos.map((a, i) => <div key={i} className="text-[11.5px] px-2.5 py-1.5 rounded" style={{ background: colorAviso[a.tipo][0], color: colorAviso[a.tipo][1] }}>{a.tipo === "alerta" ? "⚠️ " : "ℹ️ "}{a.texto}</div>)}
                {sugeridas.map((s) => {
                  const ya = ncDeOrigen(reg.obraId, reg.id, s.clave);
                  return <div key={s.clave} className="text-[11.5px] px-2.5 py-1.5 rounded" style={{ background: "#FDEDEA", color: "#B3401F" }}>🚫 {ya ? `No conformidad N° ${ya.numero} creada: ` : "Se creará una no conformidad al guardar: "}{s.titulo}</div>;
                })}
              </div>
            )}
            {pendientes.length > 0 && tablaPend && (
              <Seccion id="pendientes" titulo={fmt.pendientesTitulo} subtitulo={`${pendientes.filter((p) => p.estado === "vencido").length} vencidos de ${pendientes.length}`} abierta={abierta === "pendientes"} onToggle={alternar} contador={pendientes.length}>
                {listaPend(true)}
                <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Salen de los vaciados que registraste. «Agregar» pasa el cilindro a la tabla para que escribas su resistencia; al guardarla deja de aparecer aquí.</div>
              </Seccion>
            )}
            {seccionesDe(fmt).filter((s) => esVisible(s, datos)).map((s) => {
              if (s.tipo === "campos") {
                const visibles = s.campos.filter((c) => !c.obra);
                return (
                  <Seccion key={s.id} id={s.id} titulo={s.titulo} subtitulo={s.id === "datos" ? `${datos.fecha || "sin fecha"}${texto(datos.hoja) ? " · Hoja " + datos.hoja : ""}` : ""} abierta={abierta === s.id} onToggle={alternar}>
                    <div className="space-y-2.5">{visibles.map(campo)}</div>
                  </Seccion>
                );
              }
              return s.tipo === "tabla" ? seccionTabla(s) : seccionLista(s);
            })}
            {cifras.length > 0 && (
              <Seccion id="resumen" titulo="Resumen" subtitulo="Se calcula con lo registrado" abierta={abierta === "resumen"} onToggle={alternar}>
                <CifrasResumen cifras={cifras} />
                <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Así queda también en la hoja de Excel: estos totales se calculan solos con las fórmulas de la plantilla.</div>
              </Seccion>
            )}
            {fmt.fotos !== false && (
              <Seccion id="fotos" titulo="Fotos (opcional)" subtitulo={fotos.length ? `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} para el Excel` : "Salen en una hoja «Fotos» del Excel"} abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.length}>
                <SeccionFotosAnexo fotos={fotos} setFotos={setFotos} />
              </Seccion>
            )}
            <Seccion id="firmas" titulo="Firmas" subtitulo="Se adelantan con las del último registro" abierta={abierta === "firmas"} onToggle={alternar}>
              <div className="space-y-2.5">
                {fmt.firmas.personas.map((p, i) => (
                  <div key={p.k}>
                    <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>{p.titulo}</div>
                    <BloqueProfesional memoria={memoria} etqNombre={`Nombre — ${p.titulo}`} etqCargo={`Cargo — ${p.titulo}`} nombre={datos[`${p.k}Nombre`]} cargo={datos[`${p.k}Cargo`]}
                      onChange={(patch) => setVarios({ ...(patch.nombre !== undefined ? { [`${p.k}Nombre`]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [`${p.k}Cargo`]: patch.cargo } : {}) })} />
                  </div>
                ))}
              </div>
            </Seccion>
            <div className="pt-4"><button type="button" onClick={guardarYVolver} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>💾 Guardar registro y volver a la lista</button></div>
          </>
        )}
      </div>
      {porQuitar && (
        <div data-confirmar-quitar style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, maxWidth: 340, width: "100%", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
            <div style={{ color: NAVY, fontWeight: 700, fontSize: 14 }}>¿Quitar «{porQuitar.nombre}» de la lista?</div>
            <div style={{ color: "#5A6270", fontSize: 12, marginTop: 6 }}>Se borra de este registro. Justo después podrás deshacerlo.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" data-quitar-cancelar onClick={() => setPorQuitar(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${NAVY}`, color: NAVY, fontWeight: 600, fontSize: 13 }}>Cancelar</button>
              <button type="button" data-quitar-confirmar onClick={() => { const q = porQuitar; setPorQuitar(null); quitarYa(q.k, q.i, q.nombre); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "#B3401F", color: "#fff", fontWeight: 700, fontSize: 13 }}>Quitar</button>
            </div>
          </div>
        </div>
      )}
      {quitada && !porQuitar && (
        <div data-deshacer-quitar style={{ position: "fixed", left: 12, right: 12, bottom: 72, zIndex: 65, background: NAVY, color: "#fff", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          <span style={{ flex: 1 }}>Se quitó «{quitada.nombre}».</span>
          <button type="button" data-deshacer onClick={deshacerQuitar} style={{ color: GOLD, fontWeight: 700, textDecoration: "underline" }}>Deshacer</button>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setQuitada(null)} style={{ color: "#fff", opacity: 0.7 }}>✕</button>
        </div>
      )}
      {reg && !sinObra && <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton={`Generar Excel de ${fmt.titulo.toLowerCase()}`} onGenerar={generarExcel} />}
    </div>
  );
}
