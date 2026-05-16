export interface VehicleDocumentDto {
  id: string;
  vehicleId: string;
  documentType: string;
  documentNumber: string;
  expirationDate: string | null;
  notifyExpiration: boolean;
  status: string;
  createdAt: string;
}

export interface CreateVehicleDocumentDto {
  vehicleId: string;
  documentType: string;
  documentNumber: string;
  expirationDate?: string | null;
  notifyExpiration?: boolean;
}
