// src/app/features/auth/mappers/auth.mapper.ts
import { LoginResponseDto } from '../dto/auth.dto';
import { AuthSession } from '../models/auth.model';

export const loginDtoToSession = (dto: LoginResponseDto): AuthSession => {
  return {
    user: {
      id: dto.user.id,
      email: dto.user.email,
      name: dto.user.name,
      tenantId: dto.user.tenantId,
      role: dto.user.role,
    },
    token: dto.token,
    refreshToken: dto.refreshToken,
  };
};
