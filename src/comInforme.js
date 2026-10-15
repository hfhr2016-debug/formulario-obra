// comInforme.js — Resumen de compras de una obra en un mes (RYR-CO-008): junta lo registrado en los formatos de Compras y lo compara con el presupuesto (no guarda nada propio).
// «ym» es el mes en formato AAAA-MM. Devuelve secciones de filas [concepto, valor, nota] y un detalle de lo que requiere atención (mismo formato que el informe de Calidad).
import { texto, hoyISO as hoyCal, filasConDatos } from "./calBase";
import { MESES, mesActual, nombreMes, ultimoDia } from "./calInforme";
import {
  num, pesos, claveTxt, registrosCom, ordenesDeObra, recepcionesDeObra, numeroDe, ordenVigente, totalDeOrden, capitulosObra, comprometidoCapitulo, pendientesDeOrdenes, redondear,
} from "./comBase";
import { puntajeCompras, resultadoCompras } from "./comFormatos";

export { MESES, mesActual, nombreMes, ultimoDia };
const enMes = (f, ym) => texto(f).slice(0, 7) === ym;
const cuenta = (l, f) => l.filter(f).length;
const pct = (a, b) => (b > 0 ? `${String(Math.round((a / b) * 1000) / 10).replace(".", ",")} %` : "—");
const delMes = (formato, obraId, ym) => registrosCom(formato, obraId).filter((r) => enMes((r.datos || {}).fecha, ym));

