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
// Una "descripción" (spec) dice, para cada campo: [clave, etiqueta, columnaDeLaEtiqueta, columnaDelValor, buscarDespuesDe?]
//   campos: [["proyecto", "Proyecto / Obra", "A", "C"], ["facilitadorCargo", "Cargo", "H", "J", "facilitadorNombre"], ...]
//   tabla:  { clave: "asistentes", cabecera: "No.", fin: "Total de asistentes", columnas: { nombre: "B", documento: "E" } }
//   firmas: { firma: "Firma:", nombre: "Nombre:", personas: [{ clave: "facilitador", col: "C" }, ...] }
// Devuelve { celdas, problemas }. Si hay problemas, "celdas" es null y se debe usar el mapa por defecto del formato.

export function poner(ws, ref, valor) {
  if (!ref || valor === undefined || valor === null || valor === "") return;
  ws.getCell(ref).value = valor;
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
  // Una celda es escribible si es libre o la ESQUINA de una combinación (nunca el resto de la combinación)
  const esEsquina = (ref) => {
    try { const c = ws.getCell(ref); return !c.master || c.master.address === c.address; } catch (e) { return true; }
  };
  const ancla = (ref) => {
    if (!esEsquina(ref)) problemas.push(`${ref} es parte de una celda combinada y no es su esquina`);
    return ref;
  };

  const filas = {};
  for (const [clave, etiqueta, colEtq, colVal, despues] of spec.campos || []) {
    const r = filaDe(etiqueta, colEtq, despues ? filas[despues] || 1 : 1, !!spec.empieza && spec.empieza.includes(clave));
    if (r) { filas[clave] = r; celdas[clave] = ancla(`${colVal}${r}`); }
  }

  if (spec.tabla) {
    const t = spec.tabla;
    const rc = filaDe(t.cabecera, t.colCabecera || "A");
    const rf = rc ? filaDe(t.fin, t.colFin || "A", rc + 1) : 0;
    if (rc && rf) {
      const n = rf - rc - 1;
      if (n < 1) problemas.push(`No hay filas entre "${t.cabecera}" y "${t.fin}"`);
      for (let i = 0; i < n; i++) for (const col of Object.values(t.columnas)) ancla(`${col}${rc + 1 + i}`);
      celdas.tablas = { [t.clave]: { fila0: rc + 1, n, columnas: { ...t.columnas } } };
    }
  }

  if (spec.firmas) {
    const f = spec.firmas;
    const rFirma = filaDe(f.firma, "A", f.desde || 1);
    const rNombre = rFirma ? filaDe(f.nombre, "A", rFirma) : 0;
    if (rNombre) {
      celdas.firmas = {};
      for (const p of f.personas) celdas.firmas[p.clave] = { nombre: ancla(`${p.col}${rNombre}`), cargo: ancla(`${p.col}${rNombre + 1}`) };
    }
  }
  return { celdas: problemas.length ? null : celdas, problemas };
}

// Escribe las filas de una tabla (p. ej. los asistentes) desde su primera fila; ignora lo que no quepa.
export function escribirTabla(ws, tabla, filas) {
  if (!tabla) return;
  (filas || []).slice(0, tabla.n).forEach((fila, i) => {
    for (const [campo, col] of Object.entries(tabla.columnas)) poner(ws, `${col}${tabla.fila0 + i}`, fila[campo]);
  });
}
