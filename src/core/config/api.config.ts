// src/core/config/api.config.ts
const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Servidor: Docker usa INTERNAL_API_URL, Local usa localhost
    return process.env.INTERNAL_API_URL || 'http://localhost:3000/api/v1';
  }
  // Cliente: Usa variable pública o relativa
  return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
};
