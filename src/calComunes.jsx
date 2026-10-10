// Piezas de pantalla comunes a los formatos de Calidad: la obra (maestro propio de Calidad).
import { useState } from "react";
import { NAVY, LINE, Campo, Lista } from "./sstComunes";
import { listarObras as listarObrasCP, proyectosConocidos } from "./cpBase";
import { texto, claveNombre, obraCalVacia, listarObrasCal, obtenerObraCal, guardarObraCal } from "./calBase";

export const NUEVA_OBRA_CAL = "➕ Nueva obra…";

// Obra con la que se trabaja. Al abrir un formato NO se carga ninguna: se elige o se crea (así no se mezclan datos de obras distintas).
export function useObraCal() {
  const [obra, setObra] = useState(null);
  const [creando, setCreando] = useState(true);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [aviso, setAviso] = useState("");
  function crear(nombre) {
    const n = texto(nombre);
    if (!n) { setAviso("Escribe el nombre del proyecto para crear la obra."); return; }
    const ya = obtenerObraCal(claveNombre(n));
    if (ya) { setObra(guardarObraCal(ya)); setCreando(false); setNombreNuevo(""); setAviso(`La obra «${ya.proyecto}» ya existía: se abrió.`); return; }
    const cp = listarObrasCP().find((o) => claveNombre(o.proyecto) === claveNombre(n));     // lo que Control Presupuestal ya sabe de esta obra
    const nueva = guardarObraCal({ ...obraCalVacia(n), contrato: cp ? texto(cp.contrato) : "", contratante: cp ? texto(cp.contratante) : "" });
    setObra(nueva); setCreando(false); setNombreNuevo(""); setAviso(cp && cp.contrato ? "Obra creada; el contrato salió de Control Presupuestal." : "Obra creada.");
  }
  function elegir(nombre) {
    if (nombre === NUEVA_OBRA_CAL) { setCreando(true); setAviso(""); return; }
    const o = listarObrasCal().find((x) => x.proyecto === nombre);
    if (o) { setObra(guardarObraCal(o)); setCreando(false); setAviso(""); } else if (texto(nombre)) crear(nombre);
  }
  function cambiar(patch) {
    setObra((cur) => { if (!cur) return cur; const sig = { ...cur, ...patch }; guardarObraCal(sig); return sig; });
  }
  return { obra, creando, nombreNuevo, setNombreNuevo, aviso, crear, elegir, cambiar, id: obra ? obra.id : "" };
}

export function PanelObraCal({ h, campos = [] }) {
  const { obra } = h;
  const conocidos = proyectosConocidos();
  const propias = listarObrasCal().map((o) => o.proyecto);
  const nombres = [...propias, ...conocidos.filter((p) => !propias.some((x) => claveNombre(x) === claveNombre(p)))];
  const mapa = {
    contrato: ["Contrato N°", ""], contratante: ["Contratante", "Quien contrata la obra"], ubicacion: ["Ubicación de la obra", "Ciudad, barrio o dirección"], contratista: ["Contratista / empresa", ""],
  };
  return (
    <div className="space-y-2.5">
      {(h.creando || !obra) ? (
        <div className="p-2.5 rounded-lg space-y-2" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
          <Campo label="Proyecto / obra" value={h.nombreNuevo} placeholder="Nombre de la obra" onChange={h.setNombreNuevo} />
          {nombres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {nombres.map((p) => <button key={p} type="button" onClick={() => h.crear(p)} className="text-[11.5px] px-2.5 py-1 rounded-full border" style={{ borderColor: LINE, color: NAVY, background: "white" }}>📋 {p}</button>)}
            </div>
          )}
          <button type="button" onClick={() => h.crear(h.nombreNuevo)} className="w-full text-center py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: NAVY }}>Crear obra</button>
          {obra && <button type="button" onClick={() => h.elegir(obra.proyecto)} className="w-full text-center text-[11.5px]" style={{ color: NAVY }}>Cancelar</button>}
        </div>
      ) : (
        <div>
          <Lista label="Proyecto / obra" value={obra.proyecto} onChange={h.elegir} opciones={[...nombres, NUEVA_OBRA_CAL]} />
          {nombres.length > 1 && <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>Para pasar a otra obra, elígela en esta lista; no hace falta salir del formato.</div>}
        </div>
      )}
      {h.aviso && <div className="text-[11px]" style={{ color: "#2E7D4F" }}>{h.aviso}</div>}
      {obra && !h.creando && campos.map((k) => mapa[k] && <Campo key={k} label={mapa[k][0]} value={obra[k] || ""} placeholder={mapa[k][1]} onChange={(v) => h.cambiar({ [k]: v })} />)}
    </div>
  );
}
