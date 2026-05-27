import { Result } from 'neverthrow';
import { Infraction } from '../models/infraction.model';
import { DomainError } from '@/shared/errors/error-codes';

export interface InfractionRepository {
  getFiltered(filters: {
    tenantId?: string;
    driverId?: string;
    date?: string;
  }): Promise<Result<Infraction[], DomainError>>;
}
