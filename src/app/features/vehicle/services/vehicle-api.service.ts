import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { VehicleDto, CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class VehicleApiService {
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
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { message: 'Error al parsear respuesta del servidor' };
    }

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

  async getAll(tenantId?: string): Promise<ApiResponseDto<VehicleDto[]>> {
    const queryParams = tenantId ? `?tenantId=${tenantId}` : '';
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<VehicleDto[]>(response);
  }

  async getById(id: string): Promise<ApiResponseDto<VehicleDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<VehicleDto>(response);
  }

  async create(data: CreateVehicleDto): Promise<ApiResponseDto<VehicleDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<VehicleDto>(response);
  }

  async update(id: string, data: UpdateVehicleDto): Promise<ApiResponseDto<VehicleDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<VehicleDto>(response);
  }

  async delete(id: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }
}
