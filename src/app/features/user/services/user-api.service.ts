// src/app/features/user/services/user-api.service.ts
import Cookies from 'js-cookie';
import { API_CONFIG } from '@/core/config/api.config';
import { UserDto, CreateUserRequest, UpdateUserRequest } from '../dto/user.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class UserApiService {
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

  async getByTenant(tenantId: string): Promise<ApiResponseDto<UserDto[]>> {
    const url = tenantId ? `/users/tenant/${tenantId}` : '/users/tenant';
    const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<UserDto[]>(response);
  }

  async getById(id: string): Promise<ApiResponseDto<UserDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<UserDto>(response);
  }

  async create(data: CreateUserRequest): Promise<ApiResponseDto<UserDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UserDto>(response);
  }

  async update(id: string, data: UpdateUserRequest): Promise<ApiResponseDto<UserDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UserDto>(response);
  }

  async delete(id: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  async resetPassword(userId: string, newPassword: string): Promise<ApiResponseDto<void>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/user/reset-password/${userId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return this.handleResponse<void>(response);
  }
}
