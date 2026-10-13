// accesoProyectos.js — qué proyectos puede ver la persona que tiene la sesión abierta.
// En su ficha de usuario (colección «usuarios») el administrador puede poner:  proyectos: "todos"  o  proyectos: ["Troncal del Pacífico – OC 123", ...]
// Si el campo no existe se ven todos (así nada cambia hasta que se asignen proyectos). El administrador siempre ve todos.
let acceso = { todos: true, claves: new Set() };
const clave = (s) => String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");

export function fijarAcceso(perfil) {
  if (!perfil || perfil.esAdmin || perfil.proyectos === undefined || perfil.proyectos === null || perfil.proyectos === "todos") acceso = { todos: true, claves: new Set() };
  else acceso = { todos: false, claves: new Set((Array.isArray(perfil.proyectos) ? perfil.proyectos : []).map(clave).filter(Boolean)) };
}
export const veTodosLosProyectos = () => acceso.todos;
export function proyectoPermitido(nombre) {
  if (acceso.todos) return true;
  const k = clave(nombre);
  return !!k && acceso.claves.has(k);
}
// Deja solo los elementos cuyo proyecto está permitido. «nombreDe» dice de dónde sacar el nombre del proyecto de cada elemento.
export function filtrarPorProyecto(lista, nombreDe = (x) => x) {
  if (acceso.todos || !Array.isArray(lista)) return lista;
  return lista.filter((x) => proyectoPermitido(nombreDe(x)));
}
