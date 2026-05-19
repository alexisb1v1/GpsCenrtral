import { RouteApiService } from './services/route-api.service';
import { RouteRepositoryImpl } from './repositories/route.repository.impl';
import { GetRoutesByTenantUseCase } from './use-cases/get-routes-by-tenant.use-case';
import { GetRouteDetailUseCase } from './use-cases/get-route-detail.use-case';
import { CreateRouteUseCase } from './use-cases/create-route.use-case';
import { UpdateRouteStopsUseCase } from './use-cases/update-route-stops.use-case';

// Exportar modelos e interfaces
export * from './models/route.model';
export * from './dto/route.dto';

// Inicialización de dependencias
const apiService = new RouteApiService();
const repository = new RouteRepositoryImpl(apiService);

// Exportar instancias de casos de uso
export const getRoutesByTenantUseCase = new GetRoutesByTenantUseCase(repository);
export const getRouteDetailUseCase = new GetRouteDetailUseCase(repository);
export const createRouteUseCase = new CreateRouteUseCase(repository);
export const updateRouteStopsUseCase = new UpdateRouteStopsUseCase(repository);
