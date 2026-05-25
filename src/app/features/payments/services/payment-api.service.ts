import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export interface DailyTicketDto {
  id: string;
  vehicleId: string;
  driverId: string | null;
  routeId: string | null;
  workDate: string;
  totalAmount: number;
  adminFee: number;
  routeFee: number;
  status: string;
  paymentMethod: string;
  paymentReference: string | null;
  createdAt: string;
  vehicle?: {
    id: string;
    plate: string;
    number: string;
    brand?: string;
    model?: string;
  };
  driver?: {
    id: string;
    name: string;
    email?: string;
  };
  rounds?: any[];
}

export interface CreateDailyTicketDto {
  vehicleId: string;
  driverId?: string;
  routeId?: string;
  totalAmount: number;
  adminFee: number;
  routeFee: number;
  workDate?: string;
  paymentMethod: string;
  paymentReference?: string;
  direction?: string;
}

export class PaymentApiService {
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

  async getTickets(workDate?: string): Promise<ApiResponseDto<DailyTicketDto[]>> {
    const queryParams = workDate ? `?workDate=${workDate}` : '';
    const response = await fetch(`${API_CONFIG.BASE_URL}/daily-tickets${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<DailyTicketDto[]>(response);
  }

  async createTicket(data: CreateDailyTicketDto): Promise<ApiResponseDto<DailyTicketDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/daily-tickets/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<DailyTicketDto>(response);
  }
}
