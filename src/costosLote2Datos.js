// Control Presupuestal · Lote 2: Materiales (RYR-CP-005), Mano de Obra y Subcontratos (006), Maquinaria y Equipos (007), Cuentas por Pagar (008).
// Cada formato se describe con una configuración (campos de cada registro, hojas, listas) que usa la pantalla genérica FormularioCostosLibro.jsx.
// Lo común está en sstBase.js, cpBase.js y cpLibros.js. La app escribe solo los datos; las fórmulas siguen en la plantilla.
import { poner, escribirTabla, descubrirPorEtiquetas, fechaDDMMYYYY, pintarCelda, estilar } from "./sstBase";
import { num, texto, COLORES_ESTADO } from "./cpBase";
import {
  CLAVE_CP_MATERIALES, CLAVE_CP_SUBCONTRATOS, CLAVE_CP_MANO_OBRA, CLAVE_CP_EQUIPOS, CLAVE_CP_CUENTAS, PROPIEDADES_EQUIPO, UNIDADES_COBRO,
  materialNuevo, materialVacio, calcMaterial, resumenMateriales,
  subcontratoNuevo, subcontratoVacio, calcSubcontrato, manoObraNueva, manoObraVacia, calcManoObra, resumenManoObraSubcontratos,
  equipoNuevo, equipoVacio, calcEquipo, resumenEquipos, cuentaNueva, cuentaVacia, calcCuenta, antiguedadDeuda,
} from "./cpLibros";

const arr = (a) => (Array.isArray(a) ? a : []);
const pctFrac = (v) => (num(v) === null ? "" : num(v) / 100);
const numero = (v) => (num(v) === null ? "" : num(v));
// Fecha como fecha REAL de Excel (la plantilla de Cuentas por Pagar resta fechas); mediodía UTC para que ninguna zona horaria la corra de día
export const fechaReal = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const COLOR_CUENTA = { Vencida: COLORES_ESTADO.ALERTA, Pendiente: COLORES_ESTADO.VIGILAR, "Por vencer": COLORES_ESTADO.OK, Pagada: COLORES_ESTADO.OK };

const CAMPOS_FIRMAS = (a, b) => ({ firma: "Firma:", nombre: "Nombre:", desdeEtiqueta: "FIRMAS", personas: [{ clave: "elabora", col: "D" }, { clave: "revisa", col: b || "K" }] });
const DATOS_BASE = (p, tipoCol, valCol) => [["proyecto", "Proyecto / Obra", "A", "D"], ["tipo", "Tipo de proyecto", p, tipoCol], ["contrato", "Contrato N°", "A", "D"], ["contratante", "Contratante", p, tipoCol]];

// ===================== Materiales =====================
export const SPEC_MATERIALES = {
  campos: [...DATOS_BASE("H", "K"), ["periodo", "Mes / periodo de control", "A", "D"], ["responsable", "Responsable del control", "H", "K"]],
  tablas: [{ clave: "items", cabecera: "No.", fin: "TOTAL DEL PERIODO", finEmpieza: true,
    columnas: { material: "B", capitulo: "C", unidad: "D", cantPres: "E", precioPres: "F", cantComp: "G", precioReal: "H", cantCons: "I" },
    encabezados: { material: "Material", capitulo: "Capítulo del presupuesto", unidad: "Unidad", cantPres: "Cantidad presupuestada", precioPres: "Precio unitario presupuestado", cantComp: "Cantidad comprada", precioReal: "Precio unitario real (promedio)", cantCons: "Cantidad consumida" } }],
  firmas: CAMPOS_FIRMAS(),
};
export const CELDAS_MATERIALES = {"proyecto":"D10","tipo":"K10","contrato":"D11","contratante":"K11","periodo":"D12","responsable":"K12","tablas":{"items":{"fila0":15,"n":20,"columnas":{"material":"B","capitulo":"C","unidad":"D","cantPres":"E","precioPres":"F","cantComp":"G","precioReal":"H","cantCons":"I"}}},"firmas":{"elabora":{"nombre":"D46","cargo":"D47"},"revisa":{"nombre":"K46","cargo":"K47"}}};
export const descubrirMateriales = (ws) => descubrirPorEtiquetas(ws, SPEC_MATERIALES);

