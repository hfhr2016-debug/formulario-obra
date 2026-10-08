import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_MANIFIESTO, HOJA_MANIFIESTO, CELDAS_MANIFIESTO, CLASES_RCD, DESTINOS_RCD, CARGOS_RECIBE_RCD,
  descubrirManifiesto, escribirManifiestoEnHoja, validarManifiesto, camposFaltantesManifiesto, resumenManifiesto, viajeNuevo, viajesConDatos, sumaVolumen, cantidadTotal,
} from "./manifiestoDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo, siguienteConsecutivo, registrarConsecutivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { GrillaOpciones, ChipsOpcion } from "./sstControles";
import { CLAVE_AMB_MANIFIESTOS, TraerDeFichaAmb, gestoresDeFicha } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_manifiesto_rcd";
const CLAVE_CONSECUTIVO = "ryr_amb_manifiesto_consecutivo";
const CLAVE_TRANSPORTISTAS = "ryr_amb_transportistas";   // empresas, conductores y vehículos usados antes
const CLAVE_SITIOS = "ryr_amb_sitios_rcd";               // sitios de disposición usados antes
const MAX_VIAJES = (CELDAS_MANIFIESTO.tablas && CELDAS_MANIFIESTO.tablas.viajes.n) || 8;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", numero: "", fecha: fechaHoyISO(), respObra: "", respCargo: "",
    transportadora: "", nit: "", conductor: "", cedula: "", placa: "", capacidad: "", autorizacionT: "",
    clases: [], cantidad: "", unidad: "m³", viajes: [],
    sitio: "", municipio: "", autAmbiental: "", certificado: "", destino: "", fechaCert: "", recibeNombre: "", recibeCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.numero || d.respObra || d.transportadora || d.conductor || d.placa || d.clases.length || d.viajes.length || d.sitio || d.cantidad);

