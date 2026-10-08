import { useState } from "react";
import {
  CODIGO_ICA, HOJA_ICA, CELDAS_ICA, CONCEPTOS_ICA, ESTADOS_OBLIGACION, ESTADOS_PERMISO, N_OBLIGACIONES, N_PERMISOS, FICHAS_HABITUALES,
  descubrirIca, escribirIcaEnHoja, validarIca, camposFaltantesIca, resumenIca, obligacionNueva, cantidadIcaNueva, permisoIcaNuevo, rellenarIcaDesdeRegistros, promedioCumplimiento,
} from "./icaDatos";
import { FUENTES_AMB, sumarDias } from "./consolidadoAmb";
import {
  NAVY, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, Lista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { CLAVE_AMB_ICA, CLAVE_AMB_FICHA, CLAVE_AMB_FICHA_DATOS, CLAVE_AMB_MENSUALES, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_ica_amb";
const CLAVE_CONSECUTIVO = "ryr_amb_ica_consecutivo";

function datosIniciales() {
  return {
    proyecto: "", titular: "", nit: "", autoridad: "", licencia: "", ubicacion: "", nInforme: "", desde: "", hasta: "", avance: "",
    obligaciones: Array.from({ length: N_OBLIGACIONES }, obligacionNueva), residuos: CONCEPTOS_ICA.map(cantidadIcaNueva), permisos: Array.from({ length: N_PERMISOS }, permisoIcaNuevo),
    incidentes: "", quejas: "", atendidas: "", abiertas: "", cerradas: "", requerimientos: "",
    conclusiones: "", noConformidades: "", anexos: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.titular || d.nit || d.autoridad || d.licencia || d.ubicacion || d.nInforme || d.desde || d.hasta || d.avance || d.incidentes || d.quejas || d.atendidas || d.abiertas || d.cerradas || d.requerimientos ||
    d.conclusiones || d.noConformidades || d.anexos || d.elaboroNombre || d.revisoNombre || d.voboNombre ||
    d.obligaciones.some((o) => o.obligacion || o.medida || o.estado || o.cumplimiento || o.anexo) || d.residuos.some((c) => c.cant || c.acum || c.gestor) || d.permisos.some((p) => p.permiso || p.resolucion || p.vigente || p.estado || p.obs));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");

// Ficha Ambiental de la obra elegida: permisos (resumen) + autoridad y expediente (datos completos)
function fichaDeLaObra(proyecto) {
  const clave = String(proyecto || "").trim().toLowerCase();
  const res = leerJSON(CLAVE_AMB_FICHA, []).find((f) => String(f.proyecto || "").trim().toLowerCase() === clave) || (clave ? null : leerJSON(CLAVE_AMB_FICHA, [])[0]);
  const dat = leerJSON(CLAVE_AMB_FICHA_DATOS, []).find((x) => x.datos && String(x.datos.proyecto || "").trim().toLowerCase() === clave);
  if (!res && !dat) return null;
  return { permisos: res ? res.permisos : [], autoridad: dat ? dat.datos.autoridad : "", resolucion: dat ? dat.datos.resolucion : "" };
}

export default function FormularioIcaAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTraer, setAvisoTraer] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.titular);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const actualizarEn = (grupo) => (i, patch) => setD((cur) => ({ ...cur, [grupo]: cur[grupo].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const actObl = actualizarEn("obligaciones"), actRes = actualizarEn("residuos"), actPer = actualizarEn("permisos");

  function traerRegistrado() {
    if (!d.desde || !d.hasta) { setAvisoTraer("Elige primero las fechas del periodo («Periodo desde» y «Periodo hasta») en «Datos del proyecto y del periodo»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES_AMB).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas } = rellenarIcaDesdeRegistros(d, regs, fichaDeLaObra(d.proyecto), leerJSON(CLAVE_AMB_MENSUALES, []));
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app (y los permisos de la Ficha Ambiental). Lo que ya habías escrito no se tocó; si no hubo registros, la casilla queda en blanco (escribe 0 si de verdad no hubo). Las obligaciones, los gestores y los requerimientos de la autoridad los escribes tú.` : "No hay nada nuevo registrado para ese periodo, o ya estaba todo escrito.");
  }
  function cargarFichas() {
    setD((cur) => {
      let k = 0;
      return { ...cur, obligaciones: cur.obligaciones.map((o) => (String(o.obligacion).trim() === "" && k < FICHAS_HABITUALES.length ? { ...o, obligacion: FICHAS_HABITUALES[k++] } : o)) };
    });
  }

  const evaluadas = d.obligaciones.filter((o) => String(o.obligacion).trim() !== "").length;
  const promedio = promedioCumplimiento(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarIca(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesIca(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-resumen-ica.xlsx", HOJA_ICA);
      const avisos = [];
      const decision = decidirDistribucion(descubrirIca(ws), CELDAS_ICA);
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nInforme && String(d.nInforme).trim() ? String(d.nInforme).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirIcaEnHoja(ws, { ...d, nInforme: nUsar }, decision.celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Resumen_ICA_${d.desde}_${d.hasta}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.titular] });
      const res = resumenIca({ ...d, nInforme: nUsar });
      guardarJSON(CLAVE_AMB_ICA, [res, ...leerJSON(CLAVE_AMB_ICA, []).filter((x) => x.id !== res.id)].slice(0, 30));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInforme: nUsar }));
      setGenerado(`✓ Excel descargado (ICA N° ${nUsar} del ${d.desde} al ${d.hasta}: ${evaluadas} ${evaluadas === 1 ? "obligación evaluada" : "obligaciones evaluadas"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo informe: conserva la obra, la autoridad, los permisos, las obligaciones (sin estado) y las firmas
  function nuevoInforme() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, titular: cur.titular, nit: cur.nit, autoridad: cur.autoridad, licencia: cur.licencia, ubicacion: cur.ubicacion,
      desde: cur.hasta ? sumarDias(cur.hasta, 1) : "", obligaciones: cur.obligaciones.map((o) => ({ ...obligacionNueva(), obligacion: o.obligacion })),
      permisos: cur.permisos.map((p) => ({ ...permisoIcaNuevo(), permiso: p.permiso, resolucion: p.resolucion, vigente: p.vigente })),
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un resumen en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un resumen para el ICA" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="RESUMEN PARA EL ICA" subtitulo={`${CODIGO_ICA} · Informe de Cumplimiento Ambiental del periodo`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos del proyecto y del periodo" subtitulo={d.desde && d.hasta ? `Del ${d.desde} al ${d.hasta}` : "Obra, autoridad y periodo"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, titular: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Titular o contratista" value={d.titular} onChange={(v) => set("titular", v)} />
            <Campo label="NIT" value={d.nit} onChange={(v) => set("nit", v.replace(/[^0-9.\-]/g, ""))} />
            <Campo label="Autoridad ambiental" value={d.autoridad} placeholder="Ej.: CAR, Secretaría Distrital de Ambiente" onChange={(v) => set("autoridad", v)} />
            <Campo label="Licencia, resolución o expediente" value={d.licencia} onChange={(v) => set("licencia", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Informe ICA N°" value={d.nInforme} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInforme", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Periodo desde" type="date" value={d.desde} onChange={(v) => set("desde", v)} />
              <Campo label="Periodo hasta" type="date" value={d.hasta} onChange={(v) => set("hasta", v)} />
            </div>
            <Campo label="% avance de obra" value={d.avance} inputMode="decimal" onChange={(v) => set("avance", soloNumeros(v))} />
          </div>
        </Seccion>

        <Seccion id="obligaciones" titulo="2. Obligaciones y fichas de manejo" subtitulo={`${evaluadas} evaluadas${promedio !== null ? ` · promedio ${promedio} %` : ""}`} abierta={abierta === "obligaciones"} onToggle={alternar} contador={evaluadas}>
          <button type="button" onClick={cargarFichas} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
            📋 Cargar las fichas de manejo habituales en las filas vacías
          </button>
          {d.obligaciones.map((o, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}.</div>
              <div className="space-y-2">
                <Campo label="Obligación o ficha de manejo" value={o.obligacion} onChange={(v) => actObl(i, { obligacion: v })} />
                <Campo label="Medida ejecutada en el periodo" value={o.medida} onChange={(v) => actObl(i, { medida: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Lista label="Estado" value={o.estado} onChange={(v) => actObl(i, { estado: v })} opciones={ESTADOS_OBLIGACION} />
                  <Campo label="Cumplimiento (%)" value={o.cumplimiento} inputMode="decimal" onChange={(v) => actObl(i, { cumplimiento: soloNumeros(v) })} />
                </div>
                <Campo label="Anexo o evidencia" value={o.anexo} onChange={(v) => actObl(i, { anexo: v })} />
              </div>
            </div>
          ))}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El promedio de cumplimiento y el número de obligaciones evaluadas los calcula el Excel.</div>
        </Seccion>

        <Seccion id="residuos" titulo="3. Residuos y consumos del periodo" subtitulo={`${d.residuos.filter((c) => String(c.cant).trim() !== "").length} de ${CONCEPTOS_ICA.length} con cantidad`} abierta={abierta === "residuos"} onToggle={alternar}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer lo registrado en la app en ese periodo
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {CONCEPTOS_ICA.map(([nombre, unidad], i) => {
            const c = d.residuos[i];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre} <span className="font-normal text-gray-500">({unidad})</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad del periodo" value={c.cant} inputMode="decimal" onChange={(v) => actRes(i, { cant: soloNumeros(v) })} />
                  <Campo label="Acumulado del proyecto" value={c.acum} inputMode="decimal" onChange={(v) => actRes(i, { acum: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Gestor o fuente" value={c.gestor} onChange={(v) => actRes(i, { gestor: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        <Seccion id="permisos" titulo="4. Permisos ambientales" subtitulo={`${d.permisos.filter((p) => String(p.permiso).trim() !== "").length} de ${N_PERMISOS}`} abierta={abierta === "permisos"} onToggle={alternar}>
          {d.permisos.map((p, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}.</div>
              <div className="space-y-2">
                <Campo label="Permiso o autorización" value={p.permiso} onChange={(v) => actPer(i, { permiso: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Resolución N°" value={p.resolucion} onChange={(v) => actPer(i, { resolucion: v })} />
                  <Campo label="Vigente hasta" type="date" value={p.vigente} onChange={(v) => actPer(i, { vigente: v })} />
                </div>
                <Lista label="Estado del permiso" value={p.estado} onChange={(v) => actPer(i, { estado: v })} opciones={ESTADOS_PERMISO} />
                <Campo label="Observación del permiso" value={p.obs} onChange={(v) => actPer(i, { obs: v })} />
              </div>
            </div>
          ))}
        </Seccion>

        <Seccion id="incidentes" titulo="5. Incidentes, quejas y no conformidades" subtitulo="Cifras del periodo" abierta={abierta === "incidentes"} onToggle={alternar}>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="Incidentes ambientales" value={d.incidentes} inputMode="numeric" onChange={(v) => set("incidentes", soloNumeros(v))} />
            <Campo label="Quejas recibidas" value={d.quejas} inputMode="numeric" onChange={(v) => set("quejas", soloNumeros(v))} />
            <Campo label="Quejas atendidas" value={d.atendidas} inputMode="numeric" onChange={(v) => set("atendidas", soloNumeros(v))} />
            <Campo label="Acciones correctivas abiertas" value={d.abiertas} inputMode="numeric" onChange={(v) => set("abiertas", soloNumeros(v))} />
            <Campo label="Acciones correctivas cerradas" value={d.cerradas} inputMode="numeric" onChange={(v) => set("cerradas", soloNumeros(v))} />
            <Campo label="Requerimientos de la autoridad" value={d.requerimientos} inputMode="numeric" onChange={(v) => set("requerimientos", soloNumeros(v))} />
          </div>
        </Seccion>

        <Seccion id="conclusiones" titulo="6. Conclusiones y anexos" subtitulo="Lo que se reporta a la autoridad" abierta={abierta === "conclusiones"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Conclusiones del periodo" value={d.conclusiones} onChange={(v) => set("conclusiones", v)} filas={3} />
            <AreaTexto label="No conformidades y acciones propuestas" value={d.noConformidades} onChange={(v) => set("noConformidades", v)} filas={3} />
            <AreaTexto label="Anexos que acompañan el ICA" value={d.anexos} onChange={(v) => set("anexos", v)} filas={3} />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Elabora el responsable ambiental; revisa el director de obra; firma el representante legal" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (director de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Representante legal</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del representante legal" etqCargo="Cargo del representante legal" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoInforme} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo informe (periodo siguiente; conserva la obra, los permisos, las obligaciones y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del resumen" onGenerar={generarExcel} />
    </div>
  );
}
