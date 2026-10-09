import { useState } from "react";
import {
  CODIGO_FICHA_AMB, HOJA_FICHA_AMB, CELDAS_FICHA_AMB, TIPOS_OBRA_AMB, INSTRUMENTOS, SI_NO_AMB, PERMISOS, CONDICIONES, GESTORES,
  descubrirFichaAmb, escribirFichaAmbEnHoja, validarFichaAmb, camposFaltantesFichaAmb, resumenFichaAmb, permisoNuevo, gestorNuevo, permisosQueAplican,
} from "./fichaAmbientalDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, GrillaOpciones } from "./sstControles";
import { CLAVE_AMB_FICHA, CLAVE_AMB_FICHA_DATOS } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_ficha_ambiental";
const COLOR_SI_NO = { "Sí": "#2E7D4F", No: "#8A8F99" };

function datosIniciales() {
  return {
    proyecto: "", contratante: "", contratista: "", municipio: "", direccion: "", tipoObra: "", area: "", fechaInicio: "", finPrevisto: "", trabajadores: "",
    instrumentos: [], autoridad: "", resolucion: "", fechaActo: "", vigenteHasta: "", ultimoICA: "",
    permisos: PERMISOS.map(permisoNuevo), condiciones: [], gestores: GESTORES.map(gestorNuevo),
    respNombre: "", respCargo: "Responsable ambiental", respTelefono: "", respCorreo: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.proyecto || d.contratante || d.contratista || d.municipio || d.direccion || d.tipoObra || d.instrumentos.length || d.autoridad || d.respNombre || d.respTelefono || d.condiciones.length || d.elaboroNombre ||
    d.permisos.some((x) => x.aplica || x.resolucion || x.nombre) || d.gestores.some((x) => x.empresa || x.nit || x.autorizacion));
}