// ===================== Mano de obra y subcontratos =====================
export const SPEC_MANO_OBRA = {
  campos: [...DATOS_BASE("H", "K"), ["corte", "Fecha de corte", "A", "D"], ["responsable", "Responsable del control", "H", "K"]],
  tablas: [
    { clave: "subs", cabecera: "No.", fin: "TOTAL SUBCONTRATOS", finEmpieza: true,
      columnas: { subcontratista: "B", nit: "C", objeto: "D", capitulo: "E", valor: "F", adicionales: "G", avance: "I", pagado: "K", reteg: "L" },
      encabezados: { subcontratista: "Subcontratista", nit: "NIT / C.C.", objeto: "Objeto del subcontrato", capitulo: "Capítulo del presupuesto", valor: "Valor contratado", adicionales: "Adicionales", avance: "% de avance", pagado: "Pagado a la fecha", reteg: "Retegarantía retenida" } },
    { clave: "mano", cabecera: "No.", despuesDe: "subs", fin: "TOTAL MANO DE OBRA DIRECTA", finEmpieza: true,
      columnas: { periodo: "B", oficio: "C", descripcion: "D", capitulo: "E", trabajadores: "F", dias: "G", jornal: "H", prest: "I", obs: "M" },
      encabezados: { periodo: "Periodo (semana o quincena)", oficio: "Oficio o cuadrilla", descripcion: "Descripción de la labor", capitulo: "Capítulo del presupuesto", trabajadores: "N° de trabajadores", dias: "Días trabajados", jornal: "Valor del jornal", prest: "% prestaciones y seguridad social", obs: "Observaciones" } },
  ],
  firmas: CAMPOS_FIRMAS(),
};
export const CELDAS_MANO_OBRA = {"proyecto":"D10","tipo":"K10","contrato":"D11","contratante":"K11","corte":"D12","responsable":"K12","tablas":{"subs":{"fila0":15,"n":12,"columnas":{"subcontratista":"B","nit":"C","objeto":"D","capitulo":"E","valor":"F","adicionales":"G","avance":"I","pagado":"K","reteg":"L"}},"mano":{"fila0":31,"n":8,"columnas":{"periodo":"B","oficio":"C","descripcion":"D","capitulo":"E","trabajadores":"F","dias":"G","jornal":"H","prest":"I","obs":"M"}}},"firmas":{"elabora":{"nombre":"D52","cargo":"D53"},"revisa":{"nombre":"K52","cargo":"K53"}}};
export const descubrirManoObra = (ws) => descubrirPorEtiquetas(ws, SPEC_MANO_OBRA);

// ===================== Maquinaria y equipos =====================
export const SPEC_EQUIPOS = {
  campos: [...DATOS_BASE("H", "K"), ["periodo", "Mes / periodo de control", "A", "D"], ["responsable", "Responsable del control", "H", "K"]],
  tablas: [{ clave: "items", cabecera: "No.", fin: "TOTAL DEL PERIODO", finEmpieza: true,
    columnas: { equipo: "B", placa: "C", propiedad: "D", proveedor: "E", capitulo: "F", unidad: "G", tarifa: "H", cantidad: "I", combustible: "K", operador: "L", obs: "N" },
    encabezados: { equipo: "Equipo o maquinaria", placa: "Placa o código", propiedad: "Propiedad", proveedor: "Proveedor (si es alquilado)", capitulo: "Capítulo del presupuesto", unidad: "Unidad de cobro", tarifa: "Tarifa por unidad", cantidad: "Cantidad usada", combustible: "Combustible", operador: "Operador y otros", obs: "Observaciones" } }],
  firmas: CAMPOS_FIRMAS(),
};
export const CELDAS_EQUIPOS = {"proyecto":"D10","tipo":"K10","contrato":"D11","contratante":"K11","periodo":"D12","responsable":"K12","tablas":{"items":{"fila0":15,"n":14,"columnas":{"equipo":"B","placa":"C","propiedad":"D","proveedor":"E","capitulo":"F","unidad":"G","tarifa":"H","cantidad":"I","combustible":"K","operador":"L","obs":"N"}}},"firmas":{"elabora":{"nombre":"D40","cargo":"D41"},"revisa":{"nombre":"K40","cargo":"K41"}}};
export const descubrirEquipos = (ws) => descubrirPorEtiquetas(ws, SPEC_EQUIPOS);

