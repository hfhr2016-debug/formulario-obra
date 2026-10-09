import { useState } from "react";
import { MapPin } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_FOTOGRAFICO, HOJA_FOTOGRAFICO, CELDAS_FOTOGRAFICO, TIPOS_REGISTRO_FOTO, ASPECTOS_FOTO, N_FOTOS,
  descubrirFotografico, escribirFotograficoEnHoja, validarFotografico, camposFaltantesFotografico, resumenFotografico, fotosDatosIniciales, fechaHoraLocalISO, coordenadasTexto,
} from "./fotograficoDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo, fijarSiguienteConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { CasillaFoto, fotoVacia, agregarFotosARecuadros, lineasMarca, InterruptorMarca } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_FOTOGRAFICO, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_fotografico";
const CLAVE_CONSECUTIVO = "ryr_amb_fotografico_consecutivo";
const CLAVE_HOJAS = "ryr_amb_fotografico_hojas";   // datos (sin las fotos) de cada hoja generada, para volver a abrirla o eliminarla
const archivosVacios = () => Array.from({ length: N_FOTOS }, () => fotoVacia());

function datosIniciales() {
  return { proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), hoja: "", tipoRegistro: "", registro: "", registroCargo: "Responsable ambiental", fotos: fotosDatosIniciales(), revisoNombre: "", revisoCargo: "" };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.tipoRegistro || d.registro || d.hoja || d.revisoNombre || d.fotos.some((f) => f.aspecto || f.descripcion || f.coordenadas || f.fechaHora));

