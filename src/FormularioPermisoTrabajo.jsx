import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_PERMISO, HOJA_PERMISO, CELDAS_PERMISO, VIGENCIAS, RESPUESTAS, RESPUESTAS_REQ, LECTURAS, TIPOS_PERMISO, VERIF_PREVIA,
  tipoDe, requisitosDe, descubrirPermiso, escribirPermisoEnHoja, validarPermiso, resumenPermiso, gasesVisibles, gasesObligatorios,
  personalConDatos, condicionesEnNo, certificacionesVencidas,
} from "./permisoDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { camposFaltantesPermiso } from "./permisoDatos";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { useListaRecordada } from "./sstComunes";
import { CERTIFICACIONES } from "./sstListas";
import { fechaHoyISO } from "./sstBase";
import { ChipsOpcion, CampoFecha, FilaVerificacion } from "./sstControles";
import { TraerDeFicha } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_permiso_trabajo";
const CLAVE_CONSECUTIVO = "ryr_sst_permiso_consecutivo";
const CLAVE_PERMISOS = "ryr_sst_permisos";                      // resumen de cada permiso generado
const CLAVE_ULTIMO_PERSONAL = "ryr_sst_permiso_ultimo_personal";  // personal del último permiso (para repetirlo)
const MAX_PERSONAL = (CELDAS_PERMISO.tablas && CELDAS_PERMISO.tablas.personal.n) || 6;

const vacios = (n) => Array.from({ length: n }, () => "");
const personaNueva = (base = {}) => ({ nombre: "", documento: "", cargo: "", cert: "", certVence: "", ...base });
const lecturaNueva = () => ({ hora: "", o2: "", lel: "", co: "", h2s: "", resp: "" });

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", nPermiso: "", fecha: "", horaInicio: "", horaFin: "", vigencia: "",
    frente: "", altura: "", descripcion: "", solicitanteNombre: "", solicitanteCargo: "", solicitanteHora: "",
    tipoPermiso: "", equipo: "",
    personal: [personaNueva()],
    previa: vacios(VERIF_PREVIA.length), previaObs: vacios(VERIF_PREVIA.length),
    requisitos: vacios(12), requisitosObs: vacios(12),
    gases: LECTURAS.map(lecturaNueva),
    autorizaNombre: "", autorizaCargo: "", autorizaHora: "", vigiaNombre: "", vigiaCargo: "", vigiaHora: "",
    horaCierre: "", trabajoTerminado: "", areaEnOrden: "", obsCierre: "", motivoCancelacion: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.nPermiso || d.fecha || d.horaInicio || d.frente || d.descripcion || d.solicitanteNombre || d.tipoPermiso ||
    d.personal.some((p) => p.nombre || p.documento) || d.previa.some(Boolean) || d.requisitos.some(Boolean) || d.autorizaNombre);
}

