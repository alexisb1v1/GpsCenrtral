/**
 * Calcula un hash SHA-256 a partir de una cadena de texto utilizando la Web Crypto API.
 */
async function sha256(message: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback simple si se ejecuta en SSR
    return message;
  }
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Obtiene o genera un UUID de dispositivo seguro almacenado en localStorage.
 */
function getOrCreateDeviceUUID(): string {
  if (typeof window === 'undefined') return '';
  
  const key = 'gps_device_uuid';
  let uuid = localStorage.getItem(key);
  
  if (!uuid) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      uuid = window.crypto.randomUUID();
    } else {
      // Fallback seguro alternativo en caso de navegadores antiguos o contextos no seguros
      uuid = 'f-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
    }
    localStorage.setItem(key, uuid);
  }
  
  return uuid;
}

/**
 * Genera una huella digital única del dispositivo basada en un UUID persistente
 * y metadatos del hardware, sistema y pantalla del usuario.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const uuid = getOrCreateDeviceUUID();
  const userAgent = navigator.userAgent || '';
  const language = navigator.language || '';
  const screenWidth = window.screen?.width || 0;
  const screenHeight = window.screen?.height || 0;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  
  // Concatenamos el UUID criptográfico con propiedades estables de hardware y entorno
  const rawData = `${uuid}|${userAgent}|${language}|${screenWidth}x${screenHeight}|${timeZone}`;
  
  // Retornamos el hash SHA-256 de la huella
  return await sha256(rawData);
}
