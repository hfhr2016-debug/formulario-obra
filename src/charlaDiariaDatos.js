// Lógica pura de la Charla Diaria de Seguridad (sin React) — así se puede probar sin navegador.
// PELIGROS, EPP y CELDAS salen del mismo script que construye la plantilla de Excel
// (public/plantilla-charla-diaria.xlsx), para que nunca se desincronicen.

export const CODIGO_FORMATO = "RYR-SS-002";
export const PELIGROS = ["Caída a distinto nivel (alturas)", "Caída al mismo nivel / resbalones", "Caída de objetos o herramientas", "Golpes, cortes y atrapamientos", "Sobreesfuerzo / carga manual", "Riesgo eléctrico", "Proyección de partículas", "Ruido", "Polvo / material particulado", "Tránsito de vehículos y maquinaria", "Excavaciones / taludes", "Izaje de cargas", "Trabajo en caliente / incendio", "Espacios confinados / gases", "Sustancias químicas / derrames", "Exposición solar / calor", "Lluvia / tormenta eléctrica", "Animales (serpientes, insectos)", "Seguridad pública / terceros", "Orden y aseo deficiente"];
export const EPP = ["Casco de seguridad", "Gafas de seguridad", "Guantes", "Botas de seguridad", "Arnés y línea de vida", "Protección auditiva", "Respirador / mascarilla", "Chaleco reflectivo", "Careta / protector facial", "Overol / ropa de trabajo", "Impermeable (lluvia)", "Protector solar / hidratación"];
export const CELDAS = {"proyecto": "C11", "contratista": "C12", "ubicacion": "J12", "fecha": "C13", "horaInicio": "E13", "horaFin": "G13", "duracion": "I13", "nCharla": "K13", "frente": "C14", "tipo": "J14", "facilitadorNombre": "C15", "facilitadorCargo": "J15", "tema": "C17", "contenido": "C18", "actividades": "C23", "otrosPeligros": "C31", "medidas": "C32", "otrosEpp": "C39", "peligros": ["A26", "D26", "G26", "J26", "A27", "D27", "G27", "J27", "A28", "D28", "G28", "J28", "A29", "D29", "G29", "J29", "A30", "D30", "G30", "J30"], "epp": ["A36", "D36", "G36", "J36", "A37", "D37", "G37", "J37", "A38", "D38", "G38", "J38"], "clima": "C41", "ordenAseo": "G41", "sintomas": "K41", "novedades": "C42", "asistentesFila0": 47, "asistentesN": 30, "personalTotal": "H77", "foto1": {"tl": {"col": 0, "row": 78}, "br": {"col": 3, "row": 94}}, "captionFoto1": "A95", "foto2": {"tl": {"col": 3, "row": 78}, "br": {"col": 6, "row": 94}}, "captionFoto2": "D95", "foto3": {"tl": {"col": 6, "row": 78}, "br": {"col": 9, "row": 94}}, "captionFoto3": "G95", "foto4": {"tl": {"col": 9, "row": 78}, "br": {"col": 12, "row": 94}}, "captionFoto4": "J95", "fotoAspecto": [0.87, 0.932, 0.825, 0.915], "fondoFoto": "F2F2F2", "facilitadorNombreFirma": "C99", "facilitadorCargoFirma": "C100", "responsableNombre": "I99", "responsableCargo": "I100", "leyendaPeligros": "A25", "leyendaEpp": "A35"};
export const MAX_ASISTENTES = CELDAS.asistentesN;

export const TIPOS_CHARLA = [
  "Inicio de jornada (charla de 5 min)",
  "Previa a actividad de alto riesgo",
  "Lecciones aprendidas (incidente / casi accidente)",
  "Campaña o tema especial",
];
export const CLIMAS = ["Soleado", "Nublado", "Lluvia", "Tormenta eléctrica"];
export const ORDEN_ASEO = ["Conforme", "Con novedad"];
export const SINTOMAS = ["No", "Sí (ver novedades)"];

