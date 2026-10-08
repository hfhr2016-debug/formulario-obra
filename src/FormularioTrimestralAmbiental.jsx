import { useState } from "react";
import {
  CODIGO_TRIMESTRAL_AMB, HOJA_TRIMESTRAL_AMB, CELDAS_TRIMESTRAL_AMB, CONCEPTOS_TRIM_AMB, TRIMESTRES, indiceTrimestre, rangoTrimestre, nombresMesesTrimestre,
  descubrirTrimestralAmb, escribirTrimestralAmbEnHoja, validarTrimestralAmb, camposFaltantesTrimestralAmb, resumenTrimestralAmb, conceptoNuevo, rellenarTrimestreDesdeRegistros,
} from "./trimestralAmbDatos";
import { FUENTES_AMB } from "./consolidadoAmb";
import {
  NAVY, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, Lista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { CLAVE_AMB_TRIMESTRALES, CLAVE_AMB_MENSUALES, CLAVE_AMB_INDICADORES, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_trimestral_amb";
const CLAVE_CONSECUTIVO = "ryr_amb_trimestral_consecutivo";

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", trimestre: "", anio: "", nInforme: "", desde: "", hasta: "", avance: "",
    cumplPlan: "", medidos: "", cumplen: "", abiertas: "",
    conceptos: CONCEPTOS_TRIM_AMB.map(conceptoNuevo),
    resultados: "", hallazgos: "", mejoras: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.trimestre || d.anio || d.nInforme || d.avance || d.cumplPlan || d.medidos || d.cumplen || d.abiertas || d.resultados || d.hallazgos || d.mejoras ||
    d.elaboroNombre || d.revisoNombre || d.voboNombre || d.conceptos.some((c) => c.m1 || c.m2 || c.m3 || c.meta));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");

export default function FormularioTrimestralAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTraer, setAvisoTraer] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  // Al elegir trimestre y año, las fechas del periodo se proponen solas (se pueden cambiar)
  const cambiarPeriodo = (patch) => setD((cur) => {
    const n = { ...cur, ...patch }, r = rangoTrimestre(n.trimestre, n.anio);
    return { ...n, desde: r.desde || n.desde, hasta: r.hasta || n.hasta };
  });
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const actualizar = (i, patch) => setD((cur) => ({ ...cur, conceptos: cur.conceptos.map((c, k) => (k === i ? { ...c, ...patch } : c)) }));

  function traerRegistrado() {
    if (indiceTrimestre(d.trimestre) < 0 || !/^\d{4}$/.test(String(d.anio).trim())) { setAvisoTraer("Elige primero el trimestre y escribe el año (4 cifras) en «Datos del trimestre»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES_AMB).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas, deMensual } = rellenarTrimestreDesdeRegistros(d, regs, leerJSON(CLAVE_AMB_MENSUALES, []), leerJSON(CLAVE_AMB_INDICADORES, []));
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"}: ${deMensual} de los 3 meses salieron de su Informe Mensual y el resto de lo registrado en los demás formatos. Lo que ya habías escrito no se tocó; si no hubo registros, la casilla queda en blanco (escribe 0 si de verdad no hubo). Las metas las escribes tú.` : "No hay nada nuevo registrado para ese trimestre, o ya estaba todo escrito.");
  }

  const conCifra = d.conceptos.filter((c) => [c.m1, c.m2, c.m3].some((x) => String(x).trim() !== "")).length;
  const nombresMeses = nombresMesesTrimestre(d.trimestre);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarTrimestralAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesTrimestralAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-trimestral-amb.xlsx", HOJA_TRIMESTRAL_AMB);
      const avisos = [];
      const decision = decidirDistribucion(descubrirTrimestralAmb(ws), CELDAS_TRIMESTRAL_AMB);
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nInforme && String(d.nInforme).trim() ? String(d.nInforme).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirTrimestralAmbEnHoja(ws, { ...d, nInforme: nUsar }, decision.celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Informe_trimestral_amb_${String(d.anio).trim()}_T${indiceTrimestre(d.trimestre) + 1}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenTrimestralAmb({ ...d, nInforme: nUsar });
      guardarJSON(CLAVE_AMB_TRIMESTRALES, [res, ...leerJSON(CLAVE_AMB_TRIMESTRALES, []).filter((x) => x.id !== res.id)].slice(0, 40));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInforme: nUsar }));
      setGenerado(`✓ Excel descargado (informe N° ${nUsar} del trimestre ${d.trimestre} de ${String(d.anio).trim()}: ${conCifra} ${conCifra === 1 ? "concepto con cifra" : "conceptos con cifra"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function nuevoTrimestre() {
    const q = indiceTrimestre(d.trimestre), pasa = q === 3;
    const trimestre = q >= 0 ? TRIMESTRES[(q + 1) % 4] : "", anio = q >= 0 && /^\d{4}$/.test(String(d.anio)) ? String(Number(d.anio) + (pasa ? 1 : 0)) : d.anio;
    const r = rangoTrimestre(trimestre, anio);
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, trimestre, anio, desde: r.desde, hasta: r.hasta,
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un informe en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe trimestral" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INFORME TRIMESTRAL AMBIENTAL" subtitulo={`${CODIGO_TRIMESTRAL_AMB} · Consolidado de la gestión ambiental de 3 meses`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos del trimestre" subtitulo={d.trimestre && d.anio ? `Trimestre ${d.trimestre} de ${d.anio}` : "Obra y periodo"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Trimestre" value={d.trimestre} onChange={(v) => cambiarPeriodo({ trimestre: v })} opciones={TRIMESTRES} />
              <Campo label="Año" value={d.anio} inputMode="numeric" placeholder="2026" onChange={(v) => cambiarPeriodo({ anio: v.replace(/[^0-9]/g, "").slice(0, 4) })} />
            </div>
            <Campo label="Informe N°" value={d.nInforme} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInforme", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Periodo desde" type="date" value={d.desde} onChange={(v) => set("desde", v)} />
              <Campo label="Periodo hasta" type="date" value={d.hasta} onChange={(v) => set("hasta", v)} />
            </div>
            <Campo label="% avance de obra" value={d.avance} inputMode="decimal" onChange={(v) => set("avance", soloNumeros(v))} />
          </div>
        </Seccion>

        <Seccion id="consolidado" titulo="2. Consolidado de los 3 meses" subtitulo={`${conCifra} de ${CONCEPTOS_TRIM_AMB.length} conceptos con cifra`} abierta={abierta === "consolidado"} onToggle={alternar} contador={conCifra}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer lo registrado en la app ese trimestre
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {nombresMeses.length > 0 && <div className="text-[11px] mb-2" style={{ color: NAVY }}>Mes 1 = {nombresMeses[0]} · Mes 2 = {nombresMeses[1]} · Mes 3 = {nombresMeses[2]}</div>}
          {CONCEPTOS_TRIM_AMB.map((def, i) => {
            const c = d.conceptos[i];
            return (
              <div key={def.id} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {def.texto}</div>
                <div className="grid grid-cols-4 gap-2">
                  <Campo label="Mes 1" value={c.m1} inputMode="decimal" onChange={(v) => actualizar(i, { m1: soloNumeros(v) })} />
                  <Campo label="Mes 2" value={c.m2} inputMode="decimal" onChange={(v) => actualizar(i, { m2: soloNumeros(v) })} />
                  <Campo label="Mes 3" value={c.m3} inputMode="decimal" onChange={(v) => actualizar(i, { m3: soloNumeros(v) })} />
                  <Campo label="Meta" value={c.meta} inputMode="decimal" onChange={(v) => actualizar(i, { meta: soloNumeros(v) })} />
                </div>
              </div>
            );
          })}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El total del trimestre y el promedio los calcula el Excel.</div>
        </Seccion>

        <Seccion id="cumplimiento" titulo="3. Cumplimiento del trimestre" subtitulo="Plan de manejo, indicadores y acciones" abierta={abierta === "cumplimiento"} onToggle={alternar}>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="Cumplimiento del plan de manejo (%)" value={d.cumplPlan} inputMode="decimal" onChange={(v) => set("cumplPlan", soloNumeros(v))} />
            <Campo label="Indicadores medidos" value={d.medidos} inputMode="numeric" onChange={(v) => set("medidos", soloNumeros(v))} />
            <Campo label="Indicadores que cumplen" value={d.cumplen} inputMode="numeric" onChange={(v) => set("cumplen", soloNumeros(v))} />
            <Campo label="Acciones abiertas al cierre" value={d.abiertas} inputMode="numeric" onChange={(v) => set("abiertas", soloNumeros(v))} />
          </div>
        </Seccion>

        <Seccion id="analisis" titulo="4. Análisis del trimestre" subtitulo="Resultados, hallazgos y mejoras" abierta={abierta === "analisis"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Resultados y tendencias" value={d.resultados} onChange={(v) => set("resultados", v)} filas={3} />
            <AreaTexto label="Hallazgos principales" value={d.hallazgos} onChange={(v) => set("hallazgos", v)} filas={3} />
            <AreaTexto label="Acciones de mejora y plan del próximo trimestre" value={d.mejoras} onChange={(v) => set("mejoras", v)} filas={3} />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Visto bueno (gerencia o interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoTrimestre} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo informe (avanza al trimestre siguiente y conserva la obra y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del informe" onGenerar={generarExcel} />
    </div>
  );
}
