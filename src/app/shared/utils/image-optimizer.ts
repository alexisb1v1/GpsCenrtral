/**
 * Utilidad para optimizar imágenes en el cliente antes de subirlas.
 * Reduce dimensiones y comprime la calidad para ahorrar ancho de banda y almacenamiento.
 */

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export const optimizeImage = async (
  file: File,
  options: OptimizeOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'image/webp' // Usamos WebP por defecto por ser más eficiente
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo el aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al generar el blob de la imagen'));
              return;
            }

            // Crear el nuevo archivo optimizado
            const fileName = file.name.replace(/\.[^/.]+$/, "") + (format === 'image/webp' ? '.webp' : '.jpg');
            const optimizedFile = new File([blob], fileName, {
              type: format,
              lastModified: Date.now(),
            });

            resolve(optimizedFile);
          },
          format,
          quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar la imagen'));
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
};