// ===================== Cuentas por pagar =====================
export const SPEC_CUENTAS = {
  campos: [...DATOS_BASE("G", "J"), ["corte", "Fecha de corte", "A", "D"], ["responsable", "Responsable del control", "G", "J"]],
  tablas: [{ clave: "items", cabecera: "No.", fin: "TOTAL", finEmpieza: true,
    columnas: { proveedor: "B", nit: "C", numero: "D", fEmision: "E", fVence: "F", valor: "G", abonado: "H", capitulo: "L", obs: "M" },
    encabezados: { proveedor: "Proveedor o acreedor", nit: "NIT / C.C.", numero: "N° factura / cuenta de cobro", fEmision: "Fecha de emisión", fVence: "Fecha de vencimiento", valor: "Valor total a pagar", abonado: "Abonado", capitulo: "Capítulo del presupuesto", obs: "Observaciones" } }],
  firmas: CAMPOS_FIRMAS("D", "J"),
};
export const CELDAS_CUENTAS = {"proyecto":"D10","tipo":"J10","contrato":"D11","contratante":"J11","corte":"D12","responsable":"J12","tablas":{"items":{"fila0":15,"n":20,"columnas":{"proveedor":"B","nit":"C","numero":"D","fEmision":"E","fVence":"F","valor":"G","abonado":"H","capitulo":"L","obs":"M"}}},"firmas":{"elabora":{"nombre":"D50","cargo":"D51"},"revisa":{"nombre":"J50","cargo":"J51"}}};
export const descubrirCuentas = (ws) => descubrirPorEtiquetas(ws, SPEC_CUENTAS);

// ===================== Configuración de cada formato (la lee la pantalla genérica) =====================
// tipo de campo: texto | dinero | num | pct | fecha | capitulo | chips | area
const T = { texto: "texto", dinero: "dinero", num: "num", pct: "pct", fecha: "fecha", capitulo: "capitulo", chips: "chips", area: "area" };
const L = (v) => (v === null || v === undefined || v === "" ? "—" : v);

