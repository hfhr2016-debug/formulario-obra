import React, { useState } from "react";
import ExcelJS from "exceljs";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}


const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}
function aFechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const CATALOGO_CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];

const ELEMENTOS_HIDROCARBUROS = {
  civil: [
    "Adecuación de terrenos (Pad/Cluster)",
    "Vías de acceso industrial",
    "Cimentaciones especiales (pilotes, zapatas, losas)",
    "Sistemas de contención secundaria (diques)",
    "Manejo de aguas - drenaje aceitoso",
    "Manejo de aguas - drenaje pluvial",
  ],
  mecanico: [
    "Sistemas de separación (bifásicos/trifásicos)",
    "Almacenamiento de fluidos - tanques API 650",
    "Sistemas de bombeo y transferencia",
    "Líneas de flujo y colectores (Manifolds)",
    "Tratamiento de gas (Scrubbers, Tea/Flare)",
  ],
  electrico: [
    "Generación y distribución (subestaciones, redes)",
    "Automatización (DCS / SCADA)",
    "Seguridad activa (SIS, SDV/BDV, F&G)",
  ],
};

const DESCRIPCIONES_HC = {
  "Adecuación de terrenos (Pad/Cluster)": "Descapote, excavación, nivelación y compactación de plataformas de perforación y producción.",
  "Vías de acceso industrial": "Construcción y mejoramiento de vías industriales con afirmado o carpeta asfáltica para tráfico pesado (módulos de perforación y carrotanques).",
  "Cimentaciones especiales (pilotes, zapatas, losas)": "Diseños de cimentaciones profundas (pilotes) y superficiales (zapatas/losas) en concreto reforzado para soportar equipos dinámicos y estáticos de gran tonelaje (múltiples, separadores, bombas).",
  "Sistemas de contención secundaria (diques)": "Construcción de diques de contención de concreto impermeabilizado para tanques de almacenamiento, con capacidad del 110% del volumen del tanque mayor.",
  "Manejo de aguas - drenaje aceitoso": "Canalizaciones hacia API (Separador de agua y aceite).",
  "Manejo de aguas - drenaje pluvial": "Canales perimetrales, desarenadores y alcantarillas (Box Culvert).",
  "Sistemas de separación (bifásicos/trifásicos)": "Instalación de separadores de producción y prueba (Bifásicos o Trifásicos) para gas, petróleo y agua.",
  "Almacenamiento de fluidos - tanques API 650": "Montaje de tanques bajo norma API 650 (Tanques de crudo, tanques de agua de producción y tanques de surgencia).",
  "Sistemas de bombeo y transferencia": "Estaciones de bombas de transferencia de crudo y bombas de inyección de agua de formación (Sistemas HPS o reciprocantes).",
  "Líneas de flujo y colectores (Manifolds)": "Construcción de Manifolds (múltiples de producción) y tendido de líneas de flujo (Flowlines) bajo norma ASME B31.4 (líquidos) y ASME B31.8 (gas).",
  "Tratamiento de gas (Scrubbers, Tea/Flare)": "Facilidades de depuración (Scrubbers), sistemas de tea (Flare) para alivios y quemados seguros.",
  "Generación y distribución (subestaciones, redes)": "Montaje de subestaciones eléctricas modulares, tendido de redes de media y baja tensión, bancos de ductos e instalación de transformadores.",
  "Automatización (DCS / SCADA)": "Sistema de Control Distribuido (DCS) o SCADA para el monitoreo remoto de variables de proceso (presión, temperatura, flujo, nivel).",
  "Seguridad activa (SIS, SDV/BDV, F&G)": "Sistema de Instrumentación de Seguridad (SIS) con válvulas de corte de emergencia (SDV/BDV) y sistemas de detección de fuego y gas (F&G).",
};

