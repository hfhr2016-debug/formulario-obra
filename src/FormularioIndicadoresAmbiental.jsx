import { useState } from "react";
import { fechaHoyISO } from "./sstBase";
import {
  CODIGO_INDICADORES_AMB, HOJA_INDICADORES_AMB, CELDAS_INDICADORES_AMB, MESES, INDICADORES, SENTIDOS, indicadoresIniciales, indicadorNuevo, indiceMes, numero, cumpleIndicador, conteoCumplimiento,
  descubrirIndicadoresAmb, escribirIndicadoresAmbEnHoja, validarIndicadoresAmb, camposFaltantesIndicadoresAmb, resumenIndicadoresAmb, completarConRegistradoAmb, metasDelUltimoGuardado,
} from "./indicadoresAmbDatos";
import { FUENTES_AMB } from "./consolidadoAmb";
import {
  NAVY, GOLD, PAPER, LINE, leerJSON, guardarJSON, cargarPlantilla, descargarLibro,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_INDICADORES, TraerDeFichaAmb } from "./ambComunes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_indicadores_amb";
const COLOR_CUMPLE = { Cumple: "#2E7D4F", "No cumple": "#B3401F" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", mes: "", anio: "", trabajadores: "", fechaElaboracion: "",
    indicadores: indicadoresIniciales(), analisis: "", acciones: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.mes || d.anio || d.trabajadores || d.analisis || d.acciones || d.elaboroNombre || d.revisoNombre || d.voboNombre ||
    d.indicadores.some((i) => i.meta || i.mes || i.acum));
}
const decimal = (v) => v.replace(/[^0-9.,-]/g, "");

