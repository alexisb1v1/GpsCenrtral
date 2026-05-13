// src/app/features/tenant/repositories/tenant.repository.impl.ts
import { err, ok, ResultAsync } from 'neverthrow';
import { DomainError, ERROR_CODES } from '@/shared/errors/error-codes';
import { TenantBranding } from '../models/tenant.model';
import { TenantRepository } from './tenant.repository';
import { TenantApiService } from '../services/tenant-api.service';
import { tenantBrandingDtoToModel, tenantDtoToModel } from '../mappers/tenant.mapper';

export class TenantRepositoryImpl implements TenantRepository {
  constructor(private readonly api: TenantApiService) {}

  getBranding(slug: string): ResultAsync<TenantBranding, DomainError> {
    return ResultAsync.fromPromise(
      this.api.fetchBranding(slug),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(tenantBrandingDtoToModel(response.data));
    });
  }

  getAll(): ResultAsync<Tenant[], DomainError> {
    return ResultAsync.fromPromise(
      this.api.getAll(),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(response.data.map(tenantDtoToModel));
    });
  }

  create(tenant: Partial<Tenant>): ResultAsync<Tenant, DomainError> {
    return ResultAsync.fromPromise(
      this.api.create(tenant),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(tenantDtoToModel(response.data));
    });
  }

  update(id: string, tenant: Partial<Tenant>): ResultAsync<Tenant, DomainError> {
    return ResultAsync.fromPromise(
      this.api.update(id, tenant),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(tenantDtoToModel(response.data));
    });
  }

  delete(id: string): ResultAsync<void, DomainError> {
    return ResultAsync.fromPromise(
      this.api.delete(id),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(undefined);
    });
  }

  private handleError(error: any): DomainError {
    return new DomainError(ERROR_CODES.NETWORK_ERROR.message, ERROR_CODES.NETWORK_ERROR.code, error);
  }

  private handleApiError(response: any): DomainError {
    return new DomainError(response.errorMessage || 'Error de servidor', response.errorCode || 'SERVER_ERROR');
  }
}
