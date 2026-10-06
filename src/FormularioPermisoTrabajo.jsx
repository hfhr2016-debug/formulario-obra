import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { baseOpcion } from "./sstBase";
import {
  CODIGO_PERMISO, HOJA_PERMISO, CELDAS_PERMISO, VIGENCIAS, RESPUESTAS, LECTURAS, TIPOS_TRABAJO, VERIF_PREVIA, VERIF_ESPECIFICA,
  grupoDeItem, textoDeItem, descubrirPermiso, escribirPermisoEnHoja, validarPermiso, resumenPermiso, itemActivo, gasesVisibles, gasesObligatorios,
  personalConDatos, condicionesEnNo,
} from "./permisoDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { ChipsOpcion, CampoFecha, GrillaOpciones, FilaVerificacion } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_permiso_trabajo";
const CLAVE_CONSECUTIVO = "ryr_sst_permiso_consecutivo";
const CLAVE_PERMISOS = "ryr_sst_permisos";                      // resumen de cada permiso generado
const CLAVE_ULTIMO_PERSONAL = "ryr_sst_permiso_ultimo_personal";  // personal del último permiso (para repetirlo)
const MAX_PERSONAL = (CELDAS_PERMISO.tablas && CELDAS_PERMISO.tablas.personal.n) || 6;

const vacios = (n) => Array.from({ length: n }, () => "");
const personaNueva = (base = {}) => ({ nombre: "", documento: "", cargo: "", cert: "", ...base });
const lecturaNueva = () => ({ hora: "", o2: "", lel: "", co: "", h2s: "", resp: "" });

function datosIniciales() {
  const tipoProyecto = leerJSON("ryr_tipo_proyecto", null);
  return {
    proyecto: (tipoProyecto && tipoProyecto.proyecto) || "", contratista: "", ubicacion: "", nPermiso: "", fecha: "", horaInicio: "", horaFin: "", vigencia: "",
    frente: "", altura: "", descripcion: "", solicitanteNombre: "", solicitanteCargo: "", solicitanteHora: "",
    tipos: [], otros: {},
    personal: [personaNueva()],
    previa: vacios(VERIF_PREVIA.length), previaObs: vacios(VERIF_PREVIA.length),
    espec: vacios(VERIF_ESPECIFICA.length), especObs: vacios(VERIF_ESPECIFICA.length),
    gases: LECTURAS.map(lecturaNueva),
    autorizaNombre: "", autorizaCargo: "", autorizaHora: "", vigiaNombre: "", vigiaCargo: "", vigiaHora: "",
    horaCierre: "", trabajoTerminado: "", areaEnOrden: "", obsCierre: "", motivoCancelacion: "",
  };
}

function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.nPermiso || d.fecha || d.horaInicio || d.frente || d.descripcion || d.solicitanteNombre || d.tipos.length ||
    d.personal.some((p) => p.nombre || p.documento) || d.previa.some(Boolean) || d.espec.some(Boolean) || d.autorizaNombre);
}

