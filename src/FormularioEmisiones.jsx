import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_EMISIONES, HOJA_EMISIONES, CELDAS_EMISIONES, CLIMAS_EMI, SECTORES, JORNADAS, METODOS, ITEMS_EMISIONES,
  descubrirEmisiones, escribirEmisionesEnHoja, validarEmisiones, camposFaltantesEmisiones, resumenEmisiones, humedNuevo, ruidoNuevo, humedConDatos, ruidoConDatos, evaluarRuido, numeroDe,
} from "./emisionesDatos";
import { contarRespuestas, hallazgosConDatos } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_EMISIONES, TraerDeFichaAmb, ListaVerificacionAmb, HallazgosAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_emisiones";
const T = CELDAS_EMISIONES.tablas || {};
const MAX_HUMED = (T.humedecimiento && T.humedecimiento.n) || 4;
const MAX_RUIDO = (T.ruido && T.ruido.n) || 4;
const MAX_HALLAZGOS = (T.hallazgos && T.hallazgos.n) || 3;
const N = ITEMS_EMISIONES.length;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), responsable: "", responsableCargo: "Responsable ambiental", sector: "", clima: "",
    respuestas: Array(N).fill(""), observaciones: Array(N).fill(""), humedecimiento: [], ruido: [], hallazgos: [], revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.responsable || d.sector || d.clima || d.respuestas.some(Boolean) || d.humedecimiento.length || d.ruido.length || d.hallazgos.length || d.revisoNombre);

