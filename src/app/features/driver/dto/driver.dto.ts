import { DriverStatus } from '../models/driver.model';

export interface DriverInfoDto {
  id: string;
  licenseNumber: string;
  licenseExpiry: string;
  dni: string;
  phoneEmergency: string | null;
  status: DriverStatus;
}

export interface DriverDto {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  status: DriverStatus;
  createdAt: string;
  driverInfo: DriverInfoDto | null;
}

export interface CreateDriverDto {
  tenantId: string;
  name: string;
  licenseNumber: string;
  licenseExpiry: string;
  dni: string;
  phoneEmergency?: string;
}

export interface UpdateDriverDto {
  name: string;
  licenseNumber: string;
  licenseExpiry: string;
  dni: string;
  phoneEmergency?: string;
  status?: DriverStatus;
}
