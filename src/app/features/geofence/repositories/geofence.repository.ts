import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { Geofence } from '../models/geofence.model';

export interface GeofenceRepository {
  getAll(): ResultAsync<Geofence[], DomainError>;
}
