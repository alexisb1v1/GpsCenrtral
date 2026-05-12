// src/shared/errors/error-codes.ts
export const ERROR_CODES = {
  NETWORK_ERROR:    { code: 'NET_001', message: 'Error de conexión con el servidor' },
  NOT_FOUND:        { code: 'RES_001', message: 'Recurso no encontrado' },
  UNAUTHORIZED:     { code: 'AUTH_001', message: 'Sesión expirada o no autorizado' },
  VALIDATION_ERROR: { code: 'VAL_001', message: 'Datos de entrada inválidos' },
  INTERNAL_ERROR:   { code: 'INT_001', message: 'Error interno de la aplicación' },
  CONFLICT:         { code: 'BIZ_001', message: 'Conflicto de negocio o dato duplicado' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class DomainError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DomainError';
    
    // Asegurar que el stack trace se capture correctamente en entornos que lo soportan
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }
}
