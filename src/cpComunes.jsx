// Piezas de pantalla comunes a los formularios de Control Presupuestal (obra activa, dinero, firmas guardadas).
import { useState, useEffect } from "react";
import { NAVY, GOLD, LINE, leerJSON, guardarJSON, Campo, Lista, etiquetaCls, claseInput, estiloInput } from "./sstComunes";
import {
  listarObras, obtenerObra, guardarObra, obraVacia, obraActivaId, proyectosConocidos, datosDeFichaTecnica, claveObra, nombreTipoProyecto, miles, texto,
} from "./cpBase";

export const NUEVA_OBRA = "➕ Nueva obra…";

// Obra con la que se está trabajando. Cada cambio se guarda al instante (la obra es el "maestro" que comparten los cuatro formatos).
export function useObra() {
  // Al abrir un formato NO se carga ninguna obra: el proyecto, el contrato y el contratante empiezan vacíos y se escriben (o se elige una obra ya conocida).
  const [obra, setObra] = useState(null);
  const [creando, setCreando] = useState(true);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [aviso, setAviso] = useState("");
  function crear(nombre) {
    const n = texto(nombre);
    if (!n) { setAviso("Escribe el nombre del proyecto para crear la obra."); return; }
    const existente = obtenerObra(claveObra(n));
    if (existente) { guardarObra(existente); setObra(existente); setCreando(false); setNombreNuevo(""); setAviso(`La obra «${existente.proyecto}» ya existía: se abrió.`); return; }
    const ficha = datosDeFichaTecnica(n);
    const nueva = guardarObra({ ...obraVacia(n), contrato: ficha ? ficha.contrato : "" });
    setObra(nueva); setCreando(false); setNombreNuevo(""); setAviso(ficha && ficha.contrato ? `Obra creada; el N° de contrato salió de la Ficha Técnica.` : "Obra creada.");
  }
  function elegir(nombre) {
    if (nombre === NUEVA_OBRA) { setCreando(true); setAviso(""); return; }
    const o = listarObras().find((x) => x.proyecto === nombre);
    if (o) { guardarObra(o); setObra(o); setCreando(false); setAviso(""); }
    else if (texto(nombre)) crear(nombre);          // una obra que la app conoce (Ficha Técnica, SST, Ambiental) pero que aún no se ha abierto aquí
  }
  function cambiar(patch) {
    setObra((cur) => {
      if (!cur) return cur;
      const sig = { ...cur, ...patch };
      guardarObra(sig);
      return sig;
    });
  }
  return { obra, creando, nombreNuevo, setNombreNuevo, aviso, crear, elegir, cambiar, id: obra ? obra.id : "" };
}

