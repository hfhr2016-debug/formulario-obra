import { useState } from "react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_MAQUINARIA, HOJA_MAQUINARIA, CELDAS_MAQUINARIA, TIPOS_EQUIPO, PROPIETARIOS, COMBUSTIBLES, RESULTADOS, ITEMS_MAQUINARIA,
  descubrirMaquinaria, escribirMaquinariaEnHoja, validarMaquinaria, camposFaltantesMaquinaria, resumenMaquinaria,
} from "./maquinariaDatos";
import { contarRespuestas } from "./ambBase";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_MAQUINARIA, TraerDeFichaAmb, ListaVerificacionAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_maquinaria";
const CLAVE_CONSECUTIVO = "ryr_amb_maquinaria_consecutivo";
const CLAVE_EQUIPOS = "ryr_amb_equipos";          // equipos ya inspeccionados (para no volver a escribir sus datos)
const N = ITEMS_MAQUINARIA.length;
const COLORES_RESULTADO = { [RESULTADOS[0]]: "#2E7D4F", [RESULTADOS[1]]: "#B7791F", [RESULTADOS[2]]: "#B3401F" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), hora: "", nInspeccion: "", tipoEquipo: "", marcaModelo: "", placa: "", propietario: "", empresaProp: "", operador: "", operadorCedula: "",
    horometro: "", frente: "", combustible: "", inspector: "", inspectorCargo: "Responsable ambiental", respuestas: Array(N).fill(""), observaciones: Array(N).fill(""),
    resultado: "", proxima: "", correccion: "", obsFinal: "", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.hora || d.tipoEquipo || d.marcaModelo || d.placa || d.operador || d.horometro || d.frente || d.combustible || d.inspector || d.respuestas.some(Boolean) || d.resultado || d.obsFinal || d.revisoNombre);

