import React, { useState, useMemo, useRef } from "react";
import { MUNICIPIOS_NOMBRES } from "./municipiosColombia";
import ExcelJS from "exceljs";
import { fotoLibro, estilarEscritos } from "./sstBase";
import MenuLateral, { BotonMenu, IndicadorTipoProyecto, tipoProyectoActivo } from "./MenuLateral";
import { Camera, X } from "lucide-react";
import { pedirProyectoFicha } from "./proyectoElegir.js";
import { listaActividadesTipo, infoActividad } from "./catalogoVivo";
import { numES, formatNum } from "./formatoNumeros";



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

function comprimirFoto(file, maxAncho = 1000, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("No se pudo procesar la foto"));
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        calidad
      );
    };
    img.onerror = reject;
    img.src = url;
  });
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
          <img src={foto.previewUrl} alt={`Foto ${numero}`} className="w-full h-24 object-cover rounded-md" />
          <button onClick={onRemove} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-24 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1"
          style={{ borderColor: GOLD, color: NAVY }}>
          <Camera size={18} />
          <span className="text-[10.5px] font-medium">Foto {numero}</span>
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
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
    return [...new Set(filtrados)].slice(0, 8);
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

const itemVacio = () => ({ actividad: "", unidad: "", cantContractual: "", cantAnterior: "", cantActa: "", precioUnitario: "", observacion: "" });