export const TEMAS_SUGERIDOS = [
  "Uso correcto de los EPP", "Trabajo seguro en alturas", "Orden y aseo en el frente de trabajo",
  "Manejo manual de cargas y ergonomía", "Uso seguro de herramientas manuales", "Uso seguro de herramientas eléctricas",
  "Riesgo eléctrico", "Excavaciones y taludes", "Izaje de cargas y señalero", "Trabajo en caliente (soldadura y corte)",
  "Espacios confinados", "Manejo de sustancias químicas", "Manejo seguro de maquinaria pesada",
  "Tránsito, señalización y seguridad vial en obra", "Hidratación y exposición solar", "Pausas activas",
  "Prevención de mordeduras de serpientes e insectos", "Plan de emergencias y rutas de evacuación",
  "Uso de extintores", "Primeros auxilios", "Reporte de actos y condiciones inseguras",
  "Derecho a negarse a trabajar en condiciones inseguras", "Consumo de alcohol y sustancias psicoactivas",
  "Trabajo bajo lluvia y tormentas eléctricas", "Seguridad en andamios y escaleras", "Prevención de caída de objetos",
  "Lecciones aprendidas de incidentes recientes", "Autocuidado y estilos de vida saludable",
];

export function fechaHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function fechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Minutos entre dos horas "HH:MM" (si cruza medianoche suma 24 h). "" si falta alguna.
export function minutosEntre(inicio, fin) {
  if (!inicio || !fin) return "";
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => isNaN(n))) return "";
  let min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (min < 0) min += 24 * 60;
  return min;
}

export function textoDuracion(inicio, fin) {
  const m = minutosEntre(inicio, fin);
  return m === "" ? "" : `${m} min`;
}

// Convierte texto pegado (una persona por línea; columnas separadas por tabulador o punto y coma,
// como al copiar desde Excel) en filas de asistentes: nombre, documento, cargo, empresa.
export function parsearPegado(texto) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const partes = l.split(/\t|;/).map((p) => p.trim());
      return { nombre: partes[0] || "", documento: partes[1] || "", cargo: partes[2] || "", empresa: partes[3] || "" };
    })
    .filter((a) => a.nombre);
}

// Marcas de las casillas de peligros y EPP: ✔ (chulito negro y grueso) = aplica hoy, ☐ = no aplica.
export const GLIFO_SI = "✔";
export const GLIFO_NO = "☐";

// Texto plano de un valor de celda de ExcelJS (texto, texto con formato, fórmula o hipervínculo).
export function textoDe(valor) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    if (Array.isArray(valor.richText)) return valor.richText.map((p) => p.text).join("");
    if (valor.text !== undefined && valor.text !== null) return String(valor.text);
    if (valor.result !== undefined && valor.result !== null) return String(valor.result);
    return "";
  }
  return String(valor);
}
const quitarGlifo = (t) => String(t).replace(/^[☒☐✔✓☑]\s*/, "");

// Marca cada opción según las elegidas. Conserva el texto que tenga la plantilla en cada casilla (si el usuario
// le cambió el nombre a una opción, se respeta) y solo usa el de la lista cuando la casilla está vacía.
function marcarGrid(ws, opciones, celdas, elegidas) {
  opciones.forEach((op, i) => {
    if (!celdas[i]) return;
    const actual = quitarGlifo(textoDe(ws.getCell(celdas[i]).value)).trim() || op;
    ws.getCell(celdas[i]).value = (elegidas.includes(op) ? GLIFO_SI : GLIFO_NO) + " " + actual;
  });
}

// Las leyendas de las secciones decían "(☒ = aplica hoy)": se actualizan al chulito.
function actualizarLeyenda(ws, ref) {
  if (!ref) return;
  const t = textoDe(ws.getCell(ref).value);
  if (t.includes("☒")) ws.getCell(ref).value = t.replace(/☒/g, GLIFO_SI);
}

function poner(ws, ref, valor) {
  if (valor === undefined || valor === null || valor === "") return;
  ws.getCell(ref).value = valor;
}

