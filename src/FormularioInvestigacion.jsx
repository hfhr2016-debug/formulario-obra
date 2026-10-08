import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_INVESTIGACION, HOJA_INVESTIGACION, CELDAS_INVESTIGACION, TIPOS_EVENTO, TIPOS_CONTROL, ESTADOS_PLAN, SI_NO, PREGUNTAS_PORQUES, PLAZO_DIAS,
  ACTOS_SUBESTANDAR, CONDICIONES_SUBESTANDAR, FACTORES_PERSONALES, FACTORES_TRABAJO,
  descubrirInvestigacion, escribirInvestigacionEnHoja, validarInvestigacion, camposFaltantesInvestigacion, resumenInvestigacion,
  miembroNuevo, hechoNuevo, conHoraDelEvento, accionPlanNueva, equipoConDatos, secuenciaConDatos, planConDatos, causasMarcadas, plazoMaximo, fueraDePlazo,
} from "./investigacionDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion, fechaDDMMYYYY } from "./sstBase";
import { ChipsOpcion, CampoFecha, GrillaOpciones } from "./sstControles";
import { TraerDeFicha } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_investigacion";
const CLAVE_CONSECUTIVO = "ryr_sst_investigacion_consecutivo";
const CLAVE_INVESTIGACIONES = "ryr_sst_investigaciones";    // resumen de cada investigación: de aquí trae su plan Acciones Correctivas
const CLAVE_ACCIDENTES = "ryr_sst_accidentes";              // de aquí se pueden traer los datos del reporte del accidente
const T = CELDAS_INVESTIGACION.tablas || {};
const MAX_EQUIPO = (T.equipo && T.equipo.n) || 4;
const MAX_HECHOS = (T.secuencia && T.secuencia.n) || 6;
const MAX_PLAN = (T.plan && T.plan.n) || 6;
const ROLES = ["Jefe inmediato", "Representante del COPASST o Vigía SST", "Responsable del SG-SST", "Residente de obra", "Supervisor", "Otro"];
const OPC_ROLES = ROLES.map((t) => ({ texto: t, detalle: "" }));
const COLOR_ESTADO = { Abierta: "#C98A00", "En proceso": "#1F6FB5", Cerrada: "#2E7D4F" };
const vacios = (n) => Array.from({ length: n }, () => "");

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", nInvestigacion: "", nReporte: "", fechaEvento: "", fechaInvestigacion: "", tipoEvento: "",
    trabajadorNombre: "", documento: "", cargo: "", incapacidad: "",
    equipo: [miembroNuevo()], descripcion: "", secuencia: [hechoNuevo()], porques: vacios(5), causaRaiz: "",
    actos: [], condiciones: [], personales: [], trabajo: [], otros: {},
    plan: [accionPlanNueva()], lecciones: "", socializo: "", fechaSocializacion: "", verificacion: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", aproboNombre: "", aproboCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.nInvestigacion || d.nReporte || d.fechaEvento || d.fechaInvestigacion || d.tipoEvento || d.trabajadorNombre || d.descripcion || d.causaRaiz || d.lecciones ||
    d.elaboroNombre || d.equipo.some((m) => m.nombre) || d.secuencia.some((h) => h.hecho || h.hora || h.momento) || d.porques.some(Boolean) || d.plan.some((p) => p.accion) || causasMarcadas(d));
}

