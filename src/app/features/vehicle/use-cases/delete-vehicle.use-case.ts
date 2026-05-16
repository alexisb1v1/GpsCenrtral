import { Result } from 'neverthrow';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { DomainError } from '@/shared/errors/error-codes';

export class DeleteVehicleUseCase {
  constructor(private readonly repository: VehicleRepository) {}

  async execute(id: string): Promise<Result<void, DomainError>> {
    return await this.repository.delete(id);
  }
}
