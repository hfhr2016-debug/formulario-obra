import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_MATRIZ, HOJA_MATRIZ, CELDAS_MATRIZ, CLASIFICACION, SI_NO, NIVELES_ND, NIVELES_NE, NIVELES_NC, COLORES_NIVEL_MATRIZ,
  descubrirMatriz, escribirMatrizEnHoja, validarMatriz, camposFaltantesMatriz, resumenMatriz, riesgoNuevo, riesgoVacio, riesgosConDatos, valorar, noAceptables,
} from "./matrizDatos";
import { PELIGROS_COMUNES } from "./atsDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, TraerDeFicha,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_matriz";
const CLAVE_HOJA = "ryr_sst_matriz_hoja";
const CLAVE_MATRIZ = "ryr_sst_matriz";                 // resumen de cada hoja: Acciones Correctivas trae de aquí los riesgos no aceptables
const MAX_RIESGOS = (CELDAS_MATRIZ.tablas && CELDAS_MATRIZ.tablas.riesgos.n) || 12;
const OPC_PELIGROS = PELIGROS_COMUNES.map((p) => ({ texto: p.peligro, detalle: "" }));

function datosIniciales() {
  return { proyecto: "", contratista: "", ubicacion: "", fechaElaboracion: "", actualizacion: "", version: "", hoja: "", participan: "", riesgos: [riesgoNuevo()],
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "" };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.fechaElaboracion || d.version || d.participan || d.elaboroNombre || d.riesgos.some((r) => !riesgoVacio(r)));
}

