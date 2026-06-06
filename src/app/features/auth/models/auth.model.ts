// src/app/features/auth/models/auth.model.ts

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
  role?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  refreshToken: string | null;
}
