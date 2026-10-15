// FormularioCompras.jsx — los formatos de Gestión de Compras usan la misma pantalla de los formatos de Calidad (se arma sola desde su especificación en comFormatos.js).
import FormularioCalidad from "./FormularioCalidad";

export default function FormularioCompras({ fmt, onVolver, usuario = "", puedeCalidad = true }) {
  return <FormularioCalidad fmt={fmt} onVolver={onVolver} puedeCalidad={puedeCalidad} usuario={usuario} />;
}
