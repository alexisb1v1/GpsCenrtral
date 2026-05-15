// src/app/features/user/use-cases/get-user-by-id.use-case.ts
import { UserRepository } from '../repositories/user.repository';

export class GetUserByIdUseCase {
  constructor(private readonly repository: UserRepository) { }
  async execute(id: string) {
    return await this.repository.getById(id);
  }
}
