import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO } from "./sstBase";
import {
  CODIGO_PERSONAL, HOJA_PERSONAL, CELDAS_PERSONAL, ESTADOS_PERSONA,
  descubrirPersonal, escribirPersonalEnHoja, validarPersonal, camposFaltantesPersonal, resumenPersonal, personaNueva, personaVacia, personasConDatos, alertasPersona,
  unirPersonas, personasDeInducciones, personasDelRegistro,
} from "./personalDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, useListaRecordada, siguienteConsecutivo, registrarConsecutivo,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, BuscadorLista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { EPS, ARL } from "./sstListas";
import { ChipsOpcion, CampoFecha } from "./sstControles";
import { TraerDeFicha } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_personal";
const CLAVE_HOJA = "ryr_sst_personal_hoja";            // consecutivo de la hoja del registro
const CLAVE_PERSONAL = "ryr_sst_personal";             // resumen de cada hoja (con sus personas): lo usan los Indicadores y la hoja siguiente
const CLAVE_INDUCCIONES = "ryr_sst_inducciones";       // de aquí se trae a quienes ya tuvieron inducción SST
const MAX_PERSONAS = (CELDAS_PERSONAL.tablas && CELDAS_PERSONAL.tablas.personas.n) || 22;
const COLOR_ESTADO = { Activo: "#2E7D4F", Retirado: "#8A8F99" };

function datosIniciales() {
  return { proyecto: "", contratista: "", fechaCorte: "", hoja: "", personas: [personaNueva()], elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "" };
}
function tieneContenido(d) {
  return !!(d.contratista || d.fechaCorte || d.hoja || d.elaboroNombre || d.revisoNombre || d.voboNombre || d.personas.some((p) => !personaVacia(p)));
}

