import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_ATS, HOJA_ATS, CELDAS_ATS, NIVELES, EPP_ATS, PERMISOS_ATS, PROBABILIDADES, SEVERIDADES, PELIGROS_COMUNES,
  descubrirAts, escribirAtsEnHoja, validarAts, resumenAts, nivelRiesgo, pasosConDatos, equipoConDatos,
} from "./atsDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { decidirDistribucion } from "./sstBase";
import { proyectoSST, guardarProyectoSST } from "./sstComunes";
import { ChipsOpcion, CampoFecha, GrillaOpciones } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_ats";
const CLAVE_CONSECUTIVO = "ryr_sst_ats_consecutivo";
const CLAVE_ATS = "ryr_sst_ats";                              // resumen de cada ATS generado
const CLAVE_ULTIMO_EQUIPO = "ryr_sst_ats_ultimo_equipo";      // equipo del último ATS (para repetirlo)
const CLAVE_ULTIMA_EMERGENCIA = "ryr_sst_ats_ultima_emergencia";
const MAX_PASOS = (CELDAS_ATS.tablas && CELDAS_ATS.tablas.pasos.n) || 12;
const MAX_EQUIPO = (CELDAS_ATS.tablas && CELDAS_ATS.tablas.equipo.n) || 8;
const COLOR_NIVEL = { Alto: "#B3401F", Medio: "#C98A00", Bajo: "#2E7D4F" };

const pasoNuevo = (base = {}) => ({ paso: "", peligro: "", riesgo: "", prob: "", sev: "", control: "", responsableNombre: "", responsableCargo: "", residual: "", ...base });
const personaNueva = (base = {}) => ({ nombre: "", documento: "", cargo: "", hora: "", ...base });
const etiquetaDe = (lista, v) => (lista.find(([x]) => x === v) || ["", ""])[1];
const valorDe = (lista, e) => (lista.find(([, l]) => l === e) || ["", ""])[0];
const OPCIONES_PELIGROS = PELIGROS_COMUNES.map((p) => ({ texto: p.peligro, detalle: "" }));

function datosIniciales() {
  return {
    proyecto: proyectoSST(), contratista: "", ubicacion: "", fecha: "", tarea: "", area: "", nAts: "", horaInicio: "", horaFin: "",
    supervisorNombre: "", supervisorCargo: "", permisoAsociado: "",
    pasos: [pasoNuevo()], epp: [], permisos: [], otros: {},
    equipo: [personaNueva()], horaSocializacion: "",
    puntoEncuentro: "", telefono: "", brigadista: "", centroSalud: "", ruta: "",
    revisoNombre: "", revisoCargo: "", aproboNombre: "", aproboCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.fecha || d.tarea || d.area || d.nAts || d.supervisorNombre || d.epp.length || d.permisos.length ||
    d.pasos.some((p) => p.paso || p.peligro || p.control) || d.equipo.some((e) => e.nombre) || d.puntoEncuentro || d.revisoNombre);
}

