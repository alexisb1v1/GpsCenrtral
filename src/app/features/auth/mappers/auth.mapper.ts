// src/app/features/auth/mappers/auth.mapper.ts
import { LoginResponseDto } from '../dto/auth.dto';
import { AuthSession } from '../models/auth.model';

export const loginDtoToSession = (dto: LoginResponseDto): AuthSession => {
  return {
    user: {
      id: dto.user.id,
      email: dto.user.email,
      name: dto.user.name,
    },
    token: dto.token,
  };
};