export default function FormularioEmisiones({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoHumed, setAvisoHumed] = useState("");
  const [avisoRuido, setAvisoRuido] = useState("");
  const [avisoHallazgos, setAvisoHallazgos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const lista = (campo) => d[campo];
  const setLista = (campo) => (n) => setD((cur) => ({ ...cur, [campo]: n }));
  const actualizar = (campo) => (i, patch) => setLista(campo)(lista(campo).map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const quitar = (campo, aviso) => (i) => { setLista(campo)(lista(campo).filter((_, k) => k !== i)); aviso(""); };
  function agregarHumed() {
    if (d.humedecimiento.length >= MAX_HUMED) { setAvisoHumed(`Esta hoja tiene espacio para ${MAX_HUMED} registros de humedecimiento.`); return; }
    setAvisoHumed(""); const u = d.humedecimiento[d.humedecimiento.length - 1];
    setLista("humedecimiento")([...d.humedecimiento, humedNuevo({ metodo: (u && u.metodo) || "", responsable: (u && u.responsable) || "" })]);
  }
  function agregarRuido() {
    if (d.ruido.length >= MAX_RUIDO) { setAvisoRuido(`Esta hoja tiene espacio para ${MAX_RUIDO} mediciones de ruido.`); return; }
    setAvisoRuido(""); const u = d.ruido[d.ruido.length - 1];
    setLista("ruido")([...d.ruido, ruidoNuevo({ jornada: (u && u.jornada) || "", fuente: (u && u.fuente) || "" })]);
  }

  const c = contarRespuestas(ITEMS_EMISIONES, d.respuestas);
  const nHum = humedConDatos(d).length, nRui = ruidoConDatos(d).length, nHall = hallazgosConDatos(d.hallazgos).length;
  const excedidas = ruidoConDatos(d).filter((r) => evaluarRuido(d, r).cumple === false).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarEmisiones(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesEmisiones(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-emisiones-ruido.xlsx", HOJA_EMISIONES);
      const avs = [];
      const decision = decidirDistribucion(descubrirEmisiones(ws), CELDAS_EMISIONES);
      if (decision.aviso) avs.push(decision.aviso);
      const TT = decision.celdas.tablas || {};
      if (nHum > ((TT.humedecimiento && TT.humedecimiento.n) || MAX_HUMED)) throw new Error("hay más registros de humedecimiento de los que caben en la plantilla");
      if (nRui > ((TT.ruido && TT.ruido.n) || MAX_RUIDO)) throw new Error("hay más mediciones de ruido de las que caben en la plantilla");
      if (nHall > ((TT.hallazgos && TT.hallazgos.n) || MAX_HALLAZGOS)) throw new Error("hay más hallazgos de los que caben en la plantilla");
      escribirEmisionesEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Control_Emisiones_Ruido_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.responsable, d.responsableCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenEmisiones(d);
      guardarJSON(CLAVE_AMB_EMISIONES, [res, ...leerJSON(CLAVE_AMB_EMISIONES, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${c.si} cumplen, ${c.no} no cumplen${nRui ? `, ${nRui} ${nRui === 1 ? "medición" : "mediciones"} de ruido${excedidas ? ` (${excedidas} sobre el límite)` : ""}` : ""}). El límite de ruido y «Cumple» se calculan solos en la hoja.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevoControl() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, responsable: cur.responsable, responsableCargo: cur.responsableCargo, sector: cur.sector, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHumed(""); setAvisoRuido(""); setAvisoHallazgos(""); setAbierta("lista"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un control en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHumed(""); setAvisoRuido(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un control de emisiones y ruido" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  const Quitar = ({ onClick, etiqueta }) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
  );
  const Agregar = ({ onClick, texto }) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> {texto}</button>
  );

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="EMISIONES Y RUIDO" subtitulo={`${CODIGO_EMISIONES} · Material particulado, humedecimiento y ruido`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos del control" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha, clima y responsable"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <div className="grid grid-cols-1 gap-2.5">
              <Lista label="Condición del clima" value={d.clima} onChange={(v) => set("clima", v)} opciones={CLIMAS_EMI} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable del control" etqCargo="Cargo del responsable del control" nombre={d.responsable} cargo={d.responsableCargo} onChange={cambiarPersona("responsable", "responsableCargo")} />
          </div>
        </Seccion>

        <Seccion id="lista" titulo="2. Verificación de medidas de control" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          <ListaVerificacionAmb items={ITEMS_EMISIONES} respuestas={d.respuestas} observaciones={d.observaciones} onRespuesta={ponerEn("respuestas")} onObservacion={ponerEn("observaciones")} />
        </Seccion>

        <Seccion id="humedecimiento" titulo="3. Humedecimiento de vías y zonas" subtitulo={`${nHum} de ${MAX_HUMED} registros`} abierta={abierta === "humedecimiento"} onToggle={alternar} contador={nHum}>
          {d.humedecimiento.map((h, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Riego {i + 1}</div>
              <div className="space-y-2">
                <SelectorHora label={`Hora del riego ${i + 1}`} value={h.hora} onChange={(v) => actualizar("humedecimiento")(i, { hora: v })} />
                <Campo label="Zona o tramo" value={h.zona} placeholder="Ej. Vía de acceso, frente norte" onChange={(v) => actualizar("humedecimiento")(i, { zona: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Lista label="Método" value={h.metodo} onChange={(v) => actualizar("humedecimiento")(i, { metodo: v })} opciones={METODOS} />
                  <Campo label="Agua usada (m³)" value={h.agua} inputMode="decimal" onChange={(v) => actualizar("humedecimiento")(i, { agua: v.replace(/[^0-9.,]/g, "") })} />
                </div>
                <Campo label="Responsable del riego" value={h.responsable} onChange={(v) => actualizar("humedecimiento")(i, { responsable: v })} />
                <Campo label="Observaciones del riego" value={h.obs} onChange={(v) => actualizar("humedecimiento")(i, { obs: v })} />
              </div>
              <Quitar etiqueta={`Quitar riego ${i + 1}`} onClick={() => quitar("humedecimiento", setAvisoHumed)(i)} />
            </div>
          ))}
          <Agregar texto="Agregar riego" onClick={agregarHumed} />
          {avisoHumed && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoHumed}</div>}
        </Seccion>

        <Seccion id="ruido" titulo="4. Medición de ruido (dB(A))" subtitulo={`${nRui} de ${MAX_RUIDO} mediciones${excedidas ? ` · ${excedidas} sobre el límite` : ""}`} abierta={abierta === "ruido"} onToggle={alternar} contador={nRui}>
          <div className="border rounded-lg p-2.5 mb-2.5 space-y-1.5" style={{ borderColor: LINE, background: "#EEF1F6" }}>
            <Lista label="Sector del predio (ruido)" value={d.sector} onChange={(v) => set("sector", v)} opciones={SECTORES} />
            <div className="text-[10.5px]" style={{ color: "#6B7280" }}>Es el tipo de zona donde queda la obra (residencial, comercial, industrial…). La Res. 0627 de 2006 fija el límite de ruido según ese sector y la jornada; con él la app dice si cada medición cumple. Se elige una vez por control.</div>
            {!d.sector && d.ruido.length > 0 && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>Elige el sector para ver el límite de cada medición.</div>}
          </div>
          {d.ruido.map((r, i) => {
            const ev = evaluarRuido(d, r);
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: ev.cumple === false ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Medición {i + 1}</div>
                <div className="space-y-2">
                  <Campo label="Punto de medición" value={r.punto} placeholder="Ej. Lindero norte, frente a vivienda" onChange={(v) => actualizar("ruido")(i, { punto: v })} />
                  <SelectorHora label={`Hora de la medición ${i + 1}`} value={r.hora} onChange={(v) => actualizar("ruido")(i, { hora: v })} />
                  <Campo label="Fuente o actividad" value={r.fuente} placeholder="Ej. Martillo neumático" onChange={(v) => actualizar("ruido")(i, { fuente: v })} />
                  <Lista label="Jornada" value={r.jornada} onChange={(v) => actualizar("ruido")(i, { jornada: v })} opciones={JORNADAS} />
                  <Campo label="Nivel medido dB(A)" value={r.nivel} inputMode="decimal" onChange={(v) => actualizar("ruido")(i, { nivel: v.replace(/[^0-9.,]/g, "") })} />
                  {ev.limite !== null && (
                    <div className="text-[12px] font-semibold px-2 py-1 rounded" style={{ background: "white", border: `1px solid ${LINE}`, color: ev.cumple === false ? "#B3401F" : ev.cumple ? "#2E7D4F" : NAVY }}>
                      Límite {ev.limite} dB(A){ev.cumple === null ? "" : ev.cumple ? " · Cumple" : " · No cumple"}
                    </div>
                  )}
                </div>
                <Quitar etiqueta={`Quitar medición ${i + 1}`} onClick={() => quitar("ruido", setAvisoRuido)(i)} />
              </div>
            );
          })}
          <Agregar texto="Agregar medición" onClick={agregarRuido} />
          {avisoRuido && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoRuido}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Límites de la Res. 0627 de 2006 según el sector y la jornada. Verifica si la autoridad local fijó otro valor.</div>
        </Seccion>

        <Seccion id="hallazgos" titulo="5. Hallazgos y acciones" subtitulo={`${nHall} de ${MAX_HALLAZGOS} hallazgos`} abierta={abierta === "hallazgos"} onToggle={alternar} contador={nHall}>
          <HallazgosAmb hallazgos={d.hallazgos} onChange={(h) => set("hallazgos", h)} max={MAX_HALLAZGOS} items={ITEMS_EMISIONES} respuestas={d.respuestas} observaciones={d.observaciones} aviso={avisoHallazgos} onAviso={setAvisoHallazgos} />
        </Seccion>

        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Controla el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien controla ({d.responsable || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoControl} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nuevo control (conserva obra, sector y responsable)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del control" onGenerar={generarExcel} />
    </div>
  );
}
