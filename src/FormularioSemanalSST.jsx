import { useState } from "react";
import { fechaHoyISO } from "./sstBase";
import {
  CODIGO_SEMANAL, HOJA_SEMANAL, CELDAS_SEMANAL, ACTIVIDADES,
  descubrirSemanal, escribirSemanalEnHoja, validarSemanal, camposFaltantesSemanal, resumenSemanal, actividadNueva, rellenarSemanaDesdeRegistros,
} from "./semanalSSTDatos";
import { FUENTES, inicioSemana, finSemana, numeroSemana, sumarDias } from "./consolidadoSST";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, BuscadorLista, TraerDeFicha,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";

const CLAVE_BORRADOR = "ryr_borrador_semanal";
const CLAVE_SEMANALES = "ryr_sst_semanales";           // resumen de cada informe semanal generado

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", semana: "", desde: "", hasta: "", trabajadores: "", hht: "", dias: "",
    actividades: ACTIVIDADES.map(actividadNueva), abiertas: "", vencidas: "", cerradas: "", diasInc: "", logros: "", dificultades: "", plan: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.semana || d.desde || d.hasta || d.trabajadores || d.hht || d.abiertas || d.logros || d.dificultades || d.plan || d.elaboroNombre ||
    d.actividades.some((a) => a.prog || a.ejec || a.obs));
}
const soloNumeros = (v) => v.replace(/[^0-9.,]/g, "");
const pct = (a) => { const p = Number(String(a.prog).replace(",", ".")), e = Number(String(a.ejec).replace(",", ".")); return String(a.prog).trim() !== "" && String(a.ejec).trim() !== "" && p > 0 ? Math.round((e / p) * 100) : null; };

export default function FormularioSemanalSST({ onVolver }) {
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

  // ---- La semana va de lunes a domingo ----
  const ponerSemana = (cualquierDia) => setD((cur) => ({ ...cur, desde: inicioSemana(cualquierDia), hasta: finSemana(cualquierDia), semana: "" }));
  const cambiarDesde = (v) => setD((cur) => ({ ...cur, desde: v, hasta: v && (!cur.hasta || cur.hasta === finSemana(cur.desde)) ? sumarDias(v, 6) : cur.hasta }));

  // ---- Traer lo registrado en la app ----
  function traerRegistrado() {
    if (!d.desde || !d.hasta) { setAvisoTraer("Elige primero la semana (las fechas «Desde» y «Hasta»)."); return; }
    const regs = Object.fromEntries(Object.entries(FUENTES).map(([k, clave]) => [k, leerJSON(clave, [])]));
    const { cambios, llenadas } = rellenarSemanaDesdeRegistros(d, regs);
    setD((cur) => ({ ...cur, ...cambios }));
    setAvisoTraer(llenadas ? `Se llenaron ${llenadas} ${llenadas === 1 ? "casilla" : "casillas"} con lo registrado en la app esa semana. Lo que ya habías escrito no se tocó; si no hubo registros, la casilla queda en blanco (escribe 0 si de verdad no hubo).` : "No hay nada nuevo registrado en esas fechas, o ya estaba todo escrito.");
  }

  const hechas = d.actividades.filter((a) => String(a.ejec).trim() !== "").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarSemanal(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesSemanal(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-semanal-sst.xlsx", HOJA_SEMANAL);
      const avisos = [];
      const lectura = descubrirSemanal(ws);
      const decision = decidirDistribucion(lectura, CELDAS_SEMANAL);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirSemanalEnHoja(ws, d, celdas);
      setAvisoGeneracion(avisos.join(" "));
      const nSemana = String(d.semana).trim() || String(numeroSemana(d.desde));
      await descargarLibro(workbook, `Informe_semanal_${d.desde}_S${textoParaArchivo(nSemana, 4)}.xlsx`);

      // Memoria para la próxima vez
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenSemanal(d);
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
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un informe en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoTraer(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un informe semanal" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Informe Semanal SST" subtitulo={`${CODIGO_SEMANAL} · Gestión de seguridad y salud de la semana`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la semana" subtitulo={d.desde && d.hasta ? `Del ${d.desde} al ${d.hasta}` : "Obra, fechas y personal"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion, trabajadores: cur.trabajadores || f.trabajadoresPrev || "" }))} />
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
            <div className="grid grid-cols-3 gap-2.5">
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", soloNumeros(v))} />
              <Campo label="Horas-hombre (HHT)" value={d.hht} inputMode="decimal" onChange={(v) => set("hht", soloNumeros(v))} />
              <Campo label="Días trabajados" value={d.dias} inputMode="numeric" onChange={(v) => set("dias", soloNumeros(v))} />
            </div>
          </div>
        </Seccion>

        {/* 2. ACTIVIDADES */}
        <Seccion id="actividades" titulo="2. Actividades de prevención" subtitulo={`${hechas} de ${ACTIVIDADES.length} con cifra`} abierta={abierta === "actividades"} onToggle={alternar} contador={hechas}>
          <button type="button" onClick={traerRegistrado} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
            📥 Traer lo registrado en la app esa semana
          </button>
          {avisoTraer && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoTraer}</div>}
          {ACTIVIDADES.map((nombre, i) => {
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
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El cumplimiento (ejecutado ÷ programado) lo calcula el Excel. En accidentes e incidentes el «programado» no aplica.</div>
        </Seccion>

        {/* 3. ACCIONES */}
        <Seccion id="acciones" titulo="3. Acciones correctivas y preventivas" subtitulo="Estado al cierre de la semana" abierta={abierta === "acciones"} onToggle={alternar}>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="Abiertas al cierre" value={d.abiertas} inputMode="numeric" onChange={(v) => set("abiertas", soloNumeros(v))} />
            <Campo label="Vencidas" value={d.vencidas} inputMode="numeric" onChange={(v) => set("vencidas", soloNumeros(v))} />
            <Campo label="Cerradas en la semana" value={d.cerradas} inputMode="numeric" onChange={(v) => set("cerradas", soloNumeros(v))} />
            <Campo label="Días de incapacidad por AT" value={d.diasInc} inputMode="numeric" onChange={(v) => set("diasInc", soloNumeros(v))} />
          </div>
        </Seccion>

        {/* 4. TEXTOS */}
        <Seccion id="textos" titulo="4. Logros, dificultades y plan" subtitulo="Lo más importante de la semana" abierta={abierta === "textos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Logros de la semana" value={d.logros} onChange={(v) => set("logros", v)} filas={3} />
            <AreaTexto label="Dificultades o riesgos nuevos" value={d.dificultades} onChange={(v) => set("dificultades", v)} filas={3} />
            <AreaTexto label="Plan de la próxima semana" value={d.plan} onChange={(v) => set("plan", v)} filas={3} />
          </div>
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