export default function FormularioInvestigacion({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoFilas, setAvisoFilas] = useState("");
  const [avisoReporte, setAvisoReporte] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const alternarMarca = (campo) => (base) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(base) ? cur[campo].filter((t) => t !== base) : [...cur[campo], base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));

  // ---- Traer los datos del reporte del accidente ----
  const reportes = leerJSON(CLAVE_ACCIDENTES, []);
  const textoReporte = (r) => `N° ${r.nReporte || "s/n"} · ${r.fechaEvento ? fechaDDMMYYYY(r.fechaEvento) : "sin fecha"} · ${r.tipoEvento}${r.trabajadorNombre ? " · " + r.trabajadorNombre : ""}`;
  function traerReporte(texto) {
    const r = reportes.find((x) => textoReporte(x) === texto);
    if (!r) return;
    setD((cur) => ({
      ...cur, nReporte: r.nReporte || cur.nReporte, fechaEvento: r.fechaEvento || cur.fechaEvento, tipoEvento: r.tipoEvento || cur.tipoEvento, trabajadorNombre: r.trabajadorNombre || cur.trabajadorNombre,
      documento: r.documento || cur.documento, cargo: r.cargo || cur.cargo, incapacidad: r.incapacidad ? String(r.incapacidad) : cur.incapacidad, descripcion: cur.descripcion || r.queOcurrio || "",
      proyecto: cur.proyecto || r.proyecto || "", contratista: cur.contratista || r.contratista || "", ubicacion: cur.ubicacion || r.ubicacion || "",
    }));
    if (r.horaEvento) setD((cur) => ({ ...cur, secuencia: conHoraDelEvento(cur.secuencia, r.horaEvento, MAX_HECHOS).secuencia }));
    setAvisoReporte(`Se trajeron los datos del reporte N° ${r.nReporte || "s/n"}${r.horaEvento ? " (incluida la hora del evento, " + r.horaEvento + ")" : ""}.`);
  }

  const reporteVinculado = reportes.find((x) => d.nReporte && x.nReporte === d.nReporte && (!d.fechaEvento || x.fechaEvento === d.fechaEvento));
  function usarHoraEvento() {
    const r = conHoraDelEvento(d.secuencia, reporteVinculado.horaEvento, MAX_HECHOS);
    if (r.estado === "ok") setD((cur) => ({ ...cur, secuencia: conHoraDelEvento(cur.secuencia, reporteVinculado.horaEvento, MAX_HECHOS).secuencia }));
    setAvisoFilas(r.estado === "ya" ? "Esa hora ya está en la secuencia." : r.estado === "lleno" ? `La secuencia ya tiene los ${MAX_HECHOS} hechos que caben.` : "");
  }

  // ---- Filas de las tablas ----
  const actualizarFila = (campo) => (i, patch) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const quitarFila = (campo) => (i) => { setD((cur) => ({ ...cur, [campo]: cur[campo].filter((_, k) => k !== i) })); setAvisoFilas(""); };
  const agregarFila = (campo, nueva, max, nombre) => () => {
    if (d[campo].length >= max) { setAvisoFilas(`Esta hoja tiene espacio para ${max} ${nombre}.`); return; }
    setAvisoFilas(""); setD((cur) => ({ ...cur, [campo]: [...cur[campo], nueva()] }));
  };
  const actualizarMiembro = actualizarFila("equipo"), actualizarHecho = actualizarFila("secuencia"), actualizarPlan = actualizarFila("plan");
  const setPorque = (i, v) => setD((cur) => ({ ...cur, porques: cur.porques.map((x, k) => (k === i ? v : x)) }));

  const plazo = plazoMaximo(d);
  const tarde = fueraDePlazo(d);
  const abiertas = planConDatos(d).filter((p) => p.estado !== "Cerrada").length;
  const marcadas = causasMarcadas(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarInvestigacion(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesInvestigacion(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-investigacion.xlsx", HOJA_INVESTIGACION);
      const avisos = [];
      const lectura = descubrirInvestigacion(ws);
      const decision = decidirDistribucion(lectura, CELDAS_INVESTIGACION);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nInvestigacion && String(d.nInvestigacion).trim() ? String(d.nInvestigacion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const sinMarcar = escribirInvestigacionEnHoja(ws, { ...d, nInvestigacion: nUsar }, celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Investigacion_${d.fechaInvestigacion}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(d.tipoEvento, 24)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar(equipoConDatos(d).map((m) => ({ nombre: m.nombre, documento: m.documento, cargo: m.rol, empresa: d.contratista })));
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.aproboNombre, d.aproboCargo], ...planConDatos(d).map((p) => [p.responsable, p.responsableCargo])], empresasUsadas: [d.contratista] });
      const res = resumenInvestigacion({ ...d, nInvestigacion: nUsar });
      guardarJSON(CLAVE_INVESTIGACIONES, [res, ...leerJSON(CLAVE_INVESTIGACIONES, []).filter((x) => x.id !== res.id)].slice(0, 300));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInvestigacion: nUsar }));
      setGenerado(`✓ Excel descargado (investigación N° ${nUsar}: ${res.plan.length} ${res.plan.length === 1 ? "acción" : "acciones"} en el plan, ${res.accionesAbiertas} abiertas).` +
        (tarde ? ` ⚠ Se hizo después del plazo de ${PLAZO_DIAS} días (${fechaDDMMYYYY(plazo)}).` : "") +
        (res.accionesAbiertas ? " Las acciones abiertas ya se pueden traer en Acciones Correctivas." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva investigación: conserva la obra y las firmas; limpia lo propio del evento (el N° avanza solo)
  function nuevaInvestigacion() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion,
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, aproboNombre: cur.aproboNombre, aproboCargo: cur.aproboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoFilas(""); setAvisoReporte(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una investigación en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoFilas(""); setAvisoReporte(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una investigación de accidente" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const botonFila = (texto, onClick) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> {texto}</button>
  );
  const quitar = (onClick, etq) => (
    <button type="button" onClick={onClick} aria-label={etq} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
  );
  const nOpciones = (arr) => (arr.length ? `${arr.length} marcadas` : "ninguna");

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INVESTIGACIÓN DE ACCIDENTES" subtitulo={`${CODIGO_INVESTIGACION} · Análisis de causas y plan de acción`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.nReporte ? `Reporte N° ${d.nReporte}` : "Obra, evento y trabajador"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            {reportes.length === 0 && (
              <div className="text-[11.5px] p-2 rounded" style={{ background: "#F2F6FB", color: "#4B5563" }}>
                Todavía no hay reportes de accidente guardados en este dispositivo. Cuando generes uno en <b>Accidente o Incidente</b>, podrás traer sus datos aquí.
              </div>
            )}
            {reportes.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
                <Lista label="📥 Traer los datos de un reporte de accidente" value="" onChange={traerReporte} opciones={reportes.map(textoReporte)} />
                {avisoReporte && <div className="text-[11px] mt-1.5" style={{ color: "#2E7D4F" }}>{avisoReporte}</div>}
              </div>
            )}
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, ...{ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion } }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="N° de investigación" value={d.nInvestigacion} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInvestigacion", v.replace(/[^0-9A-Za-z-]/g, ""))} />
              <Campo label="Reporte N°" value={d.nReporte} onChange={(v) => set("nReporte", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            </div>
            <Lista label="Tipo de evento" value={d.tipoEvento} onChange={(v) => set("tipoEvento", v)} opciones={TIPOS_EVENTO} />
            <CampoFecha label="Fecha del evento" value={d.fechaEvento} onChange={(v) => set("fechaEvento", v)} />
            <CampoFecha label="Fecha de investigación" value={d.fechaInvestigacion} onChange={(v) => set("fechaInvestigacion", v)} />
            {plazo && (
              <div className="text-[11.5px] p-2 rounded" style={tarde ? { background: "#FDECE7", color: "#B3401F" } : { background: "#EEF7F0", color: "#2E7D4F" }}>
                {tarde ? "⚠ Fuera de plazo: " : "✓ "}la investigación debe hacerse a más tardar el <b>{fechaDDMMYYYY(plazo)}</b> ({PLAZO_DIAS} días después del evento).
              </div>
            )}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Trabajador afectado</div>
            <BuscadorLista label="Nombre del trabajador afectado" value={d.trabajadorNombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Si no hubo lesionado, déjalo vacío"
              onChange={(v) => set("trabajadorNombre", v)} onElegir={(o) => { const t = trabajadores.buscar(o.texto); setD((cur) => ({ ...cur, trabajadorNombre: t ? t.nombre : o.texto, documento: cur.documento || (t && t.documento) || "", cargo: cur.cargo || (t && t.cargo) || "" })); }} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Documento" value={d.documento} inputMode="numeric" onChange={(v) => set("documento", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
              <Campo label="Días de incapacidad" value={d.incapacidad} inputMode="numeric" onChange={(v) => set("incapacidad", v.replace(/[^0-9.,]/g, ""))} />
            </div>
            <BuscadorLista label="Cargo / oficio" value={d.cargo} onChange={(v) => set("cargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
          </div>
        </Seccion>

        {/* 2. EQUIPO */}
        <Seccion id="equipo" titulo="2. Equipo investigador" subtitulo={`${equipoConDatos(d).length} de ${MAX_EQUIPO} · lo ideal: jefe inmediato, COPASST/Vigía y responsable SST`} abierta={abierta === "equipo"} onToggle={alternar} contador={equipoConDatos(d).length}>
          {d.equipo.map((m, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <BuscadorLista label="Nombre completo" value={m.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                  onChange={(v) => actualizarMiembro(i, { nombre: v })} onElegir={(o) => { const t = trabajadores.buscar(o.texto); actualizarMiembro(i, { nombre: t ? t.nombre : o.texto, documento: m.documento || (t && t.documento) || "" }); }} />
                <BuscadorLista label="Cargo y rol en la investigación" value={m.rol} onChange={(v) => actualizarMiembro(i, { rol: v })} opciones={OPC_ROLES} opcionesAlAbrir={OPC_ROLES} maxResultados={10} placeholder="Elige el rol o escribe otro" />
                <Campo label="Documento del integrante" value={m.documento} inputMode="numeric" onChange={(v) => actualizarMiembro(i, { documento: v.replace(/[^0-9A-Za-z.-]/g, "") })} />
              </div>
              {quitar(() => quitarFila("equipo")(i), `Quitar integrante ${i + 1}`)}
            </div>
          ))}
          {botonFila("Agregar integrante", agregarFila("equipo", miembroNuevo, MAX_EQUIPO, "integrantes"))}
          {avisoFilas && abierta === "equipo" && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoFilas}</div>}
        </Seccion>

        {/* 3. DESCRIPCIÓN Y SECUENCIA */}
        <Seccion id="descripcion" titulo="3. Descripción y secuencia del evento" subtitulo={`${secuenciaConDatos(d).length} hechos en orden`} abierta={abierta === "descripcion"} onToggle={alternar} contador={secuenciaConDatos(d).length}>
          <div className="space-y-2.5">
            <AreaTexto label="Descripción del evento" value={d.descripcion} onChange={(v) => set("descripcion", v)} filas={4} />
            {reporteVinculado && reporteVinculado.horaEvento && (
              <button type="button" onClick={usarHoraEvento} className="w-full text-[12px] font-semibold rounded-lg py-2 border" style={{ borderColor: GOLD, color: NAVY, background: PAPER }}>
                🕒 Usar la hora del evento del reporte de accidente ({reporteVinculado.horaEvento})
              </button>
            )}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Secuencia: qué pasó, en orden</div>
            {d.secuencia.map((h, i) => (
              <div key={i} className="border rounded-lg p-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                <div className="space-y-2">
                  <SelectorHora label="Hora" value={h.hora} onChange={(v) => actualizarHecho(i, { hora: v })} />
                  <Campo label="Momento (si no hay hora exacta)" value={h.momento || ""} placeholder="Ej. antes del izaje" onChange={(v) => actualizarHecho(i, { momento: v })} />
                  <AreaTexto label="Qué ocurrió" value={h.hecho} onChange={(v) => actualizarHecho(i, { hecho: v })} filas={2} />
                </div>
                {quitar(() => quitarFila("secuencia")(i), `Quitar hecho ${i + 1}`)}
              </div>
            ))}
            {botonFila("Agregar hecho", agregarFila("secuencia", hechoNuevo, MAX_HECHOS, "hechos"))}
            {avisoFilas && abierta === "descripcion" && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>{avisoFilas}</div>}
          </div>
        </Seccion>

        {/* 4. CAUSA RAÍZ */}
        <Seccion id="porques" titulo="4. Causa raíz — los 5 porqués" subtitulo={d.causaRaiz ? "Causa raíz escrita" : "Pregúntate ¿por qué? hasta llegar a la causa"} abierta={abierta === "porques"} onToggle={alternar}>
          <div className="space-y-2.5">
            {PREGUNTAS_PORQUES.map((p, i) => (
              <AreaTexto key={i} label={`${i + 1}. ${p}`} value={d.porques[i]} onChange={(v) => setPorque(i, v)} filas={2} />
            ))}
            <AreaTexto label="Causa raíz identificada" value={d.causaRaiz} onChange={(v) => set("causaRaiz", v)} filas={3} placeholder="La causa de fondo, a la que hay que dirigir las acciones" />
          </div>
        </Seccion>

        {/* 5. CAUSAS */}
        <Seccion id="causas" titulo="5. Causas inmediatas y básicas" subtitulo={marcadas ? `${marcadas} marcadas` : "Marca las que apliquen"} abierta={abierta === "causas"} onToggle={alternar} contador={marcadas}>
          <div className="space-y-3">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Causas inmediatas · actos subestándar ({nOpciones(d.actos)})</div>
            <GrillaOpciones nombre="Actos subestándar" opciones={ACTOS_SUBESTANDAR} marcadas={d.actos} onAlternar={alternarMarca("actos")} otros={d.otros} onOtro={cambiarOtro} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Causas inmediatas · condiciones subestándar ({nOpciones(d.condiciones)})</div>
            <GrillaOpciones nombre="Condiciones subestándar" opciones={CONDICIONES_SUBESTANDAR} marcadas={d.condiciones} onAlternar={alternarMarca("condiciones")} otros={d.otros} onOtro={cambiarOtro} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Causas básicas · factores personales ({nOpciones(d.personales)})</div>
            <GrillaOpciones nombre="Factores personales" opciones={FACTORES_PERSONALES} marcadas={d.personales} onAlternar={alternarMarca("personales")} otros={d.otros} onOtro={cambiarOtro} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Causas básicas · factores del trabajo ({nOpciones(d.trabajo)})</div>
            <GrillaOpciones nombre="Factores del trabajo" opciones={FACTORES_TRABAJO} marcadas={d.trabajo} onAlternar={alternarMarca("trabajo")} otros={d.otros} onOtro={cambiarOtro} />
          </div>
        </Seccion>

        {/* 6. PLAN DE ACCIÓN */}
        <Seccion id="plan" titulo="6. Plan de acción" subtitulo={`${planConDatos(d).length} de ${MAX_PLAN} acciones${abiertas ? ` · ${abiertas} abiertas` : ""}`} abierta={abierta === "plan"} onToggle={alternar} contador={planConDatos(d).length}>
          {d.plan.map((p, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <AreaTexto label="Acción" value={p.accion} onChange={(v) => actualizarPlan(i, { accion: v })} filas={2} />
                <Lista label="Tipo de control" value={p.control} onChange={(v) => actualizarPlan(i, { control: v })} opciones={TIPOS_CONTROL} />
                <BloqueProfesional memoria={memoria} etqNombre="Responsable" etqCargo="Cargo del responsable" nombre={p.responsable} cargo={p.responsableCargo}
                  onChange={(patch) => actualizarPlan(i, { ...(patch.nombre !== undefined ? { responsable: patch.nombre } : {}), ...(patch.cargo !== undefined ? { responsableCargo: patch.cargo } : {}) })} />
                <Campo label="Fecha compromiso" type="date" value={p.fecha} onChange={(v) => actualizarPlan(i, { fecha: v })} />
                <ChipsOpcion label="Estado" nombre={`Estado plan ${i + 1}`} value={p.estado} opciones={ESTADOS_PLAN} colores={COLOR_ESTADO} pequeno onChange={(v) => actualizarPlan(i, { estado: v })} />
              </div>
              {quitar(() => quitarFila("plan")(i), `Quitar acción ${i + 1}`)}
            </div>
          ))}
          {botonFila("Agregar acción", agregarFila("plan", accionPlanNueva, MAX_PLAN, "acciones"))}
          {avisoFilas && abierta === "plan" && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoFilas}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Las acciones que dejes abiertas se pueden traer después en Acciones Correctivas para darles seguimiento.</div>
        </Seccion>

        {/* 7. CIERRE */}
        <Seccion id="cierre" titulo="7. Lecciones aprendidas y seguimiento" subtitulo="Divulgación y verificación de eficacia" abierta={abierta === "cierre"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Lecciones aprendidas" value={d.lecciones} onChange={(v) => set("lecciones", v)} filas={3} />
            <ChipsOpcion label="¿Se socializó con el equipo?" nombre="Socializó" value={d.socializo} opciones={SI_NO} onChange={(v) => set("socializo", v)} />
            <Campo label="Fecha de socialización" type="date" value={d.fechaSocializacion} onChange={(v) => set("fechaSocializacion", v)} />
            <AreaTexto label="Verificación de eficacia (fecha y resultado)" value={d.verificacion} onChange={(v) => set("verificacion", v)} filas={2} />
            <div className="text-[11.5px]" style={{ color: "#4B5563" }}>Acciones abiertas en el plan: <b>{abiertas}</b> (se escribe sola en el formato).</div>
          </div>
        </Seccion>

        {/* 8. FIRMAS */}
        <Seccion id="firmas" titulo="8. Firmas" subtitulo="Elabora SST; revisa COPASST o Vigía; aprueba el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (COPASST o Vigía SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Aprobó (residente o representante legal)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien aprueba" etqCargo="Cargo de quien aprueba" nombre={d.aproboNombre} cargo={d.aproboCargo} onChange={cambiarPersona("aproboNombre", "aproboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaInvestigacion} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva investigación (conserva la obra y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la investigación" onGenerar={generarExcel} />
    </div>
  );
}
