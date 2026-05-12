// src/app/features/tenant/mappers/tenant.mapper.ts
import { TenantBrandingDto } from '../dto/tenant.dto';
import { TenantBranding } from '../models/tenant.model';

export const tenantBrandingDtoToModel = (dto: TenantBrandingDto): TenantBranding => ({
  name: dto.name,
  logo: dto.logoUrl,
  colors: {
    primary: dto.primaryColor,
    accent: dto.accentColor,
    status: dto.statusDotColor,
  },
});
