// src/app/features/user/dto/user.dto.ts
export interface UserDto {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  tenantId: string;
  password?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}
