export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: TenantStatus;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  createdAt: Date;
  branding?: TenantBranding;
}

export interface TenantBranding {
  id: string;
  name: string;
  logo: string | null;
  loginBackground: string | null;
  colors: {
    primary: string;
    accent: string;
    status: string;
  };
}
