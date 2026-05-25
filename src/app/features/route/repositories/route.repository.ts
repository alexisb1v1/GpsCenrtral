import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { Route } from '../models/route.model';

export interface RouteRepository {
  getList(tenantId?: string): ResultAsync<Route[], DomainError>;
  getDetail(id: string): ResultAsync<Route, DomainError>;
  create(route: { name: string }): ResultAsync<Route, DomainError>;
  updateStops(
    id: string,
    stops: {
      traccarGeofenceId?: number;
      name: string;
      lat: number;
      lng: number;
      stopOrder: number;
      minutesFromStart: number;
      polygonCoordinates?: { lat: number; lng: number }[];
    }[],
    direction: 'IDA' | 'VUELTA',
    name?: string,
    isActive?: boolean,
    coordinates?: { lat: number; lng: number }[]
  ): ResultAsync<void, DomainError>;
}
