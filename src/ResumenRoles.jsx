// ResumenRoles.jsx — resumen de roles y permisos (solo lectura). Se abre desde «Administrar Usuarios», que solo ve el Administrador.
// Muestra, para cada formato de cada aplicación, qué rol lo abre y lo llena, y cuántos usuarios tiene cada rol, para revisar los permisos
// antes de crear usuarios reales. Los permisos reales se leen de los mismos datos que usa la aplicación (módulos y MATRIZ_CP), no se repiten aquí.
import React, { useState } from "react";
import { ROLES_CP, MATRIZ_CP } from "./cpPermisos";

const NAVY = "#1B2A45", GOLD = "#D9A233", PAPER = "#F7F7F5", LINE = "#D9DCE1";
const AREAS = [
  { id: "tecnica", nombre: "Gestión Técnica", corto: "Técnica" },
  { id: "sst", nombre: "Gestión SST", corto: "SST" },
  { id: "ambiental", nombre: "Gestión Ambiental", corto: "Ambiental" },
  { id: "calidad", nombre: "Gestión de Calidad", corto: "Calidad" },
  { id: "presupuesto", nombre: "Control Presupuestal", corto: "Presupuesto" },
];
const SIMBOLO = { E: "✎", V: "👁", N: "—" };
const Marca = ({ n }) => <span style={{ color: n === "E" ? "#1E7B4B" : n === "V" ? "#A6761D" : "#B5B9C0", fontWeight: n === "N" ? 400 : 700 }}>{SIMBOLO[n]}</span>;

export default function ResumenRoles({ usuarios = [], modulosPorArea = {}, onVolver }) {
  const [abierta, setAbierta] = useState("tecnica");
  const usuariosDe = (rol) => usuarios.filter((u) => u.esAdmin ? false : (u.roles || []).includes(rol));
  const admins = usuarios.filter((u) => u.esAdmin);
  const sinRol = usuarios.filter((u) => !u.esAdmin && !(u.roles || []).length);
  return (
    <div className="min-h-screen" data-resumen-roles style={{ background: PAPER, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div className="px-4 pt-5 pb-4" style={{ background: NAVY }}>
        <button onClick={onVolver} className="text-white/80 text-[12.5px] mb-2">← Volver</button>
        <div className="text-white font-bold text-[16px]">Resumen de roles y permisos</div>
        <div className="text-white/70 text-[11.5px] mt-1">Solo lectura · solo lo ve el Administrador</div>
      </div>
      <div className="p-4 max-w-3xl mx-auto">
        <div className="rounded-xl p-3 mb-4 text-[12px] leading-snug" style={{ background: "#FFF8E5", border: `1px solid ${GOLD}`, color: NAVY }}>
          <b>Cómo se lee:</b> <Marca n="E" /> abre y llena · <Marca n="V" /> solo consulta · <Marca n="N" /> no lo ve. El Administrador abre y llena todo.
          Un usuario puede tener varias áreas (por ejemplo, un residente con Calidad y Control Presupuestal). La Interventoría no es un rol: recibe el Excel o PDF que se le envía.
        </div>

        <div className="text-[13px] font-bold mb-2" style={{ color: NAVY }}>Usuarios por rol</div>
        <div className="rounded-xl bg-white mb-5 overflow-hidden" style={{ border: `1px solid ${LINE}` }} data-bloque="usuarios">
          {[{ id: "admin", nombre: "Administrador", lista: admins }, ...AREAS.map((a) => ({ id: a.id, nombre: a.nombre, lista: usuariosDe(a.id) }))].map((f) => (
            <div key={f.id} data-rol={f.id} data-total={f.lista.length} className="px-3 py-2 text-[12px] flex gap-2" style={{ borderBottom: `1px solid ${LINE}` }}>
              <div className="font-semibold shrink-0" style={{ color: NAVY, width: 150 }}>{f.nombre}</div>
              <div className="text-gray-600 flex-1">{f.lista.length ? f.lista.map((u) => u.nombre || u.correo).join(", ") : <span className="text-gray-400">Ningún usuario</span>}<span className="text-gray-400"> ({f.lista.length})</span></div>
            </div>
          ))}
          {sinRol.length > 0 && <div data-sin-rol className="px-3 py-2 text-[12px]" style={{ background: "#FDECEA", color: "#8A1F17" }}>Sin ningún rol (no podrán abrir nada): {sinRol.map((u) => u.nombre || u.correo).join(", ")}</div>}
        </div>

        <div className="text-[13px] font-bold mb-2" style={{ color: NAVY }}>Formatos por área</div>
        {AREAS.map((a) => {
          const mods = modulosPorArea[a.id] || [];
          const cp = a.id === "presupuesto";
          return (
            <div key={a.id} className="rounded-xl bg-white mb-3 overflow-hidden" style={{ border: `1px solid ${LINE}` }} data-area={a.id}>
              <button type="button" onClick={() => setAbierta(abierta === a.id ? "" : a.id)} className="w-full flex items-center justify-between px-3 py-2.5 text-left" style={{ background: abierta === a.id ? "#EEF1F6" : "white" }}>
                <div><span className="font-bold text-[13px]" style={{ color: NAVY }}>{a.nombre}</span><span className="text-[11.5px] text-gray-500"> · {mods.length} formatos · {usuariosDe(a.id).length} usuario(s)</span></div>
                <span style={{ color: NAVY }}>{abierta === a.id ? "▾" : "▸"}</span>
              </button>
              {abierta === a.id && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px]" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F2F2F2", color: NAVY }}>
                        <th className="text-left px-3 py-1.5">Formato</th>
                        <th className="px-2 py-1.5">Admin.</th>
                        {cp ? ROLES_CP.map((r) => <th key={r.id} className="px-2 py-1.5">{r.nombre}</th>) : <th className="px-2 py-1.5">{a.corto}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {mods.map((m) => (
                        <tr key={m.id} data-fila={m.id} style={{ borderTop: `1px solid ${LINE}` }}>
                          <td className="px-3 py-1.5" style={{ color: NAVY }}>{m.nombre}{m.activo === false && <span className="text-gray-400"> (próximamente)</span>}</td>
                          <td className="text-center px-2" data-celda="admin"><Marca n="E" /></td>
                          {cp ? ROLES_CP.map((r) => <td key={r.id} className="text-center px-2" data-celda={r.id}><Marca n={(MATRIZ_CP[m.id] || {})[r.id] || "N"} /></td>) : <td className="text-center px-2" data-celda={a.id}><Marca n="E" /></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cp && <div className="px-3 py-2 text-[11px] text-gray-500">Además del área «Control Presupuestal», el usuario debe tener un cargo asignado; sin cargo no ve ningún módulo.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
