import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { RouteDto, CreateRouteRequest, UpdateRouteStopsRequest } from '../dto/route.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class RouteApiService {
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

  async getList(tenantId?: string): Promise<ApiResponseDto<RouteDto[]>> {
    // Si somos Vectura Central o un SuperAdmin que quiere filtrar, podemos pasar tenantId, sino la API lee del token.
    const url = tenantId ? `/routes/list?tenantId=${tenantId}` : '/routes/list';
    const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<RouteDto[]>(response);
  }

  async getDetail(id: string): Promise<ApiResponseDto<RouteDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/routes/detail/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<RouteDto>(response);
  }

  async create(data: CreateRouteRequest): Promise<ApiResponseDto<RouteDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/routes/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<RouteDto>(response);
  }

  async updateStops(id: string, data: UpdateRouteStopsRequest): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/routes/${id}/stops`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<void>(response);
  }
}
