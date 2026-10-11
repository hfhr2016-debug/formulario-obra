// FormularioNC.jsx — RYR-CA-013 No Conformidades. Pantalla propia: las no conformidades se crean SOLAS (desde recepción, ensayos, vaciado, protocolo…) y también a mano, una o varias.
// Aquí se ven, se filtran, se les hace seguimiento hasta cerrarlas y se sacan a Excel (12 por hoja).
import { useState, useMemo, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { texto, listarNC, crearNC, actualizarNC, ncVencida, hoyISO, descubrirCal, escribirEnHoja } from "./calBase";
import { useObraCal, PanelObraCal } from "./calComunes";
import { NC_FMT, ORIGENES_NC, filaNC } from "./calFormatos3";
import { sumarDias, diasEntre } from "./calFormatos2";
import { NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, AreaTexto, BuscadorLista } from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { SeccionFotosAnexo, agregarHojaFotos } from "./fotosAnexo";

const COLOR_G = { Leve: "#2E7D4F", Mayor: "#B8860B", "Crítica": "#B3401F" };
const COLOR_E = { Abierta: "#B3401F", "En proceso": "#B8860B", Cerrada: "#2E7D4F" };
const TIPOS_ACCION = ["Corrección", "Acción correctiva", "Acción preventiva"];
const METODOS_CAUSA = ["5 porqués", "Espina de pescado (Ishikawa)", "Lluvia de ideas con el equipo", "Otro"];
const RESULTADOS_VERIF = ["Pendiente", "Eficaz", "No eficaz"];
const COLOR_V = { Pendiente: "#B8860B", Eficaz: "#2E7D4F", "No eficaz": "#B3401F" };
const DIAS_VERIFICAR = 30;      // plazo sugerido para comprobar que la acción funcionó
const DIAS_RECURRENCIA = 90;    // se avisa si otra parecida se registró en los últimos 90 días
const sinTildes = (t) => texto(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
const FILTROS = ["Abiertas", "Vencidas", "Cerradas", "Todas", "Descartadas"];
const CLAVE_EXCEL = (obraId) => `ryr_cal_nc_excel_${obraId}`;
const POR_HOJA = 12;

function Etiqueta({ t, color }) { return <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "white", border: `1px solid ${color}`, color }}>{t}</span>; }

