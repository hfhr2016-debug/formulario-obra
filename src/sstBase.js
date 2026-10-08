// sstBase.js — lógica común de los formatos de Gestión SST (sin React, para poder probarla sin navegador).
// Contiene: fechas y horas, texto de celdas de Excel, búsqueda sin tildes, ciudades, cargos de obra, memoria de nombres
// y el motor que LEE UNA PLANTILLA POR ETIQUETAS (así, si el formato cambia —filas insertadas, columnas movidas—,
// la app sigue escribiendo cada dato en su lugar).

const MAX_PROFESIONALES = 40;   // cuántos nombres de profesionales se recuerdan

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

// ---------- Ciudades (el mismo catálogo del buscador de Ubicación de Gestión Técnica) ----------
export const CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Arauquita", "departamento": "Arauca"}, {"ciudad": "Fortul", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Puerto Boyacá", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Cartagena del Chairá", "departamento": "Caquetá"}, {"ciudad": "El Doncello", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Paz de Ariporo", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "El Tambo", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Agustín Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Bosconia", "departamento": "Cesar"}, {"ciudad": "Curumaní", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Riosucio", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Tierralta", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Fusagasugá", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Calamar", "departamento": "Guaviare"}, {"ciudad": "El Retorno", "departamento": "Guaviare"}, {"ciudad": "Miraflores", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Campoalegre", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Manaure", "departamento": "La Guajira"}, {"ciudad": "San Juan del Cesar", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Zona Bananera", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Puerto Gaitán", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Samaniego", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Los Patios", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Valle del Guamuez", "departamento": "Putumayo"}, {"ciudad": "Puerto Guzmán", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Quimbaya", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "La Virginia", "departamento": "Risaralda"}, {"ciudad": "Belén de Umbría", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "San Onofre", "departamento": "Sucre"}, {"ciudad": "Sampués", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Chaparral", "departamento": "Tolima"}, {"ciudad": "Líbano", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Jamundí", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Carurú", "departamento": "Vaupés"}, {"ciudad": "Taraira", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}, {"ciudad": "Cumaribo", "departamento": "Vichada"}, {"ciudad": "La Primavera", "departamento": "Vichada"}, {"ciudad": "Santa Rosalía", "departamento": "Vichada"}];

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
  // Las opciones con "buscaDetalle" (las ciudades) también se encuentran escribiendo su departamento: "cundinamarca" muestra sus ciudades
  const enDetalle = (o) => !!(o.buscaDetalle && o.detalle && quitarTildes(o.detalle).toLowerCase().includes(q));
  return opciones
    .filter((o) => clave(o).includes(q) || enDetalle(o))
    .sort((a, b) => (clave(a).startsWith(q) ? 0 : 1) - (clave(b).startsWith(q) ? 0 : 1) || (clave(a).includes(q) ? 0 : 1) - (clave(b).includes(q) ? 0 : 1) || clave(a).length - clave(b).length)
    .slice(0, max);
}

// ---------- Profesionales que usan el formato (cargos y memoria de nombres) ----------
export const CARGOS_PROFESIONALES = [
  "Ingeniero Residente", "Arquitecto Residente", "Director de Obra", "Coordinador SST", "Profesional SST",
  "Tecnólogo SST", "Inspector SST", "Coordinador HSEQ", "Maestro de Obra", "Supervisor de Obra",
  "Interventor de Obra", "Gerente de Proyecto", "Almacenista de Obra", "Auxiliar de SST",
  // Gestión ambiental y firmas de informes
  "Coordinador Ambiental", "Profesional Ambiental", "Responsable Ambiental", "Ingeniero Ambiental", "Tecnólogo Ambiental", "Inspector Ambiental", "Auxiliar Ambiental", "Residente Ambiental",
  "Residente de Obra", "Representante Legal", "Gerente General"];

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


// =====================================================================================================================
// Motor de lectura de plantillas por etiquetas
// =====================================================================================================================
// Una "descripción" (spec) dice, para cada campo: [clave, etiqueta, columnaDeLaEtiqueta, columnaDelValor, buscarDespuesDe?, filasDebajo?]
//   campos: [["proyecto", "Proyecto / Obra", "A", "C"], ["facilitadorCargo", "Cargo", "H", "J", "facilitadorNombre"],
//            ["metaCobertura", "Meta de cobertura", "N", "N", null, 1]]    // el valor está 1 fila debajo de su etiqueta
//   tablas: [{ clave: "asistentes", cabecera: "No.", fin: "Total de asistentes", columnas: { nombre: "B", documento: "E" } },
//            { clave: "temas", cabecera: "No.", despuesDe: "asistentes", fin: "5. EVALUACIÓN", columnas: {...} }]
//            (también se acepta "tabla" con una sola)
//   firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "facilitador", col: "C" }, ...] }
// Devuelve { celdas, problemas }. Si hay problemas, "celdas" es null y se debe usar el mapa por defecto del formato.

