// Reglas de contraseña: mínimo 8 caracteres, con mayúscula, minúscula, número y un carácter especial.
export const REQUISITOS_CLAVE = "Mínimo 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial (por ejemplo ! @ # $ %).";
// Devuelve "" si la clave sirve; si no, qué le falta.
export function errorClave(c) {
  c = String(c ?? "");
  const falta = [];
  if (c.length < 8) falta.push("mínimo 8 caracteres");
  if (!/\p{Lu}/u.test(c)) falta.push("una mayúscula");
  if (!/\p{Ll}/u.test(c)) falta.push("una minúscula");
  if (!/\p{N}/u.test(c)) falta.push("un número");
  if (!/[^\p{L}\p{N}\s]/u.test(c)) falta.push("un carácter especial (! @ # $ %…)");
  return falta.length ? "La clave necesita: " + falta.join(", ") + "." : "";
}
