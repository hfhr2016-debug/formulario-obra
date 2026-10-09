import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import * as FS from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA44nrJMcN6zew_2XhhTgWdszcZdsH7SJs",
  authDomain: "saiea-obras.firebaseapp.com",
  projectId: "saiea-obras",
  storageBucket: "saiea-obras.firebasestorage.app",
  messagingSenderId: "244389186658",
  appId: "1:244389186658:web:3f520a09288dd0b629953b",
  measurementId: "G-DP03C2XG5G",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Con memoria local de Firestore: la app sigue funcionando sin señal y lo registrado se envía al volver la conexión.
let _db;
try { _db = FS.initializeFirestore(app, { localCache: FS.persistentLocalCache({ tabManager: FS.persistentMultipleTabManager() }) }); }
catch (e) { _db = FS.getFirestore(app); }   // navegador sin soporte (p. ej. modo privado): funciona igual, solo en línea
export const db = _db;
export default app;
