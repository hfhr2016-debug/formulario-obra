// calInforme.js — Informe mensual de calidad de una obra: junta lo que ya está registrado en los formatos de Calidad (no guarda nada propio).
// «ym» es el mes en formato AAAA-MM. Devuelve secciones de filas [concepto, valor, nota] y un detalle de lo que requiere atención.
import { texto, numero, hoyISO, listarRegistros, listarNC } from "./calBase";
import { FORMATOS_CAL, puntajeProveedor, resultadoProveedor } from "./calFormatos";
import { cilindrosPorEnsayar } from "./calFormatos2";
import { vencimientosDeObra, resumenVenc } from "./calVencimientos";

const arr = (x) => (Array.isArray(x) ? x : []);
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const mesActual = () => hoyISO().slice(0, 7);
export const nombreMes = (ym) => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ""); return m ? `${MESES[Number(m[2]) - 1]} de ${m[1]}` : ""; };
export const ultimoDia = (ym) => { const [a, m] = ym.split("-").map(Number); const d = new Date(a, m, 0).getDate(); return `${ym}-${String(d).padStart(2, "0")}`; };
const enMes = (f, ym) => texto(f).slice(0, 7) === ym;
const fmtN = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "—" : String(Math.round(n * 10 ** d) / 10 ** d).replace(".", ","));
const pct = (a, b) => (b > 0 ? `${fmtN((a / b) * 100)} %` : "—");
const cuenta = (lista, f) => lista.filter(f).length;
const regs = (id, obraId) => listarRegistros(FORMATOS_CAL[id], obraId);
const delMes = (id, obraId, ym) => regs(id, obraId).filter((r) => enMes((r.datos || {}).fecha, ym));
const filasDe = (rs, k) => rs.flatMap((r) => arr((r.datos || {})[k]).map((f) => ({ ...f, _reg: r })));
const llena = (f) => Object.values(f).some((v) => typeof v === "string" && v.trim() !== "");

