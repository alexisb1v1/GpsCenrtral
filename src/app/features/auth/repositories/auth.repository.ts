// src/app/features/auth/repositories/auth.repository.ts
import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { AuthSession } from '../models/auth.model';
import { LoginParams } from '../use-cases/login.use-case';

export interface AuthRepository {
  login(params: LoginParams): ResultAsync<AuthSession, DomainError>;
  logout(): Promise<void>;
  getSession(): AuthSession | null;
}