export default function FormularioActa({ onVolver, onNavegar }) {
  const tipoActivo = tipoProyectoActivo();
  const listaActividades = useMemo(() => listaActividadesTipo(tipoActivo), [tipoActivo]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [actaNo, setActaNo] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [contratante, setContratante] = useState("");
  const [contratista, setContratista] = useState("");
  const [interventoria, setInterventoria] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [contratoNo, setContratoNo] = useState("");
  const [fechaActa, setFechaActa] = useState(fechaLocalHoy());
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [objeto, setObjeto] = useState("");

  const [diasContractuales, setDiasContractuales] = useState("");
  const [diasAvance, setDiasAvance] = useState("");
  const [porcentajeTiempo, setPorcentajeTiempo] = useState("");
  const [contratanteNombre, setContratanteNombre] = useState(""); const [contratanteCargo, setContratanteCargo] = useState("");
  const [contratistaNombre, setContratistaNombre] = useState(""); const [contratistaCargo, setContratistaCargo] = useState("");
  const [interventorNombre, setInterventorNombre] = useState(""); const [interventorCargo, setInterventorCargo] = useState("");

  const [items, setItems] = useState([itemVacio()]);

  const [valorContractual, setValorContractual] = useState("");
  const [valorActasAnteriores, setValorActasAnteriores] = useState("");
  const valorPresenteActa = useMemo(() => {
    return items.reduce((acc, it) => acc + (numES(it.cantActa) || 0) * (numES(it.precioUnitario) || 0), 0);
  }, [items]);
  const [anticipo, setAnticipo] = useState("");
  const [amortizacion, setAmortizacion] = useState("");
  const [retenciones, setRetenciones] = useState("");

  const [calidadEstado, setCalidadEstado] = useState("CUMPLE"); const [calidadRef, setCalidadRef] = useState("");
  const [sstEstado, setSstEstado] = useState("CUMPLE"); const [sstRef, setSstRef] = useState("");
  const [ambientalEstado, setAmbientalEstado] = useState("CUMPLE"); const [ambientalRef, setAmbientalRef] = useState("");

  const [observaciones, setObservaciones] = useState([{ descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }]);

  const [fotos, setFotos] = useState([
    { file: null, previewUrl: null }, { file: null, previewUrl: null },
    { file: null, previewUrl: null }, { file: null, previewUrl: null }, { file: null, previewUrl: null },
  ]);

  const [elabNombre, setElabNombre] = useState(""); const [elabCargo, setElabCargo] = useState("");
  const [revNombre, setRevNombre] = useState(""); const [revCargo, setRevCargo] = useState("");
  const [aprNombre, setAprNombre] = useState(""); const [aprCargo, setAprCargo] = useState("");

  const [generando, setGenerando] = useState(false);
  const [modo, setModo] = useState("nuevo");
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    try { return !!localStorage.getItem("ryr_borrador_acta"); } catch (e) { return false; }
  });
  const [borradorAplicado, setBorradorAplicado] = useState(() => {
    try { return !localStorage.getItem("ryr_borrador_acta"); } catch (e) { return true; }
  });
  function restaurarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem("ryr_borrador_acta") || "null");
      if (d) {
        setProyecto(d.proyecto || ""); setContratante(d.contratante || "");
        setContratista(d.contratista || ""); setInterventoria(d.interventoria || "");
        setUbicacion(d.ubicacion || ""); setContratoNo(d.contratoNo || "");
        setFechaActa(d.fechaActa || fechaLocalHoy()); setDesde(d.desde || ""); setHasta(d.hasta || ""); setObjeto(d.objeto || "");
        setDiasContractuales(d.diasContractuales || ""); setDiasAvance(d.diasAvance || ""); setPorcentajeTiempo(d.porcentajeTiempo || "");
        setContratanteNombre(d.contratanteNombre || ""); setContratanteCargo(d.contratanteCargo || "");
        setContratistaNombre(d.contratistaNombre || ""); setContratistaCargo(d.contratistaCargo || "");
        setInterventorNombre(d.interventorNombre || ""); setInterventorCargo(d.interventorCargo || "");
        setItems(d.items || [itemVacio()]);
        setValorContractual(d.valorContractual || ""); setValorActasAnteriores(d.valorActasAnteriores || "");
        setAnticipo(d.anticipo || ""); setAmortizacion(d.amortizacion || ""); setRetenciones(d.retenciones || "");
        setCalidadEstado(d.calidadEstado || "CUMPLE"); setCalidadRef(d.calidadRef || "");
        setSstEstado(d.sstEstado || "CUMPLE"); setSstRef(d.sstRef || "");
        setAmbientalEstado(d.ambientalEstado || "CUMPLE"); setAmbientalRef(d.ambientalRef || "");
        if (d.observaciones) setObservaciones(d.observaciones);
        setElabNombre(d.elabNombre || ""); setElabCargo(d.elabCargo || "");
        setRevNombre(d.revNombre || ""); setRevCargo(d.revCargo || "");
        setAprNombre(d.aprNombre || ""); setAprCargo(d.aprCargo || "");
      }
    } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  function descartarBorrador() {
    try { localStorage.removeItem("ryr_borrador_acta"); } catch (e) {}
    setBorradorAplicado(true);
    setBorradorDisponible(false);
  }
  React.useEffect(() => {
    if (!borradorAplicado) return;
    try {
      localStorage.setItem("ryr_borrador_acta", JSON.stringify({
        proyecto, contratante, contratista, interventoria, ubicacion, contratoNo, fechaActa, desde, hasta, objeto,
        diasContractuales, diasAvance, porcentajeTiempo,
        contratanteNombre, contratanteCargo, contratistaNombre, contratistaCargo, interventorNombre, interventorCargo,
        items, valorContractual, valorActasAnteriores, anticipo, amortizacion, retenciones,
        calidadEstado, calidadRef, sstEstado, sstRef, ambientalEstado, ambientalRef,
        observaciones, elabNombre, elabCargo, revNombre, revCargo, aprNombre, aprCargo,
      }));
    } catch (e) {}
  }, [borradorAplicado, proyecto, contratante, contratista, interventoria, ubicacion, contratoNo, fechaActa, desde, hasta, objeto, diasContractuales, diasAvance, porcentajeTiempo, contratanteNombre, contratanteCargo, contratistaNombre, contratistaCargo, interventorNombre, interventorCargo, items, valorContractual, valorActasAnteriores, anticipo, amortizacion, retenciones, calidadEstado, calidadRef, sstEstado, sstRef, ambientalEstado, ambientalRef, observaciones, elabNombre, elabCargo, revNombre, revCargo, aprNombre, aprCargo]);

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      const val = (celda) => ws.getCell(celda).value;
      setActaNo(val("C11") || ""); setContratoNo(val("J12") || "");
      setProyecto(val("C12") || ""); setContratante(val("C13") || "");
      setContratista(val("J13") || ""); setInterventoria(val("C14") || "");
      setUbicacion(val("J14") || ""); setObjeto(val("D16") || "");
      setDiasContractuales(String(val("F20") || "")); setDiasAvance(String(val("J20") || ""));
      setPorcentajeTiempo(String((numES(val("N20")) || 0) * 100));
      setContratanteNombre(val("C21") || ""); setContratanteCargo(val("C22") || "");
      setContratistaNombre(val("H21") || ""); setContratistaCargo(val("H22") || "");
      setInterventorNombre(val("L21") || ""); setInterventorCargo(val("L22") || "");

      const nuevosItems = [];
      for (let r = 26; r <= 33; r++) {
        const act = val(`B${r}`);
        if (act) nuevosItems.push({
          actividad: String(act), unidad: val(`E${r}`) || "",
          cantContractual: String(val(`F${r}`) || ""), cantAnterior: String(val(`G${r}`) || ""),
          cantActa: String(val(`H${r}`) || ""), precioUnitario: String(val(`I${r}`) || ""),
          observacion: val(`N${r}`) || "",
        });
      }
      setItems(nuevosItems.length ? nuevosItems : [itemVacio()]);

      setValorContractual(String(val("E36") || "")); setValorActasAnteriores(String(val("H36") || ""));
      setAnticipo(String(val("H37") || "")); setAmortizacion(String(val("K37") || "")); setRetenciones(String(val("N37") || ""));
      setCalidadEstado(val("C41") || "CUMPLE"); setCalidadRef(val("A42") || "");
      setSstEstado(val("G41") || "CUMPLE"); setSstRef(val("F42") || "");
      setAmbientalEstado(val("L41") || "CUMPLE"); setAmbientalRef(val("K42") || "");

      const nuevasObs = [];
      for (let r = 46; r <= 51; r++) {
        const desc = val(`B${r}`);
        if (desc) nuevasObs.push({
          descripcion: String(desc), clasificacion: val(`E${r}`) || "", accion: val(`H${r}`) || "",
          responsable: val(`K${r}`) || "", fecha: "", estado: val(`N${r}`) || "",
        });
      }
      setObservaciones(nuevasObs.length ? nuevasObs : [{ descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }]);

      setArchivoBase(file);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea un Acta generada por este sistema.");
    } finally {
      setCargando(false);
    }
  }

  const saldoContractual = (numES(valorContractual) || 0) - (numES(valorActasAnteriores) || 0) - (numES(valorPresenteActa) || 0);
  const porcentajeEjecutado = valorContractual ? (((numES(valorActasAnteriores) || 0) + (numES(valorPresenteActa) || 0)) / numES(valorContractual)) * 100 : 0;

  function actualizarFoto(idx, nuevaFoto) { setFotos((fs) => fs.map((f, i) => (i === idx ? nuevaFoto : f))); }
  function quitarFoto(idx) { setFotos((fs) => fs.map((f, i) => (i === idx ? { file: null, previewUrl: null } : f))); }

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-acta.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const fotoEstilo = fotoLibro(workbook);
      const ws = workbook.getWorksheet("Acta de Obra");

      ws.getCell("C11").value = actaNo;
      ws.getCell("J12").value = contratoNo;
      ws.getCell("C12").value = proyecto;
      ws.getCell("C13").value = contratante;
      ws.getCell("J13").value = contratista;
      ws.getCell("C14").value = interventoria;
      ws.getCell("J14").value = ubicacion;
      ws.getCell("C15").value = aFechaDDMMYYYY(fechaActa);
      ws.getCell("F15").value = aFechaDDMMYYYY(desde);
      ws.getCell("H15").value = aFechaDDMMYYYY(hasta);
      ws.getCell("J15").value = aFechaDDMMYYYY(hasta);
      ws.getCell("D16").value = objeto;

      ws.getCell("F20").value = numES(diasContractuales) || 0;
      ws.getCell("J20").value = numES(diasAvance) || 0;
      ws.getCell("N20").value = (numES(porcentajeTiempo) || 0) / 100;
      ws.getCell("C21").value = contratanteNombre; ws.getCell("C22").value = contratanteCargo;
      ws.getCell("H21").value = contratistaNombre; ws.getCell("H22").value = contratistaCargo;
      ws.getCell("L21").value = interventorNombre; ws.getCell("L22").value = interventorCargo;

      items.forEach((it, i) => {
        if (!it.actividad) return;
        const r = 26 + i;
        if (r > 33) return;
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = it.actividad;
        ws.getCell(`E${r}`).value = it.unidad;
        ws.getCell(`F${r}`).value = numES(it.cantContractual) || 0;
        ws.getCell(`G${r}`).value = numES(it.cantAnterior) || 0;
        ws.getCell(`H${r}`).value = numES(it.cantActa) || 0;
        ws.getCell(`I${r}`).value = numES(it.precioUnitario) || 0;
        ws.getCell(`N${r}`).value = it.observacion;
      });

      ws.getCell("E36").value = numES(valorContractual) || 0;
      ws.getCell("H36").value = numES(valorActasAnteriores) || 0;
      ws.getCell("H37").value = numES(anticipo) || 0;
      ws.getCell("K37").value = numES(amortizacion) || 0;
      ws.getCell("N37").value = numES(retenciones) || 0;

      ws.getCell("C41").value = calidadEstado; ws.getCell("A42").value = calidadRef;
      ws.getCell("G41").value = sstEstado; ws.getCell("F42").value = sstRef;
      ws.getCell("L41").value = ambientalEstado; ws.getCell("K42").value = ambientalRef;

      observaciones.forEach((o, i) => {
        if (!o.descripcion) return;
        const r = 46 + i;
        if (r > 51) return;
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = o.descripcion;
        ws.getCell(`E${r}`).value = o.clasificacion;
        ws.getCell(`H${r}`).value = o.accion;
        ws.getCell(`K${r}`).value = o.responsable;
        ws.getCell(`M${r}`).value = o.fecha ? aFechaDDMMYYYY(o.fecha) : "";
        ws.getCell(`N${r}`).value = o.estado;
      });

      ws.getCell("A75").value = elabCargo ? `${elabNombre} - ${elabCargo}` : elabNombre;
      ws.getCell("E75").value = revCargo ? `${revNombre} - ${revCargo}` : revNombre;
      ws.getCell("I75").value = aprCargo ? `${aprNombre} - ${aprCargo}` : aprNombre;
      ws.getCell("M75").value = aFechaDDMMYYYY(fechaLocalHoy());

      try {
        const clave = "ryr_actas_valor_presente";
        const guardadas = JSON.parse(localStorage.getItem(clave) || "{}");
        guardadas[actaNo || fechaLocalHoy()] = {
          actaNo, proyecto,
          valor: numES(valorPresenteActa) || 0,
          fecha: fechaLocalHoy(),
        };
        localStorage.setItem(clave, JSON.stringify(guardadas));
      } catch (e) {
        console.warn("No se pudo guardar el valor del acta en memoria local:", e);
      }

      try {
        const claveAcum = "ryr_acta_acumulado";
        const acum = JSON.parse(localStorage.getItem(claveAcum) || "{}");
        items.forEach((it) => {
          if (!it.actividad) return;
          const anterior = numES(it.cantAnterior) || 0;
          const estaActa = numES(it.cantActa) || 0;
          acum[it.actividad] = anterior + estaActa;
        });
        localStorage.setItem(claveAcum, JSON.stringify(acum));
      } catch (e) {
        console.warn("No se pudo guardar el acumulado de cantidades:", e);
      }

      estilarEscritos(workbook, fotoEstilo);

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const nombreArchivo = `Acta_de_Obra_${actaNo || fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url; a2.download = nombreArchivo;
      document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
      URL.revokeObjectURL(url);
      try { localStorage.removeItem("ryr_borrador_acta"); } catch (e) {}
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
        <div className="text-[15px] font-bold mb-2" style={{ color: NAVY }}>Tienes un Acta de Obra sin terminar</div>
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
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} onNavegar={onNavegar} vistaActual="acta" />
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
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Acta de Obra</div>
            <IndicadorTipoProyecto claveBorrador="ryr_borrador_acta" onVolver={onVolver} />
            <div className="text-[11px]" style={{ color: GOLD }}>Reformas y Remodelaciones</div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setModo("nuevo"); setArchivoBase(null); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Acta nueva
          </button>
          <button onClick={() => setModo("actualizar")} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}>
            Actualizar existente
          </button>
        </div>
        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>Sube el Acta que quieres actualizar</label>
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
              setContratoNo(d.noContrato || "");
              setContratista(d.contratista || "");
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
        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>1. IDENTIFICACIÓN</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Acta No."><Input value={actaNo} onChange={(e) => setActaNo(e.target.value)} /></Campo>
            <Campo label="Contrato No."><Input value={contratoNo} onChange={(e) => setContratoNo(e.target.value)} /></Campo>
          </div>
          <Campo label="Proyecto / Obra"><Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Contratante"><Input value={contratante} onChange={(e) => setContratante(e.target.value)} /></Campo>
            <Campo label="Contratista"><Input value={contratista} onChange={(e) => setContratista(e.target.value)} /></Campo>
          </div>
          <Campo label="Interventoría"><Input value={interventoria} onChange={(e) => setInterventoria(e.target.value)} /></Campo>
          <Campo label="Ubicación"><BuscadorTexto value={ubicacion} onChange={setUbicacion} catalogo={CATALOGO_CIUDADES} campo="ciudad" placeholder="Ciudad..." /></Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Fecha del acta"><Input type="date" value={fechaActa} onChange={(e) => setFechaActa(e.target.value)} /></Campo>
            <Campo label="Desde"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
            <Campo label="Hasta"><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
          </div>
          <Campo label="Objeto / alcance resumido">
            <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2.5 text-[13px]" style={{ borderColor: LINE }} />
          </Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>2. PARTICIPANTES Y CONTROL DEL PERÍODO</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Campo label="Días contractuales"><Input type="text" inputMode="decimal" value={diasContractuales} onChange={(e) => setDiasContractuales(e.target.value)} /></Campo>
            <Campo label="Días de avance"><Input type="text" inputMode="decimal" value={diasAvance} onChange={(e) => setDiasAvance(e.target.value)} /></Campo>
            <Campo label="% Tiempo avance"><Input type="text" inputMode="decimal" value={porcentajeTiempo} onChange={(e) => setPorcentajeTiempo(e.target.value)} /></Campo>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                const lista = JSON.parse(localStorage.getItem("ryr_avance_diario_actividades") || "[]");
                if (!lista.length) { alert("No hay Informes Diarios guardados todavía. Genera al menos uno primero."); return; }
                if (!hasta) { alert('Primero llena la fecha "Hasta" del acta (arriba).'); return; }
                const fechasUnicas = new Set(
                  lista
                    .filter((r) => r.fecha && new Date(r.fecha) <= new Date(hasta))
                    .map((r) => r.fecha)
                );
                const da = fechasUnicas.size;
                const dc = numES(diasContractuales) || 0;
                const pt = dc > 0 ? Math.min(100, (da / dc) * 100) : 0;
                setDiasAvance(String(da));
                if (dc > 0) setPorcentajeTiempo(pt.toFixed(1));
              } catch (err) {
                alert("No se pudieron leer los Informes Diarios guardados.");
              }
            }}
            className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Calcular desde Informe Diario
          </button>
          <div className="text-[11.5px] font-bold mt-1 mb-0.5" style={{ color: NAVY }}>Firmantes del acta</div>
          <div className="text-[10.5px] text-gray-500 mb-2.5">Persona que firma el acta por cada parte (nombre y cargo). Estos datos aparecen en el bloque de firmas del Excel.</div>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Firma por el Contratante</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <CampoNombre value={contratanteNombre} onChange={setContratanteNombre} placeholder="Nombre del firmante" />
            <BuscadorTexto value={contratanteCargo} onChange={setContratanteCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Firma por el Contratista</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <CampoNombre value={contratistaNombre} onChange={setContratistaNombre} placeholder="Nombre del firmante" />
            <BuscadorTexto value={contratistaCargo} onChange={setContratistaCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: NAVY }}>Firma por la Interventoría</div>
          <div className="grid grid-cols-2 gap-2">
            <CampoNombre value={interventorNombre} onChange={setInterventorNombre} placeholder="Nombre del firmante" />
            <BuscadorTexto value={interventorCargo} onChange={setInterventorCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>3. AVANCE FÍSICO Y CANTIDADES EJECUTADAS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {(desde && hasta) && (
            <button
              type="button"
              onClick={() => {
                try {
                  const lista = JSON.parse(localStorage.getItem("ryr_avance_diario_actividades") || "[]");
                  const nuevos = items.map((it) => {
                    if (!it.actividad) return it;
                    const suma = lista
                      .filter((e) => e.actividad.trim().toLowerCase() === it.actividad.trim().toLowerCase() && e.fecha >= desde && e.fecha <= hasta)
                      .reduce((acc, e) => acc + e.cantidad, 0);
                    return suma > 0 ? { ...it, cantActa: String(suma) } : it;
                  });
                  setItems(nuevos);
                  alert(`Sumado desde Informes Diarios entre ${desde} y ${hasta}.`);
                } catch (err) {
                  alert("No se pudo leer la memoria de Informes Diarios.");
                }
              }}
              className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
              style={{ background: NAVY }}
            >
              ⚡ Calcular "Cant. esta acta" desde Informes Diarios ({desde} a {hasta})
            </button>
          )}
          {items.map((it, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>Ítem #{i + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-[11px] text-red-500">Quitar</button>
                )}
              </div>
              <BuscadorTexto
                value={it.actividad}
                onChange={(v) => {
                  const copia = [...items];
                  let cantContractual = copia[i].cantContractual;
                  let cantAnterior = copia[i].cantAnterior;
                  let precioUnitario = copia[i].precioUnitario;
                  try {
                    const pres = JSON.parse(localStorage.getItem("ryr_presupuesto_cantidades") || "{}");
                    const match = Object.values(pres).find((p) => p.actividad === v);
                    if (match && match.cantidad) cantContractual = String(match.cantidad);
                  } catch (e) {}
                  try {
                    const acum = JSON.parse(localStorage.getItem("ryr_acta_acumulado") || "{}");
                    if (acum[v] !== undefined) cantAnterior = String(acum[v]);
                  } catch (e) {}
                  try {
                    const apus = JSON.parse(localStorage.getItem("ryr_apus_guardados") || "{}");
                    const apu = apus[v.trim().toLowerCase()];
                    if (apu && apu.total) precioUnitario = String(apu.total);
                  } catch (e) {}
                  copia[i] = { ...copia[i], actividad: v, unidad: (infoActividad(v, tipoActivo) || {}).unidad || copia[i].unidad, cantContractual, cantAnterior, precioUnitario };
                  setItems(copia);
                }}
                catalogo={listaActividades}
                placeholder="Actividad / partida"
              />
              {it.unidad && <div className="text-[10.5px] text-gray-500 mt-1 mb-1.5">Unidad: {it.unidad} · Cant. contractual y anterior se sugieren solas desde Presupuesto y actas anteriores (editables)</div>}
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Cant. contractual" type="text" inputMode="decimal" value={it.cantContractual} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantContractual: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Cant. anterior" type="text" inputMode="decimal" value={it.cantAnterior} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantAnterior: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <input placeholder="Cant. esta acta" type="text" inputMode="decimal" value={it.cantActa} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], cantActa: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Precio unitario" type="text" inputMode="decimal" value={it.precioUnitario} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], precioUnitario: e.target.value }; setItems(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="mt-1.5">
                {it.cantActa && it.precioUnitario && (
                  <div className="text-[11px] text-gray-500 mt-1">Valor de esta actividad: {formatNum(numES(it.cantActa) * numES(it.precioUnitario), 0, 3)}</div>
                )}
              </div>
              <input placeholder="Observación" value={it.observacion} onChange={(e) => { const c = [...items]; c[i] = { ...c[i], observacion: e.target.value }; setItems(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mt-1.5" style={{ borderColor: LINE }} />
            </div>
          ))}
          {items.length < 8 && (
            <button onClick={() => setItems([...items, itemVacio()])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar ítem
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>4. CONTROL ECONÓMICO DEL ACTA</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor contractual"><Input type="text" inputMode="decimal" value={valorContractual} onChange={(e) => setValorContractual(e.target.value)} /></Campo>
            <Campo label="Valor actas anteriores"><Input type="text" inputMode="decimal" value={valorActasAnteriores} onChange={(e) => setValorActasAnteriores(e.target.value)} /></Campo>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                const guardadas = JSON.parse(localStorage.getItem("ryr_actas_valor_presente") || "{}");
                const suma = Object.values(guardadas)
                  .filter((a) => a.actaNo !== actaNo && (!proyecto || a.proyecto === proyecto))
                  .reduce((acc, a) => acc + (numES(a.valor) || 0), 0);
                setValorActasAnteriores(String(Math.round(suma)));
                alert(`Sumado desde ${Object.values(guardadas).filter((a) => a.actaNo !== actaNo && (!proyecto || a.proyecto === proyecto)).length} acta(s) anterior(es) del mismo proyecto.`);
              } catch (err) {
                alert("No se pudo leer las actas guardadas.");
              }
            }}
            className="w-full text-center py-2.5 rounded-lg text-[12px] font-semibold text-white mb-3"
            style={{ background: NAVY }}
          >
            ⚡ Sumar desde actas anteriores guardadas (mismo proyecto)
          </button>
          <Campo label="Valor presente acta">
            <div className="w-full border rounded-lg px-3 py-2.5 text-[14px] font-semibold" style={{ borderColor: LINE, background: PAPER, color: NAVY }}>
              {formatNum(valorPresenteActa, 0, 3)}
            </div>
          </Campo>
          <div className="text-[11px] text-gray-500 mb-3">Se calcula solo (Cant. esta acta × Precio unitario, sumado de todas las actividades). <b>Nota:</b> si tus precios de APU's son de costo directo, súmale el AIU/IVA al precio unitario de cada actividad, o usa el "Valor Total" de Presupuesto (que ya incluye AIU) como referencia.</div>
          <div className="grid grid-cols-3 gap-2">
            <Campo label="Anticipo"><Input type="text" inputMode="decimal" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} /></Campo>
            <Campo label="Amortización"><Input type="text" inputMode="decimal" value={amortizacion} onChange={(e) => setAmortizacion(e.target.value)} /></Campo>
            <Campo label="Retenciones"><Input type="text" inputMode="decimal" value={retenciones} onChange={(e) => setRetenciones(e.target.value)} /></Campo>
          </div>
          <div className="mt-2 p-2 rounded-lg text-center" style={{ background: "#F0F2F5" }}>
            <div className="text-[11px] text-gray-500">Saldo contractual: {formatNum(saldoContractual, 0, 3)} · % Ejecutado: {porcentajeEjecutado.toFixed(1)}%</div>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>5. CALIDAD, SST Y AMBIENTAL</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {[
            ["Calidad", calidadEstado, setCalidadEstado, calidadRef, setCalidadRef],
            ["SST", sstEstado, setSstEstado, sstRef, setSstRef],
            ["Ambiental", ambientalEstado, setAmbientalEstado, ambientalRef, setAmbientalRef],
          ].map(([label, estado, setEstado, ref, setRef], i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>{label}</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-[13px]" style={{ borderColor: LINE }}>
                  <option>CUMPLE</option>
                  <option>NO CUMPLE</option>
                  <option>N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold mb-1" style={{ color: NAVY }}>Referencia</label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>6. OBSERVACIONES Y COMPROMISOS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          {observaciones.map((o, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-b-0" style={{ borderColor: LINE }}>
              <input placeholder="Descripción / hallazgo" value={o.descripcion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], descripcion: e.target.value }; setObservaciones(c); }} className="w-full border rounded px-2 py-1.5 text-[12px] mb-1.5" style={{ borderColor: LINE }} />
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <input placeholder="Clasificación" value={o.clasificacion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], clasificacion: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input placeholder="Acción / compromiso" value={o.accion} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], accion: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input placeholder="Responsable" value={o.responsable} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], responsable: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
                <input type="date" value={o.fecha} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], fecha: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[11px]" style={{ borderColor: LINE }} />
                <select value={o.estado} onChange={(e) => { const c = [...observaciones]; c[i] = { ...c[i], estado: e.target.value }; setObservaciones(c); }} className="border rounded px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }}>
                  <option value="">Estado...</option>
                  <option>Abierto</option>
                  <option>En proceso</option>
                  <option>Cerrado</option>
                  <option>Pendiente por terceros</option>
                </select>
              </div>
            </div>
          ))}
          {observaciones.length < 6 && (
            <button onClick={() => setObservaciones([...observaciones, { descripcion: "", clasificacion: "", accion: "", responsable: "", fecha: "", estado: "" }])} className="w-full py-2 rounded-lg text-[12px] font-semibold border-2" style={{ borderColor: GOLD, color: NAVY }}>
              + Agregar observación
            </button>
          )}
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>9. APROBACIONES Y FIRMAS</div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="text-[11.5px] font-semibold mb-1.5" style={{ color: NAVY }}>Elaboró / Contratista</div>
          <CampoNombre value={elabNombre} onChange={setElabNombre} />
          <div className="h-2" />
          <BuscadorTexto value={elabCargo} onChange={setElabCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Revisó / Supervisión</div>
          <CampoNombre value={revNombre} onChange={setRevNombre} />
          <div className="h-2" />
          <BuscadorTexto value={revCargo} onChange={setRevCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />

          <div className="text-[11.5px] font-semibold mb-1.5 mt-3" style={{ color: NAVY }}>Aprobó / Contratante</div>
          <CampoNombre value={aprNombre} onChange={setAprNombre} />
          <div className="h-2" />
          <BuscadorTexto value={aprCargo} onChange={setAprCargo} catalogo={CATALOGO_CARGOS} placeholder="Cargo" />
        </div>

        <button onClick={generarExcel} disabled={generando} className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]" style={{ background: generando ? "#9AA0A8" : GOLD }}>
          {generando ? "Generando..." : "Descargar Acta de Obra en Excel"}
        </button>
      </div>
    </div>
  );
}
