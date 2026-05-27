// src/app/shared/utils/access-control.ts
import { UserRole } from '@/app/features/user/models/user.model';

export class AccessControl {
  /**
   * Determina si un rol de usuario tiene acceso a una ruta (path) específica del frontend.
   * Maneja tanto coincidencias exactas como subrutas dinámicas de forma segura.
   */
  static hasAccess(role: UserRole | string | undefined, path: string): boolean {
    if (!role) return false;

    // Normalizar la ruta eliminando query params y barras diagonales finales
    let cleanPath = path.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    // El rol SUPER_ADMIN tiene acceso absoluto a todas las rutas
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // El rol ADMIN ve todo excepto la gestión de empresas (tenants)
    if (role === 'ADMIN') {
      if (cleanPath === '/admin/tenants' || cleanPath.startsWith('/admin/tenants/')) {
        return false;
      }
      return true;
    }

    // El rol OPERATOR (Controlador) tiene un conjunto específico de herramientas operativas
    if (role === 'OPERATOR') {
      const allowedPrefixes = [
        '/dashboard',
        '/fleet',
        '/payments',
        '/penalties',
        '/history',
        '/admin/vehicles',
        '/admin/drivers'
      ];

      return allowedPrefixes.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + '/'));
    }

    // El rol DRIVER (Chofer) solo ve el mapa de su unidad, sus sanciones y sus salidas
    if (role === 'DRIVER') {
      const allowedPrefixes = [
        '/driver',
        '/penalties',
        '/payments'
      ];

      return allowedPrefixes.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + '/'));
    }

    return false;
  }

  /**
   * Filtra una lista genérica de ítems de menú (que contengan la propiedad href)
   * basándose en si el rol de usuario tiene permisos para visualizar cada ruta.
   */
  static getVisibleMenuItems<T extends { href: string }>(role: UserRole | string | undefined, items: T[]): T[] {
    if (!role) return [];
    return items.filter(item => this.hasAccess(role, item.href));
  }
}
