// src/app/features/auth/repositories/auth.repository.impl.ts
import { err, ok, ResultAsync } from 'neverthrow';
import Cookies from 'js-cookie';
import { DomainError, ERROR_CODES } from '@/shared/errors/error-codes';
import { AuthSession } from '../models/auth.model';
import { AuthRepository } from './auth.repository';
import { AuthApiService } from '../services/auth-api.service';
import { LoginParams } from '../use-cases/login.use-case';
import { loginDtoToSession } from '../mappers/auth.mapper';

const AUTH_COOKIE_NAME = 'gps_central_session';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(private readonly api: AuthApiService) {}

  login(params: LoginParams): ResultAsync<AuthSession, DomainError> {
    return ResultAsync.fromPromise(
      this.api.login(params),
      (error) => new DomainError(
        ERROR_CODES.NETWORK_ERROR.message,
        ERROR_CODES.NETWORK_ERROR.code,
        error
      )
    ).andThen(response => {
      if (!response.success) {
        return err(new DomainError(
          response.errorMessage || 'Credenciales inválidas',
          response.errorCode || 'AUTH_ERROR'
        ));
      }

      const session = loginDtoToSession(response.data);
      
      // Persistir sesión en Cookies
      Cookies.set(AUTH_COOKIE_NAME, JSON.stringify(session), { 
        expires: 7, // 7 días
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return ok(session);
    });
  }

  async logout(): Promise<void> {
    Cookies.remove(AUTH_COOKIE_NAME);
  }

  getSession(): AuthSession | null {
    const sessionStr = Cookies.get(AUTH_COOKIE_NAME);
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  refreshSession(refreshToken: string, deviceFingerprint: string): ResultAsync<AuthSession, DomainError> {
    return ResultAsync.fromPromise(
      this.api.refresh(refreshToken, deviceFingerprint),
      (error) => new DomainError(
        ERROR_CODES.NETWORK_ERROR.message,
        ERROR_CODES.NETWORK_ERROR.code,
        error
      )
    ).andThen(response => {
      if (!response.success) {
        // Si el refresh falla (expirado, mismatch de fingerprint, etc), destruimos la sesión local
        this.logout();
        return err(new DomainError(
          response.errorMessage || 'Sesión expirada o inválida',
          response.errorCode || 'UNAUTHORIZED'
        ));
      }

      const currentSession = this.getSession();
      if (!currentSession) {
        return err(new DomainError('No existe sesión activa', 'UNAUTHORIZED'));
      }

      // Actualizar los tokens
      currentSession.token = response.data.token;
      currentSession.refreshToken = response.data.refreshToken;

      // Persistir de nuevo
      Cookies.set(AUTH_COOKIE_NAME, JSON.stringify(currentSession), { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return ok(currentSession);
    });
  }
}
