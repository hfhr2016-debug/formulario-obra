import { useState } from "react";
import { fechaHoyISO, textoDuracion, recordarTexto } from "./sstBase";
import {
  CODIGO_INDUCCION, CELDAS_INDUCCION, VINCULACIONES, APTITUDES, GRUPOS_RH, PRESENTO, SI_NO, NOTA_MINIMA_POR_DEFECTO,
  DOCUMENTOS_INGRESO, TEMAS_INDUCCION, descubrirInduccion, escribirInduccionEnHoja, validarInduccion, resultadoInduccion, resumenInduccion,
} from "./induccionDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo, fijarSiguienteConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { proyectoSST, guardarProyectoSST, useListaRecordada } from "./sstComunes";
import { EPS, ARL, AFP, PARENTESCOS } from "./sstListas";

const CLAVE_BORRADOR = "ryr_borrador_induccion";
const CLAVE_CONSECUTIVO = "ryr_sst_induccion_consecutivo";
const CLAVE_INDUCCIONES = "ryr_sst_inducciones";         // resumen de cada inducción hecha (para informes y Registro de Personal)

const filaDoc = () => ({ presento: "", vigencia: "", observacion: "" });
const filaTema = () => ({ impartido: "", observacion: "" });

function datosIniciales() {
  return {
    proyecto: proyectoSST(), contratista: "", ubicacion: "",
    fecha: "", horaInicio: "", horaFin: "", nInduccion: "", inductorNombre: "", inductorCargo: "",
    nombre: "", documento: "", cargo: "", empresa: "", fechaIngreso: "", vinculacion: "", rh: "", eps: "", arl: "", afp: "",
    examenFecha: "", aptitud: "", restricciones: "", contactoNombre: "", parentesco: "", telefono: "",
    documentos: DOCUMENTOS_INGRESO.map(filaDoc), temas: TEMAS_INDUCCION.map(filaTema),
    calificacion: "", notaMinima: String(NOTA_MINIMA_POR_DEFECTO), reinduccion: "",
    responsableNombre: "", responsableCargo: "",
  };
}

// Solo los datos del trabajador (para pasar al siguiente conservando los de la inducción)
function datosDelTrabajadorVacios() {
  const v = datosIniciales();
  return {
    nombre: v.nombre, documento: v.documento, cargo: v.cargo, empresa: v.empresa, fechaIngreso: v.fechaIngreso, vinculacion: v.vinculacion, rh: v.rh, eps: v.eps, arl: v.arl, afp: v.afp,
    examenFecha: v.examenFecha, aptitud: v.aptitud, restricciones: v.restricciones, contactoNombre: v.contactoNombre, parentesco: v.parentesco, telefono: v.telefono,
    documentos: v.documentos, temas: v.temas, calificacion: v.calificacion, reinduccion: v.reinduccion, nInduccion: "",
  };
}

// ¿La inducción ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.nombre || d.documento || d.cargo || d.horaInicio || d.horaFin || d.eps || d.arl || d.afp || d.contactoNombre || d.calificacion || d.restricciones ||
    d.documentos.some((x) => x.presento || x.vigencia || x.observacion) || d.temas.some((x) => x.impartido || x.observacion));
}

