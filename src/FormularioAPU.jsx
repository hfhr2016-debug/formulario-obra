import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { fotoLibro, estilarEscritos } from "./sstBase";
import { catalogoVigente, actividadesVigentes } from "./catalogoVivo";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto, tipoProyectoActivo } from "./MenuLateral";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// Cantidad × Factor/Rendimiento × Precio (misma fórmula en las 3 tablas: Materiales, Mano de Obra, Equipos).
function sumarTabla(filas) {
  return filas.reduce((acc, f) => {
    const cant = numES(f.cant) || 0;
    const factor = numES(f.factor) || 1;
    const precio = numES(f.vrUnit) || 0;
    return acc + cant * factor * precio;
  }, 0);
}


const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

// ---- Catálogo de 142 actividades (para el buscador) ----
const RENDIMIENTOS_REFERENCIA = {"Localización y Replanteo": 150, "Cerramiento provisional de obra": 40, "Instalación de campamento y oficinas provisionales": 20, "Adecuación de área de almacenamiento": 25, "Protección de elementos existentes": 30, "Desmonte y limpieza inicial": 80, "Demoliciones preliminares": 6, "Excavación manual en material común": 4, "Excavación mecánica": 60, "Excavación en roca": 15, "Perfilado y conformación de excavaciones": 40, "Relleno con material seleccionado compactado": 25, "Relleno con material proveniente de excavación": 30, "Suministro, extendido y compactación de subbase": 35, "Suministro, extendido y compactación de base granular": 35, "Concreto de limpieza / solado": 12, "Concreto para zapatas": 10, "Concreto para vigas de cimentación": 8, "Concreto para losas de cimentación": 15, "Concreto para pedestales": 6, "Acero de refuerzo en cimentación": 250, "Formaleta para elementos de cimentación": 10, "Concreto para columnas": 6, "Concreto para vigas": 8, "Concreto para losas": 15, "Concreto para escaleras": 4, "Concreto para muros estructurales": 8, "Acero de refuerzo de columnas": 220, "Acero de refuerzo de vigas": 220, "Acero de refuerzo de losas": 250, "Formaleta de columnas": 8, "Formaleta de vigas": 8, "Formaleta de losas": 12, "Formaleta de escaleras": 5, "Mampostería en bloque de concreto": 12, "Mampostería en ladrillo": 10, "Mampostería estructural": 9, "Muros en sistema liviano / drywall": 15, "Dinteles sobre vanos": 15, "Alfajías y remates": 20, "Estructura metálica o de madera para cubierta": 80, "Suministro e instalación de teja": 25, "Impermeabilización de cubierta": 20, "Canales de aguas lluvias": 20, "Bajantes de aguas lluvias": 25, "Impermeabilización de losas y terrazas": 15, "Impermeabilización de muros": 15, "Impermeabilización de zonas húmedas": 10, "Pañete / revoque interior": 18, "Pañete / revoque exterior": 15, "Pañete impermeabilizado": 10, "Estuco plástico o tradicional": 25, "Mortero de nivelación": 20, "Piso cerámico": 10, "Piso en porcelanato": 8, "Piso vinílico": 15, "Piso laminado": 15, "Enchape cerámico en muros": 8, "Guardaescoba": 40, "Pintura vinílica interior": 35, "Pintura exterior": 30, "Pintura esmalte en superficies metálicas/madera": 20, "Pintura anticorrosiva": 25, "Sellador / imprimante": 40, "Ventanas de aluminio": 6, "Divisiones de aluminio": 6, "Vidrio templado": 8, "Vidrio laminado": 8, "Tubería de agua fría": 25, "Tubería de agua caliente": 20, "Tubería sanitaria": 20, "Tubería de aguas lluvias": 25, "Aparatos sanitarios": 4, "Lavamanos": 5, "Griferías": 6, "Duchas": 5, "Tubería/conduit eléctrica": 30, "Cableado de fuerza": 150, "Cableado de iluminación": 150, "Tomacorrientes": 15, "Interruptores": 15, "Luminarias": 12, "Construcción de andenes": 15, "Sardineles y bordillos": 25, "Siembra y jardinería": 20, "Limpieza gruesa y fina de obra": 100, "Limpieza final para entrega": 80};

// Respaldo por palabras clave — cubre actividades de Vías/Hidrocarburos y los nombres
// genéricos de concreto/acero (que ya no coinciden exacto con el diccionario de arriba)
function rendimientoSugeridoPorKeyword(nombreActividad) {
  const n = (nombreActividad || "").toLowerCase();
  const reglas = [
    [/acero/, 220],
    [/concreto.*(columna|muro)/, 6],
    [/concreto.*(viga|losa)/, 8],
    [/concreto/, 10],
    [/excavaci[oó]n.*roca/, 15],
    [/excavaci[oó]n.*mec[aá]nica|excavaci[oó]n mecanizada/, 60],
    [/excavaci[oó]n/, 6],
    [/relleno|subbase|base granular|afirmado/, 30],
    [/mampostería|bloque|ladrillo/, 11],
    [/pañete|revoque|estuco/, 18],
    [/pintura|esmalte/, 30],
    [/piso|enchape|cerámic|porcelanat/, 9],
    [/tubería|tuberia|conduit/, 25],
    [/cable|cableado/, 150],
    [/pavimento|mezcla asfáltica|capa de rodadura|base asfáltica/, 500],
    [/señalización|demarcación/, 200],
    [/soldadura|montaje.*(tubería|estructura)/, 15],
    [/instrumentación|instrumento/, 3],
    [/formaleta/, 9],
  ];
  for (const [patron, valor] of reglas) {
    if (patron.test(n)) return valor;
  }
  return null;
}

function cuadrillaSugeridaPorKeyword(nombreActividad) {
  const n = (nombreActividad || "").toLowerCase();
  const reglas = [
    [/acero|refuerzo|varilla|pdr/, "1 Oficial + 2 Ayudantes (armado de acero)"],
    [/concreto/, "1 Oficial + 3 Ayudantes (vaciado de concreto)"],
    [/excavaci[oó]n.*mec[aá]nica|excavaci[oó]n mecanizada/, "1 Operador de maquinaria + 1 Ayudante"],
    [/excavaci[oó]n/, "1 Oficial + 2 Ayudantes"],
    [/mampostería|bloque|ladrillo/, "1 Oficial + 1 Ayudante"],
    [/pañete|revoque|estuco/, "1 Oficial + 1 Ayudante"],
    [/pintura|esmalte/, "1 Oficial + 1 Ayudante"],
    [/piso|enchape|cerámic|porcelanat/, "1 Oficial + 1 Ayudante"],
    [/tubería|tuberia|conduit/, "1 Oficial + 1 Ayudante"],
    [/cable|cableado|eléctric/, "1 Electricista + 1 Ayudante"],
    [/pavimento|mezcla asfáltica|capa de rodadura|base asfáltica/, "1 Operador de maquinaria + cuadrilla de pavimentación"],
    [/señalización|demarcación/, "1 Oficial + 1 Ayudante"],
    [/soldadura/, "1 Soldador + 1 Ayudante"],
    [/formaleta/, "1 Oficial + 2 Ayudantes"],
  ];
  for (const [patron, valor] of reglas) {
    if (patron.test(n)) return valor;
  }
  return null;
}

