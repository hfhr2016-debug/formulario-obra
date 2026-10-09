import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { faceIdDisponible, faceIdActivado, faceIdRegistrar, faceIdGuardar, faceIdIngresar, faceIdDesactivar, faceIdCorreoGuardado } from "./faceId";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

export default function PantallaLogin() {
  const { iniciarSesion, errorLogin, restablecerContrasena } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);
  const [modo, setModo] = useState("login");
  const [correoRecuperar, setCorreoRecuperar] = useState("");
  const [mensajeRecuperar, setMensajeRecuperar] = useState("");
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false);

  const [faceDisp, setFaceDisp] = useState(false);
  const [faceAct, setFaceAct] = useState(false);
  const [activarFace, setActivarFace] = useState(false);
  const [avisoFace, setAvisoFace] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const d = await faceIdDisponible();
      const a = d ? await faceIdActivado() : false;
      if (vivo) { setFaceDisp(d); setFaceAct(a); }
    })();
    return () => { vivo = false; };
  }, []);

  async function manejarSubmit(e) {
    e.preventDefault();
    if (!correo || !contrasena) return;
    setCargando(true);
    setAvisoFace("");
    // Si pidió activar Face ID, se registra primero (necesita el gesto del usuario)
    let idCred = null;
    if (faceDisp && activarFace) {
      try { idCred = await faceIdRegistrar(correo.trim()); }
      catch { setAvisoFace("No se activó Face ID (se canceló). Puedes volver a intentarlo."); }
    }
    const r = await iniciarSesion(correo.trim(), contrasena);
    if (r && r.ok && idCred) {
      try { await faceIdGuardar(idCred, correo.trim(), contrasena); } catch { /* el ingreso ya se hizo */ }
    }
    setCargando(false);
  }

  async function manejarFaceId() {
    setCargando(true);
    setAvisoFace("");
    try {
      const { correo: c, contrasena: p } = await faceIdIngresar();
      const r = await iniciarSesion(c, p);
      if (r && !r.ok) {
        // La contraseña cambió o la cuenta ya no es válida: se borra lo guardado
        await faceIdDesactivar();
        setFaceAct(false);
        setCorreo(c);
        setAvisoFace("Face ID ya no es válido para esta cuenta (cambió la contraseña). Ingresa con tu contraseña y vuelve a activarlo.");
      }
    } catch {
      setAvisoFace("No se pudo verificar con Face ID. Puedes ingresar con tu correo y contraseña.");
    }
    setCargando(false);
  }

  async function manejarRecuperar(e) {
    e.preventDefault();
    if (!correoRecuperar) return;
    setEnviandoRecuperar(true);
    setMensajeRecuperar("");
    const resultado = await restablecerContrasena(correoRecuperar);
    if (resultado.ok) {
      setMensajeRecuperar("✓ Listo. Revisa tu correo (y la carpeta de spam) — te enviamos un enlace para crear una nueva contraseña.");
    } else {
      setMensajeRecuperar(resultado.error);
    }
    setEnviandoRecuperar(false);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(27,42,69,0.55), rgba(27,42,69,0.80)), url('/fondo-login.jpg')`,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="w-full text-center py-8 px-6 mb-8" style={{ background: NAVY }}>
        <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-[77px] w-auto mx-auto mb-3" />
        <div className="text-[19px] font-bold tracking-wide" style={{ color: GOLD, fontFamily: "'Space Grotesk', sans-serif" }}>
          SAIEA OBRAS
        </div>
        <div className="text-[11.5px] mt-1" style={{ color: "white" }}>
          Reformas y Remodelaciones
        </div>
      </div>

      <div className="w-full max-w-xs px-6">
        {modo === "login" ? (
        <form onSubmit={manejarSubmit} className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${LINE}` }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: NAVY }}>
            Iniciar sesión
          </div>

          <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full border rounded-lg px-3 py-2.5 text-[13.5px] mb-3"
            style={{ borderColor: LINE }}
            autoComplete="username"
          />

          <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Contraseña</label>
          <div className="relative mb-1">
            <input
              type={verContrasena ? "text" : "password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              className="w-full border rounded-lg px-3 py-2.5 text-[13.5px] pr-16"
              style={{ borderColor: LINE }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setVerContrasena(!verContrasena)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px]"
              style={{ color: NAVY }}
            >
              {verContrasena ? "Ocultar" : "Ver"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setModo("recuperar"); setCorreoRecuperar(correo); setMensajeRecuperar(""); }}
            className="text-[11px] mb-1"
            style={{ color: NAVY }}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {errorLogin && (
            <div className="text-[11.5px] mt-2 mb-1 px-2.5 py-2 rounded-lg" style={{ background: "#FDECEC", color: "#B42318" }}>
              {errorLogin}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-4 py-3 rounded-xl text-white font-bold text-[13.5px]"
            style={{ background: cargando ? "#9AA0A8" : GOLD }}
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          {faceDisp && !faceAct && (
            <label className="flex items-start gap-2 mt-3 text-[11.5px]" style={{ color: NAVY }}>
              <input type="checkbox" checked={activarFace} onChange={(e) => setActivarFace(e.target.checked)} className="mt-0.5" />
              <span>Activar Face ID / huella en este dispositivo para ingresar más rápido la próxima vez</span>
            </label>
          )}

          {faceDisp && faceAct && (
            <>
              <div className="flex items-center gap-2 my-3 text-[10.5px]" style={{ color: "#8A93A0" }}>
                <div className="flex-1 h-px" style={{ background: LINE }} /> o <div className="flex-1 h-px" style={{ background: LINE }} />
              </div>
              <button
                type="button"
                onClick={manejarFaceId}
                disabled={cargando}
                className="w-full py-3 rounded-xl font-bold text-[13.5px] border"
                style={{ borderColor: NAVY, color: NAVY, background: "white" }}
              >
                Entrar con Face ID / huella
              </button>
              <button
                type="button"
                onClick={async () => { await faceIdDesactivar(); setFaceAct(false); setAvisoFace("Face ID desactivado en este dispositivo."); }}
                className="w-full text-center mt-2 text-[10.5px]"
                style={{ color: "#8A93A0" }}
              >
                Desactivar Face ID en este dispositivo
              </button>
            </>
          )}

          {avisoFace && (
            <div className="text-[11.5px] mt-3 px-2.5 py-2 rounded-lg" style={{ background: "#FFF6E0", color: "#7A5A00" }}>
              {avisoFace}
            </div>
          )}
        </form>
        ) : (
        <form onSubmit={manejarRecuperar} className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${LINE}` }}>
          <div className="text-[14px] font-bold mb-1.5" style={{ color: NAVY }}>
            Restablecer contraseña
          </div>
          <div className="text-[11.5px] text-gray-500 mb-4">
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </div>

          <label className="block text-[11px] font-semibold mb-1" style={{ color: NAVY }}>Correo</label>
          <input
            type="email"
            value={correoRecuperar}
            onChange={(e) => setCorreoRecuperar(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full border rounded-lg px-3 py-2.5 text-[13.5px] mb-3"
            style={{ borderColor: LINE }}
          />

          {mensajeRecuperar && (
            <div
              className="text-[11.5px] mt-1 mb-2 px-2.5 py-2 rounded-lg"
              style={mensajeRecuperar.startsWith("✓") ? { background: "#E7F5EC", color: "#1B7A43" } : { background: "#FDECEC", color: "#B42318" }}
            >
              {mensajeRecuperar}
            </div>
          )}

          <button
            type="submit"
            disabled={enviandoRecuperar}
            className="w-full mt-2 py-3 rounded-xl text-white font-bold text-[13.5px]"
            style={{ background: enviandoRecuperar ? "#9AA0A8" : GOLD }}
          >
            {enviandoRecuperar ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>

          <button
            type="button"
            onClick={() => { setModo("login"); setMensajeRecuperar(""); }}
            className="w-full text-center mt-3 text-[11.5px]"
            style={{ color: NAVY }}
          >
            ← Volver a iniciar sesión
          </button>
        </form>
        )}

        <div className="text-[10.5px] text-center mt-4 mb-8" style={{ color: "white", opacity: 0.7 }}>
          ¿No tienes cuenta? Contacta al administrador del sistema.
        </div>
      </div>
    </div>
  );
}
