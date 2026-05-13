import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { TenantRepository } from '../repositories/tenant.repository';

export class DeleteTenantUseCase {
  constructor(private readonly repository: TenantRepository) {}

  execute(id: string): ResultAsync<void, DomainError> {
    return this.repository.delete(id);
  }
}
