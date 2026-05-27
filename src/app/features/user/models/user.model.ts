// src/app/features/user/models/user.model.ts

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'DRIVER';

export const USER_ROLES: Record<UserRole, string> = {
  SUPER_ADMIN: 'SUPER ADMINISTRADOR',
  ADMIN: 'ADMINISTRADOR',
  OPERATOR: 'CONTROLADOR',
  DRIVER: 'CHOFER',
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
