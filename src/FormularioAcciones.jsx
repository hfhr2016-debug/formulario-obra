import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO } from "./sstBase";
import {
  CODIGO_ACCIONES, HOJA_ACCIONES, CELDAS_ACCIONES, ORIGENES, TIPOS_ACCION, ESTADOS_ACCION, EFICACIAS,
  descubrirAcciones, escribirAccionesEnHoja, validarAcciones, camposFaltantesAcciones, resumenAcciones, accionNueva, accionVacia, accionesConDatos, estadoEfectivo,
  claveAccion, unirSinRepetir, accionesDeInspecciones, accionesDeActos, accionesDeInvestigaciones, accionesDeMatriz, registroMaestro, pendientesDelRegistro,
} from "./accionesDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha } from "./sstControles";
import { TraerDeFicha } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_acciones";
const CLAVE_HOJA = "ryr_sst_acciones_hoja";             // consecutivo de la hoja de seguimiento
const CLAVE_ACCIONES = "ryr_sst_acciones";              // resumen de cada hoja generada (con sus acciones): el registro entre hojas
const CLAVE_INSPECCIONES = "ryr_sst_inspecciones";      // de aquí se traen los hallazgos
const CLAVE_ACTOS = "ryr_sst_reportes_actos";           // de aquí, los reportes de actos y condiciones
const CLAVE_INVESTIGACIONES = "ryr_sst_investigaciones"; // de aquí, el plan de acción de las investigaciones
const CLAVE_MATRIZ = "ryr_sst_matriz";                  // de aquí, los riesgos no aceptables de la matriz de peligros
const MAX_ACCIONES = (CELDAS_ACCIONES.tablas && CELDAS_ACCIONES.tablas.acciones.n) || 10;
const COLOR_ESTADO = { Abierta: "#C98A00", "En proceso": "#1F6FB5", Cerrada: "#2E7D4F" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fechaCorte: "", periodo: "", hoja: "",
    acciones: [accionNueva()],
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.fechaCorte || d.periodo || d.hoja || d.elaboroNombre || d.revisoNombre || d.voboNombre || d.acciones.some((a) => !accionVacia(a)));
}

