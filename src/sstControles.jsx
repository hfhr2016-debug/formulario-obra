// sstControles.jsx — controles de pantalla de los formatos de revisión y control del riesgo (Permisos, ATS, Inspecciones, Actos y Condiciones).
// Complementan a sstComunes.jsx: elección rápida (Sí/No/N/A…), grillas de casillas para marcar, fecha con "hoy" y fotos.
import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { LOGO_MARCA_AGUA, RELACION_LOGO } from "./marcaLogo";
import { fechaHoyISO, baseOpcion, esOpcionOtro } from "./sstBase";
import { NAVY, GOLD, PAPER, LINE, Campo, etiquetaCls } from "./sstComunes";

// ---------- Elección rápida: una fila de botones; tocar el elegido lo desmarca ----------
export function ChipsOpcion({ label, value, onChange, opciones, colores = {}, pequeno = false, nombre, sinMarca = false }) {
  return (
    <div data-campo={sinMarca ? undefined : nombre || label}>
      {label && <span className={etiquetaCls} style={{ color: "#8A8F99" }}>{label}</span>}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={nombre || label}>
        {opciones.map((o) => {
          const activa = value === o;
          const color = colores[o] || NAVY;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={activa}
              onClick={() => onChange(activa ? "" : o)}
              className={`${pequeno ? "text-[11.5px] px-2.5 py-1" : "text-[12.5px] px-3 py-1.5"} rounded-full border font-medium`}
              style={activa ? { background: color, borderColor: color, color: "white" } : { background: "white", borderColor: LINE, color: NAVY }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Fecha con "Usar la fecha de hoy" ----------
export function CampoFecha({ label, value, onChange }) {
  return (
    <div>
      <Campo label={label} type="date" value={value} onChange={onChange} />
      {!value && (
        <button type="button" onClick={() => onChange(fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
      )}
    </div>
  );
}

// ---------- Grilla de casillas para marcar (las ☐ de la plantilla) ----------
// opciones: textos como están en la plantilla. Las que terminan en ":" ("Otro:") piden además un texto.
export function GrillaOpciones({ opciones, marcadas, onAlternar, otros = {}, onOtro, nombre }) {
  return (
    <div className="grid grid-cols-1 gap-1.5" role="group" aria-label={nombre} data-campo={nombre}>
      {opciones.map((o) => {
        const base = baseOpcion(o);
        const activa = marcadas.includes(base) || marcadas.includes(o);
        const otro = esOpcionOtro(o);
        return (
          <div key={o}>
            <button
              type="button"
              aria-pressed={activa}
              onClick={() => onAlternar(base)}
              className="w-full flex items-center gap-2.5 text-left text-[13px] px-2.5 py-2 rounded-md border"
              style={activa ? { background: "#FFF6DC", borderColor: GOLD, color: NAVY, fontWeight: 600 } : { background: "white", borderColor: LINE, color: NAVY }}
            >
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[13px] flex-shrink-0" style={{ borderColor: activa ? GOLD : "#B8BDC7", background: activa ? GOLD : "white", color: "white" }}>{activa ? "✔" : ""}</span>
              <span>{otro ? base : base}</span>
            </button>
            {otro && activa && (
              <input
                type="text"
                value={otros[base] || ""}
                onChange={(e) => onOtro(base, e.target.value)}
                placeholder="Escribe cuál"
                aria-label={`${base} (cuál)`}
                className="w-full mt-1 text-[13px] px-2.5 py-2 rounded-md border outline-none"
                style={{ borderColor: LINE, background: "white" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Una pregunta de verificación: texto + Sí/No/N/A + observación opcional ----------
export function FilaVerificacion({ numero, texto, valor, onChange, observacion, onObservacion, opciones = ["Sí", "No", "N/A"], colores, automatico = false }) {
  const coloresPorDefecto = { "Sí": "#2E7D4F", "Cumple": "#2E7D4F", "No": "#B3401F", "No cumple": "#B3401F", "N/A": "#6B7280" };
  return (
    <div className="border rounded-lg p-2.5 mb-2" data-campo={`Respuesta ${numero}`} style={{ borderColor: valor === "No" || valor === "No cumple" ? "#E8B4A6" : LINE, background: PAPER }}>
      <div className="text-[12.5px] mb-2" style={{ color: NAVY }}>
        <span className="font-bold mr-1.5" style={{ color: GOLD }}>{numero}.</span>{texto}
      </div>
      <ChipsOpcion value={valor} onChange={onChange} opciones={opciones} colores={colores || coloresPorDefecto} pequeno nombre={`Respuesta ${numero}`} sinMarca />
      {automatico && <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>Se marca N/A automáticamente porque este trabajo no aplica.</div>}
      {onObservacion && (valor === "No" || valor === "No cumple" || observacion) && (
        <input
          type="text"
          value={observacion || ""}
          onChange={(e) => onObservacion(e.target.value)}
          placeholder="Observación / hallazgo"
          aria-label={`Observación ${numero}`}
          className="w-full mt-2 text-[12.5px] px-2.5 py-1.5 rounded-md border outline-none"
          style={{ borderColor: LINE, background: "white" }}
        />
      )}
    </div>
  );
}

// ---------- Marca de agua ----------
// Banda semitransparente en la parte baja de la FOTO (no del recuadro) con el proyecto, la fecha/hora y las coordenadas.
// Se "quema" en la imagen antes de meterla al Excel, así no se puede quitar desde el formato. Se puede apagar con el interruptor.
const CLAVE_MARCA = "saiea_marca_agua";
export function marcaAguaActiva() {
  try { return localStorage.getItem(CLAVE_MARCA) !== "0"; } catch (e) { return true; }
}
export function fijarMarcaAgua(activa) {
  try { localStorage.setItem(CLAVE_MARCA, activa ? "1" : "0"); } catch (e) { /* sin almacenamiento: se queda activa */ }
}
let _logoMarca = null;
function cargarLogoMarca() {
  if (!_logoMarca) _logoMarca = new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = LOGO_MARCA_AGUA; });
  return _logoMarca;
}
function dibujarMarcaAgua(ctx, x, y, w, h, lineas, logo) {
  const textos = lineas.filter((t) => t && String(t).trim());
  if (!textos.length) return;
  const tam = Math.max(12, Math.round(Math.min(w, h * 1.6) / 34));
  const paso = Math.round(tam * 1.25);
  const pad = Math.round(tam * 0.5);
  const alto = textos.length * paso + pad * 2;
  // Logo: pequeño pero legible; sobresale un poco por encima de la franja, pegado a la esquina inferior izquierda
  const altoLogo = logo ? Math.round(alto * 1.45) : 0;
  const anchoLogo = logo ? Math.round(altoLogo * RELACION_LOGO) : 0;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y + h - alto, w, alto);
  let x0 = x + pad;
  if (logo) { ctx.drawImage(logo, x + pad, y + h - altoLogo - Math.round(pad * 0.4), anchoLogo, altoLogo); x0 = x + pad * 2 + anchoLogo; }
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "top";
  textos.forEach((t, i) => {
    ctx.font = `${i === 0 ? "bold " : ""}${tam}px Arial, sans-serif`;
    let linea = String(t);
    if (ctx.measureText) {
      while (linea.length > 4 && ctx.measureText(linea).width > x + w - x0 - pad) linea = linea.slice(0, -2);
      if (linea.length < String(t).length) linea = linea.slice(0, -1) + "…";
    }
    ctx.fillText(linea, x0, y + h - alto + pad + i * paso);
  });
  ctx.restore();
}
export const EMPRESA_MARCA = "REFORMAS Y REMODELACIONES";
const dos = (n) => String(n).padStart(2, "0");
// Texto de la marca: proyecto, fecha y hora (la de la foto si se escribió, si no la del archivo) y coordenadas si hay.
export function lineasMarca(proyecto, foto = {}, file = null) {
  let cuando = foto.fechaHora ? new Date(foto.fechaHora.length === 10 ? foto.fechaHora + "T12:00" : foto.fechaHora) : null;
  if (!cuando || isNaN(cuando.getTime())) cuando = new Date((file && file.lastModified) || Date.now());
  const soloFecha = typeof foto.fechaHora === "string" && foto.fechaHora.length === 10;
  const fecha = `${dos(cuando.getDate())}/${dos(cuando.getMonth() + 1)}/${cuando.getFullYear()}` + (soloFecha ? "" : ` ${dos(cuando.getHours())}:${dos(cuando.getMinutes())}`);
  return [EMPRESA_MARCA, proyecto || "", foto.coordenadas ? `${fecha}  ·  ${foto.coordenadas}` : fecha];
}
export function InterruptorMarca() {
  const [on, setOn] = useState(marcaAguaActiva());
  return (
    <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: NAVY }}>
      <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); fijarMarcaAgua(e.target.checked); }} aria-label="Marca de agua en las fotos" />
      Marca de agua en las fotos (empresa, proyecto, fecha y hora)
    </label>
  );
}

// ---------- Fotos ----------
// Comprime la foto. Con "aspecto" (ancho/alto del recuadro del Excel) la foto entra COMPLETA en esa proporción, sin recortarla
// ni deformarla: el sobrante se rellena con el gris del recuadro (igual que en la Charla Diaria).
export function comprimirFoto(file, maxAncho = 1000, calidad = 0.75, aspecto = null, fondo = "#F2F2F2", marca = null) {
  const conMarca = !!(marca && marca.length && marcaAguaActiva());
  const logoP = conMarca ? cargarLogoMarca() : Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const logo = await logoP;
      let ancho, alto, dx = 0, dy = 0, dw, dh;
      if (aspecto) {
        ancho = Math.min(maxAncho, Math.max(img.width, Math.round(img.height * aspecto)));
        alto = Math.round(ancho / aspecto);
        const escala = Math.min(ancho / img.width, alto / img.height);
        dw = Math.round(img.width * escala);
        dh = Math.round(img.height * escala);
        dx = Math.round((ancho - dw) / 2);
        dy = Math.round((alto - dh) / 2);
      } else {
        ancho = img.width; alto = img.height;
        if (ancho > maxAncho) { alto = Math.round((alto * maxAncho) / ancho); ancho = maxAncho; }
        dw = ancho; dh = alto;
      }
      const canvas = document.createElement("canvas");
      canvas.width = ancho; canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (aspecto) { ctx.fillStyle = fondo; ctx.fillRect(0, 0, ancho, alto); }
      ctx.drawImage(img, dx, dy, dw, dh);
      if (conMarca) dibujarMarcaAgua(ctx, dx, dy, dw, dh, marca, logo);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return reject(new Error("No se pudo procesar la foto"));
        blob.arrayBuffer().then(resolve).catch(reject);
      }, "image/jpeg", calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto")); };
    img.src = url;
  });
}

export const fotoVacia = () => ({ file: null, previewUrl: "" });

export function CasillaFoto({ foto, titulo, onChange, onRemove }) {
  const inputRef = useRef(null);
  function manejarArchivo(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    onChange({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = "";
  }
  return (
    <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
      {foto.previewUrl ? (
        <div className="relative">
          <img src={foto.previewUrl} alt={titulo} className="w-full h-36 object-cover rounded-md" />
          <button type="button" onClick={onRemove} aria-label={`Quitar foto ${titulo}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current && inputRef.current.click()} className="w-full h-36 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5" style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={22} />
          <span className="text-[12px] font-medium">{titulo}</span>
          <span className="text-[10.5px]" style={{ color: "#8A8F99" }}>Toma la foto o elige una de la galería</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} aria-label={titulo} />
    </div>
  );
}

// Agrega cada foto a SU recuadro de la plantilla (anclada a las celdas: no se sale ni cuando cambian los tamaños de fila).
// cajas: [{ tl, br, aspecto }]; fotos: [{ file }] en el mismo orden. Devuelve cuántas fotos se quedaron sin recuadro.
// marcas (opcional): [líneas de texto por foto] en el mismo orden que fotos.
export async function agregarFotosARecuadros(workbook, ws, fotos, cajas, fondo = "#F2F2F2", marcas = null) {
  let sinCasilla = 0;
  for (let i = 0; i < fotos.length; i++) {
    if (!fotos[i] || !fotos[i].file) continue;
    const caja = (cajas || [])[i];
    if (!caja) { sinCasilla++; continue; }
    const buf = await comprimirFoto(fotos[i].file, 1000, 0.75, caja.aspecto || null, fondo, marcas ? marcas[i] : null);
    const id = workbook.addImage({ buffer: buf, extension: "jpeg" });
    ws.addImage(id, { tl: caja.tl, br: caja.br, editAs: "twoCell" });
  }
  return sinCasilla;
}
