import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_FORESTAL, HOJA_FORESTAL, CELDAS_FORESTAL, INTERVENCIONES, DESTINOS_MADERA, FORMAS_COMPENSACION, SI_NO, ITEMS_FORESTAL,
  descubrirForestal, escribirForestalEnHoja, validarForestal, camposFaltantesForestal, resumenForestal, individuoNuevo, individuosConDatos, volumenTotal, sinAutorizacion, porcentajeCompensacion, num,
} from "./aprovechamientoForestalDatos";
import { contarRespuestas, RESPUESTAS_AMB } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { FilaVerificacion, ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_FORESTAL, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_forestal";
const MAX_INDIVIDUOS = (CELDAS_FORESTAL.tablas && CELDAS_FORESTAL.tablas.individuos && CELDAS_FORESTAL.tablas.individuos.n) || 12;
const N = ITEMS_FORESTAL.length;
const fmt = (n) => String(Math.round(n * 100) / 100).replace(".", ",");

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", autoridad: "", resolucion: "", fechaResolucion: "", vigencia: "", autorizados: "", fecha: fechaHoyISO(), responsable: "", responsableCargo: "Responsable ambiental",
    individuos: [], forma: "", aCompensar: "", sembrados: "", sitio: "", fechaSiembra: "",
    respuestas: Array(N).fill(""), observacionesPuntos: Array(N).fill(""), observaciones: "", residenteNombre: "", residenteCargo: "", voboNombre: "", voboCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.autoridad || d.resolucion || d.fechaResolucion || d.vigencia || d.autorizados || d.responsable || d.individuos.length || d.forma || d.aCompensar || d.sembrados || d.sitio || d.fechaSiembra || d.respuestas.some(Boolean) || d.observaciones || d.residenteNombre || d.voboNombre);