export default function FormularioFichaAmbiental({ onVolver }) {
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
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const alternarMarca = (campo) => (texto) => setD((cur) => ({ ...cur, [campo]: cur[campo].includes(texto) ? cur[campo].filter((t) => t !== texto) : [...cur[campo], texto] }));
  // "Ninguno" no se combina con los otros instrumentos
  const alternarInstrumento = (texto) => setD((cur) => {
    const ya = cur.instrumentos.includes(texto);
    if (ya) return { ...cur, instrumentos: cur.instrumentos.filter((t) => t !== texto) };
    const ninguno = INSTRUMENTOS[INSTRUMENTOS.length - 1];
    return { ...cur, instrumentos: texto === ninguno ? [ninguno] : [...cur.instrumentos.filter((t) => t !== ninguno), texto] };
  });
  const actualizar = (campo) => (i, patch) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const actualizarPermiso = actualizar("permisos"), actualizarGestor = actualizar("gestores");

  // ---- Volver a editar la ficha de un proyecto ya guardado ----
  const guardadas = leerJSON(CLAVE_AMB_FICHA_DATOS, []);
  function cargarGuardada(nombre) {
    const g = guardadas.find((x) => x.datos && x.datos.proyecto === nombre);
    if (!g) return;
    setD({ ...datosIniciales(), ...g.datos, permisos: PERMISOS.map((_, i) => ({ ...permisoNuevo(), ...((g.datos.permisos || [])[i] || {}) })), gestores: GESTORES.map((_, i) => ({ ...gestorNuevo(), ...((g.datos.gestores || [])[i] || {}) })) });
    setAvisoCarga(`Se cargó la ficha de «${nombre}». Corrige lo que cambió y vuelve a generar.`);
  }

  const nAplican = permisosQueAplican(d).length;
  const nGestores = d.gestores.filter((x) => x.empresa && x.empresa.trim()).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarFichaAmb(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesFichaAmb(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-ficha-ambiental.xlsx", HOJA_FICHA_AMB);
      const avisos = [];
      const lectura = descubrirFichaAmb(ws);
      const decision = decidirDistribucion(lectura, CELDAS_FICHA_AMB);   // si el formato de la plantilla no coincide con la app, se detiene
      if (decision.aviso) avisos.push(decision.aviso);
      const sinMarcar = escribirFichaAmbEnHoja(ws, d, decision.celdas);
      if (sinMarcar.length) avisos.push(`No encontré en la plantilla: ${sinMarcar.join(", ")}. No se marcaron.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Ficha_Ambiental_${textoParaArchivo(d.proyecto, 30)}.xlsx`);

      // Memoria: la ficha queda guardada para que los demás formatos ambientales traigan los datos de la obra y sus gestores
      memoria.recordarUso({ personas: [[d.respNombre, d.respCargo], [d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista, d.contratante] });
      const res = resumenFichaAmb(d);
      guardarJSON(CLAVE_AMB_FICHA, [res, ...leerJSON(CLAVE_AMB_FICHA, []).filter((x) => x.id !== res.id)].slice(0, 30));
      guardarJSON(CLAVE_AMB_FICHA_DATOS, [{ id: res.id, datos: d }, ...leerJSON(CLAVE_AMB_FICHA_DATOS, []).filter((x) => x.id !== res.id)].slice(0, 30));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (ficha de «${d.proyecto}»: ${nAplican} ${nAplican === 1 ? "permiso aplica" : "permisos aplican"}, ${nGestores} ${nGestores === 1 ? "gestor registrado" : "gestores registrados"}). Los demás formatos ambientales ya pueden traer los datos de esta obra.`);
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
    return <PantallaBorrador cual="una ficha ambiental" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Ficha Ambiental del Proyecto" subtitulo={`${CODIGO_FICHA_AMB} · Datos base ambientales, se diligencian una vez`} onVolver={onVolver} />

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
            <Campo label="Contratante / cliente" value={d.contratante} onChange={(v) => set("contratante", v)} />
            <Campo label="Contratista" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Municipio" value={d.municipio} onChange={(v) => set("municipio", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Dirección o sector" value={d.direccion} onChange={(v) => set("direccion", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Lista label="Tipo de obra" value={d.tipoObra} onChange={(v) => set("tipoObra", v)} opciones={TIPOS_OBRA_AMB} />
              <Campo label="Área o longitud" value={d.area} placeholder="Ej. 1.200 m² o 3,5 km" onChange={(v) => set("area", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Fecha de inicio" type="date" value={d.fechaInicio} onChange={(v) => set("fechaInicio", v)} />
              <Campo label="Fin previsto" type="date" value={d.finPrevisto} onChange={(v) => set("finPrevisto", v)} />
            </div>
            <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", v.replace(/[^0-9]/g, ""))} />
          </div>
        </Seccion>

        {/* 2. INSTRUMENTO AMBIENTAL */}
        <Seccion id="instrumento" titulo="2. Instrumento ambiental aplicable" subtitulo={d.instrumentos.length ? d.instrumentos.join(" · ") : "Licencia, PMA, guía ambiental…"} abierta={abierta === "instrumento"} onToggle={alternar} contador={d.instrumentos.length}>
          <div className="space-y-2.5">
            <div data-campo="Instrumento ambiental">
              <GrillaOpciones nombre="Instrumento ambiental" opciones={INSTRUMENTOS} marcadas={d.instrumentos} onAlternar={alternarInstrumento} otros={{}} onOtro={() => {}} />
            </div>
            <Campo label="Autoridad ambiental" value={d.autoridad} placeholder="Ej. CAR, Secretaría de Ambiente, ANLA" onChange={(v) => set("autoridad", v)} />
            <Campo label="N° de resolución o expediente" value={d.resolucion} onChange={(v) => set("resolucion", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Fecha del acto" type="date" value={d.fechaActo} onChange={(v) => set("fechaActo", v)} />
              <Campo label="Vigente hasta" type="date" value={d.vigenteHasta} onChange={(v) => set("vigenteHasta", v)} />
            </div>
            <Campo label="Último ICA presentado" type="date" value={d.ultimoICA} onChange={(v) => set("ultimoICA", v)} />
          </div>
        </Seccion>

        {/* 3. PERMISOS */}
        <Seccion id="permisos" titulo="3. Permisos y autorizaciones" subtitulo={`${nAplican} aplican`} abierta={abierta === "permisos"} onToggle={alternar} contador={nAplican}>
          {PERMISOS.map((nombre, i) => {
            const x = d.permisos[i];
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{i + 1}. {nombre.startsWith("Otro") ? "Otro permiso" : nombre}</div>
                <div className="space-y-2">
                  {nombre.startsWith("Otro") && <Campo label="¿Cuál?" value={x.nombre} onChange={(v) => actualizarPermiso(i, { nombre: v })} />}
                  <ChipsOpcion label="¿Aplica?" nombre={`Aplica ${i + 1}`} value={x.aplica} opciones={SI_NO_AMB} colores={COLOR_SI_NO} pequeno onChange={(v) => actualizarPermiso(i, { aplica: v })} />
                  {x.aplica === "Sí" && (
                    <>
                      <Campo label="N° de resolución" value={x.resolucion} onChange={(v) => actualizarPermiso(i, { resolucion: v })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Campo label="Vigente hasta" type="date" value={x.vigencia} onChange={(v) => actualizarPermiso(i, { vigencia: v })} />
                        <Campo label="Observación" value={x.obs} onChange={(v) => actualizarPermiso(i, { obs: v })} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Seccion>

        {/* 4. CONDICIONES */}
        <Seccion id="condiciones" titulo="4. Condiciones de la obra y del entorno" subtitulo={d.condiciones.length ? `${d.condiciones.length} marcadas` : "Marca las que aplican"} abierta={abierta === "condiciones"} onToggle={alternar} contador={d.condiciones.length}>
          <GrillaOpciones nombre="Condiciones de la obra" opciones={CONDICIONES} marcadas={d.condiciones} onAlternar={alternarMarca("condiciones")} otros={{}} onOtro={() => {}} />
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Estas marcas indican qué formatos opcionales se usan en la obra (sustancias químicas, hidrocarburos, aprovechamiento forestal).</div>
        </Seccion>

        {/* 5. GESTORES */}
        <Seccion id="gestores" titulo="5. Gestores y transportadores autorizados" subtitulo={`${nGestores} de ${GESTORES.length} registrados`} abierta={abierta === "gestores"} onToggle={alternar} contador={nGestores}>
          <div className="text-[10.5px] mb-2" style={{ color: "#8A8F99" }}>Lo que anotes aquí se ofrece luego en el Registro de Residuos y en el Manifiesto de RCD.</div>
          {GESTORES.map((nombre, i) => (
            <div key={nombre} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{nombre}</div>
              <div className="space-y-2">
                <Campo label="Empresa" value={d.gestores[i].empresa} onChange={(v) => actualizarGestor(i, { empresa: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="NIT" value={d.gestores[i].nit} onChange={(v) => actualizarGestor(i, { nit: v })} />
                  <Campo label="Vigente hasta" type="date" value={d.gestores[i].vigencia} onChange={(v) => actualizarGestor(i, { vigencia: v })} />
                </div>
                <Campo label="N° de autorización o licencia" value={d.gestores[i].autorizacion} onChange={(v) => actualizarGestor(i, { autorizacion: v })} />
              </div>
            </div>
          ))}
        </Seccion>

        {/* 6. RESPONSABLE */}
        <Seccion id="responsable" titulo="6. Responsable ambiental de la obra" subtitulo={d.respNombre || "Nombre y contacto"} abierta={abierta === "responsable"} onToggle={alternar}>
          <div className="space-y-2.5">
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable ambiental" etqCargo="Cargo del responsable" nombre={d.respNombre} cargo={d.respCargo} onChange={cambiarPersona("respNombre", "respCargo")} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Teléfono" value={d.respTelefono} inputMode="tel" onChange={(v) => set("respTelefono", v)} />
              <Campo label="Correo" value={d.respCorreo} inputMode="email" onChange={(v) => set("respCorreo", v)} />
            </div>
          </div>
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Elabora el responsable ambiental; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable ambiental)</div>
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
