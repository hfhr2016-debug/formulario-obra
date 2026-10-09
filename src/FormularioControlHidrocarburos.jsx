import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_HIDROCARBUROS, HOJA_HIDROCARBUROS, CELDAS_HIDROCARBUROS, PRODUCTOS_HC, VERIFICACIONES_HC, TEXTO_DERRAME,
  descubrirHidrocarburos, escribirHidrocarburosEnHoja, validarHidrocarburos, camposFaltantesHidrocarburos, resumenHidrocarburos, suministroNuevo, suministrosConDatos, totalSuministrado, balanceTanque, huboDerrame, num,
} from "./controlHidrocarburosDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, SelectorHora,
} from "./sstComunes";
import { GrillaOpciones } from "./sstControles";
import { useFaltantes } from "./sstFaltantes";
import { CLAVE_AMB_HIDROCARBUROS, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_hidrocarburos";
const MAX_SUMINISTROS = (CELDAS_HIDROCARBUROS.tablas && CELDAS_HIDROCARBUROS.tablas.suministros && CELDAS_HIDROCARBUROS.tablas.suministros.n) || 14;
const fmt = (n) => (n === null || n === undefined ? "—" : String(Math.round(n * 100) / 100).replace(".", ","));

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", fecha: fechaHoyISO(), tanque: "", capacidad: "", responsable: "", responsableCargo: "Almacenista", proveedor: "",
    suministros: [], saldoInicial: "", recibido: "", saldoMedido: "", verificaciones: [], observaciones: "", revisoNombre: "", revisoCargo: "Responsable ambiental",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.ubicacion || d.tanque || d.capacidad || d.responsable || d.proveedor || d.suministros.length || d.saldoInicial || d.recibido || d.saldoMedido || d.verificaciones.length || d.observaciones || d.revisoNombre);

