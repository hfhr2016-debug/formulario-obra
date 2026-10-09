import { useState } from "react";
import {
  CODIGO_MENSUAL, HOJA_MENSUAL, CELDAS_MENSUAL, MESES, INDICADORES, ACTIVIDADES, COLORES_CUMPLE,
  descubrirMensual, escribirMensualEnHoja, validarMensual, camposFaltantesMensual, resumenMensual, indicadorNuevo, actividadNueva, indiceMes, cumpleIndicador, rellenarMesDesdeRegistros,
} from "./mensualSSTDatos";
import { FUENTES } from "./consolidadoSST";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, TraerDeFicha,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";

const CLAVE_BORRADOR = "ryr_borrador_mensual";
const CLAVE_CONSECUTIVO = "ryr_sst_mensual_consecutivo";
const CLAVE_MENSUALES = "ryr_sst_mensuales";           // resumen de cada informe mensual generado

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", mes: "", anio: "", nInforme: "", trabajadores: "", hht: "", dias: "",
    indicadores: INDICADORES.map(indicadorNuevo), actividades: ACTIVIDADES.map(actividadNueva),
    accidentes: "", incidentes: "", diasInc: "", abiertas: "", vencidas: "", contratistas: "", simulacros: "", hechos: "", conclusiones: "", planMes: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.mes || d.anio || d.nInforme || d.trabajadores || d.hht || d.accidentes || d.simulacros || d.hechos || d.conclusiones || d.planMes || d.elaboroNombre ||
    d.indicadores.some((i) => i.mes || i.acum || i.meta) || d.actividades.some((a) => a.prog || a.ejec || a.obs));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");
const pct = (a) => { const p = Number(String(a.prog).replace(",", ".")), e = Number(String(a.ejec).replace(",", ".")); return String(a.prog).trim() !== "" && String(a.ejec).trim() !== "" && p > 0 ? Math.round((e / p) * 100) : null; };

