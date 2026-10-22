import React, { useState, useMemo, useRef } from "react";
import { MUNICIPIOS_NOMBRES } from "./municipiosColombia";
import ExcelJS from "exceljs";
import { fotoLibro, estilarEscritos } from "./sstBase";
import { comprimirFoto, lineasMarca, InterruptorMarca } from "./sstControles";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto, tipoProyectoActivo } from "./MenuLateral";
import { Camera, X } from "lucide-react";
import { pedirProyectoFicha } from "./proyectoElegir.js";
import { listaActividadesTipo, infoActividad } from "./catalogoVivo";

function numES(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}


const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const CATALOGO_CARGOS = ["Director de Obra", "Residente de Obra", "Residente de Interventoría", "Ingeniero Civil", "Ingeniero Residente", "Arquitecto Residente", "Maestro de Obra", "Maestro General", "Almacenista", "Topógrafo", "Ingeniero Eléctrico", "Ingeniero Hidrosanitario", "Ingeniero Estructural", "Especialista en Suelos y Geotecnia", "Coordinador SISO / HSEQ", "Interventor de Obra", "Supervisor de Obra", "Gerente de Proyecto", "Contratista", "Representante Legal", "Administrador de Obra", "Administrador", "Auxiliar Administrativo", "Asistente Administrativo", "Coordinador Administrativo", "Director Administrativo", "Gerente Administrativo", "Contador", "Auxiliar Contable", "Tesorero", "Analista de Costos", "Analista de Presupuesto", "Jefe de Compras", "Comprador", "Auxiliar de Compras", "Secretaria", "Talento Humano"];
const CATALOGO_CIUDADES = MUNICIPIOS_NOMBRES;   // todos los municipios de Colombia

function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}
function aFechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function CasillaFoto({ foto, onChange, onRemove, numero }) {
  const inputRef = useRef(null);
  function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  }
  return (
    <div className="border rounded-lg p-2.5" style={{ borderColor: LINE, background: PAPER }}>
      {foto.previewUrl ? (
        <div className="relative">
          <img src={foto.previewUrl} alt={`Foto ${numero}`} className="w-full h-28 object-cover rounded-md" />
          <button onClick={onRemove} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5"
          style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={20} />
          <span className="text-[11px] font-medium">Foto {numero}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} />
    </div>
  );
}

function CampoNombre({ value, onChange, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!value || value.length < 1) return [];
    try {
      const nombres = JSON.parse(localStorage.getItem("ryr_nombres_usados") || "[]");
      const q = value.toLowerCase();
      return nombres.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
    } catch (e) { return []; }
  }, [value]);
  function guardarNombre(v) {
    if (!v || v.trim().length < 3) return;
    try {
      const nombres = JSON.parse(localStorage.getItem("ryr_nombres_usados") || "[]");
      const limpio = v.trim();
      if (!nombres.includes(limpio)) {
        nombres.unshift(limpio);
        localStorage.setItem("ryr_nombres_usados", JSON.stringify(nombres.slice(0, 200)));
      }
    } catch (e) {}
  }
  return (
    <div className="relative">
      <input
        placeholder={placeholder || "Nombre"}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { guardarNombre(value); setTimeout(() => setAbierto(false), 150); }}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]">
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>{label}</label>
      {children}
    </div>
  );
}
function Input(props) {
  return <input {...props} className="w-full border rounded-lg px-3 py-2.5 text-[14px]" style={{ borderColor: LINE }} />;
}
const sinTildes = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function BuscadorTexto({ value, onChange, catalogo, campo, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = sinTildes(value);
    const items = catalogo.map((it) => (typeof it === "string" ? it : it[campo]));
    const filtrados = items.filter((it) => sinTildes(it).includes(q));
    filtrados.sort((a, b) => {
      const aE = sinTildes(a).startsWith(q) ? 0 : 1;
      const bE = sinTildes(b).startsWith(q) ? 0 : 1;
      return aE - bE || a.length - b.length;
    });
    return [...new Set(filtrados)].slice(0, 20);
  }, [value, catalogo, campo]);
  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
        style={{ borderColor: LINE }}
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto" style={{ borderColor: LINE }}>
          {resultados.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => { onChange(r); setAbierto(false); }}
              className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 hover:bg-gray-50 text-[12.5px]" style={{ borderColor: LINE, color: NAVY }}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const medicionVacia = () => ({ descripcion: "", cant: "", largo: "", ancho: "", altoPeso: "", factor: "", observacion: "" });

