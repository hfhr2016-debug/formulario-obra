import { useState } from "react";
import {
  CODIGO_ACTOS, HOJA_ACTOS, CELDAS_ACTOS, ACTOS_INSEGUROS, CONDICIONES_INSEGURAS, PROBABILIDADES, SEVERIDADES, CORREGIDO,
  descubrirActos, escribirActosEnHoja, validarActos, resumenActos, nivelDeRiesgo, tipoDeReporte,
} from "./actosDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha, GrillaOpciones, CasillaFoto, fotoVacia, agregarFotosARecuadros } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_actos_condiciones";
const CLAVE_CONSECUTIVO = "ryr_sst_actos_consecutivo";
const CLAVE_REPORTES = "ryr_sst_reportes_actos";          // resumen de cada reporte generado (alimenta las acciones correctivas)
const COLOR_NIVEL = { Alto: "#B3401F", Medio: "#C98A00", Bajo: "#2E7D4F" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: "", hora: "", nReporte: "", lugar: "",
    reportaNombre: "", reportaCargo: "",
    actos: [], condiciones: [], otros: {},
    observado: "", consecuencia: "", involucrados: "", probabilidad: "", severidad: "",
    accionInmediata: "", recomendacion: "", responsableCorreccion: "", fechaCompromiso: "",
    corregido: "", fechaCierre: "", verificaNombre: "", verificaCargo: "", obsCierre: "", recibeNombre: "", recibeCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.fecha || d.hora || d.nReporte || d.lugar || d.reportaNombre || d.actos.length || d.condiciones.length || d.observado ||
    d.consecuencia || d.accionInmediata || d.recomendacion || d.responsableCorreccion || d.corregido || d.recibeNombre);
}

