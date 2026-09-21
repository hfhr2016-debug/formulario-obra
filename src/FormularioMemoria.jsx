import React, { useState, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
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

const MAPA_ACTIVIDADES = {"Localización y Replanteo": {"fila": 9, "unidad": "m2", "capitulo": "PRELIMINARES"}, "Cerramiento provisional de obra": {"fila": 10, "unidad": "ml", "capitulo": "PRELIMINARES"}, "Instalación de campamento y oficinas provisionales": {"fila": 11, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Adecuación de área de almacenamiento": {"fila": 12, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Señalización preventiva e informativa de obra": {"fila": 13, "unidad": "und", "capitulo": "PRELIMINARES"}, "Instalaciones provisionales de agua y energía": {"fila": 14, "unidad": "gl", "capitulo": "PRELIMINARES"}, "Protección de elementos existentes": {"fila": 15, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Desmonte y limpieza inicial": {"fila": 16, "unidad": "m²", "capitulo": "PRELIMINARES"}, "Demoliciones preliminares": {"fila": 17, "unidad": "m³", "capitulo": "PRELIMINARES"}, "Excavación manual en material común": {"fila": 18, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación mecánica": {"fila": 19, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Excavación en roca": {"fila": 20, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Perfilado y conformación de excavaciones": {"fila": 21, "unidad": "m²", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material seleccionado compactado": {"fila": 22, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Relleno con material proveniente de excavación": {"fila": 23, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de subbase": {"fila": 24, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Suministro, extendido y compactación de base granular": {"fila": 25, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Cargue de material sobrante": {"fila": 26, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Transporte de material sobrante": {"fila": 27, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Disposición final de sobrantes": {"fila": 28, "unidad": "m³", "capitulo": "MOVIMIENTO DE TIERRAS"}, "Concreto de limpieza / solado": {"fila": 29, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para zapatas": {"fila": 30, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para vigas de cimentación": {"fila": 31, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para losas de cimentación": {"fila": 32, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Concreto para pedestales": {"fila": 33, "unidad": "m³", "capitulo": "CIMENTACIONES"}, "Acero de refuerzo en cimentación": {"fila": 34, "unidad": "kg", "capitulo": "CIMENTACIONES"}, "Formaleta para elementos de cimentación": {"fila": 35, "unidad": "m²", "capitulo": "CIMENTACIONES"}, "Concreto para columnas": {"fila": 36, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para vigas": {"fila": 37, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para losas": {"fila": 38, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para escaleras": {"fila": 39, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Concreto para muros estructurales": {"fila": 40, "unidad": "m³", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de columnas": {"fila": 41, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de vigas": {"fila": 42, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Acero de refuerzo de losas": {"fila": 43, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Formaleta de columnas": {"fila": 44, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de vigas": {"fila": 45, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de losas": {"fila": 46, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Formaleta de escaleras": {"fila": 47, "unidad": "m²", "capitulo": "ESTRUCTURA"}, "Suministro y montaje de perfiles metálicos": {"fila": 48, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Placas, pernos y conexiones metálicas": {"fila": 49, "unidad": "kg", "capitulo": "ESTRUCTURA"}, "Mampostería en bloque de concreto": {"fila": 50, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería en ladrillo": {"fila": 51, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Mampostería estructural": {"fila": 52, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Muros en sistema liviano / drywall": {"fila": 53, "unidad": "m²", "capitulo": "MAMPOSTERÍA"}, "Dinteles sobre vanos": {"fila": 54, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Alfajías y remates": {"fila": 55, "unidad": "ml", "capitulo": "MAMPOSTERÍA"}, "Anclajes y refuerzos de mampostería": {"fila": 56, "unidad": "und", "capitulo": "MAMPOSTERÍA"}, "Estructura metálica o de madera para cubierta": {"fila": 57, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Cerchas y elementos estructurales": {"fila": 58, "unidad": "kg", "capitulo": "CUBIERTAS"}, "Suministro e instalación de teja": {"fila": 59, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Impermeabilización de cubierta": {"fila": 60, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Aislamiento térmico/acústico": {"fila": 61, "unidad": "m²", "capitulo": "CUBIERTAS"}, "Canales de aguas lluvias": {"fila": 62, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Bajantes de aguas lluvias": {"fila": 63, "unidad": "ml", "capitulo": "CUBIERTAS"}, "Impermeabilización de losas y terrazas": {"fila": 64, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de muros": {"fila": 65, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Impermeabilización de zonas húmedas": {"fila": 66, "unidad": "m²", "capitulo": "IMPERMEABILIZACIONES"}, "Pañete / revoque interior": {"fila": 67, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete / revoque exterior": {"fila": 68, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Pañete impermeabilizado": {"fila": 69, "unidad": "m²", "capitulo": "PAÑETES Y REVOQUES"}, "Estuco plástico": {"fila": 70, "unidad": "m²", "capitulo": "PINTURA"}, "Estuco tradicional": {"fila": 71, "unidad": "m²", "capitulo": "PINTURA"}, "Mortero de nivelación": {"fila": 72, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso cerámico": {"fila": 73, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso en porcelanato": {"fila": 74, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso vinílico": {"fila": 75, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Piso laminado": {"fila": 76, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Enchape cerámico en muros": {"fila": 77, "unidad": "m²", "capitulo": "PISOS Y ENCHAPES"}, "Guardaescoba": {"fila": 78, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Juntas de dilatación / construcción": {"fila": 79, "unidad": "ml", "capitulo": "PISOS Y ENCHAPES"}, "Pintura vinílica interior": {"fila": 80, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura exterior": {"fila": 81, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura esmalte en superficies metálicas/madera": {"fila": 82, "unidad": "m²", "capitulo": "PINTURA"}, "Pintura anticorrosiva": {"fila": 83, "unidad": "m²", "capitulo": "PINTURA"}, "Sellador / imprimante": {"fila": 84, "unidad": "m²", "capitulo": "PINTURA"}, "Puertas de madera": {"fila": 85, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Muebles fijos de madera": {"fila": 86, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Puertas metálicas": {"fila": 87, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Barandas metálicas": {"fila": 88, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Pasamanos": {"fila": 89, "unidad": "ml", "capitulo": "CARPINTERÍA"}, "Ventanas de aluminio": {"fila": 90, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Divisiones de aluminio": {"fila": 91, "unidad": "m²", "capitulo": "CARPINTERÍA"}, "Vidrio templado": {"fila": 92, "unidad": "m²", "capitulo": "VIDRIOS"}, "Vidrio laminado": {"fila": 93, "unidad": "m²", "capitulo": "VIDRIOS"}, "Espejos": {"fila": 94, "unidad": "m²", "capitulo": "VIDRIOS"}, "Sellos y silicona": {"fila": 95, "unidad": "ml", "capitulo": "VIDRIOS"}, "Tubería de agua fría": {"fila": 96, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de agua caliente": {"fila": 97, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Válvulas y accesorios hidrosanitarios": {"fila": 98, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería sanitaria": {"fila": 99, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería de aguas lluvias": {"fila": 100, "unidad": "ml", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Cajas de inspección": {"fila": 101, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Aparatos sanitarios": {"fila": 102, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Lavamanos": {"fila": 103, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Griferías": {"fila": 104, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Duchas": {"fila": 105, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Pruebas hidráulicas y de estanqueidad": {"fila": 106, "unidad": "gl", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Tubería/conduit eléctrica": {"fila": 107, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Bandejas portacables": {"fila": 108, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cajas eléctricas": {"fila": 109, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de fuerza": {"fila": 110, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado de iluminación": {"fila": 111, "unidad": "ml", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tableros eléctricos": {"fila": 112, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Tomacorrientes": {"fila": 113, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Interruptores": {"fila": 114, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Luminarias": {"fila": 115, "unidad": "und", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Sistema de puesta a tierra": {"fila": 116, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Pruebas y certificaciones": {"fila": 117, "unidad": "gl", "capitulo": "INSTALACIONES ELÉCTRICAS"}, "Cableado estructurado de datos": {"fila": 118, "unidad": "ml", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Rack de comunicaciones": {"fila": 119, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Cámaras y sistema CCTV": {"fila": 120, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Control de acceso": {"fila": 121, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de citofonía": {"fila": 122, "unidad": "und", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Sistema de detección de incendios": {"fila": 123, "unidad": "gl", "capitulo": "COMUNICACIONES Y SEGURIDAD"}, "Equipos de aire acondicionado": {"fila": 124, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Ductos de ventilación": {"fila": 125, "unidad": "m²", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Tubería de refrigerante": {"fila": 126, "unidad": "ml", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Rejillas y difusores": {"fila": 127, "unidad": "und", "capitulo": "CLIMATIZACIÓN Y VENTILACIÓN"}, "Red interna de gas": {"fila": 128, "unidad": "ml", "capitulo": "GAS"}, "Válvulas y accesorios de gas": {"fila": 129, "unidad": "und", "capitulo": "GAS"}, "Pruebas y certificación": {"fila": 130, "unidad": "gl", "capitulo": "GAS"}, "Construcción de andenes": {"fila": 131, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Placas de concreto exteriores": {"fila": 132, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Pavimento en adoquín": {"fila": 133, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Sardineles y bordillos": {"fila": 134, "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, "Sumideros exteriores": {"fila": 135, "unidad": "und", "capitulo": "URBANISMO Y EXTERIORES"}, "Suministro y extendido de tierra vegetal": {"fila": 136, "unidad": "m³", "capitulo": "URBANISMO Y EXTERIORES"}, "Siembra y jardinería": {"fila": 137, "unidad": "m²", "capitulo": "URBANISMO Y EXTERIORES"}, "Rejas metálicas": {"fila": 138, "unidad": "m²", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Escaleras metálicas": {"fila": 139, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Elementos metálicos especiales": {"fila": 140, "unidad": "kg", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Mobiliario fijo de obra": {"fila": 141, "unidad": "und", "capitulo": "OBRAS COMPLEMENTARIAS"}, "Limpieza gruesa y fina de obra": {"fila": 142, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Limpieza final para entrega": {"fila": 143, "unidad": "m²", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Pruebas, puesta en marcha y ajustes": {"fila": 144, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Actualización de planos récord / as-built": {"fila": 145, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Entrega, manuales y acta de recibo": {"fila": 146, "unidad": "gl", "capitulo": "ASEO, ENTREGA Y CIERRE"}, "Desmantelamiento de estructuras metálicas existentes": {"fila": 147, "unidad": "kg", "capitulo": "PRELIMINARES"}, "Grouting cementoso para reparación estructural": {"fila": 148, "unidad": "m2", "capitulo": "ESTRUCTURA"}, "Grouting epóxico para reparación estructural": {"fila": 149, "unidad": "m2", "capitulo": "ESTRUCTURA"}, "Mampostería en ladrillo tolete a la vista (reforzada)": {"fila": 150, "unidad": "m2", "capitulo": "MAMPOSTERÍA"}, "Mampostería en ladrillo a la vista (no reforzada)": {"fila": 151, "unidad": "m2", "capitulo": "MAMPOSTERÍA"}, "Cielo raso Dry Wall": {"fila": 152, "unidad": "m2", "capitulo": "CUBIERTAS"}, "Cielo raso en lámina acústica de fibra mineral": {"fila": 153, "unidad": "m2", "capitulo": "CUBIERTAS"}, "Geomembrana HDPE para impermeabilización de terrenos": {"fila": 154, "unidad": "m2", "capitulo": "IMPERMEABILIZACIONES"}, "Piso en concreto afinado con endurecedor de cuarzo": {"fila": 155, "unidad": "m2", "capitulo": "PISOS Y ENCHAPES"}, "Baldosa de granito": {"fila": 156, "unidad": "m2", "capitulo": "PISOS Y ENCHAPES"}, "Enchape en granito pulido": {"fila": 157, "unidad": "m2", "capitulo": "PISOS Y ENCHAPES"}, "Puerta antipánico": {"fila": 158, "unidad": "und", "capitulo": "CARPINTERÍA"}, "Orinal institucional": {"fila": 159, "unidad": "und", "capitulo": "INSTALACIONES HIDROSANITARIAS"}, "Geotextil para drenaje y filtración": {"fila": 160, "unidad": "m2", "capitulo": "URBANISMO Y EXTERIORES"}, "Gaviones para obras de contención": {"fila": 161, "unidad": "m3", "capitulo": "URBANISMO Y EXTERIORES"}, "Filtro francés (drenaje de terrenos)": {"fila": 162, "unidad": "ml", "capitulo": "URBANISMO Y EXTERIORES"}, "Revegetalización / empradización": {"fila": 163, "unidad": "m2", "capitulo": "URBANISMO Y EXTERIORES"}, "Concreto premezclado o de planta (suministro)": {"fila": 164, "unidad": "m3", "capitulo": "ESTRUCTURA"}, "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos": {"fila": 165, "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Estudio de suelos y geotecnia": {"fila": 166, "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Licencia de construcción y trámites de curaduría urbana": {"fila": 167, "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)": {"fila": 168, "unidad": "gl", "capitulo": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN"}, "Suministro e instalación de ascensor eléctrico": {"fila": 169, "unidad": "und", "capitulo": "ASCENSORES"}};
const LISTA_ACTIVIDADES = Object.keys(MAPA_ACTIVIDADES);
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

const medicionVacia = () => ({ descripcion: "", cant: "", largo: "", ancho: "", altoPeso: "", factor: "", observacion: "" });

export default function FormularioMemoria({ onVolver }) {
  const [proyecto, setProyecto] = useState("");
  const [areaFrente, setAreaFrente] = useState("");
  const [contratante, setContratante] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [memoriaNo, setMemoriaNo] = useState("");
  const [actividad, setActividad] = useState("");
  const [descripcionActividad, setDescripcionActividad] = useState("");

  const [mediciones, setMediciones] = useState([medicionVacia()]);
  const [cantidadContractual, setCantidadContractual] = useState("");

  const [fotos, setFotos] = useState(Array.from({ length: 4 }, () => ({ file: null, previewUrl: null })));
  function actualizarFoto(idx, nuevaFoto) { setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f))); }
  function quitarFoto(idx) { setFotos((fs) => fs.map((f, i) => (i === idx ? { file: null, previewUrl: null } : f))); }

  const [elabNombre, setElabNombre] = useState(""); const [elabCargo, setElabCargo] = useState("");
  const [revNombre, setRevNombre] = useState(""); const [revCargo, setRevCargo] = useState("");
  const [aprNombre, setAprNombre] = useState(""); const [aprCargo, setAprCargo] = useState("");

  const [generando, setGenerando] = useState(false);

  const unidad = MAPA_ACTIVIDADES[actividad]?.unidad || "";

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-memoria.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Memoria de Cálculo");

      ws.getCell("C10").value = proyecto;
      ws.getCell("J10").value = areaFrente;
      ws.getCell("M10").value = aFechaDDMMYYYY(fechaLocalHoy());
      ws.getCell("C11").value = contratante;
      ws.getCell("J11").value = ubicacion;
      ws.getCell("M11").value = memoriaNo;
      ws.getCell("C12").value = actividad;
      ws.getCell("F12").value = unidad;
      ws.getCell("J12").value = descripcionActividad;

      mediciones.forEach((m, i) => {
        if (!m.descripcion && !m.cant) return;
        const r = 16 + i;
        if (r > 25) return;
        ws.getCell(`B${r}`).value = m.descripcion;
        ws.getCell(`C${r}`).value = numES(m.cant) || 0;
        ws.getCell(`D${r}`).value = numES(m.largo) || 0;
        ws.getCell(`E${r}`).value = numES(m.ancho) || 0;
        ws.getCell(`F${r}`).value = numES(m.altoPeso) || 0;
        ws.getCell(`G${r}`).value = numES(m.factor) || 1;
        ws.getCell(`I${r}`).value = unidad;
        ws.getCell(`J${r}`).value = m.observacion;
      });

      ws.getCell("D30").value = numES(cantidadContractual) || 0;

      const posicionesFotos = [
        { tl: { col: 0, row: 40 }, br: { col: 7, row: 55 } },
        { tl: { col: 7, row: 40 }, br: { col: 13, row: 55 } },
        { tl: { col: 0, row: 58 }, br: { col: 7, row: 73 } },
        { tl: { col: 7, row: 58 }, br: { col: 13, row: 73 } },
      ];
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (!foto.file) continue;
        const bufferFoto = await comprimirFoto(foto.file);
        const imageId = workbook.addImage({ buffer: bufferFoto, extension: "jpeg" });
        ws.addImage(imageId, posicionesFotos[i]);
      }

      ws.getCell("B98").value = elabCargo ? `${elabNombre} - ${elabCargo}` : elabNombre;
      ws.getCell("E98").value = revCargo ? `${revNombre} - ${revCargo}` : revNombre;
      ws.getCell("I98").value = aprCargo ? `${aprNombre} - ${aprCargo}` : aprNombre;

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const nombreArchivo = `Memoria_de_Calculo_${(actividad || "actividad").slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
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
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>MEMORIA DE CÁLCULO</div>
            <div className="text-[11px]" style={{ color: GOLD }}>Reformas y Remodelaciones</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>01 | IDENTIFICACIÓN</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Proyecto / Obra"><Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} /></Campo>
            <Campo label="Área / Frente"><Input value={areaFrente} onChange={(e) => setAreaFrente(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Contratante"><Input value={contratante} onChange={(e) => setContratante(e.target.value)} /></Campo>
            <Campo label="Ubicación"><BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." /></Campo>
          </div>
          <Campo label="Memoria No."><Input value={memoriaNo} onChange={(e) => setMemoriaNo(e.target.value)} /></Campo>
          <Campo label="Actividad / Ítem">
            <BuscadorTexto value={actividad} onChange={setActividad} catalogo={LISTA_ACTIVIDADES} placeholder="Busca la actividad..." />
            {unidad && <div className="text-[10.5px] text-gray-500 mt-1">Unidad: {unidad}</div>}
          </Campo>
          <Campo label="Descripción">
            <textarea value={descripcionActividad} onChange={(e) => setDescripcionActividad(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2.5 text-[13px]" style={{ borderColor: LINE }} />
          </Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>02 | MEDICIÓN DE CAMPO / DATOS DE ENTRADA</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11px] text-gray-500 mb-2">Cada fila se multiplica sola (Cant. × Largo × Ancho × Alto/Peso × Factor) y se suman todas para el total.</div>
          {mediciones.map((m, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>Registro #{i + 1}</span>
                {mediciones.length > 1 && (
                  <button onClick={() => setMediciones(mediciones.filter((_, idx) => idx !== i))} className="text-[11px] text-red-500">Quitar</button>
                )}
              </div>
              <input placeholder="Descripción" value={m.descripcion} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], descripcion: e.target.value }; setMediciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
              <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                <input placeholder="Cant." type="text" inputMode="decimal" value={m.cant} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], cant: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Largo" type="text" inputMode="decimal" value={m.largo} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], largo: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Ancho" type="text" inputMode="decimal" value={m.ancho} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], ancho: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Alto/Peso" type="text" inputMode="decimal" value={m.altoPeso} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], altoPeso: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Factor" type="text" inputMode="decimal" value={m.factor} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], factor: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="text-[10px] text-gray-400 mb-1.5">Factor: multiplicador de ajuste — úsalo para desperdicio, traslape o cualquier corrección (ej: 1.05 = +5%). Déjalo en 1 o vacío si no aplica.</div>
              <input placeholder="Observación" value={m.observacion} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], observacion: e.target.value }; setMediciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
            </div>
          ))}
          {mediciones.length < 10 && (
            <button onClick={() => setMediciones([...mediciones, medicionVacia()])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar registro
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>03 | RESUMEN Y CONTROL DE CANTIDADES</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <Campo label="Cantidad contractual">
            <Input type="text" inputMode="decimal" value={cantidadContractual} onChange={(e) => setCantidadContractual(e.target.value)} />
          </Campo>
          <div className="text-[11px] text-gray-500">La cantidad calculada, el saldo, el % ejecutado y el estado se calculan solos en el Excel a partir de los registros de arriba.</div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>05 | SOPORTE GRÁFICO</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11px] text-gray-500 mb-2">Hasta 4 fotos, opcional.</div>
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((foto, i) => (
              <CasillaFoto key={i} foto={foto} numero={i + 1} onChange={(f) => actualizarFoto(i, f)} onRemove={() => quitarFoto(i)} />
            ))}
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>07 | RESPONSABLES Y TRAZABILIDAD</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>Elaboró</div>
          <CampoNombre value={elabNombre} onChange={setElabNombre} />
          <div className="h-2" />
          <BuscadorTexto value={elabCargo} onChange={setElabCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Revisó</div>
          <CampoNombre value={revNombre} onChange={setRevNombre} />
          <div className="h-2" />
          <BuscadorTexto value={revCargo} onChange={setRevCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Aprobó</div>
          <CampoNombre value={aprNombre} onChange={setAprNombre} />
          <div className="h-2" />
          <BuscadorTexto value={aprCargo} onChange={setAprCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
        </div>

        <button onClick={generarExcel} disabled={generando} className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]" style={{ background: generando ? "#9AA0A8" : GOLD }}>
          {generando ? "Generando..." : "Descargar Memoria de Cálculo en Excel"}
        </button>
      </div>
    </div>
  );
}
