import { RouteRepository } from '../repositories/route.repository';

export interface UpdateRouteStopParam {
  geofenceId?: string;
  name: string;
  lat: number;
  lng: number;
  stopOrder: number;
  minutesFromStart: number;
  polygonCoordinates?: { lat: number; lng: number }[];
}

export class UpdateRouteStopsUseCase {
  constructor(private readonly repository: RouteRepository) {}

  async execute(id: string, stops: UpdateRouteStopParam[], direction: 'IDA' | 'VUELTA', name?: string, isActive?: boolean, coordinates?: { lat: number; lng: number }[]) {
    return await this.repository.updateStops(id, stops, direction, name, isActive, coordinates);
  }
}