export default function FormularioPermisoTrabajo({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoPersonal, setAvisoPersonal] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
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
  // Los tipos quedan siempre en el orden del formato (así el resumen y el nombre del archivo no dependen de qué se tocó primero)
  const ordenTipos = TIPOS_TRABAJO.map(baseOpcion);
  const alternarTipo = (base) => setD((cur) => {
    const nuevos = cur.tipos.includes(base) ? cur.tipos.filter((t) => t !== base) : [...cur.tipos, base];
    return { ...cur, tipos: nuevos.sort((a, b) => ordenTipos.indexOf(a) - ordenTipos.indexOf(b)) };
  });
  const cambiarOtro = (base, texto) => setD((cur) => ({ ...cur, otros: { ...cur.otros, [base]: texto } }));

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
  const marcarSiEspec = () => setD((cur) => ({ ...cur, espec: cur.espec.map((v, i) => (itemActivo(cur, i) ? v || "Sí" : v)) }));
  const itemsActivos = VERIF_ESPECIFICA.map((t, i) => ({ t, i })).filter(({ i }) => itemActivo(d, i));
  const gruposOcultos = [...new Set(VERIF_ESPECIFICA.map(grupoDeItem))].filter((g) => !itemsActivos.some(({ t }) => grupoDeItem(t) === g));
  const respondidasPrevia = d.previa.filter(Boolean).length;
  const respondidasEspec = itemsActivos.filter(({ i }) => d.espec[i]).length;
  const enNo = condicionesEnNo(d);

  // ---- Gases ----
  const actualizarLectura = (i, patch) => setD((cur) => ({ ...cur, gases: cur.gases.map((g, k) => (k === i ? { ...g, ...patch } : g)) }));
  const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPermiso(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-permiso-trabajo.xlsx", HOJA_PERMISO);
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_PERMISO;
      const avisos = [];
      try {
        const lectura = descubrirPermiso(ws);
        if (lectura.celdas) celdas = lectura.celdas;
        else {
          console.warn("No pude leer la distribución de la plantilla; uso la de por defecto:", lectura.problemas);
          avisos.push("No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame.");
        }
      } catch (e) { console.warn("Error al leer la plantilla; uso la distribución por defecto:", e); }
      const personal = personalConDatos(d);
      const capacidad = (celdas.tablas && celdas.tablas.personal && celdas.tablas.personal.n) || MAX_PERSONAL;
      if (personal.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} personas y hay ${personal.length}`);
      const nUsar = d.nPermiso && String(d.nPermiso).trim() ? String(d.nPermiso).trim() : String(siguienteConsecutivo(CLAVE_CONSECUTIVO));
      const sinMarcar = escribirPermisoEnHoja(ws, { ...d, nPermiso: nUsar }, celdas);
      if (sinMarcar.length) avisos.push(`No encontré estos tipos de trabajo en la plantilla y no se marcaron: ${sinMarcar.join(", ")}.`);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Permiso_Trabajo_${d.fecha}_N${textoParaArchivo(nUsar, 10)}_${textoParaArchivo(d.tipos[0] || "", 22)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_CONSECUTIVO, nUsar);
      trabajadores.recordar(personal.map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, empresa: d.contratista })));
      guardarJSON(CLAVE_ULTIMO_PERSONAL, personal);
      memoria.recordarUso({
        personas: [[d.solicitanteNombre, d.solicitanteCargo], [d.autorizaNombre, d.autorizaCargo], [d.vigiaNombre, d.vigiaCargo]],
        cargosObra: personal.map((p) => p.cargo), empresasUsadas: [d.contratista],
      });
      const res = resumenPermiso({ ...d, nPermiso: nUsar });
      guardarJSON(CLAVE_PERMISOS, [res, ...leerJSON(CLAVE_PERMISOS, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, nPermiso: nUsar }));
      setGenerado(`✓ Excel descargado (permiso N° ${nUsar}, ${personal.length} ${personal.length === 1 ? "persona" : "personas"}). Imprímelo para las firmas.` +
        (enNo.length ? ` ⚠ Hay ${enNo.length} ${enNo.length === 1 ? "condición marcada" : "condiciones marcadas"} en "No": el permiso no debe autorizarse hasta corregirlas.` : ""));
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
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPersonal(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un permiso de trabajo" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const personasCon = personalConDatos(d).length;
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="PERMISO DE TRABAJO" subtitulo={`${CODIGO_PERMISO} · Alto riesgo: alturas, caliente, confinados, excavaciones…`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del permiso" subtitulo="Obra, fecha, vigencia y trabajo a realizar" abierta={abierta === "datos"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
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
            <AreaTexto label="Descripción del trabajo" value={d.descripcion} onChange={(v) => set("descripcion", v)} placeholder="Qué se va a hacer, con qué equipos y dónde" filas={3} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Solicitante del permiso</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del solicitante" etqCargo="Cargo del solicitante" nombre={d.solicitanteNombre} cargo={d.solicitanteCargo} onChange={cambiarPersona("solicitanteNombre", "solicitanteCargo")} />
          </div>
        </Seccion>

        {/* 2. TIPO DE TRABAJO */}
        <Seccion id="tipo" titulo="2. Tipo de trabajo" subtitulo={d.tipos.length ? d.tipos.join(" · ") : "Marca los que apliquen"} abierta={abierta === "tipo"} onToggle={alternar} contador={d.tipos.length}>
          <GrillaOpciones nombre="Tipo de trabajo" opciones={TIPOS_TRABAJO} marcadas={d.tipos} onAlternar={alternarTipo} otros={d.otros} onOtro={cambiarOtro} />
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Según lo que marques se piden las verificaciones específicas de ese trabajo.</div>
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
                <Campo label="Certificación (tipo y vigencia)" value={p.cert} placeholder="Ej. Alturas avanzado, vence 03/2027" onChange={(v) => actualizarPersona(i, { cert: v })} />
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

        {/* 5. VERIFICACIÓN ESPECÍFICA */}
        <Seccion id="espec" titulo="5. Verificación específica" subtitulo={d.tipos.length ? `${respondidasEspec} de ${itemsActivos.length} respondidas` : "Primero elige el tipo de trabajo"} abierta={abierta === "espec"} onToggle={alternar} contador={respondidasEspec}>
          {!itemsActivos.length ? (
            <div className="text-[12px]" style={{ color: "#8A8F99" }}>Elige en "2. Tipo de trabajo" qué se va a hacer (alturas, caliente, confinados, excavaciones, eléctrico o izaje) y aquí aparecen sus condiciones.</div>
          ) : (
            <>
              <button type="button" onClick={marcarSiEspec} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border mb-3" style={{ borderColor: NAVY, color: NAVY }}>
                ✔ Marcar "Sí" en las que faltan por responder
              </button>
              {itemsActivos.map(({ t, i }) => (
                <div key={i}>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: GOLD }}>{grupoDeItem(t)}</div>
                  <FilaVerificacion numero={i + 1} texto={textoDeItem(t)} valor={d.espec[i]} onChange={(v) => poner("espec", i, v)} opciones={RESPUESTAS}
                    observacion={d.especObs[i]} onObservacion={(v) => poner("especObs", i, v)} />
                </div>
              ))}
            </>
          )}
          {gruposOcultos.length > 0 && d.tipos.length > 0 && (
            <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>No aplican a este trabajo y quedan en N/A: {gruposOcultos.map((g) => g.toLowerCase()).join(", ")}.</div>
          )}
          {enNo.length > 0 && (
            <div className="text-[11.5px] mt-3 p-2 rounded" style={{ background: "#FDECE7", color: "#B3401F" }}>
              ⚠ Hay {enNo.length} {enNo.length === 1 ? "condición" : "condiciones"} en "No". El permiso no debería autorizarse hasta corregirlas.
            </div>
          )}
        </Seccion>

        {/* 6. GASES */}
        {gasesVisibles(d) && (
          <Seccion id="gases" titulo="6. Medición de gases" subtitulo={gasesObligatorios(d) ? "Obligatoria: espacios confinados" : "Trabajo en caliente (si aplica)"} abierta={abierta === "gases"} onToggle={alternar}>
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
