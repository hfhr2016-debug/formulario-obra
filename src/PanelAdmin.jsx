import React, { useState, useEffect } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useAuth } from "./AuthContext";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const firebaseConfigSecundaria = {
  apiKey: "AIzaSyA44nrJMcN6zew_2XhhTgWdszcZdsH7SJs",
  authDomain: "saiea-obras.firebaseapp.com",
  projectId: "saiea-obras",
  storageBucket: "saiea-obras.firebasestorage.app",
  messagingSenderId: "244389186658",
  appId: "1:244389186658:web:3f520a09288dd0b629953b",
};

const ROLES_DISPONIBLES = [
  { id: "tecnica", nombre: "Gestión Técnica" },
  { id: "sst", nombre: "Gestión SST" },
  { id: "ambiental", nombre: "Gestión Ambiental" },
];

export default function PanelAdmin({ onVolver }) {
  const { perfil } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rolesNuevo, setRolesNuevo] = useState({ tecnica: false, sst: false, ambiental: false });
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function cargarUsuarios() {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      const lista = [];
      snap.forEach((d) => lista.push({ uid: d.id, ...d.data() }));
      lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      setUsuarios(lista);
    } catch (e) {
      console.error(e);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function crearUsuario(e) {
    e.preventDefault();
    setError("");
    if (!nombre || !correo || !contrasena) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }
    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCreando(true);
    // App secundaria para no perder la sesión del admin al crear el nuevo usuario
    const appSecundaria = initializeApp(firebaseConfigSecundaria, "secundaria-" + Date.now());
    const authSecundaria = getAuth(appSecundaria);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundaria, correo.trim(), contrasena);
      const rolesArray = Object.keys(rolesNuevo).filter((r) => rolesNuevo[r]);
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nombre,
        correo: correo.trim(),
        roles: rolesArray,
        esAdmin: false,
        activo: true,
        creadoEn: new Date().toISOString(),
      });
      await authSecundaria.signOut();
      setNombre(""); setCorreo(""); setContrasena("");
      setRolesNuevo({ tecnica: false, sst: false, ambiental: false });
      setMostrarForm(false);
      await cargarUsuarios();
    } catch (err) {
      let msg = "No se pudo crear el usuario.";
      if (err.code === "auth/email-already-in-use") msg = "Ese correo ya está registrado.";
      else if (err.code === "auth/invalid-email") msg = "El correo no es válido.";
      else if (err.code === "auth/weak-password") msg = "La contraseña es muy débil (mínimo 6 caracteres).";
      setError(msg);
    } finally {
      await deleteApp(appSecundaria);
      setCreando(false);
    }
  }

  async function alternarActivo(u) {
    try {
      await updateDoc(doc(db, "usuarios", u.uid), { activo: !u.activo });
      await cargarUsuarios();
    } catch (e) {
      alert("No se pudo actualizar. Intenta de nuevo.");
    }
  }

  async function alternarRol(u, rolId) {
    const rolesActuales = u.roles || [];
    const nuevos = rolesActuales.includes(rolId)
      ? rolesActuales.filter((r) => r !== rolId)
      : [...rolesActuales, rolId];
    try {
      await updateDoc(doc(db, "usuarios", u.uid), { roles: nuevos });
      await cargarUsuarios();
    } catch (e) {
      alert("No se pudo actualizar. Intenta de nuevo.");
    }
  }

  if (!perfil?.esAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Acceso restringido</div>
        <div className="text-[12.5px] text-gray-500 mb-5">Solo el administrador puede ver esta sección.</div>
        <button onClick={onVolver} className="px-5 py-2.5 rounded-lg text-white font-semibold text-[13px]" style={{ background: NAVY }}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <button onClick={onVolver} className="text-white/80 text-[12.5px] mb-2">← Volver</button>
        <div className="text-white font-bold text-[16px]">Administrar Usuarios</div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="w-full py-3 rounded-xl text-white font-bold text-[13.5px] mb-4"
          style={{ background: GOLD }}
        >
          {mostrarForm ? "✕ Cancelar" : "+ Agregar nuevo profesional"}
        </button>

        {mostrarForm && (
          <form onSubmit={crearUsuario} className="bg-white rounded-xl p-4 mb-5" style={{ border: `1px solid ${LINE}` }}>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Nombre completo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }} />

            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Correo</label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }} />

            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Contraseña (mínimo 6 caracteres)</label>
            <input type="text" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }} />

            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Acceso a:</label>
            {ROLES_DISPONIBLES.map((r) => (
              <label key={r.id} className="flex items-center gap-2 mb-1.5 text-[12.5px]" style={{ color: NAVY }}>
                <input type="checkbox" checked={rolesNuevo[r.id]} onChange={(e) => setRolesNuevo({ ...rolesNuevo, [r.id]: e.target.checked })} />
                {r.nombre}
              </label>
            ))}

            {error && (
              <div className="text-[11.5px] mt-2 px-2.5 py-2 rounded-lg" style={{ background: "#FDECEC", color: "#B42318" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={creando} className="w-full mt-3 py-2.5 rounded-lg text-white font-bold text-[13px]" style={{ background: creando ? "#9AA0A8" : NAVY }}>
              {creando ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        )}

        <div className="text-[12px] font-semibold mb-2" style={{ color: NAVY }}>
          Usuarios registrados {!cargando && `(${usuarios.length})`}
        </div>

        {cargando ? (
          <div className="text-[12px] text-gray-500">Cargando...</div>
        ) : usuarios.length === 0 ? (
          <div className="text-[12px] text-gray-500">Todavía no hay usuarios registrados.</div>
        ) : (
          usuarios.map((u) => (
            <div key={u.uid} className="bg-white rounded-xl p-3.5 mb-2.5" style={{ border: `1px solid ${LINE}`, opacity: u.activo === false ? 0.55 : 1 }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-semibold" style={{ color: NAVY }}>
                  {u.nombre} {u.esAdmin && <span style={{ color: GOLD }}>(admin)</span>}
                </div>
                {!u.esAdmin && (
                  <button
                    onClick={() => alternarActivo(u)}
                    className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: u.activo === false ? "#E8E8E8" : "#E7F5EC", color: u.activo === false ? "#666" : "#1B7A43" }}
                  >
                    {u.activo === false ? "Desactivado" : "Activo"}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-gray-500 mb-2">{u.correo}</div>
              {!u.esAdmin && (
                <div className="flex flex-wrap gap-1.5">
                  {ROLES_DISPONIBLES.map((r) => {
                    const activo = (u.roles || []).includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => alternarRol(u, r.id)}
                        className="text-[10.5px] px-2.5 py-1 rounded-full border"
                        style={activo ? { background: "#FFF8E8", borderColor: GOLD, color: NAVY } : { background: "white", borderColor: LINE, color: "#9AA0A8" }}
                      >
                        {activo ? "✓ " : ""}{r.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
