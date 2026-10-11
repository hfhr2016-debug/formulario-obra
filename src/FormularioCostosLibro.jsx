// Pantalla común de los formatos del Lote 2 de Control Presupuestal (materiales, mano de obra y subcontratos, maquinaria, cuentas por pagar).
// Cada formato llega como una configuración (FORMATOS en costosLote2Datos.js): sus listas, los campos de cada tarjeta y sus cifras.
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { decidirDistribucion } from "./sstBase";
import { FORMATOS, escribirEnHoja, faltantes, validar } from "./costosLote2Datos";
import { FORMATOS3, escribirFlujoEnHoja, faltantes3, validar3 } from "./costosLote3Datos";
import { listarRegistros, guardarRegistrosDeObra, leerCabecera, guardarCabecera, facturasPorPagar, cuentaDesdeFactura } from "./cpLibros";
import { num, texto, nombreTipoProyecto } from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import { ChipsOpcion } from "./sstControles";
import {
  NAVY, GOLD, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo, Lista,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";

const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");
const cargarListas = (F, id) => { const r = {}; F.listas.forEach((l) => { r[l.id] = id ? listarRegistros(l.clave, id) : []; }); return r; };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function FormularioCostosLibro({ formato, onVolver }) {
  const F = FORMATOS[formato] || FORMATOS3[formato];
  const esLote3 = !FORMATOS[formato];
  const validarF = (d) => (esLote3 ? validar3(F.id, d) : validar(F.id, d));
  const faltantesF = (d) => (esLote3 ? faltantes3(F.id, d) : faltantes(F.id, d));
  const h = useObra();
  const [libro, setLibro] = useState(() => ({ id: h.id, datos: cargarListas(F, h.id) }));
  const [cab, setCab] = useState(() => ({ ...(F.cabecera.some((c) => c.k === "corte") ? { corte: hoyISO() } : {}), ...(h.id ? leerCabecera(F.id, h.id) : {}) }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisos, setAvisos] = useState({});
  const firmas = useFirmas(F.id, ["elabora", "revisa"]);
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  // Al cambiar de obra se cargan sus registros y su encabezado; cada cambio se guarda al instante
  useEffect(() => {
    if (libro.id !== h.id) { setLibro({ id: h.id, datos: cargarListas(F, h.id) }); setCab({ ...(F.cabecera.some((c) => c.k === "corte") ? { corte: hoyISO() } : {}), ...(h.id ? leerCabecera(F.id, h.id) : {}) }); }
  }, [h.id]);   // eslint-disable-line
  useEffect(() => { if (libro.id && libro.id === h.id) F.listas.forEach((l) => guardarRegistrosDeObra(l.clave, libro.id, libro.datos[l.id] || [], l.vacio)); }, [libro]);   // eslint-disable-line
  useEffect(() => { if (h.id && libro.id === h.id) guardarCabecera(F.id, h.id, cab); }, [cab]);   // eslint-disable-line

  const o = h.obra || {};
  const sinObra = !h.obra || h.creando;
  const nombresCap = ((o && o.capitulos) || []).map((c) => c.nombre).filter(Boolean);
  const setLista = (lid, f) => setLibro((cur) => ({ ...cur, datos: { ...cur.datos, [lid]: f(cur.datos[lid] || []) } }));
  const aviso = (lid, t) => setAvisos((a) => ({ ...a, [lid]: t }));
  const conDatos = (l) => (libro.datos[l.id] || []).filter((r) => !l.vacio(r));
  const sugerencias = (l, k) => [...new Set(listarRegistros(l.clave).concat(libro.datos[l.id] || []).map((r) => texto(r[k])).filter(Boolean))];

  function agregar(l) {
    if (conDatos(l).length >= l.capacidad) { aviso(l.id, `Esta hoja tiene espacio para ${l.capacidad} ${l.singular === "material" ? "materiales" : "registros"}.`); return; }
    aviso(l.id, "");
    const ult = (libro.datos[l.id] || []).slice(-1)[0] || {};
    setLista(l.id, (xs) => [...xs, l.nuevo({ obraId: h.id, ...(l.id === "mano" ? { periodo: ult.periodo || "", prest: ult.prest || "" } : {}), ...(l.alAgregar ? l.alAgregar(libro.datos[l.id] || []) : {}) })]);
  }
  function traerFacturas(l) {
    const hay = facturasPorPagar(h.id, libro.datos[l.id]);
    if (!hay.length) { aviso(l.id, "No hay facturas pendientes o parciales en el Registro de Costos que no estén ya en la lista."); return; }
    const sitio = l.capacidad - conDatos(l).length;
    const tomar = hay.slice(0, Math.max(0, sitio));
    if (!tomar.length) { aviso(l.id, `Esta hoja tiene espacio para ${l.capacidad} registros.`); return; }
    setLista(l.id, (xs) => [...xs.filter((r) => !l.vacio(r)), ...tomar.map((f) => cuentaDesdeFactura(f, h.id))]);
    aviso(l.id, `Se trajeron ${tomar.length} ${tomar.length === 1 ? "factura pendiente" : "facturas pendientes"} del Registro de Costos${tomar.length < hay.length ? ` (faltaron ${hay.length - tomar.length}: no caben en la hoja)` : ""}.`);
  }
  function correrBoton(l, b) {
    const r = b.accion({ obraId: h.id, obra: o, filas: libro.datos[l.id] || [], cab });
    if (r.filas) setLista(l.id, () => r.filas);
    aviso(l.id, r.aviso || "");
  }
  const datosHoja = () => ({ obra: o, tipo: nombreTipoProyecto(), cab, ...libro.datos, firmas: { elabora: firmas.f.elabora, revisa: firmas.f.revisa } });
  const datosPantalla = { ...libro.datos, cab };

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = h.obra ? datosHoja() : { obra: {}, cab, ...cargarListas(F, ""), firmas: {} };
    const fal = validarF(dat);
    if (fal.length) { setMensajeError("Falta completar: " + fal.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(faltantesF(dat)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla(F.plantilla, F.hoja);
      const avs = [];
      const decision = decidirDistribucion(F.descubrir(ws), F.celdas());
      if (decision.aviso) avs.push(decision.aviso);
      F.listas.forEach((l) => { const capac = (decision.celdas.tablas && decision.celdas.tablas[l.id] && decision.celdas.tablas[l.id].n) || l.capacidad; if (conDatos(l).length > capac) throw new Error(`la plantilla tiene espacio para ${capac} filas de «${l.titulo}» y hay ${conDatos(l).length}`); });
      if (esLote3) escribirFlujoEnHoja(ws, dat, decision.celdas); else escribirEnHoja(F.id, ws, dat, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `${F.archivo}_${textoParaArchivo(o.proyecto, 24)}_${hoyISO()}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.elabora.nombre, firmas.f.elabora.cargo], [firmas.f.revisa.nombre, firmas.f.revisa.cargo]] });
      setGenerado(`✓ Excel descargado (${F.listas.map((l) => `${conDatos(l).length} ${l.titulo.toLowerCase()}`).join(" · ")}).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function campo(l, r, c, i) {
    const act = (v) => setLista(l.id, (xs) => xs.map((x) => (x.id === r.id ? { ...x, [c.k]: v } : x)));
    const valor = r[c.k] === undefined || r[c.k] === null ? "" : r[c.k];
    if (c.tipo === "dinero") return <CampoDinero key={c.k} label={c.label} value={valor} onChange={act} />;
    if (c.tipo === "num" || c.tipo === "pct") return <Campo key={c.k} label={c.label} value={valor} inputMode="decimal" placeholder={c.ph} onChange={(v) => act(soloNumero(v))} />;
    if (c.tipo === "mes") return <Campo key={c.k} label={c.label} type="month" value={valor} onChange={act} />;
    if (c.tipo === "fecha") return <Campo key={c.k} label={c.label} type="date" value={valor} onChange={act} />;
    if (c.tipo === "chips") return <ChipsOpcion key={c.k} label={c.label} nombre={c.label} value={valor} opciones={c.opciones} pequeno onChange={act} />;
    if (c.tipo === "capitulo") {
      if (!nombresCap.length) return <Campo key={c.k} label={c.label} value={valor} placeholder="Escribe el capítulo (o créalos en Control Presupuestal)" onChange={act} />;
      return <Lista key={c.k} label={c.label} value={valor} onChange={act} opciones={nombresCap.includes(valor) || !valor ? nombresCap : [...nombresCap, valor]} />;
    }
    const lid = c.sugerir ? `sug-${F.id}-${l.id}-${c.k}` : undefined;
    return (
      <div key={c.k}>
        <Campo label={c.label} value={valor} placeholder={c.ph} lista={lid} onChange={act} />
        {c.sugerir && i === 0 && <datalist id={lid}>{sugerencias(l, c.k).map((s) => <option key={s} value={s} />)}</datalist>}
      </div>
    );
  }
  function campos(l, r, i) {
    const out = []; let par = [];
    const vaciar = () => { if (par.length) { out.push(<div key={`g${out.length}`} className="grid grid-cols-2 gap-2">{par}</div>); par = []; } };
    l.campos.forEach((c) => { const el = campo(l, r, c, i); if (c.mitad) par.push(el); else { vaciar(); out.push(el); } });
    vaciar();
    return out;
  }

  const ctx = { cab };
  const fechaCab = (c) => <Campo key={c.k} label={c.label} type="date" value={cab[c.k] || ""} onChange={(v) => setCab((x) => ({ ...x, [c.k]: v }))} />;
  const dineroCab = (c) => <CampoDinero key={c.k} label={c.label} value={cab[c.k] || ""} onChange={(v) => setCab((x) => ({ ...x, [c.k]: v }))} />;
  const textoCab = (c) => <Campo key={c.k} label={c.label} value={cab[c.k] || ""} placeholder={c.ph} onChange={(v) => setCab((x) => ({ ...x, [c.k]: v }))} />;
  const subtituloLista = (l) => `${conDatos(l).length} de ${l.capacidad}`;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo={F.titulo} subtitulo={F.subtitulo} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Obra y contrato"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <PanelObra h={h} campos={["contrato", "contratante"]} />
            {!sinObra && F.cabecera.map((c) => (c.tipo === "fecha" ? fechaCab(c) : c.tipo === "dinero" ? dineroCab(c) : textoCab(c)))}
          </div>
        </Seccion>

        {F.listas.map((l, n) => (
          <Seccion key={l.id} id={l.seccion} titulo={`${n + 2}. ${l.titulo}`} subtitulo={subtituloLista(l)} abierta={abierta === l.seccion} onToggle={alternar} contador={conDatos(l).length}>
            {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
              <>
                {l.traerFacturas && <button type="button" onClick={() => traerFacturas(l)} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg mb-3" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>📥 Traer las facturas pendientes del Registro de Costos</button>}
                {(l.botones || []).map((b) => <button key={b.texto} type="button" onClick={() => correrBoton(l, b)} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg mb-2" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>{b.texto}</button>)}
                {(libro.datos[l.id] || []).map((r, i, todas) => {
                  const c = l.calculo(r, ctx, i, todas);
                  return (
                    <div key={r.id} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
                      <div className="space-y-2">
                        {campos(l, r, i)}
                        {c && (
                          <div className="text-[11.5px] px-3 py-2 rounded-md leading-relaxed" style={{ background: c.fondo, color: c.color }}>
                            {c.lineas.map(([t, v], k) => <div key={k}>{t}: <b>{v}</b></div>)}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => { if (window.confirm("¿Quitar este registro?")) { setLista(l.id, (xs) => xs.filter((x) => x.id !== r.id)); aviso(l.id, ""); } }} aria-label={`Quitar ${l.singular} ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => agregar(l)} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar {l.singular}</button>
                {avisos[l.id] && <div className="text-[11.5px] mt-2" style={{ color: /^Se trajeron/.test(avisos[l.id]) ? "#2E7D4F" : "#B3401F" }}>{avisos[l.id]}</div>}
                <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>Cada registro se guarda solo. En el Excel, los totales y los cálculos se hacen con fórmulas.</div>
              </>
            )}
          </Seccion>
        ))}

        <Seccion id="resumen" titulo={`${F.listas.length + 2}. Resumen`} subtitulo="Se calcula con lo registrado" abierta={abierta === "resumen"} onToggle={alternar}>
          <CifrasResumen cifras={F.cifras(datosPantalla)} />
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>{F.ayuda}</div>
        </Seccion>

        <Seccion id="firmas" titulo={`${F.listas.length + 3}. Firmas`} subtitulo="Quién elabora y quién revisa" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            {F.firmas.map((p, k) => (
              <div key={p.clave} className="space-y-2.5">
                <div className={`text-[11px] font-semibold${k ? " pt-1" : ""}`} style={{ color: NAVY }}>{p.titulo}</div>
                <BloqueProfesional memoria={memoria} etqNombre={p.n} etqCargo={p.c} nombre={firmas.f[p.clave].nombre} cargo={firmas.f[p.clave].cargo} onChange={firmas.cambiar(p.clave)} />
              </div>
            ))}
          </div>
        </Seccion>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton={`Generar Excel de ${F.titulo.toLowerCase()}`} onGenerar={generarExcel} />
    </div>
  );
}