export default function FormularioMemoria({ onVolver, onNavegar }) {
  const tipoActivo = tipoProyectoActivo();
  const listaActividades = useMemo(() => listaActividadesTipo(tipoActivo), [tipoActivo]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [proyecto, setProyecto] = useState("");
  const [areaFrente, setAreaFrente] = useState("");
  const [contratante, setContratante] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [memoriaNo, setMemoriaNo] = useState("");
  const [actividad, setActividad] = useState("");
  const [descripcionActividad, setDescripcionActividad] = useState("");

  const [mediciones, setMediciones] = useState([medicionVacia()]);
  const [cantidadContractual, setCantidadContractual] = useState("");

  const [fotos, setFotos] = useState(Array.from({ length: 4 }, () => ({ file: null, previewUrl: null })));
  function actualizarFoto(idx, nuevaFoto) { setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f))); }
  function quitarFoto(idx) { setFotos((fs) => fs.map((f, i) => (i === idx ? { file: null, previewUrl: null } : f))); }

  const [elabNombre, setElabNombre] = useState(""); const [elabCargo, setElabCargo] = useState("");
  const [revNombre, setRevNombre] = useState(""); const [revCargo, setRevCargo] = useState("");
  const [aprNombre, setAprNombre] = useState(""); const [aprCargo, setAprCargo] = useState("");

  const [generando, setGenerando] = useState(false);
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_memoria"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_memoria"); } catch (e) { return true; }
  });
  function restaurarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_memoria") || "null");
      if (d) {
        setProyecto(d.proyecto || ""); setAreaFrente(d.areaFrente || ""); setContratante(d.contratante || "");
        setUbicacion(d.ubicacion || ""); setMemoriaNo(d.memoriaNo || ""); setActividad(d.actividad || "");
        setDescripcionActividad(d.descripcionActividad || "");
        setMediciones(d.mediciones || [medicionVacia()]); setCantidadContractual(d.cantidadContractual || "");
        setElabNombre(d.elabNombre || ""); setElabCargo(d.elabCargo || "");
        setRevNombre(d.revNombre || ""); setRevCargo(d.revCargo || "");
        setAprNombre(d.aprNombre || ""); setAprCargo(d.aprCargo || "");
      }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    try { localStorage.removeItem("ryr_borrador_memoria"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  React.useEffect(() => {
    if (!borradorAplicado) return;
    try {
      localStorage.setItem("ryr_borrador_memoria", JSON.stringify({
        proyecto, areaFrente, contratante, ubicacion, memoriaNo, actividad, descripcionActividad,
        mediciones, cantidadContractual, elabNombre, elabCargo, revNombre, revCargo, aprNombre, aprCargo,
      }));
    } catch (e) {}
  }, [borradorAplicado, proyecto, areaFrente, contratante, ubicacion, memoriaNo, actividad, descripcionActividad, mediciones, cantidadContractual, elabNombre, elabCargo, revNombre, revCargo, aprNombre, aprCargo]);

  function separarNombreCargo(txt) {
    if (!txt) return { nombre: "", cargo: "" };
    const partes = String(txt).split(" - ");
    return { nombre: partes[0] || "", cargo: partes.slice(1).join(" - ") || "" };
  }

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];
      const val = (celda) => ws.getCell(celda).value;

      setProyecto(val("C10") || ""); setAreaFrente(val("J10") || "");
      setContratante(val("C11") || ""); setUbicacion(val("J11") || ""); setMemoriaNo(val("M11") || "");
      setActividad(val("C12") || ""); setDescripcionActividad(val("J12") || "");

      const nuevasMediciones = [];
      for (let r = 16; r <= 25; r++) {
        const desc = val(`B${r}`);
        const cant = val(`C${r}`);
        if (!desc && !cant) continue;
        nuevasMediciones.push({
          descripcion: desc || "", cant: String(cant || ""), largo: String(val(`D${r}`) || ""),
          ancho: String(val(`E${r}`) || ""), altoPeso: String(val(`F${r}`) || ""),
          factor: String(val(`G${r}`) || ""), observacion: val(`J${r}`) || "",
        });
      }
      setMediciones(nuevasMediciones.length ? nuevasMediciones : [medicionVacia()]);

      setCantidadContractual(String(val("D30") || ""));

      const elab = separarNombreCargo(val("B98"));
      setElabNombre(elab.nombre); setElabCargo(elab.cargo);
      const rev = separarNombreCargo(val("E98"));
      setRevNombre(rev.nombre); setRevCargo(rev.cargo);

      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea una Memoria de Cálculo generada por este sistema.");
    } finally {
      setCargando(false);
    }
  }

  const unidad = (infoActividad(actividad, tipoActivo) || {}).unidad || "";

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-memoria.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const fotoEstilo = fotoLibro(workbook);
      const ws = workbook.getWorksheet("Memoria de Cálculo");

      ws.getCell("C10").value = proyecto;
      ws.getCell("J10").value = areaFrente;
      ws.getCell("M10").value = aFechaDDMMYYYY(fechaLocalHoy());
      ws.getCell("C11").value = contratante;
      ws.getCell("J11").value = ubicacion;
      ws.getCell("M11").value = memoriaNo;
      ws.getCell("C12").value = actividad;
      ws.getCell("F12").value = unidad;
      ws.getCell("J12").value = descripcionActividad;

      mediciones.forEach((m, i) => {
        if (!m.descripcion && !m.cant) return;
        const r = 16 + i;
        if (r > 25) return;
        ws.getCell(`B${r}`).value = m.descripcion;
        ws.getCell(`C${r}`).value = numES(m.cant) || 0;
        ws.getCell(`D${r}`).value = numES(m.largo) || 0;
        ws.getCell(`E${r}`).value = numES(m.ancho) || 0;
        ws.getCell(`F${r}`).value = numES(m.altoPeso) || 0;
        ws.getCell(`G${r}`).value = numES(m.factor) || 1;
        ws.getCell(`I${r}`).value = unidad;
        ws.getCell(`J${r}`).value = m.observacion;
      });

      ws.getCell("D30").value = numES(cantidadContractual) || 0;

      const posicionesFotos = [
        { tl: { col: 0, row: 40 }, br: { col: 7, row: 55 } },
        { tl: { col: 7, row: 40 }, br: { col: 13, row: 55 } },
        { tl: { col: 0, row: 58 }, br: { col: 7, row: 73 } },
        { tl: { col: 7, row: 58 }, br: { col: 13, row: 73 } },
      ];
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (!foto.file) continue;
        const bufferFoto = await comprimirFoto(foto.file, 1000, 0.75, null, "#F2F2F2", lineasMarca(proyecto, {}, foto.file));
        const imageId = workbook.addImage({ buffer: bufferFoto, extension: "jpeg" });
        ws.addImage(imageId, posicionesFotos[i]);
      }

      ws.getCell("B98").value = elabCargo ? `${elabNombre} - ${elabCargo}` : elabNombre;
      ws.getCell("E98").value = revCargo ? `${revNombre} - ${revCargo}` : revNombre;
      ws.getCell("I98").value = aprCargo ? `${aprNombre} - ${aprCargo}` : aprNombre;

      estilarEscritos(workbook, fotoEstilo);

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const nombreArchivo = `Memoria_de_Calculo_${(actividad || "actividad").slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url; a2.download = nombreArchivo;
      document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
      URL.revokeObjectURL(url);
      try { localStorage.removeItem("ryr_borrador_memoria"); } catch (e) {}
    } catch (err) {
      console.error(err);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
  }

  if (borradorDisponible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes una Memoria de Cálculo sin terminar</div>
        <div className="text-[12.5px] text-gray-500 mb-5">Encontramos datos guardados de la última vez que trabajaste aquí sin descargar el Excel (las fotos no se guardan, hay que volver a subirlas). ¿Quieres continuar donde quedaste?</div>
        <button onClick={restaurarBorrador} className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[13.5px] mb-2.5" style={{ background: GOLD }}>
          ▶ Continuar donde quedé
        </button>
        <button onClick={descartarBorrador} className="w-full max-w-xs py-3 rounded-xl font-semibold text-[13px] border mb-2.5" style={{ borderColor: LINE, color: NAVY }}>
          Empezar en blanco
        </button>
        {onVolver && (
          <button onClick={onVolver} className="text-[12px] underline" style={{ color: NAVY }}>
            ← Volver al portal
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="memorias" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {onNavegar && <BotonMenu onClick={() => setMenuAbierto(true)} />}
              <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              Menú SAIEA OBRAS
            </button>
            </div>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Memorias de Cálculo</div>
            <IndicadorTipoProyecto claveBorrador="ryr_borrador_memoria" onVolver={onVolver} />
            <div className="text-[11px]" style={{ color: GOLD }}>Reformas y Remodelaciones</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Memoria nueva
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube la Memoria que quieres actualizar</label>
            <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])} className="text-[12.5px]" />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && <div className="text-[12px] mt-1" style={{ color: GOLD }}>✓ Datos cargados de "{archivoBase.name}"</div>}
          </div>
        )}
        <button
          type="button"
          onClick={() => { pedirProyectoFicha(() => {
            try {
              const lista = JSON.parse(localStorage.getItem("ryr_proyectos_guardados") || "[]");
              if (!lista.length) { alert("No hay ninguna Ficha Técnica guardada todavía en este dispositivo."); return; }
              const d = lista[0].datos;
              setProyecto(d.proyecto || "");
              setUbicacion(d.ubicacion || "");
              alert(`Datos traídos de: "${lista[0].nombreId}"`);
            } catch (e) {
              alert("No se pudo leer la memoria de Ficha Técnica.");
            }
          });}}
          className="w-full text-center py-2.5 rounded-lg text-[12.5px] font-semibold text-white mb-3"
          style={{ background: NAVY }}
        >
          📋 Traer datos desde la última Ficha Técnica guardada
        </button>
        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>01 | IDENTIFICACIÓN</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Proyecto / Obra"><Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} /></Campo>
            <Campo label="Área / Frente"><Input value={areaFrente} onChange={(e) => setAreaFrente(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Contratante"><Input value={contratante} onChange={(e) => setContratante(e.target.value)} /></Campo>
            <Campo label="Ubicación"><BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." /></Campo>
          </div>
          <Campo label="Memoria No."><Input value={memoriaNo} onChange={(e) => setMemoriaNo(e.target.value)} /></Campo>
          <Campo label="Actividad / Ítem">
            <BuscadorTexto value={actividad} onChange={setActividad} catalogo={listaActividades} placeholder="Busca la actividad..." />
            {unidad && <div className="text-[10.5px] text-gray-500 mt-1">Unidad: {unidad}</div>}
          </Campo>
          <Campo label="Descripción">
            <textarea value={descripcionActividad} onChange={(e) => setDescripcionActividad(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2.5 text-[13px]" style={{ borderColor: LINE }} />
          </Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>02 | MEDICIÓN DE CAMPO / DATOS DE ENTRADA</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11px] text-gray-500 mb-2">Cada fila se multiplica sola (Cant. × Largo × Ancho × Alto/Peso × Factor) y se suman todas para el total.</div>
          {mediciones.map((m, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>Registro #{i + 1}</span>
                {mediciones.length > 1 && (
                  <button onClick={() => setMediciones(mediciones.filter((_, idx) => idx !== i))} className="text-[11px] text-red-500">Quitar</button>
                )}
              </div>
              <input placeholder="Descripción" value={m.descripcion} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], descripcion: e.target.value }; setMediciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
              <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                <input placeholder="Cant." type="text" inputMode="decimal" value={m.cant} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], cant: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Largo" type="text" inputMode="decimal" value={m.largo} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], largo: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Ancho" type="text" inputMode="decimal" value={m.ancho} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], ancho: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Alto/Peso" type="text" inputMode="decimal" value={m.altoPeso} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], altoPeso: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Factor" type="text" inputMode="decimal" value={m.factor} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], factor: e.target.value }; setMediciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="text-[10px] text-gray-400 mb-1.5">Factor: multiplicador de ajuste — úsalo para desperdicio, traslape o cualquier corrección (ej: 1.05 = +5%). Déjalo en 1 o vacío si no aplica.</div>
              <input placeholder="Observación" value={m.observacion} onChange={(e) => { const c = [...mediciones]; c[i] = { ...c[i], observacion: e.target.value }; setMediciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
            </div>
          ))}
          {mediciones.length < 10 && (
            <button onClick={() => setMediciones([...mediciones, medicionVacia()])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar registro
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>03 | RESUMEN Y CONTROL DE CANTIDADES</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <Campo label="Cantidad contractual">
            <Input type="text" inputMode="decimal" value={cantidadContractual} onChange={(e) => setCantidadContractual(e.target.value)} />
          </Campo>
          <div className="text-[11px] text-gray-500">La cantidad calculada, el saldo, el % ejecutado y el estado se calculan solos en el Excel a partir de los registros de arriba.</div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>05 | SOPORTE GRÁFICO</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11px] text-gray-500 mb-2">Hasta 4 fotos, opcional.</div>
          <div className="mb-2"><InterruptorMarca /></div>
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((foto, i) => (
              <CasillaFoto key={i} foto={foto} numero={i + 1} onChange={(f) => actualizarFoto(i, f)} onRemove={() => quitarFoto(i)} />
            ))}
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>07 | RESPONSABLES Y TRAZABILIDAD</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>Elaboró</div>
          <CampoNombre value={elabNombre} onChange={setElabNombre} />
          <div className="h-2" />
          <BuscadorTexto value={elabCargo} onChange={setElabCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Revisó</div>
          <CampoNombre value={revNombre} onChange={setRevNombre} />
          <div className="h-2" />
          <BuscadorTexto value={revCargo} onChange={setRevCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Aprobó</div>
          <CampoNombre value={aprNombre} onChange={setAprNombre} />
          <div className="h-2" />
          <BuscadorTexto value={aprCargo} onChange={setAprCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
        </div>

        <button onClick={generarExcel} disabled={generando} className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]" style={{ background: generando ? "#9AA0A8" : GOLD }}>
          {generando ? "Generando..." : "Descargar Memoria de Cálculo en Excel"}
        </button>
      </div>
    </div>
  );
}
