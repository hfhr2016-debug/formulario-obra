// Autocorrección propia de la app (el navegador del PC solo subraya, no corrige solo).
// Corrige ÚNICAMENTE palabras sin duda posible: tildes que faltan y la «ñ» en palabras de uso diario y de obra.
// Nunca toca palabras ambiguas (esta/está, mas/más, si/sí, solo/sólo, quien/quién…), nombres propios ni códigos.
const DIC = `
area:área areas:áreas metodo:método metodos:métodos numero:número numeros:números codigo:código codigos:códigos telefono:teléfono telefonos:teléfonos
tecnico:técnico tecnica:técnica tecnicos:técnicos tecnicas:técnicas electrico:eléctrico electrica:eléctrica electricos:eléctricos electricas:eléctricas
hidraulico:hidráulico hidraulica:hidráulica mecanico:mecánico mecanica:mecánica metalico:metálico metalica:metálica plastico:plástico plastica:plástica
basico:básico basica:básica quimico:químico quimica:química electronico:electrónico electronica:electrónica magnetico:magnético
asi:así tambien:también ademas:además despues:después aqui:aquí alli:allí ahi:ahí facil:fácil dificil:difícil util:útil unico:único unica:única
ultimo:último ultima:última ultimos:últimos ultimas:últimas maximo:máximo maxima:máxima minimo:mínimo minima:mínima proximo:próximo proxima:próxima
dia:día dias:días sabado:sábado miercoles:miércoles linea:línea lineas:líneas pais:país paises:países interes:interés indice:índice indices:índices
analisis:análisis estandar:estándar pagina:página paginas:páginas poliza:póliza polizas:pólizas
ingenieria:ingeniería garantia:garantía garantias:garantías energia:energía tuberia:tubería tuberias:tuberías categoria:categoría categorias:categorías
alcaldia:alcaldía bateria:batería geologia:geología topografia:topografía fotografia:fotografía fotografias:fotografías fotografico:fotográfico fotografica:fotográfica
geografia:geografía galeria:galería mamposteria:mampostería carpinteria:carpintería herreria:herrería ferreteria:ferretería plomeria:plomería
albanileria:albañilería interventoria:interventoría policia:policía economia:economía metodologia:metodología tecnologia:tecnología
camion:camión botiquin:botiquín hormigon:hormigón valvula:válvula vehiculo:vehículo vehiculos:vehículos maquina:máquina maquinas:máquinas grua:grúa
lampara:lámpara kilometro:kilómetro kilometros:kilómetros centimetro:centímetro centimetros:centímetros milimetro:milímetro milimetros:milímetros
diametro:diámetro perimetro:perímetro cubico:cúbico cubica:cúbica cuadratico:cuadrático
diseno:diseño disenos:diseños senal:señal senales:señales senalizacion:señalización senalizar:señalizar tamano:tamaño tamanos:tamaños
boyaca:boyacá narino:nariño bogota:bogotá medellin:medellín cucuta:cúcuta choco:chocó quindio:quindío guainia:guainía vaupes:vaupés caqueta:caquetá ibague:ibagué popayan:popayán quibdo:quibdó orinoquia:orinoquía amazonia:amazonía monteria:montería atlantico:atlántico
pequeno:pequeño pequena:pequeña contrasena:contraseña panete:pañete panetes:pañetes ensenanza:enseñanza
`.trim().split(/\s+/).reduce((m, p) => { const [a, b] = p.split(":"); m[a] = b; return m; }, {});

import { VOCABULARIO } from "./vocabulario.js";

