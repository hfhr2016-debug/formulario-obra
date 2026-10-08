import { useState } from "react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_PQRS, HOJA_PQRS, CELDAS_PQRS, CANALES, TIPOS_PQRS, TEMAS_PQRS, CONFORME, ESTADOS_PQRS, DIAS_HABILES_RESPUESTA,
  descubrirPqrs, escribirPqrsEnHoja, validarPqrs, camposFaltantesPqrs, resumenPqrs, fechaLimitePqrs, estadoPlazo,
} from "./pqrsDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { ChipsOpcion, GrillaOpciones } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_PQRS, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_pqrs";
const CLAVE_CONSECUTIVO = "ryr_amb_pqrs_consecutivo";
const dmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), hora: "", nPqrs: "", recibio: "", recibioCargo: "", canal: "", tipo: "",
    nombre: "", anonima: false, documento: "", direccion: "", telefono: "", correo: "", desea: "", temas: [], otros: {}, descripcion: "",
    accion: "", responsable: "", fechaRespuesta: "", medio: "", compromiso: "", conforme: "", fechaCierre: "", estado: "Abierta",
    responsableNombre: "", responsableCargo: "Responsable ambiental",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.hora || d.nPqrs || d.recibio || d.canal || d.tipo || d.nombre || d.anonima || d.documento || d.direccion || d.telefono || d.correo || d.desea || d.temas.length ||
  d.descripcion || d.accion || d.responsable || d.fechaRespuesta || d.medio || d.compromiso || d.conforme || d.fechaCierre || d.responsableNombre);

