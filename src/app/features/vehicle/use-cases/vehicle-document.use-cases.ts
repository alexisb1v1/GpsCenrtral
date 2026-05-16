import { Result } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateVehicleDocumentDto, VehicleDocumentDto } from '../dto/vehicle-document.dto';
import { VehicleDocumentRepository } from '../repositories/vehicle-document.repository';

export class CreateVehicleDocumentUseCase {
  constructor(private readonly repository: VehicleDocumentRepository) {}
  async execute(data: CreateVehicleDocumentDto): Promise<Result<VehicleDocumentDto, DomainError>> {
    return await this.repository.create(data);
  }
}

export class GetVehicleDocumentsUseCase {
  constructor(private readonly repository: VehicleDocumentRepository) {}
  async execute(vehicleId: string): Promise<Result<VehicleDocumentDto[], DomainError>> {
    return await this.repository.getByVehicle(vehicleId);
  }
}
