import { RouteRepository } from '../repositories/route.repository';

export class GetRoutesByTenantUseCase {
  constructor(private readonly repository: RouteRepository) {}

  async execute(tenantId?: string) {
    return await this.repository.getList(tenantId);
  }
}
