export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: TenantStatus;
  createdAt: Date;
  branding?: TenantBranding;
}

export interface TenantBranding {
  name: string;
  logo: string | null;
  colors: {
    primary: string;
    accent: string;
    status: string;
  };
}
