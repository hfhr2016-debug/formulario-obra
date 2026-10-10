// PanelVencimientos.jsx — «¿qué se me está venciendo?»: cilindros por ensayar, pendientes, no conformidades, garantías y listado maestro, de todas las obras.
import { useMemo, useState } from "react";
import { listarObrasCal, hoyISO } from "./calBase";
import { vencimientos, resumenVenc, TIPOS_VENC } from "./calVencimientos";
import { NAVY, GOLD, PAPER, LINE, EncabezadoFormulario } from "./sstComunes";

const COLOR = { vencido: ["#FDEDEA", "#B3401F"], hoy: ["#FFF1DD", "#9A5B00"], pronto: ["#FFF8E8", "#7A5A00"] };
const ROTULO = { vencido: "Vencido", hoy: "Hoy", pronto: "Por vencer" };

export default function PanelVencimientos({ onVolver, onIr }) {
  const obras = useMemo(() => listarObrasCal(), []);
  const [obraSel, setObraSel] = useState("todas");
  const items = useMemo(() => vencimientos(obraSel === "todas" ? null : [obraSel], hoyISO()), [obraSel]);
  const r = resumenVenc(items);
  const grupos = Object.keys(TIPOS_VENC).map((t) => ({ t, ...TIPOS_VENC[t], lista: items.filter((i) => i.tipo === t) })).filter((g) => g.lista.length);
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Vencimientos" subtitulo="Lo que vence o ya venció en Calidad" onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-10 pt-3">
        {obras.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3" data-obras>
            {[{ id: "todas", proyecto: "Todas las obras" }, ...obras].map((o) => (
              <button key={o.id} type="button" data-obra={o.id} onClick={() => setObraSel(o.id)} className="text-[11.5px] px-2.5 py-1 rounded-full border" style={{ borderColor: obraSel === o.id ? NAVY : LINE, background: obraSel === o.id ? NAVY : "white", color: obraSel === o.id ? "white" : NAVY }}>{o.proyecto}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-3" data-resumen>
          {[["Vencidos", r.vencidos, "#B3401F"], ["Vencen hoy", r.hoy, "#9A5B00"], ["Por vencer", r.pronto, "#7A5A00"]].map(([t, v, c]) => (
            <div key={t} className="rounded-lg p-2 text-center" style={{ background: PAPER }}><div className="text-[18px] font-bold" style={{ color: c }}>{v}</div><div className="text-[10.5px]" style={{ color: "#6B7280" }}>{t}</div></div>
          ))}
        </div>
        {obras.length === 0 && <div className="text-[12px]" style={{ color: "#8A8F99" }}>Aún no hay obras con registros de Calidad.</div>}
        {obras.length > 0 && items.length === 0 && <div className="text-[12.5px] px-3 py-3 rounded-lg" style={{ background: "#EAF4EC", color: "#1D6B3A" }} data-sin>✓ No hay nada vencido ni por vencer en los próximos 3 días.</div>}
        {grupos.map((g) => (
          <div key={g.t} className="mb-4" data-grupo={g.t}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[12px] font-semibold" style={{ color: NAVY }}>{g.emoji} {g.titulo} ({g.lista.length})</div>
              <button type="button" onClick={() => onIr(g.vista)} className="text-[11px] underline" style={{ color: NAVY }}>Abrir formato</button>
            </div>
            <div className="space-y-1.5">
              {g.lista.slice(0, 30).map((i, k) => (
                <button key={k} type="button" data-venc={i.estado} onClick={() => onIr(i.vista)} className="w-full text-left text-[11.5px] px-2.5 py-1.5 rounded" style={{ background: COLOR[i.estado][0], color: COLOR[i.estado][1] }}>
                  <div className="flex items-center gap-2"><span className="font-semibold flex-1">{i.titulo}</span><span className="text-[10px] font-bold uppercase">{ROTULO[i.estado]}</span></div>
                  <div>{obraSel === "todas" && obras.length > 1 ? `${i.obra} · ` : ""}{i.detalle}</div>
                </button>
              ))}
              {g.lista.length > 30 && <div className="text-[11px]" style={{ color: "#8A8F99" }}>Y {g.lista.length - 30} más.</div>}
            </div>
          </div>
        ))}
        <div className="text-[10.5px] mt-2" style={{ color: GOLD }}>Se avisa desde 3 días antes (garantías, desde 30). Solo se ven los datos de este dispositivo ya sincronizados.</div>
      </div>
    </div>
  );
}
