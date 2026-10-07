import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { textoDuracion } from "./sstBase";
import {
  CODIGO_INSPECCION, HOJA_INSPECCION, CELDAS_INSPECCION, TIPOS_INSPECCION, ESTADOS, NIVELES, ESTADOS_HALLAZGO, GRUPOS_INSPECCION, ITEMS_INSPECCION,
  tiposDe, descubrirInspeccion, escribirInspeccionEnHoja, validarInspeccion, resumenInspeccion, conteo, porcentajeCumplimiento, hallazgosConDatos,
  pendientesDePasarAHallazgos, textoHallazgoDeAspecto,
} from "./inspeccionesDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { camposFaltantesInspeccion } from "./inspeccionesDatos";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha, FilaVerificacion, GrillaOpciones } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_inspeccion";
const CLAVE_CONSECUTIVO = "ryr_sst_inspeccion_consecutivo";
const CLAVE_INSPECCIONES = "ryr_sst_inspecciones";          // resumen de cada inspección generada
const MAX_HALLAZGOS = (CELDAS_INSPECCION.tablas && CELDAS_INSPECCION.tablas.hallazgos.n) || 10;
const COLOR_NIVEL = { Alto: "#B3401F", Medio: "#C98A00", Bajo: "#2E7D4F" };
const N_ITEMS = ITEMS_INSPECCION.length;

const vacios = (n) => Array.from({ length: n }, () => "");
const hallazgoNuevo = (base = {}) => ({ hallazgo: "", nivel: "", accion: "", responsable: "", responsableCargo: "", fecha: "", estado: "Abierta", ...base });

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: "", horaInicio: "", horaFin: "", nInspeccion: "", tipos: [], area: "",
    inspectorNombre: "", inspectorCargo: "", acompanaNombre: "", acompanaCargo: "",
    respuestas: vacios(N_ITEMS), observaciones: vacios(N_ITEMS),
    hallazgos: [], obsGenerales: "", responsableNombre: "", responsableCargo: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.fecha || d.horaInicio || d.nInspeccion || tiposDe(d).length || d.area || d.inspectorNombre || d.acompanaNombre ||
    d.respuestas.some(Boolean) || d.hallazgos.length || d.obsGenerales);
}

