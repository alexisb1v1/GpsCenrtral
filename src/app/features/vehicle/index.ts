import { VehicleRepositoryImpl } from './repositories/vehicle.repository.impl';
import { VehicleDocumentRepositoryImpl } from './repositories/vehicle-document.repository';
import { GetVehiclesUseCase } from './use-cases/get-vehicles.use-case';
import { DeleteVehicleUseCase } from './use-cases/delete-vehicle.use-case';
import { CreateVehicleUseCase } from './use-cases/create-vehicle.use-case';
import { UpdateVehicleUseCase } from './use-cases/update-vehicle.use-case';
import { CreateVehicleDocumentUseCase, GetVehicleDocumentsUseCase } from './use-cases/vehicle-document.use-cases';

const repository = new VehicleRepositoryImpl();
const docRepository = new VehicleDocumentRepositoryImpl();

export const getVehiclesUseCase = new GetVehiclesUseCase(repository);
export const deleteVehicleUseCase = new DeleteVehicleUseCase(repository);
export const createVehicleUseCase = new CreateVehicleUseCase(repository);
export const updateVehicleUseCase = new UpdateVehicleUseCase(repository);
export const createVehicleDocumentUseCase = new CreateVehicleDocumentUseCase(docRepository);
export const getVehicleDocumentsUseCase = new GetVehicleDocumentsUseCase(docRepository);

export * from './models/vehicle.model';
export * from './dto/vehicle.dto';
export * from './dto/vehicle-document.dto';
