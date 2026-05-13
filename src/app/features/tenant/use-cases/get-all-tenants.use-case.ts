import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { Tenant } from '../models/tenant.model';
import { TenantRepository } from '../repositories/tenant.repository';

export class GetAllTenantsUseCase {
  constructor(private readonly repository: TenantRepository) {}

  execute(): ResultAsync<Tenant[], DomainError> {
    return this.repository.getAll();
  }
}
