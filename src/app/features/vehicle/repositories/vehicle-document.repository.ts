import { Result, ok, err } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { VehicleDocumentDto, CreateVehicleDocumentDto } from '../dto/vehicle-document.dto';
import { VehicleDocumentApiService } from '../services/vehicle-document-api.service';

export interface VehicleDocumentRepository {
  getByVehicle(vehicleId: string): Promise<Result<VehicleDocumentDto[], DomainError>>;
  create(data: CreateVehicleDocumentDto): Promise<Result<VehicleDocumentDto, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}

export class VehicleDocumentRepositoryImpl implements VehicleDocumentRepository {
  private apiService = new VehicleDocumentApiService();

  async getByVehicle(vehicleId: string): Promise<Result<VehicleDocumentDto[], DomainError>> {
    const response = await this.apiService.getByVehicle(vehicleId);
    if (!response.success) return err(new DomainError(response.errorMessage || 'Error desconocido', response.errorCode || 'ERR_UNKNOWN'));
    return ok(response.data);
  }

  async create(data: CreateVehicleDocumentDto): Promise<Result<VehicleDocumentDto, DomainError>> {
    const response = await this.apiService.create(data);
    if (!response.success) return err(new DomainError(response.errorMessage || 'Error al crear', response.errorCode || 'ERR_UNKNOWN'));
    return ok(response.data);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const response = await this.apiService.delete(id);
    if (!response.success) return err(new DomainError(response.errorMessage || 'Error al eliminar', response.errorCode || 'ERR_UNKNOWN'));
    return ok(undefined);
  }
}
