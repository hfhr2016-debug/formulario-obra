import { useState, useRef, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { AuthProvider, useAuth } from "./AuthContext";
import PantallaLogin from "./PantallaLogin";
import PanelAdmin from "./PanelAdmin";
import FormularioAPU from "./FormularioAPU";
import FormularioFicha from "./FormularioFicha";
import FormularioPresupuesto from "./FormularioPresupuesto";
import FormularioPresupuestoNuevo from "./FormularioPresupuestoNuevo";
import FormularioCronograma from "./FormularioCronograma";
import FormularioCantidades from "./FormularioCantidades";
import FormularioCantidadesNuevo from "./FormularioCantidadesNuevo";
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
const CATALOGO_COMBINADO_DIARIO = JSON.parse(String.raw`[{"tipo": "edificacion", "actividad": "Replanteo general de ejes y niveles", "unidad": "ml", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Desmonte desacapote y limpieza", "unidad": "m2", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Cerramiento provisional de obra", "unidad": "ml", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Instalación de campamento y oficinas provisionales", "unidad": "m²", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Adecuación de área de almacenamiento", "unidad": "m²", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Señalización preventiva e informativa de obra", "unidad": "und", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Instalaciones provisionales de agua y energía", "unidad": "gl", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Protección de elementos existentes", "unidad": "m²", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Desmonte y limpieza inicial", "unidad": "m²", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Demoliciones preliminares", "unidad": "m³", "capitulo": "PRELIMINARES"}, {"tipo": "edificacion", "actividad": "Excavación manual en material común", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Excavación mecánica", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Excavación en roca", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Perfilado y conformación de excavaciones", "unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Relleno con material seleccionado compactado", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Relleno con material proveniente de excavación", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Suministro, extendido y compactación de subbase", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Suministro, extendido y compactación de base granular", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Cargue de material sobrante", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Transporte de material sobrante", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Disposición final de sobrantes", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "edificacion", "actividad": "Concreto de limpieza / solado", "unidad": "m³", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Concreto para zapatas", "unidad": "m³", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Concreto para vigas de cimentación", "unidad": "m³", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Concreto para losas de cimentación", "unidad": "m³", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Concreto para pedestales", "unidad": "m³", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Acero de refuerzo en cimentación", "unidad": "kg", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Formaleta para elementos de cimentación", "unidad": "m²", "capitulo": "CIMENTACIONES"}, {"tipo": "edificacion", "actividad": "Concreto para columnas", "unidad": "m³", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Concreto para vigas", "unidad": "m³", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Concreto para losas", "unidad": "m³", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Concreto para escaleras", "unidad": "m³", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Concreto para muros estructurales", "unidad": "m³", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Acero de refuerzo de columnas", "unidad": "kg", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Acero de refuerzo de vigas", "unidad": "kg", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Acero de refuerzo de losas", "unidad": "kg", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Formaleta de columnas", "unidad": "m²", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Formaleta de vigas", "unidad": "m²", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Formaleta de losas", "unidad": "m²", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Formaleta de escaleras", "unidad": "m²", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Suministro y montaje de perfiles metálicos", "unidad": "kg", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Placas, pernos y conexiones metálicas", "unidad": "kg", "capitulo": "ESTRUCTURA"}, {"tipo": "edificacion", "actividad": "Mampostería en bloque de concreto", "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Mampostería en ladrillo", "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Mampostería estructural", "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Muros en sistema liviano / drywall", "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Dinteles sobre vanos", "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Alfajías y remates", "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Anclajes y refuerzos de mampostería", "unidad": "und", "capitulo": "MAMPOSTERÍA"}, {"tipo": "edificacion", "actividad": "Estructura metálica o de madera para cubierta", "unidad": "kg", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Cerchas y elementos estructurales", "unidad": "kg", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Suministro e instalación de teja", "unidad": "m²", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Impermeabilización de cubierta", "unidad": "m²", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Aislamiento térmico/acústico", "unidad": "m²", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Canales de aguas lluvias", "unidad": "ml", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Bajantes de aguas lluvias", "unidad": "ml", "capitulo": "CUBIERTAS"}, {"tipo": "edificacion", "actividad": "Impermeabilización de losas y terrazas", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, {"tipo": "edificacion", "actividad": "Impermeabilización de muros", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, {"tipo": "edificacion", "actividad": "Impermeabilización de zonas húmedas", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, {"tipo": "edificacion", "actividad": "Pañete / revoque interior", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, {"tipo": "edificacion", "actividad": "Pañete / revoque exterior", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, {"tipo": "edificacion", "actividad": "Pañete impermeabilizado", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, {"tipo": "edificacion", "actividad": "Estuco plástico o tradicional", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, {"tipo": "edificacion", "actividad": "Mortero de nivelación", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Piso cerámico", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Piso en porcelanato", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Piso vinílico", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Piso laminado", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Enchape cerámico en muros", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Guardaescoba", "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Juntas de dilatación / construcción", "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, {"tipo": "edificacion", "actividad": "Pintura vinílica interior", "unidad": "m²", "capitulo": "PINTURA"}, {"tipo": "edificacion", "actividad": "Pintura exterior", "unidad": "m²", "capitulo": "PINTURA"}, {"tipo": "edificacion", "actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "m²", "capitulo": "PINTURA"}, {"tipo": "edificacion", "actividad": "Pintura anticorrosiva", "unidad": "m²", "capitulo": "PINTURA"}, {"tipo": "edificacion", "actividad": "Sellador / imprimante", "unidad": "m²", "capitulo": "PINTURA"}, {"tipo": "edificacion", "actividad": "Puertas de madera", "unidad": "und", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Muebles fijos de madera", "unidad": "ml", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Puertas metálicas", "unidad": "und", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Barandas metálicas", "unidad": "ml", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Pasamanos", "unidad": "ml", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Ventanas de aluminio", "unidad": "m²", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Divisiones de aluminio", "unidad": "m²", "capitulo": "CARPINTERÍA"}, {"tipo": "edificacion", "actividad": "Vidrio templado", "unidad": "m²", "capitulo": "VIDRIOS"}, {"tipo": "edificacion", "actividad": "Vidrio laminado", "unidad": "m²", "capitulo": "VIDRIOS"}, {"tipo": "edificacion", "actividad": "Espejos", "unidad": "m²", "capitulo": "VIDRIOS"}, {"tipo": "edificacion", "actividad": "Sellos y silicona", "unidad": "ml", "capitulo": "VIDRIOS"}, {"tipo": "edificacion", "actividad": "Tubería de agua fría", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Tubería de agua caliente", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Válvulas y accesorios", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Tubería sanitaria", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Tubería de aguas lluvias", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Cajas de inspección", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Aparatos sanitarios", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Lavamanos", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Griferías", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Duchas", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"tipo": "edificacion", "actividad": "Tubería/conduit eléctrica", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Bandejas portacables", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Cajas eléctricas", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Cableado de fuerza", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Cableado de iluminación", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Tableros eléctricos", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Tomacorrientes", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Interruptores", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Luminarias", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Sistema de puesta a tierra", "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Pruebas y certificaciones", "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"tipo": "edificacion", "actividad": "Cableado estructurado de datos", "unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Rack de comunicaciones", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Cámaras y sistema CCTV", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Control de acceso", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Sistema de citofonía", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Sistema de detección de incendios", "unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"tipo": "edificacion", "actividad": "Equipos de aire acondicionado", "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"tipo": "edificacion", "actividad": "Ductos de ventilación", "unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"tipo": "edificacion", "actividad": "Tubería de refrigerante", "unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"tipo": "edificacion", "actividad": "Rejillas y difusores", "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"tipo": "edificacion", "actividad": "Red interna de gas", "unidad": "ml", "capitulo": "GAS"}, {"tipo": "edificacion", "actividad": "Válvulas y accesorios", "unidad": "und", "capitulo": "GAS"}, {"tipo": "edificacion", "actividad": "Pruebas y certificación", "unidad": "gl", "capitulo": "GAS"}, {"tipo": "edificacion", "actividad": "Construcción de andenes", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Placas de concreto exteriores", "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Pavimento en adoquín", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Sardineles y bordillos", "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Sumideros exteriores", "unidad": "und", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Suministro y extendido de tierra vegetal", "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Siembra y jardinería", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, {"tipo": "edificacion", "actividad": "Rejas metálicas", "unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"tipo": "edificacion", "actividad": "Escaleras metálicas", "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"tipo": "edificacion", "actividad": "Elementos metálicos especiales", "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"tipo": "edificacion", "actividad": "Mobiliario fijo de obra", "unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"tipo": "edificacion", "actividad": "Limpieza gruesa y fina de obra", "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"tipo": "edificacion", "actividad": "Limpieza final para entrega", "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"tipo": "edificacion", "actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"tipo": "edificacion", "actividad": "Actualización de planos récord / as-built", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"tipo": "edificacion", "actividad": "Entrega, manuales y acta de recibo", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"tipo": "edificacion", "actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "und", "capitulo": "ASCENSORES"}, {"tipo": "edificacion", "actividad": "Estudio de suelos y geotecnia", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"tipo": "edificacion", "actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"tipo": "edificacion", "actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"tipo": "edificacion", "actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"tipo": "vias", "actividad": "Desmonte y limpieza en bosque", "unidad": "ha", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Desmonte y limpieza en zonas no boscosas", "unidad": "ha", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de edificaciones", "unidad": "gl", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de estructuras", "unidad": "gl", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de pavimentos rígidos, pisos, andenes y bordillos de concreto", "unidad": "gl", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de obstáculos", "unidad": "gl", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de edificaciones", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de estructuras", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de estructuras", "unidad": "m3", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de pavimentos rígidos", "unidad": "m2", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de pisos y andenes de concreto", "unidad": "m2", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Demolición de bordillos de concreto", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Desmontaje y traslado de estructuras metálicas", "unidad": "kg", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de especies vegetales", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de obstáculos (se deberá hacer un ítem de pago para cada tipo de obstáculo)", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de ductos de servicios existentes", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de alcantarillas", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de cercas de alambre", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Traslado de postes", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Traslado de torres", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de rieles", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de defensas metálicas", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Remoción de barreras de seguridad", "unidad": "m", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo I traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo I traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo I traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo II traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo II. traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo II traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo III traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo III traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante  de arboles tipo III traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo IV traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo IV traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Transplante de arboles tipo IV traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES"}, {"tipo": "vias", "actividad": "Excavación sin clasificar de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Excavación sin clasificar de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Excavación en roca de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Excavación en material común de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Excavación en roca de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Excavación en material común de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Remoción de derrumbes", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"tipo": "vias", "actividad": "Terraplenes", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Pedraplén compacto", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Pedraplén suelto", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geotextil de refuerzo tipo NT-2500 para terraplenes reforzados por  geosinteticos", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geomalla de refuerzo tipos asphalt", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Relleno seleccionado para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Relleno tipo sub base granular para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Relleno tipo base granular para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Mejoramiento de la subrasante con adicion de materiales", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geotextil para separación de suelos de subrasante y capas granulares", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geotextil para estabilización de la subrasante", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geomalla para estabilizaciòn de suelos de subrasante", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Geomalla para refuerzo de capas granulares", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Conformación de taludes existentes", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Subrasante estabilizada con cemento (incluye el suministro de cemento)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Subrasante estabilizada con cemento (no incluye el suministro de cemento)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Cemento para estabilizacion de subrasante", "unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Subrasante estabilizada con cal (incluye suministro de cal)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Subrasante estabilizada con cal (no incluye suministro de cal)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Cal hidratada para estabilizacion de subrasante", "unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS"}, {"tipo": "vias", "actividad": "Conformación de la calzada existente", "unidad": "m2", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Afirmado", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Tratamiento paliativo de polvo aplicado en forma sólida en hojuelas", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Tratamiento paliativo de polvo aplicado en forma sólida en esferas", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Tratamiento paliativo de polvo aplicado en forma líquida", "unidad": "lt", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Material granular de adición", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Subbase granular clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Subbase granular clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Subbase granular clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Sub-base granular  para bacheo clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Sub-base granular  para bacheo clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Sub-base granular  para bacheo clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular para bacheo clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular para bacheo clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base granular para bacheo clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base estabilizada con emulsión asfáltica tipo BEE-38", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base estabilizada con emulsión asfáltica tipo BEE-25", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base estabilizada con emulsión asfáltica tipo BEE-5", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-d gradacion tipo a (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-d gradacion tipo b (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-r gradacion tipo a (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-r gradacion tipo b (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-d gradacion tipo a (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-d gradacion tipo b (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-r gradacion tipo a (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Suelo-cemento clase sc-r gradacion tipo b (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Cemento hidraulico para suelo-cemento", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base tratada con cemento resistencia R-3.5 (incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base tratada con cemento resistencia R-5.2 (incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base tratada con cemento resistencia R-3.5 (no incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Base tratada con cemento resistencia R-5.2 (no incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Cemento hidraulico para base tratada con cemento", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, {"tipo": "vias", "actividad": "Cemento asfáltico de penetración 40-50", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico de penetración 60-70.", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico de penetración 80-100", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Suministro de emulsión asfáltica de rotura media crm.", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Emulsión asfáltica de rotura lenta CRL-1 ard", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Emulsión asfáltica de rotura lenta CRL-1 arb", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Suministro de emulsión asfáltica de rotura lenta CRL-1h", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfaltico con grano de caucho reciclado tipo I", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfaltico con grano de caucho reciclado tipo II", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfaltico con grano de caucho reciclado tipo  III", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo I", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo II a", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo II b", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo III", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo IV", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Cemento asfáltico modificado con polímeros tipo V.", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Emulsión asfáltica de rotura media, modificada con polímeros, crm-m", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de imprimación con emulsión asfáltica crl -0", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de imprimación con emilsíon asfáltica CRL-1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de imprimación con asfalto liquido", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de liga con emulsión asfáltica CRR-1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de liga con emulsión asfáltica CRR-2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de liga con emulsión modificada con polímeros crr- 1m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Riego de liga con emulsión modificada con polímeros crr- 2m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial simple con emulsión CRR-2 gradacion 19", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial simple con emulsión CRR-2 gradacion 13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial simple con emulsión CRR-2 m gradacion 19", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial simple con emulsión CRR-2m  gradacion 13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial doble con emulsión CRR-2. tipo 1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial doble con emulsión CRR-2. tipo 2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial doble con emulsión CRR-2 m tipo 1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Tratamiento superficial doble con emulsión CRR-2 m tipo 2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Sello de arena-asfalto con emulsión CRR-2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Sello de arena-asfalto con emulsión CRR-2m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-10", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-5", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-3", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-10", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-5", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-3", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en frío tipo MDF-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en frío tipo MDF-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en frío tipo MDF-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en frío para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en frío tipo MAF-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en frío tipo MAF-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en frío tipo MAF-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en frío  tipo MAF-38 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en caliente tipo MDC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en caliente tipo MDC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla densa en caliente tipo MDC-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla semidensa en caliente tipo MSC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla semidensa en caliente tipo MSC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla gruesa en caliente tipo MGC-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla gruesa en caliente tipo MGC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla de alto módulo MAM-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla en caliente para bacheo MSC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla en caliente para bacheo MGC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla en caliente para bacheo MGC-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en caliente tipo MAC-75", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en caliente tipo MAC-63", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en caliente tipo MAC-50", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla abierta en caliente tipo mac -50 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla discontinua en caliente tipo M-13", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla discontinua en caliente tipo M-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla discontinua en caliente tipo F-13", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla discontinua en caliente tipo F-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla drenante", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Fresado de pavimento asfáltico en espesor de  10 cm", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Fresado de pavimento asfáltico en espesor de 5 cm", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Pavimento reciclado en frío en el lugar con emulsión asfáltica", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Pavimento reciclado en frío en el lugar con cemento asfáltico espumado", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-25 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-19  para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Geotextil para repavimentaciòn", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Excavación para reparación de pavimento asfáltico existente incluyendo el corte y la remociòn de las capas asfalticas subyacentes", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Excavaciòn para la reparaciòn de pavimento asfaltico existente excluyendo el corte y la remociòn de las capas asfalticas y de las subyacentes.", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Sello de grietas en pavimento asfáltico sin ruteo.", "unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Sello de grietas en pavimento asfáltico con ruteo.", "unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, {"tipo": "vias", "actividad": "Pavimento de concreto hidráulico.", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Pavimento de concreto hidráulico de fraguado rapido (fast track)", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Cemento porthland, norma astm C150, tipo ______ . se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Cemento hidraulico  sdicionado, norma astm C595, tipo ______ se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Cemento hidraulico especificado por desempeño, norma astm C1137, tipo ______ .se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Base de concreto hidráulico", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Pavimento de adoquines de concreto.", "unidad": "m2", "capitulo": "PAVIMENTO RIGIDO"}, {"tipo": "vias", "actividad": "Excavaciones varias sin clasificar", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Excavaciones varias en roca en seco.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Excavaciones varias en roca bajo agua.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Excavaciones varias en material comun en seco", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Excavaciones varias en material común bajo agua.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Rellenos para estructuras con suelo.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Rellenos para estructuras con recebo.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Relleno para estructuras con material granular tipo sbg", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Relleno para estructuras con material granular tipo bg", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Rellenos con material filtrante", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Relleno con gravilla", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Relleno con arena", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Pilotes prefabricados de concreto diámetro 0,40 m", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Extension de pilotes, seccion, 0.40 metros", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Prueba de carga tipo ________ se debera elabora r items de pago independiente por cada tipo de prueba.", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Pilote de concreto vaciado in situ, de diámetro 1 m_", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Pilote de concreto vaciado in situ, de diámetro 1,2 m, incluye excavación en roca, bajo agua", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Base acampanada.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Perforacion de prueba para pilote, d= variable", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Perforacion de prueba para base acampanada", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Camisa permanente de diámetro exterior variable", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Camisa permanente de diámetro exterior 1,50 m, en concreto", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Prueba de carga tipo (pilote pre excavado)", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Prueba de integridad tipo ____", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Tablestacado de madera", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Tablestacado metálico.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Tablestacado de concreto reforzado.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Tablestacado de concreto pre esforzado.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Corte del extremo superior del elemento.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Anclaje tipo _____ (roca)", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Prueba de carga", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 35MPA (a)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 32MPA (b)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 28MPA (c )", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 21MPA (d)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 17.5MPA (e )", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 14MPA  (f)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Concreto resistencia 14MPA (g) (ciclopeo)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Baranda de concreto, cocreto 21 MPa", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Baranda de concreto concreto 28 MPa.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Acero de refuerzo fy 4200 MPa.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Malla de refuerzo fy 4200 MPa.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Acero de preesfuerzo.", "unidad": "tf/m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Acero de preesfuerzo.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Apoyo elastomérico.", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Sello para juntas de puentes.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Diseño y fabricación de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Fabricación de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Transporte de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Montaje y pintura  de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, {"tipo": "vias", "actividad": "Tubería de concreto simple 14 MPa de 450 mm de diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Tubería de concreto simple de 14 MPa de 600 mm d diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.concreto simple y cada diametro que tengan las tuberias", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Tubería de concreto reforzado  21 MPa de 900 mm de diametro interior", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Tubería corrugada de acero galvanizado MP-68, de lámina calibre__ y diametro __", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Tubería corrugada de acero con recubrimiento bituminoso, de lámina calibre 12  y D=60´´", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Tubería de plastico tipo__norma___de diametro__mm", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 1: recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 2: recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 3: recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 4: recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Disipadores de energía y sedimentadores en concreto ciclopeo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Cuneta de concreto vaciada in situ; no incluye la conformacion de la superficie de apoyo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Cuneta de piezas prefabricadas de concreto; no incluye la conformacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Cuneta de concreto vaciada in situ; incluye la conformacion de la superficie de apoyo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Cuneta de piezas prefabricadas de concreto; incluye la conformacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Bordillo de concreto vaciado in situ; no incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Bordillo de piezas prefabricadas de concreto; no incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Bordillo de concreto vaciado in situ; incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Bordillo de piezas prefabricadas de concreto; incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Geotextil tipo NT-2500 o similar no tejido", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Geotextil  tipo T-2400 o similar tejido", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Material granular drenante", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Material de cobertura tipo sub- base CBR=20%", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Dren horizontal de longitud menor o igual a diez (10) metros.", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Dren horizontal de longitud mayor a diez (10) metros.", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, {"tipo": "vias", "actividad": "Páneles de concreto.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Armadura galvanizada.", "unidad": "m", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Relleno granular para tierra mecanicamete estabilizada con páneles de concreto", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Gaviónes de malla de alambre de acero entrelazado  clase 1; recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Gavión de malla de alambre de acero entrelazado  clase 2; recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Gavión de malla de alambre de acero entrelazado  clase 3; recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Gavión de malla de alambre de acero etrelazado  clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Colchogavión de malla de alambre de acero entrelazado clase 1; recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Colchogavión de malla de alambre de acero entrelazado clase 2; recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Colchogavión de malla de alambre de acero entrelazado clase 3; recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Colchogavión de malla de alambre de acero entrelazado clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Geotextil de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Geomalla de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Geotextil de fachada tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Geomalla de fachada tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Relleno tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Impermeabilizante para concreto", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Impermeabilización de estructuras.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, {"tipo": "vias", "actividad": "Línea de demarcación con pintura en frío.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Línea de demarcación con resina termoplástica.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Marca vial con pintura en frío.", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Marca vial con resina termoplástica.", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Tacha reflectiva.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Señal vertical de transito tipo 1 con lamina retrorreflectiva tipo III (75 X 75 ) cm", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Señal vertical de transito tipo 2 con lamina retrorreflectiva tipo (1.20X0.40 m)", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Poste de referencia.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Defensa metálica.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Sección final.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Sección de tope.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Elemento especial tipo amortiguadores", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Defensa de concreto.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Captafaros.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Delineador de corona.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, {"tipo": "vias", "actividad": "Cerca de alambre de puas con postes de madera.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Cerca de alambre de puas con postes de concreto.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Cerca de malla con postes de madera.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Cerca de malla con postes de concreto.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte aerea de arboles tipo I", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte aerea de arboles tipo II", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte aerea de arboles tipo III", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte aerea de arboles tipo IV", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte radicular de arboles tipo I", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte radficular de arboles tipo II", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte radicular de arboles tipo III", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Poda de la parte radicular de arboles tipo  IV", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Protección de taludes con bloques de césped.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Protección de taludes con tierra orgánica.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Protección de taludes con hidrosiembra controlada.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto temporal. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto permanente. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Recubrimiento de taludes con malla y mortero 1:4 de e= 10 cm", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Plantación de árboles (tipo paisajístico)", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Plantación de árboles (reforestación protectora densidad 1100)", "unidad": "ha", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, {"tipo": "vias", "actividad": "Transporte de materiales provenientes de la excavacion de la explanacion, canales y prestamos, entre  cien metros (100 m) y mil metros (1000 m) de distancia", "unidad": "m3/e", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, {"tipo": "vias", "actividad": "Transporte de materiales provenientes de la excavación de la explanación, canales y préstamos para distancias mayores de mil metros (1.000 m) medido a partir de cien metros (100 m).", "unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, {"tipo": "vias", "actividad": "Transporte de materiales provenientes de derrumbes, medido a partir de cien metros (100 m)", "unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, {"tipo": "hidrocarburos", "actividad": "Localización y replanteo de locaciones, explanaciones y/o facilidades", "unidad": "HA", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Localización y replanteo de obras lineales (vías, líneas de flujo y líneas del sistema eléctrico),", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Rocería, incluye tala de arboles con dap≤0.15m, incluye transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tala de árboles con dap>0.15m, incluye transporte y disposición final", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desmonte, descapote y limpieza incluye  tala de arboles con dap ≤0.15m, transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Pulverización de palmas in situ con alturas ≤2,50m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Pulverización de palmas in situ con alturas >2,50m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura inferior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura superior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura inferior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura superior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Excavación mecánica en material común, incluye transporte a una distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Excavación mecánica en roca, incluye transporte a una distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Excavación y relleno compensado, incluye transporte distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Excavación manual en material común, incluye cargue y transporte distancia ≤ a 1 km", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Acarreo de material (compactado)  a distancia > 1km.", "unidad": "M³-KM", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Transporte fluvial (compactado).", "unidad": "M³-KM", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Mejoramiento de la subrasante y conformación de cunetas", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 1: arena lavada de río o gravilla o una mezcla de estos dos materiales", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 2: recebo o material de préstamo seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 3: material granular", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 4: material de excavación seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 5: material de afirmado", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 6: subbase granular", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 7: base granular", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 8: piedra partida", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 9: tierra negra", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 10: gravas bien gradadas", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 11: material de relleno para zanjas de tuberia", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 12: material de río seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tipo 13: material de arrecife", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Densificacion del terreno mediante columnas de grava de 6” a 12” de diámetro interno  (incluye perforación y suministro de materiales de relleno).", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Escarificación de bases o suelos estabilizados y/o componentes asfálticos", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  a (350 kg/cm2 ó 5000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  b (320 kg/cm2 ó 4570 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  c (280 kg/cm2 ó 4000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  d (210 kg/cm2 ó 3000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  e (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  e con mineral rojo (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto clase  f (140 kg/cm2 ó 2000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto ciclopeo clase  g (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto  de limpieza clase  h (105 kg/cm2 ó 1500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tejido frp (tipo sikawrap 600c o similar)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Láminas cfrp (tipo sikacarbodur  ancho 50 mm)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Junta de construcción con cinta pvc 22", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Junta de construcción con cinta pvc 15", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Junta de contracción", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Junta de dilatación", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Junta impermeabilizada", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Mortero para pañete , incluye filos y dilataciones. (espesor 1,5 cm)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Mortero de pega (espesor 1,5cm)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Mortero impermeabilizado (espesor 1,5cm)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Grouting cementoso", "unidad": "L", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Grouting epóxico", "unidad": "L", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Preparación, suministro e instalación de mortero impermeabilizado  + poliester + pintura", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Preparación, suministro e instalación de mortero impermeabilizado  + poliester", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Acero fy:  60000 psi (4.200 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Acero a-37 fy: 34200 psi (2,400 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla electro soldada fy:  60000 psi (4.200 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla electro soldada fy: 34200 psi (2,400 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion perfilería astm a36 (columnas, vigas, entrepisos, casetas, etc.)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion perfilería a572 grado 50 (columnas, vigas, entrepisos, casetas, etc.)", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion tubería para estructuras a53 grado b", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion estructura metálica para misceláneos", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion pernos de anclaje pre-instalado", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion pernos de anclaje con epóxico", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion lamina colaborante h= 2” calibre 16 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion lamina colaborante h= 2” calibre 18 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion lamina colaborante h= 3” calibre 16 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion lamina colaborante h= 3” calibre 18 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion tubo conductor de ø12\" a ø20\". (incluye el transporte )", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion de tubo conductor de ø22\" a ø30\".(incluye el transporte )", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion tubo conductor de ø12\" a ø20\".(incluye suministro y transporte)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de tubo conductor de ø22\" a ø30\". (incluye suministro y transporte)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion de tubo conductor  hincado con piloteadora para l>15m", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion de estructuras plasticas, skimmers, trampa de aguas grises o desarenador. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de estructuras plasticas, skimmers, trampa de aguas o grises, desarenador, incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion de estructuras metalicas, skimmers, trampa de aguas grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de estructuras metalicas, skimmers, trampa de aguas o grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de caseta en polipropileno de alta densidad para vigilancia", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de cuneta portátil (ecocanal 66 × 200) incluye excavación", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla tipo ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50m, concertina de ø 18” y cable sensor de intrusión. (nivel 3 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla expandida tipo imf 100, muro en ladrillo macizo, concertina de ø 18” y cable sensor de intrusión. altura mínima de 2,50m (nivel 3 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Muro en mampostería confinada, concertina de ø 18” y cable sensor de intrusión.  altura mínima de 2,50m (nivel 3 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla tipo ciclón  de acero inoxidable cal 10 2” x 2” altura mayor a 2,50 m y concertina de ø 18”,  altura mínima de 2,50m.(nivel 2 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla expandida tipo imf 100, muro en ladrillo macizo y concertina de ø 18”. altura mínima de 2,50m. (nivel 2 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Muro en mampostería confinada y concertina de ø 18”.  (nivel 2 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerca de alambre de púas 5 hilos. (con poste en concreto) (nivel 1 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Malla ciclón con alambre de púas altura mínima de 2,50m. (nivel 1 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Muro mampostería confinada altura mínima de 2,50m. (nivel 1 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerca de alambre de púas 5 hilos. (con poste en polipropileno)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerca de alambre de púas 5 hilos. (con poste en polipropileno reutilizado)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerramiento modular, con malla electro soldada galvanizada y plastificada", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerramiento modular, con malla ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50 m", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Cerramiento en lamina de zinc", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de puertas en malla eslabonada cal 10  2\" x 2\"", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto hidráulico para pavimento rígido. resistencia especificada 5000 psi", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Concreto hidráulico para pavimento rígido. resistencia especificada 4000 psi", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Base granular (relleno tipo 7) estabilizada con emulsión asfáltica  incluye emulsión asfáltica crl-1", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Base granular (relleno tipo 7) estabilizada con cemento. incluye el cemento", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suelo estabilizado con cemento. incluye el cemento", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Imprimación. riego de imprimación con emulsión asfáltica crl-1.", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro, extendido, nivelación y compactación de mezcla densa en caliente tipo 2", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro, extendido, nivelación y compactación de mezcla densa en frio  tipo 2", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de slurry asfáltico", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tratamiento superficial simple", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tratamiento superficial doble", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suelo arcilloso estabilizado con productos quimicos estabilizadores. incluye productos quimicos", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Pavimento asfaltico para bacheo", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demarcación línea continua blanca a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demarcación línea discontinua amarilla a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Marcas viales", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación señal vertical grupo i - 75 cm x 75 cm", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomembrana hdpe para impermeabilización.  de 20 mils.", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomembrana hdpe para impermeabilización.  de 40 mils,  e: 1.0 mm", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomembrana de hdpe para confinamiento de hidrocarburos (piscinas).  de 60 mils,  e: 1.5 mm", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 400 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 470 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 500 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 700 n-2500 nt", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1140 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1870 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo, alto modulo resistencia minima  a la tension 2400 n", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomalla uniaxial", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomalla  biaxial (tension min pico: long 12 kn/m, transv 19 kn/m)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geomalla  biaxial (tension min pico: long 19 kn/m, transv 28,5 kn/m)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Sistema de confinamiento celular", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Gaviones  (incluye malla, alambre galvanizado, piedra y demás materiales)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Colcha gaviones (incluye malla, alambre galvanizado, piedra y demás materiales)", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Hexápodos", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro y construcción de filtro francés", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Geodren planar", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en concreto 3000 psi", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en ciclopeo 2500 psi", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 5 cm", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 8 cm", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 13 cm", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Limpieza a mano de alcantarillas de tubo de 24” y 36”", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Limpieza a mano de encoles y descoles", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Bolsacreto", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Sacos rellenos con suelo", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Sacos rellenos con suelo y cemento (rel : 5: 1.)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Empradización con cespedón continuo", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Empradizacion con estolón", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Fajinas vivas", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Empradizacion con semilla al voleo", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Revegetalizacion con especies arboreas nativas", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Revegetalizacion con especies arboreas foraneas", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Protección de taludes con biomanto", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Extendido y conformacion de material vegetal (descapote) incluye transporte < 1km", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Trinchos  tipo  a", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Trinchos  tipo  b", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Trinchos  tipo  c", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Trinchos  tipo  d", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro y construcción de trincho tipo canal", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro y construcción de barreras con geotextil", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc para drenaje  ǿ 8\" perforada", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc para drenaje  ǿ 6\" perforada", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc para drenaje  ǿ 4\" perforada", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería de concreto reforzado ǿ 48\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería de concreto reforzado ǿ 36\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería de concreto reforzado ǿ 24\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería de concreto reforzado ǿ 16\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 36\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 24\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 16\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 14\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 12\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 10\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 8\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería novaloc-novafort ø 6\"", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc drenaje de aguas lluvias  ø 8” a ø 12”", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc drenaje de aguas lluvias  ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc sanitaria,  entre ø 2” a ø 3”", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc sanitaria,  entre ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc sanitaria,  entre ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc  øs  1/2\", 3/4\", 1\" rh. (red hidráulica)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc ø 2\"  rh", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc  ø 3\"  rh", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Tubería pvc ø 4\" rh", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demolición manual de concreto", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demolición mecánica de concreto", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demolición de pavimento flexible", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Demolición muros en mampostería.", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desmantelamiento cerramiento en malla eslabonada (incluye concertina y accesorios)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desmantelamiento cerramiento en alambre de púas.", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desmonte de estructuras metálicas. incluye transporte ≤ 20km y disposición final", "unidad": "KG", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desmonte o retiro y transporte ≤ 20km, e instalación o acopio de trampas metálicas portábles (aceitosas, grasas  y desarenador, hasta el sitio de disposición, instalación o acopio autorizado por ecp)", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desinstalación e instalación de estructuras plásticas skimmers, trampa de aguas grises o desarenador, incluye retiro de la estructura y transporte ≤ 20km", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Transporte de equios y materiales", "unidad": "TON-KM", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Mezcla de lodos con material en zona de piscinas", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Retiro y estabilización de materiales de piscina, incluye transporte hasta 1 km", "unidad": "M3", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Retiro y disposición final de geomembrana y su incineración. incluye transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado  de  pilotes  d=6” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado  de  pilotes  d=8” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado  de  pilotes  d=10” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado  de  pilotes  d=12” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado de pilotes en madera d=6” a 8” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e hincado de pilotes en madera d=10” a 12” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de placas modulares para helipuerto con aditivo antiestático-protección uv y anclajes o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Instalacion de placas modulares en polipropileno de alta densidad", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Desinstalación de placas modulares reutilizables", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construcción de puente petrolero (ancho 4 m)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construcción de puente petrolero (ancho 4 m - tubería suministrada por ecp)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construcción de tablero para puente petrolero (ancho 4 m)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construcción de tablero para puente petrolero (ancho 4 m - tubería suministrada por ecp)", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Protección de cables para puentes colgantes", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Construccion de piezometro o pozo de monitoreo", "unidad": "M", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Limpieza e hidrolavado (trabajo en alturas)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Alistamiento de superficie (para instalación de fibras de carbono u otras actividades requeridas)", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de mortero de reparación para recubrimiento", "unidad": "M2", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación neopreno reforzado (250x250x10 mm).", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de placa de abandono", "unidad": "UND", "capitulo": "1. Civiles generales"}, {"tipo": "hidrocarburos", "actividad": "Estuco y pintura", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Pintura tipo 1 sobre pañete, para interiores", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Pintura tipo koraza para exteriores", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Pintura esmalte", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Estuco y pintura mochetas, antepechos, dinteles", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Sanitario línea institucional (incluye grifería y accesorios)", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Orinal institucional mediano (incluye grifería y accesorios)", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Lavamanos sobreponer incluye griferías y accesorios", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de punto hidráulico pvc de ø; 1/2”, 3/4\" y  1\". incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de punto hidráulico pvc ø1-1/2\", ø 2”. incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de registros, cheques  de ø 3/4,  1/2\", 1\", 1 1/2\"", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de registros, cheques  de ø 2\", 21/2”", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Suministro e instalación de punto sanitario ø 2\", 3\", 4\".", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Mampostería a la vista no reforzada", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Mamposteria muros en bloque", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Piso en concreto afinado con endurecedor de cuarzo tráfico alto y acabado en cemento esmaltado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Piso en concreto escobiado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Instalación de pisos (no incluye suministro del piso)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Enchape muros (no incluye suministro de enchape)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Guardaescoba media caña ó cerámica  (no incluye suministro)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Piso tablón de gress porcelanico de 40x40cm. color: gris mate", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Baldosa de granito tráfico pesado color blanco 0.40x0.40", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Enchapes y pisos en cerámica de 25cmx25cm. zonas húmedas", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Enchape en granito pulido, color blanco para mesones o entrepaños en concreto (portería + baño)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Guardaescoba en cerámica de 10x25cm. color: blanco", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Guardaescoba media caña en granito pulido", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Cubierta metálica acanalada calibre 26, termoacustica", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Terminales y caballete", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Cubierta en teja termo-acústica metálica calibre 26", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Canal en pvc", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Bajante en pvc  3\" y  4\"", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Cielo raso dry wall", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Cielo raso en lámina acústica en fibra mineral clase as-s1", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Canal en lamina calibre 20", "unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Puertas metálicas calibre 18 (incluye marcos)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Ventanería en aluminio, incluye vidrio  6mm templado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Espejos 5mm", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Puerta antipánico de 1.00 x2.50 m  calibre 18 doble hoja", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, {"tipo": "hidrocarburos", "actividad": "Supervisor civil", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Oficial de construcción", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Ayudante de construcción (obrero raso)", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Buldozer potencia minima 120hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Moto niveladora potencia minima 120hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Retroexcavadora potencia minima 130hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Vibrocompactador peso minimo 10ton", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Vibrocompactador pata de cabra", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Carrotanque sencillo irrigador de agua", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Carrotanque dobletroque irrigador de agua", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Retroexcavadora potencia minima 75hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Volqueta tipo sencilla con capacidad mínima de 6 m3", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Volqueta tipo dt con capacidad mínima de 15 m3", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Motobomba 4\"", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Motobomba 6\"", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Alquiler de andamios certificados", "unidad": "M³-DIA", "capitulo": "3. Suministros y/o alquiler"}, {"tipo": "hidrocarburos", "actividad": "Transporte armado y desarmado de andamios certificados", "unidad": "M3", "capitulo": "3. Suministros y/o alquiler"}]`);
function tipoProyectoDiario() {
  try {
    const d = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    const m = d?.modulos || {};
    if (m.vias) return "vias";
    if (m.hidrocarburos) return "hidrocarburos";
  } catch (e) {}
  return "edificacion";
}
function catalogoItemsDiario() {
  const tipo = tipoProyectoDiario();
  return CATALOGO_COMBINADO_DIARIO.filter((a) => a.tipo === tipo).map((a, i) => ({ item: String(i + 1), descripcion: a.actividad, unidad: a.unidad, contractual: "" }));
}
function nombresActividadesDiario() { return catalogoItemsDiario().map((it) => it.descripcion); }
function nombresCapitulosDiario() {
  const tipo = tipoProyectoDiario();
  const vistos = [];
  CATALOGO_COMBINADO_DIARIO.forEach((a) => { if (a.tipo === tipo && a.capitulo && !vistos.includes(a.capitulo)) vistos.push(a.capitulo); });
  return vistos;
}

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
      ? catalogoItemsDiario().filter((it) =>
          it.descripcion.toLowerCase().includes(texto.toLowerCase())
        ).slice(0, 8)
      : catalogoItemsDiario().slice(0, 8);

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

function CapturaAvanceObra({ onVolver, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
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
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="diario" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center gap-2 mb-3">
          {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} />}
          {onVolver && (
            <button
              onClick={onVolver}
              className="flex items-center gap-1 text-white/80 text-[12.5px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Menú SAIEA OBRAS
            </button>
          )}
        </div>
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
            <div className="text-[10.5px] mb-1" style={{ color: GOLD }}>
              Reformas y Remodelaciones · RYR-FT-01
            </div>
            <IndicadorTipoProyecto />
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
                <BuscadorTexto value={r.descripcion} onChange={(v) => updateRow(setOtras, i, "descripcion", v)} catalogo={nombresActividadesDiario()} placeholder="Actividad..." />
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
                  {nombresCapitulosDiario().map((c) => (
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

function SelectorApps({ onSeleccionar, perfil, onCerrarSesion, onIrAdmin }) {
  const apps = [
    { id: "tecnica", nombre: "Gestión Técnica", icono: "/icons/icon-gestion-tecnica.png", activo: true },
    { id: "sst", nombre: "Gestión SST", icono: "/icons/icon-gestion-sst.png", activo: true },
    { id: "ambiental", nombre: "Gestión Ambiental", icono: "/icons/icon-gestion-ambiental.png", activo: true },
  ];
  const tieneAcceso = (id) => perfil?.esAdmin || (perfil?.roles || []).includes(id);
  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(247,247,245,0.35), rgba(247,247,245,0.50)), url('/fondo-selector.jpg')`,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-8 pb-6 text-center" style={{ background: NAVY }}>
        <div className="text-white font-bold text-[19px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          REFORMAS Y REMODELACIONES
        </div>
        <div className="text-[11.5px] mt-1" style={{ color: GOLD }}>
          Elige el sistema de gestión que quieres usar
        </div>
        {perfil && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-[10.5px] text-white/70">{perfil.nombre || perfil.correo}</span>
            {perfil.esAdmin && (
              <button onClick={onIrAdmin} className="text-[10.5px] underline" style={{ color: GOLD }}>
                Administrar usuarios
              </button>
            )}
            <button onClick={onCerrarSesion} className="text-[10.5px] underline text-white/70">
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4 p-6">
        {apps.map((a) => {
          const habilitado = tieneAcceso(a.id);
          return (
            <button
              key={a.id}
              onClick={() => onSeleccionar(a.id)}
              className="flex items-center gap-4 rounded-2xl p-4"
              style={{
                background: habilitado ? "white" : "#F0F0EE",
                border: `1px solid ${LINE}`,
                opacity: habilitado ? 1 : 0.5,
              }}
            >
              <img src={a.icono} alt={a.nombre} className="w-[82px] h-[82px] object-contain shrink-0" style={{ filter: habilitado ? "none" : "grayscale(100%)" }} />
              <div className="text-left">
                <div className="text-[15px] font-bold" style={{ color: habilitado ? NAVY : "#9AA0A8" }}>{a.nombre}</div>
                {!habilitado && (
                  <div className="text-[10.5px] mt-0.5" style={{ color: "#9AA0A8" }}>🔒 Sin acceso</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Proximamente({ nombre, onVolver }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
      <div className="text-[18px] font-bold mb-2" style={{ color: NAVY }}>{nombre}</div>
      <div className="text-[13px] text-gray-500 mb-6">Este módulo está en construcción — muy pronto estará disponible.</div>
      <button onClick={onVolver} className="px-5 py-2.5 rounded-lg text-white font-semibold text-[13px]" style={{ background: NAVY }}>
        ← Volver
      </button>
    </div>
  );
}

function Inicio({ onSeleccionar, onVolverSelector }) {
    return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        {onVolverSelector && (
          <button onClick={onVolverSelector} className="text-[11px] mb-2" style={{ color: GOLD }}>
            ← Cambiar de sistema (SST / Ambiental)
          </button>
        )}
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

function AppInterno({ perfil, onCerrarSesion, onIrAdmin }) {
  const [vista, setVista] = useState("selector-apps");

  if (vista === "inicio") {
    return <Inicio onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista === "selector-apps") {
    return (
      <SelectorApps
        perfil={perfil}
        onCerrarSesion={onCerrarSesion}
        onIrAdmin={onIrAdmin}
        onSeleccionar={(id) => {
          const tieneAcceso = perfil?.esAdmin || (perfil?.roles || []).includes(id);
          if (!tieneAcceso) {
            alert("No tienes acceso a este módulo. Si crees que deberías tenerlo, contacta al administrador.");
            return;
          }
          if (id === "tecnica") setVista("inicio");
          else setVista(`proximamente-${id}`);
        }}
      />
    );
  }
  if (vista === "proximamente-sst") {
    return <Proximamente nombre="Gestión SST" onVolver={() => setVista("selector-apps")} />;
  }
  if (vista === "proximamente-ambiental") {
    return <Proximamente nombre="Gestión Ambiental" onVolver={() => setVista("selector-apps")} />;
  }
  if (vista === "diario") {
    return <CapturaAvanceObra onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "apus") {
    return <FormularioAPU onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "ficha") {
    return <FormularioFicha onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "presupuesto") {
    return <FormularioPresupuestoNuevo onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "cronograma") {
    return <FormularioCronograma onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "cantidades") {
    return <FormularioCantidadesNuevo onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "semanal") {
    return <FormularioSemanal onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "acta") {
    return <FormularioActa onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "mensual") {
    return <FormularioMensual onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  if (vista === "memorias") {
    return <FormularioMemoria onVolver={() => setVista("inicio")} onNavegar={setVista} />;
  }
  return <Inicio onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppConSesion />
    </AuthProvider>
  );
}

function AppConSesion() {
  const { usuario, perfil, cargando, cerrarSesion } = useAuth();
  const [vistaExterna, setVistaExterna] = useState("apps");

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <div className="text-[13px]" style={{ color: NAVY }}>Cargando...</div>
      </div>
    );
  }

  if (!usuario || !perfil) {
    return <PantallaLogin />;
  }

  if (vistaExterna === "admin") {
    return <PanelAdmin onVolver={() => setVistaExterna("apps")} />;
  }

  return (
    <div>
      <AppInterno perfil={perfil} onCerrarSesion={cerrarSesion} onIrAdmin={() => setVistaExterna("admin")} />
    </div>
  );
}