export function informeCompras(obra, ym, hoy = hoyCal()) {
  const id = obra.id; const corte = ultimoDia(ym) < hoy ? ultimoDia(ym) : hoy;
  const secciones = []; const detalle = [];
  const sec = (titulo, filas) => secciones.push({ titulo, filas });

  // 1. Requisiciones
  { const rs = delMes("requisicion", id, ym); const todas = registrosCom("requisicion", id);
    const pri = (t) => cuenta(rs, (r) => r.datos.prioridad === t);
    sec("1. Requisiciones", [["Requisiciones del mes", rs.length, `Urgentes ${pri("Urgente")} · Críticas ${pri("Crítica")}`], ["Aprobadas", cuenta(rs, (r) => /^Aprobada/.test(texto(r.datos.estado)))], ["Rechazadas", cuenta(rs, (r) => r.datos.estado === "Rechazada")],
      ["Atendidas", cuenta(rs, (r) => r.datos.estado === "Atendida")], ["Pendientes de aprobación (acumulado)", cuenta(todas, (r) => r.datos.estado === "Pendiente de aprobación"), "Requisiciones sin aprobar al día de hoy"]]);
    for (const r of todas.filter((x) => x.datos.estado === "Pendiente de aprobación" && texto(x.datos.fechaRequerida) && x.datos.fechaRequerida < corte))
      detalle.push(["Requisición", `N° ${texto(r.datos.hoja) || "s/n"} · ${texto(r.datos.solicitante) || "sin solicitante"}`, "Sin aprobar", `Se necesitaba el ${texto(r.datos.fechaRequerida).split("-").reverse().join("/")}`]); }

  // 2. Cotización y compra
  { const sol = delMes("solicitud", id, ym), cua = delMes("cuadro", id, ym); const ords = delMes("orden", id, ym); const vig = ords.filter(ordenVigente);
    const valorMes = redondear(vig.reduce((t, r) => t + totalDeOrden(r), 0));
    const comprometido = redondear(ordenesDeObra(id).filter(ordenVigente).reduce((t, r) => t + totalDeOrden(r), 0));
    sec("2. Cotización y órdenes de compra", [["Solicitudes de cotización", sol.length], ["Cuadros comparativos", cua.length, `Con menos de 3 cotizaciones: ${cuenta(cua, (r) => filasConDatos({ k: "cotizaciones", cols: [{ k: "proveedor" }, { k: "valor" }] }, r.datos).length < 3)}`],
      ["Órdenes de compra emitidas", ords.length, `Anuladas: ${ords.length - vig.length}`], ["Valor de las órdenes del mes", pesos(valorMes) || "$ 0"], ["Valor comprometido acumulado (obra)", pesos(comprometido) || "$ 0", "Todas las órdenes no anuladas"]]); }

  // 3. Recepción y pendientes
  { const rc = delMes("recepcion", id, ym); const pend = pendientesDeOrdenes(id, corte); const atr = pend.filter((f) => f.estado === "Atrasado");
    sec("3. Recepción de materiales y pedidos pendientes", [["Entradas a almacén del mes", rc.length], ["Con faltantes o novedades", cuenta(rc, (r) => /faltantes|novedades/.test(texto(r.datos.resultado)))], ["Rechazadas o devueltas", cuenta(rc, (r) => /^Rechazado/.test(texto(r.datos.resultado)))],
      ["Líneas de pedido pendientes al corte", pend.length], ["Pendientes atrasados al corte", atr.length, pct(atr.length, pend.length) + " de los pendientes"]]);
    for (const f of atr) detalle.push(["Pedido atrasado", `OC ${f.orden} · ${f.proveedor || "proveedor s/n"} · ${f.descripcion}`, "Atrasado", `Faltan ${f.saldo} ${f.unidad} · prometido ${texto(f.fechaPrometida).split("-").reverse().join("/")} · ${f.dias} días de atraso`]);
    for (const r of rc.filter((x) => /^Rechazado/.test(texto(x.datos.resultado)))) detalle.push(["Entrada rechazada", `${texto(r.datos.proveedor) || "proveedor s/n"} · remisión ${texto(r.datos.remision) || "s/n"}`, "Rechazado", texto(r.datos.novedades)]); }

  // 4. Frente al presupuesto
  { const caps = capitulosObra(id); const filas = [];
    for (const c of caps) {
      const pedido = comprometidoCapitulo(id, c.nombre); const p = c.contratado > 0 ? pedido / c.contratado : null;
      filas.push([c.nombre, p === null ? "—" : pct(pedido, c.contratado), `Pedido ${pesos(pedido) || "$ 0"} de ${pesos(c.contratado) || "$ 0"}`]);
      if (p !== null && p > 1) detalle.push(["Capítulo sobre presupuesto", c.nombre, "Superado", `Pedido ${pesos(pedido)} frente a ${pesos(c.contratado)} (${pesos(pedido - c.contratado)} de más)`]);
      else if (p !== null && p >= 0.9) detalle.push(["Capítulo cerca del límite", c.nombre, "Vigilar", `Ya se pidió el ${pct(pedido, c.contratado)} del presupuesto`]);
    }
    const nombres = new Set(caps.map((c) => claveTxt(c.nombre)));
    const sinCap = ordenesDeObra(id).filter((r) => ordenVigente(r) && !nombres.has(claveTxt((r.datos || {}).capitulo)));
    if (sinCap.length) filas.push(["Órdenes sin capítulo del presupuesto", sinCap.length, `Valor ${pesos(sinCap.reduce((t, r) => t + totalDeOrden(r), 0))}`]);
    sec("4. Compras frente al presupuesto (por capítulo)", filas.length ? filas : [["Sin capítulos de presupuesto", "—", "Crea los capítulos en Control Presupuestal para comparar"]]); }

  // 5. Por proveedor
  { const por = new Map();
    ordenesDeObra(id).filter(ordenVigente).forEach((r) => { const n = texto((r.datos || {}).proveedor) || "Sin proveedor"; const c = por.get(n) || { n, ordenes: 0, valor: 0 }; c.ordenes++; c.valor += totalDeOrden(r); por.set(n, c); });
    const lista = Array.from(por.values()).sort((a, b) => b.valor - a.valor).slice(0, 12);
    sec("5. Compras por proveedor (acumulado, los 12 mayores)", lista.length ? lista.map((c) => [c.n, pesos(c.valor), `${c.ordenes} ${c.ordenes === 1 ? "orden" : "órdenes"}`]) : [["Sin órdenes de compra", "—", ""]]); }

  // 6. Evaluaciones
  { const ev = delMes("evaluacion", id, ym).map((r) => resultadoCompras(puntajeCompras(r.datos)));
    sec("6. Evaluación de proveedores", [["Evaluaciones del mes", ev.length, `Aprobados ${cuenta(ev, (x) => x === "APROBADO")} · condicionados ${cuenta(ev, (x) => x === "APROBADO CONDICIONADO")} · no aprobados ${cuenta(ev, (x) => x === "NO APROBADO")}`]]); }

  const v = (i, c) => secciones[i].filas[c][1];
  const sobre = detalle.filter((d) => d[0] === "Capítulo sobre presupuesto").length;
  const cifras = [{ t: "Órdenes del mes", v: v(1, 2) }, { t: "Valor del mes", v: v(1, 3) }, { t: "Pendientes", v: v(2, 3), color: "#B8860B" }, { t: "Atrasados", v: v(2, 4), color: "#B3401F" }, { t: "Capítulos sobre presupuesto", v: sobre, color: sobre ? "#B3401F" : undefined }];
  return { obra: obra.proyecto, ym, periodo: nombreMes(ym), corte, secciones, detalle, cifras };
}