// Sección «Datos generales»: elegir o crear la obra y completar los datos del contrato que pida cada formato.
export function PanelObra({ h, campos = [] }) {
  const { obra } = h;
  const conocidos = proyectosConocidos();
  // Todas las obras que se pueden abrir: las ya creadas aquí y las que la app conoce por otras gestiones
  const nombres = [...listarObras().map((o) => o.proyecto), ...conocidos.filter((p) => !listarObras().some((o) => claveObra(o.proyecto) === claveObra(p)))];
  const dinero = (k, label) => <CampoDinero key={k} label={label} value={obra[k]} onChange={(v) => h.cambiar({ [k]: v })} />;
  const porc = (k, label, ayuda) => <Campo key={k} label={label} value={obra[k]} inputMode="decimal" placeholder={ayuda} onChange={(v) => h.cambiar({ [k]: v.replace(/[^0-9.,]/g, "") })} />;
  const mapa = {
    contrato: () => <Campo key="contrato" label="Contrato N°" value={obra.contrato} onChange={(v) => h.cambiar({ contrato: v })} />,
    contratante: () => <Campo key="contratante" label="Contratante" value={obra.contratante} placeholder="Quien contrata la obra" onChange={(v) => h.cambiar({ contratante: v })} />,
    fechaContrato: () => <Campo key="fechaContrato" label="Fecha del contrato" type="date" value={obra.fechaContrato} onChange={(v) => h.cambiar({ fechaContrato: v })} />,
    plazo: () => <Campo key="plazo" label="Plazo del contrato (días)" value={obra.plazo} inputMode="numeric" onChange={(v) => h.cambiar({ plazo: v.replace(/[^0-9]/g, "") })} />,
    valorContrato: () => dinero("valorContrato", "Valor del contrato"),
    aiu: () => porc("aiu", "AIU del contrato (%)", "Ej. 25"),
  };
  return (
    <div className="space-y-2.5">
      {(h.creando || !obra) ? (
        <div className="p-2.5 rounded-lg space-y-2" style={{ background: "#F2F6FB", border: `1px solid ${LINE}` }}>
          <Campo label="Proyecto / obra" value={h.nombreNuevo} placeholder="Nombre de la obra" onChange={h.setNombreNuevo} />
          {conocidos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {conocidos.map((p) => (
                <button key={p} type="button" onClick={() => h.crear(p)} className="text-[11.5px] px-2.5 py-1 rounded-full border" style={{ borderColor: LINE, color: NAVY, background: "white" }}>📋 {p}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => h.crear(h.nombreNuevo)} className="w-full text-center py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: NAVY }}>Crear obra</button>
          {obra && <button type="button" onClick={() => h.elegir(obra.proyecto)} className="w-full text-center text-[11.5px]" style={{ color: NAVY }}>Cancelar</button>}
        </div>
      ) : (
        <div>
          <Lista label="Proyecto / obra" value={obra.proyecto} onChange={h.elegir} opciones={[...nombres, NUEVA_OBRA]} />
          {nombres.length > 1 && <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>Para pasar a otra obra, elígela en esta lista; no hace falta salir del formato.</div>}
        </div>
      )}
      {h.aviso && <div className="text-[11px]" style={{ color: "#2E7D4F" }}>{h.aviso}</div>}
      {obra && !h.creando && (
        <>
          <div className="text-[11px] px-2.5 py-1.5 rounded" style={{ background: "#FFF8E8", color: NAVY }}>Tipo de proyecto: <b>{nombreTipoProyecto()}</b> <span style={{ color: "#8A8F99" }}>(el que está activo en la app)</span></div>
          {campos.map((c) => (mapa[c] ? mapa[c]() : null))}
        </>
      )}
    </div>
  );
}

// Campo de dinero: muestra los puntos de miles mientras se escribe y guarda solo el número (con "-" para notas crédito o devoluciones).
export function CampoDinero({ label, value, onChange, placeholder, permitirNegativo = true }) {
  const mostrar = miles(value);
  return (
    <div className="w-full" data-campo={label}>
      <label className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 text-[13px]" style={{ top: "50%", transform: "translateY(-50%)", color: "#8A8F99" }}>$</span>
        <input
          type="text" inputMode={permitirNegativo ? "text" : "numeric"} value={mostrar} placeholder={placeholder}
          onChange={(e) => {
            let t = e.target.value.replace(/\./g, "");
            const neg = permitirNegativo && t.trim().startsWith("-");
            t = t.replace(/[^0-9,]/g, "");
            const [ent, ...resto] = t.split(",");
            onChange((neg ? "-" : "") + ent + (resto.length ? "," + resto.join("").slice(0, 2) : ""));
          }}
          className={claseInput} style={{ ...estiloInput, paddingLeft: 22 }}
          onFocus={(e) => (e.target.style.borderColor = GOLD)} onBlur={(e) => (e.target.style.borderColor = LINE)}
        />
      </div>
    </div>
  );
}

// Nombres y cargos de quienes firman, guardados por formato (así no se escriben cada vez)
export function useFirmas(formato, claves) {
  const clave = `ryr_cp_firmas_${formato}`;
  const [f, setF] = useState(() => { const g = leerJSON(clave, {}); const base = {}; claves.forEach((k) => { base[k] = { nombre: "", cargo: "", ...(g[k] || {}) }; }); return base; });
  useEffect(() => { guardarJSON(clave, f); }, [f]);   // eslint-disable-line
  const cambiar = (k) => (patch) => setF((cur) => ({ ...cur, [k]: { ...cur[k], ...(patch.nombre !== undefined ? { nombre: patch.nombre } : {}), ...(patch.cargo !== undefined ? { cargo: patch.cargo } : {}) } }));
  return { f, cambiar };
}

// Cuadro de resumen (cifras clave en una fila)
export function CifrasResumen({ cifras }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {cifras.map((c) => (
        <div key={c.t} className="rounded-lg px-2.5 py-2" style={{ background: c.fondo || "#F2F6FB", border: `1px solid ${LINE}` }}>
          <div className="text-[9.5px] uppercase tracking-wide" style={{ color: "#8A8F99" }}>{c.t}</div>
          <div className="text-[13px] font-bold" style={{ color: c.color || NAVY }}>{c.v === "" || c.v === null || c.v === undefined ? "—" : c.v}</div>
        </div>
      ))}
    </div>
  );
}
