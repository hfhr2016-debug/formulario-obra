import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CODIGO_EMERGENCIAS, HOJA_EMERGENCIAS, CELDAS_EMERGENCIAS, ORIGENES_AMENAZA, PROBABILIDADES, IMPACTOS, SENALIZACION, COLORES_AMENAZA, AMENAZAS, ROLES_BRIGADA,
  descubrirEmergencias, escribirEmergenciasEnHoja, validarEmergencias, camposFaltantesEmergencias, resumenEmergencias, amenazaNueva, brigadistaNuevo, simulacroNuevo, simulacrosConDatos, nivelAmenaza, amenazasAltas,
} from "./emergenciasDatos";
import {
  NAVY, GOLD, PAPER, LINE, OPCIONES_CIUDADES, CIUDADES_AL_ABRIR, leerJSON, guardarJSON, cargarPlantilla, descargarLibro, textoParaArchivo,
  useMemoriaSST, useTrabajadores, useBorrador,
  BloqueProfesional, PantallaBorrador, EncabezadoFormulario, BarraGenerar, Seccion, Campo, AreaTexto, Lista, BuscadorLista, TraerDeFicha,
} from "./sstComunes";
import { useFaltantes } from "./sstFaltantes";
import { decidirDistribucion } from "./sstBase";
import { ChipsOpcion, CampoFecha } from "./sstControles";

const CLAVE_BORRADOR = "ryr_borrador_emergencias";
const CLAVE_EMERGENCIAS = "ryr_sst_emergencias";       // resumen de cada plan: su vigencia y sus simulacros
const MAX_SIMULACROS = (CELDAS_EMERGENCIAS.tablas && CELDAS_EMERGENCIAS.tablas.simulacros.n) || 4;

function datosIniciales() {
  return {
    proyecto: "", contratista: "", ubicacion: "", direccion: "", fechaElaboracion: "", vigencia: "", version: "", responsable: "", telefono: "", trabajadores: "", visitantes: "", horario: "",
    amenazas: AMENAZAS.map(amenazaNueva), brigada: ROLES_BRIGADA.map(brigadistaNuevo),
    puntoEncuentro: "", ruta: "", extintores: "", botiquines: "", camillas: "", alarma: "", senalizacion: "", centroMedico: "",
    procIncendio: "", procSismo: "", procAccidente: "", simulacros: [simulacroNuevo()],
    elaboroNombre: "", elaboroCargo: "", revisoNombre: "", revisoCargo: "", voboNombre: "", voboCargo: "",
  };
}
function tieneContenido(d) {
  return !!(d.contratista || d.ubicacion || d.direccion || d.fechaElaboracion || d.responsable || d.puntoEncuentro || d.ruta || d.extintores || d.procIncendio || d.elaboroNombre ||
    d.amenazas.some((a, i) => a.origen || a.prob || a.impacto || a.medidas || (a.amenaza && a.amenaza !== AMENAZAS[i])) || d.brigada.some((b) => b.nombre || b.telefono) || d.simulacros.some((s) => s.fecha || s.tipo));
}

