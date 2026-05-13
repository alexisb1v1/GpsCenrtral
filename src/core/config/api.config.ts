// src/core/config/api.config.ts
const getBaseUrl = () => {
  // Si estamos en el servidor (SSR / Server Components)
  if (typeof window === 'undefined') {
    // En Docker, usamos el nombre del servicio. En local, localhost.
    return process.env.INTERNAL_API_URL || 'http://gpsapi:3000/api/v1';
  }
  // En el cliente (Navegador)
  return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
};