// ---------- Mayúsculas ----------
// Lugares de Colombia: se escriben siempre con mayúscula inicial (y su tilde). No incluye los que también son palabras comunes (meta, pasto, cesar, sucre).
const LUGARES = `Colombia Bogotá Medellín Cali Barranquilla Cartagena Cúcuta Bucaramanga Pereira Manizales Armenia Ibagué Neiva Popayán Villavicencio Montería Sincelejo Valledupar Riohacha Tunja Yopal Florencia Mocoa Leticia Quibdó Arauca Soacha Bello Itagüí Envigado Palmira Buenaventura Tumaco Girardot Zipaquirá Facatativá Fusagasugá Chía Cajicá Duitama Sogamoso Barrancabermeja Ocaña Pamplona Apartadó Turbo Maicao Aguachica Antioquia Atlántico Bolívar Boyacá Caldas Caquetá Casanare Cauca Chocó Córdoba Cundinamarca Guainía Guaviare Huila Magdalena Nariño Quindío Risaralda Santander Tolima Vaupés Vichada Putumayo Guajira Amazonas Orinoquía Amazonía`.split(" ");
const PROPIOS = new Map(LUGARES.map((l) => [sinTildeSimple(l.toLowerCase()), l]));
// Apellidos y nombres comunes con tilde o ñ: solo se aplican en campos de nombres de personas
const NOMBRES = `María José Jesús Andrés Germán Iván Martín Fabián Adrián Julián Rubén Ángel Ángela Mónica Verónica Lucía Sofía Ramón Simón Sebastián Cristián César Héctor Óscar Víctor Néstor Ómar Íngrid Inés Nubia Yenny Díaz Muñoz Núñez Peña Castaño Ordóñez Quiñones Zúñiga Bermúdez Suárez Velásquez Vásquez Álvarez Benítez Domínguez Gutiérrez González Fernández Jiménez Rodríguez Martínez López Pérez Hernández Sánchez Ramírez Gómez Gálvez Peñaloza Cárdenas Bernal Ibáñez Ñáñez Mejía Ospina Zapata Rojas Vélez Londoño Úsuga Pinzón Rincón Beltrán Galván Guzmán Maldonado Montoya Arévalo Mosquera Murillo Cuéllar`.split(" ");
const NOMBRES_MAP = new Map(NOMBRES.map((n) => [sinTildeSimple(n.toLowerCase()), n]));
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "van", "von", "da", "di", "el"]);
function sinTildeSimple(w) { return w.replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u"); }
const TERMINACIONES = [["cion", "ción"], ["sion", "sión"], ["gion", "gión"]];   // singular: accion→acción (el plural «acciones» ya va sin tilde)
const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
export const RE_PALABRA = new RegExp(`[${LETRAS}]+`, "g");

function conMayusculas(orig, nueva) {
  if (orig.length > 1 && orig === orig.toUpperCase()) return nueva.toUpperCase();
  if (orig[0] !== orig[0].toLowerCase()) return nueva[0].toUpperCase() + nueva.slice(1);
  return nueva;
}

// ---------- Errores de letras que suenan igual (Pasifico → Pacífico) ----------
// Se compara con el vocabulario de la app. Solo se corrige si la palabra NO existe y al cambiar UNA letra por otra que suena igual
// (s/c/z, b/v, ll/y, g/j, h, rr, n/m antes de b/p) aparece UNA sola palabra del vocabulario. Si hay duda, no se toca.
const sinTilde = (w) => w.replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
let INDICE = null;
function indice() {
  if (INDICE) return INDICE;
  INDICE = new Map();
  for (const f of VOCABULARIO.split(" ")) { const k = sinTilde(f); let g = INDICE.get(k); if (!g) INDICE.set(k, g = new Set()); g.add(f); }
  return INDICE;
}
function mejorForma(grupo) {                      // la forma con tilde si es única; si hay dos con tilde distintas, hay duda
  const conTilde = [...grupo].filter((f) => f !== sinTilde(f));
  if (conTilde.length === 1) return conTilde[0];
  if (conTilde.length > 1) return null;
  return grupo.size === 1 ? [...grupo][0] : null;
}
const REGLAS = [["c", "s"], ["c", "z"], ["s", "c"], ["s", "z"], ["z", "s"], ["z", "c"], ["b", "v"], ["v", "b"], ["g", "j"], ["j", "g"], ["y", "ll"], ["ll", "y"],
  ["rr", "r"], ["r", "rr"], ["ll", "l"], ["l", "ll"], ["ss", "s"], ["cc", "c"], ["c", "cc"], ["h", ""], ["s", "ss"], ["t", "tt"], ["n", "nn"], ["p", "pp"], ["m", "mm"], ["s", "cc"], ["z", "cc"], ["cion", "ccion"], ["sion", "ccion"]];
function variantes(w) {
  const r = new Set();
  for (const [a, b] of REGLAS) {
    let i = w.indexOf(a);
    while (i !== -1) {
      if (!(a === "h" && w[i - 1] === "c") && !(a === "r" && i === 0)) r.add(w.slice(0, i) + b + w.slice(i + a.length));
      i = w.indexOf(a, i + 1);
    }
  }
  if (/^[aeiou]/.test(w)) r.add("h" + w);                                   // ora → hora
  for (let i = 1; i < w.length - 1; i++) if (/[aeiou]/.test(w[i - 1]) && /[aeiou]/.test(w[i])) r.add(w.slice(0, i) + "h" + w.slice(i));   // ahora, prohibir
  for (let i = 0; i < w.length - 1; i++) if (w[i] === "n" && /[bp]/.test(w[i + 1])) r.add(w.slice(0, i) + "m" + w.slice(i + 1));        // conpactar → compactar
  return r;
}
function corregirFonetica(palabra) {
  if (palabra.length < 6 || palabra.length > 24) return null;
  if (palabra.length < 7 && palabra === palabra.toUpperCase()) return null;                    // siglas
  const bajo = palabra.toLowerCase();
  const ind = indice();
  const g0 = ind.get(sinTilde(bajo));
  if (g0 || DIC[bajo]) {                                                                        // la palabra ya existe: solo se le pone la tilde si falta y es única
    if (!g0 || g0.has(bajo) || bajo !== sinTilde(bajo)) return null;
    const f = mejorForma(g0);
    return f && f !== sinTilde(f) && !/[áéó]$/.test(f) ? conMayusculas(palabra, f) : null;     // no si la tilde va al final (verbos: revisó/reviso)
  }
  const hallados = new Set();
  for (const v of variantes(bajo)) { const g = ind.get(sinTilde(v)); if (g) { const f = mejorForma(g); if (f) hallados.add(f); else return null; } }
  if (hallados.size !== 1) return null;
  return conMayusculas(palabra, [...hallados][0]);
}
// Devuelve la palabra corregida o null si no hay nada seguro que corregir
export function corregirPalabra(palabra, opciones) {
  if (!palabra || palabra.length < 2) return null;
  const bajo = palabra.toLowerCase();
  const lugar = PROPIOS.get(sinTildeSimple(bajo));
  if (lugar && palabra.length >= 4) { const r = palabra === palabra.toUpperCase() ? lugar.toUpperCase() : lugar; return r === palabra ? null : r; }
  if (opciones && opciones.persona) {
    const nom = NOMBRES_MAP.get(sinTildeSimple(bajo));
    if (nom) { const r = palabra === palabra.toUpperCase() && palabra.length > 1 ? nom.toUpperCase() : nom; return r === palabra ? null : r; }
  }
  if (DIC[bajo]) return conMayusculas(palabra, DIC[bajo]);
  if (!opciones || opciones.fonetica !== false) {
    const f = corregirFonetica(palabra);
    if (f) { const t = corregirPalabra(f, { fonetica: false }); return t || f; }       // además le pone la tilde de «-ción» si falta
  }
  for (const [fin, bien] of TERMINACIONES) {
    if (bajo.length >= fin.length + 2 && bajo.endsWith(fin)) return conMayusculas(palabra, bajo.slice(0, -fin.length) + bien);
  }
  return null;
}
// ¿La palabra que empieza en `ini` es una palabra suelta (no parte de un código, correo, ruta o número)?
function esPalabraSuelta(texto, ini, fin) {
  const antes = ini > 0 ? texto[ini - 1] : "";
  const despues = fin < texto.length ? texto[fin] : "";
  return !/[0-9_@\/\\#.\-]/.test(antes) && !/[0-9_@\/\\]/.test(despues);
}
// Corrige la palabra texto.slice(ini, fin) teniendo en cuenta lo que hay antes (para las mayúsculas). Devuelve la palabra nueva o null.
//  opciones: { fonetica:false → no cambia letras; persona:true → cada palabra con mayúscula inicial; inicial:false → no pone mayúscula al empezar }
export function corregirPalabraEn(texto, ini, fin, opciones) {
  const palabra = texto.slice(ini, fin);
  if (!palabra) return null;
  let nueva = corregirPalabra(palabra, opciones) || palabra;
  const antes = texto.slice(0, ini);
  const inicio = /^\s*$/.test(antes) || /\n\s*$/.test(antes) || (/[.!?]\s+$/.test(antes) && !/(^|[^A-Za-zÁÉÍÓÚáéíóúñÑ])[A-Za-zÁÉÍÓÚáéíóúñÑ]{1,3}\.\s+$/.test(antes) && !/[0-9]\.\s+$/.test(antes));
  const quiereMayus = !opciones || opciones.inicial !== false;
  if (quiereMayus && nueva.length >= 2 && nueva[0] === nueva[0].toLowerCase() && nueva[0] !== nueva[0].toUpperCase()) {
    const esParticula = PARTICULAS.has(nueva.toLowerCase());
    if (inicio || (opciones && opciones.persona && !esParticula)) nueva = nueva[0].toUpperCase() + nueva.slice(1);
  }
  return nueva !== palabra ? nueva : null;
}
// Corrige todas las palabras de un texto. Devuelve { texto, cambios }
export function corregirTexto(texto, opciones) {
  let cambios = 0;
  const original = String(texto == null ? "" : texto);
  let nuevo = original;
  // De atrás hacia adelante, para que las posiciones anteriores no se muevan
  const hallazgos = [...original.matchAll(RE_PALABRA)].reverse();
  for (const m of hallazgos) {
    const ini = m.index, fin = ini + m[0].length;
    if (!esPalabraSuelta(original, ini, fin)) continue;
    const c = corregirPalabraEn(original, ini, fin, opciones);
    if (c && c !== m[0]) { nuevo = nuevo.slice(0, ini) + c + nuevo.slice(fin); cambios++; }
  }
  return { texto: nuevo, cambios };
}
// Palabra que acaba justo antes de la posición `pos` del cursor: { ini, fin, palabra } o null
export function palabraAntesDe(texto, pos) {
  let fin = pos;
  const m = new RegExp(`[${LETRAS}]+$`).exec(texto.slice(0, fin));
  if (!m) return null;
  return { ini: fin - m[0].length, fin, palabra: m[0] };
}
