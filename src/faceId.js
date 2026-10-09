// Ingreso con Face ID / huella / Windows Hello como ALTERNATIVA al correo y la contraseña.
// - Usa WebAuthn (autenticador de la plataforma): el sistema operativo pide Face ID, huella o PIN del equipo.
// - Los datos de acceso quedan cifrados (AES-GCM) con una llave NO extraíble guardada en este dispositivo.
// - Solo funciona en el dispositivo donde se activó. No reemplaza el ingreso con correo y contraseña.
const BD = "saiea_faceid";
const ALM = "acceso";
const CLAVE = "principal";

function abrirBD() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALM);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function leer() {
  const bd = await abrirBD();
  return new Promise((resolve, reject) => {
    const q = bd.transaction(ALM, "readonly").objectStore(ALM).get(CLAVE);
    q.onsuccess = () => resolve(q.result || null);
    q.onerror = () => reject(q.error);
  });
}
async function escribir(valor) {
  const bd = await abrirBD();
  return new Promise((resolve, reject) => {
    const t = bd.transaction(ALM, "readwrite");
    if (valor) t.objectStore(ALM).put(valor, CLAVE); else t.objectStore(ALM).delete(CLAVE);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
const aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function faceIdDisponible() {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential || !window.indexedDB || !crypto?.subtle) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function faceIdActivado(correo) {
  try {
    const r = await leer();
    if (!r) return false;
    return correo ? r.correo === String(correo).trim().toLowerCase() : true;
  } catch { return false; }
}

export async function faceIdCorreoGuardado() {
  try { const r = await leer(); return r ? r.correo : ""; } catch { return ""; }
}

// Paso 1 (con el gesto del usuario): registra la credencial biométrica del dispositivo.
export async function faceIdRegistrar(correo) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32),
      rp: { name: "SAIEA OBRAS", id: location.hostname },
      user: { id: aleatorio(16), name: correo, displayName: correo },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
      attestation: "none",
    },
  });
  if (!cred) throw new Error("sin credencial");
  return new Uint8Array(cred.rawId);
}

// Paso 2 (después de comprobar que la contraseña es correcta): guarda los datos cifrados.
export async function faceIdGuardar(idCredencial, correo, contrasena) {
  const llave = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = aleatorio(12);
  const datos = new TextEncoder().encode(JSON.stringify({ contrasena }));
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave, datos);
  await escribir({ correo: String(correo).trim().toLowerCase(), idCredencial, llave, iv, cifrado });
}

// Pide Face ID / huella y devuelve { correo, contrasena } para iniciar sesión.
export async function faceIdIngresar() {
  const r = await leer();
  if (!r) throw new Error("no-activado");
  const prueba = await navigator.credentials.get({
    publicKey: {
      challenge: aleatorio(32),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: r.idCredencial, transports: ["internal"] }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!prueba) throw new Error("cancelado");
  const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: r.iv }, r.llave, r.cifrado);
  return { correo: r.correo, contrasena: JSON.parse(new TextDecoder().decode(plano)).contrasena };
}

export async function faceIdDesactivar() {
  try { await escribir(null); } catch { /* sin efecto */ }
}
