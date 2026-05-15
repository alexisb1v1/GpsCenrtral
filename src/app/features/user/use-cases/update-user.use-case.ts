// src/app/features/user/use-cases/update-user.use-case.ts
import { UserRepository } from '../repositories/user.repository';
import { UpdateUserRequest } from '../dto/user.dto';

export class UpdateUserUseCase {
  constructor(private readonly repository: UserRepository) { }
  async execute(id: string, data: UpdateUserRequest) {
    return await this.repository.update(id, data);
  }
}
