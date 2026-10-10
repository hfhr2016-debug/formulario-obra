import { useState, useRef, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";
import { activarOrtografia } from "./ortografia";
import { comprimirFoto, lineasMarca, InterruptorMarca } from "./sstControles";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { AuthProvider, useAuth } from "./AuthContext";
import { useCatalogo } from "./catalogos";
import PantallaLogin from "./PantallaLogin";
import PanelAdmin from "./PanelAdmin";
import PanelCatalogos from "./PanelCatalogos";
import { nivelCP, SoloLectura, SinAcceso } from "./cpPermisos";
import { iniciarSync, detenerSync } from "./sincronizarFirestore";
import FormularioAPU from "./FormularioAPU";
import FormularioFicha from "./FormularioFicha";
import FormularioPresupuestoNuevo from "./FormularioPresupuestoNuevo";
import FormularioCronograma from "./FormularioCronograma";
import FormularioCantidadesNuevo from "./FormularioCantidadesNuevo";
import FormularioSemanal from "./FormularioSemanal";
import FormularioActa from "./FormularioActa";
import FormularioMensual from "./FormularioMensual";
import FormularioMemoria from "./FormularioMemoria";
import FormularioCharlaDiaria from "./FormularioCharlaDiaria";
import FormularioListaAsistencia from "./FormularioListaAsistencia";
import FormularioInduccion from "./FormularioInduccion";
import FormularioEntregaEPP from "./FormularioEntregaEPP";
import FormularioCapacitaciones from "./FormularioCapacitaciones";
import FormularioPermisoTrabajo from "./FormularioPermisoTrabajo";
import FormularioATS from "./FormularioATS";
import FormularioInspecciones from "./FormularioInspecciones";
import FormularioActosCondiciones from "./FormularioActosCondiciones";
import FormularioAcciones from "./FormularioAcciones";
import FormularioAccidente from "./FormularioAccidente";
import FormularioInvestigacion from "./FormularioInvestigacion";
import FormularioIndicadores from "./FormularioIndicadores";
import FormularioFichaSST from "./FormularioFichaSST";
import FormularioPersonal from "./FormularioPersonal";
import FormularioMatriz from "./FormularioMatriz";
import FormularioEmergencias from "./FormularioEmergencias";
import FormularioSemanalSST from "./FormularioSemanalSST";
import FormularioMensualSST from "./FormularioMensualSST";
import FormularioContratistas from "./FormularioContratistas";
import FormularioFichaAmbiental from "./FormularioFichaAmbiental";
import FormularioResiduos from "./FormularioResiduos";
import FormularioManifiestoRCD from "./FormularioManifiestoRCD";
import FormularioConsumos from "./FormularioConsumos";
import FormularioVertimientos from "./FormularioVertimientos";
import FormularioInspeccionAmbiental from "./FormularioInspeccionAmbiental";
import FormularioMaquinaria from "./FormularioMaquinaria";
import FormularioCapacitacionAmb from "./FormularioCapacitacionAmb";
import FormularioFotografico from "./FormularioFotografico";
import FormularioIncidenteAmb from "./FormularioIncidenteAmb";
import FormularioPqrs from "./FormularioPqrs";
import FormularioMatrizAmbiental from "./FormularioMatrizAmbiental";
import FormularioSustanciasQuimicas from "./FormularioSustanciasQuimicas";
import FormularioControlHidrocarburos from "./FormularioControlHidrocarburos";
import FormularioAprovechamientoForestal from "./FormularioAprovechamientoForestal";
import FormularioContratistasAmbiental from "./FormularioContratistasAmbiental";
import FormularioEmisiones from "./FormularioEmisiones";
import FormularioAccionesAmbiental from "./FormularioAccionesAmbiental";
import FormularioIndicadoresAmbiental from "./FormularioIndicadoresAmbiental";
import FormularioSemanalAmbiental from "./FormularioSemanalAmbiental";
import FormularioMensualAmbiental from "./FormularioMensualAmbiental";
import FormularioTrimestralAmbiental from "./FormularioTrimestralAmbiental";
import FormularioIcaAmbiental from "./FormularioIcaAmbiental";
import FormularioRegistroCostos from "./FormularioRegistroCostos";
import FormularioControlPresupuestal from "./FormularioControlPresupuestal";
import FormularioAdicionales from "./FormularioAdicionales";
import FormularioAnticipo from "./FormularioAnticipo";
import FormularioCostosLibro from "./FormularioCostosLibro";
import FormularioCostosFicha from "./FormularioCostosFicha";
import { ContextoSST } from "./sstNavegacion";
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
function tipoProyectoDiario() {
  try {
    const d = JSON.parse(localStorage.getItem("ryr_tipo_proyecto") || "null");
    const m = d?.modulos || {};
    if (m.vias) return "vias";
    if (m.hidrocarburos) return "hidrocarburos";
  } catch (e) {}
  return "edificacion";
}
function itemsDesdeCatalogo(actividades) {
  return actividades.map((a, i) => ({ item: String(i + 1), descripcion: a.actividad, unidad: a.unidad, contractual: "" }));
}
function capitulosDesdeCatalogo(actividades, tipo) {
  const campo = tipo === "hidrocarburos" ? "seccion" : "capitulo";
  const vistos = [];
  actividades.forEach((a) => { const c = a[campo]; if (c && !vistos.includes(c)) vistos.push(c); });
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
const CATALOGO_MANO_OBRA_NOMBRES = ["Armador", "Ayudante", "Calculista", "Cortador", "Cuadrilla de desmontaje (10 personas)", "Cuadrilla de fabricación", "Cuadrilla de Un Oficial y (2) Obreros.", "Cuadrilla de un oficial y (4) Obreros.", "Dibujante", "Dibujante 2", "Estudios, análisis e informes", "Ingeniero de montaje y prueba", "Ingeniero de Montaje y Prueba Pilote (1)", "Ingeniero Especialista prueba de  integridad", "Ingeniero Geotecnista", "Ingeniero supervisor", "Ingeniero supervisor y director de prueba", "Ingeniero Supervisor y Director de Prueba Pilote", "Inspector", "Inspector de fabricación y montaje", "1 Oficial y 1 Obrero.", "Maestro", "Obrero (10)", "Obrero (2)", "Obrero (3)", "Obrero (4)", "Obrero (5)", "Obrero (6)", "Obrero (7)", "Obrero (8)", "Obrero (9)", "Obrero (prueba de carga)", "Obreros de incado (2)", "Obreros de izado (2)", "Oficial", "Oficial  Obrero (3) Cuadrilla de un oficial y 3 Obreros.", "Oficial (2)", "Oficial (3)", "Oficial + 3 Ayudantes (armado e inyección de anclajes)", "Oficial experto en desmontaje", "Oficial experto en explosivos", "Operador prueba de integridad", "Paletero", "Paletero (2)", "Perforador", "Perforador + Ayudante1 + Ayudante2", "Personal requerido para el diseño y fabricación de estructura metálica. (incluye un calista, un dibujante y la cuadrilla de Fabricación) De esta ultima no hay detalle de que personal la compone.", "Rastrillero", "Rastrilleros (2)", "Soldador", "Soldador (2)", "Soldador 1A", "Soldador experto en montaje y pruebas", "Soldador experto en montaje y pruebas", "Topógrafo", "Cuadrilla de Topografía (Topógrafo 1 + Cadenero 2)", "Obrero", "Viáticos ingeniero y director", "Viáticos soldadores", "Celador", "Operador de retroexcavadora", "Operador de miniexcavadora", "Operador de bulldozer", "Operador de motoniveladora", "Operador de vibrocompactador", "Operador de grúa", "Conductor de volqueta", "Operador de mezcladora de concreto", "Operador de bomba de concreto", "Operador de montacargas", "Oficial electricista", "Ayudante electricista", "Oficial hidrosanitario / plomero", "Ayudante hidrosanitario", "Oficial pintor", "Ayudante de pintura", "Oficial enchapador / embaldosador", "Oficial estucador", "Oficial carpintero", "Ayudante carpintero", "Oficial vidriero / aluminero", "Oficial mampostero / albañil", "Oficial de estructuras metálicas", "Técnico en climatización / HVAC", "Técnico en gas", "Técnico en cableado estructurado / redes", "Técnico en sistemas de seguridad / CCTV", "Técnico instalador de ascensores", "Jardinero", "Aseador de obra", "Almacenista de obra", "Vigilante / celador de obra", "Residente de obra", "Maestro de obra general", "Coordinador SISO / HSEQ", "Operador de excavadora", "Operador de pluma grúa", "Operador de camión grúa", "Conductor de camabaja", "Operador de minicargador", "Operador de planta móvil de concreto", "Operador de cargador", "Operador de pavimentadora", "Operador de extendedora de asfalto", "Operador de trituradora de asfalto", "Cadenero 1o", "Cadenero 2o"];
const CATALOGO_EQUIPOS_NOMBRES = ["Andamiaje para Aplicar la Carga (Equipos Sustituto de la Tara)", "Aspersor manual", "Barredora mecánica de cepillo de 3658 mm ; 6 m3", "Bomba de concreto, Producción: 30 m3/h, POTENCIA: 67 HP, MAX PRESION DE CONCRETO: 1150 PSI", "Bomba de inyección de lechada", "Bomba eléctrica para accionar la celda", "Bomba para gato de tensionamiento", "Buldozer Potencia al volante de 305 HP, motor de 2100 RPM, longitud de hoja 6,39m.", "Buldozer, Potencia al volante de 140 HP, motor de 2200 RPM, longitud de hoja 4,80m.", "Buldozer, Potencia al volante de 80 HP, motor de 2400 RPM, longitud de hoja 3,99m,", "Caldera para pintura termoplástica", "Calentador a gas", "Camabaja", "Camión 350", "Camión de Slurry", "Camioneta D-300", "Camisa", "Camisa para Pilote D=1.20m", "Cargador : Potencia en el volante 110 hp, Clasificación de RPM del motor 2300.", "Cargador : Potencia en el volante 125 hp, Clasificación de RPM del motor 2300.", "Carrotanque de agua(1000 Galones)", "Carrotanque Irrigador de asfalto, 1000 GALONES DE CAPACIDAD", "Cizalla manual de 90 cm.", "Compactador de Rodillo POTENCIA: 99HP, PESO: 8 ton", "Compactador manual (SALTARIN) Peso de operación (Kg.) 52, Fuerza de impacto por golpe (KN) 12.", "Compactador manual de rodillo", "Compactador manual vibratorio (CANGURO) (Apisonadores)", "COMPACTADOR MANUAL VIBRATORIO (RANA) con motor de 6 HP", "Compactador neumático de Potencia 70 HP, peso de 13 ton", "Compactador neumático peso 3,5 ton", "Compactador tipo  POTENCIA: 105 HP, PESO: 6 ton", "Compactador vibratorio tipo DD-20", "Compresor (barrido y soplado)", "Compresor 120 HP, con martillo.", "Compresor 80 HP, con martillo.", "Compresor para penetrar roca", "Cortadora de pavimento", "Cortadora de pavimento, Máxima profundidad de corte: 160 mm. Capacidad de disco: desde 12´´ hasta 18´´ de diámetro. Peso operacional: 135 kg, 13.5 hp de potencia", "Derretidora de asfalto (crafco o similar)", "Diferencial", "Diferencial de 2 ton.", "Diferencial de 3 ton", "Equipo autopropulsado para pintura termoplástica", "Equipo de acarreo interno", "Equipo de control (bandas sonoras reduce velocidad) (Termohigometros, Termómetros, Galgas, etc.)", "Equipo de Medición (Deformimetros Eléctricos, Mecánicos, Celdas de Carga,  Etc.)", "Equipo de oxicorte, Capacidad de corte: hasta 6´´ (152mm)", "Equipo de oxigeno y soldadura", "Equipo de perforación (TRACKDRILL), potencia 40 HP, 2100 golpes / minuto", "Equipo de pintura (Compresor), Presión máxima de trabajo 3300 psi.", "Equipo de rayos X y/o ultrasonido", "Equipo de Sand Blastin y Pintura COMPRESOR 250cfm a 100 psi. PULMON de 70 gal (250 lt.) para 160 psi", "Equipo de Soldadura", "Equipo de soldadura 250 AMP", "Equipo de soldadura 400", "Equipo de soldadura 600", "Equipo de soldadura y de acetileno (incluye soldadura)", "Equipo de topografía", "Equipo de topografía Teodolito electrónico con abertura de anteojo de 42 mm. Aumento del anteojo: 30x.Distancia mínima de enfoque: 1.0 m. Precisión: 5´´. Compensador con rango de trabajo ±3´.", "Equipo de transporte (Camiones, Grúas, Volquetas, etc.)", "Equipo manual aplicador (bandas sonoras reduce velocidad)", "Esparcidor de gravilla, Ancho de esparcimiento 3100mm, Velocidad de trabajo 10—20km2/h", "Estación Total con precisión angular de 6´´. Precisión lineal 2 mm ± 2 ppm", "Formaleta Metálica", "Formaleta metálica (concreto hidráulico)", "Formaleta metálica (tubería de concreto reforzado)", "Formaleta metálica para tubo de 900", "Formaleta para camisa de pilote", "Fresadora de pavimento, potencia 255 HP, peso 19 Ton, PROFUNDIDAD DE CORTE 305 mm", "Fresadora y recicladora de pavimento, potencia 430 HP, peso 20 Ton", "Gato para tensionamiento, fuerza Max 200 ton, área de tensión 314 cm2.", "Grúa (capacidad 15 ton)", "Grúa (Transporte en Obra)", "Grúa 10 ton", "Grúa con barreno o máquina piloteadora", "Grúa con torre", "Grúa Con Torre (2)", "Grúa con torre capacidad 1 ton en la punta.", "Grúa telescópica de 50 Ton.", "Guadañadora, Cilindraje 41.5 cm3, Longitud del mango 1450 mm, Peso 7.4 kg", "Manómetro cable de acero para bajar la celda", "Máquina hidrosembradora", "Maquina térmica pegatachas", "Mezcladora de concreto 1 bulto", "Montacargas", "Motobomba 3 PULGADAS (incluye operario)", "Motobomba 4 pulgadas", "Motobomba 6´´ diámetro de bombeo de 2 m3/seg", "Motobomba de concreto", "Motoniveladora  potencia 215 HP, ancho de cuchilla 4,27 m, peso 18 ton.", "Motoniveladora, potencia 140 HP, ancho de cuchilla 3,66 m, peso 11 ton.", "Motosierra, 93.6 cm3 - 7.1 HP, 45-90 cm - 7.9 kg", "Motosoldador, 300 amperios", "Pala auxiliar de piloteadora", "Pala grúa con martillos", "Piloteadora", "Piloteadora potencia 250KW, RPM 1800, fuerza elevadora 200KN", "Planta de asfalto en caliente", "Planta de asfalto en frio", "Planta eléctrica", "Planta trituradora", "Pluma capacidad 100 kg", "Puente grúa", "Pulidora (8500 REV)", "Pulvimixer", "Recicladora, potencia 430HP", "Regla vibratoria, de longitud de 3 a 5 m, motor de 3600 rpm, potencia 6 HP", "Retrocargador CAT 510", "Retrocargador, pala de 1,1 m3 de capacidad, profundidad de excavación de 4.400 mm y una altura de 5.680 mm", "Retroexcavadora 428 doble trasmisión", "Retroexcavadora A25C", "Retroexcavadora E-200 con martillo neumático", "Retroexcavadora E-200 sobre orugas trabajo en rio", "Retroexcavadora E-200 sobre orugas", "Retroexcavadora sobre llantas", "Retroexcavadora sobre llantas JD 410", "Retroexcavadora sobre llantas, motor 62HP, Profundidad de excavación de 5.41 metros.", "Retroexcavadora sobre oruga, potencia 138 HP, balde de 1,5 m3.", "Retroexcavadora Tipo E-200 o  Equivalente", "Retroexcavadora, Potencia en el Volante 78 HP 2200 RPM", "Ruteadora", "Sensor de Impacto para prueba de integridad tipo", "Taco metálico o puntal (escamas en concreto)", "Taladro de 1/2´´, pulidora, lijadora y circular para corte extremo superior", "Taladro de 1/2´´, pulidora, lijadora y circular", "Taladro industrial", "Tara (Recebo, Agua, Etc.)", "Tarifa de transporte", "Tarifa de transporte (agregados pétreos)", "Tarifa de transporte de concreto hidráulico en mixer", "Tarifa de transporte de estructuras metálicas", "Tarifa de transporte de estructuras metálicas en obra", "Tarifa de transporte de mezclas para bacheo", "Tarifa de transporte de mezclas", "Tarifa de Transporte de Postes", "Tarifa de transporte para agregados de mezclas asfálticas", "Tarifa de Trasporte de especies vegetales", "Terminadora de asfalto (Finisher), potencia 130 HP, peso 15 ton.", "Terminadora de asfalto (Finisher), potencia en el volante 174 HP, R=20M3/H, velocidad de desplazamiento 114 m/min", "Vehículo delineador", "Vehículo delineador R=1500 M/H", "Vibrador de concreto (incluye operario)", "Vibrador de concreto, Motor de 3 hp a 18.000 rpm Mangueras de 4 mt", "Vibrocompactador, tipo benitìn, de peso 700 kg a 1.5 toneladas", "Vibrocompatador Dynapac (10 ton)", "Vibrocompatador Dynapac C15", "Vibrocompatador, potencia 153 HP, peso 10 Ton.", "Volqueta 6 m3", "Volqueta 15 m3 doble troque", "Pala cuadrada", "Pica / pico", "Carretilla buggy", "Nivel de burbuja (60 cm)", "Nivel láser rotativo", "Plomada", "Flexómetro / cinta métrica 5m", "Martillo de uña", "Combo / mazo", "Taladro percutor eléctrico", "Pulidora / esmeril angular", "Equipo de soldadura eléctrica", "Escuadra metálica", "Andamio tubular por cuerpo", "Escalera tijera 6 pasos", "Balde plástico 20L", "Llana metálica", "Llana de esponja", "Cuchara de albañil", "Cortadora de baldosa manual", "Cortadora de baldosa eléctrica (pulidora con disco diamantado)", "Mezcladora de mortero eléctrica portátil (taladro mezclador)", "Vibrador de concreto tipo aguja (pequeño, eléctrico)", "Regla vibratoria para placas", "Cortadora de varilla manual", "Dobladora de varilla manual", "Cizalla para varilla", "Compactador de placa (canguro) pequeño", "Brocha para pintura (juego)", "Rodillo para pintura (juego)", "Manguera de nivel", "Cortafrío / cincel", "Barra de acero (pata de cabra)", "Cuerda de nylon / piola de construcción", "Guantes de trabajo (par)", "Casco de seguridad", "Arnés de seguridad", "Extensión eléctrica industrial (20m)", "Generador eléctrico portátil", "Sierra circular manual", "Camabaja (tractocamión + remolque cama baja)", "Nivel de precisión", "Andamio multidireccional por cuerpo", "Andamio certificado tipo torre", "Andamio colgante", "Motobomba 8 pulgadas", "Excavadora sobre orugas", "Pala redonda"];

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

function SelectorHora({ label, value, onChange, half }) {
  const [h, m] = (value || "").split(":");
  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutos = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const cambiarHora = (nuevaH) => onChange(`${nuevaH}:${m || "00"}`);
  const cambiarMinuto = (nuevoM) => onChange(`${h || "00"}:${nuevoM}`);
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <select
          value={h || ""}
          onChange={(e) => cambiarHora(e.target.value)}
          className="flex-1 min-w-0 text-[13.5px] px-2 py-2 rounded-md border outline-none bg-white"
          style={{ borderColor: LINE }}
        >
          <option value="" disabled>Hora</option>
          {horas.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span className="text-[13.5px] font-semibold" style={{ color: "#8A8F99" }}>:</span>
        <select
          value={m || ""}
          onChange={(e) => cambiarMinuto(e.target.value)}
          className="flex-1 min-w-0 text-[13.5px] px-2 py-2 rounded-md border outline-none bg-white"
          style={{ borderColor: LINE }}
        >
          <option value="" disabled>Min</option>
          {minutos.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
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
const PREFIJO_ACUMULADOS = "ryr_acumulados_items_"; // uno por tipo de proyecto, para no mezclar Edificación/Vías/Hidrocarburos

function leerAcumuladosGuardados(tipo) {
  try {
    const raw = localStorage.getItem(PREFIJO_ACUMULADOS + tipo);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function calcularHorasEntre(inicio, fin) {
  if (!inicio || !fin) return "";
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => isNaN(n))) return "";
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minutos < 0) minutos += 24 * 60; // cruza medianoche
  return String(Math.round((minutos / 60) * 100) / 100);
}

function guardarAcumulado(tipo, clave, valor) {
  try {
    const actuales = leerAcumuladosGuardados(tipo);
    actuales[clave] = valor;
    localStorage.setItem(PREFIJO_ACUMULADOS + tipo, JSON.stringify(actuales));
  } catch (e) {
    // Si el navegador bloquea localStorage, simplemente no se recuerda entre días.
  }
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

function BuscadorItem({ value, onSelect, onClear, catalogo }) {
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

  const filtrados = (() => {
    if (texto.trim().length === 0) return catalogo.slice(0, 15);
    const q = texto.toLowerCase();
    const coincide = catalogo.filter((it) => it.descripcion.toLowerCase().includes(q));
    coincide.sort((a, b) => {
      const aEmpieza = a.descripcion.toLowerCase().startsWith(q) ? 0 : 1;
      const bEmpieza = b.descripcion.toLowerCase().startsWith(q) ? 0 : 1;
      if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
      return a.descripcion.length - b.descripcion.length;
    });
    return coincide.slice(0, 15);
  })();

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
            const nuevoTexto = e.target.value;
            setTexto(nuevoTexto);
            setAbierto(true);
            // Si lo que queda ya no coincide con la actividad que estaba seleccionada,
            // se avisa al formulario para que limpie Unidad/Acum. anterior de esa fila.
            if (onClear && nuevoTexto !== (value || "")) onClear();
          }}
          onFocus={(e) => {
            setAbierto(true);
            e.target.select();
          }}
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
  const tipoDiario = tipoProyectoDiario();
  const { actividades: actividadesDiario, error: errorCatalogo } = useCatalogo(tipoDiario);
  const itemsCatalogo = useMemo(() => itemsDesdeCatalogo(actividadesDiario), [actividadesDiario]);
  const nombresActividades = useMemo(() => itemsCatalogo.map((it) => it.descripcion), [itemsCatalogo]);
  const capitulosDiario = useMemo(() => capitulosDesdeCatalogo(actividadesDiario, tipoDiario), [actividadesDiario, tipoDiario]);
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

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_diario"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_diario"); } catch (e) { return true; }
  });
  function restaurarBorradorDiario() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_diario") || "null");
      if (d) {
        setGeneral(d.general || general);
        setCantidades(d.cantidades || [emptyCantidad()]);
        setOtras(d.otras || [emptyOtra()]);
        setAvanceCapitulos(d.avanceCapitulos || [emptyAvanceCap()]);
        setManoObra(d.manoObra || [emptyManoObra()]);
        setEquipos(d.equipos || [emptyEquipo()]);
        setHorasPerdidas(d.horasPerdidas || [emptyHoraPerdida()]);
        setDescActividades(d.descActividades || "");
        setAspectosProblematicos(d.aspectosProblematicos || "");
        setPlanAccion(d.planAccion || "");
        setCharlaDia(d.charlaDia || "");
        setObservacionesHSE(d.observacionesHSE || "");
        setElaboradoNombre(d.elaboradoNombre || "");
        setElaboradoCargo(d.elaboradoCargo || "");
      }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorradorDiario() {
    try { localStorage.removeItem("ryr_borrador_diario"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  useEffect(() => {
    if (!borradorAplicado) return;
    try {
      localStorage.setItem("ryr_borrador_diario", JSON.stringify({
        general, cantidades, otras, avanceCapitulos, manoObra, equipos, horasPerdidas,
        descActividades, aspectosProblematicos, planAccion, charlaDia, observacionesHSE,
        elaboradoNombre, elaboradoCargo,
      }));
    } catch (e) {}
  }, [borradorAplicado, general, cantidades, otras, avanceCapitulos, manoObra, equipos, horasPerdidas, descActividades, aspectosProblematicos, planAccion, charlaDia, observacionesHSE, elaboradoNombre, elaboradoCargo]);
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
    if (general.objetoContrato) L.push(`Nombre del Proyecto: ${general.objetoContrato}`);
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
      const ws = workbook.getWorksheet("Informe Diario");
      if (!ws) throw new Error("No se encontró la hoja \"Informe Diario\" en la plantilla");

      // --- Datos generales ---
      setCelda(ws, "E13", general.objetoContrato);
      setCelda(ws, "E14", general.noContrato);
      setCelda(ws, "J14", general.fecha);
      setCelda(ws, "J15", general.ubicacion);
      setCelda(ws, "C16", general.horaEntrada);
      setCelda(ws, "F16", general.horaApertura);
      setCelda(ws, "H16", general.horaSalida);
      setCelda(ws, "J16", general.especialidad);
      setCelda(ws, "M16", general.informeNo);

      // --- Cantidades de obra (filas 20 a 31) ---
      cantidades
        .filter((r) => r.descripcion || r.item || r.ubicacion)
        .slice(0, 12)
        .forEach((item, i) => {
          const r = 20 + i;
          setCelda(ws, `A${r}`, item.ubicacion);
          setCelda(ws, `B${r}`, item.item);
          setCelda(ws, `C${r}`, item.descripcion);
          setCelda(ws, `I${r}`, item.contractual);
          setCelda(ws, `J${r}`, item.unidad);
          setCelda(ws, `K${r}`, item.acumAnterior);
          setCelda(ws, `L${r}`, item.avanceDiario);

          // Nuevo acumulado = acumulado anterior + avance diario
          const anteriorCant = parseFloat(item.acumAnterior) || 0;
          const diarioCant = parseFloat(item.avanceDiario) || 0;
          if (item.acumAnterior !== "" || item.avanceDiario !== "") {
            setCelda(ws, `M${r}`, anteriorCant + diarioCant);
          }

          // Guarda el nuevo acumulado para que el próximo día se autocomplete solo.
          if (item.item) {
            guardarAcumulado(tipoDiario, item.item, anteriorCant + diarioCant);
          }
        });

      // --- Otras actividades (filas 35 a 40) ---
      otras
        .filter((r) => r.descripcion || r.item || r.ubicacion)
        .slice(0, 6)
        .forEach((item, i) => {
          const r = 35 + i;
          setCelda(ws, `A${r}`, item.ubicacion);
          setCelda(ws, `B${r}`, item.item);
          setCelda(ws, `C${r}`, item.descripcion);
          setCelda(ws, `G${r}`, item.unidad);
          setCelda(ws, `H${r}`, item.acumAnterior);
          setCelda(ws, `I${r}`, item.avanceDiario);
          setCelda(ws, `K${r}`, item.observaciones);

          // Acumulado = acumulado anterior + avance diario
          const anteriorOtras = parseFloat(item.acumAnterior) || 0;
          const diarioOtras = parseFloat(item.avanceDiario) || 0;
          if (item.acumAnterior !== "" || item.avanceDiario !== "") {
            setCelda(ws, `J${r}`, anteriorOtras + diarioOtras);
          }

          if (item.item) {
            guardarAcumulado(tipoDiario, `otras_${item.item}`, anteriorOtras + diarioOtras);
          }
        });

      // --- Mano de obra (filas 44 a 53) ---
      manoObra
        .filter((r) => r.cargo)
        .slice(0, 10)
        .forEach((item, i) => {
          const r = 44 + i;
          setCelda(ws, `A${r}`, item.cargo);
          setCelda(ws, `F${r}`, item.cant);
          setCelda(ws, `G${r}`, item.tiempo);
        });

      // --- Equipos (filas 44 a 53) ---
      equipos
        .filter((r) => r.descripcion)
        .slice(0, 10)
        .forEach((item, i) => {
          const r = 44 + i;
          setCelda(ws, `I${r}`, item.descripcion);
          setCelda(ws, `L${r}`, item.cant);
          setCelda(ws, `M${r}`, item.tiempo);
        });

      // --- Descripción de actividades (4 líneas) ---
      repartirEnLineas(ws, ["A55", "A56", "A57", "A58"], descActividades);

      // --- Aspectos problemáticos / Plan de acción (3 líneas cada uno) ---
      repartirEnLineas(ws, ["A60", "A61", "A62"], aspectosProblematicos);
      repartirEnLineas(ws, ["H60", "H61", "H62"], planAccion);

      // --- Horas perdidas (filas 65 a 68) ---
      horasPerdidas
        .filter((r) => r.motivo)
        .slice(0, 4)
        .forEach((item, i) => {
          const r = 65 + i;
          setCelda(ws, `A${r}`, item.motivo);
          setCelda(ws, `E${r}`, item.inicio);
          setCelda(ws, `F${r}`, item.fin);
          setCelda(ws, `G${r}`, item.total);
        });

      // --- HSE ---
      setCelda(ws, "H65", charlaDia);
      repartirEnLineas(ws, ["H67", "H68"], observacionesHSE);

      // --- Elaborado por ---
      setCelda(ws, "B86", elaboradoNombre);
      setCelda(ws, "B87", elaboradoCargo);

      // --- Registro fotográfico (4 casillas del mismo ancho, en una sola fila) ---
      const posicionesFotos = [
        { tl: { col: 0, row: 69 }, br: { col: 3, row: 82 }, captionCell: "A83" }, // Foto 1
        { tl: { col: 3, row: 69 }, br: { col: 6, row: 82 }, captionCell: "D83" }, // Foto 2
        { tl: { col: 6, row: 69 }, br: { col: 9, row: 82 }, captionCell: "G83" }, // Foto 3
        { tl: { col: 9, row: 69 }, br: { col: 13, row: 82 }, captionCell: "J83" }, // Foto 4
      ];
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (!foto.file) continue;
        const buffer = await comprimirFoto(foto.file, 1000, 0.75, null, "#F2F2F2", lineasMarca(general.objetoContrato, { fechaHora: general.fecha }, foto.file));
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
      try { localStorage.removeItem("ryr_borrador_diario"); } catch (e) {}
    } catch (err) {
      console.error(err);
      setErrorExcel(
        "No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido") + ". Si el problema sigue, avísale a soporte con este mensaje."
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

  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes un Informe Diario sin terminar</div>
        <div className="text-[12.5px] text-gray-500 mb-5">Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel (las fotos no se guardan, hay que volver a subirlas). ¿Quieres continuar donde quedaste?</div>
        <button onClick={restaurarBorradorDiario} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
          ▶ Continuar donde quedé
        </button>
        <button onClick={descartarBorradorDiario} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
          Empezar en blanco
        </button>
        {onVolver && (
          <button onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>
            ← Volver al portal
          </button>
        )}
      </div>
    );
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
              Informe Diario
            </div>
            <div className="text-[10.5px] mb-1" style={{ color: GOLD }}>
              Reformas y Remodelaciones · RYR-FT-01
            </div>
            <IndicadorTipoProyecto claveBorrador="ryr_borrador_diario" onVolver={onVolver} />
          </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white">
        {errorCatalogo && (
          <div className="text-[11px] mx-3 mt-3 mb-1 px-2 py-1.5 rounded" style={{ background: "#FDECEC", color: "#B42318" }}>
            No se pudo cargar el catálogo de actividades: {errorCatalogo} Si es la primera vez que abres este tipo de proyecto en este dispositivo, necesitas conexión a internet.
          </div>
        )}
        <Section id="general" title="Datos generales" open={active === "general"} onToggle={toggle}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Field label="Fecha" type="date" value={general.fecha} onChange={(v) => setG("fecha", v)} half />
              <Field label="Informe No." value={general.informeNo} onChange={(v) => setG("informeNo", v)} half />
            </div>
            <Field label="Nombre del Proyecto" value={general.objetoContrato} onChange={(v) => setG("objetoContrato", v)} />
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
              <SelectorHora label="Hora entrada" value={general.horaEntrada} onChange={(v) => setG("horaEntrada", v)} half />
              <SelectorHora label="Apertura permiso" value={general.horaApertura} onChange={(v) => setG("horaApertura", v)} half />
              <SelectorHora label="Hora salida" value={general.horaSalida} onChange={(v) => setG("horaSalida", v)} half />
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
                  catalogo={itemsCatalogo}
                  onClear={() =>
                    setCantidades((rows) =>
                      rows.map((row, idx) => (idx === i ? { ...row, unidad: "", acumAnterior: "" } : row))
                    )
                  }
                  onSelect={(it) => {
                    const acumuladosGuardados = leerAcumuladosGuardados(tipoDiario);
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
              <BuscadorItem
                value={r.descripcion}
                catalogo={itemsCatalogo}
                onClear={() =>
                  setOtras((rows) =>
                    rows.map((row, idx) => (idx === i ? { ...row, unidad: "", acumAnterior: "" } : row))
                  )
                }
                onSelect={(it) => {
                  const acumuladosGuardados = leerAcumuladosGuardados(tipoDiario);
                  const acumPrevio = acumuladosGuardados[`otras_${it.item}`];
                  setOtras((rows) =>
                    rows.map((row, idx) =>
                      idx === i
                        ? {
                            ...row,
                            descripcion: it.descripcion,
                            item: it.item,
                            unidad: it.unidad,
                            acumAnterior: acumPrevio !== undefined ? String(acumPrevio) : row.acumAnterior,
                          }
                        : row
                    )
                  );
                }}
              />
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
                  {capitulosDiario.map((c) => (
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
          <div className="mb-2"><InterruptorMarca /></div>
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
              <SelectorHora
                label="Inicio"
                value={r.inicio}
                onChange={(v) =>
                  setHorasPerdidas((rows) =>
                    rows.map((row, idx) => (idx === i ? { ...row, inicio: v, total: calcularHorasEntre(v, row.fin) } : row))
                  )
                }
              />
              <SelectorHora
                label="Fin"
                value={r.fin}
                onChange={(v) =>
                  setHorasPerdidas((rows) =>
                    rows.map((row, idx) => (idx === i ? { ...row, fin: v, total: calcularHorasEntre(row.inicio, v) } : row))
                  )
                }
              />
              <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Total horas</label>
                <div className="w-full border rounded-lg px-2.5 py-2 text-[13px] bg-gray-50 text-gray-600" style={{ borderColor: LINE }}>
                  {r.total || "—"}
                </div>
              </div>
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

const MODULOS_SST = [
  // --- Datos generales del proyecto (primero) ---
  { id: "sst-ficha", nombre: "Ficha SST del Proyecto", emoji: "📋", icono: "/icons/icon-sst-ficha.png", activo: true },
  // --- Uso diario ---
  { id: "sst-charla-diaria", nombre: "Charla Diaria de Seguridad", emoji: "🗣️", icono: "/icons/icon-sst-charla-diaria.png", activo: true },
  { id: "sst-asistencia", nombre: "Lista de Asistencia", emoji: "✍️", icono: "/icons/icon-sst-asistencia.png", activo: true },
  { id: "sst-permisos", nombre: "Permisos de Trabajo", emoji: "📝", icono: "/icons/icon-sst-permisos.png", activo: true },
  { id: "sst-ats", nombre: "Análisis de Trabajo Seguro", emoji: "⚠️", icono: "/icons/icon-sst-ats.png", activo: true },
  { id: "sst-personal", nombre: "Registro de Personal", emoji: "👷", icono: "/icons/icon-sst-personal.png", activo: true },
  // --- Varias veces por semana ---
  { id: "sst-induccion", nombre: "Inducción SST Personal Nuevo", emoji: "🆕", icono: "/icons/icon-sst-induccion.png", activo: true },
  { id: "sst-inspecciones", nombre: "Inspecciones", emoji: "🔍", icono: "/icons/icon-sst-inspecciones.png", activo: true },
  { id: "sst-actos-inseguros", nombre: "Actos y Condiciones (Tarjeta iCAI)", emoji: "🚧", icono: "/icons/icon-sst-actos-inseguros.png", activo: true },
  { id: "sst-epp", nombre: "Entrega de EPP", emoji: "🦺", icono: "/icons/icon-sst-epp.png", activo: true },
  // --- Semanal / periódico ---
  { id: "sst-semanal", nombre: "Informe Semanal SST", emoji: "📅", icono: "/icons/icon-sst-semanal.png", activo: true },
  { id: "sst-capacitaciones", nombre: "Capacitaciones", emoji: "🎓", icono: "/icons/icon-sst-capacitaciones.png", activo: true },
  { id: "sst-acciones", nombre: "Acciones Correctivas", emoji: "✅", icono: "/icons/icon-sst-acciones.png", activo: true },
  { id: "sst-indicadores", nombre: "Indicadores", emoji: "📊", icono: "/icons/icon-sst-indicadores.png", activo: true },
  // --- Mensual / cuando ocurre un evento ---
  { id: "sst-mensual", nombre: "Informe Mensual SST", emoji: "🗓️", icono: "/icons/icon-sst-mensual.png", activo: true },
  { id: "sst-accidentalidad", nombre: "Accidente o Incidente", emoji: "🚑", icono: "/icons/icon-sst-accidentalidad.png", activo: true },
  { id: "sst-investigacion", nombre: "Investigación de Accidentes", emoji: "🔎", icono: "/icons/icon-sst-investigacion.png", activo: true },
  // --- Una vez por proyecto ---
  { id: "sst-matriz-peligros", nombre: "Matriz de Peligros", emoji: "🗺️", icono: "/icons/icon-sst-matriz-peligros.png", activo: true },
  { id: "sst-emergencias", nombre: "Plan de Emergencias", emoji: "🚨", icono: "/icons/icon-sst-emergencias.png", activo: true },
  { id: "sst-contratistas", nombre: "Evaluación de Contratistas", emoji: "🤝", icono: "/icons/icon-sst-contratistas.png", activo: true },
];

const MODULOS_AMBIENTAL = [
  // --- Datos generales del proyecto (primero) ---
  { id: "amb-ficha", nombre: "Ficha Ambiental del Proyecto", emoji: "📋", icono: "/icons/icon-amb-ficha.png", activo: true },
  // --- Uso diario ---
  { id: "amb-residuos", nombre: "Registro de Residuos", emoji: "♻️", icono: "/icons/icon-amb-residuos.png", activo: true },
  { id: "amb-manifiesto", nombre: "Manifiesto de Transporte de RCD", emoji: "🚛", icono: "/icons/icon-amb-manifiesto.png", activo: true },
  { id: "amb-consumos", nombre: "Control de Consumo de Recursos", emoji: "💧", icono: "/icons/icon-amb-consumos.png", activo: true },
  { id: "amb-fotografico", nombre: "Registro Fotográfico de Obra", emoji: "📷", icono: "/icons/icon-amb-fotografico.png", activo: true },
  // --- Varias veces por semana ---
  { id: "amb-inspeccion", nombre: "Inspección Ambiental de Obra", emoji: "🔍", icono: "/icons/icon-amb-inspeccion.png", activo: true },
  { id: "amb-capacitacion", nombre: "Capacitación e Inducción Ambiental", emoji: "🎓", icono: "/icons/icon-amb-capacitacion.png", activo: true },
  { id: "amb-maquinaria", nombre: "Inspección de Maquinaria y Equipos", emoji: "🚜", icono: "/icons/icon-amb-maquinaria.png", activo: true },
  { id: "amb-quimicos", nombre: "Control de Sustancias Químicas y Combustibles", emoji: "🧪", icono: "/icons/icon-amb-quimicos.png", activo: true },
  { id: "amb-hidrocarburos", nombre: "Control de Hidrocarburos", emoji: "🛢️", icono: "/icons/icon-amb-hidrocarburos.png", activo: true },
  // --- Según la actividad de la obra ---
  { id: "amb-vertimientos", nombre: "Control de Vertimientos y Manejo de Aguas", emoji: "🚰", icono: "/icons/icon-amb-vertimientos.png", activo: true },
  { id: "amb-emisiones", nombre: "Control de Emisiones Atmosféricas y Ruido", emoji: "🔊", icono: "/icons/icon-amb-emisiones.png", activo: true },
  { id: "amb-forestal", nombre: "Aprovechamiento Forestal", emoji: "🌳", icono: "/icons/icon-amb-forestal.png", activo: true },
  // --- Cuando ocurre un evento ---
  { id: "amb-incidente", nombre: "Incidente o Accidente Ambiental", emoji: "⚠️", icono: "/icons/icon-amb-incidente.png", activo: true },
  { id: "amb-pqrs", nombre: "Quejas y PQRS de la Comunidad", emoji: "📢", icono: "/icons/icon-amb-pqrs.png", activo: true },
  // --- Seguimiento e informes ---
  { id: "amb-acciones", nombre: "Acciones Correctivas Ambientales", emoji: "✅", icono: "/icons/icon-amb-acciones.png", activo: true },
  { id: "amb-semanal", nombre: "Informe Semanal Ambiental", emoji: "📅", icono: "/icons/icon-amb-semanal.png", activo: true },
  { id: "amb-mensual", nombre: "Informe Mensual Ambiental", emoji: "🗓️", icono: "/icons/icon-amb-mensual.png", activo: true },
  { id: "amb-indicadores", nombre: "Indicadores Ambientales", emoji: "📊", icono: "/icons/icon-amb-indicadores.png", activo: true },
  { id: "amb-trimestral", nombre: "Informe Trimestral de Gestión Ambiental", emoji: "📈", icono: "/icons/icon-amb-trimestral.png", activo: true },
  // --- Una vez por proyecto o por periodo largo ---
  { id: "amb-matriz", nombre: "Matriz de Aspectos e Impactos", emoji: "🗺️", icono: "/icons/icon-amb-matriz.png", activo: true },
  { id: "amb-contratistas", nombre: "Evaluación Ambiental de Contratistas", emoji: "🤝", icono: "/icons/icon-amb-contratistas.png", activo: true },
  { id: "amb-ica", nombre: "Resumen para ICA", emoji: "🏛️", icono: "/icons/icon-amb-ica.png", activo: true },
];

const MODULOS_CALIDAD = [
  // --- Antes de construir: qué se controla y con qué documentos ---
  { id: "cal-plan", nombre: "Plan de Inspección y Ensayos", emoji: "📋", icono: "/icons/icon-cal-plan.png", activo: true },
  { id: "cal-planos", nombre: "Control de Planos", emoji: "📐", icono: "/icons/icon-cal-planos.png", activo: true },
  { id: "cal-maestro", nombre: "Listado Maestro de Documentos", emoji: "🗂️", icono: "/icons/icon-cal-maestro.png", activo: true },
  // --- Materiales y proveedores ---
  { id: "cal-recepcion", nombre: "Recepción de Materiales", emoji: "📦", icono: "/icons/icon-cal-recepcion.png", activo: true },
  { id: "cal-proveedores", nombre: "Evaluación de Proveedores", emoji: "🤝", icono: "/icons/icon-cal-proveedores.png", activo: true },
  { id: "cal-ensayos", nombre: "Control de Ensayos", emoji: "🧪", icono: "/icons/icon-cal-ensayos.png", activo: true },
  // --- Inspección en ejecución ---
  { id: "cal-excavacion", nombre: "Excavación y Rellenos", emoji: "⛏️", icono: "/icons/icon-cal-excavacion.png", activo: true },
  { id: "cal-acero", nombre: "Acero de Refuerzo", emoji: "🏗️", icono: "/icons/icon-cal-acero.png", activo: true },
  { id: "cal-formaleta", nombre: "Formaleta y Encofrado", emoji: "🧱", icono: "/icons/icon-cal-formaleta.png", activo: true },
  { id: "cal-vaciado", nombre: "Vaciado de Concreto", emoji: "🚚", icono: "/icons/icon-cal-vaciado.png", activo: true },
  { id: "cal-resultados", nombre: "Resultados de Concreto y Suelos", emoji: "📊", icono: "/icons/icon-cal-resultados.png", activo: true },
  { id: "cal-protocolo", nombre: "Protocolo por Actividad", emoji: "✅", icono: "/icons/icon-cal-protocolo.png", activo: true },
  // --- Cierre y entrega ---
  { id: "cal-nc", nombre: "No Conformidades", emoji: "🚫", icono: "/icons/icon-cal-nc.png", activo: true },
  { id: "cal-terminada", nombre: "Actividad Terminada", emoji: "🏁", icono: "/icons/icon-cal-terminada.png", activo: true },
  { id: "cal-pendientes", nombre: "Pendientes de Entrega", emoji: "⏳", icono: "/icons/icon-cal-pendientes.png", activo: true },
  { id: "cal-acta", nombre: "Acta de Entrega", emoji: "📝", icono: "/icons/icon-cal-acta.png", activo: true },
];

const MODULOS_PRESUPUESTO = [
  // --- Seguimiento del presupuesto ---
  { id: "cp-control", nombre: "Control Presupuestal", emoji: "📊", icono: "/icons/icon-cp-control.png", activo: true },
  { id: "cp-costos", nombre: "Registro de Costos", emoji: "🧾", icono: "/icons/icon-cp-costos.png", activo: true },
  { id: "cp-adicionales", nombre: "Adicionales y Obra no Prevista", emoji: "➕", icono: "/icons/icon-cp-adicionales.png", activo: true },
  { id: "cp-anticipo", nombre: "Anticipo y Amortización", emoji: "💵", icono: "/icons/icon-cp-anticipo.png", activo: true },
  // --- Recursos de la obra ---
  { id: "cp-materiales", nombre: "Control de Materiales", emoji: "🧱", icono: "/icons/icon-cp-materiales.png", activo: true },
  { id: "cp-mano-obra", nombre: "Mano de Obra y Subcontratos", emoji: "👷", icono: "/icons/icon-cp-mano-obra.png", activo: true },
  { id: "cp-equipos", nombre: "Maquinaria y Equipos", emoji: "🚜", icono: "/icons/icon-cp-equipos.png", activo: true },
  { id: "cp-cuentas", nombre: "Cuentas por Pagar", emoji: "📅", icono: "/icons/icon-cp-cuentas.png", activo: true },
  // --- Resultados y cierre ---
  { id: "cp-flujo", nombre: "Flujo de Caja", emoji: "💸", icono: "/icons/icon-cp-flujo.png", activo: true },
  { id: "cp-rentabilidad", nombre: "Costos y Rentabilidad", emoji: "📈", icono: "/icons/icon-cp-rentabilidad.png", activo: true },
  { id: "cp-cierre", nombre: "Cierre Financiero", emoji: "🏁", icono: "/icons/icon-cp-cierre.png", activo: true },
];

// Imagen que, si todavía no está subida a /icons, muestra el emoji en su lugar (así el módulo se ve bien desde el primer día)
function IconoConRespaldo({ src, emoji, alt, tamano, style }) {
  const [falla, setFalla] = useState(false);
  if (!src || falla) return <div className="flex items-center justify-center leading-none" style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.55), ...style }} role="img" aria-label={alt}>{emoji}</div>;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFalla(true)} className="object-contain shrink-0" style={{ width: tamano, height: tamano, ...style }} />;
}

function SelectorApps({ onSeleccionar, perfil, onCerrarSesion, onIrAdmin, onIrCatalogos }) {
  const apps = [
    { id: "tecnica", nombre: "Gestión Técnica", icono: "/icons/icon-gestion-tecnica.png", activo: true },
    { id: "sst", nombre: "Gestión SG – SST", icono: "/icons/icon-gestion-sst.png", activo: true },
    { id: "ambiental", nombre: "Gestión Ambiental", icono: "/icons/icon-gestion-ambiental.png", activo: true },
    { id: "calidad", nombre: "Gestión de Calidad", icono: "/icons/icon-gestion-calidad.png", emoji: "🏅", activo: true },
    { id: "presupuesto", nombre: "Control Presupuestal", icono: "/icons/icon-gestion-presupuesto.png", emoji: "💰", activo: true },
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
            {perfil.esAdmin && onIrCatalogos && (
              <button onClick={onIrCatalogos} className="text-[10.5px] underline" style={{ color: GOLD }}>
                Catálogos
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
              <IconoConRespaldo src={a.icono} emoji={a.emoji || "📁"} alt={a.nombre} tamano={82} style={{ filter: habilitado ? "none" : "grayscale(100%)" }} />
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
              GESTIÓN TÉCNICA
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

function InicioSST({ onSeleccionar, onVolverSelector }) {
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        {onVolverSelector && (
          <button onClick={onVolverSelector} className="text-[11px] mb-2" style={{ color: GOLD }}>
            ← Cambiar de sistema (Técnica / Ambiental)
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              GESTIÓN SG – SST
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>
              Seguridad y Salud en el Trabajo
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {MODULOS_SST.map((m) => (
          <button
            key={m.id}
            onClick={() => m.activo && onSeleccionar(m.id)}
            className="flex flex-col items-center justify-center rounded-2xl p-3 gap-1 relative"
            style={{ background: "white", border: `1px solid ${LINE}`, opacity: m.activo ? 1 : 0.55 }}
          >
            <div className="h-[70px] flex items-center justify-center">
              {m.icono ? (
                <img src={m.icono} alt={m.nombre} loading="lazy" decoding="async" className="w-[70px] h-[70px] object-contain" />
              ) : (
                <div className="text-[34px] leading-none">{m.emoji}</div>
              )}
            </div>
            <div className="text-[11.5px] font-semibold text-center" style={{ color: NAVY }}>
              {m.nombre}
            </div>
            {!m.activo && (
              <div className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LINE, color: NAVY }}>
                Próximamente
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function InicioAmbiental({ onSeleccionar, onVolverSelector }) {
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        {onVolverSelector && (
          <button onClick={onVolverSelector} className="text-[11px] mb-2" style={{ color: GOLD }}>
            ← Cambiar de sistema (Técnica / SST)
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              GESTIÓN AMBIENTAL
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>
              Control ambiental de obra
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {MODULOS_AMBIENTAL.map((m) => (
          <button
            key={m.id}
            onClick={() => onSeleccionar(m.id)}
            className="flex flex-col items-center justify-center rounded-2xl p-3 gap-1 relative"
            style={{ background: "white", border: `1px solid ${LINE}`, opacity: m.activo ? 1 : 0.55 }}
          >
            <div className="h-[70px] flex items-center justify-center">
              {m.icono ? (
                <img src={m.icono} alt={m.nombre} loading="lazy" decoding="async" className="w-[70px] h-[70px] object-contain" />
              ) : (
                <div className="text-[34px] leading-none">{m.emoji}</div>
              )}
            </div>
            <div className="text-[11.5px] font-semibold text-center" style={{ color: NAVY }}>
              {m.nombre}
            </div>
            {!m.activo && (
              <div className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LINE, color: NAVY }}>
                Próximamente
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function InicioCalidad({ onSeleccionar, onVolverSelector }) {
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        {onVolverSelector && (
          <button onClick={onVolverSelector} className="text-[11px] mb-2" style={{ color: GOLD }}>
            ← Cambiar de sistema (Técnica / SST / Ambiental)
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              GESTIÓN DE CALIDAD
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>
              Calidad en obra (QC)
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {MODULOS_CALIDAD.map((m) => (
          <button
            key={m.id}
            onClick={() => onSeleccionar(m.id)}
            className="flex flex-col items-center justify-center rounded-2xl p-3 gap-1 relative"
            style={{ background: "white", border: `1px solid ${LINE}`, opacity: m.activo ? 1 : 0.55 }}
          >
            <div className="h-[70px] flex items-center justify-center">
              <IconoConRespaldo src={m.icono} emoji={m.emoji} alt={m.nombre} tamano={70} />
            </div>
            <div className="text-[11.5px] font-semibold text-center" style={{ color: NAVY }}>
              {m.nombre}
            </div>
            {!m.activo && (
              <div className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LINE, color: NAVY }}>
                Próximamente
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function InicioPresupuesto({ onSeleccionar, onVolverSelector, perfil }) {
  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-6 pb-5" style={{ background: NAVY }}>
        {onVolverSelector && (
          <button onClick={onVolverSelector} className="text-[11px] mb-2" style={{ color: GOLD }}>
            ← Cambiar de sistema (Técnica / SST / Ambiental)
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              CONTROL PRESUPUESTAL
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: GOLD }}>
              Costos, presupuesto y rentabilidad de la obra
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {MODULOS_PRESUPUESTO.filter((m) => nivelCP(perfil, m.id)).map((m) => (
          <button
            key={m.id}
            onClick={() => onSeleccionar(m.id)}
            className="flex flex-col items-center justify-center rounded-2xl p-3 gap-1 relative"
            style={{ background: "white", border: `1px solid ${LINE}`, opacity: m.activo ? 1 : 0.55 }}
          >
            <div className="h-[70px] flex items-center justify-center">
              <IconoConRespaldo src={m.icono} emoji={m.emoji} alt={m.nombre} tamano={70} />
            </div>
            <div className="text-[11.5px] font-semibold text-center" style={{ color: NAVY }}>
              {m.nombre}
            </div>
            {!m.activo && (
              <div className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LINE, color: NAVY }}>
                Próximamente
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AppInterno({ perfil, onCerrarSesion, onIrAdmin, onIrCatalogos, versionDatos = 0 }) {
  const [vista, setVista] = useState("selector-apps");
  // Menú lateral de Gestión SG – SST (☰): permite pasar de un formulario a otro sin volver al inicio
  const ctxSST = {
    modulos: MODULOS_SST.filter((m) => m.activo),
    vistaActual: vista,
    ir: (id) => setVista(id),
    irInicio: () => setVista("inicio-sst"),
    irSelector: () => setVista("selector-apps"),
    nombreUsuario: (perfil && (perfil.nombre || perfil.correo)) || "",
    cerrarSesion: onCerrarSesion,
  };
  const conMenuSST = (nodo) => <ContextoSST.Provider value={ctxSST}>{nodo}</ContextoSST.Provider>;
  // Menú lateral de Gestión Ambiental (mismo componente del menú de SST, con los módulos ambientales activos)
  const ctxAmb = {
    modulos: MODULOS_AMBIENTAL.filter((m) => m.activo),
    vistaActual: vista,
    ir: (id) => setVista(id),
    irInicio: () => setVista("inicio-ambiental"),
    irSelector: () => setVista("selector-apps"),
    nombreUsuario: (perfil && (perfil.nombre || perfil.correo)) || "",
    cerrarSesion: onCerrarSesion,
    titulo: "Gestión Ambiental",
    otrosSistemas: "Técnica / SST",
  };
  const conMenuAmb = (nodo) => <ContextoSST.Provider value={ctxAmb}>{nodo}</ContextoSST.Provider>;
  // Menú lateral de Gestión de Calidad
  const ctxCal = {
    modulos: MODULOS_CALIDAD.filter((m) => m.activo),
    vistaActual: vista,
    ir: (id) => setVista(id),
    irInicio: () => setVista("inicio-calidad"),
    irSelector: () => setVista("selector-apps"),
    nombreUsuario: (perfil && (perfil.nombre || perfil.correo)) || "",
    cerrarSesion: onCerrarSesion,
    titulo: "Gestión de Calidad",
    otrosSistemas: "Técnica / SST / Ambiental",
  };
  const conMenuCal = (nodo) => <ContextoSST.Provider value={ctxCal}>{nodo}</ContextoSST.Provider>;
  // Menú lateral de Control Presupuestal (mismo componente, con sus 4 formatos)
  const ctxPres = {
    modulos: MODULOS_PRESUPUESTO.filter((m) => m.activo && nivelCP(perfil, m.id)),
    vistaActual: vista,
    ir: (id) => setVista(id),
    irInicio: () => setVista("inicio-presupuesto"),
    irSelector: () => setVista("selector-apps"),
    nombreUsuario: (perfil && (perfil.nombre || perfil.correo)) || "",
    cerrarSesion: onCerrarSesion,
    titulo: "Control Presupuestal",
    otrosSistemas: "Técnica / SST / Ambiental",
  };
  const conMenuPres = (nodo) => {
    const nivel = nivelCP(perfil, vista);
    if (!nivel) return <SinAcceso onVolver={() => setVista("inicio-presupuesto")} />;
    return <ContextoSST.Provider key={versionDatos} value={ctxPres}>{nivel === "V" ? <SoloLectura key={vista}>{nodo}</SoloLectura> : nodo}</ContextoSST.Provider>;
  };

  if (vista === "inicio") {
    return <Inicio onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista === "selector-apps") {
    return (
      <SelectorApps
        perfil={perfil}
        onCerrarSesion={onCerrarSesion}
        onIrAdmin={onIrAdmin}
        onIrCatalogos={onIrCatalogos}
        onSeleccionar={(id) => {
          const tieneAcceso = perfil?.esAdmin || (perfil?.roles || []).includes(id);
          if (!tieneAcceso) {
            alert("No tienes acceso a este módulo. Si crees que deberías tenerlo, contacta al administrador.");
            return;
          }
          if (id === "tecnica") setVista("inicio");
          else if (id === "sst") setVista("inicio-sst");
          else if (id === "ambiental") setVista("inicio-ambiental");
          else if (id === "calidad") setVista("inicio-calidad");
          else if (id === "presupuesto") setVista("inicio-presupuesto");
          else setVista(`proximamente-${id}`);
        }}
      />
    );
  }
  if (vista === "inicio-sst") {
    return <InicioSST onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista === "sst-asistencia") {
    return conMenuSST(<FormularioListaAsistencia onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-induccion") {
    return conMenuSST(<FormularioInduccion onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-epp") {
    return conMenuSST(<FormularioEntregaEPP onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-capacitaciones") {
    return conMenuSST(<FormularioCapacitaciones onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-permisos") {
    return conMenuSST(<FormularioPermisoTrabajo onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-ats") {
    return conMenuSST(<FormularioATS onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-inspecciones") {
    return conMenuSST(<FormularioInspecciones onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-actos-inseguros") {
    return conMenuSST(<FormularioActosCondiciones onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-acciones") {
    return conMenuSST(<FormularioAcciones onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-accidentalidad") {
    return conMenuSST(<FormularioAccidente onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-investigacion") {
    return conMenuSST(<FormularioInvestigacion onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-indicadores") {
    return conMenuSST(<FormularioIndicadores onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-ficha") {
    return conMenuSST(<FormularioFichaSST onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-personal") {
    return conMenuSST(<FormularioPersonal onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-matriz-peligros") {
    return conMenuSST(<FormularioMatriz onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-emergencias") {
    return conMenuSST(<FormularioEmergencias onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-semanal") {
    return conMenuSST(<FormularioSemanalSST onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-mensual") {
    return conMenuSST(<FormularioMensualSST onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-contratistas") {
    return conMenuSST(<FormularioContratistas onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista === "sst-charla-diaria") {
    return conMenuSST(<FormularioCharlaDiaria onVolver={() => setVista("inicio-sst")} />);
  }
  if (vista.startsWith("sst-")) {
    return <Proximamente nombre={(MODULOS_SST.find((m) => m.id === vista) || {}).nombre || "Este módulo"} onVolver={() => setVista("inicio-sst")} />;
  }
  if (vista === "inicio-ambiental") {
    return <InicioAmbiental onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista === "inicio-calidad") {
    return <InicioCalidad onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista.startsWith("cal-")) {
    return conMenuCal(<Proximamente nombre={(MODULOS_CALIDAD.find((m) => m.id === vista) || {}).nombre || "Este formato"} onVolver={() => setVista("inicio-calidad")} />);
  }
  if (vista === "inicio-presupuesto") {
    return <InicioPresupuesto perfil={perfil} onSeleccionar={setVista} onVolverSelector={() => setVista("selector-apps")} />;
  }
  if (vista === "cp-control") {
    return conMenuPres(<FormularioControlPresupuestal onVolver={() => setVista("inicio-presupuesto")} />);
  }
  if (vista === "cp-costos") {
    return conMenuPres(<FormularioRegistroCostos onVolver={() => setVista("inicio-presupuesto")} />);
  }
  if (vista === "cp-adicionales") {
    return conMenuPres(<FormularioAdicionales onVolver={() => setVista("inicio-presupuesto")} />);
  }
  if (vista === "cp-anticipo") {
    return conMenuPres(<FormularioAnticipo onVolver={() => setVista("inicio-presupuesto")} />);
  }
  if (vista === "cp-materiales") return conMenuPres(<FormularioCostosLibro formato="materiales" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-mano-obra") return conMenuPres(<FormularioCostosLibro formato="manoObra" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-equipos") return conMenuPres(<FormularioCostosLibro formato="equipos" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-cuentas") return conMenuPres(<FormularioCostosLibro formato="cuentas" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-flujo") return conMenuPres(<FormularioCostosLibro formato="flujo" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-rentabilidad") return conMenuPres(<FormularioCostosFicha formato="costos" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "cp-cierre") return conMenuPres(<FormularioCostosFicha formato="cierre" onVolver={() => setVista("inicio-presupuesto")} />);
  if (vista === "amb-ficha") {
    return conMenuAmb(<FormularioFichaAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-residuos") {
    return conMenuAmb(<FormularioResiduos onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-manifiesto") {
    return conMenuAmb(<FormularioManifiestoRCD onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-consumos") {
    return conMenuAmb(<FormularioConsumos onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-vertimientos") {
    return conMenuAmb(<FormularioVertimientos onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-inspeccion") {
    return conMenuAmb(<FormularioInspeccionAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-maquinaria") {
    return conMenuAmb(<FormularioMaquinaria onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-capacitacion") {
    return conMenuAmb(<FormularioCapacitacionAmb onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-fotografico") {
    return conMenuAmb(<FormularioFotografico onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-incidente") {
    return conMenuAmb(<FormularioIncidenteAmb onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-matriz") {
    return conMenuAmb(<FormularioMatrizAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-quimicos") {
    return conMenuAmb(<FormularioSustanciasQuimicas onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-hidrocarburos") {
    return conMenuAmb(<FormularioControlHidrocarburos onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-forestal") {
    return conMenuAmb(<FormularioAprovechamientoForestal onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-contratistas") {
    return conMenuAmb(<FormularioContratistasAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-pqrs") {
    return conMenuAmb(<FormularioPqrs onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-emisiones") {
    return conMenuAmb(<FormularioEmisiones onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-acciones") {
    return conMenuAmb(<FormularioAccionesAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-indicadores") {
    return conMenuAmb(<FormularioIndicadoresAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-semanal") {
    return conMenuAmb(<FormularioSemanalAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-mensual") {
    return conMenuAmb(<FormularioMensualAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-trimestral") {
    return conMenuAmb(<FormularioTrimestralAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista === "amb-ica") {
    return conMenuAmb(<FormularioIcaAmbiental onVolver={() => setVista("inicio-ambiental")} />);
  }
  if (vista.startsWith("amb-")) {
    return <Proximamente nombre={(MODULOS_AMBIENTAL.find((m) => m.id === vista) || {}).nombre || "Este módulo"} onVolver={() => setVista("inicio-ambiental")} />;
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
  useEffect(() => activarOrtografia(), []);   // corrección ortográfica (español) en todos los campos de texto
  return (
    <AuthProvider>
      <AppConSesion />
    </AuthProvider>
  );
}

// Sincronización con el servidor: arranca al iniciar sesión y se detiene (borrando la copia del equipo) al cerrarla.
function useSincronizacion(usuario, perfil) {
  const [listo, setListo] = useState(false);
  const [hayNuevos, setHayNuevos] = useState(false);
  const [version, setVersion] = useState(0);
  const [enLinea, setEnLinea] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const uid = usuario && usuario.uid;
  const huella = perfil ? JSON.stringify([perfil.esAdmin || false, perfil.roles || [], perfil.rolCP || ""]) : "";
  useEffect(() => {
    if (!uid || !perfil) { setListo(false); return undefined; }
    let vivo = true;
    setListo(false);
    iniciarSync({ uid, perfil, onEvento: (e) => { if (e.tipo === "datos" && e.remoto && vivo) setHayNuevos(true); if (e.tipo === "error") console.warn("Sincronización:", e.col, e.error && e.error.code); } })
      .catch((e) => console.warn("No se pudo iniciar la sincronización", e))
      .finally(() => { if (vivo) setListo(true); });
    return () => { vivo = false; detenerSync({ limpiar: true }); };
  }, [uid, huella]);   // eslint-disable-line
  useEffect(() => {
    const a = () => setEnLinea(true), b = () => setEnLinea(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  const actualizar = () => { setHayNuevos(false); setVersion((v) => v + 1); };
  // Si llegaron datos de otro dispositivo, la pantalla se actualiza sola en cuanto la persona deja de escribir (2,5 s),
  // porque un formulario con datos viejos podría pisar lo nuevo al guardarse. Mientras tanto queda el aviso para hacerlo a mano.
  const ultimaAccion = useRef(Date.now());
  useEffect(() => {
    const marcar = () => { ultimaAccion.current = Date.now(); };
    ["keydown", "input", "pointerdown"].forEach((ev) => window.addEventListener(ev, marcar, true));
    return () => ["keydown", "input", "pointerdown"].forEach((ev) => window.removeEventListener(ev, marcar, true));
  }, []);
  useEffect(() => {
    if (!hayNuevos) return undefined;
    const t = setInterval(() => { if (Date.now() - ultimaAccion.current > 2500) { setHayNuevos(false); setVersion((v) => v + 1); } }, 1000);
    return () => clearInterval(t);
  }, [hayNuevos]);
  return { listo, hayNuevos, version, actualizar, enLinea };
}

function AppConSesion() {
  const { usuario, perfil, cargando, cerrarSesion } = useAuth();
  const [vistaExterna, setVistaExterna] = useState("apps");
  const sync = useSincronizacion(usuario, perfil);
  // Antes de cerrar sesión se sube lo pendiente y se borra la copia del equipo (otra persona podría usarlo)
  const cerrarSesionSegura = async () => { try { await detenerSync({ limpiar: true }); } catch (e) { /* se cierra igual */ } await cerrarSesion(); };

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

  if (!sync.listo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <div className="text-[13px]" style={{ color: NAVY }}>Sincronizando datos...</div>
      </div>
    );
  }

  if (vistaExterna === "catalogos" && perfil.esAdmin) {
    return <PanelCatalogos onVolver={() => setVistaExterna("apps")} />;
  }

  return (
    <div>
      <AppInterno perfil={perfil} onCerrarSesion={cerrarSesionSegura} onIrAdmin={() => setVistaExterna("admin")} onIrCatalogos={() => setVistaExterna("catalogos")} versionDatos={sync.version} />
      {(sync.hayNuevos || !sync.enLinea) && (
        <div className="fixed right-2.5 z-40 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md" style={{ bottom: 96, background: sync.hayNuevos ? GOLD : "#FFF4DB", color: sync.hayNuevos ? "white" : "#8A5A00" }}>
          {sync.hayNuevos
            ? <button type="button" onClick={sync.actualizar}>🔄 Hay datos nuevos de otro dispositivo · Actualizar</button>
            : "Sin conexión: se guardará aquí y se enviará al volver"}
        </div>
      )}
    </div>
  );
}
