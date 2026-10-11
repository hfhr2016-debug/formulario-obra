import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_ACCIDENTE, HOJA_ACCIDENTE, CELDAS_ACCIDENTE, TIPOS_EVENTO, VINCULACIONES, SI_NO, PARTES_CUERPO, TIPOS_LESION, MECANISMOS, ENTIDADES_NOTIFICACION, REPORTADO,
  descubrirAccidente, escribirAccidenteEnHoja, validarAccidente, camposFaltantesAccidente, resumenAccidente, testigoNuevo, testigosConDatos, notificacionNueva, esAccidente, esGraveOMortal, textoAntiguedad,
} from "./accidenteDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, useListaRecordada, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { EPS, ARL } from "./sstListas";
import { ChipsOpcion, CampoFecha, GrillaOpciones, CasillaFoto, fotoVacia, agregarFotosARecuadros, lineasMarca, InterruptorMarca } from "./sstControles";
import { TraerDeFicha } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_accidente";
const CLAVE_CONSECUTIVO = "ryr_sst_accidente_consecutivo";
const CLAVE_ACCIDENTES = "ryr_sst_accidentes";            // resumen de cada reporte: lo usan la Investigación y los Indicadores
const MAX_TESTIGOS = (CELDAS_ACCIDENTE.tablas && CELDAS_ACCIDENTE.tablas.testigos.n) || 2;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", nReporte: "", fechaEvento: "", horaEvento: "", fechaReporte: "", tipoEvento: "", lugar: "", actividad: "", enJornada: "",
    trabajadorNombre: "", documento: "", cargo: "", empresa: "", edad: "", antiguedad: "", antigAnios: "", antigMeses: "", antigDias: "", vinculacion: "", eps: "", arl: "",
    queOcurrio: "", cuerpo: [], lesion: [], mecanismo: [], otros: {},
    primerosAuxilios: "", quienPresto: "", remitidoA: "", hospitalizado: "", incapacidad: "", danosMateriales: "", descripcionDanos: "",
    testigos: [testigoNuevo()], accionesInmediatas: "", notificaciones: ENTIDADES_NOTIFICACION.map(notificacionNueva),
    reportaNombre: "", reportaCargo: "", sstNombre: "", sstCargo: "", residenteNombre: "", residenteCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.nReporte || d.fechaEvento || d.horaEvento || d.tipoEvento || d.lugar || d.actividad || d.trabajadorNombre || d.antigAnios || d.antigMeses || d.antigDias || d.queOcurrio || d.cuerpo.length || d.lesion.length ||
    d.mecanismo.length || d.accionesInmediatas || d.reportaNombre || d.testigos.some((t) => t.nombre || t.vio) || d.notificaciones.some((n) => n.reportado || n.radicado));
}

