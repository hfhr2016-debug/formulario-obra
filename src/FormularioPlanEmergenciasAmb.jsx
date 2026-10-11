import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_PLAN_EMERG, HOJA_PLAN_EMERG, CELDAS_PLAN_EMERG, SI_NO, ESCENARIOS, RECURSOS, ESTADOS_RECURSO, COLORES_RECURSO, ROLES_BRIGADA, ENTIDADES, MAX_SIMULACROS,
  descubrirPlanEmerg, escribirPlanEmergEnHoja, validarPlanEmerg, camposFaltantesPlanEmerg, resumenPlanEmerg, avisosPlan, revisionSugerida,
  escenarioNuevo, recursoNuevo, brigadistaNuevo, entidadNueva, simulacroNuevo, simulacrosConDatos, escenariosQueAplican,
} from "./planEmergenciasAmbDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_PLAN_EMERG, CLAVE_AMB_PLAN_EMERG_DATOS, TraerDeFichaAmb } from "./ambComunes";
import AvisosAmb from "./AvisosAmb";

const CLAVE_BORRADOR = "ryr_borrador_plan_emergencias_amb";

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", responsable: "", responsableCargo: "Responsable ambiental", version: "1", fecha: fechaHoyISO(), ultimaRevision: "", proximaRevision: "",
    cuerpoAgua: "", distancia: "", alcantarilla: "", vecinos: "", zonaProtegida: "", centroSalud: "", telefonoCentro: "", puntoEncuentro: "", acceso: "",
    escenarios: ESCENARIOS.map(escenarioNuevo), recursos: RECURSOS.map(recursoNuevo), brigada: ROLES_BRIGADA.map(brigadistaNuevo), entidades: ENTIDADES.map((_, i) => entidadNueva(i)), simulacros: [],
    observaciones: "", residenteNombre: "", residenteCargo: "", aproboNombre: "", aproboCargo: "",
  };
}
const normalizar = (g) => {
  const b = datosIniciales();
  return { ...b, ...g, escenarios: ESCENARIOS.map((_, i) => ({ ...escenarioNuevo(), ...((g.escenarios || [])[i] || {}) })), recursos: RECURSOS.map((_, i) => ({ ...recursoNuevo(), ...((g.recursos || [])[i] || {}) })),
    brigada: ROLES_BRIGADA.map((_, i) => ({ ...brigadistaNuevo(), ...((g.brigada || [])[i] || {}) })), entidades: ENTIDADES.map((_, i) => ({ ...entidadNueva(i), ...((g.entidades || [])[i] || {}) })), simulacros: g.simulacros || [] };
};
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.responsable || d.cuerpoAgua || d.vecinos || d.centroSalud || d.puntoEncuentro || d.observaciones || d.simulacros.length ||
  d.escenarios.some((x) => x.aplica || x.accion || x.donde) || d.recursos.some((x) => x.estado || x.cantidad) || d.brigada.some((x) => x.nombre));

