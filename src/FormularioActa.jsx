import React, { useState, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto } from "./MenuLateral";
import { Camera, X } from "lucide-react";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}


const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const LISTA_ACTIVIDADES_INFO = JSON.parse(String.raw`{"Replanteo general de ejes y niveles": {"unidad": "ml", "capitulo": "PRELIMINARES"}, "Desmonte desacapote y limpieza": {"unidad": "m2", "capitulo": "PRELIMINARES"}, "Cerramiento provisional de obra": {"unidad": "ml", "capitulo": "PRELIMINARES"}, "Instalación de campamento y oficinas provisionales": {"unidad": "m²", "capitulo": "PRELIMINARES"}, "Adecuación de área de almacenamiento": {"unidad": "m²", "capitulo": "PRELIMINARES"}, "Señalización preventiva e informativa de obra": {"unidad": "und", "capitulo": "PRELIMINARES"}, "Instalaciones provisionales de agua y energía": {"unidad": "gl", "capitulo": "PRELIMINARES"}, "Protección de elementos existentes": {"unidad": "m²", "capitulo": "PRELIMINARES"}, "Desmonte y limpieza inicial": {"unidad": "m²", "capitulo": "PRELIMINARES"}, "Demoliciones preliminares": {"unidad": "m³", "capitulo": "PRELIMINARES"}, "Excavación manual en material común": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación mecánica": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Perfilado y conformación de excavaciones": {"unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material seleccionado compactado": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material proveniente de excavación": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de subbase": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de base granular": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Cargue de material sobrante": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Transporte de material sobrante": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Disposición final de sobrantes": {"unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Concreto de limpieza / solado": {"unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para zapatas": {"unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para vigas de cimentación": {"unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para losas de cimentación": {"unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para pedestales": {"unidad": "m³", "capitulo": "CIMENTACIONES"}, "Acero de refuerzo en cimentación": {"unidad": "kg", "capitulo": "CIMENTACIONES"}, "Formaleta para elementos de cimentación": {"unidad": "m²", "capitulo": "CIMENTACIONES"}, "Concreto para columnas": {"unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para vigas": {"unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para losas": {"unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para escaleras": {"unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para muros estructurales": {"unidad": "m³", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de columnas": {"unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de vigas": {"unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de losas": {"unidad": "kg", "capitulo": "ESTRUCTURA"}, "Formaleta de columnas": {"unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de vigas": {"unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de losas": {"unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de escaleras": {"unidad": "m²", "capitulo": "ESTRUCTURA"}, "Suministro y montaje de perfiles metálicos": {"unidad": "kg", "capitulo": "ESTRUCTURA"}, "Placas, pernos y conexiones metálicas": {"unidad": "kg", "capitulo": "ESTRUCTURA"}, "Mampostería en bloque de concreto": {"unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería en ladrillo": {"unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería estructural": {"unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Muros en sistema liviano / drywall": {"unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Dinteles sobre vanos": {"unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Alfajías y remates": {"unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Anclajes y refuerzos de mampostería": {"unidad": "und", "capitulo": "MAMPOSTERÍA"}, "Estructura metálica o de madera para cubierta": {"unidad": "kg", "capitulo": "CUBIERTAS"}, "Cerchas y elementos estructurales": {"unidad": "kg", "capitulo": "CUBIERTAS"}, "Suministro e instalación de teja": {"unidad": "m²", "capitulo": "CUBIERTAS"}, "Impermeabilización de cubierta": {"unidad": "m²", "capitulo": "CUBIERTAS"}, "Aislamiento térmico/acústico": {"unidad": "m²", "capitulo": "CUBIERTAS"}, "Canales de aguas lluvias": {"unidad": "ml", "capitulo": "CUBIERTAS"}, "Bajantes de aguas lluvias": {"unidad": "ml", "capitulo": "CUBIERTAS"}, "Impermeabilización de losas y terrazas": {"unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de muros": {"unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de zonas húmedas": {"unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Pañete / revoque interior": {"unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete / revoque exterior": {"unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete impermeabilizado": {"unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Estuco plástico o tradicional": {"unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Mortero de nivelación": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso cerámico": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso en porcelanato": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso vinílico": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso laminado": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Enchape cerámico en muros": {"unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Guardaescoba": {"unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Juntas de dilatación / construcción": {"unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Pintura vinílica interior": {"unidad": "m²", "capitulo": "PINTURA"}, "Pintura exterior": {"unidad": "m²", "capitulo": "PINTURA"}, "Pintura esmalte en superficies metálicas/madera": {"unidad": "m²", "capitulo": "PINTURA"}, "Pintura anticorrosiva": {"unidad": "m²", "capitulo": "PINTURA"}, "Sellador / imprimante": {"unidad": "m²", "capitulo": "PINTURA"}, "Puertas de madera": {"unidad": "und", "capitulo": "CARPINTERÍA"}, "Muebles fijos de madera": {"unidad": "ml", "capitulo": "CARPINTERÍA"}, "Puertas metálicas": {"unidad": "und", "capitulo": "CARPINTERÍA"}, "Barandas metálicas": {"unidad": "ml", "capitulo": "CARPINTERÍA"}, "Pasamanos": {"unidad": "ml", "capitulo": "CARPINTERÍA"}, "Ventanas de aluminio": {"unidad": "m²", "capitulo": "CARPINTERÍA"}, "Divisiones de aluminio": {"unidad": "m²", "capitulo": "CARPINTERÍA"}, "Vidrio templado": {"unidad": "m²", "capitulo": "VIDRIOS"}, "Vidrio laminado": {"unidad": "m²", "capitulo": "VIDRIOS"}, "Espejos": {"unidad": "m²", "capitulo": "VIDRIOS"}, "Sellos y silicona": {"unidad": "ml", "capitulo": "VIDRIOS"}, "Tubería de agua fría": {"unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de agua caliente": {"unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Válvulas y accesorios (und — INSTALACIONES HIDROSANITARIAS)": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería sanitaria": {"unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de aguas lluvias": {"unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Cajas de inspección": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Aparatos sanitarios": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Lavamanos": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Griferías": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Duchas": {"unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Pruebas hidráulicas y de estanqueidad": {"unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería/conduit eléctrica": {"unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Bandejas portacables": {"unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cajas eléctricas": {"unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de fuerza": {"unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de iluminación": {"unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tableros eléctricos": {"unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tomacorrientes": {"unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Interruptores": {"unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Luminarias": {"unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Sistema de puesta a tierra": {"unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Pruebas y certificaciones": {"unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado estructurado de datos": {"unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Rack de comunicaciones": {"unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Cámaras y sistema CCTV": {"unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Control de acceso": {"unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de citofonía": {"unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de detección de incendios": {"unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Equipos de aire acondicionado": {"unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Ductos de ventilación": {"unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Tubería de refrigerante": {"unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Rejillas y difusores": {"unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Red interna de gas": {"unidad": "ml", "capitulo": "GAS"}, "Válvulas y accesorios (und — GAS)": {"unidad": "und", "capitulo": "GAS"}, "Pruebas y certificación": {"unidad": "gl", "capitulo": "GAS"}, "Construcción de andenes": {"unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Placas de concreto exteriores": {"unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Pavimento en adoquín": {"unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Sardineles y bordillos": {"unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, "Sumideros exteriores": {"unidad": "und", "capitulo": "URBANISMO Y EXTERIORES"}, "Suministro y extendido de tierra vegetal": {"unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Siembra y jardinería": {"unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Rejas metálicas": {"unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Escaleras metálicas": {"unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Elementos metálicos especiales": {"unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Mobiliario fijo de obra": {"unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Limpieza gruesa y fina de obra": {"unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Limpieza final para entrega": {"unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Pruebas, puesta en marcha y ajustes": {"unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Actualización de planos récord / as-built": {"unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Entrega, manuales y acta de recibo": {"unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Suministro e instalación de ascensor eléctrico": {"unidad": "und", "capitulo": "ASCENSORES"}, "Estudio de suelos y geotecnia": {"unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos": {"unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Licencia de construcción y trámites de curaduría urbana": {"unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)": {"unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Desmonte y limpieza en bosque": {"unidad": "ha", "capitulo": "PRELIMINARES"}, "Desmonte y limpieza en zonas no boscosas": {"unidad": "ha", "capitulo": "PRELIMINARES"}, "Demolición de edificaciones (gl — PRELIMINARES)": {"unidad": "gl", "capitulo": "PRELIMINARES"}, "Demolición de estructuras (gl — PRELIMINARES)": {"unidad": "gl", "capitulo": "PRELIMINARES"}, "Demolición de pavimentos rígidos, pisos, andenes y bordillos de concreto": {"unidad": "gl", "capitulo": "PRELIMINARES"}, "Demolición de obstáculos": {"unidad": "gl", "capitulo": "PRELIMINARES"}, "Demolición de edificaciones (unidad — PRELIMINARES)": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Demolición de estructuras (unidad — PRELIMINARES)": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Demolición de estructuras (m3 — PRELIMINARES)": {"unidad": "m3", "capitulo": "PRELIMINARES"}, "Demolición de pavimentos rígidos": {"unidad": "m2", "capitulo": "PRELIMINARES"}, "Demolición de pisos y andenes de concreto": {"unidad": "m2", "capitulo": "PRELIMINARES"}, "Demolición de bordillos de concreto": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Desmontaje y traslado de estructuras metálicas": {"unidad": "kg", "capitulo": "PRELIMINARES"}, "Remoción de especies vegetales": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Remoción de obstáculos (se deberá hacer un ítem de pago para cada tipo de obstáculo)": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Remoción de ductos de servicios existentes": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Remoción de alcantarillas": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Remoción de cercas de alambre": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Traslado de postes": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Traslado de torres": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Remoción de rieles": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Remoción de defensas metálicas": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Remoción de barreras de seguridad": {"unidad": "m", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo I traslado corto": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo I traslado largo": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo I traslado especial": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo II traslado corto": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo II. traslado largo": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo II traslado especial": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo III traslado corto": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo III traslado largo": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante  de arboles tipo III traslado especial": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo IV traslado corto": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo IV traslado largo": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Transplante de arboles tipo IV traslado especial": {"unidad": "unidad", "capitulo": "PRELIMINARES"}, "Excavación sin clasificar de la explanación y canales": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación sin clasificar de préstamos": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca de la explanación y canales": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en material común de la explanación y canales": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca de préstamos": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en material común de préstamos": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Remoción de derrumbes": {"unidad": "m3", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Terraplenes": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Pedraplén compacto": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Pedraplén suelto": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geotextil de refuerzo tipo NT-2500 para terraplenes reforzados por  geosinteticos": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geomalla de refuerzo tipos asphalt": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Relleno seleccionado para terraplenes reforzados con geosinteticos": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Relleno tipo sub base granular para terraplenes reforzados con geosinteticos": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Relleno tipo base granular para terraplenes reforzados con geosinteticos": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Mejoramiento de la subrasante con adicion de materiales": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geotextil para separación de suelos de subrasante y capas granulares": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geotextil para estabilización de la subrasante": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geomalla para estabilizaciòn de suelos de subrasante": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Geomalla para refuerzo de capas granulares": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Conformación de taludes existentes": {"unidad": "m2", "capitulo": "TERRAPLENES Y RELLENOS"}, "Subrasante estabilizada con cemento (incluye el suministro de cemento)": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Subrasante estabilizada con cemento (no incluye el suministro de cemento)": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Cemento para estabilizacion de subrasante": {"unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS"}, "Subrasante estabilizada con cal (incluye suministro de cal)": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Subrasante estabilizada con cal (no incluye suministro de cal)": {"unidad": "m3", "capitulo": "TERRAPLENES Y RELLENOS"}, "Cal hidratada para estabilizacion de subrasante": {"unidad": "kg", "capitulo": "TERRAPLENES Y RELLENOS"}, "Conformación de la calzada existente": {"unidad": "m2", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Afirmado": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Tratamiento paliativo de polvo aplicado en forma sólida en hojuelas": {"unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Tratamiento paliativo de polvo aplicado en forma sólida en esferas": {"unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Tratamiento paliativo de polvo aplicado en forma líquida": {"unidad": "lt", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Material granular de adición": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Subbase granular clase a": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Subbase granular clase b": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Subbase granular clase c": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Sub-base granular  para bacheo clase a": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Sub-base granular  para bacheo clase b": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Sub-base granular  para bacheo clase c": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular clase a": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular clase b": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular clase c": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular para bacheo clase a": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular para bacheo clase b": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base granular para bacheo clase c": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base estabilizada con emulsión asfáltica tipo BEE-38": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base estabilizada con emulsión asfáltica tipo BEE-25": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base estabilizada con emulsión asfáltica tipo BEE-5": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-d gradacion tipo a (incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-d gradacion tipo b (incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-r gradacion tipo a (incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-r gradacion tipo b (incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-d gradacion tipo a (no incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-d gradacion tipo b (no incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-r gradacion tipo a (no incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Suelo-cemento clase sc-r gradacion tipo b (no incluye suministro del cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Cemento hidraulico para suelo-cemento": {"unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base tratada con cemento resistencia R-3.5 (incluye suministro de cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base tratada con cemento resistencia R-5.2 (incluye suministro de cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base tratada con cemento resistencia R-3.5 (no incluye suministro de cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Base tratada con cemento resistencia R-5.2 (no incluye suministro de cemento)": {"unidad": "m3", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Cemento hidraulico para base tratada con cemento": {"unidad": "kg", "capitulo": "SUBBASES Y BASE GRANULARES"}, "Cemento asfáltico de penetración 40-50": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico de penetración 60-70.": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico de penetración 80-100": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Suministro de emulsión asfáltica de rotura media crm.": {"unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Emulsión asfáltica de rotura lenta CRL-1 ard": {"unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Emulsión asfáltica de rotura lenta CRL-1 arb": {"unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Suministro de emulsión asfáltica de rotura lenta CRL-1h": {"unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfaltico con grano de caucho reciclado tipo I": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfaltico con grano de caucho reciclado tipo II": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfaltico con grano de caucho reciclado tipo  III": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo I": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo II a": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo II b": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo III": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo IV": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Cemento asfáltico modificado con polímeros tipo V.": {"unidad": "kg", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Emulsión asfáltica de rotura media, modificada con polímeros, crm-m": {"unidad": "lt", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de imprimación con emulsión asfáltica crl -0": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de imprimación con emilsíon asfáltica CRL-1": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de imprimación con asfalto liquido": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de liga con emulsión asfáltica CRR-1": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de liga con emulsión asfáltica CRR-2": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de liga con emulsión modificada con polímeros crr- 1m": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Riego de liga con emulsión modificada con polímeros crr- 2m": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial simple con emulsión CRR-2 gradacion 19": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial simple con emulsión CRR-2 gradacion 13": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial simple con emulsión CRR-2 m gradacion 19": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial simple con emulsión CRR-2m  gradacion 13": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial doble con emulsión CRR-2. tipo 1": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial doble con emulsión CRR-2. tipo 2": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial doble con emulsión CRR-2 m tipo 1": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Tratamiento superficial doble con emulsión CRR-2 m tipo 2": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Sello de arena-asfalto con emulsión CRR-2": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Sello de arena-asfalto con emulsión CRR-2m": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1H, tipo LA-13": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1H, tipo LA-10": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1H, tipo LA-5": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1H, tipo LA-3": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-13": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-10": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-5": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Lechada asfáltica con emulsión CRL-1HM ,tipo LA-3": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en frío tipo MDF-38": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en frío tipo MDF-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en frío tipo MDF-19": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en frío para bacheo": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en frío tipo MAF-19": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en frío tipo MAF-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en frío tipo MAF-38": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en frío  tipo MAF-38 para bacheo": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en caliente tipo MDC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en caliente tipo MDC-19": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla densa en caliente tipo MDC-10": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla semidensa en caliente tipo MSC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla semidensa en caliente tipo MSC-19": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla gruesa en caliente tipo MGC-38": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla gruesa en caliente tipo MGC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla de alto módulo MAM-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla en caliente para bacheo MSC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla en caliente para bacheo MGC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla en caliente para bacheo MGC-38": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en caliente tipo MAC-75": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en caliente tipo MAC-63": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en caliente tipo MAC-50": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla abierta en caliente tipo mac -50 para bacheo": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla discontinua en caliente tipo M-13": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla discontinua en caliente tipo M-10": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla discontinua en caliente tipo F-13": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla discontinua en caliente tipo F-10": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla drenante": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Fresado de pavimento asfáltico en espesor de  10 cm": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Fresado de pavimento asfáltico en espesor de 5 cm": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Pavimento reciclado en frío en el lugar con emulsión asfáltica": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Pavimento reciclado en frío en el lugar con cemento asfáltico espumado": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla asfaltica reciclada en caliente de tipo MDC-25": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla asfaltica reciclada en caliente de tipo MDC-19": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla asfaltica reciclada en caliente de tipo MDC-25 para bacheo": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Mezcla asfaltica reciclada en caliente de tipo MDC-19  para bacheo": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Geotextil para repavimentaciòn": {"unidad": "m2", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Excavación para reparación de pavimento asfáltico existente incluyendo el corte y la remociòn de las capas asfalticas subyacentes": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Excavaciòn para la reparaciòn de pavimento asfaltico existente excluyendo el corte y la remociòn de las capas asfalticas y de las subyacentes.": {"unidad": "m3", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Sello de grietas en pavimento asfáltico sin ruteo.": {"unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Sello de grietas en pavimento asfáltico con ruteo.": {"unidad": "m", "capitulo": "PAVIMENTOS ASFÁLTICOS"}, "Pavimento de concreto hidráulico.": {"unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, "Pavimento de concreto hidráulico de fraguado rapido (fast track)": {"unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, "Cemento porthland, norma astm C150, tipo ______ . se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.": {"unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, "Cemento hidraulico  sdicionado, norma astm C595, tipo ______ se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato": {"unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, "Cemento hidraulico especificado por desempeño, norma astm C1137, tipo ______ .se debe elaborar un item de pago para cada tipo de cemento que se especifique en los documentos del contrato.": {"unidad": "kg", "capitulo": "PAVIMENTO RIGIDO"}, "Base de concreto hidráulico": {"unidad": "m3", "capitulo": "PAVIMENTO RIGIDO"}, "Pavimento de adoquines de concreto.": {"unidad": "m2", "capitulo": "PAVIMENTO RIGIDO"}, "Excavaciones varias sin clasificar": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Excavaciones varias en roca en seco.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Excavaciones varias en roca bajo agua.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Excavaciones varias en material comun en seco": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Excavaciones varias en material común bajo agua.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Rellenos para estructuras con suelo.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Rellenos para estructuras con recebo.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Relleno para estructuras con material granular tipo sbg": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Relleno para estructuras con material granular tipo bg": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Rellenos con material filtrante": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Relleno con gravilla": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Relleno con arena": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Pilotes prefabricados de concreto diámetro 0,40 m": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Extension de pilotes, seccion, 0.40 metros": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Prueba de carga tipo ________ se debera elabora r items de pago independiente por cada tipo de prueba.": {"unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Pilote de concreto vaciado in situ, de diámetro 1 m_": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Pilote de concreto vaciado in situ, de diámetro 1,2 m, incluye excavación en roca, bajo agua": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Base acampanada.": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Perforacion de prueba para pilote, d= variable": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Perforacion de prueba para base acampanada": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Camisa permanente de diámetro exterior variable": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Camisa permanente de diámetro exterior 1,50 m, en concreto": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Prueba de carga tipo (pilote pre excavado)": {"unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Prueba de integridad tipo ____": {"unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Tablestacado de madera": {"unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Tablestacado metálico.": {"unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Tablestacado de concreto reforzado.": {"unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Tablestacado de concreto pre esforzado.": {"unidad": "m2", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Corte del extremo superior del elemento.": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Anclaje tipo _____ (roca)": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Prueba de carga": {"unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 35MPA (a)": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 32MPA (b)": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 28MPA (c )": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 21MPA (d)": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 17.5MPA (e )": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 14MPA  (f)": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Concreto resistencia 14MPA (g) (ciclopeo)": {"unidad": "m3", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Baranda de concreto, cocreto 21 MPa": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Baranda de concreto concreto 28 MPa.": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Acero de refuerzo fy 4200 MPa.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Malla de refuerzo fy 4200 MPa.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Acero de preesfuerzo. (tf/m — ESTRUCTURAS Y PUENTES)": {"unidad": "tf/m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Acero de preesfuerzo. (kg — ESTRUCTURAS Y PUENTES)": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Apoyo elastomérico.": {"unidad": "unidad", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Sello para juntas de puentes.": {"unidad": "m", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Diseño y fabricación de estructura metálica.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Fabricación de estructura metálica.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Transporte de estructura metálica.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Montaje y pintura  de estructura metálica.": {"unidad": "kg", "capitulo": "ESTRUCTURAS Y PUENTES"}, "Tubería de concreto simple 14 MPa de 450 mm de diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.": {"unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Tubería de concreto simple de 14 MPa de 600 mm d diametro interior. se debera elaborar item de pago por cada clase de tuberia de concreto simple y cada diametro que tengan las tuberias del proyecto.concreto simple y cada diametro que tengan las tuberias": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Tubería de concreto reforzado  21 MPa de 900 mm de diametro interior": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Tubería corrugada de acero galvanizado MP-68, de lámina calibre__ y diametro __": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Tubería corrugada de acero con recubrimiento bituminoso, de lámina calibre 12  y D=60´´": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Tubería de plastico tipo__norma___de diametro__mm": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 1: recubrimiento de zinc (galvanizado)": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 2: recubrimiento de aleacion ZN-5A1-MM": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 3: recubrimiento de zinc (galvanizado) y pvc": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Disipadores de energía y sedimentadores en gaviones de alambre de acero entrelazado clase 4: recubrimiento de aleacion ZN-5A1-MM y pvc": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Disipadores de energía y sedimentadores en concreto ciclopeo": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Cuneta de concreto vaciada in situ; no incluye la conformacion de la superficie de apoyo": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Cuneta de piezas prefabricadas de concreto; no incluye la conformacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Cuneta de concreto vaciada in situ; incluye la conformacion de la superficie de apoyo": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Cuneta de piezas prefabricadas de concreto; incluye la conformacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Bordillo de concreto vaciado in situ; no incluye la preparacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Bordillo de piezas prefabricadas de concreto; no incluye la preparacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Bordillo de concreto vaciado in situ; incluye la preparacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Bordillo de piezas prefabricadas de concreto; incluye la preparacion de la superficie de apoyo": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Geotextil tipo NT-2500 o similar no tejido": {"unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Geotextil  tipo T-2400 o similar tejido": {"unidad": "m2", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Material granular drenante": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Material de cobertura tipo sub- base CBR=20%": {"unidad": "m3", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Dren horizontal de longitud menor o igual a diez (10) metros.": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Dren horizontal de longitud mayor a diez (10) metros.": {"unidad": "m", "capitulo": "OBRAS DE ESTABILIZACIÓN GEOTÉCNICA"}, "Páneles de concreto.": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Armadura galvanizada.": {"unidad": "m", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Relleno granular para tierra mecanicamete estabilizada con páneles de concreto": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Gaviónes de malla de alambre de acero entrelazado  clase 1; recubrimiento de zinc (galvanizado)": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Gavión de malla de alambre de acero entrelazado  clase 2; recubrimiento de aleacion ZN-5A1-MM": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Gavión de malla de alambre de acero entrelazado  clase 3; recubrimiento de zinc (galvanizado) y pvc": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Gavión de malla de alambre de acero etrelazado  clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Colchogavión de malla de alambre de acero entrelazado clase 1; recubrimiento de zinc (galvanizado)": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Colchogavión de malla de alambre de acero entrelazado clase 2; recubrimiento de aleacion ZN-5A1-MM": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Colchogavión de malla de alambre de acero entrelazado clase 3; recubrimiento de zinc (galvanizado) y pvc": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Colchogavión de malla de alambre de acero entrelazado clase 4; recubrimiento de aleacion ZN-5A1-MM y pvc": {"unidad": "m3", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Geotextil de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Geomalla de refuerzo tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Geotextil de fachada tipo___ para muros de tierra estabilizada mecanicamente  con geosinteticos": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Geomalla de fachada tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos.": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Relleno tipo___ para muros de tierra estabilizada mecanicamente con geosinteticos": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Impermeabilizante para concreto": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Impermeabilización de estructuras.": {"unidad": "m2", "capitulo": "OBRAS AMBIENTALES Y DE PAISAJISMO"}, "Línea de demarcación con pintura en frío.": {"unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Línea de demarcación con resina termoplástica.": {"unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Marca vial con pintura en frío.": {"unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Marca vial con resina termoplástica.": {"unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Tacha reflectiva.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Señal vertical de transito tipo 1 con lamina retrorreflectiva tipo III (75 X 75 ) cm": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Señal vertical de transito tipo 2 con lamina retrorreflectiva tipo (1.20X0.40 m)": {"unidad": "m2", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Poste de referencia.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Defensa metálica.": {"unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Sección final.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Sección de tope.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Elemento especial tipo amortiguadores": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Defensa de concreto.": {"unidad": "m", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Captafaros.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Delineador de corona.": {"unidad": "unidad", "capitulo": "SEÑALIZACIÓN Y SEGURIDAD VIAL"}, "Cerca de alambre de puas con postes de madera.": {"unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Cerca de alambre de puas con postes de concreto.": {"unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Cerca de malla con postes de madera.": {"unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Cerca de malla con postes de concreto.": {"unidad": "m", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte aerea de arboles tipo I": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte aerea de arboles tipo II": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte aerea de arboles tipo III": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte aerea de arboles tipo IV": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte radicular de arboles tipo I": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte radficular de arboles tipo II": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte radicular de arboles tipo III": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Poda de la parte radicular de arboles tipo  IV": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Protección de taludes con bloques de césped.": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Protección de taludes con tierra orgánica.": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Protección de taludes con hidrosiembra controlada.": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto temporal. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Proteccion de taludes con producto enrollado para control de erosion. de tipo manto permanente. se debera elaborar un item de pago para cada producto enrollado que se especifique en el proyecto.": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Recubrimiento de taludes con malla y mortero 1:4 de e= 10 cm": {"unidad": "m2", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Plantación de árboles (tipo paisajístico)": {"unidad": "unidad", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Plantación de árboles (reforestación protectora densidad 1100)": {"unidad": "ha", "capitulo": "TRANSPORTE Y GESTIÓN DE MATERIALES"}, "Transporte de materiales provenientes de la excavacion de la explanacion, canales y prestamos, entre  cien metros (100 m) y mil metros (1000 m) de distancia": {"unidad": "m3/e", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, "Transporte de materiales provenientes de la excavación de la explanación, canales y préstamos para distancias mayores de mil metros (1.000 m) medido a partir de cien metros (100 m).": {"unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, "Transporte de materiales provenientes de derrumbes, medido a partir de cien metros (100 m)": {"unidad": "m3/km", "capitulo": "VARIOS Y OBRAS COMPLEMENTARIAS"}, "Localización y replanteo de locaciones, explanaciones y/o facilidades": {"unidad": "HA", "capitulo": "1. Civiles generales"}, "Localización y replanteo de obras lineales (vías, líneas de flujo y líneas del sistema eléctrico),": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Rocería, incluye tala de arboles con dap≤0.15m, incluye transporte y disposición final": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Tala de árboles con dap>0.15m, incluye transporte y disposición final": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Desmonte, descapote y limpieza incluye  tala de arboles con dap ≤0.15m, transporte y disposición final": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Pulverización de palmas in situ con alturas ≤2,50m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Pulverización de palmas in situ con alturas >2,50m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura inferior a 2,50 m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Erradicación, picado, cargue, transporte y compostaje de palma (deshidratacion) con altura superior a 2,50 m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura inferior a 2,50 m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Tala, cargue, transporte y disposición de palma (incluye pulverización y control de plagas) con altura superior a 2,50 m": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Excavación mecánica en material común, incluye transporte a una distancia ≤ a 1km": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Excavación mecánica en roca, incluye transporte a una distancia ≤ a 1km": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Excavación y relleno compensado, incluye transporte distancia ≤ a 1km": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Excavación manual en material común, incluye cargue y transporte distancia ≤ a 1 km": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Acarreo de material (compactado)  a distancia > 1km.": {"unidad": "M³-KM", "capitulo": "1. Civiles generales"}, "Transporte fluvial (compactado).": {"unidad": "M³-KM", "capitulo": "1. Civiles generales"}, "Mejoramiento de la subrasante y conformación de cunetas": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Tipo 1: arena lavada de río o gravilla o una mezcla de estos dos materiales": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 2: recebo o material de préstamo seleccionado": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 3: material granular": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 4: material de excavación seleccionado": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 5: material de afirmado": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 6: subbase granular": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 7: base granular": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 8: piedra partida": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 9: tierra negra": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 10: gravas bien gradadas": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 11: material de relleno para zanjas de tuberia": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 12: material de río seleccionado": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tipo 13: material de arrecife": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Densificacion del terreno mediante columnas de grava de 6” a 12” de diámetro interno  (incluye perforación y suministro de materiales de relleno).": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Escarificación de bases o suelos estabilizados y/o componentes asfálticos": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Concreto clase  a (350 kg/cm2 ó 5000 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  b (320 kg/cm2 ó 4570 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  c (280 kg/cm2 ó 4000 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  d (210 kg/cm2 ó 3000 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  e (175 kg/cm2 ó 2500 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  e con mineral rojo (175 kg/cm2 ó 2500 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto clase  f (140 kg/cm2 ó 2000 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto ciclopeo clase  g (175 kg/cm2 ó 2500 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto  de limpieza clase  h (105 kg/cm2 ó 1500 psi)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Tejido frp (tipo sikawrap 600c o similar)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Láminas cfrp (tipo sikacarbodur  ancho 50 mm)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Junta de construcción con cinta pvc 22": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Junta de construcción con cinta pvc 15": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Junta de contracción": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Junta de dilatación": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Junta impermeabilizada": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Mortero para pañete , incluye filos y dilataciones. (espesor 1,5 cm)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Mortero de pega (espesor 1,5cm)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Mortero impermeabilizado (espesor 1,5cm)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Grouting cementoso": {"unidad": "L", "capitulo": "1. Civiles generales"}, "Grouting epóxico": {"unidad": "L", "capitulo": "1. Civiles generales"}, "Preparación, suministro e instalación de mortero impermeabilizado  + poliester + pintura": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Preparación, suministro e instalación de mortero impermeabilizado  + poliester": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Acero fy:  60000 psi (4.200 kg/cm2)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Acero a-37 fy: 34200 psi (2,400 kg/cm2)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Malla electro soldada fy:  60000 psi (4.200 kg/cm2)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Malla electro soldada fy: 34200 psi (2,400 kg/cm2)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion perfilería astm a36 (columnas, vigas, entrepisos, casetas, etc.)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion perfilería a572 grado 50 (columnas, vigas, entrepisos, casetas, etc.)": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion tubería para estructuras a53 grado b": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion estructura metálica para misceláneos": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion pernos de anclaje pre-instalado": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion pernos de anclaje con epóxico": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Suministro e instalacion lamina colaborante h= 2” calibre 16 o equivalente": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalacion lamina colaborante h= 2” calibre 18 o equivalente": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalacion lamina colaborante h= 3” calibre 16 o equivalente": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalacion lamina colaborante h= 3” calibre 18 o equivalente": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Instalacion tubo conductor de ø12\" a ø20\". (incluye el transporte )": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Instalacion de tubo conductor de ø22\" a ø30\".(incluye el transporte )": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e instalacion tubo conductor de ø12\" a ø20\".(incluye suministro y transporte)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de tubo conductor de ø22\" a ø30\". (incluye suministro y transporte)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Instalacion de tubo conductor  hincado con piloteadora para l>15m": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Instalacion de estructuras plasticas, skimmers, trampa de aguas grises o desarenador. incluye transporte y anclaje.": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de estructuras plasticas, skimmers, trampa de aguas o grises, desarenador, incluye rejillas y/o tapas. incluye transporte y anclaje.": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Instalacion de estructuras metalicas, skimmers, trampa de aguas grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de estructuras metalicas, skimmers, trampa de aguas o grises, desarenador, contrapozo. incluye rejillas y/o tapas. incluye transporte y anclaje.": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de caseta en polipropileno de alta densidad para vigilancia": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Suministro e instalación de cuneta portátil (ecocanal 66 × 200) incluye excavación": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Malla tipo ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50m, concertina de ø 18” y cable sensor de intrusión. (nivel 3 - tipo 1)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Malla expandida tipo imf 100, muro en ladrillo macizo, concertina de ø 18” y cable sensor de intrusión. altura mínima de 2,50m (nivel 3 - tipo 2)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Muro en mampostería confinada, concertina de ø 18” y cable sensor de intrusión.  altura mínima de 2,50m (nivel 3 - tipo 3)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Malla tipo ciclón  de acero inoxidable cal 10 2” x 2” altura mayor a 2,50 m y concertina de ø 18”,  altura mínima de 2,50m.(nivel 2 - tipo 1)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Malla expandida tipo imf 100, muro en ladrillo macizo y concertina de ø 18”. altura mínima de 2,50m. (nivel 2 - tipo 2)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Muro en mampostería confinada y concertina de ø 18”.  (nivel 2 - tipo 3)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerca de alambre de púas 5 hilos. (con poste en concreto) (nivel 1 - tipo 1)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Malla ciclón con alambre de púas altura mínima de 2,50m. (nivel 1 - tipo 2)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Muro mampostería confinada altura mínima de 2,50m. (nivel 1 - tipo 3)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerca de alambre de púas 5 hilos. (con poste en polipropileno)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerca de alambre de púas 5 hilos. (con poste en polipropileno reutilizado)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerramiento modular, con malla electro soldada galvanizada y plastificada": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerramiento modular, con malla ciclón de acero inoxidable cal 10 2” x 2” altura mínima 2,50 m": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Cerramiento en lamina de zinc": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e instalación de puertas en malla eslabonada cal 10  2\" x 2\"": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Concreto hidráulico para pavimento rígido. resistencia especificada 5000 psi": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Concreto hidráulico para pavimento rígido. resistencia especificada 4000 psi": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Base granular (relleno tipo 7) estabilizada con emulsión asfáltica  incluye emulsión asfáltica crl-1": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Base granular (relleno tipo 7) estabilizada con cemento. incluye el cemento": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Suelo estabilizado con cemento. incluye el cemento": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Imprimación. riego de imprimación con emulsión asfáltica crl-1.": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro, extendido, nivelación y compactación de mezcla densa en caliente tipo 2": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Suministro, extendido, nivelación y compactación de mezcla densa en frio  tipo 2": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Suministro e instalación de slurry asfáltico": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Tratamiento superficial simple": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Tratamiento superficial doble": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suelo arcilloso estabilizado con productos quimicos estabilizadores. incluye productos quimicos": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Pavimento asfaltico para bacheo": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Demarcación línea continua blanca a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Demarcación línea discontinua amarilla a=0.12 m (e=15 mils, acrílica base agua. inc. suministro y aplicación con equipo. inc. micro esferas)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Marcas viales": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalación señal vertical grupo i - 75 cm x 75 cm": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Geomembrana hdpe para impermeabilización.  de 20 mils.": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geomembrana hdpe para impermeabilización.  de 40 mils,  e: 1.0 mm": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geomembrana de hdpe para confinamiento de hidrocarburos (piscinas).  de 60 mils,  e: 1.5 mm": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 400 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 470 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 500 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (nt) en sistemas protección, drenaje y filtración, resistencia minima a la tension 700 n-2500 nt": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1140 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (t) en sistemas de estabilización y refuerzo. resistencia minima a la tension 1870 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geotextiles (t) en sistemas de estabilización y refuerzo, alto modulo resistencia minima  a la tension 2400 n": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geomalla uniaxial": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geomalla  biaxial (tension min pico: long 12 kn/m, transv 19 kn/m)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Geomalla  biaxial (tension min pico: long 19 kn/m, transv 28,5 kn/m)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Sistema de confinamiento celular": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Gaviones  (incluye malla, alambre galvanizado, piedra y demás materiales)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Colcha gaviones (incluye malla, alambre galvanizado, piedra y demás materiales)": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Hexápodos": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Suministro y construcción de filtro francés": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Geodren planar": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en concreto 3000 psi": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Construccion de descoles de cunetas, disipadores de energia y/o sedimentadores en ciclopeo 2500 psi": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de manto impregnado de concreto para cunetas e= 5 cm": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de manto impregnado de concreto para cunetas e= 8 cm": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalacion de manto impregnado de concreto para cunetas e= 13 cm": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Limpieza a mano de alcantarillas de tubo de 24” y 36”": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Limpieza a mano de encoles y descoles": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Bolsacreto": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Sacos rellenos con suelo": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Sacos rellenos con suelo y cemento (rel : 5: 1.)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Empradización con cespedón continuo": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Empradizacion con estolón": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Fajinas vivas": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Empradizacion con semilla al voleo": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Revegetalizacion con especies arboreas nativas": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Revegetalizacion con especies arboreas foraneas": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Protección de taludes con biomanto": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Extendido y conformacion de material vegetal (descapote) incluye transporte < 1km": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Trinchos  tipo  a": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Trinchos  tipo  b": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Trinchos  tipo  c": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Trinchos  tipo  d": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro y construcción de trincho tipo canal": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro y construcción de barreras con geotextil": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc para drenaje  ǿ 8\" perforada": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc para drenaje  ǿ 6\" perforada": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc para drenaje  ǿ 4\" perforada": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería de concreto reforzado ǿ 48\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería de concreto reforzado ǿ 36\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería de concreto reforzado ǿ 24\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería de concreto reforzado ǿ 16\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 36\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 24\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 16\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 14\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 12\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 10\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 8\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería novaloc-novafort ø 6\"": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc drenaje de aguas lluvias  ø 8” a ø 12”": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc drenaje de aguas lluvias  ø 4” a ø 6”": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc sanitaria,  entre ø 2” a ø 3”": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc sanitaria,  entre ø 4” a ø 6” (M — 1. Civiles generales)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc  øs  1/2\", 3/4\", 1\" rh. (red hidráulica)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc ø 2\"  rh": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc  ø 3\"  rh": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Tubería pvc ø 4\" rh": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Demolición manual de concreto": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Demolición mecánica de concreto": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Demolición de pavimento flexible": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Demolición muros en mampostería.": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Desmantelamiento cerramiento en malla eslabonada (incluye concertina y accesorios)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Desmantelamiento cerramiento en alambre de púas.": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Desmonte de estructuras metálicas. incluye transporte ≤ 20km y disposición final": {"unidad": "KG", "capitulo": "1. Civiles generales"}, "Desmonte o retiro y transporte ≤ 20km, e instalación o acopio de trampas metálicas portábles (aceitosas, grasas  y desarenador, hasta el sitio de disposición, instalación o acopio autorizado por ecp)": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Desinstalación e instalación de estructuras plásticas skimmers, trampa de aguas grises o desarenador, incluye retiro de la estructura y transporte ≤ 20km": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Transporte de equios y materiales": {"unidad": "TON-KM", "capitulo": "1. Civiles generales"}, "Mezcla de lodos con material en zona de piscinas": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Retiro y estabilización de materiales de piscina, incluye transporte hasta 1 km": {"unidad": "M3", "capitulo": "1. Civiles generales"}, "Retiro y disposición final de geomembrana y su incineración. incluye transporte y disposición final": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e hincado  de  pilotes  d=6” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e hincado  de  pilotes  d=8” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e hincado  de  pilotes  d=10” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e hincado  de  pilotes  d=12” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e hincado de pilotes en madera d=6” a 8” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e hincado de pilotes en madera d=10” a 12” (incluye la punta de lápiz)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Suministro e instalación de placas modulares para helipuerto con aditivo antiestático-protección uv y anclajes o equivalente": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Instalacion de placas modulares en polipropileno de alta densidad": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Desinstalación de placas modulares reutilizables": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Construcción de puente petrolero (ancho 4 m)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Construcción de puente petrolero (ancho 4 m - tubería suministrada por ecp)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Construcción de tablero para puente petrolero (ancho 4 m)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Construcción de tablero para puente petrolero (ancho 4 m - tubería suministrada por ecp)": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Protección de cables para puentes colgantes": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Construccion de piezometro o pozo de monitoreo": {"unidad": "M", "capitulo": "1. Civiles generales"}, "Limpieza e hidrolavado (trabajo en alturas)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Alistamiento de superficie (para instalación de fibras de carbono u otras actividades requeridas)": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalación de mortero de reparación para recubrimiento": {"unidad": "M2", "capitulo": "1. Civiles generales"}, "Suministro e instalación neopreno reforzado (250x250x10 mm).": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Suministro e instalación de placa de abandono": {"unidad": "UND", "capitulo": "1. Civiles generales"}, "Estuco y pintura": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Pintura tipo 1 sobre pañete, para interiores": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Pintura tipo koraza para exteriores": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Pintura esmalte": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Estuco y pintura mochetas, antepechos, dinteles": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Sanitario línea institucional (incluye grifería y accesorios)": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Orinal institucional mediano (incluye grifería y accesorios)": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Lavamanos sobreponer incluye griferías y accesorios": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Suministro e instalación de punto hidráulico pvc de ø; 1/2”, 3/4\" y  1\". incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Suministro e instalación de punto hidráulico pvc ø1-1/2\", ø 2”. incluye tubería hasta 5 m y accesorios. paral de techo y/o de piso": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Suministro e instalación de registros, cheques  de ø 3/4,  1/2\", 1\", 1 1/2\"": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Suministro e instalación de registros, cheques  de ø 2\", 21/2”": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Suministro e instalación de punto sanitario ø 2\", 3\", 4\".": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Mampostería en ladrillo tolete a la vista (reforzada)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Mampostería a la vista no reforzada": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Mamposteria muros en bloque": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Piso en concreto afinado con endurecedor de cuarzo tráfico alto y acabado en cemento esmaltado": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Piso en concreto escobiado": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Instalación de pisos (no incluye suministro del piso)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Enchape muros (no incluye suministro de enchape)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Guardaescoba media caña ó cerámica  (no incluye suministro)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Piso tablón de gress porcelanico de 40x40cm. color: gris mate": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Baldosa de granito tráfico pesado color blanco 0.40x0.40": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Enchapes y pisos en cerámica de 25cmx25cm. zonas húmedas": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Enchape en granito pulido, color blanco para mesones o entrepaños en concreto (portería + baño)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Guardaescoba en cerámica de 10x25cm. color: blanco": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Guardaescoba media caña en granito pulido": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Cubierta metálica acanalada calibre 26, termoacustica": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Terminales y caballete": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Cubierta en teja termo-acústica metálica calibre 26": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Canal en pvc": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Bajante en pvc  3\" y  4\"": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Cielo raso dry wall": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Cielo raso en lámina acústica en fibra mineral clase as-s1": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Canal en lamina calibre 20": {"unidad": "M", "capitulo": "2. Acabados arquitectonicos"}, "Puertas metálicas calibre 18 (incluye marcos)": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Ventanería en aluminio, incluye vidrio  6mm templado": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Espejos 5mm": {"unidad": "M2", "capitulo": "2. Acabados arquitectonicos"}, "Puerta antipánico de 1.00 x2.50 m  calibre 18 doble hoja": {"unidad": "UND", "capitulo": "2. Acabados arquitectonicos"}, "Supervisor civil": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Oficial de construcción": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Ayudante de construcción (obrero raso)": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Buldozer potencia minima 120hp": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Moto niveladora potencia minima 120hp": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Retroexcavadora potencia minima 130hp": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Vibrocompactador peso minimo 10ton": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Vibrocompactador pata de cabra": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Carrotanque sencillo irrigador de agua": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Carrotanque dobletroque irrigador de agua": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Retroexcavadora potencia minima 75hp": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Volqueta tipo sencilla con capacidad mínima de 6 m3": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Volqueta tipo dt con capacidad mínima de 15 m3": {"unidad": "HR", "capitulo": "3. Suministros y/o alquiler"}, "Motobomba 4\"": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Motobomba 6\"": {"unidad": "DÍA", "capitulo": "3. Suministros y/o alquiler"}, "Alquiler de andamios certificados": {"unidad": "M³-DIA", "capitulo": "3. Suministros y/o alquiler"}, "Transporte armado y desarmado de andamios certificados": {"unidad": "M3", "capitulo": "3. Suministros y/o alquiler"}}`);
const LISTA_ACTIVIDADES = Object.keys(LISTA_ACTIVIDADES_INFO);
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal"];
const CATALOGO_CIUDADES = [{"ciudad": "Leticia", "departamento": "Amazonas"}, {"ciudad": "Puerto Nariño", "departamento": "Amazonas"}, {"ciudad": "Medellín", "departamento": "Antioquia"}, {"ciudad": "Bello", "departamento": "Antioquia"}, {"ciudad": "Itagüí", "departamento": "Antioquia"}, {"ciudad": "Envigado", "departamento": "Antioquia"}, {"ciudad": "Rionegro", "departamento": "Antioquia"}, {"ciudad": "Arauca", "departamento": "Arauca"}, {"ciudad": "Saravena", "departamento": "Arauca"}, {"ciudad": "Tame", "departamento": "Arauca"}, {"ciudad": "Barranquilla", "departamento": "Atlántico"}, {"ciudad": "Soledad", "departamento": "Atlántico"}, {"ciudad": "Malambo", "departamento": "Atlántico"}, {"ciudad": "Sabanalarga", "departamento": "Atlántico"}, {"ciudad": "Puerto Colombia", "departamento": "Atlántico"}, {"ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C."}, {"ciudad": "Cartagena", "departamento": "Bolívar"}, {"ciudad": "Magangué", "departamento": "Bolívar"}, {"ciudad": "Turbaco", "departamento": "Bolívar"}, {"ciudad": "Arjona", "departamento": "Bolívar"}, {"ciudad": "El Carmen de Bolívar", "departamento": "Bolívar"}, {"ciudad": "Tunja", "departamento": "Boyacá"}, {"ciudad": "Duitama", "departamento": "Boyacá"}, {"ciudad": "Sogamoso", "departamento": "Boyacá"}, {"ciudad": "Chiquinquirá", "departamento": "Boyacá"}, {"ciudad": "Paipa", "departamento": "Boyacá"}, {"ciudad": "Manizales", "departamento": "Caldas"}, {"ciudad": "La Dorada", "departamento": "Caldas"}, {"ciudad": "Chinchiná", "departamento": "Caldas"}, {"ciudad": "Villamaría", "departamento": "Caldas"}, {"ciudad": "Riosucio", "departamento": "Caldas"}, {"ciudad": "Florencia", "departamento": "Caquetá"}, {"ciudad": "San Vicente del Caguán", "departamento": "Caquetá"}, {"ciudad": "Puerto Rico", "departamento": "Caquetá"}, {"ciudad": "Yopal", "departamento": "Casanare"}, {"ciudad": "Aguazul", "departamento": "Casanare"}, {"ciudad": "Villanueva", "departamento": "Casanare"}, {"ciudad": "Tauramena", "departamento": "Casanare"}, {"ciudad": "Popayán", "departamento": "Cauca"}, {"ciudad": "Santander de Quilichao", "departamento": "Cauca"}, {"ciudad": "Puerto Tejada", "departamento": "Cauca"}, {"ciudad": "Patía", "departamento": "Cauca"}, {"ciudad": "Valledupar", "departamento": "Cesar"}, {"ciudad": "Aguachica", "departamento": "Cesar"}, {"ciudad": "Codazzi", "departamento": "Cesar"}, {"ciudad": "La Jagua de Ibirico", "departamento": "Cesar"}, {"ciudad": "Quibdó", "departamento": "Chocó"}, {"ciudad": "Istmina", "departamento": "Chocó"}, {"ciudad": "Condoto", "departamento": "Chocó"}, {"ciudad": "Tadó", "departamento": "Chocó"}, {"ciudad": "Montería", "departamento": "Córdoba"}, {"ciudad": "Cereté", "departamento": "Córdoba"}, {"ciudad": "Lorica", "departamento": "Córdoba"}, {"ciudad": "Sahagún", "departamento": "Córdoba"}, {"ciudad": "Planeta Rica", "departamento": "Córdoba"}, {"ciudad": "Soacha", "departamento": "Cundinamarca"}, {"ciudad": "Girardot", "departamento": "Cundinamarca"}, {"ciudad": "Zipaquirá", "departamento": "Cundinamarca"}, {"ciudad": "Facatativá", "departamento": "Cundinamarca"}, {"ciudad": "Chía", "departamento": "Cundinamarca"}, {"ciudad": "Inírida", "departamento": "Guainía"}, {"ciudad": "San José del Guaviare", "departamento": "Guaviare"}, {"ciudad": "Neiva", "departamento": "Huila"}, {"ciudad": "Pitalito", "departamento": "Huila"}, {"ciudad": "Garzón", "departamento": "Huila"}, {"ciudad": "La Plata", "departamento": "Huila"}, {"ciudad": "Riohacha", "departamento": "La Guajira"}, {"ciudad": "Maicao", "departamento": "La Guajira"}, {"ciudad": "Uribia", "departamento": "La Guajira"}, {"ciudad": "Fonseca", "departamento": "La Guajira"}, {"ciudad": "Santa Marta", "departamento": "Magdalena"}, {"ciudad": "Ciénaga", "departamento": "Magdalena"}, {"ciudad": "Fundación", "departamento": "Magdalena"}, {"ciudad": "El Banco", "departamento": "Magdalena"}, {"ciudad": "Villavicencio", "departamento": "Meta"}, {"ciudad": "Acacías", "departamento": "Meta"}, {"ciudad": "Granada", "departamento": "Meta"}, {"ciudad": "Puerto López", "departamento": "Meta"}, {"ciudad": "Pasto", "departamento": "Nariño"}, {"ciudad": "Tumaco", "departamento": "Nariño"}, {"ciudad": "Ipiales", "departamento": "Nariño"}, {"ciudad": "Túquerres", "departamento": "Nariño"}, {"ciudad": "Cúcuta", "departamento": "Norte de Santander"}, {"ciudad": "Ocaña", "departamento": "Norte de Santander"}, {"ciudad": "Pamplona", "departamento": "Norte de Santander"}, {"ciudad": "Villa del Rosario", "departamento": "Norte de Santander"}, {"ciudad": "Mocoa", "departamento": "Putumayo"}, {"ciudad": "Puerto Asís", "departamento": "Putumayo"}, {"ciudad": "Orito", "departamento": "Putumayo"}, {"ciudad": "Armenia", "departamento": "Quindío"}, {"ciudad": "Calarcá", "departamento": "Quindío"}, {"ciudad": "La Tebaida", "departamento": "Quindío"}, {"ciudad": "Montenegro", "departamento": "Quindío"}, {"ciudad": "Pereira", "departamento": "Risaralda"}, {"ciudad": "Dosquebradas", "departamento": "Risaralda"}, {"ciudad": "Santa Rosa de Cabal", "departamento": "Risaralda"}, {"ciudad": "San Andrés", "departamento": "San Andrés y Providencia"}, {"ciudad": "Providencia", "departamento": "San Andrés y Providencia"}, {"ciudad": "Bucaramanga", "departamento": "Santander"}, {"ciudad": "Floridablanca", "departamento": "Santander"}, {"ciudad": "Girón", "departamento": "Santander"}, {"ciudad": "Piedecuesta", "departamento": "Santander"}, {"ciudad": "Barrancabermeja", "departamento": "Santander"}, {"ciudad": "Sincelejo", "departamento": "Sucre"}, {"ciudad": "Corozal", "departamento": "Sucre"}, {"ciudad": "San Marcos", "departamento": "Sucre"}, {"ciudad": "Ibagué", "departamento": "Tolima"}, {"ciudad": "Espinal", "departamento": "Tolima"}, {"ciudad": "Melgar", "departamento": "Tolima"}, {"ciudad": "Honda", "departamento": "Tolima"}, {"ciudad": "Cali", "departamento": "Valle del Cauca"}, {"ciudad": "Palmira", "departamento": "Valle del Cauca"}, {"ciudad": "Buenaventura", "departamento": "Valle del Cauca"}, {"ciudad": "Tuluá", "departamento": "Valle del Cauca"}, {"ciudad": "Cartago", "departamento": "Valle del Cauca"}, {"ciudad": "Mitú", "departamento": "Vaupés"}, {"ciudad": "Puerto Carreño", "departamento": "Vichada"}];

