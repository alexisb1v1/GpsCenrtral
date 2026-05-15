// src/app/features/user/use-cases/delete-user.use-case.ts
import { UserRepository } from '../repositories/user.repository';

export class DeleteUserUseCase {
  constructor(private readonly repository: UserRepository) { }
  async execute(id: string) {
    return await this.repository.delete(id);
  }
}
