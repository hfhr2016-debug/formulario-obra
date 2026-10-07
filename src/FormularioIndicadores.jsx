import { useState } from "react";
import {
  CODIGO_INDICADORES, HOJA_INDICADORES, CELDAS_INDICADORES, MESES, MESES_LARGO, DATOS_BASE, FILAS_GESTION,
  descubrirIndicadores, escribirIndicadoresEnHoja, validarIndicadores, camposFaltantesIndicadores, resumenIndicadores, mesesVacios, mesVacio, mesesConDatos,
  calcularIndicadores, calcularAnio, completarConRegistrado, primerMesInconsistente,
} from "./indicadoresDatos";
import {
  NAVY, GOLD, PAPER, LINE, leerJSON, guardarJSON, cargarPlantilla, descargarLibro,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion, fechaHoyISO } from "./sstBase";
import { ChipsOpcion } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_indicadores";
const CLAVE_INDICADORES = "ryr_sst_indicadores";             // los datos de cada año: para seguir llenando mes a mes
const FUENTES = { inspecciones: "ryr_sst_inspecciones", actos: "ryr_sst_reportes_actos", accidentes: "ryr_sst_accidentes", acciones: "ryr_sst_acciones", capacitaciones: "ryr_sst_capacitaciones" };

function datosIniciales() {
  return { proyecto: "", contratista: "", anio: "", responsable: "", meses: mesesVacios(), analisis: "", elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "" };
}
function tieneContenido(d) {
  return !!(d.contratista || d.anio || d.responsable || d.analisis || d.elaboroNombre || d.revisoNombre || d.voboNombre || mesesConDatos(d).length);
}
const f = (v, dec = 2) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
const pct = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)} %`);

export default function FormularioIndicadores({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [mes, setMes] = useState(Math.max(0, new Date().getMonth() - 1 < 0 ? 0 : new Date().getMonth() - 1));   // por defecto, el mes anterior (el que se acaba de cerrar)
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTraer, setAvisoTraer] = useState("");

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
  const ponerDato = (id, valor) => setD((cur) => ({ ...cur, meses: cur.meses.map((m, i) => (i === mes ? { ...m, [id]: valor.replace(/[^0-9.,]/g, "") } : m)) }));

  // ---- Traer lo ya registrado y lo guardado del año ----
  const guardados = leerJSON(CLAVE_INDICADORES, []);
  const delAnio = guardados.find((g) => g.anio === String(d.anio).trim());
  function traerGuardado() {
    if (!delAnio) return;
    setD((cur) => ({ ...cur, meses: delAnio.meses.map((m) => ({ ...mesVacio(), ...m })) }));
    setAvisoTraer(`Se cargaron los datos guardados de ${d.anio} (${delAnio.mesesConDatos} ${delAnio.mesesConDatos === 1 ? "mes" : "meses"} con datos).`);
  }
  function traerRegistrado() {
    if (!/^\d{4}$/.test(String(d.anio).trim())) { setAvisoTraer("Escribe primero el año (4 cifras) en «Datos generales»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { meses, llenadas } = completarConRegistrado(d, regs);
    setD((cur) => ({ ...cur, meses }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app (inspecciones, actos, accidentes, acciones y capacitaciones). Lo que ya habías escrito no se tocó.` : "No hay nada nuevo registrado para ese año, o ya estaba todo escrito.");
  }

  const mActual = d.meses[mes] || mesVacio();
  const calc = calcularIndicadores(mActual);
  const anio = calcularAnio(d);
  const conDatos = mesesConDatos(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarIndicadores(d);
    if (faltan.length) {
      setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo.");
      const malo = primerMesInconsistente(d); if (malo >= 0) setMes(malo);        // se abre el mes que tiene el problema
      resaltarFaltantes(camposFaltantesIndicadores(d)); return;
    }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-indicadores.xlsx", HOJA_INDICADORES);
      const avisos = [];
      const lectura = descubrirIndicadores(ws);
      const decision = decidirDistribucion(lectura, CELDAS_INDICADORES);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirIndicadoresEnHoja(ws, { ...d, responsable: d.responsable || d.elaboroNombre }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Indicadores_SG-SST_${String(d.anio).trim()}.xlsx`);

      // Memoria: los datos del año quedan guardados para seguir llenando el siguiente mes
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenIndicadores(d);
      guardarJSON(CLAVE_INDICADORES, [res, ...leerJSON(CLAVE_INDICADORES, []).filter((x) => x.id !== res.id)].slice(0, 20));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (indicadores de ${String(d.anio).trim()}: ${conDatos.length} ${conDatos.length === 1 ? "mes" : "meses"} con datos). Los datos del año quedan guardados para seguir llenando el próximo mes.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian todos los datos de pantalla (lo guardado de años anteriores no se borra).")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe de indicadores" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const campoNum = (x) => <Campo key={x.id} label={x.texto} value={mActual[x.id]} inputMode="decimal" onChange={(v) => ponerDato(x.id, v)} />;
  const fila = (txt, valor) => (<div className="flex justify-between text-[12px] py-1 border-b" style={{ borderColor: LINE }}><span style={{ color: "#4B5563" }}>{txt}</span><b style={{ color: NAVY }}>{valor}</b></div>);
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INDICADORES DEL SG-SST" subtitulo={`${CODIGO_INDICADORES} · Accidentalidad, salud y gestión del año`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.anio ? `Año ${d.anio}` : "Obra y año"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <Campo label="Año" value={d.anio} placeholder="Ej. 2026" inputMode="numeric" onChange={(v) => set("anio", v.replace(/[^0-9]/g, "").slice(0, 4))} />
            <Campo label="Responsable (si es otra persona que quien elabora)" value={d.responsable} onChange={(v) => set("responsable", v)} />
            {delAnio && (
              <button type="button" onClick={traerGuardado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
                📂 Cargar los datos guardados de {d.anio} ({delAnio.mesesConDatos} {delAnio.mesesConDatos === 1 ? "mes" : "meses"})
              </button>
            )}
            {avisoTraer && abierta === "datos" && <div className="text-[11.5px] p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          </div>
        </Seccion>

        {/* 2. DATOS DEL MES */}
        <Seccion id="mes" titulo="2. Datos del mes" subtitulo={`${MESES_LARGO[mes]} · ${conDatos.length} ${conDatos.length === 1 ? "mes" : "meses"} con datos en el año`} abierta={abierta === "mes"} onToggle={alternar} contador={conDatos.length}>
          <div className="space-y-2.5">
            <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>
              📥 Traer lo registrado en la app (inspecciones, actos, accidentes, acciones y capacitaciones)
            </button>
            {avisoTraer && abierta === "mes" && <div className="text-[11.5px] p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
            <ChipsOpcion label="Mes" nombre="Mes" value={MESES[mes]} opciones={MESES} pequeno onChange={(v) => { if (v) setMes(MESES.indexOf(v)); }} />   {/* tocar el mes que ya está elegido no hace nada (antes saltaba a enero) */}
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Meses con datos: {conDatos.length ? conDatos.map((i) => MESES[i]).join(", ") : "ninguno todavía"}. Cada mes se llena aparte; las casillas vacías no se escriben.</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Datos base de {MESES_LARGO[mes].toLowerCase()}</div>
            <div className="grid grid-cols-2 gap-2.5">{DATOS_BASE.map(campoNum)}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Gestión de {MESES_LARGO[mes].toLowerCase()} (programado y ejecutado)</div>
            <div className="grid grid-cols-2 gap-2.5">{FILAS_GESTION.filter(Boolean).map(campoNum)}</div>
          </div>
        </Seccion>

        {/* 3. RESULTADOS */}
        <Seccion id="resultados" titulo="3. Resultados calculados" subtitulo={`${MESES_LARGO[mes]} y acumulado del año`} abierta={abierta === "resultados"} onToggle={alternar}>
          <div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>{MESES_LARGO[mes]}</div>
          {fila("Frecuencia de accidentalidad (%)", f(calc.frecuencia))}
          {fila("Severidad de accidentalidad (%)", f(calc.severidad))}
          {fila("Proporción de AT mortales (%)", f(calc.mortales))}
          {fila("Incidencia de enfermedad laboral (por 100.000)", f(calc.incidencia, 1))}
          {fila("Prevalencia de enfermedad laboral (por 100.000)", f(calc.prevalencia, 1))}
          {fila("Ausentismo por causa médica (%)", f(calc.ausentismo))}
          {fila("Índice de frecuencia (IF)", f(calc.IF))}
          {fila("Índice de severidad (IS)", f(calc.IS))}
          {fila("Índice de lesiones incapacitantes (ILI)", f(calc.ILI))}
          {fila("Cumplimiento del plan de capacitación", pct(calc.capacitacion))}
          {fila("Cumplimiento del plan de inspecciones", pct(calc.inspecciones))}
          {fila("Cierre de acciones correctivas", pct(calc.cierre))}
          <div className="text-[11px] font-semibold mt-3 mb-1" style={{ color: NAVY }}>Acumulado del año ({conDatos.length} {conDatos.length === 1 ? "mes" : "meses"})</div>
          {fila("Frecuencia de accidentalidad (%)", f(anio.frecuencia))}
          {fila("Severidad de accidentalidad (%)", f(anio.severidad))}
          {fila("Índice de frecuencia (IF)", f(anio.IF))}
          {fila("Índice de severidad (IS)", f(anio.IS))}
          {fila("Ausentismo por causa médica (%)", f(anio.ausentismo))}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Son los mismos cálculos del Excel. IF e IS usan K = 240.000. El acumulado usa los totales del año y el promedio de trabajadores.</div>
        </Seccion>

        {/* 4. ANÁLISIS */}
        <Seccion id="analisis" titulo="4. Análisis y decisiones" subtitulo="Qué dicen los indicadores y qué se decide" abierta={abierta === "analisis"} onToggle={alternar}>
          <AreaTexto label="Análisis y decisiones" value={d.analisis} onChange={(v) => set("analisis", v)} filas={5} />
        </Seccion>

        {/* 5. FIRMAS */}
        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de los indicadores" onGenerar={generarExcel} />
    </div>
  );
}