export function poner(ws, ref, valor) {
  if (!ref || valor === undefined || valor === null || valor === "") return;
  const c = ws.getCell(ref);
  c.value = valor;
  // Un texto de varias líneas (p. ej. "Nombre" y debajo "Cargo") necesita que la celda ajuste el texto para verse completo
  if (typeof valor === "string" && valor.includes("\n")) c.alignment = { ...(c.alignment || {}), wrapText: true, vertical: "middle" };
}
// "Luis Mora" + "Maestro de Obra" -> "Luis Mora\nMaestro de Obra" (el cargo va debajo del nombre; si falta alguno, solo el otro)
export function textoResponsable(nombre, cargo) {
  return [nombre, cargo].map((x) => String(x || "").trim()).filter(Boolean).join("\n");
}

export function descubrirPorEtiquetas(ws, spec) {
  const problemas = [];
  const celdas = {};
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
  // Si el usuario inserta columnas, las letras cambian: por eso se buscan las etiquetas en cualquier columna y el valor se ubica
  // "justo a la derecha de la etiqueta" (después de su celda combinada), en vez de usar una letra fija.
  const MAX_COL = 26;
  const refDe = (r, c) => `${colLetra(c)}${r}`;
  let rangosMerge = [];
  try { rangosMerge = ((ws.model && ws.model.merges) || []).map(parseRango).filter(Boolean); } catch (e) { rangosMerge = []; }
  const finDeCombinada = (r, c) => { const g = rangosMerge.find((x) => r >= x.top && r <= x.bottom && c >= x.left && c <= x.right); return g ? g.right : c; };
  // Una celda es escribible si es libre o la ESQUINA de una combinación (nunca el resto de la combinación)
  const esEsquina = (ref) => {
    try { const c = ws.getCell(ref); return !c.master || c.master.address === c.address; } catch (e) { return true; }
  };
  const ancla = (ref) => {
    if (!esEsquina(ref)) problemas.push(`${ref} es parte de una celda combinada y no es su esquina`);
    return ref;
  };
  const buscar = (etiqueta, letra, desde, empieza) => {
    const coincide = (t) => (empieza ? t.startsWith(etiqueta) : t === etiqueta);
    const c0 = colNum(letra);
    for (let r = desde; r <= maxFila; r++) if (coincide(texto(r, c0)) && esEsquina(refDe(r, c0))) return { r, c: c0 };
    for (let r = desde; r <= maxFila; r++) for (let c = 1; c <= MAX_COL; c++) if (c !== c0 && coincide(texto(r, c)) && esEsquina(refDe(r, c))) return { r, c };
    return null;
  };

  const filas = {};
  for (const [clave, etiqueta, colEtq, colVal, despues, filasDebajo] of spec.campos || []) {
    const hit = buscar(etiqueta, colEtq, despues ? filas[despues] || 1 : 1, !!spec.empieza && spec.empieza.includes(clave));
    if (!hit) { problemas.push(`No encontré "${etiqueta}" (columna ${colEtq})`); continue; }
    const valorDebajo = colNum(colVal) === colNum(colEtq);                    // el valor está en la misma columna, filas más abajo
    const cv = valorDebajo ? hit.c : finDeCombinada(hit.r, hit.c) + 1;       // si no, justo a la derecha de la etiqueta
    filas[clave] = hit.r; celdas[clave] = ancla(refDe(hit.r + (filasDebajo || 0), cv));
  }

  const tablas = spec.tablas || (spec.tabla ? [spec.tabla] : []);
  const finDe = {};   // fila donde termina cada tabla (para buscar la siguiente después de ella)
  for (const t of tablas) {
    const rc = filaDe(t.cabecera, t.colCabecera || "A", t.despuesDe && finDe[t.despuesDe] ? finDe[t.despuesDe] : 1);
    const rf = rc ? filaDe(t.fin, t.colFin || "A", rc + 1, !!t.finEmpieza) : 0;
    // Columnas: por el título de su encabezado (si el usuario inserta una columna, se siguen encontrando); si no, por la letra indicada
    const columnas = { ...t.columnas };
    if (rc && t.encabezados) {
      for (const [clave, enc] of Object.entries(t.encabezados)) {
        const norm = (x) => quitarTildes(String(x || "")).toLowerCase().replace(/\s+/g, " ").trim();   // sin importar mayúsculas, tildes ni espacios sobrantes
        const posibles = (Array.isArray(enc) ? enc : [enc]).map(norm);                                 // una o varias redacciones posibles del título
        for (let c = 1; c <= MAX_COL; c++) if (posibles.includes(norm(texto(rc, c))) && esEsquina(refDe(rc, c))) { columnas[clave] = colLetra(c); break; }
      }
    }
    if (rc && rf && t.numerada) {
      // Tabla "numerada": solo cuentan las filas cuyo número (columna A) es un entero; los subtítulos intercalados se saltan
      const filasItem = [];
      for (let r = rc + 1; r < rf; r++) if (/^\d+$/.test(texto(r, colNum(t.colNumero || "A")))) filasItem.push(r);
      if (!filasItem.length) problemas.push(`No hay filas numeradas entre "${t.cabecera}" y "${t.fin}"`);
      for (const r of filasItem) for (const col of Object.values(columnas)) ancla(`${col}${r}`);
      celdas.tablas = { ...(celdas.tablas || {}), [t.clave]: { fila0: filasItem[0] || rc + 1, n: filasItem.length, filas: filasItem, columnas } };
      finDe[t.clave] = rf;
    } else if (rc && rf) {
      const n = rf - rc - 1;
      if (n < 1) problemas.push(`No hay filas entre "${t.cabecera}" y "${t.fin}"`);
      for (let i = 0; i < n; i++) for (const col of Object.values(columnas)) ancla(`${col}${rc + 1 + i}`);
      celdas.tablas = { ...(celdas.tablas || {}), [t.clave]: { fila0: rc + 1, n, columnas } };
      finDe[t.clave] = rf;
    }
  }

  // Opciones para marcar (☐ -> ☑): las celdas que empiezan por ☐ entre dos títulos
  for (const o of spec.opciones || []) {
    const r0 = filaDe(o.desde, "A", 1, true);
    const r1 = r0 ? filaDe(o.hasta, "A", r0 + 1, true) : 0;
    if (r0 && r1) {
      const lista = [];
      for (let r = r0 + 1; r < r1; r++) {
        for (let c = 1; c <= (o.hastaCol || MAX_COL); c++) {
          const t = texto(r, c);
          const ref = `${colLetra(c)}${r}`;
          if (/^[☐☑✔☒]/.test(t) && esEsquina(ref)) lista.push({ ref, texto: t.replace(/^[☐☑✔☒]\s*/, "") });
        }
      }
      if (!lista.length) problemas.push(`No encontré casillas ☐ entre "${o.desde}" y "${o.hasta}"`);
      celdas.opciones = { ...(celdas.opciones || {}), [o.clave]: lista };
    }
  }

  // Recuadros para fotos: celdas combinadas altas entre dos títulos (la foto se ancla a su recuadro)
  for (const fo of spec.fotos || []) {
    const r0 = filaDe(fo.desde, "A", 1, true);
    const r1 = r0 ? filaDe(fo.hasta, "A", r0 + 1, true) : 0;
    if (r0 && r1) {
      let rangos = [];
      try { rangos = ((ws.model && ws.model.merges) || []).map(parseRango).filter(Boolean); } catch (e) { rangos = []; }
      const altoPx0 = (f) => ((Number(ws.getRow(f).height) || 15) * 96) / 72;
      const altoDe = (g) => { let h = 0; for (let f = g.top; f <= g.bottom; f++) h += altoPx0(f); return h; };
      // minAltoPx: recuadros de UNA sola fila pero altos (p. ej. el registro fotográfico); por defecto, combinadas de 4 filas o más
      const cajas = rangos.filter((g) => g.top > r0 && g.bottom < r1 && (fo.minAltoPx ? altoDe(g) >= fo.minAltoPx : g.bottom - g.top >= (fo.minAlto || 3)) && g.right - g.left >= 1).sort((a, b) => a.top - b.top || a.left - b.left);
      if (!cajas.length) problemas.push(`No encontré los recuadros de foto entre "${fo.desde}" y "${fo.hasta}"`);
      const anchoPx = (c) => (Number(ws.getColumn(c).width) || 8.43) * 7;
      const altoPx = (f) => ((Number(ws.getRow(f).height) || 15) * 96) / 72;
      celdas.fotos = { ...(celdas.fotos || {}), [fo.clave]: cajas.map((g) => {
        let w = 0; let h = 0;
        for (let c = g.left; c <= g.right; c++) w += anchoPx(c);
        for (let f = g.top; f <= g.bottom; f++) h += altoPx(f);
        return { tl: { col: g.left - 1, row: g.top - 1 }, br: { col: g.right, row: g.bottom }, aspecto: Math.round((w / h) * 1000) / 1000 };
      }) };
    }
  }

  const bandas = spec.firmas ? (Array.isArray(spec.firmas) ? spec.firmas : [spec.firmas]) : [];
  for (const f of bandas) {
    const desde = f.desdeEtiqueta ? filaDe(f.desdeEtiqueta, "A", 1, true) : (f.desde || 1);
    // Los rótulos "Firma:" y "Nombre:" se buscan primero en la columna A y, si no están ahí (p. ej. la plantilla de Indicadores los tiene en la B), en cualquier columna
    const rotulo = (txt, desdeFila) => { const h = buscar(txt, "A", desdeFila, false); if (!h) problemas.push(`No encontré "${txt}" (columna A)`); return h ? h.r : 0; };
    const rFirma = desde ? rotulo(f.firma, desde) : 0;
    const rNombre = rFirma ? rotulo(f.nombre, rFirma) : 0;
    if (rNombre) {
      celdas.firmas = celdas.firmas || {};
      const cols = [];
      for (let c = 1; c <= MAX_COL; c++) if (texto(rFirma, c) === f.firma && esEsquina(refDe(rFirma, c))) cols.push(colLetra(finDeCombinada(rFirma, c) + 1));
      const porRotulo = cols.length === f.personas.length;           // tantas "Firma:" como firmantes: se usan sus posiciones reales
      f.personas.forEach((p, k) => {
        const col = porRotulo ? cols[k] : p.col;
        celdas.firmas[p.clave] = { nombre: ancla(`${col}${rNombre}`), cargo: ancla(`${col}${rNombre + 1}`) };
        if (f.hora) celdas.firmas[p.clave].hora = ancla(`${col}${rNombre + 2}`);
      });
    }
  }
  return { celdas: problemas.length ? null : celdas, problemas, parcial: celdas };
}

