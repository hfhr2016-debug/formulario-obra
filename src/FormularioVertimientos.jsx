import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_VERTIMIENTOS, HOJA_VERTIMIENTOS, CELDAS_VERTIMIENTOS, CLIMAS_AMB, ITEMS_VERTIMIENTOS, SISTEMAS,
  descubrirVertimientos, escribirVertimientosEnHoja, validarVertimientos, camposFaltantesVertimientos, resumenVertimientos, lodoNuevo, lodosConDatos,
} from "./vertimientosDatos";
import { contarRespuestas, hallazgosConDatos } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_VERTIMIENTOS, TraerDeFichaAmb, gestoresDeFicha, ListaVerificacionAmb, HallazgosAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_vertimientos";
const CLAVE_CONSECUTIVO = "ryr_amb_vertimientos_consecutivo";
const MAX_LODOS = (CELDAS_VERTIMIENTOS.tablas && CELDAS_VERTIMIENTOS.tablas.lodos.n) || 4;
const MAX_HALLAZGOS = (CELDAS_VERTIMIENTOS.tablas && CELDAS_VERTIMIENTOS.tablas.hallazgos.n) || 3;
const N = ITEMS_VERTIMIENTOS.length;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), hora: "", clima: "", nInspeccion: "", inspectorNombre: "", inspectorCargo: "Responsable ambiental",
    respuestas: Array(N).fill(""), observaciones: Array(N).fill(""), lodos: [], hallazgos: [], revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.hora || d.clima || d.nInspeccion || d.inspectorNombre || d.respuestas.some(Boolean) || d.lodos.length || d.hallazgos.length || d.revisoNombre);

