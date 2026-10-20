import { useState, useEffect, useRef, createContext, useContext } from "react";
import { usarEstado, accion, reiniciarEmpresa, eliminarEmpresaCompleta, usarSesion, iniciarSesionApp, entrar, salir, crearDueno, crearEmpresa, errorTexto, usuarios, empresas, cuenta, licencia, refrescarSesion } from "./almacen.js";
import * as D from "./dominio.js";
import { ROLES, puede, puedeVer, usarConfigPermisos, usarPlan, planActual, vistaBase, MODULOS_OPCIONALES, VISTAS_POR_ROL } from "./permisos.js";
import { leerArchivo, crearXlsx, descargar } from "./excel.js";
import { usarPrefs, guardarPrefs, leerPrefs } from "./tema.js";
import { reducirImagen } from "./imagen.js";
import { RequisicionPropia, EditorFormatoPropio } from "./FormatoPropio.jsx";
import { TIPOS, analizar, aplicar, plantilla } from "./importar.js";
import { MANUAL, APP } from "./manual.js";
import * as S from "./suscripciones.js";
import * as L from "./listas.js";

const RolCtx = createContext("");
const EmpresaCtx = createContext("");
const UsuarioCtx = createContext("");
const CfgCtx = createContext(D.CONFIG_DEFECTO);
const useRol = () => useContext(RolCtx);

const { plata } = D;

function useAviso() {
  const [m, setM] = useState(null);
  const tim = useRef(null);
  const avisar = (texto, mal) => { setM({ texto, mal }); clearTimeout(tim.current); tim.current = setTimeout(() => setM(null), 3200); };
  return [m && <div className={"msg" + (m.mal ? " mal" : "")} data-aviso>{m.texto}</div>, avisar];
}
const Chip = ({ nivel, children }) => <span className={"chip " + nivel}>{children}</span>;

function Inicio({ e, ir }) {
  const r = D.resumenHoy(e);
  const dias = D.ventasPorDia(e, 14);
  const max = Math.max(1, ...dias.map((d) => d.total));
  const sug = D.sugerenciaCompra(e).slice(0, 4);
  const sinNada = !e.productos.length;
  const cfgI = useContext(CfgCtx);
  const vz = D.vencimientos(e, { dias: cfgI.diasAvisoVence || 30 });
  return (
    <>
      <h1>Hola</h1>
      {sinNada && (
        <div className="tarj"><b>Empecemos</b><p className="sub">Agrega tus productos y clientes desde Más → Productos y Más → Clientes. Luego registra la primera compra para tener stock.</p></div>
      )}
      <div className="rej">
        <div className="tarj kpi"><small>Ventas de hoy</small><b data-k="hoy">{plata(r.ventasHoy)}</b><small>{r.pedidosHoy} pedidos</small></div>
        <div className="tarj kpi"><small>Ventas del mes</small><b>{plata(r.ventasMes)}</b><small>{r.pedidosMes} pedidos</small></div>
        <div className="tarj kpi" onClick={() => ir("pedidos")}><small>Por entregar</small><b>{r.pendientes}</b><small>pedidos pendientes</small></div>
        <div className="tarj kpi"><small>Cartera por cobrar</small><b>{plata(r.cartera)}</b><small>de clientes</small></div>
      </div>
      <div className="tarj">
        <div className="fila"><b>Ventas, últimos 14 días</b></div>
        <div className="barras">{dias.map((d) => <i key={d.fecha} title={d.fecha + " " + plata(d.total)} style={{ height: (d.total / max) * 100 + "%" }} />)}</div>
      </div>
      <div className="tarj" onClick={() => ir("stock")}>
        <div className="fila"><b>Inventario</b><span className="sub">Valor {plata(r.valorInventario)}</span></div>
        <div className="fila"><span>Agotados</span><Chip nivel={r.agotados ? "sin" : "ok"}>{r.agotados}</Chip></div>
        <div className="fila"><span>Por agotarse</span><Chip nivel={r.bajos ? "poco" : "ok"}>{r.bajos}</Chip></div>
      </div>
      {(vz.vencidos.length > 0 || vz.porVencer.length > 0) && (
        <div className="tarj" data-vencimientos onClick={() => ir("stock")}>
          <div className="fila"><b>Fechas de vencimiento</b><span className="sub">Costo {plata(vz.valorVencido + vz.valorPorVencer)}</span></div>
          <div className="fila"><span>Vencidos</span><Chip nivel={vz.vencidos.length ? "sin" : "ok"}>{vz.unidadesVencidas} und</Chip></div>
          <div className="fila"><span>Vencen en {cfgI.diasAvisoVence || 30} días o menos</span><Chip nivel={vz.porVencer.length ? "poco" : "ok"}>{vz.unidadesPorVencer} und</Chip></div>
        </div>)}
      {sug.length > 0 && (
        <div className="tarj"><b>Qué comprar</b><p className="sub">Según lo que vendes y lo que ya viene en camino</p>
          {sug.map((s) => <div className="fila" key={s.productoId}><span>{s.nombre}</span><Chip nivel="neu">pedir {s.pedir}</Chip></div>)}</div>
      )}
    </>
  );
}

// Lector de códigos de barras con la cámara (si el navegador lo permite). Un lector USB/Bluetooth también sirve: escribe en el campo de código.
function Escaner({ onCodigo, cerrar, continuo = false }) {
  const video = useRef(null);
  const [msg, setMsg] = useState("Abriendo la cámara… Si el navegador pregunta, toca «Permitir».");
  useEffect(() => {
    let parar = false, flujo = null, tim = null, lector = null, ultimo = "", tUlt = 0;
    const hallado = (c) => { const ahora = Date.now(); if (c && (c !== ultimo || ahora - tUlt > 2500)) { ultimo = c; tUlt = ahora; onCodigo(c); return !continuo; } return false; };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setMsg("Este navegador no permite usar la cámara aquí. Escribe el código o usa un lector de códigos."); return; }
      try {
        // 1) Lector del propio navegador (Chrome en Android); 2) si no lo trae, un lector incluido en la app (PC, iPhone…)
        if (typeof window.BarcodeDetector !== "undefined") {
          const det = new window.BarcodeDetector();
          try { flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }); }
          catch (er) { if (er?.name === "NotAllowedError" || er?.name === "SecurityError") throw er; flujo = await navigator.mediaDevices.getUserMedia({ video: true }); }
          if (parar) { flujo.getTracks().forEach((t) => t.stop()); return; }
          video.current.srcObject = flujo; await video.current.play(); setMsg("Apunta al código de barras");
          const mirar = async () => {
            if (parar) return;
            try { const r = await det.detect(video.current); if (r.length && hallado(r[0].rawValue)) return; } catch {}
            tim = setTimeout(mirar, 300);
          };
          mirar();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/library");
          if (parar) return;
          lector = new BrowserMultiFormatReader();
          let abierta = false;
          const cb = (res) => {
            if (!abierta) { abierta = true; setMsg("Apunta al código de barras"); }
            if (res && !parar && hallado(res.getText())) { try { lector.reset(); } catch {} }
          };
          try { await lector.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video.current, cb); }
          catch (er) { if (er?.name === "NotAllowedError" || er?.name === "SecurityError") throw er; await lector.decodeFromConstraints({ video: true }, video.current, cb); }
          if (!abierta) setMsg("Apunta al código de barras");
        }
      } catch (er) {
        const n = er?.name;
        setMsg(n === "NotAllowedError" || n === "SecurityError" ? "La cámara está bloqueada. Toca el candado junto a la dirección de la página, permite la cámara y vuelve a intentar."
          : n === "NotFoundError" || n === "OverconstrainedError" ? "Este aparato no tiene cámara disponible. Escribe el código o usa un lector de códigos."
          : n === "NotReadableError" ? "La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentar."
          : "No se pudo abrir la cámara. Revisa el permiso del navegador, o escribe el código.");
      }
    })();
    return () => { parar = true; clearTimeout(tim); try { lector?.reset(); } catch {} flujo?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <div className="tarj" data-escaner>
      <video ref={video} playsInline muted autoPlay style={{ width: "100%", borderRadius: 12, background: "#000", maxHeight: 260 }} />
      <div className="sub" data-escaner-msg style={{ margin: "6px 0", fontWeight: 600 }}>{msg}</div>
      <button className="s" data-escaner-cerrar onClick={cerrar}>Cerrar cámara</button>
    </div>);
}

// Código de barras Code 128 dibujado como imagen vectorial (se imprime nítido)
function CodigoBarras({ texto, alto = 46 }) {
  const w = D.code128(texto), total = w.reduce((a, b) => a + b, 0), q = 10;
  let x = q; const barras = [];
  w.forEach((a, i) => { if (i % 2 === 0) barras.push(<rect key={i} x={x} y={0} width={a} height={alto} fill="#000" />); x += a; });
  return <svg data-codigo-barras={texto} viewBox={`0 0 ${total + q * 2} ${alto}`} preserveAspectRatio="none" shapeRendering="crispEdges" style={{ width: Math.min(260, (total + q * 2) * 1.6), maxWidth: "100%", height: alto, display: "block", background: "#fff" }}>{barras}</svg>;
}

// Abre el documento en una ventana propia con su botón de imprimir: así el navegador no bloquea la impresión
function abrirImpresion(titulo) {
  const hoja = document.querySelector("[data-hoja-doc]"); if (!hoja) return;
  const copia = hoja.cloneNode(true); copia.querySelectorAll(".no-imprimir").forEach((n) => n.remove());
  const w = window.open("", "_blank");
  if (!w) { window.print(); return; }   // si el navegador no deja abrir ventanas, se imprime esta misma pantalla
  const estilos = [...document.querySelectorAll("link[rel=stylesheet], style")].map((n) => n.outerHTML).join("");
  const propia = copia.hasAttribute("data-propia");   // formato propio de la empresa: hoja completa, sin márgenes; la imagen de fondo solo si se quiere imprimir
  if (propia && copia.getAttribute("data-fondo-imprime") === "0") copia.querySelectorAll(".fondo-propio").forEach((n) => n.remove());
  const papel = copia.getAttribute("data-papel") || "carta", pagina = propia ? (D.PAPELES_FORMATO[papel]?.pag || "letter") : papel === "ticket" ? "80mm auto" : papel === "media" ? "5.5in 8.5in" : "letter";
  const margen = propia ? "0" : "8mm";
  const esc = (x) => String(x).replace(/[<>&"]/g, "");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>${estilos}<style>*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{background:#fff!important;color:#000;padding:${propia ? 0 : 12}px;margin:0}.albaran-fondo{position:static!important;padding:0!important;overflow:visible!important;background:#fff!important}.albaran-hoja{max-width:none!important;width:100%!important;border:0!important;border-radius:0!important;padding:0!important;box-sizing:border-box}.barra{display:flex;gap:8px;margin:0 auto 12px;max-width:900px}.barra button{padding:12px 18px;font:inherit;border-radius:10px;border:1px solid #888;background:#eee;color:#000;cursor:pointer}.barra .imp{background:#2563eb;color:#fff;border:0;flex:1}@page{size:${pagina};margin:${margen}}@media print{.barra{display:none!important}body{padding:0}}${propia ? ".albaran-fondo{max-width:none!important}.pg-propia{-webkit-print-color-adjust:exact;print-color-adjust:exact}@media print{.pg-propia{box-shadow:none!important}}" : ""}</style></head><body><div class="barra"${propia ? ' style="margin:8px"' : ""}><button class="imp" onclick="window.print()">Imprimir / Guardar como PDF</button><button onclick="window.close()">Cerrar</button></div><div class="albaran-fondo">${copia.outerHTML}</div></body></html>`);
  w.document.close();
}

// Remisión: documento de entrega del pedido (con precios). No es una factura.
function Requisicion({ e, p, empresa, cfg, cerrar }) {
  const pp = D.limpiarPlantillaPropia(cfg.plantillaPropia), fondoPropio = D.imagenProducto(e, "remision_fondo");
  if (pp.activa && fondoPropio) return <RequisicionPropia e={e} p={p} empresa={empresa} cfg={cfg} cerrar={cerrar} pl={pp} fondo={fondoPropio} imprimir={abrirImpresion} />;   // formato propio de la empresa (opcional)
  const cli = e.clientes.find((c) => c.id === p.clienteId);
  const nom = (id) => e.productos.find((x) => x.id === id)?.nombre || "Producto";
  const cod = (id) => e.productos.find((x) => x.id === id)?.codigo || "";
  const sub = D.subtotalPedido(p);
  const logo = cfg.docLogo !== false ? D.imagenProducto(e, "logo_empresa") : "";
  const fmt = D.FORMATOS_DOC.includes(cfg.formatoDoc) ? cfg.formatoDoc : "clasico", papel = cfg.papelDoc || "carta";
  const verCod = cfg.docCodigo !== false, verPrecio = cfg.docPrecios !== false;
  const color = D.COLORES_DOC.includes(cfg.colorDoc) ? cfg.colorDoc : D.COLORES_DOC[0];
  const tic = papel === "ticket", mod = fmt === "moderno", ele = fmt === "elegante", comp = fmt === "compacto";
  const acento = mod || ele ? color : "#000";
  const ancho = tic ? 300 : papel === "media" ? 640 : 1000, base = tic || comp ? 12 : 15;
  const serif = ele ? "Georgia, 'Times New Roman', serif" : "inherit";
  const th = (k) => ({ textAlign: k ? "right" : "left", padding: comp ? "4px 5px" : "9px 6px", fontWeight: 600, ...(mod ? { background: acento, color: "#fff" } : ele ? { color: acento, borderBottom: "2px solid " + acento, textTransform: "uppercase", letterSpacing: 1, fontSize: base - 2 } : comp ? { background: "#eee", borderBottom: "1px solid #999", fontSize: base - 1 } : { borderBottom: "1px solid #999" }) });
  const fila = (k) => ({ background: mod && k % 2 ? acento + "14" : "transparent", borderBottom: ele ? "1px solid #e3e3e3" : comp ? "1px solid #ddd" : "none" });
  const cel = comp ? "3px 5px" : "9px 6px";
  const cols = [verCod && "Cód.", "Producto", "Cant.", verPrecio && "Precio", verPrecio && "Total"].filter(Boolean);
  const sc = mod ? { color: "#fff", opacity: 0.92 } : {};
  const nombreEmpresa = cfg.razonSocial || cfg.nombreComercial || empresa;
  const logoEl = <div data-doc-logo-espacio style={{ minWidth: tic || ele ? 0 : comp ? 90 : 150, minHeight: comp ? 40 : 64, display: "flex", alignItems: "center", justifyContent: ele ? "center" : "flex-start" }}>
    {logo ? <img data-doc-logo src={logo} alt="" style={{ maxHeight: tic ? 60 : comp ? 44 : ele ? 70 : 72, maxWidth: 160, objectFit: "contain", ...(mod ? { background: "#fff", padding: 4, borderRadius: 6 } : {}) }} />
      : <div className="no-imprimir sub" style={{ border: "1px dashed #aaa", padding: comp ? "8px 12px" : "14px 18px", borderRadius: 6, ...sc }}>Espacio del logo</div>}
  </div>;
  const titulo = <h1 data-doc-numero style={{ margin: 0, fontSize: tic || comp ? 18 : ele ? 20 : 22, color: mod ? "#fff" : acento, fontFamily: serif, letterSpacing: ele ? 2 : 0 }}>REMISIÓN No. {p.numero}</h1>;
  const datosEnc = <><div className="sub" style={sc}>Fecha: {D.fechaTxt(p.fecha)}{p.estado === "entregado" ? " · Entregado " + D.fechaTxt(p.fechaEntregado) : ""}</div><div className="sub" style={sc}>Vendedor: {p.usuario || "—"}</div></>;
  const barras = cfg.docBarras !== false && <div data-doc-barras style={{ marginTop: 6, display: "flex", flexDirection: "column", alignItems: tic || ele ? "center" : "flex-end", ...(mod ? { background: "#fff", padding: "4px 8px", borderRadius: 4 } : {}) }}><CodigoBarras texto={String(p.numero)} /><div className="sub" style={{ fontSize: 11, letterSpacing: 2, color: mod ? "#333" : undefined }}>{p.numero}</div></div>;
  const encabezado = ele
    ? <div style={{ textAlign: "center", paddingBottom: 12, borderBottom: "2px solid " + acento }}>
        {logoEl}
        <div style={{ fontFamily: serif, fontSize: base + 6, letterSpacing: 4, textTransform: "uppercase", margin: "6px 0 2px" }}>{nombreEmpresa}</div>
        <div style={{ margin: "6px 0 2px" }}>{titulo}</div>{datosEnc}{barras}
      </div>
    : mod
    ? <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexDirection: tic ? "column" : "row", flexWrap: "wrap", background: acento, color: "#fff", borderRadius: 8, padding: "14px 18px", overflow: "hidden" }}>
        {logoEl}<div style={{ textAlign: tic ? "center" : "right", minWidth: 0, maxWidth: "100%" }}>{titulo}{datosEnc}{barras}</div>
      </div>
    : comp
    ? <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexDirection: tic ? "column" : "row", flexWrap: "wrap", borderBottom: "1px solid #000", paddingBottom: 6 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "1 1 220px", minWidth: 0 }}>{logoEl}<div>{titulo}<div className="sub">Fecha: {D.fechaTxt(p.fecha)}{p.estado === "entregado" ? " · Entregado " + D.fechaTxt(p.fechaEntregado) : ""} · Vendedor: {p.usuario || "—"}</div></div></div>
        {barras}
      </div>
    : <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexDirection: tic ? "column" : "row" }}>
        {logoEl}<div style={{ textAlign: tic ? "center" : "right" }}>{titulo}{datosEnc}{barras}</div>
      </div>;
  const partes = [["CLIENTE", "cliente", [["Nombre o Razón social", (cli?.nombre || "—") + (cli?.negocio ? " (" + cli.negocio + ")" : "")], ["Código", cli?.codigo], ["NIT / C.C.", cli?.nit], ["Dirección", [cli?.dir, cli?.ciudad].filter(Boolean).join(", ")], ["E-mail", cli?.correo], ["Celular", [cli?.tel, cli?.tel2].filter(Boolean).join(" / ")]]],
    ["EMPRESA", "empresa", [["Nombre o Razón social", nombreEmpresa], ["NIT / C.C.", cfg.nit], ["Dirección", cfg.direccion], ["E-mail", cfg.correo], ["Celular", cfg.telefono]]]];
  const cajaParte = () => mod ? { border: "1px solid #ddd", borderLeft: "5px solid " + acento, background: acento + "0d", borderRadius: 6, padding: "10px 14px" }
    : ele ? { padding: "2px 0 2px 14px", borderLeft: "2px solid " + acento + "55" }
    : comp ? { padding: "0 4px" } : { border: "1px solid #999", borderRadius: 6, padding: "10px 14px" };
  return (
    <div className="albaran-fondo" data-requisicion>
      <div className="albaran-hoja" data-hoja-doc data-papel={papel} data-formato={fmt} style={{ maxWidth: ancho, width: "100%", boxSizing: "border-box", fontSize: base, padding: comp ? 14 : 26, fontFamily: ele ? serif : undefined }}>
        <div className="no-imprimir fila" style={{ marginBottom: 10 }}>
          <button className="s" data-req-cerrar onClick={cerrar}>← Volver</button>
          <button className="p" data-req-imprimir onClick={() => abrirImpresion("Remisión " + p.numero + " - " + (cli?.nombre || ""))}>Imprimir / PDF</button>
        </div>
        {p.estado === "anulado" && <div data-doc-anulada style={{ border: "2px solid #dc2626", color: "#dc2626", textAlign: "center", fontWeight: 700, padding: 6, marginBottom: 8 }}>REMISIÓN ANULADA{p.anulacion?.motivo ? " · " + p.anulacion.motivo : ""}{p.anulacion?.fecha ? " · " + D.fechaTxt(p.anulacion.fecha) : ""}</div>}
        {encabezado}
        <div data-doc-partes style={{ display: "grid", gridTemplateColumns: tic ? "1fr" : comp ? "repeat(auto-fit, minmax(240px, 1fr))" : "repeat(auto-fit, minmax(280px, 1fr))", gap: comp ? 10 : 18, margin: comp ? "10px 0" : "18px 0" }}>
          {partes.map(([tit, id, filas]) => (
            <div key={id} data-doc-parte={id} style={cajaParte()}>
              <b style={{ color: acento, letterSpacing: ele ? 2 : 1, fontFamily: serif, fontSize: ele ? base - 2 : undefined }}>{tit}</b>
              {id === "empresa" && cfg.encabezadoDoc ? <div className="sub">{cfg.encabezadoDoc}</div> : null}
              {filas.map(([l, v]) => <div key={l} style={{ display: "flex", flexWrap: "wrap", columnGap: 8, rowGap: 0, lineHeight: comp ? 1.25 : 1.4, padding: comp ? "1px 0" : "3px 0", fontSize: comp ? base - 1 : undefined }}><span className="sub" style={{ flex: "0 0 " + (tic ? 96 : comp ? 100 : 112) + "px" }}>{l}:</span><span style={{ flex: "1 1 120px", overflowWrap: "anywhere" }}>{v || "—"}</span></div>)}
            </div>))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{cols.map((h) => <th key={h} style={th(["Cant.", "Precio", "Total"].includes(h))}>{h}</th>)}</tr></thead>
          <tbody>{p.items.map((i, k) => <tr key={k} style={fila(k)}>
            {verCod && <td data-cod-producto style={{ padding: comp ? "3px 8px 3px 5px" : "9px 10px 9px 6px", whiteSpace: "nowrap", fontSize: base - 1 }}>{cod(i.productoId) || "—"}</td>}
            <td style={{ padding: cel, textAlign: "left" }}>{nom(i.productoId)}{i.bonif ? " regalo" : ""}</td><td style={{ textAlign: "right", padding: comp ? "3px 5px" : undefined }}>{i.cant}</td>
            {verPrecio && <td style={{ textAlign: "right", padding: comp ? "3px 5px" : undefined }}>{i.bonif ? "—" : plata(i.precio)}</td>}{verPrecio && <td style={{ textAlign: "right", paddingRight: 4 }}>{i.bonif ? "—" : plata(i.cant * i.precio)}</td>}</tr>)}</tbody>
        </table>
        {verPrecio && <div style={{ display: "flex", gap: 24, marginTop: 14, alignItems: "flex-start", flexDirection: tic ? "column-reverse" : "row", flexWrap: "wrap" }}>
          <div data-valor-letras style={{ flex: 1, fontSize: base - 1 }}><b>SON:</b> {D.valorEnLetras(D.totalPedido(p))}</div>
          <div data-doc-desglose style={{ minWidth: tic ? 0 : 200, maxWidth: "100%", flex: tic ? undefined : "0 1 240px", width: tic ? "100%" : "auto" }}>
            {[["Subtotal", plata(p.ivaIncluido ? sub - (p.iva || 0) : sub), p.iva > 0 || p.retencion > 0],
              [`${cfg.ivaEtiqueta || "IVA"}${p.ivaIncluido ? " (incluido)" : ""}`, plata(p.iva), p.iva > 0],
              ["Retención", "-" + plata(p.retencion), p.retencion > 0]].filter((r) => r[2]).map(([l, v]) =>
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "2px 0" }}><span className="sub">{l}</span><span>{v}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: (ele || mod ? "2px solid " + acento : "1px solid #999"), marginTop: 4, paddingTop: 4, color: ele || mod ? acento : undefined }}><b>Total</b><b data-doc-total style={{ fontSize: base + 4 }}>{plata(D.totalPedido(p))}</b></div>
          </div>
        </div>}
        {p.req?.estado === "alistada" && !p.req.auto && <div className="sub" style={{ marginTop: 10 }}>Alistada por {p.req.por || "bodega"} el {D.fechaTxt(p.req.fecha)} {p.req.hora || ""}</div>}
        {p.factura && <div className="sub">Factura {p.factura.numero} · {D.fechaTxt(p.factura.fecha)}</div>}
        {cfg.pieRemision ? <div style={{ marginTop: 10 }}>{cfg.pieRemision}</div> : null}
        <div className="sub" style={{ marginTop: 10 }}>Documento de entrega. No es una factura: la factura electrónica se emite aparte.</div>
        {cfg.mostrarFirma !== false && <div style={{ marginTop: comp ? 36 : 56, display: "flex", gap: 40, flexDirection: tic ? "column" : "row" }}>
          {["Alistó (bodega)", "Entregó", "Recibí conforme"].map((x) => <div key={x} style={{ flex: 1, borderTop: "1px solid " + (ele ? acento : "#000"), paddingTop: 4, fontSize: base - 1, marginTop: tic ? 24 : 0 }}>{x}</div>)}
        </div>}
      </div>
    </div>);
}

// Remisiones: bodega alista lo que se debe entregar; facturación registra la factura de lo ya entregado
function Requisiciones({ e, avisar, empresa, modo = "remision" }) {
  const rol = useRol();
  const cfg = useContext(CfgCtx);
  const yo = useContext(UsuarioCtx);
  const [pest, setPest] = useState(modo === "factura" ? "facturar" : "alistar");
  const [ver, setVer] = useState(null);
  const [soloPagados, setSoloPagados] = useState(false);
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(40);
  const [escaneando, setEscaneando] = useState(false);
  const abrirPorNumero = (n) => {   // el código de barras de la remisión es su número
    const q = String(n || "").trim(), p = e.pedidos.find((x) => String(x.numero) === q);
    if (!p || p.estado === "presupuesto") { avisar(`No hay una remisión con el número ${q}`, true); return false; }
    setVer(p); setEscaneando(false); return true;
  };
  const [anu, setAnu] = useState(null);   // { id, motivo } = remisión que se está anulando
  const [fac, setFac] = useState({ id: null, numero: "", correo: false });
  const cli = (id) => { const c = e.clientes.find((x) => x.id === id); return c ? c.nombre + (c.negocio ? " · " + c.negocio : "") : "—"; };
  const cont = D.conteoRequisiciones(e);
  const alistar = (id) => { const r = accion((s) => D.alistarRequisicion(s, id, yo)); avisar(r.ok ? "Remisión alistada" : r.error, !r.ok); };
  const facturar = (p) => { const r = accion((s) => D.registrarFactura(s, p.id, { numero: fac.numero, usuario: yo, correoEnviado: fac.correo, corregir: !!p.factura })); avisar(r.ok ? "Factura registrada" : r.error, !r.ok); if (r.ok) setFac({ id: null, numero: "", correo: false }); };
  const TABS = [["alistar", `Por alistar (${cont.porAlistar})`], ["alistadas", "Alistadas"], ["entregadas", "Entregadas"], ["anuladas", "Anuladas"], ["facturar", `Por facturar (${cont.porFacturar})`], ["facturadas", "Facturadas"]].filter(([k]) => (modo === "factura") === (k === "facturar" || k === "facturadas"));
  const estRes = D.estadoResolucion(e), mes = D.hoyISO().slice(0, 7), delMes = D.informeFacturas(e, { desde: mes + "-01", hasta: mes + "-31" });
  const norm = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const coincide = (p) => !busca.trim() || norm(`${p.numero} ${cli(p.clienteId)} ${p.factura?.numero || ""} ${p.anulacion?.motivo || ""}`).includes(norm(busca.trim()));
  const todas = { alistar: D.porAlistar(e), alistadas: D.alistadas(e), entregadas: D.remisionesEntregadas(e), anuladas: D.remisionesAnuladas(e), facturar: D.porFacturar(e, { soloPagados }), facturadas: D.facturados(e) }[pest].slice().reverse().filter(coincide);
  const lista = todas.slice(0, limite);
  if (ver) return <Requisicion e={e} p={ver} empresa={empresa} cfg={cfg} cerrar={() => setVer(null)} />;
  return (
    <>
      <h1>{modo === "factura" ? "Facturación" : "Remisiones"}</h1>
      {modo === "factura" && (
        <div className="rej" data-fact-resumen>
          <div className="tarj kpi"><small>Por facturar</small><b>{cont.porFacturar}</b></div>
          <div className="tarj kpi"><small>Facturado este mes</small><b>{plata(delMes.reduce((s, f) => s + f.total, 0))}</b><small>{delMes.length} facturas</small></div>
        </div>)}
      {modo === "factura" && (estRes.configurada ? <div className={"alerta " + (estRes.alerta === "ok" ? "ok" : estRes.alerta === "poco" ? "poco" : "sin")} data-estado-resolucion>{estRes.mensaje}{estRes.siguiente ? ` · Siguiente: ${estRes.siguiente}` : ""}</div> : <div className="alerta poco" data-estado-resolucion>{estRes.mensaje}. {rol === "admin" ? "Regístrala en Configuración → Facturación electrónica." : "Pídele al administrador que la registre."}</div>)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {TABS.map(([k, t]) => <button key={k} data-req-tab={k} className={pest === k ? "p" : "s"} onClick={() => setPest(k)}>{t}</button>)}
      </div>
      {modo !== "factura" && <button className="s" data-req-escanear style={{ width: "100%", marginBottom: 8 }} onClick={() => setEscaneando(true)}>Escanear código de barras de una remisión</button>}
      {escaneando && <Escaner onCodigo={abrirPorNumero} cerrar={() => setEscaneando(false)} />}
      {["entregadas", "anuladas", "facturadas"].includes(pest) && <input data-req-buscar placeholder="Buscar por número, cliente o factura…" value={busca} onChange={(x) => { setBusca(x.target.value); setLimite(40); }} onKeyDown={(x) => { if (x.key === "Enter") abrirPorNumero(busca); }} style={{ marginBottom: 8 }} />}
      {pest === "facturar" && <div style={{ marginBottom: 8 }}><Interruptor dato="soloPagados" marcado={soloPagados} onChange={setSoloPagados}>Mostrar solo los ya pagados</Interruptor></div>}
      {!lista.length && <div className="vacio" data-req-vacio>{{ alistar: "No hay nada por alistar.", alistadas: "Nada alistado esperando entrega.", facturar: "No hay entregas por facturar.", facturadas: "Aún no hay facturas registradas.", entregadas: "Aún no hay remisiones entregadas.", anuladas: "No hay remisiones anuladas." }[pest]}</div>}
      {lista.map((p) => {
        const saldo = D.saldoPedido(e, p), c = e.clientes.find((x) => x.id === p.clienteId);
        return (
          <div className="tarj" key={p.id} data-req={p.numero}>
            <div className="fila"><b>#{p.numero} · {cli(p.clienteId)}</b>{p.estado === "anulado" ? <Chip nivel="sin">anulada</Chip> : p.factura ? <Chip nivel="ok">Factura {p.factura.numero}</Chip> : p.estado === "entregado" ? (saldo <= 0 ? <Chip nivel="ok">pagado</Chip> : <Chip nivel="poco">debe {plata(saldo)}</Chip>) : <Chip nivel={D.estadoReq(p) === "alistada" ? "ok" : "poco"}>{D.estadoReq(p) === "alistada" ? "alistada" : "por alistar"}</Chip>}</div>
            <div className="sub">{D.fechaTxt(p.fecha)} · {p.usuario || "—"} · {p.items.reduce((s, i) => s + i.cant, 0)} unidades · {plata(D.totalPedido(p))}</div>
            {p.estado === "anulado" && <div className="sub" data-anulacion>Anulada{p.anulacion?.fecha ? " el " + D.fechaTxt(p.anulacion.fecha) : ""}{p.anulacion?.usuario ? " por " + p.anulacion.usuario : ""}{p.anulacion?.motivo ? " · " + p.anulacion.motivo : ""}</div>}
            {p.estado === "entregado" && p.fechaEntregado && <div className="sub">Entregada el {D.fechaTxt(p.fechaEntregado)}</div>}
            {p.estado === "pendiente" && D.estadoReq(p) === "alistada" && <div className="sub">Alistada por {p.req.por || "—"} · {D.fechaTxt(p.req.fecha)} {p.req.hora || ""}</div>}
            {(pest === "facturar" || pest === "facturadas") && <div className="sub" data-fiscal>{[c?.nit && "NIT/CC " + c.nit, c?.correo].filter(Boolean).join(" · ")}{!p.factura && D.faltantesFiscales(c).length > 0 && <b style={{ color: "var(--mal)" }}> Falta en la ficha del cliente: {D.faltantesFiscales(c).join(" y ")}</b>}</div>}
            {p.factura && <div className="sub">{D.fechaTxt(p.factura.fecha)} · por {p.factura.por || "—"}{p.factura.correoEnviado ? " · enviada al cliente" : ""}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <button className="s" data-req-ver onClick={() => setVer(p)}>Ver / imprimir</button>
              {(pest === "alistar" || pest === "alistadas") && puede(rol, "anularRemision") && anu?.id !== p.id && <button className="s" data-req-anular onClick={() => setAnu({ id: p.id, motivo: "", sel: "" })}>Anular</button>}
              {pest === "alistar" && puede(rol, "alistar") && <button className="p" data-req-alistar onClick={() => alistar(p.id)}>✔ Alistada</button>}
              {pest === "alistadas" && puede(rol, "alistar") && <button className="s" data-req-deshacer onClick={() => { const r = accion((s) => D.desalistarRequisicion(s, p.id)); avisar(r.ok ? "Vuelve a por alistar" : r.error, !r.ok); }}>Deshacer</button>}
              {(pest === "facturar" || pest === "facturadas") && puede(rol, "facturar") && fac.id !== p.id && <button className={p.factura ? "s" : "p"} data-req-facturar onClick={() => setFac({ id: p.id, numero: p.factura?.numero || D.siguienteFactura(e), correo: !!p.factura?.correoEnviado })}>{p.factura ? "Corregir factura" : "Registrar factura"}</button>}
            </div>
            {anu?.id === p.id && (
              <div style={{ marginTop: 8 }} data-anular-form>
                <label>Motivo de la anulación</label>
                <select data-anular-motivo value={anu.sel ?? ""} onChange={(x) => setAnu({ ...anu, sel: x.target.value, motivo: x.target.value === "__otro" ? "" : x.target.value })}>
                  <option value="">Elegir el motivo…</option>{(cfg.motivosAnulacion || []).map((m) => <option key={m} value={m}>{m}</option>)}<option value="__otro">Otro motivo…</option></select>
                {anu.sel === "__otro" && <input data-anular-otro placeholder="Escribe el motivo" value={anu.motivo} onChange={(x) => setAnu({ ...anu, motivo: x.target.value })} />}
                <div className="sub">La remisión pasa a «Anuladas» y el pedido se cancela. Esto no se puede deshacer.</div>
                <div style={{ display: "flex", gap: 8 }}><button className="s" style={{ flex: 1 }} onClick={() => setAnu(null)}>Cancelar</button><button className="p" style={{ flex: 1 }} data-anular-ok onClick={() => { const r = accion((s) => D.anularRemision(s, p.id, { motivo: anu.motivo, usuario: yo })); avisar(r.ok ? "Remisión anulada: la encuentras en Anuladas" : r.error, !r.ok); if (r.ok) setAnu(null); }}>Anular remisión</button></div>
              </div>)}
            {fac.id === p.id && (
              <div style={{ marginTop: 8 }} data-req-form>
                <label>Número de la factura electrónica</label><input data-fac-numero value={fac.numero} onChange={(x) => setFac({ ...fac, numero: x.target.value })} />
                <Interruptor dato="facCorreo" marcado={fac.correo} onChange={(v) => setFac({ ...fac, correo: v })}>Ya se la envié al cliente por correo</Interruptor>
                <div style={{ display: "flex", gap: 8 }}><button className="s" style={{ flex: 1 }} onClick={() => setFac({ id: null, numero: "", correo: false })}>Cancelar</button><button className="p" style={{ flex: 1 }} data-fac-guardar onClick={() => facturar(p)}>Guardar</button></div>
              </div>)}
          </div>);
      })}
      {todas.length > lista.length && <button className="s" data-req-mas style={{ width: "100%" }} onClick={() => setLimite(limite + 40)}>Mostrar más ({todas.length - lista.length} restantes)</button>}
    </>);
}

function Miniatura({ e, id, tam = 44 }) {
  const d = D.imagenProducto(e, id);
  return d
    ? <img className="mini" data-mini src={d} alt="" style={{ width: tam, height: tam }} />
    : <span className="mini vacia" style={{ width: tam, height: tam, fontSize: tam * 0.5 }}>▦</span>;
}

// Teclado numérico para escoger la cantidad (como una calculadora). Se abre al tocar el producto; los botones + y − de siempre siguen ahí.
function TecladoCantidad({ titulo, inicial, alCancelar, alAceptar }) {
  const [txt, setTxt] = useState(String(inicial || 1));
  const [nuevo, setNuevo] = useState(true);   // el primer número que se toca reemplaza el valor inicial
  const num = parseInt(txt) || 0;
  const dig = (d) => { if (nuevo) { setTxt(String(d)); setNuevo(false); } else setTxt((t) => (t === "0" ? String(d) : (t + d).slice(0, 6))); };
  const borrar = () => { setNuevo(false); setTxt((t) => (t.length > 1 ? t.slice(0, -1) : "0")); };
  const sumar = (n) => { setNuevo(false); setTxt(String(Math.max(0, num + n))); };
  const tecla = (bg) => ({ background: bg, color: "#fff", border: 0, borderRadius: 8, fontSize: 26, fontWeight: 600, height: 62, cursor: "pointer" });
  const AZ = "#0a84ff", GR = "#636366";
  return (
    <div data-teclado style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={alCancelar}>
      <div style={{ background: "#1c2a3e", borderRadius: 12, padding: 14, width: "100%", maxWidth: 340, color: "#fff" }} onClick={(x) => x.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Unidades</div>
        <div style={{ fontSize: 14, margin: "8px 0" }}>{titulo}</div>
        <div data-teclado-valor style={{ textAlign: "right", fontSize: 36, fontWeight: 700, margin: "6px 4px 10px" }}>{num}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[7, 8, 9].map((d) => <button key={d} type="button" data-tec={d} style={tecla(AZ)} onClick={() => dig(d)}>{d}</button>)}
          <button type="button" data-tec="borrar" style={tecla(GR)} onClick={borrar}>⌫</button>
          {[4, 5, 6].map((d) => <button key={d} type="button" data-tec={d} style={tecla(AZ)} onClick={() => dig(d)}>{d}</button>)}
          <button type="button" data-tec="ce" style={tecla(GR)} onClick={() => { setNuevo(false); setTxt("0"); }}>CE</button>
          {[1, 2, 3].map((d) => <button key={d} type="button" data-tec={d} style={tecla(AZ)} onClick={() => dig(d)}>{d}</button>)}
          <button type="button" data-tec="mas1" style={tecla(GR)} onClick={() => sumar(1)}>+1</button>
          <span /><button type="button" data-tec={0} style={tecla(AZ)} onClick={() => dig(0)}>0</button><span />
          <button type="button" data-tec="menos1" style={tecla(GR)} onClick={() => sumar(-1)}>−1</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14 }}>
          <button type="button" data-tec="cancelar" style={{ background: "none", border: 0, color: "#fff", fontSize: 16, padding: 8 }} onClick={alCancelar}>Cancelar</button>
          <button type="button" data-tec="aceptar" style={{ background: "none", border: 0, color: "#fff", fontSize: 16, fontWeight: 700, padding: 8 }} onClick={() => alAceptar(num)}>Aceptar</button>
        </div>
      </div>
    </div>);
}