export default function FormularioPermisoTrabajo({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("tipo");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoPersonal, setAvisoPersonal] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const certs = useListaRecordada("ryr_sst_certificaciones", CERTIFICACIONES, { min: 4 });   // certificados de construcción + los que se escriban
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

  // ---- Tipo de trabajo ----
  // Cada permiso es de UN tipo. Al cambiar de tipo se limpian los requisitos (cada tipo tiene los suyos).
  const elegirTipo = (id) => setD((cur) => (cur.tipoPermiso === id ? { ...cur, tipoPermiso: "" } : { ...cur, tipoPermiso: id, requisitos: vacios(12), requisitosObs: vacios(12) }));

  // ---- Personal ----
  const setPersonal = (nuevo) => setD((cur) => ({ ...cur, personal: nuevo }));
  const actualizarPersona = (i, patch) => setPersonal(d.personal.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const quitarPersona = (i) => { setPersonal(d.personal.filter((_, k) => k !== i)); setAvisoPersonal(""); };
  function agregarPersona() {
    if (d.personal.length >= MAX_PERSONAL) { setAvisoPersonal(`Este permiso tiene espacio para ${MAX_PERSONAL} personas. Si son más, genera otro permiso para el resto.`); return; }
    setAvisoPersonal(""); setPersonal([...d.personal, personaNueva()]);
  }
  function elegirTrabajador(i, o) {
    const t = trabajadores.buscar(o.texto);
    const p = d.personal[i];
    actualizarPersona(i, { nombre: t ? t.nombre : o.texto, documento: p.documento || (t && t.documento) || "", cargo: p.cargo || (t && t.cargo) || "" });
  }
  const ultimoPersonal = leerJSON(CLAVE_ULTIMO_PERSONAL, []);
  function traerUltimoPersonal() { setPersonal(ultimoPersonal.slice(0, MAX_PERSONAL).map((p) => personaNueva({ ...p, cert: p.cert || "" }))); setAvisoPersonal(""); }

  // ---- Verificaciones ----
  const poner = (campo, i, valor) => setD((cur) => ({ ...cur, [campo]: cur[campo].map((v, k) => (k === i ? valor : v)) }));
  const marcarSiPrevia = () => setD((cur) => ({ ...cur, previa: cur.previa.map((v) => v || "Sí") }));
  const tipo = tipoDe(d);
  const reqs = requisitosDe(d);
  const marcarCumpleReq = () => setD((cur) => ({ ...cur, requisitos: cur.requisitos.map((v, i) => (i < reqs.length ? v || "Cumple" : v)) }));
  const respondidasReq = reqs.filter((_, i) => d.requisitos[i]).length;
  const respondidasPrevia = d.previa.filter(Boolean).length;
  const enNo = condicionesEnNo(d);

  // ---- Gases ----
  const actualizarLectura = (i, patch) => setD((cur) => ({ ...cur, gases: cur.gases.map((g, k) => (k === i ? { ...g, ...patch } : g)) }));
  const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPermiso(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesPermiso(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-permiso-trabajo.xlsx", HOJA_PERMISO);
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_PERMISO;
      const avisos = [];
      const lectura = descubrirPermiso(ws);
      const decision = decidirDistribucion(lectura, CELDAS_PERMISO);   // si el formato de la plantilla no coincide con la app, se detiene
      celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const personal = personalConDatos(d);
      const capacidad = (celdas.tablas && celdas.tablas.personal && celdas.tablas.personal.n) || MAX_PERSONAL;
      if (personal.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} personas y hay ${personal.length}`);
      const nUsar = d.nPermiso && String(d.nPermiso).trim() ? String(d.nPermiso).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      escribirPermisoEnHoja(ws, { ...d, nPermiso: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Permiso_Trabajo_${d.fecha}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(tipo ? tipo.nombre : "", 40)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar(personal.map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, empresa: d.contratista })));
      guardarJSON(CLAVE_ULTIMO_PERSONAL, personal);
      personal.forEach((p) => certs.recordar(p.cert));
      memoria.recordarUso({
        personas: [[d.solicitanteNombre, d.solicitanteCargo], [d.autorizaNombre, d.autorizaCargo], [d.vigiaNombre, d.vigiaCargo]],
        cargosObra: personal.map((p) => p.cargo), empresasUsadas: [d.contratista],
      });
      const res = resumenPermiso({ ...d, nPermiso: nUsar });
      guardarJSON(CLAVE_PERMISOS, [res, ...leerJSON(CLAVE_PERMISOS, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nPermiso: nUsar }));
      const vencidas = certificacionesVencidas(d, fechaHoyISO());
      setGenerado(`✓ Excel descargado (permiso N° ${nUsar}, ${personal.length} ${personal.length === 1 ? "persona" : "personas"}). Imprímelo para las firmas.` +
        (enNo.length ? ` ⚠ Hay ${enNo.length} ${enNo.length === 1 ? "condición marcada" : "condiciones marcadas"} en "No": el permiso no debe autorizarse hasta corregirlas.` : "") +
        (vencidas.length ? ` ⚠ Certificación vencida: ${vencidas.join(", ")}.` : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nuevo permiso: conserva la obra y las personas que autorizan; limpia lo propio de cada trabajo (el N° avanza solo)
  function nuevoPermiso() {
    setD((cur) => ({
      ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, fecha: cur.fecha,
      solicitanteNombre: cur.solicitanteNombre, solicitanteCargo: cur.solicitanteCargo, autorizaNombre: cur.autorizaNombre, autorizaCargo: cur.autorizaCargo,
    }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPersonal(""); setAbierta("datos"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un permiso en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD({ ...datosIniciales(), proyecto: "" }); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPersonal(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un permiso de trabajo" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const personasCon = personalConDatos(d).length;
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="PERMISO DE TRABAJO" subtitulo={`${CODIGO_PERMISO} · Alto riesgo: elige el tipo de permiso`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. TIPO DE PERMISO */}
        <Seccion id="tipo" titulo="1. Tipo de permiso" subtitulo={tipo ? tipo.nombre : "Elige el tipo de permiso de trabajo"} abierta={abierta === "tipo"} onToggle={alternar} contador={tipo ? 1 : 0}>
          <div className="grid grid-cols-1 gap-1.5" role="group" aria-label="Tipo de permiso" data-campo="Tipo de permiso">
            {TIPOS_PERMISO.map((t) => {
              const activo = d.tipoPermiso === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => elegirTipo(t.id)}
                  className="w-full flex items-center gap-2.5 text-left text-[13px] px-3 py-2.5 rounded-md border font-semibold"
                  style={activo ? { background: "#" + t.relleno, borderColor: "#" + t.relleno, color: "#" + t.fuente } : { background: "white", borderColor: LINE, color: NAVY }}
                >
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: "#" + t.relleno, border: activo ? "2px solid white" : "none" }} />
                  {t.nombre}
                </button>
              );
            })}
          </div>
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Cada permiso es de un solo tipo y la fila superior del formato toma su color. Si el trabajo necesita dos tipos (por ejemplo, caliente dentro de un espacio confinado), se hace un permiso para cada uno.</div>
        </Seccion>

        {/* 2. DATOS */}
        <Seccion id="datos" titulo="2. Datos del permiso" subtitulo="Obra, fecha, vigencia y trabajo a realizar" abierta={abierta === "datos"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, ...{ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion } }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="N° de permiso" value={d.nPermiso} placeholder={`Automático (${siguienteConsecutivo(CLAVE_CONSECUTIVO)})`} inputMode="numeric" onChange={(v) => set("nPermiso", v.replace(/[^0-9A-Za-z-]/g, ""))} />
              <CampoFecha label="Fecha" value={d.fecha} onChange={(v) => set("fecha", v)} />
            </div>
            <div className="flex gap-2.5">
              <SelectorHora label="Hora inicio" value={d.horaInicio} onChange={(v) => set("horaInicio", v)} />
              <SelectorHora label="Hora fin" value={d.horaFin} onChange={(v) => set("horaFin", v)} />
            </div>
            <Lista label="Vigencia del permiso" value={d.vigencia} onChange={(v) => set("vigencia", v)} opciones={VIGENCIAS} />
            <Campo label="Frente / lugar del trabajo" value={d.frente} onChange={(v) => set("frente", v)} />
            <Campo label="Altura o profundidad (m), si aplica" value={d.altura} onChange={(v) => set("altura", v)} />
            <Campo label="Equipo, sustancia o circuito" value={d.equipo} placeholder="Ej. Equipo de soldadura, ácido muriático, tablero TD-3" onChange={(v) => set("equipo", v)} />
            <AreaTexto label="Descripción del trabajo" value={d.descripcion} onChange={(v) => set("descripcion", v)} placeholder="Qué se va a hacer, con qué equipos y dónde" filas={3} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Solicitante del permiso</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del solicitante" etqCargo="Cargo del solicitante" nombre={d.solicitanteNombre} cargo={d.solicitanteCargo} onChange={cambiarPersona("solicitanteNombre", "solicitanteCargo")} />
          </div>
        </Seccion>

        {/* 3. PERSONAL */}
        <Seccion id="personal" titulo="3. Personal que ejecuta el trabajo" subtitulo={`${personasCon} de ${MAX_PERSONAL} personas`} abierta={abierta === "personal"} onToggle={alternar} contador={personasCon}>
          {ultimoPersonal.length > 0 && personasCon === 0 && (
            <button type="button" onClick={traerUltimoPersonal} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
              👥 Traer el personal del último permiso ({ultimoPersonal.length})
            </button>
          )}
          {d.personal.map((p, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <BuscadorLista label="Nombre completo" value={p.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                  onChange={(v) => actualizarPersona(i, { nombre: v })} onElegir={(o) => elegirTrabajador(i, o)} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Documento" value={p.documento} inputMode="numeric" onChange={(v) => actualizarPersona(i, { documento: v.replace(/[^0-9A-Za-z.-]/g, "") })} />
                  <BuscadorLista label="Cargo / oficio" value={p.cargo} onChange={(v) => actualizarPersona(i, { cargo: v })} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
                </div>
                <BuscadorLista label="Certificación" value={p.cert} opciones={certs.opciones} opcionesAlAbrir={certs.opciones} maxResultados={10} placeholder="Elige el certificado o escribe otro" onChange={(v) => actualizarPersona(i, { cert: v })} />
                <div>
                  <Campo label="Fecha de vencimiento" type="date" value={p.certVence} onChange={(v) => actualizarPersona(i, { certVence: v })} />
                  {p.certVence && p.certVence < (d.fecha || fechaHoyISO()) && (
                    <div className="text-[11px] mt-1 font-semibold" style={{ color: "#B3401F" }}>⚠ Certificación vencida{d.fecha ? " el día del permiso" : ""}</div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => quitarPersona(i)} aria-label={`Quitar persona ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarPersona} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar persona
          </button>
          {avisoPersonal && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoPersonal}</div>}
        </Seccion>

        {/* 4. VERIFICACIÓN PREVIA */}
        <Seccion id="previa" titulo="4. Verificación previa" subtitulo={`${respondidasPrevia} de ${VERIF_PREVIA.length} respondidas`} abierta={abierta === "previa"} onToggle={alternar} contador={respondidasPrevia}>
          <button type="button" onClick={marcarSiPrevia} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
            ✔ Marcar "Sí" en las que faltan por responder
          </button>
          {VERIF_PREVIA.map((t, i) => (
            <FilaVerificacion key={i} numero={i + 1} texto={t} valor={d.previa[i]} onChange={(v) => poner("previa", i, v)} opciones={RESPUESTAS}
              observacion={d.previaObs[i]} onObservacion={(v) => poner("previaObs", i, v)} />
          ))}
        </Seccion>

        {/* 5. REQUISITOS ESPECÍFICOS DEL TIPO */}
        <Seccion id="req" titulo="5. Requisitos específicos" subtitulo={tipo ? `${respondidasReq} de ${reqs.length} respondidos` : "Primero elige el tipo de permiso"} abierta={abierta === "req"} onToggle={alternar} contador={respondidasReq}>
          {!tipo ? (
            <div className="text-[12px]" style={{ color: "#8A8F99" }}>Elige en "1. Tipo de permiso" qué se va a hacer y aquí aparecen los requisitos que ese permiso debe cumplir.</div>
          ) : (
            <>
              <div className="text-[11px] font-bold px-2.5 py-1 rounded mb-2.5 inline-block" style={{ background: "#" + tipo.relleno, color: "#" + tipo.fuente }}>{tipo.nombre}</div>
              <button type="button" onClick={marcarCumpleReq} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
                ✔ Marcar "Cumple" en los que faltan por responder
              </button>
              {reqs.map((t, i) => (
                <FilaVerificacion key={i} numero={i + 1} texto={t} valor={d.requisitos[i]} onChange={(v) => poner("requisitos", i, v)} opciones={RESPUESTAS_REQ}
                  observacion={d.requisitosObs[i]} onObservacion={(v) => poner("requisitosObs", i, v)} />
              ))}
            </>
          )}
          {enNo.length > 0 && (
            <div className="text-[11.5px] mt-3 p-2 rounded" style={{ background: "#FDECE7", color: "#B3401F" }}>
              ⚠ Hay {enNo.length} {enNo.length === 1 ? "condición" : "condiciones"} sin cumplir. El permiso no debería autorizarse hasta corregirlas.
            </div>
          )}
        </Seccion>

        {/* 6. GASES */}
        {gasesVisibles(d) && (
          <Seccion id="gases" titulo="6. Medición de gases" subtitulo={gasesObligatorios(d) ? "Obligatoria: espacios confinados" : "Opcional: si midió gases, regístrelo aquí"} abierta={abierta === "gases"} onToggle={alternar}>
            {LECTURAS.map((nombre, i) => (
              <div key={nombre} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: GOLD }}>{nombre.toUpperCase()}</div>
                <div className="grid grid-cols-2 gap-2">
                  <SelectorHora label="Hora" value={d.gases[i].hora} onChange={(v) => actualizarLectura(i, { hora: v })} />
                  <Campo label="Responsable de la medición" value={d.gases[i].resp} onChange={(v) => actualizarLectura(i, { resp: v })} />
                  <Campo label="Oxígeno O₂ (%)" value={d.gases[i].o2} inputMode="decimal" onChange={(v) => actualizarLectura(i, { o2: soloNumero(v) })} />
                  <Campo label="Explosividad LEL (%)" value={d.gases[i].lel} inputMode="decimal" onChange={(v) => actualizarLectura(i, { lel: soloNumero(v) })} />
                  <Campo label="CO (ppm)" value={d.gases[i].co} inputMode="decimal" onChange={(v) => actualizarLectura(i, { co: soloNumero(v) })} />
                  <Campo label="H₂S (ppm)" value={d.gases[i].h2s} inputMode="decimal" onChange={(v) => actualizarLectura(i, { h2s: soloNumero(v) })} />
                </div>
              </div>
            ))}
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Los límites aceptables son los del procedimiento del proyecto.</div>
          </Seccion>
        )}

        {/* 7. AUTORIZACIÓN */}
        <Seccion id="autorizacion" titulo={`${gasesVisibles(d) ? "7" : "6"}. Autorización`} subtitulo="Quién autoriza y el vigía o supervisor" abierta={abierta === "autorizacion"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Solicitante (ya escrito en el paso 1)</div>
            <div className="text-[12px]" style={{ color: "#4B5563" }}>{d.solicitanteNombre || "Sin nombre todavía"}{d.solicitanteCargo ? ` · ${d.solicitanteCargo}` : ""}</div>
            <SelectorHora label="Hora en que firma el solicitante" value={d.solicitanteHora} onChange={(v) => set("solicitanteHora", v)} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Autoriza (responsable SST / residente)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien autoriza" etqCargo="Cargo" nombre={d.autorizaNombre} cargo={d.autorizaCargo} onChange={cambiarPersona("autorizaNombre", "autorizaCargo")} />
            <SelectorHora label="Hora de autorización" value={d.autorizaHora} onChange={(v) => set("autorizaHora", v)} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vigía / supervisor del trabajo</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del vigía o supervisor" etqCargo="Cargo" nombre={d.vigiaNombre} cargo={d.vigiaCargo} onChange={cambiarPersona("vigiaNombre", "vigiaCargo")} />
            <SelectorHora label="Hora" value={d.vigiaHora} onChange={(v) => set("vigiaHora", v)} />
          </div>
        </Seccion>

        {/* 8. CIERRE */}
        <Seccion id="cierre" titulo={`${gasesVisibles(d) ? "8" : "7"}. Cierre del permiso`} subtitulo="Opcional: también se puede llenar a mano al terminar" abierta={abierta === "cierre"} onToggle={alternar}>
          <div className="space-y-2.5">
            <SelectorHora label="Hora de cierre" value={d.horaCierre} onChange={(v) => set("horaCierre", v)} />
            <ChipsOpcion label="¿Trabajo terminado?" value={d.trabajoTerminado} onChange={(v) => set("trabajoTerminado", v)} opciones={["Sí", "No"]} />
            <ChipsOpcion label="¿Área en orden y sin energía residual?" value={d.areaEnOrden} onChange={(v) => set("areaEnOrden", v)} opciones={["Sí", "No"]} />
            <AreaTexto label="Observaciones / novedades" value={d.obsCierre} onChange={(v) => set("obsCierre", v)} filas={2} />
            <AreaTexto label="Motivo de suspensión o cancelación (si aplica)" value={d.motivoCancelacion} onChange={(v) => set("motivoCancelacion", v)} filas={2} />
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>En el cierre firman el solicitante y quien autorizó, que ya quedan escritos.</div>
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoPermiso} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Nuevo permiso (conserva la obra y quien autoriza)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del permiso" onGenerar={generarExcel} />
    </div>
  );
}
