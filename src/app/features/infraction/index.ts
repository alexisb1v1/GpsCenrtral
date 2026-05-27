import { HttpInfractionRepository } from './repositories/http-infraction.repository';
import { GetInfractionsUseCase } from './use-cases/get-infractions.use-case';

const repository = new HttpInfractionRepository();

export const getInfractionsUseCase = new GetInfractionsUseCase(repository);

export * from './models/infraction.model';