function Vender({ e, avisar, ir }) {
  const [verOfertas, setVerOfertas] = useState(false);
  const rol = useRol();
  const [clienteId, setCliente] = useState(() => { const c = PRE.clienteId; PRE.clienteId = ""; return c; });
  const [tipo, setTipo] = useState("preventa");
  const vehConStock = e.vehiculos.filter((v) => v.activo !== false && D.vehiculoUsaInventario(e, v.id));
  const [desde, setDesdeX] = useState(() => { try { return localStorage.getItem("ventas_desde") || ""; } catch { return ""; } });
  const setDesde = (v) => { setDesdeX(v); try { localStorage.setItem("ventas_desde", v); } catch {} };
  const veh = tipo === "autoventa" && vehConStock.some((v) => v.id === desde) ? desde : null;   // autoventa desde el inventario de un vehículo
  const [busca, setBusca] = useState("");
  const [items, setItems] = useState({});
  const [dctos, setDctos] = useState({});      // { productoId: { modo: "%" | "$", v: "10" } }
  const [familia, setFamilia] = useState("");
  const [todosClientes, setTodosClientes] = useState(false);
  const cfg = useContext(CfgCtx);
  const familias = [...new Set(e.productos.map((p) => p.familia).filter(Boolean))].sort();
  const lista = e.productos.filter((p) => D.esActivo(p) && p.nombre.toLowerCase().includes(busca.toLowerCase()) && (!familia || p.familia === familia));
  const yo = useContext(UsuarioCtx).trim().toLowerCase();
  const clientesActivos = e.clientes.filter(D.esActivo);
  const misClientes = rol === "vendedor" ? clientesActivos.filter((c) => (c.vendedor || "").trim().toLowerCase() === yo) : [];
  const clientesVisibles = misClientes.length && !todosClientes ? misClientes : clientesActivos;
  const cli = clienteId ? e.clientes.find((c) => c.id === clienteId) : null;
  const descCli = Number(cli?.descuento) || 0;
  const habituales = clienteId ? D.habitualesCliente(e, clienteId, cfg.precargarDias) : [];
  // Precio de cada línea: el que escribió el descuento, o el último precio que se le vendió a ese cliente (si está activado y es válido)
  const precioDe = (p) => {
    const d = dctos[p.id];
    if (d && d.v !== "" && d.v !== undefined) return { precio: D.precioNeto(p.precio, d.modo, d.v), origen: "dcto" };
    const pp = D.promoPrecio(cfg.promos, p, items[p.id] || 1, D.hoyISO(), { cliente: cli, cantidades: items });
    const pc = descCli > 0 ? Math.round(p.precio * (1 - descCli / 100)) : null;
    if (pp && (pc === null || pp.precio <= pc)) return { precio: pp.precio, origen: "promo", promo: pp.nombre, promoId: pp.id };
    if (pc !== null) return { precio: pc, origen: "cliente" };
    if (cfg.ultimoPrecio && clienteId) {
      const u = D.ultimoPrecioCliente(e, clienteId, p.id);
      if (u !== null && u !== p.precio && u >= D.precioMinimo(p.precio, cfg.descuentoMax)) return { precio: u, origen: "ultimo" };
    }
    return { precio: p.precio, origen: "lista" };
  };
  const sel = Object.entries(items).filter(([, c]) => c > 0).map(([productoId, cant]) => {
    const p = e.productos.find((x) => x.id === productoId);
    const pd = precioDe(p);
    return { productoId, cant, precio: pd.precio, lista: p.precio, ...(pd.origen === "promo" ? { promo: pd.promo, promoId: pd.promoId } : {}) };
  });
  const total = sel.reduce((s, i) => s + i.cant * i.precio, 0);
  const imp = D.calcularImpuestos(sel.map((i) => ({ ...i, iva: e.productos.find((x) => x.id === i.productoId)?.iva || 0 })), cfg);
  const [codigo, setCodigo] = useState("");
  const [camara, setCamara] = useState(false);
  const [pagoVal, setPagoVal] = useState(null);       // autoventa: lo que paga el cliente (null = el total)
  const [pagoMedio, setPagoMedio] = useState(cfg.formasPago[0]);
  const [pagoFoto, setPagoFoto] = useState("");
  const porCodigo = (c) => {
    const pr = D.productoPorCodigo(e, c);
    if (!pr) { avisar(`No hay un producto con el código ${c}`, true); return false; }
    if (cambiar(pr.id, 1)) avisar(`+1 ${pr.nombre}`); return true;
  };
  // Lo máximo que se puede vender de un producto (sin límite si la empresa permite vender sin stock)
  const limite = (pid) => cfg.permitirSinStock ? Infinity : Math.max(0, veh ? D.stockVehiculo(e, veh, pid) : D.disponible(e, pid));
  const nomProd = (pid) => e.productos.find((x) => x.id === pid)?.nombre || "El producto";
  const fijar = (id, n) => {   // pone la cantidad respetando el stock; avisa en el momento si no alcanza
    const lim = limite(id), actual = items[id] || 0;
    if (n > actual && n > lim) {
      if (lim <= 0) { avisar(`${nomProd(id)} está AGOTADO: no se puede agregar a la venta`, true); return false; }
      avisar(`Solo hay ${lim} de ${nomProd(id)}`, true); n = lim; if (n === actual) return false;
    }
    setItems((x) => ({ ...x, [id]: Math.max(0, n) })); return true;
  };
  const cambiar = (id, d) => fijar(id, Math.max(0, (items[id] || 0) + d));
  const poner = (id, v) => fijar(id, Math.max(0, parseInt(v) || 0));
  const [calc, setCalc] = useState(null);   // teclado de cantidades: { id, nombre, valor }
  const dispo = (pid, c) => veh ? D.disponibilidadVehiculo(e, veh, pid, c) : D.disponibilidad(e, pid, c);
  const faltantes = sel.filter((i) => dispo(i.productoId, i.cant).nivel === "sin");
  const nombreUsuario = useContext(UsuarioCtx);
  const cargarHabituales = (id = clienteId) => {
    const h = D.habitualesCliente(e, id, cfg.precargarDias);
    const ok = h.filter((x) => limite(x.productoId) > 0), fuera = h.filter((x) => limite(x.productoId) <= 0);
    setItems(Object.fromEntries(ok.map((x) => [x.productoId, Math.min(x.cant, limite(x.productoId))])));
    if (fuera.length) avisar(`Agotado, no se cargó: ${fuera.map((x) => nomProd(x.productoId)).join(", ")}`, true);
  };
  const elegirCliente = (id) => { setCliente(id); setDctos({}); if (cfg.precargarAuto && id) cargarHabituales(id); };
  const confirmar = () => {
    const res = accion((st) => {
      const ped = D.crearPedido(st, {
        clienteId, tipo, items: sel, usuario: nombreUsuario, sinStock: cfg.permitirSinStock, descuentoMax: Math.max(cfg.descuentoMax, descCli),
        limiteCartera: D.limiteCliente(cli, cfg), pedidoMinimo: cfg.pedidoMinimo, bloquearCarteraDias: D.diasBloqueoCliente(cli, cfg), cfgImp: cfg, promos: cfg.promos, vehiculoId: veh,
        pago: tipo === "autoventa" ? { valor: parseInt(String(pagoVal ?? imp.total).replace(/\D/g, "")) || 0, medio: pagoMedio, comprobante: pagoFoto, contraEntrega: cfg.contraEntrega, exigirComprobante: cfg.exigirComprobante } : null,
      });
      if (tipo !== "presupuesto" && cfg.visitaAutoVenta && !cfg.modulosOff.includes("visitas")) D.crearVisita(st, { clienteId, motivo: cfg.motivosVisita[0], resultado: cfg.resultadosVisita[0], usuario: nombreUsuario, pedidoId: ped.id });
      return ped;
    });
    if (!res.ok) return avisar(res.error, true);
    avisar(tipo === "autoventa" ? `Venta #${res.r.numero} registrada` : tipo === "presupuesto" ? `Presupuesto #${res.r.numero} guardado` : `Pedido #${res.r.numero} guardado`);
    setItems({}); setDctos({}); setCliente(""); setPagoVal(null); setPagoFoto(""); ir("pedidos");
  };
  if (!puede(rol, "vender")) return <><h1>Nueva venta</h1><div className="vacio">Tu licencia está vencida o tu rol no puede vender. Solo puedes consultar.</div></>;
  return (
    <>
      <h1>Nueva venta</h1>
      <div className="tarj">
        <label>Cliente</label>
        <select data-cliente value={clienteId} onChange={(x) => elegirCliente(x.target.value)}>
          <option value="">Elegir cliente…</option>
          {clientesVisibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.negocio ? " · " + c.negocio : ""}</option>)}
        </select>
        {misClientes.length > 0 && <button className="s" data-mis-clientes style={{ marginBottom: 8 }} onClick={() => setTodosClientes(!todosClientes)}>{todosClientes ? `Ver solo mis clientes (${misClientes.length})` : "Ver todos los clientes"}</button>}
        {cli?.aviso && <div className="alerta poco" data-aviso-cliente>{cli.aviso}</div>}
        {cli && descCli > 0 && <div className="sub" data-desc-cliente>Este cliente tiene un descuento del {descCli}%: se aplica solo a los precios.</div>}
        {cli?.credito && <div className="sub" data-plazo-cliente>Cliente con crédito: paga a {cli.plazoDias > 0 ? cli.plazoDias + " días" : "plazo sin definir (lo define Cartera)"}.</div>}
        {clienteId && D.carteraCliente(e, clienteId) > 0 && <div className="alerta poco" data-deuda>Este cliente debe {plata(D.carteraCliente(e, clienteId))}</div>}
        {habituales.length > 0 && <button className="s g" data-habituales style={{ marginTop: 8 }} onClick={() => cargarHabituales()}>Cargar lo que suele comprar ({habituales.length})</button>}
        <label style={{ display: "block", marginTop: 8 }}>Tipo</label>
        <select data-tipo value={tipo} onChange={(x) => setTipo(x.target.value)}>
          <option value="preventa">Preventa (se entrega después)</option>
          <option value="autoventa">Autoventa (se entrega ya)</option>
          <option value="presupuesto">Presupuesto (cotización, no reserva stock)</option>
        </select>
        {tipo === "autoventa" && vehConStock.length > 0 && <>
          <label style={{ display: "block", marginTop: 8 }}>Vender desde</label>
          <select data-desde value={veh || ""} onChange={(x) => setDesde(x.target.value)}>
            <option value="">Bodega</option>
            {vehConStock.map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.placa ? " · " + v.placa : ""}</option>)}
          </select></>}
      </div>
      <input placeholder="Buscar producto…" value={busca} onChange={(x) => setBusca(x.target.value)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input data-codigo placeholder="Código de barras" inputMode="text" style={{ margin: 0, flex: 1 }} value={codigo} onChange={(x) => setCodigo(x.target.value)} onKeyDown={(x) => { if (x.key === "Enter" && codigo.trim()) { porCodigo(codigo.trim()); setCodigo(""); } }} />
        <button className="s" data-agregar-codigo onClick={() => { if (codigo.trim()) { porCodigo(codigo.trim()); setCodigo(""); } }}>Agregar</button>
        <button className="s" data-escanear onClick={() => setCamara(!camara)}>Cámara</button>
      </div>
      {camara && <Escaner continuo onCodigo={porCodigo} cerrar={() => setCamara(false)} />}
      {familias.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
          {["", ...familias].map((f) => <button key={f || "todas"} data-familia={f || "todas"} className={familia === f ? "p" : "s"} style={{ whiteSpace: "nowrap" }} onClick={() => setFamilia(f)}>{f || "Todas"}</button>)}
        </div>)}
      {(() => { const vig = (cfg.promos || []).filter((x) => D.estadoOferta(x) === "vigente" && D.promoParaCliente(x, cli || null));
        return vig.length > 0 && <div className="tarj" data-ofertas-hoy style={{ borderColor: "var(--ok)" }}>
          <button type="button" className="s" data-ofertas-hoy-abrir style={{ width: "100%" }} onClick={() => setVerOfertas(!verOfertas)}>🔥 Hoy hay {vig.length} {vig.length === 1 ? "oferta" : "ofertas"}{cli ? " para este cliente" : ""} {verOfertas ? "▲" : "▼"}</button>
          {verOfertas && vig.map((x) => <div key={x.id} data-oferta-hoy={x.nombre} style={{ padding: "6px 0", borderTop: "1px solid var(--linea)" }}>
            <b>{x.nombre}</b><div className="sub">{D.textoOferta(x, e.productos)}{x.hasta ? " · hasta el " + D.fechaTxt(x.hasta) : ""}</div>
            <button type="button" className="s" data-oferta-compartir style={{ marginTop: 4 }} onClick={() => compartirOferta(e, x, cfg.nombreComercial || "", avisar)}>Enviar por WhatsApp</button></div>)}
        </div>; })()}
      {calc && <TecladoCantidad titulo={calc.nombre} inicial={calc.valor} alCancelar={() => setCalc(null)} alAceptar={(n) => { poner(calc.id, n); setCalc(null); }} />}
      {lista.map((p) => {
        const c = items[p.id] || 0;
        const dsp = dispo(p.id, Math.max(c, 1));
        const pr = precioDe(p), d = dctos[p.id] || { modo: "%", v: "" };
        const caja = cfg.ventaPorCajas && p.porCaja > 1 ? p.porCaja : 0;
        const agotado = limite(p.id) <= 0;
        return (
          <div className="tarj" key={p.id} data-prod={p.nombre} style={agotado ? { opacity: 0.85 } : undefined}>
            <div className="fila"><div data-abrir-teclado style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }} onClick={(ev) => { if (!agotado && !ev.target.closest("a,button,input")) setCalc({ id: p.id, nombre: p.nombre, valor: c || 1 }); }}><Miniatura e={e} id={p.id} /><div><b>{p.nombre}</b>{D.promosDelProducto(cfg.promos, p, D.hoyISO(), cli || null).length > 0 && <span data-etiqueta-oferta className="chip ok" style={{ marginLeft: 6 }}>OFERTA</span>}<div className="sub">{plata(p.precio)} · hay {Math.max(0, veh ? D.stockVehiculo(e, veh, p.id) : D.disponible(e, p.id))}{veh ? " en el vehículo" : ""}{caja ? ` · caja de ${caja}` : ""}</div></div></div>
              <div className="cant"><button onClick={() => cambiar(p.id, -1)}>−</button>
                <input inputMode="numeric" value={c || ""} placeholder="0" onChange={(x) => poner(p.id, x.target.value)} />
                <button data-mas style={agotado ? { opacity: 0.4 } : undefined} onClick={() => cambiar(p.id, 1)}>+</button></div></div>
            {agotado && <div className="alerta sin" data-agotado data-alerta="sin">AGOTADO: no hay existencias{veh ? " en el vehículo" : ""}, no se puede agregar a la venta. {dsp.nivel === "sin" ? dsp.mensaje : ""}</div>}
            {caja > 0 && <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="s" data-menos-caja style={{ flex: 1 }} onClick={() => cambiar(p.id, -caja)}>− 1 caja ({caja})</button>
              <button className="s" data-mas-caja style={{ flex: 1 }} onClick={() => cambiar(p.id, caja)}>+ 1 caja ({caja})</button></div>}
            {c > 0 && cfg.descuentoMax > 0 && (
              <div className="fila" style={{ marginTop: 6, gap: 6 }}>
                <label style={{ margin: 0, flex: 1 }}>Descuento (máx. {cfg.descuentoMax}%)</label>
                {cfg.descuentoPesos && <select data-dcto-modo value={d.modo} style={{ width: 62, margin: 0 }} onChange={(x) => setDctos((o) => ({ ...o, [p.id]: { ...d, modo: x.target.value } }))}><option value="%">%</option><option value="$">$</option></select>}
                <input data-dcto inputMode="numeric" placeholder="0" style={{ width: 90, margin: 0, textAlign: "right" }} value={d.v} onChange={(x) => setDctos((o) => ({ ...o, [p.id]: { ...d, v: x.target.value.replace(/\D/g, "") } }))} /></div>)}
            {c > 0 && pr.precio !== p.precio && <div className="sub" data-precio-linea style={{ marginTop: 4 }}>Precio {pr.origen === "ultimo" ? "(último que pagó)" : pr.origen === "cliente" ? "con su descuento del " + descCli + "%" : pr.origen === "promo" ? "en oferta (" + pr.promo + ")" : "con descuento"}: <b>{plata(pr.precio)}</b> · línea {plata(pr.precio * c)}</div>}
            {(() => { const ps = D.promosDelProducto(cfg.promos, p, D.hoyISO(), cli || null); const b = c > 0 ? D.promoBonif(cfg.promos, p, c, D.hoyISO(), { cliente: cli }) : null;
              return (ps.length > 0 || b) && <div className="sub" data-promo style={{ marginTop: 4 }}>{b ? <b data-regalo style={{ color: "var(--ok)" }}>+{b.cant} de regalo ({b.nombre}) · </b> : null}{ps.map((x) => x.nombre).join(" · ")}</div>; })()}
            {c > 0 && <div className={"alerta " + dsp.nivel} data-alerta={dsp.nivel}>{dsp.nivel === "sin" ? "" : dsp.nivel === "poco" ? "" : ""}{dsp.mensaje}</div>}
          </div>
        );
      })}
      {!lista.length && <div className="vacio">No hay productos. Agrégalos en Más → Productos.</div>}
      <div className="tarj" style={{ position: "sticky", bottom: 78 }}>
        {(imp.iva > 0 || imp.retencion > 0) && sel.length > 0 && (
          <div className="sub" data-impuestos>
            <div className="fila"><span>Subtotal{imp.ivaIncluido ? " (sin " + cfg.ivaEtiqueta + ")" : ""}</span><span>{plata(imp.ivaIncluido ? imp.base : imp.sub)}</span></div>
            {imp.iva > 0 && <div className="fila"><span>{cfg.ivaEtiqueta}{imp.ivaIncluido ? " (incluido)" : ""}</span><span data-iva>{plata(imp.iva)}</span></div>}
            {imp.retencion > 0 && <div className="fila"><span>Retención {cfg.retencionPct}%</span><span data-retencion>-{plata(imp.retencion)}</span></div>}
          </div>)}
        <div className="fila"><span>Total</span><span className="tot" data-total>{plata(imp.total)}</span></div>
        {cfg.pedidoMinimo > 0 && total < cfg.pedidoMinimo && sel.length > 0 && <div className="sub" data-minimo>Pedido mínimo: {plata(cfg.pedidoMinimo)}</div>}
        {tipo === "preventa" && faltantes.length > 0 && <div className="sub">Hay productos sin stock: el pedido quedará pendiente hasta que lleguen.</div>}
        {tipo === "autoventa" && sel.length > 0 && (
          <div data-pago-autoventa style={{ marginTop: 8 }}>
            {cfg.contraEntrega && !cli?.credito && <div className="alerta poco">Venta contra pago: el cliente debe pagar {plata(imp.total)} completos para que se le entregue.</div>}
            <label>{cfg.contraEntrega && !cli?.credito ? "Valor que paga el cliente" : "¿Cuánto paga el cliente ahora? (0 si queda a crédito)"}</label>
            <input data-pago-venta inputMode="numeric" value={pagoVal ?? String(imp.total)} onChange={(x) => setPagoVal(x.target.value)} />
            {(parseInt(String(pagoVal ?? imp.total).replace(/\D/g, "")) || 0) > 0 && <>
              <label>Forma de pago</label>
              <select data-pago-venta-medio value={pagoMedio} onChange={(x) => { setPagoMedio(x.target.value); if (D.esEfectivo(x.target.value)) setPagoFoto(""); }}>{cfg.formasPago.map((m) => <option key={m} value={m}>{m}</option>)}</select>
              {!D.esEfectivo(pagoMedio) && <>
                <label>Foto del comprobante{cfg.exigirComprobante ? "" : " (opcional)"}</label>
                {pagoFoto && <img data-venta-comprobante-vista src={pagoFoto} alt="Comprobante" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 12, background: "#000" }} />}
                <label className="s" style={{ margin: "6px 0", textAlign: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)", display: "block" }}>{pagoFoto ? "Cambiar foto" : "Tomar foto del comprobante"}
                  <input data-venta-comprobante type="file" accept="image/*" capture="environment" hidden onChange={async (ev) => { const f0 = ev.target.files?.[0]; if (!f0) return; try { setPagoFoto(await reducirImagen(f0, 900, 0.6)); } catch { avisar("No se pudo leer la foto", true); } }} /></label></>}
            </>}
          </div>)}
        <button className="p g" data-confirmar disabled={!sel.length || !clienteId} onClick={confirmar} style={{ marginTop: 8 }}>
          {tipo === "autoventa" ? "Vender y entregar" : tipo === "presupuesto" ? "Guardar presupuesto" : "Guardar pedido"}</button>
      </div>
    </>
  );
}

// Cobro de un pedido: valor + forma de pago (sin ventanas emergentes)
function CobroForm({ e, p, avisar, cerrar }) {
  const cfg = useContext(CfgCtx);
  const usuario = useContext(UsuarioCtx);
  const [valor, setValor] = useState(String(D.saldoPedido(e, p)));
  const [medio, setMedio] = useState(cfg.formasPago[0]);
  const ok = () => {
    const v = parseInt(String(valor).replace(/\D/g, "")) || 0;
    const r = accion((s) => D.registrarPago(s, { pedidoId: p.id, valor: v, medio, usuario }));
    avisar(r.ok ? "Cobro registrado" : r.error, !r.ok); if (r.ok) cerrar();
  };
  return (
    <div style={{ marginTop: 8 }} data-cobro-form>
      <label>Valor cobrado</label><input data-cobro-valor inputMode="numeric" value={valor} onChange={(x) => setValor(x.target.value)} />
      <label>Forma de pago</label>
      <select data-cobro-medio value={medio} onChange={(x) => setMedio(x.target.value)}>{cfg.formasPago.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      <div style={{ display: "flex", gap: 8 }}><button className="s" style={{ flex: 1 }} onClick={cerrar}>Cancelar</button><button className="p" style={{ flex: 1 }} data-cobro-ok onClick={ok}>Registrar cobro</button></div>
    </div>);
}

// Caja: recibe el efectivo y verifica los comprobantes de cada ruta cerrada
function LiquidacionesCaja({ e, avisar }) {
  const usuario = useContext(UsuarioCtx);
  const [abierta, setAbierta] = useState(null);       // id de la ruta que se está liquidando
  const [form, setForm] = useState({ recibido: "", nota: "" });
  const [foto, setFoto] = useState(null);             // id del pago cuyo comprobante se ve
  const [diaAb, setDiaAb] = useState(null);           // conductor|fecha del día que se está liquidando
  const [formDia, setFormDia] = useState({ recibido: "", nota: "" });
  const pend = D.liquidacionesPendientes(e);
  const dias = D.resumenDiaConductores(e).filter((g) => g.rutas.length >= 2);
  const enRutaPend = new Set(pend.flatMap((d) => D.liquidacionRuta(e, d).pagos.map((x) => x.id)));
  const sueltos = D.pagosPorVerificar(e).filter((x) => !enRutaPend.has(x.id));
  const cli = (p) => e.clientes.find((c) => c.id === e.pedidos.find((y) => y.id === p.pedidoId)?.clienteId)?.nombre || "—";
  const hacer = (fn, ok) => { const r = accion(fn); avisar(r.ok ? ok : r.error, !r.ok); return r.ok; };
  const filaPago = (x) => (
    <div key={x.id} data-pago-digital={x.id}>
      <div className="fila"><span className="sub">{cli(x)} · {x.medio} · {plata(x.valor)}</span>
        {x.verificado ? <Chip nivel="ok">Verificado</Chip> : <span style={{ display: "flex", gap: 6 }}>
          {D.imagenProducto(e, "cp_" + x.id) && <button className="s" data-ver-comprobante onClick={() => setFoto(foto === x.id ? null : x.id)}>{foto === x.id ? "Ocultar" : "Ver foto"}</button>}
          <button className="p" data-verificar-pago onClick={() => hacer((s) => D.verificarPago(s, x.id, usuario), "Pago verificado")}>Verificar</button></span>}</div>
      {!D.imagenProducto(e, "cp_" + x.id) && !x.verificado && <div className="sub" style={{ color: "var(--mal)" }}>Sin foto del comprobante</div>}
      {foto === x.id && <img src={D.imagenProducto(e, "cp_" + x.id)} alt="Comprobante" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 12, background: "#000", margin: "6px 0" }} />}
    </div>);
  if (!pend.length && !sueltos.length) return <div className="tarj sub" data-caja-vacia>Caja al día: no hay rutas por liquidar ni pagos por verificar.</div>;
  return (
    <>
      {dias.map((g) => { const k = g.conductor + "|" + g.fecha, rec = parseInt(String(formDia.recibido).replace(/\D/g, "")), dif = Number.isFinite(rec) ? rec - g.efectivoPend : null; return (
        <div className="tarj" key={k} data-liquidar-dia={g.conductor} style={{ borderColor: "var(--pri)" }}>
          <div className="fila"><b>{g.conductor} · {D.fechaTxt(g.fecha)}</b><Chip nivel="poco">{g.rutas.length} rutas</Chip></div>
          <div className="sub">{g.rutas.length} rutas en el día · {g.pendientes.length} por liquidar{g.enCurso > 0 ? ` · ${g.enCurso} aún en curso` : ""}</div>
          <div className="fila"><span>Efectivo que debe entregar (todas las rutas)</span><b data-efectivo-dia>{plata(g.efectivoPend)}</b></div>
          {g.digitalPend > 0 && <div className="fila"><span>Nequi, Daviplata y otros</span><b>{plata(g.digitalPend)}</b></div>}
          {g.enCurso > 0 ? <div className="sub" data-dia-en-curso>Espera a que termine la ruta en curso para liquidar el día completo.</div>
            : diaAb === k ? (
              <div style={{ marginTop: 8 }}>
                <label>Efectivo total que recibiste de {g.conductor}</label><input data-dia-recibido inputMode="numeric" value={formDia.recibido} onChange={(x) => setFormDia({ ...formDia, recibido: x.target.value })} />
                {dif !== null && dif !== 0 && <div className="alerta sin" data-dia-diferencia>{dif < 0 ? "Faltan " : "Sobran "}{plata(Math.abs(dif))}</div>}
                <label>Nota {dif ? "(obligatoria si hay diferencia)" : "(opcional)"}</label><input data-dia-nota value={formDia.nota} onChange={(x) => setFormDia({ ...formDia, nota: x.target.value })} />
                <button className="p g" data-cerrar-dia onClick={() => { if (hacer((s) => D.cerrarLiquidacionDia(s, g.conductor, g.fecha, { recibido: formDia.recibido, nota: formDia.nota, usuario }), "Día liquidado")) { setDiaAb(null); setFormDia({ recibido: "", nota: "" }); } }}>Liquidar todas las rutas del día</button>
              </div>) : <button className="p g" data-abrir-dia onClick={() => { setDiaAb(k); setFormDia({ recibido: "", nota: "" }); }}>Recibir el efectivo del día</button>}
        </div>); })}
      {pend.map((d) => { const l = D.liquidacionRuta(e, d); const rec = parseInt(String(form.recibido).replace(/\D/g, "")); const dif = Number.isFinite(rec) ? rec - l.efectivo : null; return (
        <div className="tarj" key={d.id} data-liquidar-ruta={d.numero}>
          <div className="fila"><b>Ruta #{d.numero}{d.nombre ? " · " + d.nombre : ""}</b><Chip nivel="poco">Por liquidar</Chip></div>
          <div className="sub">{D.conductorRuta(e, d)} · {D.fechaTxt(d.fecha)}{e.vehiculos.find((v) => v.id === d.vehiculoId) ? " · " + e.vehiculos.find((v) => v.id === d.vehiculoId).nombre : ""}</div>
          <div className="fila"><span>Efectivo que debe entregar</span><b data-efectivo-esperado>{plata(l.efectivo)}</b></div>
          <div className="fila"><span>Nequi, Daviplata y otros ({l.digitales.length})</span><b>{plata(l.totalDigital)}</b></div>
          {l.digitales.map(filaPago)}
          {abierta === d.id ? (
            <div style={{ marginTop: 8 }}>
              <label>Efectivo que recibiste</label><input data-efectivo-recibido inputMode="numeric" value={form.recibido} onChange={(x) => setForm({ ...form, recibido: x.target.value })} />
              {dif !== null && dif !== 0 && <div className="alerta sin" data-diferencia>{dif < 0 ? "Faltan " : "Sobran "}{plata(Math.abs(dif))}</div>}
              <label>Nota {dif ? "(obligatoria si hay diferencia)" : "(opcional)"}</label><input data-liq-nota value={form.nota} onChange={(x) => setForm({ ...form, nota: x.target.value })} />
              {l.sinVerificar > 0 && <div className="sub">Quedan {l.sinVerificar} comprobante{l.sinVerificar === 1 ? "" : "s"} sin verificar; seguirán apareciendo hasta que los verifiques.</div>}
              <button className="p g" data-cerrar-liquidacion onClick={() => { if (hacer((s) => D.cerrarLiquidacion(s, d.id, { recibido: form.recibido, nota: form.nota, usuario }), "Ruta liquidada")) { setAbierta(null); setForm({ recibido: "", nota: "" }); } }}>Cerrar liquidación</button>
            </div>) : <button className="p g" data-abrir-liquidacion onClick={() => { setAbierta(d.id); setForm({ recibido: "", nota: "" }); }}>Recibir efectivo y liquidar</button>}
        </div>); })}
      {sueltos.length > 0 && <div className="tarj" data-pagos-por-verificar><b>Pagos por verificar ({sueltos.length})</b>{sueltos.map(filaPago)}</div>}
    </>);
}

function Cobros({ e, avisar }) {
  const [cob, setCob] = useState(null);
  const rol = useRol();
  const filas = e.clientes.map((c) => ({ c, deuda: D.carteraCliente(e, c.id) })).filter((x) => x.deuda > 0).sort((a, b) => b.deuda - a.deuda);
  const total = filas.reduce((s, x) => s + x.deuda, 0);
  const cred = D.creditosPendientes(e), venc = cred.filter((x) => x.vencido), vencDe = (id) => cred.find((x) => x.pedidoId === id);
  return (
    <>
      <h1>Cobros</h1>
      {puede(rol, "liquidar") && <LiquidacionesCaja e={e} avisar={avisar} />}
      <div className="tarj kpi"><small>Cartera por cobrar</small><b data-cartera>{plata(total)}</b><small>{filas.length} clientes con saldo{venc.length > 0 ? ` · vencido: ${plata(venc.reduce((t, x) => t + x.saldo, 0))}` : ""}</small></div>
      {!filas.length && <div className="vacio">Nadie debe nada.</div>}
      {filas.map(({ c, deuda }) => (
        <div className="tarj" key={c.id} data-deudor={c.nombre}>
          <div className="fila"><b>{c.nombre}</b><b>{plata(deuda)}</b></div>
          <div className="sub">{[c.negocio, c.zona, c.tel].filter(Boolean).join(" · ")}</div>
          {e.pedidos.filter((p) => p.clienteId === c.id && p.estado === "entregado" && D.saldoPedido(e, p) > 0).map((p) => (
            <div key={p.id}><div className="fila"><span className="sub">Pedido #{p.numero} · {D.fechaTxt(p.fecha)}{(() => { const v = vencDe(p.id); return v ? <b data-vence style={{ color: v.vencido ? "#dc2626" : "inherit" }}>{(v.nueva ? " · NUEVA" : "") + " · " + (v.vencido ? `vencida hace ${-v.diasRestantes} ${v.diasRestantes === -1 ? "día" : "días"}` : v.diasRestantes === 0 ? "vence hoy" : `vence el ${D.fechaTxt(v.vence)}`)}</b> : null; })()}</span>
              {puede(rol, "cobrar") ? <button className="s" data-cobrar onClick={() => setCob(cob === p.id ? null : p.id)}>Cobrar {plata(D.saldoPedido(e, p))}</button> : <span>{plata(D.saldoPedido(e, p))}</span>}</div>
              {cob === p.id && <CobroForm e={e} p={p} avisar={avisar} cerrar={() => setCob(null)} />}</div>))}
        </div>))}
    </>);
}

