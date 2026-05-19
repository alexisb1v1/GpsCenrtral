import { DriverRepositoryImpl } from './repositories/driver.repository.impl';
import { GetDriversUseCase } from './use-cases/get-drivers.use-case';
import { GetDriverByIdUseCase } from './use-cases/get-driver-by-id.use-case';
import { CreateDriverUseCase } from './use-cases/create-driver.use-case';
import { UpdateDriverUseCase } from './use-cases/update-driver.use-case';

const repository = new DriverRepositoryImpl();

export const getDriversUseCase = new GetDriversUseCase(repository);
export const getDriverByIdUseCase = new GetDriverByIdUseCase(repository);
export const createDriverUseCase = new CreateDriverUseCase(repository);
export const updateDriverUseCase = new UpdateDriverUseCase(repository);

export * from './models/driver.model';
export * from './dto/driver.dto';
