// src/app/features/user/repositories/user.repository.ts
import { Result } from 'neverthrow';
import { User } from '../models/user.model';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateUserRequest, UpdateUserRequest } from '../dto/user.dto';

export interface UserRepository {
  getByTenant(tenantId: string): Promise<Result<User[], DomainError>>;
  getById(id: string): Promise<Result<User, DomainError>>;
  create(data: CreateUserRequest): Promise<Result<User, DomainError>>;
  update(id: string, data: UpdateUserRequest): Promise<Result<User, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
  resetPassword(userId: string, newPassword: string): Promise<Result<void, DomainError>>;
}
