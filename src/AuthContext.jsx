import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorLogin, setErrorLogin] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
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

  async function cerrarSesion() {
    await signOut(auth);
  }

  const tieneRol = (rol) => {
    if (!perfil) return false;
    if (perfil.esAdmin) return true;
    return Array.isArray(perfil.roles) && perfil.roles.includes(rol);
  };

  return (
    <AuthContext.Provider value={{ usuario, perfil, cargando, errorLogin, iniciarSesion, cerrarSesion, tieneRol }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