export default function FormularioAccidente({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [fotos, setFotos] = useState(() => [fotoVacia(), fotoVacia()]);   // 0 = lugar del evento, 1 = elemento involucrado (las fotos no se guardan en el borrador)
  const [abierta, setAbierta] = useState("evento");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTestigos, setAvisoTestigos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const listaEps = useListaRecordada("ryr_sst_eps", EPS);
  const listaArl = useListaRecordada("ryr_sst_arl", ARL);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const alternarMarca = (campo) => (base) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(base) ? cur[campo].filter((t) => t !== base) : [...cur[campo], base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));
  function elegirTrabajador(o) {
    const t = trabajadores.buscar(o.texto);
    setD((cur) => ({ ...cur, trabajadorNombre: t ? t.nombre : o.texto, documento: cur.documento || (t && t.documento) || "", cargo: cur.cargo || (t && t.cargo) || "", empresa: cur.empresa || (t && t.empresa) || "" }));
  }

  // ---- Testigos ----
  const setTestigos = (nuevos) => setD((cur) => ({ ...cur, testigos: nuevos }));
  const actualizarTestigo = (i, patch) => setTestigos(d.testigos.map((t, k) => (k === i ? { ...t, ...patch } : t)));
  const quitarTestigo = (i) => { setTestigos(d.testigos.filter((_, k) => k !== i)); setAvisoTestigos(""); };
  function agregarTestigo() {
    if (d.testigos.length >= MAX_TESTIGOS) { setAvisoTestigos(`Este reporte tiene espacio para ${MAX_TESTIGOS} testigos. Si hay más, anótalos en "¿Qué pasó?".`); return; }
    setAvisoTestigos(""); setTestigos([...d.testigos, testigoNuevo()]);
  }
  const actualizarNotificacion = (i, patch) => setD((cur) => ({ ...cur, notificaciones: cur.notificaciones.map((n, k) => (k === i ? { ...n, ...patch } : n)) }));
  const actualizarFoto = (i, nueva) => setFotos((cur) => cur.map((f, k) => (k === i ? nueva : f)));

  const accidente = esAccidente(d);
  const grave = esGraveOMortal(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarAccidente(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesAccidente(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-accidente.xlsx", HOJA_ACCIDENTE);
      const avisos = [];
      const lectura = descubrirAccidente(ws);
      const decision = decidirDistribucion(lectura, CELDAS_ACCIDENTE);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nReporte && String(d.nReporte).trim() ? String(d.nReporte).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const sinMarcar = escribirAccidenteEnHoja(ws, { ...d, nReporte: nUsar, fechaReporte: d.fechaReporte || d.fechaEvento }, celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      const sinRecuadro = await agregarFotosARecuadros(workbook, ws, fotos, celdas.fotos && celdas.fotos.fotos, "#F2F2F2", fotos.map((x) => lineasMarca(d.proyecto, {}, x && x.file)));
      if (sinRecuadro) avisos.push(`La plantilla no tiene recuadro para ${sinRecuadro} de las fotos y no se incluyó${sinRecuadro > 1 ? "eron" : ""}.`);
      setAvisoGeneracion(avisos.join(" "));
      const nFotos = fotos.filter((f) => f.file).length - sinRecuadro;
      await descargarLibro(workbook, `Accidente_${d.fechaEvento}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(d.tipoEvento, 24)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      if (accidente) trabajadores.recordar([{ nombre: d.trabajadorNombre, documento: d.documento, cargo: d.cargo, empresa: d.empresa || d.contratista }]);
      trabajadores.recordar(testigosConDatos(d).map((t) => ({ nombre: t.nombre, cargo: t.cargo, empresa: d.contratista })));
      listaEps.recordar(d.eps); listaArl.recordar(d.arl);
      memoria.recordarUso({ personas: [[d.reportaNombre, d.reportaCargo], [d.sstNombre, d.sstCargo], [d.residenteNombre, d.residenteCargo]], cargosObra: [d.cargo], empresasUsadas: [d.contratista] });
      const res = resumenAccidente({ ...d, nReporte: nUsar });
      guardarJSON(CLAVE_ACCIDENTES, [res, ...leerJSON(CLAVE_ACCIDENTES, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nReporte: nUsar }));
      setGenerado(`✓ Excel descargado (reporte N° ${nUsar}: ${d.tipoEvento.toLowerCase()}${nFotos > 0 ? `, ${nFotos} ${nFotos === 1 ? "foto" : "fotos"}` : ""}).` +
        (accidente ? " ⚠ Recuerda reportar el accidente a la ARL y a la EPS (FURAT) dentro de los 2 días hábiles siguientes y abrir la investigación (15 días)." : "") +
        (grave ? " Por ser grave o mortal, también se notifica a la Dirección Territorial del Ministerio de Trabajo." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo reporte: conserva la obra, quien reporta y las firmas; limpia lo propio del evento (el N° avanza solo)
  function nuevoReporte() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion,
      reportaNombre: cur.reportaNombre, reportaCargo: cur.reportaCargo, sstNombre: cur.sstNombre, sstCargo: cur.sstCargo, residenteNombre: cur.residenteNombre, residenteCargo: cur.residenteCargo,
    }));
    setFotos([fotoVacia(), fotoVacia()]);
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTestigos(""); setAbierta("evento"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un reporte en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setFotos([fotoVacia(), fotoVacia()]); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTestigos(""); setAbierta("evento"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un reporte de accidente o incidente" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const marcadas = d.cuerpo.length + d.lesion.length + d.mecanismo.length;
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Accidente o Incidente" subtitulo={`${CODIGO_ACCIDENTE} · Reporte inicial del evento, en las primeras horas`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. EVENTO */}
        <Seccion id="evento" titulo="1. Datos del evento" subtitulo={d.tipoEvento || "Qué pasó, cuándo y dónde"} abierta={abierta === "evento"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, ...{ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion } }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Lista label="Tipo de evento" value={d.tipoEvento} onChange={(v) => set("tipoEvento", v)} opciones={TIPOS_EVENTO} />
            {accidente && (
              <div className="text-[11.5px] p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>
                ⚠ En un accidente: reporta a la <b>ARL y a la EPS (FURAT) dentro de los 2 días hábiles</b> y abre la <b>investigación dentro de los 15 días</b>.
                {grave && <> Por ser <b>{d.tipoEvento === "Accidente mortal" ? "mortal" : "grave"}</b>, también se notifica a la <b>Dirección Territorial del Ministerio de Trabajo</b>.</>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <CampoFecha label="Fecha del evento" value={d.fechaEvento} onChange={(v) => set("fechaEvento", v)} />
              <Campo label="N° de reporte" value={d.nReporte} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nReporte", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            </div>
            <SelectorHora label="Hora del evento" value={d.horaEvento} onChange={(v) => set("horaEvento", v)} />
            <Campo label="Fecha del reporte (si es otra)" type="date" value={d.fechaReporte} onChange={(v) => set("fechaReporte", v)} />
            <Campo label="Lugar exacto" value={d.lugar} onChange={(v) => set("lugar", v)} placeholder="Ej. Torre A, piso 8, junto al ascensor" />
            <Campo label="Actividad que realizaba" value={d.actividad} onChange={(v) => set("actividad", v)} />
            <ChipsOpcion label="¿En su jornada laboral?" nombre="En jornada" value={d.enJornada} opciones={SI_NO} onChange={(v) => set("enJornada", v)} />
          </div>
        </Seccion>

        {/* 2. TRABAJADOR */}
        <Seccion id="trabajador" titulo="2. Trabajador afectado" subtitulo={accidente ? (d.trabajadorNombre || "Quién se lesionó") : "Solo si hubo un lesionado"} abierta={abierta === "trabajador"} onToggle={alternar}>
          <div className="space-y-2.5">
            <BuscadorLista label="Nombre del trabajador afectado" value={d.trabajadorNombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
              onChange={(v) => set("trabajadorNombre", v)} onElegir={elegirTrabajador} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Documento de identidad" value={d.documento} inputMode="numeric" onChange={(v) => set("documento", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
              <Campo label="Edad (años)" value={d.edad} inputMode="numeric" onChange={(v) => set("edad", v.replace(/[^0-9]/g, ""))} />
            </div>
            <BuscadorLista label="Cargo / oficio" value={d.cargo} onChange={(v) => set("cargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
            <Campo label="Empresa" value={d.empresa} onChange={(v) => set("empresa", v)} />
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: NAVY }}>Antigüedad en el cargo</div>
              <div className="grid grid-cols-3 gap-2.5">
                <Campo label="Años" value={d.antigAnios} inputMode="numeric" placeholder="0" onChange={(v) => set("antigAnios", v.replace(/[^0-9]/g, ""))} />
                <Campo label="Meses" value={d.antigMeses} inputMode="numeric" placeholder="0" onChange={(v) => set("antigMeses", v.replace(/[^0-9]/g, ""))} />
                <Campo label="Días" value={d.antigDias} inputMode="numeric" placeholder="0" onChange={(v) => set("antigDias", v.replace(/[^0-9]/g, ""))} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Llena solo lo que aplique. {textoAntiguedad(d) ? "Se escribirá: " + textoAntiguedad(d) : "Ej.: 8 meses, o 1 año y 3 meses, o 20 días."}</div>
            </div>
            <Lista label="Tipo de vinculación" value={d.vinculacion} onChange={(v) => set("vinculacion", v)} opciones={VINCULACIONES} />
            <BuscadorLista label="EPS" value={d.eps} opciones={listaEps.opciones} opcionesAlAbrir={listaEps.opciones} maxResultados={10} placeholder="Elige la EPS o escribe otra" onChange={(v) => set("eps", v)} />
            <BuscadorLista label="ARL" value={d.arl} opciones={listaArl.opciones} opcionesAlAbrir={listaArl.opciones} maxResultados={10} placeholder="Elige la ARL o escribe otra" onChange={(v) => set("arl", v)} />
          </div>
        </Seccion>

        {/* 3. DESCRIPCIÓN */}
        <Seccion id="descripcion" titulo="3. Descripción del evento" subtitulo={marcadas ? `${marcadas} casillas marcadas` : "Qué pasó y cómo"} abierta={abierta === "descripcion"} onToggle={alternar} contador={marcadas}>
          <div className="space-y-3">
            <AreaTexto label="¿Qué pasó?" value={d.queOcurrio} onChange={(v) => set("queOcurrio", v)} filas={4} placeholder="Describe con claridad cómo ocurrió" />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Parte del cuerpo afectada</div>
            <GrillaOpciones nombre="Parte del cuerpo afectada" opciones={PARTES_CUERPO} marcadas={d.cuerpo} onAlternar={alternarMarca("cuerpo")} otros={d.otros} onOtro={cambiarOtro} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Tipo de lesión</div>
            <GrillaOpciones nombre="Tipo de lesión" opciones={TIPOS_LESION} marcadas={d.lesion} onAlternar={alternarMarca("lesion")} otros={d.otros} onOtro={cambiarOtro} />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Cómo ocurrió</div>
            <GrillaOpciones nombre="Cómo ocurrió" opciones={MECANISMOS} marcadas={d.mecanismo} onAlternar={alternarMarca("mecanismo")} otros={d.otros} onOtro={cambiarOtro} />
          </div>
        </Seccion>

        {/* 4. ATENCIÓN */}
        <Seccion id="atencion" titulo="4. Atención y consecuencias" subtitulo="Primeros auxilios, remisión e incapacidad" abierta={abierta === "atencion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <ChipsOpcion label="Primeros auxilios en obra" nombre="Primeros auxilios" value={d.primerosAuxilios} opciones={SI_NO} onChange={(v) => set("primerosAuxilios", v)} />
            <Campo label="¿Quién los prestó?" value={d.quienPresto} onChange={(v) => set("quienPresto", v)} />
            <Campo label="Remitido a" value={d.remitidoA} placeholder="Centro médico u hospital" onChange={(v) => set("remitidoA", v)} />
            <ChipsOpcion label="¿Hospitalizado?" nombre="Hospitalizado" value={d.hospitalizado} opciones={SI_NO} onChange={(v) => set("hospitalizado", v)} />
            <Campo label="Incapacidad estimada (días)" value={d.incapacidad} inputMode="numeric" onChange={(v) => set("incapacidad", v.replace(/[^0-9.,]/g, ""))} />
            <ChipsOpcion label="Daños materiales" nombre="Daños materiales" value={d.danosMateriales} opciones={SI_NO} onChange={(v) => set("danosMateriales", v)} />
            <AreaTexto label="Descripción de los daños" value={d.descripcionDanos} onChange={(v) => set("descripcionDanos", v)} filas={2} />
          </div>
        </Seccion>

        {/* 5. TESTIGOS */}
        <Seccion id="testigos" titulo="5. Testigos" subtitulo={`${testigosConDatos(d).length} de ${MAX_TESTIGOS}`} abierta={abierta === "testigos"} onToggle={alternar} contador={testigosConDatos(d).length}>
          {d.testigos.map((t, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <Campo label="Nombre del testigo" value={t.nombre} onChange={(v) => actualizarTestigo(i, { nombre: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cargo del testigo" value={t.cargo} onChange={(v) => actualizarTestigo(i, { cargo: v })} />
                  <Campo label="Teléfono o contacto" value={t.contacto} inputMode="tel" onChange={(v) => actualizarTestigo(i, { contacto: v })} />
                </div>
                <AreaTexto label="Qué vio (resumen)" value={t.vio} onChange={(v) => actualizarTestigo(i, { vio: v })} filas={2} />
              </div>
              <button type="button" onClick={() => quitarTestigo(i)} aria-label={`Quitar testigo ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarTestigo} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar testigo
          </button>
          {avisoTestigos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoTestigos}</div>}
        </Seccion>

        {/* 6. ACCIONES INMEDIATAS */}
        <Seccion id="acciones" titulo="6. Acciones inmediatas tomadas" subtitulo="Qué se hizo en el momento" abierta={abierta === "acciones"} onToggle={alternar}>
          <AreaTexto label="Acciones inmediatas tomadas" value={d.accionesInmediatas} onChange={(v) => set("accionesInmediatas", v)} filas={4} placeholder="Atención, aislamiento del área, suspensión del trabajo…" />
        </Seccion>

        {/* 7. NOTIFICACIONES */}
        <Seccion id="notificaciones" titulo="7. Reportes y notificaciones" subtitulo={`${d.notificaciones.filter((n) => n.reportado).length} de ${ENTIDADES_NOTIFICACION.length}`} abierta={abierta === "notificaciones"} onToggle={alternar}>
          {ENTIDADES_NOTIFICACION.map((ent, i) => {
            const n = d.notificaciones[i] || notificacionNueva();
            return (
              <div key={ent} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{ent}{i === 2 && grave ? " — obligatorio en este evento" : ""}</div>
                <div className="space-y-2">
                  <ChipsOpcion label="¿Reportado?" nombre={`Reportado ${i + 1}`} value={n.reportado} opciones={REPORTADO} pequeno onChange={(v) => actualizarNotificacion(i, { reportado: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Fecha" type="date" value={n.fecha} onChange={(v) => actualizarNotificacion(i, { fecha: v })} />
                    <SelectorHora label="Hora" value={n.hora} onChange={(v) => actualizarNotificacion(i, { hora: v })} />
                  </div>
                  <Campo label="N° de radicado o referencia" value={n.radicado} onChange={(v) => actualizarNotificacion(i, { radicado: v })} />
                </div>
              </div>
            );
          })}
        </Seccion>

        {/* 8. FOTOS */}
        <Seccion id="fotos" titulo="8. Evidencia fotográfica" subtitulo="Opcional · lugar y elemento involucrado" abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.filter((f) => f.file).length}>
          <div className="space-y-3">
            <InterruptorMarca />
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>LUGAR DEL EVENTO</div>
              <CasillaFoto foto={fotos[0]} titulo="Foto del lugar del evento" onChange={(n) => actualizarFoto(0, n)} onRemove={() => actualizarFoto(0, fotoVacia())} />
            </div>
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>ELEMENTO, EQUIPO O CONDICIÓN INVOLUCRADA</div>
              <CasillaFoto foto={fotos[1]} titulo="Foto del elemento involucrado" onChange={(n) => actualizarFoto(1, n)} onRemove={() => actualizarFoto(1, fotoVacia())} />
            </div>
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Las fotos no se guardan en el borrador: si sales sin descargar, hay que volver a subirlas.</div>
          </div>
        </Seccion>

        {/* 9. FIRMAS */}
        <Seccion id="firmas" titulo="9. Firmas" subtitulo="Reporta, trabajador afectado, responsable SST y residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Reporta (jefe inmediato o supervisor)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien reporta" etqCargo="Cargo de quien reporta" nombre={d.reportaNombre} cargo={d.reportaCargo} onChange={cambiarPersona("reportaNombre", "reportaCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Trabajador afectado</div>
            <div className="text-[12px]" style={{ color: "#4B5563" }}>{accidente ? (d.trabajadorNombre || "Sin nombre todavía") + (d.cargo ? ` · ${d.cargo}` : "") : "No aplica (no hubo lesionado)"}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable SST</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable SST" etqCargo="Cargo del responsable SST" nombre={d.sstNombre} cargo={d.sstCargo} onChange={cambiarPersona("sstNombre", "sstCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del residente" etqCargo="Cargo del residente" nombre={d.residenteNombre} cargo={d.residenteCargo} onChange={cambiarPersona("residenteNombre", "residenteCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoReporte} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo reporte (conserva la obra y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del reporte" onGenerar={generarExcel} />
    </div>
  );
}
