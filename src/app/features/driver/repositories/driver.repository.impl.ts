import { Result, ok, err } from 'neverthrow';
import { Driver, DriverStatus, DriverInfo } from '../models/driver.model';
import { DriverRepository } from './driver.repository';
import { DriverApiService } from '../services/driver-api.service';
import { DomainError } from '@/shared/errors/error-codes';
import { DriverDto, CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

export class DriverRepositoryImpl implements DriverRepository {
  private apiService: DriverApiService;

  constructor() {
    this.apiService = new DriverApiService();
  }

  private toDomain(dto: DriverDto): Driver {
    let driverInfo: DriverInfo | null = null;
    if (dto.driverInfo) {
      driverInfo = {
        id: dto.driverInfo.id,
        licenseNumber: dto.driverInfo.licenseNumber,
        licenseExpiry: new Date(dto.driverInfo.licenseExpiry),
        dni: dto.driverInfo.dni,
        phoneEmergency: dto.driverInfo.phoneEmergency,
        status: dto.driverInfo.status as DriverStatus,
      };
    }

    return {
      id: dto.id,
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      role: dto.role,
      status: dto.status as DriverStatus,
      createdAt: new Date(dto.createdAt),
      driverInfo,
    };
  }

  async getAll(tenantId?: string): Promise<Result<Driver[], DomainError>> {
    const response = await this.apiService.getAll(tenantId);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al obtener choferes', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(response.data.map(dto => this.toDomain(dto)));
  }

  async getById(id: string): Promise<Result<Driver, DomainError>> {
    const response = await this.apiService.getById(id);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Chofer no encontrado', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }

  async create(data: CreateDriverDto): Promise<Result<Driver, DomainError>> {
    const response = await this.apiService.create(data);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al crear chofer', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }

  async update(id: string, data: UpdateDriverDto): Promise<Result<Driver, DomainError>> {
    const response = await this.apiService.update(id, data);
    if (!response.success) {
      return err(new DomainError(response.errorMessage || 'Error al actualizar chofer', response.errorCode || 'ERR_UNKNOWN'));
    }
    return ok(this.toDomain(response.data));
  }
}
