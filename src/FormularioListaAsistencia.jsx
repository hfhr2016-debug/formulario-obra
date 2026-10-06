import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, textoDuracion, parsearPegado, unirUnicos, recordarTexto } from "./sstBase";
import {
  CODIGO_LISTA, CELDAS_LISTA, TIPOS_ACTIVIDAD, MODALIDADES, SI_NO, META_APROBACION_POR_DEFECTO, TEMAS_LISTA,
  descubrirLista, escribirListaEnHoja, validarLista, resumenEvento,
} from "./listaAsistenciaDatos";
import {
  NAVY, GOLD, PAPER, LINE, CLAVE_ULTIMOS, CLAVE_EVENTOS, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR,
  leerJSON, guardarJSON, borrar, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, useTrabajadores,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar,
  Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora, claseInput, estiloInput,
} from "./sstComunes";
import { proyectoSST, guardarProyectoSST, useListaRecordada } from "./sstComunes";
import { ENTIDADES_QUE_DICTAN } from "./sstListas";

const CLAVE_BORRADOR = "ryr_borrador_lista_asistencia";
const CLAVE_TEMAS = "ryr_sst_temas_lista";                      // temas que el usuario ha escrito antes
const MAX_ASISTENTES = (CELDAS_LISTA.tablas && CELDAS_LISTA.tablas.asistentes.n) || 25;

function datosIniciales() {
  return {
    proyecto: proyectoSST(), contratista: "", ubicacion: "",
    tipo: "", modalidad: "", tema: "", fecha: "", horaInicio: "", horaFin: "", hoja: "", lugar: "", entidad: "",
    facilitadorNombre: "", facilitadorCargo: "",
    contenido: "",
    asistentes: [], convocados: "",
    seEvaluo: "", evaluados: "", aprobaron: "", meta: String(META_APROBACION_POR_DEFECTO), observaciones: "",
    responsableNombre: "", responsableCargo: "",
  };
}

// ¿La lista ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.tipo || d.tema || d.horaInicio || d.horaFin || d.lugar || d.entidad || d.contenido || d.asistentes.length || d.seEvaluo || d.observaciones || d.convocados);
}

