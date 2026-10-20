// Formato de números de la persona (separador de miles y de decimales, símbolo, decimales de importes) y fórmulas en los campos numéricos.
// Se guarda en este equipo. Afecta lo que se ve en pantalla; en los Excel el número va crudo y se ve según la configuración regional del computador.
const CLAVE = "ryr_formato_num";
export const FORMATO_DEFECTO = { miles: ".", decimal: ",", simbolo: "$", decImporte: 2, formulas: true };
let cache = null;
export function leerFormato() {
  if (cache) return cache;
  let g = {};
  try { g = JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch (e) { g = {}; }
  const f = { ...FORMATO_DEFECTO, ...g };
  if (![".", ",", " ", ""].includes(f.miles)) f.miles = ".";
  if (![",", "."].includes(f.decimal)) f.decimal = ",";
  if (f.miles === f.decimal) f.miles = f.decimal === "," ? "." : ",";
  f.decImporte = [0, 1, 2, 3].includes(Number(f.decImporte)) ? Number(f.decImporte) : 2;
  f.simbolo = String(f.simbolo ?? "$").slice(0, 4);
  f.formulas = f.formulas !== false;
  cache = f; return f;
}
export function guardarFormato(cambios) {
  const f = { ...leerFormato(), ...cambios };
  if (f.miles === f.decimal && "decimal" in cambios) f.miles = f.decimal === "," ? "." : ",";
  else if (f.miles === f.decimal) f.decimal = f.miles === "." ? "," : ".";
  cache = null;
  try { localStorage.setItem(CLAVE, JSON.stringify(f)); } catch (e) { /* sin memoria: queda para esta sesión */ cache = f; }
  return leerFormato();
}

// 1234567.891 -> "1.234.567,89" según las preferencias (min/max = decimales mínimos y máximos)
export function formatNum(n, min = 0, max = 3) {
  const f = leerFormato(); const v = Number(n);
  if (!Number.isFinite(v)) return "";
  const t = Math.abs(v).toFixed(max);
  let [ent, dec = ""] = t.split(".");
  while (dec.length > min && dec.endsWith("0")) dec = dec.slice(0, -1);
  ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, "\u0001");
  const signo = v < 0 && Number(t) !== 0 ? "-" : "";
  return signo + ent.replace(/\u0001/g, f.miles) + (dec ? f.decimal + dec : "");
}
export const formatPesos = (n, dec) => { const f = leerFormato(), d = dec === undefined ? f.decImporte : dec; return (f.simbolo ? f.simbolo + " " : "") + formatNum(n, d, d); };

// Número -> texto para un CAMPO (sin separador de miles, con el decimal de la persona): así numES lo lee siempre igual
export const aTextoCampo = (n) => String(Math.round(Number(n) * 1e6) / 1e6).replace(".", leerFormato().decimal);

// ---- Fórmulas: "12*3+2", "(4,5+1,5)*2" (sin eval: analizador propio) ----
const SOLO_FORMULA = /^[\d.,\s+\-*/()xX×÷]+$/;
export function esFormula(s) {
  const t = String(s ?? "").trim();
  return SOLO_FORMULA.test(t) && /[\d)][\s]*[+\-*/xX×÷]|[*/()xX×÷]/.test(t.replace(/^[-+]/, ""));
}
export function evaluarFormula(s) {
  const t = String(s).replace(/[xX×]/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  let i = 0;
  const num = () => {
    const m = /^\d+(?:[.,]\d+)?|^[.,]\d+/.exec(t.slice(i)); if (!m) return NaN; i += m[0].length; return Number(m[0].replace(",", "."));
  };
  const factor = () => {
    if (t[i] === "-") { i++; return -factor(); }
    if (t[i] === "+") { i++; return factor(); }
    if (t[i] === "(") { i++; const v = suma(); if (t[i] !== ")") return NaN; i++; return v; }
    return num();
  };
  const prod = () => { let v = factor(); while (t[i] === "*" || t[i] === "/") { const o = t[i++]; const w = factor(); v = o === "*" ? v * w : v / w; } return v; };
  const suma = () => { let v = prod(); while (t[i] === "+" || t[i] === "-") { const o = t[i++]; const w = prod(); v = o === "+" ? v + w : v - w; } return v; };
  const r = suma();
  return i === t.length && Number.isFinite(r) ? Math.round(r * 1e9) / 1e9 : null;
}

// Texto -> número. Acepta coma o punto decimal; si trae los dos, el último es el decimal y el otro es de miles.
export function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (leerFormato().formulas && esFormula(s)) { const r = evaluarFormula(s); return r === null ? 0 : r; }
  const c = s.lastIndexOf(","), p = s.lastIndexOf(".");
  if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

// Al salir de un campo numérico con una fórmula escrita, se reemplaza por su resultado (todas las pantallas, un solo lugar)
let instalado = false;
export function instalarFormulasEnCampos() {
  if (instalado || typeof document === "undefined") return; instalado = true;
  document.addEventListener("focusout", (ev) => {
    const el = ev.target;
    try {
      if (!el || el.tagName !== "INPUT" || !/^(decimal|numeric)$/.test(el.inputMode || "")) return;
      if (!leerFormato().formulas || !esFormula(el.value)) return;
      const r = evaluarFormula(el.value); if (r === null) return;
      const txt = String(Math.round(r * 1e6) / 1e6).replace(".", leerFormato().decimal);
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(el, txt); el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) { /* si falla, el texto queda como estaba */ }
  }, true);
}
