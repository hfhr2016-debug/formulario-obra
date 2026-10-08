import { useState } from "react";
import { fechaHoyISO } from "./sstBase";
import {
  CODIGO_SEMANAL_AMB, HOJA_SEMANAL_AMB, CELDAS_SEMANAL_AMB, ACTIVIDADES_AMB, CANTIDADES_AMB, CLIMAS,
  descubrirSemanalAmb, escribirSemanalAmbEnHoja, validarSemanalAmb, camposFaltantesSemanalAmb, resumenSemanalAmb, actividadAmbNueva, cantidadAmbNueva, rellenarSemanaAmbDesdeRegistros, N_FOTOS_SEMANAL_AMB, fotosAmbIniciales,
} from "./semanalAmbDatos";
import { FUENTES_AMB, inicioSemana, finSemana, numeroSemana, sumarDias } from "./consolidadoAmb";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, Lista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { CLAVE_AMB_SEMANALES, TraerDeFichaAmb, BloqueFotosAmb, archivosFotoIniciales } from "./ambComunes";
import { agregarFotosARecuadros, lineasMarca } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_semanal_amb";
const CLAVE_SEMANALES = CLAVE_AMB_SEMANALES;           // resumen de cada informe semanal generado

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", semana: "", desde: "", hasta: "", trabajadores: "", dias: "", clima: "",
    actividades: ACTIVIDADES_AMB.map(actividadAmbNueva), cantidades: CANTIDADES_AMB.map(cantidadAmbNueva),
    incidentes: "", quejas: "", quejasAt: "", abiertas: "", vencidas: "", cerradas: "", logros: "", dificultades: "", plan: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
    fotos: fotosAmbIniciales(),
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.semana || d.desde || d.hasta || d.trabajadores || d.dias || d.clima || d.incidentes || d.quejas || d.quejasAt || d.abiertas || d.vencidas || d.cerradas || d.logros || d.dificultades || d.plan || d.elaboroNombre ||
    d.actividades.some((a) => a.prog || a.ejec || a.obs) || d.cantidades.some((c) => c.cant || c.acum || c.obs) || (d.fotos || []).some((f) => f && f.descripcion));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");
const pct = (a) => { const p = Number(String(a.prog).replace(",", ".")), e = Number(String(a.ejec).replace(",", ".")); return String(a.prog).trim() !== "" && String(a.ejec).trim() !== "" && p > 0 ? Math.round((e / p) * 100) : null; };

