// src/app/features/user/use-cases/get-users-by-tenant.use-case.ts
import { UserRepository } from '../repositories/user.repository';

export class GetUsersByTenantUseCase {
  constructor(private readonly repository: UserRepository) {}
  async execute(tenantId: string) {
    return await this.repository.getByTenant(tenantId);
  }
}
