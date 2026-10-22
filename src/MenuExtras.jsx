// MenuExtras.jsx — Mi cuenta, Estado de sincronización, Respaldo, Soporte, Términos y Novedades del menú, más las preferencias
// de la persona (tamaño de letra). Se guarda solo en este equipo. El cierre automático por inactividad vive en AuthContext.jsx.
import { useState, useEffect } from "react";
import { PREFIJO_DATOS } from "./reinicioApp";
import { errorClave, REQUISITOS_CLAVE } from "./clave";

const NAVY = "#1B2A45", GOLD = "#B8893B", PAPER = "#F7F7F5", LINE = "#E3E0D8";
export const SOPORTE = { correo: "saieaobras@gmail.com", whatsapp: "" };   // datos de contacto de soporte: se llenan aquí cuando se definan

const CLAVE_PREFS = "saiea_prefs_equipo";
export const LETRAS = [["100", "Normal"], ["112", "Grande"], ["125", "Muy grande"]];
export function leerPrefs() {
  try { const p = JSON.parse(localStorage.getItem(CLAVE_PREFS) || "{}"); return { letra: LETRAS.some((l) => l[0] === p.letra) ? p.letra : "100" }; }
  catch (e) { return { letra: "100" }; }
}
export function guardarPrefs(cambio) {
  const p = { ...leerPrefs(), ...cambio };
  try { localStorage.setItem(CLAVE_PREFS, JSON.stringify(p)); } catch (e) { /* sin almacenamiento: vale solo mientras esté abierta */ }
  aplicarPrefs(p);
  return p;
}
export function aplicarPrefs(p = leerPrefs()) {
  if (typeof document === "undefined" || !document.body) return;
  document.body.style.zoom = p.letra === "100" ? "" : String(Number(p.letra) / 100);
}

function Ventana({ titulo, cerrar, children, marca }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }} {...{ [marca]: true }}>
      <div className="bg-white rounded-xl p-4 w-full max-w-sm max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-[15px]" style={{ color: NAVY }}>{titulo}</div>
          <button type="button" onClick={cerrar} data-cerrar-ventana className="text-[18px] px-2">✕</button>
        </div>
        {children}
        <button type="button" onClick={cerrar} className="w-full mt-3 py-2.5 rounded-lg text-white font-semibold text-[13px]" style={{ background: NAVY }}>Cerrar</button>
      </div>
    </div>
  );
}
const Dato = ({ k, v }) => (v ? <div className="flex justify-between gap-3 py-1.5 border-b text-[12.5px]" style={{ borderColor: LINE }}><span className="text-gray-500">{k}</span><b className="text-right break-all" style={{ color: NAVY }}>{v}</b></div> : null);