// Escribe las filas de una tabla (p. ej. los asistentes) desde su primera fila; ignora lo que no quepa.
export function escribirTabla(ws, tabla, filas) {
  if (!tabla) return;
  (filas || []).slice(0, tabla.n).forEach((fila, i) => {
    const r = tabla.filas ? tabla.filas[i] : tabla.fila0 + i;
    for (const [campo, col] of Object.entries(tabla.columnas)) poner(ws, `${col}${r}`, fila[campo]);
  });
}

// ---------- Casillas para marcar ("☐ Trabajo en alturas" -> "☑ Trabajo en alturas": el chulo va DENTRO del cuadro, el cuadro no se quita) ----------
export const GLIFO_SI = "☑";
export const GLIFO_NO = "☐";
const claveOpcion = (t) => quitarTildes(String(t || "")).toLowerCase().replace(/[_\s]+/g, " ").trim();
// "Otro: ____________" -> "Otro:"  (la parte fija; lo escrito por la persona va después)
export const baseOpcion = (t) => String(t || "").replace(/[_\s]+$/, "").trim();
export const esOpcionOtro = (t) => /:$/.test(baseOpcion(t));
// Marca las opciones elegidas. "marcadas" son textos (sin ☐). "otros" = { "Otro:": "texto escrito" }.
// Devuelve los textos que NO se encontraron en la plantilla (para avisar y no perder datos sin decirlo).
export function marcarOpciones(ws, opciones, marcadas, otros = {}) {
  const noEncontradas = [];
  const porClave = new Map((opciones || []).map((o) => [claveOpcion(baseOpcion(o.texto)), o]));
  for (const m of marcadas || []) {
    const o = porClave.get(claveOpcion(baseOpcion(m)));
    if (!o) { noEncontradas.push(m); continue; }
    const base = baseOpcion(o.texto);
    const extra = esOpcionOtro(o.texto) ? (otros[base] || otros[baseOpcion(m)] || "").trim() : "";
    ws.getCell(o.ref).value = extra ? `${GLIFO_SI} ${base} ${extra}` : `${GLIFO_SI} ${esOpcionOtro(o.texto) ? o.texto : base}`;
  }
  return noEncontradas;
}


