// src/app/features/auth/models/auth.model.ts

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}