export default function FormularioIndicadoresAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
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
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const actualizar = (k, patch) => setD((cur) => ({ ...cur, indicadores: cur.indicadores.map((x, j) => (j === k ? { ...x, ...patch } : x)) }));

  const guardados = leerJSON(CLAVE_AMB_INDICADORES, []);
  const metasAnteriores = metasDelUltimoGuardado(guardados);
  function traerRegistrado() {
    if (indiceMes(d.mes) < 0 || !/^\d{4}$/.test(String(d.anio).trim())) { setAvisoTraer("Elige primero el mes y escribe el año (4 cifras) en «Datos del periodo»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES_AMB).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { indicadores, llenadas, trabajadores } = completarConRegistradoAmb(d, regs);
    setD((cur) => ({ ...cur, indicadores, trabajadores: cur.trabajadores || (trabajadores ? String(trabajadores) : "") }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app (residuos, consumos, incidentes, quejas, acciones e inspecciones). Lo que ya habías escrito no se tocó; lo que no está registrado queda en blanco para que lo escribas.` : "No hay nada nuevo registrado para ese mes, o ya estaba todo escrito.");
  }
  function traerMetas() {
    if (!metasAnteriores) return;
    setD((cur) => ({ ...cur, indicadores: cur.indicadores.map((x, k) => ({ ...x, sentido: (metasAnteriores[k] || {}).sentido || x.sentido, meta: String(x.meta).trim() !== "" ? x.meta : (metasAnteriores[k] || {}).meta || "" })) }));
    setAvisoTraer("Se trajeron las metas del último mes guardado (las que ya habías escrito no se cambiaron).");
  }

  const cuenta = conteoCumplimiento(d);
  const conResultado = d.indicadores.filter((i) => numero(i.mes) !== null).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarIndicadoresAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesIndicadoresAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-indicadores-amb.xlsx", HOJA_INDICADORES_AMB);
      const avisos = [];
      const lectura = descubrirIndicadoresAmb(ws);
      const decision = decidirDistribucion(lectura, CELDAS_INDICADORES_AMB);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirIndicadoresAmbEnHoja(ws, d, celdas, fechaHoyISO());
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Indicadores_Ambientales_${String(d.anio).trim()}_${d.mes}.xlsx`);

      // Memoria para la próxima vez
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenIndicadoresAmb(d);
      guardarJSON(CLAVE_AMB_INDICADORES, [res, ...leerJSON(CLAVE_AMB_INDICADORES, []).filter((x) => x.id !== res.id)].slice(0, 60));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${d.mes} de ${String(d.anio).trim()}: ${res.cumplen} de ${res.medidos} ${res.medidos === 1 ? "indicador cumple" : "indicadores cumplen"} su meta).` + (res.noCumplen ? " ⚠ Revisa los que no cumplen y escribe qué se hará." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo mes: conserva la obra, las firmas y las metas; avanza al mes siguiente y limpia los resultados
  function nuevoMes() {
    const idx = indiceMes(d.mes), pasaAnio = idx === 11;
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion,
      mes: idx >= 0 ? MESES[(idx + 1) % 12] : "", anio: idx >= 0 && /^\d{4}$/.test(String(cur.anio)) ? String(Number(cur.anio) + (pasaAnio ? 1 : 0)) : cur.anio,
      indicadores: cur.indicadores.map((x) => ({ ...x, mes: "", acum: "" })),
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian todos los datos, incluidos los de la obra y las metas.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe de indicadores" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INDICADORES AMBIENTALES" subtitulo={`${CODIGO_INDICADORES_AMB} · Seguimiento mensual del desempeño ambiental`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del periodo" subtitulo={d.mes && d.anio ? `${d.mes} de ${d.anio}` : "Obra, mes y año"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Mes" value={d.mes} onChange={(v) => set("mes", v)} opciones={MESES} />
              <Campo label="Año" value={d.anio} inputMode="numeric" placeholder="2026" onChange={(v) => set("anio", v.replace(/[^0-9]/g, "").slice(0, 4))} />
            </div>
            <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", v.replace(/[^0-9]/g, ""))} />
            <CampoFecha label="Fecha de elaboración" value={d.fechaElaboracion} onChange={(v) => set("fechaElaboracion", v)} />
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Si dejas vacía la fecha de elaboración, se escribe la de hoy.</div>
          </div>
        </Seccion>

        {/* 2. INDICADORES */}
        <Seccion id="indicadores" titulo="2. Indicadores de desempeño" subtitulo={`${conResultado} de ${INDICADORES.length} con resultado${cuenta.medidos ? ` · ${cuenta.cumplen} cumplen` : ""}`} abierta={abierta === "indicadores"} onToggle={alternar} contador={conResultado}>
          <div className="grid grid-cols-1 gap-1.5 mb-2">
            <button type="button" onClick={traerRegistrado} className="text-center py-2 px-1.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>📥 Traer lo registrado en la app (mes y acumulado)</button>
            {metasAnteriores && <button type="button" onClick={traerMetas} className="text-center py-2 px-1.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>🎯 Traer las metas del último mes guardado</button>}
          </div>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {cuenta.medidos > 0 && (
            <div className="text-[12px] font-bold px-3 py-2 rounded-md text-center mb-3 text-white" style={{ background: cuenta.noCumplen ? "#B3401F" : "#2E7D4F" }}>
              {cuenta.cumplen} de {cuenta.medidos} indicadores cumplen su meta ({cuenta.porcentaje} %)
            </div>
          )}
          {INDICADORES.map((def, k) => {
            const i = { ...indicadorNuevo(def), ...(d.indicadores[k] || {}) };
            const c = cumpleIndicador(i);
            return (
              <div key={def.id} className="border rounded-lg p-2.5 mb-3" style={{ borderColor: LINE, background: PAPER }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-[12px] font-semibold" style={{ color: NAVY }}><span style={{ color: GOLD }}>{k + 1}.</span> {def.texto} <span className="font-normal text-gray-500">({def.unidad})</span></div>
                  {c && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap" style={{ background: COLOR_CUMPLE[c] }}>{c}</div>}
                </div>
                <div className="space-y-2">
                  <ChipsOpcion label="Sentido (cómo se cumple la meta)" nombre={`Sentido ${k + 1}`} value={i.sentido} opciones={SENTIDOS} pequeno onChange={(v) => actualizar(k, { sentido: v })} />
                  <div className="grid grid-cols-3 gap-2">
                    <Campo label="Meta" value={i.meta} inputMode="decimal" onChange={(v) => actualizar(k, { meta: decimal(v) })} />
                    <Campo label="Resultado del mes" value={i.mes} inputMode="decimal" onChange={(v) => actualizar(k, { mes: decimal(v) })} />
                    <Campo label="Acumulado" value={i.acum} inputMode="decimal" onChange={(v) => actualizar(k, { acum: decimal(v) })} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>≥ significa que el resultado debe ser igual o mayor que la meta (porcentajes de cumplimiento); ≤ que debe ser igual o menor (consumos, residuos, incidentes y quejas). El Excel marca «Cumple» o «No cumple» con estas mismas reglas.</div>
        </Seccion>

        {/* 3. ANÁLISIS */}
        <Seccion id="analisis" titulo="3. Análisis de los resultados" subtitulo="Indicadores que no cumplen y acciones" abierta={abierta === "analisis"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Análisis de los indicadores que no cumplen" value={d.analisis} onChange={(v) => set("analisis", v)} filas={4} />
            <AreaTexto label="Acciones a tomar" value={d.acciones} onChange={(v) => set("acciones", v)} filas={4} />
          </div>
        </Seccion>

        {/* 4. FIRMAS */}
        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
          <button type="button" onClick={nuevoMes} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo mes (conserva la obra, las metas y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de los indicadores" onGenerar={generarExcel} />
    </div>
  );
}
