import { useState, useRef, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";
import FormularioAPU from "./FormularioAPU";
import FormularioFicha from "./FormularioFicha";
import FormularioPresupuesto from "./FormularioPresupuesto";
import FormularioCronograma from "./FormularioCronograma";
import FormularioCantidades from "./FormularioCantidades";
import FormularioSemanal from "./FormularioSemanal";
import FormularioActa from "./FormularioActa";
import FormularioMensual from "./FormularioMensual";
import FormularioMemoria from "./FormularioMemoria";
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

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#EEF1F6";
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
const CATALOGO_ITEMS = [{"item": "1", "descripcion": "Localización y Replanteo", "unidad": "M²", "contractual": ""}, {"item": "2", "descripcion": "Cerramiento provisional de obra", "unidad": "ML", "contractual": ""}, {"item": "3", "descripcion": "Instalación de campamento y oficinas provisionales", "unidad": "M²", "contractual": ""}, {"item": "4", "descripcion": "Adecuación de área de almacenamiento", "unidad": "M²", "contractual": ""}, {"item": "5", "descripcion": "Señalización preventiva e informativa de obra", "unidad": "UND", "contractual": ""}, {"item": "6", "descripcion": "Instalaciones provisionales de agua y energía", "unidad": "GL", "contractual": ""}, {"item": "7", "descripcion": "Protección de elementos existentes", "unidad": "M²", "contractual": ""}, {"item": "8", "descripcion": "Desmonte y limpieza inicial", "unidad": "M²", "contractual": ""}, {"item": "9", "descripcion": "Demoliciones preliminares", "unidad": "M³", "contractual": ""}, {"item": "10", "descripcion": "Desmantelamiento de estructuras metálicas existentes", "unidad": "KG", "contractual": ""}, {"item": "11", "descripcion": "Excavación manual en material común", "unidad": "M³", "contractual": ""}, {"item": "12", "descripcion": "Excavación mecánica", "unidad": "M³", "contractual": ""}, {"item": "13", "descripcion": "Excavación en roca", "unidad": "M³", "contractual": ""}, {"item": "14", "descripcion": "Perfilado y conformación de excavaciones", "unidad": "M²", "contractual": ""}, {"item": "15", "descripcion": "Relleno con material seleccionado compactado", "unidad": "M³", "contractual": ""}, {"item": "16", "descripcion": "Relleno con material proveniente de excavación", "unidad": "M³", "contractual": ""}, {"item": "17", "descripcion": "Suministro, extendido y compactación de subbase", "unidad": "M³", "contractual": ""}, {"item": "18", "descripcion": "Suministro, extendido y compactación de base granular", "unidad": "M³", "contractual": ""}, {"item": "19", "descripcion": "Cargue de material sobrante", "unidad": "M³", "contractual": ""}, {"item": "20", "descripcion": "Transporte de material sobrante", "unidad": "M³", "contractual": ""}, {"item": "21", "descripcion": "Disposición final de sobrantes", "unidad": "M³", "contractual": ""}, {"item": "22", "descripcion": "Concreto de limpieza / solado", "unidad": "M³", "contractual": ""}, {"item": "23", "descripcion": "Concreto para zapatas", "unidad": "M³", "contractual": ""}, {"item": "24", "descripcion": "Concreto para vigas de cimentación", "unidad": "M³", "contractual": ""}, {"item": "25", "descripcion": "Concreto para losas de cimentación", "unidad": "M³", "contractual": ""}, {"item": "26", "descripcion": "Concreto para pedestales", "unidad": "M³", "contractual": ""}, {"item": "27", "descripcion": "Acero de refuerzo en cimentación", "unidad": "KG", "contractual": ""}, {"item": "28", "descripcion": "Formaleta para elementos de cimentación", "unidad": "M²", "contractual": ""}, {"item": "29", "descripcion": "Concreto para columnas", "unidad": "M³", "contractual": ""}, {"item": "30", "descripcion": "Concreto para vigas", "unidad": "M³", "contractual": ""}, {"item": "31", "descripcion": "Concreto para losas", "unidad": "M³", "contractual": ""}, {"item": "32", "descripcion": "Concreto para escaleras", "unidad": "M³", "contractual": ""}, {"item": "33", "descripcion": "Concreto para muros estructurales", "unidad": "M³", "contractual": ""}, {"item": "34", "descripcion": "Acero de refuerzo de columnas", "unidad": "KG", "contractual": ""}, {"item": "35", "descripcion": "Acero de refuerzo de vigas", "unidad": "KG", "contractual": ""}, {"item": "36", "descripcion": "Acero de refuerzo de losas", "unidad": "KG", "contractual": ""}, {"item": "37", "descripcion": "Formaleta de columnas", "unidad": "M²", "contractual": ""}, {"item": "38", "descripcion": "Formaleta de vigas", "unidad": "M²", "contractual": ""}, {"item": "39", "descripcion": "Formaleta de losas", "unidad": "M²", "contractual": ""}, {"item": "40", "descripcion": "Formaleta de escaleras", "unidad": "M²", "contractual": ""}, {"item": "41", "descripcion": "Suministro y montaje de perfiles metálicos", "unidad": "KG", "contractual": ""}, {"item": "42", "descripcion": "Placas, pernos y conexiones metálicas", "unidad": "KG", "contractual": ""}, {"item": "43", "descripcion": "Grouting cementoso para reparación estructural", "unidad": "M²", "contractual": ""}, {"item": "44", "descripcion": "Grouting epóxico para reparación estructural", "unidad": "M²", "contractual": ""}, {"item": "45", "descripcion": "Concreto premezclado o de planta (suministro)", "unidad": "M³", "contractual": ""}, {"item": "46", "descripcion": "Mampostería en bloque de concreto", "unidad": "M²", "contractual": ""}, {"item": "47", "descripcion": "Mampostería en ladrillo", "unidad": "M²", "contractual": ""}, {"item": "48", "descripcion": "Mampostería estructural", "unidad": "M²", "contractual": ""}, {"item": "49", "descripcion": "Muros en sistema liviano / drywall", "unidad": "M²", "contractual": ""}, {"item": "50", "descripcion": "Dinteles sobre vanos", "unidad": "ML", "contractual": ""}, {"item": "51", "descripcion": "Alfajías y remates", "unidad": "ML", "contractual": ""}, {"item": "52", "descripcion": "Anclajes y refuerzos de mampostería", "unidad": "UND", "contractual": ""}, {"item": "53", "descripcion": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M²", "contractual": ""}, {"item": "54", "descripcion": "Mampostería en ladrillo a la vista (no reforzada)", "unidad": "M²", "contractual": ""}, {"item": "55", "descripcion": "Estructura metálica o de madera para cubierta", "unidad": "KG", "contractual": ""}, {"item": "56", "descripcion": "Cerchas y elementos estructurales", "unidad": "KG", "contractual": ""}, {"item": "57", "descripcion": "Suministro e instalación de teja", "unidad": "M²", "contractual": ""}, {"item": "58", "descripcion": "Impermeabilización de cubierta", "unidad": "M²", "contractual": ""}, {"item": "59", "descripcion": "Aislamiento térmico/acústico", "unidad": "M²", "contractual": ""}, {"item": "60", "descripcion": "Canales de aguas lluvias", "unidad": "ML", "contractual": ""}, {"item": "61", "descripcion": "Bajantes de aguas lluvias", "unidad": "ML", "contractual": ""}, {"item": "62", "descripcion": "Cielo raso Dry Wall", "unidad": "M²", "contractual": ""}, {"item": "63", "descripcion": "Cielo raso en lámina acústica de fibra mineral", "unidad": "M²", "contractual": ""}, {"item": "64", "descripcion": "Impermeabilización de losas y terrazas", "unidad": "M²", "contractual": ""}, {"item": "65", "descripcion": "Impermeabilización de muros", "unidad": "M²", "contractual": ""}, {"item": "66", "descripcion": "Impermeabilización de zonas húmedas", "unidad": "M²", "contractual": ""}, {"item": "67", "descripcion": "Geomembrana HDPE para impermeabilización de terrenos", "unidad": "M²", "contractual": ""}, {"item": "68", "descripcion": "Pañete / revoque interior", "unidad": "M²", "contractual": ""}, {"item": "69", "descripcion": "Pañete / revoque exterior", "unidad": "M²", "contractual": ""}, {"item": "70", "descripcion": "Pañete impermeabilizado", "unidad": "M²", "contractual": ""}, {"item": "71", "descripcion": "Mortero de nivelación", "unidad": "M²", "contractual": ""}, {"item": "72", "descripcion": "Piso cerámico", "unidad": "M²", "contractual": ""}, {"item": "73", "descripcion": "Piso en porcelanato", "unidad": "M²", "contractual": ""}, {"item": "74", "descripcion": "Piso vinílico", "unidad": "M²", "contractual": ""}, {"item": "75", "descripcion": "Piso laminado", "unidad": "M²", "contractual": ""}, {"item": "76", "descripcion": "Enchape cerámico en muros", "unidad": "M²", "contractual": ""}, {"item": "77", "descripcion": "Guardaescoba", "unidad": "ML", "contractual": ""}, {"item": "78", "descripcion": "Juntas de dilatación / construcción", "unidad": "ML", "contractual": ""}, {"item": "79", "descripcion": "Piso en concreto afinado con endurecedor de cuarzo", "unidad": "M²", "contractual": ""}, {"item": "80", "descripcion": "Baldosa de granito", "unidad": "M²", "contractual": ""}, {"item": "81", "descripcion": "Enchape en granito pulido", "unidad": "M²", "contractual": ""}, {"item": "82", "descripcion": "Pintura vinílica interior", "unidad": "M²", "contractual": ""}, {"item": "83", "descripcion": "Pintura exterior", "unidad": "M²", "contractual": ""}, {"item": "84", "descripcion": "Pintura esmalte en superficies metálicas/madera", "unidad": "M²", "contractual": ""}, {"item": "85", "descripcion": "Pintura anticorrosiva", "unidad": "M²", "contractual": ""}, {"item": "86", "descripcion": "Sellador / imprimante", "unidad": "M²", "contractual": ""}, {"item": "87", "descripcion": "Estuco plástico", "unidad": "M²", "contractual": ""}, {"item": "88", "descripcion": "Estuco tradicional", "unidad": "M²", "contractual": ""}, {"item": "89", "descripcion": "Puertas de madera", "unidad": "UND", "contractual": ""}, {"item": "90", "descripcion": "Muebles fijos de madera", "unidad": "ML", "contractual": ""}, {"item": "91", "descripcion": "Puertas metálicas", "unidad": "UND", "contractual": ""}, {"item": "92", "descripcion": "Barandas metálicas", "unidad": "ML", "contractual": ""}, {"item": "93", "descripcion": "Pasamanos", "unidad": "ML", "contractual": ""}, {"item": "94", "descripcion": "Ventanas de aluminio", "unidad": "M²", "contractual": ""}, {"item": "95", "descripcion": "Divisiones de aluminio", "unidad": "M²", "contractual": ""}, {"item": "96", "descripcion": "Puerta antipánico", "unidad": "UND", "contractual": ""}, {"item": "97", "descripcion": "Vidrio templado", "unidad": "M²", "contractual": ""}, {"item": "98", "descripcion": "Vidrio laminado", "unidad": "M²", "contractual": ""}, {"item": "99", "descripcion": "Espejos", "unidad": "M²", "contractual": ""}, {"item": "100", "descripcion": "Sellos y silicona", "unidad": "ML", "contractual": ""}, {"item": "101", "descripcion": "Tubería de agua fría", "unidad": "ML", "contractual": ""}, {"item": "102", "descripcion": "Tubería de agua caliente", "unidad": "ML", "contractual": ""}, {"item": "103", "descripcion": "Válvulas y accesorios hidrosanitarios", "unidad": "UND", "contractual": ""}, {"item": "104", "descripcion": "Tubería sanitaria", "unidad": "ML", "contractual": ""}, {"item": "105", "descripcion": "Tubería de aguas lluvias", "unidad": "ML", "contractual": ""}, {"item": "106", "descripcion": "Cajas de inspección", "unidad": "UND", "contractual": ""}, {"item": "107", "descripcion": "Aparatos sanitarios", "unidad": "UND", "contractual": ""}, {"item": "108", "descripcion": "Lavamanos", "unidad": "UND", "contractual": ""}, {"item": "109", "descripcion": "Griferías", "unidad": "UND", "contractual": ""}, {"item": "110", "descripcion": "Duchas", "unidad": "UND", "contractual": ""}, {"item": "111", "descripcion": "Pruebas hidráulicas y de estanqueidad", "unidad": "GL", "contractual": ""}, {"item": "112", "descripcion": "Orinal institucional", "unidad": "UND", "contractual": ""}, {"item": "113", "descripcion": "Tubería/conduit eléctrica", "unidad": "ML", "contractual": ""}, {"item": "114", "descripcion": "Bandejas portacables", "unidad": "ML", "contractual": ""}, {"item": "115", "descripcion": "Cajas eléctricas", "unidad": "UND", "contractual": ""}, {"item": "116", "descripcion": "Cableado de fuerza", "unidad": "ML", "contractual": ""}, {"item": "117", "descripcion": "Cableado de iluminación", "unidad": "ML", "contractual": ""}, {"item": "118", "descripcion": "Tableros eléctricos", "unidad": "UND", "contractual": ""}, {"item": "119", "descripcion": "Tomacorrientes", "unidad": "UND", "contractual": ""}, {"item": "120", "descripcion": "Interruptores", "unidad": "UND", "contractual": ""}, {"item": "121", "descripcion": "Luminarias", "unidad": "UND", "contractual": ""}, {"item": "122", "descripcion": "Sistema de puesta a tierra", "unidad": "GL", "contractual": ""}, {"item": "123", "descripcion": "Pruebas y certificaciones", "unidad": "GL", "contractual": ""}, {"item": "124", "descripcion": "Cableado estructurado de datos", "unidad": "ML", "contractual": ""}, {"item": "125", "descripcion": "Rack de comunicaciones", "unidad": "UND", "contractual": ""}, {"item": "126", "descripcion": "Cámaras y sistema CCTV", "unidad": "UND", "contractual": ""}, {"item": "127", "descripcion": "Control de acceso", "unidad": "UND", "contractual": ""}, {"item": "128", "descripcion": "Sistema de citofonía", "unidad": "UND", "contractual": ""}, {"item": "129", "descripcion": "Sistema de detección de incendios", "unidad": "GL", "contractual": ""}, {"item": "130", "descripcion": "Equipos de aire acondicionado", "unidad": "UND", "contractual": ""}, {"item": "131", "descripcion": "Ductos de ventilación", "unidad": "M²", "contractual": ""}, {"item": "132", "descripcion": "Tubería de refrigerante", "unidad": "ML", "contractual": ""}, {"item": "133", "descripcion": "Rejillas y difusores", "unidad": "UND", "contractual": ""}, {"item": "134", "descripcion": "Red interna de gas", "unidad": "ML", "contractual": ""}, {"item": "135", "descripcion": "Válvulas y accesorios de gas", "unidad": "UND", "contractual": ""}, {"item": "136", "descripcion": "Pruebas y certificación", "unidad": "GL", "contractual": ""}, {"item": "137", "descripcion": "Construcción de andenes", "unidad": "M²", "contractual": ""}, {"item": "138", "descripcion": "Placas de concreto exteriores", "unidad": "M³", "contractual": ""}, {"item": "139", "descripcion": "Pavimento en adoquín", "unidad": "M²", "contractual": ""}, {"item": "140", "descripcion": "Sardineles y bordillos", "unidad": "ML", "contractual": ""}, {"item": "141", "descripcion": "Sumideros exteriores", "unidad": "UND", "contractual": ""}, {"item": "142", "descripcion": "Suministro y extendido de tierra vegetal", "unidad": "M³", "contractual": ""}, {"item": "143", "descripcion": "Siembra y jardinería", "unidad": "M²", "contractual": ""}, {"item": "144", "descripcion": "Geotextil para drenaje y filtración", "unidad": "M²", "contractual": ""}, {"item": "145", "descripcion": "Gaviones para obras de contención", "unidad": "M³", "contractual": ""}, {"item": "146", "descripcion": "Filtro francés (drenaje de terrenos)", "unidad": "ML", "contractual": ""}, {"item": "147", "descripcion": "Revegetalización / empradización", "unidad": "M²", "contractual": ""}, {"item": "148", "descripcion": "Rejas metálicas", "unidad": "M²", "contractual": ""}, {"item": "149", "descripcion": "Escaleras metálicas", "unidad": "KG", "contractual": ""}, {"item": "150", "descripcion": "Elementos metálicos especiales", "unidad": "KG", "contractual": ""}, {"item": "151", "descripcion": "Mobiliario fijo de obra", "unidad": "UND", "contractual": ""}, {"item": "152", "descripcion": "Limpieza gruesa y fina de obra", "unidad": "M²", "contractual": ""}, {"item": "153", "descripcion": "Limpieza final para entrega", "unidad": "M²", "contractual": ""}, {"item": "154", "descripcion": "Pruebas, puesta en marcha y ajustes", "unidad": "GL", "contractual": ""}, {"item": "155", "descripcion": "Actualización de planos récord / as-built", "unidad": "GL", "contractual": ""}, {"item": "156", "descripcion": "Entrega, manuales y acta de recibo", "unidad": "GL", "contractual": ""}, {"item": "157", "descripcion": "Suministro e instalación de ascensor eléctrico", "unidad": "UND", "contractual": ""}, {"item": "158", "descripcion": "Estudio de suelos y geotecnia", "unidad": "GL", "contractual": ""}, {"item": "159", "descripcion": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "GL", "contractual": ""}, {"item": "160", "descripcion": "Licencia de construcción y trámites de curaduría urbana", "unidad": "GL", "contractual": ""}, {"item": "161", "descripcion": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "GL", "contractual": ""}];

const emptyCantidad = () => ({
  ubicacion: "",
  item: "",
  descripcion: "",
  contractual: "",
  unidad: "",
  acumAnterior: "",
  avanceDiario: "",
});
const CATALOGO_ESPECIALIDADES = ["Obra Civil", "Estructuras", "Obras Hidrosanitarias", "Obras Eléctricas", "Gas", "Climatización y Ventilación (HVAC)", "Comunicaciones y Seguridad", "Ascensores", "Acabados y Arquitectura", "Mampostería", "Cubiertas e Impermeabilización", "Carpintería y Vidrios", "Pintura", "Urbanismo y Exteriores", "Diseño Arquitectónico", "Diseño Estructural", "Interventoría", "Topografía", "Geotecnia y Suelos", "Gerencia de Proyecto"];
const CATALOGO_CIUDADES_NOMBRES = ["Leticia", "Puerto Nariño", "Medellín", "Bello", "Itagüí", "Envigado", "Rionegro", "Arauca", "Saravena", "Tame", "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia", "Bogotá D.C.", "Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar", "Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa", "Manizales", "La Dorada", "Chinchiná", "Villamaría", "Riosucio", "Florencia", "San Vicente del Caguán", "Puerto Rico", "Yopal", "Aguazul", "Villanueva", "Tauramena", "Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía", "Valledupar", "Aguachica", "Codazzi", "La Jagua de Ibirico", "Quibdó", "Istmina", "Condoto", "Tadó", "Montería", "Cereté", "Lorica", "Sahagún", "Planeta Rica", "Soacha", "Girardot", "Zipaquirá", "Facatativá", "Chía", "Inírida", "San José del Guaviare", "Neiva", "Pitalito", "Garzón", "La Plata", "Riohacha", "Maicao", "Uribia", "Fonseca", "Santa Marta", "Ciénaga", "Fundación", "El Banco", "Villavicencio", "Acacías", "Granada", "Puerto López", "Pasto", "Tumaco", "Ipiales", "Túquerres", "Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Mocoa", "Puerto Asís", "Orito", "Armenia", "Calarcá", "La Tebaida", "Montenegro", "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "San Andrés", "Providencia", "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "Sincelejo", "Corozal", "San Marcos", "Ibagué", "Espinal", "Melgar", "Honda", "Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Mitú", "Puerto Carreño"];
const CATALOGO_MANO_OBRA_NOMBRES = ["Armador", "Ayudante", "Calculista", "Cortador", "Cuadrilla de desmontaje (10 personas)", "Cuadrilla de fabricación", "Cuadrilla de Un Oficial y (2) Obreros.", "Cuadrilla de un oficial y (4) Obreros.", "Dibujante", "Dibujante 2", "Estudios, análisis e informes", "Ingeniero de montaje y prueba", "Ingeniero de Montaje y Prueba Pilote (1)", "Ingeniero Especialista prueba de  integridad", "Ingeniero Geotecnista", "Ingeniero supervisor", "Ingeniero supervisor y director de prueba", "Ingeniero Supervisor y Director de Prueba Pilote", "Inspector", "Inspector de fabricación y montaje", "1 Oficial y 1 Obrero.", "Maestro", "Obrero (10)", "Obrero (2)", "Obrero (3)", "Obrero (4)", "Obrero (5)", "Obrero (6)", "Obrero (7)", "Obrero (8)", "Obrero (9)", "Obrero (prueba de carga)", "Obreros de incado (2)", "Obreros de izado (2)", "Oficial", "Oficial  Obrero (3) Cuadrilla de un oficial y 3 Obreros.", "Oficial (2)", "Oficial (3)", "Oficial + 3 Ayudantes (armado e inyección de anclajes)", "Oficial experto en desmontaje", "Oficial experto en explosivos", "Operador prueba de integridad", "Paletero", "Paletero (2)", "Perforador", "Perforador + Ayudante1 + Ayudante2", "Personal requerido para el diseño y fabricación de estructura metálica. (incluye un calista, un dibujante y la cuadrilla de Fabricación) De esta ultima no hay detalle de que personal la compone.", "Rastrillero", "Rastrilleros (2)", "Soldador", "Soldador (2)", "Soldador 1A", "Soldador experto en montaje y pruebas", "Soldador experto en montaje y pruebas", "Topógrafo", "Obrero", "Viáticos ingeniero y director", "Viáticos soldadores", "Celador", "Operador de retroexcavadora", "Operador de miniexcavadora", "Operador de bulldozer", "Operador de motoniveladora", "Operador de vibrocompactador", "Operador de grúa", "Conductor de volqueta", "Operador de mezcladora de concreto", "Operador de bomba de concreto", "Operador de montacargas", "Oficial electricista", "Ayudante electricista", "Oficial hidrosanitario / plomero", "Ayudante hidrosanitario", "Oficial pintor", "Ayudante de pintura", "Oficial enchapador / embaldosador", "Oficial estucador", "Oficial carpintero", "Ayudante carpintero", "Oficial vidriero / aluminero", "Oficial mampostero / albañil", "Oficial de estructuras metálicas", "Técnico en climatización / HVAC", "Técnico en gas", "Técnico en cableado estructurado / redes", "Técnico en sistemas de seguridad / CCTV", "Técnico instalador de ascensores", "Jardinero", "Aseador de obra", "Almacenista de obra", "Vigilante / celador de obra", "Residente de obra", "Maestro de obra general", "Coordinador SISO / HSEQ", "Operador de excavadora", "Operador de pluma grúa", "Operador de camión grúa", "Conductor de camabaja", "Operador de minicargador", "Operador de planta móvil de concreto", "Operador de cargador", "Operador de pavimentadora", "Operador de extendedora de asfalto", "Operador de trituradora de asfalto", "Cadenero 1o", "Cadenero 2o"];
const CATALOGO_ACTIVIDADES_NOMBRES = CATALOGO_ITEMS.map((it) => it.descripcion);
const CATALOGO_EQUIPOS_NOMBRES = ["Andamiaje para Aplicar la Carga (Equipos Sustituto de la Tara)", "Aspersor manual", "Barredora mecánica de cepillo de 3658 mm ; 6 m3", "Bomba de concreto, Producción: 30 m3/h, POTENCIA: 67 HP, MAX PRESION DE CONCRETO: 1150 PSI", "Bomba de inyección de lechada", "Bomba eléctrica para accionar la celda", "Bomba para gato de tensionamiento", "Buldozer Potencia al volante de 305 HP, motor de 2100 RPM, longitud de hoja 6,39m.", "Buldozer, Potencia al volante de 140 HP, motor de 2200 RPM, longitud de hoja 4,80m.", "Buldozer, Potencia al volante de 80 HP, motor de 2400 RPM, longitud de hoja 3,99m,", "Caldera para pintura termoplástica", "Calentador a gas", "Camabaja", "Camión 350", "Camión de Slurry", "Camioneta D-300", "Camisa", "Camisa para Pilote D=1.20m", "Cargador : Potencia en el volante 110 hp, Clasificación de RPM del motor 2300.", "Cargador : Potencia en el volante 125 hp, Clasificación de RPM del motor 2300.", "Carrotanque de agua(1000 Galones)", "Carrotanque Irrigador de asfalto, 1000 GALONES DE CAPACIDAD", "Cizalla manual de 90 cm.", "Compactador de Rodillo POTENCIA: 99HP, PESO: 8 ton", "Compactador manual (SALTARIN) Peso de operación (Kg.) 52, Fuerza de impacto por golpe (KN) 12.", "Compactador manual de rodillo", "Compactador manual vibratorio (CANGURO) (Apisonadores)", "COMPACTADOR MANUAL VIBRATORIO (RANA) con motor de 6 HP", "Compactador neumático de Potencia 70 HP, peso de 13 ton", "Compactador neumático peso 3,5 ton", "Compactador tipo  POTENCIA: 105 HP, PESO: 6 ton", "Compactador vibratorio tipo DD-20", "Compresor (barrido y soplado)", "Compresor 120 HP, con martillo.", "Compresor 80 HP, con martillo.", "Compresor para penetrar roca", "Cortadora de pavimento", "Cortadora de pavimento, Máxima profundidad de corte: 160 mm. Capacidad de disco: desde 12´´ hasta 18´´ de diámetro. Peso operacional: 135 kg, 13.5 hp de potencia", "Derretidora de asfalto (crafco o similar)", "Diferencial", "Diferencial de 2 ton.", "Diferencial de 3 ton", "Equipo autopropulsado para pintura termoplástica", "Equipo de acarreo interno", "Equipo de control (bandas sonoras reduce velocidad) (Termohigometros, Termómetros, Galgas, etc.)", "Equipo de Medición (Deformimetros Eléctricos, Mecánicos, Celdas de Carga,  Etc.)", "Equipo de oxicorte, Capacidad de corte: hasta 6´´ (152mm)", "Equipo de oxigeno y soldadura", "Equipo de perforación (TRACKDRILL), potencia 40 HP, 2100 golpes / minuto", "Equipo de pintura (Compresor), Presión máxima de trabajo 3300 psi.", "Equipo de rayos X y/o ultrasonido", "Equipo de Sand Blastin y Pintura COMPRESOR 250cfm a 100 psi. PULMON de 70 gal (250 lt.) para 160 psi", "Equipo de Soldadura", "Equipo de soldadura 250 AMP", "Equipo de soldadura 400", "Equipo de soldadura 600", "Equipo de soldadura y de acetileno (incluye soldadura)", "Equipo de topografía", "Equipo de topografía Teodolito electrónico con abertura de anteojo de 42 mm. Aumento del anteojo: 30x.Distancia mínima de enfoque: 1.0 m. Precisión: 5´´. Compensador con rango de trabajo ±3´.", "Equipo de transporte (Camiones, Grúas, Volquetas, etc.)", "Equipo manual aplicador (bandas sonoras reduce velocidad)", "Esparcidor de gravilla, Ancho de esparcimiento 3100mm, Velocidad de trabajo 10—20km2/h", "Estación Total con precisión angular de 6´´. Precisión lineal 2 mm ± 2 ppm", "Formaleta Metálica", "Formaleta metálica (concreto hidráulico)", "Formaleta metálica (tubería de concreto reforzado)", "Formaleta metálica para tubo de 900", "Formaleta para camisa de pilote", "Fresadora de pavimento, potencia 255 HP, peso 19 Ton, PROFUNDIDAD DE CORTE 305 mm", "Fresadora y recicladora de pavimento, potencia 430 HP, peso 20 Ton", "Gato para tensionamiento, fuerza Max 200 ton, área de tensión 314 cm2.", "Grúa (capacidad 15 ton)", "Grúa (Transporte en Obra)", "Grúa 10 ton", "Grúa con barreno o máquina piloteadora", "Grúa con torre", "Grúa Con Torre (2)", "Grúa con torre capacidad 1 ton en la punta.", "Grúa telescópica de 50 Ton.", "Guadañadora, Cilindraje 41.5 cm3, Longitud del mango 1450 mm, Peso 7.4 kg", "Manómetro cable de acero para bajar la celda", "Máquina hidrosembradora", "Maquina térmica pegatachas", "Mezcladora de concreto 1 bulto", "Montacargas", "Motobomba 3 PULGADAS (incluye operario)", "Motobomba 4 pulgadas", "Motobomba 6´´ diámetro de bombeo de 2 m3/seg", "Motobomba de concreto", "Motoniveladora  potencia 215 HP, ancho de cuchilla 4,27 m, peso 18 ton.", "Motoniveladora, potencia 140 HP, ancho de cuchilla 3,66 m, peso 11 ton.", "Motosierra, 93.6 cm3 - 7.1 HP, 45-90 cm - 7.9 kg", "Motosoldador, 300 amperios", "Pala auxiliar de piloteadora", "Pala grúa con martillos", "Piloteadora", "Piloteadora potencia 250KW, RPM 1800, fuerza elevadora 200KN", "Planta de asfalto en caliente", "Planta de asfalto en frio", "Planta eléctrica", "Planta trituradora", "Pluma capacidad 100 kg", "Puente grúa", "Pulidora (8500 REV)", "Pulvimixer", "Recicladora, potencia 430HP", "Regla vibratoria, de longitud de 3 a 5 m, motor de 3600 rpm, potencia 6 HP", "Retrocargador CAT 510", "Retrocargador, pala de 1,1 m3 de capacidad, profundidad de excavación de 4.400 mm y una altura de 5.680 mm", "Retroexcavadora 428 doble trasmisión", "Retroexcavadora A25C", "Retroexcavadora E-200 con martillo neumático", "Retroexcavadora E-200 sobre orugas trabajo en rio", "Retroexcavadora E-200 sobre orugas", "Retroexcavadora sobre llantas", "Retroexcavadora sobre llantas JD 410", "Retroexcavadora sobre llantas, motor 62HP, Profundidad de excavación de 5.41 metros.", "Retroexcavadora sobre oruga, potencia 138 HP, balde de 1,5 m3.", "Retroexcavadora Tipo E-200 o  Equivalente", "Retroexcavadora, Potencia en el Volante 78 HP 2200 RPM", "Ruteadora", "Sensor de Impacto para prueba de integridad tipo", "Taco metálico o puntal (escamas en concreto)", "Taladro de 1/2´´, pulidora, lijadora y circular para corte extremo superior", "Taladro de 1/2´´, pulidora, lijadora y circular", "Taladro industrial", "Tara (Recebo, Agua, Etc.)", "Tarifa de transporte", "Tarifa de transporte (agregados pétreos)", "Tarifa de transporte de concreto hidráulico en mixer", "Tarifa de transporte de estructuras metálicas", "Tarifa de transporte de estructuras metálicas en obra", "Tarifa de transporte de mezclas para bacheo", "Tarifa de transporte de mezclas", "Tarifa de Transporte de Postes", "Tarifa de transporte para agregados de mezclas asfálticas", "Tarifa de Trasporte de especies vegetales", "Terminadora de asfalto (Finisher), potencia 130 HP, peso 15 ton.", "Terminadora de asfalto (Finisher), potencia en el volante 174 HP, R=20M3/H, velocidad de desplazamiento 114 m/min", "Vehículo delineador", "Vehículo delineador R=1500 M/H", "Vibrador de concreto (incluye operario)", "Vibrador de concreto, Motor de 3 hp a 18.000 rpm Mangueras de 4 mt", "Vibrocompactador, tipo benitìn, de peso 700 kg a 1.5 toneladas", "Vibrocompatador Dynapac (10 ton)", "Vibrocompatador Dynapac C15", "Vibrocompatador, potencia 153 HP, peso 10 Ton.", "Volqueta 6 m3", "Pala cuadrada", "Pica / pico", "Carretilla buggy", "Nivel de burbuja (60 cm)", "Nivel láser rotativo", "Plomada", "Flexómetro / cinta métrica 5m", "Martillo de uña", "Combo / mazo", "Taladro percutor eléctrico", "Pulidora / esmeril angular", "Equipo de soldadura eléctrica", "Escuadra metálica", "Andamio tubular por cuerpo", "Escalera tijera 6 pasos", "Balde plástico 20L", "Llana metálica", "Llana de esponja", "Cuchara de albañil", "Cortadora de baldosa manual", "Cortadora de baldosa eléctrica (pulidora con disco diamantado)", "Mezcladora de mortero eléctrica portátil (taladro mezclador)", "Vibrador de concreto tipo aguja (pequeño, eléctrico)", "Regla vibratoria para placas", "Cortadora de varilla manual", "Dobladora de varilla manual", "Cizalla para varilla", "Compactador de placa (canguro) pequeño", "Brocha para pintura (juego)", "Rodillo para pintura (juego)", "Manguera de nivel", "Cortafrío / cincel", "Barra de acero (pata de cabra)", "Cuerda de nylon / piola de construcción", "Guantes de trabajo (par)", "Casco de seguridad", "Arnés de seguridad", "Extensión eléctrica industrial (20m)", "Generador eléctrico portátil", "Sierra circular manual", "Camabaja (tractocamión + remolque cama baja)", "Nivel de precisión", "Andamio multidireccional por cuerpo", "Andamio certificado tipo torre", "Andamio colgante", "Motobomba 8 pulgadas", "Excavadora sobre orugas", "Pala redonda"];

function BuscadorTexto({ value, onChange, catalogo, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
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
        className="w-full text-[13px] px-2.5 py-2 rounded-lg border outline-none"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12px]" style={{ borderColor: LINE }}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
const emptyAvanceCap = () => ({ capitulo: "", porcentaje: "" });
const NOMBRES_CAPITULOS = ["PRELIMINARES", "MOVIMIENTO DE TIERRAS", "CIMENTACIONES", "ESTRUCTURA", "MAMPOSTERÍA", "CUBIERTAS", "IMPERMEABILIZACIONES", "PAÑETES Y REVOQUES", "PISOS Y ENCHAPES", "PINTURA", "CARPINTERÍA", "VIDRIOS", "INSTALACIONES HIDROSANITARIAS", "INSTALACIONES ELÉCTRICAS", "COMUNICACIONES Y SEGURIDAD", "CLIMATIZACIÓN Y VENTILACIÓN", "GAS", "URBANISMO Y EXTERIORES", "OBRAS COMPLEMENTARIAS", "ASEO, ENTREGA Y CIERRE", "ASCENSORES", "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"];

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

function CapturaAvanceObra({ onVolver }) {
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
  const [avanceCapitulos, setAvanceCapitulos] = useState([emptyAvanceCap()]);
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

      try {
        const clave = "ryr_avance_diario_capitulos";
        const guardados = JSON.parse(localStorage.getItem(clave) || "{}");
        avanceCapitulos
          .filter((r) => r.capitulo && r.porcentaje !== "")
          .forEach((r) => {
            guardados[r.capitulo] = { porcentaje: numES(r.porcentaje) || 0, fecha: general.fecha || "" };
          });
        localStorage.setItem(clave, JSON.stringify(guardados));
      } catch (e) {
        console.warn("No se pudo guardar el avance por capítulo en memoria local:", e);
      }

      try {
        const parsearHoras = (texto) => {
          const m = String(texto || "").match(/[\d.]+/);
          return m ? parseFloat(m[0]) : 0;
        };
        const horasHoyManoObra = manoObra
          .filter((r) => r.cargo)
          .reduce((acc, r) => acc + (numES(r.cant) || 0) * parsearHoras(r.tiempo), 0);
        if (horasHoyManoObra > 0 && general.fecha) {
          const claveHoras = "ryr_horas_hombre_diario";
          const guardadasHoras = JSON.parse(localStorage.getItem(claveHoras) || "{}");
          guardadasHoras[general.fecha] = horasHoyManoObra;
          localStorage.setItem(claveHoras, JSON.stringify(guardadasHoras));
        }
      } catch (e) {
        console.warn("No se pudieron guardar las horas hombre en memoria local:", e);
      }

      try {
        const claveAvances = "ryr_avance_diario_actividades";
        const lista = JSON.parse(localStorage.getItem(claveAvances) || "[]");
        [...cantidades, ...otras].forEach((r) => {
          const nombreAct = (r.descripcion || "").trim();
          const cant = numES(r.avanceDiario) || 0;
          if (nombreAct && cant > 0 && general.fecha) {
            lista.push({ actividad: nombreAct, fecha: general.fecha, cantidad: cant, unidad: r.unidad || "" });
          }
        });
        localStorage.setItem(claveAvances, JSON.stringify(lista.slice(-500)));
      } catch (e) {
        console.warn("No se pudo guardar el avance diario por actividad:", e);
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
      className="min-h-screen"
      style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        {onVolver && (
          <button
            onClick={onVolver}
            className="flex items-center gap-1 text-white/80 text-[12.5px] mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Menú SAIEA OBRAS
          </button>
        )}
        <div className="flex items-center justify-between gap-2.5">
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
              INFORME DIARIO DE OBRA
            </div>
            <div className="text-[10.5px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones · RYR-FT-01
            </div>
          </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
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
              <div className="flex-1">
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Especialidad</label>
                <BuscadorTexto value={general.especialidad} onChange={(v) => setG("especialidad", v)} catalogo={CATALOGO_ESPECIALIDADES} placeholder="Especialidad..." />
              </div>
            </div>
            <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Ubicación</label>
                <BuscadorTexto value={general.ubicacion} onChange={(v) => setG("ubicacion", v)} catalogo={CATALOGO_CIUDADES_NOMBRES} placeholder="Ciudad..." />
              </div>
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
                    let contractualReal = it.contractual;
                    try {
                      const pres = JSON.parse(localStorage.getItem("ryr_presupuesto_cantidades") || "{}");
                      const match = Object.values(pres).find((p) => p.actividad === it.descripcion);
                      if (match && match.cantidad) contractualReal = String(match.cantidad);
                    } catch (e) {}
                    setCantidades((rows) =>
                      rows.map((row, idx) =>
                        idx === i
                          ? {
                              ...row,
                              descripcion: it.descripcion,
                              item: it.item,
                              unidad: it.unidad,
                              contractual: contractualReal,
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
              <Field label="Acum. anterior" type="text" inputMode="decimal" value={r.acumAnterior} onChange={(v) => updateRow(setCantidades, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="text" inputMode="decimal" value={r.avanceDiario} onChange={(v) => updateRow(setCantidades, i, "avanceDiario", v)} />
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
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Descripción</label>
                <BuscadorTexto value={r.descripcion} onChange={(v) => updateRow(setOtras, i, "descripcion", v)} catalogo={CATALOGO_ACTIVIDADES_NOMBRES} placeholder="Actividad..." />
              </div>
              <Field label="Unidad" value={r.unidad} onChange={(v) => updateRow(setOtras, i, "unidad", v)} />
              <Field label="Acum. anterior" type="text" inputMode="decimal" value={r.acumAnterior} onChange={(v) => updateRow(setOtras, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="text" inputMode="decimal" value={r.avanceDiario} onChange={(v) => updateRow(setOtras, i, "avanceDiario", v)} />
              <div className="col-span-2">
                <Field label="Observaciones" value={r.observaciones} onChange={(v) => updateRow(setOtras, i, "observaciones", v)} />
              </div>
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setOtras, emptyOtra)} label="Agregar actividad" />
        </Section>

        <Section
          id="avanceCapitulos"
          title="Avance por capítulo (para Informe Semanal)"
          subtitle="Opcional — conecta con el Informe Semanal"
          open={active === "avanceCapitulos"}
          onToggle={toggle}
          count={countFilled(avanceCapitulos)}
        >
          <div className="text-[11px] mb-2" style={{ color: "#7A7F87" }}>
            Reporta aquí el % real acumulado de avance (0 a 100) de los capítulos en los que trabajaste hoy. Se guarda en este dispositivo para que el Informe Semanal lo sugiera solo.
          </div>
          {avanceCapitulos.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setAvanceCapitulos, i)}>
              <div className="col-span-2">
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Capítulo</label>
                <select
                  value={r.capitulo}
                  onChange={(e) => updateRow(setAvanceCapitulos, i, "capitulo", e.target.value)}
                  className="w-full text-[13px] px-2.5 py-2 rounded-lg border outline-none"
                  style={{ borderColor: LINE }}
                >
                  <option value="">Selecciona...</option>
                  {NOMBRES_CAPITULOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Field label="% Real acumulado" type="text" inputMode="decimal" value={r.porcentaje} onChange={(v) => updateRow(setAvanceCapitulos, i, "porcentaje", v)} placeholder="Ej: 35" />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setAvanceCapitulos, emptyAvanceCap)} label="Agregar capítulo" />
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
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Cargo</label>
                <BuscadorTexto value={r.cargo} onChange={(v) => updateRow(setManoObra, i, "cargo", v)} catalogo={CATALOGO_MANO_OBRA_NOMBRES} placeholder="Cargo..." />
              </div>
              <Field label="Cant." type="text" inputMode="decimal" value={r.cant} onChange={(v) => updateRow(setManoObra, i, "cant", v)} />
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
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Descripción</label>
                <BuscadorTexto value={r.descripcion} onChange={(v) => updateRow(setEquipos, i, "descripcion", v)} catalogo={CATALOGO_EQUIPOS_NOMBRES} placeholder="Equipo / herramienta..." />
              </div>
              <Field label="Cant." type="text" inputMode="decimal" value={r.cant} onChange={(v) => updateRow(setEquipos, i, "cant", v)} />
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

// ============================================================
// PANTALLA DE INICIO — Portal SAIEA OBRAS
// ============================================================
const MODULOS = [
  { id: "ficha", nombre: "Ficha Técnica", icono: "/icons/icon-ficha-tecnica.png", activo: true },
  { id: "apus", nombre: "APU's", icono: "/icons/icon-apus.png", activo: true },
  { id: "presupuesto", nombre: "Presupuesto", icono: "/icons/icon-presupuesto.png", activo: true },
  { id: "cronograma", nombre: "Cronograma", icono: "/icons/icon-cronograma.png", activo: true },
  { id: "cantidades", nombre: "Cantidades de Obra", icono: "/icons/icon-cantidades.png", activo: true },
  { id: "diario", nombre: "Informe Diario", icono: "/icons/icon-informe-diario.png", activo: true },
  { id: "semanal", nombre: "Informe Semanal", icono: "/icons/icon-informe-semanal.png", activo: true },
  { id: "mensual", nombre: "Informe Mensual", icono: "/icons/icon-informe-mensual.png", activo: true },
  { id: "memorias", nombre: "Memorias de Cálculo", icono: "/icons/icon-memorias.png", activo: true },
  { id: "acta", nombre: "Acta de Obra", icono: "/icons/icon-acta.png", activo: true },
];

function Inicio({ onSeleccionar }) {
    return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="text-white font-bold text-[17px] tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              SAIEA OBRAS
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>
              Sistema Automatizado de Ingeniería y Administración de Obras
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {MODULOS.map((m) => (
          <button
            key={m.id}
            onClick={() => m.activo && onSeleccionar(m.id)}
            className="flex flex-col items-center justify-center rounded-2xl p-2 gap-1 relative"
            style={{
              background: "white",
              border: `1px solid ${LINE}`,
              opacity: m.activo ? 1 : 0.55,
            }}
          >
            <img src={m.icono} alt={m.nombre} className="w-[70px] h-[70px] object-contain" />
            <div className="text-[12px] font-semibold text-center" style={{ color: NAVY }}>
              {m.nombre}
            </div>
            {!m.activo && (
              <div
                className="absolute top-2 right-2 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: LINE, color: NAVY }}
              >
                Próximamente
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [vista, setVista] = useState("inicio");

  if (vista === "inicio") {
    return <Inicio onSeleccionar={setVista} />;
  }
  if (vista === "diario") {
    return <CapturaAvanceObra onVolver={() => setVista("inicio")} />;
  }
  if (vista === "apus") {
    return <FormularioAPU onVolver={() => setVista("inicio")} />;
  }
  if (vista === "ficha") {
    return <FormularioFicha onVolver={() => setVista("inicio")} />;
  }
  if (vista === "presupuesto") {
    return <FormularioPresupuesto onVolver={() => setVista("inicio")} />;
  }
  if (vista === "cronograma") {
    return <FormularioCronograma onVolver={() => setVista("inicio")} />;
  }
  if (vista === "cantidades") {
    return <FormularioCantidades onVolver={() => setVista("inicio")} />;
  }
  if (vista === "semanal") {
    return <FormularioSemanal onVolver={() => setVista("inicio")} />;
  }
  if (vista === "acta") {
    return <FormularioActa onVolver={() => setVista("inicio")} />;
  }
  if (vista === "mensual") {
    return <FormularioMensual onVolver={() => setVista("inicio")} />;
  }
  if (vista === "memorias") {
    return <FormularioMemoria onVolver={() => setVista("inicio")} />;
  }
  return <Inicio onSeleccionar={setVista} />;
}
