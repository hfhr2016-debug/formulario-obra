// reinicioNube.js — la «orden de reinicio general» vive en un solo documento de Firestore: app_reinicio/global { marca, por }.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function leerMarcaReinicio() {
  try { const s = await getDoc(doc(db, "app_reinicio", "global")); return s.exists() ? Number((s.data() || {}).marca) || 0 : 0; } catch (x) { return 0; }
}
// Solo el Administrador puede escribirla (lo exigen las reglas). Si falla, lanza el error para NO borrar nada.
export async function publicarReinicio(por) {
  const marca = Date.now();
  await setDoc(doc(db, "app_reinicio", "global"), { marca, por: por || "" });
  return marca;
}
