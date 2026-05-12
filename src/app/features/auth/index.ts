// src/app/features/auth/index.ts
import { AuthApiService } from './services/auth-api.service';
import { AuthRepositoryImpl } from './repositories/auth-api.repository.impl'; // Ajustado nombre si es necesario
import { LoginUseCase } from './use-cases/login.use-case';

// Nota: He renombrado el archivo de implementación para que coincida con el patrón del proyecto si es necesario, 
// pero usemos el que creamos: auth.repository.impl.ts

import { AuthRepositoryImpl as AuthRepo } from './repositories/auth.repository.impl';

const authApiService = new AuthApiService();
const authRepository = new AuthRepo(authApiService);

export const loginUseCase = new LoginUseCase(authRepository);
export const getSessionUseCase = {
    execute: () => authRepository.getSession()
};
export const logoutUseCase = {
    execute: () => authRepository.logout()
};