export default function FormularioEmergencias({ onVolver }) {
  const [d, setD] = useState(datosIniciales);
  const [abierta, setAbierta] = useState("datos");
  const { marcar: resaltarFaltantes, limpiar: limpiarFaltantes } = useFaltantes(setAbierta);   // marca en rojo las casillas que faltan
  const [generando, setGenerando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [generado, setGenerado] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState("");
  const [avisoFilas, setAvisoFilas] = useState("");

  const set = (campo, valor) => setD((cur) => ({ ...cur, [campo]: valor }));
  const alternar = (id) => setAbierta((cur) => (cur === id ? "" : id));
  const memoria = useMemoriaSST(d.contratista);
  const trabajadores = useTrabajadores();
  const borrador = useBorrador({ clave: CLAVE_BORRADOR, d, setD, inicial: datosIniciales, tieneContenido });

  const cambiarPersona = (campoNombre, campoCargo) => (patch) =>
    setD((cur) => ({
      ...cur,
      ...(patch.nombre !== undefined ? { [campoNombre]: patch.nombre } : {}),
      ...(patch.cargo !== undefined ? { [campoCargo]: patch.cargo } : {}),
    }));
  const actualizarAmenaza = (i, patch) => setD((cur) => ({ ...cur, amenazas: cur.amenazas.map((a, k) => (k === i ? { ...a, ...patch } : a)) }));
  const actualizarBrigadista = (i, patch) => setD((cur) => ({ ...cur, brigada: cur.brigada.map((b, k) => (k === i ? { ...b, ...patch } : b)) }));
  const setSimulacros = (nuevos) => setD((cur) => ({ ...cur, simulacros: nuevos.length ? nuevos : [simulacroNuevo()] }));
  const actualizarSimulacro = (i, patch) => setSimulacros(d.simulacros.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const quitarSimulacro = (i) => { setSimulacros(d.simulacros.filter((_, k) => k !== i)); setAvisoFilas(""); };
  function agregarSimulacro() {
    if (d.simulacros.length >= MAX_SIMULACROS) { setAvisoFilas(`Esta hoja tiene espacio para ${MAX_SIMULACROS} simulacros.`); return; }
    setAvisoFilas(""); setSimulacros([...d.simulacros, simulacroNuevo()]);
  }

  const altas = amenazasAltas(d).length;
  const evaluadas = d.amenazas.filter((a) => nivelAmenaza(a)).length;

  async function generarExcel() {
    setMensajeError(""); setAvisoGeneracion("");
    const faltan = validarEmergencias(d);
    if (faltan.length) { setMensajeError("Falta completar: " + faltan.join(", ") + ". Las casillas que faltan están marcadas en rojo."); resaltarFaltantes(camposFaltantesEmergencias(d)); return; }
    limpiarFaltantes();
    setGenerando(true);
    try {
      const { workbook, ws } = await cargarPlantilla("/plantilla-plan-emergencias.xlsx", HOJA_EMERGENCIAS);
      const avisos = [];
      const lectura = descubrirEmergencias(ws);
      const decision = decidirDistribucion(lectura, CELDAS_EMERGENCIAS);   // si el formato de la plantilla no coincide con la app, se detiene
      const celdas = decision.celdas;
      if (decision.aviso) avisos.push(decision.aviso);
      escribirEmergenciasEnHoja(ws, d, celdas);
      setAvisoGeneracion(avisos.join(" "));
      await descargarLibro(workbook, `Plan_emergencias_${d.fechaElaboracion}_${textoParaArchivo(d.proyecto || d.contratista || "obra", 24)}.xlsx`);

      // Memoria para la próxima vez
      trabajadores.recordar(d.brigada.filter((b) => b.nombre).map((b) => ({ nombre: b.nombre, empresa: d.contratista })));
      memoria.recordarUso({ personas: [[d.responsable, ""], [d.elaboroNombre, d.elaboroCargo], [d.revisoNombre, d.revisoCargo], [d.voboNombre, d.voboCargo]], empresasUsadas: [d.contratista] });
      const res = resumenEmergencias(d);
      guardarJSON(CLAVE_EMERGENCIAS, [res, ...leerJSON(CLAVE_EMERGENCIAS, []).filter((x) => x.id !== res.id)].slice(0, 50));
      borrador.borrarBorrador(); borrador.omitirProximoGuardado();
      setGenerado(`✓ Excel descargado (plan de emergencias: ${res.amenazasAltas} ${res.amenazasAltas === 1 ? "amenaza de nivel alto" : "amenazas de nivel alto"}, ${res.simulacros} ${res.simulacros === 1 ? "simulacro registrado" : "simulacros registrados"}).` +
        (!res.simulacros ? " Recuerda programar el primer simulacro." : ""));
    } catch (err) {
      console.error(err);
      setMensajeError("No se pudo generar el Excel: " + (err && err.message ? err.message : "error desconocido"));
    } finally { setGenerando(false); }
  }

  function empezarEnBlanco() {
    if (!window.confirm("¿Empezar un plan en blanco? Se limpian todos los datos, incluidos los de la obra.")) return;
    borrador.borrarBorrador(); setD(datosIniciales()); setGenerado(""); setMensajeError(""); setAvisoGeneracion(""); setAvisoFilas(""); setAbierta("datos"); window.scrollTo(0, 0);
  }

  if (borrador.borradorDisponible) {
    return <PantallaBorrador cual="un plan de emergencias" onContinuar={borrador.restaurar} onEmpezar={borrador.descartar} onVolver={onVolver} />;
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <EncabezadoFormulario titulo="Plan de Emergencias" subtitulo={`${CODIGO_EMERGENCIAS} · Qué hacer antes, durante y después de una emergencia`} onVolver={onVolver} />

      <div className="max-w-md mx-auto bg-white px-3 pb-36">
        {/* 1. DATOS */}
        <Seccion id="datos" titulo="1. Datos generales" subtitulo={d.direccion || "Obra, responsable y horario"} abierta={abierta === "datos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <TraerDeFicha onTraer={(f) => setD((cur) => ({ ...cur, proyecto: f.proyecto, contratista: f.contratista, ubicacion: f.ubicacion, responsable: cur.responsable || f.respNombre || "", telefono: cur.telefono || f.respTelefono || "", trabajadores: cur.trabajadores || f.trabajadoresPrev || "" }))} />
            <Campo label="Proyecto / obra" value={d.proyecto} onChange={(v) => set("proyecto", v)} />
            <Campo label="Contratista / empresa" value={d.contratista} onChange={(v) => set("contratista", v)} />
            <BuscadorLista label="Ubicación" value={d.ubicacion} onChange={(v) => set("ubicacion", v)} opciones={OPCIONES_CIUDADES} opcionesAlAbrir={CIUDADES_AL_ABRIR} placeholder="Elige una ciudad o escribe otra" />
            <Campo label="Dirección exacta de la obra" value={d.direccion} onChange={(v) => set("direccion", v)} />
            <CampoFecha label="Fecha de elaboración" value={d.fechaElaboracion} onChange={(v) => set("fechaElaboracion", v)} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Vigencia hasta" type="date" value={d.vigencia} onChange={(v) => set("vigencia", v)} />
              <Campo label="Versión del plan" value={d.version} placeholder="Ej. 1" onChange={(v) => set("version", v.replace(/[^0-9A-Za-z.-]/g, ""))} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Responsable del plan" value={d.responsable} onChange={(v) => set("responsable", v)} />
              <Campo label="Teléfono del responsable" value={d.telefono} inputMode="tel" onChange={(v) => set("telefono", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Trabajadores (promedio)" value={d.trabajadores} inputMode="numeric" onChange={(v) => set("trabajadores", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Visitantes por día" value={d.visitantes} inputMode="numeric" onChange={(v) => set("visitantes", v.replace(/[^0-9]/g, ""))} />
            </div>
            <Campo label="Horario de trabajo" value={d.horario} placeholder="Ej. 7:00 a 17:00" onChange={(v) => set("horario", v)} />
          </div>
        </Seccion>

        {/* 2. AMENAZAS */}
        <Seccion id="amenazas" titulo="2. Análisis de amenazas" subtitulo={`${evaluadas} evaluadas${altas ? ` · ${altas} de nivel alto` : ""}`} abierta={abierta === "amenazas"} onToggle={alternar} contador={evaluadas}>
          {d.amenazas.map((a, i) => {
            const nivel = nivelAmenaza(a), color = COLORES_AMENAZA[nivel];
            return (
              <div key={i} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: nivel === "Alto" ? "#E8B4A6" : LINE, background: PAPER }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</div>
                  {color && <div className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#" + color.relleno, color: "#" + color.fuente }}>Nivel {nivel}</div>}
                </div>
                <div className="space-y-2">
                  <Campo label={`Amenaza ${i + 1}`} value={a.amenaza} placeholder="Escribe la amenaza" onChange={(v) => actualizarAmenaza(i, { amenaza: v })} />
                  <Lista label={`Origen ${i + 1}`} value={a.origen} onChange={(v) => actualizarAmenaza(i, { origen: v })} opciones={ORIGENES_AMENAZA} />
                  <ChipsOpcion label="Probabilidad" nombre={`Probabilidad ${i + 1}`} value={a.prob} opciones={PROBABILIDADES} pequeno onChange={(v) => actualizarAmenaza(i, { prob: v })} />
                  <ChipsOpcion label="Impacto" nombre={`Impacto ${i + 1}`} value={a.impacto} opciones={IMPACTOS} pequeno onChange={(v) => actualizarAmenaza(i, { impacto: v })} />
                  <Campo label={`Medidas principales ${i + 1}`} value={a.medidas} onChange={(v) => actualizarAmenaza(i, { medidas: v })} />
                </div>
              </div>
            );
          })}
          <div className="text-[10.5px]" style={{ color: "#8A8F99" }}>El nivel es probabilidad × impacto (Alto si el resultado es 6 o más, Medio de 3 a 4, Bajo si es menos): el Excel lo calcula y aquí lo ves antes de generar.</div>
        </Seccion>

        {/* 3. BRIGADA */}
        <Seccion id="brigada" titulo="3. Brigada de emergencias" subtitulo={`${d.brigada.filter((b) => b.nombre).length} de ${ROLES_BRIGADA.length} roles con nombre`} abierta={abierta === "brigada"} onToggle={alternar} contador={d.brigada.filter((b) => b.nombre).length}>
          {ROLES_BRIGADA.map((rol, i) => (
            <div key={rol} className="border rounded-lg p-2.5 mb-2.5" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>{rol}</div>
              <div className="space-y-2">
                <BuscadorLista label={i === 0 ? "Nombre del jefe de brigada" : `Nombre (${rol})`} value={d.brigada[i].nombre} opciones={trabajadores.opciones} opcionesAlAbrir={trabajadores.alAbrir} placeholder="Escribe el nombre (si ya lo registraste, se sugiere)"
                  onChange={(v) => actualizarBrigadista(i, { nombre: v })} onElegir={(o) => { const t = trabajadores.buscar(o.texto); actualizarBrigadista(i, { nombre: t ? t.nombre : o.texto }); }} />
                <div className="grid grid-cols-2 gap-2">
                  <Campo label={`Teléfono (${rol})`} value={d.brigada[i].telefono} inputMode="tel" onChange={(v) => actualizarBrigadista(i, { telefono: v })} />
                  <Campo label={`Suplente (${rol})`} value={d.brigada[i].suplente} onChange={(v) => actualizarBrigadista(i, { suplente: v })} />
                </div>
              </div>
            </div>
          ))}
        </Seccion>

        {/* 4. RECURSOS */}
        <Seccion id="recursos" titulo="4. Recursos y rutas" subtitulo={d.puntoEncuentro || "Punto de encuentro, extintores y botiquines"} abierta={abierta === "recursos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <Campo label="Punto de encuentro" value={d.puntoEncuentro} onChange={(v) => set("puntoEncuentro", v)} />
            <AreaTexto label="Ruta de evacuación" value={d.ruta} onChange={(v) => set("ruta", v)} filas={2} />
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Extintores (N° y tipo)" value={d.extintores} onChange={(v) => set("extintores", v)} />
              <Campo label="Botiquines (N°)" value={d.botiquines} inputMode="numeric" onChange={(v) => set("botiquines", v.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Camillas (N°)" value={d.camillas} inputMode="numeric" onChange={(v) => set("camillas", v.replace(/[^0-9]/g, ""))} />
              <Campo label="Alarma o aviso" value={d.alarma} onChange={(v) => set("alarma", v)} />
            </div>
            <Lista label="Señalización instalada" value={d.senalizacion} onChange={(v) => set("senalizacion", v)} opciones={SENALIZACION} />
            <Campo label="Centro médico más cercano" value={d.centroMedico} placeholder="Nombre y distancia" onChange={(v) => set("centroMedico", v)} />
          </div>
        </Seccion>

        {/* 5. PROCEDIMIENTOS */}
        <Seccion id="procedimientos" titulo="5. Procedimientos básicos" subtitulo="Qué hacer en cada caso" abierta={abierta === "procedimientos"} onToggle={alternar}>
          <div className="space-y-2.5">
            <AreaTexto label="En caso de incendio" value={d.procIncendio} onChange={(v) => set("procIncendio", v)} filas={3} />
            <AreaTexto label="En caso de sismo o evacuación" value={d.procSismo} onChange={(v) => set("procSismo", v)} filas={3} />
            <AreaTexto label="En caso de accidente con lesionados" value={d.procAccidente} onChange={(v) => set("procAccidente", v)} filas={3} />
          </div>
        </Seccion>

        {/* 6. SIMULACROS */}
        <Seccion id="simulacros" titulo="6. Simulacros y revisión del plan" subtitulo={`${simulacrosConDatos(d).length} de ${MAX_SIMULACROS} simulacros`} abierta={abierta === "simulacros"} onToggle={alternar} contador={simulacrosConDatos(d).length}>
          {d.simulacros.map((s, i) => (
            <div key={i} className="border rounded-lg p-2.5 mb-2.5 relative" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[10px] font-bold mb-1" style={{ color: GOLD }}>#{i + 1}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Fecha del simulacro" type="date" value={s.fecha} onChange={(v) => actualizarSimulacro(i, { fecha: v })} />
                  <Campo label="Tipo de simulacro" value={s.tipo} placeholder="Ej. Evacuación" onChange={(v) => actualizarSimulacro(i, { tipo: v })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Participantes" value={s.participantes} inputMode="numeric" onChange={(v) => actualizarSimulacro(i, { participantes: v.replace(/[^0-9]/g, "") })} />
                  <Campo label="Minutos" value={s.minutos} inputMode="decimal" onChange={(v) => actualizarSimulacro(i, { minutos: v.replace(/[^0-9.,]/g, "") })} />
                </div>
                <AreaTexto label="Observaciones y mejoras" value={s.obs} onChange={(v) => actualizarSimulacro(i, { obs: v })} filas={2} />
              </div>
              <button type="button" onClick={() => quitarSimulacro(i)} aria-label={`Quitar simulacro ${i + 1}`} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarSimulacro} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed" style={{ borderColor: GOLD, color: NAVY }}>
            <Plus size={14} /> Agregar simulacro
          </button>
          {avisoFilas && <div className="text-[11.5px] mt-2" style={{ color: "#B3401F" }}>{avisoFilas}</div>}
        </Seccion>

        {/* 7. FIRMAS */}
        <Seccion id="firmas" titulo="7. Firmas" subtitulo="Elabora SST; revisa el residente; da el visto bueno gerencia o interventoría" abierta={abierta === "firmas"} onToggle={alternar}>
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold" style={{ color: NAVY }}>Elaboró (responsable SST)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien elabora" etqCargo="Cargo de quien elabora" nombre={d.elaboroNombre} cargo={d.elaboroCargo} onChange={cambiarPersona("elaboroNombre", "elaboroCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Revisó (residente de obra)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien revisa" etqCargo="Cargo de quien revisa" nombre={d.revisoNombre} cargo={d.revisoCargo} onChange={cambiarPersona("revisoNombre", "revisoCargo")} />
            <div className="text-[11px] font-semibold pt-1" style={{ color: NAVY }}>Visto bueno (gerencia o interventoría)</div>
            <BloqueProfesional memoria={memoria} etqNombre="Nombre de quien da el visto bueno" etqCargo="Cargo de quien da el visto bueno" nombre={d.voboNombre} cargo={d.voboCargo} onChange={cambiarPersona("voboNombre", "voboCargo")} />
          </div>
        </Seccion>

        <div className="pt-5 space-y-2">
          <button type="button" onClick={empezarEnBlanco} className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold border" style={{ borderColor: LINE, color: NAVY }}>
            🆕 Empezar en blanco
          </button>
        </div>
      </div>

      <BarraGenerar mensajeError={mensajeError} aviso={avisoGeneracion} mensajeOk={generado} generando={generando} textoBoton="Generar Excel del plan" onGenerar={generarExcel} />
    </div>
  );
}
