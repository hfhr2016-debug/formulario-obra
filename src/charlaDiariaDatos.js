// Lógica pura de la Charla Diaria de Seguridad (sin React) — así se puede probar sin navegador.
// PELIGROS, EPP y CELDAS salen del mismo script que construye la plantilla de Excel
// (public/plantilla-charla-diaria.xlsx), para que nunca se desincronicen.

export const CODIGO_FORMATO = "RYR-SS-002";
export const PELIGROS = ["Caída a distinto nivel (alturas)", "Caída al mismo nivel / resbalones", "Caída de objetos o herramientas", "Golpes, cortes y atrapamientos", "Sobreesfuerzo / carga manual", "Riesgo eléctrico", "Proyección de partículas", "Ruido", "Polvo / material particulado", "Tránsito de vehículos y maquinaria", "Excavaciones / taludes", "Izaje de cargas", "Trabajo en caliente / incendio", "Espacios confinados / gases", "Sustancias químicas / derrames", "Exposición solar / calor", "Lluvia / tormenta eléctrica", "Animales (serpientes, insectos)", "Seguridad pública / terceros", "Orden y aseo deficiente"];
export const EPP = ["Casco de seguridad", "Gafas de seguridad", "Guantes", "Botas de seguridad", "Arnés y línea de vida", "Protección auditiva", "Respirador / mascarilla", "Chaleco reflectivo", "Careta / protector facial", "Overol / ropa de trabajo", "Impermeable (lluvia)", "Protector solar / hidratación"];
export const CELDAS = {"proyecto": "C7", "contratista": "C8", "ubicacion": "J8", "fecha": "C9", "horaInicio": "E9", "horaFin": "G9", "duracion": "I9", "nCharla": "K9", "frente": "C10", "tipo": "J10", "facilitadorNombre": "C11", "facilitadorCargo": "J11", "tema": "C13", "contenido": "C14", "actividades": "C19", "peligros": ["A22", "D22", "G22", "J22", "A23", "D23", "G23", "J23", "A24", "D24", "G24", "J24", "A25", "D25", "G25", "J25", "A26", "D26", "G26", "J26"], "otrosPeligros": "C27", "medidas": "C28", "epp": ["A32", "D32", "G32", "J32", "A33", "D33", "G33", "J33", "A34", "D34", "G34", "J34"], "otrosEpp": "C35", "clima": "C37", "ordenAseo": "G37", "sintomas": "K37", "novedades": "C38", "asistentesFila0": 43, "asistentesN": 30, "personalTotal": "H73", "captionFoto1": "A85", "foto1": {"tl": {"col": 0, "row": 74}, "br": {"col": 3, "row": 84}}, "captionFoto2": "D85", "foto2": {"tl": {"col": 3, "row": 74}, "br": {"col": 6, "row": 84}}, "captionFoto3": "G85", "foto3": {"tl": {"col": 6, "row": 74}, "br": {"col": 9, "row": 84}}, "captionFoto4": "J85", "foto4": {"tl": {"col": 9, "row": 74}, "br": {"col": 12, "row": 84}}, "facilitadorNombreFirma": "C89", "responsableNombre": "I89", "facilitadorCargoFirma": "C90", "responsableCargo": "I90"};
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

// Marca ☒ / ☐ en cada opción de una lista según las opciones elegidas.
function marcarGrid(ws, opciones, celdas, elegidas) {
  opciones.forEach((op, i) => {
    if (!celdas[i]) return;
    ws.getCell(celdas[i]).value = (elegidas.includes(op) ? "☒ " : "☐ ") + op;
  });
}

function poner(ws, ref, valor) {
  if (valor === undefined || valor === null || valor === "") return;
  ws.getCell(ref).value = valor;
}

// Escribe TODOS los datos de la charla en la hoja de la plantilla.
// Solo escribe en celdas "ancla" (la esquina de cada celda combinada) — escribir en otra celda de
// una combinación falla en ExcelJS.
export function escribirCharlaEnHoja(ws, d) {
  const C = CELDAS;
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

// Validaciones antes de generar. Devuelve una lista de textos (vacía = todo bien).
export function validarCharla(d) {
  const faltan = [];
  if (!d.fecha) faltan.push("la fecha");
  if (!d.tema || !d.tema.trim()) faltan.push("el tema de la charla");
  if (!d.facilitadorNombre || !d.facilitadorNombre.trim()) faltan.push("el nombre del facilitador");
  if (!(d.asistentes || []).some((a) => a.nombre && a.nombre.trim())) faltan.push("al menos un asistente");
  return faltan;
}
