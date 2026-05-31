/* src/app/features/dashboard/services/dashboard-api.service.ts */
import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export interface DashboardKpisDto {
  totalRevenueToday: number;
  revenueTrendLabel: string;
  vehiclesInRouteCount: number;
  vehiclesPendingCount: number;
}

export interface MonitoringUnitDto {
  id: string;
  vehiclePlate: string;
  vehicleNumber: string | null;
  driverName: string;
  routeName: string;
  direction: string;
  dispatchedAt: string;
}

export interface RecentAlertDto {
  id: string;
  vehiclePlate: string;
  type: string;
  amount: number;
  detail: string;
  createdAt: string;
}

export interface RecentTicketDto {
  id: string;
  ticketNumber: string;
  vehiclePlate: string;
  totalAmount: number;
  dispatchedAt: string;
}

export interface DashboardMetricsDto {
  kpis: DashboardKpisDto;
  monitoringUnits: MonitoringUnitDto[];
  recentAlerts: RecentAlertDto[];
  recentTickets: RecentTicketDto[];
}

export class DashboardApiService {
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

    // Adaptador de compatibilidad para endpoints NestJS directos que devuelven data pura
    // En NestJS CQRS y matchResult, la respuesta exitosa a veces viene envuelta en ApiResponseDto, o cruda.
    // Si viene cruda, la envolvemos en el formato estándar del cliente.
    if (data && data.success !== undefined && data.data !== undefined) {
      return data;
    }

    return {
      success: true,
      data: data as T,
      statusCode: response.status,
      errorCode: '',
      errorMessage: '',
      meta: {
        timestamp: new Date().toISOString()
      }
    } as ApiResponseDto<T>;
  }

  async getMetrics(): Promise<ApiResponseDto<DashboardMetricsDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/dashboard/metrics`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<DashboardMetricsDto>(response);
  }
}
