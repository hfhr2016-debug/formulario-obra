import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, decidirDistribucion } from "./sstBase";
import {
  CODIGO_CONSUMOS, HOJA_CONSUMOS, CELDAS_CONSUMOS, FUENTES_AGUA, FUENTES_ENERGIA, MODOS_REGISTRO, EQUIPOS_AGUA_ENERGIA, EQUIPOS_COMBUSTIBLE, TIPOS_COMBUSTIBLE, comoOpciones, entradasComb, combNuevo, actividadesDia, modoConsumo, nombreMes, mesDe,
  descubrirConsumos, escribirConsumosEnHoja, validarConsumos, camposFaltantesConsumos, resumenConsumos, diaNuevo, diasConDatos, consumosCalculados, totalesConsumos, avisosConsumos, num,
} from "./consumosDatos";
import {
  NAVY, GOLD, PAPER, LINE, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useBorrador, BuscadorLista, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { ChipsOpcion } from "./sstControles";
import { CLAVE_AMB_CONSUMOS, TraerDeFichaAmb } from "./ambComunes";

const CLAVE_BORRADOR = "ryr_borrador_consumos";
const MAX_DIAS = ((CELDAS_CONSUMOS.tablas && CELDAS_CONSUMOS.tablas.dias.n) || 32) - 1;   // la primera fila de la hoja es la lectura inicial
const fmt = (n, dec = 3) => (n === null || n === undefined ? "—" : String(Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec)).replace(".", ","));
const masUnDia = (iso) => { const dt = new Date(iso + "T12:00:00"); dt.setDate(dt.getDate() + 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; };
const soloNumero = (v) => v.replace(/[^0-9.,]/g, "");

function datosIniciales() {
  return {
    proyecto: "", contratista: "", mes: fechaHoyISO().slice(0, 7), trabajadores: "", medidorAgua: "", medidorEnergia: "", iniAgua: "", iniEnergia: "", modo: MODOS_REGISTRO[0], dias: [], observaciones: "",
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "",
  };
}
const tieneContenido = (d) => !!(d.proyecto || d.contratista || d.trabajadores || d.medidorAgua || d.medidorEnergia || d.iniAgua || d.iniEnergia || d.dias.length || d.observaciones || d.elaboroNombre);

// Observaciones de agua y energía: se pueden anotar VARIAS actividades o equipos (se elige de la lista o se escribe; cada una queda como etiqueta que se puede quitar)
function ActividadesAgua({ lista, dia, onChange }) {
  const [borrador, setBorrador] = useState("");
  const agregar = (t) => {
    const v = String(t || "").trim();
    if (v && !lista.some((a) => a.toLowerCase() === v.toLowerCase())) onChange([...lista, v]);
    setBorrador("");
  };
  return (
    <div data-campo={`Actividades de agua y energía del día ${dia}`}>
      {lista.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {lista.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 text-[11.5px] pl-2.5 pr-1 py-1 rounded-full" style={{ background: "white", border: `1px solid ${LINE}`, color: NAVY }}>
              {a}
              <button type="button" aria-label={`Quitar ${a} del día ${dia}`} onClick={() => onChange(lista.filter((z) => z !== a))} className="w-5 h-5 leading-none text-[15px]" style={{ color: "#8A8F99" }}>×</button>
            </span>
          ))}
        </div>
      )}
      <BuscadorLista label={`Equipo o actividad que usó agua o energía (día ${dia})`} value={borrador} onChange={setBorrador} onElegir={(o) => agregar(o.texto)} onBlurValor={agregar}
        opciones={comoOpciones(EQUIPOS_AGUA_ENERGIA)} opcionesAlAbrir={comoOpciones(EQUIPOS_AGUA_ENERGIA)} placeholder={lista.length ? "Agrega otra actividad o equipo…" : "Ej. Mezcladora de concreto, riego, cambio de medidor…"} />
      <div className="text-[10px] mt-0.5" style={{ color: "#8A8F99" }}>Puedes agregar varias: elige de la lista o escribe y toca fuera de la casilla.</div>
    </div>
  );
}

