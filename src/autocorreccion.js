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
pequeno:pequeño pequena:pequeña contrasena:contraseña panete:pañete panetes:pañetes ensenanza:enseñanza
`.trim().split(/\s+/).reduce((m, p) => { const [a, b] = p.split(":"); m[a] = b; return m; }, {});

const TERMINACIONES = [["cion", "ción"], ["sion", "sión"], ["gion", "gión"]];   // singular: accion→acción (el plural «acciones» ya va sin tilde)
const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
export const RE_PALABRA = new RegExp(`[${LETRAS}]+`, "g");

function conMayusculas(orig, nueva) {
  if (orig.length > 1 && orig === orig.toUpperCase()) return nueva.toUpperCase();
  if (orig[0] !== orig[0].toLowerCase()) return nueva[0].toUpperCase() + nueva.slice(1);
  return nueva;
}
// Devuelve la palabra corregida o null si no hay nada seguro que corregir
export function corregirPalabra(palabra) {
  if (!palabra || palabra.length < 2) return null;
  const bajo = palabra.toLowerCase();
  if (DIC[bajo]) return conMayusculas(palabra, DIC[bajo]);
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
// Corrige todas las palabras de un texto. Devuelve { texto, cambios }
export function corregirTexto(texto) {
  let cambios = 0;
  const nuevo = String(texto == null ? "" : texto).replace(RE_PALABRA, (p, desde, todo) => {
    const c = esPalabraSuelta(todo, desde, desde + p.length) ? corregirPalabra(p) : null;
    if (c && c !== p) { cambios++; return c; }
    return p;
  });
  return { texto: nuevo, cambios };
}
// Palabra que acaba justo antes de la posición `pos` del cursor: { ini, fin, palabra } o null
export function palabraAntesDe(texto, pos) {
  let fin = pos;
  const m = new RegExp(`[${LETRAS}]+$`).exec(texto.slice(0, fin));
  if (!m) return null;
  return { ini: fin - m[0].length, fin, palabra: m[0] };
}
