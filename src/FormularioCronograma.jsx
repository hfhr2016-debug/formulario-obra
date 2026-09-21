import React, { useState, useMemo } from "react";
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
function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>
        {label}
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

const CATALOGO_ACTIVIDADES = [{"actividad": "Localización y Replanteo", "unidad": "M²"}, {"actividad": "Cerramiento provisional de obra", "unidad": "ML"}, {"actividad": "Instalación de campamento y oficinas provisionales", "unidad": "M²"}, {"actividad": "Adecuación de área de almacenamiento", "unidad": "M²"}, {"actividad": "Señalización preventiva e informativa de obra", "unidad": "UND"}, {"actividad": "Instalaciones provisionales de agua y energía", "unidad": "GL"}, {"actividad": "Protección de elementos existentes", "unidad": "M²"}, {"actividad": "Desmonte y limpieza inicial", "unidad": "M²"}, {"actividad": "Demoliciones preliminares", "unidad": "M³"}, {"actividad": "Desmantelamiento de estructuras metálicas existentes", "unidad": "KG"}, {"actividad": "Excavación manual en material común", "unidad": "M³"}, {"actividad": "Excavación mecánica", "unidad": "M³"}, {"actividad": "Excavación en roca", "unidad": "M³"}, {"actividad": "Perfilado y conformación de excavaciones", "unidad": "M²"}, {"actividad": "Relleno con material seleccionado compactado", "unidad": "M³"}, {"actividad": "Relleno con material proveniente de excavación", "unidad": "M³"}, {"actividad": "Suministro, extendido y compactación de subbase", "unidad": "M³"}, {"actividad": "Suministro, extendido y compactación de base granular", "unidad": "M³"}, {"actividad": "Cargue de material sobrante", "unidad": "M³"}, {"actividad": "Transporte de material sobrante", "unidad": "M³"}, {"actividad": "Disposición final de sobrantes", "unidad": "M³"}, {"actividad": "Concreto de f'c = 175 kg/cm² (2500 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto ciclópeo, incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 210 kg/cm² (3000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 280 kg/cm² (4000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 350 kg/cm² (5000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI", "unidad": "KG"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI", "unidad": "KG"}, {"actividad": "Formaleta para elementos de cimentación", "unidad": "M²"}, {"actividad": "Concreto de f'c = 210 kg/cm² (3000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 280 kg/cm² (4000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 350 kg/cm² (5000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Concreto de f'c = 420 kg/cm² (6000 PSI), incluye vaciado y vibrado", "unidad": "M³"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI", "unidad": "KG"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI", "unidad": "KG"}, {"actividad": "Formaleta de columnas", "unidad": "M²"}, {"actividad": "Formaleta de vigas", "unidad": "M²"}, {"actividad": "Formaleta de losas", "unidad": "M²"}, {"actividad": "Formaleta de escaleras", "unidad": "M²"}, {"actividad": "Suministro y montaje de perfiles metálicos", "unidad": "KG"}, {"actividad": "Placas, pernos y conexiones metálicas", "unidad": "KG"}, {"actividad": "Grouting cementoso para reparación estructural", "unidad": "M²"}, {"actividad": "Grouting epóxico para reparación estructural", "unidad": "M²"}, {"actividad": "Concreto premezclado o de planta (suministro)", "unidad": "M³"}, {"actividad": "Mampostería en bloque de concreto", "unidad": "M²"}, {"actividad": "Mampostería en ladrillo", "unidad": "M²"}, {"actividad": "Mampostería estructural", "unidad": "M²"}, {"actividad": "Muros en sistema liviano / drywall", "unidad": "M²"}, {"actividad": "Dinteles sobre vanos", "unidad": "ML"}, {"actividad": "Alfajías y remates", "unidad": "ML"}, {"actividad": "Anclajes y refuerzos de mampostería", "unidad": "UND"}, {"actividad": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M²"}, {"actividad": "Mampostería en ladrillo a la vista (no reforzada)", "unidad": "M²"}, {"actividad": "Estructura metálica o de madera para cubierta", "unidad": "KG"}, {"actividad": "Cerchas y elementos estructurales", "unidad": "KG"}, {"actividad": "Suministro e instalación de teja", "unidad": "M²"}, {"actividad": "Impermeabilización de cubierta", "unidad": "M²"}, {"actividad": "Aislamiento térmico/acústico", "unidad": "M²"}, {"actividad": "Canales de aguas lluvias", "unidad": "ML"}, {"actividad": "Bajantes de aguas lluvias", "unidad": "ML"}, {"actividad": "Cielo raso Dry Wall", "unidad": "M²"}, {"actividad": "Cielo raso en lámina acústica de fibra mineral", "unidad": "M²"}, {"actividad": "Impermeabilización de losas y terrazas", "unidad": "M²"}, {"actividad": "Impermeabilización de muros", "unidad": "M²"}, {"actividad": "Impermeabilización de zonas húmedas", "unidad": "M²"}, {"actividad": "Geomembrana HDPE para impermeabilización de terrenos", "unidad": "M²"}, {"actividad": "Pañete / revoque interior", "unidad": "M²"}, {"actividad": "Pañete / revoque exterior", "unidad": "M²"}, {"actividad": "Pañete impermeabilizado", "unidad": "M²"}, {"actividad": "Mortero de nivelación", "unidad": "M²"}, {"actividad": "Piso cerámico", "unidad": "M²"}, {"actividad": "Piso en porcelanato", "unidad": "M²"}, {"actividad": "Piso vinílico", "unidad": "M²"}, {"actividad": "Piso laminado", "unidad": "M²"}, {"actividad": "Enchape cerámico en muros", "unidad": "M²"}, {"actividad": "Guardaescoba", "unidad": "ML"}, {"actividad": "Juntas de dilatación / construcción", "unidad": "ML"}, {"actividad": "Piso en concreto afinado con endurecedor de cuarzo", "unidad": "M²"}, {"actividad": "Baldosa de granito", "unidad": "M²"}, {"actividad": "Enchape en granito pulido", "unidad": "M²"}, {"actividad": "Pintura vinílica interior", "unidad": "M²"}, {"actividad": "Pintura exterior", "unidad": "M²"}, {"actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "M²"}, {"actividad": "Pintura anticorrosiva", "unidad": "M²"}, {"actividad": "Sellador / imprimante", "unidad": "M²"}, {"actividad": "Estuco plástico", "unidad": "M²"}, {"actividad": "Estuco tradicional", "unidad": "M²"}, {"actividad": "Puertas de madera", "unidad": "UND"}, {"actividad": "Muebles fijos de madera", "unidad": "ML"}, {"actividad": "Puertas metálicas", "unidad": "UND"}, {"actividad": "Barandas metálicas", "unidad": "ML"}, {"actividad": "Pasamanos", "unidad": "ML"}, {"actividad": "Ventanas de aluminio", "unidad": "M²"}, {"actividad": "Divisiones de aluminio", "unidad": "M²"}, {"actividad": "Puerta antipánico", "unidad": "UND"}, {"actividad": "Vidrio templado", "unidad": "M²"}, {"actividad": "Vidrio laminado", "unidad": "M²"}, {"actividad": "Espejos", "unidad": "M²"}, {"actividad": "Sellos y silicona", "unidad": "ML"}, {"actividad": "Tubería de agua fría", "unidad": "ML"}, {"actividad": "Tubería de agua caliente", "unidad": "ML"}, {"actividad": "Válvulas y accesorios hidrosanitarios", "unidad": "UND"}, {"actividad": "Tubería sanitaria", "unidad": "ML"}, {"actividad": "Tubería de aguas lluvias", "unidad": "ML"}, {"actividad": "Cajas de inspección", "unidad": "UND"}, {"actividad": "Aparatos sanitarios", "unidad": "UND"}, {"actividad": "Lavamanos", "unidad": "UND"}, {"actividad": "Griferías", "unidad": "UND"}, {"actividad": "Duchas", "unidad": "UND"}, {"actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "GL"}, {"actividad": "Orinal institucional", "unidad": "UND"}, {"actividad": "Tubería/conduit eléctrica", "unidad": "ML"}, {"actividad": "Bandejas portacables", "unidad": "ML"}, {"actividad": "Cajas eléctricas", "unidad": "UND"}, {"actividad": "Cableado de fuerza", "unidad": "ML"}, {"actividad": "Cableado de iluminación", "unidad": "ML"}, {"actividad": "Tableros eléctricos", "unidad": "UND"}, {"actividad": "Tomacorrientes", "unidad": "UND"}, {"actividad": "Interruptores", "unidad": "UND"}, {"actividad": "Luminarias", "unidad": "UND"}, {"actividad": "Sistema de puesta a tierra", "unidad": "GL"}, {"actividad": "Pruebas y certificaciones", "unidad": "GL"}, {"actividad": "Cableado estructurado de datos", "unidad": "ML"}, {"actividad": "Rack de comunicaciones", "unidad": "UND"}, {"actividad": "Cámaras y sistema CCTV", "unidad": "UND"}, {"actividad": "Control de acceso", "unidad": "UND"}, {"actividad": "Sistema de citofonía", "unidad": "UND"}, {"actividad": "Sistema de detección de incendios", "unidad": "GL"}, {"actividad": "Equipos de aire acondicionado", "unidad": "UND"}, {"actividad": "Ductos de ventilación", "unidad": "M²"}, {"actividad": "Tubería de refrigerante", "unidad": "ML"}, {"actividad": "Rejillas y difusores", "unidad": "UND"}, {"actividad": "Red interna de gas", "unidad": "ML"}, {"actividad": "Válvulas y accesorios de gas", "unidad": "UND"}, {"actividad": "Pruebas y certificación", "unidad": "GL"}, {"actividad": "Construcción de andenes", "unidad": "M²"}, {"actividad": "Placas de concreto exteriores", "unidad": "M³"}, {"actividad": "Pavimento en adoquín", "unidad": "M²"}, {"actividad": "Sardineles y bordillos", "unidad": "ML"}, {"actividad": "Sumideros exteriores", "unidad": "UND"}, {"actividad": "Suministro y extendido de tierra vegetal", "unidad": "M³"}, {"actividad": "Siembra y jardinería", "unidad": "M²"}, {"actividad": "Geotextil para drenaje y filtración", "unidad": "M²"}, {"actividad": "Gaviones para obras de contención", "unidad": "M³"}, {"actividad": "Filtro francés (drenaje de terrenos)", "unidad": "ML"}, {"actividad": "Revegetalización / empradización", "unidad": "M²"}, {"actividad": "Rejas metálicas", "unidad": "M²"}, {"actividad": "Escaleras metálicas", "unidad": "KG"}, {"actividad": "Elementos metálicos especiales", "unidad": "KG"}, {"actividad": "Mobiliario fijo de obra", "unidad": "UND"}, {"actividad": "Limpieza gruesa y fina de obra", "unidad": "M²"}, {"actividad": "Limpieza final para entrega", "unidad": "M²"}, {"actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "GL"}, {"actividad": "Actualización de planos récord / as-built", "unidad": "GL"}, {"actividad": "Entrega, manuales y acta de recibo", "unidad": "GL"}, {"actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "UND"}, {"actividad": "Estudio de suelos y geotecnia", "unidad": "GL"}, {"actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "GL"}, {"actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "GL"}, {"actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "GL"}];

function BuscadorActividadTarea({ value, onSeleccionar }) {
  const [texto, setTexto] = useState(value || "");
  const [abierto, setAbierto] = useState(false);
  const resultados = React.useMemo(() => {
    if (!texto || texto.length < 2) return [];
    const q = texto.toLowerCase();
    return CATALOGO_ACTIVIDADES.filter((it) => it.actividad.toLowerCase().includes(q)).slice(0, 6);
  }, [texto]);
  return (
    <div className="relative">
      <input
        placeholder="Nombre de la tarea (busca en el catálogo o escribe libre)"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          onSeleccionar({ actividad: e.target.value });
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px] mb-1.5"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((it, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => {
                setTexto(it.actividad);
                setAbierto(false);
                onSeleccionar({ actividad: it.actividad, unidad: it.unidad });
              }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div className="text-[12px] font-medium" style={{ color: NAVY }}>{it.actividad}</div>
              <div className="text-[10.5px] text-gray-500">{it.unidad}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function sugerirDuracion(nombreActividad) {
  try {
    const key = (nombreActividad || "").trim().toLowerCase();
    if (!key) return null;
    const apus = JSON.parse(localStorage.getItem("ryr_apus_guardados") || "{}");
    const cantidades = JSON.parse(localStorage.getItem("ryr_presupuesto_cantidades") || "{}");
    const apu = apus[key];
    const pres = cantidades[key];
    if (apu && apu.rendimiento > 0 && pres && pres.cantidad > 0) {
      return Math.max(1, Math.ceil(pres.cantidad / apu.rendimiento));
    }
  } catch (e) {
    console.warn(e);
  }
  return null;
}


const CATALOGO_CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];
const CATALOGO_ESPECIALIDADES = ["Obra Civil", "Estructuras", "Obras Hidrosanitarias", "Obras Eléctricas", "Gas", "Climatización y Ventilación (HVAC)", "Comunicaciones y Seguridad", "Ascensores", "Acabados y Arquitectura", "Mampostería", "Cubiertas e Impermeabilización", "Carpintería y Vidrios", "Pintura", "Urbanismo y Exteriores", "Diseño Arquitectónico", "Diseño Estructural", "Interventoría", "Topografía", "Geotecnia y Suelos", "Gerencia de Proyecto"];
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal"];

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
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((r, i) => (
            <button
              key={i} type="button"
              onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]"
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

const tareaVacia = () => ({ nombre: "", duracion: "", predecesora: "", recursos: "" });

export default function FormularioCronograma({ onVolver }) {
  const [proyecto, setProyecto] = useState("");
  const [noContrato, setNoContrato] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [fechaInicio, setFechaInicio] = useState(fechaLocalHoy());

  const [tareas, setTareas] = useState([tareaVacia()]);
  const [generando, setGenerando] = useState(false);

  const actualizarTarea = (i, campo, val) => {
    const nuevas = [...tareas];
    nuevas[i] = { ...nuevas[i], [campo]: val };
    setTareas(nuevas);
  };
  const agregarTarea = () => setTareas([...tareas, tareaVacia()]);

  const cargarDesdePresupuesto = () => {
    try {
      const guardadas = JSON.parse(localStorage.getItem("ryr_presupuesto_cantidades") || "{}");
      const actividades = Object.values(guardadas);
      if (actividades.length === 0) {
        alert("Todavía no hay actividades guardadas desde Presupuesto en este dispositivo. Genera un Presupuesto primero (con al menos una cantidad llena) y vuelve a intentarlo.");
        return;
      }
      const nuevasTareas = actividades.map((a) => {
        const sugerida = sugerirDuracion(a.actividad);
        return {
          nombre: a.actividad,
          duracion: sugerida !== null ? String(sugerida) : "",
          predecesora: "",
        };
      });
      setTareas(nuevasTareas);
      alert(`${nuevasTareas.length} actividades cargadas desde el Presupuesto guardado. Ahora solo ordena las dependencias entre ellas.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer las actividades guardadas de Presupuesto.");
    }
  };
  const quitarTarea = (i) => setTareas(tareas.filter((_, idx) => idx !== i));

  // Calcular fechas de inicio/fin de cada tarea según su predecesora (encadenado simple)
  const calculadas = useMemo(() => {
    const resultado = [];
    tareas.forEach((t, i) => {
      const duracion = Math.max(1, numES(t.duracion) || 1);
      let inicio = fechaInicio;
      const numPred = numES(t.predecesora);
      if (t.predecesora && numPred >= 1 && numPred <= tareas.length && resultado[numPred - 1]) {
        inicio = sumarDias(resultado[numPred - 1].fin, 1);
      }
      const fin = sumarDias(inicio, duracion - 1);
      resultado.push({ inicio, fin, duracion });
    });
    return resultado;
  }, [tareas, fechaInicio]);

  const fechaFinProyecto = calculadas.length
    ? calculadas.reduce((max, t) => (t.fin > max ? t.fin : max), calculadas[0].fin)
    : fechaInicio;
  const duracionTotalDias =
    Math.round((new Date(fechaFinProyecto) - new Date(fechaInicio)) / 86400000) + 1;

  async function generarExcel() {
    if (tareas.every((t) => !t.nombre)) {
      alert("Agrega al menos una tarea con nombre.");
      return;
    }
    try {
      localStorage.setItem("ryr_cronograma_fechas", JSON.stringify({
        fechaInicio, fechaFinProyecto, duracionTotalDias, proyecto,
      }));
    } catch (e) {
      console.warn("No se pudo guardar las fechas del cronograma:", e);
    }
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-cronograma.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Cronograma ");

      ws.getCell("B11").value = proyecto;
      ws.getCell("I11").value = aFechaDDMMYYYY(fechaLocalHoy());
      ws.getCell("B12").value = noContrato;
      ws.getCell("I12").value = ubicacion;
      ws.getCell("I13").value = especialidad;

      const meses = (duracionTotalDias / 30.4).toFixed(1);
      ws.getCell("A8").value =
        `Inicio: ${aFechaDDMMYYYY(fechaInicio)}   |   Fin: ${aFechaDDMMYYYY(fechaFinProyecto)}   |   Duración: ${duracionTotalDias} días calendario (≈${meses} meses)`;

      tareas.forEach((t, i) => {
        if (!t.nombre) return;
        const r = 15 + i;
        const c = calculadas[i];
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = t.nombre;
        ws.getCell(`C${r}`).value = `${c.duracion}d`;
        ws.getCell(`D${r}`).value = aFechaDDMMYYYY(c.inicio);
        ws.getCell(`E${r}`).value = aFechaDDMMYYYY(c.fin);
        const partesH = [];
        if (t.recursos) partesH.push(`Recursos: ${t.recursos}`);
        if (t.predecesora) partesH.push(`Depende de tarea #${t.predecesora}`);
        ws.getCell(`H${r}`).value = partesH.join(" | ");
      });

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `Cronograma_${(proyecto || "proyecto").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
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
              CRONOGRAMA DE OBRA
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Proyecto">
            <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} />
          </Campo>
          <Campo label="No. de Contrato">
            <Input value={noContrato} onChange={(e) => setNoContrato(e.target.value)} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Ubicación">
            <BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." />
          </Campo>
          <Campo label="Especialidad">
            <BuscadorTexto value={especialidad} onChange={setEspecialidad} catalogo={CATALOGO_ESPECIALIDADES} placeholder="Especialidad..." />
          </Campo>
        </div>
        <Campo label="Fecha de inicio del proyecto">
          <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </Campo>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2" style={{ background: NAVY }}>
          TAREAS
        </div>
        <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: LINE }}>
          <button
            type="button"
            onClick={cargarDesdePresupuesto}
            className="w-full text-center py-2.5 rounded-lg text-[12.5px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Cargar actividades desde Presupuesto guardado
          </button>
          <div className="text-[11px] text-gray-500 mb-3">
            Esto reemplaza la lista de tareas actual con las actividades que ya tengan cantidad en tu Presupuesto guardado. En "Depende de" escribe el número de la tarea de la lista que debe terminar antes de que esta empiece (déjalo vacío si no depende de ninguna).
          </div>
          {tareas.map((t, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>
                  Tarea #{i + 1}
                </span>
                {tareas.length > 1 && (
                  <button onClick={() => quitarTarea(i)} className="text-[11px] text-red-500">
                    Quitar
                  </button>
                )}
              </div>
              <BuscadorActividadTarea
                value={t.nombre}
                onSeleccionar={(sel) => {
                  const nuevas = [...tareas];
                  const sugerida = sugerirDuracion(sel.actividad);
                  let recursosSugeridos = nuevas[i].recursos;
                  try {
                    const guardados = JSON.parse(localStorage.getItem("ryr_apus_guardados") || "{}");
                    const apu = guardados[sel.actividad.trim().toLowerCase()];
                    if (apu) {
                      const partes = [];
                      if (apu.cuadrilla) partes.push(apu.cuadrilla);
                      if (apu.equipos) partes.push(apu.equipos);
                      if (partes.length > 0) recursosSugeridos = partes.join(" · ");
                    }
                  } catch (e) {}
                  nuevas[i] = {
                    ...nuevas[i],
                    nombre: sel.actividad,
                    duracion: sugerida !== null ? String(sugerida) : nuevas[i].duracion,
                    recursos: recursosSugeridos,
                  };
                  setTareas(nuevas);
                }}
              />
              <input
                placeholder="Recursos asignados (mano de obra / equipo)"
                value={t.recursos}
                onChange={(e) => { const c = [...tareas]; c[i] = { ...c[i], recursos: e.target.value }; setTareas(c); }}
                className="w-full border rounded px-2 py-1.5 text-[12px] mt-1.5"
                style={{ borderColor: LINE }}
              />
              {sugerirDuracion(t.nombre) !== null && (
                <div className="text-[10.5px] mb-1.5" style={{ color: GOLD }}>
                  ⚡ Duración sugerida según APU + Presupuesto guardados: {sugerirDuracion(t.nombre)} días (editable)
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  placeholder="Duración (días)"
                  type="text" inputMode="decimal"
                  value={t.duracion}
                  onChange={(e) => actualizarTarea(i, "duracion", e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-[12.5px]"
                  style={{ borderColor: LINE }}
                />
                <input
                  placeholder="Depende de tarea #"
                  type="text" inputMode="decimal"
                  value={t.predecesora}
                  onChange={(e) => actualizarTarea(i, "predecesora", e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-[12.5px]"
                  style={{ borderColor: LINE }}
                />
              </div>
              {t.nombre && calculadas[i] && (
                <div className="text-[11px] text-gray-500 mt-1">
                  {aFechaDDMMYYYY(calculadas[i].inicio)} → {aFechaDDMMYYYY(calculadas[i].fin)}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={agregarTarea}
            className="w-full py-2 rounded-lg text-[12.5px] font-semibold border-2"
            style={{ borderColor: GOLD, color: NAVY }}
          >
            + Agregar otra tarea
          </button>
        </div>

        <div className="p-3 rounded-lg my-4 text-center" style={{ background: NAVY }}>
          <div className="text-[11px]" style={{ color: GOLD }}>DURACIÓN TOTAL DEL PROYECTO</div>
          <div className="text-white font-bold text-[16px]">
            {aFechaDDMMYYYY(fechaInicio)} — {aFechaDDMMYYYY(fechaFinProyecto)} ({duracionTotalDias} días)
          </div>
        </div>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : "Descargar Cronograma en Excel"}
        </button>
      </div>
    </div>
  );
}