export default function FormularioConsumos({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoDias, setAvisoDias] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });
  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({ ...cur, ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}), ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}) }));

  // Último mes guardado de esta obra (para continuar con los mismos medidores y ver dónde quedaron las lecturas)
  const anterior = leerJSON(CLAVE_AMB_CONSUMOS, []).find((x) => d.proyecto && String(x.proyecto || "").trim().toLowerCase() === d.proyecto.trim().toLowerCase() && x.mes !== d.mes);

  const dias = d.dias;
  const setDias = (nuevos) => setD((cur) => ({ ...cur, dias: nuevos }));
  const actualizar = (i, patch) => setDias(dias.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  // Combustible del día: lista de equipos (los borradores antiguos se convierten al editar)
  const guardarComb = (i, lista) => actualizar(i, { comb: lista, diesel: undefined, gasolina: undefined, otro: undefined, equipo: undefined });
  const cambiarComb = (i, k, patch) => guardarComb(i, entradasComb(dias[i]).map((e, n) => (n === k ? { ...e, ...patch } : e)));
  const agregarComb = (i) => guardarComb(i, [...entradasComb(dias[i]), combNuevo()]);
  const quitarComb = (i, k) => guardarComb(i, entradasComb(dias[i]).filter((_, n) => n !== k));
  const quitar = (i) => { setDias(dias.filter((_, k) => k !== i)); setAvisoDias(""); };
  function agregarDia() {
    if (dias.length >= MAX_DIAS) { setAvisoDias(`Un mes tiene espacio para ${MAX_DIAS} días.`); return; }
    setAvisoDias("");
    const u = dias[dias.length - 1];
    let fecha = u && u.fecha ? masUnDia(u.fecha) : (fechaHoyISO().slice(0, 7) === d.mes ? fechaHoyISO() : `${d.mes}-01`);
    if (fecha.slice(0, 7) !== d.mes) fecha = "";
    setDias([...dias, diaNuevo({ fecha, aguaFuente: (u && u.aguaFuente) || "", enFuente: (u && u.enFuente) || "" })]);
  }

  const conDatos = diasConDatos(d);
  const calc = consumosCalculados(d);
  const tot = totalesConsumos(d);
  const avisos = avisosConsumos(d);
  const porConsumo = modoConsumo(d);
  // Consumo de cada tarjeta (por su posición entre los días con datos)
  const consumoDe = (x) => { const k = conDatos.indexOf(x); return k >= 0 ? calc[k] : { agua: null, energia: null }; };

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarConsumos(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesConsumos(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-consumos.xlsx", HOJA_CONSUMOS);
      const avs = [];
      const decision = decidirDistribucion(descubrirConsumos(ws), CELDAS_CONSUMOS);
      if (decision.aviso) avs.push(decision.aviso);
      const capacidad = ((decision.celdas.tablas && decision.celdas.tablas.dias.n) || MAX_DIAS + 1) - 1;
      if (conDatos.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} días y hay ${conDatos.length}`);
      escribirConsumosEnHoja(ws, d, decision.celdas);
      setAvisoGeneracion(avs.join(" "));
      await descargarLibro(workbook, `Control_Consumos_${textoParaArchivo(d.proyecto, 24)}_${d.mes}.xlsx`);
      memoria.recordarUso({ personas: [[d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo]], empresasUsadas: [d.contratista] });
      const res = resumenConsumos(d);
      guardarJSON(CLAVE_AMB_CONSUMOS, [res, ...leerJSON(CLAVE_AMB_CONSUMOS, []).filter((x) => x.id !== res.id)].slice(0, 120));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${conDatos.length} ${conDatos.length === 1 ? "día" : "días"} de ${nombreMes(d.mes)}). El consumo y el resumen del mes se calculan solos en la hoja.`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un registro en blanco? Se limpian todos los datos de pantalla.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoDias(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) return <PantallaBorrador cual="un control de consumos" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Control de Consumo de Recursos" subtitulo={`${CODIGO_CONSUMOS} · Agua, energía y combustibles`} onVolver={onVolver} />
      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.proyecto ? `${d.proyecto} · ${nombreMes(d.mes)}` : "Obra, mes y medidores"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFichaAmb onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista || cur.contratista }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Mes del registro" type="month" value={d.mes} onChange={(v) => set("mes", v)} />
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", v.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Medidor de agua N°" value={d.medidorAgua} onChange={(v) => set("medidorAgua", v)} />
              <Campo label="Medidor de energía N°" value={d.medidorEnergia} onChange={(v) => set("medidorEnergia", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Lectura inicial de agua (m³)" value={d.iniAgua} inputMode="decimal" placeholder="Cierre del mes anterior" onChange={(v) => set("iniAgua", soloNumero(v))} />
              <Campo label="Lectura inicial de energía (kWh)" value={d.iniEnergia} inputMode="decimal" placeholder="Cierre del mes anterior" onChange={(v) => set("iniEnergia", soloNumero(v))} />
            </div>
            <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>La lectura inicial es la del medidor al cerrar el mes anterior: con ella la hoja calcula también el consumo del primer día. Si anotas el consumo de cada día, puedes dejarla vacía (se toma 0).</div>
            {anterior && (
              <div className="p-2.5 rounded-lg text-[11.5px]" style={{ background: "#F2F6FB", border: `1px solid ${LINE}`, color: NAVY }}>
                Último mes guardado: <b>{nombreMes(anterior.mes)} {mesDe(anterior.mes).anio}</b>. Última lectura de agua: <b>{fmt(anterior.ultimaLecturaAgua)}</b> m³ · de energía: <b>{fmt(anterior.ultimaLecturaEnergia)}</b> kWh{anterior.ultimaFecha ? ` (${anterior.ultimaFecha.split("-").reverse().join("/")})` : ""}.
                <button type="button" onClick={() => setD((cur) => ({ ...cur, medidorAgua: cur.medidorAgua || anterior.medidorAgua || "", medidorEnergia: cur.medidorEnergia || anterior.medidorEnergia || "", iniAgua: cur.iniAgua || (anterior.ultimaLecturaAgua !== null && anterior.ultimaLecturaAgua !== undefined ? String(anterior.ultimaLecturaAgua) : ""), iniEnergia: cur.iniEnergia || (anterior.ultimaLecturaEnergia !== null && anterior.ultimaLecturaEnergia !== undefined ? String(anterior.ultimaLecturaEnergia) : ""), trabajadores: cur.trabajadores || (anterior.trabajadores ? String(anterior.trabajadores) : "") }))}
                  className="block mt-1 underline font-semibold">Usar los medidores, las lecturas finales y los trabajadores de ese mes</button>
              </div>
            )}
          </div>
        </Seccion>

        <Seccion id="dias" titulo="2. Registro diario" subtitulo={`${conDatos.length} de ${MAX_DIAS} días`} abierta={abierta === "dias"} onToggle={alternar} contador={conDatos.length}>
          <div className="mb-3">
            <ChipsOpcion label="Qué anotas cada día" nombre="Qué anotas cada día" value={d.modo} opciones={MODOS_REGISTRO} pequeno onChange={(v) => set("modo", v)} />
            <div className="text-[10.5px] mt-1" style={{ color: "#8A8F99" }}>{porConsumo ? "Escribes cuánto se consumió cada día; la app arma las lecturas del medidor sumando desde la lectura inicial." : "Escribes lo que marca el medidor; la hoja calcula el consumo restando la lectura anterior."}</div>
          </div>
          {dias.map((x, i) => {
            const c = consumoDe(x);
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>Día {i + 1}</div>
                <div className="space-y-2">
                  <Campo label="Fecha del día" type="date" value={x.fecha} onChange={(v) => actualizar(i, { fecha: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label={porConsumo ? "Consumo de agua (m³)" : "Lectura de agua (m³)"} value={x.aguaLect} inputMode="decimal" onChange={(v) => actualizar(i, { aguaLect: soloNumero(v) })} />
                    <Campo label={porConsumo ? "Consumo de energía (kWh)" : "Lectura de energía (kWh)"} value={x.enLect} inputMode="decimal" onChange={(v) => actualizar(i, { enLect: soloNumero(v) })} />
                  </div>
                  {(c.agua !== null || c.energia !== null) && (
                    <div className="text-[11.5px] px-2 py-1 rounded" style={{ background: "white", color: NAVY, border: `1px solid ${LINE}` }}>
                      {porConsumo ? "Consumo del día:" : "Consumo desde la lectura anterior:"}{c.agua !== null ? ` agua ${fmt(c.agua)} m³` : ""}{c.agua !== null && c.energia !== null ? " ·" : ""}{c.energia !== null ? ` energía ${fmt(c.energia)} kWh` : ""}
                    </div>
                  )}
                  <ChipsOpcion label="Fuente del agua" nombre={`Fuente del agua ${i + 1}`} value={x.aguaFuente} opciones={FUENTES_AGUA} pequeno onChange={(v) => actualizar(i, { aguaFuente: v })} />
                  <ChipsOpcion label="Fuente de la energía" nombre={`Fuente de la energía ${i + 1}`} value={x.enFuente} opciones={FUENTES_ENERGIA} pequeno onChange={(v) => actualizar(i, { enFuente: v })} />
                  <ActividadesAgua lista={actividadesDia(x)} dia={i + 1} onChange={(l) => actualizar(i, { obsLista: l, obs: undefined })} />
                  <div className="text-[10px] uppercase tracking-wide font-medium pt-1" style={{ color: "#8A8F99" }}>Combustibles (vehículos y equipos)</div>
                  {entradasComb(x).map((e, k) => (
                    <div key={k} className="border rounded-md p-2 relative" style={{ borderColor: LINE, background: "white" }}>
                      <div className="space-y-2">
                        <BuscadorLista label={`Equipo o vehículo ${k + 1} del día ${i + 1}`} value={e.equipo} onChange={(v) => cambiarComb(i, k, { equipo: v })} opciones={comoOpciones(EQUIPOS_COMBUSTIBLE)} opcionesAlAbrir={comoOpciones(EQUIPOS_COMBUSTIBLE)} placeholder="Elige el vehículo o equipo, o escribe otro" />
                        <ChipsOpcion label="Combustible" nombre={`Combustible ${k + 1} del día ${i + 1}`} value={e.tipo} opciones={TIPOS_COMBUSTIBLE} pequeno onChange={(v) => cambiarComb(i, k, { tipo: v })} />
                        <Campo label={`Galones ${k + 1} del día ${i + 1}`} value={e.galones} inputMode="decimal" onChange={(v) => cambiarComb(i, k, { galones: soloNumero(v) })} />
                      </div>
                      <button type="button" onClick={() => quitarComb(i, k)} aria-label={`Quitar combustible ${k + 1} del día ${i + 1}`} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ color: "#B3401F" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => agregarComb(i)} className="flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-md w-full justify-center border border-dashed" style={{ borderColor: LINE, color: NAVY }}>
                    <Plus size={12} /> Agregar combustible de un vehículo o equipo
                  </button>
                </div>
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar día ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={agregarDia} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> {dias.length ? "Agregar el día siguiente" : "Agregar día"}
          </button>
          {avisoDias && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoDias}</div>}
          {avisos.length > 0 && <ul className="text-[11px] mt-2 space-y-1" style={{ color: "#8A5A00" }}>{avisos.map((a) => <li key={a}>⚠ {a}</li>)}</ul>}
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>La hoja calcula sola el consumo de cada día y los totales del mes (también el total de diésel, gasolina y otro combustible).</div>
        </Seccion>

        <Seccion id="resumen" titulo="3. Resumen del mes" subtitulo={tot.agua !== null || tot.energia !== null ? "Se calcula con las lecturas" : "Aún sin consumos"} abierta={abierta === "resumen"} onToggle={alternar}>
          <ul className="text-[12.5px] space-y-1" style={{ color: NAVY }}>
            <li>💧 Agua: <b>{fmt(tot.agua)}</b> m³</li>
            <li>⚡ Energía: <b>{fmt(tot.energia)}</b> kWh</li>
            <li>⛽ Diésel: <b>{fmt(tot.diesel)}</b> gal · Gasolina: <b>{fmt(tot.gasolina)}</b> gal · Otro: <b>{fmt(tot.otro)}</b> gal</li>
          </ul>
          <div className="text-[10.5px] mt-2" style={{ color: "#8A8F99" }}>En la hoja también salen el promedio diario y el consumo por trabajador (si anotaste los trabajadores).</div>
        </Seccion>

        <Seccion id="firmas" titulo="4. Observaciones y firmas" subtitulo="Medidas de ahorro y quién firma" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="Observaciones y medidas de ahorro" value={d.observaciones} onChange={(v) => set("observaciones", v)} placeholder="Ej. Fuga reparada en el tanque; se instalaron aireadores" />
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Registró (responsable ambiental)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien registra" etqCargo="Cargo de quien registra" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>🆕 Empezar en blanco</button>
        </div>
      </div>
      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de consumos" onGenerar={generarExcel} />
    </div>
  );
}
