import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_QUIMICOS, HOJA_QUIMICOS, CELDAS_QUIMICOS, TIPOS_SUSTANCIA, UNIDADES, SI_NO, ITEMS_QUIMICOS,
  descubrirQuimicos, escribirQuimicosEnHoja, validarQuimicos, camposFaltantesQuimicos, resumenQuimicos, sustanciaNueva, sustanciasConDatos, sinHojaDeSeguridad,
} from "./sustanciasQuimicasDatos";
import { contarRespuestas, hallazgosConDatos, RESPUESTAS_AMB } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { FilaVerificacion, ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_QUIMICOS, TraerDeFichaAmb, HallazgosAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_quimicos";
const T0 = CELDAS_QUIMICOS.tablas || {};
const MAX_SUSTANCIAS = (T0.inventario && T0.inventario.n) || 12;
const MAX_HALLAZGOS = (T0.hallazgos && T0.hallazgos.n) || 4;
const N = ITEMS_QUIMICOS.length;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), almacen: "", responsable: "",
    sustancias: [], respuestas: Array(N).fill(""), observaciones: Array(N).fill(""), hallazgos: [], obsGenerales: "",
    verificoNombre: "", verificoCargo: "Responsable ambiental", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.almacen || d.responsable || d.sustancias.length || d.respuestas.some(Boolean) || d.hallazgos.length || d.obsGenerales || d.verificoNombre || d.revisoNombre);