export default function FormularioPqrs({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const alternarTema = (base) => setD((cur) => ({ ...cur, temas: cur.temas.includes(base) ? cur.temas.filter((t) => t !== base) : [...cur.temas, base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));

  const hoy = fechaHoyISO();
  const limite = fechaLimitePqrs(d);
  const plazo = estadoPlazo(d, hoy);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPqrs(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesPqrs(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-pqrs-comunidad.xlsx", HOJA_PQRS);
      const avs = [];
      const decision = decidirDistribucion(descubrirPqrs(ws), CELDAS_PQRS);
      if (decision.aviso) avs.push(decision.aviso);
      const numero = d.nPqrs && String(d.nPqrs).trim() ? String(d.nPqrs).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, nPqrs: numero };
      const noMarcadas = escribirPqrsEnHoja(ws, dd, decision.celdas);
      if (noMarcadas.length) avs.push("La plantilla no tiene las casillas: " + noMarcadas.join(", ") + ".");
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `PQRS_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}_N${numero}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.recibio, d.recibioCargo], [d.responsableNombre, d.responsableCargo]], empresasUsadas: [d.contratista] });
      const res = resumenPqrs(dd, hoy);
      guardarJSON(CLAVE_AMB_PQRS, [res, ...leerJSON(CLAVE_AMB_PQRS, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (PQRS N° ${numero}: ${d.tipo.toLowerCase()}, responder antes del ${dmy(limite)}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaSolicitud() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, recibio: cur.recibio, recibioCargo: cur.recibioCargo, responsableNombre: cur.responsableNombre, responsableCargo: cur.responsableCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una solicitud en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una PQRS" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="QUEJAS Y PQRS" subtitulo={`${CODIGO_PQRS} · Peticiones, quejas, reclamos y sugerencias de la comunidad`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos de la solicitud" subtitulo={d.proyecto ? `${d.proyecto} · ${dmy(d.fecha)}` : "Obra, fecha, canal y tipo"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="PQRS N°" value={d.nPqrs} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nPqrs", v.replace(/[^0-9]/g, ""))} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha de recepción" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <SelectorHora label="Hora" value={d.hora} onChange={(v) => set("hora", v)} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien recibió" etqCargo="Cargo de quien recibió" nombre={d.recibio} cargo={d.recibioCargo} onChange={cambiarPersona("recibio", "recibioCargo")} />
            <Lista label="Canal" value={d.canal} onChange={(v) => set("canal", v)} opciones={CANALES} />
            <Lista label="Tipo" value={d.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_PQRS} />
            {limite && (
              <div className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md" style={{ background: plazo.vencida ? "#FBE9E4" : "#F2F6FB", border: `1px solid ${plazo.vencida ? "#E8B4A6" : LINE}`, color: plazo.vencida ? "#B3401F" : NAVY }}>
                Responder antes del {dmy(limite)} <span className="font-normal">({DIAS_HABILES_RESPUESTA} días hábiles, sin festivos){plazo.vencida ? " · ¡plazo vencido!" : ""}</span>
              </div>
            )}
          </div>
        </Seccion>

        <Seccion id="ciudadano" titulo="2. Quien presenta la solicitud" subtitulo={d.anonima ? "Anónima" : d.nombre || "Nombre y datos de contacto"} abierta={abierta === "ciudadano"} onToggle={alternar}>
          <div className="space-y-2.5">
            <button type="button" aria-pressed={d.anonima} onClick={() => set("anonima", !d.anonima)} className="w-full text-left text-[13px] px-2.5 py-2 rounded-md border" style={d.anonima ? { background: "#FFF6DC", borderColor: GOLD, color: NAVY, fontWeight: 600 } : { background: "white", borderColor: LINE, color: NAVY }}>
              {d.anonima ? "☑" : "☐"} Solicitud anónima (no dejó sus datos)
            </button>
            <Campo label="Nombre de quien presenta" value={d.nombre} onChange={(v) => set("nombre", v)} />
            <Campo label="Documento" value={d.documento} inputMode="numeric" onChange={(v) => set("documento", v)} />
            <Campo label="Dirección o predio" value={d.direccion} placeholder="Ej. Casa 14, vecina de la obra" onChange={(v) => set("direccion", v)} />
            <Campo label="Teléfono" value={d.telefono} inputMode="tel" onChange={(v) => set("telefono", v)} />
            <Campo label="Correo electrónico" value={d.correo} type="email" onChange={(v) => set("correo", v)} />
            <ChipsOpcion label="¿Desea respuesta?" nombre="Desea respuesta" sinMarca value={d.desea} opciones={["Sí", "No"]} onChange={(v) => set("desea", v)} />
          </div>
        </Seccion>

        <Seccion id="descripcion" titulo="3. Descripción" subtitulo={d.temas.length ? `${d.temas.length} ${d.temas.length === 1 ? "tema" : "temas"}` : "Tema y detalle de la solicitud"} abierta={abierta === "descripcion"} onToggle={alternar} contador={d.temas.length}>
          <div className="space-y-2.5">
            <div>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8F99" }}>Tema de la solicitud</span>
              <GrillaOpciones nombre="Tema de la solicitud" opciones={TEMAS_PQRS} marcadas={d.temas} onAlternar={alternarTema} otros={d.otros} onOtro={cambiarOtro} />
            </div>
            <AreaTexto label="Descripción de la solicitud" value={d.descripcion} filas={4} onChange={(v) => set("descripcion", v)} placeholder="Lo que dijo la persona, con sus palabras" />
          </div>
        </Seccion>

        <Seccion id="gestion" titulo="4. Gestión y respuesta" subtitulo={d.accion ? d.accion.slice(0, 40) : "Qué se hizo y cómo se respondió"} abierta={abierta === "gestion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Acción tomada" value={d.accion} onChange={(v) => set("accion", v)} placeholder="Ej. Se humedecieron las vías y se cambió el horario de las volquetas" />
            <Campo label="Responsable de la respuesta" value={d.responsable} onChange={(v) => set("responsable", v)} />
            <Campo label="Fecha de respuesta" type="date" value={d.fechaRespuesta} onChange={(v) => set("fechaRespuesta", v)} />
            {plazo.tarde && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>La respuesta salió después del plazo ({dmy(limite)}).</div>}
            <Lista label="Medio de respuesta" value={d.medio} onChange={(v) => set("medio", v)} opciones={CANALES} />
            <Campo label="Compromiso con la comunidad" value={d.compromiso} onChange={(v) => set("compromiso", v)} />
          </div>
        </Seccion>

        <Seccion id="cierre" titulo="5. Cierre" subtitulo={d.estado} abierta={abierta === "cierre"} onToggle={alternar}>
          <div className="space-y-2.5">
            <ChipsOpcion label="¿Quedó conforme?" nombre="Conforme" sinMarca value={d.conforme} opciones={CONFORME} onChange={(v) => set("conforme", v)} />
            <ChipsOpcion label="Estado" nombre="Estado de la PQRS" sinMarca value={d.estado} opciones={ESTADOS_PQRS} onChange={(v) => set("estado", v)} />
            <Campo label="Fecha de cierre" type="date" value={d.fechaCierre} onChange={(v) => set("fechaCierre", v)} />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Recibe, responsable ambiental y ciudadano" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien recibió ({d.recibio || "sin nombre"}) y quien presentó la solicitud ({d.anonima ? "anónima" : d.nombre || "sin nombre"}); sus nombres vienen de las secciones 1 y 2.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Responsable ambiental</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable ambiental" etqCargo="Cargo del responsable ambiental" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaSolicitud} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva solicitud (conserva obra y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la PQRS" onGenerar={generarExcel} />
    </div>
  );
}
