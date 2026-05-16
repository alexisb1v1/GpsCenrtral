import { Result } from 'neverthrow';
import { Vehicle } from '../models/vehicle.model';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { DomainError } from '@/shared/errors/error-codes';

export class GetVehiclesUseCase {
  constructor(private readonly repository: VehicleRepository) {}

  async execute(tenantId?: string): Promise<Result<Vehicle[], DomainError>> {
    return await this.repository.getAll(tenantId);
  }
}
