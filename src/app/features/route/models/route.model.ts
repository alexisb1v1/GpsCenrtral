export interface RouteStop {
  id?: string;
  routeId?: string;
  traccarGeofenceId?: number;
  type?: 'START' | 'CHECKPOINT' | 'END';
  stopOrder: number;
  minutesFromStart: number;
  direction: 'IDA' | 'VUELTA';
  name: string;
  lat: number;
  lng: number;
  polygonCoordinates?: { lat: number; lng: number }[];
}

export interface Route {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  outboundCoordinates?: { lat: number; lng: number }[];
  inboundCoordinates?: { lat: number; lng: number }[];
  createdAt: Date;
  updatedAt: Date;
  stops?: RouteStop[];
}
