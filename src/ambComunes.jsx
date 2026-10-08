// ambComunes.jsx — piezas comunes de los formatos de Gestión Ambiental (se apoyan en las de SST).
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { leerJSON, Lista, Campo, NAVY, GOLD, LINE } from "./sstComunes";
import { FilaVerificacion } from "./sstControles";
import { RESPUESTAS_AMB, hallazgoNuevo, hallazgosConDatos, noCumplenPendientes, textoHallazgoDe } from "./ambBase";

export const CLAVE_AMB_FICHA = "ryr_amb_ficha";               // resumen de la ficha ambiental de cada proyecto
export const CLAVE_AMB_FICHA_DATOS = "ryr_amb_ficha_datos";   // datos completos, para volver a editarla
export const CLAVE_AMB_MANIFIESTOS = "ryr_amb_manifiestos";   // resumen de cada manifiesto de RCD (lo trae el Registro de Residuos)
export const CLAVE_AMB_RESIDUOS = "ryr_amb_residuos";
export const CLAVE_AMB_CONSUMOS = "ryr_amb_consumos";
export const CLAVE_AMB_VERTIMIENTOS = "ryr_amb_vertimientos";
export const CLAVE_AMB_EMISIONES = "ryr_amb_emisiones";

// Obras conocidas: primero las de la Ficha Ambiental y luego las de la Ficha SST (sin repetir el nombre)
export function obrasConocidas() {
  const amb = leerJSON(CLAVE_AMB_FICHA, []).map((f) => ({ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.municipio || f.ubicacion || "", origen: "ambiental" }));
  const sst = leerJSON("ryr_sst_ficha", []).map((f) => ({ proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion || "", origen: "SST" }));
  const vistos = new Set(); const todas = [];
  for (const o of [...amb, ...sst]) {
    const k = String(o.proyecto || "").trim().toLowerCase();
    if (!k || vistos.has(k)) continue;
    vistos.add(k); todas.push(o);
  }
  return todas;
}

// "Traer los datos de la obra": proyecto, contratista y ubicación
export function TraerDeFichaAmb({ onTraer }) {
  const [aviso, setAviso] = useState("");
  const obras = obrasConocidas();
  if (!obras.length) return null;
  const traer = (o) => { onTraer({ proyecto: o.proyecto, contratista: o.contratista, ubicacion: o.ubicacion }); setAviso(`Se trajeron los datos de «${o.proyecto}».`); };
  return (
    <div className="p-2 rounded-lg" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
      {obras.length === 1 ? (
        <button type="button" onClick={() => traer(obras[0])} className="w-full text-left text-[12px] font-semibold" style={{ color: NAVY }}>📋 Traer los datos de la obra · {obras[0].proyecto}</button>
      ) : (
        <Lista label="📋 Traer los datos de la obra" value="" onChange={(v) => { const o = obras.find((x) => x.proyecto === v); if (o) traer(o); }} opciones={obras.map((x) => x.proyecto)} />
      )}
      {aviso && <div className="text-[11px] mt-1" style={{ color: "#2E7D4F" }}>{aviso}</div>}
    </div>
  );
}

// Gestores y transportadores que la Ficha Ambiental registró para la obra (el más reciente), agrupados por tipo
export function gestoresDeFicha(proyecto = "") {
  const datos = leerJSON(CLAVE_AMB_FICHA_DATOS, []);
  const g = datos.find((x) => x.datos && proyecto && String(x.datos.proyecto || "").trim().toLowerCase() === String(proyecto).trim().toLowerCase()) || datos[0];
  return g && g.datos && Array.isArray(g.datos.gestores) ? g.datos.gestores.filter((x) => String(x.empresa || "").trim()) : [];
}

// Lista de verificación Sí / No / N/A con observación (la observación aparece al responder «No»)
export function ListaVerificacionAmb({ items, respuestas, observaciones, onRespuesta, onObservacion }) {
  return (
    <div>
      {items.map((t, i) => (
        <FilaVerificacion key={i} numero={i + 1} texto={t} valor={respuestas[i] || ""} onChange={(v) => onRespuesta(i, v)} opciones={RESPUESTAS_AMB}
          observacion={observaciones[i] || ""} onObservacion={(v) => onObservacion(i, v)} />
      ))}
    </div>
  );
}

// Hallazgos y acciones: tarjetas con hallazgo, acción, responsable y fecha límite; los puntos «No» se pasan con un toque
export function HallazgosAmb({ hallazgos, onChange, max, items, respuestas, observaciones, aviso, onAviso }) {
  const actualizar = (i, patch) => onChange(hallazgos.map((h, k) => (k === i ? { ...h, ...patch } : h)));
  const quitar = (i) => { onChange(hallazgos.filter((_, k) => k !== i)); onAviso(""); };
  const pendientes = items ? noCumplenPendientes(items, respuestas, hallazgos) : [];
  const lleno = () => onAviso(`Esta hoja tiene espacio para ${max} hallazgos. Si hay más, genera otra hoja para el resto.`);
  function agregar() { if (hallazgos.length >= max) return lleno(); onAviso(""); onChange([...hallazgos, hallazgoNuevo()]); }
  function pasarNoCumplen() {
    const base = hallazgos.filter((h) => hallazgosConDatos([h]).length);
    const libres = max - base.length;
    if (libres <= 0) return lleno();
    const toma = pendientes.slice(0, libres);
    onChange([...base, ...toma.map((x) => hallazgoNuevo({ hallazgo: textoHallazgoDe(x.t, observaciones[x.i]), origen: `p${x.i}` }))]);
    onAviso(toma.length < pendientes.length ? `Se pasaron ${toma.length}; los demás no caben en esta hoja.` : "");
  }
  return (
    <div>
      {pendientes.length > 0 && (
        <button type="button" onClick={pasarNoCumplen} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-2.5" style={{ background: NAVY }}>
          ⚠ Pasar {pendientes.length} {pendientes.length === 1 ? "punto «No»" : "puntos «No»"} a hallazgos
        </button>
      )}
      {hallazgos.map((h, i) => (
        <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: "#EEF1F6" }}>
          <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Hallazgo {i + 1}</div>
          <div className="space-y-2">
            <Campo label="Hallazgo" value={h.hallazgo} onChange={(v) => actualizar(i, { hallazgo: v })} />
            <Campo label="Acción a tomar" value={h.accion} onChange={(v) => actualizar(i, { accion: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Responsable del hallazgo" value={h.responsable} onChange={(v) => actualizar(i, { responsable: v })} />
              <Campo label="Fecha límite" type="date" value={h.fechaLimite} onChange={(v) => actualizar(i, { fechaLimite: v })} />
            </div>
          </div>
          <button type="button" onClick={() => quitar(i)} aria-label={`Quitar hallazgo ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
        <Plus size={14} /> Agregar hallazgo
      </button>
      {aviso && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{aviso}</div>}
    </div>
  );
}
