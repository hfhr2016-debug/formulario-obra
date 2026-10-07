import { useState } from "react";
import {
  CODIGO_FICHA, HOJA_FICHA, CELDAS_FICHA, TIPOS_OBRA, TURNOS, CLASES_RIESGO, ESTADO_ORG, ESTADO_BRIGADA, EXISTE, RIESGOS_PROYECTO, DOCUMENTOS_BASE, CONTACTOS,
  descubrirFicha, escribirFichaEnHoja, validarFicha, camposFaltantesFicha, resumenFicha, documentoNuevo, contactoNuevo,
} from "./fichaDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, useListaRecordada,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ARL } from "./sstListas";
import { ChipsOpcion, GrillaOpciones } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_ficha";
const CLAVE_FICHA = "ryr_sst_ficha";                 // resumen de la ficha de cada proyecto: de aquí los demás formularios traen los datos de la obra
const CLAVE_FICHA_DATOS = "ryr_sst_ficha_datos";     // los datos completos, para volver a editar la ficha cuando cambie algo
const COLOR_EXISTE = { "Sí": "#2E7D4F", No: "#B3401F", "En trámite": "#C98A00", "No aplica": "#8A8F99" };

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", contratante: "", nContrato: "", interventoria: "", tipoObra: "", fechaInicio: "", terminacion: "", trabajadoresPrev: "", horasDia: "", diasSemana: "", turnos: "",
    arl: "", claseRiesgo: "", nAfiliacion: "", fechaAfiliacion: "", respNombre: "", respDocumento: "", respCargo: "", licencia: "", vigenciaLicencia: "", respTelefono: "", residenteNombre: "", residenteTelefono: "",
    copasst: "", copasstHasta: "", convivencia: "", brigada: "", riesgos: [], otros: {},
    documentos: DOCUMENTOS_BASE.map(documentoNuevo), contactos: CONTACTOS.map(contactoNuevo),
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.proyecto || d.contratista || d.ubicacion || d.contratante || d.nContrato || d.arl || d.respNombre || d.residenteNombre || d.riesgos.length || d.elaboroNombre ||
    d.documentos.some((x) => x.existe || x.fecha || x.obs) || d.contactos.some((x) => x.telefono || x.direccion));
}

