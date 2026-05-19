// src/app/features/user/dto/user.dto.ts
export interface UserDto {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  tenantId: string;
  password?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  isActive?: boolean;
}
