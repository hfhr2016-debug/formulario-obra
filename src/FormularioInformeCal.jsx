// FormularioInformeCal.jsx — Informe mensual de calidad: se arma solo con lo registrado en los formatos de Calidad de la obra y el mes elegidos.
import { useState, useMemo, useEffect } from "react";
import { hoyISO } from "./calBase";
import { useObraCal, PanelObraCal } from "./calComunes";
import { informeMensual, mesActual, MESES, nombreMes } from "./calInforme";
import { escribirInforme } from "./informeExcel";
import { LOGO_MARCA_AGUA } from "./marcaLogo";
import { CifrasResumen } from "./cpComunes";
import { SeccionFotosAnexo, agregarHojaFotos } from "./fotosAnexo";
import { NAVY, PAPER, LINE, nuevoLibro, descargarLibro, textoParaArchivo, useMemoriaSST, BloqueProfesional, EncabezadoFormulario, BarraGenerar, Seccion, Lista, AreaTexto } from "./sstComunes";

const CLAVE = (obraId, ym) => `ryr_cal_informe_${obraId}_${ym}`;
const leer = (obraId, ym) => { try { return JSON.parse(localStorage.getItem(CLAVE(obraId, ym)) || "null") || {}; } catch (e) { return {}; } };

export default function FormularioInformeCal({ onVolver }) {
  const h = useObraCal();
  const memoria = useMemoriaSST();
  const [ym, setYm] = useState(mesActual());
  const [obs, setObs] = useState("");
  const [firmas, setFirmas] = useState({});
  const [fotos, setFotos] = useState([]);
  const [abierta, setAbierta] = useState("");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const sinObra = !h.obra || h.creando;
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const anio = Number(ym.slice(0, 4)); const mes = Number(ym.slice(5, 7));
  const anios = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  useEffect(() => {     // lo escrito (conclusiones y firmas) se recuerda por obra y mes
    if (!h.id) return;
    const g = leer(h.id, ym); setObs(g.obs || ""); setFirmas(g.firmas || {}); setFotos([]); setGenerado(""); setMensajeError("");
  }, [h.id, ym]);
  useEffect(() => { if (h.id) { try { localStorage.setItem(CLAVE(h.id, ym), JSON.stringify({ obs, firmas })); } catch (e) { /* sin almacenamiento */ } } }, [obs, firmas]);   // eslint-disable-line

  const inf = useMemo(() => (h.obra && !h.creando ? informeMensual(h.obra, ym) : null), [h.obra, h.creando, ym]);   // eslint-disable-line

  async function generar() {
    setMensajeError(""); setGenerado(""); setGenerando(true);
    try {
      const wb = nuevoLibro();
      escribirInforme(wb, inf, { obraDatos: h.obra, observaciones: obs, firmas, logoBase64: String(LOGO_MARCA_AGUA).split(",")[1] || null });
      const nFotos = await agregarHojaFotos(wb, { titulo: "Informe mensual de calidad", proyecto: h.obra.proyecto, fecha: nombreMes(ym), fotos });
      await descargarLibro(wb, `Informe_Calidad_${textoParaArchivo(h.obra.proyecto, 24)}_${ym}.xlsx`);
      memoria.recordarUso({ personas: [[(firmas.elaboro || {}).nombre, (firmas.elaboro || {}).cargo], [(firmas.reviso || {}).nombre, (firmas.reviso || {}).cargo]] });
      setGenerado(`✓ Informe de ${nombreMes(ym)} descargado${nFotos ? ` (con ${nFotos} ${nFotos === 1 ? "foto" : "fotos"})` : ""}.`);
    } catch (err) { console.error(err); setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido")); }
    finally { setGenerando(false); }
  }
  const persona = (k, titulo) => (
    <div key={k}>
      <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>{titulo}</div>
      <BloqueProfesional memoria={memoria} etqNombre={`Nombre — ${titulo}`} etqCargo={`Cargo — ${titulo}`} nombre={(firmas[k] || {}).nombre} cargo={(firmas[k] || {}).cargo}
        onChange={(patch) => setFirmas((f) => ({ ...f, [k]: { ...(f[k] || {}), ...patch } }))} />
    </div>
  );
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Informe Mensual de Calidad" subtitulo="Resumen del mes con lo registrado en los formatos" onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="obra" titulo="Obra" subtitulo={h.obra ? `${h.obra.proyecto}${h.obra.contrato ? " · Contrato " + h.obra.contrato : ""}` : "Elige o crea la obra"} abierta={sinObra} onToggle={() => {}}>
          <PanelObraCal h={h} campos={["contrato", "ubicacion", "contratista"]} />
        </Seccion>
        {!sinObra && inf && (
          <div className="pt-3">
            <div className="flex gap-2 mb-3" data-periodo>
              <div className="flex-1"><Lista label="Mes" value={MESES[mes - 1]} opciones={MESES} onChange={(v) => setYm(`${anio}-${String(MESES.indexOf(v) + 1).padStart(2, "0")}`)} /></div>
              <div className="flex-1"><Lista label="Año" value={String(anio)} opciones={anios.includes(String(anio)) ? anios : [String(anio), ...anios]} onChange={(v) => setYm(`${v}-${String(mes).padStart(2, "0")}`)} /></div>
            </div>
            <div className="text-[11px] mb-2" style={{ color: "#6B7280" }}>Corte: {inf.corte.split("-").reverse().join("/")}. Los datos salen de los registros de este dispositivo ya sincronizados.</div>
            <CifrasResumen cifras={inf.cifras} />
            <div className="mt-3">
              {inf.secciones.map((s, i) => (
                <Seccion key={s.titulo} id={`s${i}`} titulo={s.titulo} subtitulo={`${s.filas[0][0]}: ${s.filas[0][1]}`} abierta={abierta === `s${i}`} onToggle={alternar}>
                  <div className="space-y-1" data-seccion={i + 1}>
                    {s.filas.map(([c, v, n]) => (
                      <div key={c} data-concepto={c} data-valor={String(v)} className="flex items-start gap-2 text-[12px] py-1 border-b" style={{ borderColor: LINE }}>
                        <div className="flex-1" style={{ color: NAVY }}>{c}{n ? <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>{n}</div> : null}</div>
                        <div className="font-bold" style={{ color: NAVY }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Seccion>
              ))}
              <Seccion id="atencion" titulo="Atención requerida" subtitulo={`${inf.detalle.length} ${inf.detalle.length === 1 ? "caso" : "casos"}`} abierta={abierta === "atencion"} onToggle={alternar} contador={inf.detalle.length}>
                {inf.detalle.length === 0 && <div className="text-[12px]" style={{ color: "#1D6B3A" }}>Sin novedades en este periodo.</div>}
                <div className="space-y-1.5" data-atencion>
                  {inf.detalle.slice(0, 60).map((d, i) => (
                    <div key={i} className="text-[11.5px] px-2.5 py-1.5 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}><span className="font-semibold">{d[0]} · {d[2]}</span><div>{d[1]}</div>{d[3] ? <div>{d[3]}</div> : null}</div>
                  ))}
                </div>
              </Seccion>
              <Seccion id="obs" titulo="Observaciones y conclusiones" subtitulo={obs ? "Escritas" : "Opcional"} abierta={abierta === "obs"} onToggle={alternar}>
                <AreaTexto label="Observaciones y conclusiones del periodo" value={obs} filas={5} onChange={setObs} />
              </Seccion>
              <Seccion id="fotos" titulo="Fotos (opcional)" subtitulo={fotos.length ? `${fotos.length} para el Excel` : "Salen en una hoja «Fotos»"} abierta={abierta === "fotos"} onToggle={alternar} contador={fotos.length}>
                <SeccionFotosAnexo fotos={fotos} setFotos={setFotos} />
              </Seccion>
              <Seccion id="firmas" titulo="Firmas" subtitulo="Se recuerdan por obra y mes" abierta={abierta === "firmas"} onToggle={alternar}>
                <div className="space-y-2.5">{persona("elaboro", "Elaboró — ingeniero / inspector de calidad")}{persona("reviso", "Revisó — residente de obra / gerencia")}</div>
              </Seccion>
            </div>
          </div>
        )}
      </div>
      {!sinObra && inf && <BarraGenerar mensajeError={mensajeError} aviso="" mensajeOk={generado} generando={generando} textoBoton="Generar Excel del informe mensual" onGenerar={generar} />}
    </div>
  );
}
