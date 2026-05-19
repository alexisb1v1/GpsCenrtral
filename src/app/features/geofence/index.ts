import { GeofenceApiService } from './services/geofence-api.service';
import { GeofenceRepositoryImpl } from './repositories/geofence.repository.impl';
import { GetGeofencesListUseCase } from './use-cases/get-geofences-list.use-case';

// Exportar modelos
export * from './models/geofence.model';
export * from './dto/geofence.dto';

// Inicialización de dependencias
const apiService = new GeofenceApiService();
const repository = new GeofenceRepositoryImpl(apiService);

// Exportar instancias de casos de uso
export const getGeofencesListUseCase = new GetGeofencesListUseCase(repository);