// ---------- Trabajadores (nombre, documento, cargo, empresa) ----------
// Mezcla dos listas de personas sin repetir (sin importar mayúsculas ni tildes): los nuevos van primero y, si una persona ya
// existía, se completan los datos que le faltaban (documento, cargo, empresa).
// "Bien escrito": palabras con la primera letra en mayúscula y el resto en minúscula ("Pedro Soto" > "PEDRO SOTO" > "pedro soto").
const puntajeEscritura = (t) => String(t).split(" ").filter((w) => /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+$/.test(w)).length;
export function mezclarTrabajadores(actuales, nuevos, max = 300) {
  const vistos = new Map();
  const salida = [];
  for (const p of [...(nuevos || []), ...(actuales || [])]) {
    const nombre = normalizarNombre((p && p.nombre) || "");
    if (nombre.length < 3) continue;
    const k = quitarTildes(nombre).toLowerCase();
    if (vistos.has(k)) {
      const e = vistos.get(k);
      for (const c of ["documento", "cargo", "empresa"]) if (!e[c] && p[c]) e[c] = p[c];
      if (puntajeEscritura(nombre) > puntajeEscritura(e.nombre)) e.nombre = nombre;   // se queda con la mejor escritura
      continue;
    }
    const reg = { nombre, documento: p.documento || "", cargo: p.cargo || "", empresa: p.empresa || "" };
    vistos.set(k, reg);
    salida.push(reg);
  }
  return salida.slice(0, max);
}
export function buscarTrabajador(lista, nombre) {
  const k = quitarTildes(normalizarNombre(nombre || "")).toLowerCase();
  return k ? (lista || []).find((t) => quitarTildes(t.nombre).toLowerCase() === k) || null : null;
}


