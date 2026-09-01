import { useState, useRef, useEffect } from "react";
import ExcelJS from "exceljs";
import {
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  ClipboardList,
  Search,
  FileSpreadsheet,
  Loader2,
  Camera,
  X,
} from "lucide-react";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

// Fecha de HOY según la hora local del dispositivo (no UTC), en formato YYYY-MM-DD.
// Usar new Date().toISOString() aquí causaría que, en Colombia (UTC-5), pasadas
// las 7pm ya muestre la fecha del día siguiente — por eso se arma a mano con
// los valores locales en vez de convertir a UTC.
function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

// Catálogo de ítems del presupuesto (Edificio 12 pisos).
// Para actualizarlo con otro proyecto, reemplaza este arreglo.
const CATALOGO_ITEMS = [
  { item: "1.1", descripcion: "Localización y replanteo topográfico general", unidad: "M2", contractual: "700" },
  { item: "1.2", descripcion: "Cerramiento provisional en lámina de zinc h=2.40 m", unidad: "ML", contractual: "110" },
  { item: "1.3", descripcion: "Campamento, oficina de obra y baterías sanitarias provisionales", unidad: "GLB", contractual: "1" },
  { item: "1.4", descripcion: "Descapote y limpieza general del terreno", unidad: "M2", contractual: "700" },
  { item: "1.5", descripcion: "Demolición de estructuras existentes en el predio", unidad: "M3", contractual: "150" },
  { item: "1.6", descripcion: "Estudio de suelos y geotecnia", unidad: "GLB", contractual: "1" },
  { item: "1.7", descripcion: "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", unidad: "GLB", contractual: "1" },
  { item: "1.8", descripcion: "Licencia de construcción y trámites de curaduría urbana", unidad: "GLB", contractual: "1" },
  { item: "1.9", descripcion: "Vallas informativas, señalización y SISO de obra", unidad: "GLB", contractual: "1" },
  { item: "2.1", descripcion: "Excavación mecánica para sótanos (2 niveles)", unidad: "M3", contractual: "4200" },
  { item: "2.2", descripcion: "Cargue, transporte y disposición final de material sobrante", unidad: "M3", contractual: "5000" },
  { item: "2.3", descripcion: "Entibado y contención perimetral (pantalla anclada / pilotes)", unidad: "M2", contractual: "850" },
  { item: "2.4", descripcion: "Solado o cimiento ciclópeo de limpieza", unidad: "M3", contractual: "60" },
  { item: "2.5", descripcion: "Concreto 3000 PSI para zapatas y dados de cimentación", unidad: "M3", contractual: "320" },
  { item: "2.6", descripcion: "Concreto 3000 PSI para vigas de cimentación", unidad: "M3", contractual: "180" },
  { item: "2.7", descripcion: "Losa de cimentación / placa contrapiso sótano e=0.15 m, 3000 PSI", unidad: "M2", contractual: "1200" },
  { item: "2.8", descripcion: "Acero de refuerzo figurado y colocado (cimentación)", unidad: "KG", contractual: "42000" },
  { item: "2.9", descripcion: "Impermeabilización de cimentación y muros de contención", unidad: "M2", contractual: "900" },
  { item: "2.10", descripcion: "Muros de contención en concreto reforzado 3000 PSI", unidad: "M3", contractual: "280" },
  { item: "2.11", descripcion: "Filtros y subdrenes perimetrales", unidad: "ML", contractual: "180" },
  { item: "3.1", descripcion: "Columnas en concreto 4000 PSI, formaleta metálica", unidad: "M3", contractual: "850" },
  { item: "3.2", descripcion: "Vigas en concreto 4000 PSI", unidad: "M3", contractual: "620" },
  { item: "3.3", descripcion: "Placas de entrepiso aligeradas e=0.30 m (12 niveles)", unidad: "M2", contractual: "5760" },
  { item: "3.4", descripcion: "Escaleras en concreto reforzado", unidad: "M3", contractual: "95" },
  { item: "3.5", descripcion: "Muros estructurales / pantallas en concreto 4000 PSI", unidad: "M3", contractual: "340" },
  { item: "3.6", descripcion: "Acero de refuerzo figurado y colocado (superestructura)", unidad: "KG", contractual: "195000" },
  { item: "3.7", descripcion: "Formaletería metálica para muros, columnas y placas", unidad: "M2", contractual: "8500" },
  { item: "3.8", descripcion: "Placa de cubierta y losa tanque elevado", unidad: "M2", contractual: "480" },
  { item: "3.9", descripcion: "Junta de dilatación estructural", unidad: "ML", contractual: "72" },
  { item: "4.1", descripcion: "Mampostería en bloque no. 5 - divisiones interiores", unidad: "M2", contractual: "4300" },
  { item: "4.2", descripcion: "Mampostería en bloque no. 4 - muros de fachada", unidad: "M2", contractual: "2900" },
  { item: "4.3", descripcion: "Pañete liso 1:4 en muros interiores", unidad: "M2", contractual: "8600" },
  { item: "4.4", descripcion: "Pañete impermeabilizado en fachada", unidad: "M2", contractual: "2900" },
  { item: "4.5", descripcion: "Filos, dilataciones, dinteles y remates varios", unidad: "ML", contractual: "1800" },
  { item: "5.1", descripcion: "Cubierta en teja termoacústica sobre estructura metálica", unidad: "M2", contractual: "520" },
  { item: "5.2", descripcion: "Impermeabilización de cubiertas, terrazas y balcones", unidad: "M2", contractual: "720" },
  { item: "5.3", descripcion: "Canales y bajantes de aguas lluvias en lámina galvanizada", unidad: "ML", contractual: "220" },
  { item: "5.4", descripcion: "Cuarto de máquinas y tanques de almacenamiento de agua", unidad: "GLB", contractual: "1" },
  { item: "6.1", descripcion: "Redes internas de suministro de agua potable (PVC/CPVC)", unidad: "PTO", contractual: "220" },
  { item: "6.2", descripcion: "Redes de desagües sanitarios y ventilación", unidad: "PTO", contractual: "200" },
  { item: "6.3", descripcion: "Red contra incendio (gabinetes, red húmeda, siamesa)", unidad: "GLB", contractual: "1" },
  { item: "6.4", descripcion: "Sistema de bombeo de agua potable (equipo hidroneumático)", unidad: "GLB", contractual: "1" },
  { item: "6.5", descripcion: "Tanques de almacenamiento y reserva de agua (subterráneo + elevado)", unidad: "GLB", contractual: "1" },
  { item: "6.6", descripcion: "Aparatos sanitarios y grifería (sanitarios, lavamanos, duchas)", unidad: "UND", contractual: "96" },
  { item: "6.7", descripcion: "Redes de aguas lluvias internas (bajantes y colectores)", unidad: "ML", contractual: "380" },
  { item: "6.8", descripcion: "Sistema de tratamiento y disposición de aguas residuales", unidad: "GLB", contractual: "1" },
  { item: "7.1", descripcion: "Acometida eléctrica y subestación / transformador", unidad: "GLB", contractual: "1" },
  { item: "7.2", descripcion: "Tablero general y tableros de distribución por piso", unidad: "UND", contractual: "13" },
  { item: "7.3", descripcion: "Puntos eléctricos (tomas, iluminación, especiales)", unidad: "PTO", contractual: "1450" },
  { item: "7.4", descripcion: "Sistema de puesta a tierra y pararrayos", unidad: "GLB", contractual: "1" },
  { item: "7.5", descripcion: "Iluminación de zonas comunes y exteriores", unidad: "GLB", contractual: "1" },
  { item: "7.6", descripcion: "Citofonía / portería eléctrica y control de acceso", unidad: "GLB", contractual: "1" },
  { item: "7.7", descripcion: "Sistema de voz, datos y TV por suscripción (cableado estructurado)", unidad: "PTO", contractual: "240" },
  { item: "7.8", descripcion: "Planta eléctrica de emergencia", unidad: "GLB", contractual: "1" },
  { item: "8.1", descripcion: "Red interna de gas natural domiciliario por apartamento", unidad: "PTO", contractual: "48" },
  { item: "8.2", descripcion: "Acometida y sistema de medición centralizada de gas", unidad: "GLB", contractual: "1" },
  { item: "9.1", descripcion: "Suministro e instalación ascensor eléctrico, 8 pax, 12 paradas", unidad: "UND", contractual: "2" },
  { item: "9.2", descripcion: "Foso, cuarto de máquinas y adecuación civil para ascensores", unidad: "GLB", contractual: "1" },
  { item: "10.1", descripcion: "Puertas de madera entamboradas (interior apartamentos)", unidad: "UND", contractual: "240" },
  { item: "10.2", descripcion: "Puerta de acceso principal por apartamento (seguridad)", unidad: "UND", contractual: "48" },
  { item: "10.3", descripcion: "Ventanería en aluminio y vidrio (fachada)", unidad: "M2", contractual: "1650" },
  { item: "10.4", descripcion: "Baranda metálica para escaleras y balcones", unidad: "ML", contractual: "480" },
  { item: "10.5", descripcion: "Closets y muebles de cocina modulares", unidad: "M2", contractual: "620" },
  { item: "10.6", descripcion: "Puertas cortafuego para escaleras de emergencia", unidad: "UND", contractual: "24" },
  { item: "11.1", descripcion: "Piso en porcelanato - apartamentos y áreas sociales", unidad: "M2", contractual: "4900" },
  { item: "11.2", descripcion: "Enchape de baños y cocinas", unidad: "M2", contractual: "1850" },
  { item: "11.3", descripcion: "Cielo raso en drywall", unidad: "M2", contractual: "5200" },
  { item: "11.4", descripcion: "Pintura tipo vinilo en muros y cielos interiores", unidad: "M2", contractual: "9800" },
  { item: "11.5", descripcion: "Estuco y pintura de fachada", unidad: "M2", contractual: "2900" },
  { item: "11.6", descripcion: "Piso en granito/porcelanato de alto tráfico - zonas comunes", unidad: "M2", contractual: "850" },
  { item: "11.7", descripcion: "Guardaescobas en porcelanato o madera", unidad: "ML", contractual: "3200" },
  { item: "12.1", descripcion: "Fachada en sistema de muro cortina / paneles arquitectónicos", unidad: "M2", contractual: "950" },
  { item: "12.2", descripcion: "Aislamiento térmico y acústico de fachada", unidad: "M2", contractual: "2900" },
  { item: "13.1", descripcion: "Andenes, accesos peatonales y vehiculares", unidad: "M2", contractual: "280" },
  { item: "13.2", descripcion: "Zonas verdes, paisajismo y riego", unidad: "M2", contractual: "180" },
  { item: "13.3", descripcion: "Cerramiento definitivo, portería y control vehicular", unidad: "GLB", contractual: "1" },
  { item: "13.4", descripcion: "Demarcación y señalización de parqueaderos", unidad: "GLB", contractual: "1" },
  { item: "13.5", descripcion: "Cuarto de basuras y shut de residuos sólidos", unidad: "GLB", contractual: "1" },
  { item: "13.6", descripcion: "Amoblamiento zonas comunes (BBQ, salón social, gimnasio)", unidad: "GLB", contractual: "1" },
  { item: "14.1", descripcion: "Aseo general y limpieza fina de entrega", unidad: "M2", contractual: "7200" },
  { item: "14.2", descripcion: "Dotación contra incendios (extintores, señalización, planos)", unidad: "GLB", contractual: "1" },
  { item: "14.3", descripcion: "Planos récord, manual de propiedad horizontal y actas de entrega", unidad: "GLB", contractual: "1" },
  { item: "14.4", descripcion: "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", unidad: "GLB", contractual: "1" },
];