export default function FormularioPlanEmergenciasAmb({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCarga, setAvisoCarga] = useState("");
  const [avisoSim, setAvisoSim] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const act = (campo) => (i, patch) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const actEsc = act("escenarios"), actRec = act("recursos"), actBri = act("brigada"), actEnt = act("entidades"), actSim = act("simulacros");

  const guardadas = leerJSON(CLAVE_AMB_PLAN_EMERG_DATOS, []);
  function cargarGuardada(nombre) {
    const g = guardadas.find((x) => x.datos && x.datos.proyecto === nombre); if (!g) return;
    setD(normalizar(g.datos)); setAvisoCarga(`Se cargó el plan de «${nombre}». Corrige lo que cambió y vuelve a generar.`);
  }
  const avisos = avisosPlan(d);
  const aplican = escenariosQueAplican(d).length;
  const sims = simulacrosConDatos(d);

  function agregarSim() {
    if (d.simulacros.length >= MAX_SIMULACROS) { setAvisoSim(`Esta hoja tiene espacio para ${MAX_SIMULACROS} simulacros. Anota los más recientes.`); return; }
    setAvisoSim(""); set("simulacros", [...d.simulacros, simulacroNuevo({ fecha: fechaHoyISO() })]);
  }

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPlanEmerg(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesPlanEmerg(d)); return; }
    limpiarFaltantes(); setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-plan-emergencias-amb.xlsx", HOJA_PLAN_EMERG);
      const avs = [];
      const decision = decidirDistribucion(descubrirPlanEmerg(ws), CELDAS_PLAN_EMERG);
      if (decision.aviso) avs.push(decision.aviso);
      escribirPlanEmergEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Plan_Emergencias_Ambientales_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.responsable, d.responsableCargo], [d.residenteNombre, d.residenteCargo], [d.aproboNombre, d.aproboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenPlanEmerg(d);
      guardarJSON(CLAVE_AMB_PLAN_EMERG, [res, ...leerJSON(CLAVE_AMB_PLAN_EMERG, []).filter((x) => x.id !== res.id)].slice(0, 60));
      guardarJSON(CLAVE_AMB_PLAN_EMERG_DATOS, [{ id: res.id, datos: d }, ...leerJSON(CLAVE_AMB_PLAN_EMERG_DATOS, []).filter((x) => x.id !== res.id)].slice(0, 60));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (plan de «${d.proyecto}»: ${aplican} ${aplican === 1 ? "escenario" : "escenarios"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian los datos de pantalla (los planes ya guardados no se borran).")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoCarga(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  if (borrador.borradorDisponible) return <PantallaBorrador cual="un plan de emergencias ambientales" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  const caja = { borderColor: LINE, background: PAPER };
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Plan de Emergencias Ambientales" subtitulo={`${CODIGO_PLAN_EMERG} · Qué hacer si hay un derrame, incendio o vertimiento`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <div className="pt-3"><AvisosAmb avisos={avisos} onAccion={(a) => a === "revision" && set("proximaRevision", revisionSugerida(d))} /></div>

        <Seccion id="datos" titulo="1. Datos del plan" subtitulo={d.proyecto || "Obra, responsable y revisión"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            {guardadas.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
                <Lista label="📂 Volver a editar el plan de una obra guardada" value="" onChange={cargarGuardada} opciones={guardadas.map((g) => g.datos && g.datos.proyecto).filter(Boolean)} />
                {avisoCarga && <div className="text-[11px] mt-1.5" style={{ color: "#2E7D4F" }}>{avisoCarga}</div>}
              </div>
            )}
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable" etqCargo="Cargo del responsable" nombre={d.responsable} cargo={d.responsableCargo} onChange={cambiarPersona("responsable", "responsableCargo")} />
            <Campo label="Versión del plan" value={d.version} onChange={(v) => set("version", v)} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha de elaboración" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="Última revisión" type="date" value={d.ultimaRevision} onChange={(v) => set("ultimaRevision", v)} />
            </div>
            <Campo label="Próxima revisión" type="date" value={d.proximaRevision} onChange={(v) => set("proximaRevision", v)} />
          </div>
        </Seccion>

        <Seccion id="entorno" titulo="2. Entorno y puntos sensibles" subtitulo={d.cuerpoAgua ? `Agua cercana: ${d.cuerpoAgua}` : "Agua, vecinos y salud"} abierta={abierta === "entorno"} onToggle={alternar}>
          <div className="space-y-2.5">
            <Campo label="Cuerpo de agua más cercano" value={d.cuerpoAgua} placeholder="Ej. Quebrada La Seca, río Bogotá" onChange={(v) => set("cuerpoAgua", v)} />
            <Campo label="Distancia (m)" value={d.distancia} inputMode="numeric" onChange={(v) => set("distancia", v.replace(/[^0-9.,]/g, ""))} />
            <ChipsOpcion label="¿Alcantarilla o sumidero cerca?" nombre="Alcantarilla o sumidero cerca" value={d.alcantarilla} opciones={SI_NO} pequeno onChange={(v) => set("alcantarilla", v)} />
            <ChipsOpcion label="¿Zona protegida cerca?" nombre="Zona protegida cerca" value={d.zonaProtegida} opciones={SI_NO} pequeno onChange={(v) => set("zonaProtegida", v)} />
            <Campo label="Vecinos sensibles" value={d.vecinos} placeholder="Ej. Colegio a 80 m, clínica en la esquina" onChange={(v) => set("vecinos", v)} />
            <Campo label="Centro de salud más cercano" value={d.centroSalud} onChange={(v) => set("centroSalud", v)} />
            <Campo label="Teléfono del centro" value={d.telefonoCentro} inputMode="tel" onChange={(v) => set("telefonoCentro", v)} />
            <Campo label="Punto de encuentro" value={d.puntoEncuentro} onChange={(v) => set("puntoEncuentro", v)} />
            <Campo label="Acceso para ambulancia y bomberos" value={d.acceso} onChange={(v) => set("acceso", v)} />
          </div>
        </Seccion>

        <Seccion id="escenarios" titulo="3. Escenarios de emergencia" subtitulo={`${aplican} de ${ESCENARIOS.length} aplican a la obra`} abierta={abierta === "escenarios"} onToggle={alternar} contador={aplican}>
          {ESCENARIOS.map((e, i) => {
            const x = d.escenarios[i];
            return (
              <div key={i} data-escenario={i} className="border rounded-lg p-2.5 mb-2.5" style={caja}>
                <div className="text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {e.nombre}</div>
                <ChipsOpcion label="¿Aplica a esta obra?" nombre={`Aplica ${i + 1}`} value={x.aplica} opciones={SI_NO} pequeno colores={{ "Sí": "#2E7D4F", No: "#8A8F99" }} sinMarca onChange={(v) => actEsc(i, { aplica: v })} />
                {x.aplica === "Sí" && (
                  <div className="space-y-2 mt-2">
                    {/^Otro/.test(e.nombre) && <Campo label={`Escenario «Otro» ${i + 1}`} value={x.otro} placeholder="¿Cuál?" onChange={(v) => actEsc(i, { otro: v })} />}
                    <Campo label={`Dónde puede ocurrir ${i + 1}`} value={x.donde} placeholder="Ej. Zona de combustibles, planta de concreto" onChange={(v) => actEsc(i, { donde: v })} />
                    <AreaTexto label={`Qué hacer ${i + 1}`} value={x.accion} onChange={(v) => actEsc(i, { accion: v })} filas={4} placeholder="Pasos para atender el evento" />
                    {e.accion && x.accion !== e.accion && <button type="button" data-usar-sugerida={i} onClick={() => actEsc(i, { accion: e.accion })} className="text-[11.5px] underline font-semibold" style={{ color: NAVY }}>Usar la acción sugerida</button>}
                    <Campo label={`Responsable ${i + 1}`} value={x.responsable} placeholder="Quién responde (cargo o nombre)" onChange={(v) => actEsc(i, { responsable: v })} />
                  </div>
                )}
              </div>
            );
          })}
        </Seccion>

        <Seccion id="recursos" titulo="4. Recursos para atender" subtitulo={`${d.recursos.filter((r) => r.estado).length} de ${RECURSOS.length} revisados`} abierta={abierta === "recursos"} onToggle={alternar}>
          {RECURSOS.map((r, i) => {
            const x = d.recursos[i];
            return (
              <div key={i} data-recurso={i} className="border rounded-lg p-2.5 mb-2.5" style={caja}>
                <div className="text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>{r}</div>
                <div className="space-y-2">
                  {/^Otro/.test(r) && <Campo label={`Recurso «Otro» ${i + 1}`} value={x.otro} placeholder="¿Cuál?" onChange={(v) => actRec(i, { otro: v })} />}
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label={`Cantidad ${i + 1}`} value={x.cantidad} inputMode="numeric" onChange={(v) => actRec(i, { cantidad: v.replace(/[^0-9]/g, "") })} />
                    <Campo label={`Última revisión ${i + 1}`} type="date" value={x.revision} onChange={(v) => actRec(i, { revision: v })} />
                  </div>
                  <Campo label={`Ubicación ${i + 1}`} value={x.ubicacion} onChange={(v) => actRec(i, { ubicacion: v })} />
                  <ChipsOpcion label="Estado" nombre={`Estado del recurso ${i + 1}`} value={x.estado} opciones={ESTADOS_RECURSO} pequeno sinMarca colores={{ Bueno: "#2E7D4F", "Requiere reposición": "#B8860B", "No hay": "#B3401F" }} onChange={(v) => actRec(i, { estado: v })} />
                </div>
              </div>
            );
          })}
        </Seccion>

        <Seccion id="brigada" titulo="5. Brigada y contactos" subtitulo={d.brigada[0].nombre ? `Jefe: ${d.brigada[0].nombre}` : "Quién responde y a quién llamar"} abierta={abierta === "brigada"} onToggle={alternar}>
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Brigada de la obra</div>
          {ROLES_BRIGADA.map((r, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5" style={caja}>
              <div className="text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>{r}</div>
              <div className="space-y-2">
                <Campo label={`Nombre ${r}`} value={d.brigada[i].nombre} onChange={(v) => actBri(i, { nombre: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label={`Teléfono ${r}`} value={d.brigada[i].telefono} inputMode="tel" onChange={(v) => actBri(i, { telefono: v })} />
                  <Campo label={`Suplente ${r}`} value={d.brigada[i].suplente} onChange={(v) => actBri(i, { suplente: v })} />
                </div>
              </div>
            </div>
          ))}
          <div className="text-[11px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Entidades externas</div>
          {ENTIDADES.map((e, i) => (
            <div key={i} className="mb-2">
              <Campo label={`Teléfono ${e.nombre}`} value={d.entidades[i].telefono} inputMode="tel" onChange={(v) => actEnt(i, { telefono: v })} />
              <div className="text-[10.5px] mt-0.5" style={{ color: "#8A8F99" }}>{e.cuando}</div>
            </div>
          ))}
        </Seccion>

        <Seccion id="simulacros" titulo="6. Simulacros y prácticas" subtitulo={`${sims.length} ${sims.length === 1 ? "registrado" : "registrados"}`} abierta={abierta === "simulacros"} onToggle={alternar} contador={sims.length}>
          {d.simulacros.map((s, i) => (
            <div key={i} data-simulacro={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={caja}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label={`Fecha del simulacro ${i + 1}`} type="date" value={s.fecha} onChange={(v) => actSim(i, { fecha: v })} />
                  <Campo label={`Participantes ${i + 1}`} value={s.participantes} inputMode="numeric" onChange={(v) => actSim(i, { participantes: v.replace(/[^0-9]/g, "") })} />
                </div>
                <Lista label={`Escenario practicado ${i + 1}`} value={s.escenario} onChange={(v) => actSim(i, { escenario: v })} opciones={ESCENARIOS.filter((e) => !/^Otro/.test(e.nombre)).map((e) => e.nombre)} />
                <AreaTexto label={`Resultado y mejoras ${i + 1}`} value={s.resultado} onChange={(v) => actSim(i, { resultado: v })} filas={3} placeholder="Qué salió bien, qué falló y qué se mejora" />
              </div>
              <button type="button" onClick={() => { set("simulacros", d.simulacros.filter((_, k) => k !== i)); setAvisoSim(""); }} aria-label={`Quitar simulacro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" data-agregar-simulacro onClick={agregarSim} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar simulacro</button>
          {avisoSim && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoSim}</div>}
        </Seccion>

        <Seccion id="firmas" titulo="7. Observaciones y firmas" subtitulo="Firma el responsable ambiental; revisa el residente; aprueba el director" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones generales" value={d.observaciones} onChange={(v) => set("observaciones", v)} />
            <div className="text-[11px]" style={{ color: NAVY }}>Firma el responsable del plan ({d.responsable || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del residente" etqCargo="Cargo del residente" nombre={d.residenteNombre} cargo={d.residenteCargo} onChange={cambiarPersona("residenteNombre", "residenteCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Aprueba (director de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien aprueba" etqCargo="Cargo de quien aprueba" nombre={d.aproboNombre} cargo={d.aproboCargo} onChange={cambiarPersona("aproboNombre", "aproboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del plan" onGenerar={generarExcel} />
    </div>
  );
}