export default function FormularioManifiestoRCD({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("obra");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoViajes, setAvisoViajes] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));
  const alternarClase = (t) => setD((cur) => ({ ...cur, clases: cur.clases.includes(t) ? cur.clases.filter((x) => x !== t) : [...cur.clases, t] }));

  // ---- Memoria de transportistas y sitios ----
  const transportistas = leerJSON(CLAVE_TRANSPORTISTAS, []);
  const sitiosGuardados = leerJSON(CLAVE_SITIOS, []);
  const gestoresRcd = useMemo(() => gestoresDeFicha(d.proyecto).filter((g) => /escombros|rcd/i.test(g.tipo || "")), [d.proyecto]);
  const opcionesTransportadora = transportistas.map((t) => ({ texto: t.transportadora, detalle: [t.conductor, t.placa].filter(Boolean).join(" · ") }));
  const opcionesSitio = [...sitiosGuardados.map((s) => ({ texto: s.sitio, detalle: s.municipio || "" })), ...gestoresRcd.map((g) => ({ texto: g.empresa, detalle: "de la ficha" }))]
    .filter((o, i, a) => a.findIndex((x) => x.texto.toLowerCase() === o.texto.toLowerCase()) === i);
  function elegirTransportadora(o) {
    const t = transportistas.find((x) => x.transportadora === o.texto);
    setD((cur) => ({ ...cur, transportadora: o.texto, ...(t ? { nit: cur.nit || t.nit, conductor: cur.conductor || t.conductor, cedula: cur.cedula || t.cedula, placa: cur.placa || t.placa, capacidad: cur.capacidad || t.capacidad, autorizacionT: cur.autorizacionT || t.autorizacion } : {}) }));
  }
  function elegirSitio(o) {
    const s = sitiosGuardados.find((x) => x.sitio === o.texto);
    const g = gestoresRcd.find((x) => x.empresa === o.texto);
    setD((cur) => ({ ...cur, sitio: o.texto, municipio: cur.municipio || (s && s.municipio) || "", autAmbiental: cur.autAmbiental || (s && s.autAmbiental) || (g && g.autorizacion) || "", destino: cur.destino || (s && s.destino) || "" }));
  }

  // ---- Viajes ----
  const viajes = d.viajes;
  const setViajes = (nuevos) => setD((cur) => ({ ...cur, viajes: nuevos }));
  const actualizarViaje = (i, patch) => setViajes(viajes.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  const quitarViaje = (i) => { setViajes(viajes.filter((_, k) => k !== i)); setAvisoViajes(""); };
  function agregarViaje() {
    if (viajes.length >= MAX_VIAJES) { setAvisoViajes(`Este manifiesto tiene espacio para ${MAX_VIAJES} viajes. Genéralo y haz otro manifiesto para los demás.`); return; }
    setAvisoViajes("");
    const u = viajes[viajes.length - 1];
    setViajes([...viajes, u ? viajeNuevo({ volumen: u.volumen }) : viajeNuevo({ placa: d.placa, conductor: d.conductor })]);          // la placa y el conductor del viaje nuevo quedan vacíos: es otro viaje (puede ser otro vehículo)
  }
  const nViajes = viajesConDatos(d).length;
  const suma = sumaVolumen(d);
  const total = cantidadTotal(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarManifiesto(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesManifiesto(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-manifiesto-rcd.xlsx", HOJA_MANIFIESTO);
      const avisos = [];
      const decision = decidirDistribucion(descubrirManifiesto(ws), CELDAS_MANIFIESTO);
      if (decision.aviso) avisos.push(decision.aviso);
      const capacidad = (decision.celdas.tablas && decision.celdas.tablas.viajes.n) || MAX_VIAJES;
      if (nViajes > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} viajes y hay ${nViajes}`);
      const numero = d.numero && String(d.numero).trim() ? String(d.numero).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const dd = { ...d, numero };
      const sinMarcar = escribirManifiestoEnHoja(ws, dd, decision.celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Manifiesto_RCD_${textoParaArchivo(numero, 10)}_${d.fecha || "sin-fecha"}.xlsx`);

      registrarConsecutivo(CLAVE_CONSECUTIVO, numero);
      memoria.recordarUso({ personas: [[d.respObra, d.respCargo], [d.recibeNombre, d.recibeCargo]], empresasUsadas: [d.contratista, d.transportadora] });
      if (d.transportadora.trim()) {
        const t = { transportadora: d.transportadora.trim(), nit: d.nit, conductor: d.conductor, cedula: d.cedula, placa: d.placa, capacidad: d.capacidad, autorizacion: d.autorizacionT };
        guardarJSON(CLAVE_TRANSPORTISTAS, [t, ...transportistas.filter((x) => x.transportadora.toLowerCase() !== t.transportadora.toLowerCase())].slice(0, 30));
      }
      if (d.sitio.trim()) {
        const s = { sitio: d.sitio.trim(), municipio: d.municipio, autAmbiental: d.autAmbiental, destino: d.destino };
        guardarJSON(CLAVE_SITIOS, [s, ...sitiosGuardados.filter((x) => x.sitio.toLowerCase() !== s.sitio.toLowerCase())].slice(0, 30));
      }
      const res = resumenManifiesto(dd);
      guardarJSON(CLAVE_AMB_MANIFIESTOS, [res, ...leerJSON(CLAVE_AMB_MANIFIESTOS, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (manifiesto N° ${numero}: ${String(total).replace(".", ",")} ${d.unidad || "m³"} en ${nViajes} ${nViajes === 1 ? "viaje" : "viajes"}). El Registro de Residuos ya puede traer esta entrega.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function nuevoManifiesto() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, respObra: cur.respObra, respCargo: cur.respCargo, sitio: cur.sitio, municipio: cur.municipio, autAmbiental: cur.autAmbiental, destino: cur.destino }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoViajes(""); setAbierta("transportador"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un manifiesto en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoViajes(""); setAbierta("obra"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un manifiesto de RCD" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="MANIFIESTO DE TRANSPORTE DE RCD" subtitulo={`${CODIGO_MANIFIESTO} · Cadena de custodia de escombros`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="obra" titulo="1. Generador (obra)" subtitulo={d.proyecto || "Obra, fecha y responsable"} abierta={abierta === "obra"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación de la obra" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Manifiesto N°" value={d.numero} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("numero", v.replace(/[^0-9A-Za-z-]/g, ""))} />
              <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Responsable en obra (nombre)" etqCargo="Cargo del responsable en obra" nombre={d.respObra} cargo={d.respCargo} onChange={cambiarPersona("respObra", "respCargo")} />
          </div>
        </Seccion>

        <Seccion id="transportador" titulo="2. Transportador" subtitulo={d.transportadora ? `${d.transportadora}${d.placa ? " · " + d.placa : ""}` : "Empresa, conductor y vehículo"} abierta={abierta === "transportador"} onToggle={alternar}>
          <div className="space-y-2.5">
            <BuscadorLista label="Empresa transportadora" value={d.transportadora} onChange={(v) => set("transportadora", v)} onElegir={elegirTransportadora} opciones={opcionesTransportadora} opcionesAlAbrir={opcionesTransportadora} placeholder="Escribe o elige una usada antes" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="NIT" value={d.nit} onChange={(v) => set("nit", v)} />
              <Campo label="N° de autorización" value={d.autorizacionT} onChange={(v) => set("autorizacionT", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Conductor" value={d.conductor} onChange={(v) => set("conductor", v)} />
              <Campo label="Cédula" value={d.cedula} inputMode="numeric" onChange={(v) => set("cedula", v.replace(/[^0-9.]/g, ""))} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Placa del vehículo" value={d.placa} onChange={(v) => set("placa", v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} />
              <Campo label="Capacidad (m³)" value={d.capacidad} inputMode="decimal" onChange={(v) => set("capacidad", v.replace(/[^0-9.,]/g, ""))} />
            </div>
          </div>
        </Seccion>

        <Seccion id="residuo" titulo="3. Residuo entregado" subtitulo={d.clases.length ? `${d.clases.length} ${d.clases.length === 1 ? "clase" : "clases"} · ${total ? String(total).replace(".", ",") + " " + d.unidad : "sin cantidad"}` : "Clases y cantidad"} abierta={abierta === "residuo"} onToggle={alternar} contador={d.clases.length}>
          <div data-campo="Clase de residuo">
            <GrillaOpciones nombre="Clase de residuo" opciones={CLASES_RCD} marcadas={d.clases} onAlternar={alternarClase} otros={{}} onOtro={() => {}} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <Campo label="Cantidad total" value={d.cantidad} placeholder={suma ? `Suma de viajes: ${String(suma).replace(".", ",")}` : "Suma de los viajes"} inputMode="decimal" onChange={(v) => set("cantidad", v.replace(/[^0-9.,]/g, ""))} />
            <Lista label="Unidad" value={d.unidad} onChange={(v) => set("unidad", v)} opciones={["m³", "t", "kg"]} />
          </div>
          <div className="text-[10.5px] mt-1.5" style={{ color: "#8A8F99" }}>Si dejas la cantidad vacía se usa la suma de los viajes{suma ? ` (${String(suma).replace(".", ",")} m³)` : ""}. N° de viajes: {nViajes}.</div>
        </Seccion>

        <Seccion id="viajes" titulo="4. Registro de viajes" subtitulo={`${nViajes} de ${MAX_VIAJES} viajes · ${String(suma).replace(".", ",")} m³`} abierta={abierta === "viajes"} onToggle={alternar} contador={nViajes}>
          {viajes.map((v, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Viaje {i + 1}</div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <SelectorHora label={`Hora de salida ${i + 1}`} value={v.salida} onChange={(x) => actualizarViaje(i, { salida: x })} />
                  <SelectorHora label={`Hora de llegada ${i + 1}`} value={v.llegada} onChange={(x) => actualizarViaje(i, { llegada: x })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Placa del viaje" value={v.placa} onChange={(x) => actualizarViaje(i, { placa: x.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} />
                  <Campo label="Volumen (m³)" value={v.volumen} inputMode="decimal" onChange={(x) => actualizarViaje(i, { volumen: x.replace(/[^0-9.,]/g, "") })} />
                </div>
                <Campo label="Conductor del viaje" value={v.conductor} onChange={(x) => actualizarViaje(i, { conductor: x })} />
                <Campo label="N° de vale o tiquete" value={v.vale} onChange={(x) => actualizarViaje(i, { vale: x })} />
                <Campo label="Observaciones del viaje" value={v.obs} onChange={(x) => actualizarViaje(i, { obs: x })} />
              </div>
              <button type="button" onClick={() => quitarViaje(i)} aria-label={`Quitar viaje ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarViaje} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> {viajes.length ? "Agregar otro viaje" : "Agregar viaje"}
          </button>
          {avisoViajes && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoViajes}</div>}
        </Seccion>

        <Seccion id="sitio" titulo="5. Sitio de disposición o aprovechamiento" subtitulo={d.sitio || "Planta o sitio autorizado"} abierta={abierta === "sitio"} onToggle={alternar}>
          <div className="space-y-2.5">
            <BuscadorLista label="Nombre del sitio o planta" value={d.sitio} onChange={(v) => set("sitio", v)} onElegir={elegirSitio} opciones={opcionesSitio} opcionesAlAbrir={opcionesSitio} placeholder="Escribe o elige uno usado antes" />
            <BuscadorLista label="Municipio del sitio" value={d.municipio} onChange={(v) => set("municipio", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="N° de autorización ambiental" value={d.autAmbiental} onChange={(v) => set("autAmbiental", v)} />
            <Lista label="Destino" value={d.destino} onChange={(v) => set("destino", v)} opciones={DESTINOS_RCD} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="N° de certificado" value={d.certificado} onChange={(v) => set("certificado", v)} />
              <Campo label="Fecha del certificado" type="date" value={d.fechaCert} onChange={(v) => set("fechaCert", v)} />
            </div>
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El certificado lo entrega el sitio al recibir el material; si aún no lo tienes, déjalo vacío y complétalo después en el papel.</div>
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Generador, transportador y quien recibe" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firman el responsable en obra ({d.respObra || "sin nombre"}) y el conductor ({d.conductor || "sin nombre"}); sus nombres vienen de las secciones 1 y 2.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Recibe (sitio de disposición)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien recibe" etqCargo="Cargo de quien recibe" nombre={d.recibeNombre} cargo={d.recibeCargo} onChange={cambiarPersona("recibeNombre", "recibeCargo")} cargosSugeridos={CARGOS_RECIBE_RCD} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoManifiesto} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nuevo manifiesto (conserva obra, responsable y sitio)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del manifiesto" onGenerar={generarExcel} />
    </div>
  );
}
