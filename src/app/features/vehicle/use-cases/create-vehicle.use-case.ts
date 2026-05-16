import { Result } from 'neverthrow';
import { Vehicle } from '../models/vehicle.model';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateVehicleDto } from '../dto/vehicle.dto';

export class CreateVehicleUseCase {
  constructor(private readonly repository: VehicleRepository) {}

  async execute(data: CreateVehicleDto): Promise<Result<Vehicle, DomainError>> {
    return await this.repository.create(data);
  }
}
