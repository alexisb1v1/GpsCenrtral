// src/app/features/auth/services/auth-api.service.ts
import { API_CONFIG } from '@/core/config/api.config';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';
import { LoginResponseDto } from '../dto/auth.dto';
import { LoginParams } from '../use-cases/login.use-case';

export class AuthApiService {
  async login(params: LoginParams): Promise<ApiResponseDto<LoginResponseDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // Intentamos parsear el error si el API lo devuelve en nuestro formato
      try {
        const errorData = await response.json();
        return errorData;
      } catch {
        throw new Error(`Auth API Error: ${response.status} ${response.statusText}`);
      }
    }

    return response.json();
  }

  async refresh(refreshToken: string, deviceFingerprint: string): Promise<ApiResponseDto<{ token: string; refreshToken: string }>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refreshToken, deviceFingerprint }),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        return errorData;
      } catch {
        throw new Error(`Auth API Error: ${response.status} ${response.statusText}`);
      }
    }

    return response.json();
  }
}