export default function FormularioFicha({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCarga, setAvisoCarga] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const listaArl = useListaRecordada("ryr_sst_arl", ARL);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const alternarRiesgo = (base) => setD((cur) => ({ ...cur, riesgos: cur.riesgos.includes(base) ? cur.riesgos.filter((t) => t !== base) : [...cur.riesgos, base] }));
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));
  const actualizarDoc = (i, patch) => setD((cur) => ({ ...cur, documentos: cur.documentos.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const actualizarContacto = (i, patch) => setD((cur) => ({ ...cur, contactos: cur.contactos.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));

  // ---- Volver a editar la ficha de un proyecto ya guardado ----
  const guardadas = leerJSON(CLAVE_FICHA_DATOS, []);
  function cargarGuardada(nombre) {
    const g = guardadas.find((x) => x.datos && x.datos.proyecto === nombre);
    if (!g) return;
    setD({ ...datosIniciales(), ...g.datos, documentos: DOCUMENTOS_BASE.map((_, i) => ({ ...documentoNuevo(), ...((g.datos.documentos || [])[i] || {}) })), contactos: CONTACTOS.map((_, i) => ({ ...contactoNuevo(), ...((g.datos.contactos || [])[i] || {}) })) });
    setAvisoCarga(`Se cargó la ficha de «${nombre}». Corrige lo que cambió y vuelve a generar.`);
  }

  const docsSi = d.documentos.filter((x) => x.existe === "Sí").length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarFicha(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesFicha(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-ficha-sst.xlsx", HOJA_FICHA);
      const avisos = [];
      const lectura = descubrirFicha(ws);
      const decision = decidirDistribucion(lectura, CELDAS_FICHA);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const sinMarcar = escribirFichaEnHoja(ws, d, celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Ficha_SST_${textoParaArchivo(d.proyecto, 30)}.xlsx`);

      // Memoria: la ficha del proyecto queda guardada para que los demás formularios traigan los datos de la obra
      listaArl.recordar(d.arl);
      trabajadores.recordar([{ nombre: d.respNombre, documento: d.respDocumento, cargo: d.respCargo, empresa: d.contratista }, { nombre: d.residenteNombre, cargo: "Residente de obra", empresa: d.contratista }]);
      memoria.recordarUso({ personas: [[d.respNombre, d.respCargo], [d.residenteNombre, "Residente de obra"], [d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenFicha(d);
      guardarJSON(CLAVE_FICHA, [res, ...leerJSON(CLAVE_FICHA, []).filter((x) => x.id !== res.id)].slice(0, 30));
      guardarJSON(CLAVE_FICHA_DATOS, [{ id: res.id, datos: d }, ...leerJSON(CLAVE_FICHA_DATOS, []).filter((x) => x.id !== res.id)].slice(0, 30));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (ficha de «${d.proyecto}»: ${docsSi} de ${DOCUMENTOS_BASE.length} documentos base existen). Desde ahora los demás formularios pueden traer los datos de esta obra.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una ficha en blanco? Se limpian todos los datos de pantalla (las fichas ya guardadas no se borran).")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoCarga(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una ficha del proyecto" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="FICHA SST DEL PROYECTO" subtitulo={`${CODIGO_FICHA} · Datos base de seguridad y salud, se diligencian una vez`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS DEL PROYECTO */}
        <Seccion id="datos" titulo="1. Datos del proyecto" subtitulo={d.proyecto || "Obra, contratante y duración"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            {guardadas.length > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
                <Lista label="📂 Volver a editar la ficha de un proyecto guardado" value="" onChange={cargarGuardada} opciones={guardadas.map((g) => g.datos && g.datos.proyecto).filter(Boolean)} />
                {avisoCarga && <div className="text-[11px] mt-1.5" style={{ color: "#2E7D4F" }}>{avisoCarga}</div>}
              </div>
            )}
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Contratante / cliente" value={d.contratante} onChange={(v) => set("contratante", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="N° de contrato" value={d.nContrato} onChange={(v) => set("nContrato", v)} />
              <Lista label="Tipo de obra" value={d.tipoObra} onChange={(v) => set("tipoObra", v)} opciones={TIPOS_OBRA} />
            </div>
            <Campo label="Interventoría" value={d.interventoria} onChange={(v) => set("interventoria", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Fecha de inicio" type="date" value={d.fechaInicio} onChange={(v) => set("fechaInicio", v)} />
              <Campo label="Terminación prevista" type="date" value={d.terminacion} onChange={(v) => set("terminacion", v)} />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Campo label="Trabajadores previstos" value={d.trabajadoresPrev} inputMode="numeric" onChange={(v) => set("trabajadoresPrev", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Horas por día" value={d.horasDia} inputMode="decimal" onChange={(v) => set("horasDia", v.replace(/[^0-9.,]/g, ""))} />
              <Campo label="Días por semana" value={d.diasSemana} inputMode="numeric" onChange={(v) => set("diasSemana", v.replace(/[^0-9]/g, ""))} />
            </div>
            <Lista label="Turnos" value={d.turnos} onChange={(v) => set("turnos", v)} opciones={TURNOS} />
          </div>
        </Seccion>

        {/* 2. AFILIACIONES Y ORGANIZACIÓN */}
        <Seccion id="afiliaciones" titulo="2. Afiliaciones y organización del SG-SST" subtitulo={d.arl || "ARL, responsable SST, COPASST y brigada"} abierta={abierta === "afiliaciones"} onToggle={alternar}>
          <div className="space-y-2.5">
            <BuscadorLista label="ARL" value={d.arl} opciones={listaArl.opciones} opcionesAlAbrir={listaArl.opciones} maxResultados={10} placeholder="Elige la ARL o escribe otra" onChange={(v) => set("arl", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Clase de riesgo" value={d.claseRiesgo} onChange={(v) => set("claseRiesgo", v)} opciones={CLASES_RIESGO} />
              <Campo label="Fecha de afiliación" type="date" value={d.fechaAfiliacion} onChange={(v) => set("fechaAfiliacion", v)} />
            </div>
            <Campo label="N° de afiliación o póliza" value={d.nAfiliacion} onChange={(v) => set("nAfiliacion", v)} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Responsable del SG-SST</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable del SG-SST" etqCargo="Cargo del responsable" nombre={d.respNombre} cargo={d.respCargo} onChange={cambiarPersona("respNombre", "respCargo")} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Documento del responsable" value={d.respDocumento} inputMode="numeric" onChange={(v) => set("respDocumento", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
              <Campo label="Teléfono del responsable" value={d.respTelefono} inputMode="tel" onChange={(v) => set("respTelefono", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Licencia en SST N°" value={d.licencia} onChange={(v) => set("licencia", v)} />
              <Campo label="Vigencia de la licencia" type="date" value={d.vigenciaLicencia} onChange={(v) => set("vigenciaLicencia", v)} />
            </div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Residente de obra</div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Nombre del residente de obra" value={d.residenteNombre} onChange={(v) => set("residenteNombre", v)} />
              <Campo label="Teléfono del residente" value={d.residenteTelefono} inputMode="tel" onChange={(v) => set("residenteTelefono", v)} />
            </div>
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Comités y brigada</div>
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="COPASST o Vigía SST" value={d.copasst} onChange={(v) => set("copasst", v)} opciones={ESTADO_ORG} />
              <Campo label="Vigente hasta" type="date" value={d.copasstHasta} onChange={(v) => set("copasstHasta", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Comité de Convivencia" value={d.convivencia} onChange={(v) => set("convivencia", v)} opciones={ESTADO_ORG} />
              <Lista label="Brigada de emergencias" value={d.brigada} onChange={(v) => set("brigada", v)} opciones={ESTADO_BRIGADA} />
            </div>
          </div>
        </Seccion>

        {/* 3. RIESGOS */}
        <Seccion id="riesgos" titulo="3. Riesgos principales del proyecto" subtitulo={d.riesgos.length ? `${d.riesgos.length} marcados` : "Marca los que aplican"} abierta={abierta === "riesgos"} onToggle={alternar} contador={d.riesgos.length}>
          <GrillaOpciones nombre="Riesgos principales" opciones={RIESGOS_PROYECTO} marcadas={d.riesgos} onAlternar={alternarRiesgo} otros={d.otros} onOtro={cambiarOtro} />
        </Seccion>

        {/* 4. DOCUMENTOS BASE */}
        <Seccion id="documentos" titulo="4. Documentos base del SG-SST" subtitulo={`${docsSi} de ${DOCUMENTOS_BASE.length} existen`} abierta={abierta === "documentos"} onToggle={alternar} contador={docsSi}>
          {DOCUMENTOS_BASE.map((nombre, i) => (
            <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre}</div>
              <div className="space-y-2">
                <ChipsOpcion label="¿Existe?" nombre={`Existe ${i + 1}`} value={d.documentos[i].existe} opciones={EXISTE} colores={COLOR_EXISTE} pequeno onChange={(v) => actualizarDoc(i, { existe: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Fecha o versión" value={d.documentos[i].fecha} placeholder="Ej. 2026-02-15 o v2" onChange={(v) => actualizarDoc(i, { fecha: v })} />
                  <Campo label="Observación" value={d.documentos[i].obs} onChange={(v) => actualizarDoc(i, { obs: v })} />
                </div>
              </div>
            </div>
          ))}
        </Seccion>

        {/* 5. CONTACTOS */}
        <Seccion id="contactos" titulo="5. Contactos de emergencia" subtitulo={`${d.contactos.filter((x) => x.telefono).length} de ${CONTACTOS.length} con teléfono`} abierta={abierta === "contactos"} onToggle={alternar} contador={d.contactos.filter((x) => x.telefono).length}>
          {CONTACTOS.map((nombre, i) => (
            <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{nombre}</div>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Teléfono" value={d.contactos[i].telefono} inputMode="tel" onChange={(v) => actualizarContacto(i, { telefono: v })} />
                <Campo label="Dirección o distancia" value={d.contactos[i].direccion} onChange={(v) => actualizarContacto(i, { direccion: v })} />
              </div>
            </div>
          ))}
        </Seccion>

        {/* 6. FIRMAS */}
        <Seccion id="firmas" titulo="6. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
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
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la ficha" onGenerar={generarExcel} />
    </div>
  );
}
