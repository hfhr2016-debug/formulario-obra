// Conecta el motor de sincronización (sincronizar.js) con Firestore y con la app.
import { collection, onSnapshot, doc, setDoc, waitForPendingWrites } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { crearMotor, borrarCopiaLocal, CLAVE_UID_SYNC } from "./sincronizar";

const adaptadorFirestore = {
  escuchar(col, alLlegar, alFallar) {
    return onSnapshot(collection(db, col),
      (snap) => alLlegar(snap.docChanges().filter((c) => c.type !== "removed").map((c) => ({ id: c.doc.id, data: c.doc.data() }))),
      (err) => alFallar(err));
  },
  escribir(col, id, datos) { return setDoc(doc(db, col, id), datos); },
  // true si el servidor confirmó todo lo pendiente; false si no alcanzó en `ms`
  esperarEscrituras(ms) {
    return Promise.race([waitForPendingWrites(db).then(() => true), new Promise((r) => setTimeout(() => r(false), ms))]);
  },
};

let motor = null;
let gancho = false;
// Cada vez que la app guarda algo en el dispositivo, el motor se entera (así los formularios no tuvieron que cambiar)
function instalarGancho() {
  if (gancho || typeof Storage === "undefined") return;
  gancho = true;
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (clave, valor) {
    original.call(this, clave, valor);
    try { if (motor && this === window.localStorage) motor.cambio(clave); } catch (e) { /* nunca debe romper un guardado */ }
  };
}

export async function iniciarSync({ uid, perfil, onEvento }) {
  instalarGancho();
  if (motor) await detenerSync({ limpiar: false });
  try {
    const previo = localStorage.getItem(CLAVE_UID_SYNC);
    if (previo && previo !== uid) borrarCopiaLocal(localStorage);   // el equipo tenía datos de otra persona: no se mezclan
    localStorage.setItem(CLAVE_UID_SYNC, uid);
  } catch (e) { /* sin memoria */ }
  motor = crearMotor({ almacen: window.localStorage, adaptador: adaptadorFirestore, uid, perfil, esperaInicial: 5000, onEvento: onEvento || (() => {}) });
  await motor.iniciar();
}

// Con `limpiar`, borra la copia del dispositivo si ya está todo subido (al cerrar sesión).
export async function detenerSync({ limpiar = false } = {}) {
  const m = motor; motor = null;
  if (!m) return { limpio: false, confirmado: true };
  return m.detener({ limpiar });
}
export const sincronizacionActiva = () => !!motor;