export default function FormularioMatriz({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoFilas, setAvisoFilas] = useState("");

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

  // ---- Peligros ----
  const setRiesgos = (nuevos) => setD((cur) => ({ ...cur, riesgos: nuevos.length ? nuevos : [riesgoNuevo()] }));
  const actualizar = (i, patch) => setRiesgos(d.riesgos.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const quitar = (i) => { setRiesgos(d.riesgos.filter((_, k) => k !== i)); setAvisoFilas(""); };
  function agregar() {
    if (d.riesgos.length >= MAX_RIESGOS) { setAvisoFilas(`Esta hoja tiene espacio para ${MAX_RIESGOS} peligros. Para más, genera otra hoja y ponle su número.`); return; }
    setAvisoFilas(""); setRiesgos([...d.riesgos, riesgoNuevo()]);
  }
  // Al elegir un peligro frecuente se proponen sus efectos y sus medidas (solo si esas casillas están vacías)
  function elegirPeligro(i, o) {
    const p = PELIGROS_COMUNES.find((x) => x.peligro === o.texto), r = d.riesgos[i];
    actualizar(i, { peligro: o.texto, efectos: r.efectos || (p && p.riesgo) || "", medidas: r.medidas || (p && p.control) || "" });
  }

  const conDatos = riesgosConDatos(d);
  const malos = noAceptables(d).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarMatriz(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesMatriz(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-matriz-peligros.xlsx", HOJA_MATRIZ);
      const avisos = [];
      const lectura = descubrirMatriz(ws);
      const decision = decidirDistribucion(lectura, CELDAS_MATRIZ);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const cap = (celdas.tablas && celdas.tablas.riesgos && celdas.tablas.riesgos.n) || MAX_RIESGOS;
      if (conDatos.length > cap) throw new Error(`la plantilla tiene espacio para ${cap} peligros y hay ${conDatos.length}`);
      const nUsar = d.hoja && String(d.hoja).trim() ? String(d.hoja).trim() : String(siguienteConsecutivo(CLAVE_HOJA));
      escribirMatrizEnHoja(ws, { ...d, hoja: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Matriz_peligros_${d.fechaElaboracion}_Hoja${textoParaArchivo(nUsar, 6)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_HOJA, nUsar);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenMatriz({ ...d, hoja: nUsar });
      guardarJSON(CLAVE_MATRIZ, [res, ...leerJSON(CLAVE_MATRIZ, []).filter((x) => x.id !== res.id)].slice(0, 100));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, hoja: nUsar }));
      setGenerado(`✓ Excel descargado (hoja ${nUsar}: ${res.total} ${res.total === 1 ? "peligro" : "peligros"}, ${res.noAceptables} no ${res.noAceptables === 1 ? "aceptable" : "aceptables"}).` +
        (res.noAceptables ? " Los riesgos no aceptables (nivel I y II) ya se pueden traer en Acciones Correctivas." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva hoja: conserva la obra, la versión y las firmas; limpia los peligros (la hoja avanza sola)
  function nuevaHoja() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fechaElaboracion: cur.fechaElaboracion, version: cur.version, participan: cur.participan,
      elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoFilas(""); setAbierta("riesgos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una matriz en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoFilas(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una matriz de peligros" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="MATRIZ DE PELIGROS" subtitulo={`${CODIGO_MATRIZ} · Identificación de peligros y valoración de riesgos (GTC 45)`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos de la matriz" subtitulo={d.version ? `Versión ${d.version}` : "Obra, fechas y versión"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <CampoFecha label="Fecha de elaboración" value={d.fechaElaboracion} onChange={(v) => set("fechaElaboracion", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Última actualización" type="date" value={d.actualizacion} onChange={(v) => set("actualizacion", v)} />
              <Campo label="Versión de la matriz" value={d.version} placeholder="Ej. 1" onChange={(v) => set("version", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
            </div>
            <Campo label="Hoja N°" value={d.hoja} placeholder={`Automática (${siguienteConsecutivo(CLAVE_HOJA)})`} inputMode="numeric" onChange={(v) => set("hoja", v.replace(/[^0-9A-Za-z-]/g, ""))} />
            <Campo label="Participan en la valoración" value={d.participan} placeholder="Quiénes participaron (SST, residente, trabajadores…)" onChange={(v) => set("participan", v)} />
          </div>
        </Seccion>

        {/* 2. PELIGROS */}
        <Seccion id="riesgos" titulo="2. Peligros y valoración" subtitulo={`${conDatos.length} de ${MAX_RIESGOS} peligros${malos ? ` · ${malos} no aceptables` : ""}`} abierta={abierta === "riesgos"} onToggle={alternar} contador={conDatos.length}>
          {d.riesgos.map((r, i) => {
            const v = valorar(r), color = COLORES_NIVEL_MATRIZ[v.nivel];
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: v.nivel === "I" || v.nivel === "II" ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Proceso o actividad" value={r.proceso} onChange={(x) => actualizar(i, { proceso: x })} />
                    <Campo label="Tarea" value={r.tarea} onChange={(x) => actualizar(i, { tarea: x })} />
                  </div>
                  <ChipsOpcion label="¿Rutinaria?" nombre={`Rutinaria ${i + 1}`} value={r.rutinaria} opciones={SI_NO} pequeno onChange={(x) => actualizar(i, { rutinaria: x })} />
                  <BuscadorLista label="Peligro (descripción)" value={r.peligro} opciones={OPC_PELIGROS} opcionesAlAbrir={OPC_PELIGROS.slice(0, 8)} maxResultados={12} placeholder="Elige un peligro frecuente o escribe otro"
                    onChange={(x) => actualizar(i, { peligro: x })} onElegir={(o) => elegirPeligro(i, o)} />
                  <Lista label="Clasificación" value={r.clasificacion} onChange={(x) => actualizar(i, { clasificacion: x })} opciones={CLASIFICACION} />
                  <AreaTexto label="Efectos posibles" value={r.efectos} onChange={(x) => actualizar(i, { efectos: x })} filas={2} />
                  <AreaTexto label="Controles existentes" value={r.controles} onChange={(x) => actualizar(i, { controles: x })} filas={2} />
                  <ChipsOpcion label="Nivel de deficiencia (ND)" nombre={`Nivel de deficiencia ${i + 1}`} value={r.nd} opciones={NIVELES_ND} pequeno onChange={(x) => actualizar(i, { nd: x })} />
                  <ChipsOpcion label="Nivel de exposición (NE)" nombre={`Nivel de exposición ${i + 1}`} value={r.ne} opciones={NIVELES_NE} pequeno onChange={(x) => actualizar(i, { ne: x })} />
                  <ChipsOpcion label="Nivel de consecuencia (NC)" nombre={`Nivel de consecuencia ${i + 1}`} value={r.nc} opciones={NIVELES_NC} pequeno onChange={(x) => actualizar(i, { nc: x })} />
                  {(v.np !== null || v.nr !== null) && (
                    <div className="text-[11.5px] p-2 rounded" style={{ background: "white", border: `1px solid ${LINE}`, color: "#4B5563" }}>
                      NP = {v.np !== null ? `${v.np} (${v.interpNP})` : "—"}{v.nr !== null ? ` · NR = ${v.nr}` : ""}
                    </div>
                  )}
                  {color && <div className="text-[13px] font-bold px-3 py-2 rounded-md text-center" style={{ background: "#" + color.relleno, color: "#" + color.fuente }}>Nivel de riesgo {v.nivel} — {v.aceptabilidad}</div>}
                  <Campo label="Personas expuestas" value={r.expuestos} inputMode="numeric" onChange={(x) => actualizar(i, { expuestos: x.replace(/[^0-9]/g, "") })} />
                  <AreaTexto label="Medidas de intervención" value={r.medidas} onChange={(x) => actualizar(i, { medidas: x })} filas={2} placeholder="Eliminación, sustitución, controles de ingeniería, administrativos, EPP" />
                </div>
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar peligro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar peligro
          </button>
          {avisoFilas && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoFilas}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>El Excel calcula el NP, el NR y el nivel de riesgo (I a IV) con las fórmulas de la GTC 45; aquí lo ves antes de generar. Los riesgos de nivel I y II (no aceptables) se pueden traer luego en Acciones Correctivas.</div>
        </Seccion>

        {/* 3. FIRMAS */}
        <Seccion id="firmas" titulo="3. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
          <button type="button" onClick={nuevaHoja} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nueva hoja (conserva la obra, la versión y las firmas)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la matriz" onGenerar={generarExcel} />
    </div>
  );
}
