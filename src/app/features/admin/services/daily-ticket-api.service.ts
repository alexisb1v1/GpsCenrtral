import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class DailyTicketApiService {
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

    return {
      success: true,
      data: data.data || data,
      meta: {
        timestamp: new Date().toISOString()
      }
    } as ApiResponseDto<T>;
  }

  /**
   * Inicia el recorrido de una vuelta (pasa de PENDING a IN_PROGRESS).
   */
  async startRound(roundId: string): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/daily-tickets/rounds/${roundId}/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<any>(response);
  }

  /**
   * Completa el recorrido de una vuelta de forma manual por contingencia de GPS.
   */
  async completeRound(roundId: string): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/daily-tickets/rounds/${roundId}/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<any>(response);
  }

  /**
   * Finaliza la jornada laboral del chofer (cierra el ticket diario actual).
   */
  async closeWorkday(ticketId: string): Promise<ApiResponseDto<any>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/daily-tickets/${ticketId}/close`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<any>(response);
  }
}
