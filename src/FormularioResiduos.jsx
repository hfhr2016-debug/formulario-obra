import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_RESIDUOS, HOJA_RESIDUOS, CELDAS_RESIDUOS, TIPOS_RESIDUO, UNIDADES_RES, DESTINOS_RES, ALMACENAMIENTOS, DESCRIPCIONES,
  descubrirResiduos, escribirResiduosEnHoja, validarResiduos, camposFaltantesResiduos, resumenResiduos, registroNuevo, registrosConDatos, totalesPorTipo, siguienteHojaRes, numeroPositivo,
} from "./residuosDatos";
import {
  NAVY, GOLD, PAPER, LINE, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { ChipsOpcion } from "./sstControles";
import { CLAVE_AMB_RESIDUOS, CLAVE_AMB_MANIFIESTOS, TraerDeFichaAmb, gestoresDeFicha } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_residuos";
const MAX_REG = (CELDAS_RESIDUOS.tablas && CELDAS_RESIDUOS.tablas.registros.n) || 25;
const COLOR_DESTINO = { "Disposición final": "#B3401F", Aprovechamiento: "#2E7D4F", "Reutilización en obra": "#2E7D4F", "Almacenado en obra": "#8A8F99" };

function datosIniciales() {
  return { proyecto: "", contratista: "", periodo: "", hoja: "", desde: "", hasta: "", registros: [], elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "" };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.periodo || d.hoja || d.desde || d.hasta || d.registros.length || d.elaboroNombre);
const textoTotales = (t) => Object.entries(t).map(([tipo, u]) => `${tipo}: ${Object.entries(u).map(([un, n]) => `${String(n).replace(".", ",")} ${un}`).join(" + ")}`);

export default function FormularioResiduos({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoRegistros, setAvisoRegistros] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));

  const gestores = useMemo(() => gestoresDeFicha(d.proyecto).map((g) => ({ texto: g.empresa, detalle: g.tipo ? String(g.tipo).split(" (")[0] : "" })), [d.proyecto]);
  const gestoresOpc = gestores.length ? gestores : [];

  const registros = d.registros;
  // Responsable de cada registro: los nombres guardados (profesionales y Gestión Técnica) y los que ya se escribieron en esta hoja
  const opcionesResponsable = (() => {
    const base = memoria.opcionesNombres, vistos = new Set(base.map((o) => String(o.texto).toLowerCase()));
    const propios = [d.elaboroNombre, d.revisoNombre, d.voboNombre, ...registros.map((x) => x.responsable)].map((t) => String(t || "").trim()).filter((t) => t.length >= 3 && !vistos.has(t.toLowerCase()) && vistos.add(t.toLowerCase()));
    return [...propios.map((t) => ({ texto: t, detalle: "" })), ...base];
  })();
  const setRegistros = (nuevos) => setD((cur) => ({ ...cur, registros: nuevos }));
  const actualizar = (i, patch) => setRegistros(registros.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const quitar = (i) => { setRegistros(registros.filter((_, k) => k !== i)); setAvisoRegistros(""); };
  const sinEspacio = () => setAvisoRegistros(`Esta hoja tiene espacio para ${MAX_REG} registros. Genera esta hoja y usa «Siguiente hoja» para continuar.`);
  const ultimo = registros[registros.length - 1];
  function agregar(base = {}) {
    if (registros.length >= MAX_REG) return sinEspacio();
    setAvisoRegistros("");
    setRegistros([...registros, registroNuevo({ fecha: (ultimo && ultimo.fecha) || fechaHoyISO(), responsable: (ultimo && ultimo.responsable) || "", ...base })]);
  }
  function repetirUltimo() {
    if (!ultimo) return agregar();
    agregar({ tipo: ultimo.tipo, descripcion: ultimo.descripcion, actividad: ultimo.actividad, unidad: ultimo.unidad, almacenamiento: ultimo.almacenamiento, destino: ultimo.destino, gestor: ultimo.gestor });
  }

  // Entregas registradas en los manifiestos de RCD (las que aún no están en esta hoja y caen dentro del periodo)
  const manifiestos = leerJSON(CLAVE_AMB_MANIFIESTOS, []);
  const pendientes = manifiestos.filter((m) => {
    if (d.proyecto && String(m.proyecto || "").trim().toLowerCase() !== d.proyecto.trim().toLowerCase()) return false;
    if (registros.some((r) => r.origen === `man:${m.id}`)) return false;
    if (d.desde && m.fecha && m.fecha < d.desde) return false;
    if (d.hasta && m.fecha && m.fecha > d.hasta) return false;
    return true;
  });
  function traerManifiestos() {
    const lugar = MAX_REG - registros.length;
    if (lugar <= 0) return sinEspacio();
    const toma = pendientes.slice(0, lugar);
    setRegistros([...registros, ...toma.map((m) => registroNuevo({
      fecha: m.fecha || "", tipo: "RCD (escombros)", descripcion: m.descripcion || "Escombros según manifiesto", actividad: "", cantidad: String(m.cantidad || ""), unidad: m.unidad || "m³",
      almacenamiento: "", destino: "Disposición final", gestor: m.sitio || m.transportador || "", manifiesto: m.certificado || m.numero || "", origen: `man:${m.id}`,
    }))]);
    setAvisoRegistros(toma.length < pendientes.length ? `Se trajeron ${toma.length}; los demás no caben en esta hoja.` : `Se trajeron ${toma.length} ${toma.length === 1 ? "entrega" : "entregas"} de los manifiestos.`);
  }

  const conDatos = registrosConDatos(d);
  const totales = totalesPorTipo(d);

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarResiduos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesResiduos(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-residuos.xlsx", HOJA_RESIDUOS);
      const avisos = [];
      const decision = decidirDistribucion(descubrirResiduos(ws), CELDAS_RESIDUOS);
      if (decision.aviso) avisos.push(decision.aviso);
      const capacidad = (decision.celdas.tablas && decision.celdas.tablas.registros.n) || MAX_REG;
      if (conDatos.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} registros y hay ${conDatos.length}`);
      escribirResiduosEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Registro_Residuos_${textoParaArchivo(d.proyecto, 24)}_${d.desde || "sin-fecha"}${d.hoja ? "_Hoja-" + textoParaArchivo(d.hoja, 12) : ""}.xlsx`);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenResiduos(d);
      guardarJSON(CLAVE_AMB_RESIDUOS, [res, ...leerJSON(CLAVE_AMB_RESIDUOS, []).filter((x) => x.id !== res.id)].slice(0, 300));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${conDatos.length} ${conDatos.length === 1 ? "registro" : "registros"}). El resumen por tipo de residuo ya viene calculado en la hoja.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function siguienteHoja() {
    setD((cur) => ({ ...cur, registros: [], hoja: siguienteHojaRes(cur.hoja) }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoRegistros(""); setAbierta("registros"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un registro en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoRegistros(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un registro de residuos" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="REGISTRO DE RESIDUOS" subtitulo={`${CODIGO_RESIDUOS} · Generación, almacenamiento y destino`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.proyecto ? `${d.proyecto}${d.desde ? " · " + d.desde : ""}` : "Obra y periodo"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Mes del periodo" type="month" value={d.periodo} onChange={(v) => set("periodo", v)} />
              <Campo label="Hoja N°" value={d.hoja} placeholder="Ej. 1 de 2" onChange={(v) => set("hoja", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Desde" type="date" value={d.desde} onChange={(v) => set("desde", v)} />
              <Campo label="Hasta" type="date" value={d.hasta} onChange={(v) => set("hasta", v)} />
            </div>
          </div>
        </Seccion>

        <Seccion id="registros" titulo="2. Registro de generación y destino" subtitulo={`${conDatos.length} de ${MAX_REG} registros`} abierta={abierta === "registros"} onToggle={alternar} contador={conDatos.length}>
          {pendientes.length > 0 && (
            <button type="button" onClick={traerManifiestos} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
              🚚 Traer {pendientes.length} {pendientes.length === 1 ? "entrega" : "entregas"} de los manifiestos de RCD
            </button>
          )}
          {registros.map((r, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}{r.origen ? " · del manifiesto" : ""}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Fecha del registro" type="date" value={r.fecha} onChange={(v) => actualizar(i, { fecha: v })} />
                  <Lista label="Tipo de residuo" value={r.tipo} onChange={(v) => actualizar(i, { tipo: v })} opciones={TIPOS_RESIDUO} />
                </div>
                <BuscadorLista label="Descripción del residuo" value={r.descripcion} onChange={(v) => actualizar(i, { descripcion: v })} opciones={(DESCRIPCIONES[r.tipo] || []).map((t) => ({ texto: t, detalle: "" }))} opcionesAlAbrir={(DESCRIPCIONES[r.tipo] || []).map((t) => ({ texto: t, detalle: "" }))} placeholder="Elige una o escribe otra" />
                <Campo label="Actividad u origen" value={r.actividad} placeholder="Ej. Demolición de muros, losa piso 2" onChange={(v) => actualizar(i, { actividad: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad" value={r.cantidad} inputMode="decimal" onChange={(v) => actualizar(i, { cantidad: v.replace(/[^0-9.,]/g, "") })} />
                  <ChipsOpcion label="Unidad" value={r.unidad} opciones={UNIDADES_RES} pequeno onChange={(v) => actualizar(i, { unidad: v })} />
                </div>
                <BuscadorLista label="Almacenamiento" value={r.almacenamiento} onChange={(v) => actualizar(i, { almacenamiento: v })} opciones={ALMACENAMIENTOS.map((t) => ({ texto: t, detalle: "" }))} opcionesAlAbrir={ALMACENAMIENTOS.map((t) => ({ texto: t, detalle: "" }))} placeholder="Dónde se guarda en la obra" />
                <ChipsOpcion label="Destino" value={r.destino} opciones={DESTINOS_RES} colores={COLOR_DESTINO} pequeno onChange={(v) => actualizar(i, { destino: v })} />
                <BuscadorLista label="Gestor o receptor" value={r.gestor} onChange={(v) => actualizar(i, { gestor: v })} opciones={gestoresOpc} opcionesAlAbrir={gestoresOpc} placeholder={gestores.length ? "Elige un gestor de la ficha o escribe otro" : "Empresa que lo recibe"} />
                <Campo label="N° de manifiesto o certificado" value={r.manifiesto} onChange={(v) => actualizar(i, { manifiesto: v })} />
                <BuscadorLista label="Responsable" value={r.responsable} onChange={(v) => actualizar(i, { responsable: v })} onElegir={(o) => actualizar(i, { responsable: o.texto })} onBlurValor={(v) => memoria.recordar(v, "")} opciones={opcionesResponsable} opcionesAlAbrir={opcionesResponsable.slice(0, 8)} placeholder="Elige un nombre guardado o escribe uno nuevo" />
              </div>
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar registro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="space-y-2">
            {registros.length > 0 && (
              <button type="button" onClick={repetirUltimo} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>➕ Otro registro con los mismos datos del anterior</button>
            )}
            <button type="button" onClick={() => agregar()} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
              <Plus size={14} /> Agregar registro
            </button>
          </div>
          {avisoRegistros && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoRegistros}</div>}
        </Seccion>

        <Seccion id="resumen" titulo="3. Resumen del periodo" subtitulo={Object.keys(totales).length ? `${Object.keys(totales).length} tipos de residuo` : "Se calcula con los registros"} abierta={abierta === "resumen"} onToggle={alternar}>
          {Object.keys(totales).length === 0 ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Aún no hay cantidades registradas.</div> : (
            <ul className="text-[12.5px] space-y-1" style={{ color: NAVY }}>{textoTotales(totales).map((x) => <li key={x}>• {x}</li>)}</ul>
          )}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Así queda también en la hoja de Excel: la suma por tipo y por unidad se calcula sola.</div>
        </Seccion>

        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Registra el responsable ambiental; revisa el residente; visto bueno de interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Registró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien registra" etqCargo="Cargo de quien registra" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. (interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={siguienteHoja} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Siguiente hoja (conserva los datos generales)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del registro" onGenerar={generarExcel} />
    </div>
  );
}