export default function FormularioListaAsistencia({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("general");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState(false);
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
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
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();      // los asistentes quedan como sugerencia en Inducción y Entrega de EPP

  // Cambio parcial { nombre?, cargo? } de una persona -> campos del formulario
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const bloqueFacilitador = () => (
    <BloqueProfesional memoria={memoria} etqNombre="Facilitador (nombre)" etqCargo="Cargo del facilitador"
      nombre={d.facilitadorNombre} cargo={d.facilitadorCargo} onChange={cambiarPersona("facilitadorNombre", "facilitadorCargo")} />
  );

  // Temas: los frecuentes + los que el usuario ya escribió
  const entidades = useListaRecordada("ryr_sst_entidades_dictan", ENTIDADES_QUE_DICTAN);   // ARL, SENA, Bomberos… + las que se escriban
  const [temasExtra, setTemasExtra] = useState(() => leerJSON(CLAVE_TEMAS, []));
  const opcionesTemas = useMemo(() => unirUnicos(temasExtra, TEMAS_LISTA, false).map((t) => ({ texto: t, detalle: "" })), [temasExtra]);

  // ---- Borrador ----
  useEffect(() => {
    if (!borradorAplicado) return;
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
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Asistentes ----
  const asistentes = d.asistentes;
  const setAsistentes = (nuevos) => setD((cur) => ({ ...cur, asistentes: nuevos }));
  function agregarAsistente() {
    if (asistentes.length >= MAX_ASISTENTES) { setAvisoAsistentes(`Esta hoja tiene espacio para ${MAX_ASISTENTES} asistentes. Para más personas, genera una segunda hoja (Hoja N° 2) con el resto.`); return; }
    setAvisoAsistentes("");
    setAsistentes([...asistentes, { nombre: "", documento: "", cargo: "", empresa: "" }]);
  }
  const actualizarAsistente = (i, campo, valor) => setAsistentes(asistentes.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)));
  function quitarAsistente(i) { setAsistentes(asistentes.filter((_, idx) => idx !== i)); setAvisoAsistentes(""); }
  function agregarVarios(lista) {
    const libres = MAX_ASISTENTES - asistentes.length;
    const nuevos = lista.slice(0, Math.max(0, libres)).map((a) => ({ ...a, empresa: a.empresa || "" }));
    setAsistentes([...asistentes, ...nuevos]);
    setAvisoAsistentes(lista.length > libres ? `Se agregaron ${nuevos.length} de ${lista.length}: esta hoja tiene espacio para ${MAX_ASISTENTES} asistentes.` : "");
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
    if (asistentes.length && !window.confirm("Ya hay asistentes escritos. ¿Reemplazarlos por los de la última actividad?")) return;
    setAsistentes(ultimos.slice(0, MAX_ASISTENTES).map((a) => ({ ...a })));
    setAvisoAsistentes("");
  }
  const nAsistentes = asistentes.filter((a) => a.nombre && a.nombre.trim()).length;
  const nConvocados = Number(d.convocados);
  const pctAsistencia = nConvocados > 0 ? Math.round((nAsistentes / nConvocados) * 100) : null;

  // ---- Evaluación ----
  const nEvaluados = Number(d.evaluados);
  const pctAprobacion = d.seEvaluo === "Sí" && nEvaluados > 0 ? Math.round((Number(d.aprobaron) / nEvaluados) * 100) : null;
  const meta = d.meta === "" ? META_APROBACION_POR_DEFECTO : Number(d.meta);
  const resultado = pctAprobacion === null ? "" : pctAprobacion >= meta ? "Eficaz" : "Requiere refuerzo";

  // ---- Generar Excel ----
  async function generarExcel() {
    setMensajeError("");
    setAvisoGeneracion("");
    const faltan = validarLista(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-lista-asistencia.xlsx", "Lista de Asistencia");
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_LISTA;
      const avisos = [];
      try {
        const lectura = descubrirLista(ws);
        if (lectura.celdas) celdas = lectura.celdas;
        else {
          console.warn("No pude leer la distribución de la plantilla; uso la de por defecto:", lectura.problemas);
          avisos.push("No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame.");
        }
      } catch (e) {
        console.warn("Error al leer la plantilla; uso la distribución por defecto:", e);
      }
      const capacidad = (celdas.tablas && celdas.tablas.asistentes.n) || MAX_ASISTENTES;
      if (nAsistentes > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} asistentes y hay ${nAsistentes}`);

      // Solo viajan los asistentes con nombre
      escribirListaEnHoja(ws, { ...d, asistentes: asistentes.filter((x) => x.nombre && x.nombre.trim()) }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Lista_Asistencia_${d.fecha || "sin-fecha"}_${textoParaArchivo(d.tema)}.xlsx`);

      // Memoria para la próxima vez
      const conNombre = asistentes.filter((x) => x.nombre && x.nombre.trim());
      guardarJSON(CLAVE_ULTIMOS, conNombre);
      trabajadores.recordar(conNombre);
      guardarProyectoSST(d.proyecto);
      entidades.recordar(d.entidad);
      memoria.recordarUso({
        personas: [[d.facilitadorNombre, d.facilitadorCargo], [d.responsableNombre, d.responsableCargo]],
        cargosObra: conNombre.map((a) => a.cargo), empresasUsadas: conNombre.map((a) => a.empresa),
      });
      const nuevosTemas = recordarTexto(temasExtra, d.tema, { base: TEMAS_LISTA, min: 4, max: 60 });
      if (nuevosTemas !== temasExtra) { setTemasExtra(nuevosTemas); guardarJSON(CLAVE_TEMAS, nuevosTemas); }
      const ev = resumenEvento(d, conNombre.length);
      guardarJSON(CLAVE_EVENTOS, [ev, ...leerJSON(CLAVE_EVENTOS, []).filter((e) => e.id !== ev.id)].slice(0, 300));
      borrar(CLAVE_BORRADOR);
      omitirGuardadoRef.current = true;
      setGenerado(true);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  function nuevaLista() {
    if (!window.confirm("¿Empezar una lista nueva? Se limpian los datos de esta.")) return;
    borrar(CLAVE_BORRADOR);
    setD({ ...datosIniciales(), proyecto: "" });
    setGenerado(false);
    setMensajeError("");
    setAvisoGeneracion("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  // ---------------- Pantalla de borrador ----------------
  if (borradorDisponible) {
    return <PantallaBorrador cual="una lista de asistencia" onContinuar={restaurarBorrador} onEmpezar={descartarBorrador} onVolver={onVolver} />;
  }

  // ---------------- Formulario ----------------
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="LISTA DE ASISTENCIA" subtitulo={`${CODIGO_LISTA} · Capacitaciones, inducciones y reuniones`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS DE LA ACTIVIDAD */}
        <Seccion id="general" titulo="1. Datos de la actividad" subtitulo="Qué se hizo, cuándo, dónde y quién la dictó" abierta={abierta === "general"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Lista label="Tipo de actividad" value={d.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_ACTIVIDAD} />
            <Lista label="Modalidad" value={d.modalidad} onChange={(v) => set("modalidad", v)} opciones={MODALIDADES} />
            <BuscadorLista label="Tema / asunto" value={d.tema} opciones={opcionesTemas} opcionesAlAbrir={opcionesTemas} maxResultados={10} placeholder="Elige uno de la lista o escribe el tuyo" onChange={(v) => set("tema", v)} />
            <div>
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              {!d.fecha && (
                <button type="button" onClick={() => set("fecha", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
              )}
            </div>
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            {textoDuracion(d.horaInicio, d.horaFin) && (
              <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>⏱ Duración: {textoDuracion(d.horaInicio, d.horaFin)}</div>
            )}
            <Campo label="Hoja N°" value={d.hoja} placeholder="Ej. 1 de 1 (si son varias hojas: 1 de 2)" onChange={(v) => set("hoja", v)} />
            <Campo label="Lugar / sitio" value={d.lugar} onChange={(v) => set("lugar", v)} placeholder="Ej. Sala de reuniones, Torre A" />
            <BuscadorLista label="Entidad que dicta (si es externa)" value={d.entidad} opciones={entidades.opciones} opcionesAlAbrir={entidades.opciones} maxResultados={10} placeholder="Elige una entidad de la lista o escribe otra" onChange={(v) => set("entidad", v)} />
            {bloqueFacilitador()}
          </div>
        </Seccion>

        {/* 2. TEMAS */}
        <Seccion id="temas" titulo="2. Temas tratados" subtitulo="Objetivo y puntos que se explicaron" abierta={abierta === "temas"} onToggle={alternar} contador={d.contenido ? 1 : 0}>
          <AreaTexto label="Objetivo y temas tratados" filas={5} value={d.contenido} onChange={(v) => set("contenido", v)} placeholder="Para qué se hizo y qué se explicó al personal" />
        </Seccion>

        {/* 3. ASISTENTES */}
        <Seccion id="asistentes" titulo="3. Registro de asistentes" subtitulo={`${nAsistentes} de ${MAX_ASISTENTES} · la firma se hace en papel al imprimir`} abierta={abierta === "asistentes"} onToggle={alternar} contador={nAsistentes}>
          <div className="space-y-2 mb-3">
            {ultimos.length > 0 && (
              <button type="button" onClick={cargarUltimos} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
                👥 Cargar los {ultimos.length} asistentes de la última actividad
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
                <BuscadorLista label="Cargo / oficio" value={a.cargo} onChange={(v) => actualizarAsistente(i, "cargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Elige un cargo de la obra o escribe otro" onBlurValor={(v) => memoria.recordarCargoObra(v)} />
                <BuscadorLista label="Empresa" value={a.empresa} onChange={(v) => actualizarAsistente(i, "empresa", v)} opciones={memoria.opcionesEmpresas} opcionesAlAbrir={memoria.opcionesEmpresas} placeholder="Escribe la empresa" onBlurValor={(v) => memoria.recordarEmpresa(v)} />
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
            <Campo label="Personas convocadas (opcional)" value={d.convocados} inputMode="numeric" onChange={(v) => set("convocados", v.replace(/[^0-9]/g, ""))} placeholder="Para calcular el % de asistencia" />
            {pctAsistencia !== null && (
              <div className="text-[12px] font-semibold mt-1.5" style={{ color: NAVY }}>Asistencia: {pctAsistencia}% ({nAsistentes} de {nConvocados})</div>
            )}
          </div>
        </Seccion>

        {/* 4. EVALUACIÓN */}
        <Seccion id="evaluacion" titulo="4. Evaluación de la actividad" subtitulo="Si aplica: cuántos aprobaron" abierta={abierta === "evaluacion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <Lista label="¿Se evaluó?" value={d.seEvaluo} onChange={(v) => set("seEvaluo", v)} opciones={SI_NO} />
            {d.seEvaluo === "Sí" && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <Campo label="Evaluadas" value={d.evaluados} inputMode="numeric" onChange={(v) => set("evaluados", v.replace(/[^0-9]/g, ""))} />
                  <Campo label="Aprobaron" value={d.aprobaron} inputMode="numeric" onChange={(v) => set("aprobaron", v.replace(/[^0-9]/g, ""))} />
                  <Campo label="Meta %" value={d.meta} inputMode="numeric" onChange={(v) => set("meta", v.replace(/[^0-9]/g, ""))} />
                </div>
                {pctAprobacion !== null && (
                  <div className="text-[12px] font-semibold" style={{ color: resultado === "Eficaz" ? "#1D6B3A" : "#B3401F" }}>
                    Aprobación: {pctAprobacion}% · {resultado}
                  </div>
                )}
              </>
            )}
            <AreaTexto label="Observaciones y compromisos" filas={3} value={d.observaciones} onChange={(v) => set("observaciones", v)} />
          </div>
        </Seccion>

        {/* 5. FIRMAS */}
        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Empiezan vacías · al escribir se sugieren los nombres guardados" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Facilitador (quien dicta la actividad)</div>
            {bloqueFacilitador()}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable SST / Residente de obra (Vo.Bo.)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre" etqCargo="Cargo" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
          </div>
          {memoria.profesionales.length > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: LINE }}>
              <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Nombres guardados ({memoria.profesionales.length})</div>
              <div className="text-[10.5px] mb-2" style={{ color: "#8A8F99" }}>Aparecen como sugerencia al escribir un nombre. Si guardaste uno mal escrito, bórralo aquí.</div>
              {memoria.profesionales.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: LINE }}>
                  <div className="text-[12px]" style={{ color: NAVY }}>{p.nombre} <span style={{ color: "#8A8F99" }}>· {p.cargo || "sin cargo"}</span></div>
                  <button type="button" aria-label={`Borrar ${p.nombre}`} onClick={() => memoria.quitar(p.nombre)} style={{ color: "#B3401F" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        <div className="pt-5">
          <button type="button" onClick={nuevaLista} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar una lista nueva
          </button>
        </div>
      </div>

      <BarraGenerar
        mensajeError={mensajeError}
        aviso={avisoGeneracion}
        mensajeOk={generado ? `✓ Excel descargado (${nAsistentes} asistentes). Imprímelo para las firmas, o toca "Empezar una lista nueva" (al final de la pantalla).` : ""}
        generando={generando}
        textoBoton="Generar Excel de la lista"
        onGenerar={generarExcel}
      />
    </div>
  );
}