export default function FormularioInspecciones({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoHallazgos, setAvisoHallazgos] = useState("");

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

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Lista de verificación ----
  const poner = (campo, i, valor) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((v, k) => (k === i ? valor : v)) }));
  const marcarFaltantes = (indices, valor) => setD((cur) => ({ ...cur, respuestas: cur.respuestas.map((v, k) => (indices.includes(k) ? v || valor : v)) }));
  const c = conteo(d);
  const pct = porcentajeCumplimiento(d);
  const respondidos = N_ITEMS - c.sin;
  let desde = 0;
  const grupos = GRUPOS_INSPECCION.map(([titulo, items]) => { const g = { titulo, items, desde }; desde += items.length; return g; });

  // ---- Hallazgos ----
  const setHallazgos = (nuevos) => setD((cur) => ({ ...cur, hallazgos: nuevos }));
  const actualizarHallazgo = (i, patch) => setHallazgos(d.hallazgos.map((h, k) => (k === i ? { ...h, ...patch } : h)));
  const quitarHallazgo = (i) => { setHallazgos(d.hallazgos.filter((_, k) => k !== i)); setAvisoHallazgos(""); };
  function agregarHallazgo() {
    if (d.hallazgos.length >= MAX_HALLAZGOS) { setAvisoHallazgos(`Esta inspección tiene espacio para ${MAX_HALLAZGOS} hallazgos. Si hay más, genera otra hoja para el resto.`); return; }
    setAvisoHallazgos(""); setHallazgos([...d.hallazgos, hallazgoNuevo()]);
  }
  const pendientes = pendientesDePasarAHallazgos(d);
  function pasarNoCumple() {
    const libres = MAX_HALLAZGOS - d.hallazgos.length;
    if (libres <= 0) { setAvisoHallazgos(`Esta inspección tiene espacio para ${MAX_HALLAZGOS} hallazgos y ya están llenos.`); return; }
    const nuevos = pendientes.slice(0, libres).map((p) => hallazgoNuevo({ hallazgo: textoHallazgoDeAspecto(d, p.i), nivel: "Medio" }));
    setAvisoHallazgos(pendientes.length > libres ? `Solo cabían ${libres} de los ${pendientes.length} aspectos "No cumple" en esta hoja.` : "");
    // Si la primera fila está vacía se reutiliza
    const base = d.hallazgos.filter((h) => hallazgosConDatos({ hallazgos: [h] }).length);
    setHallazgos([...base, ...nuevos]);
  }
  const hallazgosCon = hallazgosConDatos(d);
  const duracion = textoDuracion(d.horaInicio, d.horaFin);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarInspeccion(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesInspeccion(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-inspecciones.xlsx", HOJA_INSPECCION);
      let celdas = CELDAS_INSPECCION;
      const avisos = [];
      const lectura = descubrirInspeccion(ws);
      const decision = decidirDistribucion(lectura, CELDAS_INSPECCION);   // si el formato de la plantilla no coincide con la app, se detiene
      celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const capHallazgos = (celdas.tablas && celdas.tablas.hallazgos && celdas.tablas.hallazgos.n) || MAX_HALLAZGOS;
      if (hallazgosCon.length > capHallazgos) throw new Error(`la plantilla tiene espacio para ${capHallazgos} hallazgos y hay ${hallazgosCon.length}`);
      const capItems = (celdas.tablas && celdas.tablas.checklist && celdas.tablas.checklist.n) || N_ITEMS;
      if (capItems < N_ITEMS) avisos.push(`La plantilla tiene ${capItems} aspectos y la app tiene ${N_ITEMS}: los últimos no se escribieron.`);
      const nUsar = d.nInspeccion && String(d.nInspeccion).trim() ? String(d.nInspeccion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirInspeccionEnHoja(ws, { ...d, nInspeccion: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Inspeccion_${d.fecha}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(tiposDe(d).length > 1 ? "Varios-tipos" : tiposDe(d)[0] || "", 24)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      memoria.recordarUso({ personas: [[d.inspectorNombre, d.inspectorCargo], [d.acompanaNombre, d.acompanaCargo], [d.responsableNombre, d.responsableCargo], ...hallazgosCon.map((h) => [h.responsable, h.responsableCargo])], empresasUsadas: [d.contratista] });
      const res = resumenInspeccion({ ...d, nInspeccion: nUsar });
      guardarJSON(CLAVE_INSPECCIONES, [res, ...leerJSON(CLAVE_INSPECCIONES, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nInspeccion: nUsar }));
      const sinHallazgo = pendientesDePasarAHallazgos(d).length;
      setGenerado(`✓ Excel descargado (inspección N° ${nUsar}: cumplimiento ${pct === null ? "—" : pct + "%"}, ${c.no} sin cumplir, ${hallazgosCon.length} ${hallazgosCon.length === 1 ? "hallazgo" : "hallazgos"}).` +
        (sinHallazgo ? ` ⚠ ${sinHallazgo} ${sinHallazgo === 1 ? "aspecto" : "aspectos"} "No cumple" no ${sinHallazgo === 1 ? "está" : "están"} en los hallazgos.` : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva inspección: conserva la obra, el inspector y quien acompaña; limpia lo propio de cada inspección (el N° avanza solo)
  function nuevaInspeccion() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fecha: cur.fecha,
      inspectorNombre: cur.inspectorNombre, inspectorCargo: cur.inspectorCargo, responsableNombre: cur.responsableNombre, responsableCargo: cur.responsableCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una inspección en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoHallazgos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una inspección" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="INSPECCIÓN DE SEGURIDAD" subtitulo={`${CODIGO_INSPECCION} · Condiciones, equipos y orden en obra`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la inspección" subtitulo="Obra, tipo de inspección y quién la hace" abierta={abierta === "datos"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <CampoFecha label="Fecha de la inspección" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="N° de inspección" value={d.nInspeccion} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInspeccion", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            </div>
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            {duracion && <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>⏱ Duración: {duracion}</div>}
            <div>
              <div className="text-[10.5px] font-medium mb-1" style={{ color: "#8A8F99" }}>Tipo de inspección (puedes marcar varios)</div>
              <GrillaOpciones nombre="Tipo de inspección" opciones={TIPOS_INSPECCION} marcadas={tiposDe(d)} onAlternar={(t) => setD((cur) => { const act = tiposDe(cur); const nuevos = act.includes(t) ? act.filter((x) => x !== t) : [...act, t]; return { ...cur, tipos: TIPOS_INSPECCION.filter((x) => nuevos.includes(x)), tipo: "" }; })} />
            </div>
            <Campo label="Área / frente inspeccionado" value={d.area} onChange={(v) => set("area", v)} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Inspector</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del inspector" etqCargo="Cargo del inspector" nombre={d.inspectorNombre} cargo={d.inspectorCargo} onChange={cambiarPersona("inspectorNombre", "inspectorCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Acompaña (responsable del área)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien acompaña" etqCargo="Cargo de quien acompaña" nombre={d.acompanaNombre} cargo={d.acompanaCargo} onChange={cambiarPersona("acompanaNombre", "acompanaCargo")} />
          </div>
        </Seccion>

        {/* 2. LISTA DE VERIFICACIÓN */}
        <Seccion id="lista" titulo="2. Lista de verificación" subtitulo={`${respondidos} de ${N_ITEMS} respondidos${pct === null ? "" : ` · cumplimiento ${pct}%`}`} abierta={abierta === "lista"} onToggle={alternar} contador={respondidos}>
          <div className="rounded-lg p-2.5 mb-3 flex items-center justify-between text-[12px]" style={{ background: PAPER, border: `1px solid ${LINE}`, color: NAVY }}>
            <span>✔ {c.cumple} · ✘ {c.no} · N/A {c.na}</span>
            <span className="font-bold text-[14px]" style={{ color: pct === null ? "#8A8F99" : pct >= 80 ? "#2E7D4F" : pct >= 60 ? "#C98A00" : "#B3401F" }}>{pct === null ? "—" : `${pct}%`}</span>
          </div>
          <button type="button" onClick={() => marcarFaltantes(ITEMS_INSPECCION.map((_, i) => i), "Cumple")} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
            ✔ Marcar "Cumple" en los que faltan por responder
          </button>
          {grupos.map((g) => (
            <div key={g.titulo} className="mb-2">
              <div className="flex items-center justify-between mb-1.5 mt-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>{g.titulo}</div>
                <button type="button" aria-label={`Todo cumple ${g.titulo}`} onClick={() => marcarFaltantes(g.items.map((_, k) => g.desde + k), "Cumple")} className="text-[11px] underline" style={{ color: NAVY }}>Todo cumple</button>
              </div>
              {g.items.map((texto, k) => {
                const i = g.desde + k;
                return (
                  <FilaVerificacion key={i} numero={i + 1} texto={texto} valor={d.respuestas[i]} onChange={(v) => poner("respuestas", i, v)} opciones={ESTADOS}
                    observacion={d.observaciones[i]} onObservacion={(v) => poner("observaciones", i, v)} />
                );
              })}
            </div>
          ))}
        </Seccion>

        {/* 3. HALLAZGOS */}
        <Seccion id="hallazgos" titulo="3. Hallazgos y acciones correctivas" subtitulo={`${hallazgosCon.length} de ${MAX_HALLAZGOS} hallazgos`} abierta={abierta === "hallazgos"} onToggle={alternar} contador={hallazgosCon.length}>
          {pendientes.length > 0 && (
            <button type="button" onClick={pasarNoCumple} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: "#B3401F" }}>
              ⚠ Pasar a hallazgos los {pendientes.length} aspectos "No cumple"
            </button>
          )}
          {d.hallazgos.map((h, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <AreaTexto label="Hallazgo" value={h.hallazgo} onChange={(v) => actualizarHallazgo(i, { hallazgo: v })} filas={2} />
                <ChipsOpcion label="Nivel de riesgo" nombre={`Nivel ${i + 1}`} value={h.nivel} opciones={NIVELES} colores={COLOR_NIVEL} pequeno onChange={(v) => actualizarHallazgo(i, { nivel: v })} />
                <AreaTexto label="Acción correctiva" value={h.accion} onChange={(v) => actualizarHallazgo(i, { accion: v })} filas={2} />
                <BloqueProfesional memoria={memoria} etqNombre="Responsable" etqCargo="Cargo del responsable" nombre={h.responsable} cargo={h.responsableCargo}
                  onChange={(patch) => actualizarHallazgo(i, { ...(patch.nombre !== undefined ? { responsable: patch.nombre } : {}), ...(patch.cargo !== undefined ? { responsableCargo: patch.cargo } : {}) })} />
                <Campo label="Fecha límite" type="date" value={h.fecha} onChange={(v) => actualizarHallazgo(i, { fecha: v })} />
                <ChipsOpcion label="Estado" nombre={`Estado ${i + 1}`} value={h.estado} opciones={ESTADOS_HALLAZGO} pequeno onChange={(v) => actualizarHallazgo(i, { estado: v })} />
              </div>
              <button type="button" onClick={() => quitarHallazgo(i)} aria-label={`Quitar hallazgo ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarHallazgo} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar hallazgo
          </button>
          {avisoHallazgos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoHallazgos}</div>}
        </Seccion>

        {/* 4. OBSERVACIONES */}
        <Seccion id="obs" titulo="4. Observaciones generales" subtitulo="Opcional" abierta={abierta === "obs"} onToggle={alternar}>
          <AreaTexto label="Observaciones generales" value={d.obsGenerales} onChange={(v) => set("obsGenerales", v)} filas={4} />
        </Seccion>

        {/* 5. FIRMAS */}
        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Firma el inspector y el responsable del área" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Inspector (ya escrito en el paso 1)</div>
            <div className="text-[12px]" style={{ color: "#4B5563" }}>{d.inspectorNombre || "Sin nombre todavía"}{d.inspectorCargo ? ` · ${d.inspectorCargo}` : ""}</div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable del área / residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable" etqCargo="Cargo del responsable" nombre={d.responsableNombre} cargo={d.responsableCargo} onChange={cambiarPersona("responsableNombre", "responsableCargo")} />
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Si lo dejas vacío, firma quien acompañó la inspección{d.acompanaNombre ? ` (${d.acompanaNombre})` : ""}.</div>
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaInspeccion} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva inspección (conserva la obra y el inspector)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la inspección" onGenerar={generarExcel} />
    </div>
  );
}
