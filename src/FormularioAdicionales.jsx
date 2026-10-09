import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { decidirDistribucion } from "./sstBase";
import {
  CODIGO_ADICIONALES, HOJA_ADICIONALES, CELDAS_ADICIONALES, CAPACIDAD_ADICIONALES, descubrirAdicionales, escribirAdicionalesEnHoja, validarAdicionales, camposFaltantesAdicionales, adicionalesConDatos,
} from "./adicionalesDatos";
import {
  TIPOS_ADICIONAL, ESTADOS_ADICIONAL, adicionalNuevo, listarAdicionales, guardarAdicionalesDeObra, valorDirectoAdicional, valorConAIU, totalesAdicionales, pesos, num, porcentaje,
  nombreTipoProyecto, capitulosDePresupuesto, capituloNuevo,
} from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import {
  NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, AreaTexto,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";

const UNIDADES = ["m", "m²", "m³", "ml", "kg", "un", "gl", "global", "día", "hora", "viaje", "mes"];
const COLOR_ESTADO = { Aprobado: "#2E7D4F", Pendiente: "#B8860B", Rechazado: "#B3401F" };

export default function FormularioAdicionales({ onVolver }) {
  const h = useObra();
  const [libro, setLibro] = useState(() => ({ id: h.id, lista: h.id ? listarAdicionales(h.id) : [] }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoItems, setAvisoItems] = useState("");
  const [avisoCaps, setAvisoCaps] = useState("");
  const firmas = useFirmas("adicionales", ["registro", "aprueba"]);
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  useEffect(() => { if (libro.id !== h.id) setLibro({ id: h.id, lista: h.id ? listarAdicionales(h.id) : [] }); }, [h.id]);   // eslint-disable-line
  useEffect(() => { if (libro.id && libro.id === h.id) guardarAdicionalesDeObra(libro.id, libro.lista); }, [libro]);          // eslint-disable-line

  const items = libro.lista;
  const setLista = (f) => setLibro((cur) => ({ ...cur, lista: f(cur.lista) }));
  const actualizar = (id, patch) => setLista((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const quitar = (id) => { if (window.confirm("¿Quitar este ítem?")) { setLista((l) => l.filter((a) => a.id !== id)); setAvisoItems(""); } };
  const capitulos = (h.obra && h.obra.capitulos) || [];
  const nombresCap = capitulos.map((c) => c.nombre).filter(Boolean);
  function agregar() {
    if (adicionalesConDatos(items).length >= CAPACIDAD_ADICIONALES) { setAvisoItems(`Esta hoja tiene espacio para ${CAPACIDAD_ADICIONALES} ítems. Para más, genera otra hoja con el resto (quita de aquí los que ya presentaste).`); return; }
    setAvisoItems("");
    setLista((l) => [...l, adicionalNuevo({ obraId: h.id, fecha: new Date().toISOString().slice(0, 10), aiu: (h.obra && h.obra.aiu) || "", estado: "Pendiente" })]);
  }
  function traerCapitulos() {
    const r = capitulosDePresupuesto();
    if (!r.capitulos.length) { setAvisoCaps("No encontré capítulos en el Presupuesto. Genera primero el Presupuesto de Gestión Técnica, o crea los capítulos en «Control Presupuestal»."); return; }
    h.cambiar({ capitulos: r.capitulos.map((c) => capituloNuevo({ nombre: c.nombre, contratado: String(c.contratado), ejecutado: String(c.ejecutado) })) });
    setAvisoCaps(`Se trajeron ${r.capitulos.length} capítulos del Presupuesto.`);
  }
  const t = totalesAdicionales(adicionalesConDatos(items));
  const original = h.obra ? num(h.obra.valorContrato) : null;
  const conAdic = original === null ? null : original + t.aprobado;
  const datosHoja = () => ({ proyecto: h.obra.proyecto, tipo: nombreTipoProyecto(), contrato: h.obra.contrato, contratante: h.obra.contratante, fechaContrato: h.obra.fechaContrato, plazo: h.obra.plazo,
    valorOriginal: h.obra.valorContrato, items, registroNombre: firmas.f.registro.nombre, registroCargo: firmas.f.registro.cargo, apruebaNombre: firmas.f.aprueba.nombre, apruebaCargo: firmas.f.aprueba.cargo });

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = h.obra ? datosHoja() : { proyecto: "", items: [] };
    const faltan = validarAdicionales(dat);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesAdicionales(dat)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-adicionales.xlsx", HOJA_ADICIONALES);
      const avs = [];
      const decision = decidirDistribucion(descubrirAdicionales(ws), CELDAS_ADICIONALES);
      if (decision.aviso) avs.push(decision.aviso);
      const n = adicionalesConDatos(items).length;
      const capac = (decision.celdas.tablas && decision.celdas.tablas.items && decision.celdas.tablas.items.n) || CAPACIDAD_ADICIONALES;
      if (n > capac) throw new Error(`la plantilla tiene espacio para ${capac} ítems y hay ${n}`);
      escribirAdicionalesEnHoja(ws, dat, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Adicionales_${textoParaArchivo(h.obra.proyecto, 24)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.registro.nombre, firmas.f.registro.cargo], [firmas.f.aprueba.nombre, firmas.f.aprueba.cargo]] });
      setGenerado(`✓ Excel descargado (${n} ${n === 1 ? "ítem" : "ítems"}, ${pesos(t.aprobado) || "$ 0"} aprobados).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  const sinObra = !h.obra || h.creando;
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Adicionales y Obra no Prevista" subtitulo={`${CODIGO_ADICIONALES} · Ítems fuera del contrato original`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Obra y contrato"} abierta={abierta === "datos"} onToggle={alternar}>
          <PanelObra h={h} campos={["contrato", "contratante", "fechaContrato", "plazo", "valorContrato", "aiu"]} />
        </Seccion>

        <Seccion id="items" titulo="2. Ítems adicionales" subtitulo={`${adicionalesConDatos(items).length} de ${CAPACIDAD_ADICIONALES} ítems · ${pesos(t.conAIU) || "$ 0"}`} abierta={abierta === "items"} onToggle={alternar} contador={adicionalesConDatos(items).length}>
          {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
            <>
              {!nombresCap.length && (
                <div className="text-[11.5px] p-2 rounded mb-3" style={{ background: "#FFF8E8", color: "#7A5A00" }}>
                  Esta obra aún no tiene capítulos del presupuesto.
                  <button type="button" onClick={traerCapitulos} className="block mt-1.5 font-semibold underline" style={{ color: NAVY }}>Traer los capítulos del Presupuesto</button>
                </div>
              )}
              {avisoCaps && <div className="text-[11px] mb-2" style={{ color: "#2E7D4F" }}>{avisoCaps}</div>}
              {items.map((a, i) => {
                const vd = valorDirectoAdicional(a), vt = valorConAIU(a);
                return (
                  <div key={a.id} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                    <div className="space-y-2">
                      <Campo label="Fecha" type="date" value={a.fecha} onChange={(v) => actualizar(a.id, { fecha: v })} />
                      <AreaTexto label="Descripción del ítem" value={a.descripcion} filas={2} placeholder="Ej. Demolición de muro no previsto en el diseño" onChange={(v) => actualizar(a.id, { descripcion: v })} />
                      <Lista label="Tipo" value={a.tipo} onChange={(v) => actualizar(a.id, { tipo: v })} opciones={TIPOS_ADICIONAL} />
                      <Lista label="Capítulo afectado" value={a.capitulo} onChange={(v) => actualizar(a.id, { capitulo: v })} opciones={nombresCap.includes(a.capitulo) || !a.capitulo ? nombresCap : [...nombresCap, a.capitulo]} />
                      <div className="grid grid-cols-2 gap-2">
                        <Lista label="Unidad" value={a.unidad} onChange={(v) => actualizar(a.id, { unidad: v })} opciones={UNIDADES} />
                        <Campo label="Cantidad" value={a.cantidad} inputMode="decimal" onChange={(v) => actualizar(a.id, { cantidad: v.replace(/[^0-9.,]/g, "") })} />
                      </div>
                      <CampoDinero label="Valor unitario" value={a.valorUnitario} permitirNegativo={false} onChange={(v) => actualizar(a.id, { valorUnitario: v })} />
                      <Campo label="AIU (%)" value={a.aiu} inputMode="decimal" placeholder="Ej. 25" onChange={(v) => actualizar(a.id, { aiu: v.replace(/[^0-9.,]/g, "") })} />
                      {vd !== null && (
                        <div className="text-[12px] px-3 py-1.5 rounded-md" style={{ background: vd < 0 ? "#FDEDEA" : "#EAF4EC", color: vd < 0 ? "#B3401F" : "#1D6B3A" }}>
                          Valor directo: <b>{pesos(vd)}</b> · con AIU: <b>{pesos(vt)}</b>{a.tipo === "Menor cantidad (deductivo)" ? " (resta del contrato)" : ""}
                        </div>
                      )}
                      <AreaTexto label="Justificación" value={a.justificacion} filas={2} placeholder="Por qué se necesita (cambio de diseño, imprevisto, solicitud del cliente…)" onChange={(v) => actualizar(a.id, { justificacion: v })} />
                      <Campo label="Solicitado por" value={a.solicita} onChange={(v) => actualizar(a.id, { solicita: v })} />
                      <ChipsOpcion label="Estado" nombre={`Estado ${i + 1}`} value={a.estado} opciones={ESTADOS_ADICIONAL} colores={COLOR_ESTADO} pequeno onChange={(v) => actualizar(a.id, { estado: v })} />
                      {(a.estado === "Aprobado" || a.estado === "Rechazado") && (
                        <>
                          <Campo label="Aprobado por" value={a.aprueba} placeholder="Persona que decidió" onChange={(v) => actualizar(a.id, { aprueba: v })} />
                          <Campo label="Fecha de aprobación" type="date" value={a.fechaAprobacion} onChange={(v) => actualizar(a.id, { fechaAprobacion: v })} />
                        </>
                      )}
                      {a.estado === "Aprobado" && !a.aprueba && <div className="text-[10.5px]" style={{ color: "#B3401F" }}>Todo adicional debe tener aprobación escrita antes de ejecutarse.</div>}
                    </div>
                    <button type="button" onClick={() => quitar(a.id)} aria-label={`Quitar ítem ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
                  </div>
                );
              })}
              <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar ítem</button>
              {avisoItems && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoItems}</div>}
              <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Cada ítem se guarda solo. Los aprobados se suman al presupuesto del capítulo en el Control Presupuestal.</div>
            </>
          )}
        </Seccion>

        <Seccion id="efecto" titulo="3. Efecto en el contrato" subtitulo={`Aprobado ${pesos(t.aprobado) || "$ 0"} · pendiente ${pesos(t.pendiente) || "$ 0"}`} abierta={abierta === "efecto"} onToggle={alternar}>
          <CifrasResumen cifras={[
            { t: "Aprobado (con AIU)", v: pesos(t.aprobado) || "$ 0", color: "#1D6B3A" }, { t: "Pendiente (con AIU)", v: pesos(t.pendiente) || "$ 0", color: "#B8860B" },
            { t: "Rechazado (con AIU)", v: pesos(t.rechazado) || "$ 0", color: "#B3401F" }, { t: "Contrato original", v: pesos(original) },
            { t: "Contrato con adicionales", v: pesos(conAdic) }, { t: "Adicionales / contrato", v: original ? porcentaje(t.aprobado / original) : "" },
          ]} />
          {original === null && <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Escribe el «Valor del contrato» en la sección 1 para ver el efecto sobre el contrato.</div>}
        </Seccion>

        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Registra el director de obra; aprueba gerencia o el contratante" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Registró — Director de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien registra" etqCargo="Cargo de quien registra" nombre={firmas.f.registro.nombre} cargo={firmas.f.registro.cargo} onChange={firmas.cambiar("registro")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Aprobó — Gerencia / contratante</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien aprueba" etqCargo="Cargo de quien aprueba" nombre={firmas.f.aprueba.nombre} cargo={firmas.f.aprueba.cargo} onChange={firmas.cambiar("aprueba")} />
          </div>
        </Seccion>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de adicionales" onGenerar={generarExcel} />
    </div>
  );
}
