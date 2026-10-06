import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fechaHoyISO, sumarMesesISO, unirUnicos, recordarTexto } from "./sstBase";
import {
  CODIGO_EPP, CELDAS_EPP, TIPOS_ENTREGA, MOTIVOS_EPP, EPP_CATALOGO, KIT_BASICO, TALLAS,
  descubrirEpp, escribirEppEnHoja, validarEpp, resumenEntregaEpp, lineasConDatos, fechaDeLinea, siguienteHoja,
} from "./eppDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador, BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar,
  Seccion, Campo, Lista, BuscadorLista,
} from "./sstComunes";
import { decidirDistribucion } from "./sstBase";
import { proyectoSST, guardarProyectoSST } from "./sstComunes";

const CLAVE_BORRADOR = "ryr_borrador_entrega_epp";
const CLAVE_EPP_USADOS = "ryr_sst_epp_usados";            // elementos de EPP que el usuario ha escrito antes
const CLAVE_ENTREGAS = "ryr_sst_entregas_epp";            // resumen de cada hoja de entrega generada
const MAX_LINEAS = (CELDAS_EPP.tablas && CELDAS_EPP.tablas.entregas.n) || 16;

const lineaNueva = (base = {}) => ({ fecha: "", nombre: "", documento: "", cargo: "", epp: "", referencia: "", cantidad: "1", talla: "", motivo: "", reposicion: "", cambiar: false, ...base });
// ¿Esta línea es del mismo trabajador que la anterior? (entonces sus datos no se vuelven a mostrar)
const mismoTrabajador = (a, b) => !!a && !!b && !!(a.nombre || "").trim() && (a.nombre || "").trim().toLowerCase() === (b.nombre || "").trim().toLowerCase() && (a.documento || "") === (b.documento || "") && (a.cargo || "") === (b.cargo || "");

function datosIniciales() {
  return {
    proyecto: proyectoSST(), contratista: "", ubicacion: "", tipoEntrega: "", hoja: "", fechaEntrega: "",
    entregaNombre: "", entregaCargo: "", voboNombre: "", voboCargo: "",
    lineas: [],
  };
}

// ¿La entrega ya tiene algo escrito? (para no guardar borradores vacíos)
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.tipoEntrega || d.hoja || d.fechaEntrega || d.entregaNombre || d.lineas.length);
}

const OPCIONES_TALLAS = TALLAS.map((t) => ({ texto: t, detalle: "" }));