export default function FormularioControlHidrocarburos({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoSuministros, setAvisoSuministros] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));

  const setSuministros = (nuevos) => setD((cur) => ({ ...cur, suministros: nuevos }));
  const actualizar = (i, patch) => setSuministros(d.suministros.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const quitar = (i) => { setSuministros(d.suministros.filter((_, k) => k !== i)); setAvisoSuministros(""); };
  function agregar() {
    if (d.suministros.length >= MAX_SUMINISTROS) { setAvisoSuministros(`Esta hoja tiene espacio para ${MAX_SUMINISTROS} suministros. Para más, genera otra hoja con el resto.`); return; }
    const ultimo = d.suministros[d.suministros.length - 1] || {};
    setAvisoSuministros(""); setSuministros([...d.suministros, suministroNuevo({ producto: ultimo.producto || "" })]);
  }
  const alternarVerificacion = (texto) => setD((cur) => ({ ...cur, verificaciones: cur.verificaciones.includes(texto) ? cur.verificaciones.filter((x) => x !== texto) : [...cur.verificaciones, texto] }));

  const nSum = suministrosConDatos(d).length;
  const total = totalSuministrado(d);
  const bal = balanceTanque(d);
  const capacidad = num(d.capacidad);
  const excede = capacidad !== null && bal.teorico !== null && bal.teorico > capacidad;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarHidrocarburos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesHidrocarburos(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-control-hidrocarburos.xlsx", HOJA_HIDROCARBUROS);
      const avs = [];
      const decision = decidirDistribucion(descubrirHidrocarburos(ws), CELDAS_HIDROCARBUROS);
      if (decision.aviso) avs.push(decision.aviso);
      const capac = (decision.celdas.tablas && decision.celdas.tablas.suministros && decision.celdas.tablas.suministros.n) || MAX_SUMINISTROS;
      if (nSum > capac) throw new Error(`la plantilla tiene espacio para ${capac} suministros y hay ${nSum}`);
      const noMarcadas = escribirHidrocarburosEnHoja(ws, d, decision.celdas);
      if (noMarcadas.length) avs.push("La plantilla no tiene las casillas: " + noMarcadas.join(", ") + ".");
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Control_Hidrocarburos_${textoParaArchivo(d.proyecto, 24)}_${d.fecha}.xlsx`);
      memoria.recordarUso({ personas: [[d.responsable, d.responsableCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenHidrocarburos(d);
      guardarJSON(CLAVE_AMB_HIDROCARBUROS, [res, ...leerJSON(CLAVE_AMB_HIDROCARBUROS, []).filter((x) => x.id !== res.id)].slice(0, 400));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${nSum} ${nSum === 1 ? "suministro" : "suministros"}, ${fmt(total)} gal)` + (huboDerrame(d) ? ". Se marcó un derrame: diligencia el Incidente Ambiental." : "."));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  // Día siguiente: el saldo medido de hoy pasa a ser el saldo inicial de mañana
  function nuevoDia() {
    setD((cur) => ({ ...datosIniciales(), proyecto: cur.proyecto, contratista: cur.contratista, ubicacion: cur.ubicacion, tanque: cur.tanque, capacidad: cur.capacidad, responsable: cur.responsable, responsableCargo: cur.responsableCargo,
      proveedor: cur.proveedor, saldoInicial: cur.saldoMedido || (bal.teorico !== null ? String(Math.round(bal.teorico * 100) / 100) : ""), revisoNombre: cur.revisoNombre, revisoCargo: cur.revisoCargo }));
    borrador.borrarBorrador(); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoSuministros(""); setAbierta("suministros"); window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoSuministros(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un control de hidrocarburos" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Control de Hidrocarburos" subtitulo={`${CODIGO_HIDROCARBUROS} · Suministro de combustibles y lubricantes`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.tanque ? `${d.tanque} · ${d.fecha.split("-").reverse().join("/")}` : "Obra, tanque y responsable"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Fecha" type="date" value={d.fecha} onChange={(v) => set("fecha", v)} />
            <Campo label="Tanque o punto de suministro" value={d.tanque} placeholder="Ej. Tanque ACPM patio 1" onChange={(v) => set("tanque", v)} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Capacidad (gal)" value={d.capacidad} inputMode="decimal" onChange={(v) => set("capacidad", v.replace(/[^0-9.,]/g, ""))} />
              <Campo label="Proveedor" value={d.proveedor} onChange={(v) => set("proveedor", v)} />
            </div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre del responsable del suministro" etqCargo="Cargo del responsable del suministro" nombre={d.responsable} cargo={d.responsableCargo} onChange={cambiarPersona("responsable", "responsableCargo")} />
          </div>
        </Seccion>

        <Seccion id="suministros" titulo="2. Suministros del día" subtitulo={`${nSum} de ${MAX_SUMINISTROS} suministros · ${fmt(total)} gal`} abierta={abierta === "suministros"} onToggle={alternar} contador={nSum}>
          {d.suministros.map((s, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <SelectorHora label="Hora" value={s.hora} onChange={(v) => actualizar(i, { hora: v })} />
                <Campo label="Equipo o vehículo" value={s.equipo} placeholder="Placa o código, ej. VOL-02" onChange={(v) => actualizar(i, { equipo: v })} />
                <Lista label="Producto" value={s.producto} onChange={(v) => actualizar(i, { producto: v })} opciones={PRODUCTOS_HC} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cantidad (gal)" value={s.cantidad} inputMode="decimal" onChange={(v) => actualizar(i, { cantidad: v.replace(/[^0-9.,]/g, "") })} />
                  <Campo label="Horómetro o km" value={s.horometro} inputMode="decimal" onChange={(v) => actualizar(i, { horometro: v.replace(/[^0-9.,]/g, "") })} />
                </div>
                <Campo label="Recibió (operador)" value={s.recibio} onChange={(v) => actualizar(i, { recibio: v })} />
                <Campo label="Observación" value={s.obs} onChange={(v) => actualizar(i, { obs: v })} />
              </div>
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar suministro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={agregar} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}><Plus size={14} /> Agregar suministro</button>
          {avisoSuministros && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoSuministros}</div>}
        </Seccion>

        <Seccion id="balance" titulo="3. Balance del tanque" subtitulo={bal.diferencia !== null ? `Diferencia ${fmt(bal.diferencia)} gal` : "Saldo inicial, recibido y medido"} abierta={abierta === "balance"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Saldo inicial (gal)" value={d.saldoInicial} inputMode="decimal" onChange={(v) => set("saldoInicial", v.replace(/[^0-9.,]/g, ""))} />
              <Campo label="Recibido hoy (gal)" value={d.recibido} inputMode="decimal" onChange={(v) => set("recibido", v.replace(/[^0-9.,]/g, ""))} />
            </div>
            <Campo label="Saldo medido (gal)" value={d.saldoMedido} inputMode="decimal" onChange={(v) => set("saldoMedido", v.replace(/[^0-9.,]/g, ""))} />
            <div className="p-2.5 rounded-lg text-[12px]" style={{ background: "white", border: `1px solid ${LINE}`, color: "#4B5563" }}>
              Despachado hoy <b>{fmt(bal.despachado)}</b> gal · Saldo teórico <b>{fmt(bal.teorico)}</b> gal · Diferencia <b>{fmt(bal.diferencia)}</b> gal
            </div>
            {bal.diferencia !== null && bal.diferencia < 0 && Math.abs(bal.diferencia) >= 5 && <div className="text-[11.5px] p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>El saldo medido es menor que el teórico: puede haber fuga, derrame o consumo sin registrar. Revísalo hoy.</div>}
            {excede && <div className="text-[11.5px] p-2 rounded" style={{ background: "#FFF8E8", color: "#7A5A00" }}>El saldo teórico supera la capacidad del tanque ({fmt(capacidad)} gal): revisa el saldo inicial o lo recibido.</div>}
          </div>
        </Seccion>

        <Seccion id="verificacion" titulo="4. Verificación de la zona" subtitulo={`${d.verificaciones.length} de ${VERIFICACIONES_HC.length} marcadas${huboDerrame(d) ? " · derrame" : ""}`} abierta={abierta === "verificacion"} onToggle={alternar} contador={d.verificaciones.length}>
          <div className="space-y-2.5">
            <GrillaOpciones nombre="Verificación de la zona" opciones={VERIFICACIONES_HC} marcadas={d.verificaciones} onAlternar={alternarVerificacion} />
            {huboDerrame(d) && <div className="text-[11.5px] p-2 rounded" style={{ background: "#FDEDEA", color: "#B3401F" }}>Marcaste un derrame: diligencia también el formato de Incidente o Accidente Ambiental.</div>}
            <AreaTexto label="Observaciones" value={d.observaciones} onChange={(v) => set("observaciones", v)} placeholder="Ej. Se cambió la manguera del surtidor" />
          </div>
        </Seccion>

        <Seccion id="firmas" titulo="5. Firmas" subtitulo="Firma quien suministra; revisa el responsable ambiental" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px]" style={{ color: NAVY }}>Firma quien suministra ({d.responsable || "sin nombre"}); su nombre viene de la sección 1.</div>
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Revisó (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={nuevoDia} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>➡ Nuevo día (el saldo medido pasa a ser el saldo inicial)</button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del control" onGenerar={generarExcel} />
    </div>
  );
}
