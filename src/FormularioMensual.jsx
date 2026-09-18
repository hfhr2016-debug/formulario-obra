import React, { useState, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
import { Camera, X } from "lucide-react";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const CAPITULOS = [{"nombre": "PRELIMINARES", "items_start": 15, "items": [{"cod": "01.01.01", "actividad": "Replanteo general de ejes y niveles", "unidad": "ml"}, {"cod": "01.01.02", "actividad": "Cerramiento provisional de obra", "unidad": "ml"}, {"cod": "01.01.03", "actividad": "Instalación de campamento y oficinas provisionales", "unidad": "m²"}, {"cod": "01.01.04", "actividad": "Adecuación de área de almacenamiento", "unidad": "m²"}, {"cod": "01.01.05", "actividad": "Señalización preventiva e informativa de obra", "unidad": "und"}, {"cod": "01.01.06", "actividad": "Instalaciones provisionales de agua y energía", "unidad": "gl"}, {"cod": "01.01.07", "actividad": "Protección de elementos existentes", "unidad": "m²"}, {"cod": "01.01.08", "actividad": "Desmonte y limpieza inicial", "unidad": "m²"}, {"cod": "01.01.09", "actividad": "Demoliciones preliminares", "unidad": "m³"}]}, {"nombre": "MOVIMIENTO DE TIERRAS", "items_start": 27, "items": [{"cod": "02.01.01", "actividad": "Excavación manual en material común", "unidad": "m³"}, {"cod": "02.01.02", "actividad": "Excavación mecánica", "unidad": "m³"}, {"cod": "02.01.03", "actividad": "Excavación en roca", "unidad": "m³"}, {"cod": "02.01.04", "actividad": "Perfilado y conformación de excavaciones", "unidad": "m²"}, {"cod": "02.02.01", "actividad": "Relleno con material seleccionado compactado", "unidad": "m³"}, {"cod": "02.02.02", "actividad": "Relleno con material proveniente de excavación", "unidad": "m³"}, {"cod": "02.02.03", "actividad": "Suministro, extendido y compactación de subbase", "unidad": "m³"}, {"cod": "02.02.04", "actividad": "Suministro, extendido y compactación de base granular", "unidad": "m³"}, {"cod": "02.03.01", "actividad": "Cargue de material sobrante", "unidad": "m³"}, {"cod": "02.03.02", "actividad": "Transporte de material sobrante", "unidad": "m³"}, {"cod": "02.03.03", "actividad": "Disposición final de sobrantes", "unidad": "m³"}]}, {"nombre": "CIMENTACIONES", "items_start": 41, "items": [{"cod": "03.01.01", "actividad": "Concreto de limpieza / solado", "unidad": "m³"}, {"cod": "03.01.02", "actividad": "Concreto para zapatas", "unidad": "m³"}, {"cod": "03.01.03", "actividad": "Concreto para vigas de cimentación", "unidad": "m³"}, {"cod": "03.01.04", "actividad": "Concreto para losas de cimentación", "unidad": "m³"}, {"cod": "03.01.05", "actividad": "Concreto para pedestales", "unidad": "m³"}, {"cod": "03.02.01", "actividad": "Acero de refuerzo en cimentación", "unidad": "kg"}, {"cod": "03.03.01", "actividad": "Formaleta para elementos de cimentación", "unidad": "m²"}]}, {"nombre": "ESTRUCTURA", "items_start": 51, "items": [{"cod": "04.01.01", "actividad": "Concreto para columnas", "unidad": "m³"}, {"cod": "04.01.02", "actividad": "Concreto para vigas", "unidad": "m³"}, {"cod": "04.01.03", "actividad": "Concreto para losas", "unidad": "m³"}, {"cod": "04.01.04", "actividad": "Concreto para escaleras", "unidad": "m³"}, {"cod": "04.01.05", "actividad": "Concreto para muros estructurales", "unidad": "m³"}, {"cod": "04.02.01", "actividad": "Acero de refuerzo de columnas", "unidad": "kg"}, {"cod": "04.02.02", "actividad": "Acero de refuerzo de vigas", "unidad": "kg"}, {"cod": "04.02.03", "actividad": "Acero de refuerzo de losas", "unidad": "kg"}, {"cod": "04.03.01", "actividad": "Formaleta de columnas", "unidad": "m²"}, {"cod": "04.03.02", "actividad": "Formaleta de vigas", "unidad": "m²"}, {"cod": "04.03.03", "actividad": "Formaleta de losas", "unidad": "m²"}, {"cod": "04.03.04", "actividad": "Formaleta de escaleras", "unidad": "m²"}, {"cod": "04.04.01", "actividad": "Suministro y montaje de perfiles metálicos", "unidad": "kg"}, {"cod": "04.04.02", "actividad": "Placas, pernos y conexiones metálicas", "unidad": "kg"}]}, {"nombre": "MAMPOSTERÍA", "items_start": 68, "items": [{"cod": "05.01.01", "actividad": "Mampostería en bloque de concreto", "unidad": "m²"}, {"cod": "05.01.02", "actividad": "Mampostería en ladrillo", "unidad": "m²"}, {"cod": "05.01.03", "actividad": "Mampostería estructural", "unidad": "m²"}, {"cod": "05.01.04", "actividad": "Muros en sistema liviano / drywall", "unidad": "m²"}, {"cod": "05.02.01", "actividad": "Dinteles sobre vanos", "unidad": "ml"}, {"cod": "05.02.02", "actividad": "Alfajías y remates", "unidad": "ml"}, {"cod": "05.02.03", "actividad": "Anclajes y refuerzos de mampostería", "unidad": "und"}]}, {"nombre": "CUBIERTAS", "items_start": 78, "items": [{"cod": "06.01.01", "actividad": "Estructura metálica o de madera para cubierta", "unidad": "kg"}, {"cod": "06.01.02", "actividad": "Cerchas y elementos estructurales", "unidad": "kg"}, {"cod": "06.02.01", "actividad": "Suministro e instalación de teja", "unidad": "m²"}, {"cod": "06.02.02", "actividad": "Impermeabilización de cubierta", "unidad": "m²"}, {"cod": "06.02.03", "actividad": "Aislamiento térmico/acústico", "unidad": "m²"}, {"cod": "06.03.01", "actividad": "Canales de aguas lluvias", "unidad": "ml"}, {"cod": "06.03.02", "actividad": "Bajantes de aguas lluvias", "unidad": "ml"}]}, {"nombre": "IMPERMEABILIZACIONES", "items_start": 88, "items": [{"cod": "07.01.01", "actividad": "Impermeabilización de losas y terrazas", "unidad": "m²"}, {"cod": "07.01.02", "actividad": "Impermeabilización de muros", "unidad": "m²"}, {"cod": "07.01.03", "actividad": "Impermeabilización de zonas húmedas", "unidad": "m²"}]}, {"nombre": "PAÑETES Y REVOQUES", "items_start": 94, "items": [{"cod": "08.01.01", "actividad": "Pañete / revoque interior", "unidad": "m²"}, {"cod": "08.01.02", "actividad": "Pañete / revoque exterior", "unidad": "m²"}, {"cod": "08.01.03", "actividad": "Pañete impermeabilizado", "unidad": "m²"}, {"cod": "08.01.04", "actividad": "Estuco plástico o tradicional", "unidad": "m²"}]}, {"nombre": "PISOS Y ENCHAPES", "items_start": 101, "items": [{"cod": "09.01.01", "actividad": "Mortero de nivelación", "unidad": "m²"}, {"cod": "09.01.02", "actividad": "Piso cerámico", "unidad": "m²"}, {"cod": "09.01.03", "actividad": "Piso en porcelanato", "unidad": "m²"}, {"cod": "09.01.04", "actividad": "Piso vinílico", "unidad": "m²"}, {"cod": "09.01.05", "actividad": "Piso laminado", "unidad": "m²"}, {"cod": "09.02.01", "actividad": "Enchape cerámico en muros", "unidad": "m²"}, {"cod": "09.02.02", "actividad": "Guardaescoba", "unidad": "ml"}, {"cod": "09.02.03", "actividad": "Juntas de dilatación / construcción", "unidad": "ml"}]}, {"nombre": "PINTURA", "items_start": 112, "items": [{"cod": "10.01.01", "actividad": "Pintura vinílica interior", "unidad": "m²"}, {"cod": "10.01.02", "actividad": "Pintura exterior", "unidad": "m²"}, {"cod": "10.01.03", "actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "m²"}, {"cod": "10.01.04", "actividad": "Pintura anticorrosiva", "unidad": "m²"}, {"cod": "10.01.05", "actividad": "Sellador / imprimante", "unidad": "m²"}]}, {"nombre": "CARPINTERÍA", "items_start": 120, "items": [{"cod": "11.01.01", "actividad": "Puertas de madera", "unidad": "und"}, {"cod": "11.01.02", "actividad": "Muebles fijos de madera", "unidad": "ml"}, {"cod": "11.02.01", "actividad": "Puertas metálicas", "unidad": "und"}, {"cod": "11.02.02", "actividad": "Barandas metálicas", "unidad": "ml"}, {"cod": "11.02.03", "actividad": "Pasamanos", "unidad": "ml"}, {"cod": "11.03.01", "actividad": "Ventanas de aluminio", "unidad": "m²"}, {"cod": "11.03.02", "actividad": "Divisiones de aluminio", "unidad": "m²"}]}, {"nombre": "VIDRIOS", "items_start": 130, "items": [{"cod": "12.01.01", "actividad": "Vidrio templado", "unidad": "m²"}, {"cod": "12.01.02", "actividad": "Vidrio laminado", "unidad": "m²"}, {"cod": "12.01.03", "actividad": "Espejos", "unidad": "m²"}, {"cod": "12.01.04", "actividad": "Sellos y silicona", "unidad": "ml"}]}, {"nombre": "INSTALACIONES HIDROSANITARIAS", "items_start": 137, "items": [{"cod": "13.01.01", "actividad": "Tubería de agua fría", "unidad": "ml"}, {"cod": "13.01.02", "actividad": "Tubería de agua caliente", "unidad": "ml"}, {"cod": "13.01.03", "actividad": "Válvulas y accesorios", "unidad": "und"}, {"cod": "13.02.01", "actividad": "Tubería sanitaria", "unidad": "ml"}, {"cod": "13.02.02", "actividad": "Tubería de aguas lluvias", "unidad": "ml"}, {"cod": "13.02.03", "actividad": "Cajas de inspección", "unidad": "und"}, {"cod": "13.03.01", "actividad": "Aparatos sanitarios", "unidad": "und"}, {"cod": "13.03.02", "actividad": "Lavamanos", "unidad": "und"}, {"cod": "13.03.03", "actividad": "Griferías", "unidad": "und"}, {"cod": "13.03.04", "actividad": "Duchas", "unidad": "und"}, {"cod": "13.04.01", "actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "gl"}]}, {"nombre": "INSTALACIONES ELÉCTRICAS", "items_start": 151, "items": [{"cod": "14.01.01", "actividad": "Tubería/conduit eléctrica", "unidad": "ml"}, {"cod": "14.01.02", "actividad": "Bandejas portacables", "unidad": "ml"}, {"cod": "14.01.03", "actividad": "Cajas eléctricas", "unidad": "und"}, {"cod": "14.02.01", "actividad": "Cableado de fuerza", "unidad": "ml"}, {"cod": "14.02.02", "actividad": "Cableado de iluminación", "unidad": "ml"}, {"cod": "14.02.03", "actividad": "Tableros eléctricos", "unidad": "und"}, {"cod": "14.03.01", "actividad": "Tomacorrientes", "unidad": "und"}, {"cod": "14.03.02", "actividad": "Interruptores", "unidad": "und"}, {"cod": "14.03.03", "actividad": "Luminarias", "unidad": "und"}, {"cod": "14.04.01", "actividad": "Sistema de puesta a tierra", "unidad": "gl"}, {"cod": "14.05.01", "actividad": "Pruebas y certificaciones", "unidad": "gl"}]}, {"nombre": "COMUNICACIONES Y SEGURIDAD", "items_start": 165, "items": [{"cod": "15.01.01", "actividad": "Cableado estructurado de datos", "unidad": "ml"}, {"cod": "15.01.02", "actividad": "Rack de comunicaciones", "unidad": "und"}, {"cod": "15.02.01", "actividad": "Cámaras y sistema CCTV", "unidad": "und"}, {"cod": "15.02.02", "actividad": "Control de acceso", "unidad": "und"}, {"cod": "15.02.03", "actividad": "Sistema de citofonía", "unidad": "und"}, {"cod": "15.03.01", "actividad": "Sistema de detección de incendios", "unidad": "gl"}]}, {"nombre": "CLIMATIZACIÓN Y VENTILACIÓN", "items_start": 174, "items": [{"cod": "16.01.01", "actividad": "Equipos de aire acondicionado", "unidad": "und"}, {"cod": "16.01.02", "actividad": "Ductos de ventilación", "unidad": "m²"}, {"cod": "16.01.03", "actividad": "Tubería de refrigerante", "unidad": "ml"}, {"cod": "16.01.04", "actividad": "Rejillas y difusores", "unidad": "und"}]}, {"nombre": "GAS", "items_start": 181, "items": [{"cod": "17.01.01", "actividad": "Red interna de gas", "unidad": "ml"}, {"cod": "17.01.02", "actividad": "Válvulas y accesorios", "unidad": "und"}, {"cod": "17.01.03", "actividad": "Pruebas y certificación", "unidad": "gl"}]}, {"nombre": "URBANISMO Y EXTERIORES", "items_start": 187, "items": [{"cod": "18.01.01", "actividad": "Construcción de andenes", "unidad": "m²"}, {"cod": "18.01.02", "actividad": "Placas de concreto exteriores", "unidad": "m³"}, {"cod": "18.01.03", "actividad": "Pavimento en adoquín", "unidad": "m²"}, {"cod": "18.02.01", "actividad": "Sardineles y bordillos", "unidad": "ml"}, {"cod": "18.03.01", "actividad": "Sumideros exteriores", "unidad": "und"}, {"cod": "18.04.01", "actividad": "Suministro y extendido de tierra vegetal", "unidad": "m³"}, {"cod": "18.04.02", "actividad": "Siembra y jardinería", "unidad": "m²"}]}, {"nombre": "OBRAS COMPLEMENTARIAS", "items_start": 197, "items": [{"cod": "19.01.01", "actividad": "Rejas metálicas", "unidad": "m²"}, {"cod": "19.01.02", "actividad": "Escaleras metálicas", "unidad": "kg"}, {"cod": "19.01.03", "actividad": "Elementos metálicos especiales", "unidad": "kg"}, {"cod": "19.02.01", "actividad": "Mobiliario fijo de obra", "unidad": "und"}]}, {"nombre": "ASEO, ENTREGA Y CIERRE", "items_start": 204, "items": [{"cod": "20.01.01", "actividad": "Limpieza gruesa y fina de obra", "unidad": "m²"}, {"cod": "20.01.02", "actividad": "Limpieza final para entrega", "unidad": "m²"}, {"cod": "20.02.01", "actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "gl"}, {"cod": "20.02.01", "actividad": "Actualización de planos récord / as-built", "unidad": "gl"}, {"cod": "20.02.02", "actividad": "Entrega, manuales y acta de recibo", "unidad": "gl"}]}, {"nombre": "ASCENSORES", "items_start": 212, "items": [{"cod": "21.01.01", "actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "und"}]}, {"nombre": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "items_start": 216, "items": [{"cod": "22.01.01", "actividad": "Estudio de suelos y geotecnia", "unidad": "gl"}, {"cod": "22.01.02", "actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "gl"}, {"cod": "22.02.01", "actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "gl"}, {"cod": "22.02.02", "actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "gl"}]}];
const MAPA_ACTIVIDADES = {"Localización y Replanteo": {"fila": 9, "unidad": "ml", "capitulo": "PRELIMINARES"}, "Cerramiento provisional de obra": {"fila": 10, "unidad": "ml", "capitulo": "PRELIMINARES"}, "Instalación de campamento y oficinas provisionales": {"fila": 11, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Adecuación de área de almacenamiento": {"fila": 12, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Señalización preventiva e informativa de obra": {"fila": 13, "unidad": "und", "capitulo": "PRELIMINARES"}, "Instalaciones provisionales de agua y energía": {"fila": 14, "unidad": "gl", "capitulo": "PRELIMINARES"}, "Protección de elementos existentes": {"fila": 15, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Desmonte y limpieza inicial": {"fila": 16, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Demoliciones preliminares": {"fila": 17, "unidad": "m³", "capitulo": "PRELIMINARES"}, "Excavación manual en material común": {"fila": 18, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación mecánica": {"fila": 19, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca": {"fila": 20, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Perfilado y conformación de excavaciones": {"fila": 21, "unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material seleccionado compactado": {"fila": 22, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material proveniente de excavación": {"fila": 23, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de subbase": {"fila": 24, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de base granular": {"fila": 25, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Cargue de material sobrante": {"fila": 26, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Transporte de material sobrante": {"fila": 27, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Disposición final de sobrantes": {"fila": 28, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Concreto de limpieza / solado": {"fila": 29, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para zapatas": {"fila": 30, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para vigas de cimentación": {"fila": 31, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para losas de cimentación": {"fila": 32, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para pedestales": {"fila": 33, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Acero de refuerzo en cimentación": {"fila": 34, "unidad": "kg", "capitulo": "CIMENTACIONES"}, "Formaleta para elementos de cimentación": {"fila": 35, "unidad": "m²", "capitulo": "CIMENTACIONES"}, "Concreto para columnas": {"fila": 36, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para vigas": {"fila": 37, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para losas": {"fila": 38, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para escaleras": {"fila": 39, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para muros estructurales": {"fila": 40, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de columnas": {"fila": 41, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de vigas": {"fila": 42, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de losas": {"fila": 43, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Formaleta de columnas": {"fila": 44, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de vigas": {"fila": 45, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de losas": {"fila": 46, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de escaleras": {"fila": 47, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Suministro y montaje de perfiles metálicos": {"fila": 48, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Placas, pernos y conexiones metálicas": {"fila": 49, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Mampostería en bloque de concreto": {"fila": 50, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería en ladrillo": {"fila": 51, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería estructural": {"fila": 52, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Muros en sistema liviano / drywall": {"fila": 53, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Dinteles sobre vanos": {"fila": 54, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Alfajías y remates": {"fila": 55, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Anclajes y refuerzos de mampostería": {"fila": 56, "unidad": "und", "capitulo": "MAMPOSTERÍA"}, "Estructura metálica o de madera para cubierta": {"fila": 57, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Cerchas y elementos estructurales": {"fila": 58, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Suministro e instalación de teja": {"fila": 59, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Impermeabilización de cubierta": {"fila": 60, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Aislamiento térmico/acústico": {"fila": 61, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Canales de aguas lluvias": {"fila": 62, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Bajantes de aguas lluvias": {"fila": 63, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Impermeabilización de losas y terrazas": {"fila": 64, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de muros": {"fila": 65, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de zonas húmedas": {"fila": 66, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Pañete / revoque interior": {"fila": 67, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete / revoque exterior": {"fila": 68, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete impermeabilizado": {"fila": 69, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Estuco plástico o tradicional": {"fila": 70, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Mortero de nivelación": {"fila": 71, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso cerámico": {"fila": 72, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso en porcelanato": {"fila": 73, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso vinílico": {"fila": 74, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso laminado": {"fila": 75, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Enchape cerámico en muros": {"fila": 76, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Guardaescoba": {"fila": 77, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Juntas de dilatación / construcción": {"fila": 78, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Pintura vinílica interior": {"fila": 79, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura exterior": {"fila": 80, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura esmalte en superficies metálicas/madera": {"fila": 81, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura anticorrosiva": {"fila": 82, "unidad": "m²", "capitulo": "PINTURA"}, "Sellador / imprimante": {"fila": 83, "unidad": "m²", "capitulo": "PINTURA"}, "Puertas de madera": {"fila": 84, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Muebles fijos de madera": {"fila": 85, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Puertas metálicas": {"fila": 86, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Barandas metálicas": {"fila": 87, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Pasamanos": {"fila": 88, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Ventanas de aluminio": {"fila": 89, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Divisiones de aluminio": {"fila": 90, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Vidrio templado": {"fila": 91, "unidad": "m²", "capitulo": "VIDRIOS"}, "Vidrio laminado": {"fila": 92, "unidad": "m²", "capitulo": "VIDRIOS"}, "Espejos": {"fila": 93, "unidad": "m²", "capitulo": "VIDRIOS"}, "Sellos y silicona": {"fila": 94, "unidad": "ml", "capitulo": "VIDRIOS"}, "Tubería de agua fría": {"fila": 95, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de agua caliente": {"fila": 96, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Válvulas y accesorios": {"fila": 128, "unidad": "und", "capitulo": "GAS"}, "Tubería sanitaria": {"fila": 98, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de aguas lluvias": {"fila": 99, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Cajas de inspección": {"fila": 100, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Aparatos sanitarios": {"fila": 101, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Lavamanos": {"fila": 102, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Griferías": {"fila": 103, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Duchas": {"fila": 104, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Pruebas hidráulicas y de estanqueidad": {"fila": 105, "unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería/conduit eléctrica": {"fila": 106, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Bandejas portacables": {"fila": 107, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cajas eléctricas": {"fila": 108, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de fuerza": {"fila": 109, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de iluminación": {"fila": 110, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tableros eléctricos": {"fila": 111, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tomacorrientes": {"fila": 112, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Interruptores": {"fila": 113, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Luminarias": {"fila": 114, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Sistema de puesta a tierra": {"fila": 115, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Pruebas y certificaciones": {"fila": 116, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado estructurado de datos": {"fila": 117, "unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Rack de comunicaciones": {"fila": 118, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Cámaras y sistema CCTV": {"fila": 119, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Control de acceso": {"fila": 120, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de citofonía": {"fila": 121, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de detección de incendios": {"fila": 122, "unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Equipos de aire acondicionado": {"fila": 123, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Ductos de ventilación": {"fila": 124, "unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Tubería de refrigerante": {"fila": 125, "unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Rejillas y difusores": {"fila": 126, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Red interna de gas": {"fila": 127, "unidad": "ml", "capitulo": "GAS"}, "Pruebas y certificación": {"fila": 129, "unidad": "gl", "capitulo": "GAS"}, "Construcción de andenes": {"fila": 130, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Placas de concreto exteriores": {"fila": 131, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Pavimento en adoquín": {"fila": 132, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Sardineles y bordillos": {"fila": 133, "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, "Sumideros exteriores": {"fila": 134, "unidad": "und", "capitulo": "URBANISMO Y EXTERIORES"}, "Suministro y extendido de tierra vegetal": {"fila": 135, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Siembra y jardinería": {"fila": 136, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Rejas metálicas": {"fila": 137, "unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Escaleras metálicas": {"fila": 138, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Elementos metálicos especiales": {"fila": 139, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Mobiliario fijo de obra": {"fila": 140, "unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Limpieza gruesa y fina de obra": {"fila": 141, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Limpieza final para entrega": {"fila": 142, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Pruebas, puesta en marcha y ajustes": {"fila": 143, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Actualización de planos récord / as-built": {"fila": 144, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Entrega, manuales y acta de recibo": {"fila": 145, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}};
const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal"];
const CATALOGO_MESES = ["Enero 2025", "Febrero 2025", "Marzo 2025", "Abril 2025", "Mayo 2025", "Junio 2025", "Julio 2025", "Agosto 2025", "Septiembre 2025", "Octubre 2025", "Noviembre 2025", "Diciembre 2025", "Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026", "Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026", "Enero 2027", "Febrero 2027", "Marzo 2027", "Abril 2027", "Mayo 2027", "Junio 2027", "Julio 2027", "Agosto 2027", "Septiembre 2027", "Octubre 2027", "Noviembre 2027", "Diciembre 2027"]
;

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
function formatoMoneda(n) {
  return "$ " + Math.round(n || 0).toLocaleString("es-CO");
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
          <img src={foto.previewUrl} alt={`Foto ${numero}`} className="w-full h-28 object-cover rounded-md" />
          <button onClick={onRemove} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5"
          style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={20} />
          <span className="text-[11px] font-medium">Foto {numero}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} />
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
function BuscadorTexto({ value, onChange, catalogo, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    const filtrados = catalogo.filter((it) => it.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aE = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bE = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return [...new Set(filtrados)].slice(0, 8);
  }, [value, catalogo]);
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

function CapituloAvance({ capitulo, prog, real, setProgReal }) {
  const dif = (Number(real) || 0) - (Number(prog) || 0);
  return (
    <div className="border rounded-lg p-2 mb-1.5" style={{ borderColor: LINE }}>
      <div className="text-[12px] font-medium mb-1.5" style={{ color: NAVY }}>{capitulo.nombre}</div>
      <div className="grid grid-cols-3 gap-1.5 items-center">
        <input placeholder="Prog. %" type="number" value={prog} onChange={(e) => setProgReal(e.target.value, real)} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <input placeholder="Real %" type="number" value={real} onChange={(e) => setProgReal(prog, e.target.value)} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
        <div className="text-[11px] text-center font-semibold" style={{ color: dif < 0 ? "#C0392B" : NAVY }}>
          Dif: {(dif * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export default function FormularioMensual({ onVolver }) {
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [proyecto, setProyecto] = useState("");
  const [noContrato, setNoContrato] = useState("");
  const [mes, setMes] = useState("");
  const [elaboradoPor, setElaboradoPor] = useState("");

  const [pisos, setPisos] = useState(""); const [sotanos, setSotanos] = useState("");
  const [areaLote, setAreaLote] = useState(""); const [areaTipicaPiso, setAreaTipicaPiso] = useState("");
  const [areaSotanos, setAreaSotanos] = useState(""); const [areaCubierta, setAreaCubierta] = useState("");
  const [numApartamentos, setNumApartamentos] = useState(""); const [areaPromedioApto, setAreaPromedioApto] = useState("");
  const [numParqueaderos, setNumParqueaderos] = useState(""); const [numAscensores, setNumAscensores] = useState("");
  const [alturaTotal, setAlturaTotal] = useState("");
  const [administracion, setAdministracion] = useState(10); const [imprevistos, setImprevistos] = useState(4);
  const [utilidad, setUtilidad] = useState(12); const [ivaUtilidad, setIvaUtilidad] = useState(19);

  const [valoresPresupuesto, setValoresPresupuesto] = useState({});
  const [avances, setAvances] = useState({});

  const [actividades, setActividades] = useState([{ ubicacion: "", descripcion: "", avance: "", responsable: "", observaciones: "" }]);
  const [ingresos, setIngresos] = useState([{ concepto: "", fecha: "", valor: "" }]);
  const [egresos, setEgresos] = useState([{ concepto: "", fecha: "", valor: "" }]);

  const [horasHombre, setHorasHombre] = useState("");
  const [observacionesHSE, setObservacionesHSE] = useState("");

  const [fotos, setFotos] = useState(Array.from({ length: 6 }, () => ({ file: null, previewUrl: null })));
  function actualizarFoto(idx, nuevaFoto) { setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f))); }
  function quitarFoto(idx) { setFotos((fs) => fs.map((f, i) => (i === idx ? { file: null, previewUrl: null } : f))); }

  const [elabFirma, setElabFirma] = useState(""); const [elabNombre, setElabNombre] = useState(""); const [elabCargo, setElabCargo] = useState("");
  const [revFirma, setRevFirma] = useState(""); const [revNombre, setRevNombre] = useState(""); const [revCargo, setRevCargo] = useState("");
  const [aprFirma, setAprFirma] = useState(""); const [aprNombre, setAprNombre] = useState(""); const [aprCargo, setAprCargo] = useState("");

  const [generando, setGenerando] = useState(false);

  const totalIngresos = ingresos.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const totalEgresos = egresos.reduce((acc, e) => acc + (Number(e.valor) || 0), 0);

  function cargarActaComoIngreso() {
    try {
      const guardadas = JSON.parse(localStorage.getItem("ryr_actas_valor_presente") || "{}");
      const lista = Object.values(guardadas);
      if (lista.length === 0) {
        alert("Todavía no hay Actas de Obra guardadas en este dispositivo.");
        return;
      }
      const nuevos = lista.map((a) => ({
        concepto: `Acta de Obra ${a.actaNo || ""} - ${a.proyecto || ""}`.trim(),
        fecha: a.fecha || "",
        valor: String(a.valor),
      }));
      setIngresos(nuevos);
      alert(`${nuevos.length} acta(s) cargada(s) como ingreso.`);
    } catch (err) {
      alert("No se pudo leer la memoria de Actas de Obra.");
    }
  }

  function cargarHorasDesdeDiario() {
    try {
      const guardadas = JSON.parse(localStorage.getItem("ryr_horas_hombre_diario") || "{}");
      const total = Object.values(guardadas).reduce((acc, h) => acc + (Number(h) || 0), 0);
      if (total === 0) {
        alert("Todavía no hay horas guardadas desde el Informe Diario en este dispositivo.");
        return;
      }
      setHorasHombre(String(total));
      alert(`Horas cargadas desde ${Object.keys(guardadas).length} día(s) de Informe Diario guardados.`);
    } catch (err) {
      alert("No se pudo leer la memoria del Informe Diario.");
    }
  }

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsFicha = workbook.getWorksheet("Ficha Técnica del Proyecto");
      const wsPres = workbook.getWorksheet("Presupuesto ");
      const wsMen = workbook.getWorksheet("Informe Mensual");

      if (wsFicha) {
        setProyecto(wsFicha.getCell("B2").value || "");
        setPisos(wsFicha.getCell("B9").value || ""); setSotanos(wsFicha.getCell("B10").value || "");
        setAreaLote(wsFicha.getCell("B11").value || ""); setAreaTipicaPiso(wsFicha.getCell("B12").value || "");
        setAreaSotanos(wsFicha.getCell("B14").value || ""); setAreaCubierta(wsFicha.getCell("B15").value || "");
        setNumApartamentos(wsFicha.getCell("B17").value || ""); setAreaPromedioApto(wsFicha.getCell("B18").value || "");
        setNumParqueaderos(wsFicha.getCell("B19").value || ""); setNumAscensores(wsFicha.getCell("B20").value || "");
        setAlturaTotal(wsFicha.getCell("B21").value || "");
        const a = wsFicha.getCell("B24").value; if (typeof a === "number") setAdministracion(a * 100);
        const im = wsFicha.getCell("B25").value; if (typeof im === "number") setImprevistos(im * 100);
        const u = wsFicha.getCell("B26").value; if (typeof u === "number") setUtilidad(u * 100);
        const iv = wsFicha.getCell("B27").value; if (typeof iv === "number") setIvaUtilidad(iv * 100);
      }
      if (wsPres) {
        const nuevosValores = {};
        CAPITULOS.forEach((cap, ci) => {
          cap.items.forEach((it, ii) => {
            const fila = cap.items_start + ii;
            const cant = wsPres.getCell(`D${fila}`).value;
            const precio = wsPres.getCell(`E${fila}`).value;
            if (cant || precio) nuevosValores[`${ci}-${ii}`] = { cant: cant || "", precio: precio || "" };
          });
        });
        setValoresPresupuesto(nuevosValores);
      }
      if (wsMen) {
        setNoContrato(wsMen.getCell("E14").value || "");
        setMes(wsMen.getCell("L15").value || "");
        setElaboradoPor(wsMen.getCell("E16").value || "");
        const nuevosAvances = {};
        CAPITULOS.forEach((_, ci) => {
          const fila = 25 + ci;
          const prog = wsMen.getCell(`E${fila}`).value;
          const real = wsMen.getCell(`F${fila}`).value;
          if (prog || real) {
            nuevosAvances[ci] = {
              prog: typeof prog === "number" ? String(prog * 100) : "",
              real: typeof real === "number" ? String(real * 100) : "",
            };
          }
        });
        setAvances(nuevosAvances);
      }
      setArchivoBase(file);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer el archivo. Verifica que sea un Informe Mensual generado por este sistema.");
    } finally {
      setCargando(false);
    }
  }

  async function generarExcel() {
    setGenerando(true);
    try {
      let buffer;
      if (archivoBase) buffer = await archivoBase.arrayBuffer();
      else { const resp = await fetch("/plantilla-mensual.xlsx"); buffer = await resp.arrayBuffer(); }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsFicha = workbook.getWorksheet("Ficha Técnica del Proyecto");
      const wsPres = workbook.getWorksheet("Presupuesto ");
      const wsMen = workbook.getWorksheet("Informe Mensual");

      wsFicha.getCell("B2").value = proyecto;
      wsFicha.getCell("B9").value = Number(pisos) || 0; wsFicha.getCell("B10").value = Number(sotanos) || 0;
      wsFicha.getCell("B11").value = Number(areaLote) || 0; wsFicha.getCell("B12").value = Number(areaTipicaPiso) || 0;
      wsFicha.getCell("B14").value = Number(areaSotanos) || 0; wsFicha.getCell("B15").value = Number(areaCubierta) || 0;
      wsFicha.getCell("B17").value = Number(numApartamentos) || 0; wsFicha.getCell("B18").value = Number(areaPromedioApto) || 0;
      wsFicha.getCell("B19").value = Number(numParqueaderos) || 0; wsFicha.getCell("B20").value = Number(numAscensores) || 0;
      wsFicha.getCell("B21").value = Number(alturaTotal) || 0;
      wsFicha.getCell("B24").value = Number(administracion) / 100; wsFicha.getCell("B25").value = Number(imprevistos) / 100;
      wsFicha.getCell("B26").value = Number(utilidad) / 100; wsFicha.getCell("B27").value = Number(ivaUtilidad) / 100;

      CAPITULOS.forEach((cap, ci) => {
        cap.items.forEach((it, ii) => {
          const fila = cap.items_start + ii;
          const v = valoresPresupuesto[`${ci}-${ii}`];
          if (v && (v.cant || v.precio)) {
            wsPres.getCell(`D${fila}`).value = Number(v.cant) || 0;
            wsPres.getCell(`E${fila}`).value = Number(v.precio) || 0;
          }
        });
      });

      wsMen.getCell("E13").value = proyecto;
      wsMen.getCell("E14").value = noContrato;
      wsMen.getCell("L15").value = mes;
      wsMen.getCell("L16").value = aFechaDDMMYYYY(fechaLocalHoy());
      wsMen.getCell("E16").value = elaboradoPor;

      CAPITULOS.forEach((_, ci) => {
        const fila = 25 + ci;
        const av = avances[ci];
        if (av) {
          wsMen.getCell(`E${fila}`).value = Number(av.prog) / 100 || 0;
          wsMen.getCell(`F${fila}`).value = Number(av.real) / 100 || 0;
        }
      });

      actividades.forEach((act, i) => {
        if (!act.descripcion) return;
        const r = 50 + i;
        if (r > 58) return;
        wsMen.getCell(`A${r}`).value = act.ubicacion;
        wsMen.getCell(`C${r}`).value = act.descripcion;
        wsMen.getCell(`G${r}`).value = act.avance;
        wsMen.getCell(`I${r}`).value = act.responsable;
        wsMen.getCell(`K${r}`).value = act.observaciones;
      });

      ingresos.forEach((ing, i) => {
        if (!ing.concepto) return;
        const r = 62 + i;
        if (r > 66) return;
        wsMen.getCell(`A${r}`).value = ing.concepto;
        wsMen.getCell(`D${r}`).value = ing.fecha ? aFechaDDMMYYYY(ing.fecha) : "";
        wsMen.getCell(`E${r}`).value = Number(ing.valor) || 0;
      });
      egresos.forEach((eg, i) => {
        if (!eg.concepto) return;
        const r = 62 + i;
        if (r > 66) return;
        wsMen.getCell(`H${r}`).value = eg.concepto;
        wsMen.getCell(`K${r}`).value = eg.fecha ? aFechaDDMMYYYY(eg.fecha) : "";
        wsMen.getCell(`M${r}`).value = Number(eg.valor) || 0;
      });

      wsMen.getCell("A70").value = Number(horasHombre) || 0;
      wsMen.getCell("A72").value = observacionesHSE;

      const posicionesFotos = [
        { tl: { col: 0, row: 72 }, br: { col: 7, row: 88 } },
        { tl: { col: 7, row: 72 }, br: { col: 14, row: 88 } },
        { tl: { col: 0, row: 88 }, br: { col: 7, row: 104 } },
        { tl: { col: 7, row: 88 }, br: { col: 14, row: 104 } },
        { tl: { col: 0, row: 104 }, br: { col: 7, row: 120 } },
        { tl: { col: 7, row: 104 }, br: { col: 14, row: 120 } },
      ];
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (!foto.file) continue;
        const bufferFoto = await comprimirFoto(foto.file);
        const imageId = workbook.addImage({ buffer: bufferFoto, extension: "jpeg" });
        wsMen.addImage(imageId, posicionesFotos[i]);
      }

      wsMen.getCell("B124").value = elabFirma; wsMen.getCell("B126").value = elabNombre; wsMen.getCell("B128").value = elabCargo;
      wsMen.getCell("F124").value = revFirma; wsMen.getCell("F126").value = revNombre; wsMen.getCell("F128").value = revCargo;
      wsMen.getCell("K124").value = aprFirma; wsMen.getCell("K126").value = aprNombre; wsMen.getCell("K128").value = aprCargo;

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const nombreArchivo = `Informe_Mensual_${(proyecto || "proyecto").slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
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
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px] mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              Menú SAIEA OBRAS
            </button>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>INFORME MENSUAL</div>
            <div className="text-[11px]" style={{ color: GOLD }}>Incluye Ficha Técnica y Presupuesto conectados</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Informe nuevo
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>

        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el Informe Mensual que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Proyecto"><Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} /></Campo>
          <Campo label="No. de Contrato"><Input value={noContrato} onChange={(e) => setNoContrato(e.target.value)} /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Mes"><BuscadorTexto value={mes} onChange={setMes} catalogo={CATALOGO_MESES} placeholder="Ej: Septiembre 2026" /></Campo>
          <Campo label="Elaborado por"><Input value={elaboradoPor} onChange={(e) => setElaboradoPor(e.target.value)} /></Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2" style={{ background: NAVY }}>DATOS GENERALES (FICHA TÉCNICA)</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de pisos"><Input type="number" value={pisos} onChange={(e) => setPisos(e.target.value)} /></Campo>
            <Campo label="Número de sótanos"><Input type="number" value={sotanos} onChange={(e) => setSotanos(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área del lote"><Input type="number" value={areaLote} onChange={(e) => setAreaLote(e.target.value)} /></Campo>
            <Campo label="Área típica por piso"><Input type="number" value={areaTipicaPiso} onChange={(e) => setAreaTipicaPiso(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área sótanos"><Input type="number" value={areaSotanos} onChange={(e) => setAreaSotanos(e.target.value)} /></Campo>
            <Campo label="Área cubierta"><Input type="number" value={areaCubierta} onChange={(e) => setAreaCubierta(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="No. apartamentos"><Input type="number" value={numApartamentos} onChange={(e) => setNumApartamentos(e.target.value)} /></Campo>
            <Campo label="Área prom. apto."><Input type="number" value={areaPromedioApto} onChange={(e) => setAreaPromedioApto(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="No. parqueaderos"><Input type="number" value={numParqueaderos} onChange={(e) => setNumParqueaderos(e.target.value)} /></Campo>
            <Campo label="No. ascensores"><Input type="number" value={numAscensores} onChange={(e) => setNumAscensores(e.target.value)} /></Campo>
          </div>
          <Campo label="Altura total"><Input type="number" value={alturaTotal} onChange={(e) => setAlturaTotal(e.target.value)} /></Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>AIU</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Administración %"><Input type="number" value={administracion} onChange={(e) => setAdministracion(e.target.value)} /></Campo>
            <Campo label="Imprevistos %"><Input type="number" value={imprevistos} onChange={(e) => setImprevistos(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Utilidad %"><Input type="number" value={utilidad} onChange={(e) => setUtilidad(e.target.value)} /></Campo>
            <Campo label="IVA sobre Utilidad %"><Input type="number" value={ivaUtilidad} onChange={(e) => setIvaUtilidad(e.target.value)} /></Campo>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>AVANCE POR CAPÍTULO (% Programado y % Real)</div>
        <div className="p-2 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          {CAPITULOS.map((cap, ci) => (
            <CapituloAvance
              key={ci} capitulo={cap}
              prog={avances[ci]?.prog || ""} real={avances[ci]?.real || ""}
              setProgReal={(prog, real) => setAvances({ ...avances, [ci]: { prog, real } })}
            />
          ))}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>ACTIVIDADES MÁS RELEVANTES DEL PERÍODO</div>
        <div className="p-3 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          {actividades.map((act, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <BuscadorTexto
                value={act.descripcion}
                onChange={(v) => { const c = [...actividades]; c[i] = { ...c[i], descripcion: v }; setActividades(c); }}
                catalogo={Object.keys(MAPA_ACTIVIDADES)}
                placeholder="Descripción de la actividad"
              />
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Ubicación" value={act.ubicacion} onChange={(e) => { const c = [...actividades]; c[i] = { ...c[i], ubicacion: e.target.value }; setActividades(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Responsable" value={act.responsable} onChange={(e) => { const c = [...actividades]; c[i] = { ...c[i], responsable: e.target.value }; setActividades(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Avance del período" value={act.avance} onChange={(e) => { const c = [...actividades]; c[i] = { ...c[i], avance: e.target.value }; setActividades(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Observaciones" value={act.observaciones} onChange={(e) => { const c = [...actividades]; c[i] = { ...c[i], observaciones: e.target.value }; setActividades(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
            </div>
          ))}
          {actividades.length < 9 && (
            <button type="button" onClick={() => setActividades([...actividades, { ubicacion: "", descripcion: "", avance: "", responsable: "", observaciones: "" }])}
              className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar actividad
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>AVANCE FINANCIERO Y ADMINISTRATIVO</div>
        <div className="p-3 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          <button
            type="button"
            onClick={cargarActaComoIngreso}
            className="w-full text-center py-2.5 rounded-lg text-[12.5px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Cargar Ingresos desde las Actas de Obra guardadas
          </button>
          <div className="text-[12px] font-bold mb-2" style={{ color: NAVY }}>Ingresos del período</div>
          {ingresos.map((ing, i) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <input placeholder="Concepto" value={ing.concepto} onChange={(e) => { const c = [...ingresos]; c[i] = { ...c[i], concepto: e.target.value }; setIngresos(c); }} className="flex-[2] border rounded px-2 py-1.5 text-[12px] min-w-0" style={{ borderColor: LINE }} />
              <input type="date" value={ing.fecha} onChange={(e) => { const c = [...ingresos]; c[i] = { ...c[i], fecha: e.target.value }; setIngresos(c); }} className="flex-1 border rounded px-2 py-1.5 text-[11px] min-w-0" style={{ borderColor: LINE }} />
              <input placeholder="Valor" type="number" value={ing.valor} onChange={(e) => { const c = [...ingresos]; c[i] = { ...c[i], valor: e.target.value }; setIngresos(c); }} className="flex-1 border rounded px-2 py-1.5 text-[12px] min-w-0" style={{ borderColor: LINE }} />
            </div>
          ))}
          {ingresos.length < 5 && (
            <button type="button" onClick={() => setIngresos([...ingresos, { concepto: "", fecha: "", valor: "" }])} className="w-full py-1.5 rounded-lg text-[11.5px] font-semibold border mb-3" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar ingreso
            </button>
          )}
          <div className="text-[12px] font-bold mb-2 mt-2" style={{ color: NAVY }}>Egresos / Gastos del período</div>
          {egresos.map((eg, i) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <input placeholder="Concepto" value={eg.concepto} onChange={(e) => { const c = [...egresos]; c[i] = { ...c[i], concepto: e.target.value }; setEgresos(c); }} className="flex-[2] border rounded px-2 py-1.5 text-[12px] min-w-0" style={{ borderColor: LINE }} />
              <input type="date" value={eg.fecha} onChange={(e) => { const c = [...egresos]; c[i] = { ...c[i], fecha: e.target.value }; setEgresos(c); }} className="flex-1 border rounded px-2 py-1.5 text-[11px] min-w-0" style={{ borderColor: LINE }} />
              <input placeholder="Valor" type="number" value={eg.valor} onChange={(e) => { const c = [...egresos]; c[i] = { ...c[i], valor: e.target.value }; setEgresos(c); }} className="flex-1 border rounded px-2 py-1.5 text-[12px] min-w-0" style={{ borderColor: LINE }} />
            </div>
          ))}
          {egresos.length < 5 && (
            <button type="button" onClick={() => setEgresos([...egresos, { concepto: "", fecha: "", valor: "" }])} className="w-full py-1.5 rounded-lg text-[11.5px] font-semibold border" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar egreso
            </button>
          )}
          <div className="mt-3 p-2 rounded-lg text-center" style={{ background: "#F0F2F5" }}>
            <div className="text-[11px] text-gray-500">Balance del período</div>
            <div className="text-[15px] font-bold" style={{ color: NAVY }}>{formatoMoneda(totalIngresos - totalEgresos)}</div>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>ASPECTOS HSE Y AMBIENTALES</div>
        <div className="p-3 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          <Campo label="Horas hombre trabajadas">
            <Input type="number" value={horasHombre} onChange={(e) => setHorasHombre(e.target.value)} />
            <button type="button" onClick={cargarHorasDesdeDiario} className="w-full mt-1.5 text-center py-2 rounded-lg text-[11.5px] font-semibold text-white" style={{ background: NAVY }}>
              ⚡ Calcular desde Informe Diario guardado en este dispositivo
            </button>
          </Campo>
          <Campo label="Observaciones HSE">
            <textarea value={observacionesHSE} onChange={(e) => setObservacionesHSE(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2.5 text-[13px]" style={{ borderColor: LINE }} />
          </Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>REGISTRO FOTOGRÁFICO</div>
        <div className="p-3 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          <div className="text-[11px] text-gray-500 mb-2">Hasta 6 fotos, opcional.</div>
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((foto, i) => (
              <CasillaFoto key={i} foto={foto} numero={i + 1} onChange={(f) => actualizarFoto(i, f)} onRemove={() => quitarFoto(i)} />
            ))}
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>FIRMAS</div>
        <div className="p-3 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>Elaborado por</div>
          <Input placeholder="Firma (texto o iniciales)" value={elabFirma} onChange={(e) => setElabFirma(e.target.value)} />
          <div className="h-2" />
          <Input placeholder="Nombre" value={elabNombre} onChange={(e) => setElabNombre(e.target.value)} />
          <div className="h-2" />
          <BuscadorTexto value={elabCargo} onChange={setElabCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Revisado por</div>
          <Input placeholder="Firma (texto o iniciales)" value={revFirma} onChange={(e) => setRevFirma(e.target.value)} />
          <div className="h-2" />
          <Input placeholder="Nombre" value={revNombre} onChange={(e) => setRevNombre(e.target.value)} />
          <div className="h-2" />
          <BuscadorTexto value={revCargo} onChange={setRevCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Aprobado por</div>
          <Input placeholder="Firma (texto o iniciales)" value={aprFirma} onChange={(e) => setAprFirma(e.target.value)} />
          <div className="h-2" />
          <Input placeholder="Nombre" value={aprNombre} onChange={(e) => setAprNombre(e.target.value)} />
          <div className="h-2" />
          <BuscadorTexto value={aprCargo} onChange={setAprCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
        </div>

        <button onClick={generarExcel} disabled={generando} className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]" style={{ background: generando ? "#9AA0A8" : GOLD }}>
          {generando ? "Generando..." : archivoBase ? "Actualizar y descargar" : "Descargar Informe Mensual en Excel"}
        </button>
      </div>
    </div>
  );
}
