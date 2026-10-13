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
  director_obra: { tecnica: "E", "sst-*": "V", "amb-*": "V", "cal-*": "V" },
  coord_tecnico: { tecnica: "E" },
  residente: { ficha: "V", apus: "V", presupuesto: "V", cronograma: "V", cantidades: "E", diario: "E", semanal: "V", mensual: "V", memorias: "E", acta: "E" },
  programador: { ficha: "V", presupuesto: "V", cantidades: "V", diario: "V", cronograma: "E" },
  admin_frente: { ficha: "V", diario: "V", cantidades: "V", acta: "V", "sst-personal": "E", "sst-asistencia": "E", "sst-epp": "E", "sst-induccion": "E" },
  aux_admin: {},
  insp_sst: { ...SOLO_FICHA, ...TODO_E("sst-"), "sst-ficha": "V" },
  insp_amb: { ...SOLO_FICHA, ...TODO_E("amb-"), "amb-ficha": "V" },
  insp_calidad: { ...SOLO_FICHA, ...TODO_E("cal-") },
  coord_amb: { ...SOLO_FICHA, ...TODO_E("amb-") },
  coord_sst: { ...SOLO_FICHA, ...TODO_E("sst-") },
  coord_calidad: { ...SOLO_FICHA, ...TODO_E("cal-") },
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
  return expandir(reglas, id) || null;
}