export default function FormularioSemanalAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTraer, setAvisoTraer] = useState("");
  const [archivos, setArchivos] = useState(() => archivosFotoIniciales(N_FOTOS_SEMANAL_AMB));   // las fotos no se guardan en el borrador
  const ponerArchivo = (i, f) => setArchivos((cur) => cur.map((x, j) => (j === i ? f : x)));
  const ponerDescripcion = (i, v) => setD((cur) => ({ ...cur, fotos: Array.from({ length: N_FOTOS_SEMANAL_AMB }, (_, j) => (j === i ? { ...((cur.fotos || [])[j] || {}), descripcion: v } : (cur.fotos || [])[j] || { descripcion: "" })) }));

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
  const actualizarCant = (i, patch) => setD((cur) => ({ ...cur, cantidades: cur.cantidades.map((a, k) => (k === i ? { ...a, ...patch } : a)) }));

  // ---- La semana va de lunes a domingo ----
  const ponerSemana = (cualquierDia) => setD((cur) => ({ ...cur, desde: inicioSemana(cualquierDia), hasta: finSemana(cualquierDia), semana: "" }));
  const cambiarDesde = (v) => setD((cur) => ({ ...cur, desde: v, hasta: v && (!cur.hasta || cur.hasta === finSemana(cur.desde)) ? sumarDias(v, 6) : cur.hasta }));

  // ---- Traer lo registrado en la app ----
  function traerRegistrado() {
    if (!d.desde || !d.hasta) { setAvisoTraer("Elige primero la semana (las fechas «Desde» y «Hasta»)."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES_AMB).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas } = rellenarSemanaAmbDesdeRegistros(d, regs);
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app esa semana (los residuos entran si su hoja del Registro de Residuos cubre la semana; los consumos se registran por mes, escríbelos a mano). Lo que ya habías escrito no se tocó; si no hubo registros, la casilla queda en blanco (escribe 0 si de verdad no hubo).` : "No hay nada nuevo registrado en esas fechas, o ya estaba todo escrito.");
  }

  const hechas = d.actividades.filter((a) => String(a.ejec).trim() !== "").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarSemanalAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesSemanalAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-semanal-amb.xlsx", HOJA_SEMANAL_AMB);
      const avisos = [];
      const lectura = descubrirSemanalAmb(ws);
      const decision = decidirDistribucion(lectura, CELDAS_SEMANAL_AMB);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirSemanalAmbEnHoja(ws, d, celdas);
      const sinRecuadro = await agregarFotosARecuadros(workbook, ws, archivos, celdas.fotos && celdas.fotos.fotos, "#F2F2F2", archivos.map((a) => lineasMarca(d.proyecto, {}, a && a.file)));
      if (sinRecuadro) avisos.push(`La plantilla no tiene recuadro para ${sinRecuadro} de las fotos y no se incluyó${sinRecuadro > 1 ? "eron" : ""}.`);
      setAvisoGeneracion(avisos.join(" "));
      const nSemana = String(d.semana).trim() || String(numeroSemana(d.desde));
      await descargarLibro(workbook, `Informe_semanal_amb_${d.desde}_S${textoParaArchivo(nSemana, 4)}.xlsx`);

      // Memoria para la próxima vez
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenSemanalAmb(d);
      guardarJSON(CLAVE_SEMANALES, [res, ...leerJSON(CLAVE_SEMANALES, []).filter((x) => x.id !== res.id)].slice(0, 120));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, semana: nSemana }));
      setGenerado(`✓ Excel descargado (informe de la semana ${nSemana}: del ${d.desde} al ${d.hasta}, ${hechas} ${hechas === 1 ? "actividad con cifra" : "actividades con cifra"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva semana: conserva la obra y las firmas y avanza a la semana siguiente (lunes a domingo)
  function nuevaSemana() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion,
      desde: cur.hasta ? sumarDias(cur.hasta, 1) : "", hasta: cur.hasta ? sumarDias(cur.hasta, 7) : "",
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo,
    }));
    borrador.borrarBorrador(); setArchivos(archivosFotoIniciales(N_FOTOS_SEMANAL_AMB)); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un informe en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setArchivos(archivosFotoIniciales(N_FOTOS_SEMANAL_AMB)); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe semanal" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INFORME SEMANAL AMBIENTAL" subtitulo={`${CODIGO_SEMANAL_AMB} · Gestión ambiental de la semana`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la semana" subtitulo={d.desde && d.hasta ? `Del ${d.desde} al ${d.hasta}` : "Obra, fechas y personal"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => ponerSemana(sumarDias(fechaHoyISO(), -7))} className="text-center py-2 rounded-lg text-[11.5px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>📅 Semana pasada</button>
              <button type="button" onClick={() => ponerSemana(fechaHoyISO())} className="text-center py-2 rounded-lg text-[11.5px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>📅 Esta semana</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Desde" type="date" value={d.desde} onChange={cambiarDesde} />
              <Campo label="Hasta" type="date" value={d.hasta} onChange={(v) => set("hasta", v)} />
            </div>
            <div className="text-[10.5px] -mt-1" style={{ color: "#8A8F99" }}>La semana va de lunes a domingo. Al elegir «Desde», «Hasta» se completa 6 días después.</div>
            <Campo label="Semana N°" value={d.semana} placeholder={d.desde ? `Automática (${numeroSemana(d.desde)})` : "Automática"} inputMode="numeric" onChange={(v) => set("semana", v.replace(/[^0-9]/g, ""))} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", soloNumeros(v))} />
              <Campo label="Días trabajados" value={d.dias} inputMode="numeric" onChange={(v) => set("dias", soloNumeros(v))} />
            </div>
            <Lista label="Clima predominante" value={d.clima} onChange={(v) => set("clima", v)} opciones={CLIMAS} />
          </div>
        </Seccion>

        {/* 2. ACTIVIDADES */}
        <Seccion id="actividades" titulo="2. Actividades ambientales" subtitulo={`${hechas} de ${ACTIVIDADES_AMB.length} con cifra`} abierta={abierta === "actividades"} onToggle={alternar} contador={hechas}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer lo registrado en la app esa semana
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {ACTIVIDADES_AMB.map((nombre, i) => {
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

        {/* 3. RESIDUOS Y CONSUMOS */}
        <Seccion id="cantidades" titulo="3. Residuos y consumos de la semana" subtitulo={`${d.cantidades.filter((c) => String(c.cant).trim() !== "").length} de ${CANTIDADES_AMB.length} con cantidad`} abierta={abierta === "cantidades"} onToggle={alternar}>
          {CANTIDADES_AMB.map(([nombre, unidad], i) => {
            const c = d.cantidades[i];
            return (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre} <span className="font-normal text-gray-500">({unidad})</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad de la semana" value={c.cant} inputMode="decimal" onChange={(v) => actualizarCant(i, { cant: soloNumeros(v) })} />
                  <Campo label="Acumulado de la obra" value={c.acum} inputMode="decimal" onChange={(v) => actualizarCant(i, { acum: soloNumeros(v) })} />
                </div>
                <div className="mt-2"><Campo label="Observaciones de la cantidad" value={c.obs} onChange={(v) => actualizarCant(i, { obs: v })} /></div>
              </div>
            );
          })}
        </Seccion>

        {/* 4. SEGUIMIENTO */}
        <Seccion id="acciones" titulo="4. Seguimiento" subtitulo="Incidentes, quejas y acciones al cierre de la semana" abierta={abierta === "acciones"} onToggle={alternar}>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="Incidentes ambientales" value={d.incidentes} inputMode="numeric" onChange={(v) => set("incidentes", soloNumeros(v))} />
            <Campo label="Quejas recibidas" value={d.quejas} inputMode="numeric" onChange={(v) => set("quejas", soloNumeros(v))} />
            <Campo label="Quejas atendidas" value={d.quejasAt} inputMode="numeric" onChange={(v) => set("quejasAt", soloNumeros(v))} />
            <Campo label="Acciones abiertas al cierre" value={d.abiertas} inputMode="numeric" onChange={(v) => set("abiertas", soloNumeros(v))} />
            <Campo label="Acciones vencidas" value={d.vencidas} inputMode="numeric" onChange={(v) => set("vencidas", soloNumeros(v))} />
            <Campo label="Acciones cerradas en la semana" value={d.cerradas} inputMode="numeric" onChange={(v) => set("cerradas", soloNumeros(v))} />
          </div>
        </Seccion>

        {/* 5. TEXTOS */}
        <Seccion id="textos" titulo="5. Logros, dificultades y plan" subtitulo="Lo más importante de la semana" abierta={abierta === "textos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Logros de la semana" value={d.logros} onChange={(v) => set("logros", v)} filas={3} />
            <AreaTexto label="Dificultades o impactos nuevos" value={d.dificultades} onChange={(v) => set("dificultades", v)} filas={3} />
            <AreaTexto label="Plan de la próxima semana" value={d.plan} onChange={(v) => set("plan", v)} filas={3} />
          </div>
        </Seccion>

        {/* 6. FIRMAS */}
        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Visto bueno (gerencia o interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        {/* 7. FOTOS */}
        <Seccion id="fotos" titulo="7. Registro fotográfico" subtitulo={`${archivos.filter((a) => a && a.file).length} de ${N_FOTOS_SEMANAL_AMB} fotos`} abierta={abierta === "fotos"} onToggle={alternar} contador={archivos.filter((a) => a && a.file).length}>
          <BloqueFotosAmb n={N_FOTOS_SEMANAL_AMB} fotos={d.fotos} archivos={archivos} onArchivo={ponerArchivo} onDescripcion={ponerDescripcion} />
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaSemana} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva semana (avanza las fechas y conserva la obra y las firmas)
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
