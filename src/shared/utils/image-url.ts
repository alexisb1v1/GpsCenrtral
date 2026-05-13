/**
 * Utilidad para normalizar las URLs de las imágenes de branding.
 * Si la URL ya es absoluta (como las de S3), la devuelve tal cual.
 * Si es una ruta relativa (como las antiguas /uploads), le añade la URL del API.
 */
export const getBrandingImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;

  // Si ya es una URL completa (S3 o externa), la devolvemos
  if (url.startsWith('http')) {
    return url;
  }

  // Si es una ruta relativa, le añadimos la URL del Backend
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
  
  // Limpiamos posibles barras duplicadas
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${cleanUrl}`;
};
