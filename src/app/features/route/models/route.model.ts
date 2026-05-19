import { Geofence } from '@/app/features/geofence';

export interface RouteStop {
  id?: string;
  routeId?: string;
  geofenceId: string;
  stopOrder: number;
  minutesFromStart: number;
  polygonCoordinates?: { lat: number; lng: number }[];
  geofence?: Geofence;
}

export interface Route {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  coordinates?: { lat: number; lng: number }[];
  createdAt: Date;
  updatedAt: Date;
  stops?: RouteStop[];
}
