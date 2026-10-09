import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { decidirDistribucion } from "./sstBase";
import {
  CODIGO_ANTICIPO, HOJA_ANTICIPO, CELDAS_ANTICIPO, CAPACIDAD_ANTICIPO, descubrirAnticipo, escribirAnticipoEnHoja, validarAnticipo, camposFaltantesAnticipo, actaNueva, actasConDatos,
} from "./anticipoDatos";
import { listarActasAnticipo, guardarActasAnticipoDeObra, calcularAnticipo, actasDeObra, pesos, num, texto, nombreTipoProyecto, porcentaje } from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import {
  NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";

const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");

export default function FormularioAnticipo({ onVolver }) {
  const h = useObra();
  const [libro, setLibro] = useState(() => ({ id: h.id, lista: h.id ? listarActasAnticipo(h.id) : [] }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoActas, setAvisoActas] = useState("");
  const firmas = useFirmas("anticipo", ["registro", "revisa"]);
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  useEffect(() => { if (libro.id !== h.id) setLibro({ id: h.id, lista: h.id ? listarActasAnticipo(h.id) : [] }); }, [h.id]);   // eslint-disable-line
  useEffect(() => { if (libro.id && libro.id === h.id) guardarActasAnticipoDeObra(libro.id, libro.lista); }, [libro]);           // eslint-disable-line

  const actas = libro.lista;
  const o = h.obra || {};
  const setLista = (f) => setLibro((cur) => ({ ...cur, lista: f(cur.lista) }));
  const actualizar = (id, patch) => setLista((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const quitar = (id) => { if (window.confirm("¿Quitar esta acta?")) { setLista((l) => l.filter((a) => a.id !== id)); setAvisoActas(""); } };
  function agregar() {
    if (actasConDatos(actas).length >= CAPACIDAD_ANTICIPO) { setAvisoActas(`Esta hoja tiene espacio para ${CAPACIDAD_ANTICIPO} actas.`); return; }
    setAvisoActas("");
    const siguiente = actas.reduce((m, a) => Math.max(m, parseInt(a.acta, 10) || 0), 0) + 1;
    setLista((l) => [...l, actaNueva({ obraId: h.id, acta: String(siguiente), fecha: new Date().toISOString().slice(0, 10) })]);
  }
  function traerActas() {
    const hay = new Set(actas.map((a) => texto(a.acta)));
    const nuevas = actasDeObra().filter((a) => !hay.has(a.actaNo));
    if (!actasDeObra().length) { setAvisoActas("No encontré actas de obra generadas en Gestión Técnica."); return; }
    if (!nuevas.length) { setAvisoActas("Todas las actas de Gestión Técnica ya están en la lista."); return; }
    setLista((l) => [...l, ...nuevas.map((a) => actaNueva({ obraId: h.id, acta: a.actaNo, fecha: a.fecha, bruto: String(Math.round(a.valor)) }))]);
    setAvisoActas(`Se trajeron ${nuevas.length} ${nuevas.length === 1 ? "acta" : "actas"} de Gestión Técnica (con su valor).`);
  }
  const conDatos = actasConDatos(actas);
  const calc = calcularAnticipo(o, actas);                 // una fila por acta de la lista (las vacías quedan sin cifras)
  const calcPorId = new Map(actas.map((a, i) => [a.id, calc.filas[i]]));
  const calcDatos = calcularAnticipo(o, conDatos);
  const datosHoja = () => ({ proyecto: o.proyecto, tipo: nombreTipoProyecto(), contrato: o.contrato, contratante: o.contratante, fechaContrato: o.fechaContrato, fechaAnticipo: o.anticipoFecha,
    valorContrato: o.valorContrato, anticipoPct: o.anticipoPct, amortPct: o.amortPct, retegarantia: o.retegarantia, actas,
    registroNombre: firmas.f.registro.nombre, registroCargo: firmas.f.registro.cargo, revisaNombre: firmas.f.revisa.nombre, revisaCargo: firmas.f.revisa.cargo });

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = h.obra ? datosHoja() : { proyecto: "", actas: [] };
    const faltan = validarAnticipo(dat);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesAnticipo(dat)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-anticipo.xlsx", HOJA_ANTICIPO);
      const avs = [];
      const decision = decidirDistribucion(descubrirAnticipo(ws), CELDAS_ANTICIPO);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.actas && decision.celdas.tablas.actas.n) || CAPACIDAD_ANTICIPO;
      if (conDatos.length > capac) throw new Error(`la plantilla tiene espacio para ${capac} actas y hay ${conDatos.length}`);
      escribirAnticipoEnHoja(ws, dat, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Anticipo_${textoParaArchivo(o.proyecto, 24)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.registro.nombre, firmas.f.registro.cargo], [firmas.f.revisa.nombre, firmas.f.revisa.cargo]] });
      setGenerado(`✓ Excel descargado (${conDatos.length} ${conDatos.length === 1 ? "acta" : "actas"}; saldo del anticipo ${pesos(calcDatos.totales.saldo) || "—"}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  const sinObra = !h.obra || h.creando;
  const pAnt = num(o.anticipoPct);
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Anticipo y Amortización" subtitulo={`${CODIGO_ANTICIPO} · Anticipo, amortización y retenciones`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Obra y contrato"} abierta={abierta === "datos"} onToggle={alternar}>
          <PanelObra h={h} campos={["contrato", "contratante", "fechaContrato", "valorContrato"]} />
        </Seccion>

        <Seccion id="condiciones" titulo="2. Condiciones del anticipo" subtitulo={calcDatos.valorAnticipo !== null ? `Anticipo ${pesos(calcDatos.valorAnticipo)}` : "Porcentajes pactados"} abierta={abierta === "condiciones"} onToggle={alternar}>
          {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
            <div className="space-y-2.5">
              <Campo label="Fecha del anticipo" type="date" value={o.anticipoFecha || ""} onChange={(v) => h.cambiar({ anticipoFecha: v })} />
              <Campo label="Anticipo pactado (%)" value={o.anticipoPct || ""} inputMode="decimal" placeholder="Ej. 30" onChange={(v) => h.cambiar({ anticipoPct: soloNumero(v) })} />
              <div>
                <Campo label="Amortización por acta (%)" value={o.amortPct || ""} inputMode="decimal" placeholder="Ej. 30" onChange={(v) => h.cambiar({ amortPct: soloNumero(v) })} />
                {pAnt !== null && texto(o.amortPct) === "" && <button type="button" onClick={() => h.cambiar({ amortPct: o.anticipoPct })} className="text-[11px] mt-1 underline" style={{ color: NAVY }}>Usar el mismo porcentaje del anticipo ({o.anticipoPct} %)</button>}
              </div>
              <Campo label="Retegarantía (%)" value={o.retegarantia || ""} inputMode="decimal" placeholder="Ej. 5 (déjalo vacío si no hay)" onChange={(v) => h.cambiar({ retegarantia: soloNumero(v) })} />
              <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>Normalmente el anticipo se amortiza con el mismo porcentaje en cada acta (si se pactó 30 %, se descuenta el 30 % de cada acta hasta completarlo).</div>
              {calcDatos.valorAnticipo !== null && <div className="text-[12.5px] font-bold px-3 py-2 rounded-md text-center" style={{ background: "#EAF4EC", color: "#1D6B3A" }}>Valor del anticipo: {pesos(calcDatos.valorAnticipo)}</div>}
            </div>
          )}
        </Seccion>

        <Seccion id="actas" titulo="3. Actas, amortización y descuentos" subtitulo={`${conDatos.length} de ${CAPACIDAD_ANTICIPO} actas${conDatos.length ? ` · saldo ${pesos(calcDatos.totales.saldo) || "—"}` : ""}`} abierta={abierta === "actas"} onToggle={alternar} contador={conDatos.length}>
          {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
            <>
              <button type="button" onClick={traerActas} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg mb-3" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>📥 Traer las actas generadas en Gestión Técnica</button>
              {actas.map((a, i) => {
                const f = calcPorId.get(a.id) || {};
                return (
                  <div key={a.id} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Campo label="Acta N°" value={a.acta} onChange={(v) => actualizar(a.id, { acta: v })} />
                        <Campo label="Fecha" type="date" value={a.fecha} onChange={(v) => actualizar(a.id, { fecha: v })} />
                      </div>
                      <Campo label="Periodo o descripción" value={a.periodo} placeholder="Ej. Octubre 2026" onChange={(v) => actualizar(a.id, { periodo: v })} />
                      <CampoDinero label="Valor bruto del acta" value={a.bruto} onChange={(v) => actualizar(a.id, { bruto: v })} />
                      <CampoDinero label="Otros descuentos" value={a.otros} onChange={(v) => actualizar(a.id, { otros: v })} />
                      {f.bruto !== null && f.bruto !== undefined && (
                        <div className="text-[11.5px] px-3 py-2 rounded-md leading-relaxed" style={{ background: "#EAF4EC", color: "#1D6B3A" }}>
                          Amortización del anticipo: <b>{pesos(f.amort)}</b><br />Retegarantía: <b>{pesos(f.reteg)}</b><br />Valor neto a pagar: <b>{pesos(f.neto)}</b><br />Saldo del anticipo por amortizar: <b>{pesos(f.saldo) || "—"}</b>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => quitar(a.id)} aria-label={`Quitar acta ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
                  </div>
                );
              })}
              <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar acta</button>
              {avisoActas && <div className="text-[11.5px] mt-2" style={{ color: avisoActas.startsWith("Se trajeron") ? "#2E7D4F" : "#B3401F" }}>{avisoActas}</div>}
              <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Cada acta se guarda sola. En el Excel, los descuentos y el saldo se calculan con fórmulas.</div>
            </>
          )}
        </Seccion>

        <Seccion id="resumen" titulo="4. Resumen" subtitulo={conDatos.length ? `Amortizado ${pesos(calcDatos.totales.amort) || "$ 0"}` : "Se calcula con las actas"} abierta={abierta === "resumen"} onToggle={alternar}>
          <CifrasResumen cifras={[
            { t: "Anticipo entregado", v: pesos(calcDatos.valorAnticipo) }, { t: "Amortizado a la fecha", v: pesos(calcDatos.totales.amort) || "$ 0" },
            { t: "Saldo por amortizar", v: pesos(calcDatos.totales.saldo), color: "#B3401F" }, { t: "Avance de amortización", v: calcDatos.valorAnticipo ? porcentaje(calcDatos.totales.amort / calcDatos.valorAnticipo) : "" },
            { t: "Retegarantía acumulada", v: pesos(calcDatos.totales.reteg) || "$ 0" }, { t: "Neto pagado en actas", v: pesos(calcDatos.totales.neto) || "$ 0", color: "#1D6B3A" },
          ]} />
        </Seccion>

        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Registra administración; revisa el director de obra" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Registró — Administración</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien registra" etqCargo="Cargo de quien registra" nombre={firmas.f.registro.nombre} cargo={firmas.f.registro.cargo} onChange={firmas.cambiar("registro")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó — Director de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={firmas.f.revisa.nombre} cargo={firmas.f.revisa.cargo} onChange={firmas.cambiar("revisa")} />
          </div>
        </Seccion>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del anticipo" onGenerar={generarExcel} />
    </div>
  );
}
