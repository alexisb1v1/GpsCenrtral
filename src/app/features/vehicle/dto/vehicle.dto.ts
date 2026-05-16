export interface VehicleDto {
  id: string;
  plate: string;
  traccarDeviceId: number | null;
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
  traccarDeviceId?: number | null;
  year: number;

  passengerCapacity?: number;
  ownerName?: string;
  ownerPhone?: string;
  tenantId: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}
