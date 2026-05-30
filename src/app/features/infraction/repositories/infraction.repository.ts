import { Result } from 'neverthrow';
import { Infraction } from '../models/infraction.model';
import { DomainError } from '@/shared/errors/error-codes';

export interface InfractionRepository {
  getFiltered(filters: {
    tenantId?: string;
    driverId?: string;
    date?: string;
  }): Promise<Result<Infraction[], DomainError>>;
  
  payMultiple(params: {
    infractionIds: string[];
    paymentMethod: string;
    operationReference?: string;
  }): Promise<Result<{ paymentNumber: string; totalAmount: number }, DomainError>>;
}
