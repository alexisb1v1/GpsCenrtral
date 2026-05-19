import { RouteRepository } from '../repositories/route.repository';

export class CreateRouteUseCase {
  constructor(private readonly repository: RouteRepository) {}

  async execute(name: string) {
    return await this.repository.create({ name });
  }
}