function Pedidos({ e, avisar }) {
  const rol = useRol();
  const cfg = useContext(CfgCtx);
  const [f, setF] = useState(null);   // null = pantalla de inicio de Pedidos; si no, el grupo que se está viendo
  const [reqVer, setReqVer] = useState(null);
  const [rep, setRep] = useState(null);   // { id, fecha, nota } reprogramando un pedido
  const nombreUsuario = useContext(UsuarioCtx);
  const soloMios = rol === "vendedor" ? nombreUsuario : "";
  const nRep = D.pedidosPorReprogramar(e, soloMios).length;
  const lista = f === null ? e.pedidos.slice().reverse().slice(0, 5) : (f === "reprogramar" ? D.pedidosPorReprogramar(e, soloMios) : e.pedidos.filter((p) => f === "todos" || p.estado === f)).slice().reverse();
  const cuantos = (k) => (k === "reprogramar" ? nRep : k === "todos" ? e.pedidos.length : e.pedidos.filter((p) => p.estado === k).length);
  const GRUPOS = [["todos", "Todos los pedidos"], ["pendiente", "Pendientes"], ["reprogramar", "Por reprogramar"], ["entregado", "Entregados"], ["presupuesto", "Presupuestos"]];
  const surt = cfg.permitirSinStock ? e.pedidos.filter((p) => p.estado === "pendiente").map((p) => p.id) : D.pedidosYaSurtibles(e);
  const cli = (id) => e.clientes.find((c) => c.id === id)?.nombre || "—";
  const nom = (id) => e.productos.find((p) => p.id === id)?.nombre;
  const [cob, setCob] = useState(null);
  const empresa = useContext(EmpresaCtx);
  const enviar = (p) => { const tel = e.clientes.find((c) => c.id === p.clienteId)?.tel; window.open(D.urlWhatsApp(tel, D.textoPedido(e, p, empresa, cfg)), "_blank"); };
  return (
    <>
      {reqVer && <Requisicion e={e} p={reqVer} empresa={empresa} cfg={cfg} cerrar={() => setReqVer(null)} />}
      {f === null ? <>
        <h1>Pedidos</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }} data-pedidos-inicio>
          {GRUPOS.map(([k, t]) => (
            <button key={k} className="tarj" data-filtro={k} onClick={() => setF(k)} style={{ margin: 0, textAlign: "left", font: "inherit", color: "var(--tx)", cursor: "pointer", position: "relative" }}>
              <div className="sub">{t}</div><b style={{ fontSize: 24 }}>{cuantos(k)}</b>
              {k === "reprogramar" && nRep > 0 && <i className="insignia" style={{ position: "absolute", top: -7, right: -6 }}>{nRep}</i>}
            </button>))}
        </div>
        <h2>Últimos pedidos</h2>
      </> : <>
        <button className="s" data-volver-pedidos onClick={() => setF(null)}>← Pedidos</button>
        <h1 style={{ marginTop: 10 }}>{GRUPOS.find(([k]) => k === f)?.[1]}</h1>
      </>}
      {!lista.length && <div className="vacio">Nada por aquí todavía.</div>}
      {lista.map((p) => (
        <div className="tarj" key={p.id} data-pedido={p.numero}>
          <div className="fila"><b>#{p.numero} · {cli(p.clienteId)}</b><Chip nivel={p.estado === "entregado" ? "ok" : p.estado === "anulado" ? "sin" : "poco"}>{p.estado}</Chip></div>
          <div className="sub">{D.fechaTxt(p.fecha)} · {p.tipo}{p.estado === "pendiente" ? (D.estadoReq(p) === "alistada" ? " · ✔ alistada por bodega" : " · en bodega por alistar") : ""}{p.factura ? " · Factura " + p.factura.numero : ""}</div>
          {(p.estado === "pendiente" || p.estado === "entregado") && <div className="sub" data-estado-entrega style={p.porReprogramar ? { color: "var(--mal)", fontWeight: 600 } : undefined}>{D.estadoEntrega(e, p)}{p.reprogramado && !p.porReprogramar && p.estado === "pendiente" ? " · reprogramado por " + (p.reprogramado.usuario || "el vendedor") : ""}</div>}
          {p.items.map((i, k) => <div className="fila sub" key={k}><span>{i.cant} × {nom(i.productoId)}</span><span>{i.bonif ? "regalo" : plata(i.cant * i.precio)}</span></div>)}
          {(p.iva > 0 || p.retencion > 0) && <div className="sub" data-pedido-imp>
            {p.iva > 0 && <div className="fila"><span>{cfg.ivaEtiqueta}{p.ivaIncluido ? " (incluido)" : ""}</span><span>{plata(p.iva)}</span></div>}
            {p.retencion > 0 && <div className="fila"><span>Retención</span><span>-{plata(p.retencion)}</span></div>}</div>}
          {p.estado === "presupuesto" && p.validoHasta && <div className="sub">Válido hasta {D.fechaTxt(p.validoHasta)}{p.validoHasta < D.hoyISO() ? " · vencido" : ""}</div>}
          <div className="fila"><b>{plata(D.totalPedido(p))}</b>
            {p.estado === "presupuesto" && puede(rol, "vender") && <button className="p" data-aprobar onClick={() => { const r = accion((s) => D.aprobarPresupuesto(s, p.id, { limiteCartera: D.limiteCliente(e.clientes.find((c) => c.id === p.clienteId), cfg), bloquearCarteraDias: D.diasBloqueoCliente(e.clientes.find((c) => c.id === p.clienteId), cfg) })); avisar(r.ok ? "Presupuesto convertido en pedido" : r.error, !r.ok); }}>Convertir en pedido</button>}
            {p.estado === "presupuesto" && puede(rol, "vender") && <button className="s" data-anular-presupuesto onClick={() => accion((s) => D.anularPedido(s, p.id, { motivo: "Presupuesto descartado", usuario: nombreUsuario }))}>Descartar</button>}
            {p.estado !== "anulado" && p.estado !== "presupuesto" && <button className="s" data-req-abrir onClick={() => setReqVer(p)}>Remisión</button>}
            {p.estado !== "anulado" && <button className="s" data-whatsapp onClick={() => enviar(p)}>WhatsApp</button>}
            {D.telAvisoVendedor(e, p) && p.usuario !== nombreUsuario && <button className="s" data-avisar-vendedor onClick={() => window.open(D.urlWhatsApp(D.telAvisoVendedor(e, p), D.textoAvisoVendedor(e, p, empresa)), "_blank")}>Avisar a {String(p.usuario).split(" ")[0]}</button>}
            {p.estado === "entregado" && D.saldoPedido(e, p) > 0 && puede(rol, "cobrar") && <button className="s" data-cobrar onClick={() => setCob(cob === p.id ? null : p.id)}>Cobrar {plata(D.saldoPedido(e, p))}</button>}
            {p.estado === "pendiente" && !p.porReprogramar && (surt.includes(p.id)
              ? <Chip nivel="neu">Lo entrega el conductor en su ruta</Chip>
              : <Chip nivel="sin">Falta stock</Chip>)}
          </div>
          {p.porReprogramar && p.devolucion && <div className="sub" data-devolucion>Intento {p.intentos || 1}: {p.devolucion.motivo} · {D.fechaTxt(p.devolucion.fecha)} · {p.devolucion.recibido ? "recibido en bodega" : "mercancía por recibir en bodega"}</div>}
          {p.porReprogramar && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {puede(rol, "recibirDevuelto") && p.devolucion && !p.devolucion.recibido && <button className="s" data-recibir-devuelto onClick={() => { const r = accion((s) => D.recibirDevuelto(s, p.id, nombreUsuario)); avisar(r.ok ? "Mercancía recibida en bodega" : r.error, !r.ok); }}>Recibí la mercancía en bodega</button>}
            {puede(rol, "reprogramar") && <button className="p" data-reprogramar onClick={() => setRep(rep?.id === p.id ? null : { id: p.id, fecha: D.sumarDias(D.hoyISO(), 1), nota: "" })}>Reprogramar</button>}
            {puede(rol, "reprogramar") && <button className="s" data-anular-devuelto onClick={() => { const r = accion((s) => D.anularPedido(s, p.id, { motivo: p.devolucion?.motivo ? "El cliente no reprograma (" + p.devolucion.motivo + ")" : "El cliente no reprograma", usuario: nombreUsuario })); avisar(r.ok ? "Pedido anulado: su remisión quedó en Remisiones anuladas" : r.error, !r.ok); }}>El cliente ya no lo quiere (anular)</button>}
          </div>}
          {rep?.id === p.id && <div style={{ marginTop: 8 }} data-reprogramar-form>
            <label>Nueva fecha de entrega</label><input type="date" data-rep-fecha value={rep.fecha} min={D.hoyISO()} onChange={(x) => setRep({ ...rep, fecha: x.target.value })} />
            <label>Nota (qué acordó con el cliente)</label><input data-rep-nota value={rep.nota} onChange={(x) => setRep({ ...rep, nota: x.target.value })} />
            <button className="p g" data-rep-ok onClick={() => { const r = accion((s) => D.reprogramarPedido(s, p.id, { fecha: rep.fecha, nota: rep.nota, usuario: nombreUsuario })); avisar(r.ok ? "Pedido reprogramado: bodega lo verá para la nueva fecha" : r.error, !r.ok); if (r.ok) setRep(null); }}>Guardar nueva fecha</button>
          </div>}
          {cob === p.id && <CobroForm e={e} p={p} avisar={avisar} cerrar={() => setCob(null)} />}
        </div>
      ))}
    </>
  );
}

