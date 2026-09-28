import { useState, useEffect } from "react";

// Catálogos de actividades: un archivo por tipo de proyecto en public/catalogos/
//   edificacion.json · vias.json · hidrocarburos.json
// Cada archivo trae { version, tipo, actividades: [...] }.
//
// Funcionamiento:
//  1. Si el catálogo ya se descargó antes, se usa de inmediato (memoria o copia guardada en el celular).
//  2. En segundo plano se consulta el archivo del servidor. Si no cambió, casi no se descarga nada;
//     si cambió, se actualiza la copia guardada. Esa consulta se hace una sola vez por sesión.
//  3. Sin internet, se sigue usando la copia guardada. Solo la primera vez hace falta conexión.

const PREFIJO_COPIA = "ryr_catalogo_";
const enMemoria = {};   // catálogos ya cargados
const enVuelo = {};     // descargas en curso (para no repetirlas)
const consultado = {};  // tipos ya consultados al servidor en esta sesión

function leerCopiaLocal(tipo) {
  try {
    const texto = localStorage.getItem(PREFIJO_COPIA + tipo);
    if (!texto) return null;
    const datos = JSON.parse(texto);
    return datos && Array.isArray(datos.actividades) ? datos : null;
  } catch (e) {
    return null;
  }
}

function guardarCopiaLocal(tipo, datos) {
  try {
    localStorage.setItem(PREFIJO_COPIA + tipo, JSON.stringify(datos));
  } catch (e) {
    // Si la memoria del celular está llena, se sigue funcionando sin copia guardada
  }
}

// Devuelve el catálogo si ya está disponible sin esperar (memoria o copia guardada), o null
export function catalogoDisponible(tipo) {
  if (enMemoria[tipo]) return enMemoria[tipo];
  const local = leerCopiaLocal(tipo);
  if (local) enMemoria[tipo] = local;
  return local;
}

async function descargar(tipo) {
  const respuesta = await fetch(`/catalogos/${tipo}.json`, { cache: "no-cache" });
  if (!respuesta.ok) throw new Error(`No se encontró el catálogo de ${tipo} (código ${respuesta.status}).`);
  const texto = await respuesta.text();
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (e) {
    throw new Error(`El archivo del catálogo de ${tipo} no es válido. Verifica que esté en public/catalogos/.`);
  }
  if (!datos || !Array.isArray(datos.actividades)) {
    throw new Error(`El catálogo de ${tipo} tiene un formato inesperado.`);
  }
  enMemoria[tipo] = datos;
  consultado[tipo] = true;
  guardarCopiaLocal(tipo, datos);
  return datos;
}

// Descarga (o revalida) el catálogo del servidor. Si ya hay una descarga en curso, la reutiliza.
export function cargarCatalogo(tipo) {
  if (enVuelo[tipo]) return enVuelo[tipo];
  const promesa = descargar(tipo);
  enVuelo[tipo] = promesa;
  const liberar = () => { delete enVuelo[tipo]; };
  promesa.then(liberar, liberar);
  return promesa;
}

// Para los formularios: devuelve { actividades, cargando, error }
export function useCatalogo(tipo) {
  const [datos, setDatos] = useState(() => catalogoDisponible(tipo));
  const [cargando, setCargando] = useState(() => !catalogoDisponible(tipo));
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    const previo = catalogoDisponible(tipo);
    setDatos(previo);
    setCargando(!previo);
    setError(null);
    // Si ya hay catálogo y ya se consultó al servidor en esta sesión, no se vuelve a pedir
    if (!(previo && consultado[tipo])) {
      cargarCatalogo(tipo)
        .then((nuevo) => {
          if (!vigente) return;
          setDatos(nuevo);
          setCargando(false);
        })
        .catch((e) => {
          if (!vigente) return;
          setCargando(false);
          // Solo se muestra el error si no hay ninguna copia con qué trabajar
          if (!catalogoDisponible(tipo)) setError((e && e.message) || "No se pudo cargar el catálogo.");
        });
    }
    return () => {
      vigente = false;
    };
  }, [tipo]);

  return { actividades: datos ? datos.actividades : [], cargando, error };
}
