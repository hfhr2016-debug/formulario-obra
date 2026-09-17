import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const DESPERDICIO_REFERENCIA = {"Concreto de limpieza / solado": 0.03, "Concreto para zapatas": 0.03, "Concreto para vigas de cimentación": 0.03, "Concreto para losas de cimentación": 0.03, "Concreto para pedestales": 0.03, "Concreto para columnas": 0.03, "Concreto para vigas": 0.03, "Concreto para losas": 0.03, "Concreto para escaleras": 0.05, "Concreto para muros estructurales": 0.03, "Acero de refuerzo en cimentación": 0.05, "Acero de refuerzo de columnas": 0.05, "Acero de refuerzo de vigas": 0.05, "Acero de refuerzo de losas": 0.05, "Mampostería en bloque de concreto": 0.05, "Mampostería en ladrillo": 0.05, "Mampostería estructural": 0.05, "Muros en sistema liviano / drywall": 0.08, "Suministro e instalación de teja": 0.08, "Pañete / revoque interior": 0.1, "Pañete / revoque exterior": 0.1, "Pañete impermeabilizado": 0.1, "Estuco plástico o tradicional": 0.1, "Piso cerámico": 0.08, "Piso en porcelanato": 0.1, "Piso vinílico": 0.05, "Piso laminado": 0.05, "Enchape cerámico en muros": 0.1, "Pintura vinílica interior": 0.08, "Pintura exterior": 0.1, "Pintura esmalte en superficies metálicas/madera": 0.08, "Pintura anticorrosiva": 0.08, "Ventanas de aluminio": 0.02, "Divisiones de aluminio": 0.02, "Vidrio templado": 0.05, "Vidrio laminado": 0.05, "Tubería de agua fría": 0.05, "Tubería de agua caliente": 0.05, "Tubería sanitaria": 0.05, "Tubería de aguas lluvias": 0.05, "Tubería/conduit eléctrica": 0.05, "Cableado de fuerza": 0.05, "Cableado de iluminación": 0.05, "Impermeabilización de cubierta": 0.05, "Impermeabilización de losas y terrazas": 0.05, "Impermeabilización de muros": 0.05, "Impermeabilización de zonas húmedas": 0.05, "Formaleta de columnas": 0.05, "Formaleta de vigas": 0.05, "Formaleta de losas": 0.05, "Formaleta de escaleras": 0.05, "Formaleta para elementos de cimentación": 0.05, "Construcción de andenes": 0.05, "Sardineles y bordillos": 0.05};
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal"];