export default function FormularioActosCondiciones({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [fotos, setFotos] = useState(() => [fotoVacia(), fotoVacia()]);   // 0 = antes, 1 = después (las fotos no se guardan en el borrador)
  const [abierta, setAbierta] = useState("datos");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  const alternarMarca = (campo) => (base) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(base) ? cur[campo].filter((t) => t !== base) : [...cur[campo], base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));
  function elegirReportante(o) {
    const t = trabajadores.buscar(o.texto);
    setD((cur) => ({ ...cur, reportaNombre: t ? t.nombre : o.texto, reportaCargo: cur.reportaCargo || (t && t.cargo) || "" }));
  }

  const actualizarFoto = (i, nueva) => setFotos((cur) => cur.map((f, k) => (k === i ? nueva : f)));
  const quitarFoto = (i) => actualizarFoto(i, fotoVacia());

  const tipo = tipoDeReporte(d);
  const nivel = nivelDeRiesgo(d.probabilidad, d.severidad);
  const marcados = d.actos.length + d.condiciones.length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarActos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-actos-condiciones.xlsx", HOJA_ACTOS);
      let celdas = CELDAS_ACTOS;
      const avisos = [];
      const lectura = descubrirActos(ws);
      const decision = decidirDistribucion(lectura, CELDAS_ACTOS);   // si el formato de la plantilla no coincide con la app, se detiene
      celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nReporte && String(d.nReporte).trim() ? String(d.nReporte).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const sinMarcar = escribirActosEnHoja(ws, { ...d, nReporte: nUsar, verifico: d.verificaNombre }, celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      // Cada foto va en SU recuadro de la plantilla (anclada a las celdas: no se sale aunque cambien los tamaños de fila)
      const sinRecuadro = await agregarFotosARecuadros(workbook, ws, fotos, celdas.fotos && celdas.fotos.fotos);
      if (sinRecuadro) avisos.push(`La plantilla no tiene recuadro para ${sinRecuadro} de las fotos y no se incluyó${sinRecuadro > 1 ? "eron" : ""}.`);
      setAvisoGeneracion(avisos.join(" "));
      const nFotos = fotos.filter((f) => f.file).length - sinRecuadro;
      await descargarLibro(workbook, `Reporte_${d.fecha}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(tipo || "acto-condicion", 20)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar([{ nombre: d.reportaNombre, cargo: d.reportaCargo, empresa: d.contratista }]);
      memoria.recordarUso({ personas: [[d.recibeNombre, d.recibeCargo], [d.verificaNombre, d.verificaCargo]], cargosObra: [d.reportaCargo], empresasUsadas: [d.contratista] });
      const res = resumenActos({ ...d, nReporte: nUsar });
      guardarJSON(CLAVE_REPORTES, [res, ...leerJSON(CLAVE_REPORTES, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nReporte: nUsar }));
      setGenerado(`✓ Excel descargado (reporte N° ${nUsar}: ${tipo.toLowerCase()}${nivel ? `, riesgo ${nivel.toLowerCase()}` : ""}${nFotos > 0 ? `, ${nFotos} ${nFotos === 1 ? "foto" : "fotos"}` : ""}). Imprímelo para las firmas.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo reporte: conserva la obra, quien reporta y a quien se entrega; limpia lo propio de cada hallazgo (el N° avanza solo)
  function nuevoReporte() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fecha: cur.fecha,
      reportaNombre: cur.reportaNombre, reportaCargo: cur.reportaCargo, recibeNombre: cur.recibeNombre, recibeCargo: cur.recibeCargo,
    }));
    setFotos([fotoVacia(), fotoVacia()]);
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un reporte en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setFotos([fotoVacia(), fotoVacia()]); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un reporte de actos y condiciones" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="ACTOS Y CONDICIONES INSEGURAS" subtitulo={`${CODIGO_ACTOS} · Reportar a tiempo evita accidentes`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del reporte" subtitulo="Dónde, cuándo y quién reporta" abierta={abierta === "datos"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <CampoFecha label="Fecha del hallazgo" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="N° de reporte" value={d.nReporte} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nReporte", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            </div>
            <SelectorHora label="Hora del hallazgo" value={d.hora} onChange={(v) => set("hora", v)} />
            <Campo label="Lugar exacto del hallazgo" value={d.lugar} onChange={(v) => set("lugar", v)} placeholder="Ej. Torre A, piso 8, junto al ascensor" />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Quién reporta</div>
            <BuscadorLista label="Nombre de quien reporta" value={d.reportaNombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
              onChange={(v) => set("reportaNombre", v)} onElegir={elegirReportante} />
            <BuscadorLista label="Cargo / oficio de quien reporta" value={d.reportaCargo} onChange={(v) => set("reportaCargo", v)} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
          </div>
        </Seccion>

        {/* 2. CLASIFICACIÓN */}
        <Seccion id="clasificacion" titulo="2. Clasificación" subtitulo={marcados ? `${tipo} · ${marcados} ${marcados === 1 ? "marcado" : "marcados"}` : "Marca lo que corresponda"} abierta={abierta === "clasificacion"} onToggle={alternar} contador={marcados}>
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Actos inseguros (lo que hace una persona)</div>
          <GrillaOpciones nombre="Actos inseguros" opciones={ACTOS_INSEGUROS} marcadas={d.actos} onAlternar={alternarMarca("actos")} otros={d.otros} onOtro={cambiarOtro} />
          <div className="text-[11px] font-semibold mt-3 mb-1.5" style={{ color: NAVY }}>Condiciones inseguras (lo que hay en el entorno)</div>
          <GrillaOpciones nombre="Condiciones inseguras" opciones={CONDICIONES_INSEGURAS} marcadas={d.condiciones} onAlternar={alternarMarca("condiciones")} otros={d.otros} onOtro={cambiarOtro} />
          {tipo && <div className="text-[11px] mt-3 font-semibold" style={{ color: NAVY }}>Tipo de reporte: {tipo}</div>}
        </Seccion>

        {/* 3. DESCRIPCIÓN */}
        <Seccion id="descripcion" titulo="3. Descripción del hallazgo" subtitulo={nivel ? `Riesgo ${nivel.toLowerCase()}` : "Qué se observó y qué tan grave es"} abierta={abierta === "descripcion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="¿Qué se observó?" value={d.observado} onChange={(v) => set("observado", v)} filas={3} placeholder="Describe con claridad qué pasó o qué encontraste" />
            <AreaTexto label="Posible consecuencia" value={d.consecuencia} onChange={(v) => set("consecuencia", v)} filas={2} placeholder="Qué podría pasar si no se corrige" />
            <Campo label="Persona(s) involucrada(s) (opcional)" value={d.involucrados} onChange={(v) => set("involucrados", v)} />
            <ChipsOpcion label="Probabilidad de que ocurra" nombre="Probabilidad" value={d.probabilidad} opciones={PROBABILIDADES} onChange={(v) => set("probabilidad", v)} />
            <ChipsOpcion label="Severidad si ocurre" nombre="Severidad" value={d.severidad} opciones={SEVERIDADES} onChange={(v) => set("severidad", v)} />
            {nivel && (
              <div className="text-[12px] font-bold px-3 py-1.5 rounded-full text-white inline-block" style={{ background: COLOR_NIVEL[nivel] }}>Nivel de riesgo: {nivel}</div>
            )}
          </div>
        </Seccion>

        {/* 4. ACCIÓN */}
        <Seccion id="accion" titulo="4. Acción inmediata y recomendación" subtitulo="Qué se hizo y qué se propone" abierta={abierta === "accion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Acción inmediata tomada" value={d.accionInmediata} onChange={(v) => set("accionInmediata", v)} filas={2} />
            <AreaTexto label="Recomendación o acción correctiva propuesta" value={d.recomendacion} onChange={(v) => set("recomendacion", v)} filas={2} />
            <Campo label="Responsable de la corrección" value={d.responsableCorreccion} onChange={(v) => set("responsableCorreccion", v)} />
            <CampoFecha label="Fecha compromiso" value={d.fechaCompromiso} onChange={(v) => set("fechaCompromiso", v)} />
          </div>
        </Seccion>

        {/* 5. FOTOS */}
        <Seccion id="fotos" titulo="5. Evidencia fotográfica" subtitulo="Opcional · antes y después" abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.filter((f) => f.file).length}>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>ANTES — el acto o la condición observada</div>
              <CasillaFoto foto={fotos[0]} titulo="Foto del hallazgo (antes)" onChange={(n) => actualizarFoto(0, n)} onRemove={() => quitarFoto(0)} />
            </div>
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>DESPUÉS — ya corregido (cuando aplique)</div>
              <CasillaFoto foto={fotos[1]} titulo="Foto ya corregido (después)" onChange={(n) => actualizarFoto(1, n)} onRemove={() => quitarFoto(1)} />
            </div>
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Las fotos no se guardan en el borrador: si sales sin descargar, hay que volver a subirlas.</div>
          </div>
        </Seccion>

        {/* 6. CIERRE */}
        <Seccion id="cierre" titulo="6. Seguimiento y cierre" subtitulo="Opcional: también se puede llenar a mano al corregir" abierta={abierta === "cierre"} onToggle={alternar}>
          <div className="space-y-2.5">
            <ChipsOpcion label="¿Quedó corregido?" nombre="Corregido" value={d.corregido} opciones={CORREGIDO} onChange={(v) => set("corregido", v)} />
            <CampoFecha label="Fecha de cierre" value={d.fechaCierre} onChange={(v) => set("fechaCierre", v)} />
            <AreaTexto label="Observaciones del cierre" value={d.obsCierre} onChange={(v) => set("obsCierre", v)} filas={2} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Verificó el cierre</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien verificó" etqCargo="Cargo de quien verificó" nombre={d.verificaNombre} cargo={d.verificaCargo} onChange={cambiarPersona("verificaNombre", "verificaCargo")} />
          </div>
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Reporta, recibe y verifica el cierre" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Quien reporta (ya escrito en el paso 1)</div>
            <div className="text-[12px]" style={{ color: "#4B5563" }}>{d.reportaNombre || "Sin nombre todavía"}{d.reportaCargo ? ` · ${d.reportaCargo}` : ""}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Recibe (responsable SST / residente)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien recibe" etqCargo="Cargo de quien recibe" nombre={d.recibeNombre} cargo={d.recibeCargo} onChange={cambiarPersona("recibeNombre", "recibeCargo")} />
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Quien verificó el cierre firma en el tercer recuadro.</div>
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoReporte} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo reporte (conserva la obra y quien reporta)
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
