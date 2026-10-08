import { useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_INCIDENTE_AMB, HOJA_INCIDENTE_AMB, CELDAS_INCIDENTE_AMB, TIPOS_EVENTO_AMB, COMPONENTES, SEVERIDADES, NOTIFICACION, ESTADOS_ACCION, ESTADOS_EVENTO,
  descubrirIncidenteAmb, escribirIncidenteAmbEnHoja, validarIncidenteAmb, camposFaltantesIncidenteAmb, resumenIncidenteAmb, correctivaNueva, correctivasConDatos,
} from "./incidenteAmbDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { ChipsOpcion, GrillaOpciones } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_INCIDENTES, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_incidente_amb";
const CLAVE_CONSECUTIVO = "ryr_amb_incidente_consecutivo";
const MAX_CORRECTIVAS = (CELDAS_INCIDENTE_AMB.tablas && CELDAS_INCIDENTE_AMB.tablas.correctivas && CELDAS_INCIDENTE_AMB.tablas.correctivas.n) || 3;
const COLORES_SEV = { Leve: "#2E7D4F", Moderada: "#B7791F", Grave: "#B3401F" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), horaEvento: "", horaReporte: "", nReporte: "", reportadoPor: "", reportaCargo: "", lugar: "", coordenadas: "",
    tipos: [], otros: {}, quePaso: "", causaInmediata: "", sustancia: "", cantidad: "", componentes: [], severidad: "", personas: "", area: "", notificado: "", autoridad: "", radicado: "",
    acciones: "", residuos: "", disposicion: "", causaRaiz: "", correctivas: [], estado: "Abierto", fechaCierre: "", verifico: "", responsableNombre: "", responsableCargo: "Responsable ambiental", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.horaEvento || d.horaReporte || d.nReporte || d.reportadoPor || d.lugar || d.coordenadas || d.tipos.length || d.quePaso || d.causaInmediata || d.sustancia || d.cantidad ||
  d.componentes.length || d.severidad || d.personas || d.area || d.notificado || d.acciones || d.residuos || d.disposicion || d.causaRaiz || d.correctivas.length || d.fechaCierre || d.verifico || d.responsableNombre || d.revisoNombre);

