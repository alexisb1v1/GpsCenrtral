// src/app/features/user/index.ts
import { UserApiService } from './services/user-api.service';
import { UserRepositoryImpl } from './repositories/user.repository.impl';
import { GetUsersByTenantUseCase } from './use-cases/get-users-by-tenant.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { GetUserByIdUseCase } from './use-cases/get-user-by-id.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';

// Exportar modelos y tipos
export * from './models/user.model';
export * from './dto/user.dto';

// Inicialización de servicios y repositorios
const userApiService = new UserApiService();
const userRepository = new UserRepositoryImpl(userApiService);

// Exportación de instancias de casos de uso
export const getUsersByTenantUseCase = new GetUsersByTenantUseCase(userRepository);
export const createUserUseCase = new CreateUserUseCase(userRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository);
export const deleteUserUseCase = new DeleteUserUseCase(userRepository);
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
export const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);