export const FORMATOS = {
  materiales: {
    id: "materiales", codigo: "RYR-CP-005", hoja: "Control de Materiales", plantilla: "/plantilla-materiales.xlsx", archivo: "Materiales",
    titulo: "Control de Materiales", subtitulo: "RYR-CP-005 · Lo presupuestado, lo comprado y lo consumido",
    spec: SPEC_MATERIALES, celdas: () => CELDAS_MATERIALES, descubrir: descubrirMateriales,
    cabecera: [{ k: "periodo", label: "Mes / periodo de control", ph: "Ej. Octubre 2026" }, { k: "responsable", label: "Responsable del control", ph: "Almacenista o residente" }],
    listas: [{
      id: "items", seccion: "materiales", titulo: "Materiales", singular: "material", capacidad: 20, clave: CLAVE_CP_MATERIALES, nuevo: materialNuevo, vacio: materialVacio,
      campos: [
        { k: "material", label: "Material", tipo: T.texto, req: true, ph: "Ej. Cemento gris 50 kg", sugerir: true },
        { k: "capitulo", label: "Capítulo del presupuesto", tipo: T.capitulo },
        { k: "unidad", label: "Unidad", tipo: T.texto, ph: "Ej. bulto, m³, kg", req: true , mitad: true},
        { k: "cantPres", label: "Cantidad presupuestada", tipo: T.num , mitad: true},
        { k: "precioPres", label: "Precio unitario presupuestado", tipo: T.dinero },
        { k: "cantComp", label: "Cantidad comprada", tipo: T.num , mitad: true},
        { k: "precioReal", label: "Precio unitario real (promedio)", tipo: T.dinero , mitad: true},
        { k: "cantCons", label: "Cantidad consumida", tipo: T.num },
      ],
      calculo: (r) => { const c = calcMaterial(r); return c.estado || c.saldo !== null ? { color: c.estado === "ALERTA" ? "#B3401F" : c.estado === "VIGILAR" ? "#8A6D00" : "#1D6B3A",
        fondo: c.estado === "ALERTA" ? "#FDECEA" : c.estado === "VIGILAR" ? "#FFF6D6" : "#EAF4EC",
        lineas: [["Saldo en obra", L(c.saldo)], ["% comprado del presupuesto", c.pctComp === null ? "—" : pct(c.pctComp)], ["Variación de precio", c.variacion === null ? "—" : pct(c.variacion)], ["Sobrecosto por precio", c.sobrecosto === null ? "—" : pesos(c.sobrecosto)], ["Estado", c.estado || "—"]] } : null; },
    }],
    cifras: (d) => { const r = resumenMateriales(d.items); return [
      { t: "Presupuestado de lo comprado", v: pesos(r.presComprado) }, { t: "Real de lo comprado", v: pesos(r.real) },
      { t: "Sobrecosto por precio", v: pesos(r.sobre), color: r.sobre > 0 ? "#B3401F" : "#1D6B3A" }, { t: "Variación global", v: r.variacionGlobal === null ? "" : pct(r.variacionGlobal) },
      { t: "Materiales en ALERTA", v: String(r.alertas), color: r.alertas ? "#B3401F" : "#1D6B3A" }, { t: "Materiales", v: String(r.n) }]; },
    ayuda: "Semáforo del precio: OK si el precio real es igual o menor al presupuestado; VIGILAR si lo supera hasta un 5 %; ALERTA si lo supera en más de 5 %.",
    firmas: [{ clave: "elabora", titulo: "Elaboró — Almacenista / Residente", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: "Revisó — Director de obra", n: "Nombre de quien revisa", c: "Cargo de quien revisa" }],
    texto: (d) => `${d.items.filter((x) => !materialVacio(x)).length} materiales`,
  },
  manoObra: {
    id: "manoObra", codigo: "RYR-CP-006", hoja: "Mano de Obra y Subcontratos", plantilla: "/plantilla-mano-obra.xlsx", archivo: "ManoObra_Subcontratos",
    titulo: "Mano de Obra y Subcontratos", subtitulo: "RYR-CP-006 · Subcontratos y mano de obra directa",
    spec: SPEC_MANO_OBRA, celdas: () => CELDAS_MANO_OBRA, descubrir: descubrirManoObra,
    cabecera: [{ k: "corte", label: "Fecha de corte", tipo: T.fecha }, { k: "responsable", label: "Responsable del control", ph: "Director de obra" }],
    listas: [
      { id: "subs", seccion: "subs", titulo: "Subcontratos", singular: "subcontrato", capacidad: 12, clave: CLAVE_CP_SUBCONTRATOS, nuevo: subcontratoNuevo, vacio: subcontratoVacio,
        campos: [
          { k: "subcontratista", label: "Subcontratista", tipo: T.texto, req: true, sugerir: true },
          { k: "nit", label: "NIT / C.C.", tipo: T.texto , mitad: true},
          { k: "capitulo", label: "Capítulo del presupuesto", tipo: T.capitulo , mitad: true},
          { k: "objeto", label: "Objeto del subcontrato", tipo: T.texto, ph: "Ej. Instalación de cubierta" },
          { k: "valor", label: "Valor contratado", tipo: T.dinero, req: true , mitad: true},
          { k: "adicionales", label: "Adicionales", tipo: T.dinero , mitad: true},
          { k: "avance", label: "% de avance", tipo: T.pct, ph: "Ej. 40" , mitad: true},
          { k: "pagado", label: "Pagado a la fecha", tipo: T.dinero , mitad: true},
          { k: "reteg", label: "Retegarantía retenida", tipo: T.dinero },
        ],
        calculo: (r) => { const c = calcSubcontrato(r); return c.total === null ? null : { color: c.estado === "Con saldo" ? "#8A6D00" : "#1D6B3A", fondo: c.estado === "Con saldo" ? "#FFF6D6" : "#EAF4EC",
          lineas: [["Valor total del subcontrato", pesos(c.total)], ["Valor ejecutado", c.ejecutado === null ? "—" : pesos(c.ejecutado)], ["Saldo por pagar", c.saldo === null ? "—" : pesos(c.saldo)], ["Estado", c.estado || "—"]] }; } },
      { id: "mano", seccion: "mano", titulo: "Mano de obra directa", singular: "registro de mano de obra", capacidad: 8, clave: CLAVE_CP_MANO_OBRA, nuevo: manoObraNueva, vacio: manoObraVacia,
        campos: [
          { k: "periodo", label: "Periodo (semana o quincena)", tipo: T.texto, req: true, ph: "Ej. Semana 3 de octubre" },
          { k: "oficio", label: "Oficio o cuadrilla", tipo: T.texto, req: true, ph: "Ej. Oficial de obra", sugerir: true },
          { k: "descripcion", label: "Descripción de la labor", tipo: T.texto },
          { k: "capitulo", label: "Capítulo del presupuesto", tipo: T.capitulo },
          { k: "trabajadores", label: "N° de trabajadores", tipo: T.num, req: true , mitad: true},
          { k: "dias", label: "Días trabajados", tipo: T.num, req: true , mitad: true},
          { k: "jornal", label: "Valor del jornal", tipo: T.dinero, req: true , mitad: true},
          { k: "prest", label: "% prestaciones y seguridad social", tipo: T.pct, ph: "Ej. 52" , mitad: true},
          { k: "obs", label: "Observaciones", tipo: T.texto },
        ],
        calculo: (r) => { const c = calcManoObra(r); return c.total === null ? null : { color: "#1D6B3A", fondo: "#EAF4EC", lineas: [["Subtotal salarios", pesos(c.subtotal)], ["Valor prestaciones", pesos(c.prestaciones)], ["Costo total", pesos(c.total)]] }; } },
    ],
    cifras: (d) => { const r = resumenManoObraSubcontratos(d.subs, d.mano); return [
      { t: "Subcontratos ejecutados", v: pesos(r.ejecutado) }, { t: "Pagado a subcontratistas", v: pesos(r.pagado) },
      { t: "Retegarantía retenida", v: pesos(r.reteg) }, { t: "Saldo por pagar", v: pesos(r.saldo), color: r.saldo > 0 ? "#B3401F" : "#1D6B3A" },
      { t: "Mano de obra directa", v: pesos(r.mano) }, { t: "Total mano de obra + subcontratos", v: pesos(r.total), color: "#1D6B3A" }]; },
    ayuda: "El saldo por pagar de cada subcontrato es lo ejecutado menos lo pagado y menos la retegarantía retenida.",
    firmas: [{ clave: "elabora", titulo: "Elaboró — Director de obra", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: "Revisó — Administración", n: "Nombre de quien revisa", c: "Cargo de quien revisa" }],
  },
  equipos: {
    id: "equipos", codigo: "RYR-CP-007", hoja: "Maquinaria y Equipos", plantilla: "/plantilla-equipos.xlsx", archivo: "Maquinaria_Equipos",
    titulo: "Maquinaria y Equipos", subtitulo: "RYR-CP-007 · Costo por equipo propio o alquilado",
    spec: SPEC_EQUIPOS, celdas: () => CELDAS_EQUIPOS, descubrir: descubrirEquipos,
    cabecera: [{ k: "periodo", label: "Mes / periodo de control", ph: "Ej. Octubre 2026" }, { k: "responsable", label: "Responsable del control", ph: "Residente o almacenista" }],
    listas: [{
      id: "items", seccion: "equipos", titulo: "Equipos", singular: "equipo", capacidad: 14, clave: CLAVE_CP_EQUIPOS, nuevo: equipoNuevo, vacio: equipoVacio,
      campos: [
        { k: "equipo", label: "Equipo o maquinaria", tipo: T.texto, req: true, ph: "Ej. Retroexcavadora 320", sugerir: true },
        { k: "placa", label: "Placa o código", tipo: T.texto },
        { k: "propiedad", label: "Propiedad", tipo: T.chips, opciones: PROPIEDADES_EQUIPO, req: true },
        { k: "proveedor", label: "Proveedor (si es alquilado)", tipo: T.texto, sugerir: true },
        { k: "capitulo", label: "Capítulo del presupuesto", tipo: T.capitulo },
        { k: "unidad", label: "Unidad de cobro", tipo: T.chips, opciones: UNIDADES_COBRO },
        { k: "tarifa", label: "Tarifa por unidad", tipo: T.dinero, req: true , mitad: true},
        { k: "cantidad", label: "Cantidad usada", tipo: T.num, req: true , mitad: true},
        { k: "combustible", label: "Combustible", tipo: T.dinero , mitad: true},
        { k: "operador", label: "Operador y otros", tipo: T.dinero , mitad: true},
        { k: "obs", label: "Observaciones", tipo: T.texto },
      ],
      calculo: (r) => { const c = calcEquipo(r); return c.total === null ? null : { color: "#1D6B3A", fondo: "#EAF4EC", lineas: [["Valor del equipo", pesos(c.valor)], ["Costo total", pesos(c.total)]] }; },
    }],
    cifras: (d) => { const r = resumenEquipos(d.items); return [
      { t: "Equipos propios", v: pesos(r.Propio) }, { t: "Equipos alquilados", v: pesos(r.Alquilado) },
      { t: "Costo total del periodo", v: pesos(r.total), color: "#1D6B3A" }, { t: "Equipos", v: String(r.n) }]; },
    ayuda: "El «valor del equipo» es tarifa × cantidad usada; el costo total suma además el combustible y el operador.",
    firmas: [{ clave: "elabora", titulo: "Elaboró — Residente / Almacenista", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: "Revisó — Director de obra", n: "Nombre de quien revisa", c: "Cargo de quien revisa" }],
  },
  cuentas: {
    id: "cuentas", codigo: "RYR-CP-008", hoja: "Cuentas por Pagar", plantilla: "/plantilla-cuentas.xlsx", archivo: "CuentasPorPagar",
    titulo: "Cuentas por Pagar", subtitulo: "RYR-CP-008 · Pendientes de pago y vencimientos",
    spec: SPEC_CUENTAS, celdas: () => CELDAS_CUENTAS, descubrir: descubrirCuentas,
    cabecera: [{ k: "corte", label: "Fecha de corte", tipo: T.fecha, req: true }, { k: "responsable", label: "Responsable del control", ph: "Administración" }],
    listas: [{
      id: "items", seccion: "cuentas", titulo: "Facturas y cuentas por pagar", singular: "cuenta", capacidad: 20, clave: CLAVE_CP_CUENTAS, nuevo: cuentaNueva, vacio: cuentaVacia, traerFacturas: true,
      campos: [
        { k: "proveedor", label: "Proveedor o acreedor", tipo: T.texto, req: true, sugerir: true },
        { k: "nit", label: "NIT / C.C.", tipo: T.texto , mitad: true},
        { k: "numero", label: "N° factura / cuenta de cobro", tipo: T.texto , mitad: true},
        { k: "fEmision", label: "Fecha de emisión", tipo: T.fecha , mitad: true},
        { k: "fVence", label: "Fecha de vencimiento", tipo: T.fecha , mitad: true},
        { k: "valor", label: "Valor total a pagar", tipo: T.dinero, req: true , mitad: true},
        { k: "abonado", label: "Abonado", tipo: T.dinero , mitad: true},
        { k: "capitulo", label: "Capítulo del presupuesto", tipo: T.capitulo },
        { k: "obs", label: "Observaciones", tipo: T.texto },
      ],
      calculo: (r, ctx) => { const c = calcCuenta(r, ctx.cab.corte); if (c.saldo === null) return null; const col = c.estado === "Vencida" ? ["#B3401F", "#FDECEA"] : c.estado === "Pendiente" ? ["#8A6D00", "#FFF6D6"] : ["#1D6B3A", "#EAF4EC"];
        return { color: col[0], fondo: col[1], lineas: [["Saldo por pagar", pesos(c.saldo)], ["Días de mora", c.mora === null ? "—" : String(c.mora)], ["Estado", c.estado]] }; },
    }],
    cifras: (d) => { const a = antiguedadDeuda(d.items, d.cab.corte); return [
      { t: "Saldo total por pagar", v: pesos(a.total), color: "#B3401F" }, { t: "Por vencer", v: pesos(a.porVencer), color: "#1D6B3A" },
      { t: "Vencida 1 a 30 días", v: pesos(a.d30) }, { t: "Vencida 31 a 60 días", v: pesos(a.d60) },
      { t: "Vencida 61 a 90 días", v: pesos(a.d90) }, { t: "Vencida más de 90 días", v: pesos(a.mas90), color: a.mas90 ? "#B3401F" : "#1D6B3A" },
      { t: "Sin fecha de vencimiento", v: pesos(a.sinFecha) }]; },
    ayuda: "Los días de mora se cuentan desde la fecha de vencimiento hasta la fecha de corte. Lo vencido por más de 60 días suele generar intereses o suspender el suministro: priorízalo en el flujo de caja.",
    firmas: [{ clave: "elabora", titulo: "Elaboró — Administración", n: "Nombre de quien elabora", c: "Cargo de quien elabora" }, { clave: "revisa", titulo: "Revisó — Director de obra", n: "Nombre de quien revisa", c: "Cargo de quien revisa" }],
  },
};

