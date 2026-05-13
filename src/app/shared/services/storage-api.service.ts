import { API_CONFIG } from '@/core/config/api.config';

export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  };
}

export class StorageApiService {
  private baseUrl = `${API_CONFIG.BASE_URL}/storage`;

  async uploadBrandingImage(file: File, taxId: string, type: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload/branding/${taxId}/${type}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al subir la imagen');
    }

    return await response.json();
  }
}
