// CargaApp.jsx — pantalla de carga con el ícono de SAIEA OBRAS y un círculo que gira (la misma que se ve al abrir la página).
export default function CargaApp({ texto = "Cargando…" }) {
  return (
    <div className="carga-saiea" data-carga>
      <style>{".carga-saiea{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:#F7F7F5;z-index:100}.carga-saiea img{width:min(56vw,230px);height:auto;filter:drop-shadow(0 8px 16px rgba(0,0,0,.28))}.carga-saiea .giro{width:38px;height:38px;border-radius:50%;border:4px solid rgba(27,42,69,.18);border-top-color:#B8893B;animation:giro-saiea .9s linear infinite}.carga-saiea .txt{font-size:13px;color:#1B2A45;letter-spacing:.3px}@keyframes giro-saiea{to{transform:rotate(360deg)}}"}</style>
      <img src="/icono-saiea.png" alt="SAIEA OBRAS" />
      <div className="giro" role="status" aria-label="Cargando" />
      <div className="txt">{texto}</div>
    </div>
  );
}
