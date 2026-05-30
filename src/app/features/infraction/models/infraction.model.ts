import { Vehicle } from '@/app/features/vehicle/models/vehicle.model';

export enum InfractionType {
  PIRATERIA = 'PIRATERIA',
  EVASION_PAGO = 'EVASION_PAGO',
  RETRASO_RUTA = 'RETRASO_RUTA',
}

export enum InfractionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  ANNULLED = 'ANNULLED',
}

export interface Infraction {
  id: string;
  tenantId: string;
  vehicleId: string;
  userId: string;
  type: InfractionType;
  amount: number;
  status: InfractionStatus;
  description: string | null;
  cancellationReason: string | null;
  paymentId: string | null;
  createdAt: string | Date;
  vehicle?: Vehicle;
  driverName?: string;
  payment?: {
    id: string;
    paymentNumber: string | null;
    amount: number;
    paymentMethod: string;
    createdAt: string | Date;
  };
}