export default function FormularioMensualSST({ onVolver }) {
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
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const actualizarIndicador = (i, patch) => setD((cur) => ({ ...cur, indicadores: cur.indicadores.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const actualizarActividad = (i, patch) => setD((cur) => ({ ...cur, actividades: cur.actividades.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));

  // ---- Traer los indicadores del año y lo registrado en el mes ----
  function traerRegistrado() {
    if (indiceMes(d.mes) < 0 || !/^\d{4}$/.test(String(d.anio).trim())) { setAvisoTraer("Elige primero el mes y escribe el año (4 cifras) en «Datos del mes»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas, sinIndicadores } = rellenarMesDesdeRegistros(d, regs);
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer((llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app. Lo que ya habías escrito no se tocó; lo que no estaba registrado queda en blanco.` : "No hay nada nuevo registrado para ese mes, o ya estaba todo escrito.") +
      (sinIndicadores ? ` Aún no hay indicadores guardados de ${d.anio}: genera primero el formato de Indicadores para que se llenen los resultados y el acumulado.` : ""));
  }

  const conIndicador = d.indicadores.filter((i) => String(i.mes).trim() !== "").length;
  const noCumplen = d.indicadores.filter((i) => cumpleIndicador(i) === "No cumple").length;
  const conPlan = d.actividades.filter((a) => String(a.ejec).trim() !== "").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarMensual(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesMensual(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-mensual-sst.xlsx", HOJA_MENSUAL);
      const avisos = [];
      const lectura = descubrirMensual(ws);
      const decision = decidirDistribucion(lectura, CELDAS_MENSUAL);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nInforme && String(d.nInforme).trim() ? String(d.nInforme).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirMensualEnHoja(ws, { ...d, nInforme: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Informe_mensual_${String(d.anio).trim()}_${textoParaArchivo(d.mes, 12)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenMensual({ ...d, nInforme: nUsar });
      guardarJSON(CLAVE_MENSUALES, [res, ...leerJSON(CLAVE_MENSUALES, []).filter((x) => x.id !== res.id)].slice(0, 60));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInforme: nUsar }));
      setGenerado(`✓ Excel descargado (informe N° ${nUsar} de ${d.mes} de ${String(d.anio).trim()}: ${res.cumplen} ${res.cumplen === 1 ? "indicador cumple" : "indicadores cumplen"} su meta y ${res.noCumplen} no).` + (res.noCumplen ? " ⚠ Revisa los que no cumplen y escribe qué se hará en el plan del próximo mes." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo informe: conserva la obra y las firmas y avanza al mes siguiente (el N° avanza solo)
  function nuevoMes() {
    const idx = indiceMes(d.mes), pasaAnio = idx === 11;
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion,
      mes: idx >= 0 ? MESES[(idx + 1) % 12] : "", anio: idx >= 0 && /^\d{4}$/.test(String(cur.anio)) ? String(Number(cur.anio) + (pasaAnio ? 1 : 0)) : cur.anio,
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un informe en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe mensual" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Informe Mensual SST" subtitulo={`${CODIGO_MENSUAL} · Resultados de seguridad y salud del mes`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del mes" subtitulo={d.mes && d.anio ? `${d.mes} de ${d.anio}` : "Obra, mes y personal"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Mes" value={d.mes} onChange={(v) => set("mes", v)} opciones={MESES} />
              <Campo label="Año" value={d.anio} placeholder="Ej. 2026" inputMode="numeric" onChange={(v) => set("anio", v.replace(/[^0-9]/g, "").slice(0, 4))} />
            </div>
            <Campo label="Informe N°" value={d.nInforme} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInforme", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            <div className="grid grid-cols-3 gap-2.5">
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", soloNumeros(v))} />
              <Campo label="Horas-hombre (HHT)" value={d.hht} inputMode="decimal" onChange={(v) => set("hht", soloNumeros(v))} />
              <Campo label="Días trabajados" value={d.dias} inputMode="numeric" onChange={(v) => set("dias", soloNumeros(v))} />
            </div>
          </div>
        </Seccion>

        {/* 2. INDICADORES */}
        <Seccion id="indicadores" titulo="2. Indicadores de accidentalidad y salud" subtitulo={`${conIndicador} de ${INDICADORES.length} con resultado${noCumplen ? ` · ${noCumplen} no cumplen` : ""}`} abierta={abierta === "indicadores"} onToggle={alternar} contador={conIndicador}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer los indicadores y lo registrado del mes
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {INDICADORES.map((nombre, i) => {
            const x = d.indicadores[i], c = cumpleIndicador(x), col = COLORES_CUMPLE[c];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: c === "No cumple" ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>{i + 1}. {nombre}</div>
                  {col && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#" + col.relleno, color: "#" + col.fuente }}>{c}</div>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Campo label="Resultado del mes" value={x.mes} inputMode="decimal" onChange={(v) => actualizarIndicador(i, { mes: soloNumeros(v) })} />
                  <Campo label="Acumulado del año" value={x.acum} inputMode="decimal" onChange={(v) => actualizarIndicador(i, { acum: soloNumeros(v) })} />
                  <Campo label="Meta" value={x.meta} inputMode="decimal" onChange={(v) => actualizarIndicador(i, { meta: soloNumeros(v) })} />
                </div>
              </div>
            );
          })}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Son indicadores de accidentalidad: el resultado «cumple» si es menor o igual a la meta que escribas. Si no escribes meta, no se califica.</div>
        </Seccion>

        {/* 3. PLAN DE TRABAJO */}
        <Seccion id="plan" titulo="3. Cumplimiento del plan de trabajo" subtitulo={`${conPlan} de ${ACTIVIDADES.length} con cifra`} abierta={abierta === "plan"} onToggle={alternar} contador={conPlan}>
          {ACTIVIDADES.map((nombre, i) => {
            const a = d.actividades[i], p = pct(a);
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>{i + 1}. {nombre}</div>
                  {p !== null && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: p >= 100 ? "#00A651" : p >= 70 ? "#FFC000" : "#C00000", color: p >= 70 ? "#000" : "#fff" }}>{p} %</div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Programado" value={a.prog} inputMode="numeric" onChange={(v) => actualizarActividad(i, { prog: soloNumeros(v) })} />
                  <Campo label="Ejecutado" value={a.ejec} inputMode="numeric" onChange={(v) => actualizarActividad(i, { ejec: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Observaciones" value={a.obs} onChange={(v) => actualizarActividad(i, { obs: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        {/* 4. SEGUIMIENTO */}
        <Seccion id="seguimiento" titulo="4. Accidentalidad y seguimiento" subtitulo="Cifras del mes" abierta={abierta === "seguimiento"} onToggle={alternar}>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="Accidentes de trabajo" value={d.accidentes} inputMode="numeric" onChange={(v) => set("accidentes", soloNumeros(v))} />
            <Campo label="Incidentes y casi accidentes" value={d.incidentes} inputMode="numeric" onChange={(v) => set("incidentes", soloNumeros(v))} />
            <Campo label="Días de incapacidad" value={d.diasInc} inputMode="numeric" onChange={(v) => set("diasInc", soloNumeros(v))} />
            <Campo label="Acciones abiertas al cierre" value={d.abiertas} inputMode="numeric" onChange={(v) => set("abiertas", soloNumeros(v))} />
            <Campo label="Acciones vencidas" value={d.vencidas} inputMode="numeric" onChange={(v) => set("vencidas", soloNumeros(v))} />
            <Campo label="Contratistas evaluados" value={d.contratistas} inputMode="numeric" onChange={(v) => set("contratistas", soloNumeros(v))} />
          </div>
        </Seccion>

        {/* 5. TEXTOS */}
        <Seccion id="textos" titulo="5. Simulacros, hechos y conclusiones" subtitulo="Lo más importante del mes y el plan que sigue" abierta={abierta === "textos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Simulacros y reuniones del mes" value={d.simulacros} onChange={(v) => set("simulacros", v)} filas={3} />
            <AreaTexto label="Hechos relevantes del mes" value={d.hechos} onChange={(v) => set("hechos", v)} filas={3} />
            <AreaTexto label="Conclusiones" value={d.conclusiones} onChange={(v) => set("conclusiones", v)} filas={3} />
            <AreaTexto label="Plan del próximo mes" value={d.planMes} onChange={(v) => set("planMes", v)} filas={3} />
          </div>
        </Seccion>

        {/* 6. FIRMAS */}
        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
          <button type="button" onClick={nuevoMes} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo mes (avanza el mes y conserva la obra y las firmas)
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
