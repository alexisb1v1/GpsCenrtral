import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
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