function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}
function aFechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function comprimirFoto(file, maxAncho = 1000, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("No se pudo procesar la foto"));
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        calidad
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
function CasillaFoto({ foto, onChange, onRemove, numero }) {
  const inputRef = useRef(null);
  function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  }
  return (
    <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
      {foto.previewUrl ? (
        <div className="relative">
          <img src={foto.previewUrl} alt={`Foto ${numero}`} className="w-full h-24 object-cover rounded-md" />
          <button onClick={onRemove} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-24 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1"
          style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={18} />
          <span className="text-[10.5px] font-medium">Foto {numero}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} />
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
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>{label}</label>
      {children}
    </div>
  );
}
function Input(props) {
  return <input {...props} className="w-full border rounded-lg px-3 py-2.5 text-[14px]" style={{ borderColor: LINE }} />;
}
function BuscadorTexto({ value, onChange, catalogo, campo, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
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
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]" style={{ borderColor: LINE, color: NAVY }}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const itemVacio = () => ({ actividad: "", unidad: "", cantContractual: "", cantAnterior: "", cantActa: "", precioUnitario: "", observacion: "" });

export default function FormularioActa({ onVolver, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [actaNo, setActaNo] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [contratante, setContratante] = useState("");
  const [contratista, setContratista] = useState("Reformas y Remodelaciones");
  const [interventoria, setInterventoria] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [contratoNo, setContratoNo] = useState("");
  const [fechaActa, setFechaActa] = useState(fechaLocalHoy());
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [objeto, setObjeto] = useState("");

  const [diasContractuales, setDiasContractuales] = useState("");
  const [diasAvance, setDiasAvance] = useState("");
  const [porcentajeTiempo, setPorcentajeTiempo] = useState("");
  const [contratanteNombre, setContratanteNombre] = useState(""); const [contratanteCargo, setContratanteCargo] = useState("");
  const [contratistaNombre, setContratistaNombre] = useState(""); const [contratistaCargo, setContratistaCargo] = useState("");
  const [interventorNombre, setInterventorNombre] = useState(""); const [interventorCargo, setInterventorCargo] = useState("");

  const [items, setItems] = useState([itemVacio()]);

  const [valorContractual, setValorContractual] = useState("");
  const [valorActasAnteriores, setValorActasAnteriores] = useState("");
  const valorPresenteActa = useMemo(() => {
    return items.reduce((acc, it) => acc + (numES(it.cantActa) || 0) * (numES(it.precioUnitario) || 0), 0);
  }, [items]);
  const [anticipo, setAnticipo] = useState("");
  const [amortizacion, setAmortizacion] = useState("");
  const [retenciones, setRetenciones] = useState("");

  const [calidadEstado, setCalidadEstado] = useState("CUMPLE"); const [calidadRef, setCalidadRef] = useState("");
  const [sstEstado, setSstEstado] = useState("CUMPLE"); const [sstRef, setSstRef] = useState("");
  const [ambientalEstado, setAmbientalEstado] = useState("CUMPLE"); const [ambientalRef, setAmbientalRef] = useState("");

  const [observaciones, setObservaciones] = useState([{ descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }]);

  const [fotos, setFotos] = useState([
    { file: null, previewUrl: null }, { file: null, previewUrl: null },
    { file: null, previewUrl: null }, { file: null, previewUrl: null }, { file: null, previewUrl: null },
  ]);

  const [elabNombre, setElabNombre] = useState(""); const [elabCargo, setElabCargo] = useState("");
  const [revNombre, setRevNombre] = useState(""); const [revCargo, setRevCargo] = useState("");
  const [aprNombre, setAprNombre] = useState(""); const [aprCargo, setAprCargo] = useState("");

  const [generando, setGenerando] = useState(false);
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      const val = (celda) => ws.getCell(celda).value;
      setActaNo(val("C11") || ""); setContratoNo(val("J12") || "");
      setProyecto(val("C12") || ""); setContratante(val("C13") || "");
      setContratista(val("J13") || ""); setInterventoria(val("C14") || "");
      setUbicacion(val("J14") || ""); setObjeto(val("D16") || "");
      setDiasContractuales(String(val("F20") || "")); setDiasAvance(String(val("J20") || ""));
      setPorcentajeTiempo(String((numES(val("N20")) || 0) * 100));
      setContratanteNombre(val("C21") || ""); setContratanteCargo(val("C22") || "");
      setContratistaNombre(val("H21") || ""); setContratistaCargo(val("H22") || "");
      setInterventorNombre(val("L21") || ""); setInterventorCargo(val("L22") || "");

      const nuevosItems = [];
      for (let r = 26; r <= 33; r++) {
        const act = val(`B${r}`);
        if (act) nuevosItems.push({
          actividad: String(act), unidad: val(`E${r}`) || "",
          cantContractual: String(val(`F${r}`) || ""), cantAnterior: String(val(`G${r}`) || ""),
          cantActa: String(val(`H${r}`) || ""), precioUnitario: String(val(`I${r}`) || ""),
          observacion: val(`N${r}`) || "",
        });
      }
      setItems(nuevosItems.length ? nuevosItems : [itemVacio()]);

      setValorContractual(String(val("E36") || "")); setValorActasAnteriores(String(val("H36") || ""));
      setAnticipo(String(val("H37") || "")); setAmortizacion(String(val("K37") || "")); setRetenciones(String(val("N37") || ""));
      setCalidadEstado(val("C41") || "CUMPLE"); setCalidadRef(val("A42") || "");
      setSstEstado(val("G41") || "CUMPLE"); setSstRef(val("F42") || "");
      setAmbientalEstado(val("L41") || "CUMPLE"); setAmbientalRef(val("K42") || "");

      const nuevasObs = [];
      for (let r = 46; r <= 51; r++) {
        const desc = val(`B${r}`);
        if (desc) nuevasObs.push({
          descripcion: String(desc), clasificacion: val(`E${r}`) || "", accion: val(`H${r}`) || "",
          responsable: val(`K${r}`) || "", fecha: "", estado: val(`N${r}`) || "",
        });
      }
      setObservaciones(nuevasObs.length ? nuevasObs : [{ descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }]);

      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea un Acta generada por este sistema.");
    } finally {
      setCargando(false);
    }
  }

  const saldoContractual = (numES(valorContractual) || 0) - (numES(valorActasAnteriores) || 0) - (numES(valorPresenteActa) || 0);
  const porcentajeEjecutado = valorContractual ? (((numES(valorActasAnteriores) || 0) + (numES(valorPresenteActa) || 0)) / numES(valorContractual)) * 100 : 0;

  function actualizarFoto(idx, nuevaFoto) { setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f))); }
  function quitarFoto(idx) { setFotos((fs) => fs.map((f, i) => (i === idx ? { file: null, previewUrl: null } : f))); }

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-acta.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Acta de Obra");

      ws.getCell("C11").value = actaNo;
      ws.getCell("J12").value = contratoNo;
      ws.getCell("C12").value = proyecto;
      ws.getCell("C13").value = contratante;
      ws.getCell("J13").value = contratista;
      ws.getCell("C14").value = interventoria;
      ws.getCell("J14").value = ubicacion;
      ws.getCell("C15").value = aFechaDDMMYYYY(fechaActa);
      ws.getCell("F15").value = aFechaDDMMYYYY(desde);
      ws.getCell("H15").value = aFechaDDMMYYYY(hasta);
      ws.getCell("J15").value = aFechaDDMMYYYY(hasta);
      ws.getCell("D16").value = objeto;

      ws.getCell("F20").value = numES(diasContractuales) || 0;
      ws.getCell("J20").value = numES(diasAvance) || 0;
      ws.getCell("N20").value = (numES(porcentajeTiempo) || 0) / 100;
      ws.getCell("C21").value = contratanteNombre; ws.getCell("C22").value = contratanteCargo;
      ws.getCell("H21").value = contratistaNombre; ws.getCell("H22").value = contratistaCargo;
      ws.getCell("L21").value = interventorNombre; ws.getCell("L22").value = interventorCargo;

      items.forEach((it, i) => {
        if (!it.actividad) return;
        const r = 26 + i;
        if (r > 33) return;
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = it.actividad;
        ws.getCell(`E${r}`).value = it.unidad;
        ws.getCell(`F${r}`).value = numES(it.cantContractual) || 0;
        ws.getCell(`G${r}`).value = numES(it.cantAnterior) || 0;
        ws.getCell(`H${r}`).value = numES(it.cantActa) || 0;
        ws.getCell(`I${r}`).value = numES(it.precioUnitario) || 0;
        ws.getCell(`N${r}`).value = it.observacion;
      });

      ws.getCell("E36").value = numES(valorContractual) || 0;
      ws.getCell("H36").value = numES(valorActasAnteriores) || 0;
      ws.getCell("H37").value = numES(anticipo) || 0;
      ws.getCell("K37").value = numES(amortizacion) || 0;
      ws.getCell("N37").value = numES(retenciones) || 0;

      ws.getCell("C41").value = calidadEstado; ws.getCell("A42").value = calidadRef;
      ws.getCell("G41").value = sstEstado; ws.getCell("F42").value = sstRef;
      ws.getCell("L41").value = ambientalEstado; ws.getCell("K42").value = ambientalRef;

      observaciones.forEach((o, i) => {
        if (!o.descripcion) return;
        const r = 46 + i;
        if (r > 51) return;
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = o.descripcion;
        ws.getCell(`E${r}`).value = o.clasificacion;
        ws.getCell(`H${r}`).value = o.accion;
        ws.getCell(`K${r}`).value = o.responsable;
        ws.getCell(`M${r}`).value = o.fecha ? aFechaDDMMYYYY(o.fecha) : "";
        ws.getCell(`N${r}`).value = o.estado;
      });

      ws.getCell("A75").value = elabCargo ? `${elabNombre} - ${elabCargo}` : elabNombre;
      ws.getCell("E75").value = revCargo ? `${revNombre} - ${revCargo}` : revNombre;
      ws.getCell("I75").value = aprCargo ? `${aprNombre} - ${aprCargo}` : aprNombre;
      ws.getCell("M75").value = aFechaDDMMYYYY(fechaLocalHoy());

      try {
        const clave = "ryr_actas_valor_presente";
        const guardadas = JSON.parse(localStorage.getItem(clave) || "{}");
        guardadas[actaNo || fechaLocalHoy()] = {
          actaNo, proyecto,
          valor: numES(valorPresenteActa) || 0,
          fecha: fechaLocalHoy(),
        };
        localStorage.setItem(clave, JSON.stringify(guardadas));
      } catch (e) {
        console.warn("No se pudo guardar el valor del acta en memoria local:", e);
      }

      try {
        const claveAcum = "ryr_acta_acumulado";
        const acum = JSON.parse(localStorage.getItem(claveAcum) || "{}");
        items.forEach((it) => {
          if (!it.actividad) return;
          const anterior = numES(it.cantAnterior) || 0;
          const estaActa = numES(it.cantActa) || 0;
          acum[it.actividad] = anterior + estaActa;
        });
        localStorage.setItem(claveAcum, JSON.stringify(acum));
      } catch (e) {
        console.warn("No se pudo guardar el acumulado de cantidades:", e);
      }

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const nombreArchivo = `Acta_de_Obra_${actaNo || fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url; a2.download = nombreArchivo;
      document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
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
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="acta" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} />}
              <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              Menú SAIEA OBRAS
            </button>
            </div>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ACTA DE OBRA</div>
            <IndicadorTipoProyecto />
            <div className="text-[11px]" style={{ color: GOLD }}>Reformas y Remodelaciones</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Acta nueva
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el Acta que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            try {
              const lista = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
              if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
              const d = lista[0].datos;
              setProyecto(d.proyecto || "");
              setContratoNo(d.noContrato || "");
              setContratista(d.contratista || "Reformas y Remodelaciones");
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
        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>1. IDENTIFICACIÓN</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Acta No."><Input value={actaNo} onChange={(e) => setActaNo(e.target.value)} /></Campo>
            <Campo label="Contrato No."><Input value={contratoNo} onChange={(e) => setContratoNo(e.target.value)} /></Campo>
          </div>
          <Campo label="Proyecto / Obra"><Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Contratante"><Input value={contratante} onChange={(e) => setContratante(e.target.value)} /></Campo>
            <Campo label="Contratista"><Input value={contratista} onChange={(e) => setContratista(e.target.value)} /></Campo>
          </div>
          <Campo label="Interventoría"><Input value={interventoria} onChange={(e) => setInterventoria(e.target.value)} /></Campo>
          <Campo label="Ubicación"><BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." /></Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Fecha del acta"><Input type="date" value={fechaActa} onChange={(e) => setFechaActa(e.target.value)} /></Campo>
            <Campo label="Desde"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
            <Campo label="Hasta"><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
          </div>
          <Campo label="Objeto / alcance resumido">
            <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2.5 text-[13px]" style={{ borderColor: LINE }} />
          </Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>2. PARTICIPANTES Y CONTROL DEL PERÍODO</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Campo label="Días contractuales"><Input type="text" inputMode="decimal" value={diasContractuales} onChange={(e) => setDiasContractuales(e.target.value)} /></Campo>
            <Campo label="Días de avance"><Input type="text" inputMode="decimal" value={diasAvance} onChange={(e) => setDiasAvance(e.target.value)} /></Campo>
            <Campo label="% Tiempo avance"><Input type="text" inputMode="decimal" value={porcentajeTiempo} onChange={(e) => setPorcentajeTiempo(e.target.value)} /></Campo>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                const lista = JSON.parse(localStorage.getItem("ryr_avance_diario_actividades") || "[]");
                if (!lista.length) { alert("No hay Informes Diarios guardados todavía. Genera al menos uno primero."); return; }
                if (!hasta) { alert('Primero llena la fecha "Hasta" del acta (arriba).'); return; }
                const fechasUnicas = new Set(
                  lista
                    .filter((r) => r.fecha && new Date(r.fecha) <= new Date(hasta))
                    .map((r) => r.fecha)
                );
                const da = fechasUnicas.size;
                const dc = numES(diasContractuales) || 0;
                const pt = dc > 0 ? Math.min(100, (da / dc) * 100) : 0;
                setDiasAvance(String(da));
                if (dc > 0) setPorcentajeTiempo(pt.toFixed(1));
              } catch (err) {
                alert("No se pudieron leer los Informes Diarios guardados.");
              }
            }}
            className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Calcular desde Informe Diario
          </button>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Contratante</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <CampoNombre value={contratanteNombre} onChange={setContratanteNombre} />
            <BuscadorTexto value={contratanteCargo} onChange={setContratanteCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Contratista</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <CampoNombre value={contratistaNombre} onChange={setContratistaNombre} />
            <BuscadorTexto value={contratistaCargo} onChange={setContratistaCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Interventor</div>
          <div className="grid grid-cols-2 gap-2">
            <CampoNombre value={interventorNombre} onChange={setInterventorNombre} />
            <BuscadorTexto value={interventorCargo} onChange={setInterventorCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>3. AVANCE FÍSICO Y CANTIDADES EJECUTADAS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {(desde && hasta) && (
            <button
              type="button"
              onClick={() => {
                try {
                  const lista = JSON.parse(localStorage.getItem("ryr_avance_diario_actividades") || "[]");
                  const nuevos = items.map((it) => {
                    if (!it.actividad) return it;
                    const suma = lista
                      .filter((e) => e.actividad.trim().toLowerCase() === it.actividad.trim().toLowerCase() && e.fecha >= desde && e.fecha <= hasta)
                      .reduce((acc, e) => acc + e.cantidad, 0);
                    return suma > 0 ? { ...it, cantActa: String(suma) } : it;
                  });
                  setItems(nuevos);
                  alert(`Sumado desde Informes Diarios entre ${desde} y ${hasta}.`);
                } catch (err) {
                  alert("No se pudo leer la memoria de Informes Diarios.");
                }
              }}
              className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
              style={{ background: NAVY }}
            >
              ⚡ Calcular "Cant. esta acta" desde Informes Diarios ({desde} a {hasta})
            </button>
          )}
          {items.map((it, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>Ítem #{i + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-[11px] text-red-500">Quitar</button>
                )}
              </div>
              <BuscadorTexto
                value={it.actividad}
                onChange={(v) => {
                  const copia = [...items];
                  let cantContractual = copia[i].cantContractual;
                  let cantAnterior = copia[i].cantAnterior;
                  let precioUnitario = copia[i].precioUnitario;
                  try {
                    const pres = JSON.parse(localStorage.getItem("ryr_presupuesto_cantidades") || "{}");
                    const match = Object.values(pres).find((p) => p.actividad === v);
                    if (match && match.cantidad) cantContractual = String(match.cantidad);
                  } catch (e) {}
                  try {
                    const acum = JSON.parse(localStorage.getItem("ryr_acta_acumulado") || "{}");
                    if (acum[v] !== undefined) cantAnterior = String(acum[v]);
                  } catch (e) {}
                  try {
                    const apus = JSON.parse(localStorage.getItem("ryr_apus_guardados") || "{}");
                    const apu = apus[v.trim().toLowerCase()];
                    if (apu && apu.total) precioUnitario = String(apu.total);
                  } catch (e) {}
                  copia[i] = { ...copia[i], actividad: v, unidad: LISTA_ACTIVIDADES_INFO[v]?.unidad || copia[i].unidad, cantContractual, cantAnterior, precioUnitario };
                  setItems(copia);
                }}
                catalogo={LISTA_ACTIVIDADES}
                placeholder="Actividad / partida"
              />
              {it.unidad && <div className="text-[10.5px] text-gray-500 mt-1 mb-1.5">Unidad: {it.unidad} · Cant. contractual y anterior se sugieren solas desde Presupuesto y actas anteriores (editables)</div>}
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Cant. contractual" type="text" inputMode="decimal" value={it.cantContractual} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantContractual: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Cant. anterior" type="text" inputMode="decimal" value={it.cantAnterior} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantAnterior: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Cant. esta acta" type="text" inputMode="decimal" value={it.cantActa} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantActa: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Precio unitario" type="text" inputMode="decimal" value={it.precioUnitario} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], precioUnitario: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="mt-1.5">
                {it.cantActa && it.precioUnitario && (
                  <div className="text-[11px] text-gray-500 mt-1">Valor de esta actividad: {(numES(it.cantActa) * numES(it.precioUnitario)).toLocaleString("es-CO")}</div>
                )}
              </div>
              <input placeholder="Observación" value={it.observacion} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], observacion: e.target.value }; setItems(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mt-1.5" style={{ borderColor: LINE }} />
            </div>
          ))}
          {items.length < 8 && (
            <button onClick={() => setItems([...items, itemVacio()])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar ítem
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>4. CONTROL ECONÓMICO DEL ACTA</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor contractual"><Input type="text" inputMode="decimal" value={valorContractual} onChange={(e) => setValorContractual(e.target.value)} /></Campo>
            <Campo label="Valor actas anteriores"><Input type="text" inputMode="decimal" value={valorActasAnteriores} onChange={(e) => setValorActasAnteriores(e.target.value)} /></Campo>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                const guardadas = JSON.parse(localStorage.getItem("ryr_actas_valor_presente") || "{}");
                const suma = Object.values(guardadas)
                  .filter((a) => a.actaNo !== actaNo && (!proyecto || a.proyecto === proyecto))
                  .reduce((acc, a) => acc + (numES(a.valor) || 0), 0);
                setValorActasAnteriores(String(Math.round(suma)));
                alert(`Sumado desde ${Object.values(guardadas).filter((a) => a.actaNo !== actaNo && (!proyecto || a.proyecto === proyecto)).length} acta(s) anterior(es) del mismo proyecto.`);
              } catch (err) {
                alert("No se pudo leer las actas guardadas.");
              }
            }}
            className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Sumar desde actas anteriores guardadas (mismo proyecto)
          </button>
          <Campo label="Valor presente acta">
            <div className="w-full border rounded-lg px-3 py-2.5 text-[14px] font-semibold" style={{ borderColor: LINE, background: PAPER, color: NAVY }}>
              {valorPresenteActa.toLocaleString("es-CO")}
            </div>
          </Campo>
          <div className="text-[11px] text-gray-500 mb-3">Se calcula solo (Cant. esta acta × Precio unitario, sumado de todas las actividades). <b>Nota:</b> si tus precios de APU's son de costo directo, súmale el AIU/IVA al precio unitario de cada actividad, o usa el "Valor Total" de Presupuesto (que ya incluye AIU) como referencia.</div>
          <div className="grid grid-cols-3 gap-2">
            <Campo label="Anticipo"><Input type="text" inputMode="decimal" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} /></Campo>
            <Campo label="Amortización"><Input type="text" inputMode="decimal" value={amortizacion} onChange={(e) => setAmortizacion(e.target.value)} /></Campo>
            <Campo label="Retenciones"><Input type="text" inputMode="decimal" value={retenciones} onChange={(e) => setRetenciones(e.target.value)} /></Campo>
          </div>
          <div className="mt-2 p-2 rounded-lg text-center" style={{ background: "#F0F2F5" }}>
            <div className="text-[11px] text-gray-500">Saldo contractual: {saldoContractual.toLocaleString("es-CO")} · % Ejecutado: {porcentajeEjecutado.toFixed(1)}%</div>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>5. CALIDAD, SST Y AMBIENTAL</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {[
            ["Calidad", calidadEstado, setCalidadEstado, calidadRef, setCalidadRef],
            ["SST", sstEstado, setSstEstado, sstRef, setSstRef],
            ["Ambiental", ambientalEstado, setAmbientalEstado, ambientalRef, setAmbientalRef],
          ].map(([label, estado, setEstado, ref, setRef], i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>{label}</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option>CUMPLE</option>
                  <option>NO CUMPLE</option>
                  <option>N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Referencia</label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>6. OBSERVACIONES Y COMPROMISOS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {observaciones.map((o, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <input placeholder="Descripción / hallazgo" value={o.descripcion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], descripcion: e.target.value }; setObservaciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <input placeholder="Clasificación" value={o.clasificacion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], clasificacion: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Acción / compromiso" value={o.accion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], accion: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input placeholder="Responsable" value={o.responsable} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], responsable: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input type="date" value={o.fecha} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], fecha: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[11px]" style={{ borderColor: LINE }} />
                <select value={o.estado} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], estado: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }}>
                  <option value="">Estado...</option>
                  <option>Abierto</option>
                  <option>En proceso</option>
                  <option>Cerrado</option>
                  <option>Pendiente por terceros</option>
                </select>
              </div>
            </div>
          ))}
          {observaciones.length < 6 && (
            <button onClick={() => setObservaciones([...observaciones, { descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar observación
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>9. APROBACIONES Y FIRMAS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>Elaboró / Contratista</div>
          <CampoNombre value={elabNombre} onChange={setElabNombre} />
          <div className="h-2" />
          <BuscadorTexto value={elabCargo} onChange={setElabCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Revisó / Supervisión</div>
          <CampoNombre value={revNombre} onChange={setRevNombre} />
          <div className="h-2" />
          <BuscadorTexto value={revCargo} onChange={setRevCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Aprobó / Contratante</div>
          <CampoNombre value={aprNombre} onChange={setAprNombre} />
          <div className="h-2" />
          <BuscadorTexto value={aprCargo} onChange={setAprCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
        </div>

        <button onClick={generarExcel} disabled={generando} className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]" style={{ background: generando ? "#9AA0A8" : GOLD }}>
          {generando ? "Generando..." : "Descargar Acta de Obra en Excel"}
        </button>
      </div>
    </div>
  );
}
