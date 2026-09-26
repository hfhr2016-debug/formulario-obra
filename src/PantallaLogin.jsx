import React, { useState } from "react";
import { useAuth } from "./AuthContext";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

export default function PantallaLogin() {
  const { iniciarSesion, errorLogin } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    if (!correo || !contrasena) return;
    setCargando(true);
    await iniciarSesion(correo.trim(), contrasena);
    setCargando(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-[19px] font-bold tracking-wide" style={{ color: NAVY, fontFamily: "'Space Grotesk', sans-serif" }}>
            SAIEA OBRAS
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "#8A8F98" }}>
            Reformas y Remodelaciones
          </div>
        </div>

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
        </form>

        <div className="text-[10.5px] text-center mt-4" style={{ color: "#8A8F98" }}>
          ¿No tienes cuenta o la olvidaste? Contacta al administrador del sistema.
        </div>
      </div>
    </div>
  );
}
