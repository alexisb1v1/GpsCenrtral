// src/shared/utils/tenant.utils.ts

/**
 * Extrae el slug del tenant basado en el host (dominio/subdominio).
 * Ejemplo: 'transportesanjuan.centralafbv.com' -> 'transportesanjuan'
 */
export function extractTenantSlug(host: string | null): string {
  if (!host) return 'default';

  // Si es un dominio real (no localhost), priorizamos la extracción del subdominio
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    const parts = host.split('.');
    if (parts.length >= 2) {
      // Si el dominio es centralafbv.com, el slug es la primera parte
      return parts[0];
    }
  }

  // Fallback para desarrollo
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'vectura';
}

/**
 * Obtiene el slug del tenant desde el lado del cliente.
 * Solo debe llamarse en componentes con 'use client' o dentro de useEffect.
 */
export function getTenantSlugClient(): string {
  if (typeof window !== 'undefined') {
    return extractTenantSlug(window.location.host);
  }
  return 'default';
}

/**
 * Mantenemos getTenantSlug por compatibilidad, pero ahora requiere que se le pase el host
 * si se llama desde el servidor para evitar importar next/headers aquí.
 */
export async function getTenantSlug(host?: string): Promise<string> {
  if (host) return extractTenantSlug(host);
  return getTenantSlugClient();
}
