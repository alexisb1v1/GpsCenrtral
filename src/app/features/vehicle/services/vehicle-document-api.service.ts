import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { VehicleDocumentDto, CreateVehicleDocumentDto } from '../dto/vehicle-document.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class VehicleDocumentApiService {
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
      return {
        success: false,
        errorCode: data.errorCode || 'ERR_UNKNOWN',
        errorMessage: data.errorMessage || data.message || 'Error desconocido',
        data: null as unknown as T,
        statusCode: response.status,
        meta: {
          timestamp: new Date().toISOString()
        }
      } as ApiResponseDto<T>;
    }

    return data;
  }

  async getByVehicle(vehicleId: string): Promise<ApiResponseDto<VehicleDocumentDto[]>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicle-documents/vehicle/${vehicleId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<VehicleDocumentDto[]>(response);
  }

  async create(data: CreateVehicleDocumentDto): Promise<ApiResponseDto<VehicleDocumentDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicle-documents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<VehicleDocumentDto>(response);
  }

  async delete(id: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/vehicle-documents/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }
}
