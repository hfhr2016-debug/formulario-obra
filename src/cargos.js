// cargos.js — los cargos (perfiles) de la empresa. En la etapa 2 cada cargo traerá sus permisos por formulario; por ahora sirven para identificar a la persona.
export const CARGOS = [
  { id: "admin_general", nombre: "Administrador general" },
  { id: "director_obra", nombre: "Director de obra" },
  { id: "coord_tecnico", nombre: "Coordinador técnico" },
  { id: "residente", nombre: "Ingeniero residente" },
  { id: "programador", nombre: "Programador" },
  { id: "admin_frente", nombre: "Administrador de frente" },
  { id: "aux_admin", nombre: "Auxiliar administrativa" },
  { id: "insp_sst", nombre: "Inspector SG-SST" },
  { id: "insp_amb", nombre: "Inspector Ambiental" },
  { id: "insp_calidad", nombre: "Inspector de calidad" },
  { id: "coord_amb", nombre: "Coordinador Ambiental" },
  { id: "coord_sst", nombre: "Coordinador SG-SST" },
  { id: "coord_calidad", nombre: "Coordinador de Calidad" },
  { id: "comprador", nombre: "Comprador / Jefe de compras" },
  { id: "almacenista", nombre: "Almacenista" },
];
export const nombreCargo = (id) => (CARGOS.find((c) => c.id === id) || {}).nombre || "";

// ---------- Permisos por cargo ----------
// E = ve y edita · V = solo consulta · (ausente) = no lo ve.
// Se aplican DENTRO de lo que ya permiten las gestiones asignadas a la persona (Técnica, SST, Ambiental, Calidad, Presupuesto).
// Una persona SIN cargo conserva el comportamiento de siempre (todo lo de sus gestiones, editando). El administrador siempre edita todo.
// Control Presupuestal tiene su propia tabla por cargo (cpPermisos.jsx) y no se toca aquí.
export const MODULOS_TECNICA = ["ficha", "apus", "presupuesto", "cronograma", "cantidades", "diario", "semanal", "mensual", "memorias", "acta"];
const TODO_E = (prefijo) => ({ [prefijo + "*"]: "E" });
const SOLO_FICHA = { ficha: "V" };

export const PERMISOS_CARGO = {
  admin_general: { "*": "E" },
  director_obra: { tecnica: "E", "sst-*": "V", "amb-*": "V", "cal-*": "V", "com-*": "E" },
  coord_tecnico: { tecnica: "E" },
  // Residente: en Compras solo la Requisición; en Control Presupuestal ninguno por ahora ("N" = decidido: sin acceso).
  residente: { ficha: "V", apus: "V", presupuesto: "V", cronograma: "V", cantidades: "E", diario: "E", semanal: "V", mensual: "V", memorias: "E", acta: "E", "com-requisicion": "E", "cp-*": "N" },
  programador: { ficha: "V", presupuesto: "V", cantidades: "V", diario: "V", cronograma: "E" },
  admin_frente: { ficha: "V", diario: "V", cantidades: "V", acta: "V", "sst-personal": "E", "sst-asistencia": "E", "sst-epp": "E", "sst-induccion": "E" },
  aux_admin: {},
  insp_sst: { ...SOLO_FICHA, ...TODO_E("sst-"), "sst-ficha": "V" },
  insp_amb: { ...SOLO_FICHA, ...TODO_E("amb-"), "amb-ficha": "V" },
  insp_calidad: { ...SOLO_FICHA, ...TODO_E("cal-") },
  coord_amb: { ...SOLO_FICHA, ...TODO_E("amb-") },
  coord_sst: { ...SOLO_FICHA, ...TODO_E("sst-") },
  coord_calidad: { ...SOLO_FICHA, ...TODO_E("cal-") },
  comprador: { ...SOLO_FICHA, ...TODO_E("com-") },
  almacenista: { ...SOLO_FICHA, "com-recepcion": "E", "com-pendientes": "V", "com-requisicion": "V" },
};
const expandir = (reglas, id) => {
  if (reglas[id] !== undefined) return reglas[id];
  if (reglas.tecnica !== undefined && MODULOS_TECNICA.includes(id)) return reglas.tecnica;
  for (const k of Object.keys(reglas)) if (k.endsWith("*") && k !== "*" && id.startsWith(k.slice(0, -1))) return reglas[k];
  return reglas["*"];
};
// Nivel de una persona en un módulo: "E", "V" o null. «extra» son los permisos individuales que el administrador (o quien delegó) le dio.
export function nivelModulo(perfil, id) {
  if (!perfil) return null;
  if (perfil.esAdmin) return "E";
  const extra = perfil.permisosExtra && perfil.permisosExtra[id];
  if (extra === "E" || extra === "V") return extra;
  if (extra === "N") return null;
  if (!perfil.cargo) return "E";                       // sin cargo: como siempre
  const reglas = PERMISOS_CARGO[perfil.cargo];
  if (!reglas) return "E";
  const n = expandir(reglas, id);
  return n === "E" || n === "V" ? n : null;
}

// Gestiones (los «roles» de la persona) que un cargo usa: las que tienen al menos un formato con acceso.
// Es lo que se marca solo al elegir el cargo; el servidor y la sincronización siguen leyendo esos roles.
const GESTION_DE_PREFIJO = [["sst-", "sst"], ["amb-", "ambiental"], ["cal-", "calidad"], ["com-", "compras"], ["cp-", "presupuesto"]];
export function gestionesDeCargo(cargoId) {
  const reglas = PERMISOS_CARGO[cargoId];
  if (!reglas) return [];
  const out = new Set();
  const da = (v) => v === "E" || v === "V";
  if (da(reglas["*"])) return ["tecnica", "sst", "ambiental", "calidad", "compras", "presupuesto"];
  Object.entries(reglas).forEach(([k, v]) => {
    if (!da(v)) return;
    if (k === "tecnica" || MODULOS_TECNICA.includes(k)) out.add("tecnica");
    GESTION_DE_PREFIJO.forEach(([pre, g]) => { if (k.startsWith(pre)) out.add(g); });
  });
  return Array.from(out);
}
// ¿El cargo define reglas propias para Control Presupuestal? (si no, sigue valiendo el «cargo en Control Presupuestal» de siempre)
export function cargoDefineCP(cargoId) {
  const reglas = PERMISOS_CARGO[cargoId];
  return !!reglas && (reglas["*"] !== undefined || Object.keys(reglas).some((k) => k.startsWith("cp-")));
}
export const cargoSobreCP = (cargoId, id) => { const r = PERMISOS_CARGO[cargoId]; const n = r ? expandir(r, id) : undefined; return n === "E" || n === "V" ? n : null; };
