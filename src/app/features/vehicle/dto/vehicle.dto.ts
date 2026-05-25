export interface VehicleDto {
  id: string;
  plate: string;
  traccarDeviceId: string | null;
  year: number;

  status: 'OPERATIVO' | 'TALLER' | 'BAJA';
  passengerCapacity: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };

  createdAt: string;
}

export interface CreateVehicleDto {
  plate: string;
  uniqueId?: string; // IMEI o ID de la App GPS
  year: number;

  passengerCapacity?: number;
  ownerName?: string;
  ownerPhone?: string;
  status?: string;
  tenantId: string;
}

export interface UpdateVehicleDto {
  plate?: string;
  traccarDeviceId?: string; // El backend de update espera traccarDeviceId (no uniqueId)
  year?: number;
  passengerCapacity?: number;
  ownerName?: string;
  ownerPhone?: string;
  status?: string;
  tenantId?: string;
}
