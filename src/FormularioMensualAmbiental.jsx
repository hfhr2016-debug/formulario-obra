import { useState } from "react";
import {
  CODIGO_MENSUAL_AMB, HOJA_MENSUAL_AMB, CELDAS_MENSUAL_AMB, ACTIVIDADES_MES_AMB, RESIDUOS_MES_AMB, CONSUMOS_MES_AMB, GESTION_MES_AMB, MESES, indiceMes,
  descubrirMensualAmb, escribirMensualAmbEnHoja, validarMensualAmb, camposFaltantesMensualAmb, resumenMensualAmb, actividadMesNueva, cantidadMesNueva, rellenarMesAmbDesdeRegistros,
} from "./mensualAmbDatos";
import { FUENTES_AMB } from "./consolidadoAmb";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, Lista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { CLAVE_AMB_MENSUALES, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_mensual_amb";
const CLAVE_CONSECUTIVO = "ryr_amb_mensual_consecutivo";
const CLAVE_MENSUALES = CLAVE_AMB_MENSUALES;           // resumen de cada informe mensual generado

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", mes: "", anio: "", nInforme: "", trabajadores: "", dias: "", avance: "",
    actividades: ACTIVIDADES_MES_AMB.map(actividadMesNueva), residuos: RESIDUOS_MES_AMB.map(cantidadMesNueva), consumos: CONSUMOS_MES_AMB.map(cantidadMesNueva), gestion: GESTION_MES_AMB.map(cantidadMesNueva),
    hechos: "", conclusiones: "", planMes: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.mes || d.anio || d.nInforme || d.trabajadores || d.dias || d.avance || d.hechos || d.conclusiones || d.planMes || d.elaboroNombre || d.revisoNombre || d.voboNombre ||
    d.actividades.some((a) => a.prog || a.ejec || a.obs) || [d.residuos, d.consumos, d.gestion].some((g) => g.some((c) => c.cant || c.acum || c.obs)));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");
const pct = (a) => { const p = Number(String(a.prog).replace(",", ".")), e = Number(String(a.ejec).replace(",", ".")); return String(a.prog).trim() !== "" && String(a.ejec).trim() !== "" && p > 0 ? Math.round((e / p) * 100) : null; };