export function informeMensual(obra, ym, hoy = hoyISO()) {
  const id = obra.id; const corte = ultimoDia(ym) < hoy ? ultimoDia(ym) : hoy;
  const secciones = []; const detalle = [];
  const sec = (titulo, filas) => secciones.push({ titulo, filas });

  // 1. Recepción de materiales
  { const rs = delMes("cal-recepcion", id, ym); const por = (t) => cuenta(rs, (r) => r.datos.resultado === t);
    const mats = filasDe(rs, "materiales").filter(llena);
    sec("1. Recepción de materiales", [["Recepciones registradas", rs.length], ["Materiales recibidos (líneas)", mats.length], ["Aceptadas", por("Aceptado")], ["Aceptadas con observaciones", por("Aceptado con observaciones")],
      ["En cuarentena (esperan ensayo)", por("En cuarentena (espera ensayo)")], ["Rechazadas", por("Rechazado"), pct(por("Rechazado"), rs.length) + " de las recepciones"]]);
    for (const r of rs) if (r.datos.resultado === "Rechazado" || r.datos.resultado === "En cuarentena (espera ensayo)") detalle.push(["Recepción", `${texto(r.datos.proveedor) || "Proveedor s/n"} · remisión ${texto(r.datos.remision) || "s/n"}`, r.datos.resultado, texto(r.datos.rechazo) || texto(r.datos.observaciones)]); }

  // 2. Control de ensayos
  { const fs = filasDe(regs("cal-ensayos", id), "ensayos").filter((f) => llena(f) && (enMes(f.fechaEnvio, ym) || enMes(f.fechaResultado, ym)));
    const c = (t) => cuenta(fs, (f) => f.resultado === t);
    sec("2. Control de ensayos de materiales", [["Ensayos solicitados o con resultado en el mes", fs.length], ["Cumplen", c("Cumple")], ["No cumplen", c("No cumple"), pct(c("No cumple"), c("Cumple") + c("No cumple")) + " de los que tienen resultado"], ["Pendientes de resultado", c("Pendiente")]]);
    for (const f of fs) if (f.resultado === "No cumple" || (f.resultado === "Pendiente" && f.fechaEnvio && f.fechaEnvio < corte)) detalle.push(["Ensayo", `${texto(f.material)} · ${texto(f.ensayo)}`, f.resultado, `Exigido ${texto(f.exigido) || "—"}, obtenido ${texto(f.obtenido) || "—"}`]); }

  // 3. Concreto
  { const vs = delMes("cal-vaciado", id, ym); const cam = filasDe(vs, "camiones").filter((f) => texto(f.remision) || numero(f.volumen));
    const vol = cam.reduce((t, f) => t + (numero(f.volumen) || 0), 0);
    const cil = filasDe(regs("cal-resultados", id), "cilindros").filter((f) => texto(f.resistencia) !== "" && enMes(f.fechaEnsayo, ym));
    const pf = (f) => { const r = numero(f.resistencia), e = numero(f.fcEsp); return r === null || !e ? null : (r / e) * 100; };
    const c28 = cil.filter((f) => numero(f.edad) === 28); const p28 = c28.map(pf).filter((x) => x !== null);
    const ok28 = p28.filter((x) => x >= 100).length;
    const vencidos = cilindrosPorEnsayar(id, corte).filter((c) => c.estado === "vencido");
    sec("3. Concreto", [["Vaciados registrados", vs.length], ["Camiones (remisiones)", cam.length], ["Volumen vaciado (m³)", fmtN(vol)], ["Cilindros ensayados en el mes", cil.length], ["Ensayos a 28 días", c28.length],
      ["Cumplen f'c a 28 días", ok28, pct(ok28, p28.length)], ["Resistencia promedio a 28 días (% de f'c)", p28.length ? fmtN(p28.reduce((a, b) => a + b, 0) / p28.length) + " %" : "—"], ["Cilindros por ensayar vencidos al corte", vencidos.length]]);
    for (const f of c28) { const p = pf(f); if (p !== null && p < 100) detalle.push(["Concreto 28 días", `${texto(f.elemento)} · remisión ${texto(f.remision) || "s/n"} · cilindro ${texto(f.cilindro) || "—"}`, "No cumple", `${fmtN(p)} % de f'c (${texto(f.resistencia)} de ${texto(f.fcEsp)} MPa)`]); }
    for (const c of vencidos) detalle.push(["Cilindro por ensayar", c.titulo, "Vencido", c.detalle]); }

  // 4. Suelos y compactación
  { const ex = delMes("cal-excavacion", id, ym);
    const dens = filasDe(ex, "densidad").filter((f) => numero(f.dmax) && numero(f.dsit)).map((f) => ({ f, p: (numero(f.dsit) / numero(f.dmax)) * 100, e: numero(f.exigido) }));
    const okD = dens.filter((x) => x.e !== null && x.p >= x.e - 1e-9).length;
    const su = filasDe(regs("cal-resultados", id), "suelos").filter((f) => llena(f) && enMes(f.fecha, ym));
    sec("4. Suelos y compactación", [["Ensayos de densidad (CA-007)", dens.length], ["Cumplen compactación", okD, pct(okD, dens.length)], ["Ensayos de suelos (CA-011)", su.length], ["Cumplen", cuenta(su, (f) => f.resultado === "Cumple")], ["No cumplen", cuenta(su, (f) => f.resultado === "No cumple")]]);
    for (const x of dens) if (x.e !== null && x.p < x.e - 1e-9) detalle.push(["Compactación", `Capa ${texto(x.f.capa) || "—"} · ${texto(x.f.loc) || "—"}`, "No cumple", `${fmtN(x.p)} % frente a ${fmtN(x.e)} % exigido`]);
    for (const f of su) if (f.resultado === "No cumple") detalle.push(["Ensayo de suelo", `${texto(f.ensayo)} · ${texto(f.capa)}`, "No cumple", `Exigido ${texto(f.exigido) || "—"} ${texto(f.unidad)}, obtenido ${texto(f.obtenido) || "—"}`]); }

  // 5. Inspecciones de proceso
  { const ac = delMes("cal-acero", id, ym), fo = delMes("cal-formaleta", id, ym), pr = delMes("cal-protocolo", id, ym), te = delMes("cal-terminada", id, ym), ex = delMes("cal-excavacion", id, ym);
    const res = (rs, t) => cuenta(rs, (r) => String(r.datos.resultado || "").startsWith(t));
    sec("5. Inspecciones de proceso", [["Excavaciones y rellenos inspeccionados", ex.length, `No autorizadas: ${cuenta(ex, (r) => r.datos.autoriza === "No")}`], ["Acero de refuerzo inspeccionado", ac.length, `Rechazado: ${res(ac, "Rechazado")}`],
      ["Formaleta inspeccionada", fo.length, `Rechazada: ${res(fo, "Rechazado")}`], ["Protocolos por actividad", pr.length, `Aprobados: ${res(pr, "Aprobada")} · Rechazados: ${res(pr, "Rechazada")}`],
      ["Actividades terminadas revisadas", te.length, `Recibidas: ${cuenta(te, (r) => r.datos.resultado === "Recibida")} · con pendientes: ${cuenta(te, (r) => r.datos.resultado === "Recibida con pendientes")} · no recibidas: ${cuenta(te, (r) => r.datos.resultado === "No recibida")}`]]);
    for (const r of [...ac, ...fo]) if (/^Rechazad/.test(texto(r.datos.resultado))) detalle.push([r.formato === "cal-acero" ? "Acero" : "Formaleta", texto(r.datos.elemento) || "—", "Rechazado", texto(r.datos.observaciones)]);
    for (const r of pr) if (/^Rechazada/.test(texto(r.datos.resultado))) detalle.push(["Protocolo", `${texto(r.datos.actividad)} · ${texto(r.datos.torre)}`, "Rechazada", texto(r.datos.observaciones)]); }

  // 6. No conformidades
  { const todas = listarNC(id).filter((n) => !n.descartada && !n.eliminada);
    const nuevas = todas.filter((n) => enMes(n.fecha, ym)); const cerradas = todas.filter((n) => n.estado === "Cerrada" && enMes(n.fechaCierre, ym));
    const abiertas = todas.filter((n) => n.estado !== "Cerrada" && texto(n.fecha) <= ultimoDia(ym));
    const venc = abiertas.filter((n) => texto(n.fechaLimite) && n.fechaLimite < corte); const crit = abiertas.filter((n) => n.gravedad === "Crítica");
    const g = (t) => cuenta(nuevas, (n) => n.gravedad === t);
    sec("6. No conformidades", [["Nuevas en el mes", nuevas.length, `Leves ${g("Leve")} · Mayores ${g("Mayor")} · Críticas ${g("Crítica")}`], ["Cerradas en el mes", cerradas.length], ["Abiertas al corte", abiertas.length], ["Vencidas al corte", venc.length], ["Críticas abiertas", crit.length],
      ["% de cierre acumulado", pct(todas.filter((n) => n.estado === "Cerrada").length, todas.length)],
      ["Cerradas con eficacia verificada", cuenta(todas, (n) => n.estado === "Cerrada" && n.verifResultado === "Eficaz")],
      ["Cerradas pendientes de verificar eficacia", cuenta(todas, (n) => n.estado === "Cerrada" && n.verifResultado !== "Eficaz" && n.verifResultado !== "No eficaz")],
      ["Acciones no eficaces", cuenta(todas, (n) => n.verifResultado === "No eficaz"), "Hay que reabrirlas y definir una acción nueva"],
      ["Reabiertas (acumulado)", cuenta(todas, (n) => Number(n.reaperturas) > 0)]]);
    for (const n of todas.filter((x) => x.estado === "Cerrada" && x.verifResultado === "No eficaz")) detalle.push(["No conformidad", `N° ${n.numero} · ${texto(n.titulo) || texto(n.descripcion).slice(0, 60)}`, "Acción no eficaz", "Reabrir y definir una acción nueva"]);
    for (const n of abiertas) detalle.push(["No conformidad", `N° ${n.numero} · ${texto(n.titulo) || texto(n.descripcion).slice(0, 60)}`, `${n.estado || "Abierta"}${venc.includes(n) ? " · vencida" : ""}`, `${n.gravedad || ""}${n.fechaLimite ? " · límite " + n.fechaLimite : ""}${texto(n.responsable) ? " · " + texto(n.responsable) : ""}`.replace(/^ · /, "")]); }

  // 7. Pendientes de entrega
  { const fs = filasDe(regs("cal-pendientes", id), "pendientes").filter((f) => texto(f.descripcion));
    const abierto = (f) => f.estado !== "Verificado"; const ab = fs.filter(abierto);
    const venc = ab.filter((f) => texto(f.fechaCompromiso) && f.fechaCompromiso < corte);
    sec("7. Pendientes de entrega", [["Pendientes registrados (acumulado)", fs.length], ["Verificados", cuenta(fs, (f) => f.estado === "Verificado"), pct(cuenta(fs, (f) => f.estado === "Verificado"), fs.length)], ["Abiertos", ab.length, `Prioridad alta: ${cuenta(ab, (f) => f.prioridad === "Alta")}`], ["Vencidos", venc.length]]);
    for (const f of venc) detalle.push(["Pendiente vencido", `${texto(f.espacio) || "—"} · ${texto(f.descripcion)}`, f.estado || "Pendiente", `Compromiso ${f.fechaCompromiso}${texto(f.responsable) ? " · " + texto(f.responsable) : ""}`]); }

  // 8. Proveedores y entregas
  { const pv = delMes("cal-proveedores", id, ym).map((r) => resultadoProveedor(puntajeProveedor(r.datos))); const ac = delMes("cal-acta", id, ym);
    sec("8. Proveedores y entregas", [["Evaluaciones de proveedores", pv.length, `Aprobados ${cuenta(pv, (x) => x === "APROBADO")} · condicionados ${cuenta(pv, (x) => x === "APROBADO CONDICIONADO")} · no aprobados ${cuenta(pv, (x) => x === "NO APROBADO")}`],
      ["Reevaluaciones de proveedores vencidas", vencimientosDeObra(obra, corte).filter((x) => x.tipo === "proveedor" && x.estado === "vencido").length, "Proveedores cuya fecha de reevaluación ya pasó"],
      ["Actas de entrega", ac.length, `A satisfacción: ${cuenta(ac, (r) => r.datos.resultado === "Recibida a satisfacción")} · con pendientes: ${cuenta(ac, (r) => r.datos.resultado === "Recibida con pendientes")}`]]); }

  // 9. Vencimientos
  { const v = vencimientosDeObra(obra, corte); const r = resumenVenc(v);
    sec("9. Vencimientos al corte", [["Vencidos", r.vencidos], ["Vencen hoy", r.hoy], ["Por vencer (próximos 3 días)", r.pronto]]); }

  const cifras = [];
  const val = (i, c) => secciones[i].filas[c][1];
  cifras.push({ t: "Recepciones", v: val(0, 0) }, { t: "Rechazadas", v: val(0, 5), color: "#B3401F" }, { t: "Vaciados", v: val(2, 0) }, { t: "NC nuevas", v: val(5, 0) }, { t: "NC abiertas", v: val(5, 2), color: "#B8860B" }, { t: "Vencidos", v: val(8, 0), color: "#B3401F" });
  return { obra: obra.proyecto, ym, periodo: nombreMes(ym), corte, secciones, detalle, cifras };
}