export default function FormularioNC({ onVolver }) {
  const h = useObraCal();
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState("Abiertas");
  const [edit, setEdit] = useState(null);                 // no conformidad abierta (copia editable); null = lista
  const [esNueva, setEsNueva] = useState(false);
  const [aviso, setAviso] = useState("");
  const [excel, setExcel] = useState({ responsable: "", periodo: "" });
  const [firmas, setFirmas] = useState({});
  const [fotos, setFotos] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const memoria = useMemoriaSST();
  const sinObra = !h.obra || h.creando;
  const hoy = hoyISO();

  const todas = useMemo(() => (h.id ? listarNC(h.id).filter((n) => !n.eliminada) : []), [h.id, version]);   // eslint-disable-line
  const activas = todas.filter((n) => !n.descartada);
  const lista = useMemo(() => {
    const f = { Abiertas: (n) => !n.descartada && n.estado !== "Cerrada", Vencidas: (n) => ncVencida(n, hoy), Cerradas: (n) => !n.descartada && n.estado === "Cerrada", Todas: (n) => !n.descartada, Descartadas: (n) => !!n.descartada }[filtro];
    return todas.filter(f).sort((a, b) => (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0));
  }, [todas, filtro, hoy]);
  const conteo = { Abiertas: activas.filter((n) => n.estado !== "Cerrada").length, Vencidas: activas.filter((n) => ncVencida(n, hoy)).length, Cerradas: activas.filter((n) => n.estado === "Cerrada").length, Todas: activas.length, Descartadas: todas.length - activas.length };

  useEffect(() => { setEdit(null); }, [h.id]);
  useEffect(() => {          // lo del encabezado del Excel se recuerda por obra
    if (!h.id) return;
    try { const g = JSON.parse(localStorage.getItem(CLAVE_EXCEL(h.id)) || "null"); if (g) { setExcel({ responsable: g.responsable || "", periodo: g.periodo || "" }); setFirmas(g.firmas || {}); } else { setExcel({ responsable: "", periodo: "" }); setFirmas({}); } } catch (e) { /* sin almacenamiento */ }
  }, [h.id]);
  const guardarExcelLocal = (e, f) => { try { localStorage.setItem(CLAVE_EXCEL(h.id), JSON.stringify({ ...e, firmas: f })); } catch (er) { /* sin almacenamiento */ } };

  const vacia = (base = {}) => ({ titulo: "", descripcion: "", origen: "Inspección en obra", ubicacion: "", gravedad: "Mayor", causa: "", accion: "", tipoAccion: "", responsable: "", fechaLimite: "", estado: "Abierta", fechaCierre: "", verificacion: "", fecha: hoy, metodoCausa: "", porques: ["", "", "", "", ""], causaRaiz: "", correccion: "", verifPlan: "", verifResultado: "", verifFecha: "", verifPor: "", reaperturas: 0, ...base });
  function nueva(base) { setEdit(vacia(base)); setEsNueva(true); setAviso(""); window.scrollTo(0, 0); }
  function abrir(n) { setEdit({ ...n }); setEsNueva(false); setAviso(""); window.scrollTo(0, 0); }
  const set = (patch) => setEdit((cur) => ({ ...cur, ...patch }));

  const falta = (n) => { const f = []; if (!texto(n.titulo) && !texto(n.descripcion)) f.push("qué pasó"); return f; };
  // ¿Hay otra parecida en los últimos 90 días? (misma procedencia y misma actividad/ubicación o mismo título)
  const parecidas = (n) => activas.filter((x) => x.id !== n.id && texto(x.origen) === texto(n.origen) && diasEntre(x.fecha, hoy) !== null && diasEntre(x.fecha, hoy) <= DIAS_RECURRENCIA
    && ((texto(n.ubicacion) && sinTildes(x.ubicacion) === sinTildes(n.ubicacion)) || (texto(n.titulo) && sinTildes(x.titulo) === sinTildes(n.titulo))));
  function avisosDe(n) {
    const a = [];
    if (n.estado === "Cerrada" && !texto(n.verificacion) && n.verifResultado !== "Eficaz") a.push("Para cerrarla bien falta comprobar que la acción funcionó (verificación de eficacia) y anotar cómo se comprobó.");
    if (n.estado === "Cerrada" && (n.verifResultado === "Pendiente" || !n.verifResultado) && texto(n.verifPlan)) a.push(`La eficacia está pendiente de verificar; la fecha prevista es ${n.verifPlan}.`);
    if (n.verifResultado === "No eficaz") a.push("La acción NO fue eficaz: el problema sigue. Reabre la no conformidad y define una acción nueva sobre la causa raíz.");
    if (n.estado !== "Cerrada" && ncVencida(n, hoy)) a.push(`Está vencida: la fecha límite era ${n.fechaLimite}.`);
    if (n.estado !== "Cerrada" && !texto(n.responsable)) a.push("Aún no tiene responsable.");
    if (n.estado !== "Cerrada" && !texto(n.accion)) a.push("Aún no tiene acción a ejecutar.");
    if (n.gravedad === "Crítica" && n.estado !== "Cerrada") a.push("Es crítica: conviene avisar de inmediato a la interventoría y a la gerencia.");
    if ((n.gravedad === "Mayor" || n.gravedad === "Crítica") && n.estado !== "Abierta" && !texto(n.causaRaiz)) a.push("Es " + n.gravedad.toLowerCase() + " y no tiene causa raíz: sin atacar la causa, el problema suele repetirse.");
    const par = n.estado === "Cerrada" && n.verifResultado === "Eficaz" ? [] : parecidas(n);
    if (par.length) a.push(`Posible repetición: ya hay ${par.length === 1 ? "la N° " + par[0].numero : "las N° " + par.map((x) => x.numero).join(", ")} parecida${par.length === 1 ? "" : "s"} en los últimos ${DIAS_RECURRENCIA} días. Si es el mismo problema, la acción anterior no resolvió la causa.`);
    return a;
  }
  function reabrir() {
    const previo = [texto(edit.verifResultado) && `Verificación del ${(edit.verifFecha || hoy).split("-").reverse().join("/")}: ${edit.verifResultado}`, texto(edit.verificacion)].filter(Boolean).join(" — ");
    set({ estado: "En proceso", fechaCierre: "", verifResultado: "", verifFecha: "", verifPor: "", verifPlan: "", verificacion: "", reaperturas: (Number(edit.reaperturas) || 0) + 1,
      accion: "", correccion: edit.correccion, historial: [...(Array.isArray(edit.historial) ? edit.historial : []), `${hoy}: reabierta (${previo || "sin detalle"}). Acción anterior: ${texto(edit.accion) || "—"}`] });
    setAviso("Reabierta: define la nueva acción y la fecha límite, y guarda.");
  }
  function guardar(otra) {
    const f = falta(edit); if (f.length) { setAviso("Escribe " + f.join(", ") + " para guardar."); return; }
    let n = { ...edit };
    if (n.estado === "Cerrada" && !texto(n.fechaCierre)) n.fechaCierre = hoy;
    if (n.estado !== "Cerrada") n.fechaCierre = "";
    if (n.estado === "Cerrada") { if (!texto(n.verifPlan)) n.verifPlan = sumarDias(n.fechaCierre, DIAS_VERIFICAR); if (!texto(n.verifResultado)) n.verifResultado = "Pendiente"; if (n.verifResultado === "Eficaz" && !texto(n.verifFecha)) n.verifFecha = hoy; }
    if (texto(n.verifPor)) memoria.recordarUso({ personas: [[n.verifPor, ""]] });
    if (esNueva) { const { id, numero, ...resto } = n; crearNC(h.id, { ...resto, manual: true }); } else actualizarNC(n.id, n);
    if (texto(n.responsable)) memoria.recordarUso({ personas: [[n.responsable, ""]] });
    setVersion((v) => v + 1);
    if (otra) { nueva({ origen: n.origen, ubicacion: n.ubicacion, responsable: n.responsable, fechaLimite: n.fechaLimite }); setAviso("Guardada. Puedes registrar la siguiente."); }
    else { setEdit(null); window.scrollTo(0, 0); }
  }
  function descartar(n) {
    if (!window.confirm("¿Descartar esta no conformidad? Dejará de contar, pero se conserva para que la app no la vuelva a crear sola.")) return;
    actualizarNC(n.id, { descartada: true }); setVersion((v) => v + 1); setEdit(null);
  }
  function restaurar(n) { actualizarNC(n.id, { descartada: false }); setVersion((v) => v + 1); }
  function eliminar(n) {
    if (!window.confirm("¿Eliminar esta no conformidad manual? No se puede deshacer.")) return;
    actualizarNC(n.id, { descartada: true, eliminada: true }); setVersion((v) => v + 1); setEdit(null);
  }

  // ---------- Excel: 12 por hoja ----------
  const paraExcel = activas.filter((n) => !n.eliminada).sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0));
  const hojas = Math.max(1, Math.ceil(paraExcel.length / POR_HOJA));
  async function generarHoja(k) {
    setMensajeError(""); setGenerado("");
    if (!h.obra) return;
    setGenerando(true);
    try {
      const filas = paraExcel.slice(k * POR_HOJA, (k + 1) * POR_HOJA).map(filaNC);
      const datos = { proyecto: h.obra.proyecto, contrato: h.obra.contrato || "", ubicacion: h.obra.ubicacion || "", contratista: h.obra.contratista || "", responsable: excel.responsable, fecha: hoy, periodo: excel.periodo, hoja: String(k + 1), ncs: filas };
      for (const p of NC_FMT.firmas.personas) { datos[`${p.k}Nombre`] = (firmas[p.k] || {}).nombre || ""; datos[`${p.k}Cargo`] = (firmas[p.k] || {}).cargo || ""; }
      const { workbook, ws } = await cargarPlantilla(NC_FMT.plantilla, NC_FMT.hoja);
      const celdas = descubrirCal(ws, NC_FMT);
      escribirEnHoja(ws, NC_FMT, datos, celdas);
      const nFotos = await agregarHojaFotos(workbook, { titulo: "No conformidades", proyecto: h.obra.proyecto, fecha: hoy.split("-").reverse().join("/"), fotos });
      await descargarLibro(workbook, `${NC_FMT.archivo}_${textoParaArchivo(h.obra.proyecto, 24)}_${hoy}_Hoja-${k + 1}.xlsx`);
      guardarExcelLocal(excel, firmas);
      memoria.recordarUso({ personas: NC_FMT.firmas.personas.map((p) => [datos[`${p.k}Nombre`], datos[`${p.k}Cargo`]]) });
      setGenerado(`✓ Excel de la hoja ${k + 1} de ${hojas} descargado${nFotos ? ` (con ${nFotos} ${nFotos === 1 ? "foto" : "fotos"})` : ""}.`);
    } catch (err) { console.error(err); setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido")); }
    finally { setGenerando(false); }
  }

  const tarjeta = (n) => {
    const venc = ncVencida(n, hoy);
    return (
      <div key={n.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 mb-2" style={{ borderColor: venc ? "#B3401F" : LINE, background: PAPER }} data-nc={n.numero}>
        <button type="button" onClick={() => abrir(n)} className="flex-1 text-left" style={{ color: NAVY }}>
          <div className="text-[12.5px] font-semibold">N° {n.numero} · {texto(n.titulo) || texto(n.descripcion).slice(0, 60) || "Sin título"}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>{[texto(n.origen), texto(n.ubicacion), n.fechaLimite ? `Límite ${n.fechaLimite}` : ""].filter(Boolean).join(" · ")}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Etiqueta t={n.estado || "Abierta"} color={COLOR_E[n.estado] || "#B3401F"} />
            {n.gravedad && <Etiqueta t={n.gravedad} color={COLOR_G[n.gravedad] || NAVY} />}
            {n.automatica && <Etiqueta t="Creada sola" color="#6B7280" />}
            {venc && <Etiqueta t="Vencida" color="#B3401F" />}
          </div>
        </button>
        {n.descartada && !n.eliminada && <button type="button" onClick={() => restaurar(n)} className="text-[11px] underline" style={{ color: NAVY }}>Restaurar</button>}
      </div>
    );
  };

  const a = edit ? avisosDe(edit) : [];
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="No Conformidades" subtitulo="RYR-CA-013 · Registro y seguimiento hasta el cierre" onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="obra" titulo="Obra" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Elige o crea la obra"} abierta={sinObra} onToggle={() => {}}>
          <PanelObraCal h={h} campos={["contrato", "ubicacion", "contratista"]} />
        </Seccion>

        {!sinObra && !edit && (
          <div className="pt-3">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[["Abiertas", conteo.Abiertas, "#B3401F"], ["Vencidas", conteo.Vencidas, "#B3401F"], ["Cerradas", conteo.Cerradas, "#2E7D4F"]].map(([t, v, c]) => (
                <div key={t} className="rounded-lg p-2 text-center" style={{ background: PAPER }}><div className="text-[18px] font-bold" style={{ color: c }}>{v}</div><div className="text-[10.5px]" style={{ color: "#6B7280" }}>{t}</div></div>
              ))}
            </div>
            <button type="button" onClick={() => nueva()} className="w-full text-center py-2.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: NAVY }}>➕ Nueva no conformidad</button>
            <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>Las que salen de una recepción, un ensayo, un vaciado o un protocolo se crean solas al guardar ese registro.</div>
            <div className="flex flex-wrap gap-1.5 mt-3 mb-2">
              {FILTROS.map((f) => <button key={f} type="button" data-filtro={f} onClick={() => setFiltro(f)} className="text-[11.5px] px-2.5 py-1 rounded-full border" style={{ borderColor: filtro === f ? NAVY : LINE, background: filtro === f ? NAVY : "white", color: filtro === f ? "white" : NAVY }}>{f} ({conteo[f]})</button>)}
            </div>
            {lista.length === 0 && <div className="text-[12px] py-2" style={{ color: "#8A8F99" }}>No hay no conformidades en este filtro.</div>}
            {lista.map(tarjeta)}

            {activas.length > 0 && (
              <div className="mt-4 border rounded-lg p-3" style={{ borderColor: LINE }} data-excel>
                <div className="text-[12px] font-semibold mb-1" style={{ color: NAVY }}>Excel (RYR-CA-013)</div>
                <div className="text-[11px] mb-2" style={{ color: "#6B7280" }}>Entran las {paraExcel.length} no conformidades vigentes, {POR_HOJA} por hoja.</div>
                <div className="space-y-2">
                  <BuscadorLista label="Responsable del seguimiento" value={excel.responsable} onChange={(v) => setExcel((e) => ({ ...e, responsable: v }))} opciones={memoria.opcionesNombres} opcionesAlAbrir={memoria.nombresAlAbrir} placeholder="Elige un profesional o escribe el nombre" />
                  <Campo label="Periodo" value={excel.periodo} placeholder="Ej. Octubre de 2026" onChange={(v) => setExcel((e) => ({ ...e, periodo: v }))} />
                  <div className="pt-1"><div className="text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Fotos para el Excel (opcional)</div><SeccionFotosAnexo fotos={fotos} setFotos={setFotos} /></div>
                  {NC_FMT.firmas.personas.map((p) => (
                    <div key={p.k}>
                      <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>{p.titulo}</div>
                      <BloqueProfesional memoria={memoria} etqNombre={`Nombre — ${p.titulo}`} etqCargo={`Cargo — ${p.titulo}`} nombre={(firmas[p.k] || {}).nombre} cargo={(firmas[p.k] || {}).cargo}
                        onChange={(patch) => setFirmas((f) => ({ ...f, [p.k]: { ...(f[p.k] || {}), ...patch } }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!sinObra && edit && (
          <div className="pt-2" data-edicion>
            <div className="flex items-center justify-between py-2">
              <button type="button" onClick={() => { setEdit(null); window.scrollTo(0, 0); }} className="text-[12px] underline" style={{ color: NAVY }}>← Volver a la lista (sin guardar)</button>
              <span className="text-[11px] font-semibold" style={{ color: GOLD }}>{esNueva ? "Nueva" : `N° ${edit.numero}`}</span>
            </div>
            {edit.automatica && <div className="text-[11.5px] px-2.5 py-1.5 rounded mb-2" style={{ background: "#F3F4F6", color: "#4B5563" }}>La app la creó sola a partir de «{texto(edit.origen)}». Completa causa, acción y responsable.</div>}
            {a.length > 0 && <div className="space-y-1.5 mb-2" data-avisos>{a.map((t, i) => <div key={i} className="text-[11.5px] px-2.5 py-1.5 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>ℹ️ {t}</div>)}</div>}
            <div className="space-y-2.5">
              <Campo label="Título (qué pasó, en pocas palabras)" value={edit.titulo} onChange={(v) => set({ titulo: v })} />
              <AreaTexto label="Descripción" value={edit.descripcion} filas={3} onChange={(v) => set({ descripcion: v })} />
              <Lista label="Origen" value={edit.origen} opciones={ORIGENES_NC} onChange={(v) => set({ origen: v })} />
              <Campo label="Actividad o ubicación" value={edit.ubicacion} onChange={(v) => set({ ubicacion: v })} />
              <Campo label="Fecha en que se detectó" type="date" value={edit.fecha} onChange={(v) => set({ fecha: v })} />
              <ChipsOpcion label="Gravedad" value={edit.gravedad} opciones={["Leve", "Mayor", "Crítica"]} colores={COLOR_G} pequeno nombre="Gravedad" onChange={(v) => set({ gravedad: v })} />
              <AreaTexto label="Causa inmediata (lo que se ve que falló)" value={edit.causa} filas={2} onChange={(v) => set({ causa: v })} />
              <div className="rounded-lg p-2.5 space-y-2" style={{ background: PAPER, border: `1px solid ${LINE}` }} data-causa-raiz>
                <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>Causa raíz <span className="font-normal" style={{ color: "#6B7280" }}>· por qué pasó de verdad (ISO 9001, 10.2)</span></div>
                <Lista label="Método para encontrarla" value={edit.metodoCausa} opciones={METODOS_CAUSA} onChange={(v) => set({ metodoCausa: v })} />
                {edit.metodoCausa === "5 porqués" && (
                  <div className="space-y-1.5" data-porques>
                    {[0, 1, 2, 3, 4].map((i) => <Campo key={i} label={`¿Por qué? ${i + 1}`} value={(edit.porques || [])[i] || ""} placeholder={i === 0 ? "¿Por qué ocurrió el problema?" : "¿Y por qué pasó eso?"} onChange={(v) => { const p = [...(edit.porques || ["", "", "", "", ""])]; p[i] = v; set({ porques: p }); }} />)}
                    {!texto(edit.causaRaiz) && (edit.porques || []).some((x) => texto(x)) && <button type="button" data-usar-porque onClick={() => set({ causaRaiz: [...edit.porques].reverse().find((x) => texto(x)) })} className="text-[11.5px] underline" style={{ color: NAVY }}>Usar el último porqué como causa raíz</button>}
                  </div>
                )}
                <AreaTexto label="Causa raíz (la que hay que eliminar)" value={edit.causaRaiz} filas={2} onChange={(v) => set({ causaRaiz: v })} />
              </div>
              <AreaTexto label="Corrección inmediata (para contener el problema ya)" value={edit.correccion} filas={2} onChange={(v) => set({ correccion: v })} />
              <AreaTexto label="Acción correctiva (para que no se repita)" value={edit.accion} filas={2} onChange={(v) => set({ accion: v })} />
              <Lista label="Tipo de acción" value={edit.tipoAccion} opciones={TIPOS_ACCION} onChange={(v) => set({ tipoAccion: v })} />
              <BuscadorLista label="Responsable" value={edit.responsable} onChange={(v) => set({ responsable: v })} opciones={memoria.opcionesNombres} opcionesAlAbrir={memoria.nombresAlAbrir} placeholder="Elige un profesional o escribe el nombre" />
              <Campo label="Fecha límite" type="date" value={edit.fechaLimite} onChange={(v) => set({ fechaLimite: v })} />
              <ChipsOpcion label="Estado" value={edit.estado} opciones={["Abierta", "En proceso", "Cerrada"]} colores={COLOR_E} pequeno nombre="Estado" onChange={(v) => set({ estado: v, ...(v === "Cerrada" && !texto(edit.fechaCierre) ? { fechaCierre: hoy } : {}) })} />
              {edit.estado === "Cerrada" && <Campo label="Fecha de cierre" type="date" value={edit.fechaCierre} onChange={(v) => set({ fechaCierre: v })} />}
              {(edit.estado === "Cerrada" || texto(edit.verifResultado)) && (
                <div className="rounded-lg p-2.5 space-y-2" style={{ background: PAPER, border: `1px solid ${LINE}` }} data-eficacia>
                  <div className="text-[11.5px] font-semibold" style={{ color: NAVY }}>Verificación de eficacia <span className="font-normal" style={{ color: "#6B7280" }}>· ¿la acción sí funcionó?</span></div>
                  <Campo label="Verificar a más tardar el" type="date" value={edit.verifPlan} onChange={(v) => set({ verifPlan: v })} />
                  <ChipsOpcion label="Resultado de la verificación" value={edit.verifResultado || "Pendiente"} opciones={RESULTADOS_VERIF} colores={COLOR_V} pequeno nombre="Resultado de la verificación" onChange={(v) => set({ verifResultado: v, ...(v !== "Pendiente" && !texto(edit.verifFecha) ? { verifFecha: hoy } : {}) })} />
                  {edit.verifResultado && edit.verifResultado !== "Pendiente" && <Campo label="Fecha de la verificación" type="date" value={edit.verifFecha} onChange={(v) => set({ verifFecha: v })} />}
                  {edit.verifResultado && edit.verifResultado !== "Pendiente" && <BuscadorLista label="Quién verificó" value={edit.verifPor} onChange={(v) => set({ verifPor: v })} opciones={memoria.opcionesNombres} opcionesAlAbrir={memoria.nombresAlAbrir} placeholder="Elige un profesional o escribe el nombre" />}
                  <AreaTexto label="Evidencia: cómo se comprobó" value={edit.verificacion} filas={2} onChange={(v) => set({ verificacion: v })} />
                  {edit.verifResultado === "No eficaz" && <button type="button" data-reabrir onClick={reabrir} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: "#B3401F", color: "#B3401F" }}>↩ Reabrir y definir una acción nueva</button>}
                </div>
              )}
              {(Array.isArray(edit.historial) && edit.historial.length > 0) && <div className="text-[11px] rounded px-2 py-1.5" style={{ background: "#F3F4F6", color: "#4B5563" }} data-historial><b>Reaperturas ({edit.historial.length})</b>{edit.historial.map((t, i) => <div key={i}>• {t}</div>)}</div>}
            </div>
            {aviso && <div className="text-[11.5px] mt-2 px-2 py-1.5 rounded" style={{ background: "#FFF4DB", color: "#8A5A00" }}>{aviso}</div>}
            <div className="pt-4 space-y-2">
              <button type="button" onClick={() => guardar(false)} className="w-full text-center py-2.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: NAVY }}>💾 Guardar</button>
              {esNueva && <button type="button" onClick={() => guardar(true)} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>Guardar y registrar otra</button>}
              {!esNueva && (edit.automatica ? <button type="button" onClick={() => descartar(edit)} className="w-full text-center py-2 rounded-lg text-[12px] border flex items-center justify-center gap-1.5" style={{ borderColor: "#B3401F", color: "#B3401F" }}><Trash2 size={13} /> Descartar (no era una no conformidad)</button>
                : <button type="button" onClick={() => eliminar(edit)} className="w-full text-center py-2 rounded-lg text-[12px] border flex items-center justify-center gap-1.5" style={{ borderColor: "#B3401F", color: "#B3401F" }}><Trash2 size={13} /> Eliminar</button>)}
            </div>
          </div>
        )}
      </div>
      {!sinObra && !edit && activas.length > 0 && (
        <div data-barra-generar className="fixed bottom-0 left-0 right-0 border-t px-3 pt-2 pb-3" style={{ background: "white", borderColor: LINE }}>
          <div className="max-w-md mx-auto">
            {mensajeError && <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#FDECEC", color: "#B42318" }}>{mensajeError}</div>}
            {generado && !mensajeError && <div className="text-[11.5px] mb-2 px-2 py-1.5 rounded" style={{ background: "#E8F5EC", color: "#1D6B3A" }}>{generado}</div>}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: hojas }, (_, k) => (
                <button key={k} type="button" disabled={generando} data-hoja={k + 1} onClick={() => generarHoja(k)} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px]" style={{ background: generando ? "#8A8F99" : GOLD, minWidth: 120 }}>
                  {generando ? "Generando..." : hojas === 1 ? "Generar Excel de no conformidades" : `Excel hoja ${k + 1} (N° ${paraExcel[k * POR_HOJA].numero}–${paraExcel[Math.min(paraExcel.length, (k + 1) * POR_HOJA) - 1].numero})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
