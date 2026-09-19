import React, { useState, useMemo } from "react";
import ExcelJS from "exceljs";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const CAPITULOS = [{"nombre": "PRELIMINARES", "items_start": 15, "items": [{"cod": "1.1", "actividad": "Replanteo general de ejes y niveles", "unidad": "ML"}, {"cod": "1.2", "actividad": "Cerramiento provisional de obra", "unidad": "ML"}, {"cod": "1.3", "actividad": "Instalación de campamento y oficinas provisionales", "unidad": "M²"}, {"cod": "1.4", "actividad": "Adecuación de área de almacenamiento", "unidad": "M²"}, {"cod": "1.5", "actividad": "Señalización preventiva e informativa de obra", "unidad": "UND"}, {"cod": "1.6", "actividad": "Instalaciones provisionales de agua y energía", "unidad": "GL"}, {"cod": "1.7", "actividad": "Protección de elementos existentes", "unidad": "M²"}, {"cod": "1.8", "actividad": "Desmonte y limpieza inicial", "unidad": "M²"}, {"cod": "1.9", "actividad": "Demoliciones preliminares", "unidad": "M³"}, {"cod": "1.10", "actividad": "Desmantelamiento de estructuras metálicas existentes", "unidad": "KG"}]}, {"nombre": "MOVIMIENTO DE TIERRAS", "items_start": 28, "items": [{"cod": "2.1", "actividad": "Excavación manual en material común", "unidad": "M³"}, {"cod": "2.2", "actividad": "Excavación mecánica", "unidad": "M³"}, {"cod": "2.3", "actividad": "Excavación en roca", "unidad": "M³"}, {"cod": "2.4", "actividad": "Perfilado y conformación de excavaciones", "unidad": "M²"}, {"cod": "2.5", "actividad": "Relleno con material seleccionado compactado", "unidad": "M³"}, {"cod": "2.6", "actividad": "Relleno con material proveniente de excavación", "unidad": "M³"}, {"cod": "2.7", "actividad": "Suministro, extendido y compactación de subbase", "unidad": "M³"}, {"cod": "2.8", "actividad": "Suministro, extendido y compactación de base granular", "unidad": "M³"}, {"cod": "2.9", "actividad": "Cargue de material sobrante", "unidad": "M³"}, {"cod": "2.10", "actividad": "Transporte de material sobrante", "unidad": "M³"}, {"cod": "2.11", "actividad": "Disposición final de sobrantes", "unidad": "M³"}]}, {"nombre": "CIMENTACIONES", "items_start": 42, "items": [{"cod": "3.1", "actividad": "Concreto de limpieza / solado", "unidad": "M³"}, {"cod": "3.2", "actividad": "Concreto para zapatas", "unidad": "M³"}, {"cod": "3.3", "actividad": "Concreto para vigas de cimentación", "unidad": "M³"}, {"cod": "3.4", "actividad": "Concreto para losas de cimentación", "unidad": "M³"}, {"cod": "3.5", "actividad": "Concreto para pedestales", "unidad": "M³"}, {"cod": "3.6", "actividad": "Acero de refuerzo en cimentación", "unidad": "KG"}, {"cod": "3.7", "actividad": "Formaleta para elementos de cimentación", "unidad": "M²"}]}, {"nombre": "ESTRUCTURA", "items_start": 52, "items": [{"cod": "4.1", "actividad": "Concreto para columnas", "unidad": "M³"}, {"cod": "4.2", "actividad": "Concreto para vigas", "unidad": "M³"}, {"cod": "4.3", "actividad": "Concreto para losas", "unidad": "M³"}, {"cod": "4.4", "actividad": "Concreto para escaleras", "unidad": "M³"}, {"cod": "4.5", "actividad": "Concreto para muros estructurales", "unidad": "M³"}, {"cod": "4.6", "actividad": "Acero de refuerzo de columnas", "unidad": "KG"}, {"cod": "4.7", "actividad": "Acero de refuerzo de vigas", "unidad": "KG"}, {"cod": "4.8", "actividad": "Acero de refuerzo de losas", "unidad": "KG"}, {"cod": "4.9", "actividad": "Formaleta de columnas", "unidad": "M²"}, {"cod": "4.10", "actividad": "Formaleta de vigas", "unidad": "M²"}, {"cod": "4.11", "actividad": "Formaleta de losas", "unidad": "M²"}, {"cod": "4.12", "actividad": "Formaleta de escaleras", "unidad": "M²"}, {"cod": "4.13", "actividad": "Suministro y montaje de perfiles metálicos", "unidad": "KG"}, {"cod": "4.14", "actividad": "Placas, pernos y conexiones metálicas", "unidad": "KG"}, {"cod": "4.15", "actividad": "Grouting cementoso para reparación estructural", "unidad": "M²"}, {"cod": "4.16", "actividad": "Grouting epóxico para reparación estructural", "unidad": "M²"}]}, {"nombre": "MAMPOSTERÍA", "items_start": 71, "items": [{"cod": "5.1", "actividad": "Mampostería en bloque de concreto", "unidad": "M²"}, {"cod": "5.2", "actividad": "Mampostería en ladrillo", "unidad": "M²"}, {"cod": "5.3", "actividad": "Mampostería estructural", "unidad": "M²"}, {"cod": "5.4", "actividad": "Muros en sistema liviano / drywall", "unidad": "M²"}, {"cod": "5.5", "actividad": "Dinteles sobre vanos", "unidad": "ML"}, {"cod": "5.6", "actividad": "Alfajías y remates", "unidad": "ML"}, {"cod": "5.7", "actividad": "Anclajes y refuerzos de mampostería", "unidad": "UND"}, {"cod": "5.8", "actividad": "Mampostería en ladrillo tolete a la vista (reforzada)", "unidad": "M²"}, {"cod": "5.9", "actividad": "Mampostería en ladrillo a la vista (no reforzada)", "unidad": "M²"}]}, {"nombre": "CUBIERTAS", "items_start": 83, "items": [{"cod": "6.1", "actividad": "Estructura metálica o de madera para cubierta", "unidad": "KG"}, {"cod": "6.2", "actividad": "Cerchas y elementos estructurales", "unidad": "KG"}, {"cod": "6.3", "actividad": "Suministro e instalación de teja", "unidad": "M²"}, {"cod": "6.4", "actividad": "Impermeabilización de cubierta", "unidad": "M²"}, {"cod": "6.5", "actividad": "Aislamiento térmico/acústico", "unidad": "M²"}, {"cod": "6.6", "actividad": "Canales de aguas lluvias", "unidad": "ML"}, {"cod": "6.7", "actividad": "Bajantes de aguas lluvias", "unidad": "ML"}, {"cod": "6.8", "actividad": "Cielo raso Dry Wall", "unidad": "M²"}, {"cod": "6.9", "actividad": "Cielo raso en lámina acústica de fibra mineral", "unidad": "M²"}]}, {"nombre": "IMPERMEABILIZACIONES", "items_start": 95, "items": [{"cod": "7.1", "actividad": "Impermeabilización de losas y terrazas", "unidad": "M²"}, {"cod": "7.2", "actividad": "Impermeabilización de muros", "unidad": "M²"}, {"cod": "7.3", "actividad": "Impermeabilización de zonas húmedas", "unidad": "M²"}, {"cod": "7.4", "actividad": "Geomembrana HDPE para impermeabilización de terrenos", "unidad": "M²"}]}, {"nombre": "PAÑETES Y REVOQUES", "items_start": 102, "items": [{"cod": "8.1", "actividad": "Pañete / revoque interior", "unidad": "M²"}, {"cod": "8.2", "actividad": "Pañete / revoque exterior", "unidad": "M²"}, {"cod": "8.3", "actividad": "Pañete impermeabilizado", "unidad": "M²"}, {"cod": "8.4", "actividad": "Estuco plástico o tradicional", "unidad": "M²"}]}, {"nombre": "PISOS Y ENCHAPES", "items_start": 109, "items": [{"cod": "9.1", "actividad": "Mortero de nivelación", "unidad": "M²"}, {"cod": "9.2", "actividad": "Piso cerámico", "unidad": "M²"}, {"cod": "9.3", "actividad": "Piso en porcelanato", "unidad": "M²"}, {"cod": "9.4", "actividad": "Piso vinílico", "unidad": "M²"}, {"cod": "9.5", "actividad": "Piso laminado", "unidad": "M²"}, {"cod": "9.6", "actividad": "Enchape cerámico en muros", "unidad": "M²"}, {"cod": "9.7", "actividad": "Guardaescoba", "unidad": "ML"}, {"cod": "9.8", "actividad": "Juntas de dilatación / construcción", "unidad": "ML"}, {"cod": "9.9", "actividad": "Piso en concreto afinado con endurecedor de cuarzo", "unidad": "M²"}, {"cod": "9.10", "actividad": "Baldosa de granito", "unidad": "M²"}, {"cod": "9.11", "actividad": "Enchape en granito pulido", "unidad": "M²"}]}, {"nombre": "PINTURA", "items_start": 123, "items": [{"cod": "10.1", "actividad": "Pintura vinílica interior", "unidad": "M²"}, {"cod": "10.2", "actividad": "Pintura exterior", "unidad": "M²"}, {"cod": "10.3", "actividad": "Pintura esmalte en superficies metálicas/madera", "unidad": "M²"}, {"cod": "10.4", "actividad": "Pintura anticorrosiva", "unidad": "M²"}, {"cod": "10.5", "actividad": "Sellador / imprimante", "unidad": "M²"}]}, {"nombre": "CARPINTERÍA", "items_start": 131, "items": [{"cod": "11.1", "actividad": "Puertas de madera", "unidad": "UND"}, {"cod": "11.2", "actividad": "Muebles fijos de madera", "unidad": "ML"}, {"cod": "11.3", "actividad": "Puertas metálicas", "unidad": "UND"}, {"cod": "11.4", "actividad": "Barandas metálicas", "unidad": "ML"}, {"cod": "11.5", "actividad": "Pasamanos", "unidad": "ML"}, {"cod": "11.6", "actividad": "Ventanas de aluminio", "unidad": "M²"}, {"cod": "11.7", "actividad": "Divisiones de aluminio", "unidad": "M²"}, {"cod": "11.8", "actividad": "Puerta antipánico", "unidad": "UND"}]}, {"nombre": "VIDRIOS", "items_start": 142, "items": [{"cod": "12.1", "actividad": "Vidrio templado", "unidad": "M²"}, {"cod": "12.2", "actividad": "Vidrio laminado", "unidad": "M²"}, {"cod": "12.3", "actividad": "Espejos", "unidad": "M²"}, {"cod": "12.4", "actividad": "Sellos y silicona", "unidad": "ML"}]}, {"nombre": "INSTALACIONES HIDROSANITARIAS", "items_start": 149, "items": [{"cod": "13.1", "actividad": "Tubería de agua fría", "unidad": "ML"}, {"cod": "13.2", "actividad": "Tubería de agua caliente", "unidad": "ML"}, {"cod": "13.3", "actividad": "Válvulas y accesorios", "unidad": "UND"}, {"cod": "13.4", "actividad": "Tubería sanitaria", "unidad": "ML"}, {"cod": "13.5", "actividad": "Tubería de aguas lluvias", "unidad": "ML"}, {"cod": "13.6", "actividad": "Cajas de inspección", "unidad": "UND"}, {"cod": "13.7", "actividad": "Aparatos sanitarios", "unidad": "UND"}, {"cod": "13.8", "actividad": "Lavamanos", "unidad": "UND"}, {"cod": "13.9", "actividad": "Griferías", "unidad": "UND"}, {"cod": "13.10", "actividad": "Duchas", "unidad": "UND"}, {"cod": "13.11", "actividad": "Pruebas hidráulicas y de estanqueidad", "unidad": "GL"}, {"cod": "13.12", "actividad": "Orinal institucional", "unidad": "UND"}]}, {"nombre": "INSTALACIONES ELÉCTRICAS", "items_start": 164, "items": [{"cod": "14.1", "actividad": "Tubería/conduit eléctrica", "unidad": "ML"}, {"cod": "14.2", "actividad": "Bandejas portacables", "unidad": "ML"}, {"cod": "14.3", "actividad": "Cajas eléctricas", "unidad": "UND"}, {"cod": "14.4", "actividad": "Cableado de fuerza", "unidad": "ML"}, {"cod": "14.5", "actividad": "Cableado de iluminación", "unidad": "ML"}, {"cod": "14.6", "actividad": "Tableros eléctricos", "unidad": "UND"}, {"cod": "14.7", "actividad": "Tomacorrientes", "unidad": "UND"}, {"cod": "14.8", "actividad": "Interruptores", "unidad": "UND"}, {"cod": "14.9", "actividad": "Luminarias", "unidad": "UND"}, {"cod": "14.10", "actividad": "Sistema de puesta a tierra", "unidad": "GL"}, {"cod": "14.11", "actividad": "Pruebas y certificaciones", "unidad": "GL"}]}, {"nombre": "COMUNICACIONES Y SEGURIDAD", "items_start": 178, "items": [{"cod": "15.1", "actividad": "Cableado estructurado de datos", "unidad": "ML"}, {"cod": "15.2", "actividad": "Rack de comunicaciones", "unidad": "UND"}, {"cod": "15.3", "actividad": "Cámaras y sistema CCTV", "unidad": "UND"}, {"cod": "15.4", "actividad": "Control de acceso", "unidad": "UND"}, {"cod": "15.5", "actividad": "Sistema de citofonía", "unidad": "UND"}, {"cod": "15.6", "actividad": "Sistema de detección de incendios", "unidad": "GL"}]}, {"nombre": "CLIMATIZACIÓN Y VENTILACIÓN", "items_start": 187, "items": [{"cod": "16.1", "actividad": "Equipos de aire acondicionado", "unidad": "UND"}, {"cod": "16.2", "actividad": "Ductos de ventilación", "unidad": "M²"}, {"cod": "16.3", "actividad": "Tubería de refrigerante", "unidad": "ML"}, {"cod": "16.4", "actividad": "Rejillas y difusores", "unidad": "UND"}]}, {"nombre": "GAS", "items_start": 194, "items": [{"cod": "17.1", "actividad": "Red interna de gas", "unidad": "ML"}, {"cod": "17.2", "actividad": "Válvulas y accesorios", "unidad": "UND"}, {"cod": "17.3", "actividad": "Pruebas y certificación", "unidad": "GL"}]}, {"nombre": "URBANISMO Y EXTERIORES", "items_start": 200, "items": [{"cod": "18.1", "actividad": "Construcción de andenes", "unidad": "M²"}, {"cod": "18.2", "actividad": "Placas de concreto exteriores", "unidad": "M³"}, {"cod": "18.3", "actividad": "Pavimento en adoquín", "unidad": "M²"}, {"cod": "18.4", "actividad": "Sardineles y bordillos", "unidad": "ML"}, {"cod": "18.5", "actividad": "Sumideros exteriores", "unidad": "UND"}, {"cod": "18.6", "actividad": "Suministro y extendido de tierra vegetal", "unidad": "M³"}, {"cod": "18.7", "actividad": "Siembra y jardinería", "unidad": "M²"}, {"cod": "18.8", "actividad": "Geotextil para drenaje y filtración", "unidad": "M²"}, {"cod": "18.9", "actividad": "Gaviones para obras de contención", "unidad": "M³"}, {"cod": "18.10", "actividad": "Filtro francés (drenaje de terrenos)", "unidad": "ML"}, {"cod": "18.11", "actividad": "Revegetalización / empradización", "unidad": "M²"}]}, {"nombre": "OBRAS COMPLEMENTARIAS", "items_start": 214, "items": [{"cod": "19.1", "actividad": "Rejas metálicas", "unidad": "M²"}, {"cod": "19.2", "actividad": "Escaleras metálicas", "unidad": "KG"}, {"cod": "19.3", "actividad": "Elementos metálicos especiales", "unidad": "KG"}, {"cod": "19.4", "actividad": "Mobiliario fijo de obra", "unidad": "UND"}]}, {"nombre": "ASEO, ENTREGA Y CIERRE", "items_start": 221, "items": [{"cod": "20.1", "actividad": "Limpieza gruesa y fina de obra", "unidad": "M²"}, {"cod": "20.2", "actividad": "Limpieza final para entrega", "unidad": "M²"}, {"cod": "20.3", "actividad": "Pruebas, puesta en marcha y ajustes", "unidad": "GL"}, {"cod": "20.4", "actividad": "Actualización de planos récord / as-built", "unidad": "GL"}, {"cod": "20.5", "actividad": "Entrega, manuales y acta de recibo", "unidad": "GL"}]}, {"nombre": "ASCENSORES", "items_start": 229, "items": [{"cod": "21.1", "actividad": "Suministro e instalación de ascensor eléctrico", "unidad": "UND"}]}, {"nombre": "GESTIÓN, DISEÑO Y ADMINISTRACIÓN", "items_start": 233, "items": [{"cod": "22.1", "actividad": "Estudio de suelos y geotecnia", "unidad": "GL"}, {"cod": "22.2", "actividad": "Diseños arquitectónicos, estructurales, hidrosanitarios y eléctricos", "unidad": "GL"}, {"cod": "22.3", "actividad": "Licencia de construcción y trámites de curaduría urbana", "unidad": "GL"}, {"cod": "22.4", "actividad": "Póliza de estabilidad de obra y seguros de construcción (todo riesgo)", "unidad": "GL"}]}];

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
        setPisos(wsFicha.getCell("B14").value || "");
        setSotanos(wsFicha.getCell("B15").value || "");
        setAreaLote(wsFicha.getCell("B16").value || "");
        setAreaTipicaPiso(wsFicha.getCell("B17").value || "");
        setAreaSotanos(wsFicha.getCell("B19").value || "");
        setAreaCubierta(wsFicha.getCell("B20").value || "");
        setNumApartamentos(wsFicha.getCell("B22").value || "");
        setAreaPromedioApto(wsFicha.getCell("B23").value || "");
        setNumParqueaderos(wsFicha.getCell("B24").value || "");
        setNumAscensores(wsFicha.getCell("B25").value || "");
        setAlturaTotal(wsFicha.getCell("B26").value || "");
        const a = wsFicha.getCell("B29").value; if (typeof a === "number") setAdministracion(a * 100);
        const im = wsFicha.getCell("B30").value; if (typeof im === "number") setImprevistos(im * 100);
        const u = wsFicha.getCell("B31").value; if (typeof u === "number") setUtilidad(u * 100);
        const iv = wsFicha.getCell("B32").value; if (typeof iv === "number") setIvaUtilidad(iv * 100);
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

  async function cargarApusGuardados() {
    try {
      const clave = "ryr_apus_guardados";
      const guardados = JSON.parse(localStorage.getItem(clave) || "{}");
      const cantidad = Object.keys(guardados).length;
      if (cantidad === 0) {
        alert("Todavía no hay APU's guardados en este dispositivo. Genera al menos uno desde el formulario de APU's primero.");
        return;
      }
      let coincidencias = 0;
      const nuevos = { ...valores };
      CAPITULOS.forEach((cap, ci) => {
        cap.items.forEach((it, ii) => {
          const key = (it.actividad || "").trim().toLowerCase();
          const guardado = guardados[key];
          if (guardado) {
            const k = `${ci}-${ii}`;
            nuevos[k] = { ...(nuevos[k] || { cant: "" }), precio: guardado.total };
            coincidencias++;
          }
        });
      });
      setValores(nuevos);
      alert(`Precios cargados desde la memoria de este dispositivo: ${coincidencias} de ${cantidad} APU's guardados coincidieron.`);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer la memoria de APU's de este dispositivo.");
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
        const resp = await fetch("/plantilla-presupuesto.xlsx?v=" + Date.now(), { cache: "no-store" });
        buffer = await resp.arrayBuffer();
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const wsFicha = workbook.getWorksheet("Ficha Técnica del Proyecto");
      const wsPres = workbook.getWorksheet("Presupuesto ");

      wsFicha.getCell("B2").value = proyecto;
      wsFicha.getCell("B9").value = proyecto;
      wsFicha.getCell("B14").value = Number(pisos) || 0;
      wsFicha.getCell("B15").value = Number(sotanos) || 0;
      wsFicha.getCell("B16").value = Number(areaLote) || 0;
      wsFicha.getCell("B17").value = Number(areaTipicaPiso) || 0;
      wsFicha.getCell("B19").value = Number(areaSotanos) || 0;
      wsFicha.getCell("B20").value = Number(areaCubierta) || 0;
      wsFicha.getCell("B22").value = Number(numApartamentos) || 0;
      wsFicha.getCell("B23").value = Number(areaPromedioApto) || 0;
      wsFicha.getCell("B24").value = Number(numParqueaderos) || 0;
      wsFicha.getCell("B25").value = Number(numAscensores) || 0;
      wsFicha.getCell("B26").value = Number(alturaTotal) || 0;
      wsFicha.getCell("B29").value = Number(administracion) / 100;
      wsFicha.getCell("B30").value = Number(imprevistos) / 100;
      wsFicha.getCell("B31").value = Number(utilidad) / 100;
      wsFicha.getCell("B32").value = Number(ivaUtilidad) / 100;

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

      try {
        const clave = "ryr_presupuesto_cantidades";
        const guardadas = {};
        CAPITULOS.forEach((cap, ci) => {
          cap.items.forEach((it, ii) => {
            const v = valores[`${ci}-${ii}`];
            if (v && Number(v.cant) > 0) {
              guardadas[it.actividad.trim().toLowerCase()] = {
                actividad: it.actividad,
                unidad: it.unidad,
                cantidad: Number(v.cant),
              };
            }
          });
        });
        localStorage.setItem(clave, JSON.stringify(guardadas));
      } catch (e) {
        console.warn("No se pudieron guardar las cantidades en memoria local:", e);
      }

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
            Puedes llenar cantidad y precio a mano, o cargarlos automáticamente:
          </div>
          <button
            type="button"
            onClick={cargarApusGuardados}
            className="w-full text-center py-2.5 rounded-lg text-[12.5px] font-semibold text-white mb-2"
            style={{ background: NAVY }}
          >
            ⚡ Usar precios de APU's ya generados en este dispositivo
          </button>
          <div className="text-[10.5px] text-gray-400 mb-2 text-center">
            — o, si vienes de otro dispositivo / necesitas cargar cantidades —
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
              💲 Cargar archivos de APU
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
