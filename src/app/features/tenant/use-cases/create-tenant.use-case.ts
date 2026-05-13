import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { Tenant } from '../models/tenant.model';
import { TenantRepository } from '../repositories/tenant.repository';

export class CreateTenantUseCase {
  constructor(private readonly repository: TenantRepository) {}

  execute(tenant: Partial<Tenant>): ResultAsync<Tenant, DomainError> {
    return this.repository.create(tenant);
  }
}