export default function FormularioVertimientos({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoLodos, setAvisoLodos] = useState("");
  const [avisoHallazgos, setAvisoHallazgos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const gestores = useMemo(() => gestoresDeFicha(d.proyecto).filter((g) => /aguas|ba(ñ|n)os|lodos/i.test(g.tipo || "")).map((g) => ({ texto: g.empresa, detalle: "de la ficha" })), [d.proyecto]);
  const lodos = d.lodos;
  const setLodos = (n) => setD((cur) => ({ ...cur, lodos: n }));
  const actualizarLodo = (i, patch) => setLodos(lodos.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  function agregarLodo() {
    if (lodos.length >= MAX_LODOS) { setAvisoLodos(`Esta hoja tiene espacio para ${MAX_LODOS} retiros de lodos.`); return; }
    setAvisoLodos(""); setLodos([...lodos, lodoNuevo({ fecha: d.fecha })]);
  }

  const c = contarRespuestas(ITEMS_VERTIMIENTOS, d.respuestas);
  const nLodos = lodosConDatos(d).length;
  const nHall = hallazgosConDatos(d.hallazgos).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarVertimientos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesVertimientos(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-vertimientos.xlsx", HOJA_VERTIMIENTOS);
      const avs = [];
      const decision = decidirDistribucion(descubrirVertimientos(ws), CELDAS_VERTIMIENTOS);
      if (decision.aviso) avs.push(decision.aviso);
      const T = decision.celdas.tablas || {};
      if (nLodos > ((T.lodos && T.lodos.n) || MAX_LODOS)) throw new Error("hay más retiros de lodos de los que caben en la plantilla");
      if (nHall > ((T.hallazgos && T.hallazgos.n) || MAX_HALLAZGOS)) throw new Error("hay más hallazgos de los que caben en la plantilla");
      const numero = d.nInspeccion && String(d.nInspeccion).trim() ? String(d.nInspeccion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, nInspeccion: numero };
      escribirVertimientosEnHoja(ws, dd, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Control_Vertimientos_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.inspectorNombre, d.inspectorCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenVertimientos(dd);
      guardarJSON(CLAVE_AMB_VERTIMIENTOS, [res, ...leerJSON(CLAVE_AMB_VERTIMIENTOS, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (inspección N° ${numero}: ${c.si} cumplen, ${c.no} no cumplen, ${nHall} ${nHall === 1 ? "hallazgo" : "hallazgos"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaInspeccion() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, inspectorNombre: cur.inspectorNombre, inspectorCargo: cur.inspectorCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoLodos(""); setAvisoHallazgos(""); setAbierta("lista"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una inspección en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoLodos(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una inspección de vertimientos" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="VERTIMIENTOS Y MANEJO DE AGUAS" subtitulo={`${CODIGO_VERTIMIENTOS} · Inspección de trampas, sedimentación y aguas`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos de la inspección" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha e inspector"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <SelectorHora label="Hora" value={d.hora} onChange={(v) => set("hora", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Inspección N°" value={d.nInspeccion} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInspeccion", v.replace(/[^0-9A-Za-z-]/g, ""))} />
              <Lista label="Condición del clima" value={d.clima} onChange={(v) => set("clima", v)} opciones={CLIMAS_AMB} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del inspector" etqCargo="Cargo del inspector" nombre={d.inspectorNombre} cargo={d.inspectorCargo} onChange={cambiarPersona("inspectorNombre", "inspectorCargo")} />
          </div>
        </Seccion>

        <Seccion id="lista" titulo="2. Verificación de condiciones" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          <ListaVerificacionAmb items={ITEMS_VERTIMIENTOS} respuestas={d.respuestas} observaciones={d.observaciones} onRespuesta={ponerEn("respuestas")} onObservacion={ponerEn("observaciones")} />
        </Seccion>

        <Seccion id="lodos" titulo="3. Limpieza de sistemas y retiro de lodos" subtitulo={`${nLodos} de ${MAX_LODOS} retiros`} abierta={abierta === "lodos"} onToggle={alternar} contador={nLodos}>
          {lodos.map((l, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Retiro {i + 1}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Fecha del retiro" type="date" value={l.fecha} onChange={(v) => actualizarLodo(i, { fecha: v })} />
                  <Campo label="Volumen (m³)" value={l.volumen} inputMode="decimal" onChange={(v) => actualizarLodo(i, { volumen: v.replace(/[^0-9.,]/g, "") })} />
                </div>
                <Lista label="Sistema o punto" value={l.sistema} onChange={(v) => actualizarLodo(i, { sistema: v })} opciones={SISTEMAS} />
                <BuscadorLista label="Gestor o destino" value={l.gestor} onChange={(v) => actualizarLodo(i, { gestor: v })} opciones={gestores} opcionesAlAbrir={gestores} placeholder="Empresa que los recibe" />
                <Campo label="N° de certificado" value={l.certificado} onChange={(v) => actualizarLodo(i, { certificado: v })} />
                <Campo label="Observaciones del retiro" value={l.obs} onChange={(v) => actualizarLodo(i, { obs: v })} />
              </div>
              <button type="button" onClick={() => { setLodos(lodos.filter((_, k) => k !== i)); setAvisoLodos(""); }} aria-label={`Quitar retiro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarLodo} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar retiro de lodos
          </button>
          {avisoLodos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoLodos}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Solo si esta visita hubo limpieza de sistemas o retiro de lodos. Si no, déjalo vacío.</div>
        </Seccion>

        <Seccion id="hallazgos" titulo="4. Hallazgos y acciones" subtitulo={`${nHall} de ${MAX_HALLAZGOS} hallazgos`} abierta={abierta === "hallazgos"} onToggle={alternar} contador={nHall}>
          <HallazgosAmb hallazgos={d.hallazgos} onChange={(h) => set("hallazgos", h)} max={MAX_HALLAZGOS} items={ITEMS_VERTIMIENTOS} respuestas={d.respuestas} observaciones={d.observaciones} aviso={avisoHallazgos} onAviso={setAvisoHallazgos} />
        </Seccion>

        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Inspecciona el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien inspecciona ({d.inspectorNombre || "sin nombre"}); su nombre viene de la sección 1.</div>
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
