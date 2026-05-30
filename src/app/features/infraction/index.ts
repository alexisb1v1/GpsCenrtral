import { HttpInfractionRepository } from './repositories/http-infraction.repository';
import { GetInfractionsUseCase } from './use-cases/get-infractions.use-case';
import { PayMultipleInfractionsUseCase } from './use-cases/pay-multiple-infractions.use-case';

const repository = new HttpInfractionRepository();

export const getInfractionsUseCase = new GetInfractionsUseCase(repository);
export const payMultipleInfractionsUseCase = new PayMultipleInfractionsUseCase(repository);

export * from './models/infraction.model';
