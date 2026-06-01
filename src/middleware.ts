import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_CONFIG } from '@/core/config/api.config';

// Caché simple en memoria para dominios permitidos del tenant con TTL de 5 minutos
const domainsCache = new Map<string, { allowedDomains: string | null; expireAt: number }>();

// Función segura de extracción y parseo del rol
function parseRoleFromCookie(cookieValue: string): string | null {
  try {
    const decoded = decodeURIComponent(cookieValue);
    const session = JSON.parse(decoded);
    return session?.user?.role || null;
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // 0. Interceptar vistas embebidas del mapa y establecer CSP frame-ancestors dinámico
  const embedMatch = url.pathname.match(/^\/embed\/map\/([^/]+)/);
  if (embedMatch) {
    const slug = embedMatch[1];
    let allowedDomains: string | null = null;
    const now = Date.now();
    const cached = domainsCache.get(slug);

    if (cached && cached.expireAt > now) {
      allowedDomains = cached.allowedDomains;
    } else {
      try {
        const apiUrl = API_CONFIG.BASE_URL;
        
        // Hacemos un fetch rápido con timeout para no bloquear la petición
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/public/monitoring/${slug}/allowed-domains`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          allowedDomains = data.allowedDomains;
          domainsCache.set(slug, {
            allowedDomains,
            expireAt: now + 5 * 60 * 1000, // 5 min TTL
          });
        }
      } catch (e) {
        console.error('[Middleware] Error al obtener dominios permitidos para slug:', slug, e);
      }
    }

    const response = NextResponse.next();
    
    // Si no hay dominios restringidos configurados en el tenant (nulo o vacío), permitimos la carga libre (sin inyectar CSP)
    if (!allowedDomains || allowedDomains.trim() === '' || allowedDomains === 'null') {
      return response;
    }
    
    // Formatear dominios para la directiva CSP (separados por espacios en CSP)
    const domainsList = allowedDomains
      .split(',')
      .map(d => d.trim())
      .join(' ');

    const cspValue = `frame-ancestors 'self' ${domainsList}`.trim() + ';';
    
    // Inyectar cabecera de seguridad estricta
    response.headers.set('Content-Security-Policy', cspValue);
    return response;
  }

  const response = NextResponse.next();

  // 1. Lógica de Detección de Dispositivo
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Guardar en cabeceras de la petición y setear una cookie de tipo de dispositivo
  request.headers.set('x-device-type', isMobile ? 'mobile' : 'desktop');
  response.cookies.set('gps_central_device', isMobile ? 'mobile' : 'desktop', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
  });

  // 2. Lógica de Seguridad y Roles (RBAC del Servidor)
  const sessionCookie = request.cookies.get('gps_central_session');
  const userRole = sessionCookie ? parseRoleFromCookie(sessionCookie.value) : null;

  // Rutas administrativas protegidas
  const adminRoutes = ['/fleet', '/admin', '/payments', '/vehicles', '/dashboard', '/driver-list'];
  
  const isTargetingAdminRoute = adminRoutes.some(path => url.pathname.startsWith(path));

  if (isTargetingAdminRoute) {
    if (userRole === 'DRIVER') {
      // Si el rol es DRIVER, redirigir inmediatamente a su portal
      url.pathname = '/driver';
      return NextResponse.redirect(url);
    }
  }

  // Si un administrador o super_admin intenta acceder por error a la vista del chofer, lo redirigimos a su dashboard
  if (url.pathname.startsWith('/driver') && userRole !== 'DRIVER' && userRole !== null) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

// Optimización: Solo ejecutar el middleware en rutas de la aplicación
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|imagelogin.png).*)',
  ],
};
