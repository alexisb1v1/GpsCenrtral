import { err, ok, ResultAsync } from 'neverthrow';
import { DomainError, ERROR_CODES } from '@/shared/errors/error-codes';
import { Geofence, GeofenceType } from '../models/geofence.model';
import { GeofenceRepository } from './geofence.repository';
import { GeofenceApiService } from '../services/geofence-api.service';
import { GeofenceDto } from '../dto/geofence.dto';

export class GeofenceRepositoryImpl implements GeofenceRepository {
  constructor(private readonly api: GeofenceApiService) {}

  getAll(): ResultAsync<Geofence[], DomainError> {
    return ResultAsync.fromPromise(
      this.api.getAll(),
      (error) => this.handleError(error)
    ).andThen(response => {
      if (!response.success) return err(this.handleApiError(response));
      return ok(response.data.map(dto => this.dtoToModel(dto)));
    });
  }

  private dtoToModel(dto: GeofenceDto): Geofence {
    return {
      id: dto.id,
      name: dto.name,
      type: dto.type as GeofenceType,
      status: dto.status,
    };
  }

  private handleError(error: any): DomainError {
    return new DomainError(ERROR_CODES.NETWORK_ERROR.message, ERROR_CODES.NETWORK_ERROR.code, error);
  }

  private handleApiError(response: any): DomainError {
    return new DomainError(response.errorMessage || 'Error de servidor', response.errorCode || 'SERVER_ERROR');
  }
}
