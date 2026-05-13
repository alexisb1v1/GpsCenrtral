import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { Tenant, TenantBranding } from '../models/tenant.model';

export abstract class TenantRepository {
  abstract getBranding(slug: string): ResultAsync<TenantBranding, DomainError>;
  abstract getAll(): ResultAsync<Tenant[], DomainError>;
  abstract create(tenant: Partial<Tenant>): ResultAsync<Tenant, DomainError>;
  abstract update(id: string, tenant: Partial<Tenant>): ResultAsync<Tenant, DomainError>;
  abstract delete(id: string): ResultAsync<void, DomainError>;
}