const emptyCantidad = () => ({
  ubicacion: "",
  item: "",
  descripcion: "",
  contractual: "",
  unidad: "",
  acumAnterior: "",
  avanceDiario: "",
});
const emptyOtra = () => ({
  ubicacion: "",
  item: "",
  descripcion: "",
  unidad: "",
  acumAnterior: "",
  avanceDiario: "",
  observaciones: "",
});
const emptyManoObra = () => ({ cargo: "", cant: "", tiempo: "" });
const emptyEquipo = () => ({ descripcion: "", cant: "", tiempo: "" });
const emptyHoraPerdida = () => ({ motivo: "", inicio: "", fin: "", total: "" });

function Section({ id, title, subtitle, open, onToggle, children, count }) {
  return (
    <div className="border-b" style={{ borderColor: LINE }}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between py-3.5 px-1 text-left"
      >
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: NAVY }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px]" style={{ color: "#8A8F99" }}>
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: GOLD, color: "white" }}
            >
              {count}
            </span>
          )}
          <ChevronDown
            size={18}
            style={{
              color: NAVY,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          />
        </div>
      </button>
      {open && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", half }) {
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none"
        style={{ borderColor: LINE, background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="w-full">
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none resize-none"
        style={{ borderColor: LINE, background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

// --- Memoria de acumulados entre días (usa la memoria del navegador) ---
const CLAVE_ACUMULADOS = "ryr_acumulados_items";

function leerAcumuladosGuardados() {
  try {
    const raw = localStorage.getItem(CLAVE_ACUMULADOS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function guardarAcumulado(clave, valor) {
  try {
    const actuales = leerAcumuladosGuardados();
    actuales[clave] = valor;
    localStorage.setItem(CLAVE_ACUMULADOS, JSON.stringify(actuales));
  } catch (e) {
    // Si el navegador bloquea localStorage, simplemente no se recuerda entre días.
  }
}

// Comprime y redimensiona una foto en el navegador antes de insertarla en el Excel,
// para que el archivo final no quede pesado. Devuelve un ArrayBuffer en JPEG.
function comprimirFoto(file, maxAncho = 1000, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("No se pudo procesar la foto"));
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        calidad
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function CasillaFoto({ foto, onChange, onRemove, numero }) {
  const inputRef = useRef(null);

  function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onChange({ file, previewUrl, caption: foto.caption });
  }

  return (
    <div className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
      {foto.previewUrl ? (
        <div className="relative">
          <img
            src={foto.previewUrl}
            alt={`Foto ${numero}`}
            className="w-full h-32 object-cover rounded-md"
          />
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5"
          style={{ borderColor: GOLD, color: NAVY }}
        >
          <Camera size={22} />
          <span className="text-[11px] font-medium">Foto {numero}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={manejarArchivo}
      />
      {foto.previewUrl && (
        <input
          type="text"
          value={foto.caption}
          onChange={(e) => onChange({ ...foto, caption: e.target.value })}
          placeholder="Descripción de la foto"
          className="w-full mt-2 text-[12px] px-2 py-1.5 rounded-md border outline-none"
          style={{ borderColor: LINE, background: "white" }}
        />
      )}
    </div>
  );
}

function BuscadorItem({ value, onSelect }) {
  const [texto, setTexto] = useState(value || "");
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setTexto(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickFuera(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const filtrados =
    texto.trim().length > 0
      ? CATALOGO_ITEMS.filter((it) =>
          it.descripcion.toLowerCase().includes(texto.toLowerCase())
        ).slice(0, 8)
      : CATALOGO_ITEMS.slice(0, 8);

  return (
    <div className="col-span-2 relative" ref={wrapRef}>
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        Descripción del ítem (busca por nombre)
      </label>
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "#8A8F99" }}
        />
        <input
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Ej. excavación, losa, muro..."
          className="w-full text-[13.5px] pl-7 pr-2.5 py-2 rounded-md border outline-none"
          style={{ borderColor: LINE, background: "white" }}
          onBlur={(e) => (e.target.style.borderColor = LINE)}
        />
      </div>
      {abierto && filtrados.length > 0 && (
        <div
          className="absolute z-20 w-full mt-1 rounded-md border shadow-lg max-h-56 overflow-y-auto"
          style={{ borderColor: LINE, background: "white" }}
        >
          {filtrados.map((it) => (
            <button
              key={it.item}
              type="button"
              onClick={() => {
                onSelect(it);
                setTexto(it.descripcion);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 text-[12.5px] border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div style={{ color: NAVY }} className="font-medium">
                {it.item} — {it.descripcion}
              </div>
              <div style={{ color: "#8A8F99" }} className="text-[10.5px]">
                Unidad: {it.unidad} · Contractual: {it.contractual}
              </div>
            </button>
          ))}
        </div>
      )}
      {abierto && filtrados.length === 0 && (
        <div
          className="absolute z-20 w-full mt-1 rounded-md border p-2.5 text-[12px]"
          style={{ borderColor: LINE, background: "white", color: "#8A8F99" }}
        >
          No se encontró ningún ítem del presupuesto con ese nombre.
        </div>
      )}
    </div>
  );
}

function RowCard({ children, onRemove }) {
  return (
    <div
      className="border rounded-lg p-3 mb-2.5 relative"
      style={{ borderColor: LINE, background: PAPER }}
    >
      <div className="grid grid-cols-2 gap-2">{children}</div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed"
      style={{ borderColor: GOLD, color: NAVY }}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

export default function CapturaAvanceObra() {
  const [active, setActive] = useState("general");
  const toggle = (id) => setActive((cur) => (cur === id ? "" : id));

  const [general, setGeneral] = useState({
    fecha: fechaLocalHoy(),
    informeNo: "",
    objetoContrato: "",
    noContrato: "",
    ubicacion: "",
    especialidad: "",
    horaEntrada: "",
    horaApertura: "",
    horaSalida: "",
  });
  const setG = (k, v) => setGeneral((s) => ({ ...s, [k]: v }));

  const [cantidades, setCantidades] = useState([emptyCantidad()]);
  const [otras, setOtras] = useState([emptyOtra()]);
  const [manoObra, setManoObra] = useState([emptyManoObra()]);
  const [equipos, setEquipos] = useState([emptyEquipo()]);
  const [horasPerdidas, setHorasPerdidas] = useState([emptyHoraPerdida()]);

  const [descActividades, setDescActividades] = useState("");
  const [aspectosProblematicos, setAspectosProblematicos] = useState("");
  const [planAccion, setPlanAccion] = useState("");
  const [charlaDia, setCharlaDia] = useState("");
  const [observacionesHSE, setObservacionesHSE] = useState("");
  const [elaboradoNombre, setElaboradoNombre] = useState("");
  const [elaboradoCargo, setElaboradoCargo] = useState("");

  const [resumen, setResumen] = useState("");
  const [copied, setCopied] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [errorExcel, setErrorExcel] = useState("");
  const [fotos, setFotos] = useState([
    { file: null, previewUrl: "", caption: "" },
    { file: null, previewUrl: "", caption: "" },
    { file: null, previewUrl: "", caption: "" },
    { file: null, previewUrl: "", caption: "" },
  ]);

  function actualizarFoto(idx, nuevaFoto) {
    setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f)));
  }
  function quitarFoto(idx) {
    setFotos((fs) =>
      fs.map((f, i) => (i === idx ? { file: null, previewUrl: "", caption: "" } : f))
    );
  }

  function updateRow(setter, idx, key, value) {
    setter((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }
  function addRow(setter, factory) {
    setter((rows) => [...rows, factory()]);
  }
  function removeRow(setter, idx) {
    setter((rows) => rows.filter((_, i) => i !== idx));
  }

  const countFilled = (rows) =>
    rows.filter((r) => Object.values(r).some((v) => String(v).trim())).length;

  function construirResumen() {
    const L = [];
    L.push("INFORME DIARIO DE AVANCE DE OBRA");
    L.push("REFORMAS Y REMODELACIONES");
    L.push("");
    L.push(`Fecha: ${general.fecha || "-"}`);
    if (general.informeNo) L.push(`Informe No.: ${general.informeNo}`);
    if (general.objetoContrato) L.push(`Objeto del contrato: ${general.objetoContrato}`);
    if (general.noContrato) L.push(`No. de contrato: ${general.noContrato}`);
    if (general.ubicacion) L.push(`Ubicación: ${general.ubicacion}`);
    if (general.especialidad) L.push(`Especialidad: ${general.especialidad}`);
    if (general.horaEntrada || general.horaApertura || general.horaSalida) {
      L.push(
        `Hora entrada: ${general.horaEntrada || "-"} | Apertura permiso: ${
          general.horaApertura || "-"
        } | Hora salida: ${general.horaSalida || "-"}`
      );
    }

    const cantFiltered = cantidades.filter((r) => r.descripcion || r.item || r.ubicacion);
    if (cantFiltered.length) {
      L.push("");
      L.push("— CANTIDADES DE OBRA —");
      cantFiltered.forEach((r, i) => {
        L.push(
          `${i + 1}) Ubicación: ${r.ubicacion || "-"} | Item: ${r.item || "-"} | Descripción: ${
            r.descripcion || "-"
          } | Contractual: ${r.contractual || "-"} | Unidad: ${r.unidad || "-"} | Acum. anterior: ${
            r.acumAnterior || "0"
          } | Avance diario: ${r.avanceDiario || "0"}`
        );
      });
    }

    const otrasFiltered = otras.filter((r) => r.descripcion || r.item || r.ubicacion);
    if (otrasFiltered.length) {
      L.push("");
      L.push("— OTRAS ACTIVIDADES —");
      otrasFiltered.forEach((r, i) => {
        L.push(
          `${i + 1}) Ubicación: ${r.ubicacion || "-"} | Item: ${r.item || "-"} | Descripción: ${
            r.descripcion || "-"
          } | Unidad: ${r.unidad || "-"} | Acum. anterior: ${r.acumAnterior || "0"} | Avance diario: ${
            r.avanceDiario || "0"
          }${r.observaciones ? " | Obs: " + r.observaciones : ""}`
        );
      });
    }

    const manoFiltered = manoObra.filter((r) => r.cargo);
    if (manoFiltered.length) {
      L.push("");
      L.push("— MANO DE OBRA —");
      manoFiltered.forEach((r) =>
        L.push(`- ${r.cargo}: ${r.cant || "-"} pers. | ${r.tiempo || "-"}`)
      );
    }

    const eqFiltered = equipos.filter((r) => r.descripcion);
    if (eqFiltered.length) {
      L.push("");
      L.push("— EQUIPOS —");
      eqFiltered.forEach((r) =>
        L.push(`- ${r.descripcion}: ${r.cant || "-"} | ${r.tiempo || "-"}`)
      );
    }

    if (descActividades) {
      L.push("");
      L.push("— DESCRIPCIÓN DE ACTIVIDADES —");
      L.push(descActividades);
    }

    if (aspectosProblematicos || planAccion) {
      L.push("");
      L.push("— ASPECTOS PROBLEMÁTICOS —");
      L.push(aspectosProblematicos || "Ninguno");
      L.push("— PLAN DE ACCIÓN —");
      L.push(planAccion || "-");
    }

    const hpFiltered = horasPerdidas.filter((r) => r.motivo);
    if (hpFiltered.length) {
      L.push("");
      L.push("— HORAS PERDIDAS —");
      hpFiltered.forEach((r) =>
        L.push(`- ${r.motivo}: ${r.inicio || "-"} a ${r.fin || "-"} (Total: ${r.total || "-"})`)
      );
    }

    if (charlaDia || observacionesHSE) {
      L.push("");
      L.push("— ASPECTOS HSE —");
      if (charlaDia) L.push(`Charla del día: ${charlaDia}`);
      if (observacionesHSE) L.push(`Observaciones HSE: ${observacionesHSE}`);
    }

    if (elaboradoNombre || elaboradoCargo) {
      L.push("");
      L.push(`Elaborado por: ${elaboradoNombre || "-"} (${elaboradoCargo || "-"})`);
    }

    return L.join("\n");
  }

  // Reparte un texto largo en varias celdas de una sola línea cada una
  // (misma lógica que el script de Excel, para que ambos caminos coincidan).
  // Reparte un texto largo en varias celdas de una sola línea cada una
  // (misma lógica que el script de Excel, para que ambos caminos coincidan).
  function repartirEnLineas(ws, celdas, texto) {
    if (!texto) return;
    const maxPorLinea = 110;
    const palabras = texto.split(" ");
    const lineas = [];
    let actual = "";
    for (const palabra of palabras) {
      if ((actual + " " + palabra).trim().length > maxPorLinea) {
        lineas.push(actual.trim());
        actual = palabra;
      } else {
        actual = (actual + " " + palabra).trim();
      }
    }
    if (actual) lineas.push(actual);
    celdas.forEach((celda, i) => {
      if (lineas[i]) {
        ws.getCell(celda).value = lineas[i];
      }
    });
  }

  function setCelda(ws, ref, valor) {
    if (valor === undefined || valor === null || valor === "") return;
    ws.getCell(ref).value = String(valor);
  }

  async function generarExcel() {
    setGenerandoExcel(true);
    setErrorExcel("");
    try {
      const resp = await fetch("/plantilla-informe.xlsx");
      if (!resp.ok) throw new Error("No se pudo cargar la plantilla");
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("RYR-FT-01");
      if (!ws) throw new Error("No se encontró la hoja RYR-FT-01 en la plantilla");

      // --- Datos generales ---
      setCelda(ws, "E2", general.objetoContrato);
      setCelda(ws, "E3", general.noContrato);
      setCelda(ws, "J3", general.fecha);
      setCelda(ws, "J4", general.ubicacion);
      setCelda(ws, "C5", general.horaEntrada);
      setCelda(ws, "F5", general.horaApertura);
      setCelda(ws, "H5", general.horaSalida);
      setCelda(ws, "J5", general.especialidad);
      setCelda(ws, "M5", general.informeNo);

      // --- Cantidades de obra (filas 9 a 20) ---
      cantidades
        .filter((r) => r.descripcion || r.item || r.ubicacion)
        .slice(0, 12)
        .forEach((item, i) => {
          const r = 9 + i;
          setCelda(ws, `A${r}`, item.ubicacion);
          setCelda(ws, `B${r}`, item.item);
          setCelda(ws, `C${r}`, item.descripcion);
          setCelda(ws, `I${r}`, item.contractual);
          setCelda(ws, `J${r}`, item.unidad);
          setCelda(ws, `K${r}`, item.acumAnterior);
          setCelda(ws, `L${r}`, item.avanceDiario);
          // M{r} conserva su fórmula original (=K+L)

          // Guarda el nuevo acumulado para que el próximo día se autocomplete solo.
          if (item.item) {
            const anterior = parseFloat(item.acumAnterior) || 0;
            const diario = parseFloat(item.avanceDiario) || 0;
            guardarAcumulado(item.item, anterior + diario);
          }
        });

      // --- Otras actividades (filas 24 a 29) ---
      otras
        .filter((r) => r.descripcion || r.item || r.ubicacion)
        .slice(0, 6)
        .forEach((item, i) => {
          const r = 24 + i;
          setCelda(ws, `A${r}`, item.ubicacion);
          setCelda(ws, `B${r}`, item.item);
          setCelda(ws, `C${r}`, item.descripcion);
          setCelda(ws, `G${r}`, item.unidad);
          setCelda(ws, `H${r}`, item.acumAnterior);
          setCelda(ws, `I${r}`, item.avanceDiario);
          setCelda(ws, `K${r}`, item.observaciones);
          // J{r} conserva su fórmula original (=H+I)

          if (item.item) {
            const anterior = parseFloat(item.acumAnterior) || 0;
            const diario = parseFloat(item.avanceDiario) || 0;
            guardarAcumulado(`otras_${item.item}`, anterior + diario);
          }
        });

      // --- Mano de obra (filas 33 a 42) ---
      manoObra
        .filter((r) => r.cargo)
        .slice(0, 10)
        .forEach((item, i) => {
          const r = 33 + i;
          setCelda(ws, `A${r}`, item.cargo);
          setCelda(ws, `F${r}`, item.cant);
          setCelda(ws, `G${r}`, item.tiempo);
        });

      // --- Equipos (filas 33 a 42) ---
      equipos
        .filter((r) => r.descripcion)
        .slice(0, 10)
        .forEach((item, i) => {
          const r = 33 + i;
          setCelda(ws, `I${r}`, item.descripcion);
          setCelda(ws, `L${r}`, item.cant);
          setCelda(ws, `M${r}`, item.tiempo);
        });

      // --- Descripción de actividades (4 líneas) ---
      repartirEnLineas(ws, ["A44", "A45", "A46", "A47"], descActividades);

      // --- Aspectos problemáticos / Plan de acción (3 líneas cada uno) ---
      repartirEnLineas(ws, ["A49", "A50", "A51"], aspectosProblematicos);
      repartirEnLineas(ws, ["H49", "H50", "H51"], planAccion);

      // --- Horas perdidas (filas 54 a 57) ---
      horasPerdidas
        .filter((r) => r.motivo)
        .slice(0, 4)
        .forEach((item, i) => {
          const r = 54 + i;
          setCelda(ws, `A${r}`, item.motivo);
          setCelda(ws, `E${r}`, item.inicio);
          setCelda(ws, `F${r}`, item.fin);
          setCelda(ws, `G${r}`, item.total);
        });

      // --- HSE ---
      setCelda(ws, "H54", charlaDia);
      repartirEnLineas(ws, ["H56", "H57"], observacionesHSE);

      // --- Elaborado por ---
      setCelda(ws, "B60", elaboradoNombre);
      setCelda(ws, "B61", elaboradoCargo);

      // --- Registro fotográfico (4 casillas del mismo ancho, en una sola fila) ---
      const posicionesFotos = [
        { tl: { col: 0, row: 58 }, br: { col: 3, row: 68 }, captionCell: "A69" }, // Foto 1
        { tl: { col: 3, row: 58 }, br: { col: 6, row: 68 }, captionCell: "D69" }, // Foto 2
        { tl: { col: 6, row: 58 }, br: { col: 9, row: 68 }, captionCell: "G69" }, // Foto 3
        { tl: { col: 9, row: 58 }, br: { col: 13, row: 68 }, captionCell: "J69" }, // Foto 4
      ];
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (!foto.file) continue;
        const buffer = await comprimirFoto(foto.file);
        const imageId = workbook.addImage({ buffer, extension: "jpeg" });
        const pos = posicionesFotos[i];
        ws.addImage(imageId, { tl: pos.tl, br: pos.br });
        if (foto.caption) {
          ws.getCell(pos.captionCell).value = foto.caption;
        }
      }

      const nombreArchivo = `Informe_${general.fecha || "obra"}.xlsx`;
      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorExcel(
        "No se pudo generar el Excel. Verifica tu conexión e intenta de nuevo."
      );
    } finally {
      setGenerandoExcel(false);
    }
  }

  function handleGenerar() {
    setResumen(construirResumen());
    setActive("resumen");
  }

  function copiar() {
    navigator.clipboard.writeText(resumen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function enviarWhatsapp() {
    const url = `https://wa.me/?text=${encodeURIComponent(resumen)}`;
    window.open(url, "_blank");
  }

  return (
    <div
      className="min-h-full"
      style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <path d="M20 4L4 18H8V36H32V18H36L20 4Z" fill={GOLD} />
            <rect x="14" y="22" width="12" height="14" fill={NAVY} stroke="white" strokeWidth="1" />
          </svg>
          <div>
            <div
              className="text-white font-bold text-[15px] tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              REFORMAS Y REMODELACIONES
            </div>
            <div className="text-[10.5px]" style={{ color: GOLD }}>
              Captura de avance diario de obra · RYR-FT-01
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white">
        <Section id="general" title="Datos generales" open={active === "general"} onToggle={toggle}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Field label="Fecha" type="date" value={general.fecha} onChange={(v) => setG("fecha", v)} half />
              <Field label="Informe No." value={general.informeNo} onChange={(v) => setG("informeNo", v)} half />
            </div>
            <Field label="Objeto del contrato" value={general.objetoContrato} onChange={(v) => setG("objetoContrato", v)} />
            <div className="flex gap-2">
              <Field label="No. de contrato" value={general.noContrato} onChange={(v) => setG("noContrato", v)} half />
              <Field label="Especialidad" value={general.especialidad} onChange={(v) => setG("especialidad", v)} half />
            </div>
            <Field label="Ubicación" value={general.ubicacion} onChange={(v) => setG("ubicacion", v)} />
            <div className="flex gap-2">
              <Field label="Hora entrada" type="time" value={general.horaEntrada} onChange={(v) => setG("horaEntrada", v)} half />
              <Field label="Apertura permiso" type="time" value={general.horaApertura} onChange={(v) => setG("horaApertura", v)} half />
              <Field label="Hora salida" type="time" value={general.horaSalida} onChange={(v) => setG("horaSalida", v)} half />
            </div>
          </div>
        </Section>

        <Section
          id="cantidades"
          title="Cantidades de obra"
          subtitle="Ítems del contrato"
          open={active === "cantidades"}
          onToggle={toggle}
          count={countFilled(cantidades)}
        >
          {cantidades.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setCantidades, i)}>
              <div className="col-span-2">
                <BuscadorItem
                  value={r.descripcion}
                  onSelect={(it) => {
                    const acumuladosGuardados = leerAcumuladosGuardados();
                    const acumPrevio = acumuladosGuardados[it.item];
                    setCantidades((rows) =>
                      rows.map((row, idx) =>
                        idx === i
                          ? {
                              ...row,
                              descripcion: it.descripcion,
                              item: it.item,
                              unidad: it.unidad,
                              contractual: it.contractual,
                              acumAnterior:
                                acumPrevio !== undefined ? String(acumPrevio) : row.acumAnterior,
                            }
                          : row
                      )
                    );
                  }}
                />
              </div>
              <Field label="Ubicación" value={r.ubicacion} onChange={(v) => updateRow(setCantidades, i, "ubicacion", v)} />
              <Field label="Item" value={r.item} onChange={(v) => updateRow(setCantidades, i, "item", v)} />
              <Field label="Contractual" value={r.contractual} onChange={(v) => updateRow(setCantidades, i, "contractual", v)} />
              <Field label="Unidad" value={r.unidad} onChange={(v) => updateRow(setCantidades, i, "unidad", v)} />
              <Field label="Acum. anterior" type="number" value={r.acumAnterior} onChange={(v) => updateRow(setCantidades, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="number" value={r.avanceDiario} onChange={(v) => updateRow(setCantidades, i, "avanceDiario", v)} />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setCantidades, emptyCantidad)} label="Agregar ítem" />
        </Section>

        <Section
          id="otras"
          title="Otras actividades"
          open={active === "otras"}
          onToggle={toggle}
          count={countFilled(otras)}
        >
          {otras.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setOtras, i)}>
              <Field label="Ubicación" value={r.ubicacion} onChange={(v) => updateRow(setOtras, i, "ubicacion", v)} />
              <Field label="Item" value={r.item} onChange={(v) => updateRow(setOtras, i, "item", v)} />
              <div className="col-span-2">
                <Field label="Descripción" value={r.descripcion} onChange={(v) => updateRow(setOtras, i, "descripcion", v)} />
              </div>
              <Field label="Unidad" value={r.unidad} onChange={(v) => updateRow(setOtras, i, "unidad", v)} />
              <Field label="Acum. anterior" type="number" value={r.acumAnterior} onChange={(v) => updateRow(setOtras, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="number" value={r.avanceDiario} onChange={(v) => updateRow(setOtras, i, "avanceDiario", v)} />
              <div className="col-span-2">
                <Field label="Observaciones" value={r.observaciones} onChange={(v) => updateRow(setOtras, i, "observaciones", v)} />
              </div>
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setOtras, emptyOtra)} label="Agregar actividad" />
        </Section>

        <Section
          id="recursos"
          title="Recursos"
          subtitle="Mano de obra y equipos"
          open={active === "recursos"}
          onToggle={toggle}
          count={countFilled(manoObra) + countFilled(equipos)}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: NAVY }}>
            MANO DE OBRA
          </div>
          {manoObra.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setManoObra, i)}>
              <div className="col-span-2">
                <Field label="Cargo" value={r.cargo} onChange={(v) => updateRow(setManoObra, i, "cargo", v)} />
              </div>
              <Field label="Cant." type="number" value={r.cant} onChange={(v) => updateRow(setManoObra, i, "cant", v)} />
              <Field label="Tiempo" value={r.tiempo} onChange={(v) => updateRow(setManoObra, i, "tiempo", v)} placeholder="Ej. 8h" />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setManoObra, emptyManoObra)} label="Agregar cargo" />

          <div className="text-[11px] font-semibold mb-2 mt-4" style={{ color: NAVY }}>
            EQUIPOS
          </div>
          {equipos.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setEquipos, i)}>
              <div className="col-span-2">
                <Field label="Descripción" value={r.descripcion} onChange={(v) => updateRow(setEquipos, i, "descripcion", v)} />
              </div>
              <Field label="Cant." type="number" value={r.cant} onChange={(v) => updateRow(setEquipos, i, "cant", v)} />
              <Field label="Tiempo" value={r.tiempo} onChange={(v) => updateRow(setEquipos, i, "tiempo", v)} placeholder="Ej. 8h" />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setEquipos, emptyEquipo)} label="Agregar equipo" />
        </Section>

        <Section
          id="actividades"
          title="Actividades e incidencias"
          open={active === "actividades"}
          onToggle={toggle}
        >
          <div className="space-y-3">
            <TextArea label="Descripción de actividades" value={descActividades} onChange={setDescActividades} placeholder="Resumen de lo realizado hoy" />
            <TextArea label="Aspectos problemáticos" value={aspectosProblematicos} onChange={setAspectosProblematicos} rows={2} placeholder="Dejar vacío si no hubo" />
            <TextArea label="Plan de acción" value={planAccion} onChange={setPlanAccion} rows={2} />
          </div>
        </Section>

        <Section
          id="fotos"
          title="Registro fotográfico"
          subtitle="Hasta 4 fotos del avance"
          open={active === "fotos"}
          onToggle={toggle}
          count={fotos.filter((f) => f.file).length}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {fotos.map((foto, i) => (
              <CasillaFoto
                key={i}
                foto={foto}
                numero={i + 1}
                onChange={(nuevaFoto) => actualizarFoto(i, nuevaFoto)}
                onRemove={() => quitarFoto(i)}
              />
            ))}
          </div>
        </Section>

        <Section
          id="hse"
          title="Horas perdidas y HSE"
          open={active === "hse"}
          onToggle={toggle}
          count={countFilled(horasPerdidas)}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: NAVY }}>
            HORAS PERDIDAS
          </div>
          {horasPerdidas.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setHorasPerdidas, i)}>
              <div className="col-span-2">
                <Field label="Motivo" value={r.motivo} onChange={(v) => updateRow(setHorasPerdidas, i, "motivo", v)} />
              </div>
              <Field label="Inicio" type="time" value={r.inicio} onChange={(v) => updateRow(setHorasPerdidas, i, "inicio", v)} />
              <Field label="Fin" type="time" value={r.fin} onChange={(v) => updateRow(setHorasPerdidas, i, "fin", v)} />
              <Field label="Total horas" value={r.total} onChange={(v) => updateRow(setHorasPerdidas, i, "total", v)} />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setHorasPerdidas, emptyHoraPerdida)} label="Agregar registro" />

          <div className="text-[11px] font-semibold mb-2 mt-4" style={{ color: NAVY }}>
            ASPECTOS HSE
          </div>
          <div className="space-y-3">
            <TextArea label="Charla del día" value={charlaDia} onChange={setCharlaDia} rows={2} />
            <TextArea label="Observaciones HSE" value={observacionesHSE} onChange={setObservacionesHSE} rows={2} />
          </div>
        </Section>

        <Section id="firma" title="Elaborado por" open={active === "firma"} onToggle={toggle}>
          <div className="flex gap-2">
            <Field label="Nombre" value={elaboradoNombre} onChange={setElaboradoNombre} half />
            <Field label="Cargo" value={elaboradoCargo} onChange={setElaboradoCargo} half />
          </div>
        </Section>

        {/* Botón principal: descarga directa del Excel ya diligenciado */}
        <div className="px-4 pt-4">
          <button
            onClick={generarExcel}
            disabled={generandoExcel}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-[13.5px]"
            style={{ background: NAVY, opacity: generandoExcel ? 0.7 : 1 }}
          >
            {generandoExcel ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Generando Excel...
              </>
            ) : (
              <>
                <FileSpreadsheet size={17} /> Descargar informe Excel
              </>
            )}
          </button>
          {errorExcel && (
            <div className="mt-2 text-[11px] text-center" style={{ color: "#B3401F" }}>
              {errorExcel}
            </div>
          )}
          <div className="mt-2 text-[10.5px] text-center" style={{ color: "#8A8F99" }}>
            Descarga el formato RYR-FT-01 ya lleno con estos datos, listo para revisar y firmar.
          </div>
        </div>

        {/* Generate button (resumen de texto / WhatsApp) */}
        <div className="p-4">
          <button
            onClick={handleGenerar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-[13.5px] border"
            style={{ borderColor: GOLD, color: NAVY, background: "white" }}
          >
            <ClipboardList size={17} /> Generar resumen de texto (WhatsApp)
          </button>
        </div>

        {/* Summary section */}
        {resumen && (
          <div className="px-4 pb-6">
            <div
              className="border rounded-lg p-3"
              style={{ borderColor: LINE, background: PAPER }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold" style={{ color: NAVY }}>
                  RESUMEN LISTO PARA ENVIAR
                </div>
              </div>
              <pre
                className="whitespace-pre-wrap text-[12px] leading-relaxed mb-3"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#1C2B39" }}
              >
                {resumen}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={enviarWhatsapp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-white text-[12.5px] font-medium"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle size={15} /> Enviar por WhatsApp
                </button>
                <button
                  onClick={copiar}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-[12.5px] font-medium border"
                  style={{ borderColor: NAVY, color: NAVY }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
