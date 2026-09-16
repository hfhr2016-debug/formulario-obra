import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const CAPITULOS = [{"nombre": "PRELIMINARES", "items_start": 15, "items": [{"cod": "01.01.01", "actividad": "Replanteo general de ejes y niveles", "unidad": "ml"}, {"cod": "01.01.02", "actividad": "Cerramiento provisional de obra", "unidad": "ml"}, {"cod": "01.01.03", "actividad": "Instalación de campamento y oficinas provisionales", "unidad": "m²"}, {"cod": "01.01.04", "actividad": "Adecuación de área de almacenamiento", "unidad": "m²"}, {"cod": "01.01.05", "actividad": "Señalización preventiva e informativa de obra", "unidad": "und"}, {"cod": "01.01.06", "actividad": "Instalaciones provisionales de agua y energía", "unidad": "gl"}, {"cod": "01.01.07", "actividad": "Protección de elementos existentes", "unidad": "m²"}, {"cod": "01.01.08", "actividad": "Desmonte y limpieza inicial", "unidad": "m²"}, {"cod": "01.01.09", "actividad": "Demoliciones preliminares", "unidad": "m³"}]}, {"nombre": "MOVIMIENTO DE TIERRAS", "items_start": 27, "items": [{"cod": "02.01.01", "actividad": "Excavación manual en material común", "unidad": "m³"}, {"cod": "02.01.02", "actividad": "Excavación mecánica", "unidad": "m³"}, {"cod": "02.01.03", "actividad": "Excavación en roca", "unidad": "m³"}, {"cod": "02.01.04", "actividad": "Perfilado y conformación de excavaciones", "unidad": "m²"}, {"cod": "02.02.01", "actividad": "Relleno con material seleccionado compactado", "unidad": "m³"}, {"cod": "02.02.02", "actividad": "Relleno con material proveniente de excavación", "unidad": "m³"}, {"cod": "02.02.03", "actividad": "Suministro, extendido y compactación de subbase", "unidad": "m³"}, {"cod": "02.02.04", "actividad": "Suministro, extendido y compactación de base granular", "unidad": "m³"}, {"cod": "02.03.01", "actividad": "Cargue de material sobrante", "unidad": "m³"}, {"cod": "02.03.02", "actividad": "Transporte de material sobrante", "unidad": "m³"}, {"cod": "02.03.03", "actividad": "Disposición final de sobrantes", "unidad": "m³"}]}, {"nombre": "CIMENTACIONES", "items_start": 41, "items": [{"cod": "03.01.01", "actividad": "Concreto de limpieza / solado", "unidad": "m³"}, {"cod": "03.01.02", "actividad": "Concreto para zapatas", "unidad": "m³"}, {"cod": "03.01.03", "actividad": "Concreto para vigas de cimentación", "unidad": "m³"}, {"cod": "03.01.04", "actividad": "Concreto para losas de cimentación", "unidad": "m³"}, {"cod": "03.01.05", "actividad": "Concreto para pedestales", "unidad": "m³"}, {"cod": "03.02.01", "actividad": "Acero de refuerzo en cimentación", "unidad": "kg"}, {"cod": "03.03.01", "actividad": "Formaleta para elementos de cimentación", "unidad": "m²"}]}, {"nombre": "ESTRUCTURA", "items_start": 51, "items": [{"cod": "04.01.01", "actividad": "Concreto para columnas", "unidad": "m³"}, {"cod": "04.01.02", "actividad": "Concreto para vigas", "unidad": "m³"}, {"cod": "04.01.03", "actividad": "Concreto para losas", "unidad": "m³"}, {"cod": "04.01.04", "actividad": "Concreto para escaleras", "unidad": "m³"}, {"cod": "04.01.05", "actividad": "Concreto para muros estructurales", "unidad": "m³"}, {"cod": "04.02.01", "actividad": "Acero de refuerzo de columnas", "unidad": "kg"}, {"cod": "04.02.02", "actividad": "Acero de refuerzo de vigas", "unidad": "kg"}, {"cod": "04.02.03", "actividad": "Acero de refuerzo de losas", "unidad": "kg"}, {"cod": "04.03.01", "actividad": "Formaleta de columnas", "unidad": "m²"}, {"cod": "04.03.02", "actividad": "Formaleta de vigas", "unidad": "m²"}, {"cod": "04.03.03", "actividad": "Formaleta de losas", "unidad": "m²"}, {"cod": "04.03.04", "actividad": "Formaleta de escaleras", "unidad": "m²"}, {"cod": "04.04.01", "actividad": "Suministro y montaje de perfiles metálicos", "unidad": "kg"}, {"cod": "04.04.02", "actividad": "Placas, pernos y conexiones metálicas", "unidad": "kg"}]}, {"nombre": "MAMPOSTERÍA", "items_start": 68, "items": [{"cod": "05.01.01", "actividad": "Mampostería en bloque de concreto", "unidad": "m²"}, {"cod": "05.01.02", "actividad": "Mampostería en ladrillo", "unidad": "m²"}, {"cod": "05.01.03", "actividad": "Mampostería estructural", "unidad": "m²"}, {"cod": "05.01.04", "actividad": "Muros en sistema liviano / drywall", "unidad": "m²"}, {"cod": "05.02.01", "actividad": "Dinteles sobre vanos", "unidad": "ml"}, {"cod": "05.02.02", "actividad": "Alfajías y remates", "unidad": "ml"}, {"cod": "05.02.03", "actividad": "Anclajes y refuerzos de mampostería", "unidad": "und"}]}, {"nombre": "CUBIERTAS", "items_start": 78, "items": [{"cod": "06.01.01", "actividad": "Estructura metálica o de madera para cubierta", "unidad": "kg"}, {"cod": "06.01.02", "actividad": "Cerchas y elementos estructurales", "unidad": "kg"}, {"cod": "06.02.01", "actividad": "Suministro e instalación de teja", "unidad": "m²"}, {"cod": "06.02.02", "actividad": "Impermeabilización de cubierta", "unidad": "m²"}, {"cod": "06.02.03", "actividad": "Aislamiento térmico/acústico", "unidad": "m²"}, {"cod": "06.03.01", "actividad": "Canales de aguas lluvias", "unidad": "ml"}, {"cod": "06.03.02", "actividad": "Bajantes de aguas lluvias", "unidad": "ml"}]}, {"nombre": "IMPERMEABILIZACIONES", "items_start": 88, "items": [{"cod": "07.01.01", "actividad": "Impermeabilización de losas y terrazas", "unidad": "m²"}, {"cod": "07.01.02", "actividad": "Impermeabilización de muros", "unidad": "m²"}, {"cod": "07.01.03", "actividad": "Impermeabilización de zonas húmedas", "unidad": "m²"}]}, {"nombre": "PAÑETES Y REVOQUES", "items_start": 94, "items": [{"cod": "08.01.01", "actividad": "Pañete / revoque interior", "unidad": "m²"}, {"cod": "08.01.02", "actividad": "Pañete / revoque exterior", "unidad": "m²"}, {"cod": "08.01.03", "actividad": "Pañete impermeabilizado", "unidad": "m²"}, {"cod": "08.01.04", "actividad": "Estuco plástico o tradicional", "unidad": "m²"}]}, {"nombre": "PISOS Y ENCHAPES", "items_start": 101, "items": [{"cod": "09.01.01", "actividad": "Mortero de nivelación", "unidad": "m²"}, {"cod": "09.01.02", "actividad": "Piso cerámico", "unidad": "m²"}, {"cod": "09.01.03", "actividad": "Piso en porcelanato", "unidad": "m²"}, {"cod": "09.01.04", "actividad": "Piso vinílico", "unidad": "m²"}, {"cod": "09.01.05", "actividad": "Piso laminado", "unidad": "m²"}, {"cod": "09.02.01", "actividad": "Enchape cerámico en muros", "unidad": "m²"}, {"cod": "09.02.02", "actividad": "Guardaescoba", "unidad": "ml"}, {"cod": "09.02.03", "actividad": "Juntas de dilatación / construcción", "unidad": "ml"}]}, {"nombre": "PINTURA", "items_start": 112, "items": [{"cod": "10.01.01", "actividad": "Pintura vinílica interior", "unidad": "m²"}, {"cod": "10.01.02", "actividad": "Pintura exterior", "unidad": "m²"}, {"cod": "10.01.03", "actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "m²"}, {"cod": "10.01.04", "actividad": "Pintura anticorrosiva", "unidad": "m²"}, {"cod": "10.01.05", "actividad": "Sellador / imprimante", "unidad": "m²"}]}, {"nombre": "CARPINTERÍA", "items_start": 120, "items": [{"cod": "11.01.01", "actividad": "Puertas de madera", "unidad": "und"}, {"cod": "11.01.02", "actividad": "Muebles fijos de madera", "unidad": "ml"}, {"cod": "11.02.01", "actividad": "Puertas metálicas", "unidad": "und"}, {"cod": "11.02.02", "actividad": "Barandas metálicas", "unidad": "ml"}, {"cod": "11.02.03", "actividad": "Pasamanos", "unidad": "ml"}, {"cod": "11.03.01", "actividad": "Ventanas de aluminio", "unidad": "m²"}, {"cod": "11.03.02", "actividad": "Divisiones de aluminio", "unidad": "m²"}]}, {"nombre": "VIDRIOS", "items_start": 130, "items": [{"cod": "12.01.01", "actividad": "Vidrio templado", "unidad": "m²"}, {"cod": "12.01.02", "actividad": "Vidrio laminado", "unidad": "m²"}, {"cod": "12.01.03", "actividad": "Espejos", "unidad": "m²"}, {"cod": "12.01.04", "actividad": "Sellos y silicona", "unidad": "ml"}]}, {"nombre": "INSTALACIONES HIDROSANITARIAS", "items_start": 137, "items": [{"cod": "13.01.01", "actividad": "Tubería de agua fría", "unidad": "ml"}, {"cod": "13.01.02", "actividad": "Tubería de agua caliente", "unidad": "ml"}, {"cod": "13.01.03", "actividad": "Válvulas y accesorios", "unidad": "und"}, {"cod": "13.02.01", "actividad": "Tubería sanitaria", "unidad": "ml"}, {"cod": "13.02.02", "actividad": "Tubería de aguas lluvias", "unidad": "ml"}, {"cod": "13.02.03", "actividad": "Cajas de inspección", "unidad": "und"}, {"cod": "13.03.01", "actividad": "Aparatos sanitarios", "unidad": "und"}, {"cod": "13.03.02", "actividad": "Lavamanos", "unidad": "und"}, {"cod": "13.03.03", "actividad": "Griferías", "unidad": "und"}, {"cod": "13.03.04", "actividad": "Duchas", "unidad": "und"}, {"cod": "13.04.01", "actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "gl"}]}, {"nombre": "INSTALACIONES ELÉCTRICAS", "items_start": 151, "items": [{"cod": "14.01.01", "actividad": "Tubería/conduit eléctrica", "unidad": "ml"}, {"cod": "14.01.02", "actividad": "Bandejas portacables", "unidad": "ml"}, {"cod": "14.01.03", "actividad": "Cajas eléctricas", "unidad": "und"}, {"cod": "14.02.01", "actividad": "Cableado de fuerza", "unidad": "ml"}, {"cod": "14.02.02", "actividad": "Cableado de iluminación", "unidad": "ml"}, {"cod": "14.02.03", "actividad": "Tableros eléctricos", "unidad": "und"}, {"cod": "14.03.01", "actividad": "Tomacorrientes", "unidad": "und"}, {"cod": "14.03.02", "actividad": "Interruptores", "unidad": "und"}, {"cod": "14.03.03", "actividad": "Luminarias", "unidad": "und"}, {"cod": "14.04.01", "actividad": "Sistema de puesta a tierra", "unidad": "gl"}, {"cod": "14.05.01", "actividad": "Pruebas y certificaciones", "unidad": "gl"}]}, {"nombre": "COMUNICACIONES Y SEGURIDAD", "items_start": 165, "items": [{"cod": "15.01.01", "actividad": "Cableado estructurado de datos", "unidad": "ml"}, {"cod": "15.01.02", "actividad": "Rack de comunicaciones", "unidad": "und"}, {"cod": "15.02.01", "actividad": "Cámaras y sistema CCTV", "unidad": "und"}, {"cod": "15.02.02", "actividad": "Control de acceso", "unidad": "und"}, {"cod": "15.02.03", "actividad": "Sistema de citofonía", "unidad": "und"}, {"cod": "15.03.01", "actividad": "Sistema de detección de incendios", "unidad": "gl"}]}, {"nombre": "CLIMATIZACIÓN Y VENTILACIÓN", "items_start": 174, "items": [{"cod": "16.01.01", "actividad": "Equipos de aire acondicionado", "unidad": "und"}, {"cod": "16.01.02", "actividad": "Ductos de ventilación", "unidad": "m²"}, {"cod": "16.01.03", "actividad": "Tubería de refrigerante", "unidad": "ml"}, {"cod": "16.01.04", "actividad": "Rejillas y difusores", "unidad": "und"}]}, {"nombre": "GAS", "items_start": 181, "items": [{"cod": "17.01.01", "actividad": "Red interna de gas", "unidad": "ml"}, {"cod": "17.01.02", "actividad": "Válvulas y accesorios", "unidad": "und"}, {"cod": "17.01.03", "actividad": "Pruebas y certificación", "unidad": "gl"}]}, {"nombre": "URBANISMO Y EXTERIORES", "items_start": 187, "items": [{"cod": "18.01.01", "actividad": "Construcción de andenes", "unidad": "m²"}, {"cod": "18.01.02", "actividad": "Placas de concreto exteriores", "unidad": "m³"}, {"cod": "18.01.03", "actividad": "Pavimento en adoquín", "unidad": "m²"}, {"cod": "18.02.01", "actividad": "Sardineles y bordillos", "unidad": "ml"}, {"cod": "18.03.01", "actividad": "Sumideros exteriores", "unidad": "und"}, {"cod": "18.04.01", "actividad": "Suministro y extendido de tierra vegetal", "unidad": "m³"}, {"cod": "18.04.02", "actividad": "Siembra y jardinería", "unidad": "m²"}]}, {"nombre": "OBRAS COMPLEMENTARIAS", "items_start": 197, "items": [{"cod": "19.01.01", "actividad": "Rejas metálicas", "unidad": "m²"}, {"cod": "19.01.02", "actividad": "Escaleras metálicas", "unidad": "kg"}, {"cod": "19.01.03", "actividad": "Elementos metálicos especiales", "unidad": "kg"}, {"cod": "19.02.01", "actividad": "Mobiliario fijo de obra", "unidad": "und"}]}, {"nombre": "ASEO, ENTREGA Y CIERRE", "items_start": 204, "items": [{"cod": "20.01.01", "actividad": "Limpieza gruesa y fina de obra", "unidad": "m²"}, {"cod": "20.01.02", "actividad": "Limpieza final para entrega", "unidad": "m²"}, {"cod": "20.02.01", "actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "gl"}, {"cod": "20.02.01", "actividad": "Actualización de planos récord / as-built", "unidad": "gl"}, {"cod": "20.02.02", "actividad": "Entrega, manuales y acta de recibo", "unidad": "gl"}]}, {"nombre": "ASCENSORES", "items_start": 212, "items": [{"cod": "21.01.01", "actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "und"}]}, {"nombre": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "items_start": 216, "items": [{"cod": "22.01.01", "actividad": "Estudio de suelos y geotecnia", "unidad": "gl"}, {"cod": "22.01.02", "actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "gl"}, {"cod": "22.02.01", "actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "gl"}, {"cod": "22.02.02", "actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "gl"}]}];

function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function formatoMoneda(n) {
  return "$ " + Math.round(n || 0).toLocaleString("es-CO");
}

function Campo({ label, unidad, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-semibold mb-1" style={{ color: NAVY }}>
        {label} {unidad && <span className="font-normal text-gray-400">({unidad})</span>}
      </label>
      {children}
    </div>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2.5 text-[14px]"
      style={{ borderColor: LINE }}
    />
  );
}

function CapituloAcordeon({ capitulo, valores, setValor, indexCap }) {
  const [abierto, setAbierto] = useState(false);
  const totalCap = capitulo.items.reduce((acc, it, i) => {
    const v = valores[`${indexCap}-${i}`];
    if (!v) return acc;
    return acc + (Number(v.cant) || 0) * (Number(v.precio) || 0);
  }, 0);
  const itemsLlenos = capitulo.items.filter((_, i) => {
    const v = valores[`${indexCap}-${i}`];
    return v && Number(v.cant) > 0;
  }).length;

  return (
    <div className="border rounded-lg mb-2 overflow-hidden" style={{ borderColor: LINE }}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ background: NAVY }}
      >
        <div className="text-left">
          <div className="text-white font-bold text-[12.5px]">{capitulo.nombre}</div>
          <div className="text-[10.5px]" style={{ color: GOLD }}>
            {itemsLlenos}/{capitulo.items.length} ítems · {formatoMoneda(totalCap)}
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
          style={{ transform: abierto ? "rotate(180deg)" : "none" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <div className="p-2">
          {capitulo.items.map((it, i) => {
            const key = `${indexCap}-${i}`;
            const v = valores[key] || { cant: "", precio: "" };
            const subtotal = (Number(v.cant) || 0) * (Number(v.precio) || 0);
            return (
              <div key={i} className="py-2 border-b last:border-b-0" style={{ borderColor: LINE }}>
                <div className="text-[12px] mb-1" style={{ color: NAVY }}>
                  {it.actividad} <span className="text-gray-400">({it.unidad})</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <input
                    placeholder="Cant."
                    type="number"
                    value={v.cant}
                    onChange={(e) => setValor(key, { ...v, cant: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-[12.5px] min-w-0"
                    style={{ borderColor: LINE }}
                  />
                  <input
                    placeholder="Vr Unit."
                    type="number"
                    value={v.precio}
                    onChange={(e) => setValor(key, { ...v, precio: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-[12.5px] min-w-0"
                    style={{ borderColor: LINE }}
                  />
                  <div className="flex-1 text-[12px] text-right font-medium" style={{ color: NAVY }}>
                    {formatoMoneda(subtotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FormularioPresupuesto({ onVolver }) {
  const [modo, setModo] = useState("nuevo"); // "nuevo" | "actualizar"
  const [archivoBase, setArchivoBase] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [proyecto, setProyecto] = useState("");
  const [pisos, setPisos] = useState("");
  const [sotanos, setSotanos] = useState("");
  const [areaLote, setAreaLote] = useState("");
  const [areaTipicaPiso, setAreaTipicaPiso] = useState("");
  const [areaSotanos, setAreaSotanos] = useState("");
  const [areaCubierta, setAreaCubierta] = useState("");
  const [numApartamentos, setNumApartamentos] = useState("");
  const [areaPromedioApto, setAreaPromedioApto] = useState("");
  const [numParqueaderos, setNumParqueaderos] = useState("");
  const [numAscensores, setNumAscensores] = useState("");
  const [alturaTotal, setAlturaTotal] = useState("");
  const [administracion, setAdministracion] = useState(10);
  const [imprevistos, setImprevistos] = useState(4);
  const [utilidad, setUtilidad] = useState(12);
  const [ivaUtilidad, setIvaUtilidad] = useState(19);

  const [valores, setValores] = useState({});
  const setValor = (key, v) => setValores((prev) => ({ ...prev, [key]: v }));

  const [generando, setGenerando] = useState(false);

  const totalGeneral = useMemo(() => {
    let t = 0;
    CAPITULOS.forEach((cap, ci) => {
      cap.items.forEach((_, ii) => {
        const v = valores[`${ci}-${ii}`];
        if (v) t += (Number(v.cant) || 0) * (Number(v.precio) || 0);
      });
    });
    return t;
  }, [valores]);

  async function cargarArchivoExistente(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsFicha = workbook.getWorksheet("Ficha Técnica del Proyecto");
      const wsPres = workbook.getWorksheet("Presupuesto ");

      if (wsFicha) {
        setProyecto(wsFicha.getCell("B2").value || "");
        setPisos(wsFicha.getCell("B9").value || "");
        setSotanos(wsFicha.getCell("B10").value || "");
        setAreaLote(wsFicha.getCell("B11").value || "");
        setAreaTipicaPiso(wsFicha.getCell("B12").value || "");
        setAreaSotanos(wsFicha.getCell("B14").value || "");
        setAreaCubierta(wsFicha.getCell("B15").value || "");
        setNumApartamentos(wsFicha.getCell("B17").value || "");
        setAreaPromedioApto(wsFicha.getCell("B18").value || "");
        setNumParqueaderos(wsFicha.getCell("B19").value || "");
        setNumAscensores(wsFicha.getCell("B20").value || "");
        setAlturaTotal(wsFicha.getCell("B21").value || "");
        const a = wsFicha.getCell("B24").value; if (typeof a === "number") setAdministracion(a * 100);
        const im = wsFicha.getCell("B25").value; if (typeof im === "number") setImprevistos(im * 100);
        const u = wsFicha.getCell("B26").value; if (typeof u === "number") setUtilidad(u * 100);
        const iv = wsFicha.getCell("B27").value; if (typeof iv === "number") setIvaUtilidad(iv * 100);
      }
      if (wsPres) {
        const nuevosValores = {};
        CAPITULOS.forEach((cap, ci) => {
          cap.items.forEach((it, ii) => {
            const fila = cap.items_start + ii;
            const cant = wsPres.getCell(`D${fila}`).value;
            const precio = wsPres.getCell(`E${fila}`).value;
            if (cant || precio) {
              nuevosValores[`${ci}-${ii}`] = { cant: cant || "", precio: precio || "" };
            }
          });
        });
        setValores(nuevosValores);
      }
      setArchivoBase(file);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer el archivo. Verifica que sea un Excel generado por este mismo sistema.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarCantidadesDeObra(file) {
    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Cantidades de Obra");
      if (!ws) {
        alert('No se encontró la hoja "Cantidades de Obra" en ese archivo.');
        return;
      }
      const mapa = {};
      let fila = 9;
      while (ws.getCell(`A${fila}`).value) {
        const actividad = (ws.getCell(`E${fila}`).value || "").toString().trim().toLowerCase();
        const cantidad = ws.getCell(`T${fila}`).value;
        if (actividad && cantidad) mapa[actividad] = cantidad;
        fila++;
      }
      let coincidencias = 0;
      const nuevos = { ...valores };
      CAPITULOS.forEach((cap, ci) => {
        cap.items.forEach((it, ii) => {
          const key = (it.actividad || "").trim().toLowerCase();
          if (mapa[key] !== undefined) {
            const k = `${ci}-${ii}`;
            nuevos[k] = { ...(nuevos[k] || { precio: "" }), cant: mapa[key] };
            coincidencias++;
          }
        });
      });
      setValores(nuevos);
      alert(`Cantidades cargadas: ${coincidencias} actividades coincidieron.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer el archivo de Cantidades de Obra.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarApus(files) {
    setCargando(true);
    try {
      const mapa = {};
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const ws = workbook.getWorksheet("Apu's");
        if (!ws) continue;
        const actividad = (ws.getCell("A10").value || "").toString().trim().toLowerCase();
        const total = ws.getCell("F47").value;
        if (actividad && total) mapa[actividad] = total;
      }
      let coincidencias = 0;
      const nuevos = { ...valores };
      CAPITULOS.forEach((cap, ci) => {
        cap.items.forEach((it, ii) => {
          const key = (it.actividad || "").trim().toLowerCase();
          if (mapa[key] !== undefined) {
            const k = `${ci}-${ii}`;
            nuevos[k] = { ...(nuevos[k] || { cant: "" }), precio: mapa[key] };
            coincidencias++;
          }
        });
      });
      setValores(nuevos);
      alert(`Precios cargados: ${coincidencias} de ${files.length} archivos de APU coincidieron con una actividad del catálogo.`);
    } catch (err) {
      console.error(err);
      alert("No se pudieron leer los archivos de APU.");
    } finally {
      setCargando(false);
    }
  }

  async function generarExcel() {
    setGenerando(true);
    try {
      let buffer;
      if (archivoBase) {
        buffer = await archivoBase.arrayBuffer();
      } else {
        const resp = await fetch("/plantilla-presupuesto.xlsx");
        buffer = await resp.arrayBuffer();
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsFicha = workbook.getWorksheet("Ficha Técnica del Proyecto");
      const wsPres = workbook.getWorksheet("Presupuesto ");

      wsFicha.getCell("B2").value = proyecto;
      wsFicha.getCell("B9").value = Number(pisos) || 0;
      wsFicha.getCell("B10").value = Number(sotanos) || 0;
      wsFicha.getCell("B11").value = Number(areaLote) || 0;
      wsFicha.getCell("B12").value = Number(areaTipicaPiso) || 0;
      wsFicha.getCell("B14").value = Number(areaSotanos) || 0;
      wsFicha.getCell("B15").value = Number(areaCubierta) || 0;
      wsFicha.getCell("B17").value = Number(numApartamentos) || 0;
      wsFicha.getCell("B18").value = Number(areaPromedioApto) || 0;
      wsFicha.getCell("B19").value = Number(numParqueaderos) || 0;
      wsFicha.getCell("B20").value = Number(numAscensores) || 0;
      wsFicha.getCell("B21").value = Number(alturaTotal) || 0;
      wsFicha.getCell("B24").value = Number(administracion) / 100;
      wsFicha.getCell("B25").value = Number(imprevistos) / 100;
      wsFicha.getCell("B26").value = Number(utilidad) / 100;
      wsFicha.getCell("B27").value = Number(ivaUtilidad) / 100;

      CAPITULOS.forEach((cap, ci) => {
        cap.items.forEach((it, ii) => {
          const fila = cap.items_start + ii;
          const v = valores[`${ci}-${ii}`];
          if (v && (v.cant || v.precio)) {
            wsPres.getCell(`D${fila}`).value = Number(v.cant) || 0;
            wsPres.getCell(`E${fila}`).value = Number(v.precio) || 0;
          }
        });
      });

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `Presupuesto_${(proyecto || "proyecto").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Hubo un error generando el Excel. Revisa la consola.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <button onClick={onVolver} className="flex items-center gap-1 text-white/80 text-[12.5px] mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Menú SAIEA OBRAS
            </button>
            <div className="text-white font-bold text-[16px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              PRESUPUESTO DE OBRA
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Incluye Ficha Técnica y Resumen conectados
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setModo("nuevo"); setArchivoBase(null); }}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "nuevo" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}
          >
            Proyecto nuevo
          </button>
          <button
            onClick={() => setModo("actualizar")}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-2"
            style={modo === "actualizar" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: LINE, color: NAVY }}
          >
            Actualizar existente
          </button>
        </div>

        {modo === "actualizar" && (
          <div className="mb-4 p-3 border rounded-lg" style={{ borderColor: LINE }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: NAVY }}>
              Sube el archivo de Presupuesto que quieres actualizar
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => e.target.files[0] && cargarArchivoExistente(e.target.files[0])}
              className="text-[12.5px]"
            />
            {cargando && <div className="text-[12px] text-gray-500 mt-1">Leyendo archivo...</div>}
            {archivoBase && !cargando && (
              <div className="text-[12px] mt-1" style={{ color: GOLD }}>
                ✓ Datos cargados de "{archivoBase.name}"
              </div>
            )}
          </div>
        )}

        <Campo label="Proyecto">
          <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="Nombre del proyecto" />
        </Campo>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2" style={{ background: NAVY }}>
          DATOS GENERALES (FICHA TÉCNICA)
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de pisos"><Input type="number" value={pisos} onChange={(e) => setPisos(e.target.value)} /></Campo>
            <Campo label="Número de sótanos"><Input type="number" value={sotanos} onChange={(e) => setSotanos(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área del lote" unidad="m²"><Input type="number" value={areaLote} onChange={(e) => setAreaLote(e.target.value)} /></Campo>
            <Campo label="Área típica por piso" unidad="m²"><Input type="number" value={areaTipicaPiso} onChange={(e) => setAreaTipicaPiso(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área sótanos" unidad="m²"><Input type="number" value={areaSotanos} onChange={(e) => setAreaSotanos(e.target.value)} /></Campo>
            <Campo label="Área cubierta" unidad="m²"><Input type="number" value={areaCubierta} onChange={(e) => setAreaCubierta(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="No. apartamentos"><Input type="number" value={numApartamentos} onChange={(e) => setNumApartamentos(e.target.value)} /></Campo>
            <Campo label="Área prom. apto." unidad="m²"><Input type="number" value={areaPromedioApto} onChange={(e) => setAreaPromedioApto(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="No. parqueaderos"><Input type="number" value={numParqueaderos} onChange={(e) => setNumParqueaderos(e.target.value)} /></Campo>
            <Campo label="No. ascensores"><Input type="number" value={numAscensores} onChange={(e) => setNumAscensores(e.target.value)} /></Campo>
          </div>
          <Campo label="Altura total" unidad="m"><Input type="number" value={alturaTotal} onChange={(e) => setAlturaTotal(e.target.value)} /></Campo>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>
          AIU
        </div>
        <div className="border border-t-0 rounded-b-lg p-3 mb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Administración" unidad="%"><Input type="number" value={administracion} onChange={(e) => setAdministracion(e.target.value)} /></Campo>
            <Campo label="Imprevistos" unidad="%"><Input type="number" value={imprevistos} onChange={(e) => setImprevistos(e.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Utilidad" unidad="%"><Input type="number" value={utilidad} onChange={(e) => setUtilidad(e.target.value)} /></Campo>
            <Campo label="IVA sobre Utilidad" unidad="%"><Input type="number" value={ivaUtilidad} onChange={(e) => setIvaUtilidad(e.target.value)} /></Campo>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg" style={{ background: NAVY }}>
          ÍTEMS DEL PRESUPUESTO (por capítulo)
        </div>
        <div className="p-3 border border-t-0" style={{ borderColor: LINE, background: "white" }}>
          <div className="text-[11.5px] text-gray-500 mb-2">
            Puedes llenar cantidad y precio a mano en cada ítem, o cargarlos automáticamente desde archivos que ya tengas generados:
          </div>
          <div className="grid grid-cols-2 gap-2 mb-1">
            <label className="text-center py-2 rounded-lg text-[12px] font-semibold border-2 cursor-pointer" style={{ borderColor: GOLD, color: NAVY }}>
              📐 Cargar Cantidades de Obra
              <input
                type="file" accept=".xlsx" className="hidden"
                onChange={(e) => e.target.files[0] && cargarCantidadesDeObra(e.target.files[0])}
              />
            </label>
            <label className="text-center py-2 rounded-lg text-[12px] font-semibold border-2 cursor-pointer" style={{ borderColor: GOLD, color: NAVY }}>
              💲 Cargar APU's (varios)
              <input
                type="file" accept=".xlsx" multiple className="hidden"
                onChange={(e) => e.target.files.length && cargarApus(e.target.files)}
              />
            </label>
          </div>
        </div>
        <div className="p-2 border border-t-0 rounded-b-lg mb-4" style={{ borderColor: LINE, background: "white" }}>
          <div className="text-[11.5px] text-gray-500 mb-2 px-1">
            Toca cada capítulo para desplegar sus ítems. Solo llena los que necesites — los demás quedan en $0.
          </div>
          {CAPITULOS.map((cap, ci) => (
            <CapituloAcordeon key={ci} capitulo={cap} indexCap={ci} valores={valores} setValor={setValor} />
          ))}
        </div>

        <div className="p-3 rounded-lg mb-4 text-center" style={{ background: NAVY }}>
          <div className="text-[11px]" style={{ color: GOLD }}>COSTO DIRECTO (sin AIU)</div>
          <div className="text-white font-bold text-[20px]">{formatoMoneda(totalGeneral)}</div>
        </div>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : archivoBase ? "Actualizar y descargar" : "Descargar Presupuesto en Excel"}
        </button>
      </div>
    </div>
  );
}
