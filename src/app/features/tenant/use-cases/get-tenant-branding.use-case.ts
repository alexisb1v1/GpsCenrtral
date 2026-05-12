// src/app/features/tenant/use-cases/get-tenant-branding.use-case.ts
import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { TenantBranding } from '../models/tenant.model';
import { TenantRepository } from '../repositories/tenant.repository';

export class GetTenantBrandingUseCase {
  constructor(private readonly repository: TenantRepository) {}

  /**
   * Obtiene la configuración de branding de un tenant específico por su slug.
   * 
   * @param slug - Identificador amigable del tenant (ej: 'transportesanjuan')
   * @returns Resultado asíncrono con el modelo de branding o un error de dominio.
   */
  execute(slug: string): ResultAsync<TenantBranding, DomainError> {
    return this.repository.getBranding(slug);
  }
}
