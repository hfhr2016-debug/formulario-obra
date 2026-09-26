import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";
import MenuLateral, { BotonMenu } from "./MenuLateral";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
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
const CATALOGO_APU = [{"actividad": "Localización y Replanteo", "unidad": "M²", "capitulo": "PRELIMINARES"}, {"actividad": "Cerramiento provisional de obra", "unidad": "ML", "capitulo": "PRELIMINARES"}, {"actividad": "Instalación de campamento y oficinas provisionales", "unidad": "M²", "capitulo": "PRELIMINARES"}, {"actividad": "Adecuación de área de almacenamiento", "unidad": "M²", "capitulo": "PRELIMINARES"}, {"actividad": "Señalización preventiva e informativa de obra", "unidad": "UND", "capitulo": "PRELIMINARES"}, {"actividad": "Instalaciones provisionales de agua y energía", "unidad": "GL", "capitulo": "PRELIMINARES"}, {"actividad": "Protección de elementos existentes", "unidad": "M²", "capitulo": "PRELIMINARES"}, {"actividad": "Desmonte y limpieza inicial", "unidad": "M²", "capitulo": "PRELIMINARES"}, {"actividad": "Demoliciones preliminares", "unidad": "M³", "capitulo": "PRELIMINARES"}, {"actividad": "Desmantelamiento de estructuras metálicas existentes", "unidad": "KG", "capitulo": "PRELIMINARES"}, {"actividad": "Excavación manual en material común", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Excavación mecánica", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Excavación en roca", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Perfilado y conformación de excavaciones", "unidad": "M²", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Relleno con material seleccionado compactado", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Relleno con material proveniente de excavación", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Suministro, extendido y compactación de subbase", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Suministro, extendido y compactación de base granular", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Cargue de material sobrante", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Transporte de material sobrante", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Disposición final de sobrantes", "unidad": "M³", "capitulo": "MOVIMIENTO DE TIERRAS"}, {"actividad": "Concreto de f'c = 175 kg/cm² (2500 PSI), incluye vaciado", "unidad": "M³", "capitulo": "CIMENTACIONES"}, {"actividad": "Concreto ciclópeo, incluye vaciado", "unidad": "M³", "capitulo": "CIMENTACIONES"}, {"actividad": "Concreto de f'c = 210 kg/cm² (3000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "CIMENTACIONES"}, {"actividad": "Concreto de f'c = 280 kg/cm² (4000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "CIMENTACIONES"}, {"actividad": "Concreto de f'c = 350 kg/cm² (5000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "CIMENTACIONES"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI", "unidad": "KG", "capitulo": "CIMENTACIONES"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI", "unidad": "KG", "capitulo": "CIMENTACIONES"}, {"actividad": "Concreto de f'c = 210 kg/cm² (3000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "ESTRUCTURA"}, {"actividad": "Concreto de f'c = 280 kg/cm² (4000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "ESTRUCTURA"}, {"actividad": "Concreto de f'c = 350 kg/cm² (5000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "ESTRUCTURA"}, {"actividad": "Concreto de f'c = 420 kg/cm² (6000 PSI), incluye vaciado y vibrado", "unidad": "M³", "capitulo": "ESTRUCTURA"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI", "unidad": "KG", "capitulo": "ESTRUCTURA"}, {"actividad": "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI", "unidad": "KG", "capitulo": "ESTRUCTURA"}, {"actividad": "Suministro y montaje de perfiles metálicos", "unidad": "KG", "capitulo": "ESTRUCTURA"}, {"actividad": "Placas, pernos y conexiones metálicas", "unidad": "KG", "capitulo": "ESTRUCTURA"}, {"actividad": "Grouting cementoso para reparación estructural", "unidad": "M²", "capitulo": "ESTRUCTURA"}, {"actividad": "Grouting epóxico para reparación estructural", "unidad": "M²", "capitulo": "ESTRUCTURA"}, {"actividad": "Mampostería en bloque de concreto", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Mampostería en ladrillo", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Mampostería estructural", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Muros en sistema liviano / drywall", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Dinteles sobre vanos", "unidad": "ML", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Alfajías y remates", "unidad": "ML", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Anclajes y refuerzos de mampostería", "unidad": "UND", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Mampostería en ladrillo a la vista (no reforzada)", "unidad": "M²", "capitulo": "MAMPOSTERÍA"}, {"actividad": "Estructura metálica o de madera para cubierta", "unidad": "KG", "capitulo": "CUBIERTAS"}, {"actividad": "Cerchas y elementos estructurales", "unidad": "KG", "capitulo": "CUBIERTAS"}, {"actividad": "Suministro e instalación de teja", "unidad": "M²", "capitulo": "CUBIERTAS"}, {"actividad": "Impermeabilización de cubierta", "unidad": "M²", "capitulo": "CUBIERTAS"}, {"actividad": "Aislamiento térmico/acústico", "unidad": "M²", "capitulo": "CUBIERTAS"}, {"actividad": "Canales de aguas lluvias", "unidad": "ML", "capitulo": "CUBIERTAS"}, {"actividad": "Bajantes de aguas lluvias", "unidad": "ML", "capitulo": "CUBIERTAS"}, {"actividad": "Cielo raso Dry Wall", "unidad": "M²", "capitulo": "CUBIERTAS"}, {"actividad": "Cielo raso en lámina acústica de fibra mineral", "unidad": "M²", "capitulo": "CUBIERTAS"}, {"actividad": "Impermeabilización de losas y terrazas", "unidad": "M²", "capitulo": "IMPERMEABILIZACIONES"}, {"actividad": "Impermeabilización de muros", "unidad": "M²", "capitulo": "IMPERMEABILIZACIONES"}, {"actividad": "Impermeabilización de zonas húmedas", "unidad": "M²", "capitulo": "IMPERMEABILIZACIONES"}, {"actividad": "Geomembrana HDPE para impermeabilización de terrenos", "unidad": "M²", "capitulo": "IMPERMEABILIZACIONES"}, {"actividad": "Pañete / revoque interior", "unidad": "M²", "capitulo": "PAÑETES Y REVOQUES"}, {"actividad": "Pañete / revoque exterior", "unidad": "M²", "capitulo": "PAÑETES Y REVOQUES"}, {"actividad": "Pañete impermeabilizado", "unidad": "M²", "capitulo": "PAÑETES Y REVOQUES"}, {"actividad": "Mortero de nivelación", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Piso cerámico", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Piso en porcelanato", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Piso vinílico", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Piso laminado", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Enchape cerámico en muros", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Guardaescoba", "unidad": "ML", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Juntas de dilatación / construcción", "unidad": "ML", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Piso en concreto afinado con endurecedor de cuarzo", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Baldosa de granito", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Enchape en granito pulido", "unidad": "M²", "capitulo": "PISOS Y ENCHAPES"}, {"actividad": "Pintura vinílica interior", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Pintura exterior", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Pintura anticorrosiva", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Sellador / imprimante", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Estuco plástico", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Estuco tradicional", "unidad": "M²", "capitulo": "PINTURA"}, {"actividad": "Puertas de madera", "unidad": "UND", "capitulo": "CARPINTERÍA"}, {"actividad": "Muebles fijos de madera", "unidad": "ML", "capitulo": "CARPINTERÍA"}, {"actividad": "Puertas metálicas", "unidad": "UND", "capitulo": "CARPINTERÍA"}, {"actividad": "Barandas metálicas", "unidad": "ML", "capitulo": "CARPINTERÍA"}, {"actividad": "Pasamanos", "unidad": "ML", "capitulo": "CARPINTERÍA"}, {"actividad": "Ventanas de aluminio", "unidad": "M²", "capitulo": "CARPINTERÍA"}, {"actividad": "Divisiones de aluminio", "unidad": "M²", "capitulo": "CARPINTERÍA"}, {"actividad": "Puerta antipánico", "unidad": "UND", "capitulo": "CARPINTERÍA"}, {"actividad": "Vidrio templado", "unidad": "M²", "capitulo": "VIDRIOS"}, {"actividad": "Vidrio laminado", "unidad": "M²", "capitulo": "VIDRIOS"}, {"actividad": "Espejos", "unidad": "M²", "capitulo": "VIDRIOS"}, {"actividad": "Sellos y silicona", "unidad": "ML", "capitulo": "VIDRIOS"}, {"actividad": "Tubería de agua fría", "unidad": "ML", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Tubería de agua caliente", "unidad": "ML", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Válvulas y accesorios hidrosanitarios", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Tubería sanitaria", "unidad": "ML", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Tubería de aguas lluvias", "unidad": "ML", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Cajas de inspección", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Aparatos sanitarios", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Lavamanos", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Griferías", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Duchas", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "GL", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Orinal institucional", "unidad": "UND", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, {"actividad": "Tubería/conduit eléctrica", "unidad": "ML", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Bandejas portacables", "unidad": "ML", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Cajas eléctricas", "unidad": "UND", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Cableado de fuerza", "unidad": "ML", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Cableado de iluminación", "unidad": "ML", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Tableros eléctricos", "unidad": "UND", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Tomacorrientes", "unidad": "UND", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Interruptores", "unidad": "UND", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Luminarias", "unidad": "UND", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Sistema de puesta a tierra", "unidad": "GL", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Pruebas y certificaciones", "unidad": "GL", "capitulo": "INSTALACIONES ELÉCTRICAS"}, {"actividad": "Cableado estructurado de datos", "unidad": "ML", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Rack de comunicaciones", "unidad": "UND", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Cámaras y sistema CCTV", "unidad": "UND", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Control de acceso", "unidad": "UND", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Sistema de citofonía", "unidad": "UND", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Sistema de detección de incendios", "unidad": "GL", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, {"actividad": "Equipos de aire acondicionado", "unidad": "UND", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"actividad": "Ductos de ventilación", "unidad": "M²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"actividad": "Tubería de refrigerante", "unidad": "ML", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"actividad": "Rejillas y difusores", "unidad": "UND", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, {"actividad": "Red interna de gas", "unidad": "ML", "capitulo": "GAS"}, {"actividad": "Válvulas y accesorios de gas", "unidad": "UND", "capitulo": "GAS"}, {"actividad": "Pruebas y certificación", "unidad": "GL", "capitulo": "GAS"}, {"actividad": "Construcción de andenes", "unidad": "M²", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Placas de concreto exteriores", "unidad": "M³", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Pavimento en adoquín", "unidad": "M²", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Sardineles y bordillos", "unidad": "ML", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Sumideros exteriores", "unidad": "UND", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Suministro y extendido de tierra vegetal", "unidad": "M³", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Siembra y jardinería", "unidad": "M²", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Geotextil para drenaje y filtración", "unidad": "M²", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Gaviones para obras de contención", "unidad": "M³", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Filtro francés (drenaje de terrenos)", "unidad": "ML", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Revegetalización / empradización", "unidad": "M²", "capitulo": "URBANISMO Y EXTERIORES"}, {"actividad": "Rejas metálicas", "unidad": "M²", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"actividad": "Escaleras metálicas", "unidad": "KG", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"actividad": "Elementos metálicos especiales", "unidad": "KG", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"actividad": "Mobiliario fijo de obra", "unidad": "UND", "capitulo": "OBRAS COMPLEMENTARIAS"}, {"actividad": "Limpieza gruesa y fina de obra", "unidad": "M²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"actividad": "Limpieza final para entrega", "unidad": "M²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "GL", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"actividad": "Actualización de planos récord / as-built", "unidad": "GL", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"actividad": "Entrega, manuales y acta de recibo", "unidad": "GL", "capitulo": "ASEO, ENTREGA Y CIERRE"}, {"actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "UND", "capitulo": "ASCENSORES"}, {"actividad": "Estudio de suelos y geotecnia", "unidad": "GL", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "GL", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "GL", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, {"actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "GL", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}];

const CATALOGO_CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];
const CATALOGO_ESPECIALIDADES = ["Obra Civil", "Estructuras", "Obras Hidrosanitarias", "Obras Eléctricas", "Gas", "Climatización y Ventilación (HVAC)", "Comunicaciones y Seguridad", "Ascensores", "Acabados y Arquitectura", "Mampostería", "Cubiertas e Impermeabilización", "Carpintería y Vidrios", "Pintura", "Urbanismo y Exteriores", "Diseño Arquitectónico", "Diseño Estructural", "Interventoría", "Topografía", "Geotecnia y Suelos", "Gerencia de Proyecto"];
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal"];

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

const CATALOGO_MATERIALES = [{"codigo": "B0020001", "unidad": "kg", "descripcion": "Acero A-36 para estructura metálica", "precio": 3920.0}, {"codigo": "B0020004", "unidad": "kg", "descripcion": "Acero A-37", "precio": 3804.0}, {"codigo": "B0020002", "unidad": "kg", "descripcion": "Acero A-40", "precio": 3258.0}, {"codigo": "B0020003", "unidad": "kg", "descripcion": "Acero PDR-60", "precio": 3339.0}, {"codigo": "B002001", "unidad": "kg", "descripcion": "Acero suministrado y figurado PDR 60", "precio": 2050.0}, {"codigo": "B003003", "unidad": "kg", "descripcion": "Aditivo Acelerante de Fraguado", "precio": 10856.0}, {"codigo": "B0030001", "unidad": "kg", "descripcion": "Aditivo curador", "precio": 4887.0}, {"codigo": "B0043070", "unidad": "u", "descripcion": "Adoquín color 10X20X6", "precio": 1113.0}, {"codigo": "B0043080", "unidad": "m2", "descripcion": "Adoquín e=8cm", "precio": 30291.0}, {"codigo": "B0043090", "unidad": "u", "descripcion": "Adoquín grama 10X20X6", "precio": 1099.0}, {"codigo": "B0043071", "unidad": "m2", "descripcion": "Adoquín Gris E=10 Cm", "precio": 30443.0}, {"codigo": "B0063201", "unidad": "lt", "descripcion": "Aglomerante Estabilizador", "precio": 7230.0}, {"codigo": "B0053100", "unidad": "m3", "descripcion": "Agregado para concreto hidráulico", "precio": 55111.0}, {"codigo": "B0053110", "unidad": "m3", "descripcion": "Agregado para tratamiento superf. Doble", "precio": 56826.0}, {"codigo": "B0053120", "unidad": "m3", "descripcion": "Agregado para tratamiento superf. Simple", "precio": 56678.0}, {"codigo": "B0053112", "unidad": "m3", "descripcion": "Agregado para tratamiento superficial doble (primer riego)", "precio": 38600.0}, {"codigo": "B0053114", "unidad": "m3", "descripcion": "Agregado para tratamiento superficial doble (segundo riego)", "precio": 39590.0}, {"codigo": "B0053130", "unidad": "m3", "descripcion": "Agregado petreo para mezclas asfálticas", "precio": 74650.0}, {"codigo": "B0053191", "unidad": "m3", "descripcion": "Agregado Petreo para Triturar (Crudo)", "precio": 25435.0}, {"codigo": "B0053131", "unidad": "m3", "descripcion": "Agregado Petreo para TSS", "precio": 51773.0}, {"codigo": "B0053160", "unidad": "m3", "descripcion": "Agregado tipo LA 10 (lechadas)", "precio": 41502.0}, {"codigo": "B0053150", "unidad": "m3", "descripcion": "Agregado tipo LA 13 (lechadas)", "precio": 49840.0}, {"codigo": "B0053180", "unidad": "m3", "descripcion": "Agregado tipo LA 4 (lechadas)", "precio": 51479.0}, {"codigo": "B0053170", "unidad": "m3", "descripcion": "Agregado tipo LA 5 (lechadas)", "precio": 54690.0}, {"codigo": "B0053190", "unidad": "m3", "descripcion": "Agregados seleccionados (tamaño máximo 1´´) (bandas sonoras reduce velocidad)", "precio": 63868.0}, {"codigo": "B0063200", "unidad": "lt", "descripcion": "Agua", "precio": 51.0}, {"codigo": "B0073210", "unidad": "m", "descripcion": "Alambre de púa calibre 12 (350 m)", "precio": 435.0}, {"codigo": "B0073211", "unidad": "kg", "descripcion": "Alambre Galvanizado Aleación Zn-5A1-Mm", "precio": 4828.0}, {"codigo": "B0073222", "unidad": "kg", "descripcion": "Alambre Galvanizado Aleación Zn-5A1-Mm Y Pvc", "precio": 3550.0}, {"codigo": "B0073220", "unidad": "kg", "descripcion": "Alambre galvanizado No. 12", "precio": 5342.0}, {"codigo": "B0073221", "unidad": "kg", "descripcion": "Alambre Galvanizado Zinc Y Pvc", "precio": 3802.0}, {"codigo": "B026012", "unidad": "kg", "descripcion": "Alambre Negro Para Amarre", "precio": 3904.0}, {"codigo": "B0073230", "unidad": "kg", "descripcion": "Alambre negro para amarre calibre 18", "precio": 3787.0}, {"codigo": "B031001", "unidad": "u", "descripcion": "Almohadillas de neopreno dureza 60 (35cm*45cm*5cm con 2 laminas de 3mm)", "precio": 348706.0}, {"codigo": "B026011", "unidad": "u", "descripcion": "Amortiguadores (Para Defensas Metálicas), Incluye Tornillos", "precio": 27019.0}, {"codigo": "B0113260", "unidad": "u", "descripcion": "Anclaje para fijación del manto", "precio": 633.0}, {"codigo": "B0013770", "unidad": "u", "descripcion": "Anclajes o Cuñas para el tensionamiento", "precio": 10390.0}, {"codigo": "B0013270", "unidad": "kg", "descripcion": "Anfo", "precio": 4345.0}, {"codigo": "B0013280", "unidad": "m", "descripcion": "Angulo de 1-1/2´´ x 1/4´´ (cerramiento en malla)", "precio": 10091.0}, {"codigo": "B0063290", "unidad": "kg", "descripcion": "Antisol blanco (presentación 20 kg)", "precio": 5851.0}, {"codigo": "B0303300", "unidad": "u", "descripcion": "Árbol de 0.6 m (Protector)", "precio": 555.0}, {"codigo": "B0303310", "unidad": "u", "descripcion": "Árbol de 1.2 m (Paisajístico)", "precio": 17885.0}, {"codigo": "B0093320", "unidad": "m3", "descripcion": "Arena de sello (fina)", "precio": 44855.0}, {"codigo": "B0093330", "unidad": "m3", "descripcion": "Arena de soporte (media)", "precio": 44986.0}, {"codigo": "B0093321", "unidad": "m3", "descripcion": "Arena de Trituración", "precio": 34710.0}, {"codigo": "B009111", "unidad": "m3", "descripcion": "Arena de trituración (sellos de arena-afalto)", "precio": 29950.0}, {"codigo": "B0093350", "unidad": "m3", "descripcion": "Arena lavada", "precio": 39496.0}, {"codigo": "B0013281", "unidad": "m", "descripcion": "Armadura de Acero", "precio": 2900.0}, {"codigo": "B0083360", "unidad": "kg", "descripcion": "Asfalto AP 190 (BREA)", "precio": 3200.0}, {"codigo": "B008007", "unidad": "lt", "descripcion": "Asfalto liquido", "precio": 1960.0}, {"codigo": "B008009", "unidad": "gal", "descripcion": "Asfalto liquido RC 250", "precio": 7188.0}, {"codigo": "B0013380", "unidad": "kg", "descripcion": "Barras de transferencia de carga (1'')", "precio": 4080.0}, {"codigo": "B0013390", "unidad": "kg", "descripcion": "Barras de unión de 1/2´´", "precio": 3538.0}, {"codigo": "B0013400", "unidad": "m3", "descripcion": "Base Granular reciclada en obra", "precio": 21560.0}, {"codigo": "B0013410", "unidad": "kg", "descripcion": "Bentonita", "precio": 5460.0}, {"codigo": "B0013420", "unidad": "m2", "descripcion": "Biomanto", "precio": 101260.0}, {"codigo": "B0013435", "unidad": "m2", "descripcion": "Biomanto Temporal  300 Gr/M2", "precio": 3450.0}, {"codigo": "B0013430", "unidad": "m3", "descripcion": "Bolsacreto de 1m3", "precio": 27289.0}, {"codigo": "B0013436", "unidad": "u", "descripcion": "Bordillo Prefabricado En Concreto Ref.A85 Ntc-4109, 0,20 X 0,35 X 0.80 M", "precio": 22700.0}, {"codigo": "B0013432", "unidad": "u", "descripcion": "Botella de gas propano (40 lb) (5% de oxígeno)", "precio": 38450.0}, {"codigo": "B0013434", "unidad": "u", "descripcion": "Botella de oxígeno (1800 lb)", "precio": 50333.0}, {"codigo": "B0320001", "unidad": "m", "descripcion": "Cable de 1/2´´ (para anclajes)", "precio": 7060.0}, {"codigo": "B0013450", "unidad": "kg", "descripcion": "Cal", "precio": 1106.0}, {"codigo": "B0013460", "unidad": "kg", "descripcion": "Camisa metálica en acero A-37", "precio": 9727.0}, {"codigo": "B0013470", "unidad": "m", "descripcion": "Camisas y Formaleta en Concreto", "precio": 42994.0}, {"codigo": "B0013480", "unidad": "u", "descripcion": "Captafaro, Incluye Tornillos", "precio": 12559.0}, {"codigo": "B0013484", "unidad": "u", "descripcion": "Celda especial de carga", "precio": 11501890.0}, {"codigo": "B0103501", "unidad": "kg", "descripcion": "Cemento Asfaltico 40-50", "precio": 1200.0}, {"codigo": "B0103490", "unidad": "kg", "descripcion": "Cemento Asfaltico 60-70", "precio": 1100.0}, {"codigo": "B0103500", "unidad": "kg", "descripcion": "Cemento Asfaltico 80-100", "precio": 1210.0}, {"codigo": "B0103555", "unidad": "kg", "descripcion": "Cemento Asfaltico con grano de Caucho Reciclado", "precio": 1812.0}, {"codigo": "B0103491", "unidad": "kg", "descripcion": "Cemento Asfáltico", "precio": 1100.0}, {"codigo": "B0103551", "unidad": "kg", "descripcion": "Cemento Asfáltico Modificado Con Grano De Caucho Reciclado Tipo I", "precio": 1816.0}, {"codigo": "B0103552", "unidad": "kg", "descripcion": "Cemento Asfáltico Modificado Con Grano De Caucho Reciclado Tipo Il", "precio": 1587.0}, {"codigo": "B0103553", "unidad": "kg", "descripcion": "Cemento Asfáltico Modificado Con Grano De Caucho Reciclado Tipo lll", "precio": 1610.0}, {"codigo": "B0103510", "unidad": "kg", "descripcion": "Cemento asfaltico modificado con polímeros tipo I", "precio": 2518.0}, {"codigo": "B0103520", "unidad": "kg", "descripcion": "Cemento asfaltico modificado con polímeros tipo II", "precio": 2760.0}, {"codigo": "B0103530", "unidad": "kg", "descripcion": "Cemento asfaltico modificado con polímeros tipo III", "precio": 2181.0}, {"codigo": "B0103540", "unidad": "kg", "descripcion": "Cemento asfaltico modificado con polímeros tipo IV", "precio": 2259.0}, {"codigo": "B0103554", "unidad": "kg", "descripcion": "Cemento Asfaltico Modificado Con Polímeros Tipo V", "precio": 2429.0}, {"codigo": "B0103550", "unidad": "kg", "descripcion": "Cemento asfaltico modificado con polímeros tipo V", "precio": 1885.0}, {"codigo": "B0100001", "unidad": "kg", "descripcion": "Cemento gris", "precio": 538.0}, {"codigo": "B0103557", "unidad": "kg", "descripcion": "Cemento Hidráulico adicionado, Norma ASTM C595 Tipo _______", "precio": 488.0}, {"codigo": "B0103556", "unidad": "kg", "descripcion": "Cemento Porthland Norma ASTM C150 Tipo _______", "precio": 423.0}, {"codigo": "B0303570", "unidad": "m2", "descripcion": "Cespedones", "precio": 4448.0}, {"codigo": "B0013580", "unidad": "kg", "descripcion": "Cicatrizante (para remoción de especies vegetales)", "precio": 9011.0}, {"codigo": "B0013590", "unidad": "m", "descripcion": "Cinta Sika PVC 0,22", "precio": 34615.0}, {"codigo": "B0013600", "unidad": "m", "descripcion": "Cintilla de poliuretano (sikarod)", "precio": 737.0}, {"codigo": "B0013601", "unidad": "m", "descripcion": "Cintilla De Poliuretano (Sikarod) (Pavimentos De Concreto Hidráulico)", "precio": 635.0}, {"codigo": "B0013610", "unidad": "kg", "descripcion": "Cloruro de calcio", "precio": 4464.0}, {"codigo": "B0013772", "unidad": "kg", "descripcion": "Cloruro De Calcio En Esferas (Pellets)", "precio": 2459.0}, {"codigo": "B0013771", "unidad": "kg", "descripcion": "Cloruro De Calcio En Hojuelas (Flakes)", "precio": 3125.0}, {"codigo": "B0013611", "unidad": "lt", "descripcion": "Cloruro De Calcio Liquido", "precio": 2418.0}, {"codigo": "B0133680", "unidad": "m3", "descripcion": "Concreto hidráulico para pavimento MR-20", "precio": 308464.0}, {"codigo": "B0133690", "unidad": "m3", "descripcion": "Concreto hidráulico para pavimento MR-36", "precio": 388676.0}, {"codigo": "B0133700", "unidad": "m3", "descripcion": "Concreto hidráulico para pavimento MR-43 (FastracK)(acelerado a 24 horas)", "precio": 540799.0}, {"codigo": "B0133710", "unidad": "m3", "descripcion": "Concreto hidráulico para pavimento MR-43", "precio": 458742.0}, {"codigo": "B0133720", "unidad": "m3", "descripcion": "Concreto hidráulico para pavimento MR-45", "precio": 471089.0}, {"codigo": "B0123660", "unidad": "m3", "descripcion": "Concreto Resistencia  14 (Mpa)", "precio": 396763.0}, {"codigo": "B0123650", "unidad": "m3", "descripcion": "Concreto Resistencia  21 (Mpa)", "precio": 424642.0}, {"codigo": "B0123671", "unidad": "m3", "descripcion": "Concreto Resistencia  28 (Mpa)", "precio": 457786.0}, {"codigo": "B0123620", "unidad": "m3", "descripcion": "Concreto Resistencia  28 (Mpa)", "precio": 457786.0}, {"codigo": "B0123640", "unidad": "m3", "descripcion": "Concreto Resistencia  32 (Mpa)", "precio": 471827.0}, {"codigo": "B0123630", "unidad": "m3", "descripcion": "Concreto Resistencia  35 (Mpa)", "precio": 485695.0}, {"codigo": "B0123670", "unidad": "m3", "descripcion": "Concreto resistencia 14 (MPA) (Ciclopeo)", "precio": 396773.0}, {"codigo": "B0013730", "unidad": "m", "descripcion": "Cordón detonante", "precio": 1362.0}, {"codigo": "B0013740", "unidad": "m2", "descripcion": "Costal de fibra o fique", "precio": 993.0}, {"codigo": "B0013750", "unidad": "u", "descripcion": "Costal de fibra o fique", "precio": 449.0}, {"codigo": "B0013760", "unidad": "m", "descripcion": "Cuneta prefabricada de concreto tipo V de (0,8*0,3*0,22)", "precio": 30200.0}, {"codigo": "B0013761", "unidad": "u", "descripcion": "Cuneta Prefabricada En Concreto Perfil U O V Ref.Cu004 Ntc-4109, 0,20 X 0,30 X 1.0 M", "precio": 29803.0}, {"codigo": "B0013773", "unidad": "u", "descripcion": "Defensa Metálica De 4,13 M Galvanizada", "precio": 207114.0}, {"codigo": "B0013781", "unidad": "u", "descripcion": "Delineador De Corona", "precio": 23630.0}, {"codigo": "B0013780", "unidad": "u", "descripcion": "Delineador de corona en forma de A de lámina galvanizada calibre 16 de (1.55*25) cm", "precio": 23800.0}, {"codigo": "B0013794", "unidad": "m3", "descripcion": "Derechos de explotación de material pétreo", "precio": 3000.0}, {"codigo": "B0013790", "unidad": "m3", "descripcion": "Derechos de explotación y/o disposición de materiales", "precio": 2825.0}, {"codigo": "B014001", "unidad": "gal", "descripcion": "Disolvente para pintura (TINNER)", "precio": 20058.0}, {"codigo": "B014002", "unidad": "gal", "descripcion": "Disolvente para pintura Trafico (acrílico)", "precio": 25883.0}, {"codigo": "B0013820", "unidad": "m3", "descripcion": "Disposición de material de derrumbe", "precio": 1973.0}, {"codigo": "B0013830", "unidad": "m", "descripcion": "Ductos para tensionimiento", "precio": 11308.0}, {"codigo": "B020011", "unidad": "lt", "descripcion": "Emulsión Asfáltica de Rotura Lenta CRL", "precio": 1228.0}, {"codigo": "B020012", "unidad": "lt", "descripcion": "Emulsión Asfáltica de Rotura Media Modificada Con Polímeros CRM-m", "precio": 2331.0}, {"codigo": "B020010", "unidad": "lt", "descripcion": "Emulsión asfáltica de rotura media modificada con polímeros CRMm", "precio": 1600.0}, {"codigo": "B020001", "unidad": "lt", "descripcion": "Emulsión CRL-0", "precio": 1775.0}, {"codigo": "B020002", "unidad": "lt", "descripcion": "Emulsión CRL-1", "precio": 1820.0}, {"codigo": "B020003", "unidad": "lt", "descripcion": "Emulsión CRL-1h", "precio": 1941.0}, {"codigo": "B020004", "unidad": "lt", "descripcion": "Emulsión CRL-1hm", "precio": 2560.0}, {"codigo": "B020005", "unidad": "lt", "descripcion": "Emulsión CRM", "precio": 1186.0}, {"codigo": "B020007", "unidad": "lt", "descripcion": "Emulsión CRR-1", "precio": 1812.0}, {"codigo": "B020006", "unidad": "lt", "descripcion": "Emulsión CRR-1m", "precio": 1804.0}, {"codigo": "B020008", "unidad": "lt", "descripcion": "Emulsión CRR-2", "precio": 2034.0}, {"codigo": "B020009", "unidad": "lt", "descripcion": "Emulsión CRR-2m", "precio": 2408.0}, {"codigo": "B015012", "unidad": "kg", "descripcion": "Escolta y transporte (una tarifa por cada m3 escoltado y transportado)", "precio": 4890.0}, {"codigo": "B015002", "unidad": "%", "descripcion": "Escolta y trasporte (Tarifa Porcentual de 40 %) por cada Metro Cubico exportado y trasportado", "precio": 0.0}, {"codigo": "B0013940", "unidad": "kg", "descripcion": "Esferas reflectivas", "precio": 3011.0}, {"codigo": "B0013950", "unidad": "glo", "descripcion": "Estacas, Pintura, Tachuelas, Hilo (localización de estructuras y carreteras)", "precio": 353.0}, {"codigo": "B0013960", "unidad": "m", "descripcion": "Estacón en madera viva diámetro mayor a 10 cm, L=2 m", "precio": 3460.0}, {"codigo": "B0013970", "unidad": "u", "descripcion": "Estoperol en resina de 11X3 cm", "precio": 2167.0}, {"codigo": "B0013980", "unidad": "lb", "descripcion": "Explosivos  75% (INDUGEL)", "precio": 6975.0}, {"codigo": "B0013991", "unidad": "lt", "descripcion": "Fertilizante Orgánico Mineral", "precio": 16390.0}, {"codigo": "B021007", "unidad": "m2", "descripcion": "FORMALETA (Depende para que sea el Concreto)", "precio": 10534.0}, {"codigo": "B021001", "unidad": "m2", "descripcion": "Formaleta (gaviones, juntas de bordillos, juntas de cunetas, muros, concretos clase D,E, F y G)", "precio": 6096.0}, {"codigo": "B021003", "unidad": "m2", "descripcion": "Formaleta concreto clase A,B y C", "precio": 21191.0}, {"codigo": "B021002", "unidad": "m2", "descripcion": "Formaleta Metálica", "precio": 8300.0}, {"codigo": "B021004", "unidad": "m", "descripcion": "Formaleta para baranda de concreto", "precio": 24230.0}, {"codigo": "B021005", "unidad": "m2", "descripcion": "Formaleta para muros", "precio": 8089.0}, {"codigo": "B021006", "unidad": "glo", "descripcion": "Formaleta, platina y accesorios (escamas en concreto)", "precio": 197227.0}, {"codigo": "B0014040", "unidad": "u", "descripcion": "Fulminantes", "precio": 768.0}, {"codigo": "B0014050", "unidad": "kg", "descripcion": "Fundente", "precio": 32349.0}, {"codigo": "B0014060", "unidad": "kg", "descripcion": "Gas propano", "precio": 4223.0}, {"codigo": "B028001", "unidad": "m", "descripcion": "Geodren circular diámetro 100 mm y altura 2.00 M", "precio": 53909.0}, {"codigo": "B028002", "unidad": "m", "descripcion": "Geodren planar Diamet 100 mm y h=0.50", "precio": 13033.0}, {"codigo": "B028003", "unidad": "m", "descripcion": "Geodren planar Diamet 100 mm y h=1.00", "precio": 22865.0}, {"codigo": "B028004", "unidad": "m", "descripcion": "Geodren planar Diamet 100 mm y h=2.00", "precio": 45711.0}, {"codigo": "B0014112", "unidad": "m2", "descripcion": "Geomalla Biaxial Para Refuerzo Pbx-11", "precio": 6408.0}, {"codigo": "B0264112", "unidad": "m2", "descripcion": "Geomalla Biaxial Para Refuerzo Pbx-11", "precio": 5090.0}, {"codigo": "B0014113", "unidad": "m2", "descripcion": "Geomalla Biaxial Para Refuerzo Pbx-12", "precio": 8748.0}, {"codigo": "B0264113", "unidad": "m2", "descripcion": "Geomalla Biaxial Para Refuerzo Pbx-12", "precio": 6913.0}, {"codigo": "B026010", "unidad": "m2", "descripcion": "Geomalla en fibra de vidrio GLASGRID 8511", "precio": 10172.0}, {"codigo": "B026013", "unidad": "m2", "descripcion": "Geomalla en fibra de vidrio GLASGRID 8511", "precio": 5923.0}, {"codigo": "B0264116", "unidad": "M2", "descripcion": "Geomalla Forgrid UX100", "precio": 13174.0}, {"codigo": "B0264115", "unidad": "m2", "descripcion": "Geomalla Fort Gird UX-50", "precio": 6928.0}, {"codigo": "B0014114", "unidad": "m2", "descripcion": "Geomalla Tipo Asphalt", "precio": 9151.0}, {"codigo": "B0264114", "unidad": "m2", "descripcion": "Geomalla Tipo Asphalt", "precio": 6433.0}, {"codigo": "B0014111", "unidad": "m2", "descripcion": "Geomalla Uniaxial Pbx-11", "precio": 7930.0}, {"codigo": "B0264111", "unidad": "m2", "descripcion": "Geomalla Uniaxial Pbx-11", "precio": 7500.0}, {"codigo": "B025002", "unidad": "m2", "descripcion": "Geoterxtil T-4000 o similar", "precio": 9845.0}, {"codigo": "B025100", "unidad": "M2", "descripcion": "Geotextil Forte Grid UX-165", "precio": 18849.0}, {"codigo": "B025101", "unidad": "M2", "descripcion": "Geotextil Fortex BX-40", "precio": 4843.0}, {"codigo": "B025003", "unidad": "m2", "descripcion": "Geotextil No Tejido", "precio": 3268.0}, {"codigo": "B025004", "unidad": "m2", "descripcion": "Geotextil No Tejido para reparación", "precio": 4887.0}, {"codigo": "B025008", "unidad": "m2", "descripcion": "Geotextil Nt Repav 450 O Similar (Proveedores Pavco, Lafayet, Geomatrix, Tensar, Omnes U Otros)", "precio": 5597.0}, {"codigo": "B025005", "unidad": "m2", "descripcion": "Geotextil Nt-2500 O Similar (Proveedores, Pavco, Geomatrix, Tensar, Omnes U Otros)", "precio": 4675.0}, {"codigo": "B025006", "unidad": "m2", "descripcion": "Geotextil NT-3000 o similar (proveedores, Tensar, Omnes u otros)", "precio": 5550.0}, {"codigo": "B025011", "unidad": "m2", "descripcion": "Geotextil T-2100 O Similar (Proveedores Pavco, Lafayet, Geomatrix, Tensar, Omnes U Otros)", "precio": 3931.0}, {"codigo": "B025001", "unidad": "m2", "descripcion": "Geotextil T-2400 O Similar (Proveedores Lafayet, Pavco, Geomatrix, Tensar, Omnes U Otros)", "precio": 5217.0}, {"codigo": "B025007", "unidad": "m2", "descripcion": "Geotextil Tejido", "precio": 3983.0}, {"codigo": "B025009", "unidad": "m2", "descripcion": "Geotextil Tejido", "precio": 3553.0}, {"codigo": "B0014180", "unidad": "kg", "descripcion": "Grapas", "precio": 5648.0}, {"codigo": "B0014184", "unidad": "u", "descripcion": "Grata de limpieza", "precio": 4315.0}, {"codigo": "B0014181", "unidad": "m3", "descripcion": "Gravilla", "precio": 54524.0}, {"codigo": "B0014185", "unidad": "m", "descripcion": "Guadua", "precio": 1859.0}, {"codigo": "B0014191", "unidad": "kg", "descripcion": "Impermeabilizante para Concreto", "precio": 6582.0}, {"codigo": "B033011", "unidad": "kg", "descripcion": "Impermeabilizante para concreto", "precio": 7008.0}, {"codigo": "B0014190", "unidad": "kg", "descripcion": "Imprimante y puente de adherencia", "precio": 38195.0}, {"codigo": "B021008", "unidad": "m", "descripcion": "Junta elastomérica Jeene (J 8097VV)", "precio": 504600.0}, {"codigo": "B0014231", "unidad": "u", "descripcion": "Lamina 1,22 X 2,44 X 1/2´´", "precio": 462830.0}, {"codigo": "B0014232", "unidad": "u", "descripcion": "Lamina 1,22 X 2,44 X 1/4´´", "precio": 245666.0}, {"codigo": "B0014200", "unidad": "m2", "descripcion": "Láminas impermeabilizantes", "precio": 1600.0}, {"codigo": "B0014233", "unidad": "u", "descripcion": "Lechada Para Ductos (Acero De Preesfuerzo)", "precio": 688.0}, {"codigo": "B0014210", "unidad": "lt", "descripcion": "Lechada para ductos (tensionamiento)", "precio": 972.0}, {"codigo": "B0014220", "unidad": "u", "descripcion": "Limpiador 1/4 de galón (anclajes)", "precio": 34623.0}, {"codigo": "B0014230", "unidad": "m", "descripcion": "Listón en guadua para empradizar", "precio": 1541.0}, {"codigo": "B0014234", "unidad": "u", "descripcion": "Lubricante Pvc X 500 G", "precio": 15884.0}, {"codigo": "B033005", "unidad": "u", "descripcion": "Malla Ciclónica Para Gaviones Galvanizada Aleación Zn-5A1-Mm Cal 12 (2M3)", "precio": 84953.0}, {"codigo": "B033009", "unidad": "u", "descripcion": "Malla Ciclónica Para Gaviones Galvanizada Aleación Zn-5A1-Mm Y Plastificada Pvc Cal 12 (2M3)", "precio": 97339.0}, {"codigo": "B033006", "unidad": "u", "descripcion": "Malla Ciclónica Para Gaviones Galvanizada Y Plastificada Con Pvc Cal 12 (2M3)", "precio": 94279.0}, {"codigo": "B033010", "unidad": "m2", "descripcion": "Malla Electrosoldada de 5/16", "precio": 4701.0}, {"codigo": "B033001", "unidad": "m2", "descripcion": "Malla eslabonada, calibre 10, 6 ojos", "precio": 22715.0}, {"codigo": "B033003", "unidad": "u", "descripcion": "Malla Para Colchagaviones Espesor 0,30 M", "precio": 95516.0}, {"codigo": "B033002", "unidad": "u", "descripcion": "Malla para gaviones (2M3)", "precio": 86419.0}, {"codigo": "B0014235", "unidad": "m", "descripcion": "Manguera De Alta Presión", "precio": 71149.0}, {"codigo": "B0014254", "unidad": "m", "descripcion": "Manguera de alta presión", "precio": 69400.0}, {"codigo": "B0014260", "unidad": "m", "descripcion": "Manguera de polietileno de 3´´", "precio": 4383.0}, {"codigo": "B0014265", "unidad": "m2", "descripcion": "Manto de refuerzo de vegetación tipo 5A", "precio": 7893.0}, {"codigo": "B0014267", "unidad": "m2", "descripcion": "Manto Permanente (Protección de Taludes)", "precio": 11177.0}, {"codigo": "B0014266", "unidad": "m2", "descripcion": "Manto Temporal (Protección de Taludes)", "precio": 4900.0}, {"codigo": "B0014281", "unidad": "m3", "descripcion": "Material  de afirmado de la Zona", "precio": 23772.0}, {"codigo": "B0014271", "unidad": "m3", "descripcion": "Material  Granular Tipo SBG", "precio": 36467.0}, {"codigo": "B0014270", "unidad": "m3", "descripcion": "Material de afirmado", "precio": 16845.0}, {"codigo": "B0014291", "unidad": "m3", "descripcion": "Material de Base", "precio": 31129.0}, {"codigo": "B0014300", "unidad": "m3", "descripcion": "Material de base (gradación 1)", "precio": 64407.0}, {"codigo": "B0014310", "unidad": "m3", "descripcion": "Material de base (gradación 2)", "precio": 47197.0}, {"codigo": "B0014320", "unidad": "m3", "descripcion": "Material de base (gradación 3)", "precio": 33429.0}, {"codigo": "B0014322", "unidad": "m3", "descripcion": "Material de base procesado en planta (gradación 1, 2)", "precio": 31578.0}, {"codigo": "B0014292", "unidad": "m3", "descripcion": "Material de base reciclada (manejo)", "precio": 6200.0}, {"codigo": "B0014330", "unidad": "m3", "descripcion": "Material de la zona (para estabilizar bases)", "precio": 19234.0}, {"codigo": "B0014373", "unidad": "m3", "descripcion": "Material de Recebo Para Relleno", "precio": 22926.0}, {"codigo": "B0014411", "unidad": "m3", "descripcion": "Material de Remoción", "precio": 3770.0}, {"codigo": "B0014340", "unidad": "m3", "descripcion": "Material de Sub- Base CBR=20%", "precio": 48911.0}, {"codigo": "B0014350", "unidad": "m3", "descripcion": "Material de Sub- Base CBR=30%", "precio": 35806.0}, {"codigo": "B0014361", "unidad": "m3", "descripcion": "Material de Sub Base CBR=40%", "precio": 27804.0}, {"codigo": "B0014370", "unidad": "m3", "descripcion": "Material de Sub- Base para bacheo", "precio": 40249.0}, {"codigo": "B0014372", "unidad": "m3", "descripcion": "Material de Sub- Base procesado en planta (tipo 1 o tipo 2)", "precio": 28006.0}, {"codigo": "B0014380", "unidad": "m3", "descripcion": "Material drenante (3´´)", "precio": 44833.0}, {"codigo": "B0014390", "unidad": "m3", "descripcion": "Material filtrante (6´´)", "precio": 50012.0}, {"codigo": "B0014272", "unidad": "m3", "descripcion": "Material Granular Tipo  BG", "precio": 42891.0}, {"codigo": "B0014400", "unidad": "m3", "descripcion": "Material para pedraplén", "precio": 45692.0}, {"codigo": "B0014402", "unidad": "m3", "descripcion": "Material para solado y atraque", "precio": 30709.0}, {"codigo": "B0014410", "unidad": "m3", "descripcion": "Material seleccionado para Relleno", "precio": 18877.0}, {"codigo": "B0014420", "unidad": "m", "descripcion": "Mecha Lenta", "precio": 679.0}, {"codigo": "B0014430", "unidad": "m3", "descripcion": "Mezcla abierta en caliente MAC-1", "precio": 417317.0}, {"codigo": "B0014440", "unidad": "m3", "descripcion": "Mezcla abierta en caliente MAC-2", "precio": 424986.0}, {"codigo": "B0014450", "unidad": "m3", "descripcion": "Mezcla abierta en caliente MAC-3", "precio": 448885.0}, {"codigo": "B0014542", "unidad": "M3", "descripcion": "Mezcla Abierta en Frio  MAF-25", "precio": 213333.0}, {"codigo": "B0014461", "unidad": "m3", "descripcion": "Mezcla Abierta en Frío MAF-19", "precio": 213470.0}, {"codigo": "B0014469", "unidad": "m3", "descripcion": "Mezcla Abierta en Frio MAF-38", "precio": 206100.0}, {"codigo": "B0014490", "unidad": "m3", "descripcion": "Mezcla Densa en caliente MDC-0", "precio": 235451.0}, {"codigo": "B0014501", "unidad": "m3", "descripcion": "Mezcla Densa en caliente MDC-10", "precio": 404833.0}, {"codigo": "B0014502", "unidad": "m3", "descripcion": "Mezcla densa en Caliente MDC-19", "precio": 426803.0}, {"codigo": "B0014511", "unidad": "m3", "descripcion": "Mezcla densa en Caliente MDC-25", "precio": 397193.0}, {"codigo": "B0014531", "unidad": "m3", "descripcion": "Mezcla Densa en Frio MDF-19", "precio": 331187.0}, {"codigo": "B0014541", "unidad": "m3", "descripcion": "Mezcla Densa en Frio MDF-25", "precio": 331187.0}, {"codigo": "B0014551", "unidad": "m3", "descripcion": "Mezcla Densa en Frio MDF-38", "precio": 331187.0}, {"codigo": "B0014552", "unidad": "m3", "descripcion": "Mezcla Densa en Frio para Bacheo", "precio": 218300.0}, {"codigo": "B0014560", "unidad": "m3", "descripcion": "Mezcla discontinua en caliente F-1", "precio": 193751.0}, {"codigo": "B0014570", "unidad": "m3", "descripcion": "Mezcla discontinua en caliente F-2", "precio": 201970.0}, {"codigo": "B0014580", "unidad": "m3", "descripcion": "Mezcla discontinua en caliente M-1", "precio": 182010.0}, {"codigo": "B0014590", "unidad": "m3", "descripcion": "Mezcla discontinua en caliente M-2", "precio": 201970.0}, {"codigo": "B0014601", "unidad": "m2", "descripcion": "Mezcla Fértil", "precio": 12300.0}, {"codigo": "B0014600", "unidad": "m3", "descripcion": "Mezcla gruesa en caliente tipo MGC-1", "precio": 230370.0}, {"codigo": "B0014421", "unidad": "m3", "descripcion": "Mezcla Semidensa en Caliente MSC-19", "precio": 220400.0}, {"codigo": "B0014610", "unidad": "m3", "descripcion": "Mortero 1:3", "precio": 361437.0}, {"codigo": "B0014611", "unidad": "m3", "descripcion": "Mortero 1:3 De recubrimiento", "precio": 423979.0}, {"codigo": "B0014236", "unidad": "m3", "descripcion": "Mortero 1:3 Para Anillos", "precio": 382554.0}, {"codigo": "B0014240", "unidad": "m3", "descripcion": "Mortero alta resistencia (Eucocrete)", "precio": 432011.0}, {"codigo": "B0014237", "unidad": "kg", "descripcion": "Mulch Orgánico", "precio": 1700.0}, {"codigo": "B0014620", "unidad": "kg", "descripcion": "Nutrientes (para remoción de especies vegetales) (dap, triple 15 o similar) (ítem 201.9)", "precio": 2114.0}, {"codigo": "B0014630", "unidad": "m2", "descripcion": "Obra falsa concreto clase A y B (puntal de 3m metálico)", "precio": 52444.0}, {"codigo": "B0014640", "unidad": "kg", "descripcion": "Oxigeno industrial", "precio": 12135.0}, {"codigo": "B0014650", "unidad": "m", "descripcion": "Paral en madera rolliza de 3´´ (tablestacados)", "precio": 5338.0}, {"codigo": "B0014660", "unidad": "u", "descripcion": "Paral en madera rolliza de 5´´ y 4,5m de longitud (tablestacados)", "precio": 36269.0}, {"codigo": "B0014670", "unidad": "u", "descripcion": "Paral en madera rolliza de 6´´ y 5m de longitud (tablestacados)", "precio": 40216.0}, {"codigo": "B0014680", "unidad": "u", "descripcion": "Paral en madera rolliza de 6´´ y 8m de longitud (tablestacados)", "precio": 42904.0}, {"codigo": "B0014690", "unidad": "kg", "descripcion": "Pegante epóxico", "precio": 41786.0}, {"codigo": "B0014701", "unidad": "m", "descripcion": "Perfil Hea 200", "precio": 136340.0}, {"codigo": "B0014702", "unidad": "m3", "descripcion": "Piedra para Concreto Ciclópeo (Rajón o Canto Rodado)", "precio": 47381.0}, {"codigo": "B0014700", "unidad": "m3", "descripcion": "Piedra para concreto ciclópeo (rajón o canto rodado)", "precio": 33287.0}, {"codigo": "B0014710", "unidad": "m3", "descripcion": "Piedra para gavión", "precio": 40606.0}, {"codigo": "B0014720", "unidad": "m", "descripcion": "Pilote de madera diam mayor a 18 cm.", "precio": 35576.0}, {"codigo": "B0014730", "unidad": "m", "descripcion": "Pilote en madera barbosco de 15*15", "precio": 47594.0}, {"codigo": "B0014740", "unidad": "gal", "descripcion": "Pintura acrílica pura para tráfico", "precio": 71233.0}, {"codigo": "B0014750", "unidad": "gal", "descripcion": "Pintura acrílica, esmalte o similar", "precio": 65083.0}, {"codigo": "B0014760", "unidad": "gal", "descripcion": "Pintura anticorrosiva", "precio": 42933.0}, {"codigo": "B0014238", "unidad": "g", "descripcion": "Pintura Impermeabilizante", "precio": 34537.0}, {"codigo": "B0014239", "unidad": "g", "descripcion": "Pintura Imprimante", "precio": 52521.0}, {"codigo": "B0014770", "unidad": "u", "descripcion": "Piscina de decantación de (3*3*1)", "precio": 46211.0}, {"codigo": "B0014772", "unidad": "kg", "descripcion": "Plastificante (Sikament)", "precio": 5790.0}, {"codigo": "B0014780", "unidad": "m", "descripcion": "Platina de 1´´ x 1/4´´ (cerramiento en malla)", "precio": 4226.0}, {"codigo": "B0014790", "unidad": "u", "descripcion": "Poste de madera para cercas", "precio": 9236.0}, {"codigo": "B0014800", "unidad": "u", "descripcion": "Poste en angulo de 2*2*1/4 de 3,5m para señal", "precio": 88122.0}, {"codigo": "B0014810", "unidad": "u", "descripcion": "Poste kilometraje", "precio": 79889.0}, {"codigo": "B0014831", "unidad": "u", "descripcion": "Postes De Concreto Para Cercas 2,00 Mts", "precio": 20200.0}, {"codigo": "B0014820", "unidad": "u", "descripcion": "Postes de concreto para cercas", "precio": 29981.0}, {"codigo": "B0014830", "unidad": "u", "descripcion": "Postes para defensa metálica (1,80m)", "precio": 144880.0}, {"codigo": "B0014840", "unidad": "lb", "descripcion": "Puntilla", "precio": 2777.0}, {"codigo": "B0014850", "unidad": "lt", "descripcion": "Químico estabilizante (PROBASE)", "precio": 71490.0}, {"codigo": "B0014860", "unidad": "kg", "descripcion": "Refuerzo de 3/8'' 60000 psi", "precio": 2983.0}, {"codigo": "B0014870", "unidad": "kg", "descripcion": "Resina termoplástica", "precio": 5624.0}, {"codigo": "B0014880", "unidad": "u", "descripcion": "Salida en PVC D=2´´", "precio": 2012.0}, {"codigo": "B0014893", "unidad": "u", "descripcion": "Sección De Tope Defensa Metálica", "precio": 35950.0}, {"codigo": "B0014890", "unidad": "u", "descripcion": "Sección final de defensa metálica", "precio": 55092.0}, {"codigo": "B0014892", "unidad": "u", "descripcion": "Sección tope", "precio": 35743.0}, {"codigo": "B0014900", "unidad": "m", "descripcion": "Sello de silicona o sellador autonivelante", "precio": 3414.0}, {"codigo": "B0014894", "unidad": "kg", "descripcion": "Semilla Para Empradizar Tipo Braquiaria", "precio": 20993.0}, {"codigo": "B0014910", "unidad": "kg", "descripcion": "Semillas para empradizar", "precio": 19922.0}, {"codigo": "B0014920", "unidad": "u", "descripcion": "Señal (grupo 1) tablero en lamina galvanizada de 90*90 cm, calibre 16 reflectivo tipo 1./ incluye poste)", "precio": 287430.0}, {"codigo": "B0014930", "unidad": "u", "descripcion": "Señal (grupo 1). Tablero en lámina galvanizada de 75cm*75cm, calibre 16, reflectivo tipo 1/ incluye poste )", "precio": 309780.0}, {"codigo": "B0014940", "unidad": "u", "descripcion": "Señal (grupo 2). Tablero en lámina galvanizado de 1,2m*0,4m, calibre 16, reflectivo tipo 1.", "precio": 232408.0}, {"codigo": "B0014950", "unidad": "u", "descripcion": "Señal (grupo 3 ferrocarril) (SP-54). Tablero en lámina galvanizado de 2,4m*0,3m, calibre 16, reflectivo tipo 1.", "precio": 264207.0}, {"codigo": "B0014960", "unidad": "u", "descripcion": "Señal (grupo 4). Tablero en lámina galvanizado de 60cm*75cm, calibre 16, reflectivo tipo 1. (delineador de curva horizontal)", "precio": 266133.0}, {"codigo": "B0014970", "unidad": "m2", "descripcion": "Señal (grupo 5). Tablero en lámina galvanizado de 0,90m*1,13m, calibre 16, reflectivo tipo 1.", "precio": 273869.0}, {"codigo": "B0014980", "unidad": "u", "descripcion": "Señal temporal preventiva", "precio": 122507.0}, {"codigo": "B0014895", "unidad": "kg", "descripcion": "Sika Color C", "precio": 21504.0}, {"codigo": "B0014898", "unidad": "kg", "descripcion": "Sika Top 122", "precio": 4929.0}, {"codigo": "B0014897", "unidad": "kg", "descripcion": "Sika Top Armatec 108", "precio": 13356.0}, {"codigo": "B0014896", "unidad": "kg", "descripcion": "Sikadur 32 Primer", "precio": 51024.0}, {"codigo": "B0014899", "unidad": "kg", "descripcion": "Sikaset L - Acelerante", "precio": 11179.0}, {"codigo": "B0015000", "unidad": "kg", "descripcion": "Soldadura 6013 de 1/8", "precio": 9755.0}, {"codigo": "B0015010", "unidad": "kg", "descripcion": "Soldadura 7018", "precio": 10062.0}, {"codigo": "B0015032", "unidad": "kg", "descripcion": "Soldadura E70XX o en arco sumergido", "precio": 7000.0}, {"codigo": "B0015020", "unidad": "u", "descripcion": "Soldadura en PVC 1/8 de galón (anclajes)", "precio": 22972.0}, {"codigo": "B0015030", "unidad": "kg", "descripcion": "Soldadura L-70", "precio": 20214.0}, {"codigo": "B0015040", "unidad": "gal", "descripcion": "Superplastificante Sikament", "precio": 38955.0}, {"codigo": "B0015050", "unidad": "u", "descripcion": "Tabla burda en madera aserrada (0,30*0,03*3,00)", "precio": 10687.0}, {"codigo": "B0015064", "unidad": "u", "descripcion": "Tablero en lámina galvanizada de 1,2 cm*0,4 cm, calibre 16, reflectivo tipo 1.", "precio": 79321.0}, {"codigo": "B0015066", "unidad": "u", "descripcion": "Tablero en lámina galvanizada de 2,4 m*30 cm, calibre 16, reflectivo tipo 1.", "precio": 126558.0}, {"codigo": "B0015063", "unidad": "u", "descripcion": "Tablero en lámina galvanizada de 60 cm*75cm, calibre 16, reflectivo tipo 1", "precio": 85579.0}, {"codigo": "B0015062", "unidad": "u", "descripcion": "Tablero en lámina galvanizada de 75cm*75cm, calibre 16, reflectivo tipo 1. Incluye poste de 2*2*1/4´´", "precio": 125800.0}, {"codigo": "B0015068", "unidad": "u", "descripcion": "Tablero en lámina galvanizado de 0,90m*1,13m, calibre 16, reflectivo tipo 1.", "precio": 154810.0}, {"codigo": "B0015071", "unidad": "u", "descripcion": "Tablestaca de madera aserrada (0.25x0.03x3)", "precio": 16205.0}, {"codigo": "B0015060", "unidad": "u", "descripcion": "Tablestaca en madera aserrada (0,25*0,05*3)", "precio": 20150.0}, {"codigo": "B0015070", "unidad": "u", "descripcion": "Tablestaca en madera aserrada (0,3*0,03*3)", "precio": 16205.0}, {"codigo": "B0015080", "unidad": "u", "descripcion": "Tablestaca metálica (riel de 70 lb/yarda)", "precio": 58924.0}, {"codigo": "B0015090", "unidad": "u", "descripcion": "Tacha reflectiva", "precio": 5626.0}, {"codigo": "B0015100", "unidad": "u", "descripcion": "Tachón en resina de (50*15*8) cm", "precio": 40744.0}, {"codigo": "B0015110", "unidad": "u", "descripcion": "Tapón en PVC RD21 de 1´´ (para anclaje)", "precio": 1671.0}, {"codigo": "B0015130", "unidad": "m3", "descripcion": "Tierra abonada", "precio": 49580.0}, {"codigo": "B0015120", "unidad": "m3", "descripcion": "Tierra común", "precio": 14900.0}, {"codigo": "B0015141", "unidad": "u", "descripcion": "Tornillos de Unión de D= 12 mm", "precio": 570.0}, {"codigo": "B0015140", "unidad": "u", "descripcion": "Tornillos para defensa metálica", "precio": 2416.0}, {"codigo": "B0015150", "unidad": "kg", "descripcion": "Torón de tensionmiento 1/2´´ o 5/8´´", "precio": 5267.0}, {"codigo": "B0015162", "unidad": "u", "descripcion": "Tramo Curvo De 4,13 M Galvanizado", "precio": 222100.0}, {"codigo": "B0015161", "unidad": "u", "descripcion": "Tramo Final O Terminal 2,5 Mm, De 71 Cm Galvanizado", "precio": 44582.0}, {"codigo": "B0015160", "unidad": "m", "descripcion": "Tramo recto para defensas metálicas (4,13m)", "precio": 102665.0}, {"codigo": "B0014901", "unidad": "u", "descripcion": "Transductores Electrónicos (Incluye Cables, Protección Contra El Concreto Y Panel De Lectura)", "precio": 1116389.0}, {"codigo": "B0015164", "unidad": "u", "descripcion": "Transductores electrónicos (incluye cables, protección contra el concreto y panel de lectura)", "precio": 1137285.0}, {"codigo": "B0014902", "unidad": "u", "descripcion": "Transductores Mecánicos (Incluye Cables, Protección Contra El Concreto Y Panel De Lectura)", "precio": 1107608.0}, {"codigo": "B0015166", "unidad": "u", "descripcion": "Transductores mecánicos (incluye cables, protección contra el concreto y panel de lectura)", "precio": 1103690.0}, {"codigo": "B0015350", "unidad": "m3", "descripcion": "Triturado tamaño 1/2''", "precio": 74697.0}, {"codigo": "B0015170", "unidad": "kg", "descripcion": "Trompetas de 12 torones (tensionamiento)", "precio": 64695.0}, {"codigo": "B0015180", "unidad": "m", "descripcion": "Tubería D=4´´ tipo pesado, E=2mm (baranda metálica)", "precio": 42335.0}, {"codigo": "B0015230", "unidad": "u", "descripcion": "Tubería de 10´´ PAA vaciado tremi de 4 mts", "precio": 78918.0}, {"codigo": "B0015233", "unidad": "m", "descripcion": "Tubería de Plástico", "precio": 9980.0}, {"codigo": "B0015190", "unidad": "m", "descripcion": "Tubería en H de D=1/4´´, H=1.40m, A=0.20m (baranda metálica)", "precio": 36014.0}, {"codigo": "B0015200", "unidad": "m", "descripcion": "Tubería Perforada en PVC de 2´´", "precio": 18021.0}, {"codigo": "B0015340", "unidad": "m", "descripcion": "Tubería Petrolera 7´´", "precio": 102990.0}, {"codigo": "B0015231", "unidad": "m", "descripcion": "Tubería Pvc Alcantarillado D= 24´´", "precio": 354339.0}, {"codigo": "B0015232", "unidad": "m", "descripcion": "Tubería Pvc Alcantarillado D= 36´´", "precio": 1015826.0}, {"codigo": "B0015220", "unidad": "m", "descripcion": "Tubería PVC de 1´´ (para escamas en concreto)", "precio": 4866.0}, {"codigo": "B0015210", "unidad": "m", "descripcion": "Tubería PVC RD21 de 1´´ (para anclajes)", "precio": 4579.0}, {"codigo": "B0015254", "unidad": "m", "descripcion": "Tubo concreto clase C, D=0,25 m", "precio": 27800.0}, {"codigo": "B0015240", "unidad": "m", "descripcion": "Tubo concreto reforzado 900mm (tipo 1)", "precio": 305781.0}, {"codigo": "B0015250", "unidad": "m", "descripcion": "Tubo concreto reforzado 900mm (tipo 2)", "precio": 319670.0}, {"codigo": "B0015260", "unidad": "m", "descripcion": "Tubo concreto simple 450 mm", "precio": 129471.0}, {"codigo": "B0015270", "unidad": "m", "descripcion": "Tubo concreto simple 500 mm", "precio": 161881.0}, {"codigo": "B0015280", "unidad": "m", "descripcion": "Tubo concreto simple 600 mm", "precio": 161457.0}, {"codigo": "B0015290", "unidad": "m", "descripcion": "Tubo concreto simple 750 mm", "precio": 192446.0}, {"codigo": "B0015300", "unidad": "m", "descripcion": "Tubo corrugado de acero galvanizado MP-68", "precio": 161721.0}, {"codigo": "B0015360", "unidad": "m", "descripcion": "Tubo metálico con recubrimiento bituminoso de lámina calibre 12 y diámetro de 60''", "precio": 105800.0}, {"codigo": "B0015304", "unidad": "m", "descripcion": "Tubo metálico de alta resistencia", "precio": 47301.0}, {"codigo": "B0015305", "unidad": "m", "descripcion": "Tubo Metálico De Alta Resistencia", "precio": 47600.0}, {"codigo": "B0015310", "unidad": "u", "descripcion": "Tubo para cerramiento, calibre 16 de 2,7m (cerramientos en malla)", "precio": 39480.0}, {"codigo": "B0015330", "unidad": "u", "descripcion": "Unión en PVC D=2´´", "precio": 2083.0}, {"codigo": "B0015320", "unidad": "u", "descripcion": "Unión en PVC RD21 de 1´´ (para anclajes)", "precio": 1023.0}, {"codigo": "B0015334", "unidad": "u", "descripcion": "Uniones especiales de alta resistencia para tubería", "precio": 28982.0}, {"codigo": "B0015362", "unidad": "u", "descripcion": "Uniones Especiales De Alta Resistencia Para Tubería", "precio": 28300.0}, {"codigo": "B0015361", "unidad": "kg", "descripcion": "Varilla 5/8", "precio": 3776.0}, {"codigo": "M0500001", "unidad": "kg", "descripcion": "Cemento blanco", "precio": 2200.0}];
const CATALOGO_MANO_OBRA = [{"codigo": "A0100130", "unidad": "día", "descripcion": "Armador", "precio": 50042.0}, {"codigo": "A0100150", "unidad": "día", "descripcion": "Ayudante", "precio": 45493.0}, {"codigo": "A0100181", "unidad": "día", "descripcion": "Calculista", "precio": 272955.0}, {"codigo": "A0100140", "unidad": "día", "descripcion": "Cortador", "precio": 68239.0}, {"codigo": "A0100010", "unidad": "día", "descripcion": "Cuadrilla de desmontaje (10 personas)", "precio": 500418.0}, {"codigo": "A0100180", "unidad": "día", "descripcion": "Cuadrilla de fabricación", "precio": 272955.0}, {"codigo": "A0041004", "unidad": "día", "descripcion": "Cuadrilla de Un Oficial y (2) Obreros.", "precio": 181970.0}, {"codigo": "A0041006", "unidad": "día", "descripcion": "Cuadrilla de un oficial y (4) Obreros.", "precio": 272955.0}, {"codigo": "A0100170", "unidad": "día", "descripcion": "Dibujante", "precio": 90985.0}, {"codigo": "A0100182", "unidad": "día", "descripcion": "Dibujante 2", "precio": 81887.0}, {"codigo": "A0100120", "unidad": "u", "descripcion": "Estudios, análisis e informes", "precio": 1819702.0}, {"codigo": "A0100070", "unidad": "día", "descripcion": "Ingeniero de montaje y prueba", "precio": 291152.0}, {"codigo": "A0100069", "unidad": "día", "descripcion": "Ingeniero de Montaje y Prueba Pilote (1)", "precio": 291152.0}, {"codigo": "A0100082", "unidad": "día", "descripcion": "Ingeniero Especialista prueba de  integridad", "precio": 341194.0}, {"codigo": "A0100071", "unidad": "día", "descripcion": "Ingeniero Geotecnista", "precio": 362908.0}, {"codigo": "A0100020", "unidad": "día", "descripcion": "Ingeniero supervisor", "precio": 295702.0}, {"codigo": "A0100080", "unidad": "día", "descripcion": "Ingeniero supervisor y director de prueba", "precio": 350293.0}, {"codigo": "A0100081", "unidad": "día", "descripcion": "Ingeniero Supervisor y Director de Prueba Pilote", "precio": 354842.0}, {"codigo": "A0100160", "unidad": "día", "descripcion": "Inspector", "precio": 95534.0}, {"codigo": "A0020010", "unidad": "día", "descripcion": "Inspector de fabricación y montaje", "precio": 122069.0}, {"codigo": "A0041008", "unidad": "día", "descripcion": "1 Oficial y 1 Obrero.", "precio": 136478.0}, {"codigo": "A0100030", "unidad": "día", "descripcion": "Maestro", "precio": 136478.0}, {"codigo": "A0030100", "unidad": "día", "descripcion": "Obrero (10)", "precio": 454925.0}, {"codigo": "A0030020", "unidad": "día", "descripcion": "Obrero (2)", "precio": 90985.0}, {"codigo": "A0030030", "unidad": "día", "descripcion": "Obrero (3)", "precio": 136478.0}, {"codigo": "A0030040", "unidad": "día", "descripcion": "Obrero (4)", "precio": 181970.0}, {"codigo": "A0030050", "unidad": "día", "descripcion": "Obrero (5)", "precio": 227463.0}, {"codigo": "A0030060", "unidad": "día", "descripcion": "Obrero (6)", "precio": 272955.0}, {"codigo": "A0030070", "unidad": "día", "descripcion": "Obrero (7)", "precio": 318448.0}, {"codigo": "A0030080", "unidad": "día", "descripcion": "Obrero (8)", "precio": 363940.0}, {"codigo": "A0030090", "unidad": "día", "descripcion": "Obrero (9)", "precio": 409433.0}, {"codigo": "A0100060", "unidad": "día", "descripcion": "Obrero (prueba de carga)", "precio": 50042.0}, {"codigo": "A0030120", "unidad": "día", "descripcion": "Obreros de incado (2)", "precio": 100084.0}, {"codigo": "A0030110", "unidad": "día", "descripcion": "Obreros de izado (2)", "precio": 100084.0}, {"codigo": "A0040010", "unidad": "día", "descripcion": "Oficial", "precio": 90985.0}, {"codigo": "A0041002", "unidad": "día", "descripcion": "Oficial  Obrero (3) Cuadrilla de un oficial y 3 Obreros.", "precio": 227463.0}, {"codigo": "A0040020", "unidad": "día", "descripcion": "Oficial (2)", "precio": 181970.0}, {"codigo": "A0040030", "unidad": "día", "descripcion": "Oficial (3)", "precio": 272955.0}, {"codigo": "A0100050", "unidad": "día", "descripcion": "Oficial + 3 Ayudantes (armado e inyección de anclajes)", "precio": 241111.0}, {"codigo": "A0041000", "unidad": "día", "descripcion": "Oficial experto en desmontaje", "precio": 100084.0}, {"codigo": "A0041001", "unidad": "día", "descripcion": "Oficial experto en explosivos", "precio": 109182.0}, {"codigo": "A0100092", "unidad": "día", "descripcion": "Operador prueba de integridad", "precio": 113731.0}, {"codigo": "A0050010", "unidad": "día", "descripcion": "Paletero", "precio": 45493.0}, {"codigo": "A0050020", "unidad": "día", "descripcion": "Paletero (2)", "precio": 90985.0}, {"codigo": "A0060010", "unidad": "día", "descripcion": "Perforador", "precio": 90985.0}, {"codigo": "A0100040", "unidad": "día", "descripcion": "Perforador + Ayudante1 + Ayudante2", "precio": 181970.0}, {"codigo": "A0040001", "unidad": "día", "descripcion": "Personal requerido para el diseño y fabricación de estructura metálica. (incluye un calista, un dibujante y la cuadrilla de Fabricación) De esta ultima no hay detalle de que personal la compone.", "precio": 682388.0}, {"codigo": "A0070010", "unidad": "día", "descripcion": "Rastrillero", "precio": 68239.0}, {"codigo": "A0070020", "unidad": "día", "descripcion": "Rastrilleros (2)", "precio": 136478.0}, {"codigo": "A0080010", "unidad": "día", "descripcion": "Soldador", "precio": 90985.0}, {"codigo": "A0010083", "unidad": "día", "descripcion": "Soldador (2)", "precio": 181970.0}, {"codigo": "A0080012", "unidad": "día", "descripcion": "Soldador 1A", "precio": 113731.0}, {"codigo": "A0100090", "unidad": "día", "descripcion": "Soldador experto en montaje y pruebas", "precio": 136478.0}, {"codigo": "A0100091", "unidad": "día", "descripcion": "Soldador experto en montaje y pruebas", "precio": 136478.0}, {"codigo": "A0090010", "unidad": "día", "descripcion": "Topógrafo", "precio": 136478.0}, {"codigo": "A0030010", "unidad": "día", "descripcion": "Obrero", "precio": 45493.0}, {"codigo": "A0100100", "unidad": "u", "descripcion": "Viáticos ingeniero y director", "precio": 454925.0}, {"codigo": "A0100110", "unidad": "u", "descripcion": "Viáticos soldadores", "precio": 227463.0}, {"codigo": "A0040110", "unidad": "día", "descripcion": "Celador", "precio": 45493.0}, {"codigo": "MOC-001", "unidad": "día", "descripcion": "Operador de retroexcavadora", "precio": 110000}, {"codigo": "MOC-002", "unidad": "día", "descripcion": "Operador de miniexcavadora", "precio": 105000}, {"codigo": "MOC-003", "unidad": "día", "descripcion": "Operador de bulldozer", "precio": 115000}, {"codigo": "MOC-004", "unidad": "día", "descripcion": "Operador de motoniveladora", "precio": 115000}, {"codigo": "MOC-005", "unidad": "día", "descripcion": "Operador de vibrocompactador", "precio": 100000}, {"codigo": "MOC-006", "unidad": "día", "descripcion": "Operador de grúa", "precio": 130000}, {"codigo": "MOC-007", "unidad": "día", "descripcion": "Conductor de volqueta", "precio": 95000}, {"codigo": "MOC-008", "unidad": "día", "descripcion": "Operador de mezcladora de concreto", "precio": 80000}, {"codigo": "MOC-009", "unidad": "día", "descripcion": "Operador de bomba de concreto", "precio": 100000}, {"codigo": "MOC-010", "unidad": "día", "descripcion": "Operador de montacargas", "precio": 95000}, {"codigo": "MOC-011", "unidad": "día", "descripcion": "Oficial electricista", "precio": 95000}, {"codigo": "MOC-012", "unidad": "día", "descripcion": "Ayudante electricista", "precio": 47000}, {"codigo": "MOC-013", "unidad": "día", "descripcion": "Oficial hidrosanitario / plomero", "precio": 92000}, {"codigo": "MOC-014", "unidad": "día", "descripcion": "Ayudante hidrosanitario", "precio": 46000}, {"codigo": "MOC-015", "unidad": "día", "descripcion": "Oficial pintor", "precio": 85000}, {"codigo": "MOC-016", "unidad": "día", "descripcion": "Ayudante de pintura", "precio": 44000}, {"codigo": "MOC-017", "unidad": "día", "descripcion": "Oficial enchapador / embaldosador", "precio": 92000}, {"codigo": "MOC-018", "unidad": "día", "descripcion": "Oficial estucador", "precio": 88000}, {"codigo": "MOC-019", "unidad": "día", "descripcion": "Oficial carpintero", "precio": 92000}, {"codigo": "MOC-020", "unidad": "día", "descripcion": "Ayudante carpintero", "precio": 46000}, {"codigo": "MOC-021", "unidad": "día", "descripcion": "Oficial vidriero / aluminero", "precio": 92000}, {"codigo": "MOC-022", "unidad": "día", "descripcion": "Oficial mampostero / albañil", "precio": 90000}, {"codigo": "MOC-023", "unidad": "día", "descripcion": "Oficial de estructuras metálicas", "precio": 95000}, {"codigo": "MOC-024", "unidad": "día", "descripcion": "Técnico en climatización / HVAC", "precio": 100000}, {"codigo": "MOC-025", "unidad": "día", "descripcion": "Técnico en gas", "precio": 95000}, {"codigo": "MOC-026", "unidad": "día", "descripcion": "Técnico en cableado estructurado / redes", "precio": 90000}, {"codigo": "MOC-027", "unidad": "día", "descripcion": "Técnico en sistemas de seguridad / CCTV", "precio": 95000}, {"codigo": "MOC-028", "unidad": "día", "descripcion": "Técnico instalador de ascensores", "precio": 130000}, {"codigo": "MOC-029", "unidad": "día", "descripcion": "Jardinero", "precio": 48000}, {"codigo": "MOC-030", "unidad": "día", "descripcion": "Aseador de obra", "precio": 45000}, {"codigo": "MOC-031", "unidad": "día", "descripcion": "Almacenista de obra", "precio": 60000}, {"codigo": "MOC-032", "unidad": "día", "descripcion": "Vigilante / celador de obra", "precio": 55000}, {"codigo": "MOC-033", "unidad": "día", "descripcion": "Residente de obra", "precio": 180000}, {"codigo": "MOC-034", "unidad": "día", "descripcion": "Maestro de obra general", "precio": 120000}, {"codigo": "MOC-035", "unidad": "día", "descripcion": "Coordinador SISO / HSEQ", "precio": 110000}, {"codigo": "MOC-036", "unidad": "día", "descripcion": "Operador de excavadora", "precio": 115000}, {"codigo": "MOC-037", "unidad": "día", "descripcion": "Operador de pluma grúa", "precio": 135000}, {"codigo": "MOC-038", "unidad": "día", "descripcion": "Operador de camión grúa", "precio": 125000}, {"codigo": "MOC-039", "unidad": "día", "descripcion": "Conductor de camabaja", "precio": 100000}, {"codigo": "MOC-040", "unidad": "día", "descripcion": "Operador de minicargador", "precio": 100000}, {"codigo": "MOC-041", "unidad": "día", "descripcion": "Operador de planta móvil de concreto", "precio": 120000}, {"codigo": "MOC-042", "unidad": "día", "descripcion": "Operador de cargador", "precio": 115000}, {"codigo": "MOC-043", "unidad": "día", "descripcion": "Operador de pavimentadora", "precio": 130000}, {"codigo": "MOC-044", "unidad": "día", "descripcion": "Operador de extendedora de asfalto", "precio": 130000}, {"codigo": "MOC-045", "unidad": "día", "descripcion": "Operador de trituradora de asfalto", "precio": 125000}, {"codigo": "A0010010", "unidad": "día", "descripcion": "Cadenero 1o", "precio": 112480.0}, {"codigo": "A0010011", "unidad": "día", "descripcion": "Cadenero 2o", "precio": 112480.0}];
const CATALOGO_EQUIPOS = [{"codigo": "C0010011", "unidad": "u", "descripcion": "Andamiaje para Aplicar la Carga (Equipos Sustituto de la Tara)", "precio": 41350.0}, {"codigo": "C0010010", "unidad": "h", "descripcion": "Aspersor manual", "precio": 2554.0}, {"codigo": "C0010020", "unidad": "h", "descripcion": "Barredora mecánica de cepillo de 3658 mm ; 6 m3", "precio": 72348.0}, {"codigo": "C0010030", "unidad": "h", "descripcion": "Bomba de concreto, Producción: 30 m3/h, POTENCIA: 67 HP, MAX PRESION DE CONCRETO: 1150 PSI", "precio": 43861.0}, {"codigo": "C0010040", "unidad": "h", "descripcion": "Bomba de inyección de lechada", "precio": 16071.0}, {"codigo": "C0010034", "unidad": "h", "descripcion": "Bomba eléctrica para accionar la celda", "precio": 41470.0}, {"codigo": "C0010050", "unidad": "h", "descripcion": "Bomba para gato de tensionamiento", "precio": 51311.0}, {"codigo": "C0010053", "unidad": "h", "descripcion": "Buldozer Potencia al volante de 305 HP, motor de 2100 RPM, longitud de hoja 6,39m.", "precio": 140888.0}, {"codigo": "C0010052", "unidad": "h", "descripcion": "Buldozer, Potencia al volante de 140 HP, motor de 2200 RPM, longitud de hoja 4,80m.", "precio": 141426.0}, {"codigo": "C0010051", "unidad": "h", "descripcion": "Buldozer, Potencia al volante de 80 HP, motor de 2400 RPM, longitud de hoja 3,99m,", "precio": 156413.0}, {"codigo": "C0010961", "unidad": "h", "descripcion": "Caldera para pintura termoplástica", "precio": 41637.0}, {"codigo": "C0010090", "unidad": "h", "descripcion": "Calentador a gas", "precio": 80237.0}, {"codigo": "C0010125", "unidad": "h", "descripcion": "Camabaja", "precio": 167948.0}, {"codigo": "C0010100", "unidad": "h", "descripcion": "Camión 350", "precio": 41333.0}, {"codigo": "C0010110", "unidad": "h", "descripcion": "Camión de Slurry", "precio": 99283.0}, {"codigo": "C0010120", "unidad": "h", "descripcion": "Camioneta D-300", "precio": 37120.0}, {"codigo": "C0010124", "unidad": "m", "descripcion": "Camisa", "precio": 22144.0}, {"codigo": "C0010123", "unidad": "Kg", "descripcion": "Camisa para Pilote D=1.20m", "precio": 23550.0}, {"codigo": "C0010130", "unidad": "h", "descripcion": "Cargador : Potencia en el volante 110 hp, Clasificación de RPM del motor 2300.", "precio": 122006.0}, {"codigo": "C0010140", "unidad": "h", "descripcion": "Cargador : Potencia en el volante 125 hp, Clasificación de RPM del motor 2300.", "precio": 130307.0}, {"codigo": "C0010150", "unidad": "h", "descripcion": "Carrotanque de agua(1000 Galones)", "precio": 62653.0}, {"codigo": "C0010160", "unidad": "h", "descripcion": "Carrotanque Irrigador de asfalto, 1000 GALONES DE CAPACIDAD", "precio": 78566.0}, {"codigo": "C0010170", "unidad": "h", "descripcion": "Cizalla manual de 90 cm.", "precio": 657.0}, {"codigo": "C0010211", "unidad": "h", "descripcion": "Compactador de Rodillo POTENCIA: 99HP, PESO: 8 ton", "precio": 117292.0}, {"codigo": "C0010200", "unidad": "h", "descripcion": "Compactador manual (SALTARIN) Peso de operación (Kg.) 52, Fuerza de impacto por golpe (KN) 12.", "precio": 10181.0}, {"codigo": "C0010210", "unidad": "h", "descripcion": "Compactador manual de rodillo", "precio": 15442.0}, {"codigo": "C0010220", "unidad": "h", "descripcion": "Compactador manual vibratorio (CANGURO) (Apisonadores)", "precio": 10998.0}, {"codigo": "C0010190", "unidad": "h", "descripcion": "COMPACTADOR MANUAL VIBRATORIO (RANA) con motor de 6 HP", "precio": 7788.0}, {"codigo": "C0010230", "unidad": "h", "descripcion": "Compactador neumático de Potencia 70 HP, peso de 13 ton", "precio": 115333.0}, {"codigo": "C0010213", "unidad": "h", "descripcion": "Compactador neumático peso 3,5 ton", "precio": 61877.0}, {"codigo": "C0010212", "unidad": "h", "descripcion": "Compactador tipo  POTENCIA: 105 HP, PESO: 6 ton", "precio": 109471.0}, {"codigo": "C0010240", "unidad": "h", "descripcion": "Compactador vibratorio tipo DD-20", "precio": 84700.0}, {"codigo": "C0010250", "unidad": "h", "descripcion": "Compresor (barrido y soplado)", "precio": 48346.0}, {"codigo": "C0010270", "unidad": "h", "descripcion": "Compresor 120 HP, con martillo.", "precio": 75944.0}, {"codigo": "C0010260", "unidad": "h", "descripcion": "Compresor 80 HP, con martillo.", "precio": 70996.0}, {"codigo": "C0010280", "unidad": "h", "descripcion": "Compresor para penetrar roca", "precio": 59194.0}, {"codigo": "C0010291", "unidad": "h", "descripcion": "Cortadora de pavimento", "precio": 8349.0}, {"codigo": "C0010290", "unidad": "h", "descripcion": "Cortadora de pavimento, Máxima profundidad de corte: 160 mm. Capacidad de disco: desde 12´´ hasta 18´´ de diámetro. Peso operacional: 135 kg, 13.5 hp de potencia", "precio": 14120.0}, {"codigo": "C0010311", "unidad": "h", "descripcion": "Derretidora de asfalto (crafco o similar)", "precio": 2050.0}, {"codigo": "C0010301", "unidad": "h", "descripcion": "Diferencial", "precio": 3853.0}, {"codigo": "C0010300", "unidad": "h", "descripcion": "Diferencial de 2 ton.", "precio": 3706.0}, {"codigo": "C0010310", "unidad": "h", "descripcion": "Diferencial de 3 ton", "precio": 4993.0}, {"codigo": "C0010351", "unidad": "h", "descripcion": "Equipo autopropulsado para pintura termoplástica", "precio": 71200.0}, {"codigo": "C0010314", "unidad": "h", "descripcion": "Equipo de acarreo interno", "precio": 39550.0}, {"codigo": "C0010320", "unidad": "h", "descripcion": "Equipo de control (bandas sonoras reduce velocidad) (Termohigometros, Termómetros, Galgas, etc.)", "precio": 1868.0}, {"codigo": "C0010401", "unidad": "u", "descripcion": "Equipo de Medición (Deformimetros Eléctricos, Mecánicos, Celdas de Carga,  Etc.)", "precio": 122250.0}, {"codigo": "C0010330", "unidad": "h", "descripcion": "Equipo de oxicorte, Capacidad de corte: hasta 6´´ (152mm)", "precio": 16003.0}, {"codigo": "C0010382", "unidad": "h", "descripcion": "Equipo de oxigeno y soldadura", "precio": 8810.0}, {"codigo": "C0010340", "unidad": "h", "descripcion": "Equipo de perforación (TRACKDRILL), potencia 40 HP, 2100 golpes / minuto", "precio": 128839.0}, {"codigo": "C0010350", "unidad": "h", "descripcion": "Equipo de pintura (Compresor), Presión máxima de trabajo 3300 psi.", "precio": 13802.0}, {"codigo": "C0010352", "unidad": "h", "descripcion": "Equipo de rayos X y/o ultrasonido", "precio": 58110.0}, {"codigo": "C0010381", "unidad": "h", "descripcion": "Equipo de Sand Blastin y Pintura COMPRESOR 250cfm a 100 psi. PULMON de 70 gal (250 lt.) para 160 psi", "precio": 24906.0}, {"codigo": "C0010361", "unidad": "h", "descripcion": "Equipo de Soldadura", "precio": 6510.0}, {"codigo": "C0010360", "unidad": "h", "descripcion": "Equipo de soldadura 250 AMP", "precio": 13836.0}, {"codigo": "C0010370", "unidad": "h", "descripcion": "Equipo de soldadura 400", "precio": 12536.0}, {"codigo": "C0010380", "unidad": "h", "descripcion": "Equipo de soldadura 600", "precio": 15783.0}, {"codigo": "C0010384", "unidad": "h", "descripcion": "Equipo de soldadura y de acetileno (incluye soldadura)", "precio": 19166.0}, {"codigo": "C0010390", "unidad": "h", "descripcion": "Equipo de topografía", "precio": 13618.0}, {"codigo": "C0010383", "unidad": "h", "descripcion": "Equipo de topografía Teodolito electrónico con abertura de anteojo de 42 mm. Aumento del anteojo: 30x.Distancia mínima de enfoque: 1.0 m. Precisión: 5´´. Compensador con rango de trabajo ±3´.", "precio": 14484.0}, {"codigo": "C0010394", "unidad": "h", "descripcion": "Equipo de transporte (Camiones, Grúas, Volquetas, etc.)", "precio": 55400.0}, {"codigo": "C0010400", "unidad": "h", "descripcion": "Equipo manual aplicador (bandas sonoras reduce velocidad)", "precio": 31552.0}, {"codigo": "C0010410", "unidad": "h", "descripcion": "Esparcidor de gravilla, Ancho de esparcimiento 3100mm, Velocidad de trabajo 10—20km2/h", "precio": 80156.0}, {"codigo": "C0010420", "unidad": "h", "descripcion": "Estación Total con precisión angular de 6´´. Precisión lineal 2 mm ± 2 ppm", "precio": 14495.0}, {"codigo": "C0010443", "unidad": "m2", "descripcion": "Formaleta Metálica", "precio": 3100.0}, {"codigo": "C0010430", "unidad": "h", "descripcion": "Formaleta metálica (concreto hidráulico)", "precio": 3110.0}, {"codigo": "C0010440", "unidad": "h", "descripcion": "Formaleta metálica (tubería de concreto reforzado)", "precio": 9641.0}, {"codigo": "C0010442", "unidad": "h", "descripcion": "Formaleta metálica para tubo de 900", "precio": 2863.0}, {"codigo": "C0010450", "unidad": "h", "descripcion": "Formaleta para camisa de pilote", "precio": 9865.0}, {"codigo": "C0010460", "unidad": "h", "descripcion": "Fresadora de pavimento, potencia 255 HP, peso 19 Ton, PROFUNDIDAD DE CORTE 305 mm", "precio": 342084.0}, {"codigo": "C0010470", "unidad": "h", "descripcion": "Fresadora y recicladora de pavimento, potencia 430 HP, peso 20 Ton", "precio": 457206.0}, {"codigo": "C0010480", "unidad": "h", "descripcion": "Gato para tensionamiento, fuerza Max 200 ton, área de tensión 314 cm2.", "precio": 159070.0}, {"codigo": "C0010490", "unidad": "h", "descripcion": "Grúa (capacidad 15 ton)", "precio": 157729.0}, {"codigo": "C0010511", "unidad": "h", "descripcion": "Grúa (Transporte en Obra)", "precio": 86760.0}, {"codigo": "C0010500", "unidad": "h", "descripcion": "Grúa 10 ton", "precio": 180919.0}, {"codigo": "C0010502", "unidad": "h", "descripcion": "Grúa con barreno o máquina piloteadora", "precio": 230716.0}, {"codigo": "C0010510", "unidad": "h", "descripcion": "Grúa con torre", "precio": 197219.0}, {"codigo": "C0010512", "unidad": "h", "descripcion": "Grúa Con Torre (2)", "precio": 116340.0}, {"codigo": "C0010491", "unidad": "h", "descripcion": "Grúa con torre capacidad 1 ton en la punta.", "precio": 123900.0}, {"codigo": "C0010520", "unidad": "h", "descripcion": "Grúa telescópica de 50 Ton.", "precio": 249844.0}, {"codigo": "C0010530", "unidad": "h", "descripcion": "Guadañadora, Cilindraje 41.5 cm3, Longitud del mango 1450 mm, Peso 7.4 kg", "precio": 5351.0}, {"codigo": "C0010544", "unidad": "h", "descripcion": "Manómetro cable de acero para bajar la celda", "precio": 1100100.0}, {"codigo": "C0010541", "unidad": "h", "descripcion": "Máquina hidrosembradora", "precio": 16100.0}, {"codigo": "C0010540", "unidad": "h", "descripcion": "Maquina térmica pegatachas", "precio": 23785.0}, {"codigo": "C0010550", "unidad": "h", "descripcion": "Mezcladora de concreto 1 bulto", "precio": 6549.0}, {"codigo": "C0010560", "unidad": "h", "descripcion": "Montacargas", "precio": 49992.0}, {"codigo": "C0010570", "unidad": "h", "descripcion": "Motobomba 3 PULGADAS (incluye operario)", "precio": 7382.0}, {"codigo": "C0010580", "unidad": "h", "descripcion": "Motobomba 4 pulgadas", "precio": 9045.0}, {"codigo": "C0010590", "unidad": "h", "descripcion": "Motobomba 6´´ diámetro de bombeo de 2 m3/seg", "precio": 28353.0}, {"codigo": "C0010600", "unidad": "h", "descripcion": "Motobomba de concreto", "precio": 82898.0}, {"codigo": "C0010610", "unidad": "h", "descripcion": "Motoniveladora  potencia 215 HP, ancho de cuchilla 4,27 m, peso 18 ton.", "precio": 172833.0}, {"codigo": "C0010611", "unidad": "h", "descripcion": "Motoniveladora, potencia 140 HP, ancho de cuchilla 3,66 m, peso 11 ton.", "precio": 108713.0}, {"codigo": "C0010620", "unidad": "h", "descripcion": "Motosierra, 93.6 cm3 - 7.1 HP, 45-90 cm - 7.9 kg", "precio": 8427.0}, {"codigo": "C0010621", "unidad": "h", "descripcion": "Motosoldador, 300 amperios", "precio": 10978.0}, {"codigo": "C0010630", "unidad": "h", "descripcion": "Pala auxiliar de piloteadora", "precio": 235854.0}, {"codigo": "C0010640", "unidad": "h", "descripcion": "Pala grúa con martillos", "precio": 238457.0}, {"codigo": "C0010650", "unidad": "h", "descripcion": "Piloteadora", "precio": 591657.0}, {"codigo": "C0010651", "unidad": "h", "descripcion": "Piloteadora potencia 250KW, RPM 1800, fuerza elevadora 200KN", "precio": 374800.0}, {"codigo": "C0010660", "unidad": "h", "descripcion": "Planta de asfalto en caliente", "precio": 558869.0}, {"codigo": "C0010670", "unidad": "h", "descripcion": "Planta de asfalto en frio", "precio": 243242.0}, {"codigo": "C0010680", "unidad": "h", "descripcion": "Planta eléctrica", "precio": 11180.0}, {"codigo": "C0010690", "unidad": "h", "descripcion": "Planta trituradora", "precio": 479884.0}, {"codigo": "C0010700", "unidad": "h", "descripcion": "Pluma capacidad 100 kg", "precio": 8375.0}, {"codigo": "C0010704", "unidad": "h", "descripcion": "Puente grúa", "precio": 486207.0}, {"codigo": "C0010710", "unidad": "h", "descripcion": "Pulidora (8500 REV)", "precio": 4197.0}, {"codigo": "C0010720", "unidad": "h", "descripcion": "Pulvimixer", "precio": 87723.0}, {"codigo": "C0010730", "unidad": "h", "descripcion": "Recicladora, potencia 430HP", "precio": 437294.0}, {"codigo": "C0010740", "unidad": "h", "descripcion": "Regla vibratoria, de longitud de 3 a 5 m, motor de 3600 rpm, potencia 6 HP", "precio": 6997.0}, {"codigo": "C0010760", "unidad": "h", "descripcion": "Retrocargador CAT 510", "precio": 95239.0}, {"codigo": "C0010750", "unidad": "h", "descripcion": "Retrocargador, pala de 1,1 m3 de capacidad, profundidad de excavación de 4.400 mm y una altura de 5.680 mm", "precio": 78474.0}, {"codigo": "C0010770", "unidad": "h", "descripcion": "Retroexcavadora 428 doble trasmisión", "precio": 85739.0}, {"codigo": "C0010780", "unidad": "h", "descripcion": "Retroexcavadora A25C", "precio": 192448.0}, {"codigo": "C0010800", "unidad": "h", "descripcion": "Retroexcavadora E-200 con martillo neumático", "precio": 216064.0}, {"codigo": "C0010820", "unidad": "h", "descripcion": "Retroexcavadora E-200 sobre orugas trabajo en rio", "precio": 198010.0}, {"codigo": "C0010810", "unidad": "h", "descripcion": "Retroexcavadora E-200 sobre orugas", "precio": 185757.0}, {"codigo": "C0010831", "unidad": "h", "descripcion": "Retroexcavadora sobre llantas", "precio": 91228.0}, {"codigo": "C0010830", "unidad": "h", "descripcion": "Retroexcavadora sobre llantas JD 410", "precio": 112890.0}, {"codigo": "C0010822", "unidad": "h", "descripcion": "Retroexcavadora sobre llantas, motor 62HP, Profundidad de excavación de 5.41 metros.", "precio": 104872.0}, {"codigo": "C0010790", "unidad": "h", "descripcion": "Retroexcavadora sobre oruga, potencia 138 HP, balde de 1,5 m3.", "precio": 184344.0}, {"codigo": "C0010811", "unidad": "h", "descripcion": "Retroexcavadora Tipo E-200 o  Equivalente", "precio": 112957.0}, {"codigo": "C0010765", "unidad": "h", "descripcion": "Retroexcavadora, Potencia en el Volante 78 HP 2200 RPM", "precio": 105093.0}, {"codigo": "C0010840", "unidad": "h", "descripcion": "Ruteadora", "precio": 3319.0}, {"codigo": "C0010841", "unidad": "h", "descripcion": "Sensor de Impacto para prueba de integridad tipo", "precio": 72450.0}, {"codigo": "C0010850", "unidad": "h", "descripcion": "Taco metálico o puntal (escamas en concreto)", "precio": 67.0}, {"codigo": "C0010853", "unidad": "h", "descripcion": "Taladro de 1/2´´, pulidora, lijadora y circular para corte extremo superior", "precio": 1743.0}, {"codigo": "C0010854", "unidad": "h", "descripcion": "Taladro de 1/2´´, pulidora, lijadora y circular", "precio": 1544.0}, {"codigo": "C0010855", "unidad": "h", "descripcion": "Taladro industrial", "precio": 2969.0}, {"codigo": "C0010859", "unidad": "u", "descripcion": "Tara (Recebo, Agua, Etc.)", "precio": 199200.0}, {"codigo": "C0010860", "unidad": "h", "descripcion": "Tarifa de transporte", "precio": 35660.0}, {"codigo": "C0010861", "unidad": "m3k", "descripcion": "Tarifa de transporte (agregados pétreos)", "precio": 1155.0}, {"codigo": "C0010901", "unidad": "m3k", "descripcion": "Tarifa de transporte de concreto hidráulico en mixer", "precio": 965.0}, {"codigo": "C0010870", "unidad": "kgk", "descripcion": "Tarifa de transporte de estructuras metálicas", "precio": 0.0}, {"codigo": "C0010880", "unidad": "kgk", "descripcion": "Tarifa de transporte de estructuras metálicas en obra", "precio": 0.0}, {"codigo": "C0010900", "unidad": "m3k", "descripcion": "Tarifa de transporte de mezclas para bacheo", "precio": 1375.0}, {"codigo": "C0010890", "unidad": "m3k", "descripcion": "Tarifa de transporte de mezclas", "precio": 1237.0}, {"codigo": "C0010903", "unidad": "h", "descripcion": "Tarifa de Transporte de Postes", "precio": 44820.0}, {"codigo": "C0010862", "unidad": "m3k", "descripcion": "Tarifa de transporte para agregados de mezclas asfálticas", "precio": 822.0}, {"codigo": "C0010902", "unidad": "h", "descripcion": "Tarifa de Trasporte de especies vegetales", "precio": 40790.0}, {"codigo": "C0010911", "unidad": "h", "descripcion": "Terminadora de asfalto (Finisher), potencia 130 HP, peso 15 ton.", "precio": 129187.0}, {"codigo": "C0010910", "unidad": "h", "descripcion": "Terminadora de asfalto (Finisher), potencia en el volante 174 HP, R=20M3/H, velocidad de desplazamiento 114 m/min", "precio": 154966.0}, {"codigo": "C0010920", "unidad": "h", "descripcion": "Vehículo delineador", "precio": 111752.0}, {"codigo": "C0010921", "unidad": "h", "descripcion": "Vehículo delineador R=1500 M/H", "precio": 90003.0}, {"codigo": "C0010930", "unidad": "h", "descripcion": "Vibrador de concreto (incluye operario)", "precio": 7571.0}, {"codigo": "C0010922", "unidad": "h", "descripcion": "Vibrador de concreto, Motor de 3 hp a 18.000 rpm Mangueras de 4 mt", "precio": 4930.0}, {"codigo": "C0010180", "unidad": "h", "descripcion": "Vibrocompactador, tipo benitìn, de peso 700 kg a 1.5 toneladas", "precio": 37037.0}, {"codigo": "C0010940", "unidad": "h", "descripcion": "Vibrocompatador Dynapac (10 ton)", "precio": 89918.0}, {"codigo": "C0010950", "unidad": "h", "descripcion": "Vibrocompatador Dynapac C15", "precio": 144891.0}, {"codigo": "C0010923", "unidad": "h", "descripcion": "Vibrocompatador, potencia 153 HP, peso 10 Ton.", "precio": 91333.0}, {"codigo": "C0010960", "unidad": "h", "descripcion": "Volqueta 6 m3", "precio": 58148.0}, {"codigo": "HM-001", "unidad": "día", "descripcion": "Pala cuadrada", "precio": 2000}, {"codigo": "HM-002", "unidad": "día", "descripcion": "Pica / pico", "precio": 2000}, {"codigo": "HM-003", "unidad": "día", "descripcion": "Carretilla buggy", "precio": 5000}, {"codigo": "HM-004", "unidad": "día", "descripcion": "Nivel de burbuja (60 cm)", "precio": 3000}, {"codigo": "HM-005", "unidad": "día", "descripcion": "Nivel láser rotativo", "precio": 45000}, {"codigo": "HM-006", "unidad": "día", "descripcion": "Plomada", "precio": 1500}, {"codigo": "HM-007", "unidad": "día", "descripcion": "Flexómetro / cinta métrica 5m", "precio": 1500}, {"codigo": "HM-008", "unidad": "día", "descripcion": "Martillo de uña", "precio": 2000}, {"codigo": "HM-009", "unidad": "día", "descripcion": "Combo / mazo", "precio": 2500}, {"codigo": "HM-010", "unidad": "día", "descripcion": "Taladro percutor eléctrico", "precio": 15000}, {"codigo": "HM-011", "unidad": "día", "descripcion": "Pulidora / esmeril angular", "precio": 18000}, {"codigo": "HM-012", "unidad": "día", "descripcion": "Equipo de soldadura eléctrica", "precio": 40000}, {"codigo": "HM-013", "unidad": "día", "descripcion": "Escuadra metálica", "precio": 2000}, {"codigo": "HM-014", "unidad": "día", "descripcion": "Andamio tubular por cuerpo", "precio": 8000}, {"codigo": "HM-015", "unidad": "día", "descripcion": "Escalera tijera 6 pasos", "precio": 5000}, {"codigo": "HM-016", "unidad": "día", "descripcion": "Balde plástico 20L", "precio": 1000}, {"codigo": "HM-017", "unidad": "día", "descripcion": "Llana metálica", "precio": 2000}, {"codigo": "HM-018", "unidad": "día", "descripcion": "Llana de esponja", "precio": 2000}, {"codigo": "HM-019", "unidad": "día", "descripcion": "Cuchara de albañil", "precio": 1500}, {"codigo": "HM-020", "unidad": "día", "descripcion": "Cortadora de baldosa manual", "precio": 12000}, {"codigo": "HM-021", "unidad": "día", "descripcion": "Cortadora de baldosa eléctrica (pulidora con disco diamantado)", "precio": 20000}, {"codigo": "HM-022", "unidad": "día", "descripcion": "Mezcladora de mortero eléctrica portátil (taladro mezclador)", "precio": 15000}, {"codigo": "HM-023", "unidad": "día", "descripcion": "Vibrador de concreto tipo aguja (pequeño, eléctrico)", "precio": 35000}, {"codigo": "HM-024", "unidad": "día", "descripcion": "Regla vibratoria para placas", "precio": 60000}, {"codigo": "HM-025", "unidad": "día", "descripcion": "Cortadora de varilla manual", "precio": 8000}, {"codigo": "HM-026", "unidad": "día", "descripcion": "Dobladora de varilla manual", "precio": 8000}, {"codigo": "HM-027", "unidad": "día", "descripcion": "Cizalla para varilla", "precio": 6000}, {"codigo": "HM-028", "unidad": "día", "descripcion": "Compactador de placa (canguro) pequeño", "precio": 50000}, {"codigo": "HM-029", "unidad": "día", "descripcion": "Brocha para pintura (juego)", "precio": 3000}, {"codigo": "HM-030", "unidad": "día", "descripcion": "Rodillo para pintura (juego)", "precio": 3000}, {"codigo": "HM-031", "unidad": "día", "descripcion": "Manguera de nivel", "precio": 1500}, {"codigo": "HM-032", "unidad": "día", "descripcion": "Cortafrío / cincel", "precio": 1500}, {"codigo": "HM-033", "unidad": "día", "descripcion": "Barra de acero (pata de cabra)", "precio": 2500}, {"codigo": "HM-034", "unidad": "día", "descripcion": "Cuerda de nylon / piola de construcción", "precio": 1000}, {"codigo": "HM-035", "unidad": "día", "descripcion": "Guantes de trabajo (par)", "precio": 1000}, {"codigo": "HM-036", "unidad": "día", "descripcion": "Casco de seguridad", "precio": 500}, {"codigo": "HM-037", "unidad": "día", "descripcion": "Arnés de seguridad", "precio": 5000}, {"codigo": "HM-038", "unidad": "día", "descripcion": "Extensión eléctrica industrial (20m)", "precio": 3000}, {"codigo": "HM-039", "unidad": "día", "descripcion": "Generador eléctrico portátil", "precio": 60000}, {"codigo": "HM-040", "unidad": "día", "descripcion": "Sierra circular manual", "precio": 18000}, {"codigo": "HM-041", "unidad": "día", "descripcion": "Camabaja (tractocamión + remolque cama baja)", "precio": 350000}, {"codigo": "C0010421", "unidad": "h", "descripcion": "Nivel de precisión", "precio": 14000.0}, {"codigo": "C0010500", "unidad": "und/mes", "descripcion": "Andamio multidireccional por cuerpo", "precio": 45000.0}, {"codigo": "C0010501", "unidad": "und/mes", "descripcion": "Andamio certificado tipo torre", "precio": 65000.0}, {"codigo": "C0010502", "unidad": "und/mes", "descripcion": "Andamio colgante", "precio": 85000.0}, {"codigo": "C0010503", "unidad": "h", "descripcion": "Motobomba 8 pulgadas", "precio": 45000.0}, {"codigo": "C0010504", "unidad": "h", "descripcion": "Excavadora sobre orugas", "precio": 180000.0}, {"codigo": "H0010001", "unidad": "und", "descripcion": "Pala redonda", "precio": 35000.0}];

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
    const coincide = CATALOGO_APU.filter(
      (it) =>
        it.actividad.toLowerCase().includes(q) ||
        it.capitulo.toLowerCase().includes(q)
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

function BuscadorCelda({ valor, onSeleccionar, catalogo, placeholder }) {
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
      return a.descripcion.length - b.descripcion.length;
    });
    return coincide.slice(0, 10);
  }, [texto, catalogo]);

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
const RENDIMIENTOS_MATERIALES_POR_ACTIVIDAD = {"Concreto f'c=175 kg/cm² (2500 PSI)": [{"material": "Cemento gris", "consumo": 280, "unidad": "kg", "factor": 0.03, "nota": "Dosificación típica 1:2.8:3.5 aprox — mezcladora, agregados en buen estado"}, {"material": "Arena de río / peña", "consumo": 0.52, "unidad": "m³", "factor": 0.05, "nota": "Volumen suelto aprox."}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": "Volumen suelto aprox."}, {"material": "Agua", "consumo": 180, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.64"}], "Concreto f'c=210 kg/cm² (3000 PSI)": [{"material": "Cemento gris", "consumo": 320, "unidad": "kg", "factor": 0.03, "nota": "Dosificación estándar de referencia CAMACOL/ICPC"}, {"material": "Arena de río / peña", "consumo": 0.5, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 175, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.55"}], "Concreto f'c=280 kg/cm² (4000 PSI)": [{"material": "Cemento gris", "consumo": 360, "unidad": "kg", "factor": 0.03, "nota": ""}, {"material": "Arena de río / peña", "consumo": 0.48, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 170, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.47"}], "Concreto f'c=350 kg/cm² (5000 PSI)": [{"material": "Cemento gris", "consumo": 400, "unidad": "kg", "factor": 0.03, "nota": ""}, {"material": "Arena de río / peña", "consumo": 0.46, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 160, "unidad": "Lt", "factor": 0.02, "nota": "Relación agua/cemento aprox. 0.40"}], "Concreto f'c=420 kg/cm² (6000 PSI)": [{"material": "Cemento gris", "consumo": 440, "unidad": "kg", "factor": 0.03, "nota": "Alta resistencia — normalmente con aditivo"}, {"material": "Arena de río / peña", "consumo": 0.44, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Grava / triturado 3/4\"", "consumo": 0.75, "unidad": "m³", "factor": 0.05, "nota": ""}, {"material": "Agua", "consumo": 150, "unidad": "Lt", "factor": 0.02, "nota": ""}, {"material": "Aditivo plastificante/superplastificante", "consumo": 4, "unidad": "Lt", "factor": 0.05, "nota": "Necesario para reducir relación a/c manteniendo trabajabilidad"}], "Concreto ciclópeo": [{"material": "Concreto simple (base, f'c=175)", "consumo": 0.7, "unidad": "m³", "factor": 0.03, "nota": "El 30% restante es piedra rajón/bola grande"}, {"material": "Piedra rajón / bola grande", "consumo": 0.35, "unidad": "m³", "factor": 0.05, "nota": "Aprox. 30-35% del volumen, tamaño 15-25cm"}], "Suministro, figurado y amarre de acero de refuerzo 60.000 PSI": [{"material": "Acero PDR-60 / Refuerzo", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": "1 kg de material por 1 kg instalado, más desperdicio por cortes/traslapos"}, {"material": "Alambre negro No.18 (amarre)", "consumo": 0.02, "unidad": "kg", "factor": 0.05, "nota": "Aprox. 2% del peso de acero, para amarres"}], "Suministro, figurado y amarre de acero de refuerzo 37.000 PSI": [{"material": "Acero PDR-37 / Refuerzo liso", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": ""}, {"material": "Alambre negro No.18 (amarre)", "consumo": 0.02, "unidad": "kg", "factor": 0.05, "nota": ""}], "Mampostería en bloque de concreto": [{"material": "Bloque de concreto (según formato)", "consumo": 12.5, "unidad": "und", "factor": 0.05, "nota": "Formato estándar 40x20x20 cm aprox."}, {"material": "Cemento gris (mortero de pega)", "consumo": 5, "unidad": "kg", "factor": 0.1, "nota": "Mortero 1:4 aprox."}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.018, "unidad": "m³", "factor": 0.1, "nota": ""}], "Mampostería en ladrillo": [{"material": "Ladrillo tolete / bloque #5", "consumo": 60, "unidad": "und", "factor": 0.05, "nota": "Ladrillo tolete común, aparejo estándar"}, {"material": "Cemento gris (mortero de pega)", "consumo": 6, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.02, "unidad": "m³", "factor": 0.1, "nota": ""}], "Mampostería estructural": [{"material": "Bloque estructural (según formato)", "consumo": 12.5, "unidad": "und", "factor": 0.05, "nota": "Formato 40x20x20 cm, celdas para refuerzo"}, {"material": "Cemento gris (mortero de pega)", "consumo": 5.5, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Arena de peña (mortero de pega)", "consumo": 0.019, "unidad": "m³", "factor": 0.1, "nota": ""}, {"material": "Grout / concreto de relleno de celdas", "consumo": 0.012, "unidad": "m³", "factor": 0.05, "nota": "Según diseño estructural, celdas reforzadas"}], "Pañete / revoque interior": [{"material": "Cemento gris", "consumo": 6.5, "unidad": "kg", "factor": 0.1, "nota": "Espesor aprox. 1.5 cm, mortero 1:4"}, {"material": "Arena de peña", "consumo": 0.023, "unidad": "m³", "factor": 0.1, "nota": ""}], "Pañete / revoque exterior": [{"material": "Cemento gris", "consumo": 8, "unidad": "kg", "factor": 0.1, "nota": "Espesor aprox. 2 cm, mortero 1:3, mayor resistencia"}, {"material": "Arena de peña", "consumo": 0.024, "unidad": "m³", "factor": 0.1, "nota": ""}], "Estuco plástico": [{"material": "Estuco plástico (material listo)", "consumo": 0.8, "unidad": "kg", "factor": 0.1, "nota": "Aplicación en 2 manos, superficie normal"}], "Piso cerámico": [{"material": "Cerámica (según formato elegido)", "consumo": 1.05, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Pegacor / adhesivo cerámico", "consumo": 4.5, "unidad": "kg", "factor": 0.1, "nota": "Espesor de capa estándar con llana dentada"}, {"material": "Boquilla / fragüe", "consumo": 0.4, "unidad": "kg", "factor": 0.05, "nota": "Junta de 2-3mm aprox."}], "Piso en porcelanato": [{"material": "Porcelanato (según formato elegido)", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Mayor desperdicio por formatos grandes y rectificado"}, {"material": "Pegacor / adhesivo para porcelanato", "consumo": 5.5, "unidad": "kg", "factor": 0.1, "nota": "Adhesivo de mayor rendimiento, piezas grandes/pesadas"}, {"material": "Boquilla / fragüe", "consumo": 0.3, "unidad": "kg", "factor": 0.05, "nota": ""}], "Pintura vinílica interior": [{"material": "Pintura vinílica tipo 1", "consumo": 0.1, "unidad": "gl", "factor": 0.1, "nota": "2 manos, sobre superficie ya estucada/imprimada"}, {"material": "Sellador / imprimante", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": "1 mano previa"}], "Pintura exterior": [{"material": "Pintura tipo exterior (acrílica/caucho)", "consumo": 0.12, "unidad": "gl", "factor": 0.1, "nota": "2 manos, mayor cubrimiento por textura"}, {"material": "Sellador / imprimante exterior", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": ""}], "Cerramiento provisional de obra": [{"material": "Malla polisombra / plástica", "consumo": 1.1, "unidad": "ML", "factor": 0.1, "nota": "Altura estándar 2.1-2.4m, incluye traslapos"}, {"material": "Parales/guadua o madera", "consumo": 0.33, "unidad": "und", "factor": 0.08, "nota": "1 parada cada 3m aprox."}], "Suministro, extendido y compactación de subbase": [{"material": "Subbase granular", "consumo": 1.25, "unidad": "m³", "factor": 0.1, "nota": "Factor de compactación aprox. 1.20-1.25 (material suelto vs compactado)"}], "Suministro, extendido y compactación de base granular": [{"material": "Base granular", "consumo": 1.25, "unidad": "m³", "factor": 0.1, "nota": "Factor de compactación aprox."}], "Relleno con material seleccionado compactado": [{"material": "Material seleccionado / recebo", "consumo": 1.2, "unidad": "m³", "factor": 0.08, "nota": "Factor de compactación"}], "Suministro y montaje de perfiles metálicos": [{"material": "Perfil metálico estructural (IPE/HEA/tubular)", "consumo": 1, "unidad": "kg", "factor": 0.05, "nota": "1 kg material por 1 kg instalado"}, {"material": "Pintura anticorrosiva para estructura", "consumo": 0.012, "unidad": "gl", "factor": 0.05, "nota": "Aprox. 1 galón cubre 80 kg de perfil, 2 manos"}, {"material": "Electrodo de soldadura", "consumo": 0.03, "unidad": "kg", "factor": 0.1, "nota": "Aprox. 3% del peso en soldadura"}], "Grouting cementoso para reparación estructural": [{"material": "Grout cementoso", "consumo": 20, "unidad": "kg", "factor": 0.1, "nota": "Espesor promedio 1.5 cm"}], "Muros en sistema liviano / drywall": [{"material": "Lámina de yeso / drywall (2 caras)", "consumo": 2.1, "unidad": "m²", "factor": 0.1, "nota": "1 m² de muro = 2 láminas (ambas caras)"}, {"material": "Perfilería metálica (parales + riel)", "consumo": 2.5, "unidad": "ml", "factor": 0.08, "nota": "Parales cada 40-60 cm más rieles superior/inferior"}, {"material": "Lana mineral / aislamiento (si aplica)", "consumo": 1, "unidad": "m²", "factor": 0.05, "nota": "Opcional según especificación acústica"}, {"material": "Tornillería y cinta para juntas", "consumo": 0.15, "unidad": "kg", "factor": 0.1, "nota": ""}], "Suministro e instalación de teja": [{"material": "Teja (según tipo: fibrocemento/termoacústica)", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos según pendiente"}, {"material": "Tornillería / ganchos de fijación", "consumo": 6, "unidad": "und", "factor": 0.08, "nota": "Aprox. 6 fijaciones por m²"}], "Impermeabilización de cubierta": [{"material": "Manto asfáltico / membrana impermeabilizante", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos de 10cm entre rollos"}, {"material": "Imprimante asfáltico", "consumo": 0.25, "unidad": "gl", "factor": 0.05, "nota": ""}], "Cielo raso Dry Wall": [{"material": "Lámina de yeso para cielo raso", "consumo": 1.05, "unidad": "m²", "factor": 0.08, "nota": ""}, {"material": "Perfilería metálica para cielo raso (omega/canal)", "consumo": 2.2, "unidad": "ml", "factor": 0.08, "nota": ""}], "Impermeabilización de losas y terrazas": [{"material": "Manto asfáltico / membrana impermeabilizante", "consumo": 1.1, "unidad": "m²", "factor": 0.1, "nota": "Incluye traslapos"}, {"material": "Imprimante asfáltico", "consumo": 0.25, "unidad": "gl", "factor": 0.05, "nota": ""}], "Impermeabilización de muros": [{"material": "Impermeabilizante tipo membrana líquida/cementoso", "consumo": 2, "unidad": "kg", "factor": 0.1, "nota": "2 manos, espesor estándar"}], "Impermeabilización de zonas húmedas": [{"material": "Impermeabilizante cementoso flexible", "consumo": 3, "unidad": "kg", "factor": 0.1, "nota": "2-3 manos, mayor exigencia por humedad constante"}], "Pañete impermeabilizado": [{"material": "Cemento gris", "consumo": 7, "unidad": "kg", "factor": 0.1, "nota": "Mortero 1:3 con aditivo impermeabilizante"}, {"material": "Arena de peña", "consumo": 0.022, "unidad": "m³", "factor": 0.1, "nota": ""}, {"material": "Aditivo impermeabilizante integral", "consumo": 0.3, "unidad": "kg", "factor": 0.05, "nota": ""}], "Mortero de nivelación": [{"material": "Cemento gris", "consumo": 5, "unidad": "kg", "factor": 0.1, "nota": "Espesor promedio 2 cm"}, {"material": "Arena de peña", "consumo": 0.02, "unidad": "m³", "factor": 0.1, "nota": ""}], "Piso vinílico": [{"material": "Baldosa/lámina vinílica", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Adhesivo para vinílico", "consumo": 0.3, "unidad": "kg", "factor": 0.08, "nota": ""}], "Piso laminado": [{"material": "Lámina de piso laminado", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes"}, {"material": "Espuma/base niveladora", "consumo": 1.05, "unidad": "m²", "factor": 0.05, "nota": ""}], "Enchape cerámico en muros": [{"material": "Cerámica de muro", "consumo": 1.08, "unidad": "m²", "factor": 0.1, "nota": "Incluye desperdicio por cortes verticales"}, {"material": "Pegacor / adhesivo cerámico", "consumo": 4, "unidad": "kg", "factor": 0.1, "nota": ""}, {"material": "Boquilla / fragüe", "consumo": 0.35, "unidad": "kg", "factor": 0.05, "nota": ""}], "Pintura esmalte en superficies metálicas/madera": [{"material": "Esmalte sintético/poliuretano", "consumo": 0.1, "unidad": "gl", "factor": 0.1, "nota": "2 manos"}, {"material": "Anticorrosivo/sellador base", "consumo": 0.06, "unidad": "gl", "factor": 0.05, "nota": "1 mano previa"}], "Pintura anticorrosiva": [{"material": "Pintura anticorrosiva (2 manos)", "consumo": 0.12, "unidad": "gl", "factor": 0.1, "nota": ""}], "Sellador / imprimante": [{"material": "Sellador acrílico", "consumo": 0.05, "unidad": "gl", "factor": 0.05, "nota": "1 mano"}], "Estuco tradicional": [{"material": "Estuco tradicional (yeso/cal)", "consumo": 1.5, "unidad": "kg", "factor": 0.1, "nota": "Aplicación tradicional en 2-3 manos, mayor consumo que estuco plástico"}], "Tubería de agua fría": [{"material": "Tubería PVC presión / CPVC", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": "Incluye desperdicio por cortes"}, {"material": "Accesorios (codos, uniones, tees)", "consumo": 0.4, "unidad": "und", "factor": 0.08, "nota": "Aprox. 1 accesorio cada 2.5m"}], "Tubería de agua caliente": [{"material": "Tubería CPVC agua caliente", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios (codos, uniones, tees)", "consumo": 0.4, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería sanitaria": [{"material": "Tubería PVC sanitaria", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios sanitarios (codos, yee, uniones)", "consumo": 0.35, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería de aguas lluvias": [{"material": "Tubería PVC / novafort aguas lluvias", "consumo": 1.05, "unidad": "ml", "factor": 0.08, "nota": ""}, {"material": "Accesorios", "consumo": 0.3, "unidad": "und", "factor": 0.08, "nota": ""}], "Tubería/conduit eléctrica": [{"material": "Tubería EMT/PVC conduit", "consumo": 1.08, "unidad": "ml", "factor": 0.08, "nota": "Incluye desperdicio y curvas"}, {"material": "Accesorios (uniones, curvas, cajas de paso)", "consumo": 0.3, "unidad": "und", "factor": 0.08, "nota": ""}], "Cableado de fuerza": [{"material": "Cable THHN calibre según diseño", "consumo": 1.1, "unidad": "ml", "factor": 0.08, "nota": "Incluye holguras en cajas"}], "Cableado de iluminación": [{"material": "Cable THHN calibre 12-14", "consumo": 1.1, "unidad": "ml", "factor": 0.08, "nota": ""}], "Construcción de andenes": [{"material": "Concreto f'c=210 (3000 PSI) para andenes", "consumo": 0.08, "unidad": "m³", "factor": 0.05, "nota": "Espesor estándar 8 cm"}, {"material": "Malla electrosoldada", "consumo": 1.05, "unidad": "m²", "factor": 0.05, "nota": "Refuerzo de retracción"}], "Sardineles y bordillos": [{"material": "Concreto f'c=210 (3000 PSI) para sardinel", "consumo": 0.03, "unidad": "m³", "factor": 0.05, "nota": "Sección estándar 15x25 cm aprox."}]};

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
    [/cemento gris/, 0.35],
    [/arena/, 0.045],
    [/grava|triturado|agregado grueso/, 0.065],
    [/ladrillo/, 40],
    [/bloque/, 12.5],
    [/cerámic|porcelanat/, 1.05],
    [/pintura|esmalte|vinílic/, 0.30],
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

function TablaFilas({ titulo, filas, setFilas, catalogo, consumoSugerido, mostrarFactor, rendimientoActual, esMateriales, actividadPrincipal }) {
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
    } else if (!cantSugerida && consumoSugerido) {
      cantSugerida = String(consumoSugerido);
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
      {consumoSugerido !== undefined && consumoSugerido !== null && (
        <div className="text-[10.5px] px-3 py-1.5 border border-t-0" style={{ background: "#FFF8E8", borderColor: LINE, color: NAVY }}>
          ⚡ Al elegir una descripción, el Consumo se sugiere automáticamente (1÷Rendimiento = {consumoSugerido} jornadas/unidad). Agrega el Factor de desperdicio si aplica — Subtotal = Consumo × Factor × Precio.
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
                <label className="text-[10px] text-gray-500 block mb-0.5">{esMateriales ? "Cantidad (consumo por unidad)" : "Consumo"}</label>
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
                  <label className="text-[10px] text-gray-500 block mb-0.5">Factor de desperdicio</label>
                  <input
                    placeholder="Ej: 1.05"
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
          {mostrarFactor && rendimientoActual && f.cant && (
            <div className="text-[10px] text-gray-500 px-2 pb-1">
              1 ÷ {rendimientoActual} (Rendimiento) = {f.cant}
            </div>
          )}
          {esMateriales && f.fuenteConsumo && (
            <div className="text-[10px] text-gray-500 px-2 pb-1 italic">
              📎 {f.fuenteConsumo}
            </div>
          )}
          {(f.cant || f.vrUnit) && (
            <div className="text-[10.5px] text-right px-2 pb-1.5 font-medium" style={{ color: NAVY }}>
              Subtotal: $ {((numES(f.cant) || 0) * (mostrarFactor ? (numES(f.factor) || 1) : 1) * (numES(f.vrUnit) || 0)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

  const [materiales, setMateriales] = useState(seisFilasVacias());
  const [manoObra, setManoObra] = useState(seisFilasVacias());
  const [equipos, setEquipos] = useState(seisFilasVacias());

  const [elaboradoNombre, setElaboradoNombre] = useState("");
  const [elaboradoCargo, setElaboradoCargo] = useState("");
  const [interventoriaNombre, setInterventoriaNombre] = useState("");
  const [interventoriaCargo, setInterventoriaCargo] = useState("");

  const [generando, setGenerando] = useState(false);

  const totalDirectoUnitarioVista = useMemo(() => {
    const sumar = (filas, conFactor) => filas.reduce((acc, f) => acc + (numES(f.cant) || 0) * (conFactor ? (numES(f.factor) || 1) : 1) * (numES(f.vrUnit) || 0), 0);
    return sumar(materiales, true) + sumar(manoObra, true) + sumar(equipos, true);
  }, [materiales, manoObra, equipos]);

  const unidadRendimiento = actividad ? `${actividad.unidad}/jornada` : "";

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      const nombreActividad = ws.getCell("A10").value;
      if (nombreActividad) setActividad({ actividad: String(nombreActividad), unidad: ws.getCell("P4").value || "" });
      setCuadrilla(ws.getCell("S4").value || "");
      setJornada(ws.getCell("U4").value || 8);
      setRendimiento(ws.getCell("V4").value || "");
      setProyecto(ws.getCell("C13").value || "");
      setNoContrato(ws.getCell("C14").value || "");
      setUbicacion(ws.getCell("J15").value || "");

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
      setMateriales(leerFilas(22, true));
      setManoObra(leerFilas(40, true));
      setEquipos(leerFilas(58, true));

      setElaboradoNombre(ws.getCell("C54").value || "");
      setElaboradoCargo(ws.getCell("C55").value || "");
      setInterventoriaNombre(ws.getCell("H54").value || "");
      setInterventoriaCargo(ws.getCell("H55").value || "");

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
      const ws = workbook.getWorksheet("Apu's");

      ws.getCell("A10").value = (actividad.actividad || "").toUpperCase();
      ws.getCell("P4").value = actividad.unidad;
      ws.getCell("S4").value = cuadrilla;
      ws.getCell("U4").value = numES(jornada) || 0;
      ws.getCell("V4").value = numES(rendimiento) || 0;

      ws.getCell("C13").value = proyecto;
      ws.getCell("C14").value = noContrato;
      ws.getCell("J14").value = fechaDDMMYYYY();
      ws.getCell("J15").value = ubicacion;

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
      escribirFilas(materiales, 22, true);
      escribirFilas(manoObra, 40, true);
      escribirFilas(equipos, 58, true);

      const sumar = (filas, conFactor) =>
        filas.reduce((acc, f) => acc + (numES(f.cant) || 0) * (conFactor ? (numES(f.factor) || 1) : 1) * (numES(f.vrUnit) || 0), 0);
      const totalDirectoUnitario = sumar(materiales, true) + sumar(manoObra, true) + sumar(equipos, true);

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

      ws.getCell("C54").value = elaboradoNombre;
      ws.getCell("C55").value = elaboradoCargo;
      ws.getCell("H54").value = interventoriaNombre;
      ws.getCell("H55").value = interventoriaCargo;

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
    } catch (err) {
      console.error(err);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
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
              ANÁLISIS DE PRECIOS UNITARIOS
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
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

        <TablaFilas titulo="1. MATERIALES" filas={materiales} setFilas={setMateriales} catalogo={CATALOGO_MATERIALES} mostrarFactor esMateriales actividadPrincipal={actividad?.actividad} />
        <TablaFilas titulo="2. MANO DE OBRA" filas={manoObra} setFilas={setManoObra} catalogo={CATALOGO_MANO_OBRA} consumoSugerido={numES(rendimiento) ? Math.round((1 / numES(rendimiento)) * 1000000) / 1000000 : null} mostrarFactor rendimientoActual={rendimiento} />
        <TablaFilas titulo="3. EQUIPOS Y HERRAMIENTAS" filas={equipos} setFilas={setEquipos} catalogo={CATALOGO_EQUIPOS} consumoSugerido={numES(rendimiento) ? Math.round((1 / numES(rendimiento)) * 1000000) / 1000000 : null} mostrarFactor rendimientoActual={rendimiento} />

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
