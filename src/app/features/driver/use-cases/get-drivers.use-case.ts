import { Result } from 'neverthrow';
import { Driver } from '../models/driver.model';
import { DriverRepository } from '../repositories/driver.repository';
import { DomainError } from '@/shared/errors/error-codes';

export class GetDriversUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(tenantId?: string): Promise<Result<Driver[], DomainError>> {
    return await this.repository.getAll(tenantId);
  }
}