export default function FormularioEntregaEPP({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("general");
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoLineas, setAvisoLineas] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const [eppExtra, setEppExtra] = useState(() => leerJSON(CLAVE_EPP_USADOS, []));
  const opcionesEpp = useMemo(() => unirUnicos(EPP_CATALOGO, eppExtra).map((t) => ({ texto: t, detalle: "" })), [eppExtra]);
  function recordarEpp(valor) {
    const nueva = recordarTexto(eppExtra, valor, { base: EPP_CATALOGO, min: 3, max: 60 });
    if (nueva !== eppExtra) { setEppExtra(nueva); guardarJSON(CLAVE_EPP_USADOS, nueva); }
  }

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const bloqueEntrega = () => (
    <BloqueProfesional memoria={memoria} etqNombre="Entrega a cargo de (nombre)" etqCargo="Cargo de quien entrega" nombre={d.entregaNombre} cargo={d.entregaCargo} onChange={cambiarPersona("entregaNombre", "entregaCargo")} />
  );

  function traerDeFicha() {
    const lista = leerJSON("ryr_proyectos_guardados", []);
    if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
    const f = lista[0].datos || {};
    setD((cur) => ({ ...cur, proyecto: f.proyecto || cur.proyecto, contratista: f.contratista || cur.contratista, ubicacion: f.ubicacion || cur.ubicacion }));
    alert(`Datos traídos de: "${lista[0].nombreId}"`);
  }

  // ---- Líneas de entrega ----
  const lineas = d.lineas;
  const setLineas = (nuevas) => setD((cur) => ({ ...cur, lineas: nuevas }));
  const actualizarLinea = (i, patch) => setLineas(lineas.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const quitarLinea = (i) => { setLineas(lineas.filter((_, k) => k !== i)); setAvisoLineas(""); };
  const hayEspacio = (n = 1) => lineas.length + n <= MAX_LINEAS;
  const sinEspacio = () => setAvisoLineas(`Esta hoja tiene espacio para ${MAX_LINEAS} líneas. Genera esta hoja y usa "Siguiente hoja" para continuar.`);
  function agregarLinea() {
    if (!hayEspacio()) return sinEspacio();
    setAvisoLineas("");
    setLineas([...lineas, lineaNueva()]);
  }
  function otroEppMismoTrabajador() {
    const ultima = lineas[lineas.length - 1];
    if (!ultima) return agregarLinea();
    if (!hayEspacio()) return sinEspacio();
    setAvisoLineas("");
    setLineas([...lineas, lineaNueva({ fecha: ultima.fecha, nombre: ultima.nombre, documento: ultima.documento, cargo: ultima.cargo, motivo: ultima.motivo })]);
  }
  function agregarKit() {
    const ultima = lineas[lineas.length - 1];
    if (!ultima || !ultima.nombre) { setAvisoLineas("Primero escribe el nombre del trabajador en la última línea y luego agrega el kit."); return; }
    if (!hayEspacio(KIT_BASICO.length)) { setAvisoLineas(`El kit básico son ${KIT_BASICO.length} líneas y no caben en esta hoja (${MAX_LINEAS} líneas). Genera esta hoja y usa "Siguiente hoja".`); return; }
    setAvisoLineas("");
    // Si la última línea está sin EPP se usa como primera del kit; las demás se agregan debajo
    const base = { fecha: ultima.fecha, nombre: ultima.nombre, documento: ultima.documento, cargo: ultima.cargo, motivo: "Dotación inicial" };
    const resto = ultima.epp ? lineas : lineas.slice(0, -1);
    setLineas([...resto, ...KIT_BASICO.map((epp) => lineaNueva({ ...base, epp }))]);
  }
  function elegirTrabajador(i, o) {
    const t = trabajadores.buscar(o.texto);
    const l = lineas[i];
    actualizarLinea(i, { nombre: t ? t.nombre : o.texto, documento: l.documento || (t && t.documento) || "", cargo: l.cargo || (t && t.cargo) || "" });
  }
  const reposicionEn = (i, meses) => {
    const base = fechaDeLinea(lineas[i], d);
    if (!base) { setAvisoLineas("Para calcular la reposición, primero pon la fecha de la entrega."); return; }
    setAvisoLineas("");
    actualizarLinea(i, { reposicion: sumarMesesISO(base, meses) });
  };

  const conDatos = lineasConDatos(d);
  const unidades = conDatos.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

  async function generarExcel() {
    setMensajeError("");
    setAvisoGeneracion("");
    const faltan = validarEpp(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + "."); return; }
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-entrega-epp.xlsx", "Entrega de EPP");
      // Distribución REAL de la plantilla subida (ubicada por el texto de sus etiquetas); si no se puede leer, la de por defecto.
      let celdas = CELDAS_EPP;
      const avisos = [];
      const lectura = descubrirEpp(ws);
      const decision = decidirDistribucion(lectura, CELDAS_EPP);   // si el formato de la plantilla no coincide con la app, se detiene
      celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      const capacidad = (celdas.tablas && celdas.tablas.entregas.n) || MAX_LINEAS;
      if (conDatos.length > capacidad) throw new Error(`la plantilla tiene espacio para ${capacidad} líneas y hay ${conDatos.length}`);
      escribirEppEnHoja(ws, d, celdas);
      setAvisoGeneracion(avisos.join(" "));
      const fechas = conDatos.map((l) => fechaDeLinea(l, d)).filter(Boolean).sort();
      await descargarLibro(workbook, `Entrega_EPP_${fechas[0] || "sin-fecha"}${d.hoja ? "_Hoja-" + textoParaArchivo(d.hoja, 12) : ""}.xlsx`);

      // Memoria para la próxima vez
      trabajadores.recordar(conDatos.map((l) => ({ nombre: l.nombre, documento: l.documento, cargo: l.cargo, empresa: d.contratista })));
      guardarProyectoSST(d.proyecto);
      memoria.recordarUso({ personas: [[d.entregaNombre, d.entregaCargo], [d.voboNombre, d.voboCargo]], cargosObra: conDatos.map((l) => l.cargo), empresasUsadas: [d.contratista] });
      let extra = eppExtra;
      for (const l of conDatos) extra = recordarTexto(extra, l.epp, { base: EPP_CATALOGO, min: 3, max: 60 });
      if (extra !== eppExtra) { setEppExtra(extra); guardarJSON(CLAVE_EPP_USADOS, extra); }
      const res = resumenEntregaEpp(d);
      guardarJSON(CLAVE_ENTREGAS, [res, ...leerJSON(CLAVE_ENTREGAS, []).filter((x) => x.id !== res.id)].slice(0, 500));
      borrador.borrarBorrador();
      borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (${conDatos.length} líneas, ${unidades} elementos). Imprímelo para las firmas, o toca "Siguiente hoja" (al final de la pantalla).`);
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  // Siguiente hoja: conserva los datos de la entrega y limpia las líneas (el N° de hoja avanza solo)
  function siguienteHojaEntrega() {
    setD((cur) => ({ ...cur, lineas: [], hoja: siguienteHoja(cur.hoja) }));
    borrador.borrarBorrador();
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAvisoLineas("");
    setAbierta("lineas");
    window.scrollTo(0, 0);
  }
  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar una entrega en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador();
    setD({ ...datosIniciales(), proyecto: "" });
    setGenerado("");
    setMensajeError("");
    setAvisoGeneracion("");
    setAvisoLineas("");
    setAbierta("general");
    window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="una entrega de EPP" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="ENTREGA DE EPP" subtitulo={`${CODIGO_EPP} · Registro con firma de recibido`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS DE LA ENTREGA */}
        <Seccion id="general" titulo="1. Datos de la entrega" subtitulo="Obra, fecha y quién entrega" abierta={abierta === "general"} onToggle={alternar}>
          <button type="button" onClick={traerDeFicha} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white mb-3" style={{ background: NAVY }}>
            📋 Traer proyecto, contratista y ubicación de la Ficha Técnica
          </button>
          <div className="space-y-2.5">
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Lista label="Tipo de entrega" value={d.tipoEntrega} onChange={(v) => set("tipoEntrega", v)} opciones={TIPOS_ENTREGA} />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Campo label="Fecha de la entrega" type="date" value={d.fechaEntrega} onChange={(v) => set("fechaEntrega", v)} />
                {!d.fechaEntrega && (
                  <button type="button" onClick={() => set("fechaEntrega", fechaHoyISO())} className="text-[11px] underline mt-1" style={{ color: NAVY }}>Usar la fecha de hoy</button>
                )}
              </div>
              <Campo label="Hoja N°" value={d.hoja} placeholder="Ej. 1 de 2" onChange={(v) => set("hoja", v)} />
            </div>
            <div className="text-[10.5px] -mt-1" style={{ color: "#8A8F99" }}>La fecha de la entrega se usa en todas las líneas que no tengan su propia fecha.</div>
            {bloqueEntrega()}
          </div>
        </Seccion>

        {/* 2. LÍNEAS DE ENTREGA */}
        <Seccion id="lineas" titulo="2. Registro de entrega" subtitulo={`${conDatos.length} de ${MAX_LINEAS} líneas · ${unidades} elementos`} abierta={abierta === "lineas"} onToggle={alternar} contador={conDatos.length}>
          {lineas.map((l, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                {i > 0 && mismoTrabajador(l, lineas[i - 1]) && !l.cambiar ? (
                  <div className="flex items-center justify-between gap-2 text-[12.5px] rounded-md px-2.5 py-2" style={{ background: "white", border: `1px solid ${LINE}`, color: NAVY }}>
                    <span>👤 <b>{l.nombre}</b>{l.documento ? ` · ${l.documento}` : ""}{l.cargo ? ` · ${l.cargo}` : ""}</span>
                    <button type="button" onClick={() => actualizarLinea(i, { cambiar: true })} className="text-[11px] underline shrink-0" style={{ color: NAVY }}>Cambiar trabajador</button>
                  </div>
                ) : (<>
                <BuscadorLista label="Nombre del trabajador" value={l.nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                  onChange={(v) => actualizarLinea(i, { nombre: v })} onElegir={(o) => elegirTrabajador(i, o)} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Documento" value={l.documento} inputMode="numeric" onChange={(v) => actualizarLinea(i, { documento: v.replace(/[^0-9A-Za-z.-]/g, "") })} />
                  <BuscadorLista label="Cargo / oficio" value={l.cargo} onChange={(v) => actualizarLinea(i, { cargo: v })} opciones={memoria.opcionesCargosObra} opcionesAlAbrir={memoria.opcionesCargosObra} maxResultados={10} placeholder="Cargo" onBlurValor={(v) => memoria.recordarCargoObra(v)} />
                </div>
                </>)}
                <BuscadorLista label="EPP o elemento entregado" value={l.epp} onChange={(v) => actualizarLinea(i, { epp: v })} opciones={opcionesEpp} opcionesAlAbrir={opcionesEpp} maxResultados={10} placeholder="Elige un EPP o escribe otro" onBlurValor={(v) => recordarEpp(v)} />
                <Campo label="Referencia / marca / norma" value={l.referencia} onChange={(v) => actualizarLinea(i, { referencia: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cant." value={l.cantidad} inputMode="numeric" onChange={(v) => actualizarLinea(i, { cantidad: v.replace(/[^0-9]/g, "") })} />
                  <BuscadorLista label="Talla" value={l.talla} onChange={(v) => actualizarLinea(i, { talla: v })} opciones={OPCIONES_TALLAS} opcionesAlAbrir={OPCIONES_TALLAS} maxResultados={10} placeholder="Talla" />
                </div>
                <Lista label="Motivo" value={l.motivo} onChange={(v) => actualizarLinea(i, { motivo: v })} opciones={MOTIVOS_EPP} />
                <Campo label="Fecha de esta línea (si es distinta)" type="date" value={l.fecha} onChange={(v) => actualizarLinea(i, { fecha: v })} />
                <div>
                  <Campo label="Fecha de reposición prevista" type="date" value={l.reposicion} onChange={(v) => actualizarLinea(i, { reposicion: v })} />
                  <div className="flex gap-1.5 mt-1 items-center">
                    <span className="text-[10.5px]" style={{ color: "#8A8F99" }}>Calcular:</span>
                    {[3, 6, 12].map((m) => (
                      <button key={m} type="button" onClick={() => reposicionEn(i, m)} className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: NAVY, color: NAVY }}>+{m} meses</button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => quitarLinea(i)} aria-label={`Quitar línea ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="space-y-2">
            {lineas.length > 0 && (
              <button type="button" onClick={otroEppMismoTrabajador} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold border" style={{ borderColor: NAVY, color: NAVY }}>
                ➕ Otro EPP para el mismo trabajador
              </button>
            )}
            <button type="button" onClick={agregarLinea} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
              <Plus size={14} /> Agregar línea
            </button>
            {lineas.length > 0 && (
              <button type="button" onClick={agregarKit} className="w-full text-center py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
                🦺 Agregar el kit básico al último trabajador
              </button>
            )}
          </div>
          {avisoLineas && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoLineas}</div>}
        </Seccion>

        {/* 3. FIRMAS (el compromiso del trabajador ya viene impreso en el formato) */}
        <Seccion id="firmas" titulo="3. Firmas" subtitulo="Cada trabajador firma de recibido en el papel impreso" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Entrega (almacenista / responsable SST)</div>
            {bloqueEntrega()}
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Vo.Bo. Residente de obra</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre" etqCargo="Cargo" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={siguienteHojaEntrega} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: NAVY }}>
            ➡ Siguiente hoja (conserva los datos de la entrega)
          </button>
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel de la entrega" onGenerar={generarExcel} />
    </div>
  );
}
