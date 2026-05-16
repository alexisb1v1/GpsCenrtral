import { Result } from 'neverthrow';
import { Vehicle } from '../models/vehicle.model';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { DomainError } from '@/shared/errors/error-codes';
import { UpdateVehicleDto } from '../dto/vehicle.dto';

export class UpdateVehicleUseCase {
  constructor(private readonly repository: VehicleRepository) {}

  async execute(id: string, data: UpdateVehicleDto): Promise<Result<Vehicle, DomainError>> {
    return await this.repository.update(id, data);
  }
}
