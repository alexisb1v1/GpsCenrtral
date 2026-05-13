// src/app/features/tenant/index.ts
import { TenantApiService } from './services/tenant-api.service';
import { TenantRepositoryImpl } from './repositories/tenant.repository.impl';
import { GetTenantBrandingUseCase } from './use-cases/get-tenant-branding.use-case';
import { GetAllTenantsUseCase } from './use-cases/get-all-tenants.use-case';
import { CreateTenantUseCase } from './use-cases/create-tenant.use-case';
import { UpdateTenantUseCase } from './use-cases/update-tenant.use-case';
import { DeleteTenantUseCase } from './use-cases/delete-tenant.use-case';

// Instanciación de dependencias (Composition Root)
const tenantApi = new TenantApiService();
const tenantRepository = new TenantRepositoryImpl(tenantApi);

// Casos de Uso exportados
export const getTenantBrandingUseCase = new GetTenantBrandingUseCase(tenantRepository);
export const getAllTenantsUseCase = new GetAllTenantsUseCase(tenantRepository);
export const createTenantUseCase = new CreateTenantUseCase(tenantRepository);
export const updateTenantUseCase = new UpdateTenantUseCase(tenantRepository);
export const deleteTenantUseCase = new DeleteTenantUseCase(tenantRepository);

// Modelos y DTOs exportados por conveniencia
export * from './models/tenant.model';
export * from './dto/tenant.dto';