export default function FormularioMaquinaria({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [equipos, setEquipos] = useState(() => leerJSON(CLAVE_EQUIPOS, []));

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const ponerEn = (campo) => (i, v) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? v : x)) }));

  const c = contarRespuestas(ITEMS_MAQUINARIA, d.respuestas);
  const sugerido = c.sin ? "" : c.no === 0 ? RESULTADOS[0] : RESULTADOS[1];
  const traerEquipo = (placa) => {
    const e = equipos.find((x) => x.placa === placa);
    if (e) setD((cur) => ({ ...cur, tipoEquipo: e.tipoEquipo || "", marcaModelo: e.marcaModelo || "", placa: e.placa, propietario: e.propietario || "", empresaProp: e.empresaProp || "", operador: e.operador || "", operadorCedula: e.operadorCedula || "", combustible: e.combustible || "" }));
  };
  function pasarNoAObservaciones() {
    const lineas = ITEMS_MAQUINARIA.map((t, i) => (d.respuestas[i] === "No" ? `• ${t}${d.observaciones[i] ? `: ${d.observaciones[i]}` : ""}` : "")).filter(Boolean);
    if (!lineas.length) return;
    setD((cur) => ({ ...cur, obsFinal: [cur.obsFinal.trim(), ...lineas.filter((l) => !cur.obsFinal.includes(l))].filter(Boolean).join("\n") }));
  }

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarMaquinaria(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesMaquinaria(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-inspeccion-maquinaria.xlsx", HOJA_MAQUINARIA);
      const avs = [];
      const decision = decidirDistribucion(descubrirMaquinaria(ws), CELDAS_MAQUINARIA);
      if (decision.aviso) avs.push(decision.aviso);
      const numero = d.nInspeccion && String(d.nInspeccion).trim() ? String(d.nInspeccion).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, nInspeccion: numero };
      const noMarcadas = escribirMaquinariaEnHoja(ws, dd, decision.celdas);
      if (noMarcadas.length) avs.push("La plantilla no tiene la casilla «" + noMarcadas.join("», «") + "»: no se marcó.");
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Inspeccion_Maquinaria_${textoParaArchivo(d.placa || d.tipoEquipo, 20)}_${d.fecha}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.inspector, d.inspectorCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const eq = { placa: d.placa.trim(), tipoEquipo: d.tipoEquipo, marcaModelo: d.marcaModelo, propietario: d.propietario, empresaProp: d.empresaProp, operador: d.operador, operadorCedula: d.operadorCedula, combustible: d.combustible };
      const nuevos = [eq, ...equipos.filter((x) => x.placa !== eq.placa)].slice(0, 60);
      setEquipos(nuevos); guardarJSON(CLAVE_EQUIPOS, nuevos);
      const res = resumenMaquinaria(dd);
      guardarJSON(CLAVE_AMB_MAQUINARIA, [res, ...leerJSON(CLAVE_AMB_MAQUINARIA, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${d.tipoEquipo} ${d.placa}: ${d.resultado.split(":")[0].toLowerCase()}; ${c.si} cumplen, ${c.no} no cumplen).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function otroEquipo() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, inspector: cur.inspector, inspectorCargo: cur.inspectorCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo, frente: cur.frente }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("equipo"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una inspección en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="una inspección de maquinaria" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="MAQUINARIA Y EQUIPOS" subtitulo={`${CODIGO_MAQUINARIA} · Fugas, emisiones, ruido y residuos del equipo`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos de la inspección" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha e inspector"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <SelectorHora label="Hora" value={d.hora} onChange={(v) => set("hora", v)} />
            </div>
            <Campo label="Inspección N°" value={d.nInspeccion} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nInspeccion", v.replace(/[^0-9]/g, ""))} />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del inspector" etqCargo="Cargo del inspector" nombre={d.inspector} cargo={d.inspectorCargo} onChange={cambiarPersona("inspector", "inspectorCargo")} />
          </div>
        </Seccion>

        <Seccion id="equipo" titulo="2. Datos del equipo" subtitulo={d.tipoEquipo ? `${d.tipoEquipo}${d.placa ? " · " + d.placa : ""}` : "Tipo, placa, propietario y operador"} abierta={abierta === "equipo"} onToggle={alternar}>
          <div className="space-y-2.5">
            {equipos.length > 0 && <Lista label="🚜 Traer un equipo ya inspeccionado" value="" onChange={traerEquipo} opciones={equipos.map((e) => e.placa)} />}
            <Lista label="Tipo de equipo" value={d.tipoEquipo} onChange={(v) => set("tipoEquipo", v)} opciones={TIPOS_EQUIPO} />
            <Campo label="Placa o código" value={d.placa} onChange={(v) => set("placa", v.toUpperCase())} />
            <Campo label="Marca y modelo" value={d.marcaModelo} onChange={(v) => set("marcaModelo", v)} />
            <Lista label="Propietario" value={d.propietario} onChange={(v) => set("propietario", v)} opciones={PROPIETARIOS} />
            {d.propietario && d.propietario !== "Propio" && <Campo label="Empresa propietaria" value={d.empresaProp} onChange={(v) => set("empresaProp", v)} />}
            <Campo label="Operador" value={d.operador} onChange={(v) => set("operador", v)} />
            <Campo label="Cédula del operador" value={d.operadorCedula} inputMode="numeric" onChange={(v) => set("operadorCedula", v.replace(/[^0-9.]/g, ""))} />
            <Campo label="Horómetro o kilometraje" value={d.horometro} inputMode="decimal" onChange={(v) => set("horometro", v.replace(/[^0-9.,]/g, ""))} />
            <Campo label="Frente de trabajo" value={d.frente} onChange={(v) => set("frente", v)} />
            <Lista label="Combustible" value={d.combustible} onChange={(v) => set("combustible", v)} opciones={COMBUSTIBLES} />
          </div>
        </Seccion>

        <Seccion id="lista" titulo="3. Verificación ambiental del equipo" subtitulo={`${c.si} sí · ${c.no} no · ${c.na} N/A${c.sin ? ` · ${c.sin} sin responder` : ""}`} abierta={abierta === "lista"} onToggle={alternar} contador={N - c.sin}>
          <ListaVerificacionAmb items={ITEMS_MAQUINARIA} respuestas={d.respuestas} observaciones={d.observaciones} onRespuesta={ponerEn("respuestas")} onObservacion={ponerEn("observaciones")} />
        </Seccion>

        <Seccion id="resultado" titulo="4. Resultado y observaciones" subtitulo={d.resultado ? d.resultado.split(":")[0] : "Apto, apto con observaciones o no apto"} abierta={abierta === "resultado"} onToggle={alternar}>
          <div className="space-y-2.5">
            <ChipsOpcion label="Resultado de la inspección" nombre="Resultado" value={d.resultado} opciones={RESULTADOS} colores={COLORES_RESULTADO} onChange={(v) => set("resultado", v)} />
            {sugerido && !d.resultado && <button type="button" onClick={() => set("resultado", sugerido)} className="text-[11.5px] underline" style={{ color: NAVY }}>Según la verificación sugiero: {sugerido}. Usar esta.</button>}
            {c.no > 0 && d.resultado === RESULTADOS[0] && <div className="text-[11.5px]" style={{ color: "#B3401F" }}>Hay {c.no} {c.no === 1 ? "punto" : "puntos"} en «No»; revisa si de verdad es «Apto para operar».</div>}
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Próxima inspección" type="date" value={d.proxima} onChange={(v) => set("proxima", v)} />
              <Campo label="Corrección antes del" type="date" value={d.correccion} onChange={(v) => set("correccion", v)} />
            </div>
            {c.no > 0 && <button type="button" onClick={pasarNoAObservaciones} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>⚠ {c.no === 1 ? "Pasar el punto «No» a observaciones" : `Pasar los ${c.no} puntos «No» a observaciones`}</button>}
            <AreaTexto label="Observaciones y acciones" value={d.obsFinal} onChange={(v) => set("obsFinal", v)} filas={4} placeholder="Ej. Cambiar manguera hidráulica antes de volver a operar" />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Inspecciona el responsable ambiental; firma el operador; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firman: {d.inspector || "el inspector"} (inspector) y {d.operador || "el operador"} (operador). Sus nombres vienen de las secciones 1 y 2.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={otroEquipo} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Inspeccionar otro equipo (conserva obra e inspector)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la inspección" onGenerar={generarExcel} />
    </div>
  );
}
