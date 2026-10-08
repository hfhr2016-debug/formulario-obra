import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_MATRIZ_AMB, HOJA_MATRIZ_AMB, CELDAS_MATRIZ_AMB, MEDIOS, CONDICIONES, TIPOS_IMPACTO, NIVELES_FRECUENCIA, NIVELES_SEVERIDAD, COLORES_NIVEL, ASPECTOS_TIPICOS,
  descubrirMatrizAmb, escribirMatrizAmbEnHoja, validarMatrizAmb, camposFaltantesMatrizAmb, resumenMatrizAmb, aspectoNuevo, aspectosConDatos, valorarAspecto,
} from "./matrizAspectosDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_MATRIZ, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_matriz_amb";
const MAX_ASPECTOS = (CELDAS_MATRIZ_AMB.tablas && CELDAS_MATRIZ_AMB.tablas.aspectos && CELDAS_MATRIZ_AMB.tablas.aspectos.n) || 10;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", elaboro: "", fechaElaboracion: fechaHoyISO(), actualizacion: "", version: "1",
    aspectos: [], elaboroNombre: "", elaboroCargo: "Responsable ambiental", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.elaboro || d.actualizacion || d.aspectos.length || d.elaboroNombre || d.revisoNombre || d.voboNombre);

export default function FormularioMatrizAmbiental({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoAspectos, setAvisoAspectos] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));

  const setAspectos = (nuevos) => setD((cur) => ({ ...cur, aspectos: nuevos }));
  const actualizar = (i, patch) => setAspectos(d.aspectos.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const quitar = (i) => { setAspectos(d.aspectos.filter((_, k) => k !== i)); setAvisoAspectos(""); };
  function agregar(base = {}) {
    if (d.aspectos.length >= MAX_ASPECTOS) { setAvisoAspectos(`Esta hoja tiene espacio para ${MAX_ASPECTOS} aspectos. Para más, genera otra hoja con el resto.`); return; }
    setAvisoAspectos(""); setAspectos([...d.aspectos, aspectoNuevo(base)]);
  }
  const opcionesTipicos = ASPECTOS_TIPICOS.map((a) => `${a.proceso}: ${a.aspecto}`);
  function agregarTipico(texto) {
    const t = ASPECTOS_TIPICOS.find((a) => `${a.proceso}: ${a.aspecto}` === texto);
    if (t) agregar(t);
  }

  const filas = aspectosConDatos(d);
  const nSig = filas.filter((a) => valorarAspecto(a).significativo === "Sí").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarMatrizAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesMatrizAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-matriz-aspectos.xlsx", HOJA_MATRIZ_AMB);
      const avs = [];
      const decision = decidirDistribucion(descubrirMatrizAmb(ws), CELDAS_MATRIZ_AMB);
      if (decision.aviso) avs.push(decision.aviso);
      const capacidad = (decision.celdas.tablas && decision.celdas.tablas.aspectos && decision.celdas.tablas.aspectos.n) || MAX_ASPECTOS;
      if (filas.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} aspectos y hay ${filas.length}`);
      escribirMatrizAmbEnHoja(ws, { ...d, elaboro: d.elaboro || d.elaboroNombre }, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Matriz_Aspectos_Impactos_${textoParaArchivo(d.proyecto, 24)}_${d.fechaElaboracion}.xlsx`);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenMatrizAmb(d);
      guardarJSON(CLAVE_AMB_MATRIZ, [res, ...leerJSON(CLAVE_AMB_MATRIZ, []).filter((x) => x.id !== res.id)].slice(0, 100));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${res.total} ${res.total === 1 ? "aspecto" : "aspectos"}, ${res.significativos} ${res.significativos === 1 ? "significativo" : "significativos"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevaMatriz() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, voboNombre: cur.voboNombre, voboCargo: cur.voboCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoAspectos(""); setAbierta("aspectos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una matriz en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoAspectos(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una matriz de aspectos e impactos" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="MATRIZ DE ASPECTOS E IMPACTOS" subtitulo={`${CODIGO_MATRIZ_AMB} · Identificación y valoración de aspectos e impactos ambientales`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.proyecto || "Obra, fechas y versión"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha de elaboración" type="date" value={d.fechaElaboracion} onChange={(v) => set("fechaElaboracion", v)} />
              <Campo label="Última actualización" type="date" value={d.actualizacion} onChange={(v) => set("actualizacion", v)} />
            </div>
            <Campo label="Versión" value={d.version} inputMode="numeric" onChange={(v) => set("version", v.replace(/[^0-9.]/g, ""))} />
          </div>
        </Seccion>

        <Seccion id="aspectos" titulo="2. Aspectos e impactos" subtitulo={`${filas.length} de ${MAX_ASPECTOS} aspectos${nSig ? ` · ${nSig} significativo${nSig === 1 ? "" : "s"}` : ""}`} abierta={abierta === "aspectos"} onToggle={alternar} contador={filas.length}>
          <div className="mb-2.5"><Lista label="Agregar un aspecto típico de obra" value="" onChange={agregarTipico} opciones={opcionesTipicos} /></div>
          {d.aspectos.map((a, i) => {
            const v = valorarAspecto(a); const cn = COLORES_NIVEL[v.nivel];
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Aspecto {i + 1}</div>
                <div className="space-y-2">
                  <Campo label="Proceso o actividad" value={a.proceso} onChange={(x) => actualizar(i, { proceso: x })} />
                  <Campo label="Aspecto ambiental" value={a.aspecto} placeholder="Ej. Generación de escombros" onChange={(x) => actualizar(i, { aspecto: x })} />
                  <Campo label="Impacto ambiental" value={a.impacto} placeholder="Ej. Contaminación del suelo" onChange={(x) => actualizar(i, { impacto: x })} />
                  <Lista label="Medio afectado" value={a.medio} onChange={(x) => actualizar(i, { medio: x })} opciones={MEDIOS} />
                  <ChipsOpcion label="Condición" nombre={`Condición ${i + 1}`} value={a.condicion} opciones={CONDICIONES} pequeno onChange={(x) => actualizar(i, { condicion: x || "Normal" })} />
                  <ChipsOpcion label="Tipo de impacto" nombre={`Tipo de impacto ${i + 1}`} value={a.tipo} opciones={TIPOS_IMPACTO} pequeno onChange={(x) => actualizar(i, { tipo: x || "Negativo" })} />
                  <ChipsOpcion label="Frecuencia" nombre={`Frecuencia ${i + 1}`} value={a.frecuencia} opciones={NIVELES_FRECUENCIA} pequeno onChange={(x) => actualizar(i, { frecuencia: x })} />
                  <ChipsOpcion label="Severidad" nombre={`Severidad ${i + 1}`} value={a.severidad} opciones={NIVELES_SEVERIDAD} pequeno onChange={(x) => actualizar(i, { severidad: x })} />
                  {v.valor !== null && (
                    <div className="text-[12.5px] font-bold px-3 py-2 rounded-md text-center" style={{ background: "#" + cn.relleno, color: "#" + cn.fuente }}>
                      Valor {v.valor} · Nivel {v.nivel} · {v.significativo === "Sí" ? "Significativo" : v.significativo === "Positivo" ? "Impacto positivo" : "No significativo"}
                    </div>
                  )}
                  <Campo label="Requisito legal" value={a.requisito} onChange={(x) => actualizar(i, { requisito: x })} />
                  <AreaTexto label="Control o medida de manejo" value={a.control} filas={2} onChange={(x) => actualizar(i, { control: x })} />
                  <Campo label="Responsable de la medida" value={a.responsable} onChange={(x) => actualizar(i, { responsable: x })} />
                </div>
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar aspecto ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
              </div>
            );
          })}
          <button type="button" onClick={() => agregar()} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar aspecto</button>
          {avisoAspectos && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoAspectos}</div>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Valor = frecuencia × severidad. Bajo: 1 a 7 · Medio: 8 a 14 · Alto: 15 a 25. Es significativo si el nivel es Alto o la condición es de Emergencia.</div>
        </Seccion>

        <Seccion id="firmas" titulo="3. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. (gerencia o interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaMatriz} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva matriz (conserva obra y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la matriz" onGenerar={generarExcel} />
    </div>
  );
}
