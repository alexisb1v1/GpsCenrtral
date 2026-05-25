// src/app/features/auth/models/auth.model.ts

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}