function BuscadorTexto({ value, onChange, catalogo, placeholder }) {
  const [abierto, setAbierto] = React.useState(false);
  const resultados = React.useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    const filtrados = catalogo.filter((it) => it.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aE = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bE = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return [...new Set(filtrados)].slice(0, 8);
  }, [value, catalogo]);
  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded px-2 py-1.5 text-[12.5px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((r, i) => (
            <button
              key={i} type="button"
              onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12px]"
              style={{ borderColor: LINE, color: NAVY }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MAPA_ACTIVIDADES = {"Localización y Replanteo": {"fila": 9, "unidad": "ml", "capitulo": "PRELIMINARES"}, "Cerramiento provisional de obra": {"fila": 10, "unidad": "ml", "capitulo": "PRELIMINARES"}, "Instalación de campamento y oficinas provisionales": {"fila": 11, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Adecuación de área de almacenamiento": {"fila": 12, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Señalización preventiva e informativa de obra": {"fila": 13, "unidad": "und", "capitulo": "PRELIMINARES"}, "Instalaciones provisionales de agua y energía": {"fila": 14, "unidad": "gl", "capitulo": "PRELIMINARES"}, "Protección de elementos existentes": {"fila": 15, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Desmonte y limpieza inicial": {"fila": 16, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Demoliciones preliminares": {"fila": 17, "unidad": "m³", "capitulo": "PRELIMINARES"}, "Excavación manual en material común": {"fila": 18, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación mecánica": {"fila": 19, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca": {"fila": 20, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Perfilado y conformación de excavaciones": {"fila": 21, "unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material seleccionado compactado": {"fila": 22, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material proveniente de excavación": {"fila": 23, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de subbase": {"fila": 24, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de base granular": {"fila": 25, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Cargue de material sobrante": {"fila": 26, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Transporte de material sobrante": {"fila": 27, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Disposición final de sobrantes": {"fila": 28, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Concreto de limpieza / solado": {"fila": 29, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para zapatas": {"fila": 30, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para vigas de cimentación": {"fila": 31, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para losas de cimentación": {"fila": 32, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para pedestales": {"fila": 33, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Acero de refuerzo en cimentación": {"fila": 34, "unidad": "kg", "capitulo": "CIMENTACIONES"}, "Formaleta para elementos de cimentación": {"fila": 35, "unidad": "m²", "capitulo": "CIMENTACIONES"}, "Concreto para columnas": {"fila": 36, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para vigas": {"fila": 37, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para losas": {"fila": 38, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para escaleras": {"fila": 39, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para muros estructurales": {"fila": 40, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de columnas": {"fila": 41, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de vigas": {"fila": 42, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de losas": {"fila": 43, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Formaleta de columnas": {"fila": 44, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de vigas": {"fila": 45, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de losas": {"fila": 46, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de escaleras": {"fila": 47, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Suministro y montaje de perfiles metálicos": {"fila": 48, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Placas, pernos y conexiones metálicas": {"fila": 49, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Mampostería en bloque de concreto": {"fila": 50, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería en ladrillo": {"fila": 51, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería estructural": {"fila": 52, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Muros en sistema liviano / drywall": {"fila": 53, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Dinteles sobre vanos": {"fila": 54, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Alfajías y remates": {"fila": 55, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Anclajes y refuerzos de mampostería": {"fila": 56, "unidad": "und", "capitulo": "MAMPOSTERÍA"}, "Estructura metálica o de madera para cubierta": {"fila": 57, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Cerchas y elementos estructurales": {"fila": 58, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Suministro e instalación de teja": {"fila": 59, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Impermeabilización de cubierta": {"fila": 60, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Aislamiento térmico/acústico": {"fila": 61, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Canales de aguas lluvias": {"fila": 62, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Bajantes de aguas lluvias": {"fila": 63, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Impermeabilización de losas y terrazas": {"fila": 64, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de muros": {"fila": 65, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de zonas húmedas": {"fila": 66, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Pañete / revoque interior": {"fila": 67, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete / revoque exterior": {"fila": 68, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete impermeabilizado": {"fila": 69, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Estuco plástico o tradicional": {"fila": 70, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Mortero de nivelación": {"fila": 71, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso cerámico": {"fila": 72, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso en porcelanato": {"fila": 73, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso vinílico": {"fila": 74, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso laminado": {"fila": 75, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Enchape cerámico en muros": {"fila": 76, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Guardaescoba": {"fila": 77, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Juntas de dilatación / construcción": {"fila": 78, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Pintura vinílica interior": {"fila": 79, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura exterior": {"fila": 80, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura esmalte en superficies metálicas/madera": {"fila": 81, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura anticorrosiva": {"fila": 82, "unidad": "m²", "capitulo": "PINTURA"}, "Sellador / imprimante": {"fila": 83, "unidad": "m²", "capitulo": "PINTURA"}, "Puertas de madera": {"fila": 84, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Muebles fijos de madera": {"fila": 85, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Puertas metálicas": {"fila": 86, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Barandas metálicas": {"fila": 87, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Pasamanos": {"fila": 88, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Ventanas de aluminio": {"fila": 89, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Divisiones de aluminio": {"fila": 90, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Vidrio templado": {"fila": 91, "unidad": "m²", "capitulo": "VIDRIOS"}, "Vidrio laminado": {"fila": 92, "unidad": "m²", "capitulo": "VIDRIOS"}, "Espejos": {"fila": 93, "unidad": "m²", "capitulo": "VIDRIOS"}, "Sellos y silicona": {"fila": 94, "unidad": "ml", "capitulo": "VIDRIOS"}, "Tubería de agua fría": {"fila": 95, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de agua caliente": {"fila": 96, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Válvulas y accesorios": {"fila": 128, "unidad": "und", "capitulo": "GAS"}, "Tubería sanitaria": {"fila": 98, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de aguas lluvias": {"fila": 99, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Cajas de inspección": {"fila": 100, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Aparatos sanitarios": {"fila": 101, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Lavamanos": {"fila": 102, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Griferías": {"fila": 103, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Duchas": {"fila": 104, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Pruebas hidráulicas y de estanqueidad": {"fila": 105, "unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería/conduit eléctrica": {"fila": 106, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Bandejas portacables": {"fila": 107, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cajas eléctricas": {"fila": 108, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de fuerza": {"fila": 109, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de iluminación": {"fila": 110, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tableros eléctricos": {"fila": 111, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tomacorrientes": {"fila": 112, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Interruptores": {"fila": 113, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Luminarias": {"fila": 114, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Sistema de puesta a tierra": {"fila": 115, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Pruebas y certificaciones": {"fila": 116, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado estructurado de datos": {"fila": 117, "unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Rack de comunicaciones": {"fila": 118, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Cámaras y sistema CCTV": {"fila": 119, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Control de acceso": {"fila": 120, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de citofonía": {"fila": 121, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de detección de incendios": {"fila": 122, "unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Equipos de aire acondicionado": {"fila": 123, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Ductos de ventilación": {"fila": 124, "unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Tubería de refrigerante": {"fila": 125, "unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Rejillas y difusores": {"fila": 126, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Red interna de gas": {"fila": 127, "unidad": "ml", "capitulo": "GAS"}, "Pruebas y certificación": {"fila": 129, "unidad": "gl", "capitulo": "GAS"}, "Construcción de andenes": {"fila": 130, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Placas de concreto exteriores": {"fila": 131, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Pavimento en adoquín": {"fila": 132, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Sardineles y bordillos": {"fila": 133, "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, "Sumideros exteriores": {"fila": 134, "unidad": "und", "capitulo": "URBANISMO Y EXTERIORES"}, "Suministro y extendido de tierra vegetal": {"fila": 135, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Siembra y jardinería": {"fila": 136, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Rejas metálicas": {"fila": 137, "unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Escaleras metálicas": {"fila": 138, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Elementos metálicos especiales": {"fila": 139, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Mobiliario fijo de obra": {"fila": 140, "unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Limpieza gruesa y fina de obra": {"fila": 141, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Limpieza final para entrega": {"fila": 142, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Pruebas, puesta en marcha y ajustes": {"fila": 143, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Actualización de planos récord / as-built": {"fila": 144, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Entrega, manuales y acta de recibo": {"fila": 145, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}};
const LISTA_ACTIVIDADES = Object.keys(MAPA_ACTIVIDADES);

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

function calcularNeta(unidad, sub) {
  const L = Number(sub.largo) || 0;
  const A = Number(sub.ancho) || 0;
  const H = Number(sub.alto) || 0;
  const N = Number(sub.numElementos) || 1;
  const R = Number(sub.repeticiones) || 1;
  const F = Number(sub.factor) || 1;
  const D = Number(sub.deduccion) || 0;
  const u = (unidad || "").toLowerCase();
  let bruta = 0;
  if (u === "m²" || u === "m2") bruta = L * A * N * R * F;
  else if (u === "m³" || u === "m3") bruta = L * A * H * N * R * F;
  else if (u === "ml") bruta = L * N * R * F;
  else if (u === "und") bruta = N * R * F;
  else if (u === "kg") bruta = L * N * R * F;
  else bruta = L * A * H * N * R * F;
  return Math.round((bruta - D) * 1000) / 1000;
}

function BuscadorActividadCantidad({ onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!texto || texto.length < 2) return [];
    const q = texto.toLowerCase();
    const filtrados = LISTA_ACTIVIDADES.filter((a) => a.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aE = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bE = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return filtrados.slice(0, 8);
  }, [texto]);
  return (
    <div className="relative">
      <input
        placeholder="Busca la actividad a medir..."
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((a, i) => (
            <button
              key={i} type="button"
              onMouseDown={() => { onSeleccionar(a); setTexto(""); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div className="text-[12.5px] font-medium" style={{ color: NAVY }}>{a}</div>
              <div className="text-[10.5px] text-gray-500">
                {MAPA_ACTIVIDADES[a].capitulo} · {MAPA_ACTIVIDADES[a].unidad}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const subMedicionVacia = () => ({
  ubicacion: "", plano: "", largo: "", ancho: "", alto: "",
  numElementos: "", repeticiones: "", factor: "", deduccion: "",
});

const actividadVacia = (nombre) => ({
  actividad: nombre,
  desperdicio: DESPERDICIO_REFERENCIA[nombre] !== undefined ? String(DESPERDICIO_REFERENCIA[nombre]) : "",
  criterio: "",
  responsable: "",
  cargo: "",
  estado: "Pendiente",
  subs: [subMedicionVacia()],
});

function FilaSub({ sub, actualizar, quitar, mostrarQuitar }) {
  return (
    <div className="border rounded-lg p-2 mb-2" style={{ borderColor: LINE, background: "#FAFAF9" }}>
      <div className="flex items-center justify-between mb-1.5">
        <input
          placeholder="Ubicación (ej: Cuarto 1)"
          value={sub.ubicacion}
          onChange={(e) => actualizar({ ...sub, ubicacion: e.target.value })}
          className="flex-1 border rounded px-2 py-1.5 text-[12.5px] mr-2"
          style={{ borderColor: LINE }}
        />
        {mostrarQuitar && (
          <button type="button" onMouseDown={quitar} className="text-[11px] text-red-500">
            Quitar
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <input placeholder="Largo" type="number" value={sub.largo} onChange={(e) => actualizar({ ...sub, largo: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Ancho" type="number" value={sub.ancho} onChange={(e) => actualizar({ ...sub, ancho: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Alto/Prof." type="number" value={sub.alto} onChange={(e) => actualizar({ ...sub, alto: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <input placeholder="N° elem." type="number" value={sub.numElementos} onChange={(e) => actualizar({ ...sub, numElementos: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Repeticiones" type="number" value={sub.repeticiones} onChange={(e) => actualizar({ ...sub, repeticiones: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Deducción" type="number" value={sub.deduccion} onChange={(e) => actualizar({ ...sub, deduccion: e.target.value })} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
      </div>
    </div>
  );
}

function TarjetaActividad({ a, actualizar, quitar }) {
  const [abierta, setAbierta] = useState(true);
  const info = MAPA_ACTIVIDADES[a.actividad];
  const unidad = info?.unidad || "";

  const totalNeta = useMemo(
    () => a.subs.reduce((acc, s) => acc + calcularNeta(unidad, s), 0),
    [a.subs, unidad]
  );
  const totalFinal = Math.round(totalNeta * (1 + (Number(a.desperdicio) || 0)) * 1000) / 1000;

  const actualizarSub = (i, nuevo) => {
    const subs = [...a.subs];
    subs[i] = nuevo;
    actualizar({ ...a, subs });
  };
  const agregarSub = () => actualizar({ ...a, subs: [...a.subs, subMedicionVacia()] });
  const quitarSub = (i) => actualizar({ ...a, subs: a.subs.filter((_, idx) => idx !== i) });

  return (
    <div className="border rounded-lg mb-2 overflow-hidden" style={{ borderColor: LINE }}>
      <button
        type="button" onClick={() => setAbierta(!abierta)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ background: NAVY }}
      >
        <div className="text-left">
          <div className="text-white font-bold text-[12.5px]">{a.actividad}</div>
          <div className="text-[10.5px]" style={{ color: GOLD }}>
            {info?.capitulo} · {unidad} · Total: {totalFinal} {unidad}
          </div>
        </div>
        <button type="button" onMouseDown={(e) => { e.stopPropagation(); quitar(); }} className="text-white/70 text-[11px]">
          Quitar
        </button>
      </button>
      {abierta && (
        <div className="p-3">
          <div className="text-[11px] text-gray-500 mb-2">
            Agrega una tarjeta por cada sitio/parte donde se mide esta actividad — se suman todas solas.
          </div>
          {a.subs.map((s, i) => (
            <FilaSub
              key={i}
              sub={s}
              actualizar={(n) => actualizarSub(i, n)}
              quitar={() => quitarSub(i)}
              mostrarQuitar={a.subs.length > 1}
            />
          ))}
          <button
            type="button" onClick={agregarSub}
            className="w-full py-2 rounded-lg text-[12px] font-semibold border-2 mb-3"
            style={{ borderColor: GOLD, color: NAVY }}
          >
            + Agregar otro sitio para "{a.actividad}"
          </button>

          <div className="grid grid-cols-2 gap-2 mb-1">
            <input
              placeholder="Desperdicio (ej: 0.05 = 5%)"
              type="number"
              value={a.desperdicio}
              onChange={(e) => actualizar({ ...a, desperdicio: e.target.value })}
              className="border rounded px-2 py-1.5 text-[12.5px]"
              style={{ borderColor: LINE }}
            />
            <select
              value={a.estado}
              onChange={(e) => actualizar({ ...a, estado: e.target.value })}
              className="border rounded px-2 py-1.5 text-[12.5px]"
              style={{ borderColor: LINE }}
            >
              <option>Pendiente</option>
              <option>Calculada</option>
              <option>Aprobada</option>
            </select>
          </div>
          {DESPERDICIO_REFERENCIA[a.actividad] !== undefined && (
            <div className="text-[10.5px] mb-2" style={{ color: GOLD }}>
              ⚡ Sugerido: {(DESPERDICIO_REFERENCIA[a.actividad] * 100).toFixed(0)}% (promedio del sector — ajústalo según tu experiencia)
            </div>
          )}
          <input
            placeholder="Responsable"
            value={a.responsable}
            onChange={(e) => actualizar({ ...a, responsable: e.target.value })}
            className="w-full border rounded px-2 py-1.5 text-[12.5px] mb-2"
            style={{ borderColor: LINE }}
          />
          <div className="mb-2">
            <BuscadorTexto value={a.cargo} onChange={(v) => actualizar({ ...a, cargo: v })} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <input
            placeholder="Fórmula / criterio general (opcional)"
            value={a.criterio}
            onChange={(e) => actualizar({ ...a, criterio: e.target.value })}
            className="w-full border rounded px-2 py-1.5 text-[12.5px]"
            style={{ borderColor: LINE }}
          />

          <div className="mt-3 p-2 rounded-lg text-center" style={{ background: "#F0F2F5" }}>
            <div className="text-[11px] text-gray-500">Cantidad neta: {totalNeta} {unidad} · Con desperdicio:</div>
            <div className="text-[16px] font-bold" style={{ color: NAVY }}>{totalFinal} {unidad}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormularioCantidades({ onVolver }) {
  const [actividades, setActividades] = useState([]);
  const [generando, setGenerando] = useState(false);

  const agregar = (nombre) => {
    if (actividades.some((a) => a.actividad === nombre)) {
      alert("Esa actividad ya está en la lista. Agrégale más sitios dentro de su tarjeta en vez de agregarla de nuevo.");
      return;
    }
    setActividades([...actividades, actividadVacia(nombre)]);
  };
  const actualizarActividad = (i, nuevo) => {
    const copia = [...actividades];
    copia[i] = nuevo;
    setActividades(copia);
  };
  const quitarActividad = (i) => setActividades(actividades.filter((_, idx) => idx !== i));

  async function generarExcel() {
    if (actividades.length === 0) {
      alert("Agrega al menos una actividad para medir.");
      return;
    }
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-cantidades.xlsx");
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsCant = workbook.getWorksheet("Cantidades de Obra");
      const wsCalc = workbook.getWorksheet("Cálculo Detallado");

      let filaCalc = 9;
      let idCalc = 1;

      actividades.forEach((a) => {
        const info = MAPA_ACTIVIDADES[a.actividad];
        if (!info) return;
        const unidad = info.unidad;
        const filaCant = info.fila;

        const totalNeta = a.subs.reduce((acc, s) => acc + calcularNeta(unidad, s), 0);
        const desperdicio = Number(a.desperdicio) || 0;
        const totalFinal = Math.round(totalNeta * (1 + desperdicio) * 1000) / 1000;

        wsCant.getCell(`R${filaCant}`).value = desperdicio;
        wsCant.getCell(`S${filaCant}`).value = Math.round(totalNeta * 1000) / 1000;
        wsCant.getCell(`T${filaCant}`).value = totalFinal;
        wsCant.getCell(`U${filaCant}`).value = a.criterio;
        wsCant.getCell(`W${filaCant}`).value = a.cargo ? `${a.responsable} - ${a.cargo}` : a.responsable;
        wsCant.getCell(`X${filaCant}`).value = aFechaDDMMYYYY(fechaLocalHoy());
        wsCant.getCell(`Y${filaCant}`).value = a.estado;
        if (a.subs.length === 1) {
          wsCant.getCell(`F${filaCant}`).value = a.subs[0].ubicacion;
          wsCant.getCell(`G${filaCant}`).value = a.subs[0].plano;
          wsCant.getCell(`J${filaCant}`).value = Number(a.subs[0].largo) || 0;
          wsCant.getCell(`K${filaCant}`).value = Number(a.subs[0].ancho) || 0;
          wsCant.getCell(`L${filaCant}`).value = Number(a.subs[0].alto) || 0;
          wsCant.getCell(`N${filaCant}`).value = Number(a.subs[0].numElementos) || 0;
          wsCant.getCell(`O${filaCant}`).value = Number(a.subs[0].repeticiones) || 0;
          wsCant.getCell(`P${filaCant}`).value = Number(a.subs[0].factor) || 0;
          wsCant.getCell(`Q${filaCant}`).value = Number(a.subs[0].deduccion) || 0;
        } else {
          wsCant.getCell(`F${filaCant}`).value = `${a.subs.length} sitios (ver Cálculo Detallado)`;
        }

        a.subs.forEach((s) => {
          const neta = calcularNeta(unidad, s);
          const final = Math.round(neta * (1 + desperdicio) * 1000) / 1000;
          wsCalc.getCell(`A${filaCalc}`).value = `CAL-${String(idCalc).padStart(3, "0")}`;
          wsCalc.getCell(`D${filaCalc}`).value = a.actividad;
          wsCalc.getCell(`E${filaCalc}`).value = s.ubicacion;
          wsCalc.getCell(`F${filaCalc}`).value = s.plano;
          wsCalc.getCell(`H${filaCalc}`).value = unidad;
          wsCalc.getCell(`I${filaCalc}`).value = Number(s.largo) || 0;
          wsCalc.getCell(`J${filaCalc}`).value = Number(s.ancho) || 0;
          wsCalc.getCell(`K${filaCalc}`).value = Number(s.alto) || 0;
          wsCalc.getCell(`L${filaCalc}`).value = Number(s.numElementos) || 0;
          wsCalc.getCell(`M${filaCalc}`).value = Number(s.repeticiones) || 0;
          wsCalc.getCell(`N${filaCalc}`).value = Number(s.factor) || 0;
          wsCalc.getCell(`O${filaCalc}`).value = Number(s.deduccion) || 0;
          wsCalc.getCell(`P${filaCalc}`).value = desperdicio;
          wsCalc.getCell(`Q${filaCalc}`).value = neta;
          wsCalc.getCell(`R${filaCalc}`).value = final;
          wsCalc.getCell(`S${filaCalc}`).value = a.criterio;
          wsCalc.getCell(`U${filaCalc}`).value = `Parte de ${a.subs.length} sitio(s) que suman el total de esta actividad`;
          filaCalc++;
          idCalc++;
        });
      });

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `Cantidades_de_Obra_${fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = nombreArchivo;
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
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
              CANTIDADES DE OBRA
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="mb-3">
          <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>
            Agregar actividad a medir
          </label>
          <BuscadorActividadCantidad onSeleccionar={agregar} />
        </div>

        <div className="text-[11px] text-gray-500 mb-3">
          Cada actividad puede tener varios sitios de medición (ej. Sala, Cuarto 1, Cuarto 2) — se suman todos automáticamente. El desglose completo queda registrado en la hoja "Cálculo Detallado".
        </div>

        {actividades.length === 0 && (
          <div className="text-center text-[12.5px] text-gray-400 py-8 border rounded-lg" style={{ borderColor: LINE }}>
            Busca una actividad arriba para empezar.
          </div>
        )}

        {actividades.map((a, i) => (
          <TarjetaActividad
            key={a.actividad}
            a={a}
            actualizar={(nuevo) => actualizarActividad(i, nuevo)}
            quitar={() => quitarActividad(i)}
          />
        ))}

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full mt-4 py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : `Descargar Cantidades de Obra (${actividades.length} actividades)`}
        </button>
      </div>
    </div>
  );
}
