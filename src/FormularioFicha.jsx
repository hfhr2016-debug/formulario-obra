import React, { useState } from "react";
import ExcelJS from "exceljs";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

function fechaLocalHoy() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
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

export default function FormularioFicha({ onVolver }) {
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

  const [generando, setGenerando] = useState(false);

  async function generarExcel() {
    setGenerando(true);
    try {
      const resp = await fetch("/plantilla-ficha.xlsx?v=" + Date.now(), { cache: "no-store" });
      const buffer = await resp.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.getWorksheet("Ficha Técnica del Proyecto");

      ws.getCell("B2").value = proyecto;

      ws.getCell("B9").value = Number(pisos) || 0;
      ws.getCell("B10").value = Number(sotanos) || 0;
      ws.getCell("B11").value = Number(areaLote) || 0;
      ws.getCell("B12").value = Number(areaTipicaPiso) || 0;
      ws.getCell("B14").value = Number(areaSotanos) || 0;
      ws.getCell("B15").value = Number(areaCubierta) || 0;
      ws.getCell("B17").value = Number(numApartamentos) || 0;
      ws.getCell("B18").value = Number(areaPromedioApto) || 0;
      ws.getCell("B19").value = Number(numParqueaderos) || 0;
      ws.getCell("B20").value = Number(numAscensores) || 0;
      ws.getCell("B21").value = Number(alturaTotal) || 0;

      ws.getCell("B24").value = Number(administracion) / 100;
      ws.getCell("B25").value = Number(imprevistos) / 100;
      ws.getCell("B26").value = Number(utilidad) / 100;
      ws.getCell("B27").value = Number(ivaUtilidad) / 100;

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `Ficha_Tecnica_${(proyecto || "proyecto").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${fechaLocalHoy()}.xlsx`;
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
              FICHA TÉCNICA DEL PROYECTO
            </div>
            <div className="text-[11px]" style={{ color: GOLD }}>
              Reformas y Remodelaciones
            </div>
          </div>
          <img src="/logo-header.png" alt="Reformas y Remodelaciones" className="h-16 w-auto" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        <Campo label="Proyecto">
          <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="Nombre del proyecto" />
        </Campo>

        <div
          className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-2"
          style={{ background: NAVY }}
        >
          DATOS GENERALES DEL PROYECTO
        </div>
        <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de pisos" unidad="pisos">
              <Input type="number" value={pisos} onChange={(e) => setPisos(e.target.value)} />
            </Campo>
            <Campo label="Número de sótanos" unidad="niveles">
              <Input type="number" value={sotanos} onChange={(e) => setSotanos(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área del lote" unidad="m²">
              <Input type="number" value={areaLote} onChange={(e) => setAreaLote(e.target.value)} />
            </Campo>
            <Campo label="Área típica por piso" unidad="m²">
              <Input type="number" value={areaTipicaPiso} onChange={(e) => setAreaTipicaPiso(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área construida - sótanos" unidad="m²">
              <Input type="number" value={areaSotanos} onChange={(e) => setAreaSotanos(e.target.value)} />
            </Campo>
            <Campo label="Área cubierta / cto. máquinas" unidad="m²">
              <Input type="number" value={areaCubierta} onChange={(e) => setAreaCubierta(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de apartamentos" unidad="und">
              <Input type="number" value={numApartamentos} onChange={(e) => setNumApartamentos(e.target.value)} />
            </Campo>
            <Campo label="Área promedio apto." unidad="m²">
              <Input type="number" value={areaPromedioApto} onChange={(e) => setAreaPromedioApto(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de parqueaderos" unidad="und">
              <Input type="number" value={numParqueaderos} onChange={(e) => setNumParqueaderos(e.target.value)} />
            </Campo>
            <Campo label="Número de ascensores" unidad="und">
              <Input type="number" value={numAscensores} onChange={(e) => setNumAscensores(e.target.value)} />
            </Campo>
          </div>
          <Campo label="Altura total aproximada" unidad="m">
            <Input type="number" value={alturaTotal} onChange={(e) => setAlturaTotal(e.target.value)} />
          </Campo>
        </div>

        <div
          className="text-[12.5px] font-bold text-white px-3 py-2 rounded-t-lg mt-4"
          style={{ background: NAVY }}
        >
          PARÁMETROS ECONÓMICOS DEL PRESUPUESTO (AIU)
        </div>
        <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Administración (A)" unidad="%">
              <Input type="number" value={administracion} onChange={(e) => setAdministracion(e.target.value)} />
            </Campo>
            <Campo label="Imprevistos (I)" unidad="%">
              <Input type="number" value={imprevistos} onChange={(e) => setImprevistos(e.target.value)} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Utilidad (U)" unidad="%">
              <Input type="number" value={utilidad} onChange={(e) => setUtilidad(e.target.value)} />
            </Campo>
            <Campo label="IVA sobre Utilidad" unidad="%">
              <Input type="number" value={ivaUtilidad} onChange={(e) => setIvaUtilidad(e.target.value)} />
            </Campo>
          </div>
          <div className="text-[11.5px] text-gray-500 mt-1">
            AIU total: <b style={{ color: NAVY }}>
              {(Number(administracion || 0) + Number(imprevistos || 0) + Number(utilidad || 0)).toFixed(1)}%
            </b>
          </div>
        </div>

        <button
          onClick={generarExcel}
          disabled={generando}
          className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-[14.5px]"
          style={{ background: generando ? "#9AA0A8" : GOLD }}
        >
          {generando ? "Generando..." : "Descargar Ficha Técnica en Excel"}
        </button>
      </div>
    </div>
  );
}
