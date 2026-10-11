import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion, fechaDDMMYYYY } from "./sstBase";
import {
  CODIGO_PERMISOS, HOJA_PERMISOS, CELDAS_PERMISOS, OPCIONES_PERMISO, SITUACIONES, AUTORIDADES, MAX_PERMISOS, COLORES_ESTADO_PERMISO,
  descubrirPermisos, escribirPermisosEnHoja, validarPermisos, camposFaltantesPermisos, resumenPermisos, avisosPermisos, estadoPermiso, diasParaVencer, conteoPermisos,
  permisoNuevo, permisosConDatos, permisosDeFicha, nombreDePermiso,
} from "./permisosAmbDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_PERMISOS, CLAVE_AMB_PERMISOS_DATOS, CLAVE_AMB_FICHA, TraerDeFichaAmb } from "./ambComunes";
import AvisosAmb from "./AvisosAmb";

const CLAVE_BORRADOR = "ryr_borrador_permisos_amb";

function datosIniciales() {
  return { proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), responsable: "", responsableCargo: "Responsable ambiental", permisos: [], observaciones: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "" };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.responsable || d.observaciones || d.permisos.length || d.revisoNombre || d.voboNombre);

export default function FormularioPermisosAmb({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCarga, setAvisoCarga] = useState("");
  const [avisoPermisos, setAvisoPermisos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const actualizar = (i, patch) => setD((cur) => ({ ...cur, permisos: cur.permisos.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));

  const guardadas = leerJSON(CLAVE_AMB_PERMISOS_DATOS, []);
  function cargarGuardada(nombre) {
    const g = guardadas.find((x) => x.datos && x.datos.proyecto === nombre); if (!g) return;
    setD({ ...datosIniciales(), ...g.datos, fecha: fechaHoyISO(), permisos: (g.datos.permisos || []).map((p) => permisoNuevo(p)) });
    setAvisoCarga(`Se cargó el registro de «${nombre}» con la fecha de hoy. Actualiza lo que cambió y vuelve a generar.`);
  }
  // Trae los permisos que la Ficha Ambiental ya tiene para esta obra (sin repetir los que ya están)
  function traerDeFicha() {
    const ficha = leerJSON(CLAVE_AMB_FICHA, []).find((f) => String(f.proyecto || "").trim().toLowerCase() === String(d.proyecto || "").trim().toLowerCase());
    if (!ficha) { setAvisoPermisos("Primero escribe o trae el nombre de la obra, y que su Ficha Ambiental esté guardada."); return; }
    const nuevos = permisosDeFicha(ficha).filter((n) => !d.permisos.some((p) => nombreDePermiso(p) === nombreDePermiso(n)));
    if (!nuevos.length) { setAvisoPermisos("La Ficha Ambiental de esta obra no trae permisos nuevos."); return; }
    setD((cur) => ({ ...cur, permisos: [...cur.permisos, ...nuevos].slice(0, MAX_PERMISOS) })); setAvisoPermisos(`Se trajeron ${nuevos.length} ${nuevos.length === 1 ? "permiso" : "permisos"} de la Ficha Ambiental. Completa la autoridad y las obligaciones.`);
  }
  function agregar() {
    if (d.permisos.length >= MAX_PERMISOS) { setAvisoPermisos(`Esta hoja tiene espacio para ${MAX_PERMISOS} permisos.`); return; }
    setAvisoPermisos(""); set("permisos", [...d.permisos, permisoNuevo()]);
  }

  const avisos = avisosPermisos(d);
  const c = conteoPermisos(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPermisos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesPermisos(d)); return; }
    limpiarFaltantes(); setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-registro-permisos-amb.xlsx", HOJA_PERMISOS);
      const avs = [];
      const decision = decidirDistribucion(descubrirPermisos(ws), CELDAS_PERMISOS);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.permisos && decision.celdas.tablas.permisos.n) || MAX_PERMISOS;
      if (permisosConDatos(d).length > capac) throw new Error(`la plantilla tiene espacio para ${capac} permisos y hay ${permisosConDatos(d).length}`);
      escribirPermisosEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Registro_Permisos_Ambientales_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.responsable, d.responsableCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenPermisos(d);
      guardarJSON(CLAVE_AMB_PERMISOS, [res, ...leerJSON(CLAVE_AMB_PERMISOS, []).filter((x) => x.id !== res.id)].slice(0, 60));
      guardarJSON(CLAVE_AMB_PERMISOS_DATOS, [{ id: res.id, datos: d }, ...leerJSON(CLAVE_AMB_PERMISOS_DATOS, []).filter((x) => x.id !== res.id)].slice(0, 60));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${c.total} ${c.total === 1 ? "permiso" : "permisos"}: ${c.Vigente} vigentes, ${c["Por vencer"]} por vencer, ${c.Vencido} vencidos).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian los datos de pantalla (los registros ya guardados no se borran).")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoCarga(""); setAvisoPermisos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  if (borrador.borradorDisponible) return <PantallaBorrador cual="un registro de permisos ambientales" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Registro de Permisos Ambientales" subtitulo={`${CODIGO_PERMISOS} · Permisos, licencias y sus vencimientos`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <div className="pt-3"><AvisosAmb avisos={avisos} /></div>

        <Seccion id="datos" titulo="1. Datos del registro" subtitulo={d.proyecto || "Obra y responsable"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            {guardadas.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
                <Lista label="📂 Actualizar el registro de una obra guardada" value="" onChange={cargarGuardada} opciones={guardadas.map((g) => g.datos && g.datos.proyecto).filter(Boolean)} />
                {avisoCarga && <div className="text-[11px] mt-1.5" style={{ color: "#2E7D4F" }}>{avisoCarga}</div>}
              </div>
            )}
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Fecha de corte" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable" etqCargo="Cargo del responsable" nombre={d.responsable} cargo={d.responsableCargo} onChange={cambiarPersona("responsable", "responsableCargo")} />
          </div>
        </Seccion>

        <Seccion id="permisos" titulo="2. Permisos y autorizaciones" subtitulo={`${c.total} de ${MAX_PERMISOS}${c.Vencido ? ` · ${c.Vencido} vencido${c.Vencido === 1 ? "" : "s"}` : ""}${c["Por vencer"] ? ` · ${c["Por vencer"]} por vencer` : ""}`} abierta={abierta === "permisos"} onToggle={alternar} contador={c.total}>
          <button type="button" data-traer-ficha onClick={traerDeFicha} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg mb-2.5" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>📋 Traer los permisos de la Ficha Ambiental</button>
          {d.permisos.map((p, i) => {
            const e = estadoPermiso(p); const dias = diasParaVencer(p); const col = COLORES_ESTADO_PERMISO[e];
            return (
              <div key={i} data-permiso={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</div>
                  {e && col && <div data-estado-permiso={e} className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#" + col.relleno, color: "#" + col.fuente }}>{e}{(e === "Por vencer" || e === "Vigente") && dias !== null ? ` · ${dias} d` : ""}{e === "Vencido" && dias !== null ? ` · hace ${-dias} d` : ""}</div>}
                </div>
                <div className="space-y-2">
                  <Lista label={`Permiso o autorización ${i + 1}`} value={p.nombre} onChange={(v) => actualizar(i, { nombre: v })} opciones={OPCIONES_PERMISO} />
                  {/^Otro/.test(p.nombre) && <Campo label={`Nombre del permiso ${i + 1}`} value={p.otro} placeholder="¿Cuál permiso?" onChange={(v) => actualizar(i, { otro: v })} />}
                  <ChipsOpcion label="Situación" nombre={`Situación ${i + 1}`} value={p.situacion} opciones={SITUACIONES} pequeno sinMarca onChange={(v) => actualizar(i, { situacion: v })} />
                  <Campo label={`Autoridad ${i + 1}`} value={p.autoridad} lista={AUTORIDADES} placeholder="Ej. CAR, Secretaría de Ambiente" onChange={(v) => actualizar(i, { autoridad: v })} />
                  <Campo label={`Resolución N° ${i + 1}`} value={p.resolucion} onChange={(v) => actualizar(i, { resolucion: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label={`Expedición ${i + 1}`} type="date" value={p.expedicion} onChange={(v) => actualizar(i, { expedicion: v })} />
                    <Campo label={`Vigente hasta ${i + 1}`} type="date" value={p.vigencia} onChange={(v) => actualizar(i, { vigencia: v })} />
                  </div>
                  <AreaTexto label={`Obligaciones o condiciones ${i + 1}`} value={p.obligaciones} onChange={(v) => actualizar(i, { obligaciones: v })} filas={3} placeholder="Ej. Informe semestral a la CAR; compensar 3 árboles por cada tala" />
                </div>
                <button type="button" onClick={() => { set("permisos", d.permisos.filter((_, k) => k !== i)); setAvisoPermisos(""); }} aria-label={`Quitar permiso ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
              </div>
            );
          })}
          <button type="button" data-agregar-permiso onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar permiso</button>
          {avisoPermisos && <div className="text-[11.5px] mt-2" style={{ color: "#7A5A00" }}>{avisoPermisos}</div>}
        </Seccion>

        <Seccion id="firmas" titulo="3. Observaciones y firmas" subtitulo="Firma el responsable ambiental; revisa el residente; Vo.Bo. gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones generales" value={d.observaciones} onChange={(v) => set("observaciones", v)} />
            <div className="text-[11px]" style={{ color: NAVY }}>Firma el responsable ({d.responsable || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del residente" etqCargo="Cargo del residente" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. (gerencia / interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>
        <div className="pt-5"><button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button></div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del registro" onGenerar={generarExcel} />
    </div>
  );
}
