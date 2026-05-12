// src/core/config/api.config.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://gpsapi.centralafbv.com/api/v1',
  TIMEOUT: 10000,
};
