// Control Presupuestal de Obra (RYR-CP-002): presupuesto vs. ejecutado en actas vs. costo real, por capítulo. Lo común está en sstBase.js y cpBase.js.
// El costo real (columna H) suma las facturas de OTRA hoja (el Registro de Costos), y esa fórmula no puede ir en la plantilla de la app:
// la app calcula la suma y la escribe como número. El resto de las columnas (vigente, % avance, desviación, saldo, proyección, estado) son fórmulas de la plantilla.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda } from "./sstBase";
import { num, texto, controlDeObra, COLORES_ESTADO, MAX_CAPITULOS } from "./cpBase";

export const CODIGO_CONTROL = "RYR-CP-002";
export const HOJA_CONTROL = "Control Presupuestal";

export const SPEC_CONTROL = {
  campos: [
    ["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", "H", "K"],
    ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", "H", "K"],
    ["acta", "Acta / corte N°", "A", "D"], ["corte", "Fecha de corte", "H", "K"],
    ["aiu", "AIU (%)", "A", "E"],
  ],
  tablas: [
    { clave: "capitulos", cabecera: "Cap.", fin: "TOTAL OBRA", finEmpieza: true,
      columnas: { nombre: "B", contratado: "C", adiciones: "D", ejecutado: "F", costoReal: "H", estado: "N" },
      encabezados: { nombre: "Capítulo del presupuesto", contratado: "Presupuesto contratado", adiciones: "Adiciones aprobadas", ejecutado: "Ejecutado según actas", costoReal: "Costo real acumulado", estado: "Estado" } },
  ],
  firmas: { firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "elabora", col: "D" }, { clave: "revisa", col: "K" }] },
};
// Distribución de la plantilla entregada (se usa solo si no se puede leer la plantilla subida). Generado por el motor.
export const CELDAS_CONTROL = {"proyecto":"D10","tipo":"K10","contrato":"D11","contratante":"K11","acta":"D12","corte":"K12","aiu":"E35","tablas":{"capitulos":{"fila0":15,"n":16,"columnas":{"nombre":"B","contratado":"C","adiciones":"D","ejecutado":"F","costoReal":"H","estado":"N"}}},"firmas":{"elabora":{"nombre":"D45","cargo":"D46"},"revisa":{"nombre":"K45","cargo":"K46"}}};
export const descubrirControl = (ws) => descubrirPorEtiquetas(ws, SPEC_CONTROL);

export const capitulosConNombre = (obra) => (Array.isArray(obra && obra.capitulos) ? obra.capitulos : []).filter((c) => texto(c.nombre));

// d: { proyecto, tipo, contrato, contratante, acta, corte, aiu, obra, facturas, adicionales, elaboraNombre… }
export function escribirControlEnHoja(ws, d, celdas = CELDAS_CONTROL) {
  const C = celdas;
  for (const k of ["proyecto", "tipo", "contrato", "contratante"]) poner(ws, C[k], d[k]);
  poner(ws, C.acta, texto(d.acta) && /^\d+$/.test(texto(d.acta)) ? Number(texto(d.acta)) : d.acta);
  poner(ws, C.corte, fechaDDMMYYYY(d.corte));
  if (num(d.aiu) !== null) poner(ws, C.aiu, num(d.aiu) / 100);                   // 25 -> 0,25 (la plantilla da formato de porcentaje)
  const { filas, tot } = controlDeObra(d.obra, d.facturas, d.adicionales, d.corte);
  const caps = capitulosConNombre(d.obra);
  const T = (C.tablas || {}).capitulos;
  escribirTabla(ws, T, caps.map((c, i) => ({
    nombre: c.nombre, contratado: num(c.contratado) === null ? "" : num(c.contratado),
    adiciones: filas[i].D ? Math.round(filas[i].D) : "", ejecutado: num(c.ejecutado) === null ? "" : num(c.ejecutado), costoReal: Math.round(filas[i].H || 0),
  })));
  // El color del semáforo: la plantilla lo daba con formato condicional, que no viaja en la plantilla de la app; se pinta aquí
  if (T && T.columnas && T.columnas.estado) {
    filas.forEach((f, i) => { const col = COLORES_ESTADO[f.estado]; if (col) pintarCelda(ws, `${T.columnas.estado}${T.fila0 + i}`, col.relleno, col.fuente); });
    const ct = COLORES_ESTADO[tot.estado];
    if (ct) pintarCelda(ws, `${T.columnas.estado}${T.fila0 + T.n}`, ct.relleno, ct.fuente);
  }
  const F = C.firmas || {};
  if (F.elabora) { poner(ws, F.elabora.nombre, d.elaboraNombre); poner(ws, F.elabora.cargo, d.elaboraCargo); }
  if (F.revisa) { poner(ws, F.revisa.nombre, d.revisaNombre); poner(ws, F.revisa.cargo, d.revisaCargo); }
}

export function validarControl(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push("la obra");
  if (!texto(d.acta)) f.push("el número del acta o corte");
  if (!d.corte) f.push("la fecha de corte");
  const caps = capitulosConNombre(d.obra);
  if (!caps.length) f.push("al menos un capítulo");
  else {
    if (caps.length > MAX_CAPITULOS) f.push(`máximo ${MAX_CAPITULOS} capítulos por hoja (hay ${caps.length})`);
    if (caps.some((c) => num(c.contratado) === null)) f.push("el presupuesto contratado de cada capítulo");
  }
  if (!texto(d.elaboraNombre)) f.push("quien elabora");
  return f;
}
export function camposFaltantesControl(d) {
  const f = [];
  if (!texto(d.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos" });
  if (!texto(d.acta)) f.push({ etiqueta: "Acta / corte N°", seccion: "datos" });
  if (!d.corte) f.push({ etiqueta: "Fecha de corte", seccion: "datos" });
  const todos = Array.isArray(d.obra && d.obra.capitulos) ? d.obra.capitulos : [];
  if (!capitulosConNombre(d.obra).length) f.push({ etiqueta: "Nombre del capítulo", indice: 0, seccion: "capitulos" });
  else todos.forEach((c, i) => { if (texto(c.nombre) && num(c.contratado) === null) f.push({ etiqueta: "Presupuesto contratado", indice: i, seccion: "capitulos" }); });
  if (!texto(d.elaboraNombre)) f.push({ etiqueta: "Nombre de quien elabora", seccion: "firmas" });
  return f;
}