export function MiCuenta({ perfil, empresa, cerrar, restablecerContrasena, eliminarMiCuenta, cambiarContrasena }) {
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [c, setC] = useState({ actual: "", nueva: "", repetir: "" });
  const [cMsg, setCMsg] = useState({ texto: "", ok: false });
  const [cOcupado, setCOcupado] = useState(false);
  const guardarClave = async () => {
    const err = !c.actual ? "Escribe tu clave actual." : errorClave(c.nueva) || (c.nueva !== c.repetir ? "La confirmación no coincide con la clave nueva." : "") || (c.nueva === c.actual ? "La clave nueva debe ser distinta de la actual." : "");
    if (err) return setCMsg({ texto: err, ok: false });
    setCOcupado(true); setCMsg({ texto: "", ok: false });
    const r = cambiarContrasena ? await cambiarContrasena(c.actual, c.nueva) : { ok: false, error: "No se pudo cambiar la clave ahora." };
    setCOcupado(false);
    if (r.ok) { setC({ actual: "", nueva: "", repetir: "" }); setCMsg({ texto: "Clave cambiada.", ok: true }); } else setCMsg({ texto: r.error, ok: false });
  };
  const enviar = async () => {
    if (!perfil?.correo) return;
    setEnviando(true); setMsg("");
    const r = restablecerContrasena ? await restablecerContrasena(perfil.correo) : { ok: false, error: "No se pudo enviar el correo ahora." };
    setEnviando(false);
    setMsg(r.ok ? "Te enviamos un correo a " + perfil.correo + " para cambiar la contraseña." : r.error);
  };
  return (
    <Ventana titulo="Mi cuenta" cerrar={cerrar} marca="data-mi-cuenta">
      <Dato k="Nombre" v={perfil?.nombre} /><Dato k="Correo" v={perfil?.correo} /><Dato k="Empresa" v={empresa} />
      <Dato k="Tipo de usuario" v={perfil?.esAdmin ? "Administrador" : "Usuario"} /><Dato k="Cargo" v={perfil?.cargo} />
      {cambiarContrasena && (
        <div data-form-clave className="mt-3 border rounded-lg p-3" style={{ borderColor: LINE }}>
          <div className="text-[12px] font-bold mb-2" style={{ color: NAVY }}>Cambiar mi clave</div>
          <input data-c="actual" type="password" autoComplete="current-password" placeholder="Clave actual" value={c.actual} onChange={(e) => setC({ ...c, actual: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-2" style={{ borderColor: LINE }} />
          <input data-c="nueva" type="password" autoComplete="new-password" placeholder="Clave nueva" value={c.nueva} onChange={(e) => setC({ ...c, nueva: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-2" style={{ borderColor: LINE }} />
          <input data-c="repetir" type="password" autoComplete="new-password" placeholder="Confirmar clave nueva" value={c.repetir} onChange={(e) => setC({ ...c, repetir: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] mb-1" style={{ borderColor: LINE }} />
          <div data-requisitos-clave className="text-[10.5px] text-gray-500 mb-2">{REQUISITOS_CLAVE}</div>
          <button type="button" data-guardar-clave onClick={guardarClave} disabled={cOcupado} className="w-full py-2 rounded-lg text-white text-[13px] font-semibold" style={{ background: NAVY }}>{cOcupado ? "Guardando…" : "Cambiar clave"}</button>
          {cMsg.texto && <div data-clave-nueva-msg className="text-[12px] mt-2" style={{ color: cMsg.ok ? "#1E6B3A" : "#B3261E" }}>{cMsg.texto}</div>}
        </div>)}
      <button type="button" data-cambiar-clave onClick={enviar} disabled={enviando || !perfil?.correo} className="w-full mt-3 py-2 rounded-lg border text-[13px] font-semibold" style={{ borderColor: NAVY, color: NAVY }}>{enviando ? "Enviando…" : "Olvidé mi clave actual: enviarme un correo"}</button>
      {msg && <div className="text-[12px] mt-2" data-clave-msg style={{ color: msg.startsWith("Te enviamos") ? "#1E6B3A" : "#B3261E" }}>{msg}</div>}
      <div className="text-[10.5px] text-gray-500 mt-2">Para cambiar tu nombre, correo o permisos, pídeselo al administrador.</div>
      {eliminarMiCuenta && <EliminarCuenta eliminarMiCuenta={eliminarMiCuenta} />}
    </Ventana>
  );
}

// Eliminar la propia cuenta: se pide escribir ELIMINAR y la contraseña. Es inmediato y no se puede deshacer.
function EliminarCuenta({ eliminarMiCuenta }) {
  const [abierto, setAbierto] = useState(false);
  const [txt, setTxt] = useState("");
  const [clave, setClave] = useState("");
  const [err, setErr] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const listo = txt.trim().toUpperCase() === "ELIMINAR" && clave.length > 0 && !ocupado;
  const eliminar = async () => {
    setOcupado(true); setErr("");
    const r = await eliminarMiCuenta(clave);
    setOcupado(false);
    if (!r.ok) setErr(r.error || "No se pudo eliminar la cuenta.");
  };
  if (!abierto) return <button type="button" data-eliminar-cuenta onClick={() => setAbierto(true)} className="w-full mt-4 py-2 rounded-lg border text-[12.5px] font-semibold" style={{ borderColor: "#B3261E", color: "#B3261E" }}>Eliminar mi cuenta</button>;
  return (
    <div className="mt-4 rounded-lg p-3 border" style={{ borderColor: "#B3261E", background: "#FDECEC" }} data-eliminar-panel>
      <div className="text-[13px] font-bold mb-1" style={{ color: "#B3261E" }}>Eliminar mi cuenta</div>
      <div className="text-[12px] mb-2" style={{ color: "#5B1A16" }}>Se borra tu usuario de inmediato y <b>no se puede deshacer</b>. Los registros que hiciste en la empresa (informes, actas, formatos) se conservan a nombre de «Usuario eliminado». Si más adelante quieres volver, el administrador tendrá que crearte un usuario nuevo.</div>
      <label className="text-[11.5px] font-semibold">Escribe ELIMINAR para confirmar</label>
      <input data-eliminar-texto value={txt} onChange={(e) => setTxt(e.target.value)} className="border rounded px-2 py-1.5 text-[13px] w-full mb-2" autoComplete="off" />
      <label className="text-[11.5px] font-semibold">Tu contraseña</label>
      <input data-eliminar-clave type="password" value={clave} onChange={(e) => setClave(e.target.value)} className="border rounded px-2 py-1.5 text-[13px] w-full mb-2" autoComplete="current-password" />
      {err && <div className="text-[12px] mb-2" data-eliminar-error style={{ color: "#B3261E" }}>{err}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setAbierto(false); setTxt(""); setClave(""); setErr(""); }} className="flex-1 py-2 rounded-lg border text-[12.5px]" style={{ borderColor: "#999", color: "#333", background: "white" }}>Cancelar</button>
        <button type="button" data-eliminar-confirmar disabled={!listo} onClick={eliminar} className="flex-1 py-2 rounded-lg text-white text-[12.5px] font-semibold" style={{ background: listo ? "#B3261E" : "#C9A5A2" }}>{ocupado ? "Eliminando…" : "Eliminar para siempre"}</button>
      </div>
    </div>
  );
}

export function EstadoSync({ cerrar }) {
  const [en, setEn] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  useEffect(() => { const a = () => setEn(true), b = () => setEn(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);
  let registros = 0;
  try { for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || "").startsWith(PREFIJO_DATOS)) registros++; } catch (e) { registros = 0; }
  return (
    <Ventana titulo="Estado de sincronización" cerrar={cerrar} marca="data-estado-sync">
      <div className="rounded-lg p-3 text-[13px] font-semibold mb-2" data-sync-estado style={{ background: en ? "#E6F4EA" : "#FFF4DB", color: en ? "#1E6B3A" : "#8A5A00" }}>
        {en ? "● En línea: tus cambios se envían y se reciben solos." : "● Sin conexión: lo que hagas se guarda en este equipo y se enviará al volver el internet."}
      </div>
      <Dato k="Conjuntos de datos en este equipo" v={String(registros)} />
      <div className="text-[10.5px] text-gray-500 mt-2">Si ves datos desactualizados, revisa que estés en línea y vuelve a entrar a la sección.</div>
    </Ventana>
  );
}

export function Respaldo({ cerrar, nombreArchivo }) {
  const [hecho, setHecho] = useState(false);
  const descargar = () => {
    const datos = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIJO_DATOS)) datos[k] = localStorage.getItem(k); } } catch (e) { /* queda lo leído */ }
    const blob = new Blob([JSON.stringify({ app: "SAIEA OBRAS", fecha: new Date().toISOString(), datos }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (nombreArchivo || "Respaldo_SAIEA") + "_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setHecho(true);
  };
  return (
    <Ventana titulo="Copia de respaldo" cerrar={cerrar} marca="data-respaldo">
      <div className="text-[12.5px] mb-3">Descarga un archivo con la información de la aplicación que hay en este equipo. Guárdalo en un lugar seguro (por ejemplo, tu correo o la nube).</div>
      <button type="button" data-descargar-respaldo onClick={descargar} className="w-full py-2.5 rounded-lg text-white font-semibold text-[13px]" style={{ background: GOLD }}>Descargar copia ahora</button>
      {hecho && <div className="text-[12px] mt-2" style={{ color: "#1E6B3A" }} data-respaldo-ok>Listo: el archivo se descargó.</div>}
      <div className="text-[10.5px] text-gray-500 mt-2">Es una copia para guardar. Tu información también está respaldada en el servidor de forma automática.</div>
    </Ventana>
  );
}

export function Soporte({ cerrar }) {
  const hay = SOPORTE.correo || SOPORTE.whatsapp;
  return (
    <Ventana titulo="Soporte" cerrar={cerrar} marca="data-soporte">
      <div className="text-[12.5px] mb-2">¿Algo no funciona o tienes una duda? Cuéntanos qué estabas haciendo y, si puedes, envía una captura de pantalla.</div>
      {hay ? (<>
        {SOPORTE.correo && <a className="block rounded-lg p-2.5 mb-2 text-[13px] font-semibold" style={{ background: PAPER, color: NAVY }} href={"mailto:" + SOPORTE.correo}>✉ {SOPORTE.correo}</a>}
        {SOPORTE.whatsapp && <a className="block rounded-lg p-2.5 text-[13px] font-semibold" style={{ background: PAPER, color: NAVY }} href={"https://wa.me/" + SOPORTE.whatsapp.replace(/\D/g, "")} target="_blank" rel="noreferrer">WhatsApp {SOPORTE.whatsapp}</a>}
      </>) : <div className="rounded-lg p-2.5 text-[12.5px]" style={{ background: PAPER, color: NAVY }}>Por ahora, escríbele al administrador de tu empresa; él nos hará llegar tu mensaje.</div>}
    </Ventana>
  );
}

export function Terminos({ cerrar }) {
  const P = ({ t, c }) => <div className="mb-2"><div className="text-[12.5px] font-bold" style={{ color: NAVY }}>{t}</div><div className="text-[12px] text-gray-700">{c}</div></div>;
  return (
    <Ventana titulo="Términos y privacidad" cerrar={cerrar} marca="data-terminos">
      <P t="Uso de la aplicación" c="SAIEA OBRAS es una herramienta de trabajo para las personas autorizadas por la empresa. Cada persona es responsable de la información que registra y de mantener privada su contraseña." />
      <P t="Tus datos" c="La información de obra pertenece a tu empresa y solo la ven las personas con acceso. Se guarda en servidores seguros y se sincroniza entre tus dispositivos." />
      <P t="Eliminar tu cuenta" c="Puedes eliminar tu cuenta cuando quieras desde «Mi cuenta». Se borra tu usuario; los registros que hiciste para la empresa se conservan a nombre de «Usuario eliminado»." />
      <P t="Este equipo" c="Al cerrar sesión se borra la copia local de los datos, para proteger la información si el equipo lo usa otra persona." />
      <P t="Derechos de autor" c="El programa, su diseño, formatos y manuales están protegidos por derechos de autor. No se permite copiarlos ni distribuirlos sin autorización." />
      <div className="text-[10.5px] text-gray-500">Resumen informativo. Para dudas sobre el tratamiento de datos personales, consulta con el administrador de tu empresa.</div>
    </Ventana>
  );
}

export const NOVEDADES = [
  ["Menú del portal", "Ahora tienes un menú con Configuración, Manual, Mi cuenta, Respaldo y más."],
  ["Monedas", "En Configuración puedes elegir entre muchas monedas y decidir cuántos decimales ver."],
  ["APU", "El formato del APU trae 8 filas por sección y avisa mejor cuando una actividad no corresponde."],
  ["Catálogos", "Más lijas, cintas de enmascarar, discos, lijadoras y pulidoras en materiales y equipos."],
  ["Códigos de actividad", "Se corrigieron los códigos de actividades en Edificación / Reformas y Vías y carreteras."],
];
export function Novedades({ cerrar }) {
  return (
    <Ventana titulo="Novedades" cerrar={cerrar} marca="data-novedades">
      {NOVEDADES.map((n) => <div key={n[0]} className="mb-2.5"><div className="text-[12.5px] font-bold" style={{ color: NAVY }}>{n[0]}</div><div className="text-[12px] text-gray-700">{n[1]}</div></div>)}
    </Ventana>
  );
}

// Bloque para Configuración: tamaño de letra y cierre automático
export function AjustesEquipo() {
  const [p, setP] = useState(leerPrefs());
  const campo = "border rounded px-2 py-1.5 text-[13px] w-full";
  const cambiar = (c) => setP(guardarPrefs(c));
  return (
    <div data-aj-equipo>
      <div className="text-[12px] font-bold mt-3 mb-2 pb-1 border-b" style={{ color: "#17365D" }}>Pantalla</div>
      <div className="mb-2.5"><label className="text-[11.5px] font-semibold">Tamaño de la letra</label>
        <select className={campo} data-aj-letra value={p.letra} onChange={(e) => cambiar({ letra: e.target.value })}>{LETRAS.map((l) => <option key={l[0]} value={l[0]}>{l[1]}</option>)}</select></div>
    </div>
  );
}
