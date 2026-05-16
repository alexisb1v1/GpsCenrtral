import { Result, ok, err } from 'neverthrow';
import { Vehicle, VehicleStatus } from '../models/vehicle.model';
import { VehicleRepository } from './vehicle.repository';
import { VehicleApiService } from '../services/vehicle-api.service';
import { DomainError } from '@/shared/errors/error-codes';
import { VehicleDto, CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

export class VehicleRepositoryImpl implements VehicleRepository {
  private apiService: VehicleApiService;

  constructor() {
    this.apiService = new VehicleApiService();
  }

  private toDomain(dto: VehicleDto): Vehicle {
    return {
      id: dto.id,
      plate: dto.plate,
      traccarDeviceId: dto.traccarDeviceId,
      year: dto.year,
      status: dto.status as VehicleStatus,
      passengerCapacity: dto.passengerCapacity,
      ownerName: dto.ownerName,
      ownerPhone: dto.ownerPhone,
      tenantId: dto.tenantId,
      tenantName: dto.tenant?.name,
      createdAt: new Date(dto.createdAt),
    };
  }

  async getAll(tenantId?: string): Promise<Result<Vehicle[], DomainError>> {
    const response = await this.apiService.getAll(tenantId);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al obtener vehículos', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(response.data.map(dto => this.toDomain(dto)));
  }

  async getById(id: string): Promise<Result<Vehicle, DomainError>> {
    const response = await this.apiService.getById(id);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Vehículo no encontrado', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }

  async create(data: CreateVehicleDto): Promise<Result<Vehicle, DomainError>> {
    const response = await this.apiService.create(data);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al crear vehículo', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }

  async update(id: string, data: UpdateVehicleDto): Promise<Result<Vehicle, DomainError>> {
    const response = await this.apiService.update(id, data);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al actualizar vehículo', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const response = await this.apiService.delete(id);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al eliminar vehículo', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(undefined);
  }
}
