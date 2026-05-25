export interface RouteStopDto {
  id?: string;
  routeId?: string;
  traccarGeofenceId?: number;
  type?: 'START' | 'CHECKPOINT' | 'END';
  name: string;
  lat?: number;
  lng?: number;
  stopOrder: number;
  minutesFromStart: number;
  direction: 'IDA' | 'VUELTA';
  coordinates?: { lat: number; lng: number }[]; // Geometría del paradero
}

export interface RouteDto {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  outboundCoordinates?: { lat: number; lng: number }[]; // Trayecto de ida
  inboundCoordinates?: { lat: number; lng: number }[];  // Trayecto de vuelta
  createdAt: string;
  updatedAt: string;
  stops?: RouteStopDto[];
}

export interface CreateRouteRequest {
  name: string;
}

export interface UpdateRouteStopsRequest {
  name?: string;
  isActive?: boolean;
  direction: 'IDA' | 'VUELTA';
  stops: {
    traccarGeofenceId?: number;
    name: string;
    lat: number;
    lng: number;
    stopOrder: number;
    minutesFromStart: number;
    polygonCoordinates?: { lat: number; lng: number }[];
  }[];
  coordinates?: { lat: number; lng: number }[];
}