// Escribe TODOS los datos de la charla en la hoja de la plantilla.
// Solo escribe en celdas "ancla" (la esquina de cada celda combinada) — escribir en otra celda de
// una combinación falla en ExcelJS.
export function escribirCharlaEnHoja(ws, d, celdas = CELDAS) {
  const C = celdas;
  poner(ws, C.proyecto, d.proyecto);
  poner(ws, C.contratista, d.contratista);
  poner(ws, C.ubicacion, d.ubicacion);
  poner(ws, C.fecha, fechaDDMMYYYY(d.fecha));
  poner(ws, C.horaInicio, d.horaInicio);
  poner(ws, C.horaFin, d.horaFin);
  poner(ws, C.duracion, textoDuracion(d.horaInicio, d.horaFin));
  poner(ws, C.nCharla, d.nCharla);
  poner(ws, C.frente, d.frente);
  poner(ws, C.tipo, d.tipo);
  poner(ws, C.facilitadorNombre, d.facilitadorNombre);
  poner(ws, C.facilitadorCargo, d.facilitadorCargo);

  poner(ws, C.tema, d.tema);
  poner(ws, C.contenido, d.contenido);

  poner(ws, C.actividades, d.actividades);
  marcarGrid(ws, PELIGROS, C.peligros, d.peligros || []);
  poner(ws, C.otrosPeligros, d.otrosPeligros);
  poner(ws, C.medidas, d.medidas);
  marcarGrid(ws, EPP, C.epp, d.epp || []);
  actualizarLeyenda(ws, C.leyendaPeligros);
  actualizarLeyenda(ws, C.leyendaEpp);
  poner(ws, C.otrosEpp, d.otrosEpp);

  poner(ws, C.clima, d.clima);
  poner(ws, C.ordenAseo, d.ordenAseo);
  poner(ws, C.sintomas, d.sintomas);
  poner(ws, C.novedades, d.novedades);

  (d.asistentes || []).slice(0, MAX_ASISTENTES).forEach((a, i) => {
    const f = C.asistentesFila0 + i;
    poner(ws, `B${f}`, a.nombre);
    poner(ws, `E${f}`, a.documento);
    poner(ws, `G${f}`, a.cargo);
    poner(ws, `I${f}`, a.empresa);
  });
  const total = Number(d.personalTotal);
  if (total > 0) ws.getCell(C.personalTotal).value = total;

  poner(ws, C.facilitadorNombreFirma, d.facilitadorNombre);
  poner(ws, C.facilitadorCargoFirma, d.facilitadorCargo);
  poner(ws, C.responsableNombre, d.responsableNombre);
  poner(ws, C.responsableCargo, d.responsableCargo);
}

