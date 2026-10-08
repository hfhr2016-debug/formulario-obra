import { useState } from "react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_INSPECCION_AMB, HOJA_INSPECCION_AMB, CELDAS_INSPECCION_AMB, TIPOS_INSPECCION, CLIMAS_INSP, PUNTOS_INSPECCION, ITEMS_INSPECCION_AMB,
  descubrirInspeccionAmb, escribirInspeccionAmbEnHoja, validarInspeccionAmb, camposFaltantesInspeccionAmb, resumenInspeccionAmb,
} from "./inspeccionAmbientalDatos";
import { contarRespuestas, hallazgosConDatos, RESPUESTAS_AMB } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { FilaVerificacion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_INSPECCIONES, TraerDeFichaAmb, HallazgosAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_inspeccion_amb";
const CLAVE_CONSECUTIVO = "ryr_amb_inspeccion_consecutivo";
const MAX_HALLAZGOS = (CELDAS_INSPECCION_AMB.tablas && CELDAS_INSPECCION_AMB.tablas.hallazgos && CELDAS_INSPECCION_AMB.tablas.hallazgos.n) || 6;
const N = ITEMS_INSPECCION_AMB.length;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), hora: "", nInspeccion: "", inspector: "", inspectorCargo: "Responsable ambiental", frente: "", tipo: "", clima: "", acompano: "",
    respuestas: Array(N).fill(""), observaciones: Array(N).fill(""), hallazgos: [], obsGenerales: "", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.hora || d.nInspeccion || d.inspector || d.frente || d.tipo || d.clima || d.acompano || d.respuestas.some(Boolean) || d.hallazgos.length || d.obsGenerales || d.revisoNombre);

export default function FormularioInspeccionAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoHallazgos, setAvisoHallazgos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const c = contarRespuestas(ITEMS_INSPECCION_AMB, d.respuestas);
  const nHall = hallazgosConDatos(d.hallazgos).length;
  const pct = c.si + c.no ? Math.round((c.si / (c.si + c.no)) * 100) : null;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarInspeccionAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesInspeccionAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-inspeccion-ambiental.xlsx", HOJA_INSPECCION_AMB);
      const avs = [];
      const decision = decidirDistribucion(descubrirInspeccionAmb(ws), CELDAS_INSPECCION_AMB);
      if (decision.aviso) avs.push(decision.aviso);
      const T = decision.celdas.tablas || {};
      if (nHall > ((T.hallazgos && T.hallazgos.n) || MAX_HALLAZGOS)) throw new Error("hay más hallazgos de los que caben en la plantilla");
      const numero = d.nInspeccion && String(d.nInspeccion).trim() ? String(d.nInspeccion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, nInspeccion: numero };
      escribirInspeccionAmbEnHoja(ws, dd, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Inspeccion_Ambiental_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.inspector, d.inspectorCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenInspeccionAmb(dd);
      guardarJSON(CLAVE_AMB_INSPECCIONES, [res, ...leerJSON(CLAVE_AMB_INSPECCIONES, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (inspección N° ${numero}: ${c.si} cumplen, ${c.no} no cumplen, ${nHall} ${nHall === 1 ? "hallazgo" : "hallazgos"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaInspeccion() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, inspector: cur.inspector, inspectorCargo: cur.inspectorCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHallazgos(""); setAbierta("lista"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una inspección en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una inspección ambiental" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INSPECCIÓN AMBIENTAL" subtitulo={`${CODIGO_INSPECCION_AMB} · Verificación del manejo ambiental de la obra`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos de la inspección" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha, inspector y frente"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <SelectorHora label="Hora" value={d.hora} onChange={(v) => set("hora", v)} />
            </div>
            <Campo label="Inspección N°" value={d.nInspeccion} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInspeccion", v.replace(/[^0-9]/g, ""))} />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del inspector" etqCargo="Cargo del inspector" nombre={d.inspector} cargo={d.inspectorCargo} onChange={cambiarPersona("inspector", "inspectorCargo")} />
            <Campo label="Frente o zona" value={d.frente} placeholder="Ej. Torre 2, excavación, patio de maquinaria" onChange={(v) => set("frente", v)} />
            <Lista label="Tipo de inspección" value={d.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_INSPECCION} />
            <Lista label="Condición del clima" value={d.clima} onChange={(v) => set("clima", v)} opciones={CLIMAS_INSP} />
            <Campo label="Acompañó" value={d.acompano} placeholder="Persona de la obra que acompañó el recorrido" onChange={(v) => set("acompano", v)} />
          </div>
        </Seccion>

        <Seccion id="lista" titulo="2. Verificación por aspecto ambiental" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}${pct !== null ? ` · ${pct}% cumple` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          {PUNTOS_INSPECCION.map(([aspecto, t], i) => (
            <div key={i}>
              {(i === 0 || PUNTOS_INSPECCION[i - 1][0] !== aspecto) && <div className="text-[10.5px] font-bold uppercase tracking-wide mt-3 mb-1" style={{ color: GOLD }}>{aspecto}</div>}
              <FilaVerificacion numero={i + 1} texto={t} valor={d.respuestas[i] || ""} onChange={(v) => ponerEn("respuestas")(i, v)} opciones={RESPUESTAS_AMB}
                observacion={d.observaciones[i] || ""} onObservacion={(v) => ponerEn("observaciones")(i, v)} />
            </div>
          ))}
        </Seccion>

        <Seccion id="hallazgos" titulo="3. Hallazgos y acciones" subtitulo={`${nHall} de ${MAX_HALLAZGOS} hallazgos`} abierta={abierta === "hallazgos"} onToggle={alternar} contador={nHall}>
          <HallazgosAmb hallazgos={d.hallazgos} onChange={(h) => set("hallazgos", h)} max={MAX_HALLAZGOS} items={ITEMS_INSPECCION_AMB} respuestas={d.respuestas} observaciones={d.observaciones} aviso={avisoHallazgos} onAviso={setAvisoHallazgos} />
        </Seccion>

        <Seccion id="firmas" titulo="4. Observaciones y firmas" subtitulo="Inspecciona el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones generales" value={d.obsGenerales} onChange={(v) => set("obsGenerales", v)} placeholder="Ej. Se recomienda reforzar la separación de residuos en el frente 2" />
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien inspecciona ({d.inspector || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaInspeccion} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva inspección (conserva obra e inspector)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la inspección" onGenerar={generarExcel} />
    </div>
  );
}
