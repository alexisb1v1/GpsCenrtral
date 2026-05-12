// src/app/features/auth/index.ts
import { AuthApiService } from './services/auth-api.service';
import { AuthRepositoryImpl } from './repositories/auth.repository.impl';
import { LoginUseCase } from './use-cases/login.use-case';

const authApiService = new AuthApiService();
const authRepository = new AuthRepositoryImpl(authApiService);

export const loginUseCase = new LoginUseCase(authRepository);
export const getSessionUseCase = {
    execute: () => authRepository.getSession()
};
export const logoutUseCase = {
    execute: () => authRepository.logout()
};
