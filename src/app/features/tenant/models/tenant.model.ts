// src/app/features/tenant/models/tenant.model.ts
export interface TenantBranding {
  name: string;
  logo: string | null;
  colors: {
    primary: string;
    accent: string;
    status: string;
  };
}
