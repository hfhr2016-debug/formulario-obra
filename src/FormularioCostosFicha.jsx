// Pantalla común de los formatos de Control Presupuestal que son una «ficha» de cifras por obra (Costos y Rentabilidad, Cierre Financiero).
// Cada formato llega como configuración (FICHAS en costosLote3Datos.js). Los datos de la ficha se guardan por obra, al instante.
import { useState, useEffect } from "react";
import { decidirDistribucion } from "./sstBase";
import { FICHAS, fichaInicial, escribirFichaEnHoja, faltantes3, validar3 } from "./costosLote3Datos";
import { leerCabecera, guardarCabecera } from "./cpLibros";
import { num, texto, nombreTipoProyecto } from "./cpBase";
import { useObra, PanelObra, CampoDinero, useFirmas, CifrasResumen } from "./cpComunes";
import { ChipsOpcion } from "./sstControles";
import {
  NAVY, PAPER, LINE, cargarPlantilla, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";

const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const cargar = (F, id) => ({ corte: hoyISO(), ...fichaInicial(F.id), ...(id ? leerCabecera(F.id, id) : {}) });

export default function FormularioCostosFicha({ formato, onVolver }) {
  const F = FICHAS[formato];
  const h = useObra();
  const [ficha, setFicha] = useState(() => ({ id: h.id, d: cargar(F, h.id) }));
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoTraer, setAvisoTraer] = useState("");
  const firmas = useFirmas(F.id, ["elabora", "revisa"]);
  const memoria = useMemoriaSST();
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));

  useEffect(() => { if (ficha.id !== h.id) setFicha({ id: h.id, d: cargar(F, h.id) }); }, [h.id]);   // eslint-disable-line
  useEffect(() => { if (ficha.id && ficha.id === h.id) guardarCabecera(F.id, ficha.id, ficha.d); }, [ficha]);   // eslint-disable-line

  const o = h.obra || {};
  const sinObra = !h.obra || h.creando;
  const d = ficha.d;
  const poner = (patch) => setFicha((cur) => ({ ...cur, d: { ...cur.d, ...patch } }));
  const c = F.calc(d);

  function traer() {
    const patch = F.traer.fn(h.id, o, d);
    const llenos = Object.keys(patch).filter((k) => texto(patch[k]) !== "");
    if (!llenos.length) { setAvisoTraer("No encontré datos en la app para esta obra (contrato, actas, facturas…)."); return; }
    poner(patch);
    setAvisoTraer(`Se trajeron ${llenos.length} datos de la app. Puedes corregir cualquiera.`);
  }
  const datosHoja = () => ({ obra: o, tipo: nombreTipoProyecto(), datos: d, firmas: { elabora: firmas.f.elabora, revisa: firmas.f.revisa } });

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const dat = h.obra ? datosHoja() : { obra: {}, datos: { ...d }, firmas: {} };
    const fal = validar3(F.id, dat);
    if (fal.length) { setMensajeError("Falta completar: " + fal.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(faltantes3(F.id, dat)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla(F.plantilla, F.hoja);
      const decision = decidirDistribucion(F.descubrir(ws), F.celdas());
      escribirFichaEnHoja(F.id, ws, dat, decision.celdas);
      setAvisoGeneracion(decision.aviso || "");
      await descargarLibro(workbook, `${F.archivo}_${textoParaArchivo(o.proyecto, 24)}_${hoyISO()}.xlsx`);
      memoria.recordarUso({ personas: [[firmas.f.elabora.nombre, firmas.f.elabora.cargo], [firmas.f.revisa.nombre, firmas.f.revisa.cargo]] });
      setGenerado(`✓ Excel descargado${c.estado ? ` (estado: ${c.estado})` : c.resultado ? ` (${c.resultado})` : ""}.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function campo(f) {
    const valor = d[f.k] === undefined || d[f.k] === null ? "" : d[f.k];
    const act = (v) => poner({ [f.k]: v });
    if (f.tipo === "dinero") return <CampoDinero key={f.k} label={f.label} value={valor} onChange={act} />;
    if (f.tipo === "num" || f.tipo === "pct") return <Campo key={f.k} label={f.label} value={valor} inputMode="decimal" placeholder={f.ph} onChange={(v) => act(soloNumero(v))} />;
    if (f.tipo === "fecha") return <Campo key={f.k} label={f.label} type="date" value={valor} onChange={act} />;
    if (f.tipo === "chips") return <ChipsOpcion key={f.k} label={f.label} nombre={f.label} value={valor} opciones={f.opciones} pequeno onChange={act} />;
    if (f.tipo === "area") return <AreaTexto key={f.k} label={f.label} value={valor} placeholder={f.ph} filas={5} onChange={act} />;
    return <Campo key={f.k} label={f.label} value={valor} placeholder={f.ph} onChange={act} />;
  }
  function campos(lista) {
    const out = []; let par = [];
    const vaciar = () => { if (par.length) { out.push(<div key={`g${out.length}`} className="grid grid-cols-2 gap-2">{par}</div>); par = []; } };
    lista.forEach((f) => { const el = campo(f); if (f.mitad) par.push(el); else { vaciar(); out.push(el); } });
    vaciar();
    return out;
  }
  const textoCab = (f) => (f.tipo === "fecha"
    ? <Campo key={f.k} label={f.label} type="date" value={d[f.k] || ""} onChange={(v) => poner({ [f.k]: v })} />
    : <Campo key={f.k} label={f.label} value={d[f.k] || ""} placeholder={f.ph} onChange={(v) => poner({ [f.k]: v })} />);

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo={F.titulo} subtitulo={F.subtitulo} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Obra y contrato"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <PanelObra h={h} campos={["contrato", "contratante"]} />
            {!sinObra && F.cabecera.map(textoCab)}
            {!sinObra && (
              <>
                <button type="button" onClick={traer} className="w-full text-left text-[12px] font-semibold p-2 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>{F.traer.texto}</button>
                {avisoTraer && <div className="text-[11.5px]" style={{ color: /^Se trajeron/.test(avisoTraer) ? "#2E7D4F" : "#B3401F" }}>{avisoTraer}</div>}
              </>
            )}
          </div>
        </Seccion>

        {F.secciones.map((s, n) => {
          const lineas = s.resumen(c);
          return (
            <Seccion key={s.id} id={s.id} titulo={`${n + 2}. ${s.titulo}`} subtitulo={s.sub(c)} abierta={abierta === s.id} onToggle={alternar}>
              {sinObra ? <div className="text-[12px]" style={{ color: "#8A8F99" }}>Primero elige o crea la obra en la sección 1.</div> : (
                <div className="space-y-2.5">
                  {campos(s.campos)}
                  {lineas.length > 0 && (
                    <div className="text-[11.5px] px-3 py-2 rounded-md leading-relaxed" style={{ background: "#EAF4EC", color: "#1D6B3A" }}>
                      {lineas.map(([t, v], k) => <div key={k}>{t}: <b>{v}</b></div>)}
                    </div>
                  )}
                </div>
              )}
            </Seccion>
          );
        })}

        <Seccion id="resumen" titulo={`${F.secciones.length + 2}. Resumen`} subtitulo="Se calcula con lo registrado" abierta={abierta === "resumen"} onToggle={alternar}>
          <CifrasResumen cifras={F.cifras(c)} />
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>{F.ayuda}</div>
        </Seccion>

        <Seccion id="firmas" titulo={`${F.secciones.length + 3}. Firmas`} subtitulo="Quién elabora y quién revisa" abierta={abierta === "firmas"} onToggle={alternar}>
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
