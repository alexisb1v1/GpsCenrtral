import { err, ok, ResultAsync } from 'neverthrow';
import { DomainError, ERROR_CODES } from '@/shared/errors/error-codes';
import { Route } from '../models/route.model';
import { RouteRepository } from './route.repository';
import { RouteApiService } from '../services/route-api.service';
import { RouteDto } from '../dto/route.dto';
import { GeofenceType } from '@/app/features/geofence';

export class RouteRepositoryImpl implements RouteRepository {
  constructor(private readonly api: RouteApiService) {}

  getList(tenantId?: string): ResultAsync<Route[], DomainError> {
    return ResultAsync.fromPromise(
      this.api.getList(tenantId),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(response.data.map(dto => this.dtoToModel(dto)));
    });
  }

  getDetail(id: string): ResultAsync<Route, DomainError> {
    return ResultAsync.fromPromise(
      this.api.getDetail(id),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(this.dtoToModel(response.data));
    });
  }

  create(route: { name: string }): ResultAsync<Route, DomainError> {
    return ResultAsync.fromPromise(
      this.api.create(route),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(this.dtoToModel(response.data));
    });
  }

  updateStops(
    id: string,
    stops: {
      geofenceId?: string;
      name: string;
      lat: number;
      lng: number;
      stopOrder: number;
      minutesFromStart: number;
      polygonCoordinates?: { lat: number; lng: number }[];
    }[],
    name?: string,
    isActive?: boolean,
    coordinates?: { lat: number; lng: number }[]
  ): ResultAsync<void, DomainError> {
    return ResultAsync.fromPromise(
      this.api.updateStops(id, { stops, name, isActive, coordinates }),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(undefined);
    });
  }

  private dtoToModel(dto: RouteDto): Route {
    return {
      id: dto.id,
      tenantId: dto.tenantId,
      name: dto.name,
      isActive: dto.isActive,
      coordinates: (dto as any).coordinates, // Mapear recorrido
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      stops: dto.stops?.map(stop => ({
        id: stop.id,
        routeId: stop.routeId,
        geofenceId: stop.geofenceId,
        stopOrder: stop.stopOrder,
        minutesFromStart: stop.minutesFromStart,
        polygonCoordinates: (stop as any).coordinates, // Mapear geometría del paradero
        geofence: stop.geofence ? {
          id: stop.geofence.id,
          name: stop.geofence.name,
          type: stop.geofence.type as GeofenceType,
          status: stop.geofence.status,
          lat: (stop.geofence as any).lat,
          lng: (stop.geofence as any).lng,
        } : undefined,
      })),
    };
  }

  private handleError(error: any): DomainError {
    return new DomainError(ERROR_CODES.NETWORK_ERROR.message, ERROR_CODES.NETWORK_ERROR.code, error);
  }

  private handleApiError(response: any): DomainError {
    return new DomainError(response.errorMessage || 'Error de servidor', response.errorCode || 'SERVER_ERROR');
  }
}
