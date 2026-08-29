import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  ClipboardList,
} from "lucide-react";

const NAVY = "#1B2A45";
const GOLD = "#D9A233";
const PAPER = "#F7F7F5";
const LINE = "#D9DCE1";

const emptyCantidad = () => ({
  ubicacion: "",
  item: "",
  descripcion: "",
  contractual: "",
  unidad: "",
  acumAnterior: "",
  avanceDiario: "",
});
const emptyOtra = () => ({
  ubicacion: "",
  item: "",
  descripcion: "",
  unidad: "",
  acumAnterior: "",
  avanceDiario: "",
  observaciones: "",
});
const emptyManoObra = () => ({ cargo: "", cant: "", tiempo: "" });
const emptyEquipo = () => ({ descripcion: "", cant: "", tiempo: "" });
const emptyHoraPerdida = () => ({ motivo: "", inicio: "", fin: "", total: "" });

function Section({ id, title, subtitle, open, onToggle, children, count }) {
  return (
    <div className="border-b" style={{ borderColor: LINE }}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between py-3.5 px-1 text-left"
      >
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: NAVY }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px]" style={{ color: "#8A8F99" }}>
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: GOLD, color: "white" }}
            >
              {count}
            </span>
          )}
          <ChevronDown
            size={18}
            style={{
              color: NAVY,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          />
        </div>
      </button>
      {open && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", half }) {
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none"
        style={{ borderColor: LINE, background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="w-full">
      <label
        className="block text-[10px] uppercase tracking-wide mb-1 font-medium"
        style={{ color: "#8A8F99" }}
      >
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] px-2.5 py-2 rounded-md border outline-none resize-none"
        style={{ borderColor: LINE, background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = LINE)}
      />
    </div>
  );
}

function RowCard({ children, onRemove }) {
  return (
    <div
      className="border rounded-lg p-3 mb-2.5 relative"
      style={{ borderColor: LINE, background: PAPER }}
    >
      <div className="grid grid-cols-2 gap-2">{children}</div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: "white", border: `1px solid ${LINE}`, color: "#B3401F" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-md w-full justify-center border border-dashed"
      style={{ borderColor: GOLD, color: NAVY }}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

export default function CapturaAvanceObra() {
  const [active, setActive] = useState("general");
  const toggle = (id) => setActive((cur) => (cur === id ? "" : id));

  const [general, setGeneral] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    informeNo: "",
    objetoContrato: "",
    noContrato: "",
    ubicacion: "",
    especialidad: "",
    horaEntrada: "",
    horaApertura: "",
    horaSalida: "",
  });
  const setG = (k, v) => setGeneral((s) => ({ ...s, [k]: v }));

  const [cantidades, setCantidades] = useState([emptyCantidad()]);
  const [otras, setOtras] = useState([emptyOtra()]);
  const [manoObra, setManoObra] = useState([emptyManoObra()]);
  const [equipos, setEquipos] = useState([emptyEquipo()]);
  const [horasPerdidas, setHorasPerdidas] = useState([emptyHoraPerdida()]);

  const [descActividades, setDescActividades] = useState("");
  const [aspectosProblematicos, setAspectosProblematicos] = useState("");
  const [planAccion, setPlanAccion] = useState("");
  const [charlaDia, setCharlaDia] = useState("");
  const [observacionesHSE, setObservacionesHSE] = useState("");
  const [elaboradoNombre, setElaboradoNombre] = useState("");
  const [elaboradoCargo, setElaboradoCargo] = useState("");

  const [resumen, setResumen] = useState("");
  const [copied, setCopied] = useState(false);

  function updateRow(setter, idx, key, value) {
    setter((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }
  function addRow(setter, factory) {
    setter((rows) => [...rows, factory()]);
  }
  function removeRow(setter, idx) {
    setter((rows) => rows.filter((_, i) => i !== idx));
  }

  const countFilled = (rows) =>
    rows.filter((r) => Object.values(r).some((v) => String(v).trim())).length;

  function construirResumen() {
    const L = [];
    L.push("INFORME DIARIO DE AVANCE DE OBRA");
    L.push("REFORMAS Y REMODELACIONES");
    L.push("");
    L.push(`Fecha: ${general.fecha || "-"}`);
    if (general.informeNo) L.push(`Informe No.: ${general.informeNo}`);
    if (general.objetoContrato) L.push(`Objeto del contrato: ${general.objetoContrato}`);
    if (general.noContrato) L.push(`No. de contrato: ${general.noContrato}`);
    if (general.ubicacion) L.push(`Ubicación: ${general.ubicacion}`);
    if (general.especialidad) L.push(`Especialidad: ${general.especialidad}`);
    if (general.horaEntrada || general.horaApertura || general.horaSalida) {
      L.push(
        `Hora entrada: ${general.horaEntrada || "-"} | Apertura permiso: ${
          general.horaApertura || "-"
        } | Hora salida: ${general.horaSalida || "-"}`
      );
    }

    const cantFiltered = cantidades.filter((r) => r.descripcion || r.item || r.ubicacion);
    if (cantFiltered.length) {
      L.push("");
      L.push("— CANTIDADES DE OBRA —");
      cantFiltered.forEach((r, i) => {
        L.push(
          `${i + 1}) Ubicación: ${r.ubicacion || "-"} | Item: ${r.item || "-"} | Descripción: ${
            r.descripcion || "-"
          } | Contractual: ${r.contractual || "-"} | Unidad: ${r.unidad || "-"} | Acum. anterior: ${
            r.acumAnterior || "0"
          } | Avance diario: ${r.avanceDiario || "0"}`
        );
      });
    }

    const otrasFiltered = otras.filter((r) => r.descripcion || r.item || r.ubicacion);
    if (otrasFiltered.length) {
      L.push("");
      L.push("— OTRAS ACTIVIDADES —");
      otrasFiltered.forEach((r, i) => {
        L.push(
          `${i + 1}) Ubicación: ${r.ubicacion || "-"} | Item: ${r.item || "-"} | Descripción: ${
            r.descripcion || "-"
          } | Unidad: ${r.unidad || "-"} | Acum. anterior: ${r.acumAnterior || "0"} | Avance diario: ${
            r.avanceDiario || "0"
          }${r.observaciones ? " | Obs: " + r.observaciones : ""}`
        );
      });
    }

    const manoFiltered = manoObra.filter((r) => r.cargo);
    if (manoFiltered.length) {
      L.push("");
      L.push("— MANO DE OBRA —");
      manoFiltered.forEach((r) =>
        L.push(`- ${r.cargo}: ${r.cant || "-"} pers. | ${r.tiempo || "-"}`)
      );
    }

    const eqFiltered = equipos.filter((r) => r.descripcion);
    if (eqFiltered.length) {
      L.push("");
      L.push("— EQUIPOS —");
      eqFiltered.forEach((r) =>
        L.push(`- ${r.descripcion}: ${r.cant || "-"} | ${r.tiempo || "-"}`)
      );
    }

    if (descActividades) {
      L.push("");
      L.push("— DESCRIPCIÓN DE ACTIVIDADES —");
      L.push(descActividades);
    }

    if (aspectosProblematicos || planAccion) {
      L.push("");
      L.push("— ASPECTOS PROBLEMÁTICOS —");
      L.push(aspectosProblematicos || "Ninguno");
      L.push("— PLAN DE ACCIÓN —");
      L.push(planAccion || "-");
    }

    const hpFiltered = horasPerdidas.filter((r) => r.motivo);
    if (hpFiltered.length) {
      L.push("");
      L.push("— HORAS PERDIDAS —");
      hpFiltered.forEach((r) =>
        L.push(`- ${r.motivo}: ${r.inicio || "-"} a ${r.fin || "-"} (Total: ${r.total || "-"})`)
      );
    }

    if (charlaDia || observacionesHSE) {
      L.push("");
      L.push("— ASPECTOS HSE —");
      if (charlaDia) L.push(`Charla del día: ${charlaDia}`);
      if (observacionesHSE) L.push(`Observaciones HSE: ${observacionesHSE}`);
    }

    if (elaboradoNombre || elaboradoCargo) {
      L.push("");
      L.push(`Elaborado por: ${elaboradoNombre || "-"} (${elaboradoCargo || "-"})`);
    }

    return L.join("\n");
  }

  function handleGenerar() {
    setResumen(construirResumen());
    setActive("resumen");
  }

  function copiar() {
    navigator.clipboard.writeText(resumen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function enviarWhatsapp() {
    const url = `https://wa.me/?text=${encodeURIComponent(resumen)}`;
    window.open(url, "_blank");
  }

  return (
    <div
      className="min-h-full"
      style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <div className="flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <path d="M20 4L4 18H8V36H32V18H36L20 4Z" fill={GOLD} />
            <rect x="14" y="22" width="12" height="14" fill={NAVY} stroke="white" strokeWidth="1" />
          </svg>
          <div>
            <div
              className="text-white font-bold text-[15px] tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              REFORMAS Y REMODELACIONES
            </div>
            <div className="text-[10.5px]" style={{ color: GOLD }}>
              Captura de avance diario de obra · RYR-FT-01
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white">
        <Section id="general" title="Datos generales" open={active === "general"} onToggle={toggle}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Field label="Fecha" type="date" value={general.fecha} onChange={(v) => setG("fecha", v)} half />
              <Field label="Informe No." value={general.informeNo} onChange={(v) => setG("informeNo", v)} half />
            </div>
            <Field label="Objeto del contrato" value={general.objetoContrato} onChange={(v) => setG("objetoContrato", v)} />
            <div className="flex gap-2">
              <Field label="No. de contrato" value={general.noContrato} onChange={(v) => setG("noContrato", v)} half />
              <Field label="Especialidad" value={general.especialidad} onChange={(v) => setG("especialidad", v)} half />
            </div>
            <Field label="Ubicación" value={general.ubicacion} onChange={(v) => setG("ubicacion", v)} />
            <div className="flex gap-2">
              <Field label="Hora entrada" type="time" value={general.horaEntrada} onChange={(v) => setG("horaEntrada", v)} half />
              <Field label="Apertura permiso" type="time" value={general.horaApertura} onChange={(v) => setG("horaApertura", v)} half />
              <Field label="Hora salida" type="time" value={general.horaSalida} onChange={(v) => setG("horaSalida", v)} half />
            </div>
          </div>
        </Section>

        <Section
          id="cantidades"
          title="Cantidades de obra"
          subtitle="Ítems del contrato"
          open={active === "cantidades"}
          onToggle={toggle}
          count={countFilled(cantidades)}
        >
          {cantidades.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setCantidades, i)}>
              <Field label="Ubicación" value={r.ubicacion} onChange={(v) => updateRow(setCantidades, i, "ubicacion", v)} />
              <Field label="Item" value={r.item} onChange={(v) => updateRow(setCantidades, i, "item", v)} />
              <div className="col-span-2">
                <Field label="Descripción del ítem" value={r.descripcion} onChange={(v) => updateRow(setCantidades, i, "descripcion", v)} />
              </div>
              <Field label="Contractual" value={r.contractual} onChange={(v) => updateRow(setCantidades, i, "contractual", v)} />
              <Field label="Unidad" value={r.unidad} onChange={(v) => updateRow(setCantidades, i, "unidad", v)} />
              <Field label="Acum. anterior" type="number" value={r.acumAnterior} onChange={(v) => updateRow(setCantidades, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="number" value={r.avanceDiario} onChange={(v) => updateRow(setCantidades, i, "avanceDiario", v)} />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setCantidades, emptyCantidad)} label="Agregar ítem" />
        </Section>

        <Section
          id="otras"
          title="Otras actividades"
          open={active === "otras"}
          onToggle={toggle}
          count={countFilled(otras)}
        >
          {otras.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setOtras, i)}>
              <Field label="Ubicación" value={r.ubicacion} onChange={(v) => updateRow(setOtras, i, "ubicacion", v)} />
              <Field label="Item" value={r.item} onChange={(v) => updateRow(setOtras, i, "item", v)} />
              <div className="col-span-2">
                <Field label="Descripción" value={r.descripcion} onChange={(v) => updateRow(setOtras, i, "descripcion", v)} />
              </div>
              <Field label="Unidad" value={r.unidad} onChange={(v) => updateRow(setOtras, i, "unidad", v)} />
              <Field label="Acum. anterior" type="number" value={r.acumAnterior} onChange={(v) => updateRow(setOtras, i, "acumAnterior", v)} />
              <Field label="Avance diario" type="number" value={r.avanceDiario} onChange={(v) => updateRow(setOtras, i, "avanceDiario", v)} />
              <div className="col-span-2">
                <Field label="Observaciones" value={r.observaciones} onChange={(v) => updateRow(setOtras, i, "observaciones", v)} />
              </div>
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setOtras, emptyOtra)} label="Agregar actividad" />
        </Section>

        <Section
          id="recursos"
          title="Recursos"
          subtitle="Mano de obra y equipos"
          open={active === "recursos"}
          onToggle={toggle}
          count={countFilled(manoObra) + countFilled(equipos)}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: NAVY }}>
            MANO DE OBRA
          </div>
          {manoObra.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setManoObra, i)}>
              <div className="col-span-2">
                <Field label="Cargo" value={r.cargo} onChange={(v) => updateRow(setManoObra, i, "cargo", v)} />
              </div>
              <Field label="Cant." type="number" value={r.cant} onChange={(v) => updateRow(setManoObra, i, "cant", v)} />
              <Field label="Tiempo" value={r.tiempo} onChange={(v) => updateRow(setManoObra, i, "tiempo", v)} placeholder="Ej. 8h" />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setManoObra, emptyManoObra)} label="Agregar cargo" />

          <div className="text-[11px] font-semibold mb-2 mt-4" style={{ color: NAVY }}>
            EQUIPOS
          </div>
          {equipos.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setEquipos, i)}>
              <div className="col-span-2">
                <Field label="Descripción" value={r.descripcion} onChange={(v) => updateRow(setEquipos, i, "descripcion", v)} />
              </div>
              <Field label="Cant." type="number" value={r.cant} onChange={(v) => updateRow(setEquipos, i, "cant", v)} />
              <Field label="Tiempo" value={r.tiempo} onChange={(v) => updateRow(setEquipos, i, "tiempo", v)} placeholder="Ej. 8h" />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setEquipos, emptyEquipo)} label="Agregar equipo" />
        </Section>

        <Section
          id="actividades"
          title="Actividades e incidencias"
          open={active === "actividades"}
          onToggle={toggle}
        >
          <div className="space-y-3">
            <TextArea label="Descripción de actividades" value={descActividades} onChange={setDescActividades} placeholder="Resumen de lo realizado hoy" />
            <TextArea label="Aspectos problemáticos" value={aspectosProblematicos} onChange={setAspectosProblematicos} rows={2} placeholder="Dejar vacío si no hubo" />
            <TextArea label="Plan de acción" value={planAccion} onChange={setPlanAccion} rows={2} />
          </div>
        </Section>

        <Section
          id="hse"
          title="Horas perdidas y HSE"
          open={active === "hse"}
          onToggle={toggle}
          count={countFilled(horasPerdidas)}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: NAVY }}>
            HORAS PERDIDAS
          </div>
          {horasPerdidas.map((r, i) => (
            <RowCard key={i} onRemove={() => removeRow(setHorasPerdidas, i)}>
              <div className="col-span-2">
                <Field label="Motivo" value={r.motivo} onChange={(v) => updateRow(setHorasPerdidas, i, "motivo", v)} />
              </div>
              <Field label="Inicio" type="time" value={r.inicio} onChange={(v) => updateRow(setHorasPerdidas, i, "inicio", v)} />
              <Field label="Fin" type="time" value={r.fin} onChange={(v) => updateRow(setHorasPerdidas, i, "fin", v)} />
              <Field label="Total horas" value={r.total} onChange={(v) => updateRow(setHorasPerdidas, i, "total", v)} />
            </RowCard>
          ))}
          <AddButton onClick={() => addRow(setHorasPerdidas, emptyHoraPerdida)} label="Agregar registro" />

          <div className="text-[11px] font-semibold mb-2 mt-4" style={{ color: NAVY }}>
            ASPECTOS HSE
          </div>
          <div className="space-y-3">
            <TextArea label="Charla del día" value={charlaDia} onChange={setCharlaDia} rows={2} />
            <TextArea label="Observaciones HSE" value={observacionesHSE} onChange={setObservacionesHSE} rows={2} />
          </div>
        </Section>

        <Section id="firma" title="Elaborado por" open={active === "firma"} onToggle={toggle}>
          <div className="flex gap-2">
            <Field label="Nombre" value={elaboradoNombre} onChange={setElaboradoNombre} half />
            <Field label="Cargo" value={elaboradoCargo} onChange={setElaboradoCargo} half />
          </div>
        </Section>

        {/* Generate button */}
        <div className="p-4">
          <button
            onClick={handleGenerar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-[13.5px]"
            style={{ background: GOLD }}
          >
            <ClipboardList size={17} /> Generar resumen del día
          </button>
        </div>

        {/* Summary section */}
        {resumen && (
          <div className="px-4 pb-6">
            <div
              className="border rounded-lg p-3"
              style={{ borderColor: LINE, background: PAPER }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold" style={{ color: NAVY }}>
                  RESUMEN LISTO PARA ENVIAR
                </div>
              </div>
              <pre
                className="whitespace-pre-wrap text-[12px] leading-relaxed mb-3"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#1C2B39" }}
              >
                {resumen}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={enviarWhatsapp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-white text-[12.5px] font-medium"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle size={15} /> Enviar por WhatsApp
                </button>
                <button
                  onClick={copiar}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-[12.5px] font-medium border"
                  style={{ borderColor: NAVY, color: NAVY }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
