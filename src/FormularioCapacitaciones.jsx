import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, unirUnicos, recordarTexto } from "./sstBase";
import { TEMAS_LISTA } from "./listaAsistenciaDatos";
import {
  CODIGO_CAPACITACIONES, CELDAS_CAPACITACIONES, TIPOS_CAPACITACION, ESTADOS, METAS_POR_DEFECTO, filaVacia, filasConTema, indicadores,
  descubrirCapacitaciones, escribirCapacitacionesEnHoja, validarCapacitaciones, filasDesdeEventos, filaDesdeInducciones,
} from "./capacitacionesDatos";
import {
  NAVY, GOLD, PAPER, LINE, CLAVE_EVENTOS, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { proyectoSST, guardarProyectoSST, useListaRecordada } from "./sstComunes";
import { ENTIDADES_QUE_DICTAN } from "./sstListas";

const CLAVE_BORRADOR = "ryr_borrador_capacitaciones";
const CLAVE_TEMAS = "ryr_sst_temas_lista";                 // la misma memoria de temas de la Lista de Asistencia
const CLAVE_METAS = "ryr_sst_metas_capacitacion";          // últimas metas usadas
const CLAVE_INDUCCIONES = "ryr_sst_inducciones";           // resumen de cada inducción (las guarda el formulario de Inducción)
const MAX_FILAS = (CELDAS_CAPACITACIONES.tablas && CELDAS_CAPACITACIONES.tablas.matriz.n) || 15;

function datosIniciales() {
  const metas = leerJSON(CLAVE_METAS, {});
  return {
    proyecto: proyectoSST(), contratista: "", ubicacion: "", responsableNombre: "", responsableCargo: "",
    periodoDesde: "", periodoHasta: "", actualizacion: "",
    metaCumplimiento: String(metas.cumplimiento || METAS_POR_DEFECTO.cumplimiento), metaCobertura: String(metas.cobertura || METAS_POR_DEFECTO.cobertura), metaEficacia: String(metas.eficacia || METAS_POR_DEFECTO.eficacia),
    filas: [], observaciones: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}

// ¿La matriz ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.responsableNombre || d.periodoDesde || d.periodoHasta || d.actualizacion || d.observaciones || d.filas.length);
}

const pct = (v) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const color = (estado) => (estado === "cumple" ? "#1D6B3A" : estado === "no cumple" ? "#B3401F" : "#8A8F99");

export default function FormularioCapacitaciones({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("general");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoFilas, setAvisoFilas] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const entidades = useListaRecordada("ryr_sst_entidades_dictan", ENTIDADES_QUE_DICTAN);   // la misma lista de entidades que en la Lista de Asistencia
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const [temasExtra, setTemasExtra] = useState(() => leerJSON(CLAVE_TEMAS, []));
  const opcionesTemas = useMemo(() => unirUnicos(temasExtra, TEMAS_LISTA, false).map((t) => ({ texto: t, detalle: "" })), [temasExtra]);

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const bloqueResponsable = () => (
    <BloqueProfesional memoria={memoria} etqNombre="Responsable del programa SST (nombre)" etqCargo="Cargo del responsable" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
  );

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Filas de la matriz ----
  const filas = d.filas;
  const setFilas = (nuevas) => setD((cur) => ({ ...cur, filas: nuevas }));
  const actualizarFila = (i, patch) => setFilas(filas.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const quitarFila = (i) => { setFilas(filas.filter((_, k) => k !== i)); setAvisoFilas(""); };
  function agregarFila() {
    if (filas.length >= MAX_FILAS) { setAvisoFilas(`La matriz tiene espacio para ${MAX_FILAS} capacitaciones. Genera esta y usa "Nuevo periodo" para continuar.`); return; }
    setAvisoFilas("");
    setFilas([...filas, filaVacia()]);
  }

  // Trae las actividades que ya se registraron con la Lista de Asistencia y las inducciones, dentro del periodo
  function traerActividades() {
    if (!d.periodoDesde || !d.periodoHasta) { setAvisoFilas('Primero indica el periodo evaluado (desde y hasta) en "Datos del programa".'); return; }
    const yaTraidos = filas.map((f) => f.origen).filter(Boolean);
    const deLista = filasDesdeEventos(leerJSON(CLAVE_EVENTOS, []), d.periodoDesde, d.periodoHasta, yaTraidos);
    const inducciones = leerJSON(CLAVE_INDUCCIONES, []);
    const deInduccion = filaDesdeInducciones(inducciones, d.periodoDesde, d.periodoHasta, yaTraidos);
    const todas = deInduccion ? [...deLista, deInduccion] : deLista;
    if (!todas.length) { setAvisoFilas("No encontré actividades nuevas en ese periodo. Se traen las que registraste con la Lista de Asistencia (capacitaciones, simulacros, entrenamientos…) y las inducciones."); return; }
    const libres = MAX_FILAS - filas.length;
    const agregar = todas.slice(0, Math.max(0, libres));
    setFilas([...filas, ...agregar]);
    const partes = [];
    const nLista = agregar.filter((f) => f.origen.startsWith("lista:")).length;
    if (nLista) partes.push(`${nLista} de la Lista de Asistencia`);
    if (agregar.some((f) => f.origen.startsWith("induccion:"))) partes.push("una fila con las inducciones");
    setAvisoFilas(`Se agregaron ${agregar.length}: ${partes.join(" y ")}.` + (todas.length > agregar.length ? ` No cupieron ${todas.length - agregar.length} (la matriz tiene ${MAX_FILAS} filas).` : ""));
    setAbierta("matriz");
  }

  const ind = indicadores(d);
  const conTema = filasConTema(d);

  async function generarExcel() {
    setMensajeError("");
    setAvisoGeneracion("");
    const faltan = validarCapacitaciones(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-capacitaciones.xlsx", "Capacitaciones");
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_CAPACITACIONES;
      const avisos = [];
      try {
        const lectura = descubrirCapacitaciones(ws);
        if (lectura.celdas) celdas = lectura.celdas;
        else {
          console.warn("No pude leer la distribución de la plantilla; uso la de por defecto:", lectura.problemas);
          avisos.push("No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame.");
        }
      } catch (e) {
        console.warn("Error al leer la plantilla; uso la distribución por defecto:", e);
      }
      const capacidad = (celdas.tablas && celdas.tablas.matriz.n) || MAX_FILAS;
      if (conTema.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} capacitaciones y hay ${conTema.length}`);
      escribirCapacitacionesEnHoja(ws, d, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Matriz_Capacitacion_${d.periodoDesde}_${d.periodoHasta}.xlsx`);

      // Memoria para la próxima vez
      guardarJSON(CLAVE_METAS, { cumplimiento: Number(d.metaCumplimiento) || METAS_POR_DEFECTO.cumplimiento, cobertura: Number(d.metaCobertura) || METAS_POR_DEFECTO.cobertura, eficacia: Number(d.metaEficacia) || METAS_POR_DEFECTO.eficacia });
      guardarProyectoSST(d.proyecto);
      (d.filas || []).forEach((f) => entidades.recordar(f.capacitador));
      memoria.recordarUso({ personas: [[d.responsableNombre, d.responsableCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      let nuevos = temasExtra;
      for (const f of conTema) nuevos = recordarTexto(nuevos, f.tema, { base: TEMAS_LISTA, min: 4, max: 60 });
      if (nuevos !== temasExtra) { setTemasExtra(nuevos); guardarJSON(CLAVE_TEMAS, nuevos); }
      borrador.borrarBorrador();
      borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${conTema.length} capacitaciones del ${d.periodoDesde} al ${d.periodoHasta}). Imprímelo para las firmas, o toca "Nuevo periodo" (al final de la pantalla).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  // Nuevo periodo: conserva los datos del programa y las capacitaciones que quedaron pendientes o reprogramadas
  function nuevoPeriodo() {
    setD((cur) => ({
      ...cur, periodoDesde: "", periodoHasta: "", actualizacion: "", observaciones: "",
      filas: cur.filas.filter((f) => f.tema && (f.estado === "Pendiente" || f.estado === "Reprogramada")).map((f) => ({ ...f, origen: "" })),
    }));
    borrador.borrarBorrador();
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAvisoFilas("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una matriz en blanco? Se limpian todos los datos, incluidos los del programa.")) return;
    borrador.borrarBorrador();
    setD({ ...datosIniciales(), proyecto: "" });
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAvisoFilas("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una matriz de capacitación" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="MATRIZ DE CAPACITACIÓN" subtitulo={`${CODIGO_CAPACITACIONES} · Programa, cobertura y eficacia`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS DEL PROGRAMA */}
        <Seccion id="general" titulo="1. Datos del programa" subtitulo="Obra, periodo y responsable" abierta={abierta === "general"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Periodo — desde" type="date" value={d.periodoDesde} onChange={(v) => set("periodoDesde", v)} />
              <Campo label="Periodo — hasta" type="date" value={d.periodoHasta} onChange={(v) => set("periodoHasta", v)} />
            </div>
            <div>
              <Campo label="Fecha de actualización" type="date" value={d.actualizacion} onChange={(v) => set("actualizacion", v)} />
              {!d.actualizacion && (
                <button type="button" onClick={() => set("actualizacion", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
              )}
            </div>
            {bloqueResponsable()}
          </div>
        </Seccion>

        {/* 2. METAS E INDICADORES */}
        <Seccion id="indicadores" titulo="2. Metas e indicadores" subtitulo="Se calculan solos con la matriz" abierta={abierta === "indicadores"} onToggle={alternar}>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <Campo label="Meta cumplim. %" value={d.metaCumplimiento} inputMode="numeric" onChange={(v) => set("metaCumplimiento", v.replace(/[^0-9]/g, ""))} />
            <Campo label="Meta cobertura %" value={d.metaCobertura} inputMode="numeric" onChange={(v) => set("metaCobertura", v.replace(/[^0-9]/g, ""))} />
            <Campo label="Meta eficacia %" value={d.metaEficacia} inputMode="numeric" onChange={(v) => set("metaEficacia", v.replace(/[^0-9]/g, ""))} />
          </div>
          <div className="space-y-1.5 text-[12px]" style={{ color: NAVY }}>
            <div className="flex justify-between"><span>Programadas / ejecutadas</span><b>{ind.programadas} / {ind.ejecutadas}</b></div>
            <div className="flex justify-between"><span>Cumplimiento del programa</span><b style={{ color: color(ind.estadoCumplimiento) }}>{pct(ind.cumplimiento)} {ind.estadoCumplimiento && `· ${ind.estadoCumplimiento === "cumple" ? "✔ cumple" : "✘ por debajo"}`}</b></div>
            <div className="flex justify-between"><span>Convocados / asistentes</span><b>{ind.convocados} / {ind.asistentes}</b></div>
            <div className="flex justify-between"><span>Cobertura global</span><b style={{ color: color(ind.estadoCobertura) }}>{pct(ind.cobertura)} {ind.estadoCobertura && `· ${ind.estadoCobertura === "cumple" ? "✔ cumple" : "✘ por debajo"}`}</b></div>
            <div className="flex justify-between"><span>Evaluados / aprobados</span><b>{ind.evaluados} / {ind.aprobados}</b></div>
            <div className="flex justify-between"><span>Eficacia (aprobados / evaluados)</span><b style={{ color: color(ind.estadoEficacia) }}>{pct(ind.eficacia)} {ind.estadoEficacia && `· ${ind.estadoEficacia === "cumple" ? "✔ cumple" : "✘ por debajo"}`}</b></div>
          </div>
        </Seccion>

        {/* 3. MATRIZ */}
        <Seccion id="matriz" titulo="3. Matriz de capacitación" subtitulo={`${conTema.length} de ${MAX_FILAS} capacitaciones`} abierta={abierta === "matriz"} onToggle={alternar} contador={conTema.length}>
          <button type="button" onClick={traerActividades} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📥 Traer las actividades del periodo (Lista de Asistencia e inducciones)
          </button>
          {filas.map((f, i) => {
            const cob = Number(f.convocados) > 0 && f.asistentes !== "" ? Math.round((Number(f.asistentes) / Number(f.convocados)) * 100) : null;
            const efi = Number(f.evaluados) > 0 && f.aprobados !== "" ? Math.round((Number(f.aprobados) / Number(f.evaluados)) * 100) : null;
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}{f.origen ? " · traída automáticamente" : ""}</div>
                <div className="space-y-2">
                  <BuscadorLista label="Tema de la capacitación" value={f.tema} opciones={opcionesTemas} opcionesAlAbrir={opcionesTemas} maxResultados={10} placeholder="Elige uno de la lista o escribe el tuyo" onChange={(v) => actualizarFila(i, { tema: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Lista label="Tipo" value={f.tipo} onChange={(v) => actualizarFila(i, { tipo: v })} opciones={TIPOS_CAPACITACION} />
                    <Lista label="Estado" value={f.estado} onChange={(v) => actualizarFila(i, { estado: v })} opciones={ESTADOS} />
                  </div>
                  <Campo label="Dirigida a" value={f.dirigida} onChange={(v) => actualizarFila(i, { dirigida: v })} placeholder="Ej. Armadores, todo el personal" />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Fecha programada" type="date" value={f.programada} onChange={(v) => actualizarFila(i, { programada: v })} />
                    <Campo label="Fecha ejecutada" type="date" value={f.ejecutada} onChange={(v) => actualizarFila(i, { ejecutada: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <BuscadorLista label="Capacitador / entidad" value={f.capacitador} opciones={entidades.opciones} opcionesAlAbrir={entidades.opciones} maxResultados={10} placeholder="Elige una entidad de la lista o escribe quién dicta" onChange={(v) => actualizarFila(i, { capacitador: v })} />
                    <Campo label="Duración (h)" value={f.duracion} inputMode="decimal" onChange={(v) => actualizarFila(i, { duracion: v.replace(/[^0-9.]/g, "") })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Personas convocadas" value={f.convocados} inputMode="numeric" onChange={(v) => actualizarFila(i, { convocados: v.replace(/[^0-9]/g, "") })} />
                    <Campo label="Personas asistentes" value={f.asistentes} inputMode="numeric" onChange={(v) => actualizarFila(i, { asistentes: v.replace(/[^0-9]/g, "") })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Personas evaluadas" value={f.evaluados} inputMode="numeric" onChange={(v) => actualizarFila(i, { evaluados: v.replace(/[^0-9]/g, "") })} />
                    <Campo label="Personas aprobadas" value={f.aprobados} inputMode="numeric" onChange={(v) => actualizarFila(i, { aprobados: v.replace(/[^0-9]/g, "") })} />
                  </div>
                  {(cob !== null || efi !== null) && (
                    <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>
                      {cob !== null && <>Cobertura: {cob}%</>}{cob !== null && efi !== null && " · "}{efi !== null && <>Eficacia: {efi}%</>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Lista de asistencia N°" value={f.lista} onChange={(v) => actualizarFila(i, { lista: v })} placeholder="Ej. Hoja 1" />
                    <Campo label="Observaciones" value={f.observaciones} onChange={(v) => actualizarFila(i, { observaciones: v })} />
                  </div>
                </div>
                <button type="button" onClick={() => quitarFila(i)} aria-label={`Quitar capacitación ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={agregarFila} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar capacitación
          </button>
          {avisoFilas && <div className="text-[11.5px] mt-2" style={{ color: avisoFilas.startsWith("Se agregaron") ? "#1D6B3A" : "#B3401F" }}>{avisoFilas}</div>}
        </Seccion>

        {/* 4. OBSERVACIONES */}
        <Seccion id="observaciones" titulo="4. Observaciones y seguimiento" abierta={abierta === "observaciones"} onToggle={alternar} contador={d.observaciones ? 1 : 0}>
          <AreaTexto label="Observaciones y seguimiento" filas={4} value={d.observaciones} onChange={(v) => set("observaciones", v)} />
        </Seccion>

        {/* 5. FIRMAS */}
        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Empiezan vacías · al escribir se sugieren los nombres guardados" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró — responsable SST</div>
            {bloqueResponsable()}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó — residente / director de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del que revisó" etqCargo="Cargo de quien revisó" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. Gerencia</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre (Vo.Bo.)" etqCargo="Cargo (Vo.Bo.)" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoPeriodo} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo periodo (conserva el programa y las pendientes)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la matriz" onGenerar={generarExcel} />
    </div>
  );
}