export default function FormularioMensualAmbiental({ onVolver }) {
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
  const actualizar = (i, patch) => setD((cur) => ({ ...cur, actividades: cur.actividades.map((a, k) => (k === i ? { ...a, ...patch } : a)) }));
  const actualizarCant = (grupo) => (i, patch) => setD((cur) => ({ ...cur, [grupo]: cur[grupo].map((a, k) => (k === i ? { ...a, ...patch } : a)) }));

  // ---- Traer lo registrado en la app ----
  function traerRegistrado() {
    if (indiceMes(d.mes) < 0 || !/^\d{4}$/.test(String(d.anio).trim())) { setAvisoTraer("Elige primero el mes y escribe el año (4 cifras) en «Datos del mes»."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES_AMB).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas } = rellenarMesAmbDesdeRegistros(d, regs);
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app ese mes. Lo que ya habías escrito no se tocó; si no hubo registros, la casilla queda en blanco (escribe 0 si de verdad no hubo). El gestor o destino de los residuos y las observaciones los escribes tú.` : "No hay nada nuevo registrado para ese mes, o ya estaba todo escrito.");
  }

  const hechas = d.actividades.filter((a) => String(a.ejec).trim() !== "").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarMensualAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesMensualAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-mensual-amb.xlsx", HOJA_MENSUAL_AMB);
      const avisos = [];
      const lectura = descubrirMensualAmb(ws);
      const decision = decidirDistribucion(lectura, CELDAS_MENSUAL_AMB);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const nUsar = d.nInforme && String(d.nInforme).trim() ? String(d.nInforme).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirMensualAmbEnHoja(ws, { ...d, nInforme: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Informe_mensual_amb_${String(d.anio).trim()}_${textoParaArchivo(d.mes, 12)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenMensualAmb({ ...d, nInforme: nUsar });
      guardarJSON(CLAVE_MENSUALES, [res, ...leerJSON(CLAVE_MENSUALES, []).filter((x) => x.id !== res.id)].slice(0, 60));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInforme: nUsar }));
      setGenerado(`✓ Excel descargado (informe N° ${nUsar} de ${d.mes} de ${String(d.anio).trim()}: ${hechas} ${hechas === 1 ? "actividad con cifra" : "actividades con cifra"}).`);
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
      <EncabezadoFormulario titulo="INFORME MENSUAL AMBIENTAL" subtitulo={`${CODIGO_MENSUAL_AMB} · Resultados de la gestión ambiental del mes`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del mes" subtitulo={d.mes && d.anio ? `${d.mes} de ${d.anio}` : "Obra, mes y personal"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Mes" value={d.mes} onChange={(v) => set("mes", v)} opciones={MESES} />
              <Campo label="Año" value={d.anio} inputMode="numeric" placeholder="2026" onChange={(v) => set("anio", v.replace(/[^0-9]/g, "").slice(0, 4))} />
            </div>
            <Campo label="Informe N°" value={d.nInforme} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInforme", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            <div className="grid grid-cols-3 gap-2.5">
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", soloNumeros(v))} />
              <Campo label="Días trabajados" value={d.dias} inputMode="numeric" onChange={(v) => set("dias", soloNumeros(v))} />
              <Campo label="% avance de obra" value={d.avance} inputMode="decimal" onChange={(v) => set("avance", soloNumeros(v))} />
            </div>
          </div>
        </Seccion>

        {/* 2. ACTIVIDADES */}
        <Seccion id="actividades" titulo="2. Cumplimiento del plan de manejo" subtitulo={`${hechas} de ${ACTIVIDADES_MES_AMB.length} con cifra`} abierta={abierta === "actividades"} onToggle={alternar} contador={hechas}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer lo registrado en la app ese mes
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {ACTIVIDADES_MES_AMB.map((nombre, i) => {
            const a = d.actividades[i], p = pct(a);
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>{i + 1}. {nombre}</div>
                  {p !== null && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: p >= 100 ? "#00A651" : p >= 70 ? "#FFC000" : "#C00000", color: p >= 100 || p >= 70 ? "#000" : "#fff" }}>{p} %</div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Programado" value={a.prog} inputMode="numeric" onChange={(v) => actualizar(i, { prog: soloNumeros(v) })} />
                  <Campo label="Ejecutado" value={a.ejec} inputMode="numeric" onChange={(v) => actualizar(i, { ejec: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Observaciones" value={a.obs} onChange={(v) => actualizar(i, { obs: v })} /></div>
              </div>
            );
          })}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El cumplimiento (ejecutado ÷ programado) lo calcula el Excel. Lo «programado» lo escribes tú (según el plan de manejo de la obra).</div>
        </Seccion>

        <Seccion id="residuos" titulo="3. Residuos generados" subtitulo={`${d.residuos.filter((c) => String(c.cant).trim() !== "").length} de ${RESIDUOS_MES_AMB.length} con cantidad`} abierta={abierta === "residuos"} onToggle={alternar}>
          {RESIDUOS_MES_AMB.map(([nombre, unidad], i) => {
            const c = d.residuos[i];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre} <span className="font-normal text-gray-500">({unidad})</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad del mes" value={c.cant} inputMode="decimal" onChange={(v) => actualizarCant("residuos")(i, { cant: soloNumeros(v) })} />
                  <Campo label="Acumulado de la obra" value={c.acum} inputMode="decimal" onChange={(v) => actualizarCant("residuos")(i, { acum: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Gestor o destino" value={c.obs} onChange={(v) => actualizarCant("residuos")(i, { obs: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        <Seccion id="consumos" titulo="4. Consumos de recursos" subtitulo={`${d.consumos.filter((c) => String(c.cant).trim() !== "").length} de ${CONSUMOS_MES_AMB.length} con cantidad`} abierta={abierta === "consumos"} onToggle={alternar}>
          {CONSUMOS_MES_AMB.map(([nombre, unidad], i) => {
            const c = d.consumos[i];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre} <span className="font-normal text-gray-500">({unidad})</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Consumo del mes" value={c.cant} inputMode="decimal" onChange={(v) => actualizarCant("consumos")(i, { cant: soloNumeros(v) })} />
                  <Campo label="Acumulado de la obra" value={c.acum} inputMode="decimal" onChange={(v) => actualizarCant("consumos")(i, { acum: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Observaciones del consumo" value={c.obs} onChange={(v) => actualizarCant("consumos")(i, { obs: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        <Seccion id="gestion" titulo="5. Gestión y seguimiento" subtitulo={`${d.gestion.filter((c) => String(c.cant).trim() !== "").length} de ${GESTION_MES_AMB.length} con cantidad`} abierta={abierta === "gestion"} onToggle={alternar}>
          {GESTION_MES_AMB.map(([nombre, unidad], i) => {
            const c = d.gestion[i];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre} <span className="font-normal text-gray-500">({unidad})</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad del mes" value={c.cant} inputMode="decimal" onChange={(v) => actualizarCant("gestion")(i, { cant: soloNumeros(v) })} />
                  <Campo label="Acumulado de la obra" value={c.acum} inputMode="decimal" onChange={(v) => actualizarCant("gestion")(i, { acum: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Observaciones de la gestión" value={c.obs} onChange={(v) => actualizarCant("gestion")(i, { obs: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        {/* 6. TEXTOS */}
        <Seccion id="textos" titulo="6. Hechos relevantes, conclusiones y plan" subtitulo="Lo más importante del mes" abierta={abierta === "textos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Hechos relevantes del mes" value={d.hechos} onChange={(v) => set("hechos", v)} filas={3} />
            <AreaTexto label="Conclusiones" value={d.conclusiones} onChange={(v) => set("conclusiones", v)} filas={3} />
            <AreaTexto label="Plan del próximo mes" value={d.planMes} onChange={(v) => set("planMes", v)} filas={3} />
          </div>
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
            ➡ Nuevo informe (avanza al mes siguiente y conserva la obra y las firmas)
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
