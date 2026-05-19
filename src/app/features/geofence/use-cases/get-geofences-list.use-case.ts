import { GeofenceRepository } from '../repositories/geofence.repository';

export class GetGeofencesListUseCase {
  constructor(private readonly repository: GeofenceRepository) {}

  async execute() {
    return await this.repository.getAll();
  }
}
