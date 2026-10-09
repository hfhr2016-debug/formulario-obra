import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { catalogoVigente } from "./catalogoVivo";
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
const CATALOGO_APU = JSON.parse(String.raw`[{"actividad": "Replanteo general de ejes y niveles", "unidad": "ml", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Desmonte desacapote y limpieza", "unidad": "m2", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Cerramiento provisional de obra", "unidad": "ml", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Instalación de campamento y oficinas provisionales", "unidad": "m²", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Adecuación de área de almacenamiento", "unidad": "m²", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Señalización preventiva e informativa de obra", "unidad": "und", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Instalaciones provisionales de agua y energía", "unidad": "gl", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Protección de elementos existentes", "unidad": "m²", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Desmonte y limpieza inicial", "unidad": "m²", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Demoliciones preliminares", "unidad": "m³", "capitulo": "PRELIMINARES", "tipo": "edificacion"}, {"actividad": "Excavación manual en material común", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Excavación mecánica", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Excavación en roca", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Perfilado y conformación de excavaciones", "unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Relleno con material seleccionado compactado", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Relleno con material proveniente de excavación", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Suministro, extendido y compactación de subbase", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Suministro, extendido y compactación de base granular", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Cargue de material sobrante", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Transporte de material sobrante", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Disposición final de sobrantes", "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "edificacion"}, {"actividad": "Concreto de limpieza / solado", "unidad": "m³", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Concreto para zapatas", "unidad": "m³", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Concreto para vigas de cimentación", "unidad": "m³", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Concreto para losas de cimentación", "unidad": "m³", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Concreto para pedestales", "unidad": "m³", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Acero de refuerzo en cimentación", "unidad": "kg", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Formaleta para elementos de cimentación", "unidad": "m²", "capitulo": "CIMENTACIONES", "tipo": "edificacion"}, {"actividad": "Concreto para columnas", "unidad": "m³", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Concreto para vigas", "unidad": "m³", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Concreto para losas", "unidad": "m³", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Concreto para escaleras", "unidad": "m³", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Concreto para muros estructurales", "unidad": "m³", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Acero de refuerzo de columnas", "unidad": "kg", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Acero de refuerzo de vigas", "unidad": "kg", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Acero de refuerzo de losas", "unidad": "kg", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Formaleta de columnas", "unidad": "m²", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Formaleta de vigas", "unidad": "m²", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Formaleta de losas", "unidad": "m²", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Formaleta de escaleras", "unidad": "m²", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Suministro y montaje de perfiles metálicos", "unidad": "kg", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Placas, pernos y conexiones metálicas", "unidad": "kg", "capitulo": "ESTRUCTURA", "tipo": "edificacion"}, {"actividad": "Mampostería en bloque de concreto", "unidad": "m²", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Mampostería en ladrillo", "unidad": "m²", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Mampostería estructural", "unidad": "m²", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Muros en sistema liviano / drywall", "unidad": "m²", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Dinteles sobre vanos", "unidad": "ml", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Alfajías y remates", "unidad": "ml", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Anclajes y refuerzos de mampostería", "unidad": "und", "capitulo": "MAMPOSTERÍA", "tipo": "edificacion"}, {"actividad": "Estructura metálica o de madera para cubierta", "unidad": "kg", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Cerchas y elementos estructurales", "unidad": "kg", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Suministro e instalación de teja", "unidad": "m²", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Impermeabilización de cubierta", "unidad": "m²", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Aislamiento térmico/acústico", "unidad": "m²", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Canales de aguas lluvias", "unidad": "ml", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Bajantes de aguas lluvias", "unidad": "ml", "capitulo": "CUBIERTAS", "tipo": "edificacion"}, {"actividad": "Impermeabilización de losas y terrazas", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES", "tipo": "edificacion"}, {"actividad": "Impermeabilización de muros", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES", "tipo": "edificacion"}, {"actividad": "Impermeabilización de zonas húmedas", "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES", "tipo": "edificacion"}, {"actividad": "Pañete / revoque interior", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES", "tipo": "edificacion"}, {"actividad": "Pañete / revoque exterior", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES", "tipo": "edificacion"}, {"actividad": "Pañete impermeabilizado", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES", "tipo": "edificacion"}, {"actividad": "Estuco plástico o tradicional", "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES", "tipo": "edificacion"}, {"actividad": "Mortero de nivelación", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Piso cerámico", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Piso en porcelanato", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Piso vinílico", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Piso laminado", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Enchape cerámico en muros", "unidad": "m²", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Guardaescoba", "unidad": "ml", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Juntas de dilatación / construcción", "unidad": "ml", "capitulo": "PISOS Y ENCHAPES", "tipo": "edificacion"}, {"actividad": "Pintura vinílica interior", "unidad": "m²", "capitulo": "PINTURA", "tipo": "edificacion"}, {"actividad": "Pintura exterior", "unidad": "m²", "capitulo": "PINTURA", "tipo": "edificacion"}, {"actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "m²", "capitulo": "PINTURA", "tipo": "edificacion"}, {"actividad": "Pintura anticorrosiva", "unidad": "m²", "capitulo": "PINTURA", "tipo": "edificacion"}, {"actividad": "Sellador / imprimante", "unidad": "m²", "capitulo": "PINTURA", "tipo": "edificacion"}, {"actividad": "Puertas de madera", "unidad": "und", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Muebles fijos de madera", "unidad": "ml", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Puertas metálicas", "unidad": "und", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Barandas metálicas", "unidad": "ml", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Pasamanos", "unidad": "ml", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Ventanas de aluminio", "unidad": "m²", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Divisiones de aluminio", "unidad": "m²", "capitulo": "CARPINTERÍA", "tipo": "edificacion"}, {"actividad": "Vidrio templado", "unidad": "m²", "capitulo": "VIDRIOS", "tipo": "edificacion"}, {"actividad": "Vidrio laminado", "unidad": "m²", "capitulo": "VIDRIOS", "tipo": "edificacion"}, {"actividad": "Espejos", "unidad": "m²", "capitulo": "VIDRIOS", "tipo": "edificacion"}, {"actividad": "Sellos y silicona", "unidad": "ml", "capitulo": "VIDRIOS", "tipo": "edificacion"}, {"actividad": "Tubería de agua fría", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Tubería de agua caliente", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Válvulas y accesorios", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Tubería sanitaria", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Tubería de aguas lluvias", "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Cajas de inspección", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Aparatos sanitarios", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Lavamanos", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Griferías", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Duchas", "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS", "tipo": "edificacion"}, {"actividad": "Tubería/conduit eléctrica", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Bandejas portacables", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Cajas eléctricas", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Cableado de fuerza", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Cableado de iluminación", "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Tableros eléctricos", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Tomacorrientes", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Interruptores", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Luminarias", "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Sistema de puesta a tierra", "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Pruebas y certificaciones", "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS", "tipo": "edificacion"}, {"actividad": "Cableado estructurado de datos", "unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Rack de comunicaciones", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Cámaras y sistema CCTV", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Control de acceso", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Sistema de citofonía", "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Sistema de detección de incendios", "unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD", "tipo": "edificacion"}, {"actividad": "Equipos de aire acondicionado", "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN", "tipo": "edificacion"}, {"actividad": "Ductos de ventilación", "unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN", "tipo": "edificacion"}, {"actividad": "Tubería de refrigerante", "unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN", "tipo": "edificacion"}, {"actividad": "Rejillas y difusores", "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN", "tipo": "edificacion"}, {"actividad": "Red interna de gas", "unidad": "ml", "capitulo": "GAS", "tipo": "edificacion"}, {"actividad": "Válvulas y accesorios", "unidad": "und", "capitulo": "GAS", "tipo": "edificacion"}, {"actividad": "Pruebas y certificación", "unidad": "gl", "capitulo": "GAS", "tipo": "edificacion"}, {"actividad": "Construcción de andenes", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Placas de concreto exteriores", "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Pavimento en adoquín", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Sardineles y bordillos", "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Sumideros exteriores", "unidad": "und", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Suministro y extendido de tierra vegetal", "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Siembra y jardinería", "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES", "tipo": "edificacion"}, {"actividad": "Rejas metálicas", "unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS", "tipo": "edificacion"}, {"actividad": "Escaleras metálicas", "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS", "tipo": "edificacion"}, {"actividad": "Elementos metálicos especiales", "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS", "tipo": "edificacion"}, {"actividad": "Mobiliario fijo de obra", "unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS", "tipo": "edificacion"}, {"actividad": "Limpieza gruesa y fina de obra", "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE", "tipo": "edificacion"}, {"actividad": "Limpieza final para entrega", "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE", "tipo": "edificacion"}, {"actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE", "tipo": "edificacion"}, {"actividad": "Actualización de planos récord / as-built", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE", "tipo": "edificacion"}, {"actividad": "Entrega, manuales y acta de recibo", "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE", "tipo": "edificacion"}, {"actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "und", "capitulo": "ASCENSORES", "tipo": "edificacion"}, {"actividad": "Estudio de suelos y geotecnia", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "tipo": "edificacion"}, {"actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "tipo": "edificacion"}, {"actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "tipo": "edificacion"}, {"actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "tipo": "edificacion"}, {"actividad": "Desmonte y limpieza en bosque", "unidad": "ha", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Desmonte y limpieza en zonas no boscosas", "unidad": "ha", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de edificaciones", "unidad": "gl", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de estructuras", "unidad": "gl", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de pavimentos rígidos, pisos, andenes y bordillos de concreto", "unidad": "gl", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de obstáculos", "unidad": "gl", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de edificaciones", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de estructuras", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de estructuras", "unidad": "m3", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de pavimentos rígidos", "unidad": "m2", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de pisos y andenes de concreto", "unidad": "m2", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Demolición de bordillos de concreto", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Desmontaje y traslado de estructuras metálicas", "unidad": "kg", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de especies vegetales", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de obstáculos (se deberá hacer un ítem de pago para cada tipo de obstáculo)", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de ductos de servicios existentes", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de alcantarillas", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de cercas de alambre", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Traslado de postes", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Traslado de torres", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de rieles", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de defensas metálicas", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Remoción de barreras de seguridad", "unidad": "m", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo I traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo I traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo I traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo II traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo II. traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo II traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo III traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo III traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante  de arboles tipo III traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo IV traslado corto", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo IV traslado largo", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Transplante de arboles tipo IV traslado especial", "unidad": "unidad", "capitulo": "PRELIMINARES", "tipo": "vias"}, {"actividad": "Excavación sin clasificar de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Excavación sin clasificar de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Excavación en roca de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Excavación en material común de la explanación y canales", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Excavación en roca de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Excavación en material común de préstamos", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Remoción de derrumbes", "unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS", "tipo": "vias"}, {"actividad": "Terraplenes", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Pedraplén compacto", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Pedraplén suelto", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geotextil de refuerzo tipo NT-2500 para terraplenes reforzados por  geosinteticos", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geomalla de refuerzo tipos asphalt", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Relleno seleccionado para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Relleno tipo sub base granular para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Relleno tipo base granular para terraplenes reforzados con geosinteticos", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Mejoramiento de la subrasante con adicion de materiales", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geotextil para separación de suelos de subrasante y capas granulares", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geotextil para estabilización de la subrasante", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geomalla para estabilizaciòn de suelos de subrasante", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Geomalla para refuerzo de capas granulares", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Conformación de taludes existentes", "unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Subrasante estabilizada con cemento (incluye el suministro de cemento)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Subrasante estabilizada con cemento (no incluye el suministro de cemento)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Cemento para estabilizacion de subrasante", "unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Subrasante estabilizada con cal (incluye suministro de cal)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Subrasante estabilizada con cal (no incluye suministro de cal)", "unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Cal hidratada para estabilizacion de subrasante", "unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS", "tipo": "vias"}, {"actividad": "Conformación de la calzada existente", "unidad": "m2", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Afirmado", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Tratamiento paliativo de polvo aplicado en forma sólida en hojuelas", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Tratamiento paliativo de polvo aplicado en forma sólida en esferas", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Tratamiento paliativo de polvo aplicado en forma líquida", "unidad": "lt", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Material granular de adición", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Subbase granular clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Subbase granular clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Subbase granular clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Sub-base granular  para bacheo clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Sub-base granular  para bacheo clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Sub-base granular  para bacheo clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular para bacheo clase a", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular para bacheo clase b", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base granular para bacheo clase c", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base estabilizada con emulsión asfáltica tipo BEE-38", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base estabilizada con emulsión asfáltica tipo BEE-25", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base estabilizada con emulsión asfáltica tipo BEE-5", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-d gradacion tipo a (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-d gradacion tipo b (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-r gradacion tipo a (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-r gradacion tipo b (incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-d gradacion tipo a (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-d gradacion tipo b (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-r gradacion tipo a (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Suelo-cemento clase sc-r gradacion tipo b (no incluye suministro del cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Cemento hidraulico para suelo-cemento", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base tratada con cemento resistencia R-3.5 (incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base tratada con cemento resistencia R-5.2 (incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base tratada con cemento resistencia R-3.5 (no incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Base tratada con cemento resistencia R-5.2 (no incluye suministro de cemento)", "unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Cemento hidraulico para base tratada con cemento", "unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES", "tipo": "vias"}, {"actividad": "Cemento asfáltico de penetración 40-50", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico de penetración 60-70.", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico de penetración 80-100", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Suministro de emulsión asfáltica de rotura media crm.", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Emulsión asfáltica de rotura lenta CRL-1 ard", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Emulsión asfáltica de rotura lenta CRL-1 arb", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Suministro de emulsión asfáltica de rotura lenta CRL-1h", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfaltico con grano de caucho reciclado tipo I", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfaltico con grano de caucho reciclado tipo II", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfaltico con grano de caucho reciclado tipo  III", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo I", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo II a", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo II b", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo III", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo IV", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Cemento asfáltico modificado con polímeros tipo V.", "unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Emulsión asfáltica de rotura media, modificada con polímeros, crm-m", "unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de imprimación con emulsión asfáltica crl -0", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de imprimación con emilsíon asfáltica CRL-1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de imprimación con asfalto liquido", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de liga con emulsión asfáltica CRR-1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de liga con emulsión asfáltica CRR-2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de liga con emulsión modificada con polímeros crr- 1m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Riego de liga con emulsión modificada con polímeros crr- 2m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial simple con emulsión CRR-2 gradacion 19", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial simple con emulsión CRR-2 gradacion 13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial simple con emulsión CRR-2 m gradacion 19", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial simple con emulsión CRR-2m  gradacion 13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial doble con emulsión CRR-2. tipo 1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial doble con emulsión CRR-2. tipo 2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial doble con emulsión CRR-2 m tipo 1", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Tratamiento superficial doble con emulsión CRR-2 m tipo 2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Sello de arena-asfalto con emulsión CRR-2", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Sello de arena-asfalto con emulsión CRR-2m", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-10", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-5", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1H, tipo LA-3", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-13", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-10", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-5", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-3", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en frío tipo MDF-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en frío tipo MDF-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en frío tipo MDF-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en frío para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en frío tipo MAF-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en frío tipo MAF-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en frío tipo MAF-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en frío  tipo MAF-38 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en caliente tipo MDC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en caliente tipo MDC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla densa en caliente tipo MDC-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla semidensa en caliente tipo MSC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla semidensa en caliente tipo MSC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla gruesa en caliente tipo MGC-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla gruesa en caliente tipo MGC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla de alto módulo MAM-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla en caliente para bacheo MSC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla en caliente para bacheo MGC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla en caliente para bacheo MGC-38", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en caliente tipo MAC-75", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en caliente tipo MAC-63", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en caliente tipo MAC-50", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla abierta en caliente tipo mac -50 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla discontinua en caliente tipo M-13", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla discontinua en caliente tipo M-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla discontinua en caliente tipo F-13", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla discontinua en caliente tipo F-10", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla drenante", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Fresado de pavimento asfáltico en espesor de  10 cm", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Fresado de pavimento asfáltico en espesor de 5 cm", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Pavimento reciclado en frío en el lugar con emulsión asfáltica", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Pavimento reciclado en frío en el lugar con cemento asfáltico espumado", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-25", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-19", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-25 para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Mezcla asfaltica reciclada en caliente de tipo MDC-19  para bacheo", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Geotextil para repavimentaciòn", "unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Excavación para reparación de pavimento asfáltico existente incluyendo el corte y la remociòn de las capas asfalticas subyacentes", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Excavaciòn para la reparaciòn de pavimento asfaltico existente excluyendo el corte y la remociòn de las capas asfalticas y de las subyacentes.", "unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Sello de grietas en pavimento asfáltico sin ruteo.", "unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Sello de grietas en pavimento asfáltico con ruteo.", "unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS", "tipo": "vias"}, {"actividad": "Pavimento de concreto hidráulico.", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Pavimento de concreto hidráulico de fraguado rapido (fast track)", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Cemento porthland, norma astm C150, tipo ______ . se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Cemento hidraulico  sdicionado, norma astm C595, tipo ______ se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Cemento hidraulico especificado por desempeño, norma astm C1137, tipo ______ .se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.", "unidad": "kg", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Base de concreto hidráulico", "unidad": "m3", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Pavimento de adoquines de concreto.", "unidad": "m2", "capitulo": "PAVIMENTO RIGIDO", "tipo": "vias"}, {"actividad": "Excavaciones varias sin clasificar", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Excavaciones varias en roca en seco.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Excavaciones varias en roca bajo agua.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Excavaciones varias en material comun en seco", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Excavaciones varias en material común bajo agua.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Rellenos para estructuras con suelo.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Rellenos para estructuras con recebo.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Relleno para estructuras con material granular tipo sbg", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Relleno para estructuras con material granular tipo bg", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Rellenos con material filtrante", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Relleno con gravilla", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Relleno con arena", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Pilotes prefabricados de concreto diámetro 0,40 m", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Extension de pilotes, seccion, 0.40 metros", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Prueba de carga tipo ________ se debera elabora r items de pago independiente por cada tipo de prueba.", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Pilote de concreto vaciado in situ, de diámetro 1 m_", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Pilote de concreto vaciado in situ, de diámetro 1,2 m, incluye excavación en roca, bajo agua", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Base acampanada.", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Perforacion de prueba para pilote, d= variable", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Perforacion de prueba para base acampanada", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Camisa permanente de diámetro exterior variable", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Camisa permanente de diámetro exterior 1,50 m, en concreto", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Prueba de carga tipo (pilote pre excavado)", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Prueba de integridad tipo ____", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Tablestacado de madera", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Tablestacado metálico.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Tablestacado de concreto reforzado.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Tablestacado de concreto pre esforzado.", "unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Corte del extremo superior del elemento.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Anclaje tipo _____ (roca)", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Prueba de carga", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 35MPA (a)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 32MPA (b)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 28MPA (c )", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 21MPA (d)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 17.5MPA (e )", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 14MPA  (f)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Concreto resistencia 14MPA (g) (ciclopeo)", "unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Baranda de concreto, cocreto 21 MPa", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Baranda de concreto concreto 28 MPa.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Acero de refuerzo fy 4200 MPa.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Malla de refuerzo fy 4200 MPa.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Acero de preesfuerzo.", "unidad": "tf/m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Acero de preesfuerzo.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Apoyo elastomérico.", "unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Sello para juntas de puentes.", "unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Diseño y fabricación de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Fabricación de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Transporte de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Montaje y pintura  de estructura metálica.", "unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES", "tipo": "vias"}, {"actividad": "Tubería de concreto simple 14 MPa de 450 mm de diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Tubería de concreto simple de 14 MPa de 600 mm d diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.concreto simple y cada diametro que tengan las tuberias", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Tubería de concreto reforzado  21 MPa de 900 mm de diametro interior", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Tubería corrugada de acero galvanizado MP-68, de lámina calibre__ y diametro __", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Tubería corrugada de acero con recubrimiento bituminoso, de lámina calibre 12  y D=60´´", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Tubería de plastico tipo__norma___de diametro__mm", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 1: recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 2: recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 3: recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 4: recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Disipadores de energía y sedimentadores en concreto ciclopeo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Cuneta de concreto vaciada in situ; no incluye la conformacion de la superficie de apoyo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Cuneta de piezas prefabricadas de concreto; no incluye la conformacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Cuneta de concreto vaciada in situ; incluye la conformacion de la superficie de apoyo", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Cuneta de piezas prefabricadas de concreto; incluye la conformacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Bordillo de concreto vaciado in situ; no incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Bordillo de piezas prefabricadas de concreto; no incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Bordillo de concreto vaciado in situ; incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Bordillo de piezas prefabricadas de concreto; incluye la preparacion de la superficie de apoyo", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Geotextil tipo NT-2500 o similar no tejido", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Geotextil  tipo T-2400 o similar tejido", "unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Material granular drenante", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Material de cobertura tipo sub- base CBR=20%", "unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Dren horizontal de longitud menor o igual a diez (10) metros.", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Dren horizontal de longitud mayor a diez (10) metros.", "unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA", "tipo": "vias"}, {"actividad": "Páneles de concreto.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Armadura galvanizada.", "unidad": "m", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Relleno granular para tierra mecanicamete estabilizada con páneles de concreto", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Gaviónes de malla de alambre de acero entrelazado  clase 1; recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Gavión de malla de alambre de acero entrelazado  clase 2; recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Gavión de malla de alambre de acero entrelazado  clase 3; recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Gavión de malla de alambre de acero etrelazado  clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Colchogavión de malla de alambre de acero entrelazado clase 1; recubrimiento de zinc (galvanizado)", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Colchogavión de malla de alambre de acero entrelazado clase 2; recubrimiento de aleacion ZN-5A1-MM", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Colchogavión de malla de alambre de acero entrelazado clase 3; recubrimiento de zinc (galvanizado) y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Colchogavión de malla de alambre de acero entrelazado clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc", "unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Geotextil de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Geomalla de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Geotextil de fachada tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Geomalla de fachada tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Relleno tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Impermeabilizante para concreto", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Impermeabilización de estructuras.", "unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO", "tipo": "vias"}, {"actividad": "Línea de demarcación con pintura en frío.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Línea de demarcación con resina termoplástica.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Marca vial con pintura en frío.", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Marca vial con resina termoplástica.", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Tacha reflectiva.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Señal vertical de transito tipo 1 con lamina retrorreflectiva tipo III (75 X 75 ) cm", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Señal vertical de transito tipo 2 con lamina retrorreflectiva tipo (1.20X0.40 m)", "unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Poste de referencia.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Defensa metálica.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Sección final.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Sección de tope.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Elemento especial tipo amortiguadores", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Defensa de concreto.", "unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Captafaros.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Delineador de corona.", "unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL", "tipo": "vias"}, {"actividad": "Cerca de alambre de puas con postes de madera.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Cerca de alambre de puas con postes de concreto.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Cerca de malla con postes de madera.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Cerca de malla con postes de concreto.", "unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte aerea de arboles tipo I", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte aerea de arboles tipo II", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte aerea de arboles tipo III", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte aerea de arboles tipo IV", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte radicular de arboles tipo I", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte radficular de arboles tipo II", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte radicular de arboles tipo III", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Poda de la parte radicular de arboles tipo  IV", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Protección de taludes con bloques de césped.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Protección de taludes con tierra orgánica.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Protección de taludes con hidrosiembra controlada.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto temporal. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto permanente. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Recubrimiento de taludes con malla y mortero 1:4 de e= 10 cm", "unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Plantación de árboles (tipo paisajístico)", "unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Plantación de árboles (reforestación protectora densidad 1100)", "unidad": "ha", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES", "tipo": "vias"}, {"actividad": "Transporte de materiales provenientes de la excavacion de la explanacion, canales y prestamos, entre  cien metros (100 m) y mil metros (1000 m) de distancia", "unidad": "m3/e", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS", "tipo": "vias"}, {"actividad": "Transporte de materiales provenientes de la excavación de la explanación, canales y préstamos para distancias mayores de mil metros (1.000 m) medido a partir de cien metros (100 m).", "unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS", "tipo": "vias"}, {"actividad": "Transporte de materiales provenientes de derrumbes, medido a partir de cien metros (100 m)", "unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS", "tipo": "vias"}, {"actividad": "Localización y replanteo de locaciones, explanaciones y/o facilidades", "unidad": "HA", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Localización y replanteo de obras lineales (vías, líneas de flujo y líneas del sistema eléctrico),", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Rocería, incluye tala de arboles con dap≤0.15m, incluye transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tala de árboles con dap>0.15m, incluye transporte y disposición final", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desmonte, descapote y limpieza incluye  tala de arboles con dap ≤0.15m, transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Pulverización de palmas in situ con alturas ≤2,50m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Pulverización de palmas in situ con alturas >2,50m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura inferior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura superior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura inferior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura superior a 2,50 m", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Excavación mecánica en material común, incluye transporte a una distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Excavación mecánica en roca, incluye transporte a una distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Excavación y relleno compensado, incluye transporte distancia ≤ a 1km", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Excavación manual en material común, incluye cargue y transporte distancia ≤ a 1 km", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Acarreo de material (compactado)  a distancia > 1km.", "unidad": "M³-KM", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Transporte fluvial (compactado).", "unidad": "M³-KM", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Mejoramiento de la subrasante y conformación de cunetas", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 1: arena lavada de río o gravilla o una mezcla de estos dos materiales", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 2: recebo o material de préstamo seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 3: material granular", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 4: material de excavación seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 5: material de afirmado", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 6: subbase granular", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 7: base granular", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 8: piedra partida", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 9: tierra negra", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 10: gravas bien gradadas", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 11: material de relleno para zanjas de tuberia", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 12: material de río seleccionado", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tipo 13: material de arrecife", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Densificacion del terreno mediante columnas de grava de 6” a 12” de diámetro interno  (incluye perforación y suministro de materiales de relleno).", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Escarificación de bases o suelos estabilizados y/o componentes asfálticos", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  a (350 kg/cm2 ó 5000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  b (320 kg/cm2 ó 4570 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  c (280 kg/cm2 ó 4000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  d (210 kg/cm2 ó 3000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  e (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  e con mineral rojo (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto clase  f (140 kg/cm2 ó 2000 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto ciclopeo clase  g (175 kg/cm2 ó 2500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto  de limpieza clase  h (105 kg/cm2 ó 1500 psi)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tejido frp (tipo sikawrap 600c o similar)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Láminas cfrp (tipo sikacarbodur  ancho 50 mm)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Junta de construcción con cinta pvc 22", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Junta de construcción con cinta pvc 15", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Junta de contracción", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Junta de dilatación", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Junta impermeabilizada", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Mortero para pañete , incluye filos y dilataciones. (espesor 1,5 cm)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Mortero de pega (espesor 1,5cm)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Mortero impermeabilizado (espesor 1,5cm)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Grouting cementoso", "unidad": "L", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Grouting epóxico", "unidad": "L", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Preparación, suministro e instalación de mortero impermeabilizado  + poliester + pintura", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Preparación, suministro e instalación de mortero impermeabilizado  + poliester", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Acero fy:  60000 psi (4.200 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Acero a-37 fy: 34200 psi (2,400 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla electro soldada fy:  60000 psi (4.200 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla electro soldada fy: 34200 psi (2,400 kg/cm2)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion perfilería astm a36 (columnas, vigas, entrepisos, casetas, etc.)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion perfilería a572 grado 50 (columnas, vigas, entrepisos, casetas, etc.)", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion tubería para estructuras a53 grado b", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion estructura metálica para misceláneos", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion pernos de anclaje pre-instalado", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion pernos de anclaje con epóxico", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion lamina colaborante h= 2” calibre 16 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion lamina colaborante h= 2” calibre 18 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion lamina colaborante h= 3” calibre 16 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion lamina colaborante h= 3” calibre 18 o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion tubo conductor de ø12\" a ø20\". (incluye el transporte )", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion de tubo conductor de ø22\" a ø30\".(incluye el transporte )", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion tubo conductor de ø12\" a ø20\".(incluye suministro y transporte)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de tubo conductor de ø22\" a ø30\". (incluye suministro y transporte)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion de tubo conductor  hincado con piloteadora para l>15m", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion de estructuras plasticas, skimmers, trampa de aguas grises o desarenador. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de estructuras plasticas, skimmers, trampa de aguas o grises, desarenador, incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion de estructuras metalicas, skimmers, trampa de aguas grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de estructuras metalicas, skimmers, trampa de aguas o grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de caseta en polipropileno de alta densidad para vigilancia", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de cuneta portátil (ecocanal 66 × 200) incluye excavación", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla tipo ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50m, concertina de ø 18” y cable sensor de intrusión. (nivel 3 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla expandida tipo imf 100, muro en ladrillo macizo, concertina de ø 18” y cable sensor de intrusión. altura mínima de 2,50m (nivel 3 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Muro en mampostería confinada, concertina de ø 18” y cable sensor de intrusión.  altura mínima de 2,50m (nivel 3 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla tipo ciclón  de acero inoxidable cal 10 2” x 2” altura mayor a 2,50 m y concertina de ø 18”,  altura mínima de 2,50m.(nivel 2 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla expandida tipo imf 100, muro en ladrillo macizo y concertina de ø 18”. altura mínima de 2,50m. (nivel 2 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Muro en mampostería confinada y concertina de ø 18”.  (nivel 2 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerca de alambre de púas 5 hilos. (con poste en concreto) (nivel 1 - tipo 1)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Malla ciclón con alambre de púas altura mínima de 2,50m. (nivel 1 - tipo 2)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Muro mampostería confinada altura mínima de 2,50m. (nivel 1 - tipo 3)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerca de alambre de púas 5 hilos. (con poste en polipropileno)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerca de alambre de púas 5 hilos. (con poste en polipropileno reutilizado)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerramiento modular, con malla electro soldada galvanizada y plastificada", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerramiento modular, con malla ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50 m", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Cerramiento en lamina de zinc", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de puertas en malla eslabonada cal 10  2\" x 2\"", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto hidráulico para pavimento rígido. resistencia especificada 5000 psi", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Concreto hidráulico para pavimento rígido. resistencia especificada 4000 psi", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Base granular (relleno tipo 7) estabilizada con emulsión asfáltica  incluye emulsión asfáltica crl-1", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Base granular (relleno tipo 7) estabilizada con cemento. incluye el cemento", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suelo estabilizado con cemento. incluye el cemento", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Imprimación. riego de imprimación con emulsión asfáltica crl-1.", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro, extendido, nivelación y compactación de mezcla densa en caliente tipo 2", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro, extendido, nivelación y compactación de mezcla densa en frio  tipo 2", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de slurry asfáltico", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tratamiento superficial simple", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tratamiento superficial doble", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suelo arcilloso estabilizado con productos quimicos estabilizadores. incluye productos quimicos", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Pavimento asfaltico para bacheo", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demarcación línea continua blanca a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demarcación línea discontinua amarilla a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Marcas viales", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación señal vertical grupo i - 75 cm x 75 cm", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomembrana hdpe para impermeabilización.  de 20 mils.", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomembrana hdpe para impermeabilización.  de 40 mils,  e: 1.0 mm", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomembrana de hdpe para confinamiento de hidrocarburos (piscinas).  de 60 mils,  e: 1.5 mm", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 400 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 470 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 500 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 700 n-2500 nt", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1140 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1870 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geotextiles (t) en sistemas de estabilización y refuerzo, alto modulo resistencia minima  a la tension 2400 n", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomalla uniaxial", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomalla  biaxial (tension min pico: long 12 kn/m, transv 19 kn/m)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geomalla  biaxial (tension min pico: long 19 kn/m, transv 28,5 kn/m)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Sistema de confinamiento celular", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Gaviones  (incluye malla, alambre galvanizado, piedra y demás materiales)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Colcha gaviones (incluye malla, alambre galvanizado, piedra y demás materiales)", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Hexápodos", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro y construcción de filtro francés", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Geodren planar", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en concreto 3000 psi", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en ciclopeo 2500 psi", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 5 cm", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 8 cm", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalacion de manto impregnado de concreto para cunetas e= 13 cm", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Limpieza a mano de alcantarillas de tubo de 24” y 36”", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Limpieza a mano de encoles y descoles", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Bolsacreto", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Sacos rellenos con suelo", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Sacos rellenos con suelo y cemento (rel : 5: 1.)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Empradización con cespedón continuo", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Empradizacion con estolón", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Fajinas vivas", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Empradizacion con semilla al voleo", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Revegetalizacion con especies arboreas nativas", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Revegetalizacion con especies arboreas foraneas", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Protección de taludes con biomanto", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Extendido y conformacion de material vegetal (descapote) incluye transporte < 1km", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Trinchos  tipo  a", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Trinchos  tipo  b", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Trinchos  tipo  c", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Trinchos  tipo  d", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro y construcción de trincho tipo canal", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro y construcción de barreras con geotextil", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc para drenaje  ǿ 8\" perforada", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc para drenaje  ǿ 6\" perforada", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc para drenaje  ǿ 4\" perforada", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería de concreto reforzado ǿ 48\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería de concreto reforzado ǿ 36\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería de concreto reforzado ǿ 24\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería de concreto reforzado ǿ 16\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 36\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 24\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 16\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 14\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 12\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 10\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 8\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería novaloc-novafort ø 6\"", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc drenaje de aguas lluvias  ø 8” a ø 12”", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc drenaje de aguas lluvias  ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc sanitaria,  entre ø 2” a ø 3”", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc sanitaria,  entre ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc sanitaria,  entre ø 4” a ø 6”", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc  øs  1/2\", 3/4\", 1\" rh. (red hidráulica)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc ø 2\"  rh", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc  ø 3\"  rh", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Tubería pvc ø 4\" rh", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demolición manual de concreto", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demolición mecánica de concreto", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demolición de pavimento flexible", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Demolición muros en mampostería.", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desmantelamiento cerramiento en malla eslabonada (incluye concertina y accesorios)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desmantelamiento cerramiento en alambre de púas.", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desmonte de estructuras metálicas. incluye transporte ≤ 20km y disposición final", "unidad": "KG", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desmonte o retiro y transporte ≤ 20km, e instalación o acopio de trampas metálicas portábles (aceitosas, grasas  y desarenador, hasta el sitio de disposición, instalación o acopio autorizado por ecp)", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desinstalación e instalación de estructuras plásticas skimmers, trampa de aguas grises o desarenador, incluye retiro de la estructura y transporte ≤ 20km", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Transporte de equios y materiales", "unidad": "TON-KM", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Mezcla de lodos con material en zona de piscinas", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Retiro y estabilización de materiales de piscina, incluye transporte hasta 1 km", "unidad": "M3", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Retiro y disposición final de geomembrana y su incineración. incluye transporte y disposición final", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado  de  pilotes  d=6” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado  de  pilotes  d=8” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado  de  pilotes  d=10” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado  de  pilotes  d=12” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado de pilotes en madera d=6” a 8” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e hincado de pilotes en madera d=10” a 12” (incluye la punta de lápiz)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de placas modulares para helipuerto con aditivo antiestático-protección uv y anclajes o equivalente", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Instalacion de placas modulares en polipropileno de alta densidad", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Desinstalación de placas modulares reutilizables", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construcción de puente petrolero (ancho 4 m)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construcción de puente petrolero (ancho 4 m - tubería suministrada por ecp)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construcción de tablero para puente petrolero (ancho 4 m)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construcción de tablero para puente petrolero (ancho 4 m - tubería suministrada por ecp)", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Protección de cables para puentes colgantes", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Construccion de piezometro o pozo de monitoreo", "unidad": "M", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Limpieza e hidrolavado (trabajo en alturas)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Alistamiento de superficie (para instalación de fibras de carbono u otras actividades requeridas)", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de mortero de reparación para recubrimiento", "unidad": "M2", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación neopreno reforzado (250x250x10 mm).", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de placa de abandono", "unidad": "UND", "capitulo": "1. Civiles generales", "tipo": "hidrocarburos"}, {"actividad": "Estuco y pintura", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Pintura tipo 1 sobre pañete, para interiores", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Pintura tipo koraza para exteriores", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Pintura esmalte", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Estuco y pintura mochetas, antepechos, dinteles", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Sanitario línea institucional (incluye grifería y accesorios)", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Orinal institucional mediano (incluye grifería y accesorios)", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Lavamanos sobreponer incluye griferías y accesorios", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de punto hidráulico pvc de ø; 1/2”, 3/4\" y  1\". incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de punto hidráulico pvc ø1-1/2\", ø 2”. incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de registros, cheques  de ø 3/4,  1/2\", 1\", 1 1/2\"", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de registros, cheques  de ø 2\", 21/2”", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Suministro e instalación de punto sanitario ø 2\", 3\", 4\".", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Mampostería a la vista no reforzada", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Mamposteria muros en bloque", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Piso en concreto afinado con endurecedor de cuarzo tráfico alto y acabado en cemento esmaltado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Piso en concreto escobiado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Instalación de pisos (no incluye suministro del piso)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Enchape muros (no incluye suministro de enchape)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Guardaescoba media caña ó cerámica  (no incluye suministro)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Piso tablón de gress porcelanico de 40x40cm. color: gris mate", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Baldosa de granito tráfico pesado color blanco 0.40x0.40", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Enchapes y pisos en cerámica de 25cmx25cm. zonas húmedas", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Enchape en granito pulido, color blanco para mesones o entrepaños en concreto (portería + baño)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Guardaescoba en cerámica de 10x25cm. color: blanco", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Guardaescoba media caña en granito pulido", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Cubierta metálica acanalada calibre 26, termoacustica", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Terminales y caballete", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Cubierta en teja termo-acústica metálica calibre 26", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Canal en pvc", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Bajante en pvc  3\" y  4\"", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Cielo raso dry wall", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Cielo raso en lámina acústica en fibra mineral clase as-s1", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Canal en lamina calibre 20", "unidad": "M", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Puertas metálicas calibre 18 (incluye marcos)", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Ventanería en aluminio, incluye vidrio  6mm templado", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Espejos 5mm", "unidad": "M2", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Puerta antipánico de 1.00 x2.50 m  calibre 18 doble hoja", "unidad": "UND", "capitulo": "2. Acabados arquitectonicos", "tipo": "hidrocarburos"}, {"actividad": "Supervisor civil", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Oficial de construcción", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Ayudante de construcción (obrero raso)", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Buldozer potencia minima 120hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Moto niveladora potencia minima 120hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Retroexcavadora potencia minima 130hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Vibrocompactador peso minimo 10ton", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Vibrocompactador pata de cabra", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Carrotanque sencillo irrigador de agua", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Carrotanque dobletroque irrigador de agua", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Retroexcavadora potencia minima 75hp", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Volqueta tipo sencilla con capacidad mínima de 6 m3", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Volqueta tipo dt con capacidad mínima de 15 m3", "unidad": "HR", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Motobomba 4\"", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Motobomba 6\"", "unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Alquiler de andamios certificados", "unidad": "M³-DIA", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}, {"actividad": "Transporte armado y desarmado de andamios certificados", "unidad": "M3", "capitulo": "3. Suministros y/o alquiler", "tipo": "hidrocarburos"}]`);

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
    const coincide = CATALOGO_APU.filter(
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
