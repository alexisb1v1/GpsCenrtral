import { RouteRepository } from '../repositories/route.repository';

export class GetRouteDetailUseCase {
  constructor(private readonly repository: RouteRepository) {}

  async execute(id: string) {
    return await this.repository.getDetail(id);
  }
}
