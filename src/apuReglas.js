// Reglas del APU (sin pantallas, para poder probarlas): qué actividades se muestran, cómo se asocia un material con la tabla de
// consumos de la actividad, rendimientos de referencia y la alerta cuando lo elegido NO corresponde a la actividad.

const sinTilde = (s) => String(s || "").toLowerCase()
  .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");

// ---------- 1. Concretos: en el APU se muestran por RESISTENCIA, no por elemento ----------
// «Concreto para columnas / vigas / zapatas / losas…» son lo mismo que el concreto de una resistencia (f'c); el APU es del concreto.
const CONCRETO_POR_ELEMENTO = /^\s*concreto\s+para\b/i;
// Igual con el acero: «Acero de refuerzo de columnas / vigas / losas / en cimentación» se reemplazan por el acero por resistencia (fy).
const ACERO_POR_ELEMENTO = /^\s*acero\s+de\s+refuerzo\s+(de|en)\b/i;
export function esActividadPorElemento(nombre) {
  const n = String(nombre || "");
  if (ACERO_POR_ELEMENTO.test(n)) return !/\bfy\b|\bpsi\b|\bmpa\b|grado/i.test(n);
  if (!CONCRETO_POR_ELEMENTO.test(n)) return false;
  return !/f['’]?c\s*=|\bpsi\b|\bmpa\b|cicl[oó]peo|resistencia/i.test(n);
}

// ---------- 2. Asociar el material elegido con la tabla de consumos de la actividad ----------
const SINONIMOS = { gravilla: "grava", triturado: "grava", agregado: "grava" };
const PARASITAS = new Set(["para", "tipo", "segun", "material", "aprox", "con", "sin", "del", "las", "los", "pega", "formato", "elegido"]);
function tokens(s) {
  return sinTilde(s).split(/[^a-z0-9ñ]+/).filter((t) => t.length >= 4 && !PARASITAS.has(t)).map((t) => SINONIMOS[t] || t);
}
// Variantes que NO se pueden mezclar (un acelerante no es un plastificante; un cemento asfáltico no es cemento gris)
const VARIANTES = [
  ["acelerante", "plastificante", "superplastificante", "curador", "impermeabilizante", "retardante", "fluidificante", "incorporador"],
  ["gris", "blanco", "asfaltico", "hidraulico", "portland"],
  ["asfaltico", "gris", "blanco"],
];
function dimension(u) {
  const t = sinTilde(u).replace(/³/g, "3").replace(/²/g, "2").replace(/[^a-z0-9]/g, "");
  if (/^(m3|mt3|metrocubico|metroscubicos)$/.test(t)) return "m3";
  if (/^(m2|mt2)$/.test(t)) return "m2";
  if (/^(kg|kilo|kilos|kgs)$/.test(t)) return "kg";
  if (/^(lt|lts|l|litro|litros)$/.test(t)) return "lt";
  if (/^(gl|gal|galon|galones)$/.test(t)) return "gl";
  if (/^(ml|m|metro|metros|mt)$/.test(t)) return "ml";
  if (/^(und|u|un|unidad|unid|unidades)$/.test(t)) return "und";
  return "";
}
export function coincideMaterial(refMaterial, refUnidad, seleccion, seleccionUnidad) {
  const a = tokens(refMaterial), b = tokens(seleccion);
  const comunes = a.filter((t) => b.includes(t));
  if (!comunes.length) return 0;
  const da = dimension(refUnidad), db = dimension(seleccionUnidad);
  if (da && db && da !== db) return 0;                                   // kg contra litros, m³ contra kg, etc.: no es el mismo material
  for (const g of VARIANTES) {
    const ea = a.filter((t) => g.includes(t)), eb = b.filter((t) => g.includes(t));
    if (ea.length && eb.length && !ea.some((t) => eb.includes(t))) return 0;
  }
  return comunes.length;
}
// El mejor material de la tabla de la actividad para lo que eligió la persona (o null)
export function buscarMaterialEnLista(materiales, nombre, unidad) {
  let mejor = null, puntos = 0;
  for (const m of materiales || []) {
    const p = coincideMaterial(m.material, m.unidad, nombre, unidad);
    if (p > puntos) { puntos = p; mejor = m; }
  }
  return mejor;
}

// ---------- 3. Búsqueda del catálogo: grava, gravilla y triturado son «lo mismo» al buscar ----------
const GRUPOS_BUSQUEDA = [["grava", "gravilla", "triturado"]];
export function coincideBusqueda(descripcion, q) {
  const d = sinTilde(descripcion), s = sinTilde(q).trim();
  if (!s) return false;
  if (d.includes(s)) return true;
  for (const g of GRUPOS_BUSQUEDA) if (g.some((x) => s.includes(x)) && g.some((x) => d.includes(x))) return true;
  return false;
}

// ---------- 4. Rendimientos de referencia por familia de actividad y unidad (por cuadrilla y jornada) ----------
// Promedios del sector para completar lo que la tabla principal no cubre. Siempre se dicen «ajústalos».
const EXTRA = [
  [/rack|c[aá]mara|cctv|control de acceso|citofon|detecci[oó]n|aire acondicionado|rejilla|difusor|sumidero|ascensor|bomba/, { und: 4 }],
  [/red .*gas|gas natural|gas domiciliario/, { ml: 20 }],
  [/tierra vegetal|capa vegetal|c[eé]sped|grama|empradiz|engram|hidrosiembra|revegetal|siembra/, { m3: 60, m2: 400, und: 60 }],
  [/met[aá]lic|escalera|baranda|barandal/, { kg: 120, ml: 10, und: 3 }],
  [/terrapl[eé]n|subrasante|suelo.?cemento|base (tratada|estabilizada)|estabilizad|talud|conformaci[oó]n/, { m3: 150, m2: 600 }],
  [/mezcla (densa|abierta|gruesa|discontinua|asf|en (fr[ií]o|caliente))|bacheo|carpeta/, { m3: 150, m2: 500, ton: 350 }],
  [/tratamiento superficial|lechada|sello|riego/, { m2: 1500 }],
  [/desmonte|limpieza|descapote|tala|rocer[ií]a/, { ha: 0.4, m2: 400 }],
  [/transplante|trasplante|poda|[aá]rbol|especies (vegetales|arb)|remoci[oó]n de especies/, { und: 6 }],
  [/prueba de carga|ensayo de carga/, { und: 1 }],
  [/delineador|hito|apoyo elast|secci[oó]n final|se[nñ]al|poste/, { und: 8, ml: 40 }],
  [/trincho|barrera|gavi[oó]n|bolsacreto/, { ml: 15, m3: 4 }],
  [/baldosa|granito|adoqu[ií]n|loseta/, { m2: 10 }],
  [/canal|bajante|cuneta|cerca\b|cercado/, { ml: 25 }],
  [/replanteo|localizaci[oó]n|trazado/, { ml: 120, m2: 150, und: 20, m3: 100 }],
  [/cargue|cargada|carga de material/, { m3: 80 }],
  [/perfil|cercha|placas?,? pernos|conexiones met[aá]licas|estructura met[aá]lica|acero estructural/, { kg: 150 }],
  [/aislamiento|aislante/, { m2: 40 }],
  [/junta|sello|silicona/, { ml: 60 }],
  [/mueble|pasamanos|mes[oó]n|closet|gabinete/, { ml: 6, und: 2 }],
  [/v[aá]lvula|accesorios/, { und: 6 }],
  [/ducto|ventilaci[oó]n/, { m2: 8, ml: 12 }],
  [/demolici[oó]n|desmantel|remoci[oó]n|retiro de/, { m2: 25, m3: 6, ml: 30, und: 8, gl: 1 }],
  [/descapote|desmonte|desmalez|limpieza|aseo|roce/, { m2: 400, m3: 20, ml: 200 }],
  [/cerramiento|campamento|valla/, { m2: 20, ml: 40, und: 2 }],
  [/cuneta|bordillo|sardinel|anden|andén/, { ml: 25, m2: 20, m3: 5 }],
  [/cubierta|teja|cubrimiento/, { m2: 30 }],
  [/impermeabiliz/, { m2: 25 }],
  [/cielo raso|drywall|dry wall|superboard/, { m2: 25 }],
  [/puerta|ventana|carpinter|cerrajer|reja|baranda/, { und: 3, m2: 8, ml: 10 }],
  [/vidrio|espejo/, { m2: 12, und: 6 }],
  [/aparato|sanitari|lavamanos|inodoro|lavaplatos|ducha|grifer|orinal|sif[oó]n/, { und: 4 }],
  [/luminaria|l[aá]mpara|bombillo|reflector|salida|tomacorriente|interruptor|toma\b/, { und: 10 }],
  [/caja|tablero|breaker|ca[nñ]uela/, { und: 6, ml: 20 }],
  [/gavi[oó]n/, { m3: 4 }],
  [/geotextil|geomembrana|geomalla/, { m2: 150 }],
  [/pilote|pilote|micropilote/, { ml: 12 }],
  [/se[nñ]al(es)? vertical|tablero de se[nñ]al|poste de se[nñ]al|se[nñ]al(es)? de tr[aá]nsito|se[nñ]al(es)? informativa/, { und: 6 }],
  [/demarcaci[oó]n|l[ií]nea de pintura|marca vial/, { ml: 400, m2: 150 }],
  [/riego|imprimaci[oó]n|liga|sello|slurry/, { m2: 1200 }],
  [/alcantarilla|box culvert|tuber[ií]a de concreto|dren/, { ml: 6, m3: 4 }],
  [/transporte|acarreo|botadero|disposici[oó]n final/, { m3: 100, und: 6, ton: 100 }],
  [/cimentaci[oó]n|zapata|pedestal|solado|ciclopeo|cicl[oó]peo/, { m3: 6 }],
  [/mortero|mamposter|enchape|alistado|nivelaci[oó]n de piso/, { m2: 12, m3: 3 }],
  [/instalaci[oó]n|montaje|suministro/, { und: 6, ml: 25, m2: 20 }],
];
const UNID_CLAVE = { m2: "m2", mt2: "m2", m3: "m3", mt3: "m3", ml: "ml", m: "ml", und: "und", u: "und", un: "und", unidad: "und", unid: "und", gl: "gl", ton: "ton", kg: "kg", ha: "ha" };
export function rendimientoExtra(nombre, unidad) {
  const n = sinTilde(nombre);
  const u = UNID_CLAVE[String(unidad || "").toLowerCase().replace(/³/g, "3").replace(/²/g, "2").replace(/[^a-z0-9]/g, "")] || "";
  if (!u) return null;
  for (const [re, tabla] of EXTRA) {
    if (re.test(nombre.toLowerCase()) || re.test(n)) { if (tabla[u] !== undefined) return tabla[u]; }
  }
  return null;
}

// ---------- 5. Alerta: ¿lo elegido corresponde a la actividad? ----------
// Solo AVISA (nunca bloquea). Si no se reconoce la actividad o el recurso, no avisa (para no molestar sin motivo).
const ACTIVIDADES = [   // en este orden: gana la primera que coincida
  ["topografía", /localizaci[oó]n|replanteo|topograf|levantamiento|georreferenc|nivelaci[oó]n topogr|control topogr/],
  ["demolición", /demolici[oó]n|desmantel|remoci[oó]n|retiro de/],
  ["pavimentos", /pavimento|asf[aá]lt|carpeta|imprimaci[oó]n|riego de|demarcaci[oó]n|se[nñ]alizaci[oó]n|base granular|subbase|afirmado/],
  ["movimiento de tierras", /excavaci[oó]n|relleno|terrapl[eé]n|conformaci[oó]n|explanaci[oó]n|descapote|botadero|corte de/],
  ["instalaciones eléctricas", /el[eé]ctric|cableado|luminaria|tomacorriente|interruptor|iluminaci[oó]n|conduit|acometida|tablero/],
  ["instalaciones hidrosanitarias", /tuber[ií]a|sanitari|hidr[aá]ulic|desag[uü]e|acueducto|alcantarillado|lavamanos|inodoro|grifer|aparato/],
  ["acero y estructura metálica", /acero|refuerzo|varilla|malla electrosoldada|estructura met[aá]lica|perfil(es)? met[aá]lic/],
  ["acabados", /pa[nñ]ete|estuco|pintura|enchape|cer[aá]mic|porcelanat|piso|cielo raso|drywall|vinilo|guardaescoba|revoque/],
  ["mampostería", /mamposter|ladrillo|bloque/],
  ["concreto", /concreto|hormig[oó]n|mortero|solado|zapata|pedestal|cimentaci[oó]n|columna|viga|losa|placa|sardinel|bordillo|anden|cuneta/],
];
const MAT = [   // familias de materiales
  ["cemento, agregados o concreto", /cemento(?!\s+asf)|\barena\b|grava|gravilla|triturado|recebo|concreto|mortero|aditivo|acelerante|plastificante|piedra|r[aá]j[oó]n|sikaset|sikament|grout|\bagua\b/],
  ["acero", /acero|varilla|malla electro|figurado|\bpdr\b/],
  ["madera o formaleta", /madera|tabla|list[oó]n|estaca|guadua|formaleta|triplex|parales?/],
  ["ladrillo o bloque", /ladrillo|bloque|adoqu[ií]n|tolete/],
  ["pintura o acabados", /pintura|estuco|vinil|cer[aá]mic|porcelanat|pegacor|boquilla|l[aá]mina de yeso|masilla|esmalte|sellador|anticorrosiv/],
  ["tubería y accesorios", /tuber[ií]a|\bpvc\b|cpvc|codo|uni[oó]n|\btee\b|v[aá]lvula|sanitario|lavamanos|grifer|accesorio/],
  ["material eléctrico", /cable|thhn|conduit|\bemt\b|tomacorriente|interruptor|breaker|luminaria|bombillo|l[aá]mpara/],
  ["asfalto", /asf[aá]lt|emulsi[oó]n|mezcla asf/],
];
const EQ = [
  ["topografía", /estaci[oó]n total|teodolito|nivel (autom|topogr|l[aá]ser)|\bgps\b|gnss|plomada|jal[oó]n|prisma|dron|taquimetro|nivel de precisi/],
  ["concreto", /mezcladora|concretadora|vibrador|bomba de concreto|mixer|mezclador|allanadora|regla vibratoria|pulidora de concreto/],
  ["maquinaria pesada", /retroexcavadora|excavadora|bulldozer|buldozer|motoniveladora|cargador|vibrocompactador|compactador|rodillo|pavimentadora|terminadora|finisher|volqueta|cami[oó]n|bobcat|minicargador|pilotera|gr[uú]a|planta de asfalto|barredora|fresadora/],
  ["soldadura", /soldadora|equipo de soldadura|plasma|oxicorte|soldadura/],
];
const MO = [
  ["topografía", /top[oó]graf|cadenero|comisi[oó]n de topograf|auxiliar de topograf/],
  ["oficios de construcción (maestro, oficial, obrero…)", /maestro|oficial|obrero|alba[nñ]il|armador|carpintero|fundidor/],
  ["electricista", /electricista|el[eé]ctric/],
  ["plomero", /plomero|fontanero|hidr[aá]ulic/],
  ["pintor", /pintor|estucador/],
  ["soldador", /soldador/],
  ["operador de equipo", /operador|conductor|maquinista/],
];
const NO_CORRESPONDE = {   // por actividad: familias que no se esperan en esa actividad
  "topografía": { mat: ["cemento, agregados o concreto", "acero", "ladrillo o bloque", "tubería y accesorios", "material eléctrico", "asfalto"], eq: ["concreto", "maquinaria pesada", "soldadura"],
    mo: ["oficios de construcción (maestro, oficial, obrero…)", "electricista", "plomero", "pintor", "soldador", "operador de equipo"] },
  "demolición": { mat: ["cemento, agregados o concreto", "pintura o acabados", "tubería y accesorios", "material eléctrico", "ladrillo o bloque", "asfalto"], eq: ["concreto", "topografía"], mo: ["topografía", "pintor", "electricista", "plomero"] },
  "pavimentos": { mat: ["tubería y accesorios", "material eléctrico", "ladrillo o bloque"], eq: ["soldadura"], mo: ["electricista", "plomero"] },
  "movimiento de tierras": { mat: ["tubería y accesorios", "material eléctrico", "pintura o acabados", "ladrillo o bloque"], eq: ["concreto", "soldadura"], mo: ["electricista", "plomero", "pintor"] },
  "instalaciones eléctricas": { mat: ["asfalto", "ladrillo o bloque"], eq: ["topografía", "concreto"], mo: ["topografía", "plomero", "pintor", "soldador"] },
  "instalaciones hidrosanitarias": { mat: ["asfalto", "ladrillo o bloque", "material eléctrico", "pintura o acabados"], eq: ["topografía", "concreto"], mo: ["topografía", "electricista", "pintor"] },
  "acero y estructura metálica": { mat: ["tubería y accesorios", "material eléctrico", "ladrillo o bloque", "asfalto"], eq: ["concreto", "topografía"], mo: ["topografía", "electricista", "plomero", "pintor"] },
  "acabados": { mat: ["tubería y accesorios", "material eléctrico", "asfalto", "acero"], eq: ["topografía", "maquinaria pesada"], mo: ["topografía", "electricista", "plomero", "soldador", "operador de equipo"] },
  "mampostería": { mat: ["tubería y accesorios", "material eléctrico", "asfalto", "pintura o acabados"], eq: ["topografía", "maquinaria pesada"], mo: ["topografía", "electricista", "plomero", "pintor", "soldador", "operador de equipo"] },
  "concreto": { mat: ["tubería y accesorios", "material eléctrico", "asfalto", "ladrillo o bloque", "pintura o acabados"], eq: ["topografía", "soldadura"], mo: ["topografía", "electricista", "plomero", "pintor"] },
};
const clasificar = (lista, texto) => { const t = sinTilde(texto); for (const [nombre, re] of lista) if (re.test(t)) return nombre; return null; };
export function familiaActividad(nombre, capitulo) {
  const t = sinTilde(`${nombre || ""}`);
  for (const [fam, re] of ACTIVIDADES) if (re.test(t)) return fam;
  void capitulo;
  return null;
}
// tipo: "materiales" | "mano_obra" | "equipos". Devuelve null si todo bien, o { mensaje } si no parece corresponder.
export function evaluarCoherencia(actividadNombre, tipo, descripcion) {
  const desc = String(descripcion || "").trim();
  if (desc.length < 3) return null;
  const fam = familiaActividad(actividadNombre);
  if (!fam || !NO_CORRESPONDE[fam]) return null;
  const lista = tipo === "materiales" ? MAT : tipo === "mano_obra" ? MO : EQ;
  const clave = tipo === "materiales" ? "mat" : tipo === "mano_obra" ? "mo" : "eq";
  const famRecurso = clasificar(lista, desc);
  if (!famRecurso) return null;
  if (!NO_CORRESPONDE[fam][clave].includes(famRecurso)) return null;
  const que = tipo === "materiales" ? "material" : tipo === "mano_obra" ? "mano de obra" : "equipo o herramienta";
  return {
    familiaActividad: fam, familiaRecurso: famRecurso,
    mensaje: `«${desc}» no parece corresponder a esta actividad. La actividad «${actividadNombre}» es de ${fam}, y este ${que} es de ${famRecurso}. Revisa si te equivocaste de actividad o de ${que}.`,
  };
}
// Todos los avisos de un APU: [{ tabla, fila, desc, mensaje }]
export function avisosDelApu(actividadNombre, tablas) {
  const out = [];
  for (const [tipo, filas, titulo] of tablas) {
    (filas || []).forEach((f, i) => { const r = f && f.desc ? evaluarCoherencia(actividadNombre, tipo, f.desc) : null; if (r) out.push({ tabla: titulo, tipo, fila: i, desc: f.desc, mensaje: r.mensaje }); });
  }
  return out;
}
