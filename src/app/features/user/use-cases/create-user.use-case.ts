// src/app/features/user/use-cases/create-user.use-case.ts
import { UserRepository } from '../repositories/user.repository';
import { CreateUserRequest } from '../dto/user.dto';

export class CreateUserUseCase {
  constructor(private readonly repository: UserRepository) {}
  async execute(data: CreateUserRequest) {
    return await this.repository.create(data);
  }
}