export default function FormularioPersonal({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoPersonas, setAvisoPersonas] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const listaEps = useListaRecordada("ryr_sst_eps", EPS);
  const listaArl = useListaRecordada("ryr_sst_arl", ARL);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));

  // ---- Personas ----
  const setPersonas = (nuevas) => setD((cur) => ({ ...cur, personas: nuevas.length ? nuevas : [personaNueva()] }));
  const actualizar = (i, patch) => setPersonas(d.personas.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const quitar = (i) => { setPersonas(d.personas.filter((_, k) => k !== i)); setAvisoPersonas(""); };
  function agregar() {
    if (d.personas.length >= MAX_PERSONAS) { setAvisoPersonas(`Esta hoja tiene espacio para ${MAX_PERSONAS} personas. Para más, genera otra hoja (el botón "Nueva hoja" trae al personal activo).`); return; }
    setAvisoPersonas(""); setPersonas([...d.personas, personaNueva()]);
  }
  function elegirTrabajador(i, o) {
    const t = trabajadores.buscar(o.texto);
    const p = d.personas[i];
    actualizar(i, { nombre: t ? t.nombre : o.texto, documento: p.documento || (t && t.documento) || "", cargo: p.cargo || (t && t.cargo) || "", empresa: p.empresa || (t && t.empresa) || "" });
  }

  // ---- Traer personas de otros formatos ----
  const hojasAnteriores = leerJSON(CLAVE_PERSONAL, []);
  const desde = { inducciones: () => personasDeInducciones(leerJSON(CLAVE_INDUCCIONES, [])), anteriores: () => personasDelRegistro(hojasAnteriores) };
  const disponibles = (fuente) => unirPersonas(d.personas, desde[fuente]()).agregadas;
  function traer(fuente, nombre) {
    const nuevas = desde[fuente]();
    if (!nuevas.length) { setAvisoPersonas(`No hay nada para traer ${nombre}.`); return; }
    const { lista, agregadas, repetidas } = unirPersonas(d.personas, nuevas);
    if (!agregadas) { setAvisoPersonas(`Todas las personas ${nombre} ya están en esta hoja.`); return; }
    const cabe = lista.slice(0, MAX_PERSONAS), sobran = lista.length - cabe.length;
    setPersonas(cabe);
    setAvisoPersonas(`Se ${agregadas === 1 ? "agregó 1 persona" : `agregaron ${agregadas} personas`} ${nombre}${repetidas ? ` (${repetidas} ya estaban)` : ""}.` + (sobran > 0 ? ` Solo cabían ${MAX_PERSONAS}: ${sobran} ${sobran === 1 ? "queda" : "quedan"} para la hoja siguiente.` : ""));
  }

  const conDatos = personasConDatos(d);
  const activos = conDatos.filter((p) => p.estado !== "Retirado").length;
  const refFecha = d.fechaCorte || fechaHoyISO();
  const conAlertas = conDatos.filter((p) => alertasPersona(p, refFecha).length).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarPersonal(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesPersonal(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-registro-personal.xlsx", HOJA_PERSONAL);
      const avisos = [];
      const lectura = descubrirPersonal(ws);
      const decision = decidirDistribucion(lectura, CELDAS_PERSONAL);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const cap = (celdas.tablas && celdas.tablas.personas && celdas.tablas.personas.n) || MAX_PERSONAS;
      if (conDatos.length > cap) throw new Error(`la plantilla tiene espacio para ${cap} personas y hay ${conDatos.length}`);
      const nUsar = d.hoja && String(d.hoja).trim() ? String(d.hoja).trim() : String(siguienteConsecutivo(CLAVE_HOJA));
      escribirPersonalEnHoja(ws, { ...d, hoja: nUsar }, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Personal_${d.fechaCorte}_Hoja${textoParaArchivo(nUsar, 6)}.xlsx`);

      // Memoria para la próxima vez
      registrarConsecutivo(CLAVE_HOJA, nUsar);
      trabajadores.recordar(conDatos.map((p) => ({ nombre: p.nombre, documento: p.documento, cargo: p.cargo, empresa: p.empresa || d.contratista })));
      conDatos.forEach((p) => { listaEps.recordar(p.eps); listaArl.recordar(p.arl); });
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], cargosObra: conDatos.map((p) => p.cargo), empresasUsadas: [d.contratista, ...conDatos.map((p) => p.empresa)] });
      const res = resumenPersonal({ ...d, hoja: nUsar });
      guardarJSON(CLAVE_PERSONAL, [res, ...leerJSON(CLAVE_PERSONAL, []).filter((x) => x.id !== res.id)].slice(0, 100));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setD((cur) => ({ ...cur, hoja: nUsar }));
      setGenerado(`✓ Excel descargado (hoja ${nUsar}: ${res.total} ${res.total === 1 ? "persona" : "personas"}, ${res.activos} activas). Los Indicadores toman de aquí el promedio de trabajadores.` +
        (conAlertas ? ` ⚠ ${conAlertas} ${conAlertas === 1 ? "persona tiene" : "personas tienen"} requisitos pendientes o por vencer.` : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  // Nueva hoja: conserva la obra y las firmas y trae al personal que sigue ACTIVO según las hojas guardadas
  function nuevaHoja() {
    const activas = personasDelRegistro(leerJSON(CLAVE_PERSONAL, [])).slice(0, MAX_PERSONAS);
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, elaboroNombre: cur.elaboroNombre, elaboroCargo: cur.elaboroCargo, revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo,
      voboNombre: cur.voboNombre, voboCargo: cur.voboCargo, personas: activas.length ? activas : [personaNueva()] }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion("");
    setAvisoPersonas(activas.length ? `Se trajeron ${activas.length} ${activas.length === 1 ? "persona activa" : "personas activas"} de las hojas anteriores. Actualiza lo que cambió.` : "");
    setAbierta("personas"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una hoja en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoPersonas(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un registro de personal" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  const botonesTraer = [["inducciones", "de las Inducciones SST"], ["anteriores", "de hojas anteriores"]];
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="REGISTRO DE PERSONAL" subtitulo={`${CODIGO_PERSONAL} · Quién trabaja en la obra y qué requisitos de SST cumple`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos del registro" subtitulo={d.fechaCorte ? `Corte ${d.fechaCorte}` : "Obra, fecha de corte y hoja"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <CampoFecha label="Fecha de corte" value={d.fechaCorte} onChange={(v) => set("fechaCorte", v)} />
            <Campo label="Hoja N°" value={d.hoja} placeholder={`Automática (${siguienteConsecutivo(CLAVE_HOJA)})`} inputMode="numeric" onChange={(v) => set("hoja", v.replace(/[^0-9A-Za-z-]/g, ""))} />
          </div>
        </Seccion>

        {/* 2. PERSONAS */}
        <Seccion id="personas" titulo="2. Trabajadores" subtitulo={`${conDatos.length} de ${MAX_PERSONAS} personas · ${activos} activas${conAlertas ? ` · ⚠ ${conAlertas} con pendientes` : ""}`} abierta={abierta === "personas"} onToggle={alternar} contador={conDatos.length}>
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Traer personas</div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {botonesTraer.map(([fuente, nombre]) => {
              const n = disponibles(fuente);
              return (
                <button key={fuente} type="button" onClick={() => traer(fuente, nombre)} className="text-center py-2 px-1.5 rounded-lg text-[11.5px] font-semibold border" style={{ borderColor: n ? NAVY : LINE, color: n ? NAVY : "#8A8F99" }}>
                  📥 {nombre.charAt(0).toUpperCase() + nombre.slice(1)}{n ? ` (${n})` : ""}
                </button>
              );
            })}
          </div>
          {avisoPersonas && <div className="text-[11.5px] mb-2.5 p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{avisoPersonas}</div>}
          {d.personas.map((p, i) => {
            const alertas = alertasPersona(p, refFecha);
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-3 relative" style={{ borderColor: alertas.length ? "#E8D4A6" : LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</div>
                  {!personaVacia(p) && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: COLOR_ESTADO[p.estado] || "#8A8F99" }}>{p.estado || "Activo"}</div>}
                </div>
                {alertas.length > 0 && <div className="text-[11px] mb-1.5 p-1.5 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>⚠ {alertas.join(" · ")}</div>}
                <div className="space-y-2">
                  <BuscadorLista label="Nombre completo" value={p.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                    onChange={(v) => actualizar(i, { nombre: v })} onElegir={(o) => elegirTrabajador(i, o)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Documento de identidad" value={p.documento} inputMode="numeric" onChange={(v) => actualizar(i, { documento: v.replace(/[^0-9A-Za-z.-]/g, "") })} />
                    <Campo label="Empresa" value={p.empresa} onChange={(v) => actualizar(i, { empresa: v })} />
                  </div>
                  <BuscadorLista label="Cargo / oficio" value={p.cargo} onChange={(v) => actualizar(i, { cargo: v })} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" />
                  <Campo label="Fecha de ingreso" type="date" value={p.ingreso} onChange={(v) => actualizar(i, { ingreso: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <BuscadorLista label="EPS" value={p.eps} opciones={listaEps.opciones} opcionesAlAbrir={listaEps.opciones} maxResultados={10} placeholder="EPS" onChange={(v) => actualizar(i, { eps: v })} />
                    <BuscadorLista label="ARL" value={p.arl} opciones={listaArl.opciones} opcionesAlAbrir={listaArl.opciones} maxResultados={10} placeholder="ARL" onChange={(v) => actualizar(i, { arl: v })} />
                  </div>
                  <Campo label="Examen médico (vence)" type="date" value={p.examen} onChange={(v) => actualizar(i, { examen: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Inducción SST (fecha)" type="date" value={p.induccion} onChange={(v) => actualizar(i, { induccion: v })} />
                    <Campo label="Alturas (vigencia)" type="date" value={p.alturas} onChange={(v) => actualizar(i, { alturas: v })} />
                  </div>
                  <ChipsOpcion label="Estado" nombre={`Estado ${i + 1}`} value={p.estado} opciones={ESTADOS_PERSONA} colores={COLOR_ESTADO} pequeno onChange={(v) => actualizar(i, { estado: v || "Activo" })} />
                  <Campo label="Fecha de retiro" type="date" value={p.retiro} onChange={(v) => actualizar(i, { retiro: v })} />
                  <Campo label="Observaciones" value={p.obs} onChange={(v) => actualizar(i, { obs: v })} />
                </div>
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar persona ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar persona
          </button>
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Un examen médico o un certificado que vence en los próximos 30 días (o ya venció) se avisa en la tarjeta de la persona. Quien se retira queda "Retirado" con su fecha de retiro.</div>
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
            ➡ Nueva hoja (trae al personal activo y conserva la obra)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del registro" onGenerar={generarExcel} />
    </div>
  );
}
