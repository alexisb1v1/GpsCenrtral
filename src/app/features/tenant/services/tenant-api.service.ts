// src/app/features/tenant/services/tenant-api.service.ts
import { API_CONFIG } from '@/core/config/api.config';
import { TenantBrandingDto } from '../dto/tenant.dto';
import { ApiResponseDto } from '@/shared/dto/api-response.dto';

export class TenantApiService {
  async fetchBranding(slug: string): Promise<ApiResponseDto<TenantBrandingDto>> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tenants/branding/${slug}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