const CUADRILLAS_REFERENCIA = {"Localización y Replanteo": {"cuadrilla": "1 Topógrafo + 1 Cadenero", "personas": 2}, "Cerramiento provisional de obra": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Instalación de campamento y oficinas provisionales": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Adecuación de área de almacenamiento": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Protección de elementos existentes": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Desmonte y limpieza inicial": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Demoliciones preliminares": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Excavación manual en material común": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Excavación mecánica": {"cuadrilla": "1 Operador retroexcavadora + 1 Ayudante", "personas": 2}, "Excavación en roca": {"cuadrilla": "1 Operador + 2 Ayudantes", "personas": 3}, "Perfilado y conformación de excavaciones": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Relleno con material seleccionado compactado": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Relleno con material proveniente de excavación": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Suministro, extendido y compactación de subbase": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Suministro, extendido y compactación de base granular": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto de limpieza / solado": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto para zapatas": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto para vigas de cimentación": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto para losas de cimentación": {"cuadrilla": "1 Oficial + 4 Ayudantes", "personas": 5}, "Concreto para pedestales": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Acero de refuerzo en cimentación": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Formaleta para elementos de cimentación": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Concreto para columnas": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto para vigas": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Concreto para losas": {"cuadrilla": "1 Oficial + 4 Ayudantes", "personas": 5}, "Concreto para escaleras": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Concreto para muros estructurales": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Acero de refuerzo de columnas": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Acero de refuerzo de vigas": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Acero de refuerzo de losas": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Formaleta de columnas": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Formaleta de vigas": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Formaleta de losas": {"cuadrilla": "1 Oficial + 3 Ayudantes", "personas": 4}, "Formaleta de escaleras": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Mampostería en bloque de concreto": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Mampostería en ladrillo": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Mampostería estructural": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Muros en sistema liviano / drywall": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Dinteles sobre vanos": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Alfajías y remates": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Estructura metálica o de madera para cubierta": {"cuadrilla": "1 Oficial soldador + 2 Ayudantes", "personas": 3}, "Suministro e instalación de teja": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Impermeabilización de cubierta": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Canales de aguas lluvias": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Bajantes de aguas lluvias": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Impermeabilización de losas y terrazas": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Impermeabilización de muros": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Impermeabilización de zonas húmedas": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pañete / revoque interior": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pañete / revoque exterior": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pañete impermeabilizado": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Estuco plástico o tradicional": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Mortero de nivelación": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Piso cerámico": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Piso en porcelanato": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Piso vinílico": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Piso laminado": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Enchape cerámico en muros": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Guardaescoba": {"cuadrilla": "1 Oficial", "personas": 1}, "Pintura vinílica interior": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pintura exterior": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pintura esmalte en superficies metálicas/madera": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Pintura anticorrosiva": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Sellador / imprimante": {"cuadrilla": "1 Oficial", "personas": 1}, "Ventanas de aluminio": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Divisiones de aluminio": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Vidrio templado": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Vidrio laminado": {"cuadrilla": "1 Oficial + 1 Ayudante", "personas": 2}, "Tubería de agua fría": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Tubería de agua caliente": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Tubería sanitaria": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Tubería de aguas lluvias": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Aparatos sanitarios": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Lavamanos": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Griferías": {"cuadrilla": "1 Oficial hidrosanitario", "personas": 1}, "Duchas": {"cuadrilla": "1 Oficial hidrosanitario + 1 Ayudante", "personas": 2}, "Tubería/conduit eléctrica": {"cuadrilla": "1 Electricista + 1 Ayudante", "personas": 2}, "Cableado de fuerza": {"cuadrilla": "1 Electricista + 1 Ayudante", "personas": 2}, "Cableado de iluminación": {"cuadrilla": "1 Electricista + 1 Ayudante", "personas": 2}, "Tomacorrientes": {"cuadrilla": "1 Electricista", "personas": 1}, "Interruptores": {"cuadrilla": "1 Electricista", "personas": 1}, "Luminarias": {"cuadrilla": "1 Electricista + 1 Ayudante", "personas": 2}, "Construcción de andenes": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Sardineles y bordillos": {"cuadrilla": "1 Oficial + 2 Ayudantes", "personas": 3}, "Siembra y jardinería": {"cuadrilla": "1 Jardinero + 1 Ayudante", "personas": 2}, "Limpieza gruesa y fina de obra": {"cuadrilla": "2 Aseadores", "personas": 2}, "Limpieza final para entrega": {"cuadrilla": "2 Aseadores", "personas": 2}};

const CATALOGO_CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];
const CATALOGO_ESPECIALIDADES = ["Obra Civil", "Estructuras", "Obras Hidrosanitarias", "Obras Eléctricas", "Gas", "Climatización y Ventilación (HVAC)", "Comunicaciones y Seguridad", "Ascensores", "Acabados y Arquitectura", "Mampostería", "Cubiertas e Impermeabilización", "Carpintería y Vidrios", "Pintura", "Urbanismo y Exteriores", "Diseño Arquitectónico", "Diseño Estructural", "Interventoría", "Topografía", "Geotecnia y Suelos", "Gerencia de Proyecto"];
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal", "Administrador de Obra", "Administrador", "Auxiliar Administrativo", "Asistente Administrativo", "Coordinador Administrativo", "Director Administrativo", "Gerente Administrativo", "Contador", "Auxiliar Contable", "Tesorero", "Analista de Costos", "Analista de Presupuesto", "Jefe de Compras", "Comprador", "Auxiliar de Compras", "Secretaria", "Talento Humano"];

function BuscadorTexto({ value, onChange, catalogo, campo, placeholder }) {
  const [abierto, setAbierto] = React.useState(false);
  const resultados = React.useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    const items = catalogo.map((it) => (typeof it === "string" ? it : it[campo]));
    const filtrados = items.filter((it) => it.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aE = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bE = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return [...new Set(filtrados)].slice(0, 8);
  }, [value, catalogo, campo]);
  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((r, i) => (
            <button
              key={i} type="button"
              onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]"
              style={{ borderColor: LINE, color: NAVY }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}
function fechaDDMMYYYY() {
  const [a, m, d] = fechaLocalHoy().split("-");
  return `${d}/${m}/${a}`;
}

function BuscadorActividad({ value, onSelect }) {
  const [texto, setTexto] = useState(value || "");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    if (!texto || texto.length < 2) return [];
    const q = texto.toLowerCase();
    const tipoActivo = tipoProyectoActivo();
    const coincide = actividadesVigentes().filter(
      (it) =>
        it.tipo === tipoActivo &&
        (it.actividad.toLowerCase().includes(q) ||
        it.capitulo.toLowerCase().includes(q))
    );
    coincide.sort((a, b) => {
      const aEmpieza = a.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      const bEmpieza = b.actividad.toLowerCase().startsWith(q) ? 0 : 1;
      if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
      return a.actividad.length - b.actividad.length;
    });
    return coincide.slice(0, 10);
  }, [texto]);

  return (
    <div className="relative">
      <input
        type="text"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Escribe para buscar la actividad..."
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div
          className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          style={{ borderColor: LINE }}
        >
          {resultados.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setTexto(it.actividad);
                setAbierto(false);
                onSelect(it);
              }}
              className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div className="text-[13px] font-medium" style={{ color: NAVY }}>
                {it.actividad}
              </div>
              <div className="text-[11px] text-gray-500">
                {it.capitulo} · {it.unidad}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CampoNombre({ value, onChange, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!value || value.length < 1) return [];
    try {
      const nombres = JSON.parse(localStorage.getItem("ryr_nombres_usados") || "[]");
      const q = value.toLowerCase();
      return nombres.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
    } catch (e) { return []; }
  }, [value]);
  function guardarNombre(v) {
    if (!v || v.trim().length < 3) return;
    try {
      const nombres = JSON.parse(localStorage.getItem("ryr_nombres_usados") || "[]");
      const limpio = v.trim();
      if (!nombres.includes(limpio)) {
        nombres.unshift(limpio);
        localStorage.setItem("ryr_nombres_usados", JSON.stringify(nombres.slice(0, 200)));
      }
    } catch (e) {}
  }
  return (
    <div className="relative">
      <input
        placeholder={placeholder || "Nombre"}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { guardarNombre(value); setTimeout(() => setAbierto(false), 150); }}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]">
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      style={{ borderColor: LINE }}
    />
  );
}

