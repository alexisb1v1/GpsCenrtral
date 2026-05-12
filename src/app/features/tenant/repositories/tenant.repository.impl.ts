// src/app/features/tenant/repositories/tenant.repository.impl.ts
import { err, ok, ResultAsync } from 'neverthrow';
import { DomainError, ERROR_CODES } from '@/shared/errors/error-codes';
import { TenantBranding } from '../models/tenant.model';
import { TenantRepository } from './tenant.repository';
import { TenantApiService } from '../services/tenant-api.service';
import { tenantBrandingDtoToModel } from '../mappers/tenant.mapper';

export class TenantRepositoryImpl implements TenantRepository {
  constructor(private readonly api: TenantApiService) {}

  getBranding(slug: string): ResultAsync<TenantBranding, DomainError> {
    return ResultAsync.fromPromise(
      this.api.fetchBranding(slug),
      (error) => new DomainError(
        ERROR_CODES.NETWORK_ERROR.message,
        ERROR_CODES.NETWORK_ERROR.code,
        error
      )
    ).andThen(response => {
      // Validamos el éxito de la operación según el estándar del API
      if (!response.success) {
        return err(new DomainError(
          response.errorMessage || 'Error desconocido en el servidor',
          response.errorCode || 'SERVER_ERROR'
        ));
      }

      // Si tiene éxito, mapeamos solo la parte de 'data'
      return ok(tenantBrandingDtoToModel(response.data));
    });
  }
}
