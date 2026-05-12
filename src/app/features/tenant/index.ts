// src/app/features/tenant/index.ts
import { TenantApiService } from './services/tenant-api.service';
import { TenantRepositoryImpl } from './repositories/tenant.repository.impl';
import { GetTenantBrandingUseCase } from './use-cases/get-tenant-branding.use-case';

// Instanciación de dependencias (Composition Root)
const tenantApi = new TenantApiService();
const tenantRepository = new TenantRepositoryImpl(tenantApi);

// Casos de Uso exportados
export const getTenantBrandingUseCase = new GetTenantBrandingUseCase(tenantRepository);

// Modelos y DTOs exportados por conveniencia
export * from './models/tenant.model';
export * from './dto/tenant.dto';
