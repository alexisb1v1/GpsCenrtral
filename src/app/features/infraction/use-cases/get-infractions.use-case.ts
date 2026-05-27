import { Result } from 'neverthrow';
import { Infraction } from '../models/infraction.model';
import { InfractionRepository } from '../repositories/infraction.repository';
import { DomainError } from '@/shared/errors/error-codes';

export class GetInfractionsUseCase {
  constructor(private readonly repository: InfractionRepository) {}

  async execute(filters: {
    tenantId?: string;
    driverId?: string;
    date?: string;
  }): Promise<Result<Infraction[], DomainError>> {
    return await this.repository.getFiltered(filters);
  }
}
