import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_CONTROL, HOJA_CONTROL, CELDAS_CONTROL, descubrirControl, escribirControlEnHoja, validarControl, camposFaltantesControl, capitulosConNombre,
} from "./controlPresupuestalDatos";
import {
  MAX_CAPITULOS, capituloNuevo, capitulosDePresupuesto, controlDeObra, listarFacturas, listarAdicionales, facturasSinCapitulo, pesos, porcentaje, num, texto, nombreTipoProyecto, COLORES_ESTADO,
} from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import {
  NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";

const color = (estado) => ({ ALERTA: { b: "#FFC7CE", t: "#9C0006" }, VIGILAR: { b: "#FFEB9C", t: "#9C5700" }, OK: { b: "#C6EFCE", t: "#006100" } }[estado] || { b: "#EEF1F6", t: "#8A8F99" });

export default function FormularioControlPresupuestal({ onVolver }) {
  const h = useObra();
  const [d, setD] = useState(() => ({ acta: "", corte: fechaHoyISO() }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCaps, setAvisoCaps] = useState("");
  const firmas = useFirmas("control", ["elabora", "revisa"]);
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  const o = h.obra;
  const caps = (o && o.capitulos) || [];
  // Las facturas y los adicionales se leen cada vez que cambia algo en pantalla (siempre están al día con los otros formatos)
  const facturas = h.id ? listarFacturas(h.id) : [];
  const adicionales = h.id ? listarAdicionales(h.id) : [];
  const calc = useMemo(() => controlDeObra(o, facturas, adicionales, d.corte), [o, d.corte, h.id, abierta]);   // eslint-disable-line
  const huerfanas = o ? facturasSinCapitulo(o, facturas) : [];
  const setCaps = (nuevos) => h.cambiar({ capitulos: nuevos });
  const actualizar = (id, patch) => setCaps(caps.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const quitar = (id) => { if (window.confirm("¿Quitar este capítulo?")) { setCaps(caps.filter((c) => c.id !== id)); setAvisoCaps(""); } };
  function agregar() {
    if (caps.length >= MAX_CAPITULOS) { setAvisoCaps(`Esta hoja tiene espacio para ${MAX_CAPITULOS} capítulos. Agrupa los capítulos menores.`); return; }
    setAvisoCaps(""); setCaps([...caps, capituloNuevo()]);
  }
  function sincronizar() {
    const r = capitulosDePresupuesto();
    if (!r.capitulos.length) { setAvisoCaps("No encontré capítulos en el Presupuesto. Genera primero el Presupuesto de Gestión Técnica (Presupuesto), o escribe los capítulos a mano."); return; }
    let nuevos = 0, actualizados = 0;
    const lista = [...caps];
    r.capitulos.forEach((p) => {
      const i = lista.findIndex((c) => texto(c.nombre).toLowerCase() === p.nombre.toLowerCase());
      if (i >= 0) { lista[i] = { ...lista[i], contratado: String(p.contratado), ejecutado: String(p.ejecutado) }; actualizados++; }
      else if (lista.length < MAX_CAPITULOS) { lista.push(capituloNuevo({ nombre: p.nombre, contratado: String(p.contratado), ejecutado: String(p.ejecutado) })); nuevos++; }
    });
    setCaps(lista);
    setAvisoCaps(`Del Presupuesto y las Actas: ${nuevos} capítulos nuevos y ${actualizados} actualizados.${r.hayActas ? "" : " Aún no hay actas de obra: el ejecutado quedó en $ 0."}${r.sinCapitulo ? ` ${r.sinCapitulo} actividades del Presupuesto no tienen capítulo y no se incluyeron.` : ""}`);
  }
  const datosHoja = () => ({ proyecto: o.proyecto, tipo: nombreTipoProyecto(), contrato: o.contrato, contratante: o.contratante, acta: d.acta, corte: d.corte, aiu: o.aiu, obra: o, facturas, adicionales,
    elaboraNombre: firmas.f.elabora.nombre, elaboraCargo: firmas.f.elabora.cargo, revisaNombre: firmas.f.revisa.nombre, revisaCargo: firmas.f.revisa.cargo });

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = o ? datosHoja() : { proyecto: "", obra: null };
    const faltan = validarControl(dat);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesControl(dat)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-control-presupuestal.xlsx", HOJA_CONTROL);
      const avs = [];
      const decision = decidirDistribucion(descubrirControl(ws), CELDAS_CONTROL);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.capitulos && decision.celdas.tablas.capitulos.n) || MAX_CAPITULOS;
      if (capitulosConNombre(o).length > capac) throw new Error(`la plantilla tiene espacio para ${capac} capítulos y hay ${capitulosConNombre(o).length}`);
      escribirControlEnHoja(ws, dat, decision.celdas);
      if (huerfanas.length) avs.push(`${huerfanas.length} ${huerfanas.length === 1 ? "factura no suma" : "facturas no suman"} a ningún capítulo (su capítulo no coincide con los de esta hoja).`);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Control_Presupuestal_${textoParaArchivo(o.proyecto, 24)}_${d.corte}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.elabora.nombre, firmas.f.elabora.cargo], [firmas.f.revisa.nombre, firmas.f.revisa.cargo]] });
      setGenerado(`✓ Excel descargado (${calc.filas.length} capítulos, estado general ${calc.tot.estado || "sin calcular"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  const sinObra = !o || h.creando;
  const t = calc.tot;
  const aiu = o ? num(o.aiu) : null;
  const vigente = t.E;
  const conAIU = aiu === null ? null : vigente * (1 + aiu / 100);
  const porNombre = new Map(calc.filas.map((f) => [f.nombre.toLowerCase(), f]));
  const ce = color(t.estado);
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Control Presupuestal" subtitulo={`${CODIGO_CONTROL} · Presupuesto, ejecutado y costo real`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={o ? `${o.proyecto}${d.acta ? " · Corte " + d.acta : ""}` : "Obra y corte"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <PanelObra h={h} campos={["contrato", "contratante", "aiu"]} />
            {!sinObra && (
              <>
                <Campo label="Acta / corte N°" value={d.acta} placeholder="Ej. 3" onChange={(v) => setD((c) => ({ ...c, acta: v }))} />
                <Campo label="Fecha de corte" type="date" value={d.corte} onChange={(v) => setD((c) => ({ ...c, corte: v }))} />
              </>
            )}
          </div>
        </Seccion>

        <Seccion id="capitulos" titulo="2. Control por capítulo" subtitulo={`${caps.filter((c) => texto(c.nombre)).length} capítulos${t.E ? ` · costo real ${pesos(t.H) || "$ 0"}` : ""}`} abierta={abierta === "capitulos"} onToggle={alternar} contador={caps.filter((c) => texto(c.nombre)).length}>
          {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
            <>
              <button type="button" onClick={sincronizar} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg mb-3" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>📥 Traer capítulos, presupuesto y ejecutado del Presupuesto y las Actas</button>
              {avisoCaps && <div className="text-[11px] mb-2" style={{ color: avisoCaps.startsWith("Del Presupuesto") ? "#2E7D4F" : "#B3401F" }}>{avisoCaps}</div>}
              {huerfanas.length > 0 && <div className="text-[11.5px] p-2 rounded mb-3" style={{ background: "#FFF8E8", color: "#7A5A00" }}>{huerfanas.length} {huerfanas.length === 1 ? "factura del Registro de Costos no suma" : "facturas del Registro de Costos no suman"} a ningún capítulo de esta lista (su capítulo no coincide). Revisa los nombres.</div>}
              {caps.map((c, i) => {
                const f = porNombre.get(texto(c.nombre).toLowerCase());
                const col = color(f && f.estado);
                return (
                  <div key={c.id} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>CAPÍTULO {i + 1}</div>
                    <div className="space-y-2">
                      <Campo label="Nombre del capítulo" value={c.nombre} onChange={(v) => actualizar(c.id, { nombre: v })} />
                      <CampoDinero label="Presupuesto contratado" value={c.contratado} permitirNegativo={false} onChange={(v) => actualizar(c.id, { contratado: v })} />
                      <CampoDinero label="Ejecutado según actas" value={c.ejecutado} permitirNegativo={false} onChange={(v) => actualizar(c.id, { ejecutado: v })} />
                      {f && texto(c.nombre) && (
                        <div className="text-[11.5px] px-3 py-2 rounded-md leading-relaxed" style={{ background: "white", border: `1px solid ${LINE}`, color: NAVY }}>
                          Adiciones aprobadas: <b>{pesos(f.D || 0)}</b> · Vigente: <b>{pesos(f.E) || "—"}</b><br />
                          Costo real acumulado: <b>{pesos(f.H || 0)}</b>{f.G !== null ? <> · Avance: <b>{porcentaje(f.G)}</b></> : null}<br />
                          {f.I !== null ? <>Desviación: <b>{pesos(f.I)}</b> ({porcentaje(f.J)}) · Proyectado al cierre: <b>{pesos(f.L) || "—"}</b></> : "Escribe lo ejecutado según actas para ver la desviación."}
                          {f.estado && <div className="mt-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: col.b, color: col.t }}>{f.estado}</div>}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => quitar(c.id)} aria-label={`Quitar capítulo ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
                  </div>
                );
              })}
              <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar capítulo</button>
              <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>El costo real se suma solo desde el Registro de Costos hasta la fecha de corte; las adiciones, desde los Adicionales aprobados. Todo a costo directo, sin AIU.</div>
            </>
          )}
        </Seccion>

        <Seccion id="resumen" titulo="3. Resumen financiero" subtitulo={t.estado ? `Estado general: ${t.estado}` : "Se calcula con los capítulos"} abierta={abierta === "resumen"} onToggle={alternar}>
          <CifrasResumen cifras={[
            { t: "Costos directos vigentes", v: pesos(vigente) || "$ 0" }, { t: "Valor del contrato con AIU", v: conAIU === null ? "" : pesos(conAIU) },
            { t: "Ejecutado a la fecha", v: pesos(t.F) || "$ 0" }, { t: "Costo real acumulado", v: pesos(t.H) || "$ 0" },
            { t: "Margen bruto (ejecutado − costo real)", v: pesos(t.F - t.H), color: t.F - t.H < 0 ? "#B3401F" : "#1D6B3A" }, { t: "Avance financiero", v: t.G === null ? "" : porcentaje(t.G) },
          ]} />
          {t.estado && <div className="mt-3 text-[12.5px] font-bold px-3 py-2 rounded-md text-center" style={{ background: ce.b, color: ce.t }}>Obra en {t.estado}{t.J !== null ? ` · desviación ${porcentaje(t.J)}` : ""}</div>}
          <div className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "#8A8F99" }}>OK: el costo real es igual o menor que lo ejecutado. VIGILAR: lo supera hasta un 5 %. ALERTA: lo supera en más del 5 %. El «proyectado al cierre» supone que el capítulo seguirá costando la misma proporción que hasta hoy.</div>
        </Seccion>

        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Elabora el director de obra; revisa gerencia" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró — Director de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={firmas.f.elabora.nombre} cargo={firmas.f.elabora.cargo} onChange={firmas.cambiar("elabora")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó — Gerencia</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={firmas.f.revisa.nombre} cargo={firmas.f.revisa.cargo} onChange={firmas.cambiar("revisa")} />
          </div>
        </Seccion>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del control presupuestal" onGenerar={generarExcel} />
    </div>
  );
}
