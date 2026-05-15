// src/app/features/user/use-cases/reset-password.use-case.ts
import { UserRepository } from '../repositories/user.repository';

export class ResetPasswordUseCase {
  constructor(private readonly repository: UserRepository) {}
  async execute(userId: string, newPassword: string) {
    return await this.repository.resetPassword(userId, newPassword);
  }
}
