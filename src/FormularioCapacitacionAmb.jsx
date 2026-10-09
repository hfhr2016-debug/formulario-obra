import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion, parsearPegado } from "./sstBase";
import {
  CODIGO_CAPACITACION_AMB, HOJA_CAPACITACION_AMB, CELDAS_CAPACITACION_AMB, TIPOS_CAPACITACION, TEMAS_AMBIENTALES,
  descubrirCapacitacionAmb, escribirCapacitacionAmbEnHoja, validarCapacitacionAmb, camposFaltantesCapacitacionAmb, resumenCapacitacionAmb, asistenteNuevo, asistentesConNombre, textoDuracionAmb, duracionMinutos,
} from "./capacitacionAmbDatos";
import {
  NAVY, GOLD, PAPER, LINE, CLAVE_ULTIMOS, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, useTrabajadores,
  useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, SelectorHora, claseInput, estiloInput,
} from "./sstComunes";
import { ChipsOpcion, GrillaOpciones } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_CAPACITACIONES, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_capacitacion_amb";
const MAX_ASISTENTES = (CELDAS_CAPACITACION_AMB.tablas && CELDAS_CAPACITACION_AMB.tablas.asistentes && CELDAS_CAPACITACION_AMB.tablas.asistentes.n) || 20;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), horaInicio: "", horaFin: "", lugar: "", tipo: "", temas: [], otros: {}, facilitador: "", facilitadorCargo: "", contenido: "",
    asistentes: [], observaciones: "", responsableNombre: "", responsableCargo: "Responsable ambiental", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.horaInicio || d.horaFin || d.lugar || d.tipo || d.temas.length || d.facilitador || d.contenido || d.asistentes.length || d.observaciones || d.responsableNombre || d.revisoNombre);

