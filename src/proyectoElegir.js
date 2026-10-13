// proyectoElegir.js — «Traer proyecto desde la Ficha Técnica» en cualquier formulario, sin cambiar su pantalla.
// pedirProyectoFicha(alElegir): si hay un solo proyecto lo toma; si hay varios abre una ventana propia para elegir uno; si no hay ninguno lo dice.
// El elegido pasa al primer lugar de la lista «ryr_proyectos_guardados» (los formularios leen el primero), así el resto de su código no cambia.
const NAVY = "#1B2A45", LINE = "#D9DCE1";
const TIPOS = { edificacion: "Edificación / Reformas", vias: "Vías y Carreteras", hidrocarburos: "Hidrocarburos" };
const tipoDe = (d) => { const m = (d && d.modulos) || {}; return m.vias ? TIPOS.vias : m.hidrocarburos ? TIPOS.hidrocarburos : TIPOS.edificacion; };

function leerLista() {
  try { const l = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]"); return Array.isArray(l) ? l.filter((p) => p && p.nombreId && p.datos) : []; } catch (e) { return []; }
}
export function ponerPrimero(nombreId) {
  try {
    const todos = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
    const i = todos.findIndex((p) => p && p.nombreId === nombreId);
    if (i > 0) { const [p] = todos.splice(i, 1); p.actualizado = Date.now(); todos.unshift(p); localStorage.setItem("ryr_proyectos_guardados", JSON.stringify(todos)); }
  } catch (e) { /* sin memoria */ }
}

function ventana(titulo, cuerpoFn) {
  const fondo = document.createElement("div");
  fondo.setAttribute("data-modal-proyectos", ""); fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true");
  fondo.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'IBM Plex Sans',system-ui,sans-serif";
  const caja = document.createElement("div");
  caja.style.cssText = "background:#fff;border-radius:12px;padding:16px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;text-align:left";
  const t = document.createElement("div"); t.textContent = titulo; t.style.cssText = `font-size:14px;font-weight:700;margin-bottom:8px;color:${NAVY}`;
  caja.appendChild(t); cuerpoFn(caja, () => fondo.remove()); fondo.appendChild(caja);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) fondo.remove(); });
  document.body.appendChild(fondo);
}

export function pedirProyectoFicha(alElegir) {
  const lista = leerLista();
  const elegir = (p) => { ponerPrimero(p.nombreId); try { alElegir(p); } catch (e) { /* el formulario decide qué hacer */ } };
  if (lista.length === 1) { elegir(lista[0]); return; }
  ventana(lista.length ? "Elige el proyecto" : "Todavía no hay proyectos", (caja, cerrar) => {
    if (!lista.length) {
      const m = document.createElement("div"); m.style.cssText = "font-size:12px;color:#6B7280;margin-bottom:12px";
      m.textContent = "Los proyectos se crean solos al llenar la Ficha Técnica (Gestión Técnica → Ficha Técnica → Proyecto Nuevo). También llegan de los otros equipos cuando hay internet.";
      caja.appendChild(m);
    }
    lista.forEach((p) => {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("data-proyecto-opcion", "");
      b.style.cssText = `display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;border-radius:8px;border:1px solid ${LINE};background:#fff;cursor:pointer`;
      const n = document.createElement("div"); n.textContent = p.datos.proyecto || p.nombreId; n.style.cssText = `font-size:12.5px;font-weight:600;color:${NAVY}`;
      const d = document.createElement("div"); d.textContent = `${tipoDe(p.datos)}${p.datos.noContrato ? " · Contrato " + p.datos.noContrato : ""}${p.datos.ubicacion ? " · " + p.datos.ubicacion : ""}`; d.style.cssText = "font-size:10.5px;color:#6B7280";
      b.appendChild(n); b.appendChild(d); b.addEventListener("click", () => { cerrar(); elegir(p); }); caja.appendChild(b);
    });
    const c = document.createElement("button"); c.type = "button"; c.textContent = lista.length ? "Cancelar" : "Entendido";
    c.style.cssText = `width:100%;padding:8px;border-radius:8px;border:1px solid ${LINE};background:#fff;color:${NAVY};font-size:13px;cursor:pointer`;
    c.addEventListener("click", cerrar); caja.appendChild(c);
  });
}
