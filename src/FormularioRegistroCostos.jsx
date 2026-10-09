import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_COSTOS, HOJA_COSTOS, CELDAS_COSTOS, CAPACIDAD_COSTOS, descubrirCostos, escribirCostosEnHoja, validarCostos, camposFaltantesCostos,
  facturasDelPeriodo, facturasConDatos, resumenCostos, nombrePeriodo, primerDiaMes, ultimoDiaMes,
} from "./registroCostosDatos";
import {
  TIPOS_COSTO, ESTADOS_PAGO, facturaNueva, listarFacturas, guardarFacturasDeObra, totalFactura, netoFactura, pesos, num, texto, nombreTipoProyecto, capitulosDePresupuesto, capituloNuevo,
} from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import {
  TARIFAS_BASE, leerTarifas, guardarTarifas, tarifaDe, ivaAuto, retencionesAuto, conAutomaticos, normalizarManual,
  construirConceptos, conceptosUsados, opcionesParaTipo, buscarConcepto,
} from "./cpCostosAuto";
import {
  NAVY, GOLD, PAPER, LINE, etiquetaCls, claseInput, estiloInput, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { ChipsOpcion } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";

// Texto pequeño bajo IVA / Retenciones: dice de dónde sale el valor y permite volver al automático
function AyudaAuto({ manual, texto, onAuto }) {
  return (
    <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>
      {manual ? <>Escrito a mano. <button type="button" onClick={onAuto} className="underline font-semibold" style={{ color: NAVY }}>↺ Volver al cálculo automático</button></> : texto}
    </div>
  );
}

// Precio de referencia del concepto (los mismos de los APU / Presupuesto) y cantidad: valor antes de IVA = cantidad × precio
function PrecioReferencia({ f, concepto, onElegir, onCantidad }) {
  const precios = (concepto && concepto.precios) || [];
  if (!precios.length && !texto(f.precioUnit)) return null;
  const unidad = (concepto && concepto.unidad) || texto(f.unidad);
  const etiqueta = (p) => `${p.etq}: ${pesos(p.valor)}${unidad ? " / " + unidad : ""}`;
  const actual = texto(f.precioUnit);
  const enLista = precios.some((p) => String(p.valor) === actual);
  return (
    <div className="p-2 rounded-lg space-y-2" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
      <div className="w-full" data-campo="Precio de referencia">
        <label className={etiquetaCls} style={{ color: "#8A8F99" }}>Precio de referencia (el de los APU)</label>
        <select value={actual} onChange={(e) => onElegir(e.target.value)} className={claseInput + " bg-white"} style={estiloInput}>
          <option value="">Escribir el valor a mano</option>
          {precios.map((p) => (<option key={p.etq + p.valor} value={String(p.valor)}>{etiqueta(p)}</option>))}
          {actual && !enLista && <option value={actual}>{pesos(Number(actual))}{unidad ? " / " + unidad : ""}</option>}
        </select>
      </div>
      {actual && <Campo label={`Cantidad${unidad ? " (" + unidad + ")" : ""}`} value={f.cantidad} inputMode="decimal" onChange={(v) => onCantidad(v.replace(/[^0-9.,]/g, ""))} />}
      {actual && <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Valor antes de IVA = cantidad × precio. Si escribes el valor a mano, se deja de usar el precio.</div>}
    </div>
  );
}

export default function FormularioRegistroCostos({ onVolver }) {
  const h = useObra();
  const hoy = fechaHoyISO();
  const [d, setD] = useState(() => ({ desde: primerDiaMes(hoy), hasta: ultimoDiaMes(hoy), periodo: nombrePeriodo(primerDiaMes(hoy), ultimoDiaMes(hoy)) }));
  const [libro, setLibro] = useState(() => ({ id: h.id, lista: h.id ? listarFacturas(h.id) : [] }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoCaps, setAvisoCaps] = useState("");
  const firmas = useFirmas("costos", ["registro", "revisa"]);
  const memoria = useMemoriaSST();
  const [tarifas, setTarifas] = useState(() => leerTarifas());
  const conceptos = useMemo(() => construirConceptos(), []);          // catálogo de los APU + actividades del Presupuesto (se arma al abrir)
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  // La lista de facturas es la de la obra elegida; cada cambio se guarda al instante
  useEffect(() => { if (libro.id !== h.id) setLibro({ id: h.id, lista: h.id ? listarFacturas(h.id) : [] }); }, [h.id]);   // eslint-disable-line
  useEffect(() => { if (libro.id && libro.id === h.id) guardarFacturasDeObra(libro.id, libro.lista); }, [libro]);        // eslint-disable-line

  const setFechas = (patch) => setD((cur) => { const s = { ...cur, ...patch }; return { ...s, periodo: nombrePeriodo(s.desde, s.hasta) || s.periodo }; });
  const setLista = (f) => setLibro((cur) => ({ ...cur, lista: f(cur.lista) }));
  const visibles = facturasDelPeriodo(libro.lista, d.desde, d.hasta);
  // Las casillas vacías recién agregadas también se ven (aún no tienen datos): van al final del periodo
  const enPantalla = libro.lista.filter((f) => (facturasConDatos([f]).length ? visibles.includes(f) : true));
  // Cada cambio recalcula lo automático (valor = cantidad × precio, IVA y retenciones), salvo lo que la persona escribió a mano
  const actualizar = (id, patch) => setLista((l) => l.map((f) => (f.id === id ? conAutomaticos(f, patch, tarifas) : f)));
  function cambiarTarifa(tipo, campo, valor) {
    const limpio = valor.replace(/[^0-9.,]/g, "");
    const nuevas = { ...tarifas, [tipo]: { ...tarifaDe(tarifas, tipo), [campo]: limpio } };
    setTarifas(nuevas); guardarTarifas(nuevas);
    setLista((l) => l.map((f) => conAutomaticos(f, {}, nuevas)));
  }
  function cambiarReteIva(v) {
    const nuevas = { ...tarifas, reteIva: v };
    setTarifas(nuevas); guardarTarifas(nuevas);
    setLista((l) => l.map((f) => conAutomaticos(f, {}, nuevas)));
  }
  const quitar = (id) => { if (window.confirm("¿Quitar esta factura del registro?")) setLista((l) => l.filter((f) => f.id !== id)); };
  const capitulos = (h.obra && h.obra.capitulos) || [];
  const nombresCap = capitulos.map((c) => c.nombre).filter(Boolean);
  function agregar() {
    const fecha = hoy < d.desde ? d.desde : hoy > d.hasta ? d.hasta : hoy;
    const ult = visibles[visibles.length - 1] || {};
    setLista((l) => [...l, facturaNueva({ obraId: h.id, fecha, capitulo: ult.capitulo || "", tipo: ult.tipo || "", estado: "Pendiente", ivaManual: false, retManual: false })]);
  }
  // Si la obra aún no tiene capítulos y el Presupuesto ya los tiene, se traen solos (así la lista de capítulos aparece sin hacer nada)
  useEffect(() => {
    if (!h.obra || h.creando || (h.obra.capitulos || []).length) return;
    const r = capitulosDePresupuesto();
    if (r.capitulos.length) {
      h.cambiar({ capitulos: r.capitulos.map((c) => capituloNuevo({ nombre: c.nombre, contratado: String(c.contratado), ejecutado: String(c.ejecutado) })) });
      setAvisoCaps(`Se trajeron ${r.capitulos.length} capítulos del Presupuesto.`);
    }
  }, [h.id, h.creando]);        // eslint-disable-line
  function traerCapitulos() {
    const r = capitulosDePresupuesto();
    if (!r.capitulos.length) { setAvisoCaps("No encontré capítulos en el Presupuesto. Genera primero el Presupuesto de Gestión Técnica, o crea los capítulos en «Control Presupuestal»."); return; }
    h.cambiar({ capitulos: r.capitulos.map((c) => capituloNuevo({ nombre: c.nombre, contratado: String(c.contratado), ejecutado: String(c.ejecutado) })) });
    setAvisoCaps(`Se trajeron ${r.capitulos.length} capítulos del Presupuesto.`);
  }
  const usados = conceptosUsados(listarFacturas(""));
  const aperturaCap = nombresCap.slice(0, 12).map((t) => ({ texto: t, detalle: "" }));
  // Proveedores ya usados (con su NIT) para no escribirlos otra vez
  const proveedores = (() => { const m = new Map(); listarFacturas("").forEach((f) => { const k = texto(f.proveedor); if (k && !m.has(k.toLowerCase())) m.set(k.toLowerCase(), { texto: k, detalle: texto(f.nit), nit: f.nit, tipo: f.tipo }); }); return Array.from(m.values()); })();

  const res = resumenCostos(libro.lista, d.desde, d.hasta);
  const datosHoja = () => ({ proyecto: h.obra.proyecto, tipo: nombreTipoProyecto(), contrato: h.obra.contrato, contratante: h.obra.contratante, periodo: d.periodo, responsable: firmas.f.registro.nombre,
    facturas: libro.lista, desde: d.desde, hasta: d.hasta, registroNombre: firmas.f.registro.nombre, registroCargo: firmas.f.registro.cargo, revisaNombre: firmas.f.revisa.nombre, revisaCargo: firmas.f.revisa.cargo });

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = h.obra ? datosHoja() : { proyecto: "", facturas: [] };
    const faltan = validarCostos(dat);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesCostos(dat, enPantalla)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-registro-costos.xlsx", HOJA_COSTOS);
      const avs = [];
      const decision = decidirDistribucion(descubrirCostos(ws), CELDAS_COSTOS);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.facturas && decision.celdas.tablas.facturas.n) || CAPACIDAD_COSTOS;
      if (visibles.length > capac) throw new Error(`la hoja tiene espacio para ${capac} facturas y el periodo tiene ${visibles.length}. Acorta el periodo (Desde / Hasta) y genera otra hoja con el resto`);
      escribirCostosEnHoja(ws, dat, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Registro_de_Costos_${textoParaArchivo(h.obra.proyecto, 24)}_${d.desde}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.registro.nombre, firmas.f.registro.cargo], [firmas.f.revisa.nombre, firmas.f.revisa.cargo]] });
      setGenerado(`✓ Excel descargado (${visibles.length} ${visibles.length === 1 ? "factura" : "facturas"}, ${pesos(res.total)}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  const sinObra = !h.obra || h.creando;
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Registro de Costos" subtitulo={`${CODIGO_COSTOS} · Facturas, cuentas de cobro y pagos de la obra`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Obra y contrato"} abierta={abierta === "datos"} onToggle={alternar}>
          <PanelObra h={h} campos={["contrato", "contratante"]} />
        </Seccion>

        <Seccion id="facturas" titulo="2. Facturas y pagos" subtitulo={`${visibles.length} de ${CAPACIDAD_COSTOS} en el periodo · ${pesos(res.total) || "$ 0"}`} abierta={abierta === "facturas"} onToggle={alternar} contador={visibles.length}>
          {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-1">
                <Campo label="Desde" type="date" value={d.desde} onChange={(v) => setFechas({ desde: v })} />
                <Campo label="Hasta" type="date" value={d.hasta} onChange={(v) => setFechas({ hasta: v })} />
              </div>
              <div className="mb-3"><Campo label="Mes / periodo de registro" value={d.periodo} onChange={(v) => setD((c) => ({ ...c, periodo: v }))} /></div>
              {!nombresCap.length && (
                <div className="text-[11.5px] p-2 rounded mb-3" style={{ background: "#FFF8E8", color: "#7A5A00" }}>
                  Esta obra aún no tiene capítulos del presupuesto: sin ellos no se puede asignar cada factura.
                  <button type="button" onClick={traerCapitulos} className="block mt-1.5 font-semibold underline" style={{ color: NAVY }}>Traer los capítulos del Presupuesto</button>
                  <span className="block mt-1">También puedes crearlos a mano en «Control Presupuestal».</span>
                </div>
              )}
              {avisoCaps && <div className="text-[11px] mb-2" style={{ color: "#2E7D4F" }}>{avisoCaps}</div>}
              {enPantalla.map((f, i) => {
                const total = totalFactura(f); const neto = netoFactura(f);
                return (
                  <div key={f.id} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                    <div className="space-y-2">
                      <Campo label="Fecha" type="date" value={f.fecha} onChange={(v) => actualizar(f.id, { fecha: v })} />
                      <BuscadorLista label="Proveedor o beneficiario" value={f.proveedor} opciones={proveedores} opcionesAlAbrir={proveedores.slice(0, 6)} placeholder="Escribe o elige uno ya usado"
                        onChange={(v) => actualizar(f.id, { proveedor: v })} onElegir={(o) => actualizar(f.id, { proveedor: o.texto, nit: f.nit || o.nit || "", tipo: f.tipo || o.tipo || "" })} />
                      <Campo label="NIT / C.C." value={f.nit} onChange={(v) => actualizar(f.id, { nit: v })} />
                      <Lista label="Tipo de costo" value={f.tipo} onChange={(v) => actualizar(f.id, { tipo: v })} opciones={TIPOS_COSTO} />
                      <BuscadorLista label="Capítulo del presupuesto" value={f.capitulo} opciones={nombresCap.map((t) => ({ texto: t, detalle: "" }))} opcionesAlAbrir={aperturaCap}
                        placeholder={nombresCap.length ? "Elige un capítulo o escribe uno" : "Escribe el capítulo (aún no hay capítulos del Presupuesto)"}
                        onChange={(v) => actualizar(f.id, { capitulo: v })} />
                      <BuscadorLista label="Concepto" value={f.concepto} opciones={opcionesParaTipo(conceptos, usados, f.tipo)} opcionesAlAbrir={opcionesParaTipo(conceptos, usados, f.tipo).slice(0, 8)}
                        placeholder="Busca un material, mano de obra, equipo o actividad, o escribe otro"
                        onChange={(v) => actualizar(f.id, { concepto: v, precioUnit: "", cantidad: "", unidad: "" })}
                        onElegir={(o) => actualizar(f.id, { concepto: o.texto, tipo: f.tipo || o.tipo || "", capitulo: f.capitulo || o.capitulo || "", unidad: o.unidad || "", precioUnit: "", cantidad: "" })} />
                      <PrecioReferencia f={f} concepto={buscarConcepto(conceptos, f.concepto, f.tipo)} onElegir={(p) => actualizar(f.id, { precioUnit: p === "" ? "" : String(p), cantidad: p === "" ? "" : (num(f.cantidad) !== null ? f.cantidad : "1") })} onCantidad={(v) => actualizar(f.id, { cantidad: v })} />
                      <Campo label="N° factura / cuenta de cobro" value={f.numero} onChange={(v) => actualizar(f.id, { numero: v })} />
                      <CampoDinero label="Valor antes de IVA" value={f.valorAntes} onChange={(v) => actualizar(f.id, { valorAntes: v, precioUnit: "", cantidad: "" })} />
                      <div>
                        <CampoDinero label="IVA" value={f.iva} onChange={(v) => actualizar(f.id, { iva: v, ivaManual: true })} />
                        <AyudaAuto manual={normalizarManual(f).ivaManual} texto={`IVA automático: ${tarifaDe(tarifas, f.tipo).iva} % según el tipo de costo`} onAuto={() => actualizar(f.id, { ivaManual: false })} />
                      </div>
                      <div>
                        <CampoDinero label="Retenciones" value={f.retenciones} onChange={(v) => actualizar(f.id, { retenciones: v, retManual: true })} />
                        <AyudaAuto manual={normalizarManual(f).retManual} texto={`Retenciones automáticas: ${tarifaDe(tarifas, f.tipo).rf} % fuente${num(tarifaDe(tarifas, f.tipo).ica) ? ` + ${tarifaDe(tarifas, f.tipo).ica} ‰ ICA` : ""}${tarifas.reteIva ? " + ReteIVA" : ""}`} onAuto={() => actualizar(f.id, { retManual: false })} />
                      </div>
                      {total !== null && <div className="text-[12.5px] font-bold px-3 py-1.5 rounded-md text-center" style={{ background: total < 0 ? "#FDEDEA" : "#EAF4EC", color: total < 0 ? "#B3401F" : "#1D6B3A" }}>Costo (con IVA): {pesos(total)}</div>}
                      {neto !== null && num(f.retenciones) !== null && num(f.retenciones) !== 0 && <div className="text-[11.5px] px-3 py-1 rounded-md text-center" style={{ background: "#F2F6FB", color: NAVY }}>Neto a pagar al proveedor: <b>{pesos(neto)}</b> <span style={{ color: "#8A8F99" }}>(costo − retenciones)</span></div>}
                      <ChipsOpcion label="Estado" nombre={`Estado ${i + 1}`} value={f.estado} opciones={ESTADOS_PAGO} pequeno onChange={(v) => actualizar(f.id, { estado: v })} />
                      {(f.estado === "Pagado" || f.estado === "Parcial") && <Campo label="Fecha de pago" type="date" value={f.fechaPago} onChange={(v) => actualizar(f.id, { fechaPago: v })} />}
                      <Campo label="Soporte (ruta o N°)" value={f.soporte} placeholder="Ej. Carpeta 3, folio 12" onChange={(v) => actualizar(f.id, { soporte: v })} />
                    </div>
                    <button type="button" onClick={() => quitar(f.id)} aria-label={`Quitar factura ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
                  </div>
                );
              })}
              <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar factura o pago</button>
              {visibles.length > CAPACIDAD_COSTOS && <div className="text-[11.5px] mt-2 p-2 rounded" style={{ background: "#FDEDEA", color: "#B3401F" }}>El periodo tiene {visibles.length} facturas y la hoja tiene espacio para {CAPACIDAD_COSTOS}. Acorta el periodo para generar otra hoja con el resto.</div>}
              <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Cada factura se guarda sola. Lo que registres aquí se suma por capítulo en el Control Presupuestal. Una nota crédito o devolución se escribe con signo menos.</div>
            </>
          )}
        </Seccion>

        <Seccion id="tarifas" titulo="Tarifas de IVA y retenciones" subtitulo="Con estas tarifas se calculan solas en cada factura" abierta={abierta === "tarifas"} onToggle={alternar}>
          <div className="text-[11px] mb-2" style={{ color: "#8A8F99" }}>Son valores de partida: confírmalos con tu contador (la retención depende de si eres declarante, del municipio y de las bases mínimas). Lo que cambies aquí se aplica a las facturas que no tengan el IVA o las retenciones escritos a mano.</div>
          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-semibold mb-1" style={{ color: "#8A8F99" }}><div>Tipo de costo</div><div>IVA %</div><div>Retefuente %</div><div>ReteICA ‰</div></div>
          {TIPOS_COSTO.map((t) => (
            <div key={t} className="grid grid-cols-4 gap-1.5 items-center mb-1.5">
              <div className="text-[11px]" style={{ color: NAVY }}>{t}</div>
              {["iva", "rf", "ica"].map((c) => (
                <input key={c} type="text" inputMode="decimal" aria-label={`${t} ${c}`} value={String(tarifaDe(tarifas, t)[c] === undefined ? "" : tarifaDe(tarifas, t)[c])} onChange={(e) => cambiarTarifa(t, c, e.target.value)} className={claseInput} style={estiloInput} />
              ))}
            </div>
          ))}
          <label className="flex items-center gap-2 text-[11.5px] mt-2" style={{ color: NAVY }}>
            <input type="checkbox" checked={!!tarifas.reteIva} onChange={(e) => cambiarReteIva(e.target.checked)} /> Aplicar ReteIVA (15 % del IVA)
          </label>
        </Seccion>

        <Seccion id="resumen" titulo="3. Resumen del periodo" subtitulo={res.facturas ? `${pesos(res.total)} · ${pesos(res.pendiente)} por pagar` : "Se calcula con las facturas"} abierta={abierta === "resumen"} onToggle={alternar}>
          <CifrasResumen cifras={[{ t: "Facturas", v: String(res.facturas) }, { t: "Costo del periodo", v: pesos(res.total) || "$ 0" }, { t: "Pagado", v: pesos(res.pagado) || "$ 0", color: "#1D6B3A" }, { t: "Pendiente + parcial", v: pesos(res.pendiente + res.parcial) || "$ 0", color: "#B3401F" }]} />
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>El Excel trae además el resumen por tipo de costo y por estado, calculado con fórmulas.</div>
        </Seccion>

        <Seccion id="firmas" titulo="4. Firmas" subtitulo="Registra administración; revisa el director de obra" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Registró — Administración</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable" etqCargo="Cargo del responsable" nombre={firmas.f.registro.nombre} cargo={firmas.f.registro.cargo} onChange={firmas.cambiar("registro")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó — Director de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={firmas.f.revisa.nombre} cargo={firmas.f.revisa.cargo} onChange={firmas.cambiar("revisa")} />
          </div>
        </Seccion>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del registro de costos" onGenerar={generarExcel} />
    </div>
  );
}