function BuscadorCelda({ valor, onSeleccionar, catalogo, placeholder, palabrasClaveActividad }) {
  const [texto, setTexto] = useState(valor || "");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    if (!texto || texto.length < 2 || !catalogo) return [];
    const q = texto.toLowerCase();
    const coincide = catalogo.filter((it) => it.descripcion.toLowerCase().includes(q));
    coincide.sort((a, b) => {
      const aEmpieza = a.descripcion.toLowerCase().startsWith(q) ? 0 : 1;
      const bEmpieza = b.descripcion.toLowerCase().startsWith(q) ? 0 : 1;
      if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
      if (palabrasClaveActividad && palabrasClaveActividad.length) {
        const contarCoincidencias = (desc) => {
          const d = desc.toLowerCase();
          return palabrasClaveActividad.filter((p) => d.includes(p)).length;
        };
        const diff = contarCoincidencias(b.descripcion) - contarCoincidencias(a.descripcion);
        if (diff !== 0) return diff;
      }
      return a.descripcion.length - b.descripcion.length;
    });
    return coincide.slice(0, 10);
  }, [texto, catalogo, palabrasClaveActividad]);

  return (
    <div className="relative flex-[2.2] min-w-0">
      <input
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          onSeleccionar({ desc: e.target.value });
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded px-2 py-1.5 text-[12.5px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div
          className="absolute z-30 w-72 mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto"
          style={{ borderColor: LINE }}
        >
          {resultados.map((it, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => {
                setTexto(it.descripcion);
                setAbierto(false);
                onSeleccionar({ desc: it.descripcion, und: it.unidad, vrUnit: it.precio });
              }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50"
              style={{ borderColor: LINE }}
            >
              <div className="text-[12px] font-medium" style={{ color: NAVY }}>
                {it.descripcion}
              </div>
              <div className="text-[10.5px] text-gray-500">
                {it.unidad} · ${it.precio.toLocaleString("es-CO")}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DESPERDICIO_REFERENCIA = {"Concreto de limpieza / solado": 0.03, "Concreto para zapatas": 0.03, "Concreto para vigas de cimentación": 0.03, "Concreto para losas de cimentación": 0.03, "Concreto para pedestales": 0.03, "Concreto para columnas": 0.03, "Concreto para vigas": 0.03, "Concreto para losas": 0.03, "Concreto para escaleras": 0.05, "Concreto para muros estructurales": 0.03, "Acero de refuerzo en cimentación": 0.05, "Acero de refuerzo de columnas": 0.05, "Acero de refuerzo de vigas": 0.05, "Acero de refuerzo de losas": 0.05, "Mampostería en bloque de concreto": 0.05, "Mampostería en ladrillo": 0.05, "Mampostería estructural": 0.05, "Muros en sistema liviano / drywall": 0.08, "Suministro e instalación de teja": 0.08, "Pañete / revoque interior": 0.1, "Pañete / revoque exterior": 0.1, "Pañete impermeabilizado": 0.1, "Estuco plástico o tradicional": 0.1, "Piso cerámico": 0.08, "Piso en porcelanato": 0.1, "Piso vinílico": 0.05, "Piso laminado": 0.05, "Enchape cerámico en muros": 0.1, "Pintura vinílica interior": 0.08, "Pintura exterior": 0.1, "Pintura esmalte en superficies metálicas/madera": 0.08, "Pintura anticorrosiva": 0.08, "Ventanas de aluminio": 0.02, "Divisiones de aluminio": 0.02, "Vidrio templado": 0.05, "Vidrio laminado": 0.05, "Tubería de agua fría": 0.05, "Tubería de agua caliente": 0.05, "Tubería sanitaria": 0.05, "Tubería de aguas lluvias": 0.05, "Tubería/conduit eléctrica": 0.05, "Cableado de fuerza": 0.05, "Cableado de iluminación": 0.05, "Impermeabilización de cubierta": 0.05, "Impermeabilización de losas y terrazas": 0.05, "Impermeabilización de muros": 0.05, "Impermeabilización de zonas húmedas": 0.05, "Formaleta de columnas": 0.05, "Formaleta de vigas": 0.05, "Formaleta de losas": 0.05, "Formaleta de escaleras": 0.05, "Formaleta para elementos de cimentación": 0.05, "Construcción de andenes": 0.05, "Sardineles y bordillos": 0.05};

function factorDesperdicioSugerido(nombreMaterial) {
  if (!nombreMaterial) return null;
  const n = nombreMaterial.toLowerCase();
  const reglas = [
    [/cerámic|porcelanat|enchape/, 0.10],
    [/pintura|esmalte|vinílic/, 0.10],
    [/estuco|yeso/, 0.10],
    [/madera|formaleta/, 0.10],
    [/teja/, 0.08],
    [/cable|cableado/, 0.08],
    [/adoquín|ladrillo|bloque/, 0.05],
    [/vidrio/, 0.05],
    [/tubería|tuberia|conduit/, 0.05],
    [/acero/, 0.05],
    [/cemento|concreto|agregado|arena|grava|recebo/, 0.03],
  ];
  for (const [patron, factor] of reglas) {
    if (patron.test(n)) return factor;
  }
  return null;
}

// Consumo típico de materiales por unidad de actividad (referencia general — ajustar según el caso real)

// Consumo real de materiales por ACTIVIDAD específica (tabla de referencia construida y validada)
const RENDIMIENTOS_MATERIALES_POR_ACTIVIDAD = {"Concreto f'c=175 kg/cm² (2500 PSI)": [{"material": "Cemento gris", "consumo": 280, "unidad": "kg", "factor": 0.03, "nota": "Dosificación típica 1:2.8:3.5 aprox — mezcladora, agregados en buen estado"}, {"material": "Arena de río / peña", "consumo": 0.52, "unidad": "m³", "factor": 0.05, "nota": "Volumen suelto aprox."}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": "Volumen suelto aprox."}, {"material": "Agua", "consumo": 180, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.64"}], "Concreto f'c=210 kg/cm² (3000 PSI)": [{"material": "Cemento gris", "consumo": 350, "unidad": "kg", "factor": 0.03, "nota": "Dosificación estándar para f'c=210 kg/cm² (3000 PSI)"}, {"material": "Arena de río / peña", "consumo": 0.56, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Gravilla / triturado 3/4\"", "consumo": 0.84, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 175, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.55"}], "Concreto f'c=280 kg/cm² (4000 PSI)": [{"material": "Cemento gris", "consumo": 360, "unidad": "kg", "factor": 0.03, "nota": ""}, {"material": "Arena de río / peña", "consumo": 0.48, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 170, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.47"}], "Concreto f'c=350 kg/cm² (5000 PSI)": [{"material": "Cemento gris", "consumo": 400, "unidad": "kg", "factor": 0.03, "nota": ""}, {"material": "Arena de río / peña", "consumo": 0.46, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 160, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.40"}], "Concreto f'c=420 kg/cm² (6000 PSI)": [{"material": "Cemento gris", "consumo": 440, "unidad": "kg", "factor": 0.03, "nota": "Alta resistencia — normalmente con aditivo"}, {"material": "Arena de río / peña", "consumo": 0.44, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 150, "unidad": "Lt", "factor": 0.02, "nota": ""}, {"material": "Aditivo plastificante/superplastificante", "consumo": 4, "unidad": "Lt", "factor": 0.05, "nota": "Necesario para reducir relación a/c manteniendo trabajabilidad"}], "Concreto ciclópeo": [{"material": "Concreto simple (base, f'c=175)", "consumo": 0.7, "unidad": "m³", "factor": 0.03, "nota": "El 30% restante es piedra rajón/bola grande"}, {"material": "Piedra rajón / bola grande", "consumo": 0.35, "unidad": "m³", "factor": 0.05, "nota": "Aprox. 30-35% del volumen, tamaño 15-25cm"}], "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI": [{"material": "Acero PDR-60 / Refuerzo", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": "1 kg de material por 1 kg instalado, más desperdicio por cortes/traslapos"}, {"material": "Alambre negro No.18 (amarre)", "consumo": 0.02, "unidad": "kg", "factor": 0.05, "nota": "Aprox. 2% del peso de acero, para amarres"}], "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI": [{"material": "Acero PDR-37 / Refuerzo liso", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": ""}, {"material": "Alambre negro No.18 (amarre)", "consumo": 0.02, "unidad": "kg", "factor": 0.05, "nota": ""}], "Mampostería en bloque de concreto": [{"material": "Bloque de concreto (según formato)", "consumo": 12.5, "unidad": "und", "factor": 0.05, "nota": "Formato estándar 40x20x20 cm aprox."}, {"material": "Cemento gris (mortero de pega)", "consumo": 5, "unidad": "kg", "factor": 0.1, "nota": "Mortero 1:4 aprox."}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.018, "unidad": "m³", "factor": 0.1, "nota": ""}], "Mampostería en ladrillo": [{"material": "Ladrillo tolete / bloque #5", "consumo": 60, "unidad": "und", "factor": 0.05, "nota": "Ladrillo tolete común, aparejo estándar"}, {"material": "Cemento gris (mortero de pega)", "consumo": 6, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.02, "unidad": "m³", "factor": 0.1, "nota": ""}], "Mampostería estructural": [{"material": "Bloque estructural (según formato)", "consumo": 12.5, "unidad": "und", "factor": 0.05, "nota": "Formato 40x20x20 cm, celdas para refuerzo"}, {"material": "Cemento gris (mortero de pega)", "consumo": 5.5, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.019, "unidad": "m³", "factor": 0.1, "nota": ""}, {"material": "Grout / concreto de relleno de celdas", "consumo": 0.012, "unidad": "m³", "factor": 0.05, "nota": "Según diseño estructural, celdas reforzadas"}], "Pañete / revoque interior": [{"material": "Cemento gris", "consumo": 6.5, "unidad": "kg", "factor": 0.1, "nota": "Espesor aprox. 1.5 cm, mortero 1:4"}, {"material": "Arena de peña", "consumo": 0.023, "unidad": "m³", "factor": 0.1, "nota": ""}], "Pañete / revoque exterior": [{"material": "Cemento gris", "consumo": 8, "unidad": "kg", "factor": 0.1, "nota": "Espesor aprox. 2 cm, mortero 1:3, mayor resistencia"}, {"material": "Arena de peña", "consumo": 0.024, "unidad": "m³", "factor": 0.1, "nota": ""}], "Estuco plástico": [{"material": "Estuco plástico (material listo)", "consumo": 0.8, "unidad": "kg", "factor": 0.1, "nota": "Aplicación en 2 manos, superficie normal"}], "Piso cerámico": [{"material": "Cerámica (según formato elegido)", "consumo": 1.05, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Pegacor / adhesivo cerámico", "consumo": 4.5, "unidad": "kg", "factor": 0.1, "nota": "Espesor de capa estándar con llana dentada"}, {"material": "Boquilla / fragüe", "consumo": 0.4, "unidad": "kg", "factor": 0.05, "nota": "Junta de 2-3mm aprox."}], "Piso en porcelanato": [{"material": "Porcelanato (según formato elegido)", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Mayor desperdicio por formatos grandes y rectificado"}, {"material": "Pegacor / adhesivo para porcelanato", "consumo": 5.5, "unidad": "kg", "factor": 0.1, "nota": "Adhesivo de mayor rendimiento, piezas grandes/pesadas"}, {"material": "Boquilla / fragüe", "consumo": 0.3, "unidad": "kg", "factor": 0.05, "nota": ""}], "Pintura vinílica interior": [{"material": "Pintura vinílica tipo 1", "consumo": 0.1, "unidad": "gl", "factor": 0.1, "nota": "2 manos, sobre superficie ya estucada/imprimada"}, {"material": "Sellador / imprimante", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": "1 mano previa"}], "Pintura exterior": [{"material": "Pintura tipo exterior (acrílica/caucho)", "consumo": 0.12, "unidad": "gl", "factor": 0.1, "nota": "2 manos, mayor cubrimiento por textura"}, {"material": "Sellador / imprimante exterior", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": ""}], "Cerramiento provisional de obra": [{"material": "Malla polisombra / plástica", "consumo": 1.1, "unidad": "ML", "factor": 0.1, "nota": "Altura estándar 2.1-2.4m, incluye traslapos"}, {"material": "Parales/guadua o madera", "consumo": 0.33, "unidad": "und", "factor": 0.08, "nota": "1 parada cada 3m aprox."}], "Suministro, extendido y compactación de subbase": [{"material": "Subbase granular", "consumo": 1.25, "unidad": "m³", "factor": 0.1, "nota": "Factor de compactación aprox. 1.20-1.25 (material suelto vs compactado)"}], "Suministro, extendido y compactación de base granular": [{"material": "Base granular", "consumo": 1.25, "unidad": "m³", "factor": 0.1, "nota": "Factor de compactación aprox."}], "Relleno con material seleccionado compactado": [{"material": "Material seleccionado / recebo", "consumo": 1.2, "unidad": "m³", "factor": 0.08, "nota": "Factor de compactación"}], "Suministro y montaje de perfiles metálicos": [{"material": "Perfil metálico estructural (IPE/HEA/tubular)", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": "1 kg material por 1 kg instalado"}, {"material": "Pintura anticorrosiva para estructura", "consumo": 0.012, "unidad": "gl", "factor": 0.05, "nota": "Aprox. 1 galón cubre 80 kg de perfil, 2 manos"}, {"material": "Electrodo de soldadura", "consumo": 0.03, "unidad": "kg", "factor": 0.1, "nota": "Aprox. 3% del peso en soldadura"}], "Grouting cementoso para reparación estructural": [{"material": "Grout cementoso", "consumo": 20, "unidad": "kg", "factor": 0.1, "nota": "Espesor promedio 1.5 cm"}], "Muros en sistema liviano / drywall": [{"material": "Lámina de yeso / drywall (2 caras)", "consumo": 2.1, "unidad": "m²", "factor": 0.1, "nota": "1 m² de muro = 2 láminas (ambas caras)"}, {"material": "Perfilería metálica (parales + riel)", "consumo": 2.5, "unidad": "ml", "factor": 0.08, "nota": "Parales cada 40-60 cm más rieles superior/inferior"}, {"material": "Lana mineral / aislamiento (si aplica)", "consumo": 1, "unidad": "m²", "factor": 0.05, "nota": "Opcional según especificación acústica"}, {"material": "Tornillería y cinta para juntas", "consumo": 0.15, "unidad": "kg", "factor": 0.1, "nota": ""}], "Suministro e instalación de teja": [{"material": "Teja (según tipo: fibrocemento/termoacústica)", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos según pendiente"}, {"material": "Tornillería / ganchos de fijación", "consumo": 6, "unidad": "und", "factor": 0.08, "nota": "Aprox. 6 fijaciones por m²"}], "Impermeabilización de cubierta": [{"material": "Manto asfáltico / membrana impermeabilizante", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos de 10cm entre rollos"}, {"material": "Imprimante asfáltico", "consumo": 0.25, "unidad": "gl", "factor": 0.05, "nota": ""}], "Cielo raso Dry Wall": [{"material": "Lámina de yeso para cielo raso", "consumo": 1.05, "unidad": "m²", "factor": 0.08, "nota": ""}, {"material": "Perfilería metálica para cielo raso (omega/canal)", "consumo": 2.2, "unidad": "ml", "factor": 0.08, "nota": ""}], "Impermeabilización de losas y terrazas": [{"material": "Manto asfáltico / membrana impermeabilizante", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos"}, {"material": "Imprimante asfáltico", "consumo": 0.25, "unidad": "gl", "factor": 0.05, "nota": ""}], "Impermeabilización de muros": [{"material": "Impermeabilizante tipo membrana líquida/cementoso", "consumo": 2, "unidad": "kg", "factor": 0.1, "nota": "2 manos, espesor estándar"}], "Impermeabilización de zonas húmedas": [{"material": "Impermeabilizante cementoso flexible", "consumo": 3, "unidad": "kg", "factor": 0.1, "nota": "2-3 manos, mayor exigencia por humedad constante"}], "Pañete impermeabilizado": [{"material": "Cemento gris", "consumo": 7, "unidad": "kg", "factor": 0.1, "nota": "Mortero 1:3 con aditivo impermeabilizante"}, {"material": "Arena de peña", "consumo": 0.022, "unidad": "m³", "factor": 0.1, "nota": ""}, {"material": "Aditivo impermeabilizante integral", "consumo": 0.3, "unidad": "kg", "factor": 0.05, "nota": ""}], "Mortero de nivelación": [{"material": "Cemento gris", "consumo": 5, "unidad": "kg", "factor": 0.1, "nota": "Espesor promedio 2 cm"}, {"material": "Arena de peña", "consumo": 0.02, "unidad": "m³", "factor": 0.1, "nota": ""}], "Piso vinílico": [{"material": "Baldosa/lámina vinílica", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Adhesivo para vinílico", "consumo": 0.3, "unidad": "kg", "factor": 0.08, "nota": ""}], "Piso laminado": [{"material": "Lámina de piso laminado", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Espuma/base niveladora", "consumo": 1.05, "unidad": "m²", "factor": 0.05, "nota": ""}], "Enchape cerámico en muros": [{"material": "Cerámica de muro", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes verticales"}, {"material": "Pegacor / adhesivo cerámico", "consumo": 4, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Boquilla / fragüe", "consumo": 0.35, "unidad": "kg", "factor": 0.05, "nota": ""}], "Pintura esmalte en superficies metálicas/madera": [{"material": "Esmalte sintético/poliuretano", "consumo": 0.1, "unidad": "gl", "factor": 0.1, "nota": "2 manos"}, {"material": "Anticorrosivo/sellador base", "consumo": 0.06, "unidad": "gl", "factor": 0.05, "nota": "1 mano previa"}], "Pintura anticorrosiva": [{"material": "Pintura anticorrosiva (2 manos)", "consumo": 0.12, "unidad": "gl", "factor": 0.1, "nota": ""}], "Sellador / imprimante": [{"material": "Sellador acrílico", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": "1 mano"}], "Estuco tradicional": [{"material": "Estuco tradicional (yeso/cal)", "consumo": 1.5, "unidad": "kg", "factor": 0.1, "nota": "Aplicación tradicional en 2-3 manos, mayor consumo que estuco plástico"}], "Tubería de agua fría": [{"material": "Tubería PVC presión / CPVC", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": "Incluye desperdicio por cortes"}, {"material": "Accesorios (codos, uniones, tees)", "consumo": 0.4, "unidad": "und", "factor": 0.08, "nota": "Aprox. 1 accesorio cada 2.5m"}], "Tubería de agua caliente": [{"material": "Tubería CPVC agua caliente", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios (codos, uniones, tees)", "consumo": 0.4, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería sanitaria": [{"material": "Tubería PVC sanitaria", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios sanitarios (codos, yee, uniones)", "consumo": 0.35, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería de aguas lluvias": [{"material": "Tubería PVC / novafort aguas lluvias", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios", "consumo": 0.3, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería/conduit eléctrica": [{"material": "Tubería EMT/PVC conduit", "consumo": 1.08, "unidad": "ml", "factor": 0.08, "nota": "Incluye desperdicio y curvas"}, {"material": "Accesorios (uniones, curvas, cajas de paso)", "consumo": 0.3, "unidad": "und", "factor": 0.08, "nota": ""}], "Cableado de fuerza": [{"material": "Cable THHN calibre según diseño", "consumo": 1.1, "unidad": "ml", "factor": 0.08, "nota": "Incluye holguras en cajas"}], "Cableado de iluminación": [{"material": "Cable THHN calibre 12-14", "consumo": 1.1, "unidad": "ml", "factor": 0.08, "nota": ""}], "Construcción de andenes": [{"material": "Concreto f'c=210 (3000 PSI) para andenes", "consumo": 0.08, "unidad": "m³", "factor": 0.05, "nota": "Espesor estándar 8 cm"}, {"material": "Malla electrosoldada", "consumo": 1.05, "unidad": "m²", "factor": 0.05, "nota": "Refuerzo de retracción"}], "Sardineles y bordillos": [{"material": "Concreto f'c=210 (3000 PSI) para sardinel", "consumo": 0.03, "unidad": "m³", "factor": 0.05, "nota": "Sección estándar 15x25 cm aprox."}]};

function buscarConsumosPorActividad(nombreActividad) {
  if (!nombreActividad) return null;
  const n = nombreActividad.toLowerCase();
  let clave = null;
  if (/concreto/.test(n) && !/ciclópeo/.test(n) && !/mamposter/.test(n)) {
    if (/175|2500\s*psi/.test(n)) clave = "Concreto f'c=175 kg/cm² (2500 PSI)";
    else if (/210|3000\s*psi/.test(n)) clave = "Concreto f'c=210 kg/cm² (3000 PSI)";
    else if (/280|4000\s*psi/.test(n)) clave = "Concreto f'c=280 kg/cm² (4000 PSI)";
    else if (/350|5000\s*psi/.test(n)) clave = "Concreto f'c=350 kg/cm² (5000 PSI)";
    else if (/420|6000\s*psi/.test(n)) clave = "Concreto f'c=420 kg/cm² (6000 PSI)";
    // Si la actividad no menciona la resistencia (ej: "Concreto para columnas/vigas/zapatas"),
    // se asume f'c=210 kg/cm² (3000 PSI), la resistencia estándar más usada en elementos estructurales.
    if (!clave) clave = "Concreto f'c=210 kg/cm² (3000 PSI)";
  } else if (/ciclópeo/.test(n)) {
    clave = 'Concreto ciclópeo';
  } else if (/acero/.test(n)) {
    if (/60\.?000/.test(n)) clave = 'Suministro, figurado y amarre de acero de refuerzo 60.000 PSI';
    else if (/37\.?000/.test(n)) clave = 'Suministro, figurado y amarre de acero de refuerzo 37.000 PSI';
  } else if (/mamposter.*bloque|bloque.*mamposter/.test(n)) {
    clave = 'Mampostería en bloque de concreto';
  } else if (/mamposter.*ladrillo|ladrillo.*mamposter/.test(n)) {
    clave = 'Mampostería en ladrillo';
  } else if (/mamposter.*estructural/.test(n)) {
    clave = 'Mampostería estructural';
  } else if (/pañete|revoque/.test(n) && /interior/.test(n)) {
    clave = 'Pañete / revoque interior';
  } else if (/pañete|revoque/.test(n) && /exterior/.test(n)) {
    clave = 'Pañete / revoque exterior';
  } else if (/estuco/.test(n)) {
    clave = 'Estuco plástico';
  } else if (/piso.*cerámic|cerámic.*piso/.test(n)) {
    clave = 'Piso cerámico';
  } else if (/porcelanat/.test(n)) {
    clave = 'Piso en porcelanato';
  } else if (/pintura.*interior|vinílic.*interior/.test(n)) {
    clave = 'Pintura vinílica interior';
  } else if (/pintura.*exterior/.test(n)) {
    clave = 'Pintura exterior';
  } else if (/cerramiento provisional/.test(n)) {
    clave = 'Cerramiento provisional de obra';
  } else if (/subbase/.test(n)) {
    clave = 'Suministro, extendido y compactación de subbase';
  } else if (/base granular/.test(n)) {
    clave = 'Suministro, extendido y compactación de base granular';
  } else if (/relleno.*seleccionado/.test(n)) {
    clave = 'Relleno con material seleccionado compactado';
  } else if (/perfiles metálicos|montaje.*perfil/.test(n)) {
    clave = 'Suministro y montaje de perfiles metálicos';
  } else if (/grouting cementoso/.test(n)) {
    clave = 'Grouting cementoso para reparación estructural';
  } else if (/drywall|dry wall/.test(n) && /muro/.test(n)) {
    clave = 'Muros en sistema liviano / drywall';
  } else if (/teja/.test(n)) {
    clave = 'Suministro e instalación de teja';
  } else if (/impermeabilización.*cubierta/.test(n)) {
    clave = 'Impermeabilización de cubierta';
  } else if (/cielo raso.*dry ?wall/.test(n)) {
    clave = 'Cielo raso Dry Wall';
  } else if (/impermeabilización.*losa|impermeabilización.*terraza/.test(n)) {
    clave = 'Impermeabilización de losas y terrazas';
  } else if (/impermeabilización.*muro/.test(n)) {
    clave = 'Impermeabilización de muros';
  } else if (/impermeabilización.*húmeda/.test(n)) {
    clave = 'Impermeabilización de zonas húmedas';
  } else if (/pañete impermeabilizado/.test(n)) {
    clave = 'Pañete impermeabilizado';
  } else if (/mortero de nivelación/.test(n)) {
    clave = 'Mortero de nivelación';
  } else if (/piso vinílico/.test(n)) {
    clave = 'Piso vinílico';
  } else if (/piso laminado/.test(n)) {
    clave = 'Piso laminado';
  } else if (/enchape.*cerámic|enchape.*muro/.test(n)) {
    clave = 'Enchape cerámico en muros';
  } else if (/esmalte/.test(n)) {
    clave = 'Pintura esmalte en superficies metálicas/madera';
  } else if (/anticorrosiv/.test(n)) {
    clave = 'Pintura anticorrosiva';
  } else if (/sellador|imprimante/.test(n)) {
    clave = 'Sellador / imprimante';
  } else if (/estuco tradicional/.test(n)) {
    clave = 'Estuco tradicional';
  } else if (/tubería.*agua fría|agua fría.*tubería/.test(n)) {
    clave = 'Tubería de agua fría';
  } else if (/tubería.*agua caliente/.test(n)) {
    clave = 'Tubería de agua caliente';
  } else if (/tubería sanitaria/.test(n)) {
    clave = 'Tubería sanitaria';
  } else if (/tubería.*aguas lluvias/.test(n)) {
    clave = 'Tubería de aguas lluvias';
  } else if (/conduit|tubería.*eléctric/.test(n)) {
    clave = 'Tubería/conduit eléctrica';
  } else if (/cableado de fuerza/.test(n)) {
    clave = 'Cableado de fuerza';
  } else if (/cableado de iluminación/.test(n)) {
    clave = 'Cableado de iluminación';
  } else if (/anden/.test(n)) {
    clave = 'Construcción de andenes';
  } else if (/sardinel|bordillo/.test(n)) {
    clave = 'Sardineles y bordillos';
  }
  if (clave && RENDIMIENTOS_MATERIALES_POR_ACTIVIDAD[clave]) {
    return { clave, materiales: RENDIMIENTOS_MATERIALES_POR_ACTIVIDAD[clave] };
  }
  return null;
}

function buscarMaterialEnLista(materiales, nombreMaterialBuscado) {
  const n = (nombreMaterialBuscado || '').toLowerCase();
  for (const m of materiales) {
    const palabrasClave = m.material.toLowerCase().split(' ').filter(w => w.length > 3);
    if (palabrasClave.some(w => n.includes(w))) return m;
  }
  return null;
}

function consumoMaterialSugeridoPorKeyword(nombreMaterial) {
  if (!nombreMaterial) return null;
  const n = nombreMaterial.toLowerCase();
  const reglas = [
    [/cemento gris/, 350],
    [/arena/, 0.5],
    [/grav(a|illa)|triturado|agregado grueso/, 0.75],
    [/ladrillo/, 40],
    [/bloque/, 12.5],
    [/cerámic|porcelanat/, 1.05],
    [/pintura|esmalte|vinílic/, 0.035],
    [/estuco|yeso/, 1.2],
    [/teja/, 3.5],
    [/alambre/, 0.4],
    [/puntilla|clavo/, 0.15],
    [/varilla|pdr|figurado|acero/, 1.0],
  ];
  for (const [patron, valor] of reglas) {
    if (patron.test(n)) return valor;
  }
  return null;
}

function TablaFilas({ titulo, filas, setFilas, catalogo, mostrarFactor, esMateriales, modoRendimiento, actividadPrincipal, rendimientoActividad }) {
  const actualizar = (i, campo, val) => {
    const nuevas = [...filas];
    nuevas[i] = { ...nuevas[i], [campo]: val };
    setFilas(nuevas);
  };
  const actualizarDesdeSeleccion = (i, seleccion) => {
    const nuevas = [...filas];
    let cantSugerida = nuevas[i].cant;
    let factorSugerido = nuevas[i].factor;
    let fuenteConsumo = "";
    if (esMateriales) {
      const refActividad = buscarConsumosPorActividad(actividadPrincipal);
      const matPorActividad = refActividad ? buscarMaterialEnLista(refActividad.materiales, seleccion.desc) : null;
      if (matPorActividad) {
        if (!cantSugerida) cantSugerida = String(matPorActividad.consumo);
        if (!factorSugerido) factorSugerido = String(Math.round((1 + (matPorActividad.factor || 0)) * 1000) / 1000);
        fuenteConsumo = matPorActividad.nota || `Tabla de referencia: ${refActividad.clave}`;
      } else {
        if (!cantSugerida) {
          const c = consumoMaterialSugeridoPorKeyword(seleccion.desc);
          if (c !== null) { cantSugerida = String(c); fuenteConsumo = "Estimación general por tipo de material (no específica a esta actividad) — verifica el valor real."; }
        }
        if (!factorSugerido) {
          const fct = factorDesperdicioSugerido(seleccion.desc);
          if (fct !== null) factorSugerido = String(Math.round((1 + fct) * 1000) / 1000);
        }
      }
    } else if (modoRendimiento) {
      // Cantidad: por defecto 1 (1 cuadrilla, 1 equipo) — ajústalo si necesitas 2 mezcladoras, 6 palas, etc.
      if (!cantSugerida) cantSugerida = "1";
      if (!factorSugerido) {
        // Rendimiento (tiempo por unidad) de ESTE recurso individual: primero desde el Rendimiento
        // global de la actividad (arriba), y si no hay, por palabra clave de la actividad.
        let rendBase = numES(rendimientoActividad);
        if (!rendBase) rendBase = rendimientoSugeridoPorKeyword(actividadPrincipal);
        if (rendBase) {
          factorSugerido = String(Math.round((1 / rendBase) * 1000000) / 1000000);
          fuenteConsumo = "Sugerido a partir del Rendimiento de la actividad — verifica si este recurso específico rinde distinto.";
        }
      }
    }

    nuevas[i] = {
      ...nuevas[i],
      desc: seleccion.desc,
      fuenteConsumo: fuenteConsumo || nuevas[i].fuenteConsumo,
      und: seleccion.und !== undefined ? seleccion.und : nuevas[i].und,
      vrUnit: seleccion.vrUnit !== undefined ? seleccion.vrUnit : nuevas[i].vrUnit,
      cant: cantSugerida,
      factor: factorSugerido,
    };
    setFilas(nuevas);
  };
  return (
    <div className="mb-4">
      <div
        className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg"
        style={{ background: NAVY }}
      >
        {titulo}
      </div>
      {modoRendimiento && (
        <div className="text-[10.5px] px-3 py-1.5 border border-t-0" style={{ background: "#FFF8E8", borderColor: LINE, color: NAVY }}>
          ⚡ Rendimiento = cuánto tiempo (en jornadas u horas) tarda este recurso en producir 1 unidad de la actividad. Subtotal = Rendimiento × Precio.
        </div>
      )}
      {esMateriales && (
        <div className="text-[10.5px] px-3 py-1.5 border border-t-0" style={{ background: "#FFF8E8", borderColor: LINE, color: NAVY }}>
          ⚡ Al elegir un material, la Cantidad (consumo por unidad de la actividad) y el Factor de desperdicio se sugieren automáticamente según el tipo de material — son valores de referencia general, ajústalos si tu caso es distinto.
        </div>
      )}
      <div className="border border-t-0 rounded-b-lg overflow-visible" style={{ borderColor: LINE }}>
        {filas.map((f, i) => {
          return (
          <div key={i} className="border-b last:border-b-0 p-2.5" style={{ borderColor: LINE }}>
            <div className="mb-2">
              <BuscadorCelda
                valor={f.desc}
                catalogo={catalogo}
                placeholder="Descripción (busca o escribe)"
                onSeleccionar={(sel) => actualizarDesdeSeleccion(i, sel)}
                palabrasClaveActividad={
                  actividadPrincipal
                    ? actividadPrincipal
                        .toLowerCase()
                        .split(/[\s,()]+/)
                        .filter((w) => w.length > 3 && !["para", "incluye", "suministro", "instalación", "montaje", "vaciado", "vibrado", "figurado", "amarre"].includes(w))
                    : []
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Unidad</label>
                <input
                  placeholder="Und"
                  value={f.und}
                  onChange={(e) => actualizar(i, "und", e.target.value)}
                  className="w-full border rounded px-2.5 py-2 text-[13.5px]"
                  style={{ borderColor: LINE }}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">{modoRendimiento ? "Cantidad (cuántos: cuadrillas, equipos...)" : "Cantidad (consumo por unidad)"}</label>
                <div className="flex items-stretch border rounded overflow-hidden" style={{ borderColor: LINE }}>
                  <button
                    type="button"
                    onMouseDown={() => actualizar(i, "cant", String(Math.max(0, (numES(f.cant) || 0) - 1)))}
                    className="px-2.5 text-[15px] font-bold shrink-0"
                    style={{ background: PAPER, color: NAVY }}
                  >
                    −
                  </button>
                  <input
                    type="text" inputMode="decimal"
                    value={f.cant}
                    onChange={(e) => actualizar(i, "cant", e.target.value)}
                    className="flex-1 px-1 py-2 text-[13.5px] min-w-0 text-center"
                    style={{ border: "none", background: mostrarFactor ? "#FFF8E8" : "white" }}
                  />
                  <button
                    type="button"
                    onMouseDown={() => actualizar(i, "cant", String((numES(f.cant) || 0) + 1))}
                    className="px-2.5 text-[15px] font-bold shrink-0"
                    style={{ background: PAPER, color: NAVY }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className={mostrarFactor ? "grid grid-cols-2 gap-2" : ""}>
              {mostrarFactor && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">{modoRendimiento ? "Rendimiento (tiempo por unidad)" : "Factor de desperdicio"}</label>
                  <input
                    placeholder={modoRendimiento ? "Ej: 0.1" : "Ej: 1.05"}
                    type="text" inputMode="decimal"
                    value={f.factor}
                    onChange={(e) => actualizar(i, "factor", e.target.value)}
                    className="w-full border rounded px-2.5 py-2 text-[13.5px]"
                    style={{ borderColor: LINE }}
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Precio Unitario</label>
                <input
                  placeholder="Vr Unit."
                  type="text" inputMode="decimal"
                  value={f.vrUnit}
                  onChange={(e) => actualizar(i, "vrUnit", e.target.value)}
                  className="w-full border rounded px-2.5 py-2 text-[13.5px]"
                  style={{ borderColor: LINE }}
                />
              </div>
            </div>

          {(esMateriales || modoRendimiento) && f.fuenteConsumo && (
            <div className="text-[10px] text-gray-500 px-2 pb-1 italic">
              📎 {f.fuenteConsumo}
            </div>
          )}
          {(f.cant || f.vrUnit) && (
            <div className="text-[10.5px] text-right px-2 pb-1.5 font-medium" style={{ color: NAVY }}>
              Subtotal: $ {sumarTabla([f]).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setFilas([...filas, filaVacia()])}
        className="w-full py-2 rounded-b-lg text-[12px] font-semibold border-2 border-t-0"
        style={{ borderColor: LINE, color: NAVY, background: "white" }}
      >
        + Agregar fila
      </button>
    </div>
  );
}

const filaVacia = () => ({ desc: "", und: "", cant: "", vrUnit: "", factor: "", fuenteConsumo: "" });
const seisFilasVacias = () => Array.from({ length: 6 }, filaVacia);

export default function FormularioAPU({ onVolver, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [actividad, setActividad] = useState(null);
  const [proyecto, setProyecto] = useState("");
  const [noContrato, setNoContrato] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [cuadrilla, setCuadrilla] = useState("");
  const [jornada, setJornada] = useState(8);
  const [rendimiento, setRendimiento] = useState("");
  const [numCuadrillas, setNumCuadrillas] = useState(1);
  const [rendimientoBase, setRendimientoBase] = useState(null);
  const [cuadrillaBase, setCuadrillaBase] = useState(null);

  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Precios: los que el administrador mantiene en la nube (o, si aún no hay, los que trae el código)
  const catMateriales = useMemo(() => catalogoVigente("materiales"), []);
  const catManoObra = useMemo(() => catalogoVigente("mano_obra"), []);
  const catEquipos = useMemo(() => catalogoVigente("equipos"), []);
  const [materiales, setMateriales] = useState(seisFilasVacias());
  const [manoObra, setManoObra] = useState(seisFilasVacias());
  const [equipos, setEquipos] = useState(seisFilasVacias());

  const [elaboradoNombre, setElaboradoNombre] = useState("");
  const [elaboradoCargo, setElaboradoCargo] = useState("");
  const [interventoriaNombre, setInterventoriaNombre] = useState("");
  const [interventoriaCargo, setInterventoriaCargo] = useState("");

  const [generando, setGenerando] = useState(false);

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_apu"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_apu"); } catch (e) { return true; }
  });

  function restaurarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_apu") || "null");
      if (d) {
        setActividad(d.actividad || null); setProyecto(d.proyecto || ""); setNoContrato(d.noContrato || "");
        setUbicacion(d.ubicacion || ""); setCuadrilla(d.cuadrilla || ""); setJornada(d.jornada ?? 8);
        setRendimiento(d.rendimiento || ""); setNumCuadrillas(d.numCuadrillas ?? 1);
        setMateriales(d.materiales || seisFilasVacias()); setManoObra(d.manoObra || seisFilasVacias()); setEquipos(d.equipos || seisFilasVacias());
        setElaboradoNombre(d.elaboradoNombre || ""); setElaboradoCargo(d.elaboradoCargo || "");
        setInterventoriaNombre(d.interventoriaNombre || ""); setInterventoriaCargo(d.interventoriaCargo || "");
      }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    try { localStorage.removeItem("ryr_borrador_apu"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }

  React.useEffect(() => {
    if (!borradorAplicado) return;
    try {
      localStorage.setItem("ryr_borrador_apu", JSON.stringify({
        actividad, proyecto, noContrato, ubicacion, cuadrilla, jornada, rendimiento, numCuadrillas,
        materiales, manoObra, equipos, elaboradoNombre, elaboradoCargo, interventoriaNombre, interventoriaCargo,
      }));
    } catch (e) {}
  }, [borradorAplicado, actividad, proyecto, noContrato, ubicacion, cuadrilla, jornada, rendimiento, numCuadrillas, materiales, manoObra, equipos, elaboradoNombre, elaboradoCargo, interventoriaNombre, interventoriaCargo]);

  const totalDirectoUnitarioVista = useMemo(() => {
    return sumarTabla(materiales) + sumarTabla(manoObra) + sumarTabla(equipos);
  }, [materiales, manoObra, equipos]);

  const unidadRendimiento = actividad ? `${actividad.unidad}/jornada` : "";

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      const nombreActividad = ws.getCell("A9").value;
      if (nombreActividad) setActividad({ actividad: String(nombreActividad), unidad: ws.getCell("P4").value || "" });
      setCuadrilla(ws.getCell("S4").value || "");
      setJornada(ws.getCell("U4").value || 8);
      setRendimiento(ws.getCell("V4").value || "");
      setProyecto(ws.getCell("C12").value || "");
      setNoContrato(ws.getCell("C13").value || "");
      setUbicacion(ws.getCell("J14").value || "");

      const leerFilas = (filaInicio, conFactor) => {
        const filas = [];
        for (let i = 0; i < 15; i++) {
          const r = filaInicio + i;
          const desc = ws.getCell(`A${r}`).value;
          if (desc) {
            filas.push({
              desc: String(desc),
              und: ws.getCell(`E${r}`).value || "",
              cant: String(ws.getCell(`F${r}`).value || ""),
              factor: conFactor ? String(ws.getCell(`G${r}`).value || "") : "",
              vrUnit: String(ws.getCell(`H${r}`).value || ""),
            });
          }
        }
        while (filas.length < 6) filas.push(filaVacia());
        return filas;
      };
      setMateriales(leerFilas(21, true));
      setManoObra(leerFilas(39, true));
      setEquipos(leerFilas(57, true));

      setElaboradoNombre(ws.getCell("C53").value || "");
      setElaboradoCargo(ws.getCell("C54").value || "");
      setInterventoriaNombre(ws.getCell("H53").value || "");
      setInterventoriaCargo(ws.getCell("H54").value || "");

      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea un APU generado por este sistema.");
    } finally {
      setCargando(false);
    }
  }

  async function generarExcel() {
    if (!actividad) {
      alert("Selecciona primero la actividad del catálogo.");
      return;
    }
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-apu.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const fotoEstilo = fotoLibro(workbook);
      const ws = workbook.getWorksheet("Apu's");

      ws.getCell("A9").value = (actividad.actividad || "").toUpperCase();
      ws.getCell("P4").value = actividad.unidad;
      ws.getCell("S4").value = cuadrilla;
      ws.getCell("U4").value = numES(jornada) || 0;
      ws.getCell("V4").value = numES(rendimiento) || 0;

      ws.getCell("C12").value = proyecto;
      ws.getCell("C13").value = noContrato;
      ws.getCell("J13").value = fechaDDMMYYYY();
      ws.getCell("J14").value = ubicacion;

      const escribirFilas = (filas, filaInicio, conFactor) => {
        filas.forEach((f, i) => {
          const r = filaInicio + i;
          if (!f.desc) return;
          ws.getCell(`A${r}`).value = f.desc;
          ws.getCell(`E${r}`).value = f.und;
          ws.getCell(`F${r}`).value = numES(f.cant) || 0;
          if (conFactor) ws.getCell(`G${r}`).value = numES(f.factor) || 1;
          ws.getCell(`H${r}`).value = numES(f.vrUnit) || 0;
        });
      };
      escribirFilas(materiales, 21, true);
      escribirFilas(manoObra, 39, true);
      escribirFilas(equipos, 57, true);

      const totalDirectoUnitario = sumarTabla(materiales) + sumarTabla(manoObra) + sumarTabla(equipos);

      try {
        const clave = "ryr_apus_guardados";
        const guardados = JSON.parse(localStorage.getItem(clave) || "{}");
        const equiposUsados = equipos.filter((e) => e.desc).map((e) => e.desc).join(", ");
        const moUsada = manoObra.filter((m) => m.desc).map((m) => m.desc).join(", ");
        guardados[actividad.actividad.trim().toLowerCase()] = {
          actividad: actividad.actividad,
          unidad: actividad.unidad,
          total: totalDirectoUnitario,
          rendimiento: numES(rendimiento) || 0,
          cuadrilla: cuadrilla || "",
          equipos: equiposUsados,
          manoObra: moUsada,
          fecha: fechaLocalHoy(),
        };
        localStorage.setItem(clave, JSON.stringify(guardados));
      } catch (e) {
        console.warn("No se pudo guardar el APU en memoria local:", e);
      }

      ws.getCell("C53").value = elaboradoNombre;
      ws.getCell("C54").value = elaboradoCargo;
      ws.getCell("H53").value = interventoriaNombre;
      ws.getCell("H54").value = interventoriaCargo;

      estilarEscritos(workbook, fotoEstilo);

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `APU_${actividad.actividad.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      try { localStorage.removeItem("ryr_borrador_apu"); } catch (e) {}
    } catch (err) {
      console.error(err);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
  }

  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes un APU sin terminar</div>
        <div className="text-[12.5px] text-gray-500 mb-5">Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel. ¿Quieres continuar donde quedaste?</div>
        <button onClick={restaurarBorrador} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
          ▶ Continuar donde quedé
        </button>
        <button onClick={descartarBorrador} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
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
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="apus" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center gap-2 mb-3">
          {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} />}
          <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Menú SAIEA OBRAS
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              APU's
            </div>
            <div className="text-[11px] mb-1" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
            <IndicadorTipoProyecto claveBorrador="ryr_borrador_apu" onVolver={onVolver} />
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            APU nuevo
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el APU que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}
        <Campo label="Actividad">
          <BuscadorActividad
            value={actividad?.actividad}
            onSelect={(a) => {
              const hayDatosLlenados = materiales.some((f) => f.desc) || manoObra.some((f) => f.desc) || equipos.some((f) => f.desc);
              if (hayDatosLlenados) {
                const confirmar = window.confirm("Ya tienes Materiales/Mano de Obra/Equipos llenados para la actividad anterior. Al cambiar de actividad, esos datos se borrarán. ¿Continuar?");
                if (!confirmar) return;
              }
              setActividad(a);
              setMateriales(seisFilasVacias());
              setManoObra(seisFilasVacias());
              setEquipos(seisFilasVacias());
              const rendSugerido = RENDIMIENTOS_REFERENCIA[a.actividad] !== undefined
                ? RENDIMIENTOS_REFERENCIA[a.actividad]
                : rendimientoSugeridoPorKeyword(a.actividad);
              const cuadSugerida = CUADRILLAS_REFERENCIA[a.actividad] || (() => {
                const c = cuadrillaSugeridaPorKeyword(a.actividad);
                return c ? { cuadrilla: c, personas: null } : null;
              })();
              if (rendSugerido !== undefined && rendSugerido !== null) {
                setRendimientoBase(rendSugerido);
                setRendimiento(String(rendSugerido * numCuadrillas));
              } else {
                setRendimientoBase(null);
              }
              if (cuadSugerida) {
                setCuadrillaBase(cuadSugerida.cuadrilla);
                setCuadrilla(numCuadrillas > 1 ? `${numCuadrillas}× (${cuadSugerida.cuadrilla})` : cuadSugerida.cuadrilla);
              } else {
                setCuadrillaBase(null);
              }
            }}
          />
          {actividad && (
            <div className="text-[11.5px] mt-1.5 text-gray-500">
              Unidad: <b style={{ color: NAVY }}>{actividad.unidad}</b> · Capítulo: {actividad.capitulo}
            </div>
          )}
          {actividad && rendimientoBase !== null && (
            <div className="text-[11px] mt-1" style={{ color: GOLD }}>
              ⚡ Rendimiento sugerido: {rendimientoBase} {actividad.unidad}/jornada por cuadrilla (promedio del sector — ajústalo según tu experiencia)
            </div>
          )}
          {actividad && DESPERDICIO_REFERENCIA[actividad.actividad] !== undefined && (
            <div className="text-[11px] mt-1" style={{ color: GOLD }}>
              ⚡ Desperdicio típico de esta actividad: ~{(DESPERDICIO_REFERENCIA[actividad.actividad] * 100).toFixed(0)}% — considera aumentarlo en las cantidades de materiales de abajo.
            </div>
          )}
        </Campo>

        <button
          type="button"
          onClick={() => {
            try {
              const lista = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
              if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
              const d = lista[0].datos;
              setProyecto(d.proyecto || "");
              setNoContrato(d.noContrato || "");
              setUbicacion(d.ubicacion || "");
              alert(`Datos traídos de: "${lista[0].nombreId}"`);
            } catch (e) {
              alert("No se pudo leer la memoria de Ficha Técnica.");
            }
          }}
          className="w-full text-center py-2.5 rounded-lg text-[12.5px] font-semibold text-white mb-3"
          style={{ background: NAVY }}
        >
          📋 Traer datos desde la última Ficha Técnica guardada
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Proyecto">
            <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} />
          </Campo>
          <Campo label="No. de Contrato">
            <Input value={noContrato} onChange={(e) => setNoContrato(e.target.value)} />
          </Campo>
        </div>
        <Campo label="Ubicación">
          <BuscadorTexto
            value={ubicacion}
            onChange={setUbicacion}
            catalogo={CATALOGO_CIUDADES}
            campo="ciudad"
            placeholder="Ciudad..."
          />
        </Campo>

        {rendimientoBase !== null && (
          <Campo label="Número de cuadrillas trabajando en paralelo">
            <input
              type="text" inputMode="decimal"
              min="1"
              value={numCuadrillas}
              onChange={(e) => {
                const n = Math.max(1, numES(e.target.value) || 1);
                setNumCuadrillas(n);
                setRendimiento(String(rendimientoBase * n));
                if (cuadrillaBase) {
                  setCuadrilla(n > 1 ? `${n}× (${cuadrillaBase})` : cuadrillaBase);
                }
              }}
              className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
              style={{ borderColor: LINE }}
            />
            <div className="text-[11px] text-gray-500 mt-1">
              Si aumentas este número, la cuadrilla y el rendimiento se ajustan solos (mismo trabajo, más manos).
            </div>
          </Campo>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Campo label="Cuadrilla">
            <Input
              value={cuadrilla}
              onChange={(e) => setCuadrilla(e.target.value)}
              placeholder="Ej: 1 Oficial + 2 Ayudantes"
            />
          </Campo>
          <Campo label="Jornada (h)">
            <Input type="text" inputMode="decimal" value={jornada} onChange={(e) => setJornada(e.target.value)} />
          </Campo>
          <Campo label={`Rendimiento (${unidadRendimiento || "…"})`}>
            <Input type="text" inputMode="decimal" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} />
          </Campo>
        </div>

        <TablaFilas titulo="1. MATERIALES" filas={materiales} setFilas={setMateriales} catalogo={catMateriales} mostrarFactor esMateriales actividadPrincipal={actividad?.actividad} />
        <TablaFilas titulo="2. MANO DE OBRA" filas={manoObra} setFilas={setManoObra} catalogo={catManoObra} mostrarFactor modoRendimiento actividadPrincipal={actividad?.actividad} rendimientoActividad={rendimiento} />
        <TablaFilas titulo="3. EQUIPOS Y HERRAMIENTAS" filas={equipos} setFilas={setEquipos} catalogo={catEquipos} mostrarFactor modoRendimiento actividadPrincipal={actividad?.actividad} rendimientoActividad={rendimiento} />

        <div
          className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2"
          style={{ background: NAVY }}
        >
          FIRMAS
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 grid grid-cols-2 gap-3" style={{ borderColor: LINE }}>
          <div>
            <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>
              Elaborado por
            </div>
            <CampoNombre value={elaboradoNombre} onChange={setElaboradoNombre} />
            <div className="h-2" />
            <BuscadorTexto value={elaboradoCargo} onChange={setElaboradoCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <div>
            <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>
              Vo. Bo. Interventoría
            </div>
            <CampoNombre value={interventoriaNombre} onChange={setInterventoriaNombre} />
            <div className="h-2" />
            <BuscadorTexto value={interventoriaCargo} onChange={setInterventoriaCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
        </div>

        <div className="p-3 rounded-lg mb-3 text-center" style={{ background: NAVY }}>
          <div className="text-[11px]" style={{ color: GOLD }}>TOTAL DIRECTO UNITARIO DEL APU</div>
          <div className="text-white font-bold text-[19px]">
            $ {totalDirectoUnitarioVista.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : "Descargar APU en Excel"}
        </button>
      </div>
    </div>
  );
}
