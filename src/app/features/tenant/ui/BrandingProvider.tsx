// src/app/features/tenant/ui/BrandingProvider.tsx
import { getTenantBrandingUseCase } from '../index';
import { getTenantSlug } from '@/shared/utils/tenant.utils';
import { headers } from 'next/headers';

export default async function BrandingProvider() {
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = await getTenantSlug(host || undefined);
  
  console.log(`[Branding] Aplicando identidad visual para: host=${host}, slug=${slug}`);

  // Si no hay slug (caso raro) o el fetch falla, no inyectamos nada y dejamos los estilos base
  const result = await getTenantBrandingUseCase.execute(slug);

  return result.match(
    (branding) => (
      <style id="tenant-branding-tokens">
        {`
          :root {
            --primary: ${branding.colors.primary};
            --success: ${branding.colors.status};
            --accent: ${branding.colors.accent};
          }
        `}
      </style>
    ),
    (error) => {
      // Si el error indica que la empresa está inactiva (prohibido)
      // Mostramos una pantalla de bloqueo premium
      if (error.code === 'FORBIDDEN' && slug !== 'vectura') {
        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              padding: '40px',
              backgroundColor: 'white',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
              maxWidth: '400px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '20px', 
                backgroundColor: '#fef2f2', color: '#ef4444', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>block</span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                Acceso Restringido
              </h1>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                La instancia para <strong>{slug}</strong> se encuentra temporalmente inactiva o suspendida. Por favor, contacte con el administrador del sistema.
              </p>
              <a href="https://centralafbv.com" style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#1e293b',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Volver al Portal Central
              </a>
            </div>
          </div>
        );
      }

      if (slug !== 'vectura') {
        console.warn(`[Branding] No se pudo cargar la configuración para "${slug}". Usando tema base.`, error);
      }
      return null;
    }
  );
}
