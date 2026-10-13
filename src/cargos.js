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
