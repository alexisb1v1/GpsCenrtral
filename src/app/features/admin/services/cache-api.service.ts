import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export interface CacheItemDto {
  traccarDeviceId: number;
  vehicleId: string;
  tenantId: string;
  tenantName: string;
  dailyTicketId: string | null;
  plate: string;
  driverName: string | null;
  driverId: string | null;
  routeId: string | null;
  routeName: string;
  direction: 'IDA' | 'VUELTA' | null;
  lastPosition?: any;
  hasActiveTicket: boolean;
}

export class CacheApiService {
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
      data = { errorMessage: 'Error al parsear respuesta del servidor' };
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
        meta: {
          timestamp: new Date().toISOString()
        }
      } as ApiResponseDto<T>;
    }

    return data;
  }

  /**
   * Obtiene la previsualización de diagnóstico legible de la caché de monitoreo.
   */
  async getCacheStatus(): Promise<ApiResponseDto<CacheItemDto[]>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/monitoring/cache/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    
    const result = await this.handleResponse<any>(response) as any;
    
    // Mapear de forma robusta al formato estándar del frontend
    const isSuccess = result?.status === 'success' || result?.success === true;
    const dataList = result?.data || [];
    
    return {
      success: isSuccess,
      data: dataList,
      errorMessage: isSuccess ? undefined : (result?.errorMessage || 'No se pudo obtener el estado de la caché'),
      meta: {
        timestamp: new Date().toISOString()
      }
    } as ApiResponseDto<CacheItemDto[]>;
  }

  /**
   * Dispara el restablecimiento y rehidratación de la caché.
   */
  async resetCache(unlinkDevices: boolean): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/monitoring/cache/reset`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ unlinkDevices }),
    });

    const result = await this.handleResponse<any>(response) as any;
    
    const isSuccess = result?.status === 'success' || result?.success === true;
    
    return {
      success: isSuccess,
      data: result,
      errorMessage: isSuccess ? undefined : (result?.errorMessage || result?.message || 'Error al restablecer la caché'),
      meta: {
        timestamp: new Date().toISOString()
      }
    } as ApiResponseDto<any>;
  }
}