// ---------- Ciudades (el mismo catálogo del buscador de Ubicación de Gestión Técnica) ----------
export const CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];
export const CIUDADES_PRINCIPALES = ["Bogotá D.C.", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Cúcuta", "Pereira", "Manizales", "Ibagué", "Villavicencio", "Santa Marta", "Neiva", "Pasto", "Armenia", "Soacha"];

export function quitarTildes(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Filtra una lista de opciones { texto, detalle } por lo escrito: sin importar tildes ni mayúsculas;
// primero las que empiezan con el texto y luego las más cortas.
export function filtrarOpciones(opciones, texto, max = 8) {
  const q = quitarTildes(texto).toLowerCase().trim();
  if (!q) return [];
  const clave = (o) => quitarTildes(o.texto).toLowerCase();
  return opciones
    .filter((o) => clave(o).includes(q))
    .sort((a, b) => (clave(a).startsWith(q) ? 0 : 1) - (clave(b).startsWith(q) ? 0 : 1) || clave(a).length - clave(b).length)
    .slice(0, max);
}

// ---------- Profesionales que usan el formato (cargos y memoria de nombres) ----------
export const CARGOS_PROFESIONALES = [
  "Ingeniero Residente", "Arquitecto Residente", "Director de Obra", "Coordinador SST", "Profesional SST",
  "Tecnólogo SST", "Inspector SST", "Coordinador HSEQ", "Maestro de Obra", "Supervisor de Obra",
  "Interventor de Obra", "Gerente de Proyecto",
];
const MAX_PROFESIONALES = 40;

export function normalizarNombre(n) {
  return String(n || "").trim().replace(/\s+/g, " ");
}

export function buscarProfesional(lista, nombre) {
  const k = normalizarNombre(nombre).toLowerCase();
  if (!k) return null;
  return (lista || []).find((p) => normalizarNombre(p.nombre).toLowerCase() === k) || null;
}

// Guarda un profesional. Si es nuevo va al principio; si ya existía se actualiza EN SU LUGAR (la lista no se
// reordena, para que los botones no se muevan bajo el dedo). Conserva la mejor escritura del nombre (la que
// se vea como "Nombre Apellido") y, si el cargo llega vacío, el que ya tenía. Si no cambia nada devuelve la misma lista.
export function recordarProfesional(lista, nombre, cargo) {
  const n = normalizarNombre(nombre);
  if (n.length < 3) return lista;
  const arr = lista || [];
  const k = n.toLowerCase();
  const i = arr.findIndex((p) => normalizarNombre(p.nombre).toLowerCase() === k);
  if (i === -1) return [{ nombre: n, cargo: normalizarNombre(cargo) }, ...arr].slice(0, MAX_PROFESIONALES);
  const previo = arr[i];
  // Puntaje de "bien escrito": palabras con la primera letra en mayúscula y el resto en minúscula.
  const puntaje = (t) => String(t).split(" ").filter((w) => /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+$/.test(w)).length;
  const nombreFinal = puntaje(n) > puntaje(previo.nombre) ? n : previo.nombre;
  const cargoFinal = normalizarNombre(cargo) || previo.cargo;
  if (nombreFinal === previo.nombre && cargoFinal === previo.cargo) return lista;
  const copia = arr.slice();
  copia[i] = { nombre: nombreFinal, cargo: cargoFinal };
  return copia;
}

export function quitarProfesional(lista, nombre) {
  const k = normalizarNombre(nombre).toLowerCase();
  return (lista || []).filter((p) => normalizarNombre(p.nombre).toLowerCase() !== k);
}

// Cargos de la lista base + los cargos distintos que ya se escribieron al guardar profesionales.
export function cargosDisponibles(lista) {
  const extras = (lista || []).map((p) => normalizarNombre(p.cargo)).filter((c) => c && !CARGOS_PROFESIONALES.includes(c));
  return [...CARGOS_PROFESIONALES, ...Array.from(new Set(extras))];
}

// ---------- Cargos y oficios de una obra (registro de asistentes) ----------
// Incluye los cargos de los profesionales, el personal técnico y administrativo, y todos los oficios y operadores
// (los nombres individuales del catálogo de Mano de Obra de Gestión Técnica, sin las cuadrillas ni los "Obrero (2)").
export const CARGOS_OBRA = [
  // Dirección, ingeniería y administración
  "Director de Obra", "Gerente de Proyecto", "Ingeniero Residente", "Arquitecto Residente", "Residente de Obra",
  "Ingeniero Auxiliar", "Ingeniero Supervisor", "Ingeniero Geotecnista", "Interventor de Obra", "Inspector de Obra",
  "Calculista", "Dibujante", "Topógrafo", "Cadenero", "Almacenista de Obra", "Auxiliar Administrativo", "Secretaria de Obra",
  // Seguridad, salud, ambiente y social
  "Coordinador SST", "Profesional SST", "Tecnólogo SST", "Inspector SST", "Coordinador HSEQ", "Coordinador Ambiental",
  "Profesional Ambiental", "Profesional Social", "Brigadista",
  // Oficios de construcción
  "Maestro de Obra", "Capataz", "Oficial", "Ayudante", "Obrero", "Armador", "Carpintero", "Formaletero", "Albañil",
  "Oficial de Mampostería", "Pañetador", "Estucador", "Pintor", "Enchapador / Embaldosador", "Soldador", "Cortador",
  "Ornamentador", "Cerrajero", "Vidriero / Aluminero", "Oficial de Estructuras Metálicas", "Andamiero", "Concretero",
  "Impermeabilizador", "Instalador de Cubiertas", "Instalador de Drywall", "Instalador de Cielo Raso",
  "Electricista", "Ayudante de Electricista", "Plomero / Hidrosanitario", "Ayudante Hidrosanitario", "Instalador de Gas",
  "Técnico en Climatización (HVAC)", "Técnico en Cableado Estructurado", "Técnico en Sistemas de Seguridad (CCTV)",
  "Técnico Instalador de Ascensores", "Jardinero", "Perforador", "Aparejador", "Señalero / Banderillero", "Paletero", "Rastrillero",
  // Operadores, conductores y mecánicos
  "Operador de Retroexcavadora", "Operador de Excavadora", "Operador de Miniexcavadora", "Operador de Cargador",
  "Operador de Minicargador", "Operador de Bulldozer", "Operador de Motoniveladora", "Operador de Vibrocompactador",
  "Operador de Pavimentadora", "Operador de Extendedora de Asfalto", "Operador de Grúa", "Operador de Torre Grúa",
  "Operador de Pluma Grúa", "Operador de Camión Grúa", "Operador de Montacargas", "Operador de Mezcladora de Concreto",
  "Operador de Bomba de Concreto", "Operador de Planta Móvil de Concreto", "Operador de Vibrador",
  "Conductor", "Conductor de Volqueta", "Conductor de Camabaja", "Mecánico", "Lubricador / Engrasador",
  // Servicios, vigilancia e hidrocarburos
  "Vigilante / Celador", "Aseador de Obra / Servicios Generales", "Tubero", "Soldador Homologado", "Instrumentista",
  // Otros
  "Visitante", "Subcontratista",
];

// Une dos listas sin repetir (sin importar mayúsculas ni tildes). Por defecto las ordena alfabéticamente.
export function unirUnicos(base, extras, ordenar = true) {
  const visto = new Set();
  const salida = [];
  for (const t of [...(base || []), ...(extras || [])]) {
    const texto = String(t || "").trim().replace(/\s+/g, " ");
    const k = quitarTildes(texto).toLowerCase();
    if (!k || visto.has(k)) continue;
    visto.add(k);
    salida.push(texto);
  }
  return ordenar ? salida.sort((a, b) => a.localeCompare(b, "es")) : salida;
}

// Agrega "texto" al principio de "lista" si es nuevo (sin importar mayúsculas ni tildes) y no está en "base".
// Devuelve la MISMA lista si no hay nada que agregar.
export function recordarTexto(lista, texto, { base = [], min = 3, max = 100 } = {}) {
  const t = String(texto || "").trim().replace(/\s+/g, " ");
  if (t.length < min) return lista;
  const k = quitarTildes(t).toLowerCase();
  const existe = (x) => quitarTildes(String(x)).toLowerCase() === k;
  if ((base || []).some(existe) || (lista || []).some(existe)) return lista;
  return [t, ...(lista || [])].slice(0, max);
}

// ---------- Lectura de la distribución de la plantilla ----------
// En vez de depender de números de fila fijos, la app LEE la plantilla que esté subida y ubica cada celda por el texto
// de su etiqueta ("Proyecto / Obra", "Tema principal", "6. EVIDENCIA…"). Así, si el formato cambia (filas insertadas,
// casillas de foto más altas o más bajas, etc.), todo sigue cayendo en su lugar, y las fotos quedan DENTRO de su casilla.
// Si no se puede leer, se usa CELDAS (la distribución de la plantilla entregada).
const GRUPOS_4 = ["A", "D", "G", "J"];

export function colNum(letras) {
  let n = 0;
  for (const ch of String(letras)) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
export function colLetra(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
export function parseRango(texto) {
  const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(String(texto));
  return m ? { left: colNum(m[1]), top: Number(m[2]), right: colNum(m[3]), bottom: Number(m[4]) } : null;
}

// Devuelve { celdas, problemas }. Si "problemas" trae algo, "celdas" es null y se debe usar CELDAS.
export function descubrirCeldas(ws) {
  const problemas = [];
  const maxFila = Math.min(Math.max(Number(ws.rowCount) || 0, 1), 400);
  const texto = (r, c) => textoDe(ws.getCell(r, c).value).trim();
  const filaDe = (etiqueta, letra = "A", desde = 1, empieza = false) => {
    const c = colNum(letra);
    for (let r = desde; r <= maxFila; r++) {
      const t = texto(r, c);
      if (empieza ? t.startsWith(etiqueta) : t === etiqueta) return r;
    }
    problemas.push(`No encontré "${etiqueta}" (columna ${letra})`);
    return 0;
  };
  // Una celda es escribible si es libre o la ESQUINA de una combinación (nunca el resto de la combinación)
  const esEsquina = (ref) => {
    try { const c = ws.getCell(ref); return !c.master || c.master.address === c.address; } catch (e) { return true; }
  };
  const ancla = (ref) => {
    if (!esEsquina(ref)) problemas.push(`${ref} es parte de una celda combinada y no es su esquina`);
    return ref;
  };
  const C = {};
  let r;

  // 1. Datos generales
  if ((r = filaDe("Proyecto / Obra"))) C.proyecto = ancla(`C${r}`);
  if ((r = filaDe("Contratista / Empresa"))) C.contratista = ancla(`C${r}`);
  if ((r = filaDe("Ubicación", "H"))) C.ubicacion = ancla(`J${r}`);
  if ((r = filaDe("Fecha"))) {
    C.fecha = ancla(`C${r}`); C.horaInicio = ancla(`E${r}`); C.horaFin = ancla(`G${r}`);
    C.duracion = ancla(`I${r}`); C.nCharla = ancla(`K${r}`);
  }
  if ((r = filaDe("Frente / lugar"))) C.frente = ancla(`C${r}`);
  if ((r = filaDe("Tipo de charla", "H"))) C.tipo = ancla(`J${r}`);
  if ((r = filaDe("Facilitador"))) {
    C.facilitadorNombre = ancla(`C${r}`);
    const rc = filaDe("Cargo", "H", r);
    if (rc) C.facilitadorCargo = ancla(`J${rc}`);
  }
  // 2. Tema
  if ((r = filaDe("Tema principal"))) C.tema = ancla(`C${r}`);
  if ((r = filaDe("Contenido / puntos tratados"))) C.contenido = ancla(`C${r}`);
  // 3. Actividades, peligros y controles
  if ((r = filaDe("Actividades programadas hoy"))) C.actividades = ancla(`C${r}`);
  const rSubPel = filaDe("Peligros identificados", "A", 1, true);
  const rOtrosPel = filaDe("Otros peligros");
  if (rSubPel && rOtrosPel) {
    C.leyendaPeligros = `A${rSubPel}`;
    C.otrosPeligros = ancla(`C${rOtrosPel}`);
    C.peligros = [];
    for (let f = rSubPel + 1; f < rOtrosPel; f++) for (const a of GRUPOS_4) C.peligros.push(ancla(`${a}${f}`));
  }
  if ((r = filaDe("Medidas de control acordadas"))) C.medidas = ancla(`C${r}`);
  const rSubEpp = filaDe("EPP requerido", "A", 1, true);
  const rOtrosEpp = filaDe("Otros EPP / elementos");
  if (rSubEpp && rOtrosEpp) {
    C.leyendaEpp = `A${rSubEpp}`;
    C.otrosEpp = ancla(`C${rOtrosEpp}`);
    C.epp = [];
    for (let f = rSubEpp + 1; f < rOtrosEpp; f++) for (const a of GRUPOS_4) C.epp.push(ancla(`${a}${f}`));
  }
  // 4. Condiciones y novedades
  if ((r = filaDe("Clima"))) { C.clima = ancla(`C${r}`); C.ordenAseo = ancla(`G${r}`); C.sintomas = ancla(`K${r}`); }
  if ((r = filaDe("Novedades, observaciones y compromisos"))) C.novedades = ancla(`C${r}`);
  // 5. Asistentes
  const rCab = filaDe("No.");
  const rTot = filaDe("Total de asistentes");
  if (rCab && rTot) {
    C.asistentesFila0 = rCab + 1;
    C.asistentesN = rTot - rCab - 1;
    if (C.asistentesN < 1) problemas.push("No hay filas de asistentes entre el encabezado y el total");
    for (let i = 0; i < C.asistentesN; i++) for (const l of ["B", "E", "G", "I"]) ancla(`${l}${C.asistentesFila0 + i}`);
  }
  if ((r = filaDe("Personal total en obra hoy", "E"))) C.personalTotal = ancla(`H${r}`);

  // 6. Fotos: las casillas son las celdas combinadas altas que hay entre los títulos "6." y "7."
  const r6 = filaDe("6. EVIDENCIA", "A", 1, true);
  const r7 = r6 ? filaDe("7. FIRMAS", "A", r6 + 1, true) : 0;
  if (r6 && r7) {
    let rangos = [];
    try { rangos = ((ws.model && ws.model.merges) || []).map(parseRango).filter(Boolean); } catch (e) { rangos = []; }
    if (!rangos.length) {
      // Segunda forma de leer las combinadas (por si "model" no está disponible)
      try { rangos = Object.values(ws._merges || {}).map((m) => ({ left: m.left, top: m.top, right: m.right, bottom: m.bottom })); } catch (e) { rangos = []; }
    }
    const cajas = rangos
      .filter((g) => g.top > r6 && g.bottom < r7 && g.bottom - g.top >= 3 && g.right - g.left >= 1)
      .sort((a, b) => a.top - b.top || a.left - b.left);
    if (!cajas.length) problemas.push("No encontré las casillas de foto (celdas combinadas altas entre los títulos 6 y 7)");
    const anchoPx = (c) => (Number(ws.getColumn(c).width) || 8.43) * 7;
    const altoPx = (f) => ((Number(ws.getRow(f).height) || 15) * 96) / 72;
    const aspectos = [];
    cajas.forEach((g, i) => {
      C[`foto${i + 1}`] = { tl: { col: g.left - 1, row: g.top - 1 }, br: { col: g.right, row: g.bottom } };
      let w = 0; let h = 0;
      for (let c = g.left; c <= g.right; c++) w += anchoPx(c);
      for (let f = g.top; f <= g.bottom; f++) h += altoPx(f);
      aspectos.push(Math.round((w / h) * 1000) / 1000);
      // La descripción va en la fila de abajo de la casilla (si esa celda se puede escribir)
      const refPie = `${colLetra(g.left)}${g.bottom + 1}`;
      if (g.bottom + 1 < r7 && esEsquina(refPie)) C[`captionFoto${i + 1}`] = refPie;
    });
    C.fotoAspecto = aspectos;
    C.fondoFoto = CELDAS.fondoFoto || "F2F2F2";
  }
  // 7. Firmas
  const rFirma = filaDe("Firma:");
  const rNombre = rFirma ? filaDe("Nombre:", "A", rFirma) : 0;
  const rCargo = rNombre ? filaDe("Cargo:", "A", rNombre) : 0;
  if (rNombre && rCargo) {
    C.facilitadorNombreFirma = ancla(`C${rNombre}`); C.facilitadorCargoFirma = ancla(`C${rCargo}`);
    C.responsableNombre = ancla(`I${rNombre}`); C.responsableCargo = ancla(`I${rCargo}`);
  }

  // Validaciones finales: todo lo que la app necesita debe haberse encontrado
  const obligatorias = ["proyecto", "contratista", "ubicacion", "fecha", "nCharla", "frente", "tipo", "facilitadorNombre", "facilitadorCargo", "tema", "contenido",
    "actividades", "peligros", "otrosPeligros", "medidas", "epp", "otrosEpp", "clima", "ordenAseo", "sintomas", "novedades",
    "asistentesFila0", "personalTotal", "foto1", "facilitadorNombreFirma", "responsableNombre", "responsableCargo"];
  for (const k of obligatorias) if (C[k] === undefined) problemas.push(`Falta ubicar: ${k}`);
  if (C.peligros && C.peligros.length < PELIGROS.length) problemas.push(`La plantilla tiene ${C.peligros.length} casillas de peligros y la app maneja ${PELIGROS.length}`);
  if (C.epp && C.epp.length < EPP.length) problemas.push(`La plantilla tiene ${C.epp.length} casillas de EPP y la app maneja ${EPP.length}`);
  return { celdas: problemas.length ? null : C, problemas };
}

// Validaciones antes de generar. Devuelve una lista de textos (vacía = todo bien).
export function validarCharla(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.tema || !d.tema.trim()) faltan.push("el tema de la charla");
  if (!d.facilitadorNombre || !d.facilitadorNombre.trim()) faltan.push("el nombre del facilitador");
  if (!(d.asistentes || []).some((a) => a.nombre && a.nombre.trim())) faltan.push("al menos un asistente");
  return faltan;
}