// Formatos de texto locales (sin importar pantallas)
function pesos(v) { const n = num(v); if (n === null) return ""; const r = Math.round(n); return (r < 0 ? "-$ " : "$ ") + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function pct(f) { return (Math.round(f * 1000) / 10).toString().replace(".", ",") + " %"; }

// ===================== Escritura en la hoja =====================
// d: { obra, tipo, cab:{…}, <lista>: [registros], firmas:{elabora:{nombre,cargo}, revisa:{…}} }
const filaTabla = {
  materiales: { items: (r) => ({ material: r.material, capitulo: r.capitulo, unidad: r.unidad, cantPres: numero(r.cantPres), precioPres: numero(r.precioPres), cantComp: numero(r.cantComp), precioReal: numero(r.precioReal), cantCons: numero(r.cantCons) }) },
  manoObra: {
    subs: (r) => ({ subcontratista: r.subcontratista, nit: r.nit, objeto: r.objeto, capitulo: r.capitulo, valor: numero(r.valor), adicionales: numero(r.adicionales), avance: pctFrac(r.avance), pagado: numero(r.pagado), reteg: numero(r.reteg) }),
    mano: (r) => ({ periodo: r.periodo, oficio: r.oficio, descripcion: r.descripcion, capitulo: r.capitulo, trabajadores: numero(r.trabajadores), dias: numero(r.dias), jornal: numero(r.jornal), prest: pctFrac(r.prest), obs: r.obs }),
  },
  equipos: { items: (r) => ({ equipo: r.equipo, placa: r.placa, propiedad: r.propiedad, proveedor: r.proveedor, capitulo: r.capitulo, unidad: r.unidad, tarifa: numero(r.tarifa), cantidad: numero(r.cantidad), combustible: numero(r.combustible), operador: numero(r.operador), obs: r.obs }) },
  cuentas: { items: (r) => ({ proveedor: r.proveedor, nit: r.nit, numero: r.numero, fEmision: fechaReal(r.fEmision), fVence: fechaReal(r.fVence), valor: numero(r.valor), abonado: numero(r.abonado), capitulo: r.capitulo, obs: r.obs }) },
};

export function escribirEnHoja(formato, ws, d, celdas) {
  const F = FORMATOS[formato], C = celdas || F.celdas();
  const o = d.obra || {};
  poner(ws, C.proyecto, o.proyecto); poner(ws, C.tipo, d.tipo); poner(ws, C.contrato, o.contrato); poner(ws, C.contratante, o.contratante);
  const cab = d.cab || {};
  poner(ws, C.responsable, cab.responsable); poner(ws, C.periodo, cab.periodo);
  if (C.corte && cab.corte) {
    if (formato === "cuentas") { poner(ws, C.corte, fechaReal(cab.corte)); estilar(ws.getCell(C.corte), { numFmt: "dd/mm/yyyy" }); }     // la plantilla resta esta fecha a cada vencimiento
    else poner(ws, C.corte, fechaDDMMYYYY(cab.corte));
  }
  for (const l of F.listas) {
    const filas = arr(d[l.id]).filter((r) => !l.vacio(r)).map(filaTabla[formato][l.id]);
    escribirTabla(ws, (C.tablas || {})[l.id], filas);
  }
  // El color del semáforo (la plantilla no trae formato condicional): se pinta aquí
  if (formato === "materiales" && (C.tablas || {}).items) {
    const Tm = C.tablas.items;
    arr(d.items).filter((r) => !materialVacio(r)).slice(0, Tm.n).forEach((r, i) => { const col = COLORES_ESTADO[calcMaterial(r).estado]; if (col) pintarCelda(ws, `N${Tm.fila0 + i}`, col.relleno, col.fuente); });
  }
  if (formato === "cuentas" && (C.tablas || {}).items) {
    const Tc = C.tablas.items;
    arr(d.items).filter((r) => !cuentaVacia(r)).slice(0, Tc.n).forEach((r, i) => { const col = COLOR_CUENTA[calcCuenta(r, cab.corte).estado]; if (col) pintarCelda(ws, `K${Tc.fila0 + i}`, col.relleno, col.fuente); });
  }
  const FI = C.firmas || {}, fs = d.firmas || {};
  for (const k of ["elabora", "revisa"]) if (FI[k]) { poner(ws, FI[k].nombre, (fs[k] || {}).nombre); poner(ws, FI[k].cargo, (fs[k] || {}).cargo); }
}

// ===================== Validación =====================
export function faltantes(formato, d) {
  const F = FORMATOS[formato], f = [];
  const o = d.obra || {};
  if (!texto(o.proyecto)) f.push({ etiqueta: "Proyecto / obra", seccion: "datos", texto: "la obra" });
  F.cabecera.forEach((c) => { if (c.req && !texto((d.cab || {})[c.k])) f.push({ etiqueta: c.label, seccion: "datos", texto: c.label.toLowerCase() }); });
  for (const l of F.listas) {
    const xs = arr(d[l.id]), con = xs.filter((r) => !l.vacio(r));
    if (!con.length) { const p = l.campos.find((c) => c.req) || l.campos[0]; f.push({ etiqueta: p.label, indice: 0, seccion: l.seccion, texto: `al menos ${/^[aeiou]/i.test(l.singular) ? "un" : "un"} ${l.singular}` }); continue; }
    xs.forEach((r, i) => { if (l.vacio(r)) return; l.campos.filter((c) => c.req).forEach((c) => { if (c.tipo === "chips" ? !texto(r[c.k]) : (c.tipo === "dinero" || c.tipo === "num" || c.tipo === "pct") ? num(r[c.k]) === null : !texto(r[c.k])) f.push({ etiqueta: c.label, indice: i, seccion: l.seccion, texto: `${c.label.toLowerCase()} de cada ${l.singular}` }); }); });
  }
  if (!texto(((d.firmas || {}).elabora || {}).nombre)) f.push({ etiqueta: F.firmas[0].n, seccion: "firmas", texto: "quien elabora" });
  return f;
}
export const validar = (formato, d) => [...new Set(faltantes(formato, d).map((x) => x.texto))];