// Ubicación del celular (GPS). Falla con un mensaje claro: nunca se inventan coordenadas.
function pedirUbicacion() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { reject(new Error("Este dispositivo no permite obtener la ubicación.")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject(new Error(e && e.code === 1 ? "No diste permiso de ubicación. Escribe las coordenadas a mano." : e && e.code === 3 ? "El GPS tardó demasiado. Intenta de nuevo al aire libre." : "No pude obtener la ubicación. Escribe las coordenadas a mano.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

export default function FormularioFotografico({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [archivos, setArchivos] = useState(archivosVacios);       // las fotos no se guardan en el borrador
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [hojas, setHojas] = useState(() => leerJSON(CLAVE_HOJAS, []));
  const [avisosGps, setAvisosGps] = useState(() => Array(N_FOTOS).fill(""));
  const [buscandoGps, setBuscandoGps] = useState(() => Array(N_FOTOS).fill(false));

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const actualizarFoto = (i, patch) => setD((cur) => ({ ...cur, fotos: cur.fotos.map((f, k) => (k === i ? { ...f, ...patch } : f)) }));
  const ponerAviso = (i, t) => setAvisosGps((cur) => cur.map((x, k) => (k === i ? t : x)));
  const ponerBuscando = (i, b) => setBuscandoGps((cur) => cur.map((x, k) => (k === i ? b : x)));

  async function usarUbicacion(i) {
    ponerAviso(i, ""); ponerBuscando(i, true);
    try {
      const c = await pedirUbicacion();
      actualizarFoto(i, { coordenadas: coordenadasTexto(c.latitude, c.longitude) });
      ponerAviso(i, c.accuracy ? `Precisión del GPS: ±${Math.round(c.accuracy)} m.` : "");
    } catch (e) { ponerAviso(i, e.message); } finally { ponerBuscando(i, false); }
  }
  function ponerArchivo(i, nueva) {
    setArchivos((cur) => cur.map((x, k) => (k === i ? nueva : x)));
    if (nueva && nueva.file) {
      // Fecha y hora: las de la foto (cuando el celular las guarda) o las de ahora; la ubicación se pide al celular
      if (!d.fotos[i].fechaHora) actualizarFoto(i, { fechaHora: fechaHoraLocalISO(nueva.file.lastModified || Date.now()) });
      if (!d.fotos[i].coordenadas) usarUbicacion(i);
    }
  }

  const nFotos = archivos.filter((a) => a && a.file).length;
  const nConGps = d.fotos.filter((f, i) => archivos[i] && archivos[i].file && f.coordenadas).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarFotografico(d, archivos);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesFotografico(d, archivos)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-registro-fotografico.xlsx", HOJA_FOTOGRAFICO);
      const avs = [];
      const decision = decidirDistribucion(descubrirFotografico(ws), CELDAS_FOTOGRAFICO);
      if (decision.aviso) avs.push(decision.aviso);
      const numero = d.hoja && String(d.hoja).trim() ? String(d.hoja).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, hoja: numero };
      escribirFotograficoEnHoja(ws, dd, decision.celdas, archivos);
      const sin = await agregarFotosARecuadros(workbook, ws, archivos, decision.celdas.fotos && decision.celdas.fotos.fotos, "#F2F2F2", archivos.map((a, i) => lineasMarca(d.proyecto, d.fotos[i] || {}, a && a.file)));
      if (sin) avs.push(`La plantilla no tiene recuadro para ${sin} de las fotos y no se incluyó${sin > 1 ? "eron" : ""}.`);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Registro_Fotografico_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}_H${numero}.xlsx`);
      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.registro, d.registroCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenFotografico(dd, archivos);
      guardarJSON(CLAVE_AMB_FOTOGRAFICO, [res, ...leerJSON(CLAVE_AMB_FOTOGRAFICO, []).filter((x) => x.id !== res.id && !(x.proyecto === res.proyecto && x.hoja === res.hoja))].slice(0, 400));
      const entrada = { id: `${String(dd.proyecto).trim().toLowerCase()}|${numero}`, hoja: numero, proyecto: String(dd.proyecto).trim(), fecha: dd.fecha, fotos: nFotos - sin, d: { ...dd, fotos: dd.fotos.map((f) => ({ ...f })) } };
      const nuevas = [entrada, ...leerJSON(CLAVE_HOJAS, []).filter((x) => x.id !== entrada.id)].slice(0, 200);
      guardarJSON(CLAVE_HOJAS, nuevas); setHojas(nuevas);
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (hoja N° ${numero}: ${nFotos - sin} ${nFotos - sin === 1 ? "foto" : "fotos"}, ${nConGps} con coordenadas).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  // Volver a una hoja ya generada para corregirla (los datos vuelven; las fotos no se guardan en la app: se vuelven a elegir) o eliminarla
  function abrirHoja(h) {
    if (tieneContenido(d) && !window.confirm("Lo que tienes ahora en pantalla se reemplaza por la hoja " + h.hoja + ". ¿Continuar?")) return;
    setD({ ...datosIniciales(), ...h.d, fotos: fotosDatosIniciales().map((f, i) => ({ ...f, ...((h.d.fotos || [])[i] || {}) })) });
    setArchivos(archivosVacios()); setAvisosGps(Array(N_FOTOS).fill(""));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError("");
    setAvisoGeneracion(`Se abrió la hoja N° ${h.hoja} con sus datos. Las fotos no se guardan en la app: vuelve a elegir las ${h.fotos || ""} fotos para generar el Excel de nuevo con la corrección.`);
    setAbierta("datos"); window.scrollTo(0, 0);
  }
  function eliminarHoja(h) {
    if (!window.confirm(`¿Eliminar la hoja N° ${h.hoja}${h.proyecto ? " de " + h.proyecto : ""}? Se borra de la lista y de lo que cuentan los informes. El Excel que ya descargaste no se toca.`)) return;
    const quedan = leerJSON(CLAVE_HOJAS, []).filter((x) => x.id !== h.id);
    guardarJSON(CLAVE_HOJAS, quedan); setHojas(quedan);
    guardarJSON(CLAVE_AMB_FOTOGRAFICO, leerJSON(CLAVE_AMB_FOTOGRAFICO, []).filter((x) => !(x.proyecto === h.proyecto && x.hoja === h.hoja)));
    const mayor = quedan.reduce((m, x) => Math.max(m, parseInt(x.hoja, 10) || 0), 0);
    fijarSiguienteConsecutivo(CLAVE_CONSECUTIVO, mayor + 1);          // si eliminas la última, ese número vuelve a estar libre
    setAvisoGeneracion(`Se eliminó la hoja N° ${h.hoja}.`);
  }
  const hojasDeLaObra = hojas.filter((h) => !d.proyecto.trim() || h.proyecto.toLowerCase() === d.proyecto.trim().toLowerCase()).sort((a, b) => (parseInt(a.hoja, 10) || 0) - (parseInt(b.hoja, 10) || 0));

  function nuevaHoja() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, tipoRegistro: cur.tipoRegistro, registro: cur.registro, registroCargo: cur.registroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    setArchivos(archivosVacios()); setAvisosGps(Array(N_FOTOS).fill(""));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("fotos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un registro en blanco? Se limpian todos los datos y fotos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setArchivos(archivosVacios()); setAvisosGps(Array(N_FOTOS).fill("")); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un registro fotográfico" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="REGISTRO FOTOGRÁFICO" subtitulo={`${CODIGO_FOTOGRAFICO} · Evidencia georreferenciada del manejo ambiental`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos del registro" subtitulo={d.proyecto ? `${d.proyecto} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, fecha y quién registra"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
              <Campo label="Hoja N°" value={d.hoja} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("hoja", v.replace(/[^0-9]/g, ""))} />
            </div>
            <Lista label="Tipo de registro" value={d.tipoRegistro} onChange={(v) => set("tipoRegistro", v)} opciones={TIPOS_REGISTRO_FOTO} />
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien registró" etqCargo="Cargo de quien registró" nombre={d.registro} cargo={d.registroCargo} onChange={cambiarPersona("registro", "registroCargo")} />
          </div>
        </Seccion>

        <Seccion id="fotos" titulo="2. Fotografías" subtitulo={`${nFotos} de ${N_FOTOS} fotos · ${nConGps} con coordenadas`} abierta={abierta === "fotos"} onToggle={alternar} contador={nFotos}>
          <div className="mb-2"><InterruptorMarca /></div>
          <div className="space-y-3">
            {d.fotos.map((f, i) => (
              <div key={i} className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: "#EEF1F6" }}>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: GOLD }}>FOTO {i + 1}</div>
                <div className="space-y-2">
                  <CasillaFoto foto={archivos[i]} titulo={`Foto ${i + 1}`} onChange={(n) => ponerArchivo(i, n)} onRemove={() => ponerArchivo(i, fotoVacia())} />
                  <Lista label="Aspecto de la foto" value={f.aspecto} onChange={(v) => actualizarFoto(i, { aspecto: v })} opciones={ASPECTOS_FOTO} />
                  <Campo label="Descripción de la foto" value={f.descripcion} placeholder="Ej. Acopio de escombros cubierto con plástico" onChange={(v) => actualizarFoto(i, { descripcion: v })} />
                  <Campo label="Coordenadas de la foto" value={f.coordenadas} placeholder="4.711000, -74.072100" onChange={(v) => actualizarFoto(i, { coordenadas: v })} />
                  <button type="button" onClick={() => usarUbicacion(i)} disabled={buscandoGps[i]} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md border" style={{ borderColor: NAVY, color: NAVY, opacity: buscandoGps[i] ? 0.6 : 1 }}>
                    <MapPin size={13} /> {buscandoGps[i] ? "Buscando ubicación…" : "Usar mi ubicación actual"}
                  </button>
                  {avisosGps[i] && <div className="text-[11px]" style={{ color: /Precisión/.test(avisosGps[i]) ? "#2E7D4F" : "#B3401F" }}>{avisosGps[i]}</div>}
                  <Campo label="Fecha y hora de la foto" type="datetime-local" value={f.fechaHora} onChange={(v) => actualizarFoto(i, { fechaHora: v })} />
                </div>
              </div>
            ))}
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Al agregar una foto se pide la ubicación del celular; si estás lejos del sitio donde la tomaste, corrígela. Las fotos no se guardan en el borrador: si sales sin descargar, hay que volver a subirlas.</div>
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="3. Firmas" subtitulo="Registra el responsable ambiental; revisa el residente" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien registró ({d.registro || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <Seccion id="hojas" titulo="3. Hojas generadas" subtitulo={hojasDeLaObra.length ? `${hojasDeLaObra.length} ${hojasDeLaObra.length === 1 ? "hoja" : "hojas"} · abrir para corregir o eliminar` : "Aquí aparecen las hojas que generes"} abierta={abierta === "hojas"} onToggle={alternar} contador={hojasDeLaObra.length}>
          {hojasDeLaObra.length === 0 && <div className="text-[12px]" style={{ color: "#6B7280" }}>Todavía no hay hojas generadas{d.proyecto ? " de esta obra" : ""}.</div>}
          <div className="space-y-2">
            {hojasDeLaObra.map((h) => (
              <div key={h.id} className="border rounded-lg p-2.5 flex items-center gap-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="flex-1 text-[12px]" style={{ color: NAVY }}>
                  <div className="font-semibold">Hoja N° {h.hoja}</div>
                  <div className="text-[11px]" style={{ color: "#6B7280" }}>{h.proyecto} · {String(h.fecha || "").split("-").reverse().join("/")} · {h.fotos} {h.fotos === 1 ? "foto" : "fotos"}</div>
                </div>
                <button type="button" onClick={() => abrirHoja(h)} aria-label={`Abrir hoja ${h.hoja}`} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md border" style={{ borderColor: NAVY, color: NAVY }}>Abrir</button>
                <button type="button" onClick={() => eliminarHoja(h)} aria-label={`Eliminar hoja ${h.hoja}`} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md border" style={{ borderColor: "#E8B4A6", color: "#B3401F" }}>Eliminar</button>
              </div>
            ))}
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevaHoja} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nueva hoja de fotos (conserva obra y firmantes)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del registro" onGenerar={generarExcel} />
    </div>
  );
}
