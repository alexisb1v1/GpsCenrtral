import { Result } from 'neverthrow';
import { InfractionRepository } from '../repositories/infraction.repository';
import { DomainError } from '@/shared/errors/error-codes';

export class PayMultipleInfractionsUseCase {
  constructor(private readonly repository: InfractionRepository) {}

  async execute(params: {
    infractionIds: string[];
    paymentMethod: string;
    operationReference?: string;
  }): Promise<Result<{ paymentNumber: string; totalAmount: number }, DomainError>> {
    return await this.repository.payMultiple(params);
  }
}
