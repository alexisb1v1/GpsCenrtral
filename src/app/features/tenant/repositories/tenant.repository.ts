// src/app/features/tenant/repositories/tenant.repository.ts
import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/shared/errors/error-codes';
import { TenantBranding } from '../models/tenant.model';

export abstract class TenantRepository {
  abstract getBranding(slug: string): ResultAsync<TenantBranding, DomainError>;
}