export default function FormularioAcciones({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoAcciones, setAvisoAcciones] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));

  // ---- Acciones ----
  const setAcciones = (nuevas) => setD((cur) => ({ ...cur, acciones: nuevas }));
  const actualizarAccion = (i, patch) => setAcciones(d.acciones.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const quitarAccion = (i) => { setAcciones(d.acciones.filter((_, k) => k !== i)); setAvisoAcciones(""); };
  function agregarAccion() {
    if (d.acciones.length >= MAX_ACCIONES) { setAvisoAcciones(`Esta hoja tiene espacio para ${MAX_ACCIONES} acciones. Si hay más, genera otra hoja: lo pendiente se arrastra solo.`); return; }
    setAvisoAcciones(""); setAcciones([...d.acciones, accionNueva()]);
  }

  // ---- Traer acciones de los otros formatos ----
  const hojasAnteriores = leerJSON(CLAVE_ACCIONES, []);
  const yaEnHojas = new Set(registroMaestro(hojasAnteriores).map(claveAccion));        // lo que ya está en una hoja generada se trae desde "hojas anteriores", no de la fuente
  const desde = {
    inspecciones: () => accionesDeInspecciones(leerJSON(CLAVE_INSPECCIONES, [])),
    actos: () => accionesDeActos(leerJSON(CLAVE_ACTOS, [])),
    investigaciones: () => accionesDeInvestigaciones(leerJSON(CLAVE_INVESTIGACIONES, [])),
    matriz: () => accionesDeMatriz(leerJSON(CLAVE_MATRIZ, [])),
    anteriores: () => pendientesDelRegistro(hojasAnteriores),
  };
  const disponibles = (fuente) => unirSinRepetir(d.acciones, fuente === "anteriores" ? desde.anteriores() : desde[fuente]().filter((n) => !yaEnHojas.has(claveAccion(n)))).agregadas;
  function traer(fuente, nombre) {
    const nuevas = fuente === "anteriores" ? desde.anteriores() : desde[fuente]().filter((n) => !yaEnHojas.has(claveAccion(n)));
    const { lista, agregadas, repetidas } = unirSinRepetir(d.acciones, nuevas);
    if (!nuevas.length) { setAvisoAcciones(`No hay nada pendiente ${nombre} para traer.`); return; }
    if (!agregadas) { setAvisoAcciones(`Todo lo pendiente ${nombre} ya está en esta hoja.`); return; }
    const cabe = lista.slice(0, MAX_ACCIONES), sobran = lista.length - cabe.length;
    setAcciones(cabe.length ? cabe : [accionNueva()]);
    setAvisoAcciones(`Se ${agregadas === 1 ? "agregó 1 acción" : `agregaron ${agregadas} acciones`} ${nombre}${repetidas ? ` (${repetidas} ya estaban)` : ""}.` +
      (sobran > 0 ? ` Solo cabían ${MAX_ACCIONES} en esta hoja: ${sobran} ${sobran === 1 ? "queda" : "quedan"} para la hoja siguiente.` : ""));
  }
  // Las inspecciones guardadas ANTES de esta versión no guardaron el detalle de sus hallazgos: se avisa para que no parezca que "no está conectado"
  const inspSinDetalle = leerJSON(CLAVE_INSPECCIONES, []).filter((r) => !Array.isArray(r.detalle) && (r.hallazgosAbiertos || 0) > 0);
  const hallazgosSinDetalle = inspSinDetalle.reduce((s, r) => s + (r.hallazgosAbiertos || 0), 0);
  const hayFuentes = leerJSON(CLAVE_INSPECCIONES, []).length + leerJSON(CLAVE_ACTOS, []).length + leerJSON(CLAVE_INVESTIGACIONES, []).length + leerJSON(CLAVE_MATRIZ, []).length + hojasAnteriores.length;
  const botonesTraer = [["inspecciones", "de Inspecciones"], ["actos", "de Actos y Condiciones"], ["investigaciones", "de Investigaciones"], ["matriz", "de la Matriz de Peligros"], ["anteriores", "de hojas anteriores"]];

  const conDatos = accionesConDatos(d);
  const refFecha = d.fechaCorte || fechaHoyISO();
  const vencidas = conDatos.filter((a) => estadoEfectivo(a, refFecha) === "Vencida").length;
  const cerradas = conDatos.filter((a) => a.estado === "Cerrada").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarAcciones(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesAcciones(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-acciones-correctivas.xlsx", HOJA_ACCIONES);
      const avisos = [];
      const lectura = descubrirAcciones(ws);
      const decision = decidirDistribucion(lectura, CELDAS_ACCIONES);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const cap = (celdas.tablas && celdas.tablas.acciones && celdas.tablas.acciones.n) || MAX_ACCIONES;
      if (conDatos.length > cap) throw new Error(`la plantilla tiene espacio para ${cap} acciones y hay ${conDatos.length}`);
      const nUsar = d.hoja && String(d.hoja).trim() ? String(d.hoja).trim() : String(siguienteConsecutivo(CLAVE_HOJA));
      escribirAccionesEnHoja(ws, { ...d, hoja: nUsar }, celdas, fechaHoyISO());
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Acciones_${d.fechaCorte}_Hoja${textoParaArchivo(nUsar, 6)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_HOJA, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo], ...conDatos.map((a) => [a.responsable, a.responsableCargo])], empresasUsadas: [d.contratista] });
      const res = resumenAcciones({ ...d, hoja: nUsar }, fechaHoyISO());
      guardarJSON(CLAVE_ACCIONES, [res, ...leerJSON(CLAVE_ACCIONES, []).filter((x) => x.id !== res.id)].slice(0, 200));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, hoja: nUsar }));
      setGenerado(`✓ Excel descargado (hoja ${nUsar}: ${res.total} ${res.total === 1 ? "acción" : "acciones"}, ${res.cerradas} cerradas, ${res.vencidas} vencidas).` +
        (res.vencidas ? ` ⚠ Hay ${res.vencidas} ${res.vencidas === 1 ? "acción vencida" : "acciones vencidas"}: pasó su fecha compromiso sin cerrarse.` : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva hoja: conserva la obra y las firmas y trae lo que sigue pendiente de las hojas anteriores
  function nuevaHoja() {
    const pend = pendientesDelRegistro(leerJSON(CLAVE_ACCIONES, [])).slice(0, MAX_ACCIONES);
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fechaCorte: cur.fechaCorte, periodo: cur.periodo,
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
      acciones: pend.length ? pend : [accionNueva()],
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion("");
    setAvisoAcciones(pend.length ? `Se trajeron ${pend.length} ${pend.length === 1 ? "acción pendiente" : "acciones pendientes"} de las hojas anteriores.` : "");
    setAbierta("acciones"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una hoja en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoAcciones(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un seguimiento de acciones" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="ACCIONES CORRECTIVAS" subtitulo={`${CODIGO_ACCIONES} · Seguimiento de acciones correctivas, preventivas y de mejora`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del seguimiento" subtitulo="Obra, fecha de corte y periodo" abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, ...{ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion } }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <CampoFecha label="Fecha de corte" value={d.fechaCorte} onChange={(v) => set("fechaCorte", v)} />
            <Campo label="Periodo evaluado" value={d.periodo} placeholder="Ej. Septiembre de 2026" onChange={(v) => set("periodo", v)} />
            <Campo label="Hoja N°" value={d.hoja} placeholder={`Automática (${siguienteConsecutivo(CLAVE_HOJA)})`} inputMode="numeric" onChange={(v) => set("hoja", v.replace(/[^0-9A-Za-z-]/g, ""))} />
          </div>
        </Seccion>

        {/* 2. ACCIONES */}
        <Seccion id="acciones" titulo="2. Registro de acciones" subtitulo={`${conDatos.length} de ${MAX_ACCIONES} acciones${vencidas ? ` · ${vencidas} vencidas` : ""}${cerradas ? ` · ${cerradas} cerradas` : ""}`} abierta={abierta === "acciones"} onToggle={alternar} contador={conDatos.length}>
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Traer lo que está pendiente</div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {botonesTraer.map(([fuente, nombre]) => {
              const n = disponibles(fuente);
              return (
                <button key={fuente} type="button" onClick={() => traer(fuente, nombre)} className="text-center py-2 px-1.5 rounded-lg text-[11.5px] font-semibold border" style={{ borderColor: n ? NAVY : LINE, color: n ? NAVY : "#8A8F99" }}>
                  📥 {nombre.charAt(0).toUpperCase() + nombre.slice(1)}{n ? ` (${n})` : ""}
                </button>
              );
            })}
          </div>
          {!hayFuentes && (
            <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#F2F6FB", color: "#4B5563" }}>
              Todavía no hay nada para traer en este dispositivo. Cuando generes inspecciones, tarjetas iCAI o investigaciones, aquí aparecerá lo que quede pendiente.
            </div>
          )}
          {hallazgosSinDetalle > 0 && (
            <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>
              ℹ Hay {hallazgosSinDetalle} {hallazgosSinDetalle === 1 ? "hallazgo abierto" : "hallazgos abiertos"} en {inspSinDetalle.length} {inspSinDetalle.length === 1 ? "inspección guardada" : "inspecciones guardadas"} antes de esta versión: no se pueden traer porque no guardaron su detalle. Vuelve a generar esas inspecciones, o agrega las acciones a mano.
            </div>
          )}
          {avisoAcciones && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoAcciones}</div>}
          {d.acciones.map((a, i) => {
            const est = estadoEfectivo(a, refFecha);
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: est === "Vencida" ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</div>
                  {!accionVacia(a) && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: est === "Vencida" ? "#B3401F" : COLOR_ESTADO[est] || "#8A8F99" }}>{est}</div>}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Lista label="Origen" value={a.origen} onChange={(v) => actualizarAccion(i, { origen: v })} opciones={ORIGENES} />
                    <Campo label="Referencia (N°)" value={a.ref} onChange={(v) => actualizarAccion(i, { ref: v })} />
                  </div>
                  <Campo label="Fecha de apertura" type="date" value={a.fechaApertura} onChange={(v) => actualizarAccion(i, { fechaApertura: v })} />
                  <AreaTexto label="Hallazgo o causa" value={a.hallazgo} onChange={(v) => actualizarAccion(i, { hallazgo: v })} filas={2} />
                  <Lista label="Tipo de acción" value={a.tipo} onChange={(v) => actualizarAccion(i, { tipo: v })} opciones={TIPOS_ACCION} />
                  <AreaTexto label="Acción a ejecutar" value={a.accion} onChange={(v) => actualizarAccion(i, { accion: v })} filas={2} />
                  <BloqueProfesional memoria={memoria} etqNombre="Responsable" etqCargo="Cargo del responsable" nombre={a.responsable} cargo={a.responsableCargo}
                    onChange={(patch) => actualizarAccion(i, { ...(patch.nombre !== undefined ? { responsable: patch.nombre } : {}), ...(patch.cargo !== undefined ? { responsableCargo: patch.cargo } : {}) })} />
                  <Campo label="Fecha compromiso" type="date" value={a.fechaCompromiso} onChange={(v) => actualizarAccion(i, { fechaCompromiso: v })} />
                  <ChipsOpcion label="Estado" nombre={`Estado ${i + 1}`} value={a.estado} opciones={ESTADOS_ACCION} colores={COLOR_ESTADO} pequeno onChange={(v) => actualizarAccion(i, { estado: v })} />
                  <Campo label="Fecha de cierre (si ya se cerró)" type="date" value={a.fechaCierre} onChange={(v) => actualizarAccion(i, { fechaCierre: v })} />
                  <ChipsOpcion label="Eficacia (al cerrar)" nombre={`Eficacia ${i + 1}`} value={a.eficacia} opciones={EFICACIAS} pequeno onChange={(v) => actualizarAccion(i, { eficacia: v })} />
                </div>
                <button type="button" onClick={() => quitarAccion(i)} aria-label={`Quitar acción ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={agregarAccion} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar acción
          </button>
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Una acción que no esté cerrada y cuya fecha compromiso ya pasó se escribe como "Vencida". Una acción cerrada se verifica: si no resolvió el problema, se marca "No eficaz" y se abre una nueva.</div>
        </Seccion>

        {/* 3. FIRMAS */}
        <Seccion id="firmas" titulo="3. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Visto bueno (gerencia o interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaHoja} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva hoja (trae lo pendiente y conserva la obra)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de las acciones" onGenerar={generarExcel} />
    </div>
  );
}
