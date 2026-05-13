import { Tenant, TenantBranding, TenantBrandingDto } from '../models/tenant.model';

export const tenantBrandingDtoToModel = (dto: TenantBrandingDto): TenantBranding => ({
  name: dto.name,
  logo: dto.logoUrl,
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