function BuscadorTexto({ value, onChange, catalogo, campo, placeholder }) {
  const [abierto, setAbierto] = React.useState(false);
  const resultados = React.useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    const items = catalogo.map((it) => (typeof it === "string" ? it : it[campo]));
    const filtrados = items.filter((it) => it.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aE = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bE = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return [...new Set(filtrados)].slice(0, 8);
  }, [value, catalogo, campo]);
  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {resultados.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]">
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, unidad, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>
        {label} {unidad && <span className="font-normal text-gray-400">({unidad})</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      style={{ borderColor: LINE }}
    />
  );
}

export default function FormularioFicha({ onVolver }) {
  const [modulos, setModulos] = useState({ edificacion: true, vias: false, hidrocarburos: false });
  const [hcBloques, setHcBloques] = useState({ civil: false, mecanico: false, electrico: false });
  const [hcElementos, setHcElementos] = useState({});
  const [viaTipo, setViaTipo] = useState("");
  const [viaLongitud, setViaLongitud] = useState("");
  const [viaCarriles, setViaCarriles] = useState("");
  const [viaZona, setViaZona] = useState("");
  const [viaTipoIntervencion, setViaTipoIntervencion] = useState("");
  const [viaVelocidadDiseno, setViaVelocidadDiseno] = useState("");
  const [viaAnchoCalzada, setViaAnchoCalzada] = useState("");
  const [viaAnchoCarril, setViaAnchoCarril] = useState("");
  const [viaAnchoBerma, setViaAnchoBerma] = useState("");
  const [viaPendienteMax, setViaPendienteMax] = useState("");
  const [viaEstructuraPavimento, setViaEstructuraPavimento] = useState("");
  const [viaCbrDiseno, setViaCbrDiseno] = useState("");
  const [viaSubbase, setViaSubbase] = useState("");
  const [viaBase, setViaBase] = useState("");
  const [viaCapaRodadura, setViaCapaRodadura] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [noContrato, setNoContrato] = useState("");
  const [contratista, setContratista] = useState("");
  const [ubicacion, setUbicacion] = useState("");

  const [pisos, setPisos] = useState("");
  const [sotanos, setSotanos] = useState("");
  const [areaLote, setAreaLote] = useState("");
  const [areaTipicaPiso, setAreaTipicaPiso] = useState("");
  const [areaSotanos, setAreaSotanos] = useState("");
  const [areaCubierta, setAreaCubierta] = useState("");
  const [numApartamentos, setNumApartamentos] = useState("");
  const [areaPromedioApto, setAreaPromedioApto] = useState("");
  const [numParqueaderos, setNumParqueaderos] = useState("");
  const [numAscensores, setNumAscensores] = useState("");
  const [alturaTotal, setAlturaTotal] = useState("");

  const [administracion, setAdministracion] = useState(10);
  const [imprevistos, setImprevistos] = useState(4);
  const [utilidad, setUtilidad] = useState(12);
  const [ivaUtilidad, setIvaUtilidad] = useState(19);

  const [generando, setGenerando] = useState(false);

  async function generarExcel() {
    setGenerando(true);
    try {
      try {
        localStorage.setItem("ryr_tipo_proyecto", JSON.stringify({
          modulos, hcBloques, hcElementos,
          via: {
            tipo: viaTipo, longitud: viaLongitud, carriles: viaCarriles, zona: viaZona,
            tipoIntervencion: viaTipoIntervencion, velocidadDiseno: viaVelocidadDiseno,
            anchoCalzada: viaAnchoCalzada, anchoCarril: viaAnchoCarril, anchoBerma: viaAnchoBerma,
            pendienteMax: viaPendienteMax, estructuraPavimento: viaEstructuraPavimento,
            cbrDiseno: viaCbrDiseno, subbase: viaSubbase, base: viaBase, capaRodadura: viaCapaRodadura,
          },
        }));
      } catch (e) {
        console.warn("No se pudo guardar el tipo de proyecto en memoria local:", e);
      }
      let archivoPlantilla = "/plantilla-ficha.xlsx";
      if (modulos.vias) archivoPlantilla = "/plantilla-ficha-vias.xlsx";
      else if (modulos.hidrocarburos) archivoPlantilla = "/plantilla-ficha-hidrocarburos.xlsx";
      const resp = await fetch(archivoPlantilla + "?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Ficha Técnica del Proyecto");

      ws.getCell("B2").value = proyecto;
      ws.getCell("B9").value = proyecto;
      ws.getCell("B10").value = noContrato;
      ws.getCell("D10").value = aFechaDDMMYYYY(fechaLocalHoy());
      ws.getCell("B11").value = contratista;
      ws.getCell("B12").value = ubicacion;

      if (modulos.edificacion) {
        ws.getCell("B14").value = numES(pisos) || 0;
        ws.getCell("B15").value = numES(sotanos) || 0;
        ws.getCell("B16").value = numES(areaLote) || 0;
        ws.getCell("B17").value = numES(areaTipicaPiso) || 0;
        ws.getCell("B19").value = numES(areaSotanos) || 0;
        ws.getCell("B20").value = numES(areaCubierta) || 0;
        ws.getCell("B22").value = numES(numApartamentos) || 0;
        ws.getCell("B23").value = numES(areaPromedioApto) || 0;
        ws.getCell("B24").value = numES(numParqueaderos) || 0;
        ws.getCell("B25").value = numES(numAscensores) || 0;
        ws.getCell("B26").value = numES(alturaTotal) || 0;
      }

      if (modulos.vias) {
        ws.getCell("B14").value = viaTipo;
        ws.getCell("B15").value = viaZona;
        ws.getCell("B16").value = viaTipoIntervencion;
        ws.getCell("B17").value = numES(viaLongitud) || 0;
        ws.getCell("B18").value = numES(viaCarriles) || 0;
        ws.getCell("B19").value = numES(viaVelocidadDiseno) || 0;
        ws.getCell("B20").value = numES(viaAnchoCalzada) || 0;
        ws.getCell("B21").value = numES(viaAnchoCarril) || 0;
        ws.getCell("B22").value = numES(viaAnchoBerma) || 0;
        ws.getCell("B23").value = numES(viaPendienteMax) || 0;
        ws.getCell("B24").value = viaEstructuraPavimento;
        ws.getCell("B25").value = numES(viaCbrDiseno) || 0;
        ws.getCell("B26").value = numES(viaSubbase) || 0;
        ws.getCell("B27").value = numES(viaBase) || 0;
        ws.getCell("B28").value = numES(viaCapaRodadura) || 0;
      }

      if (modulos.hidrocarburos) {
        const ELEMENTOS_HC_ORDEN = {
          civil: ["Adecuación de terrenos (Pad/Cluster)","Vías de acceso industrial","Cimentaciones especiales (pilotes, zapatas, losas)","Sistemas de contención secundaria (diques)","Manejo de aguas - drenaje aceitoso","Manejo de aguas - drenaje pluvial"],
          mecanico: ["Sistemas de separación (bifásicos/trifásicos)","Almacenamiento de fluidos - tanques API 650","Sistemas de bombeo y transferencia","Líneas de flujo y colectores (Manifolds)","Tratamiento de gas (Scrubbers, Tea/Flare)"],
          electrico: ["Generación y distribución (subestaciones, redes)","Automatización (DCS / SCADA)","Seguridad activa (SIS, SDV/BDV, F&G)"],
        };
        let fila = 14;
        ws.getCell(`E${fila}`).value = hcBloques.civil ? "Sí" : "No";
        fila += 1;
        ELEMENTOS_HC_ORDEN.civil.forEach((el) => {
          ws.getCell(`B${fila}`).value = "   • " + el + (hcElementos[el] ? "  —  Sí" : "");
          fila += 1;
        });
        ws.getCell(`E${fila}`).value = hcBloques.mecanico ? "Sí" : "No";
        fila += 1;
        ELEMENTOS_HC_ORDEN.mecanico.forEach((el) => {
          ws.getCell(`B${fila}`).value = "   • " + el + (hcElementos[el] ? "  —  Sí" : "");
          fila += 1;
        });
        ws.getCell(`E${fila}`).value = hcBloques.electrico ? "Sí" : "No";
        fila += 1;
        ELEMENTOS_HC_ORDEN.electrico.forEach((el) => {
          ws.getCell(`B${fila}`).value = "   • " + el + (hcElementos[el] ? "  —  Sí" : "");
          fila += 1;
        });
      }

      let filaAIU = 29;
      if (modulos.vias) filaAIU = 31;
      else if (modulos.hidrocarburos) filaAIU = 33;
      ws.getCell(`B${filaAIU}`).value = numES(administracion) / 100;
      ws.getCell(`B${filaAIU+1}`).value = numES(imprevistos) / 100;
      ws.getCell(`B${filaAIU+2}`).value = numES(utilidad) / 100;
      ws.getCell(`B${filaAIU+3}`).value = numES(ivaUtilidad) / 100;

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `Ficha_Tecnica_${(proyecto || "proyecto").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px] mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Menú SAIEA OBRAS
            </button>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              FICHA TÉCNICA DEL PROYECTO
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>
          ¿QUÉ FRENTES DE TRABAJO TIENE ESTE PROYECTO?
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-3" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { id: "edificacion", nombre: "Edificación / Reformas" },
              { id: "vias", nombre: "Vías y Carreteras" },
              { id: "hidrocarburos", nombre: "Hidrocarburos" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModulos({ edificacion: false, vias: false, hidrocarburos: false, [m.id]: true });
                  // Limpiar todos los campos al cambiar de tipo de proyecto
                  setProyecto(""); setNoContrato(""); setContratista(""); setUbicacion("");
                  setPisos(""); setSotanos(""); setAreaLote(""); setAreaTipicaPiso("");
                  setAreaSotanos(""); setAreaCubierta(""); setNumApartamentos(""); setAreaPromedioApto("");
                  setNumParqueaderos(""); setNumAscensores(""); setAlturaTotal("");
                  setViaTipo(""); setViaLongitud(""); setViaCarriles(""); setViaZona("");
                  setViaTipoIntervencion(""); setViaVelocidadDiseno(""); setViaAnchoCalzada("");
                  setViaAnchoCarril(""); setViaAnchoBerma(""); setViaPendienteMax("");
                  setViaEstructuraPavimento(""); setViaCbrDiseno(""); setViaSubbase("");
                  setViaBase(""); setViaCapaRodadura("");
                  setHcBloques({ civil: false, mecanico: false, electrico: false });
                  setHcElementos({});
                }}
                className="rounded-lg p-2 text-center border"
                style={{
                  borderColor: modulos[m.id] ? GOLD : LINE,
                  background: modulos[m.id] ? "#FFF8E8" : "white",
                }}
              >
                <div className="text-[11px] font-semibold" style={{ color: NAVY }}>{m.nombre}</div>
              </button>
            ))}
          </div>
          <div className="text-[10.5px] text-gray-500">Puedes elegir más de uno si el proyecto combina varios frentes.</div>

          {modulos.vias && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: LINE }}>
              <div className="text-[11.5px] font-semibold mb-2" style={{ color: NAVY }}>Vías y Carreteras</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={viaTipo} onChange={(e) => setViaTipo(e.target.value)} className="border rounded-lg px-2 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option value="">Clasificación de la vía</option>
                  <option value="Primaria">Primaria / Troncal</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Terciaria">Terciaria / Rural</option>
                </select>
                <select value={viaZona} onChange={(e) => setViaZona(e.target.value)} className="border rounded-lg px-2 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option value="">Zona</option>
                  <option value="Urbana">Urbana</option>
                  <option value="Rural">Rural</option>
                </select>
                <select value={viaTipoIntervencion} onChange={(e) => setViaTipoIntervencion(e.target.value)} className="border rounded-lg px-2 py-2 text-[13px] col-span-2" style={{ borderColor: LINE }}>
                  <option value="">Tipo de intervención</option>
                  <option value="Construcción de vía nueva">Construcción de vía nueva</option>
                  <option value="Mejoramiento">Mejoramiento</option>
                  <option value="Rehabilitación">Rehabilitación</option>
                  <option value="Mantenimiento rutinario/periódico">Mantenimiento rutinario/periódico</option>
                </select>
                <Input value={viaLongitud} onChange={(e) => setViaLongitud(e.target.value)} placeholder="Longitud total (km)" />
                <Input value={viaCarriles} onChange={(e) => setViaCarriles(e.target.value)} placeholder="Número de carriles" />
              </div>

              <div className="text-[11px] font-semibold mb-1.5 mt-2" style={{ color: NAVY }}>Especificaciones de diseño de ingeniería</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input value={viaVelocidadDiseno} onChange={(e) => setViaVelocidadDiseno(e.target.value)} placeholder="Velocidad de diseño (km/h)" />
                <Input value={viaAnchoCalzada} onChange={(e) => setViaAnchoCalzada(e.target.value)} placeholder="Ancho de calzada (m)" />
                <Input value={viaAnchoCarril} onChange={(e) => setViaAnchoCarril(e.target.value)} placeholder="Ancho de carril (m)" />
                <Input value={viaAnchoBerma} onChange={(e) => setViaAnchoBerma(e.target.value)} placeholder="Ancho de bermas (m)" />
                <Input value={viaPendienteMax} onChange={(e) => setViaPendienteMax(e.target.value)} placeholder="Pendiente máxima (%)" />
                <select value={viaEstructuraPavimento} onChange={(e) => setViaEstructuraPavimento(e.target.value)} className="border rounded-lg px-2 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option value="">Estructura de pavimento</option>
                  <option value="Flexible / Asfáltico">Flexible / Asfáltico</option>
                  <option value="Rígido / Hidráulico">Rígido / Hidráulico</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={viaCbrDiseno} onChange={(e) => setViaCbrDiseno(e.target.value)} placeholder="CBR de diseño (%)" />
                <Input value={viaSubbase} onChange={(e) => setViaSubbase(e.target.value)} placeholder="Subbase granular (cm)" />
                <Input value={viaBase} onChange={(e) => setViaBase(e.target.value)} placeholder="Base granular (cm)" />
                <Input value={viaCapaRodadura} onChange={(e) => setViaCapaRodadura(e.target.value)} placeholder="Capa de rodadura (cm)" />
              </div>
            </div>
          )}

          {modulos.hidrocarburos && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: LINE }}>
              <div className="text-[11.5px] font-semibold mb-2" style={{ color: NAVY }}>Hidrocarburos — componentes técnicos</div>
              {[
                { id: "civil", nombre: "🏗️ Componente de Obra Civil" },
                { id: "mecanico", nombre: "⚙️ Componente de Construcción y Facilidades Mecánicas" },
                { id: "electrico", nombre: "⚡ Componente Eléctrico, Instrumentación y Control" },
              ].map((b) => (
                <div key={b.id} className="mb-2">
                  <label className="flex items-center gap-2 mb-1.5 text-[12.5px] font-medium" style={{ color: NAVY }}>
                    <input type="checkbox" checked={hcBloques[b.id]} onChange={(e) => setHcBloques({ ...hcBloques, [b.id]: e.target.checked })} />
                    {b.nombre}
                  </label>
                  {hcBloques[b.id] && (
                    <div className="ml-5 pl-2 border-l-2" style={{ borderColor: GOLD }}>
                      {ELEMENTOS_HIDROCARBUROS[b.id].map((el) => (
                        <div key={el} className="mb-1.5">
                          <label className="flex items-center gap-2 text-[11.5px]" style={{ color: NAVY }}>
                            <input
                              type="checkbox"
                              checked={!!hcElementos[el]}
                              onChange={(e) => setHcElementos({ ...hcElementos, [el]: e.target.checked })}
                            />
                            {el}
                          </label>
                          {hcElementos[el] && (
                            <div className="text-[10.5px] text-gray-500 ml-5 mt-0.5 italic">
                              {DESCRIPCIONES_HC[el]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-[10.5px] text-gray-500 mt-1">Marca los elementos que aplican — el catálogo de actividades de Hidrocarburos se ajustará según lo que elijas.</div>
            </div>
          )}
        </div>

        <Campo label="Proyecto">
          <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="Nombre del proyecto" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="No de Contrato">
            <Input value={noContrato} onChange={(e) => setNoContrato(e.target.value)} />
          </Campo>
          <Campo label="Ubicación">
            <BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." />
          </Campo>
        </div>
        <Campo label="Contratista">
          <Input value={contratista} onChange={(e) => setContratista(e.target.value)} />
        </Campo>

        {modulos.edificacion && (
        <>
        <div
          className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2"
          style={{ background: NAVY }}
        >
          DATOS GENERALES DEL PROYECTO
        </div>
        <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de pisos" unidad="pisos">
              <Input type="text" inputMode="decimal" value={pisos} onChange={(e) => setPisos(e.target.value)} />
            </Campo>
            <Campo label="Número de sótanos" unidad="niveles">
              <Input type="text" inputMode="decimal" value={sotanos} onChange={(e) => setSotanos(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área del lote" unidad="m²">
              <Input type="text" inputMode="decimal" value={areaLote} onChange={(e) => setAreaLote(e.target.value)} />
            </Campo>
            <Campo label="Área típica por piso" unidad="m²">
              <Input type="text" inputMode="decimal" value={areaTipicaPiso} onChange={(e) => setAreaTipicaPiso(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área construida - sótanos" unidad="m²">
              <Input type="text" inputMode="decimal" value={areaSotanos} onChange={(e) => setAreaSotanos(e.target.value)} />
            </Campo>
            <Campo label="Área cubierta / cto. máquinas" unidad="m²">
              <Input type="text" inputMode="decimal" value={areaCubierta} onChange={(e) => setAreaCubierta(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de apartamentos" unidad="und">
              <Input type="text" inputMode="decimal" value={numApartamentos} onChange={(e) => setNumApartamentos(e.target.value)} />
            </Campo>
            <Campo label="Área promedio apto." unidad="m²">
              <Input type="text" inputMode="decimal" value={areaPromedioApto} onChange={(e) => setAreaPromedioApto(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de parqueaderos" unidad="und">
              <Input type="text" inputMode="decimal" value={numParqueaderos} onChange={(e) => setNumParqueaderos(e.target.value)} />
            </Campo>
            <Campo label="Número de ascensores" unidad="und">
              <Input type="text" inputMode="decimal" value={numAscensores} onChange={(e) => setNumAscensores(e.target.value)} />
            </Campo>
          </div>
          <Campo label="Altura total aproximada" unidad="m">
            <Input type="text" inputMode="decimal" value={alturaTotal} onChange={(e) => setAlturaTotal(e.target.value)} />
          </Campo>
        </div>
        </>
        )}

        <div
          className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-4"
          style={{ background: NAVY }}
        >
          PARÁMETROS ECONÓMICOS DEL PRESUPUESTO (AIU)
        </div>
        <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Administración (A)" unidad="%">
              <Input type="text" inputMode="decimal" value={administracion} onChange={(e) => setAdministracion(e.target.value)} />
            </Campo>
            <Campo label="Imprevistos (I)" unidad="%">
              <Input type="text" inputMode="decimal" value={imprevistos} onChange={(e) => setImprevistos(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Utilidad (U)" unidad="%">
              <Input type="text" inputMode="decimal" value={utilidad} onChange={(e) => setUtilidad(e.target.value)} />
            </Campo>
            <Campo label="IVA sobre Utilidad" unidad="%">
              <Input type="text" inputMode="decimal" value={ivaUtilidad} onChange={(e) => setIvaUtilidad(e.target.value)} />
            </Campo>
          </div>
          <div className="text-[11.5px] text-gray-500 mt-1">
            AIU total: <b style={{ color: NAVY }}>
              {(numES(administracion || 0) + numES(imprevistos || 0) + numES(utilidad || 0)).toFixed(1)}%
            </b>
          </div>
        </div>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : "Descargar Ficha Técnica en Excel"}
        </button>
      </div>
    </div>
  );
}
