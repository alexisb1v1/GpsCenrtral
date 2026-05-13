import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { TenantBrandingDto } from '../dto/tenant.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class TenantApiService {
  private getAuthHeaders() {
    const sessionStr = Cookies.get('gps_central_session');
    let token = '';
    
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        token = session.token;
      } catch (e) {
        console.error('Error parsing session cookie', e);
      }
    }

    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponseDto<T>> {
    const data = await response.json();
    
    if (!response.ok) {
      // Extraer mensaje del backend (NestJS suele enviar 'message' como string o array de strings)
      let errorMessage = data.errorMessage || data.message || 'Error desconocido en el servidor';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join('. ');
      }
      
      return {
        success: false,
        errorCode: data.errorCode || 'ERR_UNKNOWN',
        errorMessage: errorMessage,
        data: null as unknown as T,
        statusCode: response.status,
        meta: {
          timestamp: new Date().toISOString()
        }
      } as ApiResponseDto<T>;
    }

    return data;
  }

  async fetchBranding(slug: string): Promise<ApiResponseDto<TenantBrandingDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/branding/${slug}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    return this.handleResponse<TenantBrandingDto>(response);
  }

  async getAll(): Promise<ApiResponseDto<any[]>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<any[]>(response);
  }

  async getById(id: string): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<any>(response);
  }

  async create(data: any): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async update(id: string, data: any): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async delete(id: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }
}
