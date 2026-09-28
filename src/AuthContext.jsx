import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

const AuthContext = createContext(null);

// ===== Cierre de sesión por inactividad o ausencia =====
// Para cambiar los tiempos, modifica solo estos dos números (en minutos).
const MINUTOS_INACTIVIDAD = 10; // con la app abierta y sin tocarla
const MINUTOS_AUSENCIA = 5;     // fuera de la app (cerrada, en segundo plano o pantalla bloqueada)
const TIEMPO_INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const TIEMPO_AUSENCIA_MS = MINUTOS_AUSENCIA * 60 * 1000;
const CLAVE_ACTIVIDAD = "ryr_ultima_actividad"; // última vez que tocaste la app
const CLAVE_LATIDO = "ryr_latido";              // última vez que la app estuvo visible en pantalla

const MENSAJE_INACTIVIDAD = "Tu sesión se cerró por inactividad. Ingresa de nuevo para continuar.";
const MENSAJE_AUSENCIA = "Tu sesión se cerró porque saliste de la aplicación por más de " + MINUTOS_AUSENCIA + " minutos. Ingresa de nuevo para continuar.";

function marcarActividad() {
  try {
    const ahora = String(Date.now());
    localStorage.setItem(CLAVE_ACTIVIDAD, ahora);
    localStorage.setItem(CLAVE_LATIDO, ahora);
  } catch (e) {}
}
function marcarLatido() {
  try { localStorage.setItem(CLAVE_LATIDO, String(Date.now())); } catch (e) {}
}
function borrarActividad() {
  try {
    localStorage.removeItem(CLAVE_ACTIVIDAD);
    localStorage.removeItem(CLAVE_LATIDO);
  } catch (e) {}
}
// Devuelve el mensaje del motivo si la sesión ya expiró, o null si sigue vigente
function motivoExpiracion() {
  try {
    const ahora = Date.now();
    const latido = Number(localStorage.getItem(CLAVE_LATIDO));
    if (latido && ahora - latido > TIEMPO_AUSENCIA_MS) return MENSAJE_AUSENCIA;
    const ultima = Number(localStorage.getItem(CLAVE_ACTIVIDAD));
    if (ultima && ahora - ultima > TIEMPO_INACTIVIDAD_MS) return MENSAJE_INACTIVIDAD;
    return null; // sin registros previos: se considera sesión recién iniciada
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorLogin, setErrorLogin] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const motivoAlAbrir = u ? motivoExpiracion() : null;
      if (u && motivoAlAbrir) {
        borrarActividad();
        setErrorLogin(motivoAlAbrir);
        setPerfil(null);
        setUsuario(null);
        setCargando(false);
        await signOut(auth);
        return;
      }
      setUsuario(u);
      if (u) {
        try {
          const refPerfil = doc(db, "usuarios", u.uid);
          const snap = await getDoc(refPerfil);
          if (snap.exists()) {
            const datos = snap.data();
            if (datos.activo === false) {
              await signOut(auth);
              setPerfil(null);
              setUsuario(null);
              setErrorLogin("Tu usuario ha sido desactivado. Contacta al administrador.");
            } else {
              setPerfil(datos);
            }
          } else {
            setPerfil({ nombre: u.email, roles: [], esAdmin: false });
          }
        } catch (e) {
          console.error("Error leyendo perfil:", e);
          setPerfil({ nombre: u.email, roles: [], esAdmin: false });
        }
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  async function iniciarSesion(correo, contrasena) {
    setErrorLogin("");
    marcarActividad();
    try {
      await signInWithEmailAndPassword(auth, correo, contrasena);
      return { ok: true };
    } catch (e) {
      let mensaje = "No se pudo iniciar sesión. Verifica tu correo y contraseña.";
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found") {
        mensaje = "Correo o contraseña incorrectos.";
      } else if (e.code === "auth/too-many-requests") {
        mensaje = "Demasiados intentos fallidos. Espera un momento e intenta de nuevo.";
      } else if (e.code === "auth/invalid-email") {
        mensaje = "El correo no tiene un formato válido.";
      }
      setErrorLogin(mensaje);
      return { ok: false, error: mensaje };
    }
  }

  async function restablecerContrasena(correo) {
    try {
      await sendPasswordResetEmail(auth, correo.trim());
      return { ok: true };
    } catch (e) {
      let mensaje = "No se pudo enviar el correo de restablecimiento.";
      if (e.code === "auth/user-not-found") mensaje = "No existe ninguna cuenta con ese correo.";
      else if (e.code === "auth/invalid-email") mensaje = "El correo no tiene un formato válido.";
      return { ok: false, error: mensaje };
    }
  }

  async function cerrarSesion() {
    borrarActividad();
    await signOut(auth);
  }

  // Mientras hay sesión abierta: registra actividad y presencia, y cierra la sesión si expira
  useEffect(() => {
    if (!usuario) return;
    marcarActividad();

    const cerrarPor = async (mensaje) => {
      borrarActividad();
      setErrorLogin(mensaje);
      await signOut(auth);
    };
    const verificar = () => {
      const motivo = motivoExpiracion();
      if (motivo) { cerrarPor(motivo); return true; }
      return false;
    };

    let ultimaEscritura = 0;
    const registrar = () => {
      if (verificar()) return;
      const ahora = Date.now();
      if (ahora - ultimaEscritura > 15000) {
        ultimaEscritura = ahora;
        marcarActividad();
      }
    };
    const alVolver = () => { if (document.visibilityState === "visible") verificar(); };
    // Latido: solo mientras la app está visible; si se detiene, es porque saliste de ella
    const latido = () => {
      if (document.visibilityState !== "visible") return;
      if (verificar()) return;
      marcarLatido();
    };

    const eventos = ["click", "keydown", "touchstart", "scroll", "mousemove"];
    eventos.forEach((ev) => window.addEventListener(ev, registrar, { passive: true }));
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", verificar);
    const intervaloLatido = setInterval(latido, 15000);
    const intervaloVerificar = setInterval(verificar, 30000);

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, registrar));
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", verificar);
      clearInterval(intervaloLatido);
      clearInterval(intervaloVerificar);
    };
  }, [usuario]);

  const tieneRol = (rol) => {
    if (!perfil) return false;
    if (perfil.esAdmin) return true;
    return Array.isArray(perfil.roles) && perfil.roles.includes(rol);
  };

  return (
    <AuthContext.Provider value={{ usuario, perfil, cargando, errorLogin, iniciarSesion, cerrarSesion, tieneRol, restablecerContrasena }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
