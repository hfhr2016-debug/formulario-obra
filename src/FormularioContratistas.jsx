import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_CONTRATISTAS, HOJA_CONTRATISTAS, CELDAS_CONTRATISTAS, CRITERIOS, CALIFICACIONES, COLORES_RESULTADO,
  descubrirContratistas, escribirContratistasEnHoja, validarContratistas, camposFaltantesContratistas, resumenContratistas, criterioNuevo, mejoraNueva, mejorasConDatos, resultadoEvaluacion, proponerMejoras,
} from "./contratistasDatos";
import {
  NAVY, GOLD, PAPER, LINE, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, BuscadorLista, TraerDeFicha,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_contratistas";
const CLAVE_CONTRATISTAS = "ryr_sst_contratistas";     // resumen de cada evaluación: Acciones Correctivas trae sus acciones de mejora y el Informe Mensual las cuenta
const MAX_MEJORAS = (CELDAS_CONTRATISTAS.tablas && CELDAS_CONTRATISTAS.tablas.mejoras.n) || 4;
const COLOR_CALIF = { Cumple: "#2E7D4F", Parcial: "#C98A00", "No cumple": "#B3401F", "No aplica": "#8A8F99" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", nit: "", contacto: "", telefono: "", actividad: "", fecha: "", periodo: "", trabajadores: "",
    criterios: CRITERIOS.map(criterioNuevo), mejoras: [mejoraNueva()],
    evaluoNombre: "", evaluoCargo: "", representanteNombre: "", representanteCargo: "", residenteNombre: "", residenteCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.nit || d.contacto || d.telefono || d.actividad || d.fecha || d.periodo || d.trabajadores || d.evaluoNombre || d.representanteNombre ||
    d.criterios.some((c) => c.calificacion || c.obs) || d.mejoras.some((m) => m.accion || m.responsable || m.fecha));
}