function Stock({ e, avisar }) {
  const rol = useRol();
  const [det, setDet] = useState(null);
  const [pest, setPest] = useState("productos");
  const sug = D.sugerenciaCompra(e);
  const cfgS = useContext(CfgCtx), nombreUs = useContext(UsuarioCtx);
  const [fechando, setFechando] = useState(null);   // { cant, lote, vence }
  const diasV = cfgS.diasAvisoVence || 30;
  if (det) {
    const p = e.productos.find((x) => x.id === det);
    const h = D.hoyISO();
    const k = D.kardex(e, det, D.sumarDias(h, -6), h).reverse();
    const ajustarConteo = () => {
      const v = prompt("¿Cuántas unidades hay realmente?", D.stockBodega(e, det)); if (v === null) return;
      const r = accion((s) => D.ajustar(s, det, parseInt(v) || 0, "bodega")); avisar(r.ok ? "Stock ajustado" : r.error, !r.ok);
    };
    return (
      <>
        <button className="s" onClick={() => setDet(null)}>← Volver</button>
        <h1 style={{ marginTop: 12 }}>{p.nombre}</h1>
        <div className="rej">
          <div className="tarj kpi"><small>En bodega</small><b>{D.stockBodega(e, det)}</b></div>
          {D.stockFisico(e, det) !== D.stockBodega(e, det) && <div className="tarj kpi" data-en-vehiculos><small>En vehículos</small><b>{D.stockFisico(e, det) - D.stockBodega(e, det)}</b></div>}
          <div className="tarj kpi"><small>Disponible (sin reservas)</small><b>{Math.max(0, D.disponible(e, det))}</b></div>
        </div>
        {D.enCamino(e, det).map((x) => <div className="alerta ok" key={x.compraId}>Llegan {x.cant} el {D.fechaTxt(x.fecha)} (compra #{x.numero})</div>)}
        {p.controlaVence && (() => {
          const ls = D.lotesProducto(e, det, { dias: diasV }), sin = ls.find((x) => x.estado === "sin");
          const etq = { vencido: ["sin", "Vencido"], por_vencer: ["poco", "Vence pronto"], ok: ["ok", "Vigente"], sin: ["neu", "Sin fecha"] };
          return (
            <div data-lotes>
              <h2>Lotes y vencimientos</h2>
              <div className="tarj">
                {!ls.length && <div className="sub">No hay unidades en existencia.</div>}
                {ls.map((l, k) => <div className="fila" key={k} data-lote={l.lote || "sin"}><span>{l.lote ? "Lote " + l.lote : "Sin lote"}<div className="sub">{l.vence ? "Vence " + D.fechaTxt(l.vence) : "Sin fecha de vencimiento"}</div></span><span><b>{l.cant}</b> <Chip nivel={etq[l.estado][0]}>{etq[l.estado][1]}</Chip></span></div>)}
              </div>
              {sin && puede(rol, "ajustar") && !fechando && <button className="s" data-poner-fecha onClick={() => setFechando({ cant: String(sin.cant), lote: "", vence: "" })}>Ponerle fecha a las {sin.cant} unidades sin fecha</button>}
              {fechando && sin && (
                <div className="tarj" data-form-fecha>
                  <label>¿Cuántas unidades tienen esta fecha? (máx. {sin.cant})</label><input data-ff="cant" inputMode="numeric" value={fechando.cant} onChange={(x) => setFechando({ ...fechando, cant: x.target.value.replace(/\D/g, "") })} />
                  <label>Lote (opcional)</label><input data-ff="lote" value={fechando.lote} onChange={(x) => setFechando({ ...fechando, lote: x.target.value })} />
                  <label>Fecha de vencimiento</label><input data-ff="vence" type="date" value={fechando.vence} onChange={(x) => setFechando({ ...fechando, vence: x.target.value })} />
                  <div className="fila"><button className="p" data-ff-guardar onClick={() => { const r = accion((s) => D.fecharStock(s, { productoId: det, cant: fechando.cant, lote: fechando.lote, vence: fechando.vence, usuario: nombreUs })); if (!r.ok) return avisar(r.error, true); avisar("Fecha guardada"); setFechando(null); }}>Guardar fecha</button><button className="s" onClick={() => setFechando(null)}>Cancelar</button></div>
                </div>)}
            </div>);
        })()}
        <h2>Kárdex, últimos 7 días</h2>
        <div className="tarj"><table><thead><tr><th>Día</th><th>Inicial</th><th>Entra</th><th>Sale</th><th>Final</th></tr></thead>
          <tbody>{k.map((f) => <tr key={f.fecha}><td>{D.fechaCortaTxt(f.fecha)}</td><td>{f.inicial}</td><td>{f.entradas || "·"}</td><td>{f.salidas || "·"}</td><td><b>{f.final}</b></td></tr>)}</tbody></table></div>
        <h2>Movimientos</h2>
        {e.movimientos.filter((m) => m.productoId === det).slice(-10).reverse().map((m) => (
          <div className="fila sub" key={m.id}><span>{D.fechaTxt(m.fecha)} · {m.tipo} {m.ref}</span><b style={{ color: m.cant > 0 ? "var(--ok)" : "var(--mal)" }}>{m.cant > 0 ? "+" : ""}{m.cant}</b></div>))}
        {puede(rol, "ajustar") && <button className="s g" style={{ marginTop: 14 }} onClick={ajustarConteo}>Ajustar por conteo físico</button>}
      </>
    );
  }
  return (
    <>
      <h1>Inventario</h1>
      {e.vehiculos.some((v) => v.activo !== false) && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className={pest === "productos" ? "p" : "s"} data-pest-inv="productos" style={{ flex: 1 }} onClick={() => setPest("productos")}>Bodega</button>
        <button className={pest === "vehiculos" ? "p" : "s"} data-pest-inv="vehiculos" style={{ flex: 1 }} onClick={() => setPest("vehiculos")}>Vehículos</button>
      </div>}
      {pest === "vehiculos" && <InventarioVehiculos e={e} avisar={avisar} />}
      {pest === "productos" && !e.productos.length && <div className="vacio">Aún no hay productos.</div>}
      {pest === "productos" && e.productos.filter(D.esActivo).map((p) => {
        const d = D.disponible(e, p.id), cam = D.totalEnCamino(e, p.id);
        const nivel = d <= 0 ? "sin" : d <= (p.min || 0) ? "poco" : "ok";
        const lv = p.controlaVence ? D.lotesProducto(e, p.id, { dias: diasV }) : [], nV = lv.filter((x) => x.estado === "vencido").reduce((a, x) => a + x.cant, 0), nP = lv.filter((x) => x.estado === "por_vencer").reduce((a, x) => a + x.cant, 0);
        return (
          <div className="tarj" key={p.id} data-stock={p.nombre} onClick={() => setDet(p.id)}>
            <div className="fila"><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Miniatura e={e} id={p.id} tam={38} /><b>{p.nombre}</b></div><Chip nivel={nivel}>{d <= 0 ? "Agotado" : d <= (p.min || 0) ? "Bajo" : "Bien"} · {Math.max(0, d)}</Chip></div>
            <div className="sub">En bodega {D.stockBodega(e, p.id)}{D.stockFisico(e, p.id) !== D.stockBodega(e, p.id) ? ` · ${D.stockFisico(e, p.id) - D.stockBodega(e, p.id)} en vehículos` : ""}{cam ? ` · ${cam} en camino` : ""}</div>
            {(nV > 0 || nP > 0) && <div className="sub" data-aviso-vence style={{ color: nV ? "var(--mal)" : "var(--aviso, var(--tx))" }}>{nV > 0 ? `${nV} vencidas` : ""}{nV > 0 && nP > 0 ? " · " : ""}{nP > 0 ? `${nP} vencen pronto` : ""}</div>}
          </div>);
      })}
      {pest === "productos" && sug.length > 0 && <><h2>Sugerencia de compra</h2><div className="tarj">{sug.map((s) => <div className="fila" key={s.productoId}><span>{s.nombre}<div className="sub">{s.diasStock == null ? "sin ventas recientes" : `alcanza ~${Math.floor(s.diasStock)} días`}</div></span><Chip nivel="neu">pedir {s.pedir}</Chip></div>)}</div></>}
    </>
  );
}


// Inventario por vehículo: se carga mercancía de la bodega al vehículo, se vende desde él y al final se devuelve lo que sobra
function InventarioVehiculos({ e, avisar }) {
  const rol = useRol();
  const nombreUsuario = useContext(UsuarioCtx);
  const [sel, setSel] = useState(null);       // vehículo abierto
  const [modo, setModo] = useState(null);     // "cargar" | "devolver"
  const [q, setQ] = useState({}); const [busca, setBusca] = useState("");
  const vehs = e.vehiculos.filter((v) => v.activo !== false);
  const total = (v) => D.inventarioVehiculo(e, v.id).reduce((s, x) => s + x.cant, 0);
  const v = sel && e.vehiculos.find((x) => x.id === sel);
  const puedeMover = puede(rol, "ajustar");
  const cerrarForm = () => { setModo(null); setQ({}); setBusca(""); };
  const guardar = () => {
    const items = Object.entries(q).map(([productoId, cant]) => ({ productoId, cant: +cant || 0 }));
    const r = accion((s) => (modo === "cargar" ? D.cargarVehiculo : D.descargarVehiculo)(s, { vehiculoId: v.id, items, usuario: nombreUsuario }));
    if (!r.ok) return avisar(r.error, true);
    avisar(modo === "cargar" ? `Vehículo cargado (${r.r.reduce((s, x) => s + x.cant, 0)} unidades)` : "Devuelto a la bodega"); cerrarForm();
  };
  const contar = (pid, actual) => {
    const x = prompt("¿Cuántas unidades hay realmente en el vehículo?", actual); if (x === null) return;
    const r = accion((s) => D.ajustarVehiculo(s, v.id, pid, parseInt(x) || 0, nombreUsuario)); avisar(r.ok ? "Conteo guardado" : r.error, !r.ok);
  };
  if (v && modo) {
    const inv = D.inventarioVehiculo(e, v.id);
    const filas = modo === "cargar"
      ? e.productos.filter((p) => D.esActivo(p) && D.stockBodega(e, p.id) > 0 && p.nombre.toLowerCase().includes(busca.toLowerCase())).map((p) => ({ id: p.id, nombre: p.nombre, max: D.stockBodega(e, p.id) }))
      : inv.filter((x) => x.cant > 0).map((x) => ({ id: x.productoId, nombre: x.nombre, max: x.cant }));
    return (
      <>
        <button className="s" onClick={cerrarForm}>← Volver</button>
        <h2 style={{ marginTop: 12 }}>{modo === "cargar" ? `Cargar ${v.nombre}` : `Devolver de ${v.nombre} a bodega`}</h2>
        {modo === "cargar" && <input placeholder="Buscar producto…" value={busca} onChange={(x) => setBusca(x.target.value)} />}
        {modo === "devolver" && filas.length > 0 && <button className="s" data-todo style={{ marginBottom: 10 }} onClick={() => setQ(Object.fromEntries(filas.map((f) => [f.id, f.max])))}>Devolver todo</button>}
        {!filas.length && <div className="vacio">{modo === "cargar" ? "No hay productos con stock en bodega." : "El vehículo no lleva nada."}</div>}
        {filas.map((f) => <div className="fila tarj" key={f.id} data-vf={f.nombre}><span>{f.nombre}<div className="sub">{modo === "cargar" ? "En bodega" : "En el vehículo"}: {f.max}</div></span>
          <input style={{ width: 80, margin: 0 }} inputMode="numeric" placeholder="0" data-vq={f.nombre} value={q[f.id] || ""} onChange={(x) => setQ({ ...q, [f.id]: x.target.value })} /></div>)}
        <button className="p g" data-vguardar style={{ marginTop: 14 }} onClick={guardar}>{modo === "cargar" ? "Cargar al vehículo" : "Devolver a bodega"}</button>
      </>);
  }
  if (v) {
    const inv = D.inventarioVehiculo(e, v.id);
    const ult = e.movimientos.filter((m) => m.bodegaId === D.bodegaVeh(v.id)).slice(-8).reverse();
    return (
      <>
        <button className="s" onClick={() => setSel(null)}>← Vehículos</button>
        <h2 style={{ marginTop: 12 }}>{v.nombre}{v.placa ? " · " + v.placa : ""}</h2>
        {v.conductor && <div className="sub">Conductor: {v.conductor}</div>}
        <div className="tarj kpi" style={{ margin: "10px 0" }}><small>Unidades que lleva</small><b data-v-total>{total(v)}</b></div>
        {puedeMover && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className="p" data-cargar style={{ flex: 1 }} onClick={() => setModo("cargar")}>Cargar productos</button>
          <button className="s" data-devolver style={{ flex: 1 }} onClick={() => setModo("devolver")}>Devolver a bodega</button></div>}
        {!inv.length && <div className="vacio">El vehículo no lleva mercancía. Cárgalo para poder vender desde él.</div>}
        {inv.map((x) => <div className="tarj fila" key={x.productoId} data-vinv={x.nombre}><span>{x.nombre}</span><span style={{ display: "flex", gap: 10, alignItems: "center" }}><b>{x.cant}</b>{puedeMover && <button className="s" onClick={() => contar(x.productoId, x.cant)}>Contar</button>}</span></div>)}
        {ult.length > 0 && <><h2>Movimientos</h2>{ult.map((m) => <div className="fila sub" key={m.id}><span>{D.fechaTxt(m.fecha)} · {m.tipo} {m.ref} · {e.productos.find((p) => p.id === m.productoId)?.nombre}</span><b style={{ color: m.cant > 0 ? "var(--ok)" : "var(--mal)" }}>{m.cant > 0 ? "+" : ""}{m.cant}</b></div>)}</>}
      </>);
  }
  return (
    <>
      {!vehs.length && <div className="vacio">Aún no hay vehículos. Créalos en Rutas y Despachos → Vehículos.</div>}
      {vehs.map((x) => <div className="tarj" key={x.id} data-veh-inv={x.nombre} onClick={() => setSel(x.id)}>
        <div className="fila"><b>{x.nombre}{x.placa ? " · " + x.placa : ""}</b><Chip nivel={total(x) > 0 ? "ok" : "neu"}>{total(x)} unid.</Chip></div>
        <div className="sub">{x.conductor ? "Conductor: " + x.conductor + " · " : ""}{D.inventarioVehiculo(e, x.id).length} productos</div></div>)}
    </>);
}

function Compras({ e, avisar }) {
  const rol = useRol();
  const [nueva, setNueva] = useState(false);
  const [prov, setProv] = useState(""); const [fecha, setFecha] = useState(D.sumarDias(D.hoyISO(), 3)); const [its, setIts] = useState({});
  const nom = (id) => e.productos.find((p) => p.id === id)?.nombre;
  const [recib, setRecib] = useState(null);   // { id, lotes: {productoId: {lote, vence}} } mientras se pide el lote
  const guardar = () => {
    const items = Object.entries(its).map(([productoId, cant]) => ({ productoId, cant: +cant || 0 }));
    const r = accion((s) => D.crearCompra(s, { proveedor: prov || "Proveedor", fechaEsperada: fecha, items }));
    if (!r.ok) return avisar(r.error, true);
    avisar("Compra registrada"); setNueva(false); setIts({}); setProv("");
  };
  const pedirLotes = (c) => c.items.some((i) => e.productos.find((p) => p.id === i.productoId)?.controlaVence);
  const recibir = (id, lotes = {}) => {
    const r = accion((s) => D.recibirCompra(s, id, "bodega", lotes));
    if (r.ok) setRecib(null);
    avisar(r.ok ? (r.r.length ? `Mercancía recibida. ${r.r.length} pedido(s) ya se pueden entregar` : "Mercancía recibida, stock actualizado") : r.error, !r.ok);
  };
  if (nueva) return (
    <>
      <button className="s" onClick={() => setNueva(false)}>← Volver</button>
      <h1 style={{ marginTop: 12 }}>Nueva compra</h1>
      <label>Proveedor</label>
      {e.proveedores.length > 0 && <select data-prov-sel value={e.proveedores.some((p) => p.nombre === prov) ? prov : ""} onChange={(x) => setProv(x.target.value)}>
        <option value="">Otro (escribir abajo)…</option>
        {e.proveedores.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
      </select>}
      <input data-prov placeholder="Nombre del proveedor" value={prov} onChange={(x) => setProv(x.target.value)} />
      <label>Fecha en que llega</label><input data-fecha type="date" value={fecha} onChange={(x) => setFecha(x.target.value)} />
      {e.productos.filter(D.esActivo).map((p) => <div className="fila" key={p.id}><span>{p.nombre}</span><input style={{ width: 80, margin: 0 }} inputMode="numeric" placeholder="0" data-cc={p.nombre} value={its[p.id] || ""} onChange={(x) => setIts({ ...its, [p.id]: x.target.value })} /></div>)}
      <button className="p g" data-guardar-compra style={{ marginTop: 14 }} onClick={guardar}>Guardar compra</button>
    </>);
  return (
    <>
      <div className="fila"><h1>Compras</h1>{puede(rol, "compras") && <button className="p" data-nueva-compra onClick={() => setNueva(true)}>+ Nueva</button>}</div>
      {!e.compras.length && <div className="vacio">No hay compras registradas.</div>}
      {e.compras.slice().reverse().map((c) => (
        <div className="tarj" key={c.id} data-compra={c.numero}>
          <div className="fila"><b>#{c.numero} · {c.proveedor}</b><Chip nivel={c.estado === "recibida" ? "ok" : c.estado === "cancelada" ? "sin" : "poco"}>{c.estado === "enviada" ? "en camino" : c.estado}</Chip></div>
          <div className="sub">Llega: {D.fechaTxt(c.fechaEsperada)}</div>
          {c.items.map((i, k) => <div className="sub" key={k}>{i.cant} × {nom(i.productoId)}</div>)}
          {recib?.id === c.id && (
            <div className="tarj" data-form-lotes>
              <b>Fecha de vencimiento de lo que llega</b>
              {c.items.filter((i) => e.productos.find((p) => p.id === i.productoId)?.controlaVence).map((i) => (
                <div key={i.productoId} style={{ marginTop: 8 }}>
                  <div className="sub">{nom(i.productoId)} ({i.cant} und)</div>
                  <input data-lote-cod={nom(i.productoId)} placeholder="Lote (opcional)" value={recib.lotes[i.productoId]?.lote || ""} onChange={(x) => setRecib({ ...recib, lotes: { ...recib.lotes, [i.productoId]: { ...recib.lotes[i.productoId], lote: x.target.value } } })} />
                  <input data-lote-vence={nom(i.productoId)} type="date" value={recib.lotes[i.productoId]?.vence || ""} onChange={(x) => setRecib({ ...recib, lotes: { ...recib.lotes, [i.productoId]: { ...recib.lotes[i.productoId], vence: x.target.value } } })} />
                </div>))}
              <div className="fila" style={{ marginTop: 8 }}><button className="p" data-confirmar-recibir onClick={() => recibir(c.id, recib.lotes)}>Confirmar recibo</button><button className="s" onClick={() => setRecib(null)}>Volver</button></div>
            </div>)}
          {c.estado === "enviada" && puede(rol, "compras") && recib?.id !== c.id && <div className="fila"><button className="p" data-recibir onClick={() => pedirLotes(c) ? setRecib({ id: c.id, lotes: {} }) : recibir(c.id)}>Recibir mercancía</button><button className="s" onClick={() => accion((s) => D.cancelarCompra(s, c.id))}>Cancelar</button></div>}
        </div>))}
    </>);
}

const CAT = {
  productos: {
    titulo: "Producto", plural: "Productos", accion: "productos", guardar: D.guardarProducto,
    campos: [["codigo", "Código (opcional)"], ["nombre", "Nombre y presentación"], ["unidad", "Unidad (und, caja, kg…)"], ["precio", "Precio de venta"], ["familia", "Familia (Granos, Aseo, Bebidas…)"], ["costo", "Costo"], ["min", "Alerta de stock mínimo"], ["porCaja", "Unidades por caja (opcional)"], ["iva", "IVA % del producto"], ["stockInicial", "Stock inicial"]],
  },
  clientes: {
    titulo: "Cliente", plural: "Clientes", accion: "clientes", guardar: D.guardarCliente,
    campos: [["nombre", "Nombre"], ["negocio", "Nombre del negocio"], ["nit", "NIT o cédula"], ["tel", "Teléfono"], ["dir", "Dirección"], ["ciudad", "Ciudad, municipio o población"], ["correo", "Correo electrónico (para su factura)"], ["zona", "Zona"], ["vendedor", "Vendedor asignado"], ["codigo", "Código del cliente (opcional)"], ["grupo", "Grupo de clientes"], ["formaPago", "Forma de pago"]],
  },
  proveedores: {
    titulo: "Proveedor", plural: "Proveedores", accion: "proveedores", guardar: D.guardarProveedor,
    campos: [["nombre", "Nombre"], ["codigo", "Código del proveedor (opcional)"], ["nit", "NIT"], ["tel", "Teléfono"], ["correo", "Correo"], ["contacto", "Persona de contacto"], ["dir", "Dirección"], ["condiciones", "Condiciones de pago (contado, 30 días…)"]],
  },
};

function Importador({ tipo, e, avisar, volver }) {
  const cfg = TIPOS[tipo];
  const [res, setRes] = useState(null);
  const [modo, setModo] = useState("omitir");
  const [err, setErr] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const elegir = async (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    setErr(""); setRes(null); setLeyendo(true);
    try {
      const filas = await leerArchivo(file);
      if (filas.length > 5001) throw new Error("Máximo 5.000 filas por archivo");
      const r = analizar(tipo, filas, e);
      if (r.error) setErr(r.error); else setRes(r);
    } catch (x) { setErr(x.message || "No pude leer el archivo"); }
    setLeyendo(false); ev.target.value = "";
  };
  const porGuardar = res ? res.nuevos + (modo === "actualizar" ? res.existentes : 0) : 0;
  const importar = () => {
    const r = accion((st) => aplicar(st, tipo, res, modo));
    if (!r.ok) return avisar(r.error, true);
    avisar(`Listo: ${r.r.nuevos} nuevos, ${r.r.actualizados} actualizados, ${r.r.omitidos} omitidos`); volver();
  };
  return (
    <>
      <button className="s" onClick={volver}>← Volver</button>
      <h1 style={{ marginTop: 12 }}>Importar {cfg.titulo.toLowerCase()} desde Excel</h1>
      <div className="tarj">
        <b>1. Descarga la plantilla</b>
        <p className="sub">Tiene las columnas ya puestas y una hoja con instrucciones. Llénala en Excel y guárdala.</p>
        <button className="s g" data-plantilla onClick={() => descargar(crearXlsx(plantilla(tipo)), cfg.archivo)}>Descargar plantilla</button>
      </div>
      <div className="tarj">
        <b>2. Sube tu archivo</b>
        <p className="sub">Excel (.xlsx) o CSV. La primera fila debe tener los nombres de las columnas.</p>
        <input type="file" data-archivo accept=".xlsx,.csv,.txt" onChange={elegir} />
        {leyendo && <div className="sub">Leyendo…</div>}
        {err && <div className="alerta sin" data-import-error>{err}</div>}
      </div>
      {res && (
        <div className="tarj" data-vista-previa>
          <b>3. Revisa antes de guardar</b>
          <div className="fila"><span>Nuevos</span><Chip nivel="ok"><span data-n-nuevos>{res.nuevos}</span></Chip></div>
          <div className="fila"><span>Ya existen</span><Chip nivel="neu"><span data-n-existen>{res.existentes}</span></Chip></div>
          <div className="fila"><span>Con errores (no se importan)</span><Chip nivel={res.errores.length ? "sin" : "ok"}><span data-n-errores>{res.errores.length}</span></Chip></div>
          {res.filas.slice(0, 5).map((f) => <div className="fila sub" key={f.fila}><span>Fila {f.fila}: {f.datos.nombre}</span><span>{f.existe ? "ya existe" : "nuevo"}</span></div>)}
          {res.filas.length > 5 && <div className="sub">…y {res.filas.length - 5} más</div>}
          {res.errores.slice(0, 10).map((x) => <div className="alerta sin" key={x.fila}>Fila {x.fila}{x.nombre ? ` (${x.nombre})` : ""}: {x.motivo}</div>)}
          {res.errores.length > 10 && <div className="sub">…y {res.errores.length - 10} errores más</div>}
          {res.existentes > 0 && (<>
            <label style={{ marginTop: 10, display: "block" }}>Lo que ya existe, ¿qué hago?</label>
            <select data-modo value={modo} onChange={(x) => setModo(x.target.value)}>
              <option value="omitir">Dejarlo como está (omitir)</option>
              <option value="actualizar">Actualizar con los datos del archivo</option>
            </select>
            {tipo === "productos" && modo === "actualizar" && <div className="sub">El stock de los productos que ya existen no se modifica desde Excel.</div>}
          </>)}
          <button className="p g" data-importar disabled={!porGuardar} style={{ marginTop: 10 }} onClick={importar}>Importar {porGuardar} {porGuardar === 1 ? "registro" : "registros"}</button>
        </div>)}
    </>);
}

function Catalogo({ e, avisar, tipo }) {
  const rol = useRol();
  const cfg = CAT[tipo];
  const cfgEmp = useContext(CfgCtx);
  const [escaneando, setEscaneando] = useState(false);
  const [verOff, setVerOff] = useState(false);
  const edita = puede(rol, cfg.accion);
  const vacio = { ...Object.fromEntries(cfg.campos.map(([k]) => [k, ""])), ...(tipo === "clientes" ? { credito: false, tel2: "", contacto: "", contactoTel: "", plazoDias: "", cupo: "", descuento: "", lat: "", lng: "", aviso: "", obs: "" } : {}) };
  const [f, setF] = useState(null);
  const [importando, setImportando] = useState(false);
  // Buscar, ordenar y filtrar la lista (lo elegido se recuerda en este equipo)
  const clavePref = "lista_" + tipo;
  const pref0 = (() => { try { return JSON.parse(localStorage.getItem(clavePref) || "{}"); } catch { return {}; } })();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState(L.ORDENES[tipo].some(([k]) => k === pref0.orden) ? pref0.orden : L.ORDEN_DEFECTO[tipo]);
  const [campos, setCampos] = useState(Array.isArray(pref0.campos) && pref0.campos.length ? pref0.campos : L.BUSQUEDA_DEFECTO[tipo]);
  const [ocultar, setOcultar] = useState(!!pref0.ocultar);
  const [filtros, setFiltros] = useState({});
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState("");
  const [cerca, setCerca] = useState(null);       // { lat, lng } = "Clientes alrededor"
  const [otroGrupo, setOtroGrupo] = useState(false);   // escribiendo un grupo de clientes nuevo
  const [otros, setOtros] = useState({});               // campos de desplegable donde se está escribiendo un valor nuevo
  // Desplegable con valores fijos y la opción de escribir uno nuevo (familia, unidad, zona, ciudad, vendedor)
  const desplegable = (k, t) => {
    const ops = k === "familia" ? L.opcionesDe(L.FAMILIAS_PRODUCTO, e.productos, "familia") : k === "unidad" ? L.opcionesDe(L.UNIDADES_PRODUCTO, e.productos, "unidad")
      : k === "vendedor" ? [...new Set([...e.pedidos.map((p) => p.usuario), ...e.clientes.map((c) => c.vendedor)].filter(Boolean))].sort() : L.valoresDistintos(e.clientes, k);
    const v = f[k] || "", otro = !!otros[k] || (!!v && !ops.some((x) => L.norm(x) === L.norm(v)));
    return (
      <div key={k}><label>{t}</label>
        <select data-campo={k} value={otro ? "__otro" : v} onChange={(x) => { if (x.target.value === "__otro") { setOtros({ ...otros, [k]: true }); setF({ ...f, [k]: "" }); } else { setOtros({ ...otros, [k]: false }); setF({ ...f, [k]: x.target.value }); } }}>
          <option value="">Sin definir</option>
          {ops.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="__otro">Otro (escribir uno nuevo)…</option>
        </select>
        {otro && <input data-campo={k + "Nuevo"} placeholder="Escribe el nuevo valor" value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />}
      </div>);
  };
  const recordar = (p) => { try { localStorage.setItem(clavePref, JSON.stringify({ orden, campos, ocultar, ...p })); } catch {} };
  const [foto, setFoto] = useState(undefined);       // undefined = sin cambio · "" = quitar · texto = foto nueva
  const abrir = (x) => { setFoto(undefined); setOtroGrupo(false); setOtros({}); setF(x); };
  const elegirFoto = async (ev) => {
    const a = ev.target.files?.[0]; ev.target.value = ""; if (!a) return;
    try { setFoto(await reducirImagen(a)); } catch (err) { avisar(err.message, true); }
  };
  const guardar = () => {
    const r = accion((s) => { const x = cfg.guardar(s, f); if (tipo === "productos" && foto !== undefined) D.guardarImagen(s, x.id, foto); });
    if (!r.ok) return avisar(r.error, true); setF(null); setFoto(undefined); avisar("Guardado");
  };
  if (importando) return <Importador tipo={tipo} e={e} avisar={avisar} volver={() => setImportando(false)} />;
  if (f) return (
    <>
      <button className="s" onClick={() => { setF(null); setFoto(undefined); }}>← Volver</button>
      <h1 style={{ marginTop: 12 }}>{cfg.titulo}</h1>
      {tipo === "productos" && (() => {
        const actual = foto !== undefined ? foto : (f.id ? D.imagenProducto(e, f.id) : "");
        return (
          <div className="tarj" data-foto-zona>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {actual ? <img className="mini" data-foto-vista src={actual} alt="" style={{ width: 84, height: 84 }} /> : <span className="mini vacia" style={{ width: 84, height: 84, fontSize: 40 }}>▦</span>}
              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                <label className="s" style={{ margin: 0, textAlign: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)" }}>Tomar foto<input data-foto-camara type="file" accept="image/*" capture="environment" hidden onChange={elegirFoto} /></label>
                <label className="s" style={{ margin: 0, textAlign: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)" }}>Elegir de la galería<input data-foto-galeria type="file" accept="image/*" hidden onChange={elegirFoto} /></label>
                {actual && <button className="s" data-foto-quitar onClick={() => setFoto("")}>Quitar foto</button>}
              </div>
            </div>
          </div>);
      })()}
      {cfg.campos.map(([k, t]) => k === "formaPago" ? (() => {
        const fp = [...(cfgEmp.formasPago || []), ...(["Crédito"].filter((x) => !(cfgEmp.formasPago || []).includes(x)))];
        if (f.formaPago && !fp.includes(f.formaPago)) fp.push(f.formaPago);
        return <div key={k}><label>{t}</label><select data-campo="formaPago" value={f.formaPago || ""} onChange={(x) => setF({ ...f, formaPago: x.target.value })}><option value="">Sin definir</option>{fp.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>;
      })() : ["familia", "unidad", "zona", "ciudad", "vendedor"].includes(k) ? desplegable(k, t) : k === "grupo" ? (() => {
        const ops = L.opcionesGrupo(e.clientes), enLista = ops.includes(f.grupo), otro = otroGrupo || (!!f.grupo && !enLista);
        return (
          <div key={k}><label>{t}</label>
            <select data-campo="grupo" value={otro ? "__otro" : f.grupo || ""} onChange={(x) => { if (x.target.value === "__otro") { setOtroGrupo(true); setF({ ...f, grupo: "" }); } else { setOtroGrupo(false); setF({ ...f, grupo: x.target.value }); } }}>
              <option value="">Sin grupo</option>
              {ops.map((g) => <option key={g} value={g}>{g}</option>)}
              <option value="__otro">Otro grupo (escribir uno nuevo)…</option>
            </select>
            {otro && <input data-campo="grupoNuevo" placeholder="Nombre del nuevo grupo" value={f.grupo || ""} onChange={(x) => setF({ ...f, grupo: x.target.value })} />}
          </div>);
      })() : (!f.id || k !== "stockInicial") && (k !== "iva" || cfgEmp.ivaActivo) && <div key={k}><label>{t}{k === "codigo" && tipo === "productos" && <button type="button" className="s" data-escanear-codigo style={{ marginLeft: 8, padding: "2px 10px" }} onClick={() => setEscaneando(true)}>Escanear</button>}</label><input data-campo={k} list={k === "familia" ? "dl-familias" : k === "vendedor" ? "dl-vendedores" : k === "zona" ? "dl-zonas" : undefined} value={f[k] ?? ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} /></div>)}
      {tipo === "clientes" && (() => {
        const set = (k) => (x) => setF({ ...f, [k]: x.target.value });
        const solo = (k) => (x) => setF({ ...f, [k]: x.target.value.replace(/\D/g, "") });
        const enlace = { padding: "8px 12px", borderRadius: 12, background: "var(--pri2)", color: "var(--pri)", fontWeight: 600, textDecoration: "none" };
        const ubicar = () => {
          if (!navigator.geolocation) return avisar("Este equipo no permite saber la ubicación", true);
          avisar("Buscando tu ubicación…");
          navigator.geolocation.getCurrentPosition(
            (pos) => { setF((a) => ({ ...a, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) })); avisar("Ubicación tomada. Pulsa Guardar para dejarla en el cliente"); },
            () => avisar("No pude obtener la ubicación. Revisa que el permiso de ubicación esté activado", true),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        };
        const tels = [...new Set([f.tel, f.tel2, f.contactoTel].map((t) => String(t || "").trim()).filter(Boolean))];
        const ec = f.id ? D.estadoCuentaCliente(e, f.id) : null;
        const con = D.tieneUbicacion(f);
        const h = { margin: "18px 0 4px" };
        return (
          <div data-cliente-extra>
            <h3 style={h}>Contacto</h3>
            <label>Teléfono 2 o celular</label><input data-campo="tel2" inputMode="tel" value={f.tel2 ?? ""} onChange={set("tel2")} />
            <label>Persona de contacto</label><input data-campo="contacto" value={f.contacto ?? ""} onChange={set("contacto")} />
            <label>Teléfono de la persona de contacto</label><input data-campo="contactoTel" inputMode="tel" value={f.contactoTel ?? ""} onChange={set("contactoTel")} />
            {tels.length > 0 && <div data-contactar style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}>
              {tels.map((t) => <span key={t} style={{ display: "inline-flex", gap: 6 }}><a style={enlace} href={"tel:" + t}>{t}</a><a style={enlace} href={D.urlWhatsApp(t, "")} target="_blank" rel="noreferrer">WhatsApp</a></span>)}
            </div>}
            <h3 style={h}>Ubicación</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><label>Latitud</label><input data-campo="lat" inputMode="decimal" value={f.lat ?? ""} onChange={set("lat")} /></div>
              <div style={{ flex: 1 }}><label>Longitud</label><input data-campo="lng" inputMode="decimal" value={f.lng ?? ""} onChange={set("lng")} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" className="s g" data-ubicar onClick={ubicar}>Guardar mi ubicación aquí</button>
              {con && <a data-ver-mapa style={enlace} href={`https://www.google.com/maps/dir/?api=1&destination=${+f.lat},${+f.lng}`} target="_blank" rel="noreferrer">Cómo llegar</a>}
              {(f.lat !== "" && f.lat !== undefined) && <button type="button" className="s" data-quitar-ubicacion onClick={() => setF({ ...f, lat: "", lng: "" })}>Quitar</button>}
            </div>
            <h3 style={h}>Crédito y precios</h3>
            {puede(rol, "definirCredito") ? <>
            <div style={{ margin: "4px 0" }}><Interruptor dato="credito" marcado={!!f.credito} onChange={(v) => setF({ ...f, credito: v, plazoDias: v && !(parseInt(f.plazoDias) > 0) ? 15 : f.plazoDias })}>Crédito autorizado (se le puede entregar sin cobrar en el momento)</Interruptor></div>
            <label>Plazo de pago</label>
            <select data-campo="plazoDias" value={String(f.plazoDias === "" || f.plazoDias == null ? 0 : f.plazoDias)} onChange={(x) => setF({ ...f, plazoDias: x.target.value })}>
              {[...new Set([0, 8, 15, 30, 45, 60, parseInt(f.plazoDias) || 0])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n === 0 ? "De contado" : n + " días"}</option>)}
            </select>
            <label>Cupo de crédito ($). 0 = usa el límite general</label><input data-campo="cupo" inputMode="numeric" value={f.cupo ?? ""} onChange={solo("cupo")} />
            </> : <div className="sub" data-credito-lectura style={{ margin: "4px 0" }}>Crédito: {f.credito ? `autorizado, plazo ${parseInt(f.plazoDias) > 0 ? f.plazoDias + " días" : "sin definir"}${parseInt(f.cupo) > 0 ? ", cupo " + plata(+f.cupo) : ""}` : "no autorizado"}. El plazo y el cupo los define Cartera después del estudio de crédito.</div>}
            <label>Descuento comercial (%): se aplica solo al venderle</label><input data-campo="descuento" inputMode="decimal" value={f.descuento ?? ""} onChange={set("descuento")} />
            {ec && (
              <div className="tarj" data-estado-cuenta style={{ marginTop: 8 }}>
                <div className="fila"><b>Estado de cuenta</b><Chip nivel={ec.vencida > 0 ? "sin" : "ok"}>{ec.morosidad}</Chip></div>
                <div className="sub">Debe ahora: <b>{plata(ec.debe)}</b> · {ec.pendientes} {ec.pendientes === 1 ? "pedido pendiente" : "pedidos pendientes"} de pago</div>
                {ec.diasMayor > 0 && <div className="sub">La deuda más vieja tiene {ec.diasMayor} {ec.diasMayor === 1 ? "día" : "días"}{ec.vencida > 0 ? ` · ya pasó su plazo: ${plata(ec.vencida)}` : ""}</div>}
                <div className="sub">{ec.cupo > 0 ? `Cupo: ${plata(ec.cupo)} · le quedan ${plata(ec.disponible)}` : "Sin cupo propio (usa el límite general)"}</div>
                <div className="sub">Última compra: {ec.ultimaCompra ? fechaCorta(ec.ultimaCompra) : "ninguna todavía"}</div>
              </div>)}
            <h3 style={h}>Avisos</h3>
            <label>Aviso de ventas (aparece cuando le vendes)</label><textarea data-campo="aviso" rows={2} value={f.aviso ?? ""} onChange={set("aviso")} />
            <label>Observaciones</label><textarea data-campo="obs" rows={3} value={f.obs ?? ""} onChange={set("obs")} />
          </div>);
      })()}
      {tipo === "productos" && (
        <div data-vence-zona>
          <div style={{ margin: "8px 0" }}><Interruptor dato="controlaVence" marcado={!!f.controlaVence} onChange={(v) => setF({ ...f, controlaVence: v })}>Controla fecha de vencimiento (lotes)</Interruptor></div>
          {f.controlaVence && !f.id && +f.stockInicial > 0 && <>
            <label>Lote del stock inicial (opcional)</label><input data-campo="loteInicial" value={f.loteInicial || ""} onChange={(x) => setF({ ...f, loteInicial: x.target.value })} />
            <label>Vence el (si lo sabes)</label><input data-campo="venceInicial" type="date" value={f.venceInicial || ""} onChange={(x) => setF({ ...f, venceInicial: x.target.value })} /></>}
        </div>)}
      {escaneando && <Escaner onCodigo={(c) => { setF({ ...f, codigo: c }); setEscaneando(false); }} cerrar={() => setEscaneando(false)} />}
      {tipo === "clientes" && (
        <div data-visita-dias>
          <label>Días de visita (arman la Ruta de hoy)</label>
          <div style={{ display: "flex", gap: 4, margin: "4px 0 8px" }}>
            {D.DIAS_SEMANA.map((n, i) => { const on = (f.diasVisita || []).includes(i); return <button type="button" key={i} data-dia-visita={i} className={on ? "p" : "s"} style={{ flex: 1, padding: "8px 0" }} onClick={() => setF({ ...f, diasVisita: on ? f.diasVisita.filter((x) => x !== i) : [...(f.diasVisita || []), i].sort() })}>{n}</button>; })}
          </div>
          <label>Orden en la ruta (1, 2, 3… opcional)</label><input data-campo="ordenRuta" inputMode="numeric" value={f.ordenRuta || ""} onChange={(x) => setF({ ...f, ordenRuta: x.target.value.replace(/\D/g, "") })} />
        </div>)}
      <datalist id="dl-zonas">{L.valoresDistintos(e.clientes, "zona").map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-familias">{[...new Set(e.productos.map((p) => p.familia).filter(Boolean))].map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-vendedores">{[...new Set([...e.pedidos.map((p) => p.usuario), ...e.clientes.map((c) => c.vendedor)].filter(Boolean))].map((x) => <option key={x} value={x} />)}</datalist>
      <button className="p g" data-guardar onClick={guardar}>Guardar</button>
      {f.id && (tipo === "productos" || tipo === "clientes") && puede(rol, "desactivar") && (
        <div className="tarj" style={{ marginTop: 16 }}>
          <div className="sub" style={{ marginBottom: 8 }}>{D.esActivo(f) ? `Si ya no vendes ${tipo === "productos" ? "este producto" : "a este cliente"}, desactívalo: deja de salir en las listas y en Ventas, pero el historial se conserva. Puedes reactivarlo cuando quieras.` : "Está desactivado: no sale en las listas ni en Ventas."}</div>
          <button className="s" data-desactivar onClick={() => { const r = accion((st) => D.activarRegistro(st, tipo, f.id, !D.esActivo(f))); if (r.ok) { setF(null); avisar(D.esActivo(f) ? "Desactivado" : "Reactivado"); } else avisar(r.error, true); }}>{D.esActivo(f) ? "Desactivar" : "Reactivar"}</button>
        </div>)}
    </>);
  const conOff = e[tipo].filter((x) => !D.esActivo(x)).length;
  const base = e[tipo].filter((x) => verOff || D.esActivo(x));
  const deudas = new Map();
  if (tipo === "clientes") for (const p of e.pedidos) if (p.estado === "entregado") { const sd = D.saldoPedido(e, p); if (sd > 0) deudas.set(p.clienteId, (deudas.get(p.clienteId) || 0) + sd); }
  const stocks = new Map(tipo === "productos" ? e.productos.map((p) => [p.id, D.stockFisico(e, p.id)]) : []);
  const distDe = (c) => (cerca && D.tieneUbicacion(c) ? D.distanciaM(cerca.lat, cerca.lng, +c.lat, +c.lng) : null);
  const ctx = { deuda: (id) => deudas.get(id) || 0, stock: (id) => stocks.get(id) || 0, distancia: distDe, tieneUbicacion: D.tieneUbicacion };
  const ordenEf = cerca && tipo === "clientes" ? "cerca" : orden;
  let vista = L.filtrar(tipo, base, filtros, ctx).filter((x) => L.coincide(x, q, campos));
  const sinUbi = ordenEf === "cerca" ? vista.filter((x) => distDe(x) === null).length : 0;
  if (ordenEf === "cerca") vista = vista.filter((x) => distDe(x) !== null);
  vista = L.ordenar(vista, ordenEf, ctx);
  const grupos = L.agrupar(tipo, vista, ordenEf);
  const conIndice = grupos.length > 1 && vista.length > 15 && grupos[0].titulo !== "";
  const detalle = (x) => ({
    productos: `${x.codigo ? x.codigo + " · " : ""}${x.familia ? x.familia + " · " : ""}Stock ${stocks.get(x.id) ?? 0}`,
    clientes: [x.codigo, x.negocio, x.zona, x.ciudad, x.grupo, x.vendedor && "Vendedor: " + x.vendedor, (x.diasVisita || []).length ? "Visita: " + x.diasVisita.map((i) => D.DIAS_SEMANA[i]).join(" ") : ""].filter(Boolean).join(" · "),
    proveedores: [x.codigo, x.nit, x.tel, x.condiciones].filter(Boolean).join(" · "),
  })[tipo];
  const alrededor = () => {
    setMenu(false);
    if (!navigator.geolocation) return avisar("Este equipo no permite saber la ubicación", true);
    avisar("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCerca({ lat: pos.coords.latitude, lng: pos.coords.longitude }); avisar("Clientes ordenados del más cercano al más lejano"); },
      () => avisar("No pude obtener tu ubicación. Revisa que el permiso de ubicación esté activado", true),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };
  const filtroActivo = L.hayFiltros(filtros);
  const abrirSub = (n) => { setSub(sub === n ? "" : n); setMenu(false); };
  const sel = (k, titulo, valores) => (
    <div key={k}><label>{titulo}</label>
      <select data-filtro={k} value={filtros[k] || ""} onChange={(x) => setFiltros({ ...filtros, [k]: x.target.value })}><option value="">Todos</option>{valores.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>);
  const tarjeta = (x) => (
    <div className="tarj" key={x.id} onClick={() => edita && abrir({ ...x })}>
      <div className="fila"><div style={{ display: "flex", gap: 10, alignItems: "center", opacity: D.esActivo(x) ? 1 : 0.55 }}>{tipo === "productos" && <Miniatura e={e} id={x.id} />}<b>{x.nombre}</b>{!D.esActivo(x) && <Chip nivel="sin">desactivado</Chip>}</div>{tipo === "productos" ? (!ocultar && <span>{plata(x.precio)}</span>) : tipo === "clientes" && (cerca && distDe(x) !== null ? <Chip nivel="neu">{D.textoDistancia(distDe(x))}</Chip> : (deudas.get(x.id) || 0) > 0 && <Chip nivel="poco">debe {plata(deudas.get(x.id))}</Chip>)}</div>
      <div className="sub">{detalle(x)}</div>
      {tipo === "clientes" && (x.tel || x.tel2 || D.tieneUbicacion(x)) && <div className="sub" data-contacto-lista style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }} onClick={(ev) => ev.stopPropagation()}>
        {x.tel && <a data-lista-tel href={"tel:" + String(x.tel).replace(/[^\d+]/g, "")} style={{ color: "var(--pri)", fontWeight: 600 }}>Cel: {String(x.tel)}</a>}
        {D.tieneUbicacion(x) ? <a data-lista-ubicacion href={`https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`} target="_blank" rel="noreferrer" style={{ color: "var(--pri)", fontWeight: 600 }}>Ubicación: ver en el mapa</a> : <span data-lista-sin-ubicacion>Sin ubicación guardada</span>}
      </div>}
    </div>);
  return (
    <>
      <div className="fila"><h1>{cfg.plural}</h1>{edita && <button className="p" data-nuevo onClick={() => abrir({ ...vacio })}>+ Nuevo</button>}</div>
      <div className="barra-lista">
        <input data-buscar type="search" placeholder="Buscar…" value={q} onChange={(x) => setQ(x.target.value)} />
        <button className="s" data-menu-lista aria-label="Menú de la lista" onClick={() => { setMenu(!menu); setSub(""); }}>☰</button>
      </div>
      {menu && (
        <div className="menu-lista" data-menu-abierto>
          <div className="menu-lista-tit">Menú</div>
          <button data-mi="ordenar" onClick={() => abrirSub("ordenar")}><span>↕️ Ordenar</span><span>›</span></button>
          {tipo !== "proveedores" && <button data-mi="filtrar" onClick={() => abrirSub("filtrar")}><span>Filtrar</span><span>›</span></button>}
          <button data-mi="buscar" onClick={() => abrirSub("buscar")}><span>Opciones de búsqueda</span><span>›</span></button>
          {tipo === "clientes" && <button data-mi="alrededor" onClick={alrededor}><span>Clientes alrededor</span></button>}
          {tipo === "productos" && <button data-mi="ocultar" onClick={() => { setOcultar(!ocultar); recordar({ ocultar: !ocultar }); setMenu(false); }}><span>{ocultar ? "Mostrar precios" : "Ocultar precios"}</span></button>}
        </div>)}
      {sub === "ordenar" && (
        <div className="tarj" data-sub="ordenar">
          <b>Ordenar por</b>
          {L.ORDENES[tipo].map(([k, t]) => <button key={k} data-orden={k} className={orden === k && !cerca ? "p" : "s"} style={{ display: "block", width: "100%", marginTop: 6, textAlign: "left" }} onClick={() => { setOrden(k); setCerca(null); recordar({ orden: k }); setSub(""); }}>{t}</button>)}
        </div>)}
      {sub === "filtrar" && (
        <div className="tarj" data-sub="filtrar">
          <b>Filtrar</b>
          {tipo === "clientes" && <>
            {sel("zona", "Zona", L.valoresDistintos(e.clientes, "zona"))}
            {sel("vendedor", "Vendedor", L.valoresDistintos(e.clientes, "vendedor"))}
            {sel("grupo", "Grupo", L.valoresDistintos(e.clientes, "grupo"))}
            <div style={{ margin: "8px 0" }}><Interruptor dato="fDeuda" marcado={!!filtros.conDeuda} onChange={(v) => setFiltros({ ...filtros, conDeuda: v })}>Solo los que tienen deuda</Interruptor></div>
            <div style={{ margin: "8px 0" }}><Interruptor dato="fSinUbi" marcado={!!filtros.sinUbicacion} onChange={(v) => setFiltros({ ...filtros, sinUbicacion: v })}>Solo los que no tienen ubicación</Interruptor></div></>}
          {tipo === "productos" && <>
            {sel("familia", "Familia", L.valoresDistintos(e.productos, "familia"))}
            <label>Inventario</label>
            <select data-filtro="stock" value={filtros.stock || ""} onChange={(x) => setFiltros({ ...filtros, stock: x.target.value })}>
              <option value="">Todos</option><option value="con">Con stock</option><option value="sin">Sin stock</option><option value="bajo">Con stock bajo (en su mínimo o menos)</option>
            </select></>}
          <div style={{ display: "flex", gap: 8 }}><button className="s" data-quitar-filtros onClick={() => setFiltros({})}>Quitar filtros</button><button className="p" data-listo onClick={() => setSub("")}>Listo</button></div>
        </div>)}
      {sub === "buscar" && (
        <div className="tarj" data-sub="buscar">
          <b>Buscar en estos datos</b>
          {L.CAMPOS_BUSQUEDA[tipo].map(([k, t]) => <div key={k} style={{ margin: "6px 0" }}><Interruptor dato={"b-" + k} marcado={campos.includes(k)} onChange={(v) => { const n = v ? [...campos, k] : campos.filter((c) => c !== k); if (n.length) { setCampos(n); recordar({ campos: n }); } }}>{t}</Interruptor></div>)}
          <button className="p" data-listo onClick={() => setSub("")}>Listo</button>
        </div>)}
      {edita && <button className="s g" data-ir-importar style={{ marginBottom: 10 }} onClick={() => setImportando(true)}>Importar desde Excel</button>}
      {conOff > 0 && <button className="s" data-ver-off style={{ marginBottom: 10 }} onClick={() => setVerOff(!verOff)}>{verOff ? "Ocultar desactivados" : `Ver desactivados (${conOff})`}</button>}
      {(cerca || filtroActivo || q.trim()) && (
        <div className="sub" data-resumen style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Mostrando {vista.length} de {base.length}</span>
          {cerca && <button className="s" data-quitar-cerca onClick={() => setCerca(null)}>Cerca de mí · Quitar</button>}
          {filtroActivo && <button className="s" data-quitar-filtros2 onClick={() => setFiltros({})}>Quitar filtros</button>}
          {q.trim() && <button className="s" data-limpiar-busqueda onClick={() => setQ("")}>Borrar búsqueda</button>}
        </div>)}
      {sinUbi > 0 && <div className="sub" data-sin-ubicacion style={{ marginBottom: 8 }}>{sinUbi} {sinUbi === 1 ? "cliente no tiene" : "clientes no tienen"} ubicación guardada y no {sinUbi === 1 ? "aparece" : "aparecen"} aquí.</div>}
      {!base.length && <div className="vacio">Aún no hay {cfg.plural.toLowerCase()}. Crea uno con "+ Nuevo" o impórtalos desde Excel.</div>}
      {base.length > 0 && !vista.length && <div className="vacio" data-sin-resultados>Ningún {cfg.titulo.toLowerCase()} coincide con lo que buscas.</div>}
      {conIndice && <div className="indice-lat" data-indice>{grupos.map((g) => <button key={g.clave} onClick={() => document.getElementById("g-" + g.clave)?.scrollIntoView({ block: "start", behavior: "smooth" })}>{L.etiquetaIndice(g.titulo)}</button>)}</div>}
      <div style={conIndice ? { marginRight: 26 } : undefined}>
        {grupos.map((g) => (
          <div key={g.clave}>
            {g.titulo && <div className="grupo-tit" id={"g-" + g.clave} data-grupo>{g.titulo}</div>}
            {g.items.map(tarjeta)}
          </div>))}
      </div>
    </>);
}

const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function Despachos({ e, avisar, empresa }) {
  const rol = useRol();
  const cfg = useContext(CfgCtx), yoNombre = useContext(UsuarioCtx);
  const [sel, setSel] = useState(null);          // id de la ruta abierta en pantalla
  const [nueva, setNueva] = useState(null);      // formulario de ruta nueva
  const [veh, setVeh] = useState(false);
  const cli = (id) => e.clientes.find((c) => c.id === id);
  const vehNom = (id) => e.vehiculos.find((v) => v.id === id)?.nombre || "Sin vehículo";
  const EST = { armado: ["poco", "Armada"], en_ruta: ["neu", "En ruta"], cerrado: ["ok", "Cerrada"] };
  const hacer = (fn, ok) => { const r = accion(fn); avisar(r.ok ? ok : r.error, !r.ok); return r.ok; };
  const libres = D.pedidosParaDespachar(e).slice().sort((a, b) => D.limiteEntrega(e, a).localeCompare(D.limiteEntrega(e, b)));
  const plan = D.planEntregas(e);

  if (veh) return <Vehiculos e={e} avisar={avisar} volver={() => setVeh(false)} />;

  if (nueva) {
    const marcados = nueva.ids, sinRem = D.remisionesSinAlistar(e, marcados);
    const crear = () => { if (hacer((s) => { const d = D.crearDespacho(s, { nombre: nueva.nombre, vehiculoId: nueva.vehiculoId, conductor: nueva.conductor, pedidoIds: marcados, exigirAlistado: true }); setSel(d.id); }, "Ruta creada")) setNueva(null); };
    return (
      <>
        <button className="s" onClick={() => setNueva(null)}>← Volver</button>
        <h1 style={{ marginTop: 10 }}>Nueva ruta</h1>
        <div className="tarj">
          <label>Nombre de la ruta (opcional)</label><input data-ruta-nombre value={nueva.nombre} placeholder="Ej: Zona norte" onChange={(x) => setNueva({ ...nueva, nombre: x.target.value })} />
          <label>Vehículo</label>
          <select data-ruta-vehiculo value={nueva.vehiculoId} onChange={(x) => setNueva({ ...nueva, vehiculoId: x.target.value, conductor: e.vehiculos.find((v) => v.id === x.target.value)?.conductor || "" })}>
            <option value="">Sin vehículo</option>{e.vehiculos.filter((v) => v.activo !== false).map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.placa ? " · " + v.placa : ""}</option>)}
          </select>
          <label>Conductor</label>
          {(cfg.conductores || []).length > 0
            ? <select data-ruta-conductor value={nueva.conductor || ""} onChange={(x) => setNueva({ ...nueva, conductor: x.target.value })}><option value="">Sin conductor</option>{[...new Set([...(cfg.conductores || []), ...(nueva.conductor ? [nueva.conductor] : [])])].map((c) => <option key={c} value={c}>{c}</option>)}</select>
            : <input data-ruta-conductor value={nueva.conductor || ""} placeholder="Nombre del conductor" onChange={(x) => setNueva({ ...nueva, conductor: x.target.value })} />}
        </div>
        <h2>Pedidos por despachar</h2>
        {!libres.length && <div className="vacio">No hay pedidos pendientes libres para una ruta.</div>}
        {libres.map((p) => (
          <label key={p.id} className="tarj" data-libre={p.numero} style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--tx)" }}>
            <input type="checkbox" style={{ width: 22, margin: 0 }} checked={marcados.includes(p.id)} onChange={() => setNueva({ ...nueva, ids: marcados.includes(p.id) ? marcados.filter((i) => i !== p.id) : [...marcados, p.id] })} />
            <div style={{ flex: 1 }}><b>#{p.numero} · {cli(p.clienteId)?.nombre}</b><div className="sub">{cli(p.clienteId)?.zona ? cli(p.clienteId).zona + " · " : ""}{cli(p.clienteId)?.dir}</div><div className="sub" data-limite-entrega style={{ color: D.limiteEntrega(e, p) < D.hoyISO() ? "var(--mal)" : undefined }}>{D.limiteEntrega(e, p) < D.hoyISO() ? "Plazo vencido el " : "Entregar antes del "}{D.fechaTxt(D.limiteEntrega(e, p))}</div></div>
            <div style={{ textAlign: "right" }}><b>{plata(D.totalPedido(p))}</b><div><Chip nivel={D.estadoReq(p) === "alistada" ? "ok" : "sin"}>{D.estadoReq(p) === "alistada" ? "Remisión lista" : "Remisión sin alistar"}</Chip></div></div>
          </label>
        ))}
        {sinRem.length > 0 && <div className="alerta sin" data-remisiones-sin-alistar>Las remisiones {sinRem.map((p) => "#" + p.numero).join(", ")} no están alistadas. Bodega debe alistarlas (módulo Remisiones) antes de crear la ruta: el conductor no puede salir sin ellas.</div>}
        <button className="p g" data-crear-ruta disabled={!marcados.length || sinRem.length > 0} onClick={crear}>Crear ruta con {marcados.length} pedido{marcados.length === 1 ? "" : "s"}</button>
      </>);
  }

  const d = sel && e.despachos.find((x) => x.id === sel);
  if (d) return <RutaDetalle e={e} d={d} avisar={avisar} volver={() => setSel(null)} empresa={empresa} rol={rol} libres={libres} />;

  const lista = (rol === "conductor" ? D.rutasDeConductor(e, yoNombre) : e.despachos).slice().sort((a, b) => (a.estado === "cerrado") - (b.estado === "cerrado") || b.fecha.localeCompare(a.fecha) || 0);
  return (
    <>
      <h1>Rutas y Despachos</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {puede(rol, "armarRuta") && <button className="p" data-nueva-ruta onClick={() => setNueva({ nombre: "", vehiculoId: "", conductor: "", ids: [] })}>+ Nueva ruta</button>}
        {puede(rol, "vehiculos") && <button className="s" data-ir-vehiculos onClick={() => setVeh(true)}>Vehículos</button>}
      </div>
      {puede(rol, "armarRuta") && plan.pendientes > 0 && (
        <div className={"alerta " + (plan.ok ? "ok" : "sin")} data-plan-entregas>
          {plan.ok
            ? `Los vehículos alcanzan: ${plan.pendientes} entrega${plan.pendientes === 1 ? "" : "s"} pendiente${plan.pendientes === 1 ? "" : "s"} para cumplir el máximo de ${plan.plazo} días (necesitas ${plan.necesarios} vehículo${plan.necesarios === 1 ? "" : "s"}, tienes ${plan.vehiculos}).`
            : `No alcanzan los vehículos: para entregar ${plan.pendientes} pedido${plan.pendientes === 1 ? "" : "s"} en máximo ${plan.plazo} días se necesitan ${plan.necesarios} vehículo${plan.necesarios === 1 ? "" : "s"} (cada uno hace ${plan.cap} entregas al día) y hay ${plan.vehiculos}: faltan ${plan.faltan}.`}
          {plan.atrasadas > 0 && <b data-plan-atrasadas> {plan.atrasadas} pedido{plan.atrasadas === 1 ? "" : "s"} ya pasó{plan.atrasadas === 1 ? "" : "ron"} el plazo.</b>}
        </div>)}
      <div className="sub" style={{ marginBottom: 8 }}>{libres.length} pedido{libres.length === 1 ? "" : "s"} pendiente{libres.length === 1 ? "" : "s"} sin ruta</div>
      {!lista.length && <div className="vacio">Aún no hay rutas. Crea una con los pedidos pendientes.</div>}
      {lista.map((x) => { const r = D.resumenDespacho(e, x); const [niv, tx] = EST[x.estado]; return (
        <button key={x.id} className="tarj" data-ruta={x.numero} onClick={() => setSel(x.id)} style={{ width: "100%", textAlign: "left", font: "inherit", color: "var(--tx)", cursor: "pointer" }}>
          <div className="fila"><b>Ruta #{x.numero}{x.nombre ? " · " + x.nombre : ""}</b><Chip nivel={niv}>{tx}</Chip></div>
          <div className="sub">{D.fechaTxt(x.fecha)} · {vehNom(x.vehiculoId)}{D.conductorRuta(e, x) !== "Sin conductor" ? " · " + D.conductorRuta(e, x) : ""}</div>
          <div className="sub">{r.total} parada{r.total === 1 ? "" : "s"} · {r.entregados} entregada{r.entregados === 1 ? "" : "s"}{r.noEntregados ? " · " + r.noEntregados + " sin entregar" : ""}</div>
        </button>); })}
    </>);
}

function Vehiculos({ e, avisar, volver }) {
  const cfg = useContext(CfgCtx);
  const [f, setF] = useState({ nombre: "", placa: "", conductor: "" });
  const guardar = () => { const lim = S.limiteVehiculos(planActual()); if (!f.id && e.vehiculos.filter((v) => v.activo !== false).length >= lim) return avisar(lim === 0 ? "Tu plan no incluye rutas con vehículos. Súbelo al plan Profesional." : `Tu plan permite ${lim} vehículo${lim === 1 ? "" : "s"}. Para tener varios, pasa al plan Empresarial.`, true); const r = accion((s) => D.guardarVehiculo(s, f)); avisar(r.ok ? "Vehículo guardado" : r.error, !r.ok); if (r.ok) setF({ nombre: "", placa: "", conductor: "" }); };
  const alternar = (v) => accion((s) => { const x = s.vehiculos.find((y) => y.id === v.id); x.activo = x.activo === false; });
  return (
    <>
      <button className="s" onClick={volver}>← Volver</button>
      <h1 style={{ marginTop: 10 }}>Vehículos</h1>
      {!e.vehiculos.length && <div className="vacio">Aún no hay vehículos.</div>}
      {e.vehiculos.map((v) => <div className="tarj fila" key={v.id} data-vehiculo={v.nombre}><div><b>{v.nombre}</b><div className="sub">{v.placa} {v.conductor && "· " + v.conductor}</div></div><button className="s" onClick={() => alternar(v)}>{v.activo === false ? "Activar" : "Desactivar"}</button></div>)}
      <div className="tarj">
        <b>Agregar vehículo</b>
        <label>Nombre (Moto 1, Camión…)</label><input data-veh="nombre" value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} />
        <label>Placa</label><input data-veh="placa" value={f.placa} onChange={(x) => setF({ ...f, placa: x.target.value })} />
        <label>Conductor</label>
        {(cfg.conductores || []).length > 0
          ? <select data-veh="conductor" value={f.conductor} onChange={(x) => setF({ ...f, conductor: x.target.value })}><option value="">Sin conductor fijo</option>{(cfg.conductores || []).map((c) => <option key={c} value={c}>{c}</option>)}</select>
          : <input data-veh="conductor" value={f.conductor} onChange={(x) => setF({ ...f, conductor: x.target.value })} />}
        <button className="p g" data-guardar-vehiculo onClick={guardar}>Guardar vehículo</button>
      </div>
    </>);
}

function RutaDetalle({ e, d, avisar, volver, empresa, rol, libres }) {
  const nombreUsuario = useContext(UsuarioCtx);
  const cfg = useContext(CfgCtx);
  const [ab, setAb] = useState(null);   // { pedidoId, modo: "entregar" | "no", valor, motivo }
  const [agregar, setAgregar] = useState("");
  const cli = (id) => e.clientes.find((c) => c.id === id);
  const hacer = (fn, ok) => { const r = accion(fn); avisar(r.ok ? ok : r.error, !r.ok); return r.ok; };
  const r = D.resumenDespacho(e, d);
  const armar = puede(rol, "armarRuta"), ruta = puede(rol, "ruta");
  const sinAtender = d.paradas.filter((p) => p.estado === "pendiente").length;
  const veh = e.vehiculos.find((v) => v.id === d.vehiculoId);
  return (
    <>
      <button className="s" data-volver-rutas onClick={volver}>← Rutas</button>
      <h1 style={{ marginTop: 10 }}>Ruta #{d.numero}{d.nombre ? " · " + d.nombre : ""}</h1>
      <div className="tarj">
        <div className="sub">{D.fechaTxt(d.fecha)} · {veh ? veh.nombre + (veh.placa ? " · " + veh.placa : "") : "Sin vehículo"} · <Chip nivel={d.estado === "cerrado" ? "ok" : d.estado === "en_ruta" ? "neu" : "poco"}>{{ armado: "Armada", en_ruta: "En ruta", cerrado: "Cerrada" }[d.estado]}</Chip></div>
        <div className="rej" style={{ marginTop: 10 }}>
          <div className="kpi"><small>Entregadas</small><b data-r-entregadas>{r.entregados}/{r.total}</b></div>
          <div className="kpi"><small>Cobrado</small><b data-r-cobrado>{plata(r.cobrado)}</b></div>
        </div>
      </div>
      {d.estado === "cerrado" && d.salida && (() => { const l = D.liquidacionRuta(e, d); return (
        <div className="tarj" data-liq-resumen>
          <b>Para entregar a caja</b>
          <div className="fila"><span>Efectivo</span><b>{plata(l.efectivo)}</b></div>
          <div className="fila"><span>Nequi, Daviplata y otros ({l.digitales.length})</span><b>{plata(l.totalDigital)}</b></div>
          {d.liq ? <div className="sub" data-liq-hecha>Liquidada el {D.fechaTxt(d.liq.fecha)} por {d.liq.usuario}: recibió {plata(d.liq.recibido)}{d.liq.diferencia ? ` (diferencia ${plata(d.liq.diferencia)})` : ""}</div> : <div className="sub">Pendiente de liquidar en caja (módulo Cobros).</div>}
        </div>); })()}
      {d.paradas.map((pa, idx) => {
        const p = e.pedidos.find((x) => x.id === pa.pedidoId); if (!p) return null;
        const c = cli(p.clienteId) || {}; const saldo = D.saldoPedido(e, p);
        const hecha = pa.estado !== "pendiente";
        return (
          <div className="tarj" key={pa.pedidoId} data-parada={p.numero}>
            <div className="fila"><b>{idx + 1}. {c.nombre}{c.negocio ? " · " + c.negocio : ""}</b>
              <Chip nivel={pa.estado === "entregado" ? "ok" : pa.estado === "no_entregado" ? "sin" : "poco"}>{{ pendiente: "Pendiente", entregado: "Entregado", no_entregado: "No entregado" }[pa.estado]}</Chip></div>
            <div className="sub">Pedido #{p.numero} · {plata(D.totalPedido(p))}{pa.estado === "entregado" && saldo > 0 ? " · debe " + plata(saldo) : ""}</div>
            {c.dir && <div className="sub">{c.dir}{c.zona ? " · " + c.zona : ""}</div>}
            {pa.motivo && <div className="sub" style={{ color: "var(--mal)" }}>Motivo: {pa.motivo}</div>}
            {pa.estado === "no_entregado" && p.devolucion && <div className="sub" data-devuelto>{p.devolucion.recibido ? "Mercancía recibida en bodega" + (p.devolucion.recibidoPor ? " por " + p.devolucion.recibidoPor : "") : "Mercancía por recibir en bodega"}{p.porReprogramar ? " · esperando que el vendedor la reprograme" : ""}</div>}
            {pa.estado === "entregado" && pa.pagoId && <div className="sub">Pagó {plata(e.pagos.find((x) => x.id === pa.pagoId)?.valor || 0)} · {e.pagos.find((x) => x.id === pa.pagoId)?.medio}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {c.dir && <a className="s enlace" href={D.urlMapa(c.dir)} target="_blank" rel="noreferrer">Mapa</a>}
              {c.tel && <a className="s enlace" href={"tel:" + c.tel.replace(/[^\d+]/g, "")}>Llamar</a>}
              {d.estado === "armado" && armar && <>
                <button className="s" data-subir onClick={() => hacer((s) => D.moverParada(s, d.id, pa.pedidoId, -1), "")} disabled={idx === 0}>↑</button>
                <button className="s" onClick={() => hacer((s) => D.moverParada(s, d.id, pa.pedidoId, 1), "")} disabled={idx === d.paradas.length - 1}>↓</button>
                <button className="s" data-quitar onClick={() => hacer((s) => D.quitarParada(s, d.id, pa.pedidoId), "Pedido quitado de la ruta")}>Quitar</button></>}
              {pa.estado === "no_entregado" && p.devolucion && !p.devolucion.recibido && puede(rol, "recibirDevuelto") && <button className="s" data-recibir-devuelto onClick={() => hacer((s) => D.recibirDevuelto(s, p.id, nombreUsuario), "Mercancía recibida en bodega")}>Recibí la mercancía en bodega</button>}
              {d.estado === "en_ruta" && !hecha && ruta && <>
                <button className="p" data-entregar-parada onClick={() => setAb({ pedidoId: pa.pedidoId, modo: "entregar", valor: String(saldo), motivo: "", medio: cfg.formasPago[0], foto: "" })}>Entregado</button>
                <button className="s" data-rechazado onClick={() => setAb({ pedidoId: pa.pedidoId, modo: "no", valor: "", motivo: "Rechazado por el cliente" })}>Rechazado</button>
                <button className="s" data-cliente-ausente onClick={() => setAb({ pedidoId: pa.pedidoId, modo: "no", valor: "", motivo: "Cliente ausente" })}>Cliente ausente</button>
                <button className="s" data-no-entregado onClick={() => setAb({ pedidoId: pa.pedidoId, modo: "no", valor: "", motivo: "" })}>No entregado</button></>}
            </div>
            {ab && ab.pedidoId === pa.pedidoId && ab.modo === "entregar" && (
              <div style={{ marginTop: 8 }}>
                {cfg.contraEntrega && !c.credito
                  ? <div className="alerta poco" data-contra-entrega>Entrega contra pago: el cliente debe pagar {plata(saldo)} completos.</div>
                  : c.credito ? <div className="sub" data-credito-aviso>Cliente con crédito ({c.plazoDias > 0 ? c.plazoDias + " días" : "sin plazo definido"}): si no paga ahora, la deuda queda pendiente y Cartera recibe el aviso.</div> : null}
                <label>{cfg.contraEntrega && !c.credito ? "Valor que paga el cliente" : "¿Cuánto pagó el cliente ahora? (0 si queda a crédito)"}</label>
                <input data-pago inputMode="numeric" value={ab.valor} onChange={(x) => setAb({ ...ab, valor: x.target.value })} />
                {(parseInt(String(ab.valor).replace(/\D/g, "")) || 0) > 0 && <><label>Forma de pago</label><select data-pago-medio value={ab.medio} onChange={(x) => setAb({ ...ab, medio: x.target.value, foto: D.esEfectivo(x.target.value) ? "" : ab.foto })}>{cfg.formasPago.map((m) => <option key={m} value={m}>{m}</option>)}</select></>}
                {(parseInt(String(ab.valor).replace(/\D/g, "")) || 0) > 0 && !D.esEfectivo(ab.medio) && <div data-comprobante-zona>
                  <label>Foto del comprobante{cfg.exigirComprobante ? "" : " (opcional)"}</label>
                  {ab.foto ? <img data-comprobante-vista src={ab.foto} alt="Comprobante" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, background: "#000" }} /> : null}
                  <label className="s" style={{ margin: "6px 0", textAlign: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)", display: "block" }}>{ab.foto ? "Cambiar foto" : "Tomar foto del comprobante"}
                    <input data-comprobante type="file" accept="image/*" capture="environment" hidden onChange={async (ev) => { const f0 = ev.target.files?.[0]; if (!f0) return; try { setAb({ ...ab, foto: await reducirImagen(f0, 900, 0.6) }); } catch { avisar("No se pudo leer la foto", true); } }} /></label>
                </div>}
                <button className="p g" data-confirmar-entrega onClick={() => { if (hacer((s) => D.entregarParada(s, d.id, pa.pedidoId, { pago: parseInt(String(ab.valor).replace(/\D/g, "")) || 0, usuario: nombreUsuario, sinStock: cfg.permitirSinStock, exigirAlistado: cfg.exigirAlistado, medio: ab.medio, contraEntrega: cfg.contraEntrega, exigirComprobante: cfg.exigirComprobante, comprobante: ab.foto || "" }), "Entrega registrada")) setAb(null); }}>Confirmar entrega</button>
              </div>)}
            {ab && ab.pedidoId === pa.pedidoId && ab.modo === "no" && (
              <div style={{ marginTop: 8 }}>
                <label>Motivo</label>
                <input data-motivo list="dl-motivos-no" value={ab.motivo} placeholder="Cerrado, sin plata, rechazó…" onChange={(x) => setAb({ ...ab, motivo: x.target.value })} /><datalist id="dl-motivos-no">{["Cliente ausente", "No tenía el dinero", "Rechazó el pedido", "Local cerrado", "No lo esperaban"].map((m) => <option key={m} value={m} />)}</datalist>
                <div className="sub">El pedido vuelve a bodega y el vendedor lo reprograma con el cliente.</div>
                <button className="p g" data-confirmar-no onClick={() => { if (hacer((s) => D.noEntregarParada(s, d.id, pa.pedidoId, ab.motivo, nombreUsuario), "Quedó como no entregado, vuelve a bodega")) setAb(null); }}>Guardar</button>
              </div>)}
          </div>);
      })}
      {d.estado !== "cerrado" && armar && libres.length > 0 && (
        <div className="tarj"><label>Agregar otro pedido a la ruta</label>
          <select data-agregar value={agregar} onChange={(x) => setAgregar(x.target.value)}><option value="">Elegir…</option>{libres.map((p) => <option key={p.id} value={p.id}>#{p.numero} · {cli(p.clienteId)?.nombre}</option>)}</select>
          <button className="s g" data-agregar-ok disabled={!agregar} onClick={() => { if (hacer((s) => D.agregarParada(s, d.id, agregar, { exigirAlistado: true }), "Pedido agregado")) setAgregar(""); }}>Agregar</button></div>)}
      {d.estado === "armado" && armar && <button className="p g" data-salir-ruta onClick={() => hacer((s) => D.salirARuta(s, d.id, { sinStock: cfg.permitirSinStock, exigirAlistado: true }), "La ruta salió")}>Salir a ruta</button>}
      {d.estado === "en_ruta" && ruta && sinAtender === 0 && <button className="p g" data-cerrar-ruta onClick={() => hacer((s) => D.cerrarDespacho(s, d.id), "Ruta cerrada")}>Cerrar ruta</button>}
      {d.estado === "armado" && armar && <button className="s g" style={{ marginTop: 8 }} data-cancelar-ruta onClick={() => hacer((s) => D.cerrarDespacho(s, d.id), "Ruta cancelada")}>Cancelar ruta</button>}
      {d.estado === "en_ruta" && sinAtender > 0 && <div className="sub" style={{ textAlign: "center", marginTop: 8 }}>Faltan {sinAtender} parada{sinAtender === 1 ? "" : "s"} por atender para poder cerrar.</div>}
    </>);
}

// Cliente que viene elegido desde la Ruta de hoy
const PRE = { clienteId: "" };

// Cuántas requisiciones esperan a esta persona (bodega: por alistar · facturación: por facturar)
const cuenta_req = (e, id) => { const c = D.conteoRequisiciones(e); return id === "facturacion" ? c.porFacturar : c.porAlistar; };

// Iconos propios de cada módulo (los que no tienen imagen usan el emoji)
const ICONOS = { compras: "compras", informes: "informes", inicio: "tablero", requisiciones: "requisiciones", vender: "ventas", pedidos: "pedidos", despachos: "despachos", visitas: "visitas", gastos: "gastos", clientes: "clientes", productos: "productos", stock: "stock", proveedores: "proveedores", cobros: "cobros", usuarios: "usuarios", empresa: "empresa", plataforma: "plataforma", configuracion: "configuracion", cuenta: "cuenta", facturacion: "facturacion", ofertas: "ofertas" };
// Iconos a todo color (prueba). En Apariencia se puede volver a los iconos clásicos
const ICONOS_COLOR = new Set(["cobros", "compras", "configuracion", "facturacion", "gastos", "tablero", "informes", "stock", "cuenta", "empresa", "usuarios", "ofertas", "pedidos", "plataforma", "productos", "proveedores", "requisiciones", "despachos", "clientes", "ventas", "visitas"]);
// Se cargan todas las imágenes al abrir la app, para que el portal no espere cada vez que se vuelve a él
if (typeof Image !== "undefined") {
  const clasico = leerPrefs().iconos === "clasico";
  [...Object.values(ICONOS).flatMap((n) => !clasico && ICONOS_COLOR.has(n) ? ["c_" + n, "c_" + n + "_osc"] : [n, n + "_azul"]), "logo", "logo_portal"].forEach((n) => { try { new Image().src = `iconos/${n}.png`; } catch {} });
}
function Ico({ id, emoji }) {
  const estilo = usarPrefs().iconos;
  const n = ICONOS[id];
  if (!n) return <span>{emoji}</span>;
  if (estilo !== "clasico" && ICONOS_COLOR.has(n)) return <><img className="ico ico-d" src={`iconos/c_${n}_osc.png`} alt="" draggable="false" decoding="sync" /><img className="ico ico-a" src={`iconos/c_${n}.png`} alt="" draggable="false" decoding="sync" /></>;
  return <><img className="ico ico-d" src={`iconos/${n}.png`} alt="" draggable="false" decoding="sync" /><img className="ico ico-a" src={`iconos/${n}_azul.png`} alt="" draggable="false" decoding="sync" /></>;
}

function Portal({ sesion, lic, ir, e }) {
  const rol = sesion.perfil.rol;
  const nCartera = puede(rol, "cobrar") ? D.creditosPendientes(e).length : 0;
  const nReprog = (puede(rol, "reprogramar") || puede(rol, "recibirDevuelto")) ? D.pedidosPorReprogramar(e, rol === "vendedor" ? sesion.perfil.nombre : "").length : 0;
  const prefs = usarPrefs();
  const modulos = [
    ["inicio", "", "Indicadores"], ["vender", "", "Ventas"], ["pedidos", "", "Pedidos"], ["despachos", "", "Rutas y Despachos"], ["visitas", "", "Visitas"], ["gastos", "", "Gastos"], ["informes", "", "Informes"], ["clientes", "", "Clientes"],
    ["productos", "", "Productos"], ["stock", "", "Inventario"], ["compras", "", "Compras"], ["proveedores", "", "Proveedores"], ["cobros", "", "Cobros"], ["requisiciones", "", "Remisiones"], ["facturacion", "", "Facturación"], ["ofertas", "", "Ofertas"],
    ["usuarios", "", "Usuarios"], ["empresa", "", "Mi empresa"],
  ].filter(([id]) => puedeVer(rol, id));
  if (sesion.esDueno) modulos.push(["plataforma", "", "Plataforma"]);
  modulos.push(["configuracion", "", "Configuración"], ["cuenta", "", "Mi cuenta"]);
  return (
    <>
      <div className="fila" style={{ marginBottom: 4 }}>
        <div><h1 style={{ margin: 0 }} data-empresa>{sesion.empresa.nombre}</h1><div className="sub">{sesion.perfil.nombre} · {ROLES[rol]}</div></div>
      </div>
      {!lic.vigente && <div className="alerta sin" data-lic="vencida">Licencia {lic.motivo}: solo puedes consultar. Comunícate con el proveedor para renovarla.</div>}
      {lic.vigente && sesion.empresa.plan === "prueba" && <div className="alerta poco" data-lic="prueba">Periodo de prueba: te quedan {lic.dias} días.</div>}
      {lic.vigente && sesion.empresa.plan !== "prueba" && lic.dias <= 15 && <div className="alerta poco" data-lic="porvencer">Tu licencia vence en {lic.dias} días.</div>}
      <h2>¿A dónde quieres ir?</h2>
      <div className={"portal portal-" + (prefs.portal || "cuadricula")} data-portal-vista={prefs.portal || "cuadricula"}>
        {modulos.map(([id, ic, t]) => <button key={id} className="icono" data-modulo={id} onClick={() => ir(id)}><span className="ico-caja"><Ico id={id} emoji={ic} />{(id === "requisiciones" || id === "facturacion") && cuenta_req(e, id) > 0 && <i className="insignia" data-insignia>{cuenta_req(e, id)}</i>}{id === "cobros" && nCartera > 0 && <i className="insignia" data-insignia-cartera>{nCartera > 99 ? "99+" : nCartera}</i>}{id === "pedidos" && nReprog > 0 && <i className="insignia" data-insignia-reprog>{nReprog > 99 ? "99+" : nReprog}</i>}</span>{t}</button>)}
      </div>
    </>
  );
}


// Compartir una oferta: abre WhatsApp con el mensaje listo (la persona elige a quién enviarlo) o lo copia
function compartirOferta(e, pr, empresa, avisar) {
  const texto = D.mensajeOferta(e, pr, empresa);
  try { window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener"); }
  catch { try { navigator.clipboard.writeText(texto); avisar("Mensaje copiado"); } catch {} }
}
function copiarOferta(e, pr, empresa, avisar) {
  const texto = D.mensajeOferta(e, pr, empresa);
  try { navigator.clipboard.writeText(texto).then(() => avisar("Mensaje copiado. Pégalo donde quieras"), () => avisar("No se pudo copiar", true)); } catch { avisar("No se pudo copiar", true); }
}
const OFERTA_VACIA = { id: "", nombre: "", tipo: "porcentaje", alcance: "todos", objetivo: "", pct: "10", compra: "10", lleva: "1", precioFijo: "", minCant: "1", desde: "", hasta: "", para: "todos", paraValor: "", combo: [] };
const COLOR_ESTADO = { vigente: "ok", programada: "neu", vencida: "mal", apagada: "mal" };

function Ofertas({ e, avisar, empresa }) {
  const cfg = useContext(CfgCtx);
  const yo = useContext(UsuarioCtx);
  const [pest, setPest] = useState("ofertas");
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState("");
  const [cp, setCp] = useState({ productoId: "", cant: "1" });
  const hoy = D.hoyISO();
  const [desde, setDesde] = useState(D.sumarDias(hoy, -30)), [hasta, setHasta] = useState(hoy);
  const lista = (cfg.promos || []).slice().sort((a, b) => ["vigente", "programada", "apagada", "vencida"].indexOf(D.estadoOferta(a)) - ["vigente", "programada", "apagada", "vencida"].indexOf(D.estadoOferta(b)));
  const familias = [...new Set(e.productos.map((p) => p.familia).filter(Boolean))].sort();
  const valoresPara = (k) => [...new Set(e.clientes.map((c) => (c[k] || "").trim()).filter(Boolean))].sort();
  const nomP = (id) => e.productos.find((x) => x.id === id)?.nombre || "—";
  const n = (k) => (x) => setForm({ ...form, [k]: x.target.value });
  const num = (k) => (x) => setForm({ ...form, [k]: x.target.value.replace(/\D/g, "") });
  const guardar = () => {
    const r = accion((st) => D.guardarOferta(st, form, yo));
    avisar(r.ok ? (form.id ? "Oferta actualizada" : "Oferta creada") : r.error, !r.ok);
    if (r.ok) setForm(null);
  };
  const alternar = (id) => { const r = accion((st) => D.alternarOferta(st, id)); if (!r.ok) avisar(r.error, true); };
  const quitar = (id) => { const r = accion((st) => D.borrarOferta(st, id)); avisar(r.ok ? "Oferta borrada" : r.error, !r.ok); setBorrar(""); };
  const resultados = pest === "resultados" ? D.resultadoOfertas(e, desde, hasta) : [];
  const abrirEditar = (x) => setForm({ ...OFERTA_VACIA, ...x, pct: String(x.pct || ""), compra: String(x.compra), lleva: String(x.lleva), precioFijo: String(x.precioFijo || ""), minCant: String(x.minCant) });

  if (form) return (
    <div data-oferta-form>
      <button className="s" onClick={() => setForm(null)}>← Volver</button>
      <h1 style={{ marginTop: 10 }}>{form.id ? "Editar oferta" : "Nueva oferta"}</h1>
      <div className="tarj">
        <label>Nombre (opcional)</label><input data-np="nombre" value={form.nombre} onChange={n("nombre")} />
        <label>Tipo de oferta</label>
        <select data-np="tipo" value={form.tipo} onChange={(x) => setForm({ ...form, tipo: x.target.value, alcance: x.target.value === "precio" && form.alcance === "todos" ? "producto" : form.alcance })}>
          {Object.entries(D.TIPOS_OFERTA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
        {form.tipo === "porcentaje" && <><label>Descuento (%) — máximo permitido {cfg.ofertaMaxPct}%</label><input data-np="pct" inputMode="numeric" value={form.pct} onChange={num("pct")} /></>}
        {form.tipo === "bonificacion" && <><label>Si lleva (unidades)</label><input data-np="compra" inputMode="numeric" value={form.compra} onChange={num("compra")} />
          <label>Recibe de regalo (unidades)</label><input data-np="lleva" inputMode="numeric" value={form.lleva} onChange={num("lleva")} /></>}
        {form.tipo === "precio" && <><label>Precio especial por unidad ($)</label><input data-np="precioFijo" inputMode="numeric" value={form.precioFijo} onChange={num("precioFijo")} /></>}
        {(form.tipo === "porcentaje" || form.tipo === "precio") && <><label>Desde cuántas unidades (1 = siempre)</label><input data-np="minCant" inputMode="numeric" value={form.minCant} onChange={num("minCant")} /></>}
        {form.tipo === "combo" && <>
          <label>Productos del combo (el cliente debe llevarlos todos)</label>
          {form.combo.map((c, i) => <div key={i} className="fila" data-combo-item style={{ gap: 8, padding: "4px 0" }}><span style={{ flex: 1 }}>{c.cant} × {nomP(c.productoId)}</span><button type="button" className="s" onClick={() => setForm({ ...form, combo: form.combo.filter((_, j) => j !== i) })}>✕</button></div>)}
          <div className="fila" style={{ gap: 6 }}>
            <select data-combo-prod value={cp.productoId} style={{ flex: 1, margin: 0 }} onChange={(x) => setCp({ ...cp, productoId: x.target.value })}><option value="">Elegir producto…</option>{e.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
            <input data-combo-cant inputMode="numeric" style={{ width: 64, margin: 0, textAlign: "right" }} value={cp.cant} onChange={(x) => setCp({ ...cp, cant: x.target.value.replace(/\D/g, "") })} />
            <button type="button" className="s" data-combo-agregar onClick={() => { if (!cp.productoId) return; setForm({ ...form, combo: [...form.combo.filter((c) => c.productoId !== cp.productoId), { productoId: cp.productoId, cant: Math.max(1, +cp.cant || 1) }] }); setCp({ productoId: "", cant: "1" }); }}>+</button></div>
          <label>Descuento del combo (%) — máximo permitido {cfg.ofertaMaxPct}%</label><input data-np="pct" inputMode="numeric" value={form.pct} onChange={num("pct")} /></>}
        {form.tipo !== "combo" && <><label>Vale para</label>
          <select data-np="alcance" value={form.alcance} onChange={(x) => setForm({ ...form, alcance: x.target.value, objetivo: "" })}>{form.tipo !== "precio" && <option value="todos">Todos los productos</option>}<option value="familia">Una familia</option><option value="producto">Un producto</option></select>
          {form.alcance === "familia" && <select data-np="objetivo" value={form.objetivo} onChange={n("objetivo")}><option value="">Elegir familia…</option>{familias.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
          {form.alcance === "producto" && <select data-np="objetivo" value={form.objetivo} onChange={n("objetivo")}><option value="">Elegir producto…</option>{e.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>}</>}
        <label>Para qué clientes</label>
        <select data-np="para" value={form.para} onChange={(x) => setForm({ ...form, para: x.target.value, paraValor: "" })}><option value="todos">Todos los clientes</option><option value="grupo">Un grupo de clientes</option><option value="zona">Una zona o ruta</option><option value="ciudad">Una ciudad</option></select>
        {form.para !== "todos" && <select data-np="paraValor" value={form.paraValor} onChange={n("paraValor")}><option value="">Elegir…</option>{valoresPara(form.para).map((x) => <option key={x} value={x}>{x}</option>)}</select>}
        <label>Desde (opcional)</label><input type="date" data-np="desde" value={form.desde} onChange={n("desde")} />
        <label>Hasta (opcional)</label><input type="date" data-np="hasta" value={form.hasta} onChange={n("hasta")} />
        <button type="button" className="p" data-agregar-promo style={{ marginTop: 10, width: "100%" }} onClick={guardar}>{form.id ? "Guardar cambios" : "Crear oferta"}</button>
      </div>
    </div>);

  return (
    <div data-promos>
      <div className="fila"><h1>Ofertas</h1><button className="p" data-oferta-nueva onClick={() => setForm({ ...OFERTA_VACIA })}>+ Nueva</button></div>
      <div className="fila" style={{ gap: 8, margin: "8px 0" }}>
        <button className={pest === "ofertas" ? "p" : "s"} data-pest="ofertas" style={{ flex: 1 }} onClick={() => setPest("ofertas")}>Ofertas</button>
        <button className={pest === "resultados" ? "p" : "s"} data-pest="resultados" style={{ flex: 1 }} onClick={() => setPest("resultados")}>Resultados</button>
      </div>
      {pest === "ofertas" && <>
        {!lista.length && <div className="vacio">Aún no hay ofertas. Pulsa «+ Nueva» para crear la primera.</div>}
        {lista.map((x) => { const est = D.estadoOferta(x); return (
          <div key={x.id} className="tarj" data-promo-fila={x.nombre}>
            <div className="fila"><b style={{ flex: 1 }}>{x.nombre}</b><span data-estado={est}><Chip nivel={COLOR_ESTADO[est]}>{est}</Chip></span></div>
            <div className="sub" data-oferta-texto>{D.textoOferta(x, e.productos)}</div>
            <div className="sub">{x.desde || x.hasta ? `Del ${x.desde ? D.fechaTxt(x.desde) : "inicio"} al ${x.hasta ? D.fechaTxt(x.hasta) : "sin fecha final"}` : "Sin fecha límite"}{x.por ? ` · creada por ${x.por}` : ""}</div>
            <div className="fila" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" className="p" data-oferta-whatsapp onClick={() => compartirOferta(e, x, empresa, avisar)}>Enviar por WhatsApp</button>
              <button type="button" className="s" data-oferta-copiar onClick={() => copiarOferta(e, x, empresa, avisar)}>Copiar mensaje</button>
              <button type="button" className="s" data-oferta-editar onClick={() => abrirEditar(x)}>Editar</button>
              <button type="button" className="s" data-promo-alternar onClick={() => alternar(x.id)}>{x.activa === false ? "Activar" : "Apagar"}</button>
              {borrar === x.id ? <button type="button" className="s" data-promo-borrar style={{ color: "var(--mal)" }} onClick={() => quitar(x.id)}>Confirmar borrar</button> : <button type="button" className="s" data-promo-borrar onClick={() => setBorrar(x.id)}>✕</button>}
            </div>
          </div>); })}
      </>}
      {pest === "resultados" && <div data-ofertas-resultados>
        <div className="fila" style={{ gap: 8 }}><div style={{ flex: 1 }}><label>Desde</label><input type="date" data-res-desde value={desde} onChange={(x) => setDesde(x.target.value)} /></div><div style={{ flex: 1 }}><label>Hasta</label><input type="date" data-res-hasta value={hasta} onChange={(x) => setHasta(x.target.value)} /></div></div>
        {!resultados.length && <div className="vacio">Todavía no se ha vendido con ninguna oferta en estas fechas.</div>}
        {resultados.map((r) => (
          <div key={r.id} className="tarj" data-resultado={r.nombre}>
            <b>{r.nombre}</b>
            <div className="fila"><span className="sub">Pedidos con la oferta</span><b>{r.pedidos}</b></div>
            <div className="fila"><span className="sub">Unidades vendidas</span><b>{r.unidades}</b></div>
            <div className="fila"><span className="sub">Vendido</span><b>{plata(r.venta)}</b></div>
            <div className="fila"><span className="sub">Descuento dado</span><b>{plata(r.descuento)}</b></div>
            {r.regalo > 0 && <div className="fila"><span className="sub">Unidades de regalo</span><b>{r.regalo} ({plata(r.costoRegalo)})</b></div>}
            <div className="fila" style={{ borderTop: "1px solid var(--linea)", paddingTop: 4 }}><span className="sub">Costo total de la oferta</span><b data-costo-oferta>{plata(r.costo)}</b></div>
          </div>))}
      </div>}
    </div>);
}

function Visitas({ e, avisar, ir }) {
  const rol = useRol();
  const cfg = useContext(CfgCtx);
  const yo = useContext(UsuarioCtx);
  const [nueva, setNueva] = useState(null);
  const [dia, setDia] = useState("hoy");
  const [pest, setPest] = useState("ruta");
  const [diaRuta, setDiaRuta] = useState(D.diaDeSemana(D.hoyISO()));
  const [quien, setQuien] = useState(rol === "vendedor" ? yo : "");
  const cli = (id) => { const c = e.clientes.find((x) => x.id === id); return c ? c.nombre + (c.negocio ? " · " + c.negocio : "") : "—"; };
  const hoy = D.hoyISO();
  const lista = e.visitas.filter((v) => dia === "todas" || (dia === "hoy" ? v.fecha === hoy : v.fecha === D.sumarDias(hoy, -1))).slice().reverse();
  const guardar = () => { const r = accion((s) => D.crearVisita(s, { ...nueva, usuario: yo })); avisar(r.ok ? "Visita registrada" : r.error, !r.ok); if (r.ok) setNueva(null); };
  if (nueva) return (
    <>
      <button className="s" onClick={() => setNueva(null)}>← Volver</button>
      <h1 style={{ marginTop: 10 }}>Nueva visita</h1>
      <div className="tarj">
        <label>Cliente</label>
        <select data-v-cliente value={nueva.clienteId} onChange={(x) => setNueva({ ...nueva, clienteId: x.target.value })}><option value="">Elegir cliente…</option>{e.clientes.filter(D.esActivo).map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.negocio ? " · " + c.negocio : ""}</option>)}</select>
        <label>Motivo</label>
        <select data-v-motivo value={nueva.motivo} onChange={(x) => setNueva({ ...nueva, motivo: x.target.value })}>{cfg.motivosVisita.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        <label>Resultado</label>
        <select data-v-resultado value={nueva.resultado} onChange={(x) => setNueva({ ...nueva, resultado: x.target.value })}>{cfg.resultadosVisita.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        <label>Nota (opcional)</label>
        <textarea data-v-nota rows={3} value={nueva.nota} onChange={(x) => setNueva({ ...nueva, nota: x.target.value })} />
        <button className="p g" data-guardar-visita onClick={guardar}>Guardar visita</button>
      </div>
    </>);
  const hoyDia = D.diaDeSemana(D.hoyISO());
  const fechaRuta = D.sumarDias(D.hoyISO(), (diaRuta - hoyDia + 7) % 7);
  const ruta = D.rutaDelDia(e, { fecha: fechaRuta, vendedor: quien });
  const vendedores = [...new Set(e.clientes.map((c) => (c.vendedor || "").trim()).filter(Boolean))].sort();
  const esHoy = fechaRuta === D.hoyISO();
  const hechos = ruta.filter((r) => r.visitado).length;
  if (pest === "ruta") return (
    <>
      <div className="fila"><h1>Visitas</h1></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className="p" data-pest="ruta">Ruta de hoy</button><button className="s" data-pest="visitas" onClick={() => setPest("visitas")}>Visitas hechas</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {D.DIAS_SEMANA.map((n, i) => <button key={i} data-dia-ruta={i} className={diaRuta === i ? "p" : "s"} style={{ flex: 1, padding: "8px 0" }} onClick={() => setDiaRuta(i)}>{i === hoyDia ? "Hoy" : n}</button>)}
      </div>
      {rol !== "vendedor" && <select data-ruta-vendedor value={quien} onChange={(x) => setQuien(x.target.value)}><option value="">Todos los vendedores</option>{vendedores.map((v) => <option key={v} value={v}>{v}</option>)}</select>}
      <div className="sub" data-ruta-resumen style={{ margin: "4px 0 8px" }}>{D.DIAS_SEMANA[diaRuta]} {D.fechaTxt(fechaRuta)} · {ruta.length} clientes{esHoy ? ` · visitados ${hechos}` : ""}</div>
      {!ruta.length && <div className="vacio" data-ruta-vacia>No hay clientes con visita este día. En Clientes puedes marcar los días de visita de cada uno.</div>}
      {ruta.map(({ cliente: c, visitado, conPedido, deuda }, k) => (
        <div className="tarj" key={c.id} data-ruta-cliente={c.nombre}>
          <div className="fila"><b>{k + 1}. {c.nombre}</b>{visitado ? <Chip nivel="ok">{conPedido ? "con pedido" : "visitado"}</Chip> : <Chip nivel="neu">por visitar</Chip>}</div>
          <div className="sub">{[c.negocio, c.dir, c.tel].filter(Boolean).join(" · ")}</div>
          {deuda > 0 && <div className="sub" style={{ color: "var(--poco)" }}>Debe {plata(deuda)}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {c.dir && <a className="s" style={{ padding: "8px 12px", borderRadius: 12 }} href={D.urlMapa(c.dir)} target="_blank" rel="noreferrer">Mapa</a>}
            {c.tel && <a className="s" style={{ padding: "8px 12px", borderRadius: 12 }} href={"tel:" + c.tel}>Llamar</a>}
            {esHoy && puede(rol, "vender") && <button className="p" data-ruta-vender onClick={() => { PRE.clienteId = c.id; ir("vender"); }}>Vender</button>}
            {esHoy && puede(rol, "visitas") && !visitado && <button className="s" data-ruta-visita onClick={() => { setNueva({ clienteId: c.id, motivo: cfg.motivosVisita[0], resultado: cfg.resultadosVisita[0], nota: "" }); setPest("visitas"); }}>Anotar visita</button>}
          </div>
        </div>))}
    </>);
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className="s" data-pest="ruta" onClick={() => setPest("ruta")}>Ruta de hoy</button><button className="p" data-pest="visitas">Visitas hechas</button>
      </div>
      <div className="fila"><h1>Visitas</h1>{puede(rol, "visitas") && <button className="p" data-nueva-visita onClick={() => setNueva({ clienteId: "", motivo: cfg.motivosVisita[0], resultado: cfg.resultadosVisita[0], nota: "" })}>+ Nueva</button>}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[["hoy", "Hoy"], ["ayer", "Ayer"], ["todas", "Todas"]].map(([k, t]) => <button key={k} data-dia={k} className={dia === k ? "p" : "s"} onClick={() => setDia(k)}>{t}</button>)}
      </div>
      {!lista.length && <div className="vacio">No hay visitas {dia === "todas" ? "registradas" : dia === "hoy" ? "hoy" : "ayer"}.</div>}
      {lista.slice(0, 80).map((v) => (
        <div className="tarj" key={v.id} data-visita={v.numero}>
          <div className="fila"><b>{cli(v.clienteId)}</b>{v.pedidoId ? <Chip nivel="ok">con pedido</Chip> : <Chip nivel="neu">{v.resultado || "—"}</Chip>}</div>
          <div className="sub">{D.fechaTxt(v.fecha)} {v.hora} · {v.motivo || "—"}{v.pedidoId ? "" : ""} · {v.usuario || "—"}</div>
          {v.nota && <div className="sub">“{v.nota}”</div>}
        </div>))}
    </>);
}

function Gastos({ e, avisar }) {
  const rol = useRol();
  const cfg = useContext(CfgCtx);
  const yo = useContext(UsuarioCtx);
  const vacio = { categoria: cfg.categoriasGasto[0], valor: "", nota: "", vehiculoId: "" };
  const [f, setF] = useState(vacio);
  const veTodos = rol === "admin" || rol === "cartera";
  const mios = e.gastos.filter((g) => veTodos || g.usuario === yo);
  const hoy = D.hoyISO(), mes = hoy.slice(0, 7);
  const totalHoy = mios.filter((g) => g.fecha === hoy).reduce((s, g) => s + g.valor, 0);
  const totalMes = mios.filter((g) => g.fecha.startsWith(mes)).reduce((s, g) => s + g.valor, 0);
  const guardar = () => {
    const r = accion((s) => D.registrarGasto(s, { ...f, valor: parseInt(String(f.valor).replace(/\D/g, "")) || 0, usuario: yo }));
    avisar(r.ok ? "Gasto registrado" : r.error, !r.ok); if (r.ok) setF(vacio);
  };
  return (
    <>
      <h1>Gastos</h1>
      <div className="rej">
        <div className="tarj kpi"><small>Hoy</small><b data-gasto-hoy>{plata(totalHoy)}</b></div>
        <div className="tarj kpi"><small>Este mes</small><b data-gasto-mes>{plata(totalMes)}</b></div>
      </div>
      {puede(rol, "gastos") && (
        <div className="tarj">
          <b>Anotar un gasto</b>
          <label style={{ display: "block", marginTop: 8 }}>Valor</label><input data-g-valor inputMode="numeric" value={f.valor} placeholder="0" onChange={(x) => setF({ ...f, valor: x.target.value })} />
          <label>Categoría</label><select data-g-categoria value={f.categoria} onChange={(x) => setF({ ...f, categoria: x.target.value })}>{cfg.categoriasGasto.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          {e.vehiculos.length > 0 && <><label>Vehículo (opcional)</label><select data-g-vehiculo value={f.vehiculoId} onChange={(x) => setF({ ...f, vehiculoId: x.target.value })}><option value="">—</option>{e.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select></>}
          <label>Nota (opcional)</label><input data-g-nota value={f.nota} onChange={(x) => setF({ ...f, nota: x.target.value })} />
          <button className="p g" data-guardar-gasto onClick={guardar}>Guardar gasto</button>
        </div>)}
      <h2>Últimos gastos</h2>
      {!mios.length && <div className="vacio">Aún no hay gastos.</div>}
      {mios.slice().reverse().slice(0, 60).map((g) => (
        <div className="tarj fila" key={g.id} data-gasto={g.numero}>
          <div><b>{g.categoria}</b><div className="sub">{D.fechaTxt(g.fecha)} · {g.usuario || "—"}{g.nota ? " · " + g.nota : ""}</div></div>
          <b>{plata(g.valor)}</b>
        </div>))}
    </>);
}

function Informes({ e, avisar, empresa }) {
  const hoy = D.hoyISO();
  const [tab, setTab] = useState("ventas");
  const [por, setPor] = useState("producto");
  const [porG, setPorG] = useState("categoria");
  const [desde, setDesde] = useState(hoy.slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoy);
  const [dias, setDias] = useState(30);
  const [diasVisita, setDiasVisita] = useState(15);
  const ventas = D.informeVentas(e, { desde, hasta, por });
  const tot = D.totalesInforme(ventas);
  const gastosRango = D.informeGastos(e, { desde, hasta }).reduce((s, f) => s + f.total, 0);
  const cartera = D.carteraPorEdad(e);
  const quieto = D.bajaRotacion(e, dias);
  const cobros = D.informeCobros(e, { desde, hasta });
  const visitas = D.informeVisitas(e, { desde, hasta });
  const sinVisita = D.clientesSinVisita(e, diasVisita);
  const gastos = D.informeGastos(e, { desde, hasta, por: porG });
  const POR = { producto: "Producto", familia: "Familia", cliente: "Cliente", vendedor: "Vendedor" };
  const TABS = [["ventas", "Ventas"], ["cobros", "Cobros"], ["visitas", "Visitas"], ["gastos", "Gastos"], ["facturas", "Facturas"], ["compras", "Compras"], ["cartera", "Cartera"], ["rotacion", "Baja rotación"]];
  const facturas = D.informeFacturas(e, { desde, hasta });
  const conRango = ["ventas", "cobros", "visitas", "gastos", "facturas", "compras"].includes(tab);
  const [porC, setPorC] = useState("proveedor"); const [estC, setEstC] = useState("todas"); const [vista, setVista] = useState(false);
  const compras = D.informeCompras(e, { desde, hasta, por: porC, estado: estC });
  const totC = compras.reduce((s, f) => ({ unidades: s.unidades + f.unidades, valor: s.valor + f.valor }), { unidades: 0, valor: 0 });
  const armarHojas = () => {
    let hojas;
    if (tab === "ventas") hojas = [{ nombre: "Ventas por " + por, anchos: [34, 10, 10, 14, 14], filas: [[POR[por], "Pedidos", "Unidades", "Ventas", "Utilidad"], ...ventas.map((f) => [f.nombre, f.pedidos, f.unidades, f.total, f.utilidad]), ["TOTAL", "", tot.unidades, tot.total, tot.utilidad]] }];
    else if (tab === "cobros") hojas = [{ nombre: "Cobros", anchos: [26, 10, 14], filas: [["Forma de pago", "Cobros", "Total"], ...cobros.map((f) => [f.nombre, f.cantidad, f.total]), ["TOTAL", "", cobros.reduce((s, f) => s + f.total, 0)]] }];
    else if (tab === "visitas") hojas = [{ nombre: "Visitas", anchos: [28, 10, 12, 10, 12], filas: [["Vendedor", "Visitas", "Con pedido", "Clientes", "Efectividad %"], ...visitas.map((f) => [f.nombre, f.visitas, f.conPedido, f.clientes, f.efectividad])] }, { nombre: "Sin visitar", anchos: [34, 20, 14, 10], filas: [["Cliente", "Vendedor", "Última visita", "Días"], ...sinVisita.map((f) => [f.nombre, f.vendedor, f.ultima || "Nunca", f.dias ?? ""])] }];
    else if (tab === "compras") hojas = [{ nombre: "Compras por " + porC, anchos: [34, 10, 12, 12, 12, 16], filas: [[porC === "producto" ? "Producto" : "Proveedor", "Compras", "Unidades", "Recibidas", "Pendientes", "Valor estimado"], ...compras.map((f) => [f.nombre, f.compras, f.unidades, f.recibidas, f.pendientes, f.valor]), ["TOTAL", "", totC.unidades, compras.reduce((s, f) => s + f.recibidas, 0), compras.reduce((s, f) => s + f.pendientes, 0), totC.valor]] }];
    else if (tab === "gastos") hojas = [{ nombre: "Gastos", anchos: [28, 10, 14], filas: [[porG === "usuario" ? "Quién" : "Categoría", "Gastos", "Total"], ...gastos.map((f) => [f.nombre, f.cantidad, f.total]), ["TOTAL", "", gastos.reduce((s, f) => s + f.total, 0)]] }];
    else if (tab === "facturas") hojas = [{ nombre: "Facturas", anchos: [14, 12, 10, 30, 14, 26, 14, 12, 12, 14, 12, 10], filas: [["Factura", "Fecha", "Pedido", "Cliente", "NIT/CC", "Correo", "Subtotal", "IVA", "Retención", "Total", "Saldo", "Enviada"], ...facturas.map((f) => [f.numero, f.fecha, f.pedido, f.cliente, f.nit, f.correo, f.subtotal, f.iva, f.retencion, f.total, f.saldo, f.enviada ? "Sí" : "No"]), ["TOTAL", "", "", "", "", "", facturas.reduce((s, f) => s + f.subtotal, 0), facturas.reduce((s, f) => s + f.iva, 0), facturas.reduce((s, f) => s + f.retencion, 0), facturas.reduce((s, f) => s + f.total, 0), "", ""]] }];
    else if (tab === "cartera") hojas = [{ nombre: "Cartera", anchos: [34, 14, 14, 14, 14, 14], filas: [["Cliente", "Teléfono", "0-30 días", "31-60 días", "Más de 60", "Total"], ...cartera.map((f) => [f.nombre, f.tel, f.d30, f.d60, f.d60mas, f.total])] }];
    else hojas = [{ nombre: "Baja rotación", anchos: [34, 10, 12, 14], filas: [["Producto", "Stock", "Vendido en " + dias + " días", "Valor al costo"], ...quieto.map((f) => [f.nombre, f.stock, f.vendido, f.valor])] }];
    return hojas;
  };
  const bajar = () => descargar(crearXlsx(armarHojas()), `informe-${tab}-${hoy}.xlsx`);
  const Tabla = ({ cols, filas, vacio }) => !filas.length ? <div className="vacio" data-inf-vacio>{vacio}</div> : (
    <div className="tarj"><table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{filas.map((f) => <tr key={f.clave} data-fila={f.nombre}>{f.celdas.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>);
  return (
    <>
      <h1>Informes</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {TABS.map(([k, t]) => <button key={k} data-tab={k} className={tab === k ? "p" : "s"} onClick={() => setTab(k)}>{t}</button>)}
      </div>
      {conRango && (
        <div className="tarj">
          <div className="rej"><div><label>Desde</label><input type="date" data-desde value={desde} onChange={(x) => setDesde(x.target.value)} /></div><div><label>Hasta</label><input type="date" data-hasta value={hasta} onChange={(x) => setHasta(x.target.value)} /></div></div>
          {tab === "ventas" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(POR).map(([k, t]) => <button key={k} data-por={k} className={por === k ? "p" : "s"} onClick={() => setPor(k)}>{t}</button>)}</div>}
          {tab === "gastos" && <div style={{ display: "flex", gap: 8 }}>{[["categoria", "Por categoría"], ["usuario", "Por persona"]].map(([k, t]) => <button key={k} data-por-gasto={k} className={porG === k ? "p" : "s"} onClick={() => setPorG(k)}>{t}</button>)}</div>}
        </div>)}
      {tab === "ventas" && (
        <>
          <div className="rej">
            <div className="tarj kpi"><small>Ventas</small><b data-inf-total>{plata(tot.total)}</b></div>
            <div className="tarj kpi"><small>Utilidad</small><b data-inf-utilidad>{plata(tot.utilidad)}</b></div>
            <div className="tarj kpi"><small>Gastos del periodo</small><b data-inf-gastos>{plata(gastosRango)}</b></div>
            <div className="tarj kpi"><small>Utilidad − gastos</small><b data-inf-neto>{plata(tot.utilidad - gastosRango)}</b></div>
          </div>
          <Tabla cols={[POR[por], "Unid.", "Ventas", "Utilidad"]} vacio="No hay ventas entregadas en ese rango." filas={ventas.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [f.nombre, f.unidades, plata(f.total), plata(f.utilidad)] }))} />
        </>)}
      {tab === "cobros" && (
        <>
          <div className="tarj kpi"><small>Cobrado en el periodo</small><b data-inf-cobrado>{plata(cobros.reduce((s, f) => s + f.total, 0))}</b></div>
          <Tabla cols={["Forma de pago", "Cobros", "Total"]} vacio="No hay cobros en ese rango." filas={cobros.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [f.nombre, f.cantidad, plata(f.total)] }))} />
        </>)}
      {tab === "visitas" && (
        <>
          <Tabla cols={["Vendedor", "Visitas", "Con pedido", "Efect."]} vacio="No hay visitas en ese rango." filas={visitas.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [f.nombre, f.visitas, f.conPedido, f.efectividad + "%"] }))} />
          <div className="tarj"><label>Clientes sin visitar hace (días) o más</label>
            <select data-dias-visita value={diasVisita} onChange={(x) => setDiasVisita(+x.target.value)}>{[7, 15, 30, 60].map((d) => <option key={d} value={d}>{d} días</option>)}</select></div>
          <Tabla cols={["Cliente", "Última", "Días"]} vacio="Todos tus clientes se han visitado." filas={sinVisita.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [<>{f.nombre}{f.vendedor && <div className="sub">Vendedor: {f.vendedor}</div>}</>, f.ultima ? D.fechaTxt(f.ultima) : "Nunca", f.dias ?? "—"] }))} />
        </>)}
      {tab === "gastos" && (
        <>
          <div className="tarj kpi"><small>Gastos del periodo</small><b data-inf-gastos-tab>{plata(gastos.reduce((s, f) => s + f.total, 0))}</b></div>
          <Tabla cols={[porG === "usuario" ? "Quién" : "Categoría", "Gastos", "Total"]} vacio="No hay gastos en ese rango." filas={gastos.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [f.nombre, f.cantidad, plata(f.total)] }))} />
        </>)}
      {tab === "facturas" && (
        <>
          <div className="tarj kpi"><small>{facturas.length} facturas en el periodo</small><b data-inf-facturado>{plata(facturas.reduce((s, f) => s + f.total, 0))}</b></div>
          <Tabla cols={["Factura", "Cliente", "Total"]} vacio="No hay facturas registradas en ese rango." filas={facturas.map((f) => ({ clave: f.id, nombre: f.numero, celdas: [<>{f.numero}<div className="sub">{D.fechaCortaTxt(f.fecha)}</div></>, <>{f.cliente}{!f.nit && <div className="sub" style={{ color: "var(--mal)" }}>sin NIT</div>}</>, plata(f.total)] }))} />
        </>)}
      {tab === "cartera" && (
        <>
          <div className="tarj kpi"><small>Total por cobrar</small><b data-inf-cartera>{plata(cartera.reduce((s, f) => s + f.total, 0))}</b></div>
          {!cartera.length ? <div className="vacio" data-inf-vacio>No hay cartera pendiente.</div> : (
            <div className="tarj"><table><thead><tr><th>Cliente</th><th>0-30</th><th>31-60</th><th>+60</th></tr></thead>
              <tbody>{cartera.map((f) => <tr key={f.clave} data-fila={f.nombre}><td>{f.nombre}<div className="sub">{f.masVieja} días la más vieja</div></td><td>{f.d30 ? plata(f.d30) : "—"}</td><td>{f.d60 ? plata(f.d60) : "—"}</td><td style={{ color: f.d60mas ? "var(--mal)" : undefined }}>{f.d60mas ? plata(f.d60mas) : "—"}</td></tr>)}</tbody></table></div>)}
        </>)}
      {tab === "rotacion" && (
        <>
          <div className="tarj"><label>Sin ventas en los últimos (días)</label>
            <select data-dias value={dias} onChange={(x) => setDias(+x.target.value)}>{[15, 30, 60, 90].map((d) => <option key={d} value={d}>{d} días</option>)}</select>
            <div className="sub">Plata quieta en bodega: <b data-inf-quieto>{plata(quieto.reduce((s, f) => s + f.valor, 0))}</b></div></div>
          <Tabla cols={["Producto", "Stock", "Valor"]} vacio="Todo lo que tienes en bodega se ha vendido." filas={quieto.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [f.nombre, f.stock, plata(f.valor)] }))} />
        </>)}
      {tab === "compras" && (
        <>
          <div className="tarj"><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>{[["proveedor", "Por proveedor"], ["producto", "Por producto"]].map(([k, t]) => <button key={k} data-por-compra={k} className={porC === k ? "p" : "s"} onClick={() => setPorC(k)}>{t}</button>)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[["todas", "Todas"], ["recibida", "Recibidas"], ["pendiente", "Pendientes"]].map(([k, t]) => <button key={k} data-estado-compra={k} className={estC === k ? "p" : "s"} onClick={() => setEstC(k)}>{t}</button>)}</div>
            <div className="sub">Recibidas: por fecha de recepción · Pendientes: por fecha esperada. Valor estimado con el costo actual de cada producto.</div></div>
          <div className="rej"><div className="tarj kpi"><small>Unidades compradas</small><b data-inf-compras-unid>{totC.unidades}</b></div><div className="tarj kpi"><small>Valor estimado</small><b data-inf-compras-valor>{plata(totC.valor)}</b></div></div>
          <Tabla cols={[porC === "producto" ? "Producto" : "Proveedor", "Compras", "Unid.", "Valor"]} vacio="No hay compras en ese rango." filas={compras.map((f) => ({ clave: f.clave, nombre: f.nombre, celdas: [<>{f.nombre}{f.pendientes > 0 && <div className="sub">{f.pendientes} unid. pendientes de recibir</div>}</>, f.compras, f.unidades, plata(f.valor)] }))} />
        </>)}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="p" data-ver-informe onClick={() => setVista(true)}>Ver informe para imprimir</button>
        <button className="s g" data-descargar-informe onClick={bajar}>Descargar Excel</button>
      </div>
      {vista && <InformeImpreso e={e} empresa={empresa} hojas={armarHojas()} titulo={(TABS.find(([k]) => k === tab) || [])[1] || "Informe"} periodo={conRango ? `Del ${D.fechaTxt(desde)} al ${D.fechaTxt(hasta)}` : tab === "rotacion" ? `Sin ventas en los últimos ${dias} días` : "A la fecha"} cerrar={() => setVista(false)} />}
    </>);
}

// Informe con el logo y los datos de la empresa, listo para imprimir o guardar como PDF
function InformeImpreso({ e, empresa, hojas, titulo, periodo, cerrar }) {
  const cfg = D.configEmpresa(e);
  const logo = D.imagenProducto(e, "logo_empresa");
  const nombre = cfg.razonSocial || cfg.nombreComercial || empresa;
  const color = "#1F3864";
  const DINERO = /^(Ventas|Utilidad|Total|Valor.*|Subtotal|IVA|Retención|Saldo|Precio.*|0-30 días|31-60 días|Más de 60)$/;
  const fmt = (v, enc) => typeof v === "number" ? (DINERO.test(enc) ? plata(v) : String(v)) : (v === null || v === undefined ? "" : String(v));
  const datos = [cfg.nit && "NIT " + cfg.nit, cfg.direccion, cfg.telefono, cfg.correo].filter(Boolean).join("  ·  ");
  const ahora = new Date();
  const generado = D.fechaTxt(D.hoyISO()) + " " + String(ahora.getHours()).padStart(2, "0") + ":" + String(ahora.getMinutes()).padStart(2, "0");
  return (
    <div className="no-imprimir-fondo" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 60, overflow: "auto", padding: 12 }} data-informe-impreso>
      <div className="no-imprimir" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
        <button className="p" data-imprimir-informe onClick={() => abrirImpresion("Informe de " + titulo)}>Imprimir / guardar PDF</button>
        <button className="s" data-cerrar-informe onClick={cerrar}>Cerrar</button>
      </div>
      <div data-hoja-doc data-papel="carta" style={{ background: "#fff", color: "#111", maxWidth: 820, margin: "0 auto", padding: 24, borderRadius: 6, fontFamily: "Arial, sans-serif", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "3px solid " + color, paddingBottom: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 90 }}>{logo ? <img data-informe-logo src={logo} alt="" style={{ maxHeight: 64, maxWidth: 170, objectFit: "contain" }} /> : null}</div>
          <div style={{ textAlign: "right", flex: "1 1 220px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color }}>{nombre}</div>
            {datos && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{datos}</div>}
          </div>
        </div>
        <div style={{ margin: "14px 0 10px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color }}>Informe de {titulo}</div>
          <div style={{ fontSize: 12, color: "#555" }}>{periodo} · Generado el {generado}</div>
        </div>
        {hojas.map((h, k) => {
          const [enc, ...filas] = h.filas;
          const hayTotal = filas.length && String(filas[filas.length - 1][0]) === "TOTAL";
          return (
            <div key={k} style={{ marginBottom: 14 }}>
              {hojas.length > 1 && <div style={{ fontWeight: 700, margin: "8px 0 4px", color }}>{h.nombre}</div>}
              {!filas.length || (hayTotal && filas.length === 1) ? <div style={{ color: "#777", padding: "10px 0" }}>Sin datos en este periodo.</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{enc.map((c, i) => <th key={i} style={{ background: color, color: "#fff", padding: "6px 8px", textAlign: i === 0 ? "left" : "right", border: "1px solid " + color }}>{c}</th>)}</tr></thead>
                  <tbody>{filas.map((f, i) => { const t = hayTotal && i === filas.length - 1; return (
                    <tr key={i} style={{ background: t ? "#DCE6F4" : i % 2 ? "#F3F6FB" : "#fff", fontWeight: t ? 700 : 400 }}>
                      {enc.map((c, j) => <td key={j} style={{ padding: "5px 8px", border: "1px solid #D5DCE8", textAlign: j === 0 ? "left" : typeof f[j] === "number" || /^\$/.test(fmt(f[j], c)) ? "right" : "left" }}>{fmt(f[j], c)}</td>)}
                    </tr>); })}</tbody>
                </table>)}
            </div>);
        })}
        <div style={{ borderTop: "1px solid #ccc", marginTop: 16, paddingTop: 6, fontSize: 10, color: "#777", display: "flex", justifyContent: "space-between" }}>
          <span>{nombre}</span><span>Generado con TAT Conecta</span>
        </div>
      </div>
    </div>);
}

// Dibujo pequeño de cada diseño de remisión, para escoger viéndolo
function MiniaturaRemision({ fmt, color }) {
  const g = "#c9c9c9", n = "#555", c = fmt === "moderno" || fmt === "elegante" ? color : "#000";
  const filas = (y0, paso, k, ancho = 84) => Array.from({ length: k }, (_, i) => <rect key={i} x="8" y={y0 + i * paso} width={ancho} height="2" fill={g} />);
  return (
    <svg viewBox="0 0 100 128" style={{ width: "100%", maxWidth: 150, display: "block", margin: "0 auto 6px", background: "#fff", border: "1px solid #d8d8d8", borderRadius: 4 }} aria-hidden="true">
      {fmt === "clasico" && <>
        <rect x="8" y="7" width="22" height="12" fill={g} /><rect x="58" y="8" width="34" height="4" fill="#000" /><rect x="66" y="14" width="26" height="2" fill={g} />
        <rect x="8" y="26" width="40" height="24" fill="none" stroke="#777" rx="2" /><rect x="52" y="26" width="40" height="24" fill="none" stroke="#777" rx="2" />
        <rect x="12" y="31" width="30" height="2" fill={n} /><rect x="56" y="31" width="30" height="2" fill={n} />
        <line x1="8" y1="58" x2="92" y2="58" stroke="#777" />{filas(63, 8, 6)}<rect x="62" y="114" width="30" height="5" fill="#000" />
      </>}
      {fmt === "moderno" && <>
        <rect x="6" y="6" width="88" height="20" rx="3" fill={color} /><rect x="10" y="10" width="18" height="12" rx="2" fill="#fff" /><rect x="60" y="11" width="30" height="4" fill="#fff" /><rect x="68" y="18" width="22" height="2" fill="#fff" opacity=".8" />
        <rect x="8" y="32" width="40" height="22" fill={color} fillOpacity=".08" stroke="#ddd" /><rect x="8" y="32" width="3" height="22" fill={color} />
        <rect x="52" y="32" width="40" height="22" fill={color} fillOpacity=".08" stroke="#ddd" /><rect x="52" y="32" width="3" height="22" fill={color} />
        <rect x="8" y="60" width="84" height="7" fill={color} />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="8" y={69 + i * 8} width="84" height="7" fill={i % 2 ? color : "#fff"} fillOpacity={i % 2 ? ".12" : 1} />)}
        <rect x="62" y="114" width="30" height="5" fill={color} />
      </>}
      {fmt === "compacto" && <>
        <rect x="8" y="6" width="14" height="8" fill={g} /><rect x="26" y="7" width="30" height="3" fill="#000" /><rect x="70" y="7" width="22" height="3" fill={g} />
        <line x1="8" y1="17" x2="92" y2="17" stroke="#000" />
        {Array.from({ length: 4 }, (_, i) => <g key={i}><rect x="8" y={21 + i * 4.5} width="38" height="1.8" fill={n} /><rect x="52" y={21 + i * 4.5} width="38" height="1.8" fill={n} /></g>)}
        <rect x="8" y="43" width="84" height="5" fill="#e6e6e6" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x="8" y={51 + i * 4.6} width="84" height="1.6" fill={g} />)}
        <rect x="66" y="118" width="26" height="4" fill="#000" />
      </>}
      {fmt === "elegante" && <>
        <circle cx="50" cy="12" r="5" fill={g} /><rect x="30" y="20" width="40" height="3" fill="#000" /><rect x="38" y="26" width="24" height="2" fill={color} />
        <line x1="8" y1="33" x2="92" y2="33" stroke={color} strokeWidth="1.4" />
        <line x1="50" y1="38" x2="50" y2="58" stroke="#ddd" />
        <rect x="10" y="39" width="12" height="2" fill={color} /><rect x="10" y="45" width="34" height="2" fill={n} /><rect x="10" y="50" width="30" height="2" fill={n} />
        <rect x="56" y="39" width="12" height="2" fill={color} /><rect x="56" y="45" width="34" height="2" fill={n} /><rect x="56" y="50" width="30" height="2" fill={n} />
        <rect x="8" y="64" width="20" height="2.4" fill={color} /><rect x="62" y="64" width="30" height="2.4" fill={color} /><line x1="8" y1="69" x2="92" y2="69" stroke={color} strokeWidth="1.4" />
        {[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x="8" y={73 + i * 8} width="60" height="2" fill={g} /><line x1="8" y1={79 + i * 8} x2="92" y2={79 + i * 8} stroke="#e6e6e6" /></g>)}
        <line x1="60" y1="113" x2="92" y2="113" stroke={color} strokeWidth="1.4" /><rect x="64" y="116" width="28" height="4" fill={color} />
      </>}
    </svg>);
}

function Interruptor({ marcado, onChange, dato, children }) {
  return (
    <label className="fila" style={{ color: "var(--tx)", fontSize: 15, cursor: "pointer" }}>
      <span>{children}</span>
      <input type="checkbox" data-sw={dato} style={{ width: 24, height: 24, margin: 0 }} checked={marcado} onChange={(x) => onChange(x.target.checked)} />
    </label>);
}


// Manual de uso dentro de la app (buscable)
function ManualApp() {
  const [q, setQ] = useState(""); const [abierto, setAbierto] = useState("inicio");
  const t = q.trim().toLowerCase();
  const lista = MANUAL.filter((s) => !t || (s.titulo + " " + s.pasos.join(" ")).toLowerCase().includes(t));
  return (
    <>
      <input data-manual-buscar placeholder="Buscar en el manual…" value={q} onChange={(x) => setQ(x.target.value)} />
      {!lista.length && <div className="vacio">No encontré nada con «{q}».</div>}
      {lista.map((s) => {
        const ab = t ? true : abierto === s.id;
        return (
          <div className="tarj" key={s.id} data-manual-sec={s.id}>
            <button className="fila-menu" style={{ padding: 0 }} data-manual-abrir={s.id} onClick={() => setAbierto(ab && !t ? null : s.id)}>
              <span className="ic">{s.icono}</span><b style={{ flex: 1, textAlign: "left" }}>{s.titulo}</b><span className="flecha">{ab ? "⌄" : "›"}</span>
            </button>
            {ab && <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>{s.pasos.map((p, i) => <li key={i} style={{ marginBottom: 8 }}>{p}</li>)}</ol>}
          </div>);
      })}
    </>);
}

function AcercaDe({ sesion }) {
  const emp = sesion.empresa; const lic = licencia(emp);
  const instalada = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  const [linea, setLinea] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => { const a = () => setLinea(true), b = () => setLinea(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);
  return (
    <>
      <div className="tarj" style={{ textAlign: "center" }} data-acerca>
        <img src="iconos/logo.png" alt="TAT Conecta" style={{ width: 120, height: 120 }} />
        <h2 style={{ margin: "12px 0 2px" }}>{APP.nombre}</h2>
        <div className="sub">{APP.lema}</div>
        <div style={{ marginTop: 8 }}><Chip nivel="neu">Versión {APP.version}</Chip></div>
      </div>
      <div className="tarj">
        <div className="fila"><span>Empresa</span><b data-acerca-empresa>{emp.nombre}</b></div>
        {emp.nit && <div className="fila"><span>NIT</span><b>{emp.nit}</b></div>}
        <div className="fila"><span>Plan</span><b>{emp.plan}</b></div>
        <div className="fila"><span>Licencia</span><Chip nivel={lic.vigente ? "ok" : "sin"}>{lic.vigente ? `Vigente (${lic.dias} días)` : lic.motivo}</Chip></div>
        <div className="fila"><span>Usuario</span><b>{sesion.perfil.nombre || sesion.perfil.email}</b></div>
        <div className="fila"><span>Rol</span><b>{ROLES[sesion.perfil.rol] || sesion.perfil.rol}</b></div>
      </div>
      <div className="tarj">
        <div className="fila"><span>Conexión</span><Chip nivel={linea ? "ok" : "poco"}>{linea ? "En línea" : "Sin señal (trabajando local)"}</Chip></div>
        <div className="fila"><span>Instalada en este equipo</span><b>{instalada ? "Sí" : "No, se usa desde el navegador"}</b></div>
        <div className="fila"><span>Versión del manual</span><b>{APP.fecha}</b></div>
      </div>
      <div className="sub" style={{ textAlign: "center", margin: "14px 0" }}>© 2026 {APP.nombre}. Todos los derechos reservados.</div>
    </>);
}

function Configuracion({ sesion, e, avisar, ir }) {
  const prefs = usarPrefs();
  const rol = sesion.perfil.rol;
  const lic = licencia(sesion.empresa);
  const actual = D.configEmpresa(e);
  const [f, setF] = useState({ ...actual, nit: actual.nit || sesion.empresa.nit || "" });
  const [editFormato, setEditFormato] = useState(false);
  const fondoPropio = D.imagenProducto(e, "remision_fondo"), ppGuardado = D.limpiarPlantillaPropia(actual.plantillaPropia);
  const guardarPP = (pp, msg) => { const r = accion((s) => D.guardarConfig(s, { plantillaPropia: pp })); if (r.ok) setF((x) => ({ ...x, plantillaPropia: D.limpiarPlantillaPropia(pp) })); avisar(r.ok ? msg : r.error, !r.ok); return r.ok; };
  const subirFormato = async (ev) => {
    const a = ev.target.files?.[0]; ev.target.value = ""; if (!a) return;
    try {
      let d = await reducirImagen(a, 1400, 0.72); if (d.length > 750000) d = await reducirImagen(a, 1100, 0.55);
      if (d.length > 900000) { avisar("La imagen pesa demasiado. Usa una más pequeña o con menos detalle.", true); return; }
      const r = accion((st) => D.guardarImagen(st, "remision_fondo", d)); avisar(r.ok ? "Imagen del formato guardada" : r.error, !r.ok);
    } catch (err) { avisar(err.message, true); }
  };
  const cambioF = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const modoApagado = (m) => (f.modulosOff || []).includes(m);
  const alternarModulo = (m) => cambioF("modulosOff", modoApagado(m) ? f.modulosOff.filter((x) => x !== m) : [...(f.modulosOff || []), m]);
  const veRol = (r, v) => { const o = f.vistasRol?.[r]?.[v]; return typeof o === "boolean" ? o : vistaBase(r, v); };
  const ponerVistaRol = (r, v, val) => {
    const roles = { ...(f.vistasRol || {}) }; const mio = { ...(roles[r] || {}) };
    if (val === vistaBase(r, v)) delete mio[v]; else mio[v] = val;
    roles[r] = mio; cambioF("vistasRol", roles);
  };
  const guardar = () => { const r = accion((s) => D.guardarConfig(s, f)); avisar(r.ok ? "Configuración guardada" : r.error, !r.ok); };
  const Boton = ({ k, val, t, dato }) => <button data-pref={dato} className={prefs[k] === val ? "p" : "s"} style={{ flex: 1, minWidth: 90 }} onClick={() => guardarPrefs({ [k]: val })}>{t}</button>;
  const [sec, setSec] = useState(null);
  const lic_ok = lic.vigente;
  const SECCIONES = [
    ["pantalla", "", "Apariencia y pantalla", "Tema, letra, formato de números y fechas, portal", false],
    ["recibos", "", "Datos y recibos", "Nombre, teléfono, dirección y mensaje del recibo", true],
    ["ventas", "", "Reglas de venta e impuestos", "Descuentos, crédito, pedido mínimo, IVA, retención", true],
    ["factura", "", "Facturación electrónica", "Resolución de la DIAN y numeración de facturas", true],
    ["promos", "", "Ofertas y promociones", "Descuentos y regalos que se aplican solos", true],
    ["listas", "", "Listas editables", "Formas de pago, motivos de visita, categorías de gasto", true],
    ["menu", "", "Editar menú principal", "Qué módulos usa tu empresa y qué ve cada rol", true],
    ["empresa", "", "Mi empresa, plan y datos", "Plan, usuarios y reinicio de datos", true],
    ["manual", "", "Manual", "Cómo usar cada parte de la aplicación", false],
    ["acerca", "", "Acerca de…", "Versión, empresa y licencia", false],
  ].filter(([, , , , soloAdmin]) => !soloAdmin || rol === "admin");
  const abrir = (k) => setSec(k);   // «Mi empresa» también se abre aquí adentro: así el botón ← vuelve a Configuración
  if (sec === null) return (
    <>
      <h1>Configuración</h1>
      <div className="tarj" style={{ padding: 0 }}>
        {SECCIONES.map(([k, ic, t, sub]) => (
          <button key={k} className="fila-menu" data-sec={k} onClick={() => abrir(k)}>
            <span className="ic">{ic}</span><span style={{ flex: 1, textAlign: "left" }}><b>{t}</b><span className="sub" style={{ display: "block" }}>{sub}</span></span><span className="flecha">›</span>
          </button>))}
      </div>
    </>);
  const titulo = SECCIONES.find(([k]) => k === sec)?.[2] || "Configuración";
  const guardarBtn = <button className="p g" data-guardar-config disabled={!lic.vigente} onClick={guardar}>Guardar</button>;
  const avisoLic = !lic.vigente && <div className="alerta sin">Licencia {lic.motivo}: no se pueden guardar cambios.</div>;
  return (
    <>
      <button className="s" data-cfg-atras onClick={() => setSec(null)}>← Configuración</button>
      <h1 style={{ marginTop: 12 }}>{titulo}</h1>
      {sec === "pantalla" && (
        <>
          <div className="sub" style={{ marginBottom: 8 }}>Solo cambia en este equipo.</div>
      <div className="tarj">
        <b>Apariencia</b>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[["auto", "Automático"], ["claro", "Claro"], ["oscuro", "Oscuro"]].map(([k, t]) => <button key={k} data-tema={k} className={prefs.tema === k ? "p" : "s"} style={{ flex: 1 }} onClick={() => guardarPrefs({ tema: k })}>{t}</button>)}
        </div>
        <div className="sub" style={{ margin: "6px 0 12px" }}>Automático sigue la configuración de tu celular o computador.</div>
        <b>Estilo de iconos</b>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[["color", "A todo color"], ["clasico", "Clásicos"]].map(([k, t]) => <button key={k} data-iconos={k} className={prefs.iconos === k ? "p" : "s"} style={{ flex: 1 }} onClick={() => guardarPrefs({ iconos: k })}>{t}</button>)}
        </div>
        <div className="sub" style={{ margin: "6px 0 12px" }}>Puedes cambiar entre los dos cuando quieras. Solo cambia en este equipo.</div>
        <b>Tamaño de letra</b>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[["normal", "Normal"], ["grande", "Grande"], ["enorme", "Muy grande"]].map(([k, t]) => <button key={k} data-letra={k} className={prefs.letra === k ? "p" : "s"} style={{ flex: 1 }} onClick={() => guardarPrefs({ letra: k })}>{t}</button>)}
        </div>
      </div>
      <div className="tarj">
        <b>Formato de números</b>
        <label style={{ display: "block", marginTop: 8 }}>Separador de miles</label>
        <select data-miles value={prefs.miles} onChange={(x) => guardarPrefs({ miles: x.target.value })}>
          <option value=".">Punto: 1.234.567,00</option><option value=",">Coma: 1,234,567.00</option><option value="espacio">Espacio: 1 234 567,00</option><option value="ninguno">Sin separador: 1234567,00</option>
        </select>
        <label>Decimales</label>
        <select data-decimales value={prefs.decimales} onChange={(x) => guardarPrefs({ decimales: +x.target.value })}><option value={0}>Sin decimales</option><option value={2}>Dos decimales</option></select>
        <label>Símbolo de moneda</label>
        <select data-simbolo value={prefs.simbolo} onChange={(x) => guardarPrefs({ simbolo: x.target.value })}><option value="$">$</option><option value="COP">COP</option><option value="">Ninguno</option></select>
        <div className="alerta ok" style={{ marginTop: 0 }}>Así se verá: <b data-ejemplo>{plata(1234567.5)}</b></div>
      </div>
      <div className="tarj">
        <b>Cómo se ve el portal</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {[["cuadricula", "▦ Cuadrícula"], ["grande", "◼ Iconos grandes"], ["lista", "☰ Lista"], ["compacta", "▪ Compacta"]].map(([k, t]) => <button key={k} data-portal-op={k} className={(prefs.portal || "cuadricula") === k ? "p" : "s"} onClick={() => guardarPrefs({ portal: k })}>{t}</button>)}
        </div>
      </div>
      <div className="tarj">
        <b>Fechas y pantalla de inicio</b>
        <label style={{ display: "block", marginTop: 8 }}>Formato de fechas</label>
        <select data-fecha value={prefs.fecha} onChange={(x) => guardarPrefs({ fecha: x.target.value })}>
          <option value="dmy/">DD/MM/AAAA (15/10/2026)</option><option value="dmy-">DD-MM-AAAA (15-10-2026)</option><option value="iso">AAAA-MM-DD (2026-10-15)</option>
        </select>
        <div className="sub" data-ejemplo-fecha style={{ marginBottom: 10 }}>Hoy: {D.fechaTxt(D.hoyISO())}</div>
        <label>Al abrir la aplicación mostrar</label>
        <select data-inicio value={prefs.inicio} onChange={(x) => guardarPrefs({ inicio: x.target.value })}>
          {[["portal", "El portal (iconos)"], ["inicio", "Indicadores"], ["vender", "Nueva venta"], ["pedidos", "Pedidos"], ["despachos", "Rutas y Despachos"], ["stock", "Inventario"]].filter(([k]) => k === "portal" || puedeVer(rol, k)).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
        </>)}
      {sec === "recibos" && rol === "admin" && <>{avisoLic}
        <div className="tarj">
          <b>Datos para recibos y WhatsApp</b>
          <label style={{ display: "block", marginTop: 8 }}>Nombre comercial</label><input data-cfg="nombreComercial" value={f.nombreComercial} placeholder={sesion.empresa.nombre} onChange={(x) => cambioF("nombreComercial", x.target.value)} />
          <label>Razón social (si es distinta del nombre comercial)</label><input data-cfg="razonSocial" value={f.razonSocial || ""} onChange={(x) => cambioF("razonSocial", x.target.value)} />
          <label>Correo electrónico de la empresa</label><input data-cfg="correo" value={f.correo || ""} onChange={(x) => cambioF("correo", x.target.value)} />
          <label>Teléfono / celular</label><input data-cfg="telefono" value={f.telefono} onChange={(x) => cambioF("telefono", x.target.value)} />
          <label>Dirección</label><input data-cfg="direccion" value={f.direccion} onChange={(x) => cambioF("direccion", x.target.value)} />
          <label>Mensaje al final del recibo</label><input data-cfg="mensajeRecibo" value={f.mensajeRecibo} onChange={(x) => cambioF("mensajeRecibo", x.target.value)} />
          <Interruptor dato="mostrarNit" marcado={!!f.mostrarNit} onChange={(v) => cambioF("mostrarNit", v)}>Mostrar el NIT en el recibo</Interruptor>
          {f.mostrarNit && <><label>NIT</label><input data-cfg="nit" value={f.nit} onChange={(x) => cambioF("nit", x.target.value)} /></>}
        </div>
        <div className="tarj" data-plantilla-docs>
          <b>Plantilla de recibos y remisiones</b>
          <label style={{ display: "block", marginTop: 8 }}>Línea bajo el nombre (slogan, razón social…)</label><input data-cfg="encabezadoDoc" value={f.encabezadoDoc} onChange={(x) => cambioF("encabezadoDoc", x.target.value)} />
          <label style={{ marginTop: 10 }}>Logo de la empresa (sale en la remisión impresa)</label>
          {D.imagenProducto(e, "logo_empresa") ? <img data-logo-empresa src={D.imagenProducto(e, "logo_empresa")} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, objectFit: "contain", display: "block", background: "#fff", padding: 4, borderRadius: 8, margin: "6px 0" }} /> : <div className="sub">Aún no has subido el logo.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
            <label className="s" style={{ margin: 0, textAlign: "center", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)" }}>{D.imagenProducto(e, "logo_empresa") ? "Cambiar logo" : "Subir logo"}
              <input data-subir-logo type="file" accept="image/*" hidden onChange={async (ev) => { const a = ev.target.files?.[0]; ev.target.value = ""; if (!a) return; try { const d = await reducirImagen(a, 400, 0.85); const r = accion((st) => D.guardarImagen(st, "logo_empresa", d)); avisar(r.ok ? "Logo guardado" : r.error, !r.ok); } catch (err) { avisar(err.message, true); } }} /></label>
            {D.imagenProducto(e, "logo_empresa") && <button className="s" data-quitar-logo onClick={() => { accion((st) => D.guardarImagen(st, "logo_empresa", "")); avisar("Logo quitado"); }}>Quitar logo</button>}
          </div>
          <Interruptor dato="docLogo" marcado={f.docLogo !== false} onChange={(v) => cambioF("docLogo", v)}>Mostrar el logo en la remisión</Interruptor>
          <label>Diseño de la remisión</label>
          <div data-disenos style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, margin: "6px 0 10px" }}>
            {[["clasico", "Clásico", "Blanco y negro, sencillo"], ["moderno", "Moderno", "Franja de color y filas alternadas"], ["compacto", "Compacto", "Letra pequeña, ahorra papel"], ["elegante", "Elegante", "Encabezado centrado y líneas finas"]].map(([id, t, d]) => (
              <button type="button" key={id} data-formato-opcion={id} aria-pressed={(f.formatoDoc || "clasico") === id} onClick={() => cambioF("formatoDoc", id)}
                style={{ padding: 8, textAlign: "center", cursor: "pointer", borderRadius: 12, background: "var(--tarj, #fff)", color: "var(--tx)", font: "inherit", border: (f.formatoDoc || "clasico") === id ? "3px solid var(--pri)" : "1px solid #bbb" }}>
                <MiniaturaRemision fmt={id} color={D.COLORES_DOC.includes(f.colorDoc) ? f.colorDoc : D.COLORES_DOC[0]} />
                <b style={{ display: "block" }}>{t}{(f.formatoDoc || "clasico") === id ? " ✓" : ""}</b><span className="sub" style={{ fontSize: 12 }}>{d}</span>
              </button>))}
          </div>
          {["moderno", "elegante"].includes(f.formatoDoc) && <div data-colores-doc>
            <label>Color principal del diseño</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "6px 0 10px" }}>
              {D.COLORES_DOC.map((c, k) => <button type="button" key={c} data-color-doc={c} aria-label={["Azul", "Verde", "Rojo", "Naranja", "Morado", "Gris oscuro"][k]} aria-pressed={(D.COLORES_DOC.includes(f.colorDoc) ? f.colorDoc : D.COLORES_DOC[0]) === c} onClick={() => cambioF("colorDoc", c)}
                style={{ width: 40, height: 40, borderRadius: 20, background: c, cursor: "pointer", border: (D.COLORES_DOC.includes(f.colorDoc) ? f.colorDoc : D.COLORES_DOC[0]) === c ? "4px solid var(--tx)" : "2px solid #fff", boxShadow: "0 0 0 1px #aaa" }} />)}
            </div>
          </div>}
          <div className="sub" style={{ marginBottom: 6 }}>Recuerda pulsar «Guardar» al final de la pantalla para que el cambio quede.</div>
          <label>Tamaño del papel</label>
          <select data-cfg="papelDoc" value={f.papelDoc || "carta"} onChange={(x) => cambioF("papelDoc", x.target.value)}>
            <option value="carta">Carta</option><option value="media">Media carta</option><option value="ticket">Tirilla de 80 mm (impresora de recibos)</option>
          </select>
          <Interruptor dato="docBarras" marcado={f.docBarras !== false} onChange={(v) => cambioF("docBarras", v)}>Código de barras con el número de la remisión</Interruptor>
          <Interruptor dato="docCodigo" marcado={f.docCodigo !== false} onChange={(v) => cambioF("docCodigo", v)}>Mostrar el código de los productos</Interruptor>
          <Interruptor dato="docPrecios" marcado={f.docPrecios !== false} onChange={(v) => cambioF("docPrecios", v)}>Mostrar precios y total (apágalo para una remisión sin valores)</Interruptor>
          <label>Texto al final de la remisión (condiciones, garantía…)</label><input data-cfg="pieRemision" value={f.pieRemision} onChange={(x) => cambioF("pieRemision", x.target.value)} />
          <Interruptor dato="mostrarFirma" marcado={f.mostrarFirma !== false} onChange={(v) => cambioF("mostrarFirma", v)}>Línea «Recibí conforme» en la remisión</Interruptor>
          <Interruptor dato="mostrarVendedor" marcado={!!f.mostrarVendedor} onChange={(v) => cambioF("mostrarVendedor", v)}>Mostrar quién atendió</Interruptor>
          <div className="sub" data-vista-previa style={{ whiteSpace: "pre-wrap", marginTop: 8, background: "var(--fondo2, transparent)", padding: 8, borderRadius: 8 }}>{D.textoRemision({ clientes: [{ id: "x", nombre: "Cliente de ejemplo" }], productos: [{ id: "p", nombre: "Producto de ejemplo" }] }, { numero: 123, fecha: D.hoyISO(), clienteId: "x", usuario: "Vendedor", items: [{ productoId: "p", cant: 2, precio: 1000 }] }, sesion.empresa.nombre, f)}</div>
        </div>
        <div className="tarj" data-formato-propio>
          <b>Formato propio de remisión (opcional)</b>
          <p className="sub">Si tu empresa ya tiene su formato de remisión, súbelo como imagen y coloca sobre él cada dato. Si no lo activas, las remisiones salen con el diseño de arriba, como siempre.</p>
          {fondoPropio ? <img data-fondo-miniatura src={fondoPropio} alt="Mi formato" style={{ maxHeight: 170, maxWidth: "100%", background: "#fff", border: "1px solid #bbb", borderRadius: 8, display: "block", margin: "6px 0" }} /> : <div className="sub">Aún no has subido la imagen de tu formato. Toma una foto o captura del formato (JPG o PNG) con la forma de la hoja.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
            <label className="s" style={{ margin: 0, textAlign: "center", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 600, color: "var(--pri)", background: "var(--pri2)" }}>{fondoPropio ? "Cambiar imagen" : "Subir imagen de mi formato"}
              <input data-subir-formato type="file" accept="image/*" hidden onChange={subirFormato} /></label>
            {fondoPropio && <button className="s" data-quitar-formato onClick={() => { if (!window.confirm("¿Quitar la imagen de tu formato? Las remisiones volverán al diseño estándar.")) return; accion((st) => D.guardarImagen(st, "remision_fondo", "")); if (ppGuardado.activa) guardarPP({ ...ppGuardado, activa: false }, "Formato propio desactivado"); else avisar("Imagen quitada"); }}>Quitar imagen</button>}
          </div>
          {fondoPropio && <>
            <button className="p" data-abrir-editor-formato style={{ width: "100%", margin: "6px 0" }} onClick={() => setEditFormato(true)}>Colocar los datos en mi formato</button>
            <Interruptor dato="formatoPropioActivo" marcado={ppGuardado.activa} onChange={(v) => guardarPP({ ...ppGuardado, activa: v }, v ? "Ahora las remisiones salen con tu formato" : "Las remisiones vuelven al diseño estándar")}>Usar mi formato en las remisiones</Interruptor>
          </>}
          {editFormato && <EditorFormatoPropio plInicial={ppGuardado} fondo={fondoPropio} imprimir={abrirImpresion} onCerrar={() => setEditFormato(false)} onGuardar={(pl) => guardarPP({ ...pl, activa: ppGuardado.activa }, "Formato guardado")} />}
        </div>
        <div className="tarj" data-contadores>
          <b>Numeración</b>
          <p className="sub">Desde qué número arranca cada documento. Útil si ya venías numerando en otro sistema: el siguiente será este número o el último que exista más uno, el que sea mayor.</p>
          <label>Pedidos y remisiones</label><input data-cfg="inicioPedidos" inputMode="numeric" value={f.inicioPedidos} onChange={(x) => cambioF("inicioPedidos", x.target.value.replace(/\D/g, ""))} />
          <label>Compras</label><input data-cfg="inicioCompras" inputMode="numeric" value={f.inicioCompras} onChange={(x) => cambioF("inicioCompras", x.target.value.replace(/\D/g, ""))} />
          <label>Rutas y despachos</label><input data-cfg="inicioRutas" inputMode="numeric" value={f.inicioRutas} onChange={(x) => cambioF("inicioRutas", x.target.value.replace(/\D/g, ""))} />
        </div>
        {guardarBtn}</>}
      {sec === "factura" && rol === "admin" && <>{avisoLic}
        <div className="tarj" data-resolucion>
          <b>Resolución de facturación (DIAN)</b>
          <p className="sub">Copia los datos tal como aparecen en la resolución que te autorizó la DIAN. La app te sugiere el siguiente número, no te deja salir del rango y te avisa cuando se acaba o vence.</p>
          {[["numero", "Número de la resolución"], ["prefijo", "Prefijo de las facturas (ej. FE)"]].map(([k, t]) => <div key={k}><label>{t}</label><input data-res={k} value={f.resDian[k]} onChange={(x) => cambioF("resDian", { ...f.resDian, [k]: x.target.value })} /></div>)}
          <label>Fecha de la resolución</label><input data-res="fecha" type="date" value={f.resDian.fecha} onChange={(x) => cambioF("resDian", { ...f.resDian, fecha: x.target.value })} />
          <div className="rej"><div><label>Numeración desde</label><input data-res="desde" inputMode="numeric" value={f.resDian.desde || ""} onChange={(x) => cambioF("resDian", { ...f.resDian, desde: x.target.value.replace(/\D/g, "") })} /></div><div><label>Hasta</label><input data-res="hasta" inputMode="numeric" value={f.resDian.hasta || ""} onChange={(x) => cambioF("resDian", { ...f.resDian, hasta: x.target.value.replace(/\D/g, "") })} /></div></div>
          <label>Vigente hasta</label><input data-res="vigencia" type="date" value={f.resDian.vigencia} onChange={(x) => cambioF("resDian", { ...f.resDian, vigencia: x.target.value })} />
          {(() => { const er = D.estadoResolucion(e); return er.configurada ? <div className="alerta ok" data-res-estado style={{ marginTop: 8 }}>{er.mensaje}{er.siguiente ? ` · Siguiente: ${er.siguiente}` : ""}</div> : null; })()}
        </div>
        {guardarBtn}</>}
      {sec === "ventas" && rol === "admin" && <>{avisoLic}
        <div className="tarj">
          <b>Ventas</b>
          <div style={{ marginTop: 8 }}><Interruptor dato="sinStock" marcado={!!f.permitirSinStock} onChange={(v) => cambioF("permitirSinStock", v)}>Permitir vender y entregar sin stock registrado</Interruptor></div>
          <div className="sub" style={{ marginBottom: 8 }}>Si está apagado, el sistema no deja entregar lo que no hay en bodega.</div>
          <label>Plazo máximo para entregar (días desde la venta)</label><input data-cfg="plazoEntregaDias" inputMode="numeric" value={f.plazoEntregaDias} onChange={(x) => cambioF("plazoEntregaDias", x.target.value.replace(/\D/g, ""))} />
          <label>Entregas que hace un vehículo en un día</label><input data-cfg="entregasPorVehiculoDia" inputMode="numeric" value={f.entregasPorVehiculoDia} onChange={(x) => cambioF("entregasPorVehiculoDia", x.target.value.replace(/\D/g, ""))} />
          <label>Pedido mínimo ($). 0 = sin mínimo</label><input data-cfg="pedidoMinimo" inputMode="numeric" value={f.pedidoMinimo} onChange={(x) => cambioF("pedidoMinimo", x.target.value.replace(/\D/g, ""))} />
          <div style={{ margin: "4px 0" }}><Interruptor dato="bloquearCartera" marcado={!!f.bloquearCartera} onChange={(v) => cambioF("bloquearCartera", v)}>No vender a clientes con cobros pendientes</Interruptor></div>
          {f.bloquearCartera && <><label>Solo si la deuda tiene más de (días). 0 = cualquier deuda</label><input data-cfg="bloquearCarteraDias" inputMode="numeric" value={f.bloquearCarteraDias} onChange={(x) => cambioF("bloquearCarteraDias", x.target.value.replace(/\D/g, ""))} /></>}
          <label>Descuento máximo al vender (%). 0 = precio fijo</label><input data-cfg="descuentoMax" inputMode="numeric" value={f.descuentoMax} onChange={(x) => cambioF("descuentoMax", x.target.value.replace(/\D/g, ""))} />
          <div style={{ margin: "4px 0" }}><Interruptor dato="descuentoPesos" marcado={!!f.descuentoPesos} onChange={(v) => cambioF("descuentoPesos", v)}>Permitir descuentos en $ además de en %</Interruptor></div>
          <label>Límite de crédito por cliente ($). 0 = sin límite</label><input data-cfg="limiteCartera" inputMode="numeric" value={f.limiteCartera} onChange={(x) => cambioF("limiteCartera", x.target.value.replace(/\D/g, ""))} />
          <div style={{ margin: "4px 0" }}><Interruptor dato="ultimoPrecio" marcado={!!f.ultimoPrecio} onChange={(v) => cambioF("ultimoPrecio", v)}>Usar el último precio que pagó el cliente</Interruptor></div>
          <div style={{ margin: "4px 0" }}><Interruptor dato="avisarVendedor" marcado={f.avisarVendedor !== false} onChange={(v) => cambioF("avisarVendedor", v)}>Ofrecer «Avisar al vendedor por WhatsApp» en cada pedido (el celular de cada vendedor se pone en Usuarios)</Interruptor></div>
          <div style={{ margin: "4px 0" }}><Interruptor dato="contraEntrega" marcado={f.contraEntrega !== false} onChange={(v) => cambioF("contraEntrega", v)}>Entregas contra pago: el conductor solo entrega si el cliente paga todo (salvo clientes con crédito autorizado)</Interruptor></div>
          <div style={{ margin: "4px 0" }}><Interruptor dato="exigirComprobante" marcado={f.exigirComprobante !== false} onChange={(v) => cambioF("exigirComprobante", v)}>Pedir foto del comprobante cuando el pago no es en efectivo (Nequi, Daviplata…)</Interruptor></div>
          <div style={{ margin: "4px 0" }}><Interruptor dato="exigirAlistado" marcado={!!f.exigirAlistado} onChange={(v) => cambioF("exigirAlistado", v)}>No entregar un pedido hasta que bodega marque la remisión como alistada</Interruptor></div>
          <div style={{ margin: "4px 0" }}><Interruptor dato="ventaPorCajas" marcado={!!f.ventaPorCajas} onChange={(v) => cambioF("ventaPorCajas", v)}>Vender por cajas (botones +1 caja)</Interruptor></div>
          <label>Avisar de productos que vencen en los próximos (días)</label><input data-cfg="diasAvisoVence" inputMode="numeric" value={f.diasAvisoVence} onChange={(x) => cambioF("diasAvisoVence", x.target.value.replace(/\D/g, ""))} />
          <div style={{ margin: "4px 0" }}><Interruptor dato="precargarAuto" marcado={!!f.precargarAuto} onChange={(v) => cambioF("precargarAuto", v)}>Cargar solos los productos habituales al elegir cliente</Interruptor></div>
          <label>Productos habituales: mirar los pedidos de los últimos (días). 0 = todos</label><input data-cfg="precargarDias" inputMode="numeric" value={f.precargarDias} onChange={(x) => cambioF("precargarDias", x.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="tarj">
          <b>Impuestos</b>
          <div style={{ marginTop: 8 }}><Interruptor dato="ivaActivo" marcado={!!f.ivaActivo} onChange={(v) => cambioF("ivaActivo", v)}>Manejar IVA en las ventas</Interruptor></div>
          {f.ivaActivo && <>
            <label>Nombre del impuesto (IVA, Impoconsumo…)</label><input data-cfg="ivaEtiqueta" value={f.ivaEtiqueta} onChange={(x) => cambioF("ivaEtiqueta", x.target.value)} />
            <label>Los precios de lista…</label>
            <select data-cfg="preciosConIva" value={f.preciosConIva ? "si" : "no"} onChange={(x) => cambioF("preciosConIva", x.target.value === "si")}>
              <option value="si">Ya incluyen el impuesto</option><option value="no">No incluyen el impuesto (se suma al total)</option>
            </select>
            <div className="sub">El porcentaje de cada producto se pone en Productos → IVA %.</div></>}
          <label style={{ display: "block", marginTop: 8 }}>Retención en la fuente (%). 0 = no se usa</label><input data-cfg="retencionPct" inputMode="decimal" value={f.retencionPct} onChange={(x) => cambioF("retencionPct", x.target.value.replace(/[^\d.]/g, ""))} />
          {+f.retencionPct > 0 && <><label>Aplicar solo si la venta (sin impuesto) es desde ($)</label><input data-cfg="retencionDesde" inputMode="numeric" value={f.retencionDesde} onChange={(x) => cambioF("retencionDesde", x.target.value.replace(/\D/g, ""))} /></>}
          <label>Los presupuestos valen (días)</label><input data-cfg="presupuestoDias" inputMode="numeric" value={f.presupuestoDias} onChange={(x) => cambioF("presupuestoDias", x.target.value.replace(/\D/g, ""))} />
        </div>
        {guardarBtn}</>}
      {sec === "promos" && rol === "admin" && <>{avisoLic}
        <div className="tarj" data-promos-config>
          <b>Ofertas y promociones</b>
          <div className="sub" style={{ margin: "4px 0 8px" }}>Las ofertas se crean y se administran en su propia pantalla: Ofertas (en el portal principal).</div>
          <label>Descuento máximo que puede dar una oferta (%)</label>
          <input data-cfg="ofertaMaxPct" inputMode="numeric" value={f.ofertaMaxPct} onChange={(x) => cambioF("ofertaMaxPct", x.target.value.replace(/\D/g, ""))} />
          <div className="sub">Protege contra errores: no deja crear una oferta con más descuento que este.</div>
        </div>
        {guardarBtn}</>}
      {sec === "listas" && rol === "admin" && <>{avisoLic}
        <div className="tarj">
          <b>Listas que puedes editar</b>
          <div className="sub" style={{ marginBottom: 6 }}>Separa cada opción con una coma.</div>
          {[["formasPago", "Formas de pago"], ["motivosVisita", "Motivos de visita"], ["resultadosVisita", "Resultados de visita"], ["categoriasGasto", "Categorías de gastos"], ["motivosAnulacion", "Motivos para anular una remisión"], ["conductores", "Conductores (escribe el nombre igual que en Usuarios)"]].map(([k, t]) => (
            <div key={k}><label>{t}</label><input data-lista={k} value={Array.isArray(f[k]) ? f[k].join(", ") : f[k]} onChange={(x) => cambioF(k, x.target.value)} /></div>))}
          <Interruptor dato="visitaAutoVenta" marcado={!!f.visitaAutoVenta} onChange={(v) => cambioF("visitaAutoVenta", v)}>Registrar una visita automática en cada venta</Interruptor>
        </div>
        {guardarBtn}</>}
      {sec === "menu" && rol === "admin" && <>{avisoLic}
        <div className="tarj">
          <b>Módulos que usa tu empresa</b>
          <div className="sub" style={{ marginBottom: 8 }}>Los que apagues desaparecen del portal para todos.</div>
          {Object.entries(MODULOS_OPCIONALES).map(([m, t]) => <Interruptor key={m} dato={"mod-" + m} marcado={!modoApagado(m)} onChange={() => alternarModulo(m)}>{t}</Interruptor>)}
        </div>
        <div className="tarj">
          <b>Qué pantallas ve cada rol</b>
          <div className="sub" style={{ marginBottom: 8 }}>Aquí decides qué se ve. Lo que cada rol puede crear o modificar lo define su rol.</div>
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th></th>{["vendedor", "bodeguero", "conductor", "caja", "cartera", "facturacion"].map((r) => <th key={r} style={{ textAlign: "center" }}>{ROLES[r]}</th>)}</tr></thead>
              <tbody>{Object.entries(VISTAS_POR_ROL).map(([v, t]) => (
                <tr key={v}><td>{t}</td>{["vendedor", "bodeguero", "conductor", "caja", "cartera", "facturacion"].map((r) => (
                  <td key={r} style={{ textAlign: "center" }}><input type="checkbox" data-rv={r + ":" + v} style={{ width: 22, height: 22, margin: 0 }} checked={veRol(r, v)} onChange={(x) => ponerVistaRol(r, v, x.target.checked)} /></td>))}</tr>))}</tbody></table>
          </div>
        </div>
        {guardarBtn}</>}
      {sec === "manual" && <ManualApp />}
      {sec === "acerca" && <AcercaDe sesion={sesion} />}
      {sec === "empresa" && <MiEmpresa sesion={sesion} avisar={avisar} sinTitulo />}
    </>);
}

function MiEmpresa({ sesion, avisar, sinTitulo }) {
  const emp = sesion.empresa;
  const datosE = usarEstado();
  const lic = licencia(emp);
  const [f, setF] = useState({ nombre: emp.nombre, nit: emp.nit || "" });
  const [n, setN] = useState(null);
  useEffect(() => { usuarios.listar(emp.id).then((l) => setN(l.filter((u) => u.activo !== false).length)).catch(() => {}); }, []);
  const [conf, setConf] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const reiniciar = async () => {
    setOcupado(true);
    try { await reiniciarEmpresa(); avisar("Datos reiniciados"); setConf(null); } catch (e) { avisar(errorTexto(e), true); }
    setOcupado(false);
  };
  const guardar = async () => {
    try { await empresas.actualizar(emp.id, { nombre: f.nombre.trim(), nit: f.nit.trim() }); await refrescarSesion(); avisar("Guardado"); } catch (e) { avisar(errorTexto(e), true); }
  };
  return (
    <>
      {!sinTitulo && <h1>Mi empresa</h1>}
      <div className="tarj">
        <label>Nombre</label><input data-emp="nombre" value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} />
        <label>NIT</label><input data-emp="nit" value={f.nit} onChange={(x) => setF({ ...f, nit: x.target.value })} />
        <button className="p g" data-guardar-empresa onClick={guardar}>Guardar</button>
      </div>
      <div className="tarj">
        <div className="fila"><span>Plan</span><b data-plan style={{ display: "flex", alignItems: "center", gap: 8 }}>{["basico", "profesional", "empresarial"].includes(emp.plan) && <img src={`/iconos/planes/${emp.plan}_azul.png`} alt="" width="26" height="26" />}{S.NOMBRE_PLAN[emp.plan] || emp.plan}</b></div>
        {(S.INCLUYE_PLAN[emp.plan] || []).length > 0 && <ul data-incluye-plan className="sub" style={{ margin: "4px 0 8px 18px", padding: 0 }}>{S.INCLUYE_PLAN[emp.plan].map((t) => <li key={t}>{t}</li>)}</ul>}
        <div className="fila"><span>Vence</span><b>{fechaCorta(emp.vence)}</b></div>
        <div className="fila"><span>Estado</span><Chip nivel={lic.vigente ? "ok" : "sin"}>{lic.vigente ? `Vigente (${lic.dias} días)` : lic.motivo}</Chip></div>
        <div className="fila"><span>Usuarios</span><b>{n ?? "…"} de {emp.maxUsuarios}</b></div>
      </div>
      {(emp.pagos || []).length > 0 && (
        <div className="tarj" data-mis-pagos>
          <b>Mis pagos</b>
          {(emp.pagos || []).slice(-6).reverse().map((p) => <div className="fila sub" key={p.id}><span>{fechaCorta(p.fecha)} · {p.meses} {p.meses === 1 ? "mes" : "meses"} · {p.medio}</span><b>{plata(p.valor)}</b></div>)}
        </div>)}
      <div className="tarj" data-copia-datos>
        <b>Copia de tus datos</b>
        <p className="sub">Descarga en un Excel todo lo de tu empresa: productos, lotes, clientes, pedidos, cobros, compras, movimientos de stock, gastos y visitas. Sirve como respaldo o para trabajarlo en otro programa.</p>
        <button className="p g" data-descargar-copia onClick={() => { descargar(crearXlsx(D.copiaDatos(datosE)), `copia-datos-${(emp.nombre || "empresa").replace(/[^\wÁ-ú]+/g, "-")}-${D.hoyISO()}.xlsx`); avisar("Copia descargada"); }}>Descargar copia en Excel</button>
      </div>
      <div className="tarj" data-zona-cuidado>
        <b style={{ color: "var(--mal)" }}>Zona de cuidado</b>
        <p className="sub">Reiniciar borra todos los productos, clientes, proveedores, pedidos, compras, cobros, rutas y movimientos de stock, en todos los equipos. Los usuarios y la licencia no se tocan. No se puede deshacer.</p>
        {conf === null ? <button className="s g" data-reiniciar onClick={() => setConf("")}>Reiniciar datos de la empresa…</button> : (
          <>
            <label>Escribe REINICIAR para confirmar</label>
            <input data-confirmar-texto value={conf} onChange={(x) => setConf(x.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="s" style={{ flex: 1 }} onClick={() => setConf(null)}>Cancelar</button>
              <button className="p" style={{ flex: 1, background: "var(--mal)" }} data-confirmar-reinicio disabled={conf.trim().toUpperCase() !== "REINICIAR" || ocupado} onClick={reiniciar}>{ocupado ? "Borrando…" : "Borrar todo"}</button>
            </div>
          </>)}
      </div>
    </>);
}

function Plataforma({ avisar, sesion }) {
  const [lista, setLista] = useState([]);
  const [eliminar, setEliminar] = useState(null);   // { id, texto, ocupado }
  const [filtro, setFiltro] = useState("todas");
  const [pagando, setPagando] = useState(null);   // { id, valor, meses, medio, referencia, plan }
  const [link, setLinkEstado] = useState(() => { try { return localStorage.getItem("tat_link_pago") || ""; } catch { return ""; } });
  const setLink = (v) => { setLinkEstado(v); try { localStorage.setItem("tat_link_pago", v); } catch {} };
  const cargar = () => empresas.listar().then(setLista).catch((e) => avisar(errorTexto(e), true));
  useEffect(() => { cargar(); }, []);
  const cambiar = async (emp, datos, msg = "Actualizado") => { try { await empresas.actualizar(emp.id, datos); avisar(msg); cargar(); return true; } catch (e) { avisar(errorTexto(e), true); return false; } };
  const extender = (emp, dias) => {
    const base = Math.max(Date.now(), new Date(emp.vence).getTime());
    return cambiar(emp, { vence: new Date(base + dias * 864e5).toISOString() });
  };
  const abrirPago = (emp) => setPagando({ id: emp.id, valor: String(emp.valorMes || ""), meses: 1, medio: S.MEDIOS_PAGO[0], referencia: "", plan: emp.plan === "prueba" ? "basico" : emp.plan });
  const confirmarPago = async () => {
    const emp = lista.find((x) => x.id === pagando.id);
    let datos; try { datos = S.datosPago(emp, pagando); } catch (e) { return avisar(e.message, true); }
    if (await cambiar(emp, datos, "Pago registrado y licencia renovada")) setPagando(null);
  };
  const recordar = (emp) => {
    const tel = String(emp.telefono || "").replace(/\D/g, "");
    if (!tel) return avisar("Escribe primero el WhatsApp de la empresa", true);
    window.open(D.urlWhatsApp(tel, S.mensajeCobro(emp, { link })), "_blank");
  };
  const res = S.resumenSuscripciones(lista);
  const FILTROS = [["todas", "Todas"], ["por_vencer", `Por vencer (${res.porVencer})`], ["vencida", `Vencidas (${res.vencidas})`], ["prueba", `Prueba (${res.prueba})`]];
  const vista = S.ordenarPorVencimiento(lista).filter((emp) => filtro === "todas" || S.estadoSuscripcion(emp).clave === filtro);
  const NIVEL = { al_dia: "ok", por_vencer: "poco", vencida: "sin", suspendida: "sin", prueba: "neu" };
  return (
    <>
      <h1>Plataforma</h1>
      <p className="sub">Empresas inscritas ({lista.length}). Aquí cobras, renuevas y vigilas las licencias.</p>
      <div className="rej" data-susc-resumen>
        <div className="tarj kpi"><small>Ingresos de este mes</small><b data-ingreso-mes>{plata(res.ingresoMes)}</b></div>
        <div className="tarj kpi"><small>Cobro mensual (clientes al día)</small><b>{plata(res.mensual)}</b><small>{res.alDia + res.porVencer} empresas</small></div>
      </div>
      <div className="tarj">
        <label>Tu enlace o datos de pago (se incluye en el recordatorio por WhatsApp)</label>
        <input data-link-pago placeholder="Ej: https://checkout.wompi.co/l/xxxx o «Nequi 300 123 4567»" value={link} onChange={(x) => setLink(x.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {FILTROS.map(([k, t]) => <button key={k} data-filtro-susc={k} className={filtro === k ? "p" : "s"} onClick={() => setFiltro(k)}>{t}</button>)}
      </div>
      {!vista.length && <div className="vacio">No hay empresas en esta lista.</div>}
      {vista.map((emp) => {
        const l = licencia(emp), es = S.estadoSuscripcion(emp);
        return (
          <div className="tarj" key={emp.id} data-empresa-fila={emp.nombre}>
            <div className="fila"><b>{emp.nombre}</b><Chip nivel={NIVEL[es.clave]}>{es.texto}</Chip></div>
            <div className="sub">NIT {emp.nit || "—"} · vence {fechaCorta(emp.vence)} · hasta {emp.maxUsuarios} usuarios{emp.valorMes ? ` · ${plata(emp.valorMes)}/mes` : ""}</div>
            <div className="fila">
              <select style={{ margin: 0 }} value={emp.plan} onChange={(x) => cambiar(emp, { plan: x.target.value, maxUsuarios: S.PLANES[x.target.value] })}>
                {Object.keys(S.PLANES).map((p) => <option key={p} value={p}>{S.NOMBRE_PLAN[p] || p}</option>)}</select>
              <button className="p" data-registrar-pago onClick={() => abrirPago(emp)}>Registrar pago</button>
            </div>
            {pagando?.id === emp.id && (
              <div className="tarj" data-form-pago style={{ marginTop: 8 }}>
                <label>Valor pagado ($)</label><input data-pago="valor" inputMode="numeric" value={pagando.valor} onChange={(x) => setPagando({ ...pagando, valor: x.target.value.replace(/\D/g, "") })} />
                <div className="rej"><div><label>Meses que cubre</label><select data-pago="meses" value={pagando.meses} onChange={(x) => setPagando({ ...pagando, meses: +x.target.value })}>{[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div><label>Plan</label><select data-pago="plan" value={pagando.plan} onChange={(x) => setPagando({ ...pagando, plan: x.target.value })}>{Object.keys(S.PLANES).filter((p) => p !== "prueba").map((p) => <option key={p} value={p}>{S.NOMBRE_PLAN[p] || p}</option>)}</select></div></div>
                <label>Forma de pago</label><select data-pago="medio" value={pagando.medio} onChange={(x) => setPagando({ ...pagando, medio: x.target.value })}>{S.MEDIOS_PAGO.map((m) => <option key={m}>{m}</option>)}</select>
                <label>Referencia del comprobante (opcional)</label><input data-pago="referencia" value={pagando.referencia} onChange={(x) => setPagando({ ...pagando, referencia: x.target.value })} />
                <div className="sub">Se renueva hasta: {(() => { try { return fechaCorta(S.datosPago(emp, pagando).vence); } catch { return "—"; } })()}</div>
                <div className="fila"><button className="s" onClick={() => setPagando(null)}>Cancelar</button><button className="p" data-confirmar-pago onClick={confirmarPago}>Confirmar pago</button></div>
              </div>)}
            <div className="fila">
              <input style={{ margin: 0 }} data-tel-emp placeholder="WhatsApp de la empresa" inputMode="tel" defaultValue={emp.telefono || ""} onBlur={(x) => { if (x.target.value !== (emp.telefono || "")) cambiar(emp, { telefono: x.target.value.trim() }, "WhatsApp guardado"); }} />
              <button className="s" data-recordar onClick={() => recordar(emp)}>Recordar pago</button>
            </div>
            {(emp.pagos || []).length > 0 && <div className="sub" data-pagos-emp>Últimos pagos: {(emp.pagos || []).slice(-3).reverse().map((p) => `${fechaCorta(p.fecha)} · ${plata(p.valor)} · ${p.meses} ${p.meses === 1 ? "mes" : "meses"} (${p.medio})`).join(" | ")}</div>}
            <div className="fila">
              <button className="s" data-mas30 onClick={() => extender(emp, 30)}>+30 días (cortesía)</button>
              <button className="s" data-suspender onClick={() => cambiar(emp, { activa: emp.activa === false })}>{emp.activa === false ? "Activar" : "Suspender"}</button>
            </div>
            {emp.id !== sesion?.empresa?.id && (eliminar?.id !== emp.id
              ? <button className="s g" data-eliminar-empresa style={{ color: "var(--mal)" }} onClick={() => setEliminar({ id: emp.id, texto: "", ocupado: false })}>Eliminar empresa…</button>
              : (
                <div className="tarj" data-form-eliminar style={{ marginTop: 8, borderColor: "var(--mal)" }}>
                  <b style={{ color: "var(--mal)" }}>Eliminar «{emp.nombre}»</b>
                  <p className="sub">Se borran para siempre todos sus datos (productos, clientes, pedidos, stock, cobros…), sus usuarios y la empresa. No se puede deshacer, y no puedes bajar su copia después. Los correos de acceso siguen registrados en Firebase (Authentication) hasta que los quites a mano.</p>
                  <label>Escribe el nombre exacto de la empresa para confirmar</label>
                  <input data-confirmar-nombre value={eliminar.texto} onChange={(x) => setEliminar({ ...eliminar, texto: x.target.value })} />
                  <div className="fila">
                    <button className="s" disabled={eliminar.ocupado} onClick={() => setEliminar(null)}>Cancelar</button>
                    <button className="p" style={{ background: "var(--mal)" }} data-confirmar-eliminar disabled={eliminar.ocupado || eliminar.texto.trim() !== String(emp.nombre).trim()}
                      onClick={async () => { setEliminar({ ...eliminar, ocupado: true }); try { const n = await eliminarEmpresaCompleta(emp.id); avisar(`Empresa eliminada (${n} usuarios)`); setEliminar(null); cargar(); } catch (e) { avisar(errorTexto(e), true); setEliminar({ ...eliminar, ocupado: false }); } }}>{eliminar.ocupado ? "Eliminando…" : "Eliminar para siempre"}</button>
                  </div>
                </div>))}
          </div>);
      })}
    </>);
}

function TelAviso({ e, nombre, avisar }) {
  const actual = (D.configEmpresa(e).telVendedores || {})[nombre] || "";
  const [v, setV] = useState(actual);
  useEffect(() => setV(actual), [actual]);
  const guardar = () => { if (v.replace(/\D/g, "") === actual.replace(/\D/g, "")) return; const r = accion((s) => D.ponerTelVendedor(s, nombre, v)); avisar(r.ok ? (v.trim() ? "Celular de avisos guardado" : "Avisos desactivados para esta persona") : r.error, !r.ok); };
  return <input data-tel-aviso={nombre} inputMode="tel" placeholder="Celular para avisos (opcional)" value={v} onChange={(x) => setV(x.target.value)} onBlur={guardar} style={{ margin: "6px 0" }} />;
}

function Usuarios({ sesion, avisar, e }) {
  const emp = sesion.empresa;
  const vacio = { nombre: "", email: "", clave: "", rol: "vendedor", codigo: "" };
  const [lista, setLista] = useState([]);
  const [f, setF] = useState(null);
  const cargar = () => usuarios.listar(emp.id).then(setLista).catch((e) => avisar(errorTexto(e), true));
  useEffect(() => { cargar(); }, []);
  const activos = lista.filter((u) => u.activo !== false).length;
  const crear = async () => {
    if (!f.nombre.trim() || !f.email.trim() || f.clave.length < 6) return avisar("Completa nombre, correo y una clave de 6 o más caracteres", true);
    if (activos >= emp.maxUsuarios) return avisar(`Tu plan permite ${emp.maxUsuarios} usuarios`, true);
    try { await usuarios.crear({ ...f, empresaId: emp.id }); avisar("Usuario creado"); setF(null); cargar(); } catch (e) { avisar(errorTexto(e), true); }
  };
  const alternar = async (u) => {
    if (u.activo === false && activos >= emp.maxUsuarios) return avisar(`Tu plan permite ${emp.maxUsuarios} usuarios`, true);
    try {
      await usuarios.actualizar(u.uid, { activo: u.activo === false });
      if (u.activo !== false) accion((s) => D.ponerTelVendedor(s, u.nombre, ""));   // al desactivar, se borra su celular de avisos
      cargar();
    } catch (e) { avisar(errorTexto(e), true); }
  };
  // Cambiar nombre o correo: solo el administrador
  const [ed, setEd] = useState(null);   // { uid, modo, valor, clave, msg, ok, ocupado }
  const ponerEd = (c) => setEd((x) => (x ? { ...x, ...c } : x));
  const guardarNombre = async (u) => {
    const nuevo = (ed.valor || "").trim();
    if (nuevo.length < 3) return ponerEd({ msg: "Escribe el nombre completo." });
    if (nuevo === u.nombre) return setEd(null);
    if (!window.confirm(`Lo que ${u.nombre} ya hizo (pedidos, visitas, cobros, gastos) queda con el nombre anterior y él/ella dejará de verlo como suyo. Úsalo para corregir un nombre mal escrito o para personas que no venden ni reparten. ¿Cambiar el nombre a «${nuevo}»?`)) return;
    ponerEd({ ocupado: true, msg: "" });
    try {
      const tel = (D.configEmpresa(e).telVendedores || {})[u.nombre] || "";
      await usuarios.actualizar(u.uid, { nombre: nuevo });
      if (tel) accion((s) => { D.ponerTelVendedor(s, u.nombre, ""); D.ponerTelVendedor(s, nuevo, tel); });   // su celular de avisos se va con el nombre
      setEd(null); avisar("Nombre cambiado"); cargar();
    } catch (er) { ponerEd({ ocupado: false, msg: errorTexto(er) }); }
  };
  const cambiarCorreo = async (u) => {
    const nuevo = (ed.valor || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nuevo)) return ponerEd({ msg: "El correo no es válido." });
    if (nuevo === String(u.email || "").toLowerCase()) return ponerEd({ msg: "Ese ya es el correo actual." });
    if ((ed.clave || "").length < 6) return ponerEd({ msg: "La clave temporal debe tener mínimo 6 caracteres." });
    if (sesion.user && sesion.user.uid === u.uid) return ponerEd({ msg: "No puedes cambiar tu propio correo. Pídele a otra persona administradora que lo haga." });
    if (!window.confirm(`Se crea el acceso con ${nuevo} y el correo ${u.email} deja de funcionar. ¿Continuar?`)) return;
    ponerEd({ ocupado: true, msg: "" });
    try { await usuarios.cambiarCorreo(u, nuevo, ed.clave); ponerEd({ ocupado: false, ok: true, msg: `Listo. ${u.nombre} entra con ${nuevo} y la clave temporal. Luego puede cambiarla en «Mi cuenta».` }); }
    catch (er) { ponerEd({ ocupado: false, msg: errorTexto(er) }); }
  };
  const cambiarRol = async (u, rol) => { try { await usuarios.actualizar(u.uid, { rol }); cargar(); } catch (e) { avisar(errorTexto(e), true); } };
  if (f) return (
    <>
      <button className="s" onClick={() => setF(null)}>← Volver</button>
      <h1 style={{ marginTop: 12 }}>Nuevo usuario</h1>
      <label>Nombre</label><input data-u="nombre" value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} />
      <label>Correo</label><input data-u="email" type="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} />
      <label>Clave inicial (mínimo 6)</label><input data-u="clave" value={f.clave} onChange={(x) => setF({ ...f, clave: x.target.value })} />
      <label>Rol</label>
      <select data-u="rol" value={f.rol} onChange={(x) => setF({ ...f, rol: x.target.value })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label>Letra para numerar sus pedidos (ej. L)</label><input data-u="codigo" maxLength={3} value={f.codigo} onChange={(x) => setF({ ...f, codigo: x.target.value })} />
      <button className="p g" data-crear-usuario onClick={crear}>Crear usuario</button>
    </>);
  return (
    <>
      <div className="fila"><h1>Usuarios</h1><button className="p" data-nuevo-usuario onClick={() => setF({ ...vacio })}>+ Nuevo</button></div>
      <p className="sub" data-cupo>{activos} de {emp.maxUsuarios} usuarios del plan</p>
      {lista.map((u) => (
        <div className="tarj" key={u.uid} data-usuario={u.email}>
          <div className="fila"><b>{u.nombre}</b><Chip nivel={u.activo === false ? "sin" : "ok"}>{u.activo === false ? "Desactivado" : "Activo"}</Chip></div>
          <div className="sub">{u.email}{u.codigo ? " · letra " + u.codigo : ""}</div>
          {u.activo !== false && <TelAviso e={e} nombre={u.nombre} avisar={avisar} />}
          <div style={{ display: "flex", gap: 14, margin: "4px 0 8px" }}>
            <button className="s" data-cambiar-nombre style={{ padding: "4px 10px" }} onClick={() => setEd({ uid: u.uid, modo: "nombre", valor: u.nombre || "", clave: "", msg: "", ok: false, ocupado: false })}>Cambiar nombre</button>
            <button className="s" data-cambiar-correo style={{ padding: "4px 10px" }} onClick={() => setEd({ uid: u.uid, modo: "correo", valor: "", clave: "", msg: "", ok: false, ocupado: false })}>Cambiar correo</button>
          </div>
          {ed && ed.uid === u.uid && (
            <div data-edicion className="tarj" style={{ background: "var(--bg)" }}>
              <label>{ed.modo === "nombre" ? "Nombre completo" : "Correo nuevo"}</label>
              <input data-ed-valor type={ed.modo === "correo" ? "email" : "text"} value={ed.valor} onChange={(x) => ponerEd({ valor: x.target.value })} />
              {ed.modo === "correo" && <><label>Clave temporal (mínimo 6)</label><input data-ed-clave value={ed.clave} onChange={(x) => ponerEd({ clave: x.target.value })} autoComplete="off" /><div className="sub">Se crea el acceso con el correo nuevo y se le pasa todo lo de la persona. El correo anterior deja de funcionar. Entrégale la clave temporal.</div></>}
              {ed.msg && <div data-ed-msg className="sub" style={{ color: ed.ok ? "var(--ok)" : "var(--mal)", marginTop: 6 }}>{ed.msg}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="s" onClick={() => { const hecho = ed.ok; setEd(null); if (hecho) cargar(); }}>{ed.ok ? "Cerrar" : "Cancelar"}</button>
                {!ed.ok && <button className="p" data-ed-guardar disabled={ed.ocupado} onClick={() => (ed.modo === "nombre" ? guardarNombre(u) : cambiarCorreo(u))}>{ed.ocupado ? "Guardando…" : "Guardar"}</button>}
              </div>
            </div>)}
          <div className="fila">
            <select style={{ margin: 0, width: "auto" }} value={u.rol} onChange={(x) => cambiarRol(u, x.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="s" onClick={() => alternar(u)}>{u.activo === false ? "Activar" : "Desactivar"}</button>
          </div>
        </div>))}
    </>);
}

function MiCuenta({ sesion, avisar }) {
  const [f, setF] = useState({ actual: "", nueva: "" });
  const guardar = async () => {
    if (f.nueva.length < 6) return avisar("La clave nueva debe tener mínimo 6 caracteres", true);
    try { await cuenta.cambiarClave(f.actual, f.nueva); setF({ actual: "", nueva: "" }); avisar("Clave cambiada"); } catch (e) { avisar(errorTexto(e), true); }
  };
  return (
    <>
      <h1>Mi cuenta</h1>
      <div className="tarj"><b>{sesion.perfil.nombre}</b><div className="sub">{sesion.user.email} · {ROLES[sesion.perfil.rol]}{sesion.perfil.codigo ? " · letra " + sesion.perfil.codigo : ""}</div></div>
      <div className="tarj">
        <b>Cambiar mi clave</b>
        <label>Clave actual</label><input data-c="actual" type="password" value={f.actual} onChange={(x) => setF({ ...f, actual: x.target.value })} />
        <label>Clave nueva</label><input data-c="nueva" type="password" value={f.nueva} onChange={(x) => setF({ ...f, nueva: x.target.value })} />
        <button className="p g" data-cambiar-clave onClick={guardar}>Cambiar clave</button>
      </div>
      <div className="tarj" data-soporte><b>Soporte</b><div className="sub">¿Dudas o problemas con la aplicación? Escríbenos y te ayudamos.</div><a className="s g" href="mailto:tatconecta@gmail.com?subject=Soporte%20TAT%20Conecta" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}>tatconecta@gmail.com</a></div>
      <div className="tarj"><button className="s g" data-salir onClick={salir}>Cerrar sesión</button></div>
      {sesion.esDueno && <TraspasarPlataforma sesion={sesion} />}
      <EliminarCuenta sesion={sesion} avisar={avisar} />
    </>);
}

// Eliminar la propia cuenta: hay que escribir ELIMINAR y la clave. Es inmediato y no se puede deshacer.
function TraspasarPlataforma({ sesion }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]); const [dest, setDest] = useState("");
  const [txt, setTxt] = useState(""); const [clave, setClave] = useState("");
  const [err, setErr] = useState(""); const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (abierto) usuarios.listar(sesion.perfil.empresaId).then((l) => setLista(l.filter((u) => u.rol === "admin" && u.activo !== false && u.uid !== sesion.user.uid))).catch((e) => setErr(errorTexto(e))); }, [abierto]);
  const listo = dest && txt.trim().toUpperCase() === "TRASPASAR" && clave.length > 0 && !ocupado;
  const hacer = async () => { setOcupado(true); setErr(""); try { await cuenta.traspasarPlataforma(clave, sesion.perfil, dest); } catch (e) { setErr(errorTexto(e)); setOcupado(false); } };
  if (!abierto) return <div className="tarj"><button className="s g" data-traspasar onClick={() => setAbierto(true)}>Traspasar la plataforma a otro acceso</button></div>;
  return (
    <div className="tarj" data-traspasar-panel>
      <b>Traspasar la plataforma</b>
      <p className="sub">Pasas el control (planes, vencimientos, empresas) a otra persona administradora de tu empresa. Tu acceso queda como usuario normal y se cierra tu sesión. Primero crea ese administrador en Usuarios.</p>
      <label>Nueva dueña de la plataforma</label>
      <select data-traspasar-dest value={dest} onChange={(x) => setDest(x.target.value)}><option value="">Elige…</option>{lista.map((u) => <option key={u.uid} value={u.uid}>{u.nombre} · {u.email}</option>)}</select>
      {!lista.length && <div className="sub">No hay otro administrador activo. Créalo primero en Usuarios.</div>}
      <label>Escribe TRASPASAR para confirmar</label><input data-traspasar-texto value={txt} onChange={(x) => setTxt(x.target.value)} autoComplete="off" />
      <label>Tu clave</label><input data-traspasar-clave type="password" value={clave} onChange={(x) => setClave(x.target.value)} autoComplete="current-password" />
      {err && <div data-traspasar-error className="sub" style={{ color: "var(--mal)", marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="s g" onClick={() => { setAbierto(false); setTxt(""); setClave(""); setErr(""); }}>Cancelar</button>
        <button className="p g" data-traspasar-confirmar disabled={!listo} onClick={hacer}>{ocupado ? "Traspasando…" : "Traspasar"}</button>
      </div>
    </div>);
}
function EliminarCuenta({ sesion, avisar }) {
  const [abierto, setAbierto] = useState(false);
  const [txt, setTxt] = useState(""); const [clave, setClave] = useState("");
  const [err, setErr] = useState(""); const [ocupado, setOcupado] = useState(false);
  const listo = txt.trim().toUpperCase() === "ELIMINAR" && clave.length > 0 && !ocupado;
  const eliminar = async () => {
    setOcupado(true); setErr("");
    try { await cuenta.eliminarMiCuenta(clave, sesion.perfil, sesion.esDueno); }
    catch (e) { setErr(errorTexto(e)); setOcupado(false); }
  };
  if (!abierto) return <div className="tarj"><button className="s g" data-eliminar-cuenta onClick={() => setAbierto(true)} style={{ color: "var(--mal)", borderColor: "var(--mal)" }}>Eliminar mi cuenta</button></div>;
  return (
    <div className="tarj" data-eliminar-panel style={{ borderColor: "var(--mal)" }}>
      <b style={{ color: "var(--mal)" }}>Eliminar mi cuenta</b>
      <p className="sub">Se borra tu usuario de inmediato y <b>no se puede deshacer</b>. Lo que hiciste en la empresa (pedidos, visitas, cobros, gastos) se conserva a nombre de «Usuario eliminado». Si luego quieres volver, el administrador debe crearte un usuario nuevo.</p>
      <label>Escribe ELIMINAR para confirmar</label><input data-eliminar-texto value={txt} onChange={(x) => setTxt(x.target.value)} autoComplete="off" />
      <label>Tu clave</label><input data-eliminar-clave type="password" value={clave} onChange={(x) => setClave(x.target.value)} autoComplete="current-password" />
      {err && <div data-eliminar-error className="sub" style={{ color: "var(--mal)", marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="s g" onClick={() => { setAbierto(false); setTxt(""); setClave(""); setErr(""); }}>Cancelar</button>
        <button className="p g" data-eliminar-confirmar disabled={!listo} onClick={eliminar} style={{ background: listo ? "var(--mal)" : undefined }}>{ocupado ? "Eliminando…" : "Eliminar para siempre"}</button>
      </div>
    </div>);
}

function Login({ sesion }) {
  const [modo, setModo] = useState("entrar");   // entrar | empresa | olvide
  const [f, setF] = useState({ empresa: "", nit: "", nombre: "", email: "", clave: "" });
  const [msg, setMsg] = useState(""); const [ok, setOk] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const primera = !sesion.hayDueno;
  const m = primera ? "dueno" : modo;
  const set = (k) => (x) => setF({ ...f, [k]: x.target.value });
  const enviar = async (ev) => {
    ev.preventDefault(); setMsg(""); setOk(""); setOcupado(true);
    try {
      if (m === "dueno") await crearDueno(f);
      else if (m === "empresa") await crearEmpresa(f);
      else if (m === "olvide") { await cuenta.olvideClave(f.email); setOk("Si el correo está registrado, te enviamos un enlace para crear una clave nueva."); }
      else await entrar(f.email, f.clave);
    } catch (e) { setMsg(errorTexto(e)); }
    setOcupado(false);
  };
  const titulo = { dueno: "Configurar la plataforma", empresa: "Registrar mi empresa", olvide: "Recuperar mi clave", entrar: "Iniciar sesión" }[m];
  return (
    <div className="app" style={{ paddingTop: 36 }}>
      <img src="iconos/logo.png" alt="TAT Conecta" data-logo style={{ width: 130, height: 130, display: "block", margin: "0 auto 4px" }} />
      <div className="sub" data-licencia-app style={{ textAlign: "center", fontSize: 11, margin: "0 0 14px" }}>{APP.licencia}</div>
      <h1>{titulo}</h1>
      {m === "dueno" && <p className="sub">Eres la primera persona en entrar: tú serás la dueña de la plataforma y administrarás las empresas.</p>}
      {m === "empresa" && <p className="sub">15 días de prueba gratis, hasta 3 usuarios.</p>}
      <form className="tarj" onSubmit={enviar}>
        {(m === "dueno" || m === "empresa") && <>
          <label>Nombre de la empresa</label><input data-l="empresa" value={f.empresa} onChange={set("empresa")} />
          <label>NIT (opcional)</label><input data-l="nit" value={f.nit} onChange={set("nit")} />
          <label>Tu nombre</label><input data-l="nombre" value={f.nombre} onChange={set("nombre")} /></>}
        <label>Correo</label><input data-l="email" type="email" autoComplete="username" value={f.email} onChange={set("email")} />
        {m !== "olvide" && <><label>Clave</label><input data-l="clave" type="password" autoComplete="current-password" value={f.clave} onChange={set("clave")} /></>}
        {msg && <div className="alerta sin" data-error-login>{msg}</div>}
        {ok && <div className="alerta ok" data-ok-login>{ok}</div>}
        <button className="p g" data-entrar disabled={ocupado} style={{ marginTop: 10 }}>{ocupado ? "Un momento…" : { dueno: "Crear y entrar", empresa: "Registrar y entrar", olvide: "Enviar enlace", entrar: "Entrar" }[m]}</button>
      </form>
      {!primera && m === "entrar" && <div className="fila"><button className="s" data-ir-olvide onClick={() => setModo("olvide")}>Olvidé mi clave</button><button className="s" data-ir-empresa onClick={() => setModo("empresa")}>Registrar mi empresa</button></div>}
      {!primera && m !== "entrar" && <button className="s" data-ir-entrar onClick={() => setModo("entrar")}>← Volver a entrar</button>}
    </div>);
}

function Mensaje({ titulo, texto, boton }) {
  return <div className="app" style={{ paddingTop: 60 }}><h1>{titulo}</h1><p className="sub">{texto}</p>{boton && <><button className="s" onClick={() => location.reload()}>Reintentar</button> <button className="s" data-salir onClick={salir}>Cerrar sesión</button></>}</div>;
}

function useEnLinea() {
  const [on, setOn] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);
  return on;
}

const TITULOS = { inicio: "Indicadores", vender: "Ventas", pedidos: "Pedidos", despachos: "Rutas y Despachos", informes: "Informes", visitas: "Visitas", gastos: "Gastos", requisiciones: "Remisiones", facturacion: "Facturación", ofertas: "Ofertas", configuracion: "Configuración", clientes: "Clientes", productos: "Productos", stock: "Inventario", compras: "Compras", proveedores: "Proveedores", cobros: "Cobros", usuarios: "Usuarios", empresa: "Mi empresa", plataforma: "Plataforma", cuenta: "Mi cuenta" };

function Principal({ sesion }) {
  const e = usarEstado();
  usarPrefs();                       // vuelve a dibujar si cambia el formato de números, tema o letra
  const cfg = D.configEmpresa(e);
  usarConfigPermisos(cfg);
  usarPlan(sesion.esDueno ? "" : sesion.empresa.plan);   // la dueña ve todo
  const rol = sesion.perfil.rol;
  const lic = licencia(sesion.empresa);
  const rolAcc = lic.vigente ? rol : "lector";   // licencia vencida: solo consulta
  const enLinea = useEnLinea();
  useEffect(() => {   // ventas viejas entregadas sin pago: se registran como pagadas (solo admin/caja, una vez)
    if ((rol === "admin" || rol === "caja") && lic.vigente && D.repararAutoventasSinPago(e, "", true) > 0) accion((s) => { const n = D.repararAutoventasSinPago(s, sesion.perfil.nombre || ""); if (!n) throw new Error("nada"); });
  }, [e.pedidos.length, e.pagos.length, rol]);
  const prefsIni = usarPrefs();
  const [vista, setVista] = useState(() => (prefsIni.inicio && prefsIni.inicio !== "portal" && puedeVer(rol, prefsIni.inicio) ? prefsIni.inicio : "portal"));
  const [aviso, avisar] = useAviso();
  const permitida = vista === "portal" || (vista === "plataforma" ? sesion.esDueno : puedeVer(rol, vista));
  const v = permitida ? vista : "portal";
  return (
    <RolCtx.Provider value={rolAcc}><EmpresaCtx.Provider value={sesion.empresa.nombre}><UsuarioCtx.Provider value={sesion.perfil.nombre}><CfgCtx.Provider value={cfg}>
      <div className="app">
        {aviso}
        <div className="barra" data-barra>
          {v !== "portal" ? <button className="s" data-portal onClick={() => setVista("portal")}>← Portal</button> : <span data-marca style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 24, color: "var(--tx)" }}><img className="lg-c" src="iconos/logo.png" alt="" style={{ width: 84, height: 84 }} /><img className="lg-o" src="iconos/logo_portal.png" alt="" style={{ width: 84, height: 84 }} />TAT Conecta</span>}
          <b>{v === "portal" ? "" : TITULOS[v]}</b>
          <span data-red className="sub" style={{ color: enLinea ? "var(--ok)" : "var(--poco)" }}>{enLinea ? "● En línea" : "● Sin conexión"}</span>
        </div>
        {/* El portal se queda cargado (oculto) mientras se usa otro módulo, para que las imágenes estén listas al volver */}
        <div data-portal-caja style={v === "portal" ? undefined : { display: "none" }}><Portal sesion={sesion} lic={lic} ir={setVista} e={e} /></div>
        {v === "inicio" && <Inicio e={e} ir={setVista} />}
        {v === "vender" && <Vender e={e} avisar={avisar} ir={setVista} />}
        {v === "pedidos" && <Pedidos e={e} avisar={avisar} />}
        {v === "despachos" && <Despachos e={e} avisar={avisar} empresa={sesion.empresa.nombre} />}
        {v === "ofertas" && <Ofertas e={e} avisar={avisar} empresa={sesion.empresa.nombre} />}
        {v === "visitas" && <Visitas e={e} avisar={avisar} ir={setVista} />}
        {v === "gastos" && <Gastos e={e} avisar={avisar} />}
        {v === "requisiciones" && <Requisiciones e={e} avisar={avisar} empresa={sesion.empresa.nombre} />}
        {v === "facturacion" && <Requisiciones e={e} avisar={avisar} empresa={sesion.empresa.nombre} modo="factura" />}
        {v === "informes" && <Informes e={e} avisar={avisar} empresa={sesion.empresa.nombre} />}
        {v === "stock" && <Stock e={e} avisar={avisar} />}
        {v === "compras" && <Compras e={e} avisar={avisar} />}
        {v === "cobros" && <Cobros e={e} avisar={avisar} />}
        {(v === "productos" || v === "clientes" || v === "proveedores") && <Catalogo key={v} e={e} avisar={avisar} tipo={v} />}
        {v === "usuarios" && <Usuarios sesion={sesion} avisar={avisar} e={e} />}
        {v === "empresa" && <MiEmpresa sesion={sesion} avisar={avisar} />}
        {v === "plataforma" && <Plataforma avisar={avisar} sesion={sesion} />}
        {v === "configuracion" && <Configuracion sesion={sesion} e={e} avisar={avisar} ir={setVista} />}
        {v === "cuenta" && <MiCuenta sesion={sesion} avisar={avisar} />}
      </div>
    </CfgCtx.Provider></UsuarioCtx.Provider></EmpresaCtx.Provider></RolCtx.Provider>
  );
}

function Presentacion() {
  return <div className="splash" data-presentacion><div style={{ textAlign: "center" }}><img src="iconos/logo.png" alt="TAT Conecta" /><div className="giro" role="status" aria-label="Cargando" /><div data-licencia-app style={{ marginTop: 14, fontSize: 11, color: "var(--tx2)" }}>{APP.licencia}</div></div></div>;
}
export default function App() {
  const [intro, setIntro] = useState(() => !navigator.webdriver);   // en las pruebas automáticas no se muestra
  useEffect(() => { if (!intro) return; const t = setTimeout(() => setIntro(false), 2000); return () => clearTimeout(t); }, []);
  return <>{intro && <Presentacion />}<Aplicacion /></>;
}
function Aplicacion() {
  const sesion = usarSesion();
  useEffect(() => { iniciarSesionApp(); }, []);
  if (sesion.fase === "cargando") return <div className="splash fijo" data-cargando><div style={{ textAlign: "center" }}><img src="iconos/logo.png" alt="TAT Conecta" /><div className="giro" role="status" aria-label="Cargando" /><div style={{ marginTop: 12, fontSize: 12, color: "var(--tx2)" }}>Cargando…</div></div></div>;
  if (sesion.fase === "login") return <Login sesion={sesion} />;
  if (sesion.fase === "sinperfil") return <Mensaje titulo="Falta activar tu usuario" texto="Tu cuenta existe pero no está asociada a una empresa. Avísale al administrador." boton />;
  if (sesion.fase === "inactivo") return <Mensaje titulo="Usuario desactivado" texto="Habla con el administrador de tu empresa." boton />;
  return <Principal sesion={sesion} />;
}
