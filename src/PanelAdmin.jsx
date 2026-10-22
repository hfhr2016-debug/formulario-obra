import React, { useState, useEffect } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ROLES_CP, nivelCP } from "./cpPermisos";
import { CARGOS, nivelModulo, gestionesDeCargo } from "./cargos";
import { collection, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useAuth } from "./AuthContext";
import ResumenRoles from "./ResumenRoles";
import { errorClave, REQUISITOS_CLAVE } from "./clave";
import ReinicioApp from "./ReinicioApp";
import { limpiarEquipo, marcarVisto } from "./reinicioApp";
import { publicarReinicio } from "./reinicioNube";
import { detenerSync } from "./sincronizarFirestore";

function nombresProyectosConocidos() {
  try {
    const l = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
    return (Array.isArray(l) ? l : []).map((p) => p && p.datos && p.datos.proyecto).filter(Boolean);
  } catch (e) { return []; }
}

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
  { id: "calidad", nombre: "Gestión de Calidad" },
  { id: "compras", nombre: "Gestión de Compras" },
  { id: "presupuesto", nombre: "Control Presupuestal" },
];

const Req = () => <span aria-hidden="true" style={{ color: "#E53935", fontWeight: 700 }}> *</span>;   // marca de campo obligatorio

export default function PanelAdmin({ onVolver, modulosPorArea = {} }) {
  const { perfil, usuario: usuarioAuth } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  // Cambiar nombre o correo de una persona: solo lo hace el administrador
  const [edicion, setEdicion] = useState(null);   // { uid, modo: "nombre" | "correo", valor, clave, msg, ok, ocupado }

  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verRoles, setVerRoles] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rolCPNuevo, setRolCPNuevo] = useState("");
  const [cargoNuevo, setCargoNuevo] = useState("");
  const [rolesNuevo, setRolesNuevo] = useState({ tecnica: false, sst: false, ambiental: false, calidad: false, compras: false, presupuesto: false });
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function cargarUsuarios() {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      const lista = [];
      snap.forEach((d) => { const x = d.data(); if (!x.oculto) lista.push({ uid: d.id, ...x }); });   // los accesos reemplazados por un cambio de correo no se listan
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
    if (errorClave(contrasena)) {
      setError(errorClave(contrasena));
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
        rolCP: rolesNuevo.presupuesto ? rolCPNuevo : "",
        cargo: cargoNuevo,
        proyectos: "todos",
        esAdmin: false,
        activo: true,
        creadoEn: new Date().toISOString(),
      });
      await authSecundaria.signOut();
      setNombre(""); setCorreo(""); setContrasena(""); setCargoNuevo("");
      setRolesNuevo({ tecnica: false, sst: false, ambiental: false, calidad: false, compras: false, presupuesto: false });
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

  const abrirEdicion = (u, modo) => setEdicion({ uid: u.uid, modo, valor: modo === "nombre" ? (u.nombre || "") : "", clave: "", msg: "", ok: false, ocupado: false });
  const ponerEd = (c) => setEdicion((e) => (e ? { ...e, ...c } : e));
  async function guardarNombre(u) {
    const nuevo = (edicion.valor || "").trim();
    if (nuevo.length < 3) return ponerEd({ msg: "Escribe el nombre completo." });
    ponerEd({ ocupado: true, msg: "" });
    try { await updateDoc(doc(db, "usuarios", u.uid), { nombre: nuevo }); setEdicion(null); await cargarUsuarios(); }
    catch (e) { ponerEd({ ocupado: false, msg: "No se pudo cambiar el nombre. Intenta de nuevo." }); }
  }
  // Cambiar el correo: se crea el acceso con el correo nuevo (y una contraseña temporal), se le pasa todo el perfil y el acceso viejo queda desactivado y oculto.
  async function cambiarCorreo(u) {
    const nuevo = (edicion.valor || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nuevo)) return ponerEd({ msg: "El correo no es válido." });
    if (nuevo === String(u.correo || "").toLowerCase()) return ponerEd({ msg: "Ese ya es el correo actual." });
    if (errorClave(edicion.clave)) return ponerEd({ msg: errorClave(edicion.clave) });
    if (usuarioAuth && usuarioAuth.uid === u.uid) return ponerEd({ msg: "No puedes cambiar tu propio correo. Pídele a otra persona administradora que lo haga." });
    if (!window.confirm(`Se creará el acceso con ${nuevo} y el correo ${u.correo || "anterior"} dejará de funcionar. ¿Continuar?`)) return;
    ponerEd({ ocupado: true, msg: "" });
    const appSecundaria = initializeApp(firebaseConfigSecundaria, "secundaria-" + Date.now());
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(appSecundaria), nuevo, edicion.clave);
      const { uid: _viejo, ...copia } = u;
      await setDoc(doc(db, "usuarios", cred.user.uid), { ...copia, correo: nuevo, activo: true, correoAnterior: u.correo || "", reemplazaA: u.uid, creadoEn: new Date().toISOString() });
      await updateDoc(doc(db, "usuarios", u.uid), { activo: false, oculto: true, reemplazadoPor: cred.user.uid });
      try { await getAuth(appSecundaria).signOut(); } catch (e) { /* se cierra igual */ }
      ponerEd({ ocupado: false, ok: true, msg: `Listo. ${u.nombre} entra con ${nuevo} y la contraseña temporal que escribiste. Después puede cambiarla desde «Mi cuenta».` });
      await cargarUsuarios();
    } catch (err) {
      let msg = "No se pudo cambiar el correo. Intenta de nuevo.";
      if (err && err.code === "auth/email-already-in-use") msg = "Ese correo ya está registrado en otro usuario.";
      else if (err && err.code === "auth/invalid-email") msg = "El correo no es válido.";
      else if (err && err.code === "auth/weak-password") msg = "La contraseña temporal es muy débil.";
      ponerEd({ ocupado: false, msg });
    } finally { try { await deleteApp(appSecundaria); } catch (e) { /* nada */ } }
  }

  async function alternarActivo(u) {
    try {
      await updateDoc(doc(db, "usuarios", u.uid), { activo: !u.activo });
      await cargarUsuarios();
    } catch (e) {
      alert("No se pudo actualizar. Intenta de nuevo.");
    }
  }

  async function cambiarRolCP(u, rolCP) {
    try {
      await updateDoc(doc(db, "usuarios", u.uid), { rolCP });
      await cargarUsuarios();
    } catch (e) {
      alert("No se pudo actualizar. Intenta de nuevo.");
    }
  }

  async function guardarCampo(u, campos) {
    try {
      await updateDoc(doc(db, "usuarios", u.uid), campos);
      await cargarUsuarios();
    } catch (e) {
      alert("No se pudo actualizar. Intenta de nuevo.");
    }
  }
  // Al elegir el cargo se marcan solas las Gestiones que ese cargo usa (solo agrega; nunca quita las que ya tenía)
  const cambiarCargo = (u, cargo) => {
    const roles = Array.from(new Set([...(u.roles || []), ...gestionesDeCargo(cargo)]));
    return guardarCampo(u, { cargo, roles });
  };
  const ajustarTodosPorCargo = async () => {
    const lista = usuarios.filter((u) => !u.esAdmin && u.cargo);
    const cambios = lista.map((u) => [u, Array.from(new Set([...(u.roles || []), ...gestionesDeCargo(u.cargo)]))]).filter(([u, r]) => r.length !== (u.roles || []).length);
    if (!cambios.length) { alert("Todas las personas con cargo ya tienen marcadas las Gestiones de su cargo."); return; }
    if (!window.confirm(`Se agregarán las Gestiones que usa su cargo a ${cambios.length} persona(s). No se quita ninguna. ¿Continuar?`)) return;
    try { for (const [u, r] of cambios) await updateDoc(doc(db, "usuarios", u.uid), { roles: r }); await cargarUsuarios(); }
    catch (e) { alert("No se pudo completar. Intenta de nuevo."); }
  };
  const [permisosAbierto, setPermisosAbierto] = useState("");
  // Permiso individual de un módulo: "" = el que le da su cargo; E = edita; V = solo consulta; N = sin acceso
  const cambiarPermisoExtra = (u, moduloId, valor) => {
    const actual = { ...(u.permisosExtra || {}) };
    if (!valor) delete actual[moduloId]; else actual[moduloId] = valor;
    return guardarCampo(u, { permisosExtra: actual });
  };
  const ponerTodosLosProyectos = (u, todos) => guardarCampo(u, { proyectos: todos ? "todos" : [] });
  const agregarProyecto = (u, nombreProy) => {
    const n = String(nombreProy || "").trim();
    if (!n) return;
    const actuales = Array.isArray(u.proyectos) ? u.proyectos : [];
    if (actuales.some((x) => String(x).trim().toLowerCase() === n.toLowerCase())) return;
    return guardarCampo(u, { proyectos: [...actuales, n] });
  };
  const quitarProyecto = (u, n) => guardarCampo(u, { proyectos: (Array.isArray(u.proyectos) ? u.proyectos : []).filter((x) => x !== n) });

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

  if (verRoles) return <ResumenRoles usuarios={usuarios} modulosPorArea={modulosPorArea} onVolver={() => setVerRoles(false)} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <button onClick={onVolver} className="text-white/80 text-[12.5px] mb-2">← Volver</button>
        <div className="text-white font-bold text-[16px]">Administrar Usuarios</div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <button type="button" data-ver-roles onClick={() => setVerRoles(true)} className="w-full py-3 rounded-xl font-bold text-[13.5px] mb-3 border" style={{ borderColor: NAVY, color: NAVY, background: "white" }}>
          🔐 Resumen de roles y permisos
        </button>
        <button type="button" data-ajustar-cargos onClick={ajustarTodosPorCargo} className="w-full py-2.5 rounded-xl font-semibold text-[12.5px] mb-3 border" style={{ borderColor: LINE, color: NAVY, background: "white" }}>
          Completar las Gestiones de todos según su cargo
        </button>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="w-full py-3 rounded-xl text-white font-bold text-[13.5px] mb-4"
          style={{ background: GOLD }}
        >
          {mostrarForm ? "✕ Cancelar" : "+ Agregar nuevo profesional"}
        </button>

        {mostrarForm && (
          <form onSubmit={crearUsuario} className="bg-white rounded-xl p-4 mb-5" style={{ border: `1px solid ${LINE}` }}>
            <div data-nota-req className="text-[10.5px] text-gray-500 mb-2"><span style={{ color: "#E53935", fontWeight: 700 }}>*</span> Campo obligatorio</div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Nombre completo<Req /></label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }} />

            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Correo<Req /></label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }} />

            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Contraseña<Req /></label>
            <input type="text" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-1" style={{ borderColor: LINE }} />
            <div data-requisitos-clave className="text-[10.5px] text-gray-500 mb-3">{REQUISITOS_CLAVE}</div>

            <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Cargo</label>
            <select value={cargoNuevo} onChange={(e) => { setCargoNuevo(e.target.value); const g = gestionesDeCargo(e.target.value); if (g.length) setRolesNuevo((r) => { const n = { ...r }; g.forEach((x) => { n[x] = true; }); return n; }); }} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-3" style={{ borderColor: LINE }}>
              <option value="">Elegir cargo…</option>
              {CARGOS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: NAVY }}>Acceso a:</label>
            {ROLES_DISPONIBLES.map((r) => (
              <label key={r.id} className="flex items-center gap-2 mb-1.5 text-[12.5px]" style={{ color: NAVY }}>
                <input type="checkbox" checked={rolesNuevo[r.id]} onChange={(e) => setRolesNuevo({ ...rolesNuevo, [r.id]: e.target.checked })} />
                {r.nombre}
              </label>
            ))}
            {rolesNuevo.presupuesto && (
              <div className="mb-3 mt-1">
                <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Cargo en Control Presupuestal</label>
                <select value={rolCPNuevo} onChange={(e) => setRolCPNuevo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option value="">Elegir cargo…</option>
                  {ROLES_CP.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            )}

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
              <div className="flex gap-3 mb-2">
                <button type="button" data-cambiar-nombre onClick={() => abrirEdicion(u, "nombre")} className="text-[10.5px] underline" style={{ color: NAVY }}>Cambiar nombre</button>
                <button type="button" data-cambiar-correo onClick={() => abrirEdicion(u, "correo")} className="text-[10.5px] underline" style={{ color: NAVY }}>Cambiar correo</button>
              </div>
              {edicion && edicion.uid === u.uid && (
                <div data-edicion className="mb-2 p-2 rounded-lg" style={{ background: "#F7F7F5", border: `1px solid ${LINE}` }}>
                  <label className="text-[10.5px] font-semibold" style={{ color: NAVY }}>{edicion.modo === "nombre" ? "Nombre completo" : "Correo nuevo"}<Req /></label>
                  <input data-ed-valor type={edicion.modo === "correo" ? "email" : "text"} value={edicion.valor} onChange={(e) => ponerEd({ valor: e.target.value })} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
                  {edicion.modo === "correo" && (<>
                    <label className="text-[10.5px] font-semibold" style={{ color: NAVY }}>Contraseña temporal<Req /></label>
                    <input data-ed-clave type="text" value={edicion.clave} onChange={(e) => ponerEd({ clave: e.target.value })} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} autoComplete="off" />
                    <div className="text-[10px] text-gray-500 mb-1.5">{REQUISITOS_CLAVE}</div>
                    <div className="text-[10px] text-gray-500 mb-1.5">Se crea el acceso con el correo nuevo y se le pasa todo lo de la persona. El correo anterior deja de funcionar. Entrégale la contraseña temporal.</div>
                  </>)}
                  {edicion.msg && <div data-ed-msg className="text-[11px] mb-1.5" style={{ color: edicion.ok ? "#1E6B3A" : "#B3261E" }}>{edicion.msg}</div>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEdicion(null)} className="flex-1 py-1.5 rounded border text-[11.5px]" style={{ borderColor: LINE, color: NAVY, background: "white" }}>{edicion.ok ? "Cerrar" : "Cancelar"}</button>
                    {!edicion.ok && <button type="button" data-ed-guardar disabled={edicion.ocupado} onClick={() => (edicion.modo === "nombre" ? guardarNombre(u) : cambiarCorreo(u))} className="flex-1 py-1.5 rounded text-white text-[11.5px] font-semibold" style={{ background: edicion.ocupado ? "#9AA0A8" : NAVY }}>{edicion.ocupado ? "Guardando…" : "Guardar"}</button>}
                  </div>
                </div>
              )}
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
              {!u.esAdmin && (
                <div className="mt-2" data-cargo-proyectos>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10.5px]" style={{ color: NAVY }}>Cargo:</span>
                    <select data-cargo value={u.cargo || ""} onChange={(e) => cambiarCargo(u, e.target.value)} className="text-[11px] border rounded px-1.5 py-1" style={{ borderColor: LINE }}>
                      <option value="">Sin cargo</option>
                      {CARGOS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] mb-1" style={{ color: NAVY }}>
                    <input type="checkbox" data-todos-proyectos checked={!Array.isArray(u.proyectos)} onChange={(e) => ponerTodosLosProyectos(u, e.target.checked)} />
                    Ve todos los proyectos
                  </label>
                  {Array.isArray(u.proyectos) && (
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {u.proyectos.length === 0 && <span className="text-[10.5px]" style={{ color: "#B3401F" }}>Sin proyectos asignados: no ve ninguno.</span>}
                        {u.proyectos.map((n) => (
                          <span key={n} data-proyecto-asignado className="text-[10.5px] px-2 py-1 rounded-full border" style={{ background: "#FFF8E8", borderColor: GOLD, color: NAVY }}>
                            {n} <button type="button" aria-label={`Quitar ${n}`} onClick={() => quitarProyecto(u, n)} className="ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input list="lista-proyectos-admin" data-agregar-proyecto placeholder="Nombre del proyecto o frente…" className="flex-1 border rounded px-2 py-1 text-[11px]" style={{ borderColor: LINE }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarProyecto(u, e.currentTarget.value); e.currentTarget.value = ""; } }} />
                        <button type="button" data-boton-agregar-proyecto className="text-[11px] px-2.5 py-1 rounded border font-semibold" style={{ borderColor: NAVY, color: NAVY }}
                          onClick={(e) => { const inp = e.currentTarget.previousSibling; agregarProyecto(u, inp.value); inp.value = ""; }}>Agregar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!u.esAdmin && (
                <div className="mt-2">
                  <button type="button" data-abrir-permisos onClick={() => setPermisosAbierto(permisosAbierto === u.uid ? "" : u.uid)} className="text-[10.5px] underline" style={{ color: NAVY }}>
                    {permisosAbierto === u.uid ? "Ocultar permisos individuales" : `Permisos individuales${u.permisosExtra && Object.keys(u.permisosExtra).length ? ` (${Object.keys(u.permisosExtra).length})` : ""}`}
                  </button>
                  {permisosAbierto === u.uid && (
                    <div data-permisos-individuales className="mt-1.5 p-2 rounded-lg" style={{ background: "#F7F7F5", border: `1px solid ${LINE}` }}>
                      <div className="text-[10.5px] mb-1.5" style={{ color: "#6B7280" }}>Por defecto cada módulo sigue el cargo de la persona. Aquí puedes dar o quitar acceso a un módulo en particular.</div>
                      {[["tecnica", "Gestión Técnica"], ["sst", "Gestión SG-SST"], ["ambiental", "Gestión Ambiental"], ["calidad", "Gestión de Calidad"], ["compras", "Gestión de Compras"], ["presupuesto", "Control Presupuestal"]].filter(([a]) => (u.roles || []).includes(a)).map(([area, titulo]) => (
                        <div key={area} className="mb-2">
                          <div className="text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>{titulo}</div>
                          {(modulosPorArea[area] || []).filter((m) => m.activo !== false).map((m) => {
                            const porCargo = area === "presupuesto" ? nivelCP({ roles: ["presupuesto"], cargo: u.cargo, rolCP: u.rolCP }, m.id) : nivelModulo({ cargo: u.cargo }, m.id);
                            const textoCargo = porCargo === "E" ? "Editar" : porCargo === "V" ? "Solo consulta" : "Sin acceso";
                            return (
                              <div key={m.id} className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10.5px]" style={{ color: NAVY }}>{m.nombre}</span>
                                <select data-permiso-modulo={m.id} value={(u.permisosExtra || {})[m.id] || ""} onChange={(e) => cambiarPermisoExtra(u, m.id, e.target.value)} className="text-[10.5px] border rounded px-1 py-0.5" style={{ borderColor: LINE, maxWidth: 150 }}>
                                  <option value="">Según cargo ({u.cargo ? textoCargo : "Editar"})</option>
                                  <option value="E">Editar</option>
                                  <option value="V">Solo consulta</option>
                                  <option value="N">Sin acceso</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!u.esAdmin && (u.roles || []).includes("presupuesto") && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10.5px]" style={{ color: NAVY }}>Cargo en Control Presupuestal:</span>
                  <select value={u.rolCP || ""} onChange={(e) => cambiarRolCP(u, e.target.value)} className="text-[11px] border rounded px-1.5 py-1" style={{ borderColor: u.rolCP ? LINE : "#B3401F" }}>
                    <option value="">Sin asignar (sin acceso)</option>
                    {ROLES_CP.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <datalist id="lista-proyectos-admin">
        {nombresProyectosConocidos().map((n) => <option key={n} value={n} />)}
      </datalist>
      <ReinicioApp
        onLimpiarEquipo={async () => { await detenerSync({ sinSubir: true }); limpiarEquipo(window.localStorage); }}
        onLimpiarTodos={async () => { const marca = await publicarReinicio((perfil && perfil.email) || ""); await detenerSync({ sinSubir: true }); limpiarEquipo(window.localStorage); marcarVisto(window.localStorage, marca); }}
      />
    </div>
  );
}
