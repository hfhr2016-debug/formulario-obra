// AvisosAmb.jsx — recuadro de avisos que ayudan a diligenciar (nunca impiden generar el Excel).
const COLORES = { alerta: ["#FDEDEA", "#B3401F", "⛔"], aviso: ["#FFF8E8", "#7A5A00", "⚠️"], info: ["#EEF3FA", "#1B2A45", "ℹ️"], ok: ["#EAF6EE", "#2E7D4F", "✓"] };
export default function AvisosAmb({ avisos, onAccion }) {
  if (!avisos || !avisos.length) return null;
  return (
    <div data-avisos className="space-y-1.5 mb-3">
      {avisos.map((a, i) => {
        const [fondo, color, icono] = COLORES[a.tipo] || COLORES.info;
        return (
          <div key={i} data-aviso={a.tipo} className="text-[11.5px] px-2.5 py-2 rounded-md" style={{ background: fondo, color }}>
            {icono} {a.texto}
            {a.accion && onAccion && <button type="button" data-aviso-accion={a.accion} onClick={() => onAccion(a.accion)} className="ml-2 underline font-semibold">Usar esa fecha</button>}
          </div>
        );
      })}
    </div>
  );
}