export default function FormularioInduccion({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("general");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [, setRefresco] = useState(0);

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const listaEps = useListaRecordada("ryr_sst_eps", EPS);              // EPS, ARL y AFP del país + las que se escriban
  const listaArl = useListaRecordada("ryr_sst_arl", ARL);
  const listaAfp = useListaRecordada("ryr_sst_afp", AFP);
  const listaParentesco = useListaRecordada("ryr_sst_parentescos", PARENTESCOS, { min: 3 });
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));

  // Al elegir un trabajador ya conocido se completan solos su documento, cargo y empresa (solo los que estén vacíos)
  function elegirTrabajador(o) {
    const t = trabajadores.buscar(o.texto);
    setD((cur) => ({
      ...cur,
      nombre: t ? t.nombre : o.texto,
      documento: cur.documento || (t && t.documento) || "",
      cargo: cur.cargo || (t && t.cargo) || "",
      empresa: cur.empresa || (t && t.empresa) || "",
    }));
  }

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  const actualizarDoc = (i, campo, valor) => setD((cur) => ({ ...cur, documentos: cur.documentos.map((x, k) => (k === i ? { ...x, [campo]: valor } : x)) }));
  const actualizarTema = (i, campo, valor) => setD((cur) => ({ ...cur, temas: cur.temas.map((x, k) => (k === i ? { ...x, [campo]: valor } : x)) }));
  const marcarTodosTemas = () => setD((cur) => ({ ...cur, temas: cur.temas.map((x) => ({ ...x, impartido: x.impartido || "Sí" })) }));
  const marcarTodosDocs = () => setD((cur) => ({ ...cur, documentos: cur.documentos.map((x) => ({ ...x, presento: x.presento || "Sí" })) }));

  const nTemas = d.temas.filter((t) => t.impartido === "Sí").length;
  const nDocs = d.documentos.filter((t) => t.presento === "Sí").length;
  const resultado = resultadoInduccion(d);

  async function generarExcel() {
    setMensajeError("");
    setAvisoGeneracion("");
    const faltan = validarInduccion(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-induccion-sst.xlsx", "Inducción SST");
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_INDUCCION;
      const avisos = [];
      try {
        const lectura = descubrirInduccion(ws);
        if (lectura.celdas) celdas = lectura.celdas;
        else {
          console.warn("No pude leer la distribución de la plantilla; uso la de por defecto:", lectura.problemas);
          avisos.push("No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame.");
        }
      } catch (e) {
        console.warn("Error al leer la plantilla; uso la distribución por defecto:", e);
      }
      // N° de inducción: si se dejó vacío, se asigna el siguiente consecutivo
      const nUsar = d.nInduccion && String(d.nInduccion).trim() ? String(d.nInduccion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirInduccionEnHoja(ws, { ...d, nInduccion: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Induccion_SST_${d.fecha || "sin-fecha"}_${textoParaArchivo(d.nombre)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar([{ nombre: d.nombre, documento: d.documento, cargo: d.cargo, empresa: d.empresa }]);
      guardarProyectoSST(d.proyecto);
      listaEps.recordar(d.eps); listaArl.recordar(d.arl); listaAfp.recordar(d.afp); listaParentesco.recordar(d.parentesco);
      memoria.recordarUso({ personas: [[d.inductorNombre, d.inductorCargo], [d.responsableNombre, d.responsableCargo]], cargosObra: [d.cargo], empresasUsadas: [d.empresa] });
      const res = resumenInduccion(d);
      guardarJSON(CLAVE_INDUCCIONES, [res, ...leerJSON(CLAVE_INDUCCIONES, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador();
      borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInduccion: nUsar }));
      setGenerado(`✓ Excel descargado (inducción N° ${nUsar} de ${d.nombre}). Imprímelo para las firmas, o toca "Otro trabajador" (al final de la pantalla).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  function cambiarNumeracion() {
    const sig = siguienteConsecutivo(CLAVE_CONSECUTIVO);
    const resp = window.prompt(`El siguiente número automático es el ${sig}.\n¿Con qué número quieres que continúe la numeración?`, String(sig));
    if (resp === null) return;
    const n = parseInt(resp, 10);
    if (isNaN(n) || n < 1) { alert("Escribe un número entero mayor o igual a 1."); return; }
    fijarSiguienteConsecutivo(CLAVE_CONSECUTIVO, n);
    setRefresco((x) => x + 1);
  }

  // Pasa al siguiente trabajador conservando los datos de la inducción (obra, fecha, horas, inductor y responsable)
  function otroTrabajador() {
    setD((cur) => ({ ...cur, ...datosDelTrabajadorVacios() }));
    borrador.borrarBorrador();
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAbierta("trabajador");
    window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una inducción en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador();
    setD({ ...datosIniciales(), proyecto: "" });
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una inducción" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INDUCCIÓN EN SST" subtitulo={`${CODIGO_INDUCCION} · Personal nuevo · una hoja por trabajador`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS DE LA INDUCCIÓN */}
        <Seccion id="general" titulo="1. Datos de la inducción" subtitulo="Obra, fecha y quién la dicta" abierta={abierta === "general"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Campo label="Fecha de la inducción" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
                {!d.fecha && (
                  <button type="button" onClick={() => set("fecha", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
                )}
              </div>
              <Campo label="N° de inducción" value={d.nInduccion} inputMode="numeric" placeholder={`Automático: ${siguienteConsecutivo(CLAVE_CONSECUTIVO)}`} onChange={(v) => set("nInduccion", v.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="text-[10.5px] -mt-1" style={{ color: "#8A8F99" }}>
              Si dejas el N° vacío, se asigna solo el siguiente consecutivo.{" "}
              <button type="button" onClick={cambiarNumeracion} className="underline" style={{ color: NAVY }}>Cambiar la numeración</button>
            </div>
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            {textoDuracion(d.horaInicio, d.horaFin) && (
              <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>⏱ Duración: {textoDuracion(d.horaInicio, d.horaFin)}</div>
            )}
            <BloqueProfesional memoria={memoria} etqNombre="Inductor (nombre)" etqCargo="Cargo del inductor" nombre={d.inductorNombre} cargo={d.inductorCargo} onChange={cambiarPersona("inductorNombre", "inductorCargo")} />
          </div>
        </Seccion>

        {/* 2. DATOS DEL TRABAJADOR */}
        <Seccion id="trabajador" titulo="2. Datos del trabajador" subtitulo="Identificación, afiliaciones y contacto de emergencia" abierta={abierta === "trabajador"} onToggle={alternar} contador={d.nombre ? 1 : 0}>
          <div className="space-y-2.5">
            <BuscadorLista label="Nombre completo" value={d.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
              onChange={(v) => set("nombre", v)} onElegir={elegirTrabajador} />
            <Campo label="Documento de identidad" value={d.documento} inputMode="numeric" onChange={(v) => set("documento", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
            <BuscadorLista label="Cargo / oficio" value={d.cargo} onChange={(v) => set("cargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Elige un cargo de la obra o escribe otro" onBlurValor={(v) => memoria.recordarCargoObra(v)} />
            <BuscadorLista label="Empresa / contratista" value={d.empresa} onChange={(v) => set("empresa", v)} opciones={memoria.opcionesEmpresas} opcionesAlAbrir={memoria.opcionesEmpresas} placeholder="Escribe la empresa" onBlurValor={(v) => memoria.recordarEmpresa(v)} />
            <div>
              <Campo label="Fecha de ingreso a la obra" type="date" value={d.fechaIngreso} onChange={(v) => set("fechaIngreso", v)} />
              {!d.fechaIngreso && (
                <button type="button" onClick={() => set("fechaIngreso", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Tipo de vinculación" value={d.vinculacion} onChange={(v) => set("vinculacion", v)} opciones={VINCULACIONES} />
              <Lista label="Grupo sanguíneo (RH)" value={d.rh} onChange={(v) => set("rh", v)} opciones={GRUPOS_RH} />
            </div>
            <BuscadorLista label="EPS" value={d.eps} opciones={listaEps.opciones} opcionesAlAbrir={listaEps.opciones} maxResultados={10} placeholder="Elige la EPS o escribe otra" onChange={(v) => set("eps", v)} />
            <BuscadorLista label="ARL" value={d.arl} opciones={listaArl.opciones} opcionesAlAbrir={listaArl.opciones} maxResultados={10} placeholder="Elige la ARL o escribe otra" onChange={(v) => set("arl", v)} />
            <BuscadorLista label="AFP" value={d.afp} opciones={listaAfp.opciones} opcionesAlAbrir={listaAfp.opciones} maxResultados={10} placeholder="Elige el fondo de pensiones o escribe otro" onChange={(v) => set("afp", v)} />
            <div className="text-[10px] uppercase tracking-wide font-medium pt-1" style={{ color: "#8A8F99" }}>Examen médico de ingreso</div>
            <Campo label="Fecha del examen" type="date" value={d.examenFecha} onChange={(v) => set("examenFecha", v)} />
            <Lista label="Concepto de aptitud" value={d.aptitud} onChange={(v) => set("aptitud", v)} opciones={APTITUDES} />
            <Campo label="Restricciones (si las hay)" value={d.restricciones} onChange={(v) => set("restricciones", v)} />
            <div className="text-[10px] uppercase tracking-wide font-medium pt-1" style={{ color: "#8A8F99" }}>Contacto de emergencia</div>
            <Campo label="Nombre del contacto" value={d.contactoNombre} onChange={(v) => set("contactoNombre", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <BuscadorLista label="Parentesco" value={d.parentesco} opciones={listaParentesco.opciones} opcionesAlAbrir={listaParentesco.opciones} maxResultados={10} placeholder="Elige el parentesco" onChange={(v) => set("parentesco", v)} />
              <Campo label="Teléfono" value={d.telefono} inputMode="tel" onChange={(v) => set("telefono", v.replace(/[^0-9+ ]/g, ""))} />
            </div>
          </div>
        </Seccion>

        {/* 3. DOCUMENTOS */}
        <Seccion id="documentos" titulo="3. Verificación de documentos" subtitulo={`${nDocs} de ${DOCUMENTOS_INGRESO.length} presentados`} abierta={abierta === "documentos"} onToggle={alternar} contador={nDocs}>
          <button type="button" onClick={marcarTodosDocs} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
            ✓ Marcar "Sí" en los que falten por marcar
          </button>
          {DOCUMENTOS_INGRESO.map((titulo, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {titulo}</div>
              <div className="grid grid-cols-2 gap-2.5">
                <Lista label="¿Lo presentó?" value={d.documentos[i].presento} onChange={(v) => actualizarDoc(i, "presento", v)} opciones={PRESENTO} />
                <Campo label="Vigencia o fecha" type="date" value={d.documentos[i].vigencia} onChange={(v) => actualizarDoc(i, "vigencia", v)} />
              </div>
              <div className="mt-2"><Campo label="Observación" value={d.documentos[i].observacion} onChange={(v) => actualizarDoc(i, "observacion", v)} /></div>
            </div>
          ))}
        </Seccion>

        {/* 4. TEMAS */}
        <Seccion id="temas" titulo="4. Temas de la inducción" subtitulo={`${nTemas} de ${TEMAS_INDUCCION.length} impartidos`} abierta={abierta === "temas"} onToggle={alternar} contador={nTemas}>
          <button type="button" onClick={marcarTodosTemas} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
            ✓ Marcar "Sí" en los que falten por marcar
          </button>
          {TEMAS_INDUCCION.map((titulo, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {titulo}</div>
              <div className="grid grid-cols-2 gap-2.5">
                <Lista label="¿Se impartió?" value={d.temas[i].impartido} onChange={(v) => actualizarTema(i, "impartido", v)} opciones={SI_NO} />
                <Campo label="Observaciones" value={d.temas[i].observacion} onChange={(v) => actualizarTema(i, "observacion", v)} />
              </div>
            </div>
          ))}
        </Seccion>

        {/* 5. EVALUACIÓN */}
        <Seccion id="evaluacion" titulo="5. Evaluación de comprensión" subtitulo="Nota del trabajador y reinducción" abierta={abierta === "evaluacion"} onToggle={alternar} contador={d.calificacion ? 1 : 0}>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Calificación (0 a 100)" value={d.calificacion} inputMode="numeric" onChange={(v) => set("calificacion", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Nota mínima" value={d.notaMinima} inputMode="numeric" onChange={(v) => set("notaMinima", v.replace(/[^0-9]/g, ""))} />
            </div>
            {resultado && (
              <div className="text-[12px] font-semibold" style={{ color: resultado === "Aprobó" ? "#1D6B3A" : "#B3401F" }}>Resultado: {resultado}</div>
            )}
            <Campo label="Reinducción prevista" type="date" value={d.reinduccion} onChange={(v) => set("reinduccion", v)} />
          </div>
        </Seccion>

        {/* 6. FIRMAS (el compromiso del trabajador viene impreso en el formato) */}
        <Seccion id="firmas" titulo="6. Firmas" subtitulo="El compromiso del trabajador ya viene impreso en el formato" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Trabajador</div>
            <div className="text-[12px] px-2.5 py-2 rounded-lg" style={{ background: PAPER, color: NAVY }}>
              {d.nombre || <span style={{ color: "#8A8F99" }}>— sin nombre (se llena en "Datos del trabajador") —</span>}
              {d.documento ? <span style={{ color: "#8A8F99" }}> · Doc. {d.documento}</span> : null}
            </div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Inductor / facilitador</div>
            <BloqueProfesional memoria={memoria} etqNombre="Inductor (nombre)" etqCargo="Cargo del inductor" nombre={d.inductorNombre} cargo={d.inductorCargo} onChange={cambiarPersona("inductorNombre", "inductorCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable SST / Residente (Vo.Bo.)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre" etqCargo="Cargo" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={otroTrabajador} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➕ Otro trabajador (conserva los datos de la inducción)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la inducción" onGenerar={generarExcel} />
    </div>
  );
}
