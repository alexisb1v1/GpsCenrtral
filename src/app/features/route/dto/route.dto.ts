export interface RouteStopDto {
  id?: string;
  routeId?: string;
  geofenceId: string;
  stopOrder: number;
  minutesFromStart: number;
  coordinates?: { lat: number; lng: number }[]; // Geometría del paradero
  geofence?: {
    id: string;
    name: string;
    type: 'START' | 'CHECKPOINT' | 'END';
    status: string;
  };
}

export interface RouteDto {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  coordinates?: { lat: number; lng: number }[]; // Trayecto de la ruta
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
  stops: {
    geofenceId?: string;
    name: string;
    lat: number;
    lng: number;
    stopOrder: number;
    minutesFromStart: number;
    polygonCoordinates?: { lat: number; lng: number }[];
  }[];
  coordinates?: { lat: number; lng: number }[];
}