export default function FormularioContratistas({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoMejoras, setAvisoMejoras] = useState("");

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
  const actualizarCriterio = (i, patch) => setD((cur) => ({ ...cur, criterios: cur.criterios.map((c, k) => (k === i ? { ...c, ...patch } : c)) }));
  const setMejoras = (nuevas) => setD((cur) => ({ ...cur, mejoras: nuevas.length ? nuevas : [mejoraNueva()] }));
  const actualizarMejora = (i, patch) => setMejoras(d.mejoras.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  const quitarMejora = (i) => { setMejoras(d.mejoras.filter((_, k) => k !== i)); setAvisoMejoras(""); };
  function agregarMejora() {
    if (d.mejoras.length >= MAX_MEJORAS) { setAvisoMejoras(`Esta hoja tiene espacio para ${MAX_MEJORAS} acciones de mejora.`); return; }
    setAvisoMejoras(""); setMejoras([...d.mejoras, mejoraNueva()]);
  }
  function proponer() {
    const antes = mejorasConDatos(d).length, nuevas = proponerMejoras(d, MAX_MEJORAS);
    if (nuevas.length === antes) { setAvisoMejoras(resultado.noCumplen ? "Ya están escritas las acciones de los criterios que no cumplen (o no caben más)." : "No hay criterios marcados como «No cumple»."); return; }
    setMejoras(nuevas); setAvisoMejoras(`Se agregaron ${nuevas.length - antes} ${nuevas.length - antes === 1 ? "acción" : "acciones"} de los criterios que no cumplen. Completa el responsable y la fecha límite.`);
  }
  const marcarCumple = () => setD((cur) => ({ ...cur, criterios: cur.criterios.map((c) => (c.calificacion ? c : { ...c, calificacion: "Cumple" })) }));

  // ---- Contratistas ya evaluados (se sugieren y traen su NIT, contacto, teléfono y actividad) ----
  const evaluados = leerJSON(CLAVE_CONTRATISTAS, []);
  const vistos = new Set(), opcionesContratistas = [];
  for (const r of evaluados) { const k = String(r.contratista || "").toLowerCase(); if (k && !vistos.has(k)) { vistos.add(k); opcionesContratistas.push({ texto: r.contratista, detalle: r.nit || "" }); } }
  function elegirContratista(o) {
    const r = evaluados.find((x) => String(x.contratista || "").toLowerCase() === String(o.texto).toLowerCase());
    setD((cur) => ({ ...cur, contratista: r ? r.contratista : o.texto, nit: cur.nit || (r && r.nit) || "", contacto: cur.contacto || (r && r.contacto) || "", telefono: cur.telefono || (r && r.telefono) || "", actividad: cur.actividad || (r && r.actividad) || "" }));
  }

  const resultado = resultadoEvaluacion(d);
  const colorRes = COLORES_RESULTADO[resultado.resultado];
  const sinCalificar = CRITERIOS.length - resultado.calificados;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarContratistas(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesContratistas(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-contratistas.xlsx", HOJA_CONTRATISTAS);
      const avisos = [];
      const lectura = descubrirContratistas(ws);
      const decision = decidirDistribucion(lectura, CELDAS_CONTRATISTAS);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirContratistasEnHoja(ws, d, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Evaluacion_contratista_${textoParaArchivo(d.contratista, 24)}_${d.fecha}.xlsx`);

      // Memoria para la próxima vez
      memoria.recordarUso({ personas: [[d.evaluoNombre, d.evaluoCargo], [d.residenteNombre, d.residenteCargo]], empresasUsadas: [d.contratista] });
      const res = resumenContratistas(d);
      guardarJSON(CLAVE_CONTRATISTAS, [res, ...leerJSON(CLAVE_CONTRATISTAS, []).filter((x) => x.id !== res.id)].slice(0, 200));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${d.contratista}: ${res.porcentaje} % de cumplimiento → ${res.resultado}).` + (res.mejoras.length ? ` Las ${res.mejoras.length === 1 ? "acción" : `${res.mejoras.length} acciones`} de mejora ya se pueden traer en Acciones Correctivas.` : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva evaluación: conserva la obra, quien evalúa y el residente; limpia lo del contratista
  function nuevaEvaluacion() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, evaluoNombre: cur.evaluoNombre, evaluoCargo: cur.evaluoCargo, residenteNombre: cur.residenteNombre, residenteCargo: cur.residenteCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoMejoras(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una evaluación en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoMejoras(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una evaluación de contratista" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Evaluación de Contratistas" subtitulo={`${CODIGO_CONTRATISTAS} · Cumplimiento de SST de contratistas y subcontratistas`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la evaluación" subtitulo={d.contratista || "Obra y contratista evaluado"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <BuscadorLista label="Contratista evaluado" value={d.contratista} opciones={opcionesContratistas} opcionesAlAbrir={opcionesContratistas} maxResultados={10} placeholder="Escribe el nombre (si ya lo evaluaste, se sugiere)"
              onChange={(v) => set("contratista", v)} onElegir={elegirContratista} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="NIT" value={d.nit} inputMode="numeric" onChange={(v) => set("nit", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
              <Campo label="Teléfono" value={d.telefono} inputMode="tel" onChange={(v) => set("telefono", v)} />
            </div>
            <Campo label="Representante o contacto" value={d.contacto} onChange={(v) => set("contacto", v)} />
            <Campo label="Actividad que ejecuta" value={d.actividad} placeholder="Ej. Instalación de ductos" onChange={(v) => set("actividad", v)} />
            <CampoFecha label="Fecha de evaluación" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Periodo evaluado" value={d.periodo} placeholder="Ej. Septiembre 2026" onChange={(v) => set("periodo", v)} />
              <Campo label="Trabajadores del contratista" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", v.replace(/[^0-9]/g, ""))} />
            </div>
          </div>
        </Seccion>

        {/* 2. CRITERIOS */}
        <Seccion id="criterios" titulo="2. Criterios de evaluación" subtitulo={`${resultado.calificados} de ${CRITERIOS.length} calificados${resultado.resultado ? ` · ${resultado.resultado}` : ""}`} abierta={abierta === "criterios"} onToggle={alternar} contador={resultado.calificados}>
          <div className="p-2.5 rounded-lg mb-3" style={{ background: "white", border: `1px solid ${LINE}` }}>
            <div className="text-[11.5px]" style={{ color: "#4B5563" }}>Aplicables <b>{resultado.aplicables}</b> · Cumplen <b>{resultado.cumplen}</b> · Parciales <b>{resultado.parciales}</b> · No cumplen <b>{resultado.noCumplen}</b>{sinCalificar > 0 ? ` · Sin calificar ${sinCalificar}` : ""}</div>
            {colorRes ? <div className="text-[13px] font-bold px-3 py-2 rounded-md text-center mt-1.5" style={{ background: "#" + colorRes.relleno, color: "#" + colorRes.fuente }}>Cumplimiento {Math.round(resultado.porcentaje * 100)} % — {resultado.resultado}</div>
              : <div className="text-[11px] mt-1" style={{ color: "#8A8F99" }}>El resultado aparece al calificar los criterios.</div>}
          </div>
          <button type="button" onClick={marcarCumple} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>✔ Marcar «Cumple» en los que faltan por calificar</button>
          {CRITERIOS.map((texto, i) => (
            <div key={texto} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: d.criterios[i].calificacion === "No cumple" ? "#E8B4A6" : LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {texto}</div>
              <div className="space-y-2">
                <ChipsOpcion label="Calificación" nombre={`Calificación ${i + 1}`} value={d.criterios[i].calificacion} opciones={CALIFICACIONES} colores={COLOR_CALIF} pequeno onChange={(v) => actualizarCriterio(i, { calificacion: v })} />
                <Campo label="Observación" value={d.criterios[i].obs} onChange={(v) => actualizarCriterio(i, { obs: v })} />
              </div>
            </div>
          ))}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Satisfactorio: 90 % o más · Aceptable: 70 a 89 % · Deficiente: menos de 70 %. Un criterio «Parcial» vale la mitad; los «No aplica» no cuentan.</div>
        </Seccion>

        {/* 3. ACCIONES DE MEJORA */}
        <Seccion id="mejoras" titulo="3. Acciones de mejora acordadas" subtitulo={`${mejorasConDatos(d).length} de ${MAX_MEJORAS} acciones`} abierta={abierta === "mejoras"} onToggle={alternar} contador={mejorasConDatos(d).length}>
          <button type="button" onClick={proponer} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-2.5" style={{ borderColor: NAVY, color: NAVY }}>➕ Proponer acciones de los criterios que no cumplen</button>
          {avisoMejoras && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoMejoras}</div>}
          {d.mejoras.map((m, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <Campo label="Acción de mejora" value={m.accion} onChange={(v) => actualizarMejora(i, { accion: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Responsable de la acción" value={m.responsable} onChange={(v) => actualizarMejora(i, { responsable: v })} />
                  <Campo label="Fecha límite" type="date" value={m.fecha} onChange={(v) => actualizarMejora(i, { fecha: v })} />
                </div>
              </div>
              <button type="button" onClick={() => quitarMejora(i)} aria-label={`Quitar acción ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={agregarMejora} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar acción de mejora</button>
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Las acciones que dejes escritas se pueden traer luego en Acciones Correctivas para darles seguimiento.</div>
        </Seccion>

        {/* 4. FIRMAS */}
        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Evalúa SST; firma el contratista; firma el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Evaluó (responsable SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien evalúa" etqCargo="Cargo de quien evalúa" nombre={d.evaluoNombre} cargo={d.evaluoCargo} onChange={cambiarPersona("evaluoNombre", "evaluoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Representante del contratista</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del representante del contratista" etqCargo="Cargo del representante del contratista" nombre={d.representanteNombre} cargo={d.representanteCargo} onChange={cambiarPersona("representanteNombre", "representanteCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del residente" etqCargo="Cargo del residente" nombre={d.residenteNombre} cargo={d.residenteCargo} onChange={cambiarPersona("residenteNombre", "residenteCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaEvaluacion} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva evaluación (conserva la obra, quien evalúa y el residente)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la evaluación" onGenerar={generarExcel} />
    </div>
  );
}
