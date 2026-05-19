export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'DELETE',
}

export interface DriverInfo {
  id: string;
  licenseNumber: string;
  licenseExpiry: Date;
  dni: string;
  phoneEmergency: string | null;
  status: DriverStatus;
}

export interface Driver {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  email: string;
  role: string;
  status: DriverStatus;
  createdAt: Date;
  driverInfo: DriverInfo | null;
}
