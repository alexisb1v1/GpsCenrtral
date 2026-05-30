import Cookies from 'js-cookie';
import { Result, ok, err } from 'neverthrow';
import { API_CONFIG } from '@/core/config/api.config';
import { Infraction } from '../models/infraction.model';
import { InfractionRepository } from './infraction.repository';
import { DomainError } from '@/shared/errors/error-codes';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class HttpInfractionRepository implements InfractionRepository {
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

  async getFiltered(filters: {
    tenantId?: string;
    driverId?: string;
    date?: string;
  }): Promise<Result<Infraction[], DomainError>> {
    try {
      const params = new URLSearchParams();
      if (filters.tenantId) params.append('tenantId', filters.tenantId);
      if (filters.driverId) params.append('driverId', filters.driverId);
      if (filters.date) params.append('date', filters.date);

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const response = await fetch(`${API_CONFIG.BASE_URL}/infractions${queryString}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        cache: 'no-store',
      });

      const apiResult = await this.handleResponse<any[]>(response);

      if (!apiResult.success) {
        return err(new DomainError(
          apiResult.errorMessage || 'Error al obtener infracciones', 
          apiResult.errorCode || 'ERR_UNKNOWN'
        ));
      }

      const domainInfractions: Infraction[] = apiResult.data.map(dto => ({
        id: dto.id,
        tenantId: dto.tenantId,
        vehicleId: dto.vehicleId,
        userId: dto.userId,
        type: dto.type,
        amount: Number(dto.amount),
        status: dto.status,
        description: dto.description,
        cancellationReason: dto.cancellationReason,
        paymentId: dto.paymentId,
        createdAt: new Date(dto.createdAt),
        vehicle: dto.vehicle ? {
          id: dto.vehicle.id,
          plate: dto.vehicle.plate,
          traccarDeviceId: dto.vehicle.traccarDeviceId,
          year: dto.vehicle.year,
          status: dto.vehicle.status,
          passengerCapacity: dto.vehicle.passengerCapacity,
          ownerName: dto.vehicle.ownerName,
          ownerPhone: dto.vehicle.ownerPhone,
          tenantId: dto.vehicle.tenantId,
          createdAt: new Date(dto.vehicle.createdAt),
        } : undefined,
        payment: dto.payment ? {
          id: dto.payment.id,
          paymentNumber: dto.payment.paymentNumber,
          amount: Number(dto.payment.amount),
          paymentMethod: dto.payment.paymentMethod,
          createdAt: new Date(dto.payment.createdAt),
        } : undefined,
      }));

      return ok(domainInfractions);
    } catch (e: any) {
      return err(new DomainError(e.message || 'Error de conexión', 'ERR_CONNECTION'));
    }
  }

  async payMultiple(params: {
    infractionIds: string[];
    paymentMethod: string;
    operationReference?: string;
  }): Promise<Result<{ paymentNumber: string; totalAmount: number }, DomainError>> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/infractions/pay-multiple`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          infractionIds: params.infractionIds,
          paymentMethod: params.paymentMethod,
          operationReference: params.operationReference || undefined,
        }),
      });

      const apiResult = await this.handleResponse<{ paymentNumber: string; totalAmount: number }>(response);

      if (!apiResult.success) {
        return err(new DomainError(
          apiResult.errorMessage || 'Error al registrar pago consolidado',
          apiResult.errorCode || 'ERR_UNKNOWN'
        ));
      }

      return ok(apiResult.data);
    } catch (e: any) {
      return err(new DomainError(e.message || 'Error de conexión', 'ERR_CONNECTION'));
    }
  }
}
