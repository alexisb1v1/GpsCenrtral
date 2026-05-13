// src/app/features/tenant/dto/tenant.dto.ts
export interface TenantBrandingDto {
  name: string;
  logoUrl: string | null;
  loginUrl: string | null;
  primaryColor: string;
  accentColor: string;
  statusDotColor: string;
}
