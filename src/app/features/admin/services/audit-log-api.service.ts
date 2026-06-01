import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export interface AuditLogItemDto {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface GetAuditLogsParams {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  entityName?: string;
  page?: number;
  limit?: number;
}

export class AuditLogApiService {
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
   * Obtiene la bitácora de logs de auditoría aplicando filtros de búsqueda y paginación.
   */
  async getAuditLogs(params: GetAuditLogsParams): Promise<ApiResponseDto<AuditLogItemDto[]>> {
    const query = new URLSearchParams();
    if (params.tenantId) query.append('tenantId', params.tenantId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.action && params.action !== 'TODAS') query.append('action', params.action);
    if (params.entityName) query.append('entityName', params.entityName);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const response = await fetch(`${API_CONFIG.BASE_URL}/admin/audit-logs?${query.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    
    return this.handleResponse<AuditLogItemDto[]>(response);
  }
}