function pedirUbicacion() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { reject(new Error("Este dispositivo no permite obtener la ubicación.")); return; }
    navigator.geolocation.getCurrentPosition((p) => resolve(p.coords),
      (e) => reject(new Error(e && e.code === 1 ? "No diste permiso de ubicación. Escribe las coordenadas a mano." : "No pude obtener la ubicación. Escribe las coordenadas a mano.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}

export default function FormularioIncidenteAmb({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("evento");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCorrectivas, setAvisoCorrectivas] = useState("");
  const [avisoGps, setAvisoGps] = useState("");
  const [buscandoGps, setBuscandoGps] = useState(false);

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const alternarMarca = (campo) => (base) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(base) ? cur[campo].filter((t) => t !== base) : [...cur[campo], base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));
  const actualizarCorrectiva = (i, patch) => setD((cur) => ({ ...cur, correctivas: cur.correctivas.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  function agregarCorrectiva() {
    if (d.correctivas.length >= MAX_CORRECTIVAS) { setAvisoCorrectivas(`Esta hoja tiene espacio para ${MAX_CORRECTIVAS} acciones. Las demás van en Acciones Correctivas.`); return; }
    setAvisoCorrectivas(""); set("correctivas", [...d.correctivas, correctivaNueva({ responsable: d.responsableNombre })]);
  }
  async function usarUbicacion() {
    setAvisoGps(""); setBuscandoGps(true);
    try { const c = await pedirUbicacion(); set("coordenadas", `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`); setAvisoGps(c.accuracy ? `Precisión del GPS: ±${Math.round(c.accuracy)} m.` : ""); }
    catch (e) { setAvisoGps(e.message); } finally { setBuscandoGps(false); }
  }
  const nCorr = correctivasConDatos(d).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarIncidenteAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesIncidenteAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-incidente-ambiental.xlsx", HOJA_INCIDENTE_AMB);
      const avs = [];
      const decision = decidirDistribucion(descubrirIncidenteAmb(ws), CELDAS_INCIDENTE_AMB);
      if (decision.aviso) avs.push(decision.aviso);
      const T = decision.celdas.tablas || {};
      if (nCorr > ((T.correctivas && T.correctivas.n) || MAX_CORRECTIVAS)) throw new Error("hay más acciones correctivas de las que caben en la plantilla");
      const numero = d.nReporte && String(d.nReporte).trim() ? String(d.nReporte).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, nReporte: numero };
      const noMarcadas = escribirIncidenteAmbEnHoja(ws, dd, decision.celdas);
      if (noMarcadas.length) avs.push("La plantilla no tiene las casillas: " + noMarcadas.join(", ") + ".");
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Incidente_Ambiental_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}_N${numero}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.reportadoPor, d.reportaCargo], [d.responsableNombre, d.responsableCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenIncidenteAmb(dd);
      guardarJSON(CLAVE_AMB_INCIDENTES, [res, ...leerJSON(CLAVE_AMB_INCIDENTES, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (reporte N° ${numero}, severidad ${d.severidad.toLowerCase()}, ${d.estado.toLowerCase()}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevoReporte() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, reportadoPor: cur.reportadoPor, reportaCargo: cur.reportaCargo, responsableNombre: cur.responsableNombre, responsableCargo: cur.responsableCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoCorrectivas(""); setAvisoGps(""); setAbierta("evento"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un reporte en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoCorrectivas(""); setAvisoGps(""); setAbierta("evento"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un reporte de incidente ambiental" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INCIDENTE AMBIENTAL" subtitulo={`${CODIGO_INCIDENTE_AMB} · Reporte, contención y seguimiento del evento`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="evento" titulo="1. Datos del evento" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha, hora y lugar"} abierta={abierta === "evento"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Reporte N°" value={d.nReporte} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nReporte", v.replace(/[^0-9]/g, ""))} />
            <Campo label="Fecha del evento" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <div className="grid grid-cols-2 gap-2">
              <SelectorHora label="Hora del evento" value={d.horaEvento} onChange={(v) => set("horaEvento", v)} />
              <SelectorHora label="Hora del reporte" value={d.horaReporte} onChange={(v) => set("horaReporte", v)} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien reporta" etqCargo="Cargo de quien reporta" nombre={d.reportadoPor} cargo={d.reportaCargo} onChange={cambiarPersona("reportadoPor", "reportaCargo")} />
            <Campo label="Lugar exacto" value={d.lugar} placeholder="Ej. Patio de maquinaria, junto a la caseta" onChange={(v) => set("lugar", v)} />
            <Campo label="Coordenadas" value={d.coordenadas} placeholder="4.711000, -74.072100" onChange={(v) => set("coordenadas", v)} />
            <button type="button" onClick={usarUbicacion} disabled={buscandoGps} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md border" style={{ borderColor: NAVY, color: NAVY, opacity: buscandoGps ? 0.6 : 1 }}>
              <MapPin size={13} /> {buscandoGps ? "Buscando ubicación…" : "Usar mi ubicación actual"}
            </button>
            {avisoGps && <div className="text-[11px]" style={{ color: /Precisión/.test(avisoGps) ? "#2E7D4F" : "#B3401F" }}>{avisoGps}</div>}
          </div>
        </Seccion>

        <Seccion id="tipo" titulo="2. Tipo de evento" subtitulo={d.tipos.length ? `${d.tipos.length} ${d.tipos.length === 1 ? "tipo marcado" : "tipos marcados"}` : "Qué ocurrió"} abierta={abierta === "tipo"} onToggle={alternar} contador={d.tipos.length}>
          <GrillaOpciones nombre="Tipo de evento" opciones={TIPOS_EVENTO_AMB} marcadas={d.tipos} onAlternar={alternarMarca("tipos")} otros={d.otros} onOtro={cambiarOtro} />
        </Seccion>

        <Seccion id="descripcion" titulo="3. Descripción" subtitulo={d.quePaso ? d.quePaso.slice(0, 40) : "Qué pasó, causa inmediata y sustancia"} abierta={abierta === "descripcion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="¿Qué pasó?" value={d.quePaso} onChange={(v) => set("quePaso", v)} placeholder="Ej. Se rompió una manguera hidráulica de la retroexcavadora y cayó aceite al suelo" />
            <AreaTexto label="Causa inmediata" value={d.causaInmediata} filas={2} onChange={(v) => set("causaInmediata", v)} />
            <Campo label="Sustancia o material" value={d.sustancia} placeholder="Ej. Aceite hidráulico" onChange={(v) => set("sustancia", v)} />
            <Campo label="Cantidad estimada" value={d.cantidad} placeholder="Ej. 5 galones" onChange={(v) => set("cantidad", v)} />
          </div>
        </Seccion>

        <Seccion id="afectacion" titulo="4. Afectación y severidad" subtitulo={d.severidad ? `Severidad ${d.severidad.toLowerCase()}` : "Componentes afectados y notificación"} abierta={abierta === "afectacion"} onToggle={alternar} contador={d.componentes.length}>
          <div className="space-y-2.5">
            <div>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8F99" }}>Componentes afectados</span>
              <GrillaOpciones nombre="Componentes afectados" opciones={COMPONENTES} marcadas={d.componentes} onAlternar={alternarMarca("componentes")} otros={{}} onOtro={() => {}} />
            </div>
            <ChipsOpcion label="Severidad" nombre="Severidad" value={d.severidad} opciones={SEVERIDADES} colores={COLORES_SEV} onChange={(v) => set("severidad", v)} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Personas afectadas" value={d.personas} inputMode="numeric" onChange={(v) => set("personas", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Área afectada (m²)" value={d.area} inputMode="decimal" onChange={(v) => set("area", v.replace(/[^0-9.,]/g, ""))} />
            </div>
            <ChipsOpcion label="¿Se notificó a la autoridad?" nombre="Notificación a la autoridad" value={d.notificado} opciones={NOTIFICACION} onChange={(v) => set("notificado", v)} />
            {d.notificado === "Sí" && (
              <>
                <Campo label="Autoridad notificada" value={d.autoridad} placeholder="Ej. CAR, Secretaría de Ambiente" onChange={(v) => set("autoridad", v)} />
                <Campo label="Fecha y radicado" value={d.radicado} placeholder="Ej. 08/10/2026 · Rad. 2026-1234" onChange={(v) => set("radicado", v)} />
              </>
            )}
          </div>
        </Seccion>

        <Seccion id="acciones" titulo="5. Acciones inmediatas de contención y limpieza" subtitulo={d.acciones ? d.acciones.slice(0, 40) : "Qué se hizo en el momento"} abierta={abierta === "acciones"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Acciones realizadas" value={d.acciones} onChange={(v) => set("acciones", v)} placeholder="Ej. Se detuvo el equipo, se aplicó material absorbente y se retiró el suelo contaminado" />
            <Campo label="Residuos generados" value={d.residuos} placeholder="Ej. 2 bolsas de suelo y estopas contaminadas" onChange={(v) => set("residuos", v)} />
            <Campo label="Disposición final" value={d.disposicion} placeholder="Ej. Entregados al gestor autorizado" onChange={(v) => set("disposicion", v)} />
          </div>
        </Seccion>

        <Seccion id="causas" titulo="6. Causas y acciones correctivas" subtitulo={`${nCorr} de ${MAX_CORRECTIVAS} acciones`} abierta={abierta === "causas"} onToggle={alternar} contador={nCorr}>
          <div className="space-y-2.5">
            <AreaTexto label="Causa raíz" value={d.causaRaiz} filas={2} onChange={(v) => set("causaRaiz", v)} placeholder="Ej. Falta de mantenimiento preventivo de mangueras" />
            {d.correctivas.map((c, i) => (
              <div key={i} className="border rounded-lg p-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Acción {i + 1}</div>
                <div className="space-y-2">
                  <Campo label="Acción correctiva o preventiva" value={c.accion} onChange={(v) => actualizarCorrectiva(i, { accion: v })} />
                  <Campo label="Responsable de la acción" value={c.responsable} onChange={(v) => actualizarCorrectiva(i, { responsable: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Fecha límite" type="date" value={c.fechaLimite} onChange={(v) => actualizarCorrectiva(i, { fechaLimite: v })} />
                    <Lista label="Estado de la acción" value={c.estado} onChange={(v) => actualizarCorrectiva(i, { estado: v })} opciones={ESTADOS_ACCION} />
                  </div>
                </div>
                <button type="button" onClick={() => { set("correctivas", d.correctivas.filter((_, k) => k !== i)); setAvisoCorrectivas(""); }} aria-label={`Quitar acción ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={agregarCorrectiva} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar acción</button>
            {avisoCorrectivas && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>{avisoCorrectivas}</div>}
          </div>
        </Seccion>

        <Seccion id="cierre" titulo="7. Cierre del evento" subtitulo={d.estado} abierta={abierta === "cierre"} onToggle={alternar}>
          <div className="space-y-2.5">
            <ChipsOpcion label="Estado del evento" nombre="Estado del evento" sinMarca value={d.estado} opciones={ESTADOS_EVENTO} onChange={(v) => set("estado", v)} />
            <Campo label="Fecha de cierre" type="date" value={d.fechaCierre} onChange={(v) => set("fechaCierre", v)} />
            <Campo label="Verificó el cierre" value={d.verifico} onChange={(v) => set("verifico", v)} />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="8. Firmas" subtitulo="Reporta, responsable ambiental y residente o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien reporta ({d.reportadoPor || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Responsable ambiental</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable ambiental" etqCargo="Cargo del responsable ambiental" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Vo.Bo. (residente / interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el Vo.Bo." etqCargo="Cargo de quien da el Vo.Bo." nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoReporte} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nuevo reporte (conserva obra y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del reporte" onGenerar={generarExcel} />
    </div>
  );
}
