// src/app/features/user/repositories/user.repository.impl.ts
import { ok, err, Result } from 'neverthrow';
import { User, UserRole } from '../models/user.model';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateUserRequest, UpdateUserRequest, UserDto } from '../dto/user.dto';
import { UserApiService } from '../services/user-api.service';
import { UserRepository } from './user.repository';

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly apiService: UserApiService) {}

  /** Convierte el DTO de la API al modelo de dominio */
  private toDomain(dto: UserDto): User {
    return {
      id: dto.id,
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      role: dto.role as UserRole,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  async getByTenant(tenantId: string): Promise<Result<User[], DomainError>> {
    try {
      const response = await this.apiService.getByTenant(tenantId);
      if (response.success) {
        return ok(response.data.map(dto => this.toDomain(dto)));
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al obtener usuarios', 'NET_001', error));
    }
  }

  async getById(id: string): Promise<Result<User, DomainError>> {
    try {
      const response = await this.apiService.getById(id);
      if (response.success) {
        return ok(this.toDomain(response.data));
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al obtener usuario', 'NET_001', error));
    }
  }

  async create(data: CreateUserRequest): Promise<Result<User, DomainError>> {
    try {
      const response = await this.apiService.create(data);
      if (response.success) {
        return ok(this.toDomain(response.data));
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al crear usuario', 'NET_001', error));
    }
  }

  async update(id: string, data: UpdateUserRequest): Promise<Result<User, DomainError>> {
    try {
      const response = await this.apiService.update(id, data);
      if (response.success) {
        return ok(this.toDomain(response.data));
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al actualizar usuario', 'NET_001', error));
    }
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    try {
      const response = await this.apiService.delete(id);
      if (response.success) {
        return ok(undefined);
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al eliminar usuario', 'NET_001', error));
    }
  }

  async resetPassword(userId: string, newPassword: string): Promise<Result<void, DomainError>> {
    try {
      const response = await this.apiService.resetPassword(userId, newPassword);
      if (response.success) {
        return ok(undefined);
      }
      return err(this.handleApiError(response));
    } catch (error) {
      return err(new DomainError('Error de red al resetear contraseña', 'NET_001', error));
    }
  }

  private handleApiError(response: any): DomainError {
    return new DomainError(response.errorMessage || 'Error de servidor', response.errorCode || 'SERVER_ERROR');
  }
}
