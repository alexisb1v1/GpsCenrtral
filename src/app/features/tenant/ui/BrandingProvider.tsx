// src/app/features/tenant/ui/BrandingProvider.tsx
import { getTenantBrandingUseCase } from '../index';
import { getTenantSlug } from '@/shared/utils/tenant.utils';
import { headers } from 'next/headers';

export default async function BrandingProvider() {
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = await getTenantSlug(host || undefined);
  
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
      // Solo logueamos como error si NO es el inquilino por defecto
      // Esto evita ruido en la consola cuando vectura aún no existe en el backend
      if (slug !== 'vectura') {
        console.warn(`[Branding] No se pudo cargar la configuración para "${slug}". Usando tema base.`, error);
      } else {
        console.log(`[Branding] Usando tema estándar de Vectura (Base local).`);
      }
      return null;
    }
  );
}