export default function FormularioCapacitacionAmb({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoAsistentes, setAvisoAsistentes] = useState("");
  const [pegarAbierto, setPegarAbierto] = useState(false);
  const [textoPegado, setTextoPegado] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const alternarTema = (base) => setD((cur) => ({ ...cur, temas: cur.temas.includes(base) ? cur.temas.filter((t) => t !== base) : [...cur.temas, base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));

  // ---- Asistentes ----
  const asistentes = d.asistentes;
  const setAsistentes = (nuevos) => setD((cur) => ({ ...cur, asistentes: nuevos }));
  const actualizarAsistente = (i, campo, valor) => setAsistentes(asistentes.map((a, k) => (k === i ? { ...a, [campo]: valor } : a)));
  function agregarAsistente() {
    if (asistentes.length >= MAX_ASISTENTES) { setAvisoAsistentes(`Esta hoja tiene espacio para ${MAX_ASISTENTES} asistentes. Para más personas, genera otra hoja con el resto.`); return; }
    setAvisoAsistentes(""); setAsistentes([...asistentes, asistenteNuevo({ empresa: (asistentes[asistentes.length - 1] || {}).empresa || d.contratista })]);
  }
  const quitarAsistente = (i) => { setAsistentes(asistentes.filter((_, k) => k !== i)); setAvisoAsistentes(""); };
  function agregarVarios(lista) {
    const libres = MAX_ASISTENTES - asistentes.length;
    setAsistentes([...asistentes, ...lista.slice(0, Math.max(0, libres)).map((a) => asistenteNuevo(a))]);
    setAvisoAsistentes(lista.length > libres ? `Se agregaron ${Math.max(0, libres)} de ${lista.length}: esta hoja tiene espacio para ${MAX_ASISTENTES} asistentes.` : "");
  }
  function aplicarPegado() {
    const lista = parsearPegado(textoPegado);
    if (!lista.length) { setAvisoAsistentes("No encontré nombres en el texto pegado."); return; }
    agregarVarios(lista); setTextoPegado(""); setPegarAbierto(false);
  }
  const ultimos = leerJSON(CLAVE_ULTIMOS, []);
  function cargarUltimos() {
    if (asistentes.length && !window.confirm("Ya hay asistentes escritos. ¿Reemplazarlos por los de la última actividad?")) return;
    setAsistentes(ultimos.slice(0, MAX_ASISTENTES).map((a) => asistenteNuevo(a))); setAvisoAsistentes("");
  }
  function elegirTrabajador(i, o) {
    const t = trabajadores.buscar(o.texto);
    setAsistentes(asistentes.map((a, k) => (k === i ? { ...a, nombre: t ? t.nombre : o.texto, documento: a.documento || (t && t.documento) || "", cargo: a.cargo || (t && t.cargo) || "", empresa: a.empresa || (t && t.empresa) || "" } : a)));
  }
  const nAsist = asistentesConNombre(d).length;
  const duracion = textoDuracionAmb(d.horaInicio, d.horaFin);
  const horaMala = d.horaInicio && d.horaFin && duracionMinutos(d.horaInicio, d.horaFin) < 0;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarCapacitacionAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesCapacitacionAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-capacitacion-ambiental.xlsx", HOJA_CAPACITACION_AMB);
      const avs = [];
      const decision = decidirDistribucion(descubrirCapacitacionAmb(ws), CELDAS_CAPACITACION_AMB);
      if (decision.aviso) avs.push(decision.aviso);
      const capacidad = (decision.celdas.tablas && decision.celdas.tablas.asistentes && decision.celdas.tablas.asistentes.n) || MAX_ASISTENTES;
      if (nAsist > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} asistentes y hay ${nAsist}`);
      const noMarcadas = escribirCapacitacionAmbEnHoja(ws, d, decision.celdas);
      if (noMarcadas.length) avs.push("La plantilla no tiene las casillas: " + noMarcadas.join(", ") + ".");
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Capacitacion_Ambiental_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      const conNombre = asistentesConNombre(d);
      guardarJSON(CLAVE_ULTIMOS, conNombre); trabajadores.recordar(conNombre);
      memoria.recordarUso({ personas: [[d.facilitador, d.facilitadorCargo], [d.responsableNombre, d.responsableCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenCapacitacionAmb(d);
      guardarJSON(CLAVE_AMB_CAPACITACIONES, [res, ...leerJSON(CLAVE_AMB_CAPACITACIONES, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${d.tipo.toLowerCase()}: ${nAsist} ${nAsist === 1 ? "asistente" : "asistentes"}${duracion ? `, ${duracion}` : ""}). Imprímelo para las firmas de los asistentes.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaActividad() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, lugar: cur.lugar, facilitador: cur.facilitador, facilitadorCargo: cur.facilitadorCargo, responsableNombre: cur.responsableNombre, responsableCargo: cur.responsableCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoAsistentes(""); setAbierta("temas"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una actividad en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoAsistentes(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una capacitación ambiental" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Capacitación e Inducción Ambiental" subtitulo={`${CODIGO_CAPACITACION_AMB} · Inducción, capacitación y charlas ambientales`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos de la actividad" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha, horas y lugar"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <div className="grid grid-cols-2 gap-2">
              <SelectorHora label="Hora de inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora de fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            {duracion && <div className="text-[12px] font-semibold" style={{ color: NAVY }}>Duración: {duracion}</div>}
            {horaMala && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>La hora de fin es anterior a la de inicio.</div>}
            <Campo label="Lugar" value={d.lugar} placeholder="Ej. Campamento, sala de reuniones, frente norte" onChange={(v) => set("lugar", v)} />
          </div>
        </Seccion>

        <Seccion id="temas" titulo="2. Tipo de actividad y temas" subtitulo={d.tipo ? `${d.tipo} · ${d.temas.length} ${d.temas.length === 1 ? "tema" : "temas"}` : "Qué se dictó y quién lo dictó"} abierta={abierta === "temas"} onToggle={alternar} contador={d.temas.length}>
          <div className="space-y-2.5">
            <ChipsOpcion label="Tipo de actividad" nombre="Tipo de actividad" value={d.tipo} opciones={TIPOS_CAPACITACION} onChange={(v) => set("tipo", v)} />
            <div>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8F99" }}>Temas tratados</span>
              <GrillaOpciones nombre="Temas tratados" opciones={TEMAS_AMBIENTALES} marcadas={d.temas} onAlternar={alternarTema} otros={d.otros} onOtro={cambiarOtro} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del facilitador" etqCargo="Cargo o entidad del facilitador" nombre={d.facilitador} cargo={d.facilitadorCargo} onChange={cambiarPersona("facilitador", "facilitadorCargo")} />
            <AreaTexto label="Contenido o resumen" value={d.contenido} onChange={(v) => set("contenido", v)} placeholder="Ej. Separación en la fuente, código de colores, puntos ecológicos de la obra" />
          </div>
        </Seccion>

        <Seccion id="asistentes" titulo="3. Asistentes" subtitulo={`${nAsist} de ${MAX_ASISTENTES} · la firma se hace en papel al imprimir`} abierta={abierta === "asistentes"} onToggle={alternar} contador={nAsist}>
          <div className="space-y-2 mb-3">
            {ultimos.length > 0 && <button type="button" onClick={cargarUltimos} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>👥 Cargar los {ultimos.length} asistentes de la última actividad</button>}
            <button type="button" onClick={() => setPegarAbierto((a) => !a)} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>📋 Pegar una lista de nombres</button>
            {pegarAbierto && (
              <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11px] mb-1.5" style={{ color: NAVY }}>Una persona por línea. Si copias desde Excel con las columnas <b>Nombre, Documento, Cargo, Empresa</b>, se separan solas.</div>
                <textarea rows={5} value={textoPegado} onChange={(e) => setTextoPegado(e.target.value)} className={claseInput + " resize-none"} style={estiloInput} placeholder={"Juan Pérez\nMaría Gómez"} />
                <button type="button" onClick={aplicarPegado} className="w-full mt-2 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: GOLD }}>Agregar a la lista</button>
              </div>
            )}
          </div>
          {asistentes.map((a, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <BuscadorLista label="Nombre completo" value={a.nombre} onChange={(v) => actualizarAsistente(i, "nombre", v)} onElegir={(o) => elegirTrabajador(i, o)} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe o elige de las personas ya registradas" />
                <Campo label="Documento" value={a.documento} inputMode="numeric" onChange={(v) => actualizarAsistente(i, "documento", v)} />
                <BuscadorLista label="Cargo / oficio" value={a.cargo} onChange={(v) => actualizarAsistente(i, "cargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Elige un cargo de la obra o escribe otro" onBlurValor={(v) => memoria.recordarCargoObra(v)} />
                <Campo label="Empresa" value={a.empresa} onChange={(v) => actualizarAsistente(i, "empresa", v)} />
              </div>
              <button type="button" onClick={() => quitarAsistente(i)} aria-label={`Quitar asistente ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={agregarAsistente} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar asistente</button>
          {avisoAsistentes && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoAsistentes}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>En la hoja, «Cargo o empresa» lleva el cargo y la empresa juntos.</div>
        </Seccion>

        <Seccion id="firmas" titulo="4. Observaciones y firmas" subtitulo="Firman el facilitador, el responsable ambiental y el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones y evaluación" value={d.observaciones} onChange={(v) => set("observaciones", v)} placeholder="Ej. Se hizo una pregunta final a cada grupo; todos respondieron bien" />
            <div className="text-[11px]" style={{ color: NAVY }}>Firma el facilitador ({d.facilitador || "sin nombre"}); su nombre viene de la sección 2.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Responsable ambiental</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable ambiental" etqCargo="Cargo del responsable ambiental" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Vo.Bo. (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el Vo.Bo." etqCargo="Cargo de quien da el Vo.Bo." nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaActividad} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva actividad (conserva obra, lugar y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la actividad" onGenerar={generarExcel} />
    </div>
  );
}
