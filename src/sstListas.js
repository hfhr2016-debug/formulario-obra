// sstListas.js — listas de entidades y opciones para los formularios de Gestión SG-SST (sin React).
// Todas se muestran como listas desplegables con búsqueda y SIEMPRE permiten escribir una opción que no esté.

// Administradoras de Riesgos Laborales (ARL) autorizadas en Colombia
export const ARL = ["ARL SURA", "Positiva Compañía de Seguros", "Colmena Seguros", "Seguros Bolívar", "AXA Colpatria", "La Equidad Seguros", "Liberty Seguros", "Mapfre Colombia Vida Seguros"];

// Entidades Promotoras de Salud (EPS) y regímenes especiales. Es una lista que cambia (intervenciones, liquidaciones, fusiones):
// si una persona está afiliada a una que no aparece, se escribe a mano y queda guardada para la próxima vez.
export const EPS = [
  "Nueva EPS", "EPS Sanitas", "EPS Sura", "Salud Total", "Compensar", "Famisanar", "Coosalud", "Mutual Ser", "Asmet Salud", "Emssanar",
  "SOS (Servicio Occidental de Salud)", "Capital Salud", "Savia Salud", "Cajacopi Atlántico", "Comfenalco Valle", "Comfachocó", "Comfaoriente", "Comfamiliar Nariño",
  "Salud Mía", "Aliansalud", "EPS Familiar de Colombia", "Pijaos Salud", "Dusakawi", "Anas Wayuu", "Asociación Indígena del Cauca (AIC)", "Mallamas", "Capresoca",
  "Fondo de Pasivo Social de Ferrocarriles Nacionales", "Fuerzas Militares (Sanidad Militar)", "Policía Nacional (Sanidad Policial)", "Ecopetrol", "Magisterio (FOMAG)",
];

// Fondos de pensiones (AFP) y Colpensiones (régimen de prima media)
export const AFP = ["Colpensiones (régimen de prima media)", "Porvenir", "Protección", "Colfondos", "Skandia"];

// Parentesco del contacto de emergencia
export const PARENTESCOS = [
  "Madre", "Padre", "Esposo(a) o cónyuge", "Compañero(a) permanente", "Hijo(a)", "Hermano(a)", "Abuelo(a)", "Tío(a)", "Primo(a)", "Sobrino(a)",
  "Suegro(a)", "Cuñado(a)", "Yerno o nuera", "Padrastro o madrastra", "Amigo(a)", "Vecino(a)", "Otro",
];

// Entidades o personas que pueden dictar una charla, capacitación o inducción
export const ENTIDADES_QUE_DICTAN = [
  ...ARL.filter((a) => a !== "Mapfre Colombia Vida Seguros").map((a) => (a.startsWith("ARL") ? a : `ARL ${a.replace(" Compañía de Seguros", "").replace(" Seguros", "")}`)),
  "SENA", "Cuerpo de Bomberos", "Cruz Roja Colombiana", "Defensa Civil Colombiana", "Policía Nacional", "Ministerio del Trabajo", "Secretaría de Salud",
  "Caja de compensación familiar", "EPS", "Consejo Colombiano de Seguridad", "Centro de entrenamiento autorizado (alturas)", "Universidad o institución educativa",
  "Consultor o asesor SST externo", "Proveedor o fabricante de equipos y EPP", "Contratista o subcontratista", "Interventoría", "Cliente o contratante",
  "Responsable SST de la obra", "Residente de obra",
];

// Certificados y competencias que se piden en obra para ejecutar trabajos de riesgo
export const CERTIFICACIONES = [
  "Trabajo seguro en alturas · Nivel avanzado", "Trabajo seguro en alturas · Nivel básico operativo", "Trabajo seguro en alturas · Reentrenamiento", "Coordinador de trabajo en alturas",
  "Aptitud médica ocupacional para alturas", "Trabajo en espacios confinados", "Trabajo en caliente (soldadura y corte)", "Riesgo eléctrico", "Armador de andamios",
  "Operador de equipo de izaje (grúa)", "Aparejador o señalero de izaje (rigger)", "Operador de maquinaria pesada", "Operador de montacargas o manipulador telescópico",
  "Excavaciones y trabajo en zanjas", "Manejo de sustancias químicas", "Primeros auxilios", "Brigadista de emergencias", "Manejo de extintores y control de incendios",
  "Curso de 50 horas del SG-SST", "Conducción segura o manejo defensivo", "Certificación de competencias laborales (SENA u otra)", "Otra",
];

export const comoOpciones = (lista) => lista.map((t) => ({ texto: t, detalle: "" }));
