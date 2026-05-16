import { Result } from 'neverthrow';
import { Vehicle } from '../models/vehicle.model';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

export interface VehicleRepository {
  getAll(tenantId?: string): Promise<Result<Vehicle[], DomainError>>;
  getById(id: string): Promise<Result<Vehicle, DomainError>>;
  create(data: CreateVehicleDto): Promise<Result<Vehicle, DomainError>>;
  update(id: string, data: UpdateVehicleDto): Promise<Result<Vehicle, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}
