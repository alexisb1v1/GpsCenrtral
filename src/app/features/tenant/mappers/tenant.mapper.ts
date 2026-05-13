import { Tenant, TenantBranding } from '../models/tenant.model';
import { TenantBrandingDto } from '../dto/tenant.dto';

export const tenantBrandingDtoToModel = (dto: TenantBrandingDto): TenantBranding => ({
  name: dto.name,
  logo: dto.logoUrl,
  loginBackground: dto.loginUrl,
  colors: {
    primary: dto.primaryColor,
    accent: dto.accentColor,
    status: dto.statusDotColor,
  },
});

export const tenantDtoToModel = (dto: any): Tenant => ({
  id: dto.id,
  name: dto.name,
  slug: dto.subdomain || 'n/a',
  domain: dto.subdomain || 'n/a',
  status: dto.isActive ? 'active' : 'inactive',
  createdAt: new Date(dto.createdAt),
});