export default function FormularioATS({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoPasos, setAvisoPasos] = useState("");
  const [avisoEquipo, setAvisoEquipo] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const opcionesPeligros = useMemo(() => OPCIONES_PELIGROS, []);

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Pasos de la tarea ----
  const setPasos = (nuevos) => setD((cur) => ({ ...cur, pasos: nuevos }));
  const actualizarPaso = (i, patch) => setPasos(d.pasos.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const quitarPaso = (i) => { setPasos(d.pasos.filter((_, k) => k !== i)); setAvisoPasos(""); };
  const hayEspacio = d.pasos.length < MAX_PASOS;
  const sinEspacio = () => setAvisoPasos(`Este ATS tiene espacio para ${MAX_PASOS} filas. Si la tarea tiene más pasos, genera otro ATS para el resto.`);
  function agregarPaso() { if (!hayEspacio) return sinEspacio(); setAvisoPasos(""); setPasos([...d.pasos, pasoNuevo()]); }
  function otroPeligroMismoPaso() {
    const ultimo = d.pasos[d.pasos.length - 1];
    if (!ultimo) return agregarPaso();
    if (!hayEspacio) return sinEspacio();
    setAvisoPasos(""); setPasos([...d.pasos, pasoNuevo({ paso: ultimo.paso, responsableNombre: ultimo.responsableNombre, responsableCargo: ultimo.responsableCargo })]);
  }
  // Al elegir un peligro de la lista se sugieren su riesgo y su control (solo si esos campos están vacíos)
  function elegirPeligro(i, o) {
    const cat = PELIGROS_COMUNES.find((p) => p.peligro === o.texto);
    const p = d.pasos[i];
    actualizarPaso(i, cat ? { peligro: cat.peligro, riesgo: p.riesgo || cat.riesgo, control: p.control || cat.control } : { peligro: o.texto });
  }

  // ---- Equipo ----
  const setEquipo = (nuevo) => setD((cur) => ({ ...cur, equipo: nuevo }));
  const actualizarPersona = (i, patch) => setEquipo(d.equipo.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const quitarPersona = (i) => { setEquipo(d.equipo.filter((_, k) => k !== i)); setAvisoEquipo(""); };
  function agregarPersona() {
    if (d.equipo.length >= MAX_EQUIPO) { setAvisoEquipo(`Este ATS tiene espacio para ${MAX_EQUIPO} personas. Si son más, genera otro ATS para el resto.`); return; }
    setAvisoEquipo(""); setEquipo([...d.equipo, personaNueva()]);
  }
  function elegirTrabajador(i, o) {
    const t = trabajadores.buscar(o.texto);
    const p = d.equipo[i];
    actualizarPersona(i, { nombre: t ? t.nombre : o.texto, documento: p.documento || (t && t.documento) || "", cargo: p.cargo || (t && t.cargo) || "" });
  }
  const ultimoEquipo = leerJSON(CLAVE_ULTIMO_EQUIPO, []);
  const ultimaEmergencia = leerJSON(CLAVE_ULTIMA_EMERGENCIA, null);

  const alternarMarca = (campo) => (base) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(base) ? cur[campo].filter((t) => t !== base) : [...cur[campo], base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));

  const pasosCon = pasosConDatos(d);
  const equipoCon = equipoConDatos(d);
  const altos = pasosCon.filter((p) => nivelRiesgo(p.prob, p.sev) === "Alto").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarAts(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-ats.xlsx", HOJA_ATS);
      let celdas = CELDAS_ATS;
      const avisos = [];
      const lectura = descubrirAts(ws);
      const decision = decidirDistribucion(lectura, CELDAS_ATS);   // si el formato de la plantilla no coincide con la app, se detiene
      celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const capPasos = (celdas.tablas && celdas.tablas.pasos && celdas.tablas.pasos.n) || MAX_PASOS;
      const capEquipo = (celdas.tablas && celdas.tablas.equipo && celdas.tablas.equipo.n) || MAX_EQUIPO;
      if (pasosCon.length > capPasos) throw new Error(`la plantilla tiene espacio para ${capPasos} pasos y hay ${pasosCon.length}`);
      if (equipoCon.length > capEquipo) throw new Error(`la plantilla tiene espacio para ${capEquipo} personas y hay ${equipoCon.length}`);
      const nUsar = d.nAts && String(d.nAts).trim() ? String(d.nAts).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const sinMarcar = escribirAtsEnHoja(ws, { ...d, nAts: nUsar, horaSocializacion: d.horaSocializacion || d.horaInicio }, celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `ATS_${d.fecha}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(d.tarea, 28)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar(equipoCon.map((e) => ({ nombre: e.nombre, documento: e.documento, cargo: e.cargo, empresa: d.contratista })));
      guardarJSON(CLAVE_ULTIMO_EQUIPO, equipoCon);
      if (d.puntoEncuentro || d.telefono || d.brigadista || d.centroSalud || d.ruta) {
        guardarJSON(CLAVE_ULTIMA_EMERGENCIA, { puntoEncuentro: d.puntoEncuentro, telefono: d.telefono, brigadista: d.brigadista, centroSalud: d.centroSalud, ruta: d.ruta });
      }
      guardarProyectoSST(d.proyecto);
      memoria.recordarUso({
        personas: [[d.supervisorNombre, d.supervisorCargo], [d.revisoNombre, d.revisoCargo], [d.aproboNombre, d.aproboCargo], ...pasosCon.map((p) => [p.responsableNombre, p.responsableCargo])],
        cargosObra: equipoCon.map((e) => e.cargo), empresasUsadas: [d.contratista],
      });
      const res = resumenAts({ ...d, nAts: nUsar });
      guardarJSON(CLAVE_ATS, [res, ...leerJSON(CLAVE_ATS, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nAts: nUsar }));
      setGenerado(`✓ Excel descargado (ATS N° ${nUsar}: ${pasosCon.length} ${pasosCon.length === 1 ? "paso" : "pasos"}, ${altos} de riesgo alto, ${equipoCon.length} en el equipo). Imprímelo para que el equipo firme.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo ATS: conserva la obra, el supervisor y las firmas; limpia la tarea (el N° avanza solo)
  function nuevoAts() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fecha: cur.fecha,
      supervisorNombre: cur.supervisorNombre, supervisorCargo: cur.supervisorCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo,
      aproboNombre: cur.aproboNombre, aproboCargo: cur.aproboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPasos(""); setAvisoEquipo(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un ATS en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPasos(""); setAvisoEquipo(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un ATS" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="ANÁLISIS DE TRABAJO SEGURO" subtitulo={`${CODIGO_ATS} · ATS: pasos, peligros, riesgos y controles`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la tarea" subtitulo="Obra, tarea y responsable" abierta={abierta === "datos"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <CampoFecha label="Fecha" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="N° de ATS" value={d.nAts} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nAts", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            </div>
            <AreaTexto label="Tarea o actividad a analizar" value={d.tarea} onChange={(v) => set("tarea", v)} placeholder="Ej. Instalación de fachada flotante en el piso 8" filas={2} />
            <Campo label="Área / frente de trabajo" value={d.area} onChange={(v) => set("area", v)} />
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Supervisor responsable de la tarea</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del supervisor" etqCargo="Cargo del supervisor" nombre={d.supervisorNombre} cargo={d.supervisorCargo} onChange={cambiarPersona("supervisorNombre", "supervisorCargo")} />
            <Campo label="Permiso de trabajo asociado (N°)" value={d.permisoAsociado} placeholder="Si la tarea tiene permiso, escribe su número" onChange={(v) => set("permisoAsociado", v)} />
          </div>
        </Seccion>

        {/* 2. ANÁLISIS */}
        <Seccion id="pasos" titulo="2. Análisis de la tarea" subtitulo={`${pasosCon.length} de ${MAX_PASOS} filas${altos ? ` · ${altos} de riesgo alto` : ""}`} abierta={abierta === "pasos"} onToggle={alternar} contador={pasosCon.length}>
          <div className="text-[10.5px] mb-2.5" style={{ color: "#8A8F99" }}>Nivel de riesgo = probabilidad × severidad (1-2 Bajo · 3-4 Medio · 6-9 Alto). Controles: eliminación, sustitución, ingeniería, administrativos y EPP.</div>
          {d.pasos.map((p, i) => {
            const nivel = nivelRiesgo(p.prob, p.sev);
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: nivel === "Alto" ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</div>
                  {nivel && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: COLOR_NIVEL[nivel] }}>Riesgo {nivel}</div>}
                </div>
                <div className="space-y-2">
                  <AreaTexto label="Paso de la tarea" value={p.paso} onChange={(v) => actualizarPaso(i, { paso: v })} filas={2} placeholder="Qué se hace en este paso" />
                  <BuscadorLista label="Peligro identificado" value={p.peligro} opciones={opcionesPeligros} opcionesAlAbrir={opcionesPeligros} maxResultados={10} placeholder="Elige un peligro frecuente o escribe otro"
                    onChange={(v) => actualizarPaso(i, { peligro: v })} onElegir={(o) => elegirPeligro(i, o)} />
                  <AreaTexto label="Riesgo / consecuencia" value={p.riesgo} onChange={(v) => actualizarPaso(i, { riesgo: v })} filas={2} />
                  <ChipsOpcion label="Probabilidad" nombre={`Probabilidad ${i + 1}`} value={etiquetaDe(PROBABILIDADES, p.prob)} opciones={PROBABILIDADES.map((x) => x[1])} pequeno
                    onChange={(e) => actualizarPaso(i, { prob: valorDe(PROBABILIDADES, e) })} />
                  <ChipsOpcion label="Severidad" nombre={`Severidad ${i + 1}`} value={etiquetaDe(SEVERIDADES, p.sev)} opciones={SEVERIDADES.map((x) => x[1])} pequeno
                    onChange={(e) => actualizarPaso(i, { sev: valorDe(SEVERIDADES, e) })} />
                  <AreaTexto label="Medidas de control" value={p.control} onChange={(v) => actualizarPaso(i, { control: v })} filas={3} />
                  <BloqueProfesional memoria={memoria} etqNombre="Responsable del control" etqCargo="Cargo del responsable" nombre={p.responsableNombre} cargo={p.responsableCargo}
                    onChange={(patch) => actualizarPaso(i, { ...(patch.nombre !== undefined ? { responsableNombre: patch.nombre } : {}), ...(patch.cargo !== undefined ? { responsableCargo: patch.cargo } : {}) })} />
                  <ChipsOpcion label="Nivel de riesgo residual (después de los controles)" nombre={`Residual ${i + 1}`} value={p.residual} opciones={NIVELES} colores={COLOR_NIVEL} pequeno onChange={(v) => actualizarPaso(i, { residual: v })} />
                </div>
                <button type="button" onClick={() => quitarPaso(i)} aria-label={`Quitar fila ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <div className="space-y-2">
            {d.pasos.length > 0 && (
              <button type="button" onClick={otroPeligroMismoPaso} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>
                ➕ Otro peligro del mismo paso
              </button>
            )}
            <button type="button" onClick={agregarPaso} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
              <Plus size={14} /> Agregar paso
            </button>
          </div>
          {avisoPasos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoPasos}</div>}
        </Seccion>

        {/* 3. EPP Y PERMISOS */}
        <Seccion id="epp" titulo="3. EPP y permisos requeridos" subtitulo={`${d.epp.length} EPP · ${d.permisos.length} permisos`} abierta={abierta === "epp"} onToggle={alternar} contador={d.epp.length + d.permisos.length}>
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>EPP requerido para esta tarea</div>
          <GrillaOpciones nombre="EPP requerido" opciones={EPP_ATS} marcadas={d.epp} onAlternar={alternarMarca("epp")} otros={d.otros} onOtro={cambiarOtro} />
          <div className="text-[11px] font-semibold mt-3 mb-1.5" style={{ color: NAVY }}>Permisos y requisitos asociados</div>
          <GrillaOpciones nombre="Permisos y requisitos" opciones={PERMISOS_ATS} marcadas={d.permisos} onAlternar={alternarMarca("permisos")} otros={d.otros} onOtro={cambiarOtro} />
        </Seccion>

        {/* 4. EQUIPO */}
        <Seccion id="equipo" titulo="4. Equipo de trabajo y socialización" subtitulo={`${equipoCon.length} de ${MAX_EQUIPO} personas`} abierta={abierta === "equipo"} onToggle={alternar} contador={equipoCon.length}>
          {ultimoEquipo.length > 0 && equipoCon.length === 0 && (
            <button type="button" onClick={() => { setEquipo(ultimoEquipo.slice(0, MAX_EQUIPO).map((p) => personaNueva(p))); setAvisoEquipo(""); }} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
              👥 Traer el equipo del último ATS ({ultimoEquipo.length})
            </button>
          )}
          <div className="mb-3"><SelectorHora label="Hora de socialización (para todo el equipo)" value={d.horaSocializacion} onChange={(v) => set("horaSocializacion", v)} /></div>
          {d.equipo.map((p, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <BuscadorLista label="Nombre completo" value={p.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                  onChange={(v) => actualizarPersona(i, { nombre: v })} onElegir={(o) => elegirTrabajador(i, o)} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Documento" value={p.documento} inputMode="numeric" onChange={(v) => actualizarPersona(i, { documento: v.replace(/[^0-9A-Za-z.-]/g, "") })} />
                  <BuscadorLista label="Cargo / oficio" value={p.cargo} onChange={(v) => actualizarPersona(i, { cargo: v })} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
                </div>
              </div>
              <button type="button" onClick={() => quitarPersona(i)} aria-label={`Quitar persona ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarPersona} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar persona
          </button>
          {avisoEquipo && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoEquipo}</div>}
        </Seccion>

        {/* 5. EMERGENCIA */}
        <Seccion id="emergencia" titulo="5. Plan de emergencia" subtitulo="Punto de encuentro, teléfonos y rescate" abierta={abierta === "emergencia"} onToggle={alternar}>
          {ultimaEmergencia && !d.puntoEncuentro && !d.telefono && (
            <button type="button" onClick={() => setD((cur) => ({ ...cur, ...ultimaEmergencia }))} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
              🚑 Usar los datos de emergencia del último ATS
            </button>
          )}
          <div className="space-y-2.5">
            <Campo label="Punto de encuentro" value={d.puntoEncuentro} onChange={(v) => set("puntoEncuentro", v)} />
            <Campo label="Teléfono de emergencias" value={d.telefono} inputMode="tel" onChange={(v) => set("telefono", v)} />
            <Campo label="Brigadista" value={d.brigadista} onChange={(v) => set("brigadista", v)} />
            <Campo label="Centro de salud más cercano" value={d.centroSalud} onChange={(v) => set("centroSalud", v)} />
            <Campo label="Ruta de evacuación o rescate" value={d.ruta} onChange={(v) => set("ruta", v)} />
          </div>
        </Seccion>

        {/* 6. FIRMAS */}
        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Elabora el supervisor; revisa SST; aprueba el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (supervisor de la tarea, ya escrito en el paso 1)</div>
            <div className="text-[12px]" style={{ color: "#4B5563" }}>{d.supervisorNombre || "Sin nombre todavía"}{d.supervisorCargo ? ` · ${d.supervisorCargo}` : ""}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (responsable SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Aprobó (residente / director de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien aprueba" etqCargo="Cargo de quien aprueba" nombre={d.aproboNombre} cargo={d.aproboCargo} onChange={cambiarPersona("aproboNombre", "aproboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoAts} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo ATS (conserva la obra, el supervisor y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del ATS" onGenerar={generarExcel} />
    </div>
  );
}