export default function FormularioAprovechamientoForestal({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoIndividuos, setAvisoIndividuos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const setIndividuos = (nuevos) => setD((cur) => ({ ...cur, individuos: nuevos }));
  const actualizar = (i, patch) => setIndividuos(d.individuos.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const quitar = (i) => { setIndividuos(d.individuos.filter((_, k) => k !== i)); setAvisoIndividuos(""); };
  function agregar() {
    if (d.individuos.length >= MAX_INDIVIDUOS) { setAvisoIndividuos(`Esta hoja tiene espacio para ${MAX_INDIVIDUOS} individuos. Para más, genera otra hoja con el resto.`); return; }
    const ultimo = d.individuos[d.individuos.length - 1] || {};
    setAvisoIndividuos(""); setIndividuos([...d.individuos, individuoNuevo({ intervencion: ultimo.intervencion || "", autorizado: ultimo.autorizado || "" })]);
  }

  const xs = individuosConDatos(d);
  const nSin = sinAutorizacion(d).length;
  const vol = volumenTotal(d);
  const aut = num(d.autorizados);
  const talados = xs.filter((x) => x.intervencion === "Tala").length;
  const pComp = porcentajeCompensacion(d);
  const c = contarRespuestas(ITEMS_FORESTAL, d.respuestas);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarForestal(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesForestal(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-aprovechamiento-forestal.xlsx", HOJA_FORESTAL);
      const avs = [];
      const decision = decidirDistribucion(descubrirForestal(ws), CELDAS_FORESTAL);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.individuos && decision.celdas.tablas.individuos.n) || MAX_INDIVIDUOS;
      if (xs.length > capac) throw new Error(`la plantilla tiene espacio para ${capac} individuos y hay ${xs.length}`);
      escribirForestalEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Aprovechamiento_Forestal_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.responsable, d.responsableCargo], [d.residenteNombre, d.residenteCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenForestal(d);
      guardarJSON(CLAVE_AMB_FORESTAL, [res, ...leerJSON(CLAVE_AMB_FORESTAL, []).filter((x) => x.id !== res.id)].slice(0, 200));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${xs.length} ${xs.length === 1 ? "individuo" : "individuos"}, ${fmt(vol)} m³).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  // Nuevo registro: conserva la obra y la autorización (resolución) para seguir con otro frente
  function nuevoRegistro() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, autoridad: cur.autoridad, resolucion: cur.resolucion, fechaResolucion: cur.fechaResolucion, vigencia: cur.vigencia,
      autorizados: cur.autorizados, responsable: cur.responsable, responsableCargo: cur.responsableCargo, residenteNombre: cur.residenteNombre, residenteCargo: cur.residenteCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoIndividuos(""); setAbierta("individuos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoIndividuos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un registro de aprovechamiento forestal" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Aprovechamiento Forestal" subtitulo={`${CODIGO_FORESTAL} · Intervención de árboles y compensación`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales y autorización" subtitulo={d.resolucion ? `Resolución ${d.resolucion}` : "Obra, permiso y responsable"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Autoridad ambiental" value={d.autoridad} placeholder="Ej. CAR, AMVA, Secretaría de Ambiente" onChange={(v) => set("autoridad", v)} />
            <Campo label="Resolución o permiso N°" value={d.resolucion} onChange={(v) => set("resolucion", v)} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha de la resolución" type="date" value={d.fechaResolucion} onChange={(v) => set("fechaResolucion", v)} />
              <Campo label="Vigente hasta" type="date" value={d.vigencia} onChange={(v) => set("vigencia", v)} />
            </div>
            <Campo label="Individuos autorizados" value={d.autorizados} inputMode="numeric" onChange={(v) => set("autorizados", v.replace(/[^0-9]/g, ""))} />
            <Campo label="Fecha del registro" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable" etqCargo="Cargo del responsable" nombre={d.responsable} cargo={d.responsableCargo} onChange={cambiarPersona("responsable", "responsableCargo")} />
          </div>
        </Seccion>

        <Seccion id="individuos" titulo="2. Individuos intervenidos" subtitulo={`${xs.length} de ${MAX_INDIVIDUOS} individuos${vol ? ` · ${fmt(vol)} m³` : ""}`} abierta={abierta === "individuos"} onToggle={alternar} contador={xs.length}>
          {d.individuos.map((x, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <Campo label="Especie (nombre común)" value={x.especie} placeholder="Ej. Eucalipto, Acacia, Guayacán" onChange={(v) => actualizar(i, { especie: v })} />
                <Campo label="Código o ubicación" value={x.codigo} placeholder="Número del árbol o sitio" onChange={(v) => actualizar(i, { codigo: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="DAP (cm)" value={x.dap} inputMode="decimal" onChange={(v) => actualizar(i, { dap: v.replace(/[^0-9.,]/g, "") })} />
                  <Campo label="Altura (m)" value={x.altura} inputMode="decimal" onChange={(v) => actualizar(i, { altura: v.replace(/[^0-9.,]/g, "") })} />
                </div>
                <ChipsOpcion label="Intervención" nombre={`Intervención ${i + 1}`} value={x.intervencion} opciones={INTERVENCIONES} pequeno onChange={(v) => actualizar(i, { intervencion: v })} />
                <ChipsOpcion label="¿Autorizado?" nombre={`Autorizado ${i + 1}`} value={x.autorizado} opciones={SI_NO} pequeno colores={{ "Sí": "#2E7D4F", No: "#B3401F" }} onChange={(v) => actualizar(i, { autorizado: v })} />
                <Campo label="Volumen (m³)" value={x.volumen} inputMode="decimal" onChange={(v) => actualizar(i, { volumen: v.replace(/[^0-9.,]/g, "") })} />
                <Lista label="Destino de la madera" value={x.destino} onChange={(v) => actualizar(i, { destino: v })} opciones={DESTINOS_MADERA} />
              </div>
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar individuo ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar individuo</button>
          {avisoIndividuos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoIndividuos}</div>}
          {nSin > 0 && <div className="text-[11.5px] mt-2 p-2 rounded" style={{ background: "#FDEDEA", color: "#B3401F" }}>{nSin === 1 ? "Un individuo está marcado" : `${nSin} individuos están marcados`} como NO autorizado: no se debe intervenir sin permiso de la autoridad ambiental.</div>}
          {aut !== null && xs.length > aut && <div className="text-[11.5px] mt-2 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>Hay {xs.length} individuos registrados y la resolución autoriza {aut}.</div>}
        </Seccion>

        <Seccion id="compensacion" titulo="3. Compensación" subtitulo={pComp !== null ? `${Math.round(pComp * 100)} % cumplido` : talados ? `${talados} talados por compensar` : "Siembra o pago"} abierta={abierta === "compensacion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <Lista label="Forma de compensación" value={d.forma} onChange={(v) => set("forma", v)} opciones={FORMAS_COMPENSACION} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Árboles a compensar" value={d.aCompensar} inputMode="numeric" onChange={(v) => set("aCompensar", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Árboles sembrados" value={d.sembrados} inputMode="numeric" onChange={(v) => set("sembrados", v.replace(/[^0-9]/g, ""))} />
            </div>
            <Campo label="Sitio de siembra" value={d.sitio} onChange={(v) => set("sitio", v)} />
            <Campo label="Fecha de siembra" type="date" value={d.fechaSiembra} onChange={(v) => set("fechaSiembra", v)} />
            {pComp !== null && <div className="text-[12.5px] font-bold px-3 py-2 rounded-md text-center" style={{ background: pComp >= 1 ? "#00A651" : "#FFC000", color: "#000" }}>Compensación cumplida: {Math.round(pComp * 100)} %</div>}
          </div>
        </Seccion>

        <Seccion id="lista" titulo="4. Verificación del aprovechamiento" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          {ITEMS_FORESTAL.map((t, i) => (
            <FilaVerificacion key={i} numero={i + 1} texto={t} valor={d.respuestas[i] || ""} onChange={(v) => ponerEn("respuestas")(i, v)} opciones={RESPUESTAS_AMB}
              observacion={d.observacionesPuntos[i] || ""} onObservacion={(v) => ponerEn("observacionesPuntos")(i, v)} />
          ))}
        </Seccion>

        <Seccion id="firmas" titulo="5. Observaciones y firmas" subtitulo="Firma el responsable ambiental; revisa el residente; da el Vo.Bo. la interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones generales" value={d.observaciones} onChange={(v) => set("observaciones", v)} placeholder="Ej. Se rescató un nido de aves antes de la tala del individuo 3" />
            <div className="text-[11px]" style={{ color: NAVY }}>Firma el responsable ambiental ({d.responsable || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del residente" etqCargo="Cargo del residente" nombre={d.residenteNombre} cargo={d.residenteCargo} onChange={cambiarPersona("residenteNombre", "residenteCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. (interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoRegistro} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nuevo registro (conserva la obra y la resolución)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del aprovechamiento" onGenerar={generarExcel} />
    </div>
  );
}
