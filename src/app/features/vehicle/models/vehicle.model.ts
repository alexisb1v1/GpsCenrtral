export enum VehicleStatus {
  OPERATIVO = 'OPERATIVO',
  TALLER = 'TALLER',
  BAJA = 'BAJA',
}

export interface Vehicle {
  id: string;
  plate: string;
  traccarDeviceId: number | null;
  year: number;
  status: VehicleStatus;
  passengerCapacity: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  tenantId: string;
  tenantName?: string;
  createdAt: Date;
}