export default function FormularioSustanciasQuimicas({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoInventario, setAvisoInventario] = useState("");
  const [avisoHallazgos, setAvisoHallazgos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const setSustancias = (nuevas) => setD((cur) => ({ ...cur, sustancias: nuevas }));
  const actualizar = (i, patch) => setSustancias(d.sustancias.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const quitar = (i) => { setSustancias(d.sustancias.filter((_, k) => k !== i)); setAvisoInventario(""); };
  function agregar() {
    if (d.sustancias.length >= MAX_SUSTANCIAS) { setAvisoInventario(`Esta hoja tiene espacio para ${MAX_SUSTANCIAS} sustancias. Para más, genera otra hoja con el resto.`); return; }
    const ultima = d.sustancias[d.sustancias.length - 1] || {};
    setAvisoInventario(""); setSustancias([...d.sustancias, sustanciaNueva({ ubicacion: ultima.ubicacion || "" })]);
  }

  const c = contarRespuestas(ITEMS_QUIMICOS, d.respuestas);
  const nHall = hallazgosConDatos(d.hallazgos).length;
  const nSust = sustanciasConDatos(d).length;
  const sinHoja = sinHojaDeSeguridad(d).length;
  const pct = c.si + c.no ? Math.round((c.si / (c.si + c.no)) * 100) : null;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarQuimicos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesQuimicos(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-sustancias-quimicas.xlsx", HOJA_QUIMICOS);
      const avs = [];
      const decision = decidirDistribucion(descubrirQuimicos(ws), CELDAS_QUIMICOS);
      if (decision.aviso) avs.push(decision.aviso);
      const T = decision.celdas.tablas || {};
      if (nSust > ((T.inventario && T.inventario.n) || MAX_SUSTANCIAS)) throw new Error("hay más sustancias de las que caben en la plantilla");
      if (nHall > ((T.hallazgos && T.hallazgos.n) || MAX_HALLAZGOS)) throw new Error("hay más hallazgos de los que caben en la plantilla");
      escribirQuimicosEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Sustancias_Quimicas_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.verificoNombre, d.verificoCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenQuimicos(d);
      guardarJSON(CLAVE_AMB_QUIMICOS, [res, ...leerJSON(CLAVE_AMB_QUIMICOS, []).filter((x) => x.id !== res.id)].slice(0, 300));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${nSust} ${nSust === 1 ? "sustancia" : "sustancias"}, ${c.si} cumplen, ${c.no} no cumplen, ${nHall} ${nHall === 1 ? "hallazgo" : "hallazgos"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaVerificacion() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, almacen: cur.almacen, responsable: cur.responsable,
      sustancias: cur.sustancias.map((s) => sustanciaNueva({ ...s })), verificoNombre: cur.verificoNombre, verificoCargo: cur.verificoCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoInventario(""); setAvisoHallazgos(""); setAbierta("lista"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoInventario(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un control de sustancias químicas" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="SUSTANCIAS QUÍMICAS Y COMBUSTIBLES" subtitulo={`${CODIGO_QUIMICOS} · Inventario y almacenamiento seguro`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha y almacén"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <Campo label="Almacén o zona" value={d.almacen} placeholder="Ej. Bodega de químicos, tanque de ACPM" onChange={(v) => set("almacen", v)} />
            <Campo label="Responsable del almacén" value={d.responsable} onChange={(v) => set("responsable", v)} />
          </div>
        </Seccion>

        <Seccion id="inventario" titulo="2. Inventario de sustancias" subtitulo={`${nSust} de ${MAX_SUSTANCIAS} sustancias${sinHoja ? ` · ${sinHoja} sin hoja de seguridad` : ""}`} abierta={abierta === "inventario"} onToggle={alternar} contador={nSust}>
          {d.sustancias.map((s, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <Campo label="Sustancia o producto" value={s.sustancia} placeholder="Ej. ACPM, thinner, aceite hidráulico" onChange={(v) => actualizar(i, { sustancia: v })} />
                <Lista label="Tipo de sustancia" value={s.tipo} onChange={(v) => actualizar(i, { tipo: v })} opciones={TIPOS_SUSTANCIA} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad" value={s.cantidad} inputMode="decimal" onChange={(v) => actualizar(i, { cantidad: v.replace(/[^0-9.,]/g, "") })} />
                  <Lista label="Unidad" value={s.unidad} onChange={(v) => actualizar(i, { unidad: v })} opciones={UNIDADES} />
                </div>
                <Campo label="Ubicación en la obra" value={s.ubicacion} onChange={(v) => actualizar(i, { ubicacion: v })} />
                <ChipsOpcion label="Hoja de seguridad (SDS)" nombre={`Hoja de seguridad ${i + 1}`} value={s.hoja} opciones={SI_NO} pequeno colores={{ "Sí": "#2E7D4F", No: "#B3401F" }} onChange={(v) => actualizar(i, { hoja: v })} />
                <ChipsOpcion label="Rotulado" nombre={`Rotulado ${i + 1}`} value={s.rotulado} opciones={SI_NO} pequeno colores={{ "Sí": "#2E7D4F", No: "#B3401F" }} onChange={(v) => actualizar(i, { rotulado: v })} />
              </div>
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar sustancia ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar sustancia</button>
          {avisoInventario && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoInventario}</div>}
          {sinHoja > 0 && <div className="text-[11.5px] mt-2 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{sinHoja === 1 ? "Una sustancia no tiene" : `${sinHoja} sustancias no tienen`} hoja de seguridad: pídela al proveedor y déjala visible en el sitio.</div>}
        </Seccion>

        <Seccion id="lista" titulo="3. Verificación del almacenamiento" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}${pct !== null ? ` · ${pct}% cumple` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          {ITEMS_QUIMICOS.map((t, i) => (
            <FilaVerificacion key={i} numero={i + 1} texto={t} valor={d.respuestas[i] || ""} onChange={(v) => ponerEn("respuestas")(i, v)} opciones={RESPUESTAS_AMB}
              observacion={d.observaciones[i] || ""} onObservacion={(v) => ponerEn("observaciones")(i, v)} />
          ))}
        </Seccion>

        <Seccion id="hallazgos" titulo="4. Hallazgos y acciones" subtitulo={`${nHall} de ${MAX_HALLAZGOS} hallazgos`} abierta={abierta === "hallazgos"} onToggle={alternar} contador={nHall}>
          <HallazgosAmb hallazgos={d.hallazgos} onChange={(h) => set("hallazgos", h)} max={MAX_HALLAZGOS} items={ITEMS_QUIMICOS} respuestas={d.respuestas} observaciones={d.observaciones} aviso={avisoHallazgos} onAviso={setAvisoHallazgos} />
        </Seccion>

        <Seccion id="firmas" titulo="5. Observaciones y firmas" subtitulo="Verifica el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones generales" value={d.obsGenerales} onChange={(v) => set("obsGenerales", v)} placeholder="Ej. Se solicitó la hoja de seguridad del thinner al proveedor" />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Verificó (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien verifica" etqCargo="Cargo de quien verifica" nombre={d.verificoNombre} cargo={d.verificoCargo} onChange={cambiarPersona("verificoNombre", "verificoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaVerificacion} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva verificación (conserva obra, inventario y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de sustancias" onGenerar={generarExcel} />
    </div>
  );
}