// Suma meses a una fecha ISO (AAAA-MM-DD) sin pasarse de fin de mes (31 ene + 1 mes = 28 feb).
export function sumarMesesISO(iso, meses) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return "";
  const y = Number(m[1]), mes = Number(m[2]) - 1, d = Number(m[3]);
  const ultimoDia = new Date(y, mes + meses + 1, 0).getDate();
  const r = new Date(y, mes + meses, Math.min(d, ultimoDia));
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, "0")}-${String(r.getDate()).padStart(2, "0")}`;
}

// Pinta una celda (relleno y letra) con colores ARGB ("FFC00000"). Sirve para la fila del tipo de permiso, que cambia de color según el tipo.
export function pintarCelda(ws, ref, rellenoARGB, fuenteARGB) {
  const c = ws.getCell(ref);
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rellenoARGB } };
  c.font = { ...(c.font || {}), bold: true, color: { argb: fuenteARGB } };
}

// ¿Se puede usar la distribución de respaldo? Solo si lo que SÍ se encontró en la plantilla está exactamente donde el respaldo dice
// (o sea, el formato no se movió y solo falta una etiqueta renombrada). Si algo está corrido —por ejemplo, una plantilla nueva con una
// versión vieja de la app— se DETIENE: es mejor no generar el Excel que escribir los datos en filas equivocadas.
export function decidirDistribucion(lectura, porDefecto) {
  if (lectura.celdas) return { celdas: lectura.celdas, aviso: "" };
  const hallados = Object.entries(lectura.parcial || {}).filter(([, v]) => typeof v === "string");
  const corridos = hallados.filter(([k, v]) => porDefecto[k] !== undefined && porDefecto[k] !== v).map(([k]) => k);
  if (!hallados.length || corridos.length) {
    throw new Error("La plantilla de Excel de la app no coincide con esta versión del formulario (" + ((lectura.problemas || [])[0] || "no pude leerla") +
      "). No se generó el Excel para no escribir los datos en filas equivocadas. Sube juntos el código y la plantilla de la misma entrega, o avísame.");
  }
  return { celdas: porDefecto, aviso: "No pude leer la distribución de la plantilla y usé la de por defecto (" + lectura.problemas[0] + "). Si ves datos fuera de lugar, avísame." };
}

// Sube la altura de una fila (si ya es más alta, la deja): para que un texto de varias líneas se vea completo.
export function alturaMinimaFila(ws, fila, puntos) {
  try { const f = ws.getRow(fila); if (!f.height || f.height < puntos) f.height = puntos; } catch (e) { /* sin altura: no es grave */ }
}

// La librería de Excel pierde los saltos de página manuales de la plantilla al abrirla. Se vuelven a poner (debajo de la fila indicada)
// para que las secciones no se partan a mitad de hoja (p. ej. una barra de título sola al pie de la hoja 1).
export function saltoDePagina(ws, fila) {
  try {
    if (!fila || fila < 1) return;
    const ya = (ws.rowBreaks || []).some((s) => s && s.id === fila);
    if (!ya) ws.getRow(fila).addPageBreak();
  } catch (e) { /* si la librería no lo permite, el Excel sale igual: solo cambia dónde corta la hoja */ }
}
