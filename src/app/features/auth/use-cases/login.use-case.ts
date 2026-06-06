// src/app/features/auth/use-cases/login.use-case.ts
import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { AuthSession } from '../models/auth.model';
import { AuthRepository } from '../repositories/auth.repository';

export interface LoginParams {
  email: string;
  password?: string;
  tenant: string;
  deviceFingerprint?: string;
}

export class LoginUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(params: LoginParams): ResultAsync<AuthSession, DomainError> {
    // Aquí podríamos añadir validaciones de negocio antes de llamar al repositorio
    return this.repository.login(params);
  }
}
