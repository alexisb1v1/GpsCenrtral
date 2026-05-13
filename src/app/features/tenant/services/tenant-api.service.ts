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

  async fetchBranding(slug: string): Promise<ApiResponseDto<TenantBrandingDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/branding/${slug}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async getAll(): Promise<ApiResponseDto<any[]>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async getById(id: string): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async create(data: any): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async update(id: string, data: any): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async delete(id: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
}
