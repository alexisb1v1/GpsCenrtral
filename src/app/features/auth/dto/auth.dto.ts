// src/app/features/auth/dto/auth.dto.ts

export interface LoginResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    tenantId?: string;
  };
  token: string;
}
